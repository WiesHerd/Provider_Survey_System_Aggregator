/**
 * Upload Progress Dialog
 * Shows detailed progress for file uploads with step-by-step status
 */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { UploadStep, UploadTransaction, UPLOAD_STEP_MESSAGES } from '../types/uploadStates';

interface UploadProgressDialogProps {
  open: boolean;
  onClose: () => void;
  onCancel?: () => void;
  progress: {
    isUploading: boolean;
    step: UploadStep;
    progress: number;
    currentFile?: string;
    currentFileIndex: number;
    totalFiles: number;
    message: string;
    details?: string;
  };
  currentTransaction?: UploadTransaction;
  completedTransactions: UploadTransaction[];
  failedTransactions: UploadTransaction[];
}

const stepOrder: UploadStep[] = ['validating', 'parsing', 'saving', 'verifying', 'completed'];

const getStepIcon = (step: UploadStep, isActive: boolean, isCompleted: boolean, hasError: boolean) => {
  if (hasError) {
    return <XCircleIcon style={{ width: 20, height: 20, color: '#ef4444' }} />;
  }
  
  if (isCompleted) {
    return <CheckCircleIcon style={{ width: 20, height: 20, color: '#10b981' }} />;
  }
  
  if (isActive) {
    return <CircularProgress size={20} />;
  }
  
  return <ClockIcon style={{ width: 20, height: 20, color: '#6b7280' }} />;
};

const getStepColor = (step: UploadStep, isActive: boolean, isCompleted: boolean, hasError: boolean) => {
  if (hasError) return 'error';
  if (isCompleted) return 'success';
  if (isActive) return 'primary';
  return 'default';
};

export const UploadProgressDialog: React.FC<UploadProgressDialogProps> = ({
  open,
  onClose,
  onCancel,
  progress,
  currentTransaction,
  completedTransactions,
  failedTransactions
}) => {
  const { isUploading, step, progress: progressPercent, currentFile, currentFileIndex, totalFiles, message, details } = progress;
  
  const getStepStatus = (stepName: UploadStep) => {
    if (stepName === step) {
      return { isActive: true, isCompleted: false, hasError: false };
    }
    
    const stepIndex = stepOrder.indexOf(stepName);
    const currentStepIndex = stepOrder.indexOf(step);
    
    if (stepIndex < currentStepIndex) {
      return { isActive: false, isCompleted: true, hasError: false };
    }
    
    if (stepIndex > currentStepIndex) {
      return { isActive: false, isCompleted: false, hasError: false };
    }
    
    return { isActive: false, isCompleted: false, hasError: false };
  };

  const getTransactionStatus = (transaction: UploadTransaction) => {
    if (transaction.step === 'completed') {
      return { color: 'success' as const, icon: CheckCircleIcon };
    }
    
    if (transaction.step === 'error') {
      return { color: 'error' as const, icon: XCircleIcon };
    }
    
    return { color: 'default' as const, icon: ClockIcon };
  };

  const formatDuration = (startTime: number, endTime?: number) => {
    const duration = (endTime || Date.now()) - startTime;
    const seconds = Math.floor(duration / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const allTransactions = [...completedTransactions, ...failedTransactions];
  const hasErrors = failedTransactions.length > 0 || step === 'error';

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '12px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" component="div">
            Upload Progress
          </Typography>
          {isUploading && (
            <Chip 
              label="In Progress" 
              color="primary" 
              size="small"
              icon={<CircularProgress size={16} />}
            />
          )}
          {step === 'completed' && (
            <Chip 
              label="Completed" 
              color="success" 
              size="small"
              icon={<CheckCircleIcon style={{ width: 16, height: 16 }} />}
            />
          )}
          {hasErrors && (
            <Chip 
              label="Error" 
              color="error" 
              size="small"
              icon={<XCircleIcon style={{ width: 16, height: 16 }} />}
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Overall Progress */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {currentFile ? `Processing ${currentFile}` : 'Preparing upload...'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentFileIndex + 1} of {totalFiles} files
            </Typography>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={progressPercent} 
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4
              }
            }}
          />
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {message}
          </Typography>
          
          {details && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {details}
            </Typography>
          )}
        </Box>

        {/* Step Progress */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Upload Steps
          </Typography>
          
          <Stepper activeStep={stepOrder.indexOf(step)} orientation="vertical">
            {stepOrder.map((stepName, index) => {
              const { isActive, isCompleted, hasError } = getStepStatus(stepName);
              const stepColor = getStepColor(stepName, isActive, isCompleted, hasError);
              
              return (
                <Step key={stepName}>
                  <StepLabel
                    StepIconComponent={() => getStepIcon(stepName, isActive, isCompleted, hasError)}
                    sx={{
                      '& .MuiStepLabel-label': {
                        color: stepColor === 'error' ? 'error.main' : 
                               stepColor === 'success' ? 'success.main' : 
                               stepColor === 'primary' ? 'primary.main' : 'text.secondary'
                      }
                    }}
                  >
                    {UPLOAD_STEP_MESSAGES[stepName]}
                  </StepLabel>
                  <StepContent>
                    {isActive && (
                      <Box sx={{ pl: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          {message}
                        </Typography>
                        {details && (
                          <Typography variant="caption" color="text.secondary">
                            {details}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </StepContent>
                </Step>
              );
            })}
          </Stepper>
        </Box>

        {/* File Status */}
        {allTransactions.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              File Status
            </Typography>
            
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {allTransactions.map((transaction) => {
                const { color, icon: IconComponent } = getTransactionStatus(transaction);
                
                return (
                  <Box 
                    key={transaction.id}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2, 
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      backgroundColor: color === 'success' ? 'success.50' : 
                                    color === 'error' ? 'error.50' : 'background.paper'
                    }}
                  >
                    <IconComponent style={{ width: 20, height: 20 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {transaction.fileName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDuration(transaction.startTime, transaction.endTime)}
                      </Typography>
                    </Box>
                    <Chip 
                      label={transaction.step} 
                      size="small" 
                      color={color}
                      variant="outlined"
                    />
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Error Display */}
        {hasErrors && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {failedTransactions.length > 0 
                ? `${failedTransactions.length} file(s) failed to upload`
                : 'Upload failed'
              }
            </Typography>
            {failedTransactions.map((transaction) => (
              <Typography key={transaction.id} variant="caption" display="block" sx={{ mt: 1 }}>
                <strong>{transaction.fileName}:</strong> {transaction.error?.message}
              </Typography>
            ))}
          </Alert>
        )}

        {/* Success Message */}
        {step === 'completed' && completedTransactions.length > 0 && (
          <Alert severity="success">
            <Typography variant="body2">
              Successfully uploaded {completedTransactions.length} file(s)
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        {isUploading && onCancel && (
          <Button 
            onClick={onCancel}
            color="error"
            variant="outlined"
            sx={{ borderRadius: '8px' }}
          >
            Cancel Upload
          </Button>
        )}
        
        <Button 
          onClick={onClose}
          variant={isUploading ? "outlined" : "contained"}
          sx={{ borderRadius: '8px' }}
        >
          {isUploading ? 'Hide' : 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
