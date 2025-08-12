/**
 * Upload Form component
 * This component handles survey type and year selection for file uploads
 */

import React, { memo } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Typography,
  FormControlLabel,
  Switch,
  Alert
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { UploadFormProps } from '../types/upload';
import { SURVEY_SOURCES } from '@/shared/constants';

/**
 * Upload Form component for survey type and year selection
 * 
 * @param formState - Current form state
 * @param onFormChange - Callback when form fields change
 * @param onCustomToggle - Callback when custom toggle changes
 * @param disabled - Whether the form is disabled
 */
export const UploadForm: React.FC<UploadFormProps> = memo(({
  formState,
  onFormChange,
  onCustomToggle,
  disabled = false
}) => {
  // Event handlers
  const handleSurveyTypeChange = (e: SelectChangeEvent<string>) => {
    onFormChange('surveyType', e.target.value);
  };

  const handleCustomSurveyTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormChange('customSurveyType', e.target.value);
  };

  const handleSurveyYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormChange('surveyYear', e.target.value);
  };

  const handleCustomToggle = () => {
    onCustomToggle();
  };

  // Generate year options (current year + 10 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - i);

  return (
    <Box sx={{ mb: 3, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Survey Information
      </Typography>

      <Grid container spacing={3}>
        {/* Survey Type Selection */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small" disabled={disabled}>
            <InputLabel id="survey-type-label">Survey Type</InputLabel>
            <Select
              labelId="survey-type-label"
              value={formState.surveyType}
              label="Survey Type"
              onChange={handleSurveyTypeChange}
              disabled={formState.isCustom}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            >
              <MenuItem value="">
                <em>Select Survey Type</em>
              </MenuItem>
              {SURVEY_SOURCES.map((source) => (
                <MenuItem key={source} value={source}>
                  {source}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Custom Survey Type Toggle */}
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={formState.isCustom}
                onChange={handleCustomToggle}
                disabled={disabled}
                color="primary"
              />
            }
            label="Custom Survey Type"
          />
        </Grid>

        {/* Custom Survey Type Input */}
        {formState.isCustom && (
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="Custom Survey Type"
              value={formState.customSurveyType}
              onChange={handleCustomSurveyTypeChange}
              disabled={disabled}
              placeholder="Enter custom survey type"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            />
          </Grid>
        )}

        {/* Survey Year Selection */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small" disabled={disabled}>
            <InputLabel id="survey-year-label">Survey Year</InputLabel>
            <Select
              labelId="survey-year-label"
              value={formState.surveyYear}
              label="Survey Year"
              onChange={(e: SelectChangeEvent<string>) => onFormChange('surveyYear', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            >
              <MenuItem value="">
                <em>Select Year</em>
              </MenuItem>
              {yearOptions.map((year) => (
                <MenuItem key={year} value={year.toString()}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Form Validation Warnings */}
      {formState.isCustom && !formState.customSurveyType && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please enter a custom survey type
        </Alert>
      )}

      {!formState.isCustom && !formState.surveyType && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please select a survey type
        </Alert>
      )}

      {!formState.surveyYear && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please select a survey year
        </Alert>
      )}
    </Box>
  );
});

UploadForm.displayName = 'UploadForm';
