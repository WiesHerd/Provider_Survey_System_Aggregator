export interface IColumnInfo {
  id: string;
  name: string;
  surveySource: string;
  dataType: string;
  frequency?: number;
  mappingId?: string;
}

export interface IColumnMapping {
  id: string;
  standardizedName: string;
  sourceColumns: IColumnInfo[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAutoMappingConfig {
  confidenceThreshold: number;
  includeDataTypeMatching: boolean;
} 