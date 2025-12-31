/**
 * Report Storage Service
 * 
 * Handles saving and loading reports from Firebase or localStorage (fallback)
 */

import { ReportConfig } from '../types/reportBuilder';
import { getDataService, StorageMode } from '../../../../services/DataService';
import { isFirebaseAvailable } from '../../../../config/firebase';

const STORAGE_KEY = 'customReports';

/**
 * Load saved reports from storage (Firebase or localStorage fallback)
 */
export const loadSavedReports = async (): Promise<ReportConfig[]> => {
  try {
    // Try Firebase first if available
    if (isFirebaseAvailable()) {
      try {
        const dataService = getDataService(StorageMode.FIREBASE);
        const reports = await dataService.getAllCustomReports();
        return reports.map((report: any) => ({
          ...report,
          created: report.created instanceof Date ? report.created : new Date(report.created)
        }));
      } catch (error) {
        console.warn('Failed to load reports from Firebase, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert created dates from strings back to Date objects
      return parsed.map((report: any) => ({
        ...report,
        created: new Date(report.created)
      }));
    }
  } catch (error) {
    console.error('Error loading saved reports:', error);
  }
  return [];
};

/**
 * Save reports to storage (Firebase or localStorage fallback)
 */
export const saveReports = async (reports: ReportConfig[]): Promise<void> => {
  try {
    // Try Firebase first if available
    if (isFirebaseAvailable()) {
      try {
        const dataService = getDataService(StorageMode.FIREBASE);
        // Save each report individually
        for (const report of reports) {
          await dataService.saveCustomReport(report);
        }
        return; // Success, exit early
      } catch (error) {
        console.warn('Failed to save reports to Firebase, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    console.error('Error saving reports:', error);
    throw error;
  }
};

/**
 * Save a single report
 */
export const saveReport = async (report: ReportConfig): Promise<void> => {
  try {
    // Try Firebase first if available
    if (isFirebaseAvailable()) {
      try {
        const dataService = getDataService(StorageMode.FIREBASE);
        await dataService.saveCustomReport(report);
        return; // Success, exit early
      } catch (error) {
        console.warn('Failed to save report to Firebase, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    const existing = await loadSavedReports();
    const updated = [...existing, report];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving report:', error);
    throw error;
  }
};

/**
 * Delete a report by ID
 */
export const deleteReport = async (reportId: string, reports: ReportConfig[]): Promise<ReportConfig[]> => {
  try {
    // Try Firebase first if available
    if (isFirebaseAvailable()) {
      try {
        const dataService = getDataService(StorageMode.FIREBASE);
        await dataService.deleteCustomReport(reportId);
        return reports.filter(r => r.id !== reportId);
      } catch (error) {
        console.warn('Failed to delete report from Firebase, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    const updated = reports.filter(r => r.id !== reportId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
};




