import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Slider,
  FormControlLabel,
  Switch,
  Button,
  Alert,
  Box,
  Chip,
  Divider
} from '@mui/material';
import { BoltIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { ButtonSpinner } from '../ui/loading-spinner';

interface AutoMapDialogProps {
  title: string;
  description: string;
  onClose?: () => void;
  onAutoMap: (config: {
    confidenceThreshold: number;
    useExistingMappings: boolean;
    enableFuzzyMatching: boolean;
  }) => Promise<void>;
}

const AutoMapDialog: React.FC<AutoMapDialogProps> = ({
  title,
  description,
  onClose,
  onAutoMap
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState({
    confidenceThreshold: 0.9,
    useExistingMappings: true,
    enableFuzzyMatching: true
  });

  const handleConfidenceChange = (_: Event, newValue: number | number[]) => {
    setConfig({
      ...config,
      confidenceThreshold: newValue as number
    });
  };

  const handleExistingMappingsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      useExistingMappings: event.target.checked
    });
  };

  const handleFuzzyMatchingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      enableFuzzyMatching: event.target.checked
    });
  };

  const handleAutoMap = async () => {
    try {
      setLoading(true);
      setError(null);
      await onAutoMap(config);
    } catch (err) {
      setError('Failed to auto-map items');
      console.error('Error during auto-mapping:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Typography variant="h6" className="font-medium">
            {title}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {description}
          </Typography>
        </div>
        <AdjustmentsHorizontalIcon className="h-6 w-6 text-gray-400" />
      </div>

      <Paper className="p-6 mb-6">
        <Typography variant="subtitle1" className="mb-4 font-medium">
          Configuration
        </Typography>

        <div className="space-y-6">
          <div>
            <Typography gutterBottom>
              Confidence Threshold: {(config.confidenceThreshold * 100).toFixed(0)}%
            </Typography>
            <Slider
              value={config.confidenceThreshold}
              onChange={handleConfidenceChange}
              min={0}
              max={1}
              step={0.1}
              marks={[
                { value: 0, label: '0%' },
                { value: 0.5, label: '50%' },
                { value: 1, label: '100%' }
              ]}
            />
            <Typography variant="caption" color="textSecondary">
              Higher values require closer matches
            </Typography>
          </div>

          <FormControlLabel
            control={
              <Switch
                checked={config.useExistingMappings}
                onChange={handleExistingMappingsChange}
              />
            }
            label="Use existing mappings as reference"
          />

          <FormControlLabel
            control={
              <Switch
                checked={config.enableFuzzyMatching}
                onChange={handleFuzzyMatchingChange}
              />
            }
            label="Enable fuzzy matching"
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
          startIcon={loading ? <ButtonSpinner size="sm" /> : <BoltIcon className="h-5 w-5" />}
        >
          {loading ? 'Auto-Mapping...' : 'Start Auto-Mapping'}
        </Button>
      </div>
    </div>
  );
};

export default AutoMapDialog; 