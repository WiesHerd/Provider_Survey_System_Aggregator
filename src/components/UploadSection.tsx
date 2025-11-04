import React, { useState } from 'react';
import { clearDatabase } from '../utils/clearDatabase';

interface UploadSectionProps {
  onUpload: (file: File) => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onUpload }) => {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearDatabase = async () => {
    if (window.confirm('Are you sure you want to clear all survey data? This cannot be undone.')) {
      setIsClearing(true);
      try {
        await clearDatabase();
        window.location.reload(); // Reload the page to show empty state
      } catch (error) {
        console.error('Failed to clear database:', error);
        alert('Failed to clear database. Please try again.');
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Upload Survey Data</h2>
        <button
          onClick={handleClearDatabase}
          disabled={isClearing}
          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200"
        >
          {isClearing ? 'Clearing...' : 'Clear All Data'}
        </button>
      </div>
      {/* Add your existing upload UI components here */}
    </div>
  );
};

export default UploadSection; 