import React, { useState } from 'react';
import { CloudArrowUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { downloadSampleFile } from '../utils/downloadUtils';
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


  // Year Selector Component - Silicon Valley Style
  const YearSelector = () => {
    return (
      <div className="relative group">
        {/* Modern dropdown button with clear visual cues */}
        <div className="
          inline-flex items-center px-3 py-2 rounded-xl text-sm font-medium
          transition-all duration-200 shadow-sm border
          hover:shadow-md cursor-pointer
          bg-white text-gray-700 border-gray-200 
          hover:border-gray-300 hover:bg-gray-50
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        ">
          <span className="font-medium">
            {currentYear}
          </span>
          
          {/* Clear dropdown indicator - Silicon Valley style */}
          <ChevronDownIcon className="ml-2 w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
        </div>
        
        {/* Invisible select overlay for functionality */}
        <select
          value={currentYear}
          onChange={(e) => setCurrentYear(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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