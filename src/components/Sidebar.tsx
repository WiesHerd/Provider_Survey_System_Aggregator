import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  DocumentIcon,
  ArrowUpTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LinkIcon,
  TableCellsIcon,
  ClipboardDocumentListIcon,
  PresentationChartLineIcon,
  MapIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

interface MenuItem {
  name: string;
  icon: React.ComponentType<any>;
  path: string;
  children?: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const menuItems: MenuItem[] = [
    { name: 'Dashboard', icon: HomeIcon, path: '/dashboard' },
    {
      name: 'Survey Processing',
      icon: ClipboardDocumentListIcon,
      path: '/upload',
      children: [
        { name: 'Upload Data', icon: ArrowUpTrayIcon, path: '/upload' },
        { name: 'Specialty Mapping', icon: LinkIcon, path: '/specialty-mapping' },
        { name: 'Column Mapping', icon: TableCellsIcon, path: '/column-mapping' },
      ]
    },
    { name: 'Survey Analytics', icon: PresentationChartLineIcon, path: '/analytics' },
    { name: 'Fair Market Value', icon: CalculatorIcon, path: '/fair-market-value' },
    { name: 'Documents', icon: DocumentIcon, path: '/documents' },
    { name: 'Reports', icon: ChartBarIcon, path: '/reports' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const isActive = currentPath === item.path;
    const isParentActive = item.children?.some(child => child.path === currentPath);

    // When collapsed and item has children, don't render the parent item
    if (!isOpen && item.children) {
      return (
        <div key={item.name}>
          {item.children.map(child => renderMenuItem(child, false))}
        </div>
      );
    }

    return (
      <div key={item.name} className={isChild ? 'ml-6' : ''}>
        <button
          onClick={() => handleNavigation(item.path)}
          className={`w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200
            ${!isOpen ? 'justify-center' : ''}
            ${(isActive || isParentActive)
              ? 'bg-indigo-50 text-indigo-600' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }
          `}
        >
          <item.icon className={`w-6 h-6 transition-colors duration-200
            ${(isActive || isParentActive) ? 'text-indigo-600' : 'text-gray-500'}
          `} />
          {isOpen && (
            <span className="ml-3 font-medium text-sm">
              {item.name}
            </span>
          )}
        </button>
        {isOpen && item.children && (
          <div className="mt-1">
            {item.children.map(child => renderMenuItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-white transition-all duration-300 ease-in-out 
        ${isOpen ? 'w-64' : 'w-20'} flex flex-col border-r border-gray-100`}
    >
      {/* Branding */}
      <div className="flex items-center h-16 px-4">
        <div className="flex items-center">
          <div className="w-12 h-12 flex items-center justify-center">
            <img src="/Icon.png" alt="BenchPoint Logo" className="w-10 h-10 object-contain" />
          </div>
          {isOpen && (
            <span className="ml-3 font-bold text-2xl flex items-center" style={{ letterSpacing: 0.5 }}>
              <span className="text-gray-900">Bench</span>
              <span className="text-indigo-600">Point</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Bottom Section */}
      <div className="absolute left-4 bottom-4">
        <div className="group relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 bg-white shadow-md hover:bg-gray-100 transition-all duration-200 focus:outline-none"
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
          </button>
          <span className="absolute left-14 top-1/2 -translate-y-1/2 px-3 py-1 rounded bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
            Collapse sidebar
          </span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 