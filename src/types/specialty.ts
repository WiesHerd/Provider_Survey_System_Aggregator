export interface ISourceSpecialty {
  id: string;
  originalName: string;
  surveySource: string;
  mappingId: string;
}

export interface ISpecialtyMapping {
  id: string;
  standardizedName: string;
  sourceSpecialties: ISourceSpecialty[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IUnmappedSpecialty {
  id: string;
  name: string;
  surveySource: string;
  frequency: number;
}

export interface ISpecialtyGroup {
  id: string;
  standardizedName: string;
  selectedSpecialties: IUnmappedSpecialty[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAutoMappingConfig {
  similarityThreshold: number;
  caseSensitive: boolean;
  enableFuzzyMatching: boolean;
}

export interface ISurveyData {
  id: string;
  fileContent: string;
  surveyType: string;
  metadata: Record<string, any>;
} 