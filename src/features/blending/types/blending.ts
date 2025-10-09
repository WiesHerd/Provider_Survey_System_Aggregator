/**
 * Specialty Blending Types
 * 
 * This file defines the core types for the specialty blending feature,
 * including data structures for specialties, blends, and templates.
 */

export interface SpecialtyItem {
  id: string;
  name: string;
  records: number;
  weight: number; // Percentage weight (0-100)
  surveySource: string;
  surveyYear: string;
  geographicRegion: string;
  providerType: string;
}

export interface SpecialtyBlend {
  id: string;
  name: string;
  description: string;
  specialties: SpecialtyItem[];
  totalWeight: number; // Should equal 100
  createdAt: Date;
  createdBy: string;
}

export interface SpecialtyBlendTemplate {
  id: string;
  name: string;
  description: string;
  specialties: SpecialtyItem[];
  weights: number[];
  createdAt: Date;
  createdBy: string;
  isPublic: boolean;
  tags: string[];
}

export interface BlendedResult {
  id: string;
  blendName: string;
  specialties: SpecialtyItem[];
  blendedData: {
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
    n_orgs: number;
    n_incumbents: number;
  };
  confidence: number;
  sampleSize: number;
  createdAt: Date;
}

export interface BlendingConfig {
  method: 'weighted' | 'equal' | 'custom';
  specialties: SpecialtyItem[];
  totalWeight: number;
  allowPartialWeights: boolean;
  precision: number; // Decimal places (default: 2)
}

export interface BlendingValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalWeight: number;
  missingSpecialties: string[];
  duplicateSpecialties: string[];
}

export interface BlendingState {
  selectedSpecialties: SpecialtyItem[];
  availableSpecialties: SpecialtyItem[];
  allData: any[]; // Raw survey data for the browser
  currentBlend: SpecialtyBlend | null;
  templates: SpecialtyBlendTemplate[];
  isLoading: boolean;
  error: string | null;
  validation: BlendingValidation;
}

export interface BlendingActions {
  addSpecialty: (specialty: SpecialtyItem) => void;
  removeSpecialty: (specialtyId: string) => void;
  updateWeight: (specialtyId: string, weight: number) => void;
  reorderSpecialties: (fromIndex: number, toIndex: number) => void;
  createBlend: (name: string, description: string) => Promise<BlendedResult>;
  saveTemplate: (template: Omit<SpecialtyBlendTemplate, 'id' | 'createdAt'>) => Promise<void>;
  loadTemplate: (templateId: string) => void;
  validateBlend: () => BlendingValidation;
  resetBlend: () => void;
}

export interface BlendingProps {
  onBlendCreated?: (result: BlendedResult) => void;
  onTemplateSaved?: (template: SpecialtyBlendTemplate) => void;
  initialSpecialties?: SpecialtyItem[];
  maxSpecialties?: number;
  allowTemplates?: boolean;
}
