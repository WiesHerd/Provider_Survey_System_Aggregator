/**
 * Uploaded Surveys component
 * This component displays the list of uploaded surveys with filtering and management
 */

import React, { memo } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  LinearProgress,
  Alert
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { SelectChangeEvent } from '@mui/material/Select';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { UploadedSurveysProps } from '../types/upload';
import { formatDate } from '../../../shared/utils';
import { formatSpecialtyForDisplay } from '../../../shared/utils/formatters';
import { filterSpecialtyOptions } from '../../../shared/utils/specialtyMatching';
import { InlineSpinner } from '../../../shared/components';

/**
 * Uploaded Surveys component for displaying and managing uploaded surveys
 * 
 * @param surveys - Array of uploaded surveys
 * @param selectedSurvey - Currently selected survey ID
 * @param onSurveySelect - Callback when a survey is selected
 * @param onSurveyDelete - Callback when a survey is deleted
 * @param deleteProgress - Delete progress state
 * @param globalFilters - Global filters for surveys
 * @param onFilterChange - Callback when filters change
 * @param uniqueValues - Unique values for filter options
 * @param sectionState - Section collapse state
 * @param onSectionToggle - Callback when section toggle changes
 * @param loading - Whether data is loading
 */
export const UploadedSurveys: React.FC<UploadedSurveysProps> = memo(({
  surveys,
  selectedSurvey,
  onSurveySelect,
  onSurveyDelete,
  deleteProgress,
  globalFilters,
  onFilterChange,
  uniqueValues,
  sectionState,
  onSectionToggle,
  loading = false
}) => {
  // Event handlers
  const handleFilterChange = (filterName: keyof typeof globalFilters) => (e: SelectChangeEvent<string>) => {
    onFilterChange(filterName, e.target.value);
  };

  const handleSectionToggle = (section: keyof typeof sectionState) => () => {
    onSectionToggle(section);
  };

  const handleSurveySelect = (surveyId: string) => () => {
    onSurveySelect(surveyId);
  };

  const handleSurveyDelete = (surveyId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSurveyDelete(surveyId);
  };

  // Convert Sets to arrays for Material-UI Select
  const specialtyOptions = Array.from(uniqueValues.specialties).sort();
  const providerTypeOptions = Array.from(uniqueValues.providerTypes).sort();
  const regionOptions = Array.from(uniqueValues.regions).sort();

  return (
    <Box sx={{ mb: 3 }}>
      {/* Section Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 1,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' }
        }}
        onClick={handleSectionToggle('isUploadedSurveysCollapsed')}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {sectionState.isUploadedSurveysCollapsed ? (
            <ChevronRightIcon style={{ width: 20, height: 20 }} />
          ) : (
            <ChevronDownIcon style={{ width: 20, height: 20 }} />
          )}
          <Typography variant="h6">
            Uploaded Surveys ({surveys.length})
          </Typography>
        </Box>
        
        {loading && (
          <InlineSpinner size="sm" />
        )}
      </Box>

      {/* Collapsible Content */}
      <Collapse in={!sectionState.isUploadedSurveysCollapsed}>
        <Box sx={{ mt: 2 }}>
          {/* Filters */}
          <Box sx={{ mb: 3, p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Filters
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <Autocomplete
                    value={globalFilters.specialty}
                    onChange={(event: any, newValue: string | null) => onFilterChange('specialty', newValue || '')}
                    options={specialtyOptions}
                    getOptionLabel={(option: string) => option ? formatSpecialtyForDisplay(option) : ''}
                    renderInput={(params: any) => (
                      <TextField
                        {...params}
                        label="Specialty"
                        placeholder="Search specialties..."
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            height: '40px',
                            border: '1px solid #d1d5db',
                            '&:hover': { borderColor: '#9ca3af' },
                            '&.Mui-focused': { boxShadow: 'none', borderColor: '#3b82f6' }
                          }
                        }}
                      />
                    )}
                    filterOptions={(options: string[], { inputValue }: { inputValue: string }) => filterSpecialtyOptions(options, inputValue)}
                    clearOnBlur={false}
                    blurOnSelect={true}
                  />
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Provider Type</InputLabel>
                  <Select
                    value={globalFilters.providerType}
                    label="Provider Type"
                    onChange={handleFilterChange('providerType')}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>All Provider Types</em>
                    </MenuItem>
                    {providerTypeOptions.map((providerType) => (
                      <MenuItem key={providerType} value={providerType}>
                        {providerType}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Region</InputLabel>
                  <Select
                    value={globalFilters.region}
                    label="Region"
                    onChange={handleFilterChange('region')}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>All Regions</em>
                    </MenuItem>
                    {regionOptions.map((region) => (
                      <MenuItem key={region} value={region}>
                        {region}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* Delete Progress */}
          {deleteProgress.isDeleting && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">
                  Deleting {deleteProgress.currentFile}...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {deleteProgress.currentFileIndex + 1} of {deleteProgress.totalFiles}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={deleteProgress.progress} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}

          {/* Surveys List */}
          {surveys.length === 0 ? (
            <Alert severity="info">
              <Typography variant="body2">
                No surveys uploaded yet. Upload some CSV files to get started.
              </Typography>
            </Alert>
          ) : (
            <List sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
              {surveys.map((survey, index) => (
                <ListItem
                  key={survey.id}
                  button
                  selected={selectedSurvey === survey.id}
                  onClick={handleSurveySelect(survey.id)}
                  disabled={deleteProgress.isDeleting}
                  sx={{
                    borderBottom: index < surveys.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    '&.Mui-selected': {
                      bgcolor: 'primary.light',
                      '&:hover': {
                        bgcolor: 'primary.light'
                      }
                    }
                  }}
                >
                  <DocumentIcon style={{ width: 24, height: 24, marginRight: 12, color: '#666' }} />
                  
                  <ListItemText
                    primary={survey.fileName}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Chip 
                          label={survey.surveyType} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                          sx={{ borderRadius: '4px' }}
                        />
                        <Chip 
                          label={survey.surveyYear} 
                          size="small" 
                          variant="outlined"
                          sx={{ borderRadius: '4px' }}
                        />
                        <Chip 
                          label={`${survey.stats.totalRows.toLocaleString()} rows`} 
                          size="small" 
                          variant="outlined"
                          sx={{ borderRadius: '4px' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(survey.uploadDate)}
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={handleSurveyDelete(survey.id)}
                      disabled={deleteProgress.isDeleting}
                      sx={{ color: 'error.main' }}
                    >
                      <TrashIcon style={{ width: 20, height: 20 }} />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Collapse>
    </Box>
  );
});

UploadedSurveys.displayName = 'UploadedSurveys';
