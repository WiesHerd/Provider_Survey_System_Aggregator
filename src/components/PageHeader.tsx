import React, { useState, useEffect, useRef } from 'react';
import { CloudArrowUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { downloadSampleFile } from '../utils/downloadUtils';
import { useYear } from '../contexts/YearContext';
import { useToast } from '../contexts/ToastContext';

interface PageHeaderProps {
  title: string;
  description: string;
  showDownloadButton?: boolean;
  titleClassName?: string; // optional override for title size/style
  className?: string; // optional override for header container
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, showDownloadButton, titleClassName, className }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const { currentYear, setCurrentYear, availableYears, loading, error } = useYear();
  const toast = useToast();
  const lastErrorToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!error) {
      lastErrorToastRef.current = null;
      return;
    }
    if (lastErrorToastRef.current === error) return;
    lastErrorToastRef.current = error;
    toast.error('Year selection', error);
  }, [error, toast]);

  // When available years no longer include current (e.g. 2026 removed), sync to first available so selection and data match
  useEffect(() => {
    if (loading || availableYears.length === 0) return;
    if (!availableYears.includes(currentYear)) {
      setCurrentYear(availableYears[0]);
    }
  }, [loading, availableYears, currentYear, setCurrentYear]);

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
  // Use a value that is always in the list so the select never shows a stale/invalid year
  const effectiveYear = availableYears.length > 0 && availableYears.includes(currentYear)
    ? currentYear
    : (availableYears[0] ?? currentYear);

  const YearSelector = () => {
    return (
      <div className="flex items-center space-x-3">
        {/* Year Label */}
        <span className="text-sm font-medium text-gray-600">
          Select Year:
        </span>
        
        {/* Year Dropdown */}
        <div className="relative group">
          {/* Visible button - pointer-events-none so clicks pass through to select */}
          <div
            className={`
            inline-flex items-center px-3 h-8 rounded-xl text-sm font-medium
            transition-all duration-200 shadow-sm border
            bg-white text-gray-700 border-gray-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            pointer-events-none
            ${loading ? 'opacity-70 cursor-wait' : 'hover:shadow-md cursor-pointer hover:border-gray-300 hover:bg-gray-50'}
          `}
            aria-hidden
          >
            <span className="font-medium">
              {loading ? '...' : effectiveYear}
            </span>
            <ChevronDownIcon className="ml-2 w-4 h-4 text-gray-500 transition-colors" />
          </div>
          {/* Select on top so it receives clicks and opens reliably */}
          <select
            value={effectiveYear}
            onChange={(e) => setCurrentYear(e.target.value)}
            disabled={loading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
            aria-label="Select year"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <header className={`min-h-[80px] py-3 border-b border-gray-100 bg-white flex items-center justify-between pl-8 pr-24 mb-6 ${className || ''}`}>
      <div>
        <h1 className={`${titleClassName ?? 'text-xl'} font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent`}>
          {title}
        </h1>
      </div>
      
      {/* Right side actions */}
      <div className="flex items-center space-x-4 flex-shrink-0">
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