import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Divider
} from '@mui/material';
import {
  BookmarkIcon,
  TrashIcon,
  EyeIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { SavedFMVCalculation, FMVFilters, CompensationComponent, CompareType, MarketData, UserPercentiles } from '../types/fmv';
import { formatCurrency } from '../../../shared/utils/formatters';

interface SavedFMVManagerProps {
  onLoadCalculation: (calculation: SavedFMVCalculation) => void;
  onSaveCalculation: (calculation: Omit<SavedFMVCalculation, 'id' | 'created' | 'lastModified'>) => void;
  onDeleteCalculation: (id: string) => void;
  onCalculationsCountChange?: (count: number) => void;
  currentCalculation?: {
    providerName: string;
    filters: FMVFilters;
    compComponents: CompensationComponent[];
    wrvus: string;
    cf: string;
    compareType: CompareType;
    marketData: MarketData | null;
    percentiles: UserPercentiles;
    calculatedValue: number;
    marketPercentile: number;
  };
}

const STORAGE_KEY = 'saved_fmv_calculations';

export const SavedFMVManager: React.FC<SavedFMVManagerProps> = ({
  onLoadCalculation,
  onSaveCalculation,
  onDeleteCalculation,
  onCalculationsCountChange,
  currentCalculation
}) => {
  const [savedCalculations, setSavedCalculations] = useState<SavedFMVCalculation[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCalculation, setSelectedCalculation] = useState<SavedFMVCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load saved calculations from localStorage
  useEffect(() => {
    const loadSavedCalculations = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Convert date strings back to Date objects
          const calculations = parsed.map((calc: any) => ({
            ...calc,
            created: new Date(calc.created),
            lastModified: new Date(calc.lastModified)
          }));
          setSavedCalculations(calculations);
        }
      } catch (error) {
        console.error('Error loading saved FMV calculations:', error);
        setError('Failed to load saved calculations');
      }
    };

    loadSavedCalculations();
  }, []);

  // Notify parent when calculations count changes
  useEffect(() => {
    onCalculationsCountChange?.(savedCalculations.length);
  }, [savedCalculations.length, onCalculationsCountChange]);

  // Save calculations to localStorage
  const saveToStorage = (calculations: SavedFMVCalculation[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(calculations));
    } catch (error) {
      console.error('Error saving FMV calculations:', error);
      setError('Failed to save calculations');
    }
  };

  const handleSaveCalculation = () => {
    if (!providerName.trim()) {
      setError('Please enter a provider name');
      return;
    }

    if (!currentCalculation) {
      setError('No calculation data to save');
      return;
    }

    if (!currentCalculation.marketData) {
      setError('Market data is required to save calculation');
      return;
    }

    const newCalculation: Omit<SavedFMVCalculation, 'id' | 'created' | 'lastModified'> = {
      providerName: providerName.trim(),
      filters: currentCalculation.filters,
      compComponents: currentCalculation.compComponents,
      wrvus: currentCalculation.wrvus,
      cf: currentCalculation.cf,
      compareType: currentCalculation.compareType,
      marketData: currentCalculation.marketData,
      percentiles: currentCalculation.percentiles,
      calculatedValue: currentCalculation.calculatedValue,
      marketPercentile: currentCalculation.marketPercentile,
      notes: notes.trim() || undefined
    };

    onSaveCalculation(newCalculation);

    // Add to local state
    const savedCalculation: SavedFMVCalculation = {
      ...newCalculation,
      id: Date.now().toString(),
      created: new Date(),
      lastModified: new Date()
    };

    const updatedCalculations = [...savedCalculations, savedCalculation];
    setSavedCalculations(updatedCalculations);
    saveToStorage(updatedCalculations);

    // Reset form
    setProviderName('');
    setNotes('');
    setIsSaveDialogOpen(false);
    setError(null);
  };

  const handleLoadCalculation = (calculation: SavedFMVCalculation) => {
    onLoadCalculation(calculation);
    // No modal needed - direct load
  };

  const handleSaveClick = () => {
    setIsSaveDialogOpen(true);
    setProviderName(currentCalculation?.providerName || '');
    setNotes('');
    setError(null);
  };

  const handleDeleteCalculation = (id: string) => {
    const updatedCalculations = savedCalculations.filter(calc => calc.id !== id);
    setSavedCalculations(updatedCalculations);
    saveToStorage(updatedCalculations);
    onDeleteCalculation(id);
  };

  const formatCalculationSummary = (calc: SavedFMVCalculation) => {
    const value = formatCurrency(calc.calculatedValue);
    const percentile = Math.round(calc.marketPercentile);
    return `${value} (${percentile}th percentile)`;
  };

  const formatFiltersSummary = (filters: FMVFilters) => {
    const parts = [];
    if (filters.specialty) parts.push(filters.specialty);
    if (filters.providerType) parts.push(filters.providerType);
    if (filters.region) parts.push(filters.region);
    return parts.join(' • ');
  };

  return (
    <div className="w-full">
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BookmarkIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <Typography variant="h5" className="font-bold text-gray-900">
                  Saved Calculations
                </Typography>
                <Typography variant="body2" className="text-gray-600 mt-1">
                  Track and manage FMV calculations for specific providers
                </Typography>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                startIcon={<EyeIcon className="w-4 h-4" />}
                onClick={() => setIsLoadDialogOpen(true)}
                disabled={savedCalculations.length === 0}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                sx={{ 
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  color: 'white !important',
                  '&:hover': {
                    color: 'white !important'
                  }
                }}
              >
                Browse All ({savedCalculations.length})
              </Button>
              <Button
                startIcon={<PlusIcon className="w-4 h-4" />}
                onClick={handleSaveClick}
                disabled={!currentCalculation || !currentCalculation.marketData}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                sx={{ 
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  color: 'white !important',
                  '&:hover': {
                    color: 'white !important'
                  }
                }}
              >
                Save Current
              </Button>
            </div>
          </div>

          {error && (
            <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {savedCalculations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <BookmarkIcon className="w-8 h-8 text-blue-600" />
              </div>
              <Typography variant="h6" className="font-semibold text-gray-900 mb-2">
                No Saved Calculations
              </Typography>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  <div className="col-span-3">Provider</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Value</div>
                  <div className="col-span-2">Percentile</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-1 text-center">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {savedCalculations.slice(0, 10).map((calc, index) => (
                  <div
                    key={calc.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
                  >
                    {/* Provider */}
                    <div className="col-span-3">
                      <div className="font-medium text-gray-900 truncate">
                        {calc.providerName}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {formatFiltersSummary(calc.filters)}
                      </div>
                    </div>

                    {/* Type */}
                    <div className="col-span-2">
                      <div className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                        calc.compareType === 'TCC' ? 'bg-blue-100 text-blue-800' :
                        calc.compareType === 'wRVUs' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {calc.compareType}
                      </div>
                    </div>

                    {/* Value */}
                    <div className="col-span-2">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(calc.calculatedValue)}
                      </div>
                    </div>

                    {/* Percentile */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              calc.marketPercentile >= 75 ? 'bg-green-500' :
                              calc.marketPercentile >= 50 ? 'bg-blue-500' :
                              calc.marketPercentile >= 25 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(calc.marketPercentile, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-medium ${
                          calc.marketPercentile >= 75 ? 'text-green-600' :
                          calc.marketPercentile >= 50 ? 'text-blue-600' :
                          calc.marketPercentile >= 25 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {Math.round(calc.marketPercentile)}th
                        </span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="col-span-2">
                      <div className="text-sm text-gray-600">
                        {calc.created.toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleLoadCalculation(calc)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                        title="Load this calculation"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCalculation(calc.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                        title="Delete calculation"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer with count and view all */}
              {savedCalculations.length > 10 && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing 10 of {savedCalculations.length} calculations
                    </div>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => setIsLoadDialogOpen(true)}
                      className="text-blue-600 hover:text-blue-700"
                      sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 2,
                        py: 1
                      }}
                    >
                      Browse All ({savedCalculations.length})
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Dialog */}
      <Dialog 
        open={isSaveDialogOpen} 
        onClose={() => setIsSaveDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e5e7eb'
          }
        }}
      >
        <DialogTitle sx={{ padding: '24px 24px 0 24px', fontSize: '1.125rem', fontWeight: 600 }}>
          Save FMV Calculation
        </DialogTitle>
        <DialogContent sx={{ padding: '24px' }}>
          <div className="space-y-4">
            <TextField
              fullWidth
              label="Provider Name"
              value={providerName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProviderName(e.target.value)}
              placeholder="e.g., Dr. John Smith, Cardiologist"
              required
            />
            <TextField
              fullWidth
              label="Notes (Optional)"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
              placeholder="Additional notes about this calculation..."
              multiline
              rows={3}
            />
            {currentCalculation && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <Typography variant="subtitle2" className="font-medium mb-3 text-gray-900">
                  Calculation Summary
                </Typography>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Type
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {currentCalculation.compareType}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Value
                      </div>
                      <div className="text-sm font-bold text-blue-600">
                        {formatCurrency(currentCalculation.calculatedValue)}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Percentile
                      </div>
                      <div className="text-sm font-bold text-green-600">
                        {Math.round(currentCalculation.marketPercentile)}th
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Specialty
                      </div>
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {currentCalculation.filters.specialty}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Provider Type
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {currentCalculation.filters.providerType}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        Region
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {currentCalculation.filters.region}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogActions sx={{ padding: '16px 24px', gap: '8px' }}>
          <Button 
            onClick={() => setIsSaveDialogOpen(false)}
            className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              px: 4,
              py: 2,
              color: 'white !important',
              '&:hover': {
                color: 'white !important'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveCalculation} 
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              px: 4,
              py: 2,
              color: 'white !important',
              '&:hover': {
                color: 'white !important'
              }
            }}
          >
            Save Calculation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={isLoadDialogOpen} onClose={() => setIsLoadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Load Saved Calculation</DialogTitle>
        <DialogContent>
          <List>
            {savedCalculations.map((calc) => (
              <React.Fragment key={calc.id}>
                <ListItem
                  button
                  onClick={() => setSelectedCalculation(calc)}
                  className={selectedCalculation?.id === calc.id ? 'bg-blue-50' : ''}
                >
                  <ListItemText
                    primary={
                      <div className="flex items-center justify-between">
                        <Typography variant="subtitle1" className="font-medium">
                          {calc.providerName}
                        </Typography>
                        <Chip
                          label={calc.compareType}
                          size="small"
                          className="bg-blue-100 text-blue-800"
                        />
                      </div>
                    }
                    secondary={
                      <div className="space-y-1">
                        <Typography variant="body2" className="text-gray-600">
                          {formatFiltersSummary(calc.filters)}
                        </Typography>
                        <Typography variant="body2" className="font-medium">
                          {formatCalculationSummary(calc)}
                        </Typography>
                        {calc.notes && (
                          <Typography variant="caption" className="text-gray-500">
                            {calc.notes}
                          </Typography>
                        )}
                        <Typography variant="caption" className="text-gray-400 block">
                          Saved: {calc.created.toLocaleDateString()}
                        </Typography>
                      </div>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      onClick={() => handleDeleteCalculation(calc.id)}
                      className="text-red-600 hover:bg-red-50"
                      sx={{
                        borderRadius: '8px'
                      }}
                    >
                      <TrashIcon className="w-4 h-4" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setIsLoadDialogOpen(false)}
            className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              px: 4,
              py: 2,
              color: 'white !important',
              '&:hover': {
                color: 'white !important'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => selectedCalculation && handleLoadCalculation(selectedCalculation)}
            disabled={!selectedCalculation}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            sx={{
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              px: 4,
              py: 2,
              color: 'white !important',
              '&:hover': {
                color: 'white !important'
              }
            }}
          >
            Load Selected
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
