/**
 * Specialty Blending Screen - Refactored
 * 
 * Main screen for specialty blending functionality with proper separation of concerns
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSpecialtyBlending } from '../hooks/useSpecialtyBlending';
import { useBlendingFilters } from '../hooks/useBlendingFilters';
import { calculateBlendedMetricsNew, generateBlendedReportHTML } from '../utils/blendingCalculations';
import { BlendConfiguration } from './BlendConfiguration';
import { SurveyDataFilters } from './SurveyDataFilters';
import { SurveyDataTable } from './SurveyDataTable';
import { BlendingResults } from './BlendingResults';
import { EmptyState } from '../../mapping/components/shared/EmptyState';
import { BoltIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../../components/ui/use-toast';
import { ConfirmationModal } from '../../../components/ui/confirmation-modal';
import { SuccessModal } from '../../../components/ui/success-modal';
import { UnifiedLoadingSpinner } from '../../../shared/components/UnifiedLoadingSpinner';
import { useSmoothProgress } from '../../../shared/hooks/useSmoothProgress';

interface SpecialtyBlendingScreenProps {
  onBlendCreated?: (result: any) => void;
  onClose?: () => void;
}

export const SpecialtyBlendingScreenRefactored: React.FC<SpecialtyBlendingScreenProps> = ({
  onBlendCreated,
  onClose
}) => {
  const { toast } = useToast();
  
  // Use smooth progress for dynamic loading
  const { progress, startProgress, completeProgress } = useSmoothProgress({
    duration: 3000,
    maxProgress: 90,
    intervalMs: 100
  });

  // Blend configuration state
  const [blendName, setBlendName] = useState('');
  const [blendDescription, setBlendDescription] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [blendedResult, setBlendedResult] = useState<any>(null);
  const [isDataBrowserCollapsed, setIsDataBrowserCollapsed] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  // Modal states
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Row selection state
  const [selectedDataRows, setSelectedDataRows] = useState<number[]>([]);
  
  // Blending method and custom weights
  const [blendingMethod, setBlendingMethod] = useState<'weighted' | 'simple' | 'custom'>('weighted');
  const [customWeights, setCustomWeights] = useState<Record<number, number>>({});
  
  const {
    selectedSpecialties,
    availableSpecialties,
    allData,
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
    deleteTemplate,
    resetBlend,
    refreshTemplates
  } = useSpecialtyBlending({
    maxSpecialties: 10,
    allowTemplates: true
  });

  // Use the custom filters hook
  const {
    selectedSurvey,
    selectedYear,
    selectedRegion,
    selectedProviderType,
    specialtySearch,
    filterOptions,
    filteredSurveyData,
    handleSurveyChange,
    handleYearChange,
    handleRegionChange,
    handleProviderTypeChange,
    handleSpecialtySearchChange,
    resetFilters
  } = useBlendingFilters(allData);

  // Start progress animation when loading begins
  useEffect(() => {
    if (isLoading) {
      startProgress();
    } else {
      completeProgress();
    }
  }, [isLoading, startProgress, completeProgress]);

  // Calculate blended metrics for selected specialties
  const blendedMetrics = useMemo(() => {
    return calculateBlendedMetricsNew(
      selectedDataRows,
      filteredSurveyData,
      blendingMethod,
      customWeights
    );
  }, [selectedDataRows, filteredSurveyData, blendingMethod, customWeights]);

  // Download report handler
  const handleDownloadReport = useCallback(() => {
    if (!blendedMetrics) return;
    
    const htmlContent = generateBlendedReportHTML(
      blendedMetrics,
      blendingMethod,
      customWeights,
      selectedDataRows,
      filteredSurveyData
    );
    
    // Create PDF using browser's print functionality
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.title = 'Blended Compensation Report';
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 500);
      };
    } else {
      // Fallback: download as HTML if popup is blocked
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `blended-compensation-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [blendedMetrics, blendingMethod, customWeights, selectedDataRows, filteredSurveyData]);
  
  const handleCreateBlend = async () => {
    if (!blendName.trim()) {
      toast({
        title: 'Blend Name Required',
        description: 'Please enter a blend name to continue.',
        variant: 'destructive'
      });
      return;
    }
    
    if (!validation.isValid) {
      toast({
        title: 'Validation Errors',
        description: validation.errors.join(', '),
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const result = await createBlend(blendName, blendDescription);
      setBlendedResult(result);
      setShowResults(true);
      onBlendCreated?.(result);
      toast({
        title: 'Blend Created Successfully',
        description: `"${blendName}" has been created and is ready for analysis.`
      });
    } catch (err) {
      console.error('Failed to create blend:', err);
      toast({
        title: 'Failed to Create Blend',
        description: 'An error occurred while creating the blend. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  const handleSaveTemplate = () => {
    if (!blendName.trim()) {
      toast({
        title: 'Template Name Required',
        description: 'Please enter a template name to save your blend.',
        variant: 'destructive'
      });
      return;
    }
    
    if (selectedDataRows.length === 0) {
      toast({
        title: 'No Data Selected',
        description: 'Please select at least one row to save as template.',
        variant: 'destructive'
      });
      return;
    }
    
    setShowSaveConfirmation(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    setShowSaveConfirmation(false);
    
    try {
      // Convert selected data rows to specialty items
      const selectedSpecialties = selectedDataRows.map(index => {
        const row = filteredSurveyData[index];
        return {
          id: `${row.surveySpecialty}-${row.surveySource}-${row.surveyYear}-${row.geographicRegion}-${row.providerType}`,
          name: row.surveySpecialty,
          records: row.tcc_n_orgs || 0,
          weight: 100 / selectedDataRows.length, // Equal weight distribution
          surveySource: row.surveySource,
          surveyYear: row.surveyYear,
          geographicRegion: row.geographicRegion,
          providerType: row.providerType
        };
      });
      
      const templateData = {
        name: blendName,
        description: blendDescription,
        specialties: selectedSpecialties,
        weights: selectedSpecialties.map(s => s.weight),
        createdBy: 'current_user',
        isPublic: false,
        tags: []
      };
      
      await saveTemplate(templateData);
      
      setShowSaveSuccess(true);
    } catch (err) {
      console.error('Failed to save template:', err);
      toast({
        title: 'Failed to Save Blend',
        description: `An error occurred while saving the blend: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId);
      
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId('');
      }
      
      await refreshTemplates();
      
      toast({
        title: 'Template Deleted',
        description: 'The template has been successfully removed from your saved blends.'
      });
    } catch (err) {
      console.error('Failed to delete template:', err);
      toast({
        title: 'Failed to Delete Template',
        description: 'An error occurred while deleting the template. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    setSelectedTemplateId(templateId);
    setBlendName(template.name);
    setBlendDescription(template.description);
    
    // Find and select the corresponding rows in the table
    const templateRowIndices: number[] = [];
    
    template.specialties.forEach(specialty => {
      const matchingRows = filteredSurveyData
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => 
          row.surveySpecialty === specialty.name &&
          row.surveySource === specialty.surveySource &&
          row.surveyYear === specialty.surveyYear &&
          row.geographicRegion === specialty.geographicRegion &&
          row.providerType === specialty.providerType
        );
      
      matchingRows.forEach(({ index }) => {
        if (!templateRowIndices.includes(index)) {
          templateRowIndices.push(index);
        }
      });
    });
    
    setSelectedDataRows(templateRowIndices);
    
    toast({
      title: 'Template Loaded Successfully',
      description: `"${template.name}" has been loaded with ${templateRowIndices.length} rows selected.`
    });
  };
  
  const handleReset = () => {
    resetBlend();
    setBlendName('');
    setBlendDescription('');
    setSelectedTemplateId('');
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
  
  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <UnifiedLoadingSpinner
        message="Loading survey data..."
        recordCount={filteredSurveyData.length}
        progress={progress}
        showProgress={true}
      />
    );
  }

  // Show error state if data loading failed
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full px-2 py-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-2 py-2">
        
        {/* Blend Configuration */}
        <BlendConfiguration
          blendName={blendName}
          blendDescription={blendDescription}
          onBlendNameChange={setBlendName}
          onBlendDescriptionChange={setBlendDescription}
          onSaveTemplate={handleSaveTemplate}
          onLoadTemplate={handleLoadTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          selectedDataRows={selectedDataRows}
        />
        
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
        
        {/* Survey Data Browser */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Survey Data Browser
                </h2>
                <p className="text-sm text-gray-600 mt-1">Select specific survey data points for blending</p>
              </div>
              <button
                onClick={() => setIsDataBrowserCollapsed(!isDataBrowserCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                aria-label={isDataBrowserCollapsed ? "Expand Survey Data Browser" : "Collapse Survey Data Browser"}
              >
                <svg 
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isDataBrowserCollapsed ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          {!isDataBrowserCollapsed && (
            <div className="px-6 py-6">
              {/* Advanced Filters */}
              <SurveyDataFilters
                selectedSurvey={selectedSurvey}
                selectedYear={selectedYear}
                selectedRegion={selectedRegion}
                selectedProviderType={selectedProviderType}
                specialtySearch={specialtySearch}
                onSurveyChange={handleSurveyChange}
                onYearChange={handleYearChange}
                onRegionChange={handleRegionChange}
                onProviderTypeChange={handleProviderTypeChange}
                onSpecialtySearchChange={handleSpecialtySearchChange}
                filterOptions={filterOptions}
              />

              {/* Data Table */}
              <SurveyDataTable
                data={filteredSurveyData}
                selectedRows={selectedDataRows}
                onRowSelectionChange={setSelectedDataRows}
                isLoading={isLoading}
                progress={progress}
              />
            </div>
          )}
        </div>

        {/* Blending Method Controls */}
        {selectedDataRows.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Blending Method
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose how to blend the selected specialties
              </p>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <label className={`flex items-center space-x-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${
                  blendingMethod === 'weighted' 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="blendingMethod"
                    value="weighted"
                    checked={blendingMethod === 'weighted'}
                    onChange={(e) => setBlendingMethod(e.target.value as any)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Weighted Average</div>
                    <div className="text-xs text-gray-500">Weight by incumbent count</div>
                  </div>
                </label>
                
                <label className={`flex items-center space-x-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${
                  blendingMethod === 'simple' 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="blendingMethod"
                    value="simple"
                    checked={blendingMethod === 'simple'}
                    onChange={(e) => setBlendingMethod(e.target.value as any)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Simple Average</div>
                    <div className="text-xs text-gray-500">Equal weights for all</div>
                  </div>
                </label>
                
                <label className={`flex items-center space-x-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${
                  blendingMethod === 'custom' 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="blendingMethod"
                    value="custom"
                    checked={blendingMethod === 'custom'}
                    onChange={(e) => setBlendingMethod(e.target.value as any)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Custom Weights</div>
                    <div className="text-xs text-gray-500">Set your own percentages</div>
                  </div>
                </label>
              </div>

              {/* Custom Weight Controls */}
              {blendingMethod === 'custom' && (
                <div className="space-y-4 bg-gray-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">Set Custom Weights (%)</h3>
                    <div className={`text-sm font-medium ${
                      Math.abs(Object.values(customWeights).reduce((sum, weight) => sum + (weight || 0), 0) - 100) < 0.1
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      Total: {Object.values(customWeights).reduce((sum, weight) => sum + (weight || 0), 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="space-y-4">
                    {selectedDataRows.map((index, i) => {
                      const row = filteredSurveyData[index];
                      
                      if (!row) {
                        return null;
                      }
                      
                      const currentWeight = customWeights[index] || 0;
                      return (
                        <div key={index} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                          <div className="space-y-3">
                            {/* Specialty Info */}
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {row.surveySpecialty}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {row.surveySource} • {(row.tcc_n_orgs || row.n_orgs || 0).toLocaleString()} records
                                </div>
                              </div>
                              <div className="text-sm font-medium text-indigo-600 ml-4">
                                {currentWeight.toFixed(1)}%
                              </div>
                            </div>
                            
                            {/* Slider and Input */}
                            <div className="space-y-2">
                              {/* Slider */}
                              <div className="relative">
                                <label htmlFor={`weight-slider-${index}`} className="sr-only">
                                  Set weight percentage for {row.surveySpecialty}
                                </label>
                                <input
                                  id={`weight-slider-${index}`}
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={currentWeight}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    setCustomWeights(prev => ({ ...prev, [index]: value }));
                                  }}
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-slider"
                                  style={{
                                    background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${currentWeight}%, #e5e7eb ${currentWeight}%, #e5e7eb 100%)`
                                  }}
                                  aria-label={`Set weight percentage for ${row.surveySpecialty}`}
                                />
                              </div>
                              
                              {/* Number Input */}
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={currentWeight}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    setCustomWeights(prev => ({ ...prev, [index]: value }));
                                  }}
                                  className={`w-20 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                                    currentWeight > 0 ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
                                  }`}
                                  placeholder="0"
                                />
                                <span className="text-sm text-gray-500">%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                    })}
                  </div>
                  {Object.values(customWeights).reduce((sum, weight) => sum + (weight || 0), 0) !== 100 && (
                    <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      💡 Tip: Weights should total 100% for optimal blending
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Blended Results */}
        {blendedMetrics && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Blended Results
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {blendingMethod === 'weighted' && 'Weighted by incumbent count'}
                    {blendingMethod === 'simple' && 'Simple average (equal weights)'}
                    {blendingMethod === 'custom' && 'Custom weights applied'}
                    {' • '}{blendedMetrics.specialties.join(', ')} ({blendedMetrics.totalRecords.toLocaleString()} records)
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleDownloadReport}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Report
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-6">
              {/* Google-style metrics table */}
              <div className="overflow-hidden border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Metric
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P25
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P50
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P75
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P90
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                          <div className="text-sm font-medium text-gray-900">Total Cash Compensation</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${blendedMetrics.tcc_p25.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        ${blendedMetrics.tcc_p50.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${blendedMetrics.tcc_p75.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${blendedMetrics.tcc_p90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                          <div className="text-sm font-medium text-gray-900">Work RVUs</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {blendedMetrics.wrvu_p25.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        {blendedMetrics.wrvu_p50.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {blendedMetrics.wrvu_p75.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {blendedMetrics.wrvu_p90.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                          <div className="text-sm font-medium text-gray-900">Conversion Factor</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${blendedMetrics.cf_p25.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        ${blendedMetrics.cf_p50.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${blendedMetrics.cf_p75.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${blendedMetrics.cf_p90.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSaveConfirmation}
        onClose={() => setShowSaveConfirmation(false)}
        onConfirm={handleConfirmSave}
        title="Save Blend"
        message={`Are you sure you want to save "${blendName}"? This will create a reusable blend with ${selectedDataRows.length} selected specialties.`}
        confirmText="Save Blend"
        cancelText="Cancel"
        type="info"
        isLoading={isSaving}
      />
      
      {/* Success Modal */}
      <SuccessModal
        isOpen={showSaveSuccess}
        onClose={() => setShowSaveSuccess(false)}
        title="Blend Saved Successfully!"
        message={`"${blendName}" has been saved and is now available in your saved blends.`}
        details={`Blend includes ${selectedDataRows.length} specialties and is ready for future use.`}
        actionText="View Saved Blends"
        onAction={() => {
          setShowSaveSuccess(false);
          // Focus on the saved blends dropdown
          const selectElement = document.querySelector('[aria-label="Saved Blends"]') as HTMLElement;
          if (selectElement) {
            selectElement.focus();
          }
        }}
      />
    </div>
  );
};
