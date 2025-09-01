import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Slider,
  Box
} from '@mui/material';
import { 
  BoltIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface AutoProviderTypeMappingProps {
  isOpen: boolean;
  onClose: () => void;
  onAutoMap: (config: any) => Promise<void>;
  loading?: boolean;
  title?: string;
  description?: string;
}

/**
 * AutoProviderTypeMapping component for configuring auto-mapping
 * Matches the structure of AutoMapping exactly
 */
export const AutoProviderTypeMapping: React.FC<AutoProviderTypeMappingProps> = ({
  isOpen,
  onClose,
  onAutoMap,
  loading = false,
  title = "Auto-Map Provider Types",
  description = "Automatically map similar provider type names across your surveys"
}) => {
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);

  const handleAutoMap = async () => {
    try {
      await onAutoMap({
        confidenceThreshold,
        type: 'providerType'
      });
      onClose();
    } catch (error) {
      console.error('Auto-mapping failed:', error);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: "rounded-xl"
      }}
    >
      <DialogTitle className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
            <BoltIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <Typography variant="h6" className="text-lg font-semibold text-gray-900">
              {title}
            </Typography>
            <Typography variant="body2" className="text-sm text-gray-500">
              {description}
            </Typography>
          </div>
        </div>
        <Button
          onClick={onClose}
          variant="text"
          size="small"
          className="p-2 min-w-0 rounded-lg hover:bg-gray-100"
        >
          <XMarkIcon className="h-5 w-5 text-gray-400" />
        </Button>
      </DialogTitle>
      
      <DialogContent className="p-6 space-y-6">
        <div>
          <Typography variant="subtitle1" className="font-medium text-gray-900 mb-2">
            Similarity Threshold
          </Typography>
          <Typography variant="body2" className="text-gray-600 mb-4">
            Higher values create fewer, more precise mappings. Lower values create more mappings with potentially less accuracy.
          </Typography>
          
          <Box className="px-2">
            <Slider
              value={confidenceThreshold}
              onChange={(_: Event, value: number | number[]) => setConfidenceThreshold(value as number)}
              min={0.5}
              max={1.0}
              step={0.05}
              marks={[
                { value: 0.5, label: '50%' },
                { value: 0.7, label: '70%' },
                { value: 0.9, label: '90%' }
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value: number) => `${Math.round(value * 100)}%`}
              className="text-blue-600"
            />
          </Box>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <Typography variant="body2" className="text-blue-800">
            <strong>Tip:</strong> Start with 80% similarity. You can always run auto-mapping again with different settings.
          </Typography>
        </div>
      </DialogContent>

      <DialogActions className="p-6 border-t border-gray-200">
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
          className="rounded-lg"
        >
          Cancel
        </Button>
        <Button
          onClick={handleAutoMap}
          variant="contained"
          disabled={loading}
          startIcon={loading ? undefined : <BoltIcon className="h-4 w-4" />}
          className="rounded-lg bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Auto-Mapping...' : 'Start Auto-Mapping'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
