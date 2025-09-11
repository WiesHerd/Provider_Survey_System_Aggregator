/**
 * Bulk Mapping Creator - UI component for creating initial mappings
 * that will be saved for future survey uploads
 */

import React, { useState } from 'react';
import { PlusIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { ISpecialtyMapping } from '../types/mapping';
import { SurveySource } from '../../../shared/types';

interface BulkMappingCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mappings: ISpecialtyMapping[]) => Promise<void>;
}

interface MappingDraft {
  id: string;
  standardizedName: string;
  sourceSpecialties: Array<{
    specialty: string;
    surveySource: SurveySource;
  }>;
}

export const BulkMappingCreator: React.FC<BulkMappingCreatorProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [mappings, setMappings] = useState<MappingDraft[]>([
    {
      id: '1',
      standardizedName: '',
      sourceSpecialties: [
        { specialty: '', surveySource: 'MGMA' as SurveySource },
        { specialty: '', surveySource: 'SullivanCotter' as SurveySource },
        { specialty: '', surveySource: 'Gallagher' as SurveySource }
      ]
    }
  ]);

  const [saving, setSaving] = useState(false);

  const addMapping = () => {
    const newId = (mappings.length + 1).toString();
    setMappings([...mappings, {
      id: newId,
      standardizedName: '',
      sourceSpecialties: [
        { specialty: '', surveySource: 'MGMA' as SurveySource },
        { specialty: '', surveySource: 'SullivanCotter' as SurveySource },
        { specialty: '', surveySource: 'Gallagher' as SurveySource }
      ]
    }]);
  };

  const removeMapping = (id: string) => {
    setMappings(mappings.filter(m => m.id !== id));
  };

  const updateMapping = (id: string, field: string, value: string) => {
    setMappings(mappings.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const updateSourceSpecialty = (mappingId: string, sourceIndex: number, field: string, value: string) => {
    setMappings(mappings.map(m => 
      m.id === mappingId 
        ? {
            ...m,
            sourceSpecialties: m.sourceSpecialties.map((source, index) =>
              index === sourceIndex ? { ...source, [field]: value } : source
            )
          }
        : m
    ));
  };

  const addSourceSpecialty = (mappingId: string) => {
    setMappings(mappings.map(m => 
      m.id === mappingId 
        ? {
            ...m,
            sourceSpecialties: [...m.sourceSpecialties, { specialty: '', surveySource: 'MGMA' as SurveySource }]
          }
        : m
    ));
  };

  const removeSourceSpecialty = (mappingId: string, sourceIndex: number) => {
    setMappings(mappings.map(m => 
      m.id === mappingId 
        ? {
            ...m,
            sourceSpecialties: m.sourceSpecialties.filter((_, index) => index !== sourceIndex)
          }
        : m
    ));
  };

  const convertToISpecialtyMapping = (draft: MappingDraft): ISpecialtyMapping => {
    return {
      id: draft.id,
      standardizedName: draft.standardizedName,
      sourceSpecialties: draft.sourceSpecialties
        .filter(source => source.specialty.trim() !== '')
        .map((source, index) => ({
          id: `${draft.id}${String.fromCharCode(97 + index)}`,
          specialty: source.specialty,
          originalName: source.specialty,
          surveySource: source.surveySource,
          frequency: 1,
          mappingId: draft.id
        })),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  const handleSave = async () => {
    const validMappings = mappings
      .filter(m => m.standardizedName.trim() !== '' && m.sourceSpecialties.some(s => s.specialty.trim() !== ''))
      .map(convertToISpecialtyMapping);

    if (validMappings.length === 0) {
      alert('Please add at least one valid mapping');
      return;
    }

    setSaving(true);
    try {
      await onSave(validMappings);
      onClose();
    } catch (error) {
      console.error('Error saving mappings:', error);
      alert('Failed to save mappings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Create Initial Mappings</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Create mappings that will be automatically applied to future survey uploads
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {mappings.map((mapping, mappingIndex) => (
              <div key={mapping.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">
                    Mapping #{mappingIndex + 1}
                  </h4>
                  {mappings.length > 1 && (
                    <button
                      onClick={() => removeMapping(mapping.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Standardized Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Standardized Name *
                  </label>
                  <input
                    type="text"
                    value={mapping.standardizedName}
                    onChange={(e) => updateMapping(mapping.id, 'standardizedName', e.target.value)}
                    placeholder="e.g., Cardiology"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Source Specialties */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Source Specialties *
                    </label>
                    <button
                      onClick={() => addSourceSpecialty(mapping.id)}
                      className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Add Source</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {mapping.sourceSpecialties.map((source, sourceIndex) => (
                      <div key={sourceIndex} className="flex items-center space-x-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={source.specialty}
                            onChange={(e) => updateSourceSpecialty(mapping.id, sourceIndex, 'specialty', e.target.value)}
                            placeholder="e.g., Cardiology, Cardiovascular Disease"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="w-32">
                          <select
                            value={source.surveySource}
                            onChange={(e) => updateSourceSpecialty(mapping.id, sourceIndex, 'surveySource', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="MGMA">MGMA</option>
                            <option value="SullivanCotter">SullivanCotter</option>
                            <option value="Gallagher">Gallagher</option>
                          </select>
                        </div>
                        {mapping.sourceSpecialties.length > 1 && (
                          <button
                            onClick={() => removeSourceSpecialty(mapping.id, sourceIndex)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Add Mapping Button */}
            <button
              onClick={addMapping}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all duration-200"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Another Mapping</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {saving ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckIcon className="h-4 w-4" />
                <span>Save Mappings</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
