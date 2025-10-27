/**
 * Survey Upload component
 * This is the main component that orchestrates the upload feature
 */

import React, { memo } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Collapse
} from '@mui/material';
import {
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { UploadProps } from '../types/upload';
import { useUploadData } from '../hooks/useUploadData';
import { UploadForm } from './UploadForm';
import { FileUpload } from './FileUpload';
import { UploadedSurveys } from './UploadedSurveys';
import { UploadProgressDialog } from './UploadProgressDialog';
import { UploadErrorBoundary } from './UploadErrorBoundary';
import { UploadValidationSummary } from './UploadValidationSummary';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

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

  return (
    <Box sx={{ p: 3 }}>
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
        {/* Section Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' }
          }}
          onClick={handleSectionToggle('isUploadSectionCollapsed')}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {sectionState.isUploadSectionCollapsed ? (
              <ChevronRightIcon style={{ width: 20, height: 20 }} />
            ) : (
              <ChevronDownIcon style={{ width: 20, height: 20 }} />
            )}
            <Typography variant="h6">
              Upload New Surveys
            </Typography>
          </Box>
          
          {files.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </Typography>
          )}
        </Box>

        {/* Collapsible Upload Content */}
        <Collapse in={!sectionState.isUploadSectionCollapsed}>
          <Box sx={{ mt: 2 }}>
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

      {/* Upload Error Boundary */}
      <UploadErrorBoundary
        onRetry={() => {
          clearError();
          handleUpload();
        }}
        onClear={() => {
          clearError();
          clearFiles();
        }}
        onDismiss={clearError}
      >
        {/* This would wrap the upload components if needed */}
      </UploadErrorBoundary>
    </Box>
  );
});

SurveyUpload.displayName = 'SurveyUpload';
