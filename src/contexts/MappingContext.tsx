import React, { createContext, useContext, useState, useEffect } from 'react';
import { useStorageContext } from './StorageContext';
import { ISpecialtyMapping, ISourceSpecialty } from '../types/specialty';
import { initialSpecialtyMappings } from '../data/initialSpecialtyMappings';
import { ISurveyData, ISurveyMetadata } from '../types/survey';

interface MappingContextType {
  specialtyMappings: ISpecialtyMapping[];
  loading: boolean;
  error: Error | null;
}

export const MappingContext = createContext<MappingContextType | undefined>(undefined);

export const useMappingContext = () => {
  const context = useContext(MappingContext);
  if (!context) {
    throw new Error('useMappingContext must be used within a MappingProvider');
  }
  return context;
};

export const MappingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { storageService, isInitialized } = useStorageContext();
  const [specialtyMappings, setSpecialtyMappings] = useState<ISpecialtyMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Only proceed if storage service is initialized
    if (!isInitialized) {
      return;
    }

    const loadMappings = async () => {
      try {
        // Try to get existing mappings
        let surveyData;
        try {
          surveyData = await storageService.getSurveyData('specialty_mappings');
        } catch (err) {
          // If no mappings exist, store and use initial mappings
          const metadata: ISurveyMetadata = {
            totalRows: initialSpecialtyMappings.length,
            uniqueSpecialties: initialSpecialtyMappings.map(m => m.standardizedName),
            uniqueProviderTypes: [],
            uniqueRegions: [],
            columnMappings: {}
          };

          await storageService.storeSurveyData({
            id: 'specialty_mappings',
            surveyProvider: 'system',
            surveyYear: new Date().getFullYear().toString(),
            uploadDate: new Date(),
            metadata,
            rows: initialSpecialtyMappings as any[]
          });
          
          surveyData = {
            metadata,
            rows: initialSpecialtyMappings,
            totalPages: 1
          };
        }

        const mappings = surveyData.rows.map(row => ({
          id: String(row.id),
          standardizedName: String(row.standardizedName),
          sourceSpecialties: Array.isArray(row.sourceSpecialties) 
            ? row.sourceSpecialties.map((source: any) => ({
                id: String(source.id),
                specialty: String(source.specialty),
                originalName: String(source.originalName || source.specialty),
                surveySource: String(source.surveySource),
                frequency: Number(source.frequency || 1),
                mappingId: String(source.mappingId || row.id)
              })) as ISourceSpecialty[]
            : [],
          createdAt: new Date(row.createdAt || Date.now()),
          updatedAt: new Date(row.updatedAt || Date.now())
        })) as ISpecialtyMapping[];
        
        setSpecialtyMappings(mappings);
      } catch (err) {
        console.error('Error loading mappings:', err);
        setError(err instanceof Error ? err : new Error('Failed to load specialty mappings'));
      } finally {
        setLoading(false);
      }
    };

    loadMappings();
  }, [storageService, isInitialized]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Mapping Service Error</h1>
        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl w-full">
          <p className="text-gray-700 mb-4">
            {error.message || 'Failed to load specialty mappings'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <MappingContext.Provider value={{ specialtyMappings, loading, error }}>
      {children}
    </MappingContext.Provider>
  );
}; 