import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Typography,
  Slider,
  FormControlLabel,
  Switch,
  Box,
  Alert,
  Chip,
  Divider,
  CircularProgress
} from '@mui/material';
import { 
  BoltIcon, 
  AdjustmentsHorizontalIcon 
} from '@heroicons/react/24/outline';
import { AutoMappingProps, IAutoMappingConfig } from '../types/mapping';

/**
 * AutoMapping component for the auto-mapping dialog
 * 
 * @param isOpen - Whether the dialog is open
 * @param onClose - Callback to close the dialog
 * @param onAutoMap - Callback to execute auto-mapping
 * @param loading - Whether auto-mapping is in progress
 */
export const AutoMapping: React.FC<AutoMappingProps> = ({ 
  isOpen, 
  onClose, 
  onAutoMap, 
  loading = false 
}) => {
  // Configuration state
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.8);
  const [useExistingMappings, setUseExistingMappings] = useState<boolean>(true);
  const [useFuzzyMatching, setUseFuzzyMatching] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleAutoMap = async () => {
    try {
      setError(null);
      
      const config: IAutoMappingConfig = {
        confidenceThreshold,
        useExistingMappings,
        useFuzzyMatching
      };

      await onAutoMap(config);
      onClose();
    } catch (err) {
      setError('Failed to process auto-mapping');
      console.error('Auto-mapping error:', err);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <div className="flex items-center gap-2">
          <BoltIcon className="h-6 w-6 text-yellow-500" />
          <span>Auto-Map Specialties</span>
        </div>
      </DialogTitle>
      
      <DialogContent>
        <Typography color="textSecondary" className="mb-4">
          Automatically map specialties based on similarity and existing mappings.
        </Typography>

        <Divider className="mb-6" />

        {/* Configuration Section */}
        <div className="space-y-6 mb-8">
          {/* Confidence Threshold */}
          <div>
            <Typography variant="subtitle1" className="mb-2 font-medium">
              Confidence Threshold
            </Typography>
            <Typography variant="body2" color="textSecondary" className="mb-3">
              Only create mappings with confidence above this threshold
            </Typography>
            <Box className="px-2">
              <Slider
                value={confidenceThreshold}
                onChange={(_event: Event, value: number | number[]) => setConfidenceThreshold(value as number)}
                min={0.1}
                max={1}
                step={0.1}
                marks={[
                  { value: 0.1, label: '0.1' },
                  { value: 0.5, label: '0.5' },
                  { value: 1, label: '1.0' }
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value: number) => `${(value * 100).toFixed(0)}%`}
              />
            </Box>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low (More mappings, less accurate)</span>
              <span>High (Fewer mappings, more accurate)</span>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Typography variant="subtitle1" className="font-medium">
              Mapping Options
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={useExistingMappings}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseExistingMappings(e.target.checked)}
                />
              }
              label="Use existing mappings as reference"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={useFuzzyMatching}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseFuzzyMatching(e.target.checked)}
                />
              }
              label="Enable fuzzy matching for similar names"
            />
          </div>

          {/* Current Settings Summary */}
          <Paper className="p-4 bg-gray-50">
            <Typography variant="subtitle2" className="mb-2 font-medium">
              Current Settings
            </Typography>
            <div className="flex flex-wrap gap-2">
              <Chip 
                label={`Confidence: ${(confidenceThreshold * 100).toFixed(0)}%`} 
                size="small" 
                color="primary" 
              />
              <Chip 
                label={useExistingMappings ? "Use existing mappings" : "Ignore existing mappings"} 
                size="small" 
                variant="outlined" 
              />
              <Chip 
                label={useFuzzyMatching ? "Fuzzy matching enabled" : "Fuzzy matching disabled"} 
                size="small" 
                variant="outlined" 
              />
            </div>
          </Paper>
        </div>

        {/* Error Display */}
        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions className="p-4">
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleAutoMap}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <BoltIcon className="h-4 w-4" />}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Auto-Map Specialties'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
