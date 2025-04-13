import React, { useState } from 'react';
import {
  HomeIcon,
  ChartBarIcon,
  DocumentIcon,
  ArrowUpTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const [activeItem, setActiveItem] = useState('Dashboard');
  
  const menuItems = [
    { name: 'Dashboard', icon: HomeIcon },
    { name: 'Upload Data', icon: ArrowUpTrayIcon },
    { name: 'Analytics', icon: ChartBarIcon },
    { name: 'Documents', icon: DocumentIcon },
    { name: 'Reports', icon: ChartBarIcon },
  ];

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-white transition-all duration-300 ease-in-out 
        ${isOpen ? 'w-64' : 'w-20'} flex flex-col border-r border-gray-100`}
    >
      {/* Branding */}
      <div className="flex items-center h-16 px-4">
        <div className="flex items-center">
          <div className="w-10 h-10">
            <svg className="w-full h-full text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
          </div>
          {isOpen && (
            <span className="ml-3 font-semibold text-gray-900">
              Market Intelligence
            </span>
          )}
        </div>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setActiveItem(item.name)}
            className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200
              ${!isOpen ? 'justify-center' : ''}
              ${activeItem === item.name 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            <item.icon className={`w-6 h-6 transition-colors duration-200
              ${activeItem === item.name ? 'text-indigo-600' : 'text-gray-500'}
            `} />
            {isOpen && (
              <span className="ml-3 font-medium text-sm">
                {item.name}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200
            ${!isOpen ? 'justify-center' : ''}
          `}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? (
            <>
              <ChevronLeftIcon className="w-6 h-6" />
              <span className="ml-3 font-medium text-sm">Collapse</span>
            </>
          ) : (
            <ChevronRightIcon className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 