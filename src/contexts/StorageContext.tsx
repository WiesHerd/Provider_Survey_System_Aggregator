import React, { createContext, useContext, useState, useEffect } from 'react';
import { IStorageService, createStorageService } from '../services/StorageService';

interface StorageContextType {
  storageService: IStorageService;
  isInitialized: boolean;
  error: Error | null;
}

export const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const useStorageContext = () => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorageContext must be used within a StorageProvider');
  }
  return context;
};

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storage, setStorage] = useState<IStorageService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeStorage = async () => {
      try {
        const storageService = createStorageService();
        setStorage(storageService);
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize storage service:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize storage service'));
      }
    };

    initializeStorage();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Storage Service Error</h1>
        <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl w-full">
          <p className="text-gray-700 mb-4">
            {error.message || 'Failed to initialize the storage service'}
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

  if (!isInitialized || !storage) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <StorageContext.Provider value={{ storageService: storage, isInitialized, error }}>
      {children}
    </StorageContext.Provider>
  );
}; 