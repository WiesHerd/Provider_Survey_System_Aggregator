/**
 * Specialty Blending Selector Component
 * 
 * Allows users to toggle between single specialty and blended specialties
 * for FMV calculations. Supports both percentage-based and weighted blending.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Alert,
  Divider
} from '@mui/material';
import {
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { SpecialtyBlendingSelectorProps, SpecialtyBlendItem } from '../types/fmv';
import { SpecialtyBlendItemComponent } from './SpecialtyBlendItemComponent';

/**
 * Specialty Blending Selector Component
 * 
 * Provides UI for configuring specialty blending in FMV calculations.
 * Supports both percentage-based and weighted blending methods.
 */
export const SpecialtyBlendingSelector: React.FC<SpecialtyBlendingSelectorProps> = ({
  useBlending,
  blendingConfig,
  availableSpecialties,
  onBlendingToggle,
  onBlendingConfigChange
}) => {
  const [localConfig, setLocalConfig] = useState(blendingConfig || {
    specialties: [],
    blendingMethod: 'percentage' as const,
    totalPercentage: 0
  });

  // Calculate total percentage
  const totalPercentage = useMemo(() => {
    return localConfig.specialties.reduce((sum, item) => sum + item.percentage, 0);
  }, [localConfig.specialties]);

  // Validation
  const isValid = totalPercentage === 100;
  const hasWarnings = totalPercentage !== 100;

  // Handle adding new specialty
  const handleAddSpecialty = () => {
    const newItem: SpecialtyBlendItem = {
      specialty: '',
      percentage: 0,
      weight: 1,
      sampleSize: 0
    };

    const updatedConfig = {
      ...localConfig,
      specialties: [...localConfig.specialties, newItem]
    };

    setLocalConfig(updatedConfig);
    onBlendingConfigChange(updatedConfig);
  };

  // Handle removing specialty
  const handleRemoveSpecialty = (index: number) => {
    const updatedSpecialties = localConfig.specialties.filter((_, i) => i !== index);
    const updatedConfig = {
      ...localConfig,
      specialties: updatedSpecialties,
      totalPercentage: updatedSpecialties.reduce((sum, item) => sum + item.percentage, 0)
    };

    setLocalConfig(updatedConfig);
    onBlendingConfigChange(updatedConfig);
  };

  // Handle blending method change
  const handleBlendingMethodChange = (method: 'percentage' | 'weighted') => {
    const updatedConfig = {
      ...localConfig,
      blendingMethod: method
    };

    setLocalConfig(updatedConfig);
    onBlendingConfigChange(updatedConfig);
  };

  // Handle specialty item change
  const handleSpecialtyChange = (index: number, updatedItem: SpecialtyBlendItem) => {
    const updatedSpecialties = localConfig.specialties.map((item, i) => 
      i === index ? updatedItem : item
    );

    const updatedConfig = {
      ...localConfig,
      specialties: updatedSpecialties,
      totalPercentage: updatedSpecialties.reduce((sum, item) => sum + item.percentage, 0)
    };

    setLocalConfig(updatedConfig);
    onBlendingConfigChange(updatedConfig);
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <Typography variant="h6" className="text-gray-900 font-semibold">
              Specialty Blending
            </Typography>
            <Typography variant="body2" className="text-gray-600">
              Blend multiple specialties for complex practice profiles
            </Typography>
          </div>
          
            <FormControlLabel
              control={
                <Switch
                  checked={useBlending}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onBlendingToggle(e.target.checked)}
                  color="primary"
                />
              }
              label={useBlending ? "Blended Specialties" : "Single Specialty"}
              className="ml-4"
            />
        </div>

        {useBlending && (
          <>
            {/* Blending Method Selection */}
            <div className="mb-4">
              <Typography variant="subtitle2" className="text-gray-700 font-medium mb-2">
                Blending Method
              </Typography>
              <div className="flex space-x-4">
                <Button
                  variant={localConfig.blendingMethod === 'percentage' ? 'contained' : 'outlined'}
                  onClick={() => handleBlendingMethodChange('percentage')}
                  size="small"
                >
                  Percentage-Based
                </Button>
                <Button
                  variant={localConfig.blendingMethod === 'weighted' ? 'contained' : 'outlined'}
                  onClick={() => handleBlendingMethodChange('weighted')}
                  size="small"
                >
                  Weighted Average
                </Button>
              </div>
            </div>

            <Divider className="my-4" />

            {/* Specialty Items */}
            <div className="space-y-3">
              {localConfig.specialties.map((item, index) => (
                <SpecialtyBlendItemComponent
                  key={index}
                  item={item}
                  availableSpecialties={availableSpecialties}
                  onItemChange={(updatedItem: SpecialtyBlendItem) => handleSpecialtyChange(index, updatedItem)}
                  onRemove={() => handleRemoveSpecialty(index)}
                  canRemove={localConfig.specialties.length > 1}
                />
              ))}

              {/* Add Specialty Button */}
              <Button
                variant="outlined"
                startIcon={<PlusIcon className="w-4 h-4" />}
                onClick={handleAddSpecialty}
                className="w-full"
                size="small"
              >
                Add Specialty
              </Button>
            </div>

            {/* Validation and Warnings */}
            {hasWarnings && (
              <Alert 
                severity="warning" 
                className="mt-4"
                icon={<ExclamationTriangleIcon className="w-5 h-5" />}
              >
                <Typography variant="body2">
                  <strong>Percentage Total: {totalPercentage}%</strong>
                  {totalPercentage < 100 && " - Must equal 100% for valid blending"}
                  {totalPercentage > 100 && " - Cannot exceed 100%"}
                </Typography>
              </Alert>
            )}

            {/* Summary */}
            {localConfig.specialties.length > 0 && (
              <Box className="mt-4 p-3 bg-gray-50 rounded-lg">
                <Typography variant="subtitle2" className="text-gray-700 font-medium mb-2">
                  Blending Summary
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {localConfig.specialties.map((item, index) => (
                    <Chip
                      key={index}
                      label={`${item.specialty} (${item.percentage}%)`}
                      color={isValid ? "primary" : "warning"}
                      size="small"
                    />
                  ))}
                </div>
                <Typography 
                  variant="body2" 
                  className={`mt-2 ${isValid ? 'text-green-600' : 'text-orange-600'}`}
                >
                  Total: {totalPercentage}% {isValid ? '✓' : '⚠️'}
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SpecialtyBlendingSelector;
