/**
 * Specialty Blending Screen
 * 
 * This is the main screen for specialty blending functionality,
 * featuring modern drag & drop interface and precision controls.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useSpecialtyBlending } from '../hooks/useSpecialtyBlending';
import { SpecialtyItem } from '../types/blending';
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
  
  // Filter state
  const [selectedSurvey, setSelectedSurvey] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedProviderType, setSelectedProviderType] = useState('');
  const [selectedDataRows, setSelectedDataRows] = useState<number[]>([]);
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<string[]>([]);
  const [specialtySearch, setSpecialtySearch] = useState('');
  
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
    resetBlend
  } = useSpecialtyBlending({
    maxSpecialties: 10,
    allowTemplates: true
  });
  

  // Filter survey data based on all filters
  const filteredSurveyData = useMemo(() => {
    // Use real survey data from the hook
    if (!allData || allData.length === 0) {
      return [];
    }

    return allData.filter((row: any) => {
      const matchesSurvey = !selectedSurvey || row.surveySource === selectedSurvey;
      const matchesYear = !selectedYear || row.surveyYear === selectedYear;
      const matchesRegion = !selectedRegion || row.geographicRegion === selectedRegion;
      
      // Handle provider type mapping - "Physician" should match "Staff Physician"
      let matchesProviderType = true;
      if (selectedProviderType) {
        if (selectedProviderType === 'Staff Physician') {
          matchesProviderType = row.providerType === 'Staff Physician';
        } else {
          matchesProviderType = row.providerType === selectedProviderType;
        }
      }
      
      const matchesSpecialty = !specialtySearch || 
        (row.surveySpecialty && row.surveySpecialty.toLowerCase().includes(specialtySearch.toLowerCase()));
      return matchesSurvey && matchesYear && matchesRegion && matchesProviderType && matchesSpecialty;
    });
  }, [allData, selectedSurvey, selectedYear, selectedRegion, selectedProviderType, specialtySearch]);

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

  // Survey data row selection handlers
  const toggleDataRow = useCallback((index: number) => {
    setSelectedDataRows(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedDataRows.length === filteredSurveyData.length) {
      setSelectedDataRows([]);
    } else {
      setSelectedDataRows(filteredSurveyData.map((_: any, index: number) => index));
    }
  }, [selectedDataRows.length, filteredSurveyData.length]);

  const selectAllData = useCallback(() => {
    setSelectedDataRows(filteredSurveyData.map((_: any, index: number) => index));
  }, [filteredSurveyData.length]);

  const clearAllData = useCallback(() => {
    setSelectedDataRows([]);
  }, []);

  // Calculate blended metrics for selected specialties
  const blendedMetrics = useMemo(() => {
    if (selectedDataRows.length === 0) {
      return null;
    }

    const selectedData = selectedDataRows.map(index => filteredSurveyData[index]);
    
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
      // Weight by record count
      const totalRecords = selectedData.reduce((sum, row) => sum + (row.tcc_n_orgs || 0), 0);
      weights = selectedData.map(row => (row.tcc_n_orgs || 0) / totalRecords);
      blended.totalRecords = totalRecords;
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
        
        {/* Survey Data Browser */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Survey Data Browser
            </h2>
            <p className="text-sm text-gray-600 mt-1">Select specific survey data points for blending</p>
          </div>
          <div className="px-6 py-6">
            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* Specialty Search - moved to left of other filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Specialties
                </label>
                <input
                  type="text"
                  value={specialtySearch}
                  onChange={(e) => setSpecialtySearch(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Type to search specialties"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Survey Source
                </label>
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={selectedSurvey}
                  onChange={(e) => setSelectedSurvey(e.target.value)}
                >
                  <option value="">All Surveys</option>
                  <option value="MGMA">MGMA</option>
                  <option value="SullivanCotter">SullivanCotter</option>
                  <option value="Gallagher">Gallagher</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="">All Years</option>
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region
                </label>
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                >
                  <option value="">All Regions</option>
                  <option value="National">National</option>
                  <option value="Northeast">Northeast</option>
                  <option value="Southeast">Southeast</option>
                  <option value="Midwest">Midwest</option>
                  <option value="West">West</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider Type
                </label>
                <select 
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={selectedProviderType}
                  onChange={(e) => setSelectedProviderType(e.target.value)}
                >
                  <option value="">All Provider Types</option>
                  {[...new Set(allData.map((row: any) => row.providerType))].sort().map(providerType => (
                    <option key={providerType} value={providerType}>
                      {providerType === 'Staff Physician' ? 'Physician' : providerType}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data Table */}
            <div className="border border-gray-300 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">
                    Survey Data ({filteredSurveyData.length} records)
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {selectedDataRows.length} selected
                    </span>
                    <button
                      onClick={selectAllData}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearAllData}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {filteredSurveyData.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No survey data found with current filters
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={selectedDataRows.length === filteredSurveyData.length && filteredSurveyData.length > 0}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialty</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Survey</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TCC P50</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">wRVU P50</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CF P50</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSurveyData.map((row: any, index: number) => (
                        <tr 
                          key={`${row.surveySource}-${row.surveyYear}-${row.surveySpecialty}-${index}`}
                          className={`hover:bg-gray-50 ${selectedDataRows.includes(index) ? 'bg-indigo-50' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedDataRows.includes(index)}
                              onChange={() => toggleDataRow(index)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {row.surveySpecialty}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {row.surveySource}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {row.surveyYear}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {row.geographicRegion}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {row.providerType}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            ${row.tcc_p50?.toLocaleString() || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {row.wrvu_p50?.toLocaleString() || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            ${row.cf_p50?.toLocaleString() || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {row.tcc_n_orgs?.toLocaleString() || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
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
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="blendingMethod"
                    value="weighted"
                    checked={blendingMethod === 'weighted'}
                    onChange={(e) => setBlendingMethod(e.target.value as any)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Weighted Average</div>
                    <div className="text-xs text-gray-500">Weight by record count</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="blendingMethod"
                    value="simple"
                    checked={blendingMethod === 'simple'}
                    onChange={(e) => setBlendingMethod(e.target.value as any)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Simple Average</div>
                    <div className="text-xs text-gray-500">Equal weights for all</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="blendingMethod"
                    value="custom"
                    checked={blendingMethod === 'custom'}
                    onChange={(e) => setBlendingMethod(e.target.value as any)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Custom Weights</div>
                    <div className="text-xs text-gray-500">Set your own percentages</div>
                  </div>
                </label>
              </div>

              {/* Custom Weight Controls */}
              {blendingMethod === 'custom' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Set Custom Weights (%)</h3>
                  <div className="space-y-3">
                    {selectedDataRows.map((index, i) => {
                      const row = filteredSurveyData[index];
                      return (
                        <div key={index} className="flex items-center space-x-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {row.surveySpecialty}
                            </div>
                            <div className="text-xs text-gray-500">
                              {row.surveySource} • {row.tcc_n_orgs?.toLocaleString()} records
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={customWeights[index] || 0}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setCustomWeights(prev => ({ ...prev, [index]: value }));
                              }}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="0"
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-sm text-gray-600">
                    Total: {Object.values(customWeights).reduce((sum, weight) => sum + (weight || 0), 0).toFixed(1)}%
                  </div>
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
                    {blendingMethod === 'weighted' && 'Weighted by record count'}
                    {blendingMethod === 'simple' && 'Simple average (equal weights)'}
                    {blendingMethod === 'custom' && 'Custom weights applied'}
                    {' • '}{blendedMetrics.specialties.join(', ')} ({blendedMetrics.totalRecords.toLocaleString()} records)
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    ${blendedMetrics.tcc_p50.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">TCC P50</div>
                </div>
              </div>
            </div>
            <div className="px-6 py-6">
              {/* Google-style metrics table */}
              <div className="overflow-hidden">
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
