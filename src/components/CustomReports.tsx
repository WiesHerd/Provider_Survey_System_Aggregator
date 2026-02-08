/**
 * Custom Reports Component (Refactored)
 * 
 * Main orchestrator component for Chart Builder feature
 * Uses extracted components and hooks for maintainability
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useYear } from '../contexts/YearContext';
import { ReportConfig } from '../features/reports/chart-builder/types/reportBuilder';
import { ReportActions } from '../features/reports/chart-builder/components/ReportActions';
import { ReportConfigPanel } from '../features/reports/chart-builder/components/ReportConfigPanel';
import { ReportFilters } from '../features/reports/chart-builder/components/ReportFilters';
import { ReportPreview } from '../features/reports/chart-builder/components/ReportPreview';
import { ErrorBoundary } from '../features/reports/chart-builder/components/ErrorBoundary';
import { ProcessingProgress } from '../features/reports/chart-builder/components/ProcessingProgress';
import { useReportConfig } from '../features/reports/chart-builder/hooks/useReportConfig';
import { useReportData } from '../features/reports/chart-builder/hooks/useReportData';
import { useSavedReports } from '../features/reports/chart-builder/hooks/useSavedReports';
import { useSpecialtyMappings } from '../features/reports/chart-builder/hooks/useSpecialtyMappings';
import { exportReportToCSV } from '../features/reports/chart-builder/utils/reportExport';
import { TableSkeletonLoader } from '../shared/components/TableSkeletonLoader';

interface CustomReportsProps {
  data?: any[];
  title?: string;
}

const CustomReports: React.FC<CustomReportsProps> = () => {
  const { currentYear } = useYear();
  
  // Use custom hooks
  const specialtyMappings = useSpecialtyMappings();
  const { config, updateConfig, updateFilter, loadConfig } = useReportConfig();
  const { 
    loading, 
    processingProgress,
    surveyData, 
    availableOptions, 
    chartData, 
    totalRecords, 
    filteredRecords,
    filterImpacts
  } = useReportData(config, specialtyMappings);
  const { savedReports, saveReport, deleteReport } = useSavedReports();
  

  // Table sort state
  const [tableSortDesc, setTableSortDesc] = useState(true);
  const tableData = useMemo(() => {
    const rows = [...chartData];
    rows.sort((a, b) => (tableSortDesc ? b.value - a.value : a.value - b.value));
    return rows;
  }, [chartData, tableSortDesc]);

  // Handle clear all filters
  const handleClearAllFilters = useCallback(() => {
    updateFilter('specialties', []);
    updateFilter('regions', []);
    updateFilter('surveySources', []);
    updateFilter('providerTypes', []);
    updateFilter('years', []);
  }, [updateFilter]);

  // Handle save report
  const handleSave = useCallback(() => {
    const newReport: ReportConfig = {
      ...config,
      id: Date.now().toString(),
      created: new Date()
    };
    saveReport(newReport);
    updateConfig('name', '');
  }, [config, saveReport, updateConfig]);

  // Handle export using extracted utility
  const handleExport = useCallback(() => {
    exportReportToCSV(config, chartData);
  }, [config, chartData]);

  // Handle load report
  const handleLoadReport = useCallback((report: ReportConfig) => {
    loadConfig({
      name: '',
      dimension: report.dimension,
      metric: report.metric,
      metrics: report.metrics || [report.metric],
      chartType: report.chartType,
      secondaryDimension: report.secondaryDimension || null,
      filters: {
        ...report.filters,
        years: report.filters.years || [currentYear]
      }
    });
  }, [loadConfig, currentYear]);

  return (
    <ErrorBoundary>
    <div className="bg-gray-50 min-h-full">
      <div className="w-full px-2 py-2">
          <ReportActions
            reportName={config.name}
            chartData={chartData}
            onSave={handleSave}
            onExport={handleExport}
            savedReports={savedReports}
            onLoadReport={handleLoadReport}
            onDeleteReport={deleteReport}
          />

          {loading ? (
            <TableSkeletonLoader message="Loading analytics data…" />
          ) : (
            <>
          <ReportConfigPanel
            config={config}
            availableOptions={availableOptions}
            onConfigChange={updateConfig}
            onTemplateSelect={loadConfig}
          />

          <ReportFilters
            filters={config.filters}
            availableOptions={availableOptions}
            onFilterChange={updateFilter}
            specialtyMappings={specialtyMappings}
            filterImpacts={filterImpacts}
            totalRecords={totalRecords}
            onClearAll={handleClearAllFilters}
          />

          {processingProgress > 0 && processingProgress < 100 && (
            <ProcessingProgress progress={processingProgress} />
          )}
          <ReportPreview
            config={config}
            chartData={chartData}
            tableData={tableData}
            totalRecords={totalRecords}
            filteredRecords={filteredRecords}
            onSort={setTableSortDesc}
            sortDesc={tableSortDesc}
          />
            </>
          )}
          </div>
        </div>
    </ErrorBoundary>
  );
};

export default CustomReports;
