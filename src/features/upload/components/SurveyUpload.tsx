/**
 * Survey Upload component
 * This is the main component that orchestrates the upload feature
 */

import React, { memo, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Collapse
} from '@mui/material';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CloudArrowUpIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { UploadProps } from '../types/upload';
import { useUploadData } from '../hooks/useUploadData';
import { UploadForm } from './UploadForm';
import { FileUpload } from './FileUpload';
import { UploadedSurveys } from './UploadedSurveys';
import { UploadProgressDialog } from './UploadProgressDialog';
import { UploadErrorBoundary } from './UploadErrorBoundary';
import { UploadValidationSummary } from './UploadValidationSummary';
import { StorageStatusIndicator } from './StorageStatusIndicator';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { EnterpriseLoadingSpinner } from '../../../shared/components/EnterpriseLoadingSpinner';
import { downloadGeneratedSample } from '../../../utils/generateSampleFile';

/**
 * Main Survey Upload component
 * 
 * @param onUploadComplete - Callback when upload completes
 * @param onSurveySelect - Callback when survey is selected
 * @param onSurveyDelete - Callback when survey is deleted
 * @param initialFilters - Initial global filters
 */
export const SurveyUpload: React.FC<UploadProps> = memo(({
  onUploadComplete,
  onSurveySelect,
  onSurveyDelete,
  initialFilters
}) => {
  // Use custom hook for state management
  const {
    // File state
    files,
    addFiles,
    removeFile,
    clearFiles,
    
    // Survey state
    uploadedSurveys,
    selectedSurvey,
    setSelectedSurvey,
    
    // Form state
    formState,
    updateFormState,
    toggleCustom,
    
    // Progress state
    uploadProgress,
    deleteProgress,
    
    // Enhanced upload state
    uploadState,
    
    // Filter state
    globalFilters,
    updateGlobalFilters,
    
    // Section state
    sectionState,
    toggleSection,
    
    // Computed values
    uniqueValues,
    filteredSurveys,
    summary,
    
    // Validation
    formValidation,
    fileValidation,
    
    // Actions
    uploadFiles,
    deleteSurvey,
    
    // Loading states
    isLoading,
    isUploading,
    error,
    clearError,
    
    // Database state
    isDatabaseReady
  } = useUploadData({
    initialFilters,
    onUploadComplete,
    onSurveySelect,
    onSurveyDelete
  });

  // Local state for UI enhancements
  const [showProgressDialog, setShowProgressDialog] = React.useState(false);
  const [showValidationSummary, setShowValidationSummary] = React.useState(false);
  const [validationResults, setValidationResults] = React.useState<any[]>([]);
  
  // File input ref for Browse button
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Event handlers
  const handleUpload = async () => {
    if (files.length === 0 || !isDatabaseReady) return;
    
    // Validate form
    if (!formValidation.isValid) {
      return;
    }
    
    // Show progress dialog
    setShowProgressDialog(true);
    
    try {
      await uploadFiles();
    } finally {
      // Progress dialog will be closed by the upload completion
    }
  };

  const handleCancelUpload = () => {
    setShowProgressDialog(false);
    // Note: In a real implementation, you would cancel the actual upload process
  };

  const handleValidationPreview = async () => {
    if (files.length === 0) return;
    
    // This would run validation and show the summary
    // For now, we'll just show a placeholder
    setShowValidationSummary(true);
  };

  const handleSurveySelect = (surveyId: string | null) => {
    setSelectedSurvey(surveyId);
    onSurveySelect?.(surveyId);
  };

  const handleSurveyDelete = async (surveyId: string) => {
    await deleteSurvey(surveyId);
    onSurveyDelete?.(surveyId);
  };

  const handleSectionToggle = (section: keyof typeof sectionState) => {
    toggleSection(section);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileArray = Array.from(e.target.files);
      addFiles(fileArray);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      // Defensive check - ensure formState exists
      if (!formState) {
        console.error('handleDownloadTemplate: formState is undefined');
        return;
      }
      
      // Get provider type from form state
      const providerType = formState.providerType && formState.providerType !== 'CUSTOM'
        ? (formState.providerType as 'PHYSICIAN' | 'APP' | 'CALL' | undefined)
        : undefined;
      
      // Get survey source name
      const surveySourceName = formState.surveyType === 'Custom' && formState.customSurveyType
        ? formState.customSurveyType
        : formState.surveyType || 'Sample';
      
      downloadGeneratedSample(providerType, surveySourceName);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Defensive check - ensure hook returned valid values
  if (!formState || !sectionState || !formValidation || !fileValidation) {
    console.error('SurveyUpload: Invalid state from useUploadData hook');
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Upload feature initialization error. Please refresh the page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, position: 'relative' }}>
      {/* ENTERPRISE FIX: Show overlay spinner when loading (matches AnalyticsTable pattern) */}
      {/* This provides stale-while-revalidate: shows cached data if available, spinner overlays during refresh */}
      {isLoading && (
        <EnterpriseLoadingSpinner
          message="Loading surveys..."
          recordCount={uploadedSurveys.length}
          data={uploadedSurveys}
          variant="overlay"
          loading={isLoading}
        />
      )}
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Survey Upload
        </Typography>
        
        {/* Database Health Indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isDatabaseReady ? (
            <>
              <CheckCircleIcon style={{ width: 20, height: 20, color: '#10b981' }} />
              <Typography variant="body2" color="text.secondary">
                Database Ready
              </Typography>
            </>
          ) : (
            <>
              <ExclamationTriangleIcon style={{ width: 20, height: 20, color: '#f59e0b' }} />
              <Typography variant="body2" color="text.secondary">
                Initializing...
              </Typography>
            </>
          )}
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={clearError}
        >
          {error}
        </Alert>
      )}

      {/* Upload Section */}
      <Box sx={{ mb: 3 }}>
        {/* Hidden file input for Browse button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        {/* Section Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1
          }}
        >
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              cursor: 'pointer',
              '&:hover': { opacity: 0.7 }
            }}
            onClick={handleSectionToggle('isUploadSectionCollapsed')}
          >
            {sectionState.isUploadSectionCollapsed ? (
              <ChevronRightIcon style={{ width: 20, height: 20 }} />
            ) : (
              <ChevronDownIcon style={{ width: 20, height: 20 }} />
            )}
            <Typography variant="h6">
              Upload New Survey
            </Typography>
          </Box>
          
          {!sectionState.isUploadSectionCollapsed && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Select File Button - White with gray border (matches Firebase) */}
              <Button
                variant="outlined"
                onClick={handleBrowseClick}
                disabled={isUploading}
                sx={{
                  borderRadius: '12px',
                  px: 4,
                  py: 1.5,
                  bgcolor: 'white',
                  color: 'text.primary',
                  borderColor: 'grey.300',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  '&:hover': {
                    bgcolor: 'grey.50',
                    borderColor: 'grey.400'
                  },
                  '&:disabled': {
                    opacity: 0.5
                  }
                }}
              >
                <CloudArrowUpIcon style={{ width: 16, height: 16 }} />
                Select File
              </Button>
              
              {/* Download Template Button - Circular icon button (matches Firebase) */}
              <Box sx={{ position: 'relative' }}>
                <Button
                  variant="outlined"
                  onClick={handleDownloadTemplate}
                  disabled={isUploading}
                  sx={{
                    minWidth: 'auto',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    p: 0,
                    bgcolor: 'white',
                    borderColor: 'grey.200',
                    color: 'grey.400',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&:hover': {
                      bgcolor: 'indigo.50',
                      borderColor: 'indigo.300',
                      color: 'indigo.600'
                    },
                    '&:disabled': {
                      opacity: 0.5
                    }
                  }}
                  aria-label="Download sample CSV template"
                >
                  <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        {/* Collapsible Upload Content */}
        <Collapse in={!sectionState.isUploadSectionCollapsed}>
          <Box sx={{ mt: 2 }}>
            {/* Storage Status Indicator */}
            <StorageStatusIndicator />

            {/* Upload Form */}
            <UploadForm
              formState={formState}
              onFormChange={updateFormState}
              onCustomToggle={toggleCustom}
              disabled={isUploading}
            />

            {/* File Upload */}
            <FileUpload
              files={files}
              onDrop={addFiles}
              onRemove={removeFile}
              onClear={clearFiles}
              uploadProgress={uploadProgress}
              disabled={isUploading}
            />

            {/* Upload Buttons */}
            {files.length > 0 && (
              <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={
                    isUploading || 
                    !formValidation.isValid || 
                    !fileValidation.isValid ||
                    files.length === 0 ||
                    !isDatabaseReady
                  }
                  sx={{ 
                    borderRadius: '8px',
                    px: 4,
                    py: 1.5
                  }}
                >
                  {isUploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={handleValidationPreview}
                  disabled={isUploading || !isDatabaseReady}
                  sx={{ borderRadius: '8px' }}
                >
                  Preview Validation
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={clearFiles}
                  disabled={isUploading}
                  sx={{ borderRadius: '8px' }}
                >
                  Clear Files
                </Button>
              </Box>
            )}

            {/* Validation Warnings */}
            {!formValidation.isValid && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Please fix the form validation errors before uploading.
                </Typography>
              </Alert>
            )}

            {!fileValidation.isValid && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  {fileValidation.errors.join(', ')}
                </Typography>
              </Alert>
            )}

            {fileValidation.warnings.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  {fileValidation.warnings.join(', ')}
                </Typography>
              </Alert>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* Uploaded Surveys */}
      <UploadedSurveys
        surveys={filteredSurveys}
        selectedSurvey={selectedSurvey}
        onSurveySelect={handleSurveySelect}
        onSurveyDelete={handleSurveyDelete}
        deleteProgress={deleteProgress}
        globalFilters={globalFilters}
        onFilterChange={updateGlobalFilters}
        uniqueValues={uniqueValues}
        sectionState={sectionState}
        onSectionToggle={toggleSection}
        loading={isLoading}
      />

      {/* Summary */}
      {uploadedSurveys.length > 0 && (
        <Box sx={{ mt: 3, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Upload Summary
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Files
              </Typography>
              <Typography variant="h6">
                {summary.totalFiles}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Rows
              </Typography>
              <Typography variant="h6">
                {summary.totalRows.toLocaleString()}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Specialties
              </Typography>
              <Typography variant="h6">
                {summary.totalSpecialties}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Data Points
              </Typography>
              <Typography variant="h6">
                {summary.totalDataPoints.toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Upload Progress Dialog */}
      <UploadProgressDialog
        open={showProgressDialog}
        onClose={() => setShowProgressDialog(false)}
        onCancel={handleCancelUpload}
        progress={uploadState.progress}
        currentTransaction={uploadState.currentTransaction}
        completedTransactions={uploadState.completedTransactions}
        failedTransactions={uploadState.failedTransactions}
      />

      {/* Upload Validation Summary */}
      <UploadValidationSummary
        open={showValidationSummary}
        onClose={() => setShowValidationSummary(false)}
        onConfirm={() => {
          setShowValidationSummary(false);
          handleUpload();
        }}
        validationResults={validationResults}
        totalRows={files.reduce((sum, file) => sum + (file as any).rowCount || 0, 0)}
        estimatedTime={`${Math.ceil(files.length * 0.5)} min`}
      />

      {/* Upload Error Boundary - Removed empty wrapper that might cause issues */}
    </Box>
  );
});

SurveyUpload.displayName = 'SurveyUpload';
