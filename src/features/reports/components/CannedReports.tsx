/**
 * Canned Reports Component
 * 
 * Report library system matching app styling
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronRightIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
  TableCellsIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Alert, Snackbar, Drawer, Typography, Divider } from '@mui/material';
import { REPORT_TEMPLATES, ReportTemplate, ReportCategory } from '../templates/reportTemplates';
import { ReportConfigDialog } from './ReportConfigDialog';
import { ReportTable } from './ReportTable';
import { generateTCCReport, generateWRVUReport, generateCFReport } from '../services/reportGenerationService';
import { ReportData, ReportConfig as ReportConfigType } from '../types/reports';
import { EnterpriseLoadingSpinner } from '../../../shared/components';

interface CannedReportsProps {}

const CannedReports: React.FC<CannedReportsProps> = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportConfig, setReportConfig] = useState<ReportConfigType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  // Update URL when report is generated to update header
  useEffect(() => {
    if (selectedTemplate && reportData) {
      setSearchParams({ report: selectedTemplate.id });
    } else if (!reportData) {
      setSearchParams({});
    }
  }, [selectedTemplate, reportData, setSearchParams]);

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return REPORT_TEMPLATES;
    return REPORT_TEMPLATES.filter(t => t.category === selectedCategory);
  }, [selectedCategory]);

  // Categories for filtering
  const categories: Array<{ value: ReportCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All Reports' },
    { value: 'compensation', label: 'Compensation' },
    { value: 'comparison', label: 'Comparison' },
    { value: 'trends', label: 'Trends' },
    { value: 'custom', label: 'Custom' }
  ];

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setShowConfigDialog(true);
  };

  const handleGenerateReport = async (config: ReportConfigType) => {
    if (!selectedTemplate) return;

    setGenerating(true);
    setReportConfig(config);
    setShowConfigDialog(false);
    setReportData(null); // Clear previous data
    setError(null);
    setShowError(false);

    try {
      let data: ReportData;

      // Determine metric from template ID – all canned reports use TCC, wRVU, or CF generator
      if (selectedTemplate.id === 'total-cash-compensation') {
        data = await generateTCCReport(config);
      } else if (selectedTemplate.id === 'work-rvus') {
        data = await generateWRVUReport(config);
      } else if (selectedTemplate.id === 'conversion-factors') {
        data = await generateCFReport(config);
      } else if (
        selectedTemplate.id === 'specialty-compensation-summary' ||
        selectedTemplate.id === 'regional-comparison' ||
        selectedTemplate.id === 'survey-source-comparison' ||
        selectedTemplate.id === 'provider-type-analysis' ||
        selectedTemplate.id === 'percentile-distribution' ||
        selectedTemplate.id === 'custom-multi-metric' ||
        selectedTemplate.id === 'year-over-year-trends' ||
        selectedTemplate.id === 'top-bottom-performers'
      ) {
        data = await generateTCCReport(config);
      } else {
        throw new Error(`Unknown report template: ${selectedTemplate.id}`);
      }

      if (data.rows.length === 0) {
        // Show helpful message instead of empty table
        console.warn('⚠️ Report generated with no rows');
        setError(
          'No data matches your current filters. Try selecting different options or check that you have uploaded survey data. ' +
          'The report config is open so you can adjust filters and try again.'
        );
        setShowError(true);
        setShowConfigDialog(true); // Reopen config dialog
        return;
      }

      // Success: clear any previous error and show the report
      setError(null);
      setShowError(false);
      setReportData(data);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error generating report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // User-friendly error message
      let userMessage = 'Unable to generate report. ';
      if (errorMessage.includes('No data')) {
        userMessage += 'No data matches your filters. Try selecting "All" for provider type, survey source, region, or year.';
      } else if (errorMessage.includes('upload')) {
        userMessage += 'Please upload survey data first.';
      } else {
        userMessage += 'Please check your filter selections or try again.';
      }
      
      setError(userMessage);
      setShowError(true);
      setShowConfigDialog(true); // Reopen config dialog on error
    } finally {
      setGenerating(false);
    }
  };

  const handleBackToTemplates = () => {
    setReportData(null);
    setReportConfig(null);
    setSelectedTemplate(null);
    setShowConfigDialog(false);
    setSearchParams({}); // Clear URL params to reset header
  };

  // Show report view if we have data or are generating
  if (reportData || generating) {
    return (
      <>
        {/* Success/Error Notifications */}
        <Snackbar
          open={showSuccess}
          autoHideDuration={4000}
          onClose={() => setShowSuccess(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={() => setShowSuccess(false)} severity="success" sx={{ borderRadius: '8px' }}>
            Report generated successfully!
          </Alert>
        </Snackbar>

        <Snackbar
          open={showError}
          autoHideDuration={6000}
          onClose={() => setShowError(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={() => setShowError(false)} severity="error" sx={{ borderRadius: '8px' }}>
            {error}
          </Alert>
        </Snackbar>

        <div className="flex flex-col space-y-6">
          {/* Back to Reports button */}
          {reportData && reportConfig && !generating && (
            <div className="flex justify-start">
              <button
                onClick={handleBackToTemplates}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Reports
              </button>
            </div>
          )}

          {/* Loading state */}
          {generating && (
            <div className="bg-white rounded-xl border border-gray-200">
              <EnterpriseLoadingSpinner 
                message="Generating report..." 
                variant="inline"
                showProgress={false}
              />
            </div>
          )}

          {/* Report table */}
          {reportData && reportConfig && !generating && (
            <ReportTable
              data={reportData}
              config={reportConfig}
              loading={false}
              onViewFiltersClick={() => setFiltersDrawerOpen(true)}
            />
          )}

          {/* Filters Drawer */}
          {reportData && reportConfig && (
            <Drawer anchor="right" open={filtersDrawerOpen} onClose={() => setFiltersDrawerOpen(false)}>
              <div style={{ width: 420 }} className="p-6">
                <Typography variant="h6" className="mb-1" sx={{ fontWeight: 700 }}>
                  Report Filters
                </Typography>
                <Typography variant="body2" className="text-gray-600 mb-4">Current report configuration</Typography>
                <Divider className="my-4" />
                
                <div className="space-y-4 mt-4">
                  <div>
                    <Typography variant="body2" className="font-semibold text-gray-900 mb-1">
                      Metric
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      {reportConfig.metric === 'tcc' ? 'Total Cash Compensation' : 
                       reportConfig.metric === 'wrvu' ? 'Work RVUs' : 
                       'Conversion Factors'}
                    </Typography>
                  </div>

                  <div>
                    <Typography variant="body2" className="font-semibold text-gray-900 mb-1">
                      Provider Type
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      {reportConfig.selectedProviderType.length === 0 ? 'All' : reportConfig.selectedProviderType.join(', ')}
                    </Typography>
                  </div>

                  <div>
                    <Typography variant="body2" className="font-semibold text-gray-900 mb-1">
                      Survey Source
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      {reportConfig.selectedSurveySource.length === 0 ? 'All' : reportConfig.selectedSurveySource.join(', ')}
                    </Typography>
                  </div>

                  <div>
                    <Typography variant="body2" className="font-semibold text-gray-900 mb-1">
                      Region
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      {reportConfig.selectedRegion.length === 0 ? 'All' : reportConfig.selectedRegion.join(', ')}
                    </Typography>
                  </div>

                  <div>
                    <Typography variant="body2" className="font-semibold text-gray-900 mb-1">
                      Year
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      {reportConfig.selectedYear.length === 0 ? 'All' : reportConfig.selectedYear.join(', ')}
                    </Typography>
                  </div>

                  {reportConfig.enableBlending && (
                    <div>
                      <Typography variant="body2" className="font-semibold text-gray-900 mb-1">
                        Blending Method
                      </Typography>
                      <Typography variant="body2" className="text-gray-600">
                        {reportConfig.blendingMethod === 'weighted' ? 'Weighted Average' : 'Simple Average'}
                      </Typography>
                    </div>
                  )}

                  <div>
                    <Typography variant="body2" className="font-semibold text-gray-900 mb-1">
                      Percentiles
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      {reportConfig.selectedPercentiles.map(p => p.toUpperCase()).join(', ')}
                    </Typography>
                  </div>

                  <Divider className="my-4" />

                  <div>
                    <Typography variant="body2" className="font-semibold text-gray-900 mb-1">
                      Report Statistics
                    </Typography>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Rows:</span>
                        <span className="text-sm font-medium text-gray-900">{reportData.metadata.totalRows.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Blended:</span>
                        <span className="text-sm font-medium text-gray-900">{reportData.metadata.blendedRows.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Unmapped:</span>
                        <span className="text-sm font-medium text-gray-900">{reportData.metadata.unmappedRows.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Generated:</span>
                        <span className="text-sm font-medium text-gray-900">{reportData.metadata.generatedAt.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Drawer>
          )}
        </div>
      </>
    );
  }

  // Show template selection view
  return (
    <div className="flex flex-col space-y-6">
      {/* Category Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Category:</label>
        <select
          value={selectedCategory}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value as ReportCategory | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Report Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates
          .filter((template) => {
            // Filter out templates with invalid icons
            if (!template.icon) {
              console.warn(`Icon not found for template: ${template.id}`);
              return false;
            }
            return true;
          })
          .map((template) => {
          const Icon = template.icon!; // Safe to use ! here since we filtered
          return (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className="w-full text-left"
            >
              <div className="relative h-full bg-white rounded-xl border border-gray-200 p-5 transition-all duration-200 flex flex-col group hover:shadow-lg hover:border-gray-300">
                {/* Icon */}
                <div className="mb-4">
                  <div className={`inline-flex p-2.5 rounded-xl ${template.iconColor}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col min-h-0">
                  <h3 className="text-base font-medium text-gray-900 mb-2 flex-shrink-0">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 flex-1 overflow-hidden">
                    {template.description}
                  </p>
                </div>

                {/* Subtle chevron indicator */}
                <div className="absolute top-4 right-4 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
                  <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Configuration Dialog */}
      {selectedTemplate && (
        <ReportConfigDialog
          open={showConfigDialog}
          onClose={() => setShowConfigDialog(false)}
          onGenerate={handleGenerateReport}
          metric={
            selectedTemplate.id === 'total-cash-compensation' ? 'tcc' :
            selectedTemplate.id === 'work-rvus' ? 'wrvu' :
            selectedTemplate.id === 'conversion-factors' ? 'cf' : 'tcc'
          }
          reportName={selectedTemplate.name}
        />
      )}
    </div>
  );
};

export default CannedReports;
