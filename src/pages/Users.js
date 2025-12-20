import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { FaSearch, FaTrash, FaUserShield, FaUser, FaPhoneAlt, FaEnvelope } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [bookingPhones, setBookingPhones] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all'); 
  const [isLoading, setIsLoading] = useState(true);

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

  // Handle Delete (Deletes directly from Firestore)
  const handleDelete = async (userId) => {
    if (window.confirm("Are you sure you want to permanently delete this user from the database?")) {
      try {
        await deleteDoc(doc(db, "users", userId));
        toast.success("User deleted from Firestore successfully");
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error("Failed to delete user");
      }
    }
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
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>

      {/* Header Section */}
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">User Management</h2>
          <p className="mt-1 text-gray-400">Manage admin access and customer accounts.</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 group">
          <FaSearch className="absolute text-gray-500 transition-colors transform -translate-y-1/2 left-3 top-1/2 group-focus-within:text-taxi-yellow" />
          <input
            type="text"
            placeholder="Search name, email, phone..."
            className="w-full py-3 pl-10 pr-4 text-white transition-all border rounded-lg shadow-lg bg-taxi-dark border-taxi-gray focus:outline-none focus:border-taxi-yellow focus:ring-1 focus:ring-taxi-yellow"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex pb-1 space-x-2 border-b border-taxi-gray">
        {[
          { id: 'all', label: 'All Users', icon: null },
          { id: 'admin', label: 'Admins', icon: <FaUserShield className="mr-2"/> },
          { id: 'user', label: 'Customers', icon: <FaUser className="mr-2"/> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterRole(tab.id)}
            className={`flex items-center px-6 py-3 font-medium text-sm transition-all duration-200 rounded-t-lg relative
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
        {/* Added 'scrollbar-hide' class here */}
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left">
            <thead className="text-xs tracking-wider text-gray-400 uppercase bg-black/80">
              <tr>
                <th className="w-16 px-6 py-4">S.No</th>
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-center">Action</th>
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
                      <td className="px-6 py-4 font-mono text-gray-500">
                        {(index + 1).toString().padStart(2, '0')}
                      </td>

                      <td className="px-6 py-4">
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
                            <p className="font-bold text-white">{user.name || 'Unknown'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
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

                      <td className="px-6 py-4">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center px-3 py-1 text-xs font-bold text-yellow-500 border rounded-full bg-yellow-500/20 border-yellow-500/30">
                            <FaUserShield className="mr-2" /> ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 text-xs font-bold text-blue-400 border rounded-full bg-blue-500/10 border-blue-500/20">
                            CUSTOMER
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-gray-500 transition-all transform rounded-lg hover:text-red-500 hover:bg-red-500/10 hover:scale-110"
                          title="Delete User"
                        >
                          <FaTrash />
                        </button>
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
          <span>Pranav Drop Taxi Admin Panel</span>
        </div>
      </div>
    </div>
  );
};

export default Users;