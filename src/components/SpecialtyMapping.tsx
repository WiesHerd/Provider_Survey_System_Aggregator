import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Box
} from '@mui/material';
import { 
  PencilIcon as EditIcon,
  TrashIcon as DeleteIcon,
  PlusIcon as AddIcon,
  MagnifyingGlassIcon as SearchIcon,
  ExclamationTriangleIcon as WarningIcon,
  BoltIcon,
  TrashIcon as DeleteSweepIcon,
  ArrowRightIcon,
  LightBulbIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { SpecialtyMappingService } from '../services/SpecialtyMappingService';
import { LocalStorageService } from '../services/StorageService';
import { ISpecialtyMapping, IUnmappedSpecialty, IAutoMappingConfig } from '../types/specialty';
import MappedSpecialties from './MappedSpecialties';
import AutoMapSpecialties from './AutoMapSpecialties';
import AutoMapDialog from './shared/AutoMapDialog';

interface SpecialtyCardProps {
  specialty: IUnmappedSpecialty;
  isSelected: boolean;
  onSelect: (specialty: IUnmappedSpecialty) => void;
}

const SpecialtyCard: React.FC<SpecialtyCardProps> = ({ specialty, isSelected, onSelect }) => (
  <button
    onClick={() => onSelect(specialty)}
    className={`w-full p-3 mb-2 text-left rounded-lg transition-all ${
      isSelected 
        ? 'bg-indigo-100 border-2 border-indigo-500' 
        : 'bg-white hover:bg-gray-50 border border-gray-200'
    }`}
  >
    <div className="font-medium">{specialty.name}</div>
    <div className="text-sm text-gray-500">Frequency: {specialty.frequency}</div>
  </button>
);

const SpecialtyMapping: React.FC = () => {
  // State for data
  const [mappings, setMappings] = useState<ISpecialtyMapping[]>([]);
  const [unmappedSpecialties, setUnmappedSpecialties] = useState<IUnmappedSpecialty[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<IUnmappedSpecialty[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');
  
  // State for UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped' | 'learned'>('unmapped');
  const [isAutoMapOpen, setIsAutoMapOpen] = useState(false);
  const [learnedMappings, setLearnedMappings] = useState<Record<string, string>>({});
  const [showHelp, setShowHelp] = useState(false);

  const mappingService = new SpecialtyMappingService(new LocalStorageService());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mappingsData, unmappedData, learnedData] = await Promise.all([
        mappingService.getAllMappings(),
        mappingService.getUnmappedSpecialties(),
        mappingService.getLearnedMappings()
      ]);
      setMappings(mappingsData);
      setUnmappedSpecialties(unmappedData);
      setLearnedMappings(learnedData || {});
      setError(null);
    } catch (err) {
      setError('Failed to load specialty data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUnmapped = useMemo(() => {
    return unmappedSpecialties.filter(specialty => 
      specialty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      specialty.surveySource.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [unmappedSpecialties, searchTerm]);

  // Group specialties by survey source
  const specialtiesBySurvey = useMemo(() => {
    const grouped = new Map<string, IUnmappedSpecialty[]>();
    filteredUnmapped.forEach(specialty => {
      const current = grouped.get(specialty.surveySource) || [];
      grouped.set(specialty.surveySource, [...current, specialty]);
    });
    return grouped;
  }, [filteredUnmapped]);

  // Filter mapped specialties based on search
  const filteredMappings = useMemo(() => {
    if (!mappedSearchTerm) return mappings;
    return mappings.filter(mapping => 
      mapping.standardizedName.toLowerCase().includes(mappedSearchTerm.toLowerCase())
    );
  }, [mappings, mappedSearchTerm]);

  const handleAutoMap = async (config: {
    confidenceThreshold: number;
    useExistingMappings: boolean;
    enableFuzzyMatching: boolean;
  }) => {
    const mappingConfig = {
      confidenceThreshold: config.confidenceThreshold,
      useExistingMappings: config.useExistingMappings,
      useFuzzyMatching: config.enableFuzzyMatching
    };

    const suggestions = await mappingService.generateMappingSuggestions(mappingConfig);

    // Create mappings from suggestions
    for (const suggestion of suggestions) {
      await mappingService.createMapping(
        suggestion.standardizedName,
        suggestion.specialties.map((s: { name: string; surveySource: string }) => ({
          id: crypto.randomUUID(),
          specialty: s.name,
          originalName: s.name,
          surveySource: s.surveySource,
          mappingId: ''
        }))
      );
    }

    // Refresh data and close dialog
    await loadData();
    setActiveTab('mapped');
    setIsAutoMapOpen(false);
  };

  const handleCreateMapping = async () => {
    if (selectedSpecialties.length === 0) return;

    try {
      // Use the first specialty name as the standardized name
      const standardizedName = selectedSpecialties[0].name;
      
      const sourceSpecialties = selectedSpecialties.map(specialty => ({
        id: crypto.randomUUID(),
        specialty: specialty.name,
        originalName: specialty.name,
        surveySource: specialty.surveySource,
        mappingId: ''
      }));

      const mapping = await mappingService.createMapping(standardizedName, sourceSpecialties);
      setMappings([...mappings, mapping]);
      setUnmappedSpecialties(unmappedSpecialties.filter(
        s => !selectedSpecialties.some(selected => selected.id === s.id)
      ));
      setSelectedSpecialties([]);
      setActiveTab('mapped'); // Switch to mapped view after creating
    } catch (err) {
      setError('Failed to create mapping');
      console.error('Error creating mapping:', err);
    }
  };

  const handleSpecialtySelect = (specialty: IUnmappedSpecialty) => {
    if (selectedSpecialties.some(s => s.id === specialty.id)) {
      setSelectedSpecialties(selectedSpecialties.filter(s => s.id !== specialty.id));
    } else {
      setSelectedSpecialties([...selectedSpecialties, specialty]);
    }
  };

  const handleDelete = async (mappingId: string) => {
    try {
      await mappingService.deleteMapping(mappingId);
      // Remove from local state
      setMappings(mappings.filter(m => m.id !== mappingId));
      // Refresh unmapped specialties to show the deleted ones
      const unmappedData = await mappingService.getUnmappedSpecialties();
      setUnmappedSpecialties(unmappedData);
      // Switch to unmapped tab
      setActiveTab('unmapped');
    } catch (err) {
      setError('Failed to delete mapping');
      console.error('Error deleting mapping:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="mx-6">
        {/* Collapsible Help Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowHelp((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded font-medium mb-2"
          >
            <span className="flex items-center gap-2">
              <LightBulbIcon className="h-5 w-5 text-indigo-600" />
              <span>Specialty Mapping Help</span>
            </span>
            <ChevronDownIcon 
              className={`h-5 w-5 text-indigo-600 transition-transform duration-200 ${showHelp ? 'rotate-180' : ''}`}
            />
          </button>
          {showHelp && (
            <div className="p-4 bg-white border border-indigo-100 rounded shadow text-sm space-y-3">
              <h3 className="font-bold text-indigo-700 mb-1">How Auto-Mapping Works</h3>
              <ul className="list-disc pl-5 mb-2">
                <li>The app uses smart matching (including fuzzy logic and learned mappings) to suggest standardized specialties for each survey's specialty names.</li>
                <li>Auto-mapping considers spelling, abbreviations, and previous user corrections to improve accuracy.</li>
                <li>You can adjust the confidence threshold and enable/disable fuzzy matching in the Auto-Map dialog.</li>
              </ul>
              <h3 className="font-bold text-indigo-700 mb-1">How to Review and Fix Mappings</h3>
              <ul className="list-disc pl-5 mb-2">
                <li>After auto-mapping, review the suggested mappings in the "Mapped" tab.</li>
                <li>If a specialty is mapped incorrectly, you can delete the mapping and manually remap it by selecting the correct specialties and clicking "Create Mapping."</li>
                <li>Use the search bar to quickly find and review specific specialties.</li>
                <li>Clearing all mappings will reset the process and allow you to start over.</li>
              </ul>
              <h3 className="font-bold text-indigo-700 mb-1">Best Practices</h3>
              <ul className="list-disc pl-5">
                <li>Always review auto-mapped results for accuracy, especially for uncommon or ambiguous specialty names.</li>
                <li>Use consistent naming conventions in your source data for best results.</li>
                <li>Contact support if you encounter persistent mapping issues.</li>
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          {error && (
            <Alert severity="error" className="mb-4">
              {error}
            </Alert>
          )}

          {/* Tabs and Action Buttons */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <Tabs 
                value={activeTab} 
                onChange={(_, newValue) => setActiveTab(newValue)}
              >
                <Tab label="Unmapped Specialties" value="unmapped" />
                <Tab label="Mapped Specialties" value="mapped" />
                <Tab label="Learned Mappings" value="learned" />
              </Tabs>
              <div className="flex space-x-4">
                {activeTab !== 'learned' && (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => setIsAutoMapOpen(true)}
                      startIcon={<BoltIcon className="h-5 w-5" />}
                    >
                      Auto-Map Specialties
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleCreateMapping}
                      startIcon={<AddIcon className="h-5 w-5" />}
                      disabled={selectedSpecialties.length === 0}
                    >
                      Create Mapping
                    </Button>
                  </>
                )}
                {activeTab === 'mapped' && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all mappings? This cannot be undone.')) {
                        mappingService.clearAllMappings().then(() => {
                          setMappings([]);
                          setLearnedMappings({});
                          setActiveTab('unmapped');
                          loadData();
                        });
                      }
                    }}
                    startIcon={<DeleteSweepIcon className="h-5 w-5" />}
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'unmapped' ? (
              <>
                <div className="mb-6">
                  <TextField
                    fullWidth
                    placeholder="Search across all surveys..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon className="h-5 w-5 text-gray-400" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </div>

                {selectedSpecialties.length > 0 && (
                  <div className="mb-6">
                    <Typography variant="subtitle2" className="mb-2">
                      Selected Specialties:
                    </Typography>
                    <div className="flex flex-wrap gap-2">
                      {selectedSpecialties.map((specialty) => (
                        <Chip
                          key={specialty.id}
                          label={`${specialty.name} (${specialty.surveySource})`}
                          onDelete={() => handleSpecialtySelect(specialty)}
                          color="primary"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from(specialtiesBySurvey.entries()).map(([source, specialties]) => {
                    const color = source === 'SullivanCotter' ? '#818CF8' :
                                source === 'MGMA' ? '#34D399' :
                                source === 'Gallagher' ? '#F472B6' :
                                source === 'ECG' ? '#FBBF24' :
                                source === 'AMGA' ? '#60A5FA' : '#9CA3AF';
                    
                    return (
                      <Paper key={source} className="p-4 relative overflow-hidden">
                        <Typography variant="h6" className="mb-4 flex items-center justify-between">
                          <span style={{ color }}>{source}</span>
                          <Typography variant="caption" color="textSecondary">
                            {specialties.length} specialties
                          </Typography>
                        </Typography>
                        <div className="space-y-2">
                          {specialties.map((specialty) => (
                            <SpecialtyCard
                              key={specialty.id}
                              specialty={specialty}
                              isSelected={selectedSpecialties.some(s => s.id === specialty.id)}
                              onSelect={handleSpecialtySelect}
                            />
                          ))}
                        </div>
                        <div className="absolute bottom-0 inset-x-0 h-1.5" style={{ backgroundColor: color }} />
                      </Paper>
                    );
                  })}
                </div>
              </>
            ) : activeTab === 'mapped' ? (
              <div className="space-y-6">
                <div className="mb-6">
                  <TextField
                    fullWidth
                    placeholder="Search mapped specialties..."
                    value={mappedSearchTerm}
                    onChange={(e) => setMappedSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon className="h-5 w-5 text-gray-400" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </div>

                <div className="space-y-4">
                  {filteredMappings.map((mapping) => (
                    <MappedSpecialties
                      key={mapping.id}
                      mapping={mapping}
                      onDelete={() => handleDelete(mapping.id)}
                    />
                  ))}
                </div>
                
                {filteredMappings.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <p className="text-gray-500">
                      {mappedSearchTerm 
                        ? "No mapped specialties match your search"
                        : "No mapped specialties yet"}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // Learned Mappings View
              <div className="space-y-6">
                <div className="mb-6">
                  <TextField
                    fullWidth
                    placeholder="Search learned mappings..."
                    value={mappedSearchTerm}
                    onChange={(e) => setMappedSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon className="h-5 w-5 text-gray-400" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </div>

                <div className="space-y-4">
                  {Object.entries(learnedMappings)
                    .filter(([original, corrected]) => 
                      !mappedSearchTerm || 
                      original.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
                      corrected.toLowerCase().includes(mappedSearchTerm.toLowerCase())
                    )
                    .map(([original, corrected]) => (
                      <MappedSpecialties
                        key={original}
                        mapping={{
                          id: original,
                          standardizedName: corrected,
                          sourceSpecialties: [{
                            id: crypto.randomUUID(),
                            specialty: original,
                            originalName: original,
                            surveySource: 'Learned',
                            mappingId: original
                          }],
                          createdAt: new Date(),
                          updatedAt: new Date()
                        }}
                        onDelete={() => {
                          if (window.confirm('Remove this learned mapping?')) {
                            mappingService.removeLearnedMapping(original).then(() => {
                              const newLearnedMappings = { ...learnedMappings };
                              delete newLearnedMappings[original];
                              setLearnedMappings(newLearnedMappings);
                            });
                          }
                        }}
                      />
                    ))}

                  {Object.keys(learnedMappings).length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Typography variant="body1" className="text-gray-500">
                        No learned mappings yet
                      </Typography>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Auto-Map Dialog */}
          <Dialog
            open={isAutoMapOpen}
            onClose={() => setIsAutoMapOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <AutoMapDialog
              title="Auto-Map Specialties"
              description="Automatically map specialties based on similarity and existing mappings."
              onClose={() => setIsAutoMapOpen(false)}
              onAutoMap={handleAutoMap}
            />
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default SpecialtyMapping; 