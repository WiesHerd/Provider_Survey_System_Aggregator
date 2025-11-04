import { ISurveyMapping } from '../types/survey';

export const SURVEY_PROVIDERS = {
  SULLIVAN_COTTER: 'SullivanCotter',
  MGMA: 'MGMA',
  GALLAGHER: 'Gallagher',
  ECG: 'ECG',
  AMGA: 'AMGA'
} as const;

export const STANDARD_COLUMN_NAMES = {
  SPECIALTY: 'SPECIALTY',
  PROVIDER_TYPE: 'PROVIDER_TYPE',
  GEOGRAPHIC_REGION: 'GEOGRAPHIC_REGION',
  TCC_P25: 'TCC_P25',
  TCC_P50: 'TCC_P50',
  TCC_P75: 'TCC_P75',
  TCC_P90: 'TCC_P90',
  WRVU_P25: 'WRVU_P25',
  WRVU_P50: 'WRVU_P50',
  WRVU_P75: 'WRVU_P75',
  WRVU_P90: 'WRVU_P90',
} as const;

// Column mapping for different survey providers
export const COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
  'SullivanCotter': {
    [STANDARD_COLUMN_NAMES.SPECIALTY]: 'specialty',
    [STANDARD_COLUMN_NAMES.PROVIDER_TYPE]: 'provider_type',
    [STANDARD_COLUMN_NAMES.GEOGRAPHIC_REGION]: 'geographic_region',
    [STANDARD_COLUMN_NAMES.TCC_P25]: 'tcc_p25',
    [STANDARD_COLUMN_NAMES.TCC_P50]: 'tcc_p50',
    [STANDARD_COLUMN_NAMES.TCC_P75]: 'tcc_p75',
    [STANDARD_COLUMN_NAMES.TCC_P90]: 'tcc_p90',
    [STANDARD_COLUMN_NAMES.WRVU_P25]: 'wrvu_p25',
    [STANDARD_COLUMN_NAMES.WRVU_P50]: 'wrvu_p50',
    [STANDARD_COLUMN_NAMES.WRVU_P75]: 'wrvu_p75',
    [STANDARD_COLUMN_NAMES.WRVU_P90]: 'wrvu_p90',
  },
  'MGMA': {
    [STANDARD_COLUMN_NAMES.SPECIALTY]: 'Specialty',
    [STANDARD_COLUMN_NAMES.PROVIDER_TYPE]: 'Provider Type',
    [STANDARD_COLUMN_NAMES.GEOGRAPHIC_REGION]: 'Geographic Region',
    [STANDARD_COLUMN_NAMES.TCC_P25]: 'Total Comp 25th',
    [STANDARD_COLUMN_NAMES.TCC_P50]: 'Total Comp Median',
    [STANDARD_COLUMN_NAMES.TCC_P75]: 'Total Comp 75th',
    [STANDARD_COLUMN_NAMES.TCC_P90]: 'Total Comp 90th',
  },
  'Gallagher': {
    [STANDARD_COLUMN_NAMES.SPECIALTY]: 'Specialty',
    [STANDARD_COLUMN_NAMES.PROVIDER_TYPE]: 'Provider Type',
    [STANDARD_COLUMN_NAMES.GEOGRAPHIC_REGION]: 'Region',
    [STANDARD_COLUMN_NAMES.TCC_P25]: 'TCC 25th',
    [STANDARD_COLUMN_NAMES.TCC_P50]: 'TCC Median',
    [STANDARD_COLUMN_NAMES.TCC_P75]: 'TCC 75th',
    [STANDARD_COLUMN_NAMES.TCC_P90]: 'TCC 90th',
  },
  'ECG': {
    [STANDARD_COLUMN_NAMES.SPECIALTY]: 'Specialty',
    [STANDARD_COLUMN_NAMES.PROVIDER_TYPE]: 'Provider Type',
    [STANDARD_COLUMN_NAMES.GEOGRAPHIC_REGION]: 'Region',
    [STANDARD_COLUMN_NAMES.TCC_P25]: 'Total Cash 25th',
    [STANDARD_COLUMN_NAMES.TCC_P50]: 'Total Cash Median',
    [STANDARD_COLUMN_NAMES.TCC_P75]: 'Total Cash 75th',
    [STANDARD_COLUMN_NAMES.TCC_P90]: 'Total Cash 90th',
  },
  'AMGA': {
    [STANDARD_COLUMN_NAMES.SPECIALTY]: 'Specialty',
    [STANDARD_COLUMN_NAMES.PROVIDER_TYPE]: 'Provider Type',
    [STANDARD_COLUMN_NAMES.GEOGRAPHIC_REGION]: 'Region',
    [STANDARD_COLUMN_NAMES.TCC_P25]: 'Total Comp 25th',
    [STANDARD_COLUMN_NAMES.TCC_P50]: 'Total Comp 50th',
    [STANDARD_COLUMN_NAMES.TCC_P75]: 'Total Comp 75th',
    [STANDARD_COLUMN_NAMES.TCC_P90]: 'Total Comp 90th',
  }
};

// Specialty name normalization mappings
export const SPECIALTY_MAPPINGS: Record<string, string[]> = {
  'Cardiology': [
    'Cardiology',
    'Cardiology General',
    'General Cardiology',
    'Cardiovascular Disease',
  ],
  'Pediatrics': [
    'Pediatrics',
    'Pediatrics General',
    'General Pediatrics',
    'Pediatric Medicine',
  ],
  'Internal Medicine': [
    'Internal Medicine',
    'General Internal Medicine',
    'Adult Medicine',
  ],
  'Family Medicine': [
    'Family Medicine',
    'Family Practice',
    'General Family Medicine',
  ],
  'Emergency Medicine': [
    'Emergency Medicine',
    'ER',
    'Emergency Room',
  ],
  // Add more specialty mappings as needed
}; 