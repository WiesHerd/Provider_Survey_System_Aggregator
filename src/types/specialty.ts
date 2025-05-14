export interface ISourceSpecialty {
  id?: string;
  specialty: string;
  originalName?: string;
  surveySource: string;
  frequency?: number;
  mappingId?: string;
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
  confidenceThreshold: number;
  useExistingMappings: boolean;
  useFuzzyMatching: boolean;
}

export interface IMappingSuggestion {
  standardizedName: string;
  confidence: number;
  specialties: Array<{
    name: string;
    surveySource: string;
  }>;
}

export interface ISurveyData {
  id: string;
  fileContent: string;
  surveyType: string;
  metadata: Record<string, any>;
} 