/**
 * Specialty Blending Screen
 * 
 * This is the main screen for specialty blending functionality,
 * featuring modern drag & drop interface and precision controls.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSpecialtyBlending } from '../hooks/useSpecialtyBlending';
import { SpecialtyItem } from '../types/blending';
import { SortableSpecialtyItem } from './SortableSpecialtyItem';
import { WeightControl } from './WeightControl';
import { TemplateManager } from './TemplateManager';
import { BlendingResults } from './BlendingResults';

interface SpecialtyBlendingScreenProps {
  onBlendCreated?: (result: any) => void;
  onClose?: () => void;
}

export const SpecialtyBlendingScreen: React.FC<SpecialtyBlendingScreenProps> = ({
  onBlendCreated,
  onClose
}) => {
  const [blendName, setBlendName] = useState('');
  const [blendDescription, setBlendDescription] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [blendedResult, setBlendedResult] = useState<any>(null);
  
  // Drag & Drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const {
    selectedSpecialties,
    availableSpecialties,
    templates,
    isLoading,
    error,
    validation,
    addSpecialty,
    removeSpecialty,
    updateWeight,
    reorderSpecialties,
    createBlend,
    saveTemplate,
    loadTemplate,
    resetBlend
  } = useSpecialtyBlending({
    maxSpecialties: 10,
    allowTemplates: true
  });
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const activeIndex = selectedSpecialties.findIndex(s => s.id === active.id);
      const overIndex = selectedSpecialties.findIndex(s => s.id === over?.id);
      
      if (activeIndex !== -1 && overIndex !== -1) {
        reorderSpecialties(activeIndex, overIndex);
      }
    }
    
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };
  
  const handleCreateBlend = async () => {
    if (!blendName.trim()) {
      alert('Please enter a blend name');
      return;
    }
    
    if (!validation.isValid) {
      alert(`Please fix the following errors:\n${validation.errors.join('\n')}`);
      return;
    }
    
    try {
      const result = await createBlend(blendName, blendDescription);
      setBlendedResult(result);
      setShowResults(true);
      onBlendCreated?.(result);
    } catch (err) {
      console.error('Failed to create blend:', err);
    }
  };
  
  const handleSaveTemplate = async () => {
    if (!blendName.trim()) {
      alert('Please enter a template name');
      return;
    }
    
    try {
      await saveTemplate({
        name: blendName,
        description: blendDescription,
        specialties: selectedSpecialties,
        weights: selectedSpecialties.map(s => s.weight),
        createdBy: 'current_user',
        isPublic: false,
        tags: []
      });
      alert('Template saved successfully!');
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };
  
  const handleLoadTemplate = (templateId: string) => {
    loadTemplate(templateId);
    setShowTemplates(false);
  };
  
  const handleReset = () => {
    resetBlend();
    setBlendName('');
    setBlendDescription('');
    setShowResults(false);
    setBlendedResult(null);
  };
  
  if (showResults && blendedResult) {
    return (
      <BlendingResults
        result={blendedResult}
        onBack={() => setShowResults(false)}
        onClose={onClose || (() => {})}
      />
    );
  }
  
  if (showTemplates) {
    return (
      <TemplateManager
        templates={templates}
        onLoadTemplate={handleLoadTemplate}
        onBack={() => setShowTemplates(false)}
        onClose={onClose || (() => {})}
      />
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-8 py-8">
        {/* Header Actions - positioned like upload screen */}
        <div className="flex justify-end mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowTemplates(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Load Template
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
        </div>
        
        {/* Blend Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Blend Configuration</h2>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blend Name *
                </label>
                <input
                  type="text"
                  value={blendName}
                  onChange={(e) => setBlendName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter blend name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={blendDescription}
                  onChange={(e) => setBlendDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter description (optional)"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Validation Warnings */}
        {validation.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Available Specialties */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Available Specialties ({availableSpecialties.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">Click to add specialties to your blend</p>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableSpecialties.map((specialty) => (
                <div
                  key={specialty.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => addSpecialty(specialty)}
                >
                  <h3 className="font-medium text-gray-900">{specialty.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {specialty.records.toLocaleString()} records
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Source: {specialty.surveySource}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Specialties */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Selected Specialties ({selectedSpecialties.length})
              </h2>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                  Total Weight: {validation.totalWeight.toFixed(2)}%
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          <div className="px-6 py-6">
          
            {selectedSpecialties.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="mt-4 text-lg font-medium text-gray-900">No specialties selected</p>
                <p className="text-sm text-gray-500">Click on specialties above to add them to your blend</p>
              </div>
            ) : (
              <DndContext 
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                collisionDetection={closestCenter}
              >
                <SortableContext items={selectedSpecialties} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {selectedSpecialties.map((specialty) => (
                      <SortableSpecialtyItem
                        key={specialty.id}
                        specialty={specialty}
                        onRemove={removeSpecialty}
                        onWeightChange={updateWeight}
                      />
                    ))}
                  </div>
                </SortableContext>
                
                <DragOverlay>
                  {activeId ? (
                    <SortableSpecialtyItem
                      specialty={selectedSpecialties.find(s => s.id === activeId) || availableSpecialties.find(s => s.id === activeId)!}
                      onRemove={() => {}}
                      onWeightChange={() => {}}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Actions</h3>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleCreateBlend}
                  disabled={!validation.isValid || isLoading}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isLoading ? 'Creating...' : 'Create Blend'}
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={selectedSpecialties.length === 0}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Save Template
                </button>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${validation.isValid ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-sm text-gray-600">
                  {validation.isValid ? 'Ready to blend' : 'Please fix errors above'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
