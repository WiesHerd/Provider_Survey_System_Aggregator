/**
 * Validation Banner Component
 * Displays inline validation summary below upload zone with collapsible details
 */

import React, { useState, memo, useMemo } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { CompleteValidationResult, ValidationIssue } from '../types/validation';

export interface ValidationBannerProps {
  validationResult: CompleteValidationResult | null;
  onDismiss?: () => void;
  collapsible?: boolean;
}

/**
 * Validation Banner component for displaying validation results
 * 
 * @param validationResult - Complete validation result from validation engine
 * @param onDismiss - Optional callback when banner is dismissed
 * @param collapsible - Whether the banner details can be collapsed
 */
export const ValidationBanner: React.FC<ValidationBannerProps> = memo(({
  validationResult,
  onDismiss,
  collapsible = true
}) => {
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const summary = useMemo(() => {
    if (!validationResult) return null;

    const { errorCount, warningCount, infoCount, totalIssues } = validationResult;
    
    if (totalIssues === 0) {
      return {
        severity: 'success' as const,
        title: 'File validation passed',
        message: 'Your file has been validated and is ready to upload.',
        color: '#10b981'
      };
    }

    const parts: string[] = [];
    if (errorCount > 0) parts.push(`${errorCount} critical error${errorCount > 1 ? 's' : ''}`);
    if (warningCount > 0) parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
    if (infoCount > 0) parts.push(`${infoCount} issue${infoCount > 1 ? 's' : ''}`);

    const summaryMessage = `${totalIssues} issue${totalIssues > 1 ? 's' : ''} found: ${parts.join(', ')}`;

    if (errorCount > 0) {
      return {
        severity: 'error' as const,
        title: 'Validation Errors Found',
        message: summaryMessage,
        color: '#ef4444'
      };
    } else if (warningCount > 0) {
      return {
        severity: 'warning' as const,
        title: 'Validation Warnings',
        message: summaryMessage,
        color: '#f59e0b'
      };
    } else {
      return {
        severity: 'info' as const,
        title: 'Validation Information',
        message: summaryMessage,
        color: '#3b82f6'
      };
    }
  }, [validationResult]);

  if (!validationResult || !summary || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  const renderIssue = (issue: ValidationIssue, index: number) => {
    const locationText = issue.cellLocation
      ? `Row ${issue.cellLocation.row + 1}, Column ${issue.cellLocation.column + 1}`
      : issue.affectedRows && issue.affectedRows.length > 0
      ? `Rows: ${issue.affectedRows.slice(0, 5).join(', ')}${issue.affectedRows.length > 5 ? ` (+${issue.affectedRows.length - 5} more)` : ''}`
      : '';

    return (
      <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', mb: 0.5 }}>
          {issue.severity === 'critical' && (
            <ExclamationTriangleIcon style={{ width: 16, height: 16, color: '#ef4444' }} />
          )}
          {issue.severity === 'warning' && (
            <ExclamationTriangleIcon style={{ width: 16, height: 16, color: '#f59e0b' }} />
          )}
          {issue.severity === 'info' && (
            <InformationCircleIcon style={{ width: 16, height: 16, color: '#3b82f6' }} />
          )}
          <Typography variant="body2" sx={{ flex: 1 }}>
            {issue.message}
          </Typography>
        </Box>
        {locationText && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
            {locationText}
          </Typography>
        )}
        {issue.fixInstructions && issue.fixInstructions.length > 0 && (
          <Box sx={{ ml: 3, mt: 0.5 }}>
            {issue.fixInstructions.map((instruction, i) => (
              <Typography key={i} variant="caption" color="text.secondary" display="block">
                • {instruction}
              </Typography>
            ))}
          </Box>
        )}
      </ListItem>
    );
  };

  return (
    <Alert
      severity={summary.severity}
      sx={{
        borderRadius: '8px',
        mb: 2,
        '& .MuiAlert-icon': {
          alignItems: 'flex-start',
          pt: 0.5
        }
      }}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {collapsible && (
            <IconButton
              size="small"
              onClick={handleToggleExpand}
              sx={{ color: 'inherit' }}
            >
              {expanded ? (
                <ChevronUpIcon style={{ width: 20, height: 20 }} />
              ) : (
                <ChevronDownIcon style={{ width: 20, height: 20 }} />
              )}
            </IconButton>
          )}
          {onDismiss && (
            <IconButton
              size="small"
              onClick={handleDismiss}
              sx={{ color: 'inherit' }}
            >
              <XMarkIcon style={{ width: 20, height: 20 }} />
            </IconButton>
          )}
        </Box>
      }
    >
      <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {summary.title}
        {validationResult.errorCount > 0 && (
          <Chip
            label={`${validationResult.errorCount} Error${validationResult.errorCount > 1 ? 's' : ''}`}
            size="small"
            color="error"
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        )}
        {validationResult.warningCount > 0 && (
          <Chip
            label={`${validationResult.warningCount} Warning${validationResult.warningCount > 1 ? 's' : ''}`}
            size="small"
            color="warning"
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        )}
        {validationResult.infoCount > 0 && (
          <Chip
            label={`${validationResult.infoCount} Info`}
            size="small"
            sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#3b82f6', color: 'white' }}
          />
        )}
      </AlertTitle>
      
      <Typography variant="body2" sx={{ mb: expanded ? 1 : 0 }}>
        {summary.message}
      </Typography>

      {!validationResult.canProceed && (
        <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
          ⚠️ Please fix the errors above before uploading.
        </Typography>
      )}

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          {validationResult.tier1.errors.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#ef4444' }}>
                Critical Errors (Must Fix)
              </Typography>
              <List dense sx={{ bgcolor: 'rgba(239, 68, 68, 0.05)', borderRadius: '4px', p: 1 }}>
                {validationResult.tier1.errors.map((issue, index) => renderIssue(issue, index))}
              </List>
            </Box>
          )}

          {validationResult.tier2.warnings.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#f59e0b' }}>
                Warnings (Review Recommended)
              </Typography>
              <List dense sx={{ bgcolor: 'rgba(245, 158, 11, 0.05)', borderRadius: '4px', p: 1 }}>
                {validationResult.tier2.warnings.map((issue, index) => renderIssue(issue, index))}
              </List>
            </Box>
          )}

          {validationResult.tier3.info.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#3b82f6' }}>
                Information (Visual Highlighting)
              </Typography>
              <List dense sx={{ bgcolor: 'rgba(59, 130, 246, 0.05)', borderRadius: '4px', p: 1 }}>
                {validationResult.tier3.info.map((issue, index) => renderIssue(issue, index))}
              </List>
            </Box>
          )}
        </Box>
      </Collapse>
    </Alert>
  );
});

ValidationBanner.displayName = 'ValidationBanner';

