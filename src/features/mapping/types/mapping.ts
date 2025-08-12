import { BaseEntity, SurveySource } from '../../../shared/types';

/**
 * Source specialty from a survey
 */
export interface ISourceSpecialty extends BaseEntity {
  specialty: string;
  originalName?: string;
  surveySource: SurveySource;
  frequency?: number;
  mappingId?: string;
}

/**
 * Specialty mapping configuration
 */
export interface ISpecialtyMapping extends BaseEntity {
  standardizedName: string;
  sourceSpecialties: ISourceSpecialty[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Unmapped specialty from surveys
 */
export interface IUnmappedSpecialty extends BaseEntity {
  name: string;
  surveySource: SurveySource;
  frequency: number;
}

/**
 * Specialty group for bulk operations
 */
export interface ISpecialtyGroup extends BaseEntity {
  standardizedName: string;
  selectedSpecialties: IUnmappedSpecialty[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Auto-mapping configuration
 */
export interface IAutoMappingConfig {
  confidenceThreshold: number;
  useExistingMappings: boolean;
  useFuzzyMatching: boolean;
}

/**
 * Mapping suggestion from auto-mapping
 */
export interface IMappingSuggestion {
  standardizedName: string;
  confidence: number;
  specialties: Array<{
    name: string;
    surveySource: SurveySource;
  }>;
}

/**
 * Survey data for mapping
 */
export interface ISurveyData extends BaseEntity {
  fileContent: string;
  surveyType: SurveySource;
  metadata: Record<string, any>;
}

/**
 * Mapping filters
 */
export interface MappingFilters {
  searchTerm?: string;
  surveySource?: SurveySource;
  frequency?: number;
}

/**
 * Mapping state
 */
export interface MappingState {
  mappings: ISpecialtyMapping[];
  unmappedSpecialties: IUnmappedSpecialty[];
  selectedSpecialties: IUnmappedSpecialty[];
  learnedMappings: Record<string, string>;
  loading: boolean;
  error: string | null;
  activeTab: 'unmapped' | 'mapped' | 'learned';
}

/**
 * Auto-mapping results
 */
export interface AutoMappingResults {
  total: number;
  mapped: number;
  skipped: number;
  suggestions: IMappingSuggestion[];
}

/**
 * Component props
 */
export interface SpecialtyMappingProps {
  onMappingChange?: (mappings: ISpecialtyMapping[]) => void;
  onUnmappedChange?: (unmapped: IUnmappedSpecialty[]) => void;
}

export interface MappingInterfaceProps {
  mappings: ISpecialtyMapping[];
  unmappedSpecialties: IUnmappedSpecialty[];
  selectedSpecialties: IUnmappedSpecialty[];
  activeTab: 'unmapped' | 'mapped' | 'learned';
  onTabChange: (tab: 'unmapped' | 'mapped' | 'learned') => void;
  onSpecialtySelect: (specialty: IUnmappedSpecialty) => void;
  onCreateMapping: () => void;
  onDeleteMapping: (mappingId: string) => void;
  onClearAllMappings: () => void;
  onAutoMap: () => void;
}

export interface UnmappedSpecialtiesProps {
  unmappedSpecialties: IUnmappedSpecialty[];
  selectedSpecialties: IUnmappedSpecialty[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSpecialtySelect: (specialty: IUnmappedSpecialty) => void;
  onRefresh: () => void;
}

export interface MappedSpecialtiesProps {
  mappings: ISpecialtyMapping[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onDeleteMapping: (mappingId: string) => void;
  onEditMapping?: (mapping: ISpecialtyMapping) => void;
}

export interface LearnedMappingsProps {
  learnedMappings: Record<string, string>;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onRemoveMapping: (original: string) => void;
}

export interface AutoMappingProps {
  isOpen: boolean;
  onClose: () => void;
  onAutoMap: (config: IAutoMappingConfig) => Promise<void>;
  loading?: boolean;
}

export interface SpecialtyCardProps {
  specialty: IUnmappedSpecialty;
  isSelected: boolean;
  onSelect: (specialty: IUnmappedSpecialty) => void;
}

export interface MappingHelpProps {
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * API responses
 */
export interface MappingApiResponse {
  mappings: ISpecialtyMapping[];
  unmapped: IUnmappedSpecialty[];
  learned: Record<string, string>;
}

export interface AutoMappingApiResponse {
  suggestions: IMappingSuggestion[];
  results: AutoMappingResults;
}

/**
 * Validation results
 */
export interface MappingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Export configuration
 */
export interface MappingExportConfig {
  format: 'json' | 'csv';
  includeUnmapped: boolean;
  includeLearned: boolean;
  filters?: MappingFilters;
}
