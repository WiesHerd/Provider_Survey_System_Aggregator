// Main component
export { SpecialtyMapping } from './components/SpecialtyMapping';

// Sub-components
export { SpecialtyCard } from './components/SpecialtyCard';
export { MappingHelp } from './components/MappingHelp';
export { UnmappedSpecialties } from './components/UnmappedSpecialties';
export { MappedSpecialties } from './components/MappedSpecialties';
export { MappedSpecialtyItem } from './components/MappedSpecialtyItem';
export { LearnedMappings } from './components/LearnedMappings';
export { AutoMapping } from './components/AutoMapping';

// Hooks
export { useMappingData } from './hooks/useMappingData';

// Types
export type {
  ISourceSpecialty,
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
  MappingExportConfig
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
