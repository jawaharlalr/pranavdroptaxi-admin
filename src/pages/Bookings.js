import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  FaSearch, FaTrash, FaFileInvoice, FaChevronDown, FaChevronUp, FaSave, FaCar, FaCheckCircle
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
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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

  // --- Handlers ---

  const handleDelete = async (id) => {
    if (window.confirm("Delete this booking permanently?")) {
      try {
        await deleteDoc(doc(db, "bookings", id));
        toast.success("Booking deleted");
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
          <h2 className="text-3xl font-bold tracking-tight text-white">Manage Bookings</h2>
          <p className="mt-1 text-gray-400">Track trips, update status, and manage fares.</p>
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
                <th className="px-6 py-4">S.No</th>
                <th className="px-6 py-4">Booking ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Fare</th>
                <th className="px-6 py-4 text-center">Actions</th>
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
                      {/* Main Row */}
                      <tr className={`transition-colors hover:bg-white/5 ${isExpanded ? 'bg-white/5' : ''}`}>
                        
                        <td className="px-6 py-4 font-mono text-xs text-gray-500">
                           {(index + 1).toString().padStart(2, '0')}
                        </td>

                        <td className="px-6 py-4 font-mono text-xs text-gray-500">
                          {b.bookingId || b.id.slice(0,6)}
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{b.name}</div>
                          <a 
                            href={`tel:${b.phone?.replace(/\D/g, '')}`} 
                            className="text-xs text-gray-500 transition-colors hover:text-taxi-yellow"
                          >
                            {b.phone}
                          </a>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-sm">{b.source?.displayName || b.pickupLocation || 'N/A'}</div>
                          <div className="my-1 text-xs text-gray-500">to</div>
                          <div className="text-sm">{b.destination?.displayName || b.dropLocation || 'N/A'}</div>
                        </td>

                        <td className="px-6 py-4 text-xs leading-relaxed text-gray-400">
                          {/* Booked Date Added Here */}
                          <div className="mb-1">
                            <span className="font-bold text-gray-500">Booked:</span> {formatDate(b.createdAt)}
                          </div>
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

                        <td className="px-6 py-4">
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

                        <td className="px-6 py-4 font-mono text-lg font-bold text-right text-taxi-yellow">
                           ₹{currentTotal > 0 ? currentTotal : (b.totalCost || 0)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                             <button
                                onClick={() => setExpandedId(isExpanded ? null : b.id)}
                                className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
                             >
                                {isExpanded ? 'Close' : 'Edit Fare'} {isExpanded ? <FaChevronUp/> : <FaChevronDown/>}
                             </button>
                             
                             {b.status === 'completed' && (
                               <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleInvoice(b)} 
                                    title="Generate PDF" 
                                    className="flex items-center justify-center flex-1 p-2 text-xs text-blue-500 transition-colors rounded bg-blue-600/20 hover:bg-blue-600/30"
                                  >
                                    <FaFileInvoice/>
                                  </button>
                                  
                                  <button 
                                    onClick={() => handleEnableInvoice(b.id)} 
                                    title="Enable Customer Download" 
                                    className={`flex-1 p-2 rounded text-xs transition-colors flex justify-center items-center
                                      ${b.invoiceEnabled ? 'bg-green-600/40 text-green-400 cursor-default' : 'bg-green-600/20 text-green-500 hover:bg-green-600/30'}
                                    `}
                                  >
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
                        </td>
                      </tr>

                      {/* Expanded Row (Cost Editor) */}
                      {isExpanded && (
                        <tr className="bg-[#151515] border-b border-taxi-yellow/20">
                          <td colSpan="8" className="p-6">
                            <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-4">
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

                            <div className="flex items-center justify-between pt-4 border-t border-taxi-gray/50">
                               <div className="text-sm">
                                  Calculated Total: <span className="ml-2 text-xl font-bold text-taxi-yellow">₹{currentTotal}</span>
                               </div>
                               <div className="flex gap-3">
                                  <button 
                                    onClick={() => handleSaveCosts(b)}
                                    className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-black rounded shadow-lg bg-taxi-yellow hover:bg-yellow-400 shadow-yellow-500/20"
                                  >
                                    <FaSave /> Save Details
                                  </button>
                               </div>
                            </div>
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
    </div>
  );
};

// Sub-component for inputs
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