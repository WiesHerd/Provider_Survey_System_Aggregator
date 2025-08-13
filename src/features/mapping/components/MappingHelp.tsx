import React from 'react';
import { MappingHelpProps } from '../types/mapping';
import { 
  LightBulbIcon, 
  ChevronDownIcon 
} from '@heroicons/react/24/outline';

/**
 * MappingHelp component for displaying help information about specialty mapping
 * 
 * @param isOpen - Whether the help section is expanded
 * @param onToggle - Callback to toggle the help section
 */
export const MappingHelp: React.FC<MappingHelpProps> = ({ 
  isOpen, 
  onToggle 
}) => {
  return (
    <div className="mb-6">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded font-medium mb-2"
      >
        <span className="flex items-center gap-2">
          <LightBulbIcon className="h-5 w-5 text-indigo-600" />
          <span>Specialty Mapping Help</span>
        </span>
        <ChevronDownIcon 
          className={`h-5 w-5 text-indigo-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      
      {isOpen && (
        <div className="p-4 bg-white border border-indigo-100 rounded shadow text-sm space-y-3">
          <h3 className="font-bold text-indigo-700 mb-1">How Auto-Mapping Works</h3>
          <ul className="list-disc pl-5 mb-2">
            <li>The app uses smart matching (including fuzzy logic and learned mappings) to suggest standardized specialties for each survey's specialty names.</li>
            <li>Auto-mapping considers spelling, abbreviations, and previous user corrections to improve accuracy.</li>
            <li>You can adjust the confidence threshold and enable/disable fuzzy matching in the Auto-Map dialog.</li>
          </ul>
          
          <h3 className="font-bold text-indigo-700 mb-1">How to Review and Fix Mappings</h3>
          <ul className="list-disc pl-5 mb-2">
            <li>After auto-mapping, review the suggested mappings in the "Mapped" tab.</li>
            <li>If a specialty is mapped incorrectly, you can delete the mapping and manually remap it by selecting the correct specialties and clicking "Create Mapping."</li>
            <li>Use the search bar to quickly find and review specific specialties.</li>
            <li>Clearing all mappings will reset the process and allow you to start over.</li>
          </ul>
          
          <h3 className="font-bold text-indigo-700 mb-1">Best Practices</h3>
          <ul className="list-disc pl-5">
            <li>Always review auto-mapped results for accuracy, especially for uncommon or ambiguous specialty names.</li>
            <li>Use consistent naming conventions in your source data for best results.</li>
            <li>Contact support if you encounter persistent mapping issues.</li>
          </ul>
        </div>
      )}
    </div>
  );
};
