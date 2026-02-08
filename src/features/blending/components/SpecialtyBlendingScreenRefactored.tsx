/**
 * Specialty Blending Screen - Refactored
 * 
 * Enterprise-grade specialty blending with improved workflow and UX
 */

import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { ChevronDownIcon, ArrowPathIcon, ArrowPathRoundedSquareIcon } from '@heroicons/react/24/outline';
import { useSpecialtyBlending } from '../hooks/useSpecialtyBlending';
import { useBlendingFilters } from '../hooks/useBlendingFilters';
import { useSelectionHistory } from '../hooks/useSelectionHistory';
import { calculateBlendedMetricsNew } from '../utils/blendingCalculations';
import { BlendingMethodSelector } from './BlendingMethodSelector';
import { SelectedItemsSummary } from './SelectedItemsSummary';
import { TableActionsBar } from './TableActionsBar';
import { TemplateManager } from './TemplateManager';
import { SurveyDataFilters } from './SurveyDataFilters';
import { SurveyDataTable } from './SurveyDataTable';
import { BlendedResultsPreview } from './BlendedResultsPreview';
import { WorkflowProgress } from './WorkflowProgress';
import { useToast } from '../../../components/ui/use-toast';
import { ConfirmationModal } from '../../../components/ui/confirmation-modal';
import { SuccessModal } from '../../../components/ui/success-modal';
import './BlendingCharts.css';

interface SpecialtyBlendingScreenProps {
  onBlendCreated?: (result: any) => void;
  onClose?: () => void;
}

type WorkflowStep = 'method' | 'filter' | 'select' | 'review';

const SpecialtyBlendingScreenRefactoredInner: React.FC<SpecialtyBlendingScreenProps> = ({
  onBlendCreated,
  onClose
}) => {
  const { toast } = useToast();

  // Blend configuration state
  const [blendName, setBlendName] = useState('');
  const [blendDescription, setBlendDescription] = useState('');
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
    isRevalidating,
    error,
    validation,
    saveTemplate,
    deleteTemplate,
    refreshTemplates,
    refreshData
  } = useSpecialtyBlending({
    maxSpecialties: 10,
    allowTemplates: true
  });

  // Use the custom filters hook (all multi-select arrays)
  const {
    selectedSurveys,
    selectedYears,
    selectedRegions,
    selectedProviderTypes,
    selectedSpecialties: selectedSpecialtyFilters,
    filterOptions,
    filteredSurveyData,
    handleSurveyChange,
    handleYearChange,
    handleRegionChange,
    handleProviderTypeChange,
    handleSelectedSpecialtiesChange,
    setSelectedSurveys,
    setSelectedYears,
    setSelectedRegions,
    setSelectedProviderTypes,
    setSelectedSpecialties,
    resetFilters
  } = useBlendingFilters(allData);

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
    
    // Restore filter state if available (support old single-value and new array format)
    if (template.filterState) {
      const fs = template.filterState;
      setSelectedSurveys(Array.isArray(fs.selectedSurveys) ? fs.selectedSurveys : fs.selectedSurvey ? [fs.selectedSurvey] : []);
      setSelectedYears(Array.isArray(fs.selectedYears) ? fs.selectedYears : fs.selectedYear ? [fs.selectedYear] : []);
      setSelectedRegions(Array.isArray(fs.selectedRegions) ? fs.selectedRegions : fs.selectedRegion ? [fs.selectedRegion] : []);
      setSelectedProviderTypes(Array.isArray(fs.selectedProviderTypes) ? fs.selectedProviderTypes : fs.selectedProviderType ? [fs.selectedProviderType] : []);
      setSelectedSpecialties(Array.isArray(fs.selectedSpecialties) ? fs.selectedSpecialties : []);
      setBlendingMethod(fs.blendingMethod || 'weighted');
      setCustomWeights(fs.customWeights || {});
    }
    
    // Store template to be processed when filtered data updates
    setPendingTemplate(template);
    setPendingTemplateSelections(template.specialties ? template.specialties.map(() => -1) : []);
  }, [templates, setSelectedSurveys, setSelectedYears, setSelectedRegions, setSelectedProviderTypes, setSelectedSpecialties, toast]);

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
    if (blendingMethod === 'custom') {
      const totalWeight = selectedDataRows.reduce((sum, idx) => sum + (customWeights[idx] ?? 0), 0);
      if (Math.abs(totalWeight - 100) >= 0.5) {
        toast({
          title: 'Custom Weights Must Sum to 100%',
          description: `Current total is ${totalWeight.toFixed(1)}%. Adjust weights in Step 1 before saving.`,
          variant: 'destructive'
        });
        return;
      }
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
          selectedSurveys,
          selectedYears,
          selectedRegions,
          selectedProviderTypes,
          selectedSpecialties: selectedSpecialtyFilters,
          blendingMethod,
          customWeights
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

  // Derived workflow step (no separate state)
  const workflowStep: WorkflowStep = useMemo(() => {
    if (selectedDataRows.length > 0) return 'review';
    if (filteredSurveyData.length > 0) return 'select';
    if (selectedSurveys.length > 0 || selectedYears.length > 0 || selectedRegions.length > 0 || selectedProviderTypes.length > 0 || selectedSpecialtyFilters.length > 0) return 'filter';
    return 'method';
  }, [selectedDataRows.length, filteredSurveyData.length, selectedSurveys.length, selectedYears.length, selectedRegions.length, selectedProviderTypes.length, selectedSpecialtyFilters.length]);

  // Shell-first: never block the whole screen. hasActiveFilters and noDataLoaded used for content region.
  const hasActiveFilters = selectedSurveys.length > 0 || selectedYears.length > 0 || selectedRegions.length > 0 || selectedProviderTypes.length > 0 || selectedSpecialtyFilters.length > 0;
  const noDataLoaded = allData.length === 0;
  const showInitialLoading = isLoading && noDataLoaded;
  const showNoDataState = !isLoading && noDataLoaded;
  const blendingMethodLabel = blendingMethod === 'weighted' ? 'Weighted' : blendingMethod === 'simple' ? 'Simple average' : 'Custom weights';

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="w-full px-2 py-2">
        
        {/* Workflow Progress Indicator */}
        <WorkflowProgress currentStep={workflowStep} isCompleted={isBlendCreated} blendingMethodLabel={blendingMethodLabel} />
        
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
        
        {/* Error Display - In-shell so layout is always visible */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors flex-shrink-0"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Retry
              </button>
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

        {/* Selected Items Summary - Sticky (shows selection info only) */}
        <SelectedItemsSummary
          selectedRows={selectedDataRows}
          filteredSurveyData={filteredSurveyData}
          onRemoveItem={handleRemoveItem}
        />
        
        {/* Survey Data Browser - Shell always visible; loading/no-data only in this region */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Step 2 & 3: Filter and Select Data
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {showInitialLoading ? 'Loading surveys…' : isRevalidating ? 'Updating…' : 'Filter survey data and select items for blending'}
                </p>
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
              {showInitialLoading && (
                <>
                  <p className="mb-4 text-sm text-gray-500" role="status" aria-live="polite">
                    Loading surveys…
                  </p>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden" aria-hidden="true">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-200 last:border-b-0">
                        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 flex-1 max-w-[200px] bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {showNoDataState && (
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                  <div className="text-center max-w-md mx-auto">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <ChevronDownIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Survey Data Yet</h3>
                    <p className="text-gray-500 mb-4">
                      Survey data may not have loaded yet—for example, if you use cloud storage, sign in first and then click Refresh. Otherwise, upload surveys from the Upload page. Once data is loaded, you can filter by Survey, Year, Region, Provider Type, and Specialty, then select rows to blend.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={refreshData}
                        disabled={isLoading}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <ArrowPathRoundedSquareIcon className="w-4 h-4 mr-2" />
                        {isLoading ? 'Loading…' : 'Refresh'}
                      </button>
                      {onClose && (
                        <button
                          onClick={onClose}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                        >
                          Go to Upload
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!showInitialLoading && !showNoDataState && (
                <>
                  {isRevalidating && (
                    <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-800" role="status" aria-live="polite">
                      Updating…
                    </div>
                  )}
                  {/* Advanced Filters */}
                  <SurveyDataFilters
                    selectedSurveys={selectedSurveys}
                    selectedYears={selectedYears}
                    selectedRegions={selectedRegions}
                    selectedProviderTypes={selectedProviderTypes}
                    selectedSpecialties={selectedSpecialtyFilters}
                    onSurveyChange={handleSurveyChange}
                    onYearChange={handleYearChange}
                    onRegionChange={handleRegionChange}
                    onProviderTypeChange={handleProviderTypeChange}
                    onSelectedSpecialtiesChange={handleSelectedSpecialtiesChange}
                    onClearFilters={resetFilters}
                    filterOptions={filterOptions}
                  />

                  {hasActiveFilters && filteredSurveyData.length === 0 && (
                    <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <span>No rows match your filters. Clear filters or adjust Survey, Year, Region, or Provider Type.</span>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="shrink-0 font-medium text-amber-700 underline hover:no-underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}

                  <TableActionsBar
                    onSelectAll={handleSelectAll}
                    onClearAll={handleClearAll}
                    onSelectBySurvey={handleSelectBySurvey}
                    onSelectByYear={handleSelectByYear}
                    availableSurveys={filterOptions.surveys}
                    availableYears={filterOptions.years}
                    selectedCount={selectedDataRows.length}
                    totalCount={filteredSurveyData.length}
                    onUndo={canUndo ? undo : undefined}
                    onRedo={canRedo ? redo : undefined}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    selectedRows={selectedDataRows}
                    filteredSurveyData={filteredSurveyData}
                  />

                  <SurveyDataTable
                    data={filteredSurveyData}
                    selectedRows={selectedDataRows}
                    onRowSelectionChange={handleRowSelectionChange}
                    isLoading={false}
                    progress={100}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Step 4: Blended Results Preview */}
        <BlendedResultsPreview
          metrics={blendedMetrics}
          blendingMethod={blendingMethod}
          selectedCount={selectedDataRows.length}
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

const SpecialtyBlendingScreenRefactored = memo(SpecialtyBlendingScreenRefactoredInner);
SpecialtyBlendingScreenRefactored.displayName = 'SpecialtyBlendingScreenRefactored';
export { SpecialtyBlendingScreenRefactored };
export default SpecialtyBlendingScreenRefactored;
