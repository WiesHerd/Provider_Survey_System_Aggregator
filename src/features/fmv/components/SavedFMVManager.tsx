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
  currentCalculation?: {
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
    setIsLoadDialogOpen(false);
    setSelectedCalculation(null);
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
          <div className="flex justify-between items-center mb-4">
            <div>
              <Typography variant="h6" className="font-semibold text-gray-900">
                Saved Calculations
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                Save and manage FMV calculations for specific providers
              </Typography>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outlined"
                startIcon={<EyeIcon className="w-4 h-4" />}
                onClick={() => setIsLoadDialogOpen(true)}
                disabled={savedCalculations.length === 0}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Load ({savedCalculations.length})
              </Button>
              <Button
                variant="contained"
                startIcon={<PlusIcon className="w-4 h-4" />}
                onClick={() => setIsSaveDialogOpen(true)}
                disabled={!currentCalculation || !currentCalculation.marketData}
                className="bg-blue-600 hover:bg-blue-700 text-white"
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
            <div className="text-center py-8 text-gray-500">
              <BookmarkIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <Typography variant="body2">
                No saved calculations yet. Save your first calculation to get started.
              </Typography>
            </div>
          ) : (
            <div className="space-y-2">
              {savedCalculations.slice(0, 3).map((calc) => (
                <div
                  key={calc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <Typography variant="subtitle2" className="font-medium text-gray-900">
                      {calc.providerName}
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      {formatFiltersSummary(calc.filters)}
                    </Typography>
                    <div className="flex items-center gap-2 mt-1">
                      <Chip
                        label={calc.compareType}
                        size="small"
                        className="bg-blue-100 text-blue-800"
                      />
                      <Typography variant="caption" className="text-gray-500">
                        {formatCalculationSummary(calc)}
                      </Typography>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton
                      size="small"
                      onClick={() => handleLoadCalculation(calc)}
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteCalculation(calc.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </IconButton>
                  </div>
                </div>
              ))}
              {savedCalculations.length > 3 && (
                <Typography variant="caption" className="text-gray-500 text-center block">
                  And {savedCalculations.length - 3} more... Click "Load" to see all
                </Typography>
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
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveCalculation} 
            variant="contained"
            sx={{ textTransform: 'none' }}
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
          <Button onClick={() => setIsLoadDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => selectedCalculation && handleLoadCalculation(selectedCalculation)}
            variant="contained"
            disabled={!selectedCalculation}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Load Selected
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
