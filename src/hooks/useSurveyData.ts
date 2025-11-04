import { useState, useEffect } from 'react';

interface SurveyDataRow {
  region: string;
  tcc: number;
  cf: number;
  wrvus: number;
}

export const useSurveyData = () => {
  const [data, setData] = useState<SurveyDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load data from your CSV files
        const response = await fetch('/synthetic_sullivan_cotter.csv');
        const text = await response.text();
        
        // Parse CSV
        const rows = text.split('\n').slice(1); // Skip header
        const parsedData = rows.map(row => {
          const [region, tcc, cf, wrvus] = row.split(',').map(val => val.trim());
          return {
            region,
            tcc: parseFloat(tcc),
            cf: parseFloat(cf),
            wrvus: parseFloat(wrvus),
          };
        });

        setData(parsedData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load survey data');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    data,
    loading,
    error,
  };
}; 