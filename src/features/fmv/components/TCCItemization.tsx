import React from 'react';
import { 
  Paper, 
  Typography, 
  Grid, 
  TextField, 
  Box, 
  Button, 
  InputAdornment 
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { TrashIcon } from '@heroicons/react/24/outline';
import { TCCItemizationProps } from '../types/fmv';
import { calculateTotalTCC } from '../utils/fmvCalculations';

/**
 * TCC Itemization component for breaking down compensation components
 * 
 * @param components - Array of compensation components
 * @param onComponentsChange - Callback when components change
 */
export const TCCItemization: React.FC<TCCItemizationProps> = ({ 
  components, 
  onComponentsChange 
}) => {
  const addComponent = () => {
    onComponentsChange([...components, { type: '', amount: '', notes: '' }]);
  };

  const removeComponent = (idx: number) => {
    onComponentsChange(components.filter((_, i) => i !== idx));
  };

  const updateComponent = (idx: number, field: 'type' | 'amount' | 'notes', value: string) => {
    const newComps = [...components];
    newComps[idx] = { ...newComps[idx], [field]: value };
    onComponentsChange(newComps);
  };

  const total = calculateTotalTCC(components);

  return (
    <Paper sx={{ 
      p: 2, 
      mb: 3, 
      border: '1.5px solid #b0b4bb', 
      boxShadow: 'none' 
    }}>
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
        Compensation Components
      </Typography>
      
      <Grid container spacing={2} alignItems="center">
        {components.map((component, idx) => (
          <React.Fragment key={idx}>
            <Grid item xs={12} md={3}>
              <Autocomplete
                freeSolo
                options={["Base Salary", "Bonus", "Incentive", "Other"]}
                value={component.type}
                onInputChange={(_, newValue) => updateComponent(idx, 'type', newValue)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Type" 
                    fullWidth 
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                      }
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <TextField
                label="Amount"
                type="number"
                value={component.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  updateComponent(idx, 'amount', e.target.value)
                }
                fullWidth
                size="small"
                InputProps={{ 
                  startAdornment: <InputAdornment position="start">$</InputAdornment> 
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                label="Notes"
                value={component.notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  updateComponent(idx, 'notes', e.target.value)
                }
                size="small"
                sx={{ 
                  flex: 1, 
                  mr: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                  }
                }}
              />
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                minWidth: 120, 
                justifyContent: 'flex-end' 
              }}>
                <Button
                  onClick={() => removeComponent(idx)}
                  color="error"
                  size="small"
                  sx={{ minWidth: 0, p: 1, mr: 1 }}
                  aria-label="Remove"
                >
                  <TrashIcon className="h-5 w-5 text-gray-500" />
                </Button>
              </Box>
            </Grid>
          </React.Fragment>
        ))}
      </Grid>
      
      {/* Total TCC and Add Component Button */}
      <Box sx={{ 
        mt: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between' 
      }}>
        <Typography sx={{ 
          fontWeight: 700, 
          fontSize: '1.1rem', 
          textAlign: 'left' 
        }}>
          Total TCC: ${total.toLocaleString()}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>+</span>}
          onClick={addComponent}
          sx={{
            borderRadius: '8px',
          }}
        >
          Add Component
        </Button>
      </Box>
    </Paper>
  );
};
