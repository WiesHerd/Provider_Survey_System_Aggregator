// Export all mapping components
export { SpecialtyMapping } from './components/SpecialtyMapping';
export { VariableMapping } from './components/VariableMapping';
export { RegionMapping } from './components/RegionMapping';
export { ProviderTypeMapping } from './components/ProviderTypeMapping';

// Reusable container component
export { MappingScreen } from './components/MappingScreen';
export { UnmappedSpecialties } from './components/UnmappedSpecialties';
export { MappedSpecialties } from './components/MappedSpecialties';
export { LearnedMappings } from './components/LearnedMappings';
export { AutoMapping } from './components/AutoMapping';
export { UnmappedVariables } from './components/UnmappedVariables';
export { MappedVariables } from './components/MappedVariables';
export { VariableCard } from './components/VariableCard';
export { VariableMappingCard } from './components/VariableMappingCard';
export { VariableMappingDialog } from './components/VariableMappingDialog';

// Export all mapping hooks
export { useMappingData } from './hooks/useMappingData';
export { useVariableMappingData } from './hooks/useVariableMappingData';

// Export all mapping types
export type {
  ISpecialtyMapping,
  IUnmappedSpecialty,
  ISpecialtyGroup,
  IAutoMappingConfig,
  IMappingSuggestion,
  ISurveyData,
  MappingFilters,
  MappingState,
  AutoMappingResults,
  SpecialtyMappingProps,
  MappingInterfaceProps,
  UnmappedSpecialtiesProps,
  MappedSpecialtiesProps,
  LearnedMappingsProps,
  AutoMappingProps,
  SpecialtyCardProps,
  MappingHelpProps,
  MappingApiResponse,
  AutoMappingApiResponse,
  MappingValidationResult,
  MappingExportConfig,
  IVariableMapping,
  IVariableSource,
  IUnmappedVariable,
  VariableMappingProps,
  VariableMappingState,
  VariableCardProps,
  VariableMappingCardProps
} from './types/mapping';

// Utilities
export {
  SURVEY_SOURCE_COLORS,
  filterUnmappedSpecialties,
  groupSpecialtiesBySurvey,
  filterMappedSpecialties,
  filterLearnedMappings,
  generateMappingSuggestions,
  calculateAutoMappingResults,
  validateMappingConfig,
  formatMappingDate,
  getSurveySourceColor,
  calculateMappingStats
} from './utils/mappingCalculations';
