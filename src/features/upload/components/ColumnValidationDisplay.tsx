/**
 * Modern, Minimal Validation Display Component
 * 
 * Clean, dismissible validation feedback inspired by Google/Microsoft design patterns
 * - Minimal real estate footprint
 * - Dismissible and collapsible
 * - Simple, user-friendly language
 * - No technical jargon
 */

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Typography,
  Chip,
  Collapse,
  IconButton,
  Button
} from '@mui/material';
import {
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { ColumnValidationResult } from '../utils/uploadCalculations';
import { FormatDetectionResult } from '../utils/formatDetection';
import { ValidationError } from '../utils/preUploadValidation';

interface ColumnValidationDisplayProps {
  validation: ColumnValidationResult;
  fileName: string;
  formatDetection?: FormatDetectionResult;
  expectedFormat?: 'normalized' | 'wide' | 'wide_variable';
  surveySource?: string;
  preUploadErrors?: ValidationError[];
  preUploadWarnings?: ValidationError[];
  preUploadInfo?: ValidationError[];
  dataValidationErrors?: ValidationError[];
  dataValidationWarnings?: ValidationError[];
  onDownloadSample?: (format: string) => void;
}

/**
 * Modern validation display - minimal, dismissible, user-friendly
 */
export const ColumnValidationDisplay: React.FC<ColumnValidationDisplayProps> = ({
  validation,
  fileName,
  formatDetection,
  expectedFormat,
  surveySource,
  preUploadErrors = [],
  preUploadWarnings = [],
  preUploadInfo = [],
  dataValidationErrors = [],
  dataValidationWarnings = [],
  onDownloadSample
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Combine all errors by severity
  const allCriticalErrors = [
    ...preUploadErrors.filter(e => e.severity === 'critical'),
    ...validation.errors.map(msg => ({
      severity: 'critical' as const,
      category: 'format' as const,
      message: msg,
      fixInstructions: [],
      affectedRows: undefined,
      affectedColumns: undefined
    })),
    ...dataValidationErrors.filter(e => e.severity === 'critical')
  ];

  const allWarnings = [
    ...preUploadWarnings,
    ...preUploadErrors.filter(e => e.severity === 'warning'),
    ...dataValidationWarnings
  ];

  // Group warnings by type for compact display
  const groupWarningsByType = (warnings: ValidationError[]) => {
    const grouped = new Map<string, { count: number; examples: string[]; fixInstructions: string[] }>();
    
    warnings.forEach(warning => {
      // Use the full message as-is for provider type warnings (they're already user-friendly)
      // For other warnings, extract the main message
      let mainMessage = warning.message;
      
      // If message contains "Found provider type" or similar, keep it as-is
      if (warning.message.includes('Found provider type') || warning.message.includes('Use:')) {
        mainMessage = warning.message;
      } else {
        // Extract the main message (remove row/column details)
        mainMessage = warning.message.split(':')[0].trim();
      }
      
      if (!grouped.has(mainMessage)) {
        grouped.set(mainMessage, { count: 0, examples: [], fixInstructions: warning.fixInstructions || [] });
      }
      
      const group = grouped.get(mainMessage)!;
      group.count++;
      
      // Extract example value if available
      const valueMatch = warning.message.match(/value "([^"]+)"/);
      if (valueMatch && group.examples.length < 3) {
        group.examples.push(valueMatch[1]);
      }
      
      // Extract provider types from message
      const providerTypeMatch = warning.message.match(/Found provider type\(s\): ([^.]+)/);
      if (providerTypeMatch && group.examples.length < 3) {
        const types = providerTypeMatch[1].split(',').map(t => t.trim());
        group.examples.push(...types.slice(0, 3));
      }
    });
    
    return Array.from(grouped.entries()).map(([message, data]) => ({
      message,
      count: data.count,
      examples: data.examples,
      fixInstructions: data.fixInstructions
    }));
  };

  const groupedWarnings = groupWarningsByType(allWarnings);
  const totalIssues = allCriticalErrors.length + allWarnings.length;

  // If dismissed, don't show anything
  if (isDismissed) {
    return null;
  }

  // If everything is valid, don't show this component
  // The ValidationBanner component handles the success message
  const isTrulyReady = validation.isValid && allCriticalErrors.length === 0 && allWarnings.length === 0;
  if (isTrulyReady) {
    return null;
  }

  // Determine severity
  const hasErrors = allCriticalErrors.length > 0;
  const severity = hasErrors ? 'error' : 'warning';

  // Get simple, user-friendly message
  const getMainMessage = () => {
    if (hasErrors) {
      return `${allCriticalErrors.length} error${allCriticalErrors.length > 1 ? 's' : ''} found`;
    }
    if (allWarnings.length > 0) {
      return `${allWarnings.length} warning${allWarnings.length > 1 ? 's' : ''} found`;
    }
    return 'File has validation issues';
  };

  // Get summary of issues
  const getIssueSummary = () => {
    if (hasErrors) {
      return 'Please fix errors before uploading';
    }
    if (allWarnings.length > 0) {
      return 'You can upload, but review recommended';
    }
    return '';
  };

  return (
    <Alert 
      severity={severity}
      icon={hasErrors ? <XCircleIcon className="h-5 w-5" /> : <ExclamationTriangleIcon className="h-5 w-5" />}
      sx={{ 
        mt: 2,
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {totalIssues > 0 && (
            <Chip 
              label={totalIssues} 
              size="small" 
              color={severity}
              sx={{ height: 20, fontSize: '0.75rem' }}
            />
          )}
          <IconButton
            size="small"
            onClick={() => setIsDismissed(true)}
            sx={{ 
              color: 'inherit',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
            }}
          >
            <XMarkIcon className="h-4 w-4" />
          </IconButton>
        </Box>
      }
    >
      <Box sx={{ width: '100%' }}>
        {/* Main Message */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: totalIssues > 0 ? 1 : 0 }}>
          <Typography variant="body2" fontWeight="medium">
            {getMainMessage()}
          </Typography>
        </Box>

        {/* Issue Summary */}
        {getIssueSummary() && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {getIssueSummary()}
          </Typography>
        )}

        {/* Expandable Details */}
        {totalIssues > 0 && (
          <>
            <Button
              size="small"
              onClick={() => setIsExpanded(!isExpanded)}
              sx={{ 
                mt: 1, 
                p: 0, 
                minWidth: 'auto',
                textTransform: 'none',
                fontSize: '0.75rem',
                color: 'inherit'
              }}
              endIcon={isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
            >
              {isExpanded ? 'Hide details' : 'Show details'}
            </Button>

            <Collapse in={isExpanded}>
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                {/* Critical Errors */}
                {allCriticalErrors.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" fontWeight="medium" color="error" sx={{ display: 'block', mb: 1 }}>
                      Errors ({allCriticalErrors.length})
                    </Typography>
                    {allCriticalErrors.slice(0, 5).map((error, idx) => (
                      <Typography 
                        key={idx} 
                        variant="caption" 
                        sx={{ display: 'block', mb: 0.5, pl: 1 }}
                      >
                        • {error.message}
                      </Typography>
                    ))}
                    {allCriticalErrors.length > 5 && (
                      <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                        ... and {allCriticalErrors.length - 5} more
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Warnings */}
                {groupedWarnings.length > 0 && (
                  <Box>
                    <Typography variant="caption" fontWeight="medium" color="warning.main" sx={{ display: 'block', mb: 1 }}>
                      Warnings ({allWarnings.length})
                    </Typography>
                    {groupedWarnings.slice(0, 5).map((group, idx) => (
                      <Box key={idx} sx={{ mb: 1, pl: 1 }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 'medium' }}>
                          • {group.message}
                          {group.count > 1 && (
                            <Chip 
                              label={group.count} 
                              size="small" 
                              sx={{ 
                                ml: 0.5, 
                                height: 16, 
                                fontSize: '0.65rem',
                                '& .MuiChip-label': { px: 0.5 }
                              }} 
                            />
                          )}
                        </Typography>
                        {group.fixInstructions.length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ pl: 1, fontSize: '0.7rem', display: 'block', mt: 0.5 }}>
                            {group.fixInstructions[0]}
                          </Typography>
                        )}
                        {group.examples.length > 0 && group.examples.length <= 5 && (
                          <Typography variant="caption" color="text.secondary" sx={{ pl: 1, fontSize: '0.7rem', display: 'block', mt: 0.5 }}>
                            Found: {group.examples.join(', ')}
                          </Typography>
                        )}
                      </Box>
                    ))}
                    {groupedWarnings.length > 5 && (
                      <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                        ... and {groupedWarnings.length - 5} more warning types
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Collapse>
          </>
        )}
      </Box>
    </Alert>
  );
};
