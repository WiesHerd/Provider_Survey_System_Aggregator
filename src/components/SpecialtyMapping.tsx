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
  BoltIcon
} from '@heroicons/react/24/outline';
import { SpecialtyMappingService } from '../services/SpecialtyMappingService';
import { LocalStorageService } from '../services/StorageService';
import { ISpecialtyMapping, IUnmappedSpecialty, IAutoMappingConfig } from '../types/specialty';
import MappedSpecialties from './MappedSpecialties';
import AutoMapSpecialties from './AutoMapSpecialties';

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
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped'>('unmapped');
  const [isAutoMapOpen, setIsAutoMapOpen] = useState(false);

  const mappingService = new SpecialtyMappingService(new LocalStorageService());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mappingsData, unmappedData] = await Promise.all([
        mappingService.getAllMappings(),
        mappingService.getUnmappedSpecialties()
      ]);
      setMappings(mappingsData);
      setUnmappedSpecialties(unmappedData);
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

  const handleCreateMapping = async () => {
    if (selectedSpecialties.length === 0) return;

    try {
      // Use the first specialty name as the standardized name
      const standardizedName = selectedSpecialties[0].name;
      
      const sourceSpecialties = selectedSpecialties.map(specialty => ({
        id: crypto.randomUUID(),
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 min-h-screen p-6">
      {/* Header with Auto-Map Button */}
      <div className="flex justify-between items-center mb-6">
        <Typography variant="h4" className="text-gray-900">
          Specialty Mapping
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setIsAutoMapOpen(true)}
          startIcon={<BoltIcon className="h-5 w-5" />}
        >
          Auto-Map Specialties
        </Button>
      </div>

      <div className="flex flex-col w-full bg-gray-50">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <Typography variant="h6" className="text-gray-700">
                Specialty Mapping
              </Typography>
              <Button
                variant="contained"
                onClick={handleCreateMapping}
                startIcon={<AddIcon className="h-5 w-5" />}
                disabled={selectedSpecialties.length === 0}
              >
                Create Mapping
              </Button>
            </div>
          </div>

          {error && (
            <Alert severity="error" className="mx-6 mb-4">
              {error}
            </Alert>
          )}

          <div className="border-b border-gray-200">
            <Tabs 
              value={activeTab} 
              onChange={(_, newValue) => setActiveTab(newValue)}
              className="px-6"
            >
              <Tab label="Unmapped Specialties" value="unmapped" />
              <Tab label="Mapped Specialties" value="mapped" />
            </Tabs>
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
            ) : (
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

                {filteredMappings.map((mapping) => (
                  <MappedSpecialties
                    key={mapping.id}
                    mapping={mapping}
                    onEdit={() => {/* TODO: Implement edit */}}
                    onDelete={() => {/* TODO: Implement delete */}}
                  />
                ))}
                
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
            )}
          </div>
        </div>
      </div>

      {/* Auto-Map Dialog */}
      <Dialog
        open={isAutoMapOpen}
        onClose={() => setIsAutoMapOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <AutoMapSpecialties 
          onClose={() => setIsAutoMapOpen(false)} 
          onMappingsCreated={() => {
            loadData(); // Refresh the data
            setActiveTab('mapped'); // Switch to mapped tab
            setIsAutoMapOpen(false); // Close the dialog
          }}
        />
      </Dialog>
    </div>
  );
};

export default SpecialtyMapping; 