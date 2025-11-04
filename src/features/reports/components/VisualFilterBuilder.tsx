/**
 * Visual Filter Builder Component
 * 
 * Enterprise-grade filter builder following patterns from Power BI, Tableau, and Salesforce
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  IconButton, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Switch,
  FormControlLabel,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete
} from '@mui/material';
import { 
  PlusIcon, 
  TrashIcon, 
  Cog6ToothIcon,
  FunnelIcon,
  ChevronDownIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface FilterCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  values?: any[]; // For multi-select operators
  label: string;
}

interface FilterGroup {
  id: string;
  name: string;
  conditions: FilterCondition[];
  operator: 'AND' | 'OR';
  isActive: boolean;
}

interface VisualFilterBuilderProps {
  availableFields: Array<{
    id: string;
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    options?: string[];
  }>;
  onFiltersChange: (filters: FilterGroup[]) => void;
  initialFilters?: FilterGroup[];
}

const OPERATOR_OPTIONS = {
  string: [
    { value: 'equals', label: 'Equals', icon: '=' },
    { value: 'not_equals', label: 'Not Equals', icon: '≠' },
    { value: 'contains', label: 'Contains', icon: '⊃' },
    { value: 'not_contains', label: 'Does Not Contain', icon: '⊅' },
    { value: 'in', label: 'In List', icon: '∈' },
    { value: 'not_in', label: 'Not In List', icon: '∉' }
  ],
  number: [
    { value: 'equals', label: 'Equals', icon: '=' },
    { value: 'not_equals', label: 'Not Equals', icon: '≠' },
    { value: 'greater_than', label: 'Greater Than', icon: '>' },
    { value: 'less_than', label: 'Less Than', icon: '<' },
    { value: 'between', label: 'Between', icon: '⟷' },
    { value: 'in', label: 'In List', icon: '∈' },
    { value: 'not_in', label: 'Not In List', icon: '∉' }
  ],
  date: [
    { value: 'equals', label: 'Equals', icon: '=' },
    { value: 'not_equals', label: 'Not Equals', icon: '≠' },
    { value: 'greater_than', label: 'After', icon: '>' },
    { value: 'less_than', label: 'Before', icon: '<' },
    { value: 'between', label: 'Between', icon: '⟷' }
  ],
  boolean: [
    { value: 'equals', label: 'Equals', icon: '=' },
    { value: 'not_equals', label: 'Not Equals', icon: '≠' }
  ]
};

export const VisualFilterBuilder: React.FC<VisualFilterBuilderProps> = ({
  availableFields,
  onFiltersChange,
  initialFilters = []
}) => {
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>(initialFilters);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FilterGroup | null>(null);
  const [newCondition, setNewCondition] = useState<Partial<FilterCondition>>({
    field: '',
    operator: 'equals',
    value: '',
    label: ''
  });

  // Add new filter group
  const addFilterGroup = useCallback(() => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      name: `Filter Group ${filterGroups.length + 1}`,
      conditions: [],
      operator: 'AND',
      isActive: true
    };
    setFilterGroups(prev => [...prev, newGroup]);
    setEditingGroup(newGroup);
  }, [filterGroups.length]);

  // Add condition to group
  const addCondition = useCallback((groupId: string) => {
    const group = filterGroups.find(g => g.id === groupId);
    if (!group) return;

    const condition: FilterCondition = {
      id: `condition-${Date.now()}`,
      field: newCondition.field || '',
      operator: newCondition.operator || 'equals',
      value: newCondition.value || '',
      label: newCondition.label || '',
      values: newCondition.values || []
    };

    const updatedGroups = filterGroups.map(g => 
      g.id === groupId 
        ? { ...g, conditions: [...g.conditions, condition] }
        : g
    );

    setFilterGroups(updatedGroups);
    setNewCondition({ field: '', operator: 'equals', value: '', label: '' });
    onFiltersChange(updatedGroups);
  }, [filterGroups, newCondition, onFiltersChange]);

  // Remove condition
  const removeCondition = useCallback((groupId: string, conditionId: string) => {
    const updatedGroups = filterGroups.map(g => 
      g.id === groupId 
        ? { ...g, conditions: g.conditions.filter(c => c.id !== conditionId) }
        : g
    );
    setFilterGroups(updatedGroups);
    onFiltersChange(updatedGroups);
  }, [filterGroups, onFiltersChange]);

  // Remove filter group
  const removeFilterGroup = useCallback((groupId: string) => {
    const updatedGroups = filterGroups.filter(g => g.id !== groupId);
    setFilterGroups(updatedGroups);
    onFiltersChange(updatedGroups);
  }, [filterGroups, onFiltersChange]);

  // Toggle group active state
  const toggleGroupActive = useCallback((groupId: string) => {
    const updatedGroups = filterGroups.map(g => 
      g.id === groupId ? { ...g, isActive: !g.isActive } : g
    );
    setFilterGroups(updatedGroups);
    onFiltersChange(updatedGroups);
  }, [filterGroups, onFiltersChange]);

  // Update group operator
  const updateGroupOperator = useCallback((groupId: string, operator: 'AND' | 'OR') => {
    const updatedGroups = filterGroups.map(g => 
      g.id === groupId ? { ...g, operator } : g
    );
    setFilterGroups(updatedGroups);
    onFiltersChange(updatedGroups);
  }, [filterGroups, onFiltersChange]);

  // Get field options for selected field
  const selectedField = useMemo(() => {
    return availableFields.find(f => f.id === newCondition.field);
  }, [availableFields, newCondition.field]);

  // Get operator options for selected field type
  const operatorOptions = useMemo(() => {
    if (!selectedField) return [];
    return OPERATOR_OPTIONS[selectedField.type] || [];
  }, [selectedField]);

  // Render condition value input
  const renderValueInput = (condition: FilterCondition) => {
    const field = availableFields.find(f => f.id === condition.field);
    if (!field) return null;

    switch (field.type) {
      case 'string':
        if (condition.operator === 'in' || condition.operator === 'not_in') {
          return (
            <Autocomplete
              multiple
              options={field.options || []}
              value={condition.values || []}
              onChange={(e: React.SyntheticEvent, newValue: string[]) => {
                // Update condition values
                const updatedGroups = filterGroups.map(g => ({
                  ...g,
                  conditions: g.conditions.map(c => 
                    c.id === condition.id ? { ...c, values: newValue } : c
                  )
                }));
                setFilterGroups(updatedGroups);
                onFiltersChange(updatedGroups);
              }}
              renderInput={(params: any) => (
                <TextField {...params} placeholder="Select values..." size="small" />
              )}
              size="small"
            />
          );
        }
        return (
          <TextField
            size="small"
            value={condition.value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const updatedGroups = filterGroups.map(g => ({
                ...g,
                conditions: g.conditions.map(c => 
                  c.id === condition.id ? { ...c, value: e.target.value } : c
                )
              }));
              setFilterGroups(updatedGroups);
              onFiltersChange(updatedGroups);
            }}
            placeholder="Enter value..."
          />
        );

      case 'number':
        if (condition.operator === 'between') {
          return (
            <div className="flex items-center space-x-2">
              <TextField
                size="small"
                type="number"
                placeholder="Min"
                value={condition.value?.min || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const updatedGroups = filterGroups.map(g => ({
                    ...g,
                    conditions: g.conditions.map(c => 
                      c.id === condition.id ? { 
                        ...c, 
                        value: { ...c.value, min: e.target.value } 
                      } : c
                    )
                  }));
                  setFilterGroups(updatedGroups);
                  onFiltersChange(updatedGroups);
                }}
              />
              <span>to</span>
              <TextField
                size="small"
                type="number"
                placeholder="Max"
                value={condition.value?.max || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const updatedGroups = filterGroups.map(g => ({
                    ...g,
                    conditions: g.conditions.map(c => 
                      c.id === condition.id ? { 
                        ...c, 
                        value: { ...c.value, max: e.target.value } 
                      } : c
                    )
                  }));
                  setFilterGroups(updatedGroups);
                  onFiltersChange(updatedGroups);
                }}
              />
            </div>
          );
        }
        return (
          <TextField
            size="small"
            type="number"
            value={condition.value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const updatedGroups = filterGroups.map(g => ({
                ...g,
                conditions: g.conditions.map(c => 
                  c.id === condition.id ? { ...c, value: e.target.value } : c
                )
              }));
              setFilterGroups(updatedGroups);
              onFiltersChange(updatedGroups);
            }}
            placeholder="Enter value..."
          />
        );

      case 'date':
        return (
          <TextField
            size="small"
            type="date"
            value={condition.value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const updatedGroups = filterGroups.map(g => ({
                ...g,
                conditions: g.conditions.map(c => 
                  c.id === condition.id ? { ...c, value: e.target.value } : c
                )
              }));
              setFilterGroups(updatedGroups);
              onFiltersChange(updatedGroups);
            }}
          />
        );

      case 'boolean':
        return (
          <FormControl size="small">
            <Select
              value={condition.value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const updatedGroups = filterGroups.map(g => ({
                  ...g,
                  conditions: g.conditions.map(c => 
                    c.id === condition.id ? { ...c, value: e.target.value } : c
                  )
                }));
                setFilterGroups(updatedGroups);
                onFiltersChange(updatedGroups);
              }}
            >
              <MenuItem value="true">True</MenuItem>
              <MenuItem value="false">False</MenuItem>
            </Select>
          </FormControl>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <Typography variant="h6" className="font-semibold">
            Visual Filters
          </Typography>
          <Chip 
            label={`${filterGroups.length} groups`} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </div>
        
        <Button
          variant="outlined"
          startIcon={<PlusIcon className="h-4 w-4" />}
          onClick={addFilterGroup}
        >
          Add Filter Group
        </Button>
      </div>

      {/* Filter Groups */}
      {filterGroups.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="text-center py-8">
            <FunnelIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <Typography variant="h6" className="text-gray-500 mb-2">
              No Filters Applied
            </Typography>
            <Typography variant="body2" className="text-gray-400 mb-4">
              Add filter groups to narrow down your data
            </Typography>
            <Button
              variant="contained"
              startIcon={<PlusIcon className="h-4 w-4" />}
              onClick={addFilterGroup}
            >
              Create First Filter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filterGroups.map((group, groupIndex) => (
            <Accordion key={group.id} defaultExpanded>
              <AccordionSummary expandIcon={<ChevronDownIcon className="h-4 w-4" />}>
                <div className="flex items-center justify-between w-full mr-4">
                  <div className="flex items-center space-x-3">
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={group.isActive}
                          onChange={() => toggleGroupActive(group.id)}
                          size="small"
                        />
                      }
                      label=""
                    />
                    <Typography variant="subtitle1" className="font-medium">
                      {group.name}
                    </Typography>
                    <Chip 
                      label={`${group.conditions.length} conditions`} 
                      size="small" 
                      color="secondary" 
                      variant="outlined"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select
                        value={group.operator}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateGroupOperator(group.id, e.target.value as 'AND' | 'OR')}
                        sx={{ fontSize: '0.875rem' }}
                      >
                        <MenuItem value="AND">AND</MenuItem>
                        <MenuItem value="OR">OR</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <IconButton 
                      size="small"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        removeFilterGroup(group.id);
                      }}
                    >
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </IconButton>
                  </div>
                </div>
              </AccordionSummary>
              
              <AccordionDetails>
                <div className="space-y-3">
                  {group.conditions.length === 0 ? (
                    <div className="text-center py-4">
                      <Typography variant="body2" className="text-gray-500 mb-3">
                        No conditions in this group
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PlusIcon className="h-4 w-4" />}
                        onClick={() => setEditingGroup(group)}
                      >
                        Add Condition
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {group.conditions.map((condition, conditionIndex) => (
                        <Card key={condition.id} className="border border-gray-200">
                          <CardContent className="p-3">
                            <div className="flex items-center space-x-3">
                              {/* Field Selector */}
                              <FormControl size="small" sx={{ minWidth: 150 }}>
                                <InputLabel>Field</InputLabel>
                                <Select
                                  value={condition.field}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const updatedGroups = filterGroups.map(g => ({
                                      ...g,
                                      conditions: g.conditions.map(c => 
                                        c.id === condition.id ? { ...c, field: e.target.value } : c
                                      )
                                    }));
                                    setFilterGroups(updatedGroups);
                                    onFiltersChange(updatedGroups);
                                  }}
                                  label="Field"
                                >
                                  {availableFields.map(field => (
                                    <MenuItem key={field.id} value={field.id}>
                                      {field.name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>

                              {/* Operator Selector */}
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Operator</InputLabel>
                                <Select
                                  value={condition.operator}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const updatedGroups = filterGroups.map(g => ({
                                      ...g,
                                      conditions: g.conditions.map(c => 
                                        c.id === condition.id ? { ...c, operator: e.target.value as FilterCondition['operator'] } : c
                                      )
                                    }));
                                    setFilterGroups(updatedGroups);
                                    onFiltersChange(updatedGroups);
                                  }}
                                  label="Operator"
                                >
                                  {operatorOptions.map(op => (
                                    <MenuItem key={op.value} value={op.value}>
                                      <span className="mr-2">{op.icon}</span>
                                      {op.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>

                              {/* Value Input */}
                              <div className="flex-1">
                                {renderValueInput(condition)}
                              </div>

                              {/* Remove Button */}
                              <IconButton 
                                size="small"
                                onClick={() => removeCondition(group.id, condition.id)}
                              >
                                <XMarkIcon className="h-4 w-4 text-red-500" />
                              </IconButton>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PlusIcon className="h-4 w-4" />}
                        onClick={() => setEditingGroup(group)}
                        className="w-full"
                      >
                        Add Condition
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionDetails>
            </Accordion>
          ))}
        </div>
      )}

      {/* Add Condition Dialog */}
      <Dialog open={!!editingGroup} onClose={() => setEditingGroup(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Filter Condition</DialogTitle>
        <DialogContent>
          <div className="space-y-4">
            <FormControl fullWidth size="small">
              <InputLabel>Field</InputLabel>
              <Select
                value={newCondition.field}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCondition(prev => ({ ...prev, field: e.target.value }))}
                label="Field"
              >
                {availableFields.map(field => (
                  <MenuItem key={field.id} value={field.id}>
                    {field.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Operator</InputLabel>
              <Select
                value={newCondition.operator}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCondition(prev => ({ ...prev, operator: e.target.value as FilterCondition['operator'] }))}
                label="Operator"
              >
                {operatorOptions.map(op => (
                  <MenuItem key={op.value} value={op.value}>
                    <span className="mr-2">{op.icon}</span>
                    {op.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Value"
              value={newCondition.value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCondition(prev => ({ ...prev, value: e.target.value }))}
              size="small"
              placeholder="Enter filter value..."
            />

            <TextField
              fullWidth
              label="Label (Optional)"
              value={newCondition.label}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCondition(prev => ({ ...prev, label: e.target.value }))}
              size="small"
              placeholder="Custom label for this condition..."
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingGroup(null)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => editingGroup && addCondition(editingGroup.id)}
            disabled={!newCondition.field || !newCondition.value}
          >
            Add Condition
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default VisualFilterBuilder;
