/**
 * Encoding Warning Component
 * Displays encoding issues detected during file upload
 * Non-blocking component that provides user feedback
 */

import React, { memo } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography,
  Collapse,
  IconButton
} from '@mui/material';
import {
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { EncodingIssue, FileEncodingResult } from '../../../shared/utils/textEncoding';

interface EncodingWarningProps {
  encodingResult: FileEncodingResult | null;
  onDismiss?: () => void;
}

/**
 * EncodingWarning component
 * Displays encoding detection results and normalization status
 * 
 * @param encodingResult - Result from readCSVFile() containing encoding info
 * @param onDismiss - Optional callback when user dismisses the warning
 */
export const EncodingWarning: React.FC<EncodingWarningProps> = memo(({
  encodingResult,
  onDismiss
}) => {
  const [expanded, setExpanded] = React.useState(false);

  // Don't show if no issues and no normalization
  if (!encodingResult || (encodingResult.issues.length === 0 && !encodingResult.normalized)) {
    return null;
  }

  const hasIssues = encodingResult.issues.length > 0;
  const severity = hasIssues ? 'warning' : 'info';

  return (
    <Alert
      severity={severity}
      sx={{
        mt: 2,
        borderRadius: '8px',
        '& .MuiAlert-icon': {
          alignItems: 'center'
        }
      }}
      action={
        hasIssues ? (
          <IconButton
            aria-label="expand"
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ ml: 1 }}
          >
            {expanded ? (
              <ChevronUpIcon style={{ width: 20, height: 20 }} />
            ) : (
              <ChevronDownIcon style={{ width: 20, height: 20 }} />
            )}
          </IconButton>
        ) : null
      }
    >
      <AlertTitle>
        {hasIssues ? 'Encoding Issues Detected' : 'Character Normalization Applied'}
      </AlertTitle>
      
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {hasIssues ? (
          <>
            Detected {encodingResult.issues.length} encoding issue{encodingResult.issues.length !== 1 ? 's' : ''} in your file.
            {encodingResult.normalized && ' Character normalization was also applied.'}
          </>
        ) : (
          <>
            Special characters (em dashes, smart quotes, etc.) were normalized for consistency.
          </>
        )}
      </Typography>

      {encodingResult.encoding && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Detected encoding: <strong>{encodingResult.encoding.toUpperCase()}</strong>
        </Typography>
      )}

      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Issue Details:
          </Typography>
          {encodingResult.issues.map((issue, index) => (
            <Box
              key={index}
              sx={{
                mb: 1,
                p: 1,
                bgcolor: 'action.hover',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            >
              <Typography variant="body2">
                <strong>{issue.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong>{' '}
                {issue.description}
                {issue.position !== undefined && (
                  <span style={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                    {' '}(position: {issue.position})
                  </span>
                )}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Your file has been processed and is ready to use. These issues do not prevent upload.
      </Typography>
    </Alert>
  );
});

EncodingWarning.displayName = 'EncodingWarning';




