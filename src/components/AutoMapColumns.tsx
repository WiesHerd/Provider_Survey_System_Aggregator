import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Slider,
  FormControlLabel,
  Switch,
  Button,
  CircularProgress,
  Alert,
  Box,
  Chip,
  Divider
} from '@mui/material';
import { BoltIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { ColumnMappingService } from '../services/ColumnMappingService';
import { LocalStorageService } from '../services/StorageService';
import { IAutoMappingConfig } from '../types/column';

interface AutoMapColumnsProps {
  onClose?: () => void;
  onMappingsCreated?: () => void;
}

const AutoMapColumns: React.FC<AutoMapColumnsProps> = ({ onClose, onMappingsCreated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<IAutoMappingConfig>({
    confidenceThreshold: 0.7,
    includeDataTypeMatching: true
  });

  const handleConfidenceChange = (_: Event, newValue: number | number[]) => {
    setConfig({
      ...config,
      confidenceThreshold: newValue as number
    });
  };

  const handleDataTypeMatchingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      includeDataTypeMatching: event.target.checked
    });
  };

  const handleAutoMap = async () => {
    try {
      setLoading(true);
      setError(null);

      const mappingService = new ColumnMappingService(new LocalStorageService());
      const suggestions = await mappingService.autoMapColumns(config);

      // Create mappings from suggestions
      for (const suggestion of suggestions) {
        await mappingService.createMapping(
          suggestion.standardizedName,
          suggestion.columns
        );
      }

      onMappingsCreated?.();
    } catch (err) {
      setError('Failed to auto-map columns');
      console.error('Error during auto-mapping:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Typography variant="h6" className="font-medium">
          Auto-Map Columns
        </Typography>
        <AdjustmentsHorizontalIcon className="h-6 w-6 text-gray-400" />
      </div>

      <Paper className="p-6 mb-6">
        <Typography variant="subtitle1" className="mb-4 font-medium">
          Mapping Configuration
        </Typography>

        <div className="space-y-6">
          <div>
            <Typography gutterBottom>
              Confidence Threshold: {config.confidenceThreshold}
            </Typography>
            <Slider
              value={config.confidenceThreshold}
              onChange={handleConfidenceChange}
              min={0}
              max={1}
              step={0.1}
              marks={[
                { value: 0, label: '0' },
                { value: 0.5, label: '0.5' },
                { value: 1, label: '1' }
              ]}
            />
            <Typography variant="caption" color="textSecondary">
              Higher values require closer matches between column names
            </Typography>
          </div>

          <FormControlLabel
            control={
              <Switch
                checked={config.includeDataTypeMatching}
                onChange={handleDataTypeMatchingChange}
              />
            }
            label="Consider data type when matching"
          />
        </div>
      </Paper>

      {error && (
        <Alert severity="error" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="flex justify-end space-x-4">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAutoMap}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <BoltIcon className="h-5 w-5" />}
        >
          {loading ? 'Auto-Mapping...' : 'Start Auto-Mapping'}
        </Button>
      </div>
    </div>
  );
};

export default AutoMapColumns; 