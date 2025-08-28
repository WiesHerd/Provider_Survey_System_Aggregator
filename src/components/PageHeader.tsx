import React, { useState } from 'react';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { downloadSampleFile } from '../utils/downloadUtils';

interface PageHeaderProps {
  title: string;
  description: string;
  showDownloadButton?: boolean;
  titleClassName?: string; // optional override for title size/style
  className?: string; // optional override for header container
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, showDownloadButton, titleClassName, className }) => {
  const [isDownloading, setIsDownloading] = useState(false);

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

  return (
    <header className={`h-16 border-b border-gray-100 bg-white flex items-center justify-between px-8 mb-6 ${className || ''}`}>
      <div>
        <h1 className={`${titleClassName ?? 'text-xl'} font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent`}>
          {title}
        </h1>
      </div>
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
    </header>
  );
};

export default PageHeader; 