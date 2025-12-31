/**
 * Hook for managing saved reports
 */

import { useState, useEffect } from 'react';
import { ReportConfig } from '../types/reportBuilder';
import { loadSavedReports, saveReports as saveReportsToStorage, deleteReport as deleteReportFromStorage } from '../services/reportStorage';

export const useSavedReports = () => {
  const [savedReports, setSavedReports] = useState<ReportConfig[]>([]);

  useEffect(() => {
    const loadReports = async () => {
      const loaded = await loadSavedReports();
      setSavedReports(loaded);
    };
    loadReports();
  }, []);

  const saveReport = async (report: ReportConfig) => {
    const updated = [...savedReports, report];
    setSavedReports(updated);
    await saveReportsToStorage(updated);
  };

  const deleteReport = async (reportId: string) => {
    const updated = await deleteReportFromStorage(reportId, savedReports);
    setSavedReports(updated);
  };

  return {
    savedReports,
    saveReport,
    deleteReport
  };
};




