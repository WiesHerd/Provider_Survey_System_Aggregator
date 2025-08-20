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
  Divider,
  LinearProgress,
  Tooltip
} from '@mui/material';
import { BoltIcon, AdjustmentsHorizontalIcon, SparklesIcon } from '@heroicons/react/24/outline';
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
  isAIProcessing?: boolean;
}

const AutoMapDialog: React.FC<AutoMapDialogProps> = ({
  title,
  description,
  onClose,
  onAutoMap,
  isAIProcessing = false
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
      {/* Prominent AI Banner */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SparklesIcon className="h-6 w-6 text-yellow-300" />
            <div>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
                🤖 AI-Powered Specialty Mapping
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Powered by Hugging Face AI • sentence-transformers/all-MiniLM-L6-v2
              </Typography>
            </div>
          </div>
          <Chip
            label="AI"
            size="small"
            sx={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.8rem',
              border: '1px solid rgba(255,255,255,0.3)'
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Typography variant="h6" className="font-medium">
              {title}
            </Typography>
            <Tooltip 
              title="Powered by Hugging Face AI - sentence-transformers/all-MiniLM-L6-v2"
              arrow
              placement="top"
            >
              <Chip
                icon={<SparklesIcon className="h-3 w-3" />}
                label="AI-Powered"
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: '20px',
                  '& .MuiChip-icon': {
                    color: 'white',
                    animation: 'pulse 2s infinite'
                  },
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.7 },
                    '100%': { opacity: 1 }
                  }
                }}
              />
            </Tooltip>
          </div>
          <Typography variant="body2" color="textSecondary">
            {description}
          </Typography>
          <Typography variant="caption" sx={{ color: 'purple.600', display: 'block', mt: 0.5 }}>
            🤖 Using Hugging Face AI for intelligent specialty matching
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-purple-600" />
          <AdjustmentsHorizontalIcon className="h-6 w-6 text-gray-400" />
        </div>
      </div>

      <Paper className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Typography variant="subtitle1" className="font-medium">
            Configuration
          </Typography>
          <Tooltip 
            title="AI-powered configuration for intelligent specialty matching"
            arrow
            placement="top"
          >
            <SparklesIcon className="h-4 w-4 text-purple-600" />
          </Tooltip>
        </div>

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

      {/* AI Processing Indicator */}
      {isAIProcessing && (
        <Paper className="p-4 mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200">
          <div className="flex items-center gap-3 mb-3">
            <SparklesIcon className="h-5 w-5 text-purple-600 animate-pulse" />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'purple.700' }}>
              🤖 AI Processing...
            </Typography>
          </div>
          <LinearProgress 
            sx={{ 
              height: 6, 
              borderRadius: 3,
              backgroundColor: 'rgba(147, 51, 234, 0.2)',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 3
              }
            }} 
          />
          <Typography variant="caption" sx={{ color: 'purple.600', mt: 1, display: 'block' }}>
            Using intelligent AI-powered specialty matching (Hugging Face API + Local Fallback)...
          </Typography>
          <Typography variant="caption" sx={{ color: 'purple.500', mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
            Note: If API is unavailable, using advanced local similarity matching
          </Typography>
        </Paper>
      )}

      <div className="flex justify-end space-x-4">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAutoMap}
          disabled={loading || isAIProcessing}
          startIcon={
            loading || isAIProcessing ? (
              <ButtonSpinner size="sm" />
            ) : (
              <SparklesIcon className="h-5 w-5" />
            )
          }
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)'
            },
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '1rem',
            padding: '12px 24px',
            boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.4)',
            '&:disabled': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              opacity: 0.7
            }
          }}
        >
          {loading || isAIProcessing ? '🤖 AI Processing...' : '🤖 AI Auto-Map Specialties'}
        </Button>
      </div>
    </div>
  );
};

export default AutoMapDialog; 