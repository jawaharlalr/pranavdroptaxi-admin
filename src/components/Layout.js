import React, { useState } from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex font-sans">
      {/* Pass state and toggle function down to Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Area 
          - Mobile: ml-0 (no side margin), pb-20 (padding for bottom nav)
          - Desktop: md:ml-64/20 (side margin), md:pb-8 (normal padding)
      */}
      <main 
        className={`
          flex-1 p-4 md:p-8 
          overflow-y-auto h-screen custom-scrollbar 
          transition-all duration-500 ease-in-out
          ml-0 pb-24 md:pb-8 
          ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}
        `}
      >
        {children}
      </main>
    </div>
  );
};

export default Layout;