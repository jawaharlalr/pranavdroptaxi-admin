import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  FaSearch, FaTrash, FaFileInvoice, FaChevronDown, FaChevronUp, FaSave, FaCar, FaCheckCircle, FaEye, FaTimes, FaMapMarkerAlt, FaPhoneAlt, FaCalendarAlt, FaClock
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { generateInvoicePDF } from '../utils/pdfGenerator';

const vehicleLabelMap = {
  sedan: "Sedan (4+1)",
  etios: "Etios (4+1)",
  suv: "SUV (6+1)",
  innova: "Innova (7+1)",
  innovacrysta: "Innova Crysta (7+1)",
};

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [editValues, setEditValues] = useState({});
  const [expandedId, setExpandedId] = useState(null); // Desktop expansion
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Mobile Modal States
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingInModal, setIsEditingInModal] = useState(false);

  // 1. Fetch Bookings Real-time
  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        index: index + 1,
        ...doc.data()
      }));

      // Initialize Edit Values for Cost Editor
      const initialValues = {};
      data.forEach((b) => {
        initialValues[b.id] = {
          distance: b.distance || '',
          duration: b.duration || '',
          cost: b.cost || '',
          toll: b.tollCharges || '',
          parking: b.parkingCharges || '',
          hill: b.hillCharges || '',
          permit: b.permitCharges || '',
        };
      });

      setBookings(data);
      setEditValues(initialValues);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- Logic Helpers ---

  const toNum = (n) => (+n ? +n : 0);

  const getNoOfDays = (start, end) => {
    const s = new Date(start);
    const e = new Date(end || start);
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff + 1 : 1;
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const dateObj = d?.toDate ? d.toDate() : new Date(d);
    return isNaN(dateObj.getTime()) ? '-' : 
      dateObj.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (d) => {
    if (!d) return '-';
    const dateObj = d?.toDate ? d.toDate() : new Date(d);
    return isNaN(dateObj.getTime()) ? '-' : 
      dateObj.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
  };

  // --- Handlers ---

  const handleDelete = async (id) => {
    if (window.confirm("Delete this booking permanently?")) {
      try {
        await deleteDoc(doc(db, "bookings", id));
        toast.success("Booking deleted");
        if (selectedBooking?.id === id) closeModal();
      } catch (error) {
        console.error("Delete error:", error);
        toast.error("Failed to delete booking");
      }
    }
  };

  const handleStatusUpdate = async (booking, newStatus) => {
    try {
      await updateDoc(doc(db, "bookings", booking.id), { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      
      const msg = `Hi ${booking.name},\nYour Booking ID: ${booking.bookingId || booking.id} is now ${newStatus.toUpperCase()}.\nThank You!`;
      const phone = booking.phone?.replace(/\D/g, '');
      if (phone) {
         window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleInvoice = async (booking) => {
    toast("Generating Invoice...", { icon: '📄' });
    try {
      generateInvoicePDF(booking);
      toast.success("Invoice downloaded!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleEnableInvoice = async (id) => {
    try {
      await updateDoc(doc(db, "bookings", id), { invoiceEnabled: true });
      toast.success("Invoice enabled for customer!");
    } catch (error) {
      toast.error("Failed to enable invoice");
    }
  };

  const handleSaveCosts = async (booking) => {
    const v = editValues[booking.id];
    const DRIVER_BATA_PER_DAY = 400;
    const noOfDays = getNoOfDays(booking.date, booking.returnDate);
    const bataTotal = DRIVER_BATA_PER_DAY * noOfDays;
    
    const totalCost = toNum(v.cost) + toNum(v.toll) + toNum(v.parking) + toNum(v.hill) + toNum(v.permit) + bataTotal;

    try {
      await updateDoc(doc(db, "bookings", booking.id), {
        distance: +v.distance,
        duration: +v.duration,
        cost: +v.cost,
        tollCharges: +v.toll,
        parkingCharges: +v.parking,
        hillCharges: +v.hill,
        permitCharges: +v.permit,
        totalCost: totalCost,
      });
      toast.success("Fare details saved!");
      setExpandedId(null); 
      setIsEditingInModal(false); // Close edit mode in modal
    } catch (error) {
      toast.error("Failed to save charges");
    }
  };

  const handleInputChange = (id, field, value) => {
    setEditValues(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const openMobileModal = (booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
    setIsEditingInModal(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  // --- Filtering ---
  const filteredBookings = bookings.filter(b => {
    const matchesStatus = statusFilter === 'all' 
      ? true 
      : statusFilter === 'pending' 
        ? (b.status === 'pending' || b.status === 'yet to confirm')
        : b.status === statusFilter;
    
    const matchesSearch = 
      (b.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (b.phone?.includes(searchTerm)) ||
      (b.bookingId?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header & Controls */}
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">Manage Bookings</h2>
          <p className="mt-1 text-sm text-gray-400">Track trips, update status, and manage fares.</p>
        </div>

        <div className="flex flex-col w-full gap-3 sm:flex-row md:w-auto">
           {/* Search */}
           <div className="relative flex-1 group">
            <FaSearch className="absolute text-gray-500 transition-colors transform -translate-y-1/2 left-3 top-1/2 group-focus-within:text-taxi-yellow" />
            <input
              type="text"
              placeholder="Search ID, Name, Phone..."
              className="w-full bg-taxi-dark border border-taxi-gray text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-taxi-yellow focus:ring-1 focus:ring-taxi-yellow transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            className="bg-taxi-dark border border-taxi-gray text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-taxi-yellow cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="overflow-hidden border shadow-2xl bg-taxi-dark rounded-xl border-taxi-gray">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead className="text-xs tracking-wider text-gray-400 uppercase bg-black/80">
              <tr>
                <th className="px-4 py-4 md:px-6">S.No</th>
                <th className="px-4 py-4 md:px-6">ID</th>
                <th className="px-4 py-4 md:px-6">Name</th>
                {/* Desktop Only Cols */}
                <th className="hidden px-6 py-4 md:table-cell">Route</th>
                <th className="hidden px-6 py-4 md:table-cell">Details</th>
                <th className="hidden px-6 py-4 md:table-cell">Status</th>
                {/* End Desktop Only */}
                <th className="px-4 py-4 text-right md:px-6">Amount</th>
                <th className="px-4 py-4 text-center md:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-300 divide-y divide-taxi-gray/50">
              {isLoading ? (
                <tr>
                   <td colSpan="8" className="py-8 text-center"><div className="w-8 h-8 mx-auto border-4 rounded-full border-taxi-yellow border-t-transparent animate-spin"></div></td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                   <td colSpan="8" className="py-12 text-center text-gray-500">No bookings found.</td>
                </tr>
              ) : (
                filteredBookings.map((b, index) => {
                  const isExpanded = expandedId === b.id;
                  const v = editValues[b.id] || {};
                  const isRoundTrip = !!b.returnDate;
                  const noOfDays = getNoOfDays(b.date, b.returnDate);
                  const DRIVER_BATA = 400 * noOfDays;
                  const currentTotal = toNum(v.cost) + toNum(v.toll) + toNum(v.parking) + toNum(v.hill) + toNum(v.permit) + DRIVER_BATA;

                  return (
                    <React.Fragment key={b.id}>
                      <tr className={`transition-colors hover:bg-white/5 ${isExpanded ? 'bg-white/5' : ''}`}>
                        
                        <td className="px-4 py-4 font-mono text-xs text-gray-500 md:px-6">
                           {(index + 1).toString().padStart(2, '0')}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-gray-500 md:px-6">
                          {b.bookingId || b.id.slice(0,6)}
                        </td>
                        
                        <td className="px-4 py-4 md:px-6">
                          <div className="text-sm font-bold text-white">{b.name}</div>
                          <div className="text-xs text-gray-500 md:hidden">{formatDate(b.date)}</div>
                        </td>

                        {/* Desktop Only Cells */}
                        <td className="hidden px-6 py-4 md:table-cell">
                          <div className="text-sm">{b.source?.displayName || b.pickupLocation || 'N/A'}</div>
                          <div className="my-1 text-xs text-gray-500">to</div>
                          <div className="text-sm">{b.destination?.displayName || b.dropLocation || 'N/A'}</div>
                        </td>

                        <td className="hidden px-6 py-4 text-xs leading-relaxed text-gray-400 md:table-cell">
                          <div className="mb-1">
                            <span className="font-bold text-gray-500">Start:</span> {formatDate(b.date)}
                          </div>
                          {isRoundTrip && (
                            <div className="mb-1 text-taxi-yellow">
                              <span className="font-bold text-gray-500">Return:</span> {formatDate(b.returnDate)}
                            </div>
                          )}
                          <div><span className="text-gray-500">Type:</span> {isRoundTrip ? 'Round Trip' : 'One Way'}</div>
                          <div className="flex items-center gap-1 mt-1 text-gray-300">
                            <FaCar className="text-taxi-yellow" /> {vehicleLabelMap[b.vehicleType] || b.vehicleType}
                          </div>
                        </td>

                        <td className="hidden px-6 py-4 md:table-cell">
                          <select
                            value={b.status || 'pending'}
                            onChange={(e) => handleStatusUpdate(b, e.target.value)}
                            className={`px-3 py-1 text-xs font-bold rounded-full border bg-transparent cursor-pointer outline-none appearance-none
                              ${b.status === 'completed' ? 'text-green-500 border-green-500/50 bg-green-500/10' :
                                b.status === 'confirmed' ? 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10' :
                                b.status === 'cancelled' ? 'text-red-500 border-red-500/50 bg-red-500/10' :
                                'text-blue-500 border-blue-500/50 bg-blue-500/10'}`}
                          >
                            <option value="pending" className="bg-gray-800">Pending</option>
                            <option value="confirmed" className="bg-gray-800">Confirmed</option>
                            <option value="completed" className="bg-gray-800">Completed</option>
                            <option value="cancelled" className="bg-gray-800">Cancelled</option>
                          </select>
                        </td>
                        {/* End Desktop Only */}

                        <td className="px-4 py-4 font-mono text-sm font-bold text-right md:text-lg text-taxi-yellow md:px-6">
                           ₹{currentTotal > 0 ? currentTotal : (b.totalCost || 0)}
                        </td>

                        <td className="px-4 py-4 text-center md:px-6">
                          
                          {/* Desktop Actions */}
                          <div className="flex-col hidden gap-2 md:flex">
                             <button
                                onClick={() => setExpandedId(isExpanded ? null : b.id)}
                                className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
                             >
                                {isExpanded ? 'Close' : 'Edit Fare'} {isExpanded ? <FaChevronUp/> : <FaChevronDown/>}
                             </button>
                             
                             {b.status === 'completed' && (
                               <div className="flex gap-2">
                                  <button onClick={() => handleInvoice(b)} title="Generate PDF" className="flex items-center justify-center flex-1 p-2 text-xs text-blue-500 transition-colors rounded bg-blue-600/20 hover:bg-blue-600/30">
                                    <FaFileInvoice/>
                                  </button>
                                  <button onClick={() => handleEnableInvoice(b.id)} title="Enable Customer Download" className={`flex-1 p-2 rounded text-xs transition-colors flex justify-center items-center ${b.invoiceEnabled ? 'bg-green-600/40 text-green-400 cursor-default' : 'bg-green-600/20 text-green-500 hover:bg-green-600/30'}`}>
                                    <FaCheckCircle />
                                  </button>
                               </div>
                             )}

                             <button 
                                onClick={() => handleDelete(b.id)}
                                className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded transition-colors"
                             >
                                <FaTrash /> Delete
                             </button>
                          </div>

                          {/* Mobile Actions */}
                          <div className="flex justify-center gap-3 md:hidden">
                              <button 
                                onClick={() => openMobileModal(b)}
                                className="p-2 text-blue-400 rounded-full bg-blue-500/10 hover:bg-blue-500/20"
                              >
                                <FaEye />
                              </button>
                              <button 
                                onClick={() => handleDelete(b.id)}
                                className="p-2 text-red-500 rounded-full bg-red-500/10 hover:bg-red-500/20"
                              >
                                <FaTrash />
                              </button>
                          </div>

                        </td>
                      </tr>

                      {/* Desktop Expanded Row (Cost Editor) */}
                      {isExpanded && (
                        <tr className="hidden bg-[#151515] border-b border-taxi-yellow/20 md:table-row">
                          <td colSpan="8" className="p-6">
                            <CostEditor 
                              v={v} 
                              b={b} 
                              handleInputChange={handleInputChange} 
                              handleSaveCosts={handleSaveCosts} 
                              DRIVER_BATA={DRIVER_BATA} 
                              currentTotal={currentTotal} 
                              noOfDays={noOfDays}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        <div className="flex justify-between px-6 py-4 text-xs text-gray-500 border-t border-taxi-gray bg-black/40">
          <span>Showing {filteredBookings.length} bookings</span>
          <span>Pranav Drop Taxi Admin</span>
        </div>
      </div>

      {/* --- MOBILE MODAL --- */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm md:hidden">
          <div className="flex flex-col w-full max-h-[90vh] bg-[#121212] border border-taxi-yellow/20 rounded-2xl shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1a1a]">
              <div>
                <h3 className="text-lg font-bold text-white">Booking Details</h3>
                <p className="font-mono text-xs text-taxi-yellow">{selectedBooking.bookingId}</p>
              </div>
              <button onClick={closeModal} className="p-2 text-gray-400 bg-gray-800 rounded-full hover:text-white">
                <FaTimes />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 p-5 overflow-y-auto">
              
              {/* If Editing, show inputs, else show details */}
              {isEditingInModal ? (
                <div className="space-y-4">
                   <h4 className="mb-2 text-sm font-bold tracking-wider uppercase text-taxi-yellow">Update Fare Details</h4>
                   <CostEditor 
                      v={editValues[selectedBooking.id] || {}} 
                      b={selectedBooking} 
                      handleInputChange={handleInputChange} 
                      handleSaveCosts={handleSaveCosts} 
                      DRIVER_BATA={400 * getNoOfDays(selectedBooking.date, selectedBooking.returnDate)} 
                      currentTotal={toNum(editValues[selectedBooking.id]?.cost) + toNum(editValues[selectedBooking.id]?.toll) + toNum(editValues[selectedBooking.id]?.parking) + toNum(editValues[selectedBooking.id]?.hill) + toNum(editValues[selectedBooking.id]?.permit) + (400 * getNoOfDays(selectedBooking.date, selectedBooking.returnDate))} 
                      noOfDays={getNoOfDays(selectedBooking.date, selectedBooking.returnDate)}
                      mobile={true}
                    />
                    <button 
                      onClick={() => setIsEditingInModal(false)}
                      className="w-full py-3 mt-2 text-sm text-gray-400 bg-gray-800 rounded hover:text-white"
                    >
                      Cancel Edit
                    </button>
                </div>
              ) : (
                <div className="space-y-5">
                  
                  {/* Status Dropdown */}
                  <div>
                      <label className="text-xs text-gray-500 uppercase">Status</label>
                      <select
                          value={selectedBooking.status || 'pending'}
                          onChange={(e) => handleStatusUpdate(selectedBooking, e.target.value)}
                          className={`w-full mt-1 px-3 py-2 text-sm font-bold rounded border outline-none
                            ${selectedBooking.status === 'completed' ? 'text-green-500 border-green-500/50 bg-green-500/10' :
                              selectedBooking.status === 'confirmed' ? 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10' :
                              selectedBooking.status === 'cancelled' ? 'text-red-500 border-red-500/50 bg-red-500/10' :
                              'text-blue-500 border-blue-500/50 bg-blue-500/10'}`}
                        >
                          <option value="pending" className="text-white bg-gray-800">Pending</option>
                          <option value="confirmed" className="text-white bg-gray-800">Confirmed</option>
                          <option value="completed" className="text-white bg-gray-800">Completed</option>
                          <option value="cancelled" className="text-white bg-gray-800">Cancelled</option>
                      </select>
                  </div>

                  {/* Customer Info */}
                  <div className="p-3 border border-gray-700 rounded-lg bg-gray-800/50">
                    <label className="block mb-1 text-xs text-gray-500 uppercase">Customer</label>
                    <div className="text-base font-bold text-white">{selectedBooking.name}</div>
                    <a href={`tel:${selectedBooking.phone}`} className="flex items-center gap-2 mt-1 text-sm text-blue-400">
                      <FaPhoneAlt size={12}/> {selectedBooking.phone}
                    </a>
                  </div>
                  
                  {/* Date Information Block */}
                  <div className="p-3 space-y-2 border border-gray-700 rounded-lg bg-gray-800/50">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-700">
                          <span className="flex items-center gap-1 text-xs text-gray-400"><FaClock size={10}/> Booked On</span>
                          <span className="font-mono text-xs text-gray-300">{formatDateTime(selectedBooking.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs text-gray-400"><FaCalendarAlt size={10}/> Trip Start</span>
                          <span className="text-sm font-bold text-white">{formatDate(selectedBooking.date)}</span>
                      </div>
                      {selectedBooking.returnDate && (
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-xs text-gray-400"><FaCalendarAlt size={10}/> Trip Return</span>
                            <span className="text-sm font-bold text-taxi-yellow">{formatDate(selectedBooking.returnDate)}</span>
                        </div>
                      )}
                  </div>

                  {/* Route Info */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                       <FaMapMarkerAlt className="mt-1 text-green-500"/>
                       <div>
                          <label className="text-xs text-gray-500">Pickup</label>
                          <div className="text-sm text-gray-200">{selectedBooking.source?.displayName || selectedBooking.pickupLocation}</div>
                       </div>
                    </div>
                    <div className="h-4 pl-1 ml-2 border-l border-gray-600 border-dashed"></div>
                    <div className="flex items-start gap-3">
                       <FaMapMarkerAlt className="mt-1 text-red-500"/>
                       <div>
                          <label className="text-xs text-gray-500">Drop</label>
                          <div className="text-sm text-gray-200">{selectedBooking.destination?.displayName || selectedBooking.dropLocation}</div>
                       </div>
                    </div>
                  </div>

                  {/* Vehicle & Trip Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 text-center rounded bg-gray-800/50">
                       <FaCar className="mx-auto mb-1 text-taxi-yellow"/>
                       <div className="text-xs text-gray-400">{vehicleLabelMap[selectedBooking.vehicleType]}</div>
                    </div>
                    <div className="flex flex-col justify-center p-3 text-center rounded bg-gray-800/50">
                       <div className="text-xs text-gray-400">{selectedBooking.returnDate ? 'Round Trip' : 'One Way'}</div>
                    </div>
                  </div>
                  
                  {/* Fare Display */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                     <span className="text-sm text-gray-400">Total Fare</span>
                     <span className="font-mono text-xl font-bold text-taxi-yellow">
                        ₹{(toNum(editValues[selectedBooking.id]?.cost) + toNum(editValues[selectedBooking.id]?.toll) + toNum(editValues[selectedBooking.id]?.parking) + toNum(editValues[selectedBooking.id]?.hill) + toNum(editValues[selectedBooking.id]?.permit) + (400 * getNoOfDays(selectedBooking.date, selectedBooking.returnDate))) || selectedBooking.totalCost}
                     </span>
                  </div>

                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-gray-800 bg-[#1a1a1a] flex flex-col gap-3">
              {!isEditingInModal && (
                <button 
                  onClick={() => setIsEditingInModal(true)}
                  className="w-full py-3 font-bold text-black transition-colors rounded bg-taxi-yellow hover:bg-white"
                >
                  Edit Fare Details
                </button>
              )}

              {selectedBooking.status === 'completed' && !isEditingInModal && (
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleInvoice(selectedBooking)} className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-blue-400 border rounded bg-blue-500/10 border-blue-500/20">
                       <FaFileInvoice /> Download PDF
                    </button>
                    <button onClick={() => handleEnableInvoice(selectedBooking.id)} className={`flex items-center justify-center gap-2 py-3 text-sm font-medium rounded border ${selectedBooking.invoiceEnabled ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                       <FaCheckCircle /> {selectedBooking.invoiceEnabled ? 'Enabled' : 'Enable Invoice'}
                    </button>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// --- Sub-components ---

const CostEditor = ({ v, b, handleInputChange, handleSaveCosts, DRIVER_BATA, currentTotal, noOfDays, mobile }) => (
  <>
    <div className={`grid gap-4 mb-4 ${mobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-4'}`}>
      <InputGroup label="Distance (km)" type="number" value={v.distance} onChange={(val) => handleInputChange(b.id, 'distance', val)} />
      
      <div className="flex gap-2">
        <InputGroup label="Duration (Hrs)" type="number" value={Math.floor((+v.duration || 0) / 60)} 
          onChange={(val) => {
            const mins = (+v.duration || 0) % 60;
            handleInputChange(b.id, 'duration', (+val * 60) + mins);
          }} 
        />
        <InputGroup label="(Mins)" type="number" value={(+v.duration || 0) % 60} 
          onChange={(val) => {
            const hrs = Math.floor((+v.duration || 0) / 60);
            handleInputChange(b.id, 'duration', (hrs * 60) + +val);
          }} 
        />
      </div>

      <InputGroup label="Base Cost (₹)" type="number" value={v.cost} onChange={(val) => handleInputChange(b.id, 'cost', val)} />
      <InputGroup label="Toll Charges (₹)" type="number" value={v.toll} onChange={(val) => handleInputChange(b.id, 'toll', val)} />
      <InputGroup label="Parking (₹)" type="number" value={v.parking} onChange={(val) => handleInputChange(b.id, 'parking', val)} />
      <InputGroup label="Hill Charges (₹)" type="number" value={v.hill} onChange={(val) => handleInputChange(b.id, 'hill', val)} />
      <InputGroup label="Permit (₹)" type="number" value={v.permit} onChange={(val) => handleInputChange(b.id, 'permit', val)} />
      
      <div className="p-3 border rounded bg-black/50 border-taxi-gray">
        <label className="block text-xs font-bold text-gray-500 uppercase">Driver Bata</label>
        <div className="mt-1 text-white">₹{DRIVER_BATA} <span className="text-xs text-gray-600">({noOfDays} days)</span></div>
      </div>
    </div>

    <div className={`flex items-center justify-between pt-4 border-t border-taxi-gray/50 ${mobile ? 'flex-col gap-4' : ''}`}>
        <div className="text-sm">
          Calculated Total: <span className="ml-2 text-xl font-bold text-taxi-yellow">₹{currentTotal}</span>
        </div>
        <div className={`flex gap-3 ${mobile ? 'w-full' : ''}`}>
          <button 
            onClick={() => handleSaveCosts(b)}
            className={`flex items-center justify-center gap-2 px-6 py-2 text-sm font-bold text-black rounded shadow-lg bg-taxi-yellow hover:bg-yellow-400 shadow-yellow-500/20 ${mobile ? 'w-full py-3' : ''}`}
          >
            <FaSave /> Save Details
          </button>
        </div>
    </div>
  </>
);

const InputGroup = ({ label, type, value, onChange }) => (
  <label className="block">
    <span className="block mb-1 text-xs font-bold text-gray-500 uppercase">{label}</span>
    <input 
      type={type} 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      min="0"
      className="w-full px-3 py-2 text-sm text-white transition-colors bg-black border rounded border-taxi-gray focus:outline-none focus:border-taxi-yellow"
    />
  </label>
);

export default Bookings;