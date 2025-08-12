import React from 'react';
import { SpecialtyCardProps } from '../types/mapping';

/**
 * SpecialtyCard component for displaying individual unmapped specialties
 * 
 * @param specialty - The unmapped specialty to display
 * @param isSelected - Whether the specialty is currently selected
 * @param onSelect - Callback when the specialty is clicked
 */
export const SpecialtyCard: React.FC<SpecialtyCardProps> = ({ 
  specialty, 
  isSelected, 
  onSelect 
}) => {
  const handleClick = () => {
    onSelect(specialty);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full p-2 mb-1.5 text-left rounded-lg transition-all text-sm ${
        isSelected 
          ? 'bg-indigo-100 border-2 border-indigo-500' 
          : 'bg-white hover:bg-gray-50 border border-gray-200'
      }`}
    >
      <div className="font-medium text-sm">{specialty.name}</div>
      <div className="text-xs text-gray-500">Frequency: {specialty.frequency}</div>
    </button>
  );
};
