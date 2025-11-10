/**
 * Template Manager Component
 * 
 * Simplified template management with proper state machine
 * Handles loading, saving, and deleting templates
 */

import React, { useState } from 'react';
import { FormControl, Select, MenuItem, IconButton } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { BookmarkSlashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SpecialtyBlendTemplate } from '../types/blending';
import { ConfirmationModal } from '../../../components/ui/confirmation-modal';

type TemplateLoadingState = 'idle' | 'loading' | 'applying' | 'complete' | 'error';

interface TemplateManagerProps {
  templates: SpecialtyBlendTemplate[];
  selectedTemplateId: string;
  onLoadTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  blendName: string;
  blendDescription: string;
  onBlendNameChange: (name: string) => void;
  onBlendDescriptionChange: (description: string) => void;
  onSaveTemplate: () => void;
  onClearBlend: () => void;
  selectedDataRows: number[];
  isLoadingTemplate?: boolean;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  selectedTemplateId,
  onLoadTemplate,
  onDeleteTemplate,
  blendName,
  blendDescription,
  onBlendNameChange,
  onBlendDescriptionChange,
  onSaveTemplate,
  onClearBlend,
  selectedDataRows,
  isLoadingTemplate = false
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<TemplateLoadingState>('idle');

  const handleTemplateSelect = (templateId: string) => {
    if (!templateId) return;
    
    setLoadingState('loading');
    try {
      onLoadTemplate(templateId);
      setLoadingState('applying');
      // State will be updated by parent component
      setTimeout(() => {
        setLoadingState('complete');
        setTimeout(() => setLoadingState('idle'), 1000);
      }, 500);
    } catch (error) {
      setLoadingState('error');
      setTimeout(() => setLoadingState('idle'), 2000);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    setDeleteConfirmId(templateId);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteTemplate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const isLoading = isLoadingTemplate || loadingState !== 'idle';

  return (
    <>
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
                        handleTemplateSelect(templateId);
                      }
                    }}
                    displayEmpty
                    disabled={isLoading}
                    renderValue={(selected: string) => {
                      if (!selected) {
                        return <em>📁 Saved Blends</em>;
                      }
                      const template = templates.find(t => t.id === selected);
                      return template ? (
                        <div className="flex items-center">
                          <span className="mr-2">📁</span>
                          <span className="truncate">{template.name}</span>
                          {isLoading && (
                            <svg className="animate-spin ml-2 h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
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
                          onClick={(e: React.MouseEvent) => handleDeleteClick(e, template.id)}
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
                    onClick={onClearBlend}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 shadow-sm whitespace-nowrap"
                    title="Clear current blend and start a new one"
                  >
                    <XMarkIcon className="w-4 h-4 mr-2" />
                    Clear
                  </button>
                  <button
                    onClick={onSaveTemplate}
                    disabled={selectedDataRows.length === 0 || !blendName.trim()}
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Blend Template"
        message={`Are you sure you want to delete "${templates.find(t => t.id === deleteConfirmId)?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="error"
      />
    </>
  );
};
