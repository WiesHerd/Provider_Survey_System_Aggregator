/**
 * Specialty Blending Screen
 * 
 * This is the main screen for specialty blending functionality,
 * featuring modern drag & drop interface and precision controls.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { useSpecialtyBlending } from '../hooks/useSpecialtyBlending';
import { SpecialtyItem } from '../types/blending';
import { BlendingResults } from './BlendingResults';
import { EmptyState } from '../../mapping/components/shared/EmptyState';
import { BoltIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../../components/ui/use-toast';
import { ConfirmationModal } from '../../../components/ui/confirmation-modal';
import { SuccessModal } from '../../../components/ui/success-modal';
import { ModernPagination } from '../../../shared/components/ModernPagination';
import { EnterpriseLoadingSpinner } from '../../../shared/components/EnterpriseLoadingSpinner';
import { useSmoothProgress } from '../../../shared/hooks/useSmoothProgress';
import { BookmarkSlashIcon } from '@heroicons/react/24/outline';
import { generateBlendedReportPDF, BlendedReportData } from '../utils/pdfReportGenerator';

// Removed AG Grid - using HTML table instead

interface SpecialtyBlendingScreenProps {
  onBlendCreated?: (result: any) => void;
  onClose?: () => void;
}

export const SpecialtyBlendingScreen: React.FC<SpecialtyBlendingScreenProps> = ({
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
  
  
  // Filter state
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedProviderType, setSelectedProviderType] = useState('');
  const [selectedDataRows, setSelectedDataRows] = useState<number[]>([]);
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<string[]>([]);
  const [specialtySearch, setSpecialtySearch] = useState('');
  
  // Pagination for table performance
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // Column resizing state
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 50,
    specialty: 200,
    survey: 120,
    year: 80,
    region: 150,
    provider: 120,
    tcc: 120,
    wrvu: 120,
    cf: 100,
    records: 80
  });
  const [isResizing, setIsResizing] = useState<string | null>(null);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  
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
    refreshTemplates // Template refresh function
  } = useSpecialtyBlending({
    maxSpecialties: 10,
    allowTemplates: true
  });
  

  // Filter and sort survey data based on all filters
  const filteredSurveyData = useMemo(() => {
    // Use real survey data from the hook
    if (!allData || allData.length === 0) {
      return [];
    }

    let filtered = allData.filter((row: any) => {
      // Skip undefined or null rows
      if (!row) {
        return false;
      }

      const matchesSurvey = !selectedSurvey || row.surveySource === selectedSurvey;
      const matchesYear = !selectedYear || row.surveyYear === selectedYear;
      const matchesRegion = !selectedRegion || row.geographicRegion === selectedRegion;
      
      // Handle provider type mapping
      let matchesProviderType = true;
      if (selectedProviderType) {
        if (selectedProviderType === 'Physician') {
          // Match both "Staff Physician" and "Physician"
          matchesProviderType = row.providerType === 'Staff Physician' || row.providerType === 'Physician';
        } else {
          matchesProviderType = row.providerType === selectedProviderType;
        }
      }
      
      const matchesSpecialty = !specialtySearch || 
        (row.surveySpecialty && (() => {
          // Use flexible word matching for specialty search
          const searchTerms = specialtySearch.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
          if (searchTerms.length === 0) return true;
          
          const specialtyText = row.surveySpecialty.toLowerCase();
          return searchTerms.every(term => specialtyText.includes(term));
        })());
      
      return matchesSurvey && matchesYear && matchesRegion && matchesProviderType && matchesSpecialty;
    });

    // Apply sorting if configured
    if (sortConfig) {
      filtered.sort((a: any, b: any) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        // Handle numeric columns
        if (['tcc_p50', 'wrvu_p50', 'cf_p50', 'tcc_n_orgs'].includes(sortConfig.key)) {
          const aNum = parseFloat(aValue) || 0;
          const bNum = parseFloat(bValue) || 0;
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // Handle string columns
        const aStr = (aValue || '').toString().toLowerCase();
        const bStr = (bValue || '').toString().toLowerCase();
        
        if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [allData, selectedSurvey, selectedYear, selectedRegion, selectedProviderType, specialtySearch, sortConfig]);

  // Paginated data for better performance
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSurveyData.slice(startIndex, endIndex);
  }, [filteredSurveyData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredSurveyData.length / itemsPerPage);

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [specialtySearch]);

  // Start progress animation when loading begins
  useEffect(() => {
    if (isLoading) {
      startProgress();
    } else {
      completeProgress();
    }
  }, [isLoading, startProgress, completeProgress]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setItemsPerPage(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  // Column resizing handlers
  const handleMouseDown = useCallback((column: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(column);
    
    const startX = e.clientX;
    const startWidth = columnWidths[column as keyof typeof columnWidths];
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + deltaX); // Minimum width of 50px
      setColumnWidths(prev => ({
        ...prev,
        [column]: newWidth
      }));
    };
    
    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  // Sorting handlers
  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => {
      if (!prev || prev.key !== column) {
        return { key: column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key: column, direction: 'desc' };
      }
      return null; // Clear sorting
    });
  }, []);



  // Filter specialties based on survey and year (keeping for compatibility)
  const filteredSpecialties = useMemo(() => {
    return availableSpecialties.filter(specialty => {
      const matchesSurvey = !selectedSurvey || specialty.surveySource === selectedSurvey;
      const matchesYear = !selectedYear || specialty.surveyYear === selectedYear;
      return matchesSurvey && matchesYear;
    });
  }, [availableSpecialties, selectedSurvey, selectedYear]);

  // Toggle specialty selection
  const toggleSpecialty = useCallback((specialty: SpecialtyItem) => {
    setSelectedSpecialtyIds(prev => {
      if (prev.includes(specialty.id)) {
        // Remove specialty
        removeSpecialty(specialty.id);
        return prev.filter(id => id !== specialty.id);
      } else {
        // Add specialty
        addSpecialty(specialty);
        return [...prev, specialty.id];
      }
    });
  }, [addSpecialty, removeSpecialty]);

  // Survey data row selection handlers - using AG Grid's native selection
  const selectAllData = useCallback(() => {
    // AG Grid's header checkbox will handle this automatically
  }, []);

  const clearAllData = useCallback(() => {
    // AG Grid's header checkbox will handle this automatically
  }, []);

  // Calculate blended metrics for selected specialties
  const blendedMetrics = useMemo(() => {
    if (selectedDataRows.length === 0) {
      return null;
    }

    const selectedData = selectedDataRows.map(index => filteredSurveyData[index]).filter(row => row); // Filter out undefined rows
    
    const blended = {
      tcc_p25: 0,
      tcc_p50: 0,
      tcc_p75: 0,
      tcc_p90: 0,
      wrvu_p25: 0,
      wrvu_p50: 0,
      wrvu_p75: 0,
      wrvu_p90: 0,
      cf_p25: 0,
      cf_p50: 0,
      cf_p75: 0,
      cf_p90: 0,
      totalRecords: 0,
      specialties: selectedData.map(row => row.surveySpecialty),
      method: blendingMethod
    };

    // Calculate weights based on blending method
    let weights: number[] = [];
    
    if (blendingMethod === 'weighted') {
      // Weight by incumbent count (number of people)
      const totalIncumbents = selectedData.reduce((sum, row) => sum + (row.n_incumbents || 0), 0);
      weights = selectedData.map(row => (row.n_incumbents || 0) / totalIncumbents);
      blended.totalRecords = selectedData.reduce((sum, row) => sum + (row.tcc_n_orgs || 0), 0);
    } else if (blendingMethod === 'simple') {
      // Equal weights
      weights = selectedData.map(() => 1 / selectedData.length);
      blended.totalRecords = selectedData.reduce((sum, row) => sum + (row.tcc_n_orgs || 0), 0);
    } else if (blendingMethod === 'custom') {
      // Custom weights from user input
      const totalCustomWeight = selectedDataRows.reduce((sum, index) => sum + (customWeights[index] || 0), 0);
      if (totalCustomWeight === 0) {
        // Fallback to equal weights if no custom weights set
        weights = selectedData.map(() => 1 / selectedData.length);
      } else {
        weights = selectedDataRows.map(index => (customWeights[index] || 0) / totalCustomWeight);
      }
      blended.totalRecords = selectedData.reduce((sum, row) => sum + (row.tcc_n_orgs || 0), 0);
    }

    // ENTERPRISE FIX: Handle missing/null/zero values properly
    // Only include rows with valid data for each percentile to prevent ordering violations
    // Missing values should be excluded from the weighted average, not treated as 0
    
    // Helper function to check if a value is valid (not null, undefined, or NaN)
    // For CF, also exclude 0 as it's not a valid conversion factor
    const isValidValue = (value: any, excludeZero: boolean = false): boolean => {
      if (value === null || value === undefined || isNaN(value) || typeof value !== 'number') {
        return false;
      }
      if (excludeZero && value === 0) {
        return false;
      }
      return true;
    };
    
    // Calculate each percentile separately, only including rows with valid data
    const percentiles = ['p25', 'p50', 'p75', 'p90'] as const;
    
    percentiles.forEach(percentile => {
      // TCC metrics
      const tccKey = `tcc_${percentile}` as keyof typeof blended;
      const validTccRows = selectedData.filter((row, idx) => isValidValue(row[`tcc_${percentile}` as keyof typeof row]));
      if (validTccRows.length > 0) {
        const validTccWeights = validTccRows.map((row, idx) => {
          const originalIndex = selectedData.indexOf(row);
          return weights[originalIndex] || 0;
        });
        const totalTccWeight = validTccWeights.reduce((sum, w) => sum + w, 0);
        if (totalTccWeight > 0) {
          validTccRows.forEach((row, idx) => {
            const originalIndex = selectedData.indexOf(row);
            const normalizedWeight = (weights[originalIndex] || 0) / totalTccWeight;
            (blended[tccKey] as number) += (row[`tcc_${percentile}` as keyof typeof row] as number) * normalizedWeight;
          });
        }
      }
      
      // wRVU metrics
      const wrvuKey = `wrvu_${percentile}` as keyof typeof blended;
      const validWrvuRows = selectedData.filter((row, idx) => isValidValue(row[`wrvu_${percentile}` as keyof typeof row]));
      if (validWrvuRows.length > 0) {
        const validWrvuWeights = validWrvuRows.map((row, idx) => {
          const originalIndex = selectedData.indexOf(row);
          return weights[originalIndex] || 0;
        });
        const totalWrvuWeight = validWrvuWeights.reduce((sum, w) => sum + w, 0);
        if (totalWrvuWeight > 0) {
          validWrvuRows.forEach((row, idx) => {
            const originalIndex = selectedData.indexOf(row);
            const normalizedWeight = (weights[originalIndex] || 0) / totalWrvuWeight;
            (blended[wrvuKey] as number) += (row[`wrvu_${percentile}` as keyof typeof row] as number) * normalizedWeight;
          });
        }
      }
      
      // CF metrics - CRITICAL: Exclude missing values and 0 to prevent P90 < P75 violations
      // CF cannot be 0, so exclude both missing values and zero values
      const cfKey = `cf_${percentile}` as keyof typeof blended;
      const validCfRows = selectedData.filter((row, idx) => isValidValue(row[`cf_${percentile}` as keyof typeof row], true));
      if (validCfRows.length > 0) {
        const validCfWeights = validCfRows.map((row, idx) => {
          const originalIndex = selectedData.indexOf(row);
          return weights[originalIndex] || 0;
        });
        const totalCfWeight = validCfWeights.reduce((sum, w) => sum + w, 0);
        if (totalCfWeight > 0) {
          validCfRows.forEach((row, idx) => {
            const originalIndex = selectedData.indexOf(row);
            const normalizedWeight = (weights[originalIndex] || 0) / totalCfWeight;
            (blended[cfKey] as number) += (row[`cf_${percentile}` as keyof typeof row] as number) * normalizedWeight;
          });
        }
      }
    });

    return blended;
  }, [selectedDataRows, filteredSurveyData, blendingMethod, customWeights]);

  // Download report handler - generates professional PDF report
  const handleDownloadReport = useCallback(async () => {
    if (!blendedMetrics) {
      toast({
        title: 'No Data Available',
        description: 'Please select specialties and calculate blended metrics before generating a report.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      // Show loading toast
      const loadingToast = toast({
        title: 'Generating PDF Report',
        description: 'Creating your professional report... This may take a few seconds.',
      });
      
      console.log('🔍 Starting PDF report generation...');
      console.log('🔍 Blended metrics:', blendedMetrics);
      
      // Prepare report data
      const reportData: BlendedReportData = {
        title: 'Blended Compensation Report',
        generatedAt: new Date().toLocaleString(),
        blendMethod: blendingMethod,
        specialties: blendedMetrics.specialties,
        totalRecords: blendedMetrics.totalRecords,
        // Include custom weights for transparency when custom blending is used
        customWeights: blendingMethod === 'custom' ? selectedDataRows.map((index) => {
          const row = filteredSurveyData[index];
          const weight = customWeights[index] || 0;
          return {
            specialty: row?.surveySpecialty || 'Unknown',
            weight: weight,
            records: row?.tcc_n_orgs || row?.n_orgs || 0
          };
        }).filter(item => item.specialty !== 'Unknown') : undefined,
        metrics: {
          tcc: {
            p25: blendedMetrics.tcc_p25,
            p50: blendedMetrics.tcc_p50,
            p75: blendedMetrics.tcc_p75,
            p90: blendedMetrics.tcc_p90
          },
          wrvu: {
            p25: blendedMetrics.wrvu_p25,
            p50: blendedMetrics.wrvu_p50,
            p75: blendedMetrics.wrvu_p75,
            p90: blendedMetrics.wrvu_p90
          },
          cf: {
            p25: blendedMetrics.cf_p25,
            p50: blendedMetrics.cf_p50,
            p75: blendedMetrics.cf_p75,
            p90: blendedMetrics.cf_p90
          }
        }
      };
      
      console.log('🔍 Report data prepared:', reportData);
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `Blended-Compensation-Report-${timestamp}.pdf`;
      
      console.log('🔍 Generating PDF with filename:', filename);
      
      // Generate and download PDF
      await generateBlendedReportPDF(reportData, filename);
      
      console.log('✅ PDF generation completed successfully');
      
      // Show success toast
      toast({
        title: 'Report Generated Successfully',
        description: `Your PDF report "${filename}" has been downloaded. Check your downloads folder.`,
      });
    } catch (error) {
      console.error('❌ Error generating PDF report:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An error occurred while generating the report. Please check the browser console for details.';
      
      toast({
        title: 'Report Generation Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  }, [blendedMetrics, blendingMethod, selectedDataRows, filteredSurveyData, customWeights, toast]);
  
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
    
    // Show confirmation modal
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
      
      // The hook already updates the templates state, so no need to refresh
      console.log('🔍 Template saved, templates should be updated automatically');
      
      // Show success modal
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
      // Call the delete template function from the hook
      await deleteTemplate(templateId);
      
      // Clear selected template if it was the one being deleted
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId('');
      }
      
      // Refresh templates list
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
    
    // Update selected template ID
    setSelectedTemplateId(templateId);
    
    // Load template data into the form
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
    
    // Show success message
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Blend Configuration</h2>
              <div className="flex items-center space-x-3">
                {/* Saved Blends Dropdown - Matching CustomReports pattern */}
                {templates.length > 0 && (
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Select
                      value={selectedTemplateId || ""}
                      onChange={(e: SelectChangeEvent<string>) => {
                        const templateId = e.target.value;
                        if (templateId) {
                          handleLoadTemplate(templateId);
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
                                handleDeleteTemplate(template.id);
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
                    onChange={(e) => setBlendName(e.target.value)}
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
                        onChange={(e) => setBlendDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter description (optional)"
                      />
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔍 Save Template button clicked!');
                        handleSaveTemplate();
                      }}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
               {/* Specialty Search */}
              <div>
                 <TextField
                   fullWidth
                   size="small"
                   label="Search Specialties"
                  value={specialtySearch}
                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpecialtySearch(e.target.value)}
                  placeholder="Type to search specialties"
                   sx={{
                     '& .MuiOutlinedInput-root': {
                       backgroundColor: 'white',
                       borderRadius: '8px !important',
                       height: '40px',
                       border: '1px solid #d1d5db !important',
                       '&:hover': { 
                         borderColor: '#9ca3af !important',
                         borderWidth: '1px !important'
                       },
                       '&.Mui-focused': { 
                         boxShadow: 'none', 
                         borderColor: '#3b82f6 !important',
                         borderWidth: '1px !important'
                       },
                       '& fieldset': {
                         border: 'none !important',
                         borderRadius: '8px !important'
                       },
                       '& .MuiOutlinedInput-notchedOutline': {
                         borderRadius: '8px !important'
                       }
                     }
                   }}
                />
              </div>
               
               {/* Survey Source */}
              <div>
                 <FormControl fullWidth size="small">
                   <InputLabel>Survey Source</InputLabel>
                   <Select
                  value={selectedSurvey}
                     label="Survey Source"
                     onChange={(e: SelectChangeEvent) => setSelectedSurvey(e.target.value)}
                     sx={{
                       '& .MuiOutlinedInput-root': {
                         backgroundColor: 'white',
                         borderRadius: '8px',
                         height: '40px',
                         border: '1px solid #d1d5db !important',
                         '&:hover': { 
                           borderColor: '#9ca3af !important',
                           borderWidth: '1px !important'
                         },
                         '&.Mui-focused': { 
                           boxShadow: 'none', 
                           borderColor: '#3b82f6 !important',
                           borderWidth: '1px !important'
                         },
                         '& fieldset': {
                           border: 'none !important'
                         }
                       }
                     }}
                   >
                     <MenuItem value="">All Surveys</MenuItem>
                  {[...new Set(allData.map(row => row?.surveySource).filter(Boolean))].sort().map(survey => (
                       <MenuItem key={survey} value={survey}>{survey}</MenuItem>
                  ))}
                   </Select>
                 </FormControl>
              </div>
               
               {/* Year */}
              <div>
                 <FormControl fullWidth size="small">
                   <InputLabel>Year</InputLabel>
                   <Select
                  value={selectedYear}
                     label="Year"
                     onChange={(e: SelectChangeEvent) => setSelectedYear(e.target.value)}
                     sx={{
                       '& .MuiOutlinedInput-root': {
                         backgroundColor: 'white',
                         borderRadius: '8px',
                         height: '40px',
                         border: '1px solid #d1d5db !important',
                         '&:hover': { 
                           borderColor: '#9ca3af !important',
                           borderWidth: '1px !important'
                         },
                         '&.Mui-focused': { 
                           boxShadow: 'none', 
                           borderColor: '#3b82f6 !important',
                           borderWidth: '1px !important'
                         },
                         '& fieldset': {
                           border: 'none !important'
                         }
                       }
                     }}
                   >
                     <MenuItem value="">All Years</MenuItem>
                  {[...new Set(allData.map(row => row?.surveyYear).filter(Boolean))].sort().map(year => (
                       <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                   </Select>
                 </FormControl>
              </div>
               
               {/* Region */}
              <div>
                 <FormControl fullWidth size="small">
                   <InputLabel>Region</InputLabel>
                   <Select
                  value={selectedRegion}
                     label="Region"
                     onChange={(e: SelectChangeEvent) => setSelectedRegion(e.target.value)}
                     sx={{
                       '& .MuiOutlinedInput-root': {
                         backgroundColor: 'white',
                         borderRadius: '8px',
                         height: '40px',
                         border: '1px solid #d1d5db !important',
                         '&:hover': { 
                           borderColor: '#9ca3af !important',
                           borderWidth: '1px !important'
                         },
                         '&.Mui-focused': { 
                           boxShadow: 'none', 
                           borderColor: '#3b82f6 !important',
                           borderWidth: '1px !important'
                         },
                         '& fieldset': {
                           border: 'none !important'
                         }
                       }
                     }}
                   >
                     <MenuItem value="">All Regions</MenuItem>
                  {[...new Set(allData.map(row => row?.geographicRegion).filter(Boolean))].sort().map(region => (
                       <MenuItem key={region} value={region}>{region}</MenuItem>
                  ))}
                   </Select>
                 </FormControl>
              </div>
               
               {/* Provider Type */}
              <div>
                 <FormControl fullWidth size="small">
                   <InputLabel>Provider Type</InputLabel>
                   <Select
                  value={selectedProviderType}
                     label="Provider Type"
                     onChange={(e: SelectChangeEvent) => setSelectedProviderType(e.target.value)}
                     sx={{
                       '& .MuiOutlinedInput-root': {
                         backgroundColor: 'white',
                         borderRadius: '8px',
                         height: '40px',
                         border: '1px solid #d1d5db !important',
                         '&:hover': { 
                           borderColor: '#9ca3af !important',
                           borderWidth: '1px !important'
                         },
                         '&.Mui-focused': { 
                           boxShadow: 'none', 
                           borderColor: '#3b82f6 !important',
                           borderWidth: '1px !important'
                         },
                         '& fieldset': {
                           border: 'none !important'
                         }
                       }
                     }}
                   >
                     <MenuItem value="">All Provider Types</MenuItem>
                  {[...new Set(allData.map((row: any) => row.providerType))].sort().map(providerType => (
                       <MenuItem key={providerType} value={providerType}>
                      {providerType === 'Staff Physician' ? 'Physician' : providerType}
                       </MenuItem>
                  ))}
                   </Select>
                 </FormControl>
              </div>
            </div>

             {/* Data Table - AG Grid */}
             <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm">
               <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">
                    Survey Data ({filteredSurveyData.length} records)
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {selectedDataRows.length} selected
                    </span>
                     <span className="text-xs text-gray-400">
                       Use checkboxes to select rows
                     </span>
                  </div>
                </div>
              </div>
              
               {isLoading ? (
                 <EnterpriseLoadingSpinner
                   message="Loading survey data..."
                   recordCount="auto"
                   data={filteredSurveyData}
                   progress={progress}
                   variant="inline"
                   loading={isLoading}
                 />
               ) : filteredSurveyData.length === 0 ? (
                 <div className="bg-white rounded-b-xl">
                   <EmptyState
                     icon={<BoltIcon className="h-6 w-6 text-gray-500" />}
                     title="No Survey Data Found"
                     message="Try adjusting your filters or check if data is loaded. Upload surveys first to create blends."
                   />
                 </div>
                ) : (
                 <div className="bg-white rounded-b-xl">
                   <div className="overflow-x-auto max-w-full">
                     <table className="w-full" style={{ tableLayout: 'fixed' }}>
                       <thead className="bg-gray-50 border-b border-gray-200">
                         <tr>
                           <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative" style={{ width: `${columnWidths.checkbox}px` }}>
                             <input
                               type="checkbox"
                               checked={selectedDataRows.length === filteredSurveyData.length && filteredSurveyData.length > 0}
                               onChange={(e) => {
                                 if (e.target.checked) {
                                   setSelectedDataRows(filteredSurveyData.map((_, index) => index));
                                 } else {
                                   setSelectedDataRows([]);
                                 }
                               }}
                               className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                               aria-label="Select all rows"
                               title="Select all rows"
                             />
                           </th>
                           <th 
                             className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                             style={{ width: `${columnWidths.specialty}px` }}
                             onClick={() => handleSort('surveySpecialty')}
                           >
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-1">
                                 <span>Specialty</span>
                                 {sortConfig?.key === 'surveySpecialty' && (
                                   <span className="text-purple-600">
                                     {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                   </span>
                                 )}
                               </div>
                               <div 
                                 className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                                 onMouseDown={(e) => handleMouseDown('specialty', e)}
                                 title="Resize column"
                               />
                             </div>
                           </th>
                           <th 
                             className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                             style={{ width: `${columnWidths.survey}px` }}
                             onClick={() => handleSort('surveySource')}
                           >
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-1">
                                 <span>Survey</span>
                                 {sortConfig?.key === 'surveySource' && (
                                   <span className="text-purple-600">
                                     {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                   </span>
                                 )}
                               </div>
                               <div 
                                 className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                                 onMouseDown={(e) => handleMouseDown('survey', e)}
                                 title="Resize column"
                               />
                             </div>
                           </th>
                           <th 
                             className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                             style={{ width: `${columnWidths.year}px` }}
                             onClick={() => handleSort('surveyYear')}
                           >
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-1">
                                 <span>Year</span>
                                 {sortConfig?.key === 'surveyYear' && (
                                   <span className="text-purple-600">
                                     {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                   </span>
                                 )}
                               </div>
                               <div 
                                 className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                                 onMouseDown={(e) => handleMouseDown('year', e)}
                                 title="Resize column"
                               />
                             </div>
                           </th>
                           <th 
                             className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                             style={{ width: `${columnWidths.region}px` }}
                             onClick={() => handleSort('geographicRegion')}
                           >
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-1">
                                 <span>Region</span>
                                 {sortConfig?.key === 'geographicRegion' && (
                                   <span className="text-purple-600">
                                     {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                   </span>
                                 )}
                               </div>
                               <div 
                                 className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                                 onMouseDown={(e) => handleMouseDown('region', e)}
                                 title="Resize column"
                               />
                             </div>
                           </th>
                           <th 
                             className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                             style={{ width: `${columnWidths.provider}px` }}
                             onClick={() => handleSort('providerType')}
                           >
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-1">
                                 <span>Provider</span>
                                 {sortConfig?.key === 'providerType' && (
                                   <span className="text-purple-600">
                                     {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                   </span>
                                 )}
                               </div>
                               <div 
                                 className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                                 onMouseDown={(e) => handleMouseDown('provider', e)}
                                 title="Resize column"
                               />
                             </div>
                           </th>
                           <th 
                             className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                             style={{ width: `${columnWidths.tcc}px` }}
                             onClick={() => handleSort('tcc_p50')}
                           >
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-1">
                                 <span>TCC P50</span>
                                 {sortConfig?.key === 'tcc_p50' && (
                                   <span className="text-purple-600">
                                     {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                   </span>
                                 )}
                               </div>
                               <div 
                                 className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                                 onMouseDown={(e) => handleMouseDown('tcc', e)}
                                 title="Resize column"
                               />
                             </div>
                           </th>
                           <th 
                             className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                             style={{ width: `${columnWidths.wrvu}px` }}
                             onClick={() => handleSort('wrvu_p50')}
                           >
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-1">
                                 <span>wRVU P50</span>
                                 {sortConfig?.key === 'wrvu_p50' && (
                                   <span className="text-purple-600">
                                     {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                   </span>
                                 )}
                               </div>
                               <div 
                                 className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                                 onMouseDown={(e) => handleMouseDown('wrvu', e)}
                                 title="Resize column"
                               />
                             </div>
                           </th>
                           <th 
                             className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                             style={{ width: `${columnWidths.cf}px` }}
                             onClick={() => handleSort('cf_p50')}
                           >
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-1">
                                 <span>CF P50</span>
                                 {sortConfig?.key === 'cf_p50' && (
                                   <span className="text-purple-600">
                                     {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                   </span>
                                 )}
                               </div>
                               <div 
                                 className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                                 onMouseDown={(e) => handleMouseDown('cf', e)}
                                 title="Resize column"
                               />
                             </div>
                           </th>
                           <th 
                             className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative cursor-pointer hover:bg-gray-100 select-none" 
                             style={{ width: `${columnWidths.records}px` }}
                             onClick={() => handleSort('tcc_n_orgs')}
                           >
                             <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-1">
                                 <span>Records</span>
                                 {sortConfig?.key === 'tcc_n_orgs' && (
                                   <span className="text-purple-600">
                                     {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                   </span>
                                 )}
                               </div>
                               <div 
                                 className="absolute right-0 top-0 h-full w-px bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                                 onMouseDown={(e) => handleMouseDown('records', e)}
                                 title="Resize column"
                               />
                             </div>
                           </th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-50">
                         {paginatedData.map((row, index) => {
                           const actualIndex = (currentPage - 1) * itemsPerPage + index;
                           return (
                           <tr 
                             key={index}
                             className={`hover:bg-gray-50 cursor-pointer ${
                               selectedDataRows.includes(actualIndex) ? 'bg-blue-50' : ''
                             }`}
                             onClick={() => {
                               if (selectedDataRows.includes(actualIndex)) {
                                 setSelectedDataRows(selectedDataRows.filter(i => i !== actualIndex));
                               } else {
                                 setSelectedDataRows([...selectedDataRows, actualIndex]);
                               }
                             }}
                           >
                             <td className="px-2 py-3 whitespace-nowrap" style={{ width: `${columnWidths.checkbox}px` }}>
                               <input
                                 type="checkbox"
                                 checked={selectedDataRows.includes(actualIndex)}
                                 onChange={(e) => {
                                   e.stopPropagation();
                                   if (e.target.checked) {
                                     setSelectedDataRows([...selectedDataRows, actualIndex]);
                                   } else {
                                     setSelectedDataRows(selectedDataRows.filter(i => i !== actualIndex));
                                   }
                                 }}
                                 className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                 aria-label={`Select row ${index + 1}`}
                                 title={`Select row ${index + 1}`}
                               />
                             </td>
                             <td className="px-2 py-3 text-sm font-medium text-gray-900" style={{ width: `${columnWidths.specialty}px` }}>
                               <div className="truncate" title={row.surveySpecialty}>
                                 {row.surveySpecialty}
                               </div>
                             </td>
                             <td className="px-2 py-3 text-sm text-gray-500" style={{ width: `${columnWidths.survey}px` }}>
                               <div className="truncate" title={row.surveySource}>
                                 {row.surveySource}
                               </div>
                             </td>
                             <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500" style={{ width: `${columnWidths.year}px` }}>
                               {row.surveyYear}
                             </td>
                             <td className="px-2 py-3 text-sm text-gray-500" style={{ width: `${columnWidths.region}px` }}>
                               <div className="truncate" title={row.geographicRegion}>
                                 {row.geographicRegion}
                               </div>
                             </td>
                             <td className="px-2 py-3 text-sm text-gray-500" style={{ width: `${columnWidths.provider}px` }}>
                               <div className="truncate" title={row.providerType}>
                                 {row.providerType}
                               </div>
                             </td>
                             <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.tcc}px` }}>
                               {row.tcc_p50 ? `$${parseFloat(row.tcc_p50.toString()).toLocaleString()}` : '***'}
                             </td>
                             <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.wrvu}px` }}>
                               {row.wrvu_p50 ? parseFloat(row.wrvu_p50.toString()).toLocaleString() : '***'}
                             </td>
                             <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.cf}px` }}>
                               {row.cf_p50 ? `$${parseFloat(row.cf_p50.toString()).toLocaleString()}` : '***'}
                             </td>
                             <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.records}px` }}>
                               {(row.tcc_n_orgs || 0).toLocaleString()}
                             </td>
                           </tr>
                           );
                         })}
                       </tbody>
                     </table>
                     
                     {/* Modern Pagination */}
                     {totalPages > 1 && (
                       <div style={{ 
                         boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                         border: '1px solid #e5e7eb',
                         borderTop: 'none',
                         borderRadius: '0 0 8px 8px',
                         marginTop: '-1px', // Ensure seamless connection
                         marginLeft: '8px', // Match table left margin
                         marginRight: '8px', // Match table right margin
                         width: 'calc(100% - 16px)', // Account for left and right margins
                         boxSizing: 'border-box' // Include borders in width calculation
                       }}>
                         <ModernPagination
                           currentPage={currentPage}
                           totalPages={totalPages}
                           pageSize={itemsPerPage}
                           totalRows={filteredSurveyData.length}
                           onPageChange={handlePageChange}
                           onPageSizeChange={handlePageSizeChange}
                           pageSizeOptions={[10, 25, 50, 100]}
                         />
                       </div>
                     )}
                   </div>
                 </div>
               )}
            </div>
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
                      
                      // Skip if row is undefined
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
                                    background: `linear-gradient(to right, #9333ea 0%, #9333ea ${currentWeight}%, #e5e7eb ${currentWeight}%, #e5e7eb 100%)`,
                                    accentColor: '#9333ea'
                                  } as React.CSSProperties}
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

        {/* Blended Results - Google Style */}
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
                    onClick={() => handleDownloadReport()}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Export to PDF
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
                  <tbody className="divide-y divide-gray-200">
                    <tr className="hover:bg-gray-50 border-t-2 border-gray-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                          <div className="text-sm font-medium text-gray-900">Total Cash Compensation</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${blendedMetrics.tcc_p25.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        ${blendedMetrics.tcc_p50.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${blendedMetrics.tcc_p75.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${blendedMetrics.tcc_p90.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 border-t-2 border-gray-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                          <div className="text-sm font-medium text-gray-900">Work RVUs</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {blendedMetrics.wrvu_p25.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        {blendedMetrics.wrvu_p50.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {blendedMetrics.wrvu_p75.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {blendedMetrics.wrvu_p90.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 border-t-2 border-gray-200">
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
