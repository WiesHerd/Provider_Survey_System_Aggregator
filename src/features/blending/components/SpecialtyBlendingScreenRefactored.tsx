/**
 * Specialty Blending Screen - Refactored
 * 
 * Enterprise-grade specialty blending with improved workflow and UX
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronDownIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useSpecialtyBlending } from '../hooks/useSpecialtyBlending';
import { useBlendingFilters } from '../hooks/useBlendingFilters';
import { useSelectionHistory } from '../hooks/useSelectionHistory';
import { calculateBlendedMetricsNew } from '../utils/blendingCalculations';
import { BlendingMethodSelector } from './BlendingMethodSelector';
import { SelectedItemsSummary } from './SelectedItemsSummary';
import { TemplateManager } from './TemplateManager';
import { SurveyDataFilters } from './SurveyDataFilters';
import { SurveyDataTable } from './SurveyDataTable';
import { BlendedResultsPreview } from './BlendedResultsPreview';
import { WorkflowProgress } from './WorkflowProgress';
import { BlendingResults } from './BlendingResults';
import { useToast } from '../../../components/ui/use-toast';
import { ConfirmationModal } from '../../../components/ui/confirmation-modal';
import { SuccessModal } from '../../../components/ui/success-modal';
import { EnterpriseLoadingSpinner } from '../../../shared/components/EnterpriseLoadingSpinner';
import { useSmoothProgress } from '../../../shared/hooks/useSmoothProgress';
import './BlendingCharts.css';

interface SpecialtyBlendingScreenProps {
  onBlendCreated?: (result: any) => void;
  onClose?: () => void;
}

type WorkflowStep = 'method' | 'filter' | 'select' | 'review';

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
  const [isBlendCreated, setIsBlendCreated] = useState(false);
  
  // Modal states
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  
  // Blending method and custom weights
  const [blendingMethod, setBlendingMethod] = useState<'weighted' | 'simple' | 'custom'>('weighted');
  const [customWeights, setCustomWeights] = useState<Record<number, number>>({});
  
  // Workflow state
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState<WorkflowStep>('method');
  
  // Selection history for undo/redo
  const {
    selection: selectedDataRows,
    updateSelection,
    undo,
    redo,
    canUndo,
    canRedo
  } = useSelectionHistory([]);
  
  const {
    selectedSpecialties,
    availableSpecialties,
    allData,
    templates,
    isLoading,
    error,
    validation,
    saveTemplate,
    deleteTemplate,
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
    setSelectedSurvey,
    setSelectedYear,
    setSelectedRegion,
    setSelectedProviderType,
    setSpecialtySearch,
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

  // Update workflow step based on selections
  useEffect(() => {
    if (selectedDataRows.length > 0 && currentWorkflowStep === 'select') {
      setCurrentWorkflowStep('review');
    } else if (filteredSurveyData.length > 0 && currentWorkflowStep === 'filter') {
      setCurrentWorkflowStep('select');
    }
  }, [selectedDataRows.length, filteredSurveyData.length, currentWorkflowStep]);

  // Template loading state
  const [pendingTemplate, setPendingTemplate] = useState<any>(null);
  const [pendingTemplateSelections, setPendingTemplateSelections] = useState<number[] | null>(null);

  // Restore selections when filtered data updates after template load
  useEffect(() => {
    if (pendingTemplate && pendingTemplateSelections && filteredSurveyData.length > 0) {
      // Find matching rows in the current filtered data
      const templateRowIndices: number[] = [];
      
      pendingTemplate.specialties.forEach((specialty: any) => {
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
      
      if (templateRowIndices.length > 0) {
        // Use skipHistory to avoid adding template load to undo history
        updateSelection(templateRowIndices, true);
        toast({
          title: 'Template Loaded Successfully',
          description: `"${pendingTemplate.name}" has been loaded with ${templateRowIndices.length} rows selected.`
        });
        } else {
        toast({
          title: 'No Matching Data Found',
          description: 'The template specialties could not be found in the current filtered data. Try adjusting your filters.',
          variant: 'destructive'
        });
      }
      
        setPendingTemplate(null);
      setPendingTemplateSelections(null);
      setIsLoadingTemplate(false);
    }
  }, [filteredSurveyData, pendingTemplate, pendingTemplateSelections, updateSelection, toast]);

  // Simplified template loading - no complex race condition logic
  const handleLoadTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      toast({
        title: 'Template Not Found',
        description: 'The selected template could not be found.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoadingTemplate(true);
    setSelectedTemplateId(templateId);
    setBlendName(template.name);
    setBlendDescription(template.description || '');
    
    // Restore filter state if available
    if (template.filterState) {
      setSelectedSurvey(template.filterState.selectedSurvey || '');
      setSelectedYear(template.filterState.selectedYear || '');
      setSelectedRegion(template.filterState.selectedRegion || '');
      setSelectedProviderType(template.filterState.selectedProviderType || '');
      setSpecialtySearch(template.filterState.specialtySearch || '');
      setBlendingMethod(template.filterState.blendingMethod || 'weighted');
      setCustomWeights(template.filterState.customWeights || {});
    }
    
    // Store template to be processed when filtered data updates
    setPendingTemplate(template);
    setPendingTemplateSelections(template.specialties ? template.specialties.map(() => -1) : []);
  }, [templates, setSelectedSurvey, setSelectedYear, setSelectedRegion, setSelectedProviderType, setSpecialtySearch, toast]);

  // Calculate blended metrics for selected specialties
  const blendedMetrics = useMemo(() => {
    if (selectedDataRows.length === 0) return null;
    
    return calculateBlendedMetricsNew(
      selectedDataRows,
      filteredSurveyData,
      blendingMethod,
      customWeights
    );
  }, [selectedDataRows, filteredSurveyData, blendingMethod, customWeights]);

  const handleCreateBlend = async () => {
    if (!blendName.trim()) {
      toast({
        title: 'Blend Name Required',
        description: 'Please enter a blend name to continue.',
        variant: 'destructive'
      });
      return;
    }
    
    if (!blendedMetrics) {
      toast({
        title: 'No Data Selected',
        description: 'Please select at least one row to create a blend.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      // Create result directly from calculated metrics
      const selectedSpecialties = selectedDataRows.map(index => {
        const row = filteredSurveyData[index];
        return {
          id: `${row.surveySpecialty}-${row.surveySource}-${row.surveyYear}-${row.geographicRegion}-${row.providerType}`,
          name: row.surveySpecialty,
          records: row.tcc_n_orgs || 0,
          weight: blendingMethod === 'weighted' 
            ? (row.tcc_n_incumbents || 0) / (selectedDataRows.reduce((sum, i) => sum + (filteredSurveyData[i]?.tcc_n_incumbents || 0), 0) || 1) * 100
            : blendingMethod === 'custom'
            ? (customWeights[index] || 0)
            : 100 / selectedDataRows.length,
          surveySource: row.surveySource,
          surveyYear: row.surveyYear,
          geographicRegion: row.geographicRegion,
          providerType: row.providerType
        };
      });
      
      const enhancedResult = {
        id: `blend-${Date.now()}`,
        blendName: blendName,
        specialties: selectedSpecialties,
        blendedData: {
          tcc_p25: blendedMetrics.tcc_p25,
          tcc_p50: blendedMetrics.tcc_p50,
          tcc_p75: blendedMetrics.tcc_p75,
          tcc_p90: blendedMetrics.tcc_p90,
          wrvu_p25: blendedMetrics.wrvu_p25,
          wrvu_p50: blendedMetrics.wrvu_p50,
          wrvu_p75: blendedMetrics.wrvu_p75,
          wrvu_p90: blendedMetrics.wrvu_p90,
          cf_p25: blendedMetrics.cf_p25,
          cf_p50: blendedMetrics.cf_p50,
          cf_p75: blendedMetrics.cf_p75,
          cf_p90: blendedMetrics.cf_p90,
          n_orgs: blendedMetrics.totalRecords,
          n_incumbents: blendedMetrics.totalRecords
        },
        blendingMethod: blendingMethod,
        selectedData: selectedDataRows.map(index => filteredSurveyData[index]).filter(row => row),
        customWeights: customWeights,
        confidence: 0.95, // TODO: Calculate actual confidence
        sampleSize: blendedMetrics.totalRecords,
        createdAt: new Date()
      };
      
      setBlendedResult(enhancedResult);
      setShowResults(true);
      setIsBlendCreated(true); // Mark blend as created for workflow progress
      onBlendCreated?.(enhancedResult);
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
      const selectedSpecialties = selectedDataRows.map(index => {
        const row = filteredSurveyData[index];
        return {
          id: `${row.surveySpecialty}-${row.surveySource}-${row.surveyYear}-${row.geographicRegion}-${row.providerType}`,
          name: row.surveySpecialty,
          records: row.tcc_n_orgs || 0,
          weight: 100 / selectedDataRows.length,
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
        tags: [],
        filterState: {
          selectedSurvey: selectedSurvey,
          selectedYear: selectedYear,
          selectedRegion: selectedRegion,
          selectedProviderType: selectedProviderType,
          specialtySearch: specialtySearch,
          blendingMethod: blendingMethod,
          customWeights: customWeights
        }
      };
      
      await saveTemplate(templateData);
      setShowSaveSuccess(true);
      await refreshTemplates();
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
        setBlendName('');
        setBlendDescription('');
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

  const handleClearBlend = useCallback(() => {
    setBlendName('');
    setBlendDescription('');
    setSelectedTemplateId('');
    updateSelection([]);
    setCustomWeights({});
    toast({
      title: 'Blend Cleared',
      description: 'Ready to create a new blend.',
      variant: 'default'
    });
  }, [updateSelection]);

  // Selection handlers
  const handleRowSelectionChange = useCallback((rows: number[]) => {
    updateSelection(rows);
  }, [updateSelection]);

  const handleClearAll = useCallback(() => {
    updateSelection([]);
  }, [updateSelection]);

  const handleSelectAll = useCallback(() => {
    updateSelection(filteredSurveyData.map((_, index) => index));
  }, [filteredSurveyData, updateSelection]);

  const handleRemoveItem = useCallback((index: number) => {
    updateSelection(selectedDataRows.filter(i => i !== index));
  }, [selectedDataRows, updateSelection]);

  const handleSelectBySurvey = useCallback((survey: string) => {
    const matchingIndices = filteredSurveyData
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.surveySource === survey)
      .map(({ index }) => index);
    
    updateSelection([...new Set([...selectedDataRows, ...matchingIndices])]);
  }, [filteredSurveyData, selectedDataRows, updateSelection]);

  const handleSelectByYear = useCallback((year: string) => {
    const matchingIndices = filteredSurveyData
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.surveyYear === year)
      .map(({ index }) => index);
    
    updateSelection([...new Set([...selectedDataRows, ...matchingIndices])]);
  }, [filteredSurveyData, selectedDataRows, updateSelection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A or Cmd+A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (filteredSurveyData.length > 0) {
          handleSelectAll();
        }
      }
      
      // Escape: Clear all
      if (e.key === 'Escape') {
        if (selectedDataRows.length > 0) {
          handleClearAll();
        }
      }
      
      // Ctrl+Z or Cmd+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
      }
      
      // Ctrl+Shift+Z or Cmd+Shift+Z: Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectAll, handleClearAll, canUndo, canRedo, undo, redo, filteredSurveyData.length, selectedDataRows.length]);

  // Custom weight change handler
  const handleCustomWeightChange = useCallback((index: number, weight: number) => {
    setCustomWeights(prev => ({ ...prev, [index]: weight }));
  }, []);

  // Get current workflow step
  const getCurrentWorkflowStep = (): WorkflowStep => {
    if (selectedDataRows.length > 0) return 'review';
    if (filteredSurveyData.length > 0) return 'select';
    if (selectedSurvey || selectedYear || selectedRegion || selectedProviderType) return 'filter';
    return 'method';
  };

  const workflowStep = getCurrentWorkflowStep();
  
  if (showResults && blendedResult) {
    return (
      <BlendingResults
        result={blendedResult}
        onBack={() => setShowResults(false)}
      />
    );
  }
  
  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <EnterpriseLoadingSpinner
        message="Loading survey data..."
        recordCount="auto"
        data={filteredSurveyData}
        progress={progress}
        variant="overlay"
        loading={isLoading}
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
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="w-full px-2 py-2">
        
        {/* Workflow Progress Indicator */}
        <WorkflowProgress currentStep={workflowStep} isCompleted={isBlendCreated} />
        
        {/* Blend Configuration */}
        <TemplateManager
          blendName={blendName}
          blendDescription={blendDescription}
          onBlendNameChange={setBlendName}
          onBlendDescriptionChange={setBlendDescription}
          onSaveTemplate={handleSaveTemplate}
          onClearBlend={handleClearBlend}
          onLoadTemplate={handleLoadTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          selectedDataRows={selectedDataRows}
          isLoadingTemplate={isLoadingTemplate}
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

        {/* Step 1: Blending Method Selector */}
        <BlendingMethodSelector
          method={blendingMethod}
          onMethodChange={setBlendingMethod}
          selectedCount={selectedDataRows.length}
          customWeights={customWeights}
          onCustomWeightChange={handleCustomWeightChange}
          selectedDataRows={selectedDataRows}
          filteredSurveyData={filteredSurveyData}
        />

        {/* Selected Items Summary - Sticky */}
        <SelectedItemsSummary
          selectedRows={selectedDataRows}
          filteredSurveyData={filteredSurveyData}
          onClearAll={handleClearAll}
          onSelectAll={handleSelectAll}
          onRemoveItem={handleRemoveItem}
          onUndo={canUndo ? undo : undefined}
          onRedo={canRedo ? redo : undefined}
          canUndo={canUndo}
          canRedo={canRedo}
          onSelectBySurvey={handleSelectBySurvey}
          onSelectByYear={handleSelectByYear}
          availableSurveys={filterOptions.surveys}
          availableYears={filterOptions.years}
          availableRegions={filterOptions.regions}
        />
        
        {/* Survey Data Browser */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Step 2 & 3: Filter and Select Data
                </h2>
                <p className="text-sm text-gray-600 mt-1">Filter survey data and select items for blending</p>
              </div>
              <button
                onClick={() => setIsDataBrowserCollapsed(!isDataBrowserCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                aria-label={isDataBrowserCollapsed ? "Expand Survey Data Browser" : "Collapse Survey Data Browser"}
              >
                <ChevronDownIcon 
                  className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isDataBrowserCollapsed ? 'rotate-180' : ''}`} 
                />
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
                onClearFilters={resetFilters}
                filterOptions={filterOptions}
              />

              {/* Data Table */}
              <SurveyDataTable
                data={filteredSurveyData}
                selectedRows={selectedDataRows}
                onRowSelectionChange={handleRowSelectionChange}
                isLoading={isLoading}
                progress={progress}
              />
            </div>
          )}
        </div>

        {/* Step 4: Blended Results Preview */}
        <BlendedResultsPreview
          metrics={blendedMetrics}
          blendingMethod={blendingMethod}
          selectedCount={selectedDataRows.length}
          onCreateBlend={handleCreateBlend}
          selectedDataRows={selectedDataRows}
          filteredSurveyData={filteredSurveyData}
          customWeights={customWeights}
        />

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
          const selectElement = document.querySelector('[aria-label="Saved Blends"]') as HTMLElement;
          if (selectElement) {
            selectElement.focus();
          }
        }}
      />
    </div>
  );
};
