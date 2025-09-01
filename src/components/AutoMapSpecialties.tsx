import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Slider,
  FormControlLabel,
  Switch,
  Button,
  Box,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import { BoltIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { ButtonSpinner } from './ui/loading-spinner';
import { SpecialtyMappingService } from '../services/SpecialtyMappingService';
import { LocalStorageService } from '../services/StorageService';
import { IAutoMappingConfig } from '../types/specialty';

interface AutoMapSpecialtiesProps {
  onClose?: () => void;
  onMappingsCreated?: () => void;
}

const AutoMapSpecialties: React.FC<AutoMapSpecialtiesProps> = ({ onClose, onMappingsCreated }) => {
  // State for configuration
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.8);
  const [useExistingMappings, setUseExistingMappings] = useState<boolean>(true);
  const [useFuzzyMatching, setUseFuzzyMatching] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    total: number;
    mapped: number;
    skipped: number;
  } | null>(null);

  const mappingService = new SpecialtyMappingService(new LocalStorageService());

  const handleAutoMap = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const config: IAutoMappingConfig = {
        confidenceThreshold,
        useExistingMappings,
        useFuzzyMatching
      };

      // Use the autoMapSpecialties method instead
      const newMappings = await mappingService.autoMapSpecialties(config);
      
      setResults({
        total: newMappings.length,
        mapped: newMappings.length,
        skipped: 0
      });

      // Notify parent component that mappings were created
      onMappingsCreated?.();
    } catch (err) {
      setError('Failed to process auto-mapping');
      console.error('Auto-mapping error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Paper className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Typography variant="h5" className="flex items-center mb-2">
          <BoltIcon className="h-6 w-6 mr-2 text-yellow-500" />
          Auto-Map Specialties
        </Typography>
        <Typography color="textSecondary">
          Automatically map specialties based on similarity and existing mappings.
        </Typography>
      </div>

      <Divider className="mb-6" />

      {/* Configuration Section */}
      <div className="space-y-6 mb-8">
        <div>
          <Typography variant="subtitle2" className="mb-2 flex items-center">
            <AdjustmentsHorizontalIcon className="h-5 w-5 mr-1.5 text-gray-500" />
            Configuration
          </Typography>
          
          <div className="space-y-4">
            {/* Confidence Threshold */}
            <div>
              <Typography gutterBottom>
                Confidence Threshold: {confidenceThreshold * 100}%
              </Typography>
              <Slider
                value={confidenceThreshold}
                onChange={(_event: Event, value: number | number[]) => setConfidenceThreshold(value as number)}
                min={0.5}
                max={1}
                step={0.05}
                marks
                disabled={isProcessing}
              />
            </div>

            {/* Switches */}
            <div className="space-y-2">
              <FormControlLabel
                control={
                  <Switch
                    checked={useExistingMappings}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseExistingMappings(e.target.checked)}
                    disabled={isProcessing}
                  />
                }
                label="Use existing mappings as reference"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={useFuzzyMatching}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseFuzzyMatching(e.target.checked)}
                    disabled={isProcessing}
                  />
                }
                label="Enable fuzzy matching"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {results && !error && (
        <Box className="mb-6 p-4 bg-gray-50 rounded-lg">
          <Typography variant="subtitle2" className="mb-3">
            Auto-Mapping Results
          </Typography>
          <div className="flex space-x-4">
            <Chip
              label={`Total: ${results.total}`}
              color="default"
            />
            <Chip
              label={`Mapped: ${results.mapped}`}
              color="success"
            />
            <Chip
              label={`Skipped: ${results.skipped}`}
              color="warning"
            />
          </div>
        </Box>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAutoMap}
          disabled={isProcessing}
          startIcon={isProcessing ? <ButtonSpinner size="sm" /> : <BoltIcon className="h-5 w-5" />}
        >
          {isProcessing ? 'Processing...' : 'Start Auto-Mapping'}
        </Button>
      </div>
    </Paper>
  );
};

export default AutoMapSpecialties; 