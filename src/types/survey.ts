export interface ISurveyData {
  id: string;
  surveyProvider: string;
  surveyYear: string;
  uploadDate: Date;
  data: ISurveyRow[];
  metadata: ISurveyMetadata;
}

export interface ISurveyRow {
  normalizedSpecialty: string;
  providerType: string;
  geographicRegion: string;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  wrvu_p25: number;
  wrvu_p50: number;
  wrvu_p75: number;
  wrvu_p90: number;
  // Variable-based data fields
  variable?: string;
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
  [key: string]: string | number | undefined;
}


export interface ISurveyMetadata {
  totalRows: number;
  uniqueSpecialties: string[];
  uniqueProviderTypes: string[];
  uniqueRegions: string[];
  columnMappings: Record<string, string>;
}

export interface ISurveyMapping {
  sourceColumn: string;
  targetColumn: string;
  transformFn?: (value: any) => any;
}

export interface ISpecialtyNormalization {
  normalizedName: string;
  variants: string[];
  rules?: {
    includesAny?: string[];
    excludesAll?: string[];
    exactMatch?: string[];
  };
} 