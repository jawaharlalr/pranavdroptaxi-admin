import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { FaSearch, FaTrash, FaUserShield, FaUser, FaPhoneAlt, FaEnvelope, FaEye, FaTimes, FaIdBadge,} from 'react-icons/fa';
import toast from 'react-hot-toast';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [bookingPhones, setBookingPhones] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all'); 
  const [isLoading, setIsLoading] = useState(true);

  // Mobile Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Fetch Users Real-time
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setIsLoading(false);
    });

    return () => unsubscribeUsers();
  }, []);

  // 2. Fetch Bookings for Phones
  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));

    const unsubscribeBookings = onSnapshot(q, (snapshot) => {
      const phoneMap = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userId && (data.phone || data.phoneNumber)) {
          if (!phoneMap[data.userId]) {
            phoneMap[data.userId] = data.phone || data.phoneNumber;
          }
        }
      });
      setBookingPhones(phoneMap);
    });

    return () => unsubscribeBookings();
  }, []);

  // Handle Delete
  const handleDelete = async (userId) => {
    if (window.confirm("Are you sure you want to permanently delete this user?")) {
      try {
        await deleteDoc(doc(db, "users", userId));
        toast.success("User deleted successfully");
        if (selectedUser?.id === userId) closeModal();
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error("Failed to delete user");
      }
    }
  };

  const openModal = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  // Filter Logic
  const filteredUsers = users.filter(user => {
    const finalPhone = user.phone || user.phoneNumber || bookingPhones[user.id] || '';

    const matchesSearch = 
      (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      finalPhone.includes(searchTerm);
    
    const matchesRole = 
      filterRole === 'all' ? true : 
      filterRole === 'admin' ? user.role === 'admin' :
      user.role !== 'admin';

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Styles to hide scrollbar but keep functionality */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header Section */}
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">User Management</h2>
          <p className="mt-1 text-sm text-gray-400">Manage admin access and customer accounts.</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 group">
          <FaSearch className="absolute text-gray-500 transition-colors transform -translate-y-1/2 left-3 top-1/2 group-focus-within:text-taxi-yellow" />
          <input
            type="text"
            placeholder="Search name, email, phone..."
            className="w-full py-2.5 pl-10 pr-4 text-white transition-all border rounded-lg shadow-lg bg-taxi-dark border-taxi-gray focus:outline-none focus:border-taxi-yellow focus:ring-1 focus:ring-taxi-yellow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex pb-1 space-x-2 overflow-x-auto border-b border-taxi-gray scrollbar-hide">
        {[
          { id: 'all', label: 'All Users', icon: null },
          { id: 'admin', label: 'Admins', icon: <FaUserShield className="mr-2"/> },
          { id: 'user', label: 'Customers', icon: <FaUser className="mr-2"/> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterRole(tab.id)}
            className={`flex items-center px-4 md:px-6 py-3 font-medium text-sm transition-all duration-200 rounded-t-lg relative whitespace-nowrap
              ${filterRole === tab.id 
                ? 'text-taxi-yellow bg-white/5 border-b-2 border-taxi-yellow' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            {tab.icon}
            {tab.label}
            <span className="ml-2 bg-gray-800 text-xs py-0.5 px-2 rounded-full text-gray-400">
               {tab.id === 'all' ? users.length : 
                tab.id === 'admin' ? users.filter(u => u.role === 'admin').length : 
                users.filter(u => u.role !== 'admin').length}
            </span>
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="overflow-hidden border shadow-2xl bg-taxi-dark rounded-xl border-taxi-gray">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left">
            <thead className="text-xs tracking-wider text-gray-400 uppercase bg-black/80">
              <tr>
                <th className="w-16 px-4 py-4 md:px-6">S.No</th>
                <th className="px-4 py-4 md:px-6">User Details</th>
                <th className="hidden px-6 py-4 md:table-cell">Contact Info</th>
                <th className="px-4 py-4 md:px-6">Role</th>
                <th className="px-4 py-4 text-center md:px-6">Action</th>
              </tr>
            </thead>
            <tbody className="text-gray-300 divide-y divide-taxi-gray/50">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center">
                    <div className="w-8 h-8 mx-auto border-4 rounded-full animate-spin border-taxi-yellow border-t-transparent"></div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => {
                  const displayPhone = user.phone || user.phoneNumber || bookingPhones[user.id] || 'N/A';
                  
                  return (
                    <tr key={user.id} className="transition-colors hover:bg-white/5 group">
                      <td className="px-4 py-4 font-mono text-xs text-gray-500 md:px-6">
                        {(index + 1).toString().padStart(2, '0')}
                      </td>

                      <td className="px-4 py-4 md:px-6">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden mr-3 border 
                            ${user.role === 'admin' 
                              ? 'bg-taxi-yellow/20 border-taxi-yellow/50' 
                              : 'bg-blue-500/20 border-blue-500/30'}`}>
                            
                            {user.photoURL ? (
                              <img 
                                src={user.photoURL} 
                                alt={user.name} 
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <span className={`text-lg font-bold ${user.role === 'admin' ? 'text-taxi-yellow' : 'text-blue-400'}`}>
                                {user.name ? user.name.charAt(0).toUpperCase() : <FaUser size={14}/>}
                              </span>
                            )}
                          </div>
                          
                          <div>
                            <p className="text-sm font-bold text-white md:text-base">{user.name || 'Unknown'}</p>
                            {/* Mobile only: Show email truncated */}
                            <p className="block text-xs text-gray-500 md:hidden truncate max-w-[120px]">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Desktop Only Contact Info */}
                      <td className="hidden px-6 py-4 md:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <FaEnvelope className="w-4 mr-2 text-gray-600"/> 
                            <span className="truncate max-w-[150px]" title={user.email}>{user.email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <FaPhoneAlt className="w-4 mr-2 text-gray-600"/> 
                            <span className={displayPhone === 'N/A' ? 'text-gray-600' : 'text-white'}>
                              {displayPhone}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 md:px-6">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center px-2 py-1 text-[10px] md:text-xs font-bold text-yellow-500 border rounded-full bg-yellow-500/20 border-yellow-500/30">
                            <FaUserShield className="mr-1 md:mr-2" /> ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-[10px] md:text-xs font-bold text-blue-400 border rounded-full bg-blue-500/10 border-blue-500/20">
                            CUSTOMER
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center md:px-6">
                        {/* Desktop Actions */}
                        <div className="hidden md:block">
                            <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-gray-500 transition-all transform rounded-lg hover:text-red-500 hover:bg-red-500/10 hover:scale-110"
                            title="Delete User"
                            >
                            <FaTrash />
                            </button>
                        </div>

                        {/* Mobile Actions */}
                        <div className="flex justify-center gap-3 md:hidden">
                            <button 
                                onClick={() => openModal(user)}
                                className="p-2 text-blue-400 rounded-full bg-blue-500/10 hover:bg-blue-500/20"
                            >
                                <FaEye />
                            </button>
                            <button 
                                onClick={() => handleDelete(user.id)}
                                className="p-2 text-red-500 rounded-full bg-red-500/10 hover:bg-red-500/20"
                            >
                                <FaTrash />
                            </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        <div className="flex justify-between px-6 py-4 text-xs text-gray-500 border-t border-taxi-gray bg-black/40">
          <span>Showing {filteredUsers.length} users</span>
          <span>Pranav Drop Taxi Admin</span>
        </div>
      </div>

      {/* --- MOBILE MODAL --- */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm md:hidden">
          <div className="flex flex-col w-full max-h-[90vh] bg-[#121212] border border-taxi-yellow/20 rounded-2xl shadow-2xl overflow-hidden relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1a1a]">
              <h3 className="text-lg font-bold text-white">User Details</h3>
              <button onClick={closeModal} className="p-2 text-gray-400 bg-gray-800 rounded-full hover:text-white">
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto">
                
                {/* Profile Section */}
                <div className="flex flex-col items-center mb-6">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center overflow-hidden mb-3 border-4
                        ${selectedUser.role === 'admin' ? 'border-taxi-yellow bg-taxi-yellow/10' : 'border-blue-500 bg-blue-500/10'}`}>
                        {selectedUser.photoURL ? (
                            <img src={selectedUser.photoURL} alt={selectedUser.name} className="object-cover w-full h-full"/>
                        ) : (
                            <span className={`text-4xl font-bold ${selectedUser.role === 'admin' ? 'text-taxi-yellow' : 'text-blue-500'}`}>
                                {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : <FaUser />}
                            </span>
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-white">{selectedUser.name || 'Unknown User'}</h2>
                    <span className={`mt-2 px-3 py-1 text-xs font-bold rounded-full uppercase
                        ${selectedUser.role === 'admin' ? 'bg-taxi-yellow text-black' : 'bg-blue-600 text-white'}`}>
                        {selectedUser.role || 'Customer'}
                    </span>
                </div>

                {/* Info Cards */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg bg-gray-800/50">
                        <FaEnvelope className="text-gray-400"/>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase">Email</label>
                            <span className="text-sm text-white">{selectedUser.email || 'N/A'}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg bg-gray-800/50">
                        <FaPhoneAlt className="text-gray-400"/>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase">Phone</label>
                            <span className="text-sm text-white">
                                {selectedUser.phone || selectedUser.phoneNumber || bookingPhones[selectedUser.id] || 'Not Available'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border border-gray-700 rounded-lg bg-gray-800/50">
                        <FaIdBadge className="text-gray-400"/>
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase">User ID</label>
                            <span className="font-mono text-xs text-gray-400 break-all">{selectedUser.id}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-800 bg-[#1a1a1a]">
                <button 
                    onClick={() => handleDelete(selectedUser.id)}
                    className="flex items-center justify-center w-full gap-2 py-3 text-sm font-bold text-red-500 transition-colors bg-red-500/10 rounded-xl hover:bg-red-500/20"
                >
                    <FaTrash /> Delete Permanently
                </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Users;