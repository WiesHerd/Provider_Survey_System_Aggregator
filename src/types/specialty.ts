// DEPRECATED: These types are now unified in src/features/mapping/types/mapping.ts
// This file is kept for backward compatibility but should not be used for new code
// 
// TODO: Remove this file once all imports are updated to use the unified types

import { BaseEntity, SurveySource } from '../shared/types';

/**
 * @deprecated Use ISourceSpecialty from src/features/mapping/types/mapping.ts
 */
export interface ISourceSpecialty extends BaseEntity {
  specialty: string;
  originalName?: string;
  surveySource: SurveySource;
  frequency?: number;
  mappingId?: string;
}

/**
 * @deprecated Use ISpecialtyMapping from src/features/mapping/types/mapping.ts
 */
export interface ISpecialtyMapping extends BaseEntity {
  standardizedName: string;
  sourceSpecialties: ISourceSpecialty[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @deprecated Use IUnmappedSpecialty from src/features/mapping/types/mapping.ts
 */
export interface IUnmappedSpecialty extends BaseEntity {
  name: string;
  surveySource: SurveySource;
  frequency: number;
}

/**
 * @deprecated Use ISpecialtyGroup from src/features/mapping/types/mapping.ts
 */
export interface ISpecialtyGroup extends BaseEntity {
  standardizedName: string;
  selectedSpecialties: IUnmappedSpecialty[];
  createdAt: Date;
  updatedAt: Date;
}


/**
 * @deprecated Use ISurveyData from src/features/mapping/types/mapping.ts
 */
export interface ISurveyData extends BaseEntity {
  fileContent: string;
  surveyType: SurveySource;
  metadata: Record<string, any>;
} 