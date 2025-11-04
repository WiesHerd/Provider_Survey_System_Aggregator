import * as XLSX from 'xlsx';
import { AnalyticsData, AnalyticsFilters } from '../types/analytics';
import { mapVariableNameToStandard } from './variableFormatters';

interface ExportOptions {
  includeFilters?: boolean;
  includeSummary?: boolean;
  filename?: string;
}

/**
 * Export analytics data to Excel with dynamic variable support
 */
export const exportToExcel = (
  data: AnalyticsData[],
  filters: AnalyticsFilters,
  selectedVariables: string[],
  options: ExportOptions = {}
) => {
  const {
    includeFilters = true,
    includeSummary = true,
    filename = `survey-analytics-${new Date().toISOString().split('T')[0]}.xlsx`
  } = options;

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Helper function to safely get variable metrics from dynamic data structure
  const getVariableMetrics = (row: any, variableName: string) => {
    // Check if this is the new dynamic format
    if (row.variables && typeof row.variables === 'object') {
      // Normalize variable name to match the stored key
      const normalizedVarName = mapVariableNameToStandard(variableName);
      const metrics = row.variables[normalizedVarName];
      
      if (metrics) {
        return metrics;
      }
      
      // Try alternative names for CFs
      if (variableName === 'cf' || variableName === 'cfs') {
        const altMetrics = row.variables['tcc_per_work_rvu'] || row.variables['conversion_factor'];
        if (altMetrics) {
          return altMetrics;
        }
      }
      
      return { n_orgs: 0, n_incumbents: 0, p25: 0, p50: 0, p75: 0, p90: 0 };
    }
    
    // Fallback to old format properties with proper variable name mapping
    const legacyFieldMap: Record<string, string> = {
      'tcc': 'tcc',
      'work_rvus': 'wrvu',
      'wrvu': 'wrvu',
      'cf': 'cf',
      'cfs': 'cf',
      'conversion_factor': 'cf',
      'tcc_per_work_rvu': 'cf',
      'base_salary': 'base_salary',
      'panel_size': 'panel_size',
      'total_encounters': 'total_encounters',
      'asa_units': 'asa_units',
      'net_collections': 'net_collections'
    };
    
    const legacyPrefix = legacyFieldMap[variableName] || variableName;
    
    return {
      n_orgs: row[`${legacyPrefix}_n_orgs`] || 0,
      n_incumbents: row[`${legacyPrefix}_n_incumbents`] || 0,
      p25: row[`${legacyPrefix}_p25`] || 0,
      p50: row[`${legacyPrefix}_p50`] || 0,
      p75: row[`${legacyPrefix}_p75`] || 0,
      p90: row[`${legacyPrefix}_p90`] || 0
    };
  };

  // Helper function to map variable names to display names
  const getVariableDisplayName = (varName: string): string => {
    const displayNames: Record<string, string> = {
      'tcc': 'TCC (Total Cash Compensation)',
      'work_rvus': 'Work RVUs',
      'wrvu': 'Work RVUs',
      'cf': 'CFs',
      'conversion_factor': 'CFs',
      'tcc_per_work_rvu': 'CFs',
      'cfs': 'CFs',
      'base_salary': 'Base Salary',
      'base_compensation': 'Base Salary',
      'salary': 'Base Salary',
      'panel_size': 'Panel Size',
      'total_encounters': 'Total Encounters',
      'encounters': 'Total Encounters',
      'asa_units': 'ASA Units',
      'asa': 'ASA Units',
      'net_collections': 'Net Collections',
      'collections': 'Net Collections'
    };
    return displayNames[varName] || varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Prepare data for export with dynamic variables
  const exportData = data.map(row => {
    const baseRow = {
      'Survey Source': row.surveySource || '',
      'Survey Specialty': row.surveySpecialty || '',
      'Geographic Region': row.geographicRegion || '',
      'Provider Type': row.providerType || '',
      'Survey Year': row.surveyYear || ''
    };

    // Add dynamic variable columns
    const variableColumns: Record<string, any> = {};
    
    selectedVariables.forEach(varName => {
      const metrics = getVariableMetrics(row, varName);
      const displayName = getVariableDisplayName(varName);
      
      variableColumns[`${displayName} # Orgs`] = metrics.n_orgs;
      variableColumns[`${displayName} # Incumbents`] = metrics.n_incumbents;
      variableColumns[`${displayName} P25`] = metrics.p25;
      variableColumns[`${displayName} P50`] = metrics.p50;
      variableColumns[`${displayName} P75`] = metrics.p75;
      variableColumns[`${displayName} P90`] = metrics.p90;
    });

    return { ...baseRow, ...variableColumns };
  });

  // Create main data worksheet
  const dataWorksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths dynamically based on selected variables
  const columnWidths = [
    { wch: 15 }, // Survey Source
    { wch: 20 }, // Survey Specialty
    { wch: 15 }, // Geographic Region
    { wch: 15 }, // Provider Type
    { wch: 12 }  // Survey Year
  ];

  // Add column widths for each selected variable (6 columns per variable)
  selectedVariables.forEach(() => {
    columnWidths.push(
      { wch: 15 }, // # Organizations
      { wch: 15 }, // # Incumbents
      { wch: 12 }, // P25
      { wch: 12 }, // P50
      { wch: 12 }, // P75
      { wch: 12 }  // P90
    );
  });

  dataWorksheet['!cols'] = columnWidths;

  // Add data worksheet
  XLSX.utils.book_append_sheet(workbook, dataWorksheet, 'Survey Data');

  // Add filters worksheet if requested
  if (includeFilters) {
    const activeFilters = Object.entries(filters)
      .filter(([_, value]) => value && value !== '')
      .map(([key, value]) => ({ 'Filter': key, 'Value': value }));

    if (activeFilters.length > 0) {
      const filtersWorksheet = XLSX.utils.json_to_sheet(activeFilters);
      filtersWorksheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(workbook, filtersWorksheet, 'Active Filters');
    }
  }

  // Add summary worksheet if requested
  if (includeSummary) {
    const totalRecords = data.length;
    
    // Calculate totals for each selected variable
    const summaryData = [
      { 'Metric': 'Total Records', 'Value': totalRecords },
      { 'Metric': 'Report Generated', 'Value': new Date().toLocaleString() }
    ];

    // Add summary for each selected variable
    selectedVariables.forEach(varName => {
      const displayName = getVariableDisplayName(varName);
      const totalOrgs = (data as any[]).reduce((sum: number, row: any) => sum + getVariableMetrics(row, varName).n_orgs, 0);
      const totalIncumbents = (data as any[]).reduce((sum: number, row: any) => sum + getVariableMetrics(row, varName).n_incumbents, 0);
      const avgP50 = data.length > 0 ? (data as any[]).reduce((sum: number, row: any) => sum + getVariableMetrics(row, varName).p50, 0) / data.length : 0;

      summaryData.push(
        { 'Metric': `Total ${displayName} Organizations`, 'Value': totalOrgs },
        { 'Metric': `Total ${displayName} Incumbents`, 'Value': totalIncumbents },
        { 'Metric': `Average ${displayName} P50`, 'Value': Math.round(avgP50) }
      );
    });

    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
    summaryWorksheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
  }

  // Download the file
  XLSX.writeFile(workbook, filename);
};

/**
 * Export to CSV (simpler alternative) with dynamic variable support
 */
export const exportToCSV = (
  data: AnalyticsData[],
  filters: AnalyticsFilters,
  selectedVariables: string[],
  options: ExportOptions = {}
) => {
  const {
    filename = `survey-analytics-${new Date().toISOString().split('T')[0]}.csv`
  } = options;

  // Helper function to safely get variable metrics (reused from Excel export)
  const getVariableMetrics = (row: any, variableName: string) => {
    // Check if this is the new dynamic format
    if (row.variables && typeof row.variables === 'object') {
      // Normalize variable name to match the stored key
      const normalizedVarName = mapVariableNameToStandard(variableName);
      const metrics = row.variables[normalizedVarName];
      
      if (metrics) {
        return metrics;
      }
      
      // Try alternative names for CFs
      if (variableName === 'cf' || variableName === 'cfs') {
        const altMetrics = row.variables['tcc_per_work_rvu'] || row.variables['conversion_factor'];
        if (altMetrics) {
          return altMetrics;
        }
      }
      
      return { n_orgs: 0, n_incumbents: 0, p25: 0, p50: 0, p75: 0, p90: 0 };
    }
    
    // Fallback to old format properties with proper variable name mapping
    const legacyFieldMap: Record<string, string> = {
      'tcc': 'tcc',
      'work_rvus': 'wrvu',
      'wrvu': 'wrvu',
      'cf': 'cf',
      'cfs': 'cf',
      'conversion_factor': 'cf',
      'tcc_per_work_rvu': 'cf',
      'base_salary': 'base_salary',
      'panel_size': 'panel_size',
      'total_encounters': 'total_encounters',
      'asa_units': 'asa_units',
      'net_collections': 'net_collections'
    };
    
    const legacyPrefix = legacyFieldMap[variableName] || variableName;
    
    return {
      n_orgs: row[`${legacyPrefix}_n_orgs`] || 0,
      n_incumbents: row[`${legacyPrefix}_n_incumbents`] || 0,
      p25: row[`${legacyPrefix}_p25`] || 0,
      p50: row[`${legacyPrefix}_p50`] || 0,
      p75: row[`${legacyPrefix}_p75`] || 0,
      p90: row[`${legacyPrefix}_p90`] || 0
    };
  };

  // Helper function to map variable names to display names
  const getVariableDisplayName = (varName: string): string => {
    const displayNames: Record<string, string> = {
      'tcc': 'TCC (Total Cash Compensation)',
      'work_rvus': 'Work RVUs',
      'wrvu': 'Work RVUs',
      'cf': 'CFs',
      'conversion_factor': 'CFs',
      'tcc_per_work_rvu': 'CFs',
      'cfs': 'CFs',
      'base_salary': 'Base Salary',
      'base_compensation': 'Base Salary',
      'salary': 'Base Salary',
      'panel_size': 'Panel Size',
      'total_encounters': 'Total Encounters',
      'encounters': 'Total Encounters',
      'asa_units': 'ASA Units',
      'asa': 'ASA Units',
      'net_collections': 'Net Collections',
      'collections': 'Net Collections'
    };
    return displayNames[varName] || varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Prepare CSV headers dynamically
  const headers = [
    'Survey Source',
    'Survey Specialty',
    'Geographic Region',
    'Provider Type',
    'Survey Year'
  ];

  // Add headers for each selected variable
  selectedVariables.forEach(varName => {
    const displayName = getVariableDisplayName(varName);
    headers.push(
      `${displayName} # Orgs`,
      `${displayName} # Incumbents`,
      `${displayName} P25`,
      `${displayName} P50`,
      `${displayName} P75`,
      `${displayName} P90`
    );
  });

  const csvData = data.map(row => {
    const baseRow = [
      row.surveySource || '',
      row.surveySpecialty || '',
      row.geographicRegion || '',
      row.providerType || '',
      row.surveyYear || ''
    ];

    // Add data for each selected variable
    const variableData: any[] = [];
    selectedVariables.forEach(varName => {
      const metrics = getVariableMetrics(row, varName);
      variableData.push(
        metrics.n_orgs,
        metrics.n_incumbents,
        metrics.p25,
        metrics.p50,
        metrics.p75,
        metrics.p90
      );
    });

    return [...baseRow, ...variableData];
  });

  // Add headers
  csvData.unshift(headers);

  // Convert to CSV string
  const csvContent = csvData
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
