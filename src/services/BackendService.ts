import { 
  ISurveyData, 
  ISurveyRow 
} from '../types/survey';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class BackendService {
  private static instance: BackendService;

  private constructor() {}

  public static getInstance(): BackendService {
    if (!BackendService.instance) {
      BackendService.instance = new BackendService();
    }
    return BackendService.instance;
  }

  // Get survey metadata (includes original columns list)
  public async getSurveyMeta(surveyId: string): Promise<{ columns?: string[] }> {
    const response = await fetch(`${API_BASE_URL}/survey/${surveyId}/meta`);
    if (!response.ok) throw new Error('Failed to fetch survey metadata');
    return await response.json();
  }

  // Upload a survey file
  public async uploadSurvey(
    file: File,
    surveyName: string,
    surveyYear: number,
    surveyType: string,
    onProgress?: (percent: number) => void
  ): Promise<{ surveyId: string; rowCount: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', surveyName);
    formData.append('year', surveyYear.toString());
    formData.append('type', surveyType);

    // Use XHR to report real upload progress
    const xhr = new XMLHttpRequest();
    const promise = new Promise<{ surveyId: string; rowCount: number }>((resolve, reject) => {
      xhr.open('POST', `${API_BASE_URL}/upload-normalized`);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            // Handle both old and new response formats
            const rowCount = result.stats?.normalizedRows || result.stats?.rows || result.rowCount || 0;
            resolve({ surveyId: result.surveyId, rowCount });
          } catch (err) {
            reject(new Error('Invalid server response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.upload.onprogress = (event) => {
        if (!onProgress || !event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      };
      xhr.send(formData);
    });

    return promise;
  }

  // Get all surveys
  public async getAllSurveys(): Promise<ISurveyData[]> {
    const response = await fetch(`${API_BASE_URL}/surveys`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch surveys');
    }

    const data = await response.json();
    
    // Handle SQLite API response format
    const surveys = data.surveys || data;
    
    // Transform SQLite format to frontend format
    return surveys.map((survey: any) => {
      // Use correct column names from database
      const year = survey.year?.toString() || new Date(survey.uploadDate || survey.createdAt).getFullYear().toString();
      const type = survey.type || 'Unknown';
      
      return {
        id: survey.id,
        name: survey.name || survey.filename,
        year: year,
        type: type,
        uploadDate: new Date(survey.uploadDate || survey.createdAt),
        rowCount: survey.rowCount || 0,
        specialtyCount: 0, // Will be calculated when data is loaded
        dataPoints: survey.rowCount || 0,
        colorAccent: '#6366F1',
        metadata: {
          totalRows: survey.rowCount || 0,
          uniqueSpecialties: [],
          uniqueProviderTypes: [],
          uniqueRegions: [],
          columnMappings: {}
        }
      };
    });
  }

  // Get survey data with filters
  // CRITICAL: Always pass options.limit for large datasets to avoid missing data
  // See docs/ALLERGY_IMMUNOLOGY_FIX.md for details on the 100-row default limit issue
  public async getSurveyData(
    surveyId: string,
    filters?: {
      specialty?: string;
      providerType?: string;
      region?: string;
    },
    options?: { page?: number; limit?: number }
  ): Promise<{ rows: ISurveyRow[]; pagination?: { page: number; limit: number; total: number; pages: number } }>{
    const params = new URLSearchParams();
    if (filters?.specialty) params.append('specialty', filters.specialty);
    if (filters?.providerType) params.append('providerType', filters.providerType);
    if (filters?.region) params.append('region', filters.region);
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));

    // Try normalized data endpoint first, fallback to legacy endpoint
    let response = await fetch(`${API_BASE_URL}/survey/${surveyId}/normalized-data?${params.toString()}`);
    
    if (!response.ok) {
      // Fallback to legacy endpoint if normalized endpoint fails
      console.log('Normalized data endpoint failed, trying legacy endpoint...');
      response = await fetch(`${API_BASE_URL}/survey/${surveyId}/data?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch survey data');
      }
    }

    const data = await response.json();
    
    // Transform backend format to frontend format
    // Backend returns { data: [...], pagination: {...} }
    const surveyData = data.data || data.rows || data;
    
    // Ensure surveyData is an array
    if (!Array.isArray(surveyData)) {
      console.error('BackendService: surveyData is not an array:', surveyData);
      return { rows: [] };
    }
    
    // Keep all keys so the grid can render every original column.
    const rows = surveyData.map((row: any) => ({ ...row }));
    const pagination = data.pagination
      ? {
          page: Number(data.pagination.page) || 1,
          limit: Number(data.pagination.limit) || rows.length,
          total: Number(data.pagination.total) || rows.length,
          pages: Number(data.pagination.pages) || 1,
        }
      : undefined;
    return { rows, pagination };
  }

  // Get available filters
  public async getAvailableFiltersForSurvey(surveyId: string): Promise<{
    specialties: string[];
    providerTypes: string[];
    regions: string[];
  }> {
    const response = await fetch(`${API_BASE_URL}/survey/${surveyId}/filters`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch filters');
    }

    return await response.json();
  }

  // Delete a survey
  public async deleteSurvey(surveyId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/survey/${surveyId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete survey');
    }
  }

  // Delete all surveys
  public async deleteAllSurveys(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/surveys`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete all surveys');
  }

  // Export survey data
  public async exportSurveyData(
    surveyId: string,
    format: 'csv' | 'json' = 'csv'
  ): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/survey/${surveyId}/export?format=${format}`);
    
    if (!response.ok) {
      throw new Error('Failed to export survey data');
    }

    return await response.blob();
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Create survey
  public async createSurvey(survey: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/surveys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(survey)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create survey');
    }
    
    return await response.json();
  }

  // Save survey data
  public async saveSurveyData(surveyId: string, rows: any[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/survey/${surveyId}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save survey data');
    }
  }

  // Specialty mapping methods
  public async getAllSpecialtyMappings(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/mappings/specialty`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch specialty mappings');
    }
    
    return await response.json();
  }

  public async createSpecialtyMapping(mapping: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/mappings/specialty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapping)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create specialty mapping');
    }
    
    return await response.json();
  }

  public async deleteSpecialtyMapping(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/mappings/specialty/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete specialty mapping');
    }
  }

  public async clearAllSpecialtyMappings(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/mappings/specialty`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear all specialty mappings');
    }
  }

  // Column mapping methods
  public async getAllColumnMappings(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/mappings/column`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch column mappings');
    }
    
    return await response.json();
  }

  public async createColumnMapping(mapping: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/mappings/column`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapping)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create column mapping');
    }
    
    return await response.json();
  }

  public async deleteColumnMapping(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/mappings/column/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete column mapping');
    }
  }

  public async clearAllColumnMappings(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/mappings/column`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear all column mappings');
    }
  }

  // Utility methods
  public async getUnmappedSpecialties(): Promise<any[]> {
    // This would need to be implemented on the backend
    // For now, return empty array
    return [];
  }

  public async getUnmappedColumns(): Promise<any[]> {
    // This would need to be implemented on the backend
    // For now, return empty array
    return [];
  }

  public async autoMapColumns(config: any): Promise<any[]> {
    // This would need to be implemented on the backend
    // For now, return empty array
    return [];
  }
}

export default BackendService;
