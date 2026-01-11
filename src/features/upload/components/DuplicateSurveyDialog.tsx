/**
 * Duplicate Survey Dialog Component
 * 
 * Enterprise-grade dialog for handling duplicate survey detection.
 * Provides clear comparison and multiple resolution options following
 * Google Drive, Microsoft OneDrive, and Amazon S3 patterns.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  TextField,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Paper
} from '@mui/material';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { DuplicateCheckResult } from '../../../services/DuplicateDetectionService';

export type DuplicateResolutionAction = 'cancel' | 'replace' | 'rename' | 'upload-anyway';

export interface DuplicateSurveyDialogProps {
  open: boolean;
  onClose: () => void;
  onResolve: (action: DuplicateResolutionAction, newLabel?: string) => void;
  duplicateResult: DuplicateCheckResult;
  newSurveyMetadata: {
    name: string;
    source: string;
    dataCategory: string;
    providerType: string;
    year: string;
    surveyLabel?: string;
    rowCount?: number;
  };
}

export const DuplicateSurveyDialog: React.FC<DuplicateSurveyDialogProps> = ({
  open,
  onClose,
  onResolve,
  duplicateResult,
  newSurveyMetadata
}) => {
  const [renameLabel, setRenameLabel] = useState(newSurveyMetadata.surveyLabel || '');
  const [showUploadAnywayConfirm, setShowUploadAnywayConfirm] = useState(false);

  const existingSurvey = duplicateResult.exactMatch?.survey || duplicateResult.contentMatch?.survey || duplicateResult.similarSurveys[0]?.survey;

  if (!existingSurvey) {
    return null;
  }

  const handleRename = () => {
    if (renameLabel.trim()) {
      onResolve('rename', renameLabel.trim());
    }
  };

  const handleUploadAnyway = () => {
    if (!showUploadAnywayConfirm) {
      setShowUploadAnywayConfirm(true);
      return;
    }
    onResolve('upload-anyway');
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Unknown';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMatchTypeDescription = (): string => {
    switch (duplicateResult.matchType) {
      case 'exact':
        return 'An exact duplicate survey already exists with the same source, category, provider type, year, and label.';
      case 'content':
        return 'A survey with identical file content already exists.';
      case 'similar':
        return 'Similar surveys were found that may be duplicates.';
      default:
        return 'A potential duplicate survey was detected.';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: 'warning.light',
              color: 'warning.main'
            }}
          >
            <ExclamationTriangleIcon className="h-6 w-6" />
          </Box>
          <Typography variant="h6" component="div">
            Duplicate Survey Detected
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          {getMatchTypeDescription()}
        </Alert>

        {/* Comparison Table */}
        <Paper variant="outlined" sx={{ mb: 3 }}>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>Survey Name</TableCell>
                <TableCell>{existingSurvey.name || 'N/A'}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{newSurveyMetadata.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Source</TableCell>
                <TableCell>{existingSurvey.source || existingSurvey.type || 'N/A'}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{newSurveyMetadata.source}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Data Category</TableCell>
                <TableCell>{existingSurvey.dataCategory || 'N/A'}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{newSurveyMetadata.dataCategory}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Provider Type</TableCell>
                <TableCell>{existingSurvey.providerType || 'N/A'}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{newSurveyMetadata.providerType}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Year</TableCell>
                <TableCell>{existingSurvey.year || 'N/A'}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{newSurveyMetadata.year}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Label</TableCell>
                <TableCell>{existingSurvey.surveyLabel || existingSurvey.metadata?.surveyLabel || 'None'}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{newSurveyMetadata.surveyLabel || 'None'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Upload Date</TableCell>
                <TableCell>{formatDate(existingSurvey.uploadDate)}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>Now</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Row Count</TableCell>
                <TableCell>{existingSurvey.rowCount || existingSurvey.metadata?.totalRows || 'N/A'}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{newSurveyMetadata.rowCount || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Specialties</TableCell>
                <TableCell>{existingSurvey.specialtyCount || existingSurvey.metadata?.uniqueSpecialties || 'N/A'}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>—</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>

        {/* Rename Option */}
        {!showUploadAnywayConfirm && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              To differentiate this survey, you can add a label:
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="e.g., Pediatrics, Adult Medicine, Q1 2024"
              value={renameLabel}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameLabel(e.target.value)}
              sx={{ mt: 1 }}
            />
          </Box>
        )}

        {/* Upload Anyway Confirmation */}
        {showUploadAnywayConfirm && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Warning: This will create a duplicate survey
            </Typography>
            <Typography variant="body2">
              You are about to upload a survey that already exists. This may cause confusion in your analytics and reports.
              Are you sure you want to proceed?
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          color="inherit"
        >
          Cancel
        </Button>

        {!showUploadAnywayConfirm && (
          <>
            <Button
              onClick={() => onResolve('replace')}
              variant="contained"
              color="primary"
              sx={{ minWidth: 100 }}
            >
              Replace
            </Button>

            <Button
              onClick={handleRename}
              variant="contained"
              color="secondary"
              disabled={!renameLabel.trim()}
              sx={{ minWidth: 100 }}
            >
              Rename
            </Button>

            <Button
              onClick={handleUploadAnyway}
              variant="text"
              color="warning"
            >
              Upload Anyway
            </Button>
          </>
        )}

        {showUploadAnywayConfirm && (
          <>
            <Button
              onClick={() => setShowUploadAnywayConfirm(false)}
              variant="outlined"
              color="inherit"
            >
              Go Back
            </Button>
            <Button
              onClick={() => onResolve('upload-anyway')}
              variant="contained"
              color="error"
            >
              Yes, Upload Anyway
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
