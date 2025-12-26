import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaChartPie, 
  FaList, 
  FaSignOutAlt, 
  FaUsers, 
  FaStar, 
  FaChevronLeft, 
  FaChevronRight 
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { logout } = useAuth();
  const location = useLocation();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <FaChartPie /> },
    { name: 'Bookings', path: '/bookings', icon: <FaList /> },
    { name: 'Users', path: '/users', icon: <FaUsers /> },
    { name: 'Reviews', path: '/reviews', icon: <FaStar /> },
  ];

  return (
    <>
      {/* ----------------- DESKTOP SIDEBAR (Hidden on Mobile) ----------------- */}
      <div 
        className={`hidden md:flex ${isOpen ? 'w-64' : 'w-20'} fixed top-0 left-0 z-50 flex-col h-screen text-white transition-all duration-500 ease-in-out border-r shadow-2xl bg-taxi-black border-taxi-gray`}
      >
        {/* Header / Logo Section */}
        <div className="relative flex items-center justify-center h-16 py-2 overflow-hidden border-b border-taxi-gray bg-gradient-to-r from-taxi-black to-taxi-dark">
          <div className={`absolute transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
             <img src="/header.png" alt="Pranav Drop Taxi" className="object-contain w-auto h-12 transform scale-125" />
          </div>
          <div className={`absolute transition-opacity duration-500 ${isOpen ? 'opacity-0' : 'opacity-100'}`}>
             <img src="/favicon.ico" alt="Logo" className="object-contain w-8 h-8" />
          </div>
        </div>

        {/* Toggle Button */}
        <button 
          onClick={toggleSidebar}
          className="absolute z-50 p-1 text-black transition-all duration-500 border border-white rounded-full shadow-lg -right-3 top-20 bg-taxi-yellow hover:bg-white focus:outline-none hover:scale-110"
        >
          {isOpen ? <FaChevronLeft size={12} /> : <FaChevronRight size={12} />}
        </button>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 space-y-2 overflow-x-hidden">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              title={!isOpen ? item.name : ''}
              className={`flex items-center py-3 transition-all duration-300 border-l-4 group relative overflow-hidden ${
                location.pathname === item.path
                  ? 'bg-taxi-gray border-taxi-yellow text-taxi-yellow'
                  : 'border-transparent text-gray-400 hover:bg-taxi-dark hover:text-white'
              } ${isOpen ? 'px-6' : 'px-0 justify-center'}`}
            >
              <span className={`text-xl transition-all duration-300 ${isOpen ? 'mr-0' : ''}`}>
                {item.icon}
              </span>
              <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'w-40 ml-4 opacity-100 translate-x-0' : 'w-0 ml-0 opacity-0 -translate-x-4'}`}>
                {item.name}
              </span>
            </Link>
          ))}
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-taxi-gray">
          <button
            onClick={logout}
            className={`flex items-center justify-center w-full py-2 text-red-500 transition-all duration-300 rounded bg-red-600/10 hover:bg-red-600 hover:text-white group overflow-hidden ${!isOpen ? 'px-0' : ''}`}
            title={!isOpen ? 'Logout' : ''}
          >
            <FaSignOutAlt className={`transition-all duration-300 ${isOpen ? 'mr-0' : ''}`} /> 
            <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'w-20 ml-2 opacity-100' : 'w-0 ml-0 opacity-0'}`}>
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* ----------------- MOBILE BOTTOM NAVIGATION (Hidden on Desktop) ----------------- */}
      <div className="fixed bottom-0 left-0 z-50 w-full h-16 border-t shadow-2xl md:hidden bg-taxi-black border-taxi-gray">
        <div className="grid h-full max-w-lg grid-cols-5 mx-auto">
          
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`inline-flex flex-col items-center justify-center px-5 group ${
                location.pathname === item.path ? 'text-taxi-yellow' : 'text-gray-400 hover:text-white'
              }`}
            >
               {/* Icon Animation */}
               <div className={`mb-1 transition-transform duration-200 ${location.pathname === item.path ? '-translate-y-1 scale-110' : ''}`}>
                  {React.cloneElement(item.icon, { size: 20 })}
               </div>
               <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          ))}

          {/* Mobile Logout Button */}
          <button
            onClick={logout}
            className="inline-flex flex-col items-center justify-center px-5 text-gray-400 hover:text-red-500 group"
          >
             <FaSignOutAlt size={20} className="mb-1" />
             <span className="text-[10px] font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;