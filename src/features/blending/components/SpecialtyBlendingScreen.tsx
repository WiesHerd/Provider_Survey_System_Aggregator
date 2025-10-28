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
import { UnifiedLoadingSpinner } from '../../../shared/components/UnifiedLoadingSpinner';
import { useSmoothProgress } from '../../../shared/hooks/useSmoothProgress';
import { BookmarkSlashIcon } from '@heroicons/react/24/outline';

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
        (row.surveySpecialty && row.surveySpecialty.toLowerCase().includes(specialtySearch.toLowerCase()));
      
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

    selectedData.forEach((row, index) => {
      const weight = weights[index] || 0;
      
      // TCC metrics
      blended.tcc_p25 += (row.tcc_p25 || 0) * weight;
      blended.tcc_p50 += (row.tcc_p50 || 0) * weight;
      blended.tcc_p75 += (row.tcc_p75 || 0) * weight;
      blended.tcc_p90 += (row.tcc_p90 || 0) * weight;
      
      // wRVU metrics
      blended.wrvu_p25 += (row.wrvu_p25 || 0) * weight;
      blended.wrvu_p50 += (row.wrvu_p50 || 0) * weight;
      blended.wrvu_p75 += (row.wrvu_p75 || 0) * weight;
      blended.wrvu_p90 += (row.wrvu_p90 || 0) * weight;
      
      // CF metrics
      blended.cf_p25 += (row.cf_p25 || 0) * weight;
      blended.cf_p50 += (row.cf_p50 || 0) * weight;
      blended.cf_p75 += (row.cf_p75 || 0) * weight;
      blended.cf_p90 += (row.cf_p90 || 0) * weight;
    });

    return blended;
  }, [selectedDataRows, filteredSurveyData, blendingMethod, customWeights]);

  // Download report handler
  const handleDownloadReport = useCallback(() => {
    if (!blendedMetrics) return;
    
    // Create a nicely formatted report
    const reportData = {
      title: 'Blended Compensation Report',
      generatedAt: new Date().toLocaleString(),
      blendMethod: blendingMethod,
      specialties: blendedMetrics.specialties,
      totalRecords: blendedMetrics.totalRecords,
      // Include custom weights for transparency when custom blending is used
      customWeights: blendingMethod === 'custom' ? selectedDataRows.map((index, i) => {
        const row = filteredSurveyData[index];
        const weight = customWeights[index] || 0;
        return {
          specialty: row?.surveySpecialty || 'Unknown',
          weight: weight,
          records: row?.tcc_n_orgs || row?.n_orgs || 0
        };
      }).filter(item => item.specialty !== 'Unknown') : null,
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
    
    // Create HTML report
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Blended Compensation Report</title>
        <style>
          @media print {
            body { margin: 0; padding: 0.25in; }
            .no-print { display: none; }
            .page-break { page-break-before: always; }
            .avoid-break { page-break-inside: avoid; }
            .footer { page-break-inside: avoid; }
            @page {
              margin: 0.25in;
              @top-left { content: ""; }
              @top-center { content: ""; }
              @top-right { content: ""; }
              @bottom-left { content: ""; }
              @bottom-center { content: ""; }
              @bottom-right { content: ""; }
            }
          }
          
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 20px; 
            line-height: 1.5; 
            color: #333; 
            background: white;
          }
          .header { 
            border-bottom: 2px solid #6366f1; 
            padding-bottom: 15px; 
            margin-bottom: 20px; 
            margin-top: 0;
          }
          .title { 
            font-size: 28px; 
            font-weight: bold; 
            color: #1f2937; 
            margin: 0; 
          }
          .subtitle { 
            font-size: 16px; 
            color: #6b7280; 
            margin: 8px 0 0 0; 
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
            margin: 20px 0; 
          }
          .info-item { 
            background: #f9fafb; 
            padding: 15px; 
            border-radius: 8px; 
            border: 1px solid #e5e7eb;
          }
          .info-label { 
            font-weight: 600; 
            color: #374151; 
            margin-bottom: 5px; 
          }
          .info-value { 
            color: #6b7280; 
          }
          .metrics-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
            page-break-inside: avoid;
          }
          .metrics-table th { 
            background: #f3f4f6; 
            padding: 8px; 
            text-align: left; 
            font-weight: 600; 
            color: #374151; 
            border: 1px solid #d1d5db; 
          }
          .metrics-table td { 
            padding: 8px; 
            border: 1px solid #d1d5db; 
          }
          .metrics-table tr:nth-child(even) { 
            background: #f9fafb; 
          }
          .metric-name { 
            font-weight: 600; 
          }
          .percentile-value { 
            text-align: right; 
            font-family: 'SF Mono', Monaco, monospace; 
          }
          .p50 { 
            font-weight: bold; 
            background: #fef3c7; 
          }
          .footer { 
            margin-top: 20px; 
            padding-top: 15px; 
            border-top: 1px solid #e5e7eb; 
            color: #6b7280; 
            font-size: 12px; 
            page-break-inside: avoid;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin: 15px 0; 
          }
          .info-item { 
            background: #f9fafb; 
            padding: 12px; 
            border-radius: 6px; 
            border: 1px solid #e5e7eb;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Blended Compensation Report</h1>
          <p class="subtitle">Generated on ${reportData.generatedAt}</p>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Blending Method</div>
            <div class="info-value">${reportData.blendMethod === 'weighted' ? 'Weighted by incumbent count' : reportData.blendMethod === 'simple' ? 'Simple average (equal weights)' : 'Custom weights applied'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Specialties Included</div>
            <div class="info-value">${reportData.specialties.join(', ')}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Records</div>
            <div class="info-value">${reportData.totalRecords.toLocaleString()}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Report Type</div>
            <div class="info-value">Compensation Benchmarking Analysis</div>
          </div>
        </div>
        
        ${reportData.customWeights ? `
        <div class="custom-weights-section">
          <h3 style="color: #374151; margin: 30px 0 15px 0; font-size: 18px; font-weight: 600;">Custom Weight Distribution</h3>
          <p style="color: #6b7280; margin-bottom: 20px; font-size: 14px;">The following percentages were applied to each specialty in the blended calculation:</p>
          <table class="metrics-table" style="margin-bottom: 30px;">
            <thead>
              <tr>
                <th>Specialty</th>
                <th style="text-align: right;">Weight Applied</th>
                <th style="text-align: right;">Records</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.customWeights.map(item => `
                <tr>
                  <td class="metric-name">${item.specialty}</td>
                  <td class="percentile-value">${item.weight.toFixed(1)}%</td>
                  <td class="percentile-value">${item.records.toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr style="background: #f3f4f6; font-weight: 600;">
                <td class="metric-name">Total</td>
                <td class="percentile-value">${reportData.customWeights.reduce((sum, item) => sum + item.weight, 0).toFixed(1)}%</td>
                <td class="percentile-value">${reportData.customWeights.reduce((sum, item) => sum + item.records, 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}
        
        <table class="metrics-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>P25</th>
              <th>P50 (Median)</th>
              <th>P75</th>
              <th>P90</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="metric-name">Total Cash Compensation</td>
              <td class="percentile-value">$${reportData.metrics.tcc.p25.toLocaleString()}</td>
              <td class="percentile-value p50">$${reportData.metrics.tcc.p50.toLocaleString()}</td>
              <td class="percentile-value">$${reportData.metrics.tcc.p75.toLocaleString()}</td>
              <td class="percentile-value">$${reportData.metrics.tcc.p90.toLocaleString()}</td>
            </tr>
            <tr>
              <td class="metric-name">Work RVUs</td>
              <td class="percentile-value">${reportData.metrics.wrvu.p25.toLocaleString()}</td>
              <td class="percentile-value p50">${reportData.metrics.wrvu.p50.toLocaleString()}</td>
              <td class="percentile-value">${reportData.metrics.wrvu.p75.toLocaleString()}</td>
              <td class="percentile-value">${reportData.metrics.wrvu.p90.toLocaleString()}</td>
            </tr>
            <tr>
              <td class="metric-name">Conversion Factor</td>
              <td class="percentile-value">$${reportData.metrics.cf.p25.toFixed(2)}</td>
              <td class="percentile-value p50">$${reportData.metrics.cf.p50.toFixed(2)}</td>
              <td class="percentile-value">$${reportData.metrics.cf.p75.toFixed(2)}</td>
              <td class="percentile-value">$${reportData.metrics.cf.p90.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>This report was generated by the Survey Aggregator system. The data represents blended compensation metrics based on the selected specialties and blending method.</p>
          ${reportData.customWeights ? `
          <p><strong>Custom Blending Methodology:</strong> This report used custom weight percentages for each specialty as shown in the Custom Weight Distribution table above. These weights were applied to calculate the blended percentiles shown in the compensation metrics.</p>
          ` : ''}
          <p><strong>Note:</strong> P50 values represent the median (50th percentile) and are highlighted for emphasis.</p>
          <p><strong>Transparency:</strong> ${reportData.blendMethod === 'custom' ? 'Custom weights are disclosed above for full transparency and reproducibility.' : 'Blending methodology is clearly indicated in the report header.'}</p>
        </div>
      </body>
      </html>
    `;
    
    // Create PDF using browser's print functionality
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      // Set a proper title to avoid "about:blank"
      printWindow.document.title = 'Blended Compensation Report';
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print dialog
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          // Close the window after printing (user can cancel if needed)
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
  }, [blendedMetrics, blendingMethod]);
  
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
        onClose={onClose || (() => {})}
      />
    );
  }
  
  
  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <UnifiedLoadingSpinner
        message="Loading survey data..."
        recordCount={0}
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
                 <UnifiedLoadingSpinner
                   message="Loading survey data..."
                   recordCount={filteredSurveyData.length}
                   progress={progress}
                   showProgress={true}
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
                                 className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
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
                                 className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
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
                                 className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
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
                                 className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
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
                                 className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
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
                                 className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
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
                                 className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
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
                                 className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
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
                                 className="absolute right-0 top-0 h-full w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize"
                                 onMouseDown={(e) => handleMouseDown('records', e)}
                                 title="Resize column"
                               />
                             </div>
                           </th>
                         </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-50">
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
                               {row.tcc_p50 ? `$${parseFloat(row.tcc_p50.toString()).toLocaleString()}` : 'n/a'}
                             </td>
                             <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.wrvu}px` }}>
                               {row.wrvu_p50 ? parseFloat(row.wrvu_p50.toString()).toLocaleString() : 'n/a'}
                             </td>
                             <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ width: `${columnWidths.cf}px` }}>
                               {row.cf_p50 ? `$${parseFloat(row.cf_p50.toString()).toLocaleString()}` : 'N/A'}
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
                    <tr className="hover:bg-gray-50">
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
