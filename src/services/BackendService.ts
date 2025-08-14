import { 
  ISurveyData, 
  ISurveyRow 
} from '../types/survey';

const API_BASE_URL = 'https://survey-aggregator-backend.azurewebsites.net/api';

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
      xhr.open('POST', `${API_BASE_URL}/upload`);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve({ surveyId: result.surveyId, rowCount: result.rowCount });
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

    const surveys = await response.json();
    
    // Transform backend format to frontend format
    return surveys.map((survey: any) => ({
      id: survey.id,
      name: survey.name,
      year: survey.year.toString(),
      type: survey.type,
      uploadDate: survey.uploadDate,
      rowCount: survey.rowCount ?? survey.row_count ?? 0,
      specialtyCount: survey.specialtyCount ?? survey.specialty_count ?? 0,
      dataPoints: survey.dataPoints ?? survey.data_points ?? 0,
      colorAccent: survey.colorAccent || '#6366F1',
      metadata: survey.metadata
    }));
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

    const response = await fetch(`${API_BASE_URL}/survey/${surveyId}/data?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch survey data');
    }

    const data = await response.json();
    
    // Transform backend format to frontend format
    // Backend returns { data: [...], pagination: {...} }
    const surveyData = data.data || data;
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
}

export default BackendService;
