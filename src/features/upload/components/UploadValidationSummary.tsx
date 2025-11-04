/**
 * Upload Validation Summary
 * Shows validation results and allows user to confirm or cancel upload
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  AlertTitle,
  Divider,
  Grid,
  Card,
  CardContent,
  Tooltip
} from '@mui/material';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  DocumentTextIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';
import { UploadValidationSummary as ValidationSummary } from '../types/uploadStates';

interface UploadValidationSummaryProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  validationResults: ValidationSummary[];
  totalRows: number;
  estimatedTime: string;
}

export const UploadValidationSummary: React.FC<UploadValidationSummaryProps> = ({
  open,
  onClose,
  onConfirm,
  validationResults,
  totalRows,
  estimatedTime
}) => {
  const hasErrors = validationResults.some(result => !result.isValid);
  const hasWarnings = validationResults.some(result => result.warnings.length > 0);
  const hasDuplicates = validationResults.some(result => result.duplicateCheck?.isDuplicate);

  const getStatusIcon = (isValid: boolean, hasWarnings: boolean) => {
    if (!isValid) {
      return <XCircleIcon style={{ width: 20, height: 20, color: '#ef4444' }} />;
    }
    if (hasWarnings) {
      return <ExclamationTriangleIcon style={{ width: 20, height: 20, color: '#f59e0b' }} />;
    }
    return <CheckCircleIcon style={{ width: 20, height: 20, color: '#10b981' }} />;
  };

  const getStatusColor = (isValid: boolean, hasWarnings: boolean) => {
    if (!isValid) return 'error';
    if (hasWarnings) return 'warning';
    return 'success';
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '12px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DocumentTextIcon style={{ width: 24, height: 24 }} />
          <Typography variant="h6">
            Upload Validation Summary
          </Typography>
          {hasErrors && (
            <Chip label="Errors Found" color="error" size="small" />
          )}
          {!hasErrors && hasWarnings && (
            <Chip label="Warnings" color="warning" size="small" />
          )}
          {!hasErrors && !hasWarnings && (
            <Chip label="Ready to Upload" color="success" size="small" />
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Summary Stats */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <TableCellsIcon style={{ width: 32, height: 32, margin: '0 auto 8px', color: '#6366f1' }} />
                <Typography variant="h6">{validationResults.length}</Typography>
                <Typography variant="body2" color="text.secondary">Files</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <DocumentTextIcon style={{ width: 32, height: 32, margin: '0 auto 8px', color: '#10b981' }} />
                <Typography variant="h6">{totalRows.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">Total Rows</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6" sx={{ color: hasDuplicates ? '#f59e0b' : '#10b981' }}>
                  {hasDuplicates ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="body2" color="text.secondary">Duplicates</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h6">{estimatedTime}</Typography>
                <Typography variant="body2" color="text.secondary">Est. Time</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Alerts */}
        {hasErrors && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>Validation Errors</AlertTitle>
            <Typography variant="body2">
              Some files have validation errors and cannot be uploaded. Please fix these issues before proceeding.
            </Typography>
          </Alert>
        )}

        {!hasErrors && hasWarnings && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <AlertTitle>Validation Warnings</AlertTitle>
            <Typography variant="body2">
              Some files have warnings but can still be uploaded. Review the details below.
            </Typography>
          </Alert>
        )}

        {!hasErrors && !hasWarnings && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>Ready to Upload</AlertTitle>
            <Typography variant="body2">
              All files have passed validation and are ready to be uploaded.
            </Typography>
          </Alert>
        )}

        {/* File Details Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>File</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Rows</TableCell>
                <TableCell align="center">Columns</TableCell>
                <TableCell align="center">Duplicates</TableCell>
                <TableCell>Issues</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {validationResults.map((result, index) => {
                const statusColor = getStatusColor(result.isValid, result.warnings.length > 0);
                const hasDuplicates = result.duplicateCheck?.isDuplicate;
                
                return (
                  <TableRow key={index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(result.isValid, result.warnings.length > 0)}
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {result.fileName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={result.isValid ? 'Valid' : 'Invalid'} 
                        color={statusColor}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {result.rowCount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {result.columnCount}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {hasDuplicates ? (
                        <Chip 
                          label="Yes" 
                          color="warning" 
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ maxWidth: 300 }}>
                        {result.errors.length > 0 && (
                          <Box sx={{ mb: 1 }}>
                            {result.errors.slice(0, 2).map((error, i) => (
                              <Typography key={i} variant="caption" color="error" display="block">
                                • {error}
                              </Typography>
                            ))}
                            {result.errors.length > 2 && (
                              <Typography variant="caption" color="error">
                                • +{result.errors.length - 2} more errors
                              </Typography>
                            )}
                          </Box>
                        )}
                        {result.warnings.length > 0 && (
                          <Box>
                            {result.warnings.slice(0, 2).map((warning, i) => (
                              <Typography key={i} variant="caption" color="warning.main" display="block">
                                • {warning}
                              </Typography>
                            ))}
                            {result.warnings.length > 2 && (
                              <Typography variant="caption" color="warning.main">
                                • +{result.warnings.length - 2} more warnings
                              </Typography>
                            )}
                          </Box>
                        )}
                        {result.errors.length === 0 && result.warnings.length === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            No issues
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Sample Data Preview */}
        {validationResults.length > 0 && validationResults[0].sampleData.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Sample Data Preview
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200, overflowX: 'auto' }}>
              <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    {validationResults[0].detectedColumns.slice(0, 5).map((column, index) => (
                      <TableCell 
                        key={index}
                        sx={{ 
                          minWidth: column.toLowerCase().includes('specialty') ? 200 : 
                                   column.toLowerCase().includes('provider') ? 180 : 
                                   column.toLowerCase().includes('region') ? 150 : 100,
                          maxWidth: 250
                        }}
                      >
                        <Typography variant="caption" fontWeight="bold">
                          {column}
                        </Typography>
                      </TableCell>
                    ))}
                    {validationResults[0].detectedColumns.length > 5 && (
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          +{validationResults[0].detectedColumns.length - 5} more
                        </Typography>
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validationResults[0].sampleData.slice(0, 3).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {validationResults[0].detectedColumns.slice(0, 5).map((column, colIndex) => (
                        <TableCell key={colIndex}>
                          <Tooltip title={row[column] || '-'} placement="top" arrow>
                            <Typography 
                              variant="caption" 
                              noWrap 
                              sx={{ 
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                cursor: 'help'
                              }}
                            >
                              {row[column] || '-'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                      ))}
                      {validationResults[0].detectedColumns.length > 5 && (
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            ...
                          </Typography>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Duplicate Details */}
        {hasDuplicates && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'warning.main' }}>
              Duplicate Detection
            </Typography>
            {validationResults
              .filter(result => result.duplicateCheck?.isDuplicate)
              .map((result, index) => (
                <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    <strong>{result.fileName}</strong> may be similar to existing surveys:
                  </Typography>
                  {result.duplicateCheck?.similarSurveys.slice(0, 3).map((survey, i) => (
                    <Typography key={i} variant="caption" display="block" sx={{ mt: 0.5 }}>
                      • {survey.name} - {Math.round(survey.similarity * 100)}% similar
                    </Typography>
                  ))}
                </Alert>
              ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: '8px' }}
        >
          Cancel
        </Button>
        <Button 
          onClick={onConfirm}
          variant="contained"
          disabled={hasErrors}
          sx={{ borderRadius: '8px' }}
        >
          {hasErrors ? 'Fix Errors First' : 'Confirm Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
