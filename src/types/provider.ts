/**
 * Provider Type Definitions
 * 
 * This file contains all type definitions for the dual-provider system
 * supporting both Physician and Advanced Practice Provider (APP) data.
 */

// Base provider types
export type ProviderType = 'PHYSICIAN' | 'APP' | 'CALL' | 'CUSTOM';

// UI provider selection types (for navigation and UI components)
export type UIProviderType = 'PHYSICIAN' | 'APP' | 'CALL' | 'BOTH';
export type PhysicianType = 'MD' | 'DO' | 'Resident' | 'Fellow';
export type APPType = 'NP' | 'PA' | 'CRNA' | 'CNS' | 'CNM' | 'Other APP';

// APP-specific enums
export type APPPracticeSetting = 'Hospital' | 'Clinic' | 'Private Practice' | 'Academic';
export type APPSupervisionLevel = 'Independent' | 'Supervised' | 'Collaborative';
export type APPBillingLevel = 'Incident-to' | 'Independent' | 'Split';

// Base survey row interface
export interface BaseSurveyRow {
  id: string;
  surveyId: string;
  region: string;
  n_orgs: number;
  n_incumbents: number;
  // Compensation fields (provider-agnostic)
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
}

// Physician-specific survey row
export interface PhysicianSurveyRow extends BaseSurveyRow {
  providerType: PhysicianType;
  specialty: string;
  subspecialty?: string;
  // Physician-specific fields
  boardCertification?: string;
  fellowship?: string;
  academicRank?: string;
  yearsInPractice?: number;
}

// APP-specific survey row
export interface APPSurveyRow extends BaseSurveyRow {
  providerType: APPType;
  specialty: string;
  certification: string;
  practiceSetting: APPPracticeSetting;
  supervisionLevel: APPSupervisionLevel;
  // APP-specific fields
  billingLevel?: APPBillingLevel;
  patientVolume?: number;
  proceduresPerformed?: string[];
  yearsInPractice?: number;
}

// Combined survey row for cross-provider analytics
export interface CombinedSurveyRow {
  id: string;
  surveyId: string;
  providerType: ProviderType;
  specialty: string;
  region: string;
  n_orgs: number;
  n_incumbents: number;
  // Compensation fields
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
  // Provider-specific fields
  physicianFields?: {
    providerType: PhysicianType;
    subspecialty?: string;
    boardCertification?: string;
    fellowship?: string;
    academicRank?: string;
    yearsInPractice?: number;
  };
  appFields?: {
    providerType: APPType;
    certification: string;
    practiceSetting: APPPracticeSetting;
    supervisionLevel: APPSupervisionLevel;
    billingLevel?: APPBillingLevel;
    patientVolume?: number;
    proceduresPerformed?: string[];
    yearsInPractice?: number;
  };
}

// Survey metadata
export interface SurveyMetadata {
  totalRows: number;
  specialties: string[];
  regions: string[];
  providerTypes: string[];
  compensationMetrics: string[];
  dataQuality: DataQualityMetrics;
}

export interface DataQualityMetrics {
  completeness: number; // Percentage of complete records
  accuracy: number; // Percentage of accurate records
  consistency: number; // Percentage of consistent records
  lastValidated: Date;
}

// Enhanced survey interface with provider type
// Extends the existing Survey interface from IndexedDBService
export interface Survey {
  id: string;
  name: string;
  year: string;
  type: string;
  uploadDate: Date;
  rowCount: number;
  specialtyCount: number;
  dataPoints: number;
  colorAccent: string;
  metadata: any;
  // New provider-specific fields
  providerType?: ProviderType | string;
  source?: string;
  createdAt?: Date;
  updatedAt?: Date;
  data?: PhysicianSurveyRow[] | APPSurveyRow[];
}

// Provider-specific mapping interfaces
// Extends the existing ISpecialtyMapping interface
export interface BaseSpecialtyMapping {
  id: string;
  standardizedName: string;
  sourceSpecialties: any[]; // Compatible with ISourceSpecialty[]
  createdAt: Date;
  updatedAt: Date;
  // New provider-specific field
  providerType?: ProviderType;
}

export interface PhysicianSpecialtyMapping extends BaseSpecialtyMapping {
  providerType: 'PHYSICIAN';
  sourceSpecialties: PhysicianSourceSpecialty[];
}

export interface APPSpecialtyMapping extends BaseSpecialtyMapping {
  providerType: 'APP';
  sourceSpecialties: APPSourceSpecialty[];
  certification: string;
  practiceSetting: string;
}

export interface PhysicianSourceSpecialty {
  id: string;
  specialty: string;
  originalName: string;
  surveySource: string;
  mappingId: string;
}

export interface APPSourceSpecialty {
  id: string;
  specialty: string;
  originalName: string;
  surveySource: string;
  certification: string;
  practiceSetting: string;
  mappingId: string;
}

// Provider detection interfaces
export interface ProviderDetectionResult {
  providerType: ProviderType | 'UNKNOWN';
  confidence: number; // 0-1 confidence score
  detectionMethod: 'COLUMN_NAMES' | 'DATA_PATTERNS' | 'SPECIALTY_NAMES' | 'PROVIDER_VALUES';
  evidence: string[];
  warnings: string[];
}

export interface ProviderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Raw survey data for detection
export interface RawSurveyData {
  columns: string[];
  rows: Record<string, any>[];
  surveyId: string;
  surveyName: string;
  surveySource: string;
}

// Provider-specific filter interfaces
export interface BaseFMVFilters {
  fte: number;
  aggregationMethod: 'simple' | 'weighted' | 'pure';
}

export interface PhysicianFMVFilters extends BaseFMVFilters {
  specialty: string;
  providerType: PhysicianType;
  region: string;
  year: string;
  surveySource: string;
  // Physician-specific filters
  boardCertification?: string;
  fellowship?: string;
  practiceSetting?: string;
  academicRank?: string;
  yearsInPractice?: {
    min: number;
    max: number;
  };
}

export interface APPFMVFilters extends BaseFMVFilters {
  specialty: string;
  providerType: APPType;
  region: string;
  year: string;
  surveySource: string;
  // APP-specific filters
  certification: string;
  practiceSetting: APPPracticeSetting;
  supervisionLevel: APPSupervisionLevel;
  billingLevel?: APPBillingLevel;
  yearsInPractice?: {
    min: number;
    max: number;
  };
}

// Navigation and UI interfaces
export interface ProviderTypeSelectorProps {
  value: UIProviderType;
  onChange: (type: UIProviderType) => void;
  showBothOption: boolean;
  context: 'navigation' | 'analytics' | 'fmv';
  className?: string;
}

export interface NavigationState {
  currentProviderType: UIProviderType;
  lastAccessedProvider: 'PHYSICIAN' | 'APP';
  providerSpecificRoutes: {
    PHYSICIAN: string[];
    APP: string[];
    BOTH: string[];
  };
  breadcrumbs: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  label: string;
  path: string;
  providerType: UIProviderType;
}

// Menu visibility logic
export interface MenuVisibility {
  showPhysicianMapping: boolean;
  showAPPMapping: boolean;
  showCrossProvider: boolean;
}

// Provider-specific data services
export interface ProviderDataService {
  getSurveys(providerType: ProviderType): Promise<Survey[]>;
  getSurveyData(surveyId: string, filters: any): Promise<BaseSurveyRow[]>;
  createSpecialtyMapping(mapping: BaseSpecialtyMapping): Promise<void>;
  getSpecialtyMappings(providerType: ProviderType): Promise<BaseSpecialtyMapping[]>;
  deleteSpecialtyMapping(mappingId: string): Promise<void>;
  updateSpecialtyMapping(mapping: BaseSpecialtyMapping): Promise<void>;
}

// Export utility types
export type AnySurveyRow = PhysicianSurveyRow | APPSurveyRow | CombinedSurveyRow;
export type AnySpecialtyMapping = PhysicianSpecialtyMapping | APPSpecialtyMapping;
export type AnyFMVFilters = PhysicianFMVFilters | APPFMVFilters;
