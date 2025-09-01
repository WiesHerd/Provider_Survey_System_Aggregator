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
  title?: string;
  description?: string;
  iconColor?: string;
  iconColorClass?: string;
  bgColorClass?: string;
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

/**
 * Variable mapping types - Enhanced for both compensation and categorical variables
 */
export interface IVariableMapping extends BaseEntity {
  standardizedName: string; // e.g., "tcc_variable", "West", "MD", "2023"
  variableType: 'compensation' | 'categorical'; // Enhanced type system
  variableSubType: string; // e.g., "tcc", "wrvu", "cf", "region", "providerType", "year", "practiceType"
  sourceVariables: IVariableSource[];
  confidence: number; // Auto-detection confidence (0-1)
  createdAt: Date;
  updatedAt: Date;
}

export interface IVariableSource {
  id: string;
  surveySource: SurveySource;
  originalVariableName: string; // e.g., "Total Cash Compensation", "West Region", "Physician"
  frequency: number; // how often this variable appears in the survey
  sampleData?: any[]; // Sample data for validation
}

export interface IUnmappedVariable extends BaseEntity {
  name: string;
  surveySource: SurveySource;
  frequency: number;
  variableType?: 'compensation' | 'categorical'; // Enhanced type detection
  variableSubType?: string; // e.g., "tcc", "region", "providerType"
  confidence?: number; // Auto-detection confidence
  suggestions?: string[]; // Suggested standardized names
}

export interface VariableMappingProps {
  onVariableMappingChange?: (mappings: IVariableMapping[]) => void;
  onUnmappedVariableChange?: (unmapped: IUnmappedVariable[]) => void;
}

export interface VariableMappingState {
  variableMappings: IVariableMapping[];
  unmappedVariables: IUnmappedVariable[];
  selectedVariables: IUnmappedVariable[];
  loading: boolean;
  error: string | null;
  activeTab: 'unmapped' | 'mapped';
}

export interface VariableCardProps {
  variable: IUnmappedVariable;
  isSelected: boolean;
  onSelect: (variable: IUnmappedVariable) => void;
}

export interface VariableMappingCardProps {
  mapping: IVariableMapping;
  onDelete: (mappingId: string) => void;
  onEdit: (mapping: IVariableMapping) => void;
}

/**
 * Region mapping types - Following the same pattern as specialty mapping
 */
export interface IRegionMapping extends BaseEntity {
  standardizedName: string; // e.g., "West", "East", "Midwest"
  sourceRegions: IRegionSource[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IRegionSource {
  region: string; // e.g., "West Region", "Western Territory"
  originalName?: string;
  surveySource: SurveySource;
  frequency?: number;
  mappingId?: string;
}

export interface IUnmappedRegion extends BaseEntity {
  name: string;
  surveySource: SurveySource;
  frequency: number;
}

export interface RegionMappingProps {
  onMappingChange?: (mappings: IRegionMapping[]) => void;
  onUnmappedChange?: (unmapped: IUnmappedRegion[]) => void;
}

export interface RegionMappingState {
  mappings: IRegionMapping[];
  unmappedRegions: IUnmappedRegion[];
  selectedRegions: IUnmappedRegion[];
  learnedMappings: Record<string, string>;
  loading: boolean;
  error: string | null;
  activeTab: 'unmapped' | 'mapped' | 'learned';
}

export interface RegionCardProps {
  region: IUnmappedRegion;
  isSelected: boolean;
  onSelect: (region: IUnmappedRegion) => void;
}

export interface RegionMappingCardProps {
  mapping: IRegionMapping;
  onDelete: (mappingId: string) => void;
  onEdit: (mapping: IRegionMapping) => void;
}

/**
 * Provider Type mapping types - Following the same pattern as specialty mapping
 */
export interface IProviderTypeMapping extends BaseEntity {
  standardizedName: string; // e.g., "MD", "NP", "PA"
  sourceProviderTypes: IProviderTypeSource[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IProviderTypeSource {
  providerType: string; // e.g., "Physician", "Nurse Practitioner"
  originalName?: string;
  surveySource: SurveySource;
  frequency?: number;
  mappingId?: string;
}

export interface IUnmappedProviderType extends BaseEntity {
  name: string;
  surveySource: SurveySource;
  frequency: number;
}

export interface ProviderTypeMappingProps {
  onMappingChange?: (mappings: IProviderTypeMapping[]) => void;
  onUnmappedChange?: (unmapped: IUnmappedProviderType[]) => void;
}

export interface ProviderTypeMappingState {
  mappings: IProviderTypeMapping[];
  unmappedProviderTypes: IUnmappedProviderType[];
  selectedProviderTypes: IUnmappedProviderType[];
  learnedMappings: Record<string, string>;
  loading: boolean;
  error: string | null;
  activeTab: 'unmapped' | 'mapped' | 'learned';
}

export interface ProviderTypeCardProps {
  providerType: IUnmappedProviderType;
  isSelected: boolean;
  onSelect: (providerType: IUnmappedProviderType) => void;
}

export interface ProviderTypeMappingCardProps {
  mapping: IProviderTypeMapping;
  onDelete: (mappingId: string) => void;
  onEdit: (mapping: IProviderTypeMapping) => void;
}
