/**
 * Analytics Feature - Variable Formatting Dialog
 * 
 * Enterprise-grade MUI Dialog for configuring variable formatting with smooth dragging.
 * Synchronizes with currently selected variables in the analytics table.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  TrashIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Draggable from 'react-draggable';

interface VariableFormattingRule {
  variableName: string;
  displayName: string;
  formatType: 'currency' | 'number' | 'percentage';
  decimals: number;
  showCurrency: boolean;
  enabled: boolean;
}

interface VariableFormattingDialogProps {
  open: boolean;
  onClose: () => void;
  variables: string[];
  onFormattingChange: (rules: VariableFormattingRule[]) => void;
  currentRules?: VariableFormattingRule[];
}

/**
 * Draggable Paper component for MUI Dialog
 */
const DraggablePaper = (props: any) => {
  return (
    <Draggable
      handle="#draggable-dialog-title"
      bounds="parent"
      cancel={'[class*="MuiDialogContent-root"]'}
    >
      <Paper {...props} />
    </Draggable>
  );
};

/**
 * Variable Formatting Dialog Component
 * 
 * Enterprise-grade dialog with smooth dragging and perfect data synchronization
 */
export const VariableFormattingDialog: React.FC<VariableFormattingDialogProps> = ({
  open,
  onClose,
  variables,
  onFormattingChange,
  currentRules = []
}) => {
  const [rules, setRules] = useState<VariableFormattingRule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Resizable state - persist to localStorage for user preference
  const [dialogSize, setDialogSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('variableFormattingDialogSize');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // Fallback to defaults
        }
      }
    }
    return { width: 600, height: 600 };
  });
  
  const [isResizing, setIsResizing] = useState(false);

  // CRITICAL: Synchronize rules with currently selected variables
  useEffect(() => {
    if (!open || variables.length === 0) {
      setRules([]);
      return;
    }

    console.log('🔄 VariableFormattingDialog: Syncing with selected variables:', variables);
    console.log('🔄 VariableFormattingDialog: Current rules:', currentRules);

    // Create synchronized rules - ONLY for currently selected variables
    const syncedRules = variables.map(variableName => {
      // Try to find existing rule for this variable
      const existingRule = currentRules.find(rule => rule.variableName === variableName);
      
      if (existingRule) {
        console.log(`✅ Found existing rule for ${variableName}:`, existingRule);
        return existingRule; // Use saved formatting
      } else {
        // Create default rule for new variable
        const defaultRule = createDefaultRule(variableName);
        console.log(`🆕 Created default rule for ${variableName}:`, defaultRule);
        return defaultRule;
      }
    });

    setRules(syncedRules);
    setHasChanges(false);
  }, [open, variables, currentRules]);

  // Create default formatting rule for a variable
  const createDefaultRule = useCallback((variableName: string): VariableFormattingRule => {
    return {
      variableName,
      displayName: formatVariableDisplayName(variableName),
      formatType: detectFormatType(variableName),
      decimals: detectDecimals(variableName),
      showCurrency: detectCurrency(variableName),
      enabled: true
    };
  }, []);

  // Handle rule changes
  const handleRuleChange = useCallback((index: number, field: keyof VariableFormattingRule, value: any) => {
    setRules(prevRules => {
      const newRules = [...prevRules];
      newRules[index] = { ...newRules[index], [field]: value };
      
      // Fix logical inconsistency: disable showCurrency for percentage
      if (field === 'formatType' && value === 'percentage') {
        newRules[index].showCurrency = false;
      }
      
      setHasChanges(true);
      return newRules;
    });
  }, []);

  // Remove a rule
  const handleRemoveRule = useCallback((index: number) => {
    setRules(prevRules => {
      const newRules = prevRules.filter((_, i) => i !== index);
      setHasChanges(true);
      return newRules;
    });
  }, []);

  // Reset to defaults
  const handleResetToDefaults = useCallback(() => {
    const defaultRules = variables.map(variableName => createDefaultRule(variableName));
    setRules(defaultRules);
    setHasChanges(true);
  }, [variables, createDefaultRule]);

  // Apply formatting changes
  const handleApply = useCallback(() => {
    onFormattingChange(rules);
    setHasChanges(false);
    onClose();
  }, [rules, onFormattingChange, onClose]);
  
  // Resize handlers - polished Google-style implementation
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dialogSize.width;
    const startHeight = dialogSize.height;
    
    let currentSize = { width: startWidth, height: startHeight };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      // Calculate new size with constraints
      const newWidth = Math.max(500, Math.min(1200, startWidth + deltaX));
      const newHeight = Math.max(400, Math.min(900, startHeight + deltaY));
      
      currentSize = { width: newWidth, height: newHeight };
      setDialogSize(currentSize);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      // Persist to localStorage with the final size
      localStorage.setItem('variableFormattingDialogSize', JSON.stringify(currentSize));
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
  }, [dialogSize]);

  // Cancel changes
  const handleCancel = useCallback(() => {
    // Revert to current rules
    const syncedRules = variables.map(variableName => {
      const existingRule = currentRules.find(rule => rule.variableName === variableName);
      return existingRule || createDefaultRule(variableName);
    });
    setRules(syncedRules);
    setHasChanges(false);
    onClose();
  }, [variables, currentRules, createDefaultRule, onClose]);

  // Memoized rule cards for performance - ULTRA COMPACT DESIGN
  const ruleCards = useMemo(() => {
    return rules.map((rule, index) => (
      <Card 
        key={`${rule.variableName}-${index}`}
        sx={{
          mb: 1,
          border: '1px solid #e5e7eb',
          borderRadius: 2,
          '&:hover': {
            boxShadow: 1,
            borderColor: '#8b5cf6'
          }
        }}
      >
        <CardContent sx={{ p: 1.5 }}>
          {/* Ultra Compact Rule Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                width={6}
                height={6}
                borderRadius="50%"
                bgcolor={rule.enabled ? 'primary.main' : 'grey.400'}
              />
              <Typography variant="subtitle2" fontWeight={600} fontSize="0.9rem">
                {rule.displayName}
              </Typography>
            </Box>
            <IconButton
              onClick={() => handleRemoveRule(index)}
              size="small"
              sx={{ 
                color: 'error.main',
                width: 24,
                height: 24,
                '&:hover': { bgcolor: 'error.light', color: 'white' }
              }}
              aria-label={`Remove ${rule.displayName}`}
            >
              <TrashIcon className="h-3 w-3" />
            </IconButton>
          </Box>

          {/* Ultra Compact Rule Controls - Evenly Distributed */}
          <Box display="flex" justifyContent="space-between" alignItems="center" gap={2}>
            {/* Format Type - Left */}
            <FormControl size="small" sx={{ minWidth: 140, flex: '0 0 auto' }}>
              <InputLabel sx={{ fontSize: '0.8rem' }}>Format Type</InputLabel>
              <Select
                value={rule.formatType}
                onChange={(e: any) => handleRuleChange(index, 'formatType', e.target.value)}
                label="Format Type"
                sx={{ fontSize: '0.8rem' }}
              >
                <MenuItem value="number">Number</MenuItem>
                <MenuItem value="currency">Currency</MenuItem>
                <MenuItem value="percentage">Percentage</MenuItem>
              </Select>
            </FormControl>

            {/* Decimals - Center Left */}
            <TextField
              label="Decimals"
              type="number"
              size="small"
              value={rule.decimals}
              onChange={(e: any) => handleRuleChange(index, 'decimals', parseInt(e.target.value) || 0)}
              inputProps={{ min: 0, max: 4 }}
              sx={{ fontSize: '0.8rem', width: 120, flex: '0 0 auto' }}
            />

            {/* Spacer to push toggles to the right */}
            <Box sx={{ flex: 1 }} />

            {/* Enabled Toggle - Center Right */}
            <FormControlLabel
              control={
                <Switch
                  checked={rule.enabled}
                  onChange={(e: any) => handleRuleChange(index, 'enabled', e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label={<Typography variant="body2" fontSize="0.8rem">Enabled</Typography>}
              sx={{ margin: 0, flex: '0 0 auto' }}
            />

            {/* Show Currency Toggle - Right */}
            {rule.formatType !== 'percentage' && (
              <FormControlLabel
                control={
                  <Switch
                    checked={rule.showCurrency}
                    onChange={(e: any) => handleRuleChange(index, 'showCurrency', e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label={<Typography variant="body2" fontSize="0.8rem">Currency</Typography>}
                sx={{ margin: 0, flex: '0 0 auto' }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    ));
  }, [rules, handleRuleChange, handleRemoveRule]);

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth={false}
      fullWidth={false}
      PaperComponent={DraggablePaper}
      PaperProps={{
        sx: {
          borderRadius: 3,
          width: `${dialogSize.width}px`,
          height: `${dialogSize.height}px`,
          maxWidth: '90vw',
          maxHeight: '90vh',
          minWidth: '500px',
          minHeight: '400px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }
      }}
      BackdropProps={{
        sx: { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
      }}
    >
      {/* Draggable Header with Close Button */}
      <DialogTitle
        id="draggable-dialog-title"
        sx={{
          cursor: 'move',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          borderBottom: '1px solid #e5e7eb',
          py: 3,
          px: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            width={40}
            height={40}
            borderRadius={2}
            bgcolor="primary.main"
            color="white"
          >
            <Cog6ToothIcon className="h-6 w-6" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Variable Formatting
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure how {variables.length} selected variable{variables.length !== 1 ? 's' : ''} are displayed
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={handleCancel}
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'grey.100',
              color: 'text.primary'
            }
          }}
          aria-label="Close dialog"
        >
          <XMarkIcon className="h-5 w-5" />
        </IconButton>
      </DialogTitle>

      {/* Content - Single scrollable area following Google best practices */}
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {rules.length === 0 ? (
          <Box textAlign="center" py={8} px={4}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              width={64}
              height={64}
              borderRadius="50%"
              bgcolor="grey.100"
              mx="auto"
              mb={2}
            >
              <Cog6ToothIcon className="h-8 w-8 text-gray-400" />
            </Box>
            <Typography variant="h6" color="text.secondary" mb={1}>
              No variables selected
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Select variables in the analytics table to configure their formatting
            </Typography>
          </Box>
        ) : (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header Actions - Fixed */}
            <Box 
              display="flex" 
              justifyContent="space-between" 
              alignItems="center" 
              p={3}
              pb={2}
              sx={{ 
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: '#fafbfc'
              }}
            >
              <Typography variant="h6" fontWeight={600} fontSize="1.1rem">
                Formatting Rules ({rules.length})
              </Typography>
              <Button
                onClick={handleResetToDefaults}
                variant="outlined"
                size="small"
                sx={{ 
                  borderRadius: 2,
                  borderColor: '#8b5cf6',
                  color: '#8b5cf6',
                  fontSize: '0.875rem',
                  px: 2,
                  py: 0.5,
                  '&:hover': {
                    borderColor: '#7c3aed',
                    backgroundColor: '#f3f4f6'
                  }
                }}
              >
                Reset to Defaults
              </Button>
            </Box>

            {/* Rule Cards - Single scrollable area */}
            <Box 
              sx={{ 
                flex: 1,
                overflow: 'auto',
                p: 3,
                '&::-webkit-scrollbar': { 
                  width: '8px' 
                }, 
                '&::-webkit-scrollbar-track': { 
                  background: 'transparent' 
                }, 
                '&::-webkit-scrollbar-thumb': { 
                  background: '#cbd5e1', 
                  borderRadius: '4px',
                  '&:hover': {
                    background: '#94a3b8'
                  }
                }
              }}
            >
              {ruleCards}
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <Divider />
      <DialogActions sx={{ p: 3, gap: 2 }}>
        <button
          onClick={handleCancel}
          className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          disabled={!hasChanges}
          className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply
        </button>
      </DialogActions>
      
      {/* Resize Handle - Polished Google-style corner grip */}
      <Box
        onMouseDown={handleResizeStart}
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '20px',
          height: '20px',
          cursor: 'nwse-resize',
          zIndex: 1300,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          '&:hover': {
            '&::before': {
              opacity: 1
            }
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            width: '0',
            height: '0',
            borderStyle: 'solid',
            borderWidth: '0 0 12px 12px',
            borderColor: 'transparent transparent rgba(99, 102, 241, 0.3) transparent',
            opacity: isResizing ? 1 : 0.5,
            transition: 'opacity 0.2s ease'
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '6px',
            right: '6px',
            width: '0',
            height: '0',
            borderStyle: 'solid',
            borderWidth: '0 0 8px 8px',
            borderColor: 'transparent transparent rgba(99, 102, 241, 0.6) transparent'
          }
        }}
        aria-label="Resize dialog"
      />
    </Dialog>
  );
};

// Helper functions
const formatVariableDisplayName = (variableName: string): string => {
  return variableName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/\bTcc\b/g, 'TCC')
    .replace(/\bRvu\b/g, 'RVU')
    .replace(/\bRvus\b/g, 'RVUs')
    .replace(/\bAsa\b/g, 'ASA')
    .replace(/\bCf\b/g, 'CF')
    .replace(/\bCfs\b/g, 'TCC per wRVUs (CFs)');
};

const detectFormatType = (variableName: string): 'currency' | 'number' | 'percentage' => {
  const lower = variableName.toLowerCase();
  
  if (lower.includes('percentage') || lower.includes('percent') || lower.includes('ratio')) {
    return 'percentage';
  }
  
  if (lower.match(/tcc|compensation|salary|cash|pay|base|cf$/)) {
    return 'currency';
  }
  
  return 'number';
};

const detectDecimals = (variableName: string): number => {
  const lower = variableName.toLowerCase();
  
  if (lower.includes('per') || lower.includes('rate') || lower.includes('cf')) {
    return 2; // Ratios and rates need 2 decimals
  }
  
  if (lower.includes('percentage') || lower.includes('percent')) {
    return 1; // Percentages need 1 decimal
  }
  
  return 0; // Default to no decimals
};

const detectCurrency = (variableName: string): boolean => {
  const lower = variableName.toLowerCase();
  return lower.match(/tcc|compensation|salary|cash|pay|base/) !== null;
};
