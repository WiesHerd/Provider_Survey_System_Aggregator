import React, { useRef } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
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
  InformationCircleIcon,
  DocumentChartBarIcon,
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
  const listRef = useRef<HTMLUListElement>(null);
  
  const menuItems: MenuItem[] = [
    { name: 'Dashboard', icon: HomeIcon, path: '/dashboard' },
    { name: 'Upload Data', icon: ArrowUpTrayIcon, path: '/upload' },
    { name: 'Specialty Mapping', icon: LinkIcon, path: '/specialty-mapping' },
    { name: 'Column Mapping', icon: TableCellsIcon, path: '/column-mapping' },
    { name: 'Survey Analytics', icon: PresentationChartLineIcon, path: '/analytics' },
    { name: 'Regional Analytics', icon: MapIcon, path: '/regional-analytics' },
    { name: 'Custom Reports', icon: DocumentChartBarIcon, path: '/custom-reports' },
    { name: 'Fair Market Value', icon: CalculatorIcon, path: '/fair-market-value' },
    { name: 'Instructions', icon: InformationCircleIcon, path: '/instructions' },
  ];

  const handleNavigation = (path: string) => navigate(path);

  // Keyboard navigation: Arrow/Home/End over visible items
  const handleKeyDown: React.KeyboardEventHandler<HTMLUListElement> = (e) => {
    const items = Array.from((listRef.current?.querySelectorAll('[role="menuitem"]') || []) as NodeListOf<HTMLElement>);
    const currentIndex = items.findIndex((el) => el === document.activeElement);
    if (items.length === 0) return;
    let nextIndex = currentIndex;
    switch (e.key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1 + items.length) % items.length; break;
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + items.length) % items.length; break;
      case 'Home':
        nextIndex = 0; break;
      case 'End':
        nextIndex = items.length - 1; break;
      case 'Escape':
        setIsOpen(false); return;
      default:
        return;
    }
    e.preventDefault();
    items[nextIndex]?.focus();
  };

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const isActive = currentPath === item.path;

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
            ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
          `}
        >
          <item.icon className={`w-5 h-5 transition-colors duration-200
            ${isActive ? 'text-indigo-600' : 'text-gray-500'}
          `} />
          {isOpen && (
            <span className="ml-3 font-medium text-xs">
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
      className={`fixed left-0 top-0 h-screen bg-white transition-all duration-300 ease-in-out z-40
        ${isOpen ? 'w-64' : 'w-20'} flex flex-col border-r border-gray-100`}
    >
      {/* Branding */}
      <div className="flex items-center h-16 px-4">
        <div className="flex items-center">
          <div className="w-12 h-12 flex items-center justify-center">
            <img src="/contract-hub-icon.svg" alt="Contract Hub - Survey Aggregator" className="w-10 h-10 object-contain" onError={(e) => {
              const target = e.target as HTMLImageElement;
              console.log('Image failed to load:', target.src);
              target.style.display = 'none';
            }} />
          </div>
          {isOpen && (
            <span className="ml-3 font-bold text-xl flex items-center" style={{ letterSpacing: 0.5 }}>
              <span className="text-gray-900">Contract</span>
              <span className="text-indigo-600">Hub</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Menu */}
      <nav aria-label="Primary" className="flex-1 px-2 py-4">
        <ul role="menu" ref={listRef} onKeyDown={handleKeyDown} className="space-y-1">
          {menuItems.map(item => (
            <li key={item.name}>
              {(!isOpen && item.children) ? (
                // When collapsed, render children directly
                <ul role="menu" className="space-y-1">
                  {item.children.map(child => (
                    <li key={child.name}>
                      <NavLink
                        to={child.path}
                        role="menuitem"
                        className={({ isActive }) => `w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 justify-center ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                      >
                        <child.icon className={`w-5 h-5`} />
                      </NavLink>
                    </li>
                  ))}
                </ul>
              ) : (
                <div>
                  <NavLink
                    to={item.path}
                    role="menuitem"
                    aria-current={currentPath === item.path ? 'page' : undefined}
                    className={({ isActive }) => `w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${!isOpen ? 'justify-center' : ''} ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    <item.icon className={`w-5 h-5 ${currentPath === item.path ? 'text-indigo-600' : 'text-gray-500'}`} />
                    {isOpen && <span className="ml-3 font-medium text-xs">{item.name}</span>}
                  </NavLink>
                  {isOpen && item.children && (
                    <ul role="menu" className="mt-1 ml-6 space-y-1">
                      {item.children.map(child => (
                        <li key={child.name}>
                          <NavLink
                            to={child.path}
                            role="menuitem"
                            className={({ isActive }) => `w-full flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                          >
                            <child.icon className={`w-5 h-5 ${currentPath === child.path ? 'text-indigo-600' : 'text-gray-500'}`} />
                            <span className="ml-3 font-medium text-xs">{child.name}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="absolute left-4 bottom-4">
        <div className="group relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 bg-white shadow-md hover:bg-gray-100 transition-all duration-200 focus:outline-none"
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? (
              <ChevronLeftIcon className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
            )}
          </button>
          <span className="absolute left-14 top-1/2 -translate-y-1/2 px-3 py-1 rounded bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
            {isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 