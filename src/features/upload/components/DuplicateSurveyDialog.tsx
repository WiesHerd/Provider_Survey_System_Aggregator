/**
 * Duplicate Survey Dialog Component
 *
 * Enterprise-grade implementation following Material Design 3 and Fluent UI patterns
 * - Simple, focused content
 * - Clear action hierarchy
 * - Minimal decoration
 * - Standard spacing (16px/24px)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  Typography,
  Box,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  Divider
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
  const [selectedAction, setSelectedAction] = useState<'replace' | 'keep'>('replace');
  const [showDetails, setShowDetails] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const existingSurvey = duplicateResult.exactMatch?.survey || duplicateResult.contentMatch?.survey || duplicateResult.similarSurveys[0]?.survey;

  // Focus management: Material Design 3 pattern - focus first focusable element
  useEffect(() => {
    if (open && selectedAction === 'keep' && renameInputRef.current) {
      setTimeout(() => renameInputRef.current?.focus(), 100);
    }
  }, [open, selectedAction]);

  if (!existingSurvey) {
    return null;
  }

  const handleConfirm = () => {
    if (selectedAction === 'replace') {
      onResolve('replace');
    } else if (renameLabel.trim()) {
      onResolve('rename', renameLabel.trim());
    }
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Unknown';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      title="Duplicate survey detected"
      subtitle="A survey with matching information already exists in your database."
      icon={
        <ExclamationTriangleIcon
          className="h-5 w-5"
          style={{ color: '#f59e0b' }}
        />
      }
      contentClassName="p-6"
      actions={
        <>
          <Button
            onClick={onClose}
            variant="text"
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              color: '#5f6368',
              px: 2,
              minWidth: 'auto'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={selectedAction === 'keep' && !renameLabel.trim()}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              px: 3,
              minWidth: 'auto',
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none'
              }
            }}
          >
            Continue
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Main content - Material Design 3: Simple, focused */}
        <Typography 
          variant="body1" 
          sx={{ 
            color: '#202124',
            fontSize: '0.9375rem',
            lineHeight: 1.5
          }}
        >
          Choose how to proceed with this duplicate survey.
        </Typography>

        {/* Options - Fluent UI: Simple radio group, minimal decoration */}
        <RadioGroup
          value={selectedAction}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedAction(e.target.value as 'replace' | 'keep')}
          sx={{ gap: 0 }}
        >
          {/* Replace option */}
          <FormControlLabel
            value="replace"
            control={
              <Radio 
                sx={{
                  color: '#5f6368',
                  '&.Mui-checked': {
                    color: '#1976d2'
                  }
                }}
              />
            }
            label={
              <Box>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 400,
                    color: '#202124',
                    fontSize: '0.9375rem',
                    mb: 0.5
                  }}
                >
                  Replace existing survey
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#5f6368',
                    fontSize: '0.8125rem',
                    lineHeight: 1.4
                  }}
                >
                  Permanently replace the existing survey with this upload.
                </Typography>
              </Box>
            }
            sx={{
              alignItems: 'flex-start',
              m: 0,
              py: 1.5,
              px: 0,
              '&:hover': {
                backgroundColor: 'transparent'
              }
            }}
          />

          {/* Keep both option */}
          <FormControlLabel
            value="keep"
            control={
              <Radio 
                sx={{
                  color: '#5f6368',
                  '&.Mui-checked': {
                    color: '#1976d2'
                  }
                }}
              />
            }
            label={
              <Box sx={{ width: '100%' }}>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 400,
                    color: '#202124',
                    fontSize: '0.9375rem',
                    mb: 1
                  }}
                >
                  Keep both surveys
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#5f6368',
                    fontSize: '0.8125rem',
                    mb: 1.5,
                    lineHeight: 1.4
                  }}
                >
                  Add a label to distinguish this survey from the existing one.
                </Typography>
                <TextField
                  inputRef={renameInputRef}
                  fullWidth
                  size="small"
                  placeholder="Enter label (optional)"
                  value={renameLabel}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameLabel(e.target.value)}
                  disabled={selectedAction !== 'keep'}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontSize: '0.875rem',
                      '& fieldset': {
                        borderColor: '#dadce0'
                      },
                      '&:hover fieldset': {
                        borderColor: '#dadce0'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1976d2'
                      },
                      '&.Mui-disabled': {
                        backgroundColor: '#f5f5f5'
                      }
                    }
                  }}
                />
              </Box>
            }
            sx={{
              alignItems: 'flex-start',
              m: 0,
              py: 1.5,
              px: 0,
              '&:hover': {
                backgroundColor: 'transparent'
              }
            }}
          />
        </RadioGroup>

        {/* Details section - Material Design 3: Progressive disclosure */}
        {showDetails && (
          <Box sx={{ pt: 2, borderTop: '1px solid #e8eaed' }}>
            <Box sx={{ mb: 2 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#5f6368',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 1,
                  display: 'block'
                }}
              >
                Existing survey
              </Typography>
              <Typography variant="body2" sx={{ color: '#202124', mb: 0.5, fontSize: '0.875rem' }}>
                {existingSurvey.name || 'N/A'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#5f6368', fontSize: '0.75rem' }}>
                Uploaded {formatDate(existingSurvey.uploadDate)}
              </Typography>
            </Box>
            <Box>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#5f6368',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 1,
                  display: 'block'
                }}
              >
                New upload
              </Typography>
              <Typography variant="body2" sx={{ color: '#202124', mb: 0.5, fontSize: '0.875rem' }}>
                {newSurveyMetadata.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#5f6368', fontSize: '0.75rem' }}>
                {newSurveyMetadata.source} • {newSurveyMetadata.year}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Toggle details - Material Design 3: Text button pattern */}
        <Button
          onClick={() => setShowDetails(!showDetails)}
          variant="text"
          size="small"
          sx={{ 
            textTransform: 'none', 
            px: 0, 
            alignSelf: 'flex-start',
            color: '#1976d2',
            fontSize: '0.875rem',
            fontWeight: 500,
            minHeight: 'auto',
            py: 0.5,
            '&:hover': {
              backgroundColor: 'transparent',
              textDecoration: 'underline'
            }
          }}
          endIcon={showDetails ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </Button>
      </Box>
    </StandardDialog>
  );
};
