import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  IVariableMapping, 
  IUnmappedVariable, 
  VariableMappingState 
} from '../types/mapping';
import { DataService } from '../../../services/DataService';
import { useProviderContext } from '../../../contexts/ProviderContext';

/**
 * Custom hook for managing variable mapping data
 */
export const useVariableMappingData = () => {
  // Provider context
  const { selectedProviderType } = useProviderContext();
  
  // State
  const [variableMappings, setVariableMappings] = useState<IVariableMapping[]>([]);
  const [unmappedVariables, setUnmappedVariables] = useState<IUnmappedVariable[]>([]);
  const [selectedVariables, setSelectedVariables] = useState<IUnmappedVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped' | 'learned'>('unmapped');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');

  // Data service
  const dataService = useMemo(() => new DataService(), []);

  // Computed values
  const filteredUnmapped = useMemo(() => {
    if (!searchTerm) return unmappedVariables;
    return unmappedVariables.filter(variable =>
      variable.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.surveySource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (variable.variableType && variable.variableType.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [unmappedVariables, searchTerm]);

  const filteredMappings = useMemo(() => {
    if (!mappedSearchTerm) return variableMappings;
    return variableMappings.filter(mapping =>
      mapping.standardizedName.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
      mapping.variableType.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
      mapping.sourceVariables.some(source =>
        source.originalVariableName.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
        source.surveySource.toLowerCase().includes(mappedSearchTerm.toLowerCase())
      )
    );
  }, [variableMappings, mappedSearchTerm]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Convert UI provider type to data service provider type
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      
      console.log('🔍 useVariableMappingData: Loading data with provider type:', { 
        selectedProviderType, 
        dataProviderType 
      });
      
      const [mappingsData, unmappedData] = await Promise.all([
        dataService.getVariableMappings(dataProviderType),
        dataService.getUnmappedVariables(dataProviderType)
      ]);
      
      console.log('Loaded data:', { 
        mappings: mappingsData?.length || 0, 
        unmapped: unmappedData?.length || 0
      });
      
      setVariableMappings(mappingsData || []);
      setUnmappedVariables(unmappedData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load variable mapping data');
    } finally {
      setLoading(false);
    }
  }, [dataService, selectedProviderType]);

  // Detect unmapped variables from survey data
  const detectUnmappedVariables = useCallback(async (): Promise<IUnmappedVariable[]> => {
    try {
      console.log('🔍 Starting detectUnmappedVariables...');
      const surveys = await dataService.getAllSurveys();
      console.log('📊 Found surveys:', surveys.length, surveys);
      
      if (!surveys || surveys.length === 0) {
        console.log('⚠️ No surveys found');
        return [];
      }
      
      const unmappedVariables: IUnmappedVariable[] = [];
      const variableMap = new Map<string, IUnmappedVariable>();

      for (const survey of surveys) {
        console.log('🔍 Processing survey:', survey);
        const surveyDataResult = await dataService.getSurveyData(survey.id);
        console.log('📊 Survey data result:', surveyDataResult);
        
        if (!surveyDataResult || !surveyDataResult.rows || !Array.isArray(surveyDataResult.rows)) {
          console.log('⚠️ No survey data found for survey:', survey.id);
          continue;
        }

        const surveyData = surveyDataResult.rows;
        console.log('📊 Survey data rows:', surveyData.length, 'rows');

        // Look for variable column in the data
        const firstRow = surveyData[0];
        console.log('🔍 First row keys:', Object.keys(firstRow));
        
        if (firstRow && firstRow.variable) {
          console.log('📊 Found variable column, processing pivot-style data...');
          // This is pivot-style data with a variable column
          const variableCounts = new Map<string, number>();
          
          surveyData.forEach(row => {
            if (row.variable) {
              const variableName = String(row.variable).trim();
              if (variableName) {
                variableCounts.set(variableName, (variableCounts.get(variableName) || 0) + 1);
              }
            }
          });

          console.log('📊 Variable counts:', Array.from(variableCounts.entries()));

          // Create unmapped variables for each unique variable
          variableCounts.forEach((frequency, variableName) => {
            const surveySource = (survey as any).type || (survey as any).surveySource || 'unknown';
            const key = `${surveySource}-${variableName}`;
            if (!variableMap.has(key)) {
              const variableType = detectVariableType(variableName);
              const unmappedVariable: IUnmappedVariable = {
                id: key,
                name: variableName,
                surveySource: surveySource,
                frequency,
                variableType: variableType.type,
                variableSubType: variableType.subType,
                confidence: variableType.confidence,
                suggestions: variableType.suggestions
              };
              variableMap.set(key, unmappedVariable);
              console.log('✅ Created unmapped variable:', unmappedVariable);
            }
          });
        } else {
          console.log('📊 No variable column found, looking for compensation columns...');
          // Traditional column-based data - look for compensation columns
          const columns = Object.keys(firstRow);
          const compensationColumns = columns.filter(col => 
            col.toLowerCase().includes('compensation') ||
            col.toLowerCase().includes('salary') ||
            col.toLowerCase().includes('rvu') ||
            col.toLowerCase().includes('conversion') ||
            col.toLowerCase().includes('factor') ||
            col.toLowerCase().includes('bonus') ||
            col.toLowerCase().includes('incentive')
          );

          console.log('📊 Compensation columns found:', compensationColumns);

          compensationColumns.forEach(columnName => {
            const surveySource = (survey as any).type || (survey as any).surveySource || 'unknown';
            const key = `${surveySource}-${columnName}`;
            if (!variableMap.has(key)) {
              const variableType = detectVariableType(columnName);
              const unmappedVariable: IUnmappedVariable = {
                id: key,
                name: columnName,
                surveySource: surveySource,
                frequency: surveyData.length, // All rows have this column
                variableType: variableType.type,
                variableSubType: variableType.subType,
                confidence: variableType.confidence,
                suggestions: variableType.suggestions
              };
              variableMap.set(key, unmappedVariable);
              console.log('✅ Created unmapped variable:', unmappedVariable);
            }
          });
        }
      }

      const result = Array.from(variableMap.values());
      console.log('🎯 Final unmapped variables:', result);
      return result;
    } catch (error) {
      console.error('❌ Error detecting unmapped variables:', error);
      // Don't throw error, just return empty array to prevent breaking the UI
      return [];
    }
  }, [dataService]);

  // Enhanced variable type detection for both compensation and categorical variables
  const detectVariableType = useCallback((variableName: string): { 
    type: 'compensation' | 'categorical'; 
    subType: string; 
    standardizedName: string;
    confidence: number;
    suggestions: string[];
  } => {
    const name = variableName.toLowerCase();
    
    // Compensation variable patterns
    const compensationPatterns = {
      tcc: ['compensation', 'salary', 'total cash', 'tcc', 'total compensation'],
      wrvu: ['rvu', 'relative value', 'work rvu', 'wrvu', 'work relative value'],
      cf: ['conversion', 'cf', 'factor', 'conversion factor'],
      bonus: ['bonus', 'incentive', 'performance', 'productivity'],
      quality: ['quality', 'metrics', 'score', 'outcome'],
      stipend: ['stipend', 'allowance', 'supplement'],
      retention: ['retention', 'loyalty', 'longevity'],
      call: ['call', 'coverage', 'duty'],
      admin: ['admin', 'administrative', 'leadership'],
      research: ['research', 'academic', 'teaching']
    };
    
    // Categorical variable patterns
    const categoricalPatterns = {
      region: ['west', 'east', 'north', 'south', 'midwest', 'southwest', 'northeast', 'region', 'territory', 'area'],
      providerType: ['physician', 'md', 'do', 'np', 'pa', 'provider', 'doctor', 'nurse', 'practitioner'],
      year: ['2023', '2024', '2025', 'year', 'fiscal'],
      practiceType: ['academic', 'private', 'hospital', 'clinic', 'group', 'solo', 'multispecialty'],
      specialty: ['cardiology', 'orthopedics', 'neurology', 'specialty', 'department'],
      setting: ['urban', 'rural', 'suburban', 'setting', 'location']
    };
    
    // Check compensation patterns first
    for (const [subType, keywords] of Object.entries(compensationPatterns)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return { 
          type: 'compensation',
          subType, 
          standardizedName: `${subType}_variable`,
          confidence: 0.9,
          suggestions: [`${subType}_variable`, `${subType}_compensation`]
        };
      }
    }
    
    // Check categorical patterns
    for (const [subType, keywords] of Object.entries(categoricalPatterns)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        let standardizedName = variableName;
        let suggestions = [variableName];
        
        // Generate suggestions based on subType
        if (subType === 'region') {
          if (name.includes('west')) {
            standardizedName = 'West';
            suggestions = ['West', 'Western Region', 'Western Territory'];
          } else if (name.includes('east')) {
            standardizedName = 'East';
            suggestions = ['East', 'Eastern Region', 'Eastern Territory'];
          } else if (name.includes('south')) {
            standardizedName = 'South';
            suggestions = ['South', 'Southern Region', 'Southern Territory'];
          } else if (name.includes('north')) {
            standardizedName = 'North';
            suggestions = ['North', 'Northern Region', 'Northern Territory'];
          }
        } else if (subType === 'providerType') {
          if (name.includes('physician') || name.includes('md')) {
            standardizedName = 'MD';
            suggestions = ['MD', 'Physician', 'Doctor'];
          } else if (name.includes('np') || name.includes('nurse')) {
            standardizedName = 'NP';
            suggestions = ['NP', 'Nurse Practitioner'];
          } else if (name.includes('pa')) {
            standardizedName = 'PA';
            suggestions = ['PA', 'Physician Assistant'];
          }
        } else if (subType === 'year') {
          // Extract year if it's a 4-digit number
          const yearMatch = variableName.match(/\d{4}/);
          if (yearMatch) {
            standardizedName = yearMatch[0];
            suggestions = [yearMatch[0]];
          }
        }
        
        return { 
          type: 'categorical',
          subType, 
          standardizedName,
          confidence: 0.85,
          suggestions
        };
      }
    }
    
    // If no pattern matches, create a generic mapping
    return { 
      type: 'categorical',
      subType: 'custom', 
      standardizedName: variableName,
      confidence: 0.5,
      suggestions: [variableName, `custom_${name.replace(/[^a-z0-9]/g, '_')}`]
    };
  }, []);

  // Auto-detect variables
  const autoDetectVariables = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const unmapped = await detectUnmappedVariables();
      
      // Group variables by detected type and subType
      const variableGroups = new Map<string, IUnmappedVariable[]>();
      
      unmapped.forEach(variable => {
        const type = variable.variableType || 'categorical';
        const subType = variable.variableSubType || 'custom';
        const groupKey = `${type}_${subType}`;
        
        if (!variableGroups.has(groupKey)) {
          variableGroups.set(groupKey, []);
        }
        variableGroups.get(groupKey)!.push(variable);
      });

      // Create mappings for each group
      const newMappings: IVariableMapping[] = [];
      
      for (const [groupKey, variables] of variableGroups.entries()) {
        if (variables.length > 0) {
          const [type, subType] = groupKey.split('_');
          const firstVariable = variables[0];
          
          const mapping: IVariableMapping = {
            id: `auto_${groupKey}_${Date.now()}`,
            standardizedName: firstVariable.suggestions?.[0] || `${subType}_variable`,
            variableType: type as 'compensation' | 'categorical',
            variableSubType: subType,
            confidence: firstVariable.confidence || 0.5,
            sourceVariables: variables.map(variable => ({
              id: crypto.randomUUID(),
              surveySource: variable.surveySource,
              originalVariableName: variable.name,
              frequency: variable.frequency
            })),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          newMappings.push(mapping);
        }
      }

      // Save new mappings
      for (const mapping of newMappings) {
        await dataService.createVariableMapping(mapping);
      }

      // Reload data
      await loadData();
      
    } catch (err) {
      console.error('Auto-detection failed:', err);
      setError('Auto-detection failed');
    } finally {
      setLoading(false);
    }
  }, [detectUnmappedVariables, dataService, loadData]);

  // Create variable mapping
  const createVariableMapping = useCallback(async (mapping: Partial<IVariableMapping>) => {
    try {
      const newMapping: IVariableMapping = {
        id: `var_${Date.now()}`,
        standardizedName: mapping.standardizedName!,
        variableType: mapping.variableType!,
        variableSubType: mapping.variableSubType!,
        confidence: mapping.confidence || 0.5,
        sourceVariables: mapping.sourceVariables!,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await dataService.createVariableMapping(newMapping);
      setVariableMappings(prev => [...prev, newMapping]);
      
      // Remove mapped variables from unmapped list
      setUnmappedVariables(prev => 
        prev.filter(variable => 
          !mapping.sourceVariables!.some(source => 
            source.surveySource === variable.surveySource && 
            source.originalVariableName === variable.name
          )
        )
      );
      
    } catch (err) {
      console.error('Failed to create variable mapping:', err);
      setError('Failed to create variable mapping');
    }
  }, [dataService]);

  // Create grouped variable mapping
  const createGroupedVariableMapping = useCallback(async (standardizedName: string, variableType: 'compensation' | 'categorical', variableSubType: string, variables: IUnmappedVariable[]) => {
    try {
      const mapping: IVariableMapping = {
        id: `group_${Date.now()}`,
        standardizedName,
        variableType,
        variableSubType,
        confidence: variables[0]?.confidence || 0.5,
        sourceVariables: variables.map(variable => ({
          id: crypto.randomUUID(),
          surveySource: variable.surveySource,
          originalVariableName: variable.name,
          frequency: variable.frequency
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await dataService.createVariableMapping(mapping);
      setVariableMappings(prev => [...prev, mapping]);
      
      // Remove mapped variables from unmapped list
      setUnmappedVariables(prev => 
        prev.filter(variable => 
          !variables.some(v => v.id === variable.id)
        )
      );
      
    } catch (err) {
      console.error('Failed to create grouped variable mapping:', err);
      setError('Failed to create grouped variable mapping');
    }
  }, [dataService]);

  // Delete variable mapping
  const deleteVariableMapping = useCallback(async (mappingId: string) => {
    try {
      await dataService.deleteVariableMapping(mappingId);
      setVariableMappings(prev => prev.filter(mapping => mapping.id !== mappingId));
      
      // Reload unmapped variables to include any that were in this mapping - WITH provider type filtering
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      const unmapped = await dataService.getUnmappedVariables(dataProviderType);
      setUnmappedVariables(unmapped);
      
    } catch (err) {
      console.error('Failed to delete variable mapping:', err);
      setError('Failed to delete variable mapping');
    }
  }, [dataService, selectedProviderType]);

  // Clear all variable mappings
  const clearAllVariableMappings = useCallback(async () => {
    try {
      await dataService.clearAllVariableMappings();
      setVariableMappings([]);
      
      // Reload unmapped variables - WITH provider type filtering
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      const unmapped = await dataService.getUnmappedVariables(dataProviderType);
      setUnmappedVariables(unmapped);
      
    } catch (err) {
      console.error('Failed to clear variable mappings:', err);
      setError('Failed to clear variable mappings');
    }
  }, [dataService, selectedProviderType]);

  // Variable selection
  const selectVariable = useCallback((variable: IUnmappedVariable) => {
    setSelectedVariables(prev => {
      const isSelected = prev.some(v => v.id === variable.id);
      if (isSelected) {
        return prev.filter(v => v.id !== variable.id);
      } else {
        return [...prev, variable];
      }
    });
  }, []);

  const clearSelectedVariables = useCallback(() => {
    setSelectedVariables([]);
  }, []);

  const selectAllVariables = useCallback(() => {
    setSelectedVariables([...filteredUnmapped]);
  }, [filteredUnmapped]);

  const deselectAllVariables = useCallback(() => {
    setSelectedVariables([]);
  }, []);

  // Error handling
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // State
    variableMappings,
    unmappedVariables,
    selectedVariables,
    loading,
    error,
    activeTab,
    
    // Search state
    searchTerm,
    mappedSearchTerm,
    
    // Computed values
    filteredUnmapped,
    filteredMappings,
    
    // Actions
    setActiveTab,
    selectVariable,
    clearSelectedVariables,
    selectAllVariables,
    deselectAllVariables,
    
    // Data operations
    loadData,
    createVariableMapping,
    createGroupedVariableMapping,
    deleteVariableMapping,
    clearAllVariableMappings,
    
    // Auto-detection
    autoDetectVariables,
    
    // Search and filters
    setSearchTerm,
    setMappedSearchTerm,
    clearError
  };
};
