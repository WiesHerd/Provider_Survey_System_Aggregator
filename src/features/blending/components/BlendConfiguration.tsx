/**
 * Blend Configuration Component
 * 
 * Handles blend name, description, and template management
 */

import React from 'react';
import { FormControl, Select, MenuItem, IconButton } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { BookmarkSlashIcon } from '@heroicons/react/24/outline';
import { SpecialtyBlendTemplate } from '../types/blending';

interface BlendConfigurationProps {
  blendName: string;
  blendDescription: string;
  onBlendNameChange: (name: string) => void;
  onBlendDescriptionChange: (description: string) => void;
  onSaveTemplate: () => void;
  onLoadTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  templates: SpecialtyBlendTemplate[];
  selectedTemplateId: string;
  selectedDataRows: number[];
}

export const BlendConfiguration: React.FC<BlendConfigurationProps> = ({
  blendName,
  blendDescription,
  onBlendNameChange,
  onBlendDescriptionChange,
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate,
  templates,
  selectedTemplateId,
  selectedDataRows
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Blend Configuration</h2>
          <div className="flex items-center space-x-3">
            {/* Saved Blends Dropdown */}
            {templates.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={selectedTemplateId || ""}
                  onChange={(e: SelectChangeEvent<string>) => {
                    const templateId = e.target.value;
                    if (templateId) {
                      onLoadTemplate(templateId);
                    }
                  }}
                  displayEmpty
                  renderValue={(selected: string) => {
                    if (!selected) {
                      return <em>📁 Saved Blends</em>;
                    }
                    const template = templates.find(t => t.id === selected);
                    return template ? (
                      <div className="flex items-center">
                        <span className="mr-2">📁</span>
                        <span className="truncate">{template.name}</span>
                      </div>
                    ) : <em>📁 Saved Blends</em>;
                  }}
                  aria-label="Saved Blends"
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#d1d5db',
                      borderWidth: '1px',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9ca3af',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3b82f6',
                      borderWidth: '1px',
                    }
                  }}
                >
                  <MenuItem value="" disabled>
                    <em>📁 Saved Blends</em>
                  </MenuItem>
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="font-medium text-gray-900">{template.name}</div>
                        {template.description && template.description !== template.name && (
                          <div className="text-xs text-gray-500">{template.description}</div>
                        )}
                      </div>
                      <IconButton 
                        size="small" 
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
                            onDeleteTemplate(template.id);
                          }
                        }}
                        sx={{ 
                          color: '#ef4444',
                          '&:hover': { backgroundColor: '#fee2e2' }
                        }}
                      >
                        <BookmarkSlashIcon className="h-3 w-3" />
                      </IconButton>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </div>
        </div>
      </div>
      <div className="px-6 py-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blend Name *
              </label>
              <input
                type="text"
                value={blendName}
                onChange={(e) => onBlendNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter blend name"
              />
            </div>
            <div className="lg:col-span-2">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={blendDescription}
                    onChange={(e) => onBlendDescriptionChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter description (optional)"
                  />
                </div>
                <button
                  onClick={onSaveTemplate}
                  disabled={selectedDataRows.length === 0}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Save Blend
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
