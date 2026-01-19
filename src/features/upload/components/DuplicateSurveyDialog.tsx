/**
 * Duplicate Survey Dialog Component
 *
 * Clean, minimal dialog for handling duplicate survey detection.
 * Designed for a lightweight, Apple-like experience with clear choices.
 */

import React, { useState } from 'react';
import {
  Button,
  Typography,
  Box,
  Alert,
  TextField,
  Paper,
  Divider,
  Collapse,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import {
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { DuplicateCheckResult } from '../../../services/DuplicateDetectionService';
import { StandardDialog } from '../../../shared/components';

export type DuplicateResolutionAction = 'cancel' | 'replace' | 'rename' | 'upload-anyway';

export interface DuplicateSurveyDialogProps {
  open: boolean;
  onClose: () => void;
  onResolve: (action: DuplicateResolutionAction, newLabel?: string) => void;
  onShowExisting?: (survey: {
    year?: string;
    providerType?: string;
    dataCategory?: string;
    name?: string;
    type?: string;
  }) => void;
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
  onShowExisting,
  duplicateResult,
  newSurveyMetadata
}) => {
  const [renameLabel, setRenameLabel] = useState(newSurveyMetadata.surveyLabel || '');
  const [selectedAction, setSelectedAction] = useState<'keep' | 'replace'>('keep');
  const [showDetails, setShowDetails] = useState(false);

  const existingSurvey = duplicateResult.exactMatch?.survey || duplicateResult.contentMatch?.survey || duplicateResult.similarSurveys[0]?.survey;

  if (!existingSurvey) {
    return null;
  }

  const handleRename = () => {
    if (renameLabel.trim()) {
      onResolve('rename', renameLabel.trim());
    }
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
    <StandardDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      title="Duplicate survey detected"
      subtitle={getMatchTypeDescription()}
      icon={
        <ExclamationTriangleIcon
          className="h-6 w-6"
          style={{ color: '#d97706' }} // amber-600
        />
      }
      contentClassName="p-6 bg-white"
      actions={
        <>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 500,
              borderColor: '#d1d5db',
              color: '#374151',
              backgroundColor: 'white',
              '&:hover': {
                borderColor: '#9ca3af',
                backgroundColor: '#f9fafb'
              }
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={() => {
              if (selectedAction === 'replace') {
                onResolve('replace');
                return;
              }
              handleRename();
            }}
            variant="contained"
            color="primary"
            disabled={selectedAction === 'keep' && !renameLabel.trim()}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 160,
            }}
          >
            {selectedAction === 'replace' ? 'Replace existing' : 'Keep both'}
          </Button>
        </>
      }
    >
      <Paper
        variant="outlined"
        sx={{
          mb: 3,
          borderRadius: '14px',
          borderColor: '#e5e7eb',
          backgroundColor: '#f7f7f8',
          p: 2.25,
        }}
      >
        <Typography variant="body2" sx={{ color: '#111827', fontWeight: 500 }}>
          This file matches an existing survey. Choose how you want to proceed.
        </Typography>
        {onShowExisting && (
          <Button
            onClick={() => onShowExisting({
              year: String(existingSurvey.year || existingSurvey.surveyYear || ''),
              providerType: existingSurvey.providerType,
              dataCategory: existingSurvey.dataCategory,
              name: existingSurvey.name,
              type: existingSurvey.type
            })}
            size="small"
            variant="text"
            sx={{
              mt: 1,
              textTransform: 'none',
              px: 0,
              fontWeight: 600,
              color: '#4b5563',
              '&:hover': { backgroundColor: 'transparent', color: '#111827' }
            }}
          >
            Show me this survey
          </Button>
        )}
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: '14px',
            borderColor: selectedAction === 'keep' ? '#6366f1' : '#e5e7eb',
            backgroundColor: selectedAction === 'keep' ? '#f5f3ff' : 'white',
            boxShadow: selectedAction === 'keep' ? '0 6px 16px rgba(17, 24, 39, 0.08)' : 'none',
            transition: 'all 120ms ease'
          }}
        >
          <RadioGroup
            value={selectedAction}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSelectedAction(event.target.value as 'keep' | 'replace')
            }
          >
            <FormControlLabel
              value="keep"
              control={
                <Radio
                  sx={{
                    color: '#9ca3af',
                    '&.Mui-checked': { color: '#6366f1' }
                  }}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827' }}>
                    Keep both
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add a label so you can tell the surveys apart.
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter label (e.g., Pediatrics, Q1 2025)"
            value={renameLabel}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameLabel(e.target.value)}
            sx={{
              mt: 1.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px',
                backgroundColor: '#ffffff',
              },
            }}
            disabled={selectedAction !== 'keep'}
          />
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: '14px',
            borderColor: selectedAction === 'replace' ? '#6366f1' : '#e5e7eb',
            backgroundColor: selectedAction === 'replace' ? '#f5f3ff' : 'white',
            boxShadow: selectedAction === 'replace' ? '0 6px 16px rgba(17, 24, 39, 0.08)' : 'none',
            transition: 'all 120ms ease'
          }}
        >
          <RadioGroup
            value={selectedAction}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSelectedAction(event.target.value as 'keep' | 'replace')
            }
          >
            <FormControlLabel
              value="replace"
              control={
                <Radio
                  sx={{
                    color: '#9ca3af',
                    '&.Mui-checked': { color: '#6366f1' }
                  }}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#111827' }}>
                    Replace existing
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    The old survey will be overwritten with this upload.
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </Paper>
      </Box>

      <Divider sx={{ my: 3, borderColor: '#f3f4f6' }} />

      <Button
        onClick={() => setShowDetails(!showDetails)}
        variant="text"
        color="inherit"
        sx={{ textTransform: 'none', px: 0, color: '#4b5563', fontWeight: 600 }}
        endIcon={showDetails ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
      >
        {showDetails ? 'Hide details' : 'Show details'}
      </Button>

      <Collapse in={showDetails}>
        <Box sx={{ mt: 2 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: '14px',
              borderColor: '#e5e7eb',
              backgroundColor: '#fafafa',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Existing survey
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {existingSurvey.name || 'N/A'} • {existingSurvey.source || existingSurvey.type || 'N/A'} • {existingSurvey.dataCategory || 'N/A'} • {existingSurvey.providerType || 'N/A'} • {existingSurvey.year || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Uploaded {formatDate(existingSurvey.uploadDate)} • Rows: {existingSurvey.rowCount || existingSurvey.metadata?.totalRows || 'N/A'}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              New upload
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {newSurveyMetadata.name} • {newSurveyMetadata.source} • {newSurveyMetadata.dataCategory} • {newSurveyMetadata.providerType} • {newSurveyMetadata.year}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Rows: {newSurveyMetadata.rowCount || 'N/A'}
            </Typography>
          </Paper>

          <Alert
            severity="info"
            sx={{
              mt: 2,
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'info.light',
              backgroundColor: '#f8fafc'
            }}
          >
            <Typography variant="body2">
              If you don’t see the existing survey in your list, check your filters (year, provider type, or data category).
            </Typography>
          </Alert>
        </Box>
      </Collapse>
    </StandardDialog>
  );
};
