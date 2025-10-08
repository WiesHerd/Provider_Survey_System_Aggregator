import React, { useState } from 'react';
import { CloudArrowUpIcon, UserIcon, UserGroupIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { downloadSampleFile } from '../utils/downloadUtils';
import { useProviderContext } from '../contexts/ProviderContext';
import { useYear } from '../contexts/YearContext';

interface PageHeaderProps {
  title: string;
  description: string;
  showDownloadButton?: boolean;
  titleClassName?: string; // optional override for title size/style
  className?: string; // optional override for header container
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, showDownloadButton, titleClassName, className }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { selectedProviderType } = useProviderContext();
  const { currentYear, setCurrentYear, availableYears } = useYear();

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadSampleFile();
    } catch (error) {
      console.error('Download failed:', error);
      // You could add a toast notification here
    } finally {
      setIsDownloading(false);
    }
  };

  // Data View Indicator Component
  const DataViewIndicator = () => {
    const isPhysician = selectedProviderType === 'PHYSICIAN';
    const isAPP = selectedProviderType === 'APP';
    
    return (
      <div className="flex items-center space-x-3">
        {/* Data View Badge with modern styling */}
        <div 
          className={`
            inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium
            transition-all duration-300 shadow-sm border backdrop-blur-sm
            hover:scale-105 hover:shadow-md cursor-default
            ${isPhysician 
              ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-300/50 hover:from-blue-100 hover:to-blue-200' 
              : isAPP 
              ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border-purple-300/50 hover:from-purple-100 hover:to-purple-200'
              : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-300/50 hover:from-gray-100 hover:to-gray-200'
            }
          `}
          title={`Currently viewing ${isPhysician ? 'Physician' : isAPP ? 'Advanced Practice Provider' : 'Provider'} data`}
        >
          {/* Icon with subtle animation */}
          <div className="flex items-center">
            {isPhysician ? (
              <UserIcon className="w-3.5 h-3.5 mr-1.5 transition-transform duration-200" />
            ) : isAPP ? (
              <UserGroupIcon className="w-3.5 h-3.5 mr-1.5 transition-transform duration-200" />
            ) : (
              <UserIcon className="w-3.5 h-3.5 mr-1.5 transition-transform duration-200" />
            )}
            <span className="font-semibold tracking-wide">
              {isPhysician ? 'Physicians' : isAPP ? 'APP\'s' : 'Data View'}
            </span>
          </div>
          
          {/* Subtle status indicator dot */}
          <div className={`
            ml-2 w-1.5 h-1.5 rounded-full transition-all duration-200
            ${isPhysician 
              ? 'bg-blue-500 shadow-sm' 
              : isAPP 
              ? 'bg-purple-500 shadow-sm'
              : 'bg-gray-400'
            }
          `} />
        </div>
      </div>
    );
  };

  // Year Selector Component
  const YearSelector = () => {
    return (
      <div className="flex items-center space-x-2">
        <CalendarIcon className="w-4 h-4 text-gray-500" />
        <select
          value={currentYear}
          onChange={(e) => setCurrentYear(e.target.value)}
          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
          aria-label="Select year"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <header className={`h-16 border-b border-gray-100 bg-white flex items-center justify-between px-8 mb-6 ${className || ''}`}>
      <div>
        <h1 className={`${titleClassName ?? 'text-xl'} font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent`}>
          {title}
        </h1>
      </div>
      
      {/* Right side actions */}
      <div className="flex items-center space-x-4">
        {/* Data View Indicator */}
        <DataViewIndicator />
        
        {/* Year Selector */}
        <YearSelector />
        
        {/* Download Button */}
        {showDownloadButton && (
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CloudArrowUpIcon className="h-3 w-3 mr-1.5" />
            {isDownloading ? 'Downloading...' : 'Download Sample'}
          </button>
        )}
      </div>
    </header>
  );
};

export default PageHeader; 