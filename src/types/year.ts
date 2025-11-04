/**
 * Year configuration and metadata
 */
export interface IYearConfig {
  id: string;
  year: string;
  isActive: boolean;
  isDefault: boolean;
  description?: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Year-based data wrapper
 */
export interface IYearData<T> {
  year: string;
  data: T[];
  metadata: {
    totalRecords: number;
    lastUpdated: Date;
    source: string;
  };
}

/**
 * Year filter options
 */
export interface IYearFilter {
  selectedYear?: string;
  compareYear?: string;
  includeAllYears: boolean;
  yearRange?: {
    start: string;
    end: string;
  };
}

/**
 * Year comparison data
 */
export interface IYearComparison<T> {
  currentYear: string;
  compareYear: string;
  currentData: T[];
  compareData: T[];
  changes: {
    added: T[];
    removed: T[];
    modified: T[];
  };
}

/**
 * Year management actions
 */
export type YearAction = 
  | 'create'
  | 'activate'
  | 'deactivate'
  | 'archive'
  | 'migrate'
  | 'validate';

/**
 * Year validation result
 */
export interface IYearValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  dataIntegrity: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
  };
}
