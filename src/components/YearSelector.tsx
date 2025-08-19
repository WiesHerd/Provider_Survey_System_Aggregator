import React, { useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert
} from '@mui/material';
import {
  CalendarIcon,
  PlusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useYear } from '../contexts/YearContext';

interface YearSelectorProps {
  label?: string;
  value?: string;
  onChange?: (year: string) => void;
  showAllYears?: boolean;
  showYearManagement?: boolean;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
  disabled?: boolean;
  className?: string;
}

export const YearSelector: React.FC<YearSelectorProps> = ({
  label = 'Year',
  value,
  onChange,
  showAllYears = false,
  showYearManagement = false,
  size = 'medium',
  variant = 'outlined',
  disabled = false,
  className
}) => {
  const { 
    currentYear, 
    availableYears, 
    yearConfigs,
    setCurrentYear,
    createYear,
    loading,
    error 
  } = useYear();

  const [showYearDialog, setShowYearDialog] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [newYearDescription, setNewYearDescription] = useState('');
  const [creatingYear, setCreatingYear] = useState(false);

  const selectedYear = value || currentYear;

  const handleYearChange = (year: string) => {
    if (onChange) {
      onChange(year);
    } else {
      setCurrentYear(year);
    }
  };

  const handleCreateYear = async () => {
    if (!newYear || !/^\d{4}$/.test(newYear)) {
      return;
    }

    try {
      setCreatingYear(true);
      await createYear(newYear, newYearDescription || undefined);
      setShowYearDialog(false);
      setNewYear('');
      setNewYearDescription('');
    } catch (err) {
      console.error('Error creating year:', err);
    } finally {
      setCreatingYear(false);
    }
  };

  const getYearLabel = (year: string) => {
    const config = yearConfigs.find(c => c.year === year);
    if (config?.isActive) {
      return `${year} (Active)`;
    }
    if (config?.isDefault) {
      return `${year} (Default)`;
    }
    return year;
  };

  const getYearChipColor = (year: string) => {
    const config = yearConfigs.find(c => c.year === year);
    if (config?.isActive) return 'primary';
    if (config?.isDefault) return 'secondary';
    return 'default';
  };

  return (
    <>
      <Box className={`flex items-center gap-2 ${className}`}>
        <FormControl 
          size={size} 
          variant={variant} 
          disabled={disabled || loading}
          className="min-w-[120px]"
        >
          <InputLabel>{label}</InputLabel>
          <Select
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            label={label}
            startAdornment={
              <CalendarIcon className="h-4 w-4 text-gray-500 mr-2" />
            }
          >
            {showAllYears && (
              <MenuItem value="all">
                <Box className="flex items-center gap-2">
                  <Typography>All Years</Typography>
                  <Chip 
                    label={availableYears.length} 
                    size="small" 
                    variant="outlined"
                  />
                </Box>
              </MenuItem>
            )}
            
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>
                <Box className="flex items-center gap-2">
                  <Typography>{year}</Typography>
                  <Chip 
                    label={getYearLabel(year)}
                    size="small"
                    color={getYearChipColor(year)}
                    variant={year === selectedYear ? 'filled' : 'outlined'}
                  />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {showYearManagement && (
          <Tooltip title="Manage Years">
            <IconButton
              size="small"
              onClick={() => setShowYearDialog(true)}
              disabled={disabled}
            >
              <Cog6ToothIcon className="h-4 w-4" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Year Management Dialog */}
      <Dialog 
        open={showYearDialog} 
        onClose={() => setShowYearDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-indigo-600" />
            <Typography>Manage Years</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box className="space-y-4">
            {/* Current Years */}
            <div>
              <Typography variant="subtitle2" className="mb-2">
                Available Years
              </Typography>
              <Box className="flex flex-wrap gap-2">
                {yearConfigs.map((config) => (
                  <Chip
                    key={config.year}
                    label={getYearLabel(config.year)}
                    color={getYearChipColor(config.year)}
                    variant={config.isActive ? 'filled' : 'outlined'}
                    size="small"
                  />
                ))}
              </Box>
            </div>

            <div className="border-t pt-4">
              <Typography variant="subtitle2" className="mb-2">
                Add New Year
              </Typography>
              
              <Box className="space-y-3">
                <TextField
                  label="Year"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  placeholder="2026"
                  size="small"
                  fullWidth
                  inputProps={{ maxLength: 4 }}
                  helperText="Enter a 4-digit year (e.g., 2026)"
                />
                
                <TextField
                  label="Description (Optional)"
                  value={newYearDescription}
                  onChange={(e) => setNewYearDescription(e.target.value)}
                  placeholder="Survey data for 2026"
                  size="small"
                  fullWidth
                  multiline
                  rows={2}
                />
              </Box>

              {error && (
                <Alert severity="error" className="mt-2">
                  {error}
                </Alert>
              )}
            </div>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowYearDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateYear}
            variant="contained"
            disabled={!newYear || !/^\d{4}$/.test(newYear) || creatingYear}
            startIcon={creatingYear ? undefined : <PlusIcon className="h-4 w-4" />}
          >
            {creatingYear ? 'Creating...' : 'Create Year'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
