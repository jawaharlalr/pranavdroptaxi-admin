import React, { useState } from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex font-sans">
      {/* Pass state and toggle function down to Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area 
          - Increased duration to 500ms to match Sidebar
          - Added ease-in-out for smoother motion
      */}
      <main 
        className={`flex-1 p-8 overflow-y-auto h-screen custom-scrollbar transition-all duration-500 ease-in-out ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;