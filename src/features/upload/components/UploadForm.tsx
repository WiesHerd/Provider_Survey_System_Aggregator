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
  Alert,
  Autocomplete
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { UploadFormProps } from '../types/upload';
import { SURVEY_SOURCES } from '../../../shared/constants';

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
  const handleSurveyTypeChange = (e: SelectChangeEvent<string> | { target: { value: string } }) => {
    onFormChange('surveyType', e.target.value);
  };

  const handleCustomSurveyTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormChange('customSurveyType', e.target.value);
  };

  const handleSurveyYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFormChange('surveyYear', e.target.value);
  };

  const handleProviderTypeChange = (e: SelectChangeEvent<string>) => {
    onFormChange('providerType', e.target.value);
  };

  const handleCustomToggle = () => {
    onCustomToggle();
  };

  // Generate year options (current year + 10 years back)

  return (
    <Box sx={{ mb: 3, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Survey Information
      </Typography>

      <Grid container spacing={3}>
        {/* Survey Type Selection */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small" disabled={disabled}>
            <Autocomplete
              options={SURVEY_SOURCES}
              value={formState.surveyType}
              onChange={(event: any, newValue: string | null) => {
                handleSurveyTypeChange({
                  target: {
                    value: newValue || ''
                  }
                });
              }}
              disabled={formState.isCustom}
              filterOptions={(options: string[], { inputValue }: { inputValue: string }) => {
                return options.filter((option: string) =>
                  option.toLowerCase().includes(inputValue.toLowerCase())
                );
              }}
              getOptionLabel={(option: string) => option}
              isOptionEqualToValue={(option: string, value: string) => option === value}
              clearOnBlur={false}
              selectOnFocus
              freeSolo
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Survey Type"
                                     placeholder="Search type"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <svg className="w-4 h-4 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    },
                    '& .MuiAutocomplete-input': {
                      padding: '8px 12px',
                    },
                    '& .MuiAutocomplete-inputRoot': {
                      padding: '0 8px',
                    },
                  }}
                />
              )}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
                '& .MuiAutocomplete-input': {
                  padding: '8px 12px',
                },
                '& .MuiAutocomplete-inputRoot': {
                  padding: '0 8px',
                },
              }}
            />
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
                             placeholder="Custom type"
              InputProps={{
                startAdornment: (
                  <svg className="w-4 h-4 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                ),
              }}
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
          <TextField
            fullWidth
            size="small"
            label="Survey Year"
            value={formState.surveyYear}
            onChange={handleSurveyYearChange}
            disabled={disabled}
            placeholder="Year"
            type="text"
            inputProps={{
              pattern: "[0-9]*",
              inputMode: "numeric"
            }}
            InputProps={{
              startAdornment: (
                <svg className="w-4 h-4 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              }
            }}
          />
        </Grid>

        {/* Provider Type Selection */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small" disabled={disabled}>
            <InputLabel>Provider Type</InputLabel>
            <Select
              value={formState.providerType}
              label="Provider Type"
              onChange={handleProviderTypeChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            >
              <MenuItem value="PHYSICIAN">Physicians</MenuItem>
              <MenuItem value="APP">APPs</MenuItem>
              <MenuItem value="CALL">Call</MenuItem>
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

      {!formState.providerType && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please select a provider type
        </Alert>
      )}
    </Box>
  );
});

UploadForm.displayName = 'UploadForm';
