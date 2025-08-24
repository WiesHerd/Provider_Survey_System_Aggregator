import React from 'react';
import { 
  Alert, 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Paper,
  Chip
} from '@mui/material';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { ColumnValidationResult } from '../utils/uploadCalculations';

interface ColumnValidationDisplayProps {
  validation: ColumnValidationResult;
  fileName: string;
}

/**
 * ColumnValidationDisplay component for showing file validation results
 * Only displays when there are validation issues
 * 
 * @param validation - Column validation result
 * @param fileName - Name of the file being validated
 */
export const ColumnValidationDisplay: React.FC<ColumnValidationDisplayProps> = ({
  validation,
  fileName
}) => {
  // Only show validation display if there are actual issues
  if (validation.isValid) {
    return null; // Don't show anything for valid files
  }

  return (
    <Paper sx={{ mt: 2, p: 3, border: '1px solid', borderColor: 'error.main' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
        <Typography variant="h6" color="error" fontWeight="medium">
          File "{fileName}" has validation issues
        </Typography>
      </Box>

      {/* Detected Columns */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="medium" sx={{ mb: 1 }}>
          Detected Columns:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {validation.detectedColumns.map((column, index) => (
            <Chip 
              key={index}
              label={column}
              size="small"
              variant="outlined"
              color="primary"
            />
          ))}
        </Box>
      </Box>

      {/* Missing Required Columns */}
      {validation.missingColumns.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="medium" color="error" sx={{ mb: 1 }}>
            Missing Required Columns:
          </Typography>
          <List dense>
            {validation.missingColumns.map((column, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <XCircleIcon className="h-4 w-4 text-red-600" />
                </ListItemIcon>
                <ListItemText 
                  primary={column}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Suggestions */}
      {validation.suggestions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight="medium" sx={{ mb: 1 }}>
            Suggestions:
          </Typography>
          <List dense>
            {validation.suggestions.map((suggestion, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <InformationCircleIcon className="h-4 w-4 text-blue-600" />
                </ListItemIcon>
                <ListItemText 
                  primary={suggestion}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Action Required */}
      <Alert severity="warning" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>Action Required:</strong> Please ensure your CSV file contains all required columns 
          or rename existing columns to match the required names.
        </Typography>
      </Alert>
    </Paper>
  );
};
