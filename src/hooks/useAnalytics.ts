import { useState, useEffect } from 'react';
import { useSurveyData } from './useSurveyData';

interface RegionalMetrics {
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
  wrvus_p25: number;
  wrvus_p50: number;
  wrvus_p75: number;
  wrvus_p90: number;
}

interface AnalyticsData {
  nationalMetrics: RegionalMetrics;
  regionalMetrics: {
    Northeast: RegionalMetrics;
    'North Central': RegionalMetrics;
    South: RegionalMetrics;
    West: RegionalMetrics;
  };
}

interface SurveyDataRow {
  region: string;
  tcc: number;
  cf: number;
  wrvus: number;
}

export const useAnalytics = () => {
  const { data: surveyData } = useSurveyData();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (!surveyData) return;

    // Calculate percentiles for each region
    const calculatePercentiles = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return {
        p25: sorted[Math.floor(sorted.length * 0.25)],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p75: sorted[Math.floor(sorted.length * 0.75)],
        p90: sorted[Math.floor(sorted.length * 0.9)],
      };
    };

    // Group data by region
    const regionalData = surveyData.reduce((acc: Record<string, { tcc: number[]; cf: number[]; wrvus: number[] }>, row: SurveyDataRow) => {
      const region = row.region || 'National';
      if (!acc[region]) {
        acc[region] = {
          tcc: [],
          cf: [],
          wrvus: [],
        };
      }
      acc[region].tcc.push(row.tcc);
      acc[region].cf.push(row.cf);
      acc[region].wrvus.push(row.wrvus);
      return acc;
    }, {});

    // Calculate metrics for each region
    const calculateMetrics = (data: { tcc: number[]; cf: number[]; wrvus: number[] }) => {
      const tcc = calculatePercentiles(data.tcc);
      const cf = calculatePercentiles(data.cf);
      const wrvus = calculatePercentiles(data.wrvus);

      return {
        tcc_p25: tcc.p25,
        tcc_p50: tcc.p50,
        tcc_p75: tcc.p75,
        tcc_p90: tcc.p90,
        cf_p25: cf.p25,
        cf_p50: cf.p50,
        cf_p75: cf.p75,
        cf_p90: cf.p90,
        wrvus_p25: wrvus.p25,
        wrvus_p50: wrvus.p50,
        wrvus_p75: wrvus.p75,
        wrvus_p90: wrvus.p90,
      };
    };

    // Calculate metrics for all regions
    const nationalMetrics = calculateMetrics(regionalData['National'] || { tcc: [], cf: [], wrvus: [] });
    const regionalMetrics = {
      Northeast: calculateMetrics(regionalData['Northeast'] || { tcc: [], cf: [], wrvus: [] }),
      'North Central': calculateMetrics(regionalData['North Central'] || { tcc: [], cf: [], wrvus: [] }),
      South: calculateMetrics(regionalData['South'] || { tcc: [], cf: [], wrvus: [] }),
      West: calculateMetrics(regionalData['West'] || { tcc: [], cf: [], wrvus: [] }),
    };

    setAnalyticsData({
      nationalMetrics,
      regionalMetrics,
    });
  }, [surveyData]);

  return {
    data: analyticsData,
  };
}; 