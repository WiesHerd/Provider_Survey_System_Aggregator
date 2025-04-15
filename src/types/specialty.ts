export interface ISpecialtyMapping {
  id: string;
  standardName: string;
  sourceNames: Array<{
    name: string;
    provider: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface IUnmappedSpecialty {
  name: string;
  provider: string;
  suggestedMatches: Array<{
    standardName: string;
    confidence: number;
  }>;
}

export interface IAutoMappingConfig {
  confidenceThreshold: number;
  useStringMatching: boolean;
  useSynonyms: boolean;
  provider: string;
}

export interface ISpecialtyGroup {
  id: string;
  name: string;
  specialties: string[];
  createdAt: string;
  updatedAt: string;
} 