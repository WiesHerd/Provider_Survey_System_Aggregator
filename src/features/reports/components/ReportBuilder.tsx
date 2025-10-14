/**
 * Enterprise Report Builder Component
 * 
 * Following patterns from Microsoft Power BI, Tableau, and Salesforce
 * for world-class report building experience.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  IconButton, 
  Tooltip,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import { 
  PlusIcon, 
  TrashIcon, 
  EyeIcon, 
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  ShareIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
// Using HTML5 drag and drop API instead of react-beautiful-dnd

interface ReportSection {
  id: string;
  type: 'chart' | 'table' | 'kpi' | 'text' | 'filter';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  data: any;
  styling: any;
  visible: boolean;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'compensation' | 'specialty' | 'regional' | 'trends';
  preview: string;
  configuration: any;
  popularity: number;
}

interface ReportBuilderProps {
  onSave: (report: any) => void;
  onExport: (report: any) => void;
  templates?: ReportTemplate[];
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  onSave,
  onExport,
  templates = []
}) => {
  // State management
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  // Available components for drag-and-drop
  const availableComponents = [
    { id: 'chart', name: 'Chart', icon: '📊', description: 'Visual data representation' },
    { id: 'table', name: 'Data Table', icon: '📋', description: 'Structured data display' },
    { id: 'kpi', name: 'KPI Card', icon: '📈', description: 'Key performance indicator' },
    { id: 'filter', name: 'Filter Panel', icon: '🔍', description: 'Interactive filters' },
    { id: 'text', name: 'Text Block', icon: '📝', description: 'Rich text content' }
  ];

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, componentId: string) => {
    e.dataTransfer.setData('text/plain', componentId);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const componentId = e.dataTransfer.getData('text/plain');
    const component = availableComponents.find(c => c.id === componentId);
    
    if (component) {
      const newSection: ReportSection = {
        id: `section-${Date.now()}`,
        type: component.id as any,
        title: component.name,
        position: { x: 0, y: sections.length * 120, width: 300, height: 200 },
        data: {},
        styling: {},
        visible: true
      };
      setSections(prev => [...prev, newSection]);
    }
  }, [availableComponents, sections.length]);

  // Add section programmatically
  const addSection = useCallback((type: string) => {
    const component = availableComponents.find(c => c.id === type);
    if (component) {
      const newSection: ReportSection = {
        id: `section-${Date.now()}`,
        type: type as any,
        title: component.name,
        position: { x: 0, y: sections.length * 120, width: 300, height: 200 },
        data: {},
        styling: {},
        visible: true
      };
      setSections(prev => [...prev, newSection]);
    }
  }, [sections]);

  // Remove section
  const removeSection = useCallback((sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
    if (selectedSection === sectionId) {
      setSelectedSection(null);
    }
  }, [selectedSection]);

  // Toggle section visibility
  const toggleSectionVisibility = useCallback((sectionId: string) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    ));
  }, []);

  // Apply template
  const applyTemplate = useCallback((template: ReportTemplate) => {
    setSections(template.configuration.sections || []);
    setReportName(template.name);
    setReportDescription(template.description);
    setShowTemplateDialog(false);
  }, []);

  // Save report
  const handleSave = useCallback(() => {
    if (!reportName.trim()) {
      alert('Please enter a report name');
      return;
    }

    const report = {
      name: reportName,
      description: reportDescription,
      sections,
      created: new Date(),
      id: `report-${Date.now()}`
    };

    onSave(report);
  }, [reportName, reportDescription, sections, onSave]);

  // Export report
  const handleExport = useCallback(() => {
    const report = {
      name: reportName,
      description: reportDescription,
      sections,
      created: new Date(),
      id: `report-${Date.now()}`
    };

    onExport(report);
  }, [reportName, reportDescription, sections, onExport]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Typography variant="h5" className="font-semibold text-gray-900">
              Report Builder
            </Typography>
            <Chip 
              label={`${sections.length} sections`} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outlined"
              startIcon={<EyeIcon className="h-4 w-4" />}
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Edit' : 'Preview'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<DocumentDuplicateIcon className="h-4 w-4" />}
              onClick={() => setShowTemplateDialog(true)}
            >
              Templates
            </Button>
            
            <Button
              variant="contained"
              startIcon={<ShareIcon className="h-4 w-4" />}
              onClick={handleSave}
              disabled={!reportName.trim()}
            >
              Save Report
            </Button>
            
            <Button
              variant="contained"
              color="secondary"
              startIcon={<ArrowPathIcon className="h-4 w-4" />}
              onClick={handleExport}
              disabled={sections.length === 0}
            >
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Component Palette */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <Typography variant="h6" className="font-semibold text-gray-900 mb-4">
            Components
          </Typography>
          
          <div className="space-y-2">
            {availableComponents.map((component) => (
              <div
                key={component.id}
                draggable
                onDragStart={(e) => handleDragStart(e, component.id)}
                className="p-3 border border-gray-200 rounded-lg cursor-move transition-all bg-white hover:bg-gray-50 hover:shadow-md"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{component.icon}</span>
                  <div>
                    <Typography variant="body2" className="font-medium">
                      {component.name}
                    </Typography>
                    <Typography variant="caption" className="text-gray-500">
                      {component.description}
                    </Typography>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg border border-gray-200 h-full">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="h-full p-4 space-y-4 min-h-[400px] border-2 border-dashed border-gray-300 rounded-lg"
            >
                    {sections.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <PlusIcon className="w-8 h-8 text-gray-400" />
                          </div>
                          <Typography variant="h6" className="text-gray-500 mb-2">
                            Start Building Your Report
                          </Typography>
                          <Typography variant="body2" className="text-gray-400 mb-4">
                            Drag components from the left panel to get started
                          </Typography>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {availableComponents.map(component => (
                              <Button
                                key={component.id}
                                variant="outlined"
                                size="small"
                                startIcon={<span>{component.icon}</span>}
                                onClick={() => addSection(component.id)}
                                className="text-xs"
                              >
                                {component.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      sections.map((section, index) => (
                        <Card
                          key={section.id}
                          className={`relative transition-all shadow-sm ${
                            selectedSection === section.id ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => setSelectedSection(section.id)}
                        >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <Typography variant="h6" className="font-medium">
                                    {section.title}
                                  </Typography>
                                  <div className="flex items-center space-x-1">
                                    <Tooltip title="Configure">
                                      <IconButton size="small">
                                        <Cog6ToothIcon className="h-4 w-4" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Toggle Visibility">
                                      <IconButton 
                                        size="small"
                                        onClick={(e: React.MouseEvent) => {
                                          e.stopPropagation();
                                          toggleSectionVisibility(section.id);
                                        }}
                                      >
                                        <EyeIcon className={`h-4 w-4 ${section.visible ? 'text-green-600' : 'text-gray-400'}`} />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Remove">
                                      <IconButton 
                                        size="small"
                                        onClick={(e: React.MouseEvent) => {
                                          e.stopPropagation();
                                          removeSection(section.id);
                                        }}
                                      >
                                        <TrashIcon className="h-4 w-4 text-red-500" />
                                      </IconButton>
                                    </Tooltip>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-4 min-h-[120px] flex items-center justify-center">
                                  <Typography variant="body2" className="text-gray-500">
                                    {section.type} component placeholder
                                  </Typography>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        {selectedSection && (
          <div className="w-80 bg-white border-l border-gray-200 p-4">
            <Typography variant="h6" className="font-semibold text-gray-900 mb-4">
              Properties
            </Typography>
            
            <div className="space-y-4">
              <TextField
                fullWidth
                label="Section Title"
                value={sections.find(s => s.id === selectedSection)?.title || ''}
                size="small"
              />
              
              <FormControl fullWidth size="small">
                <Typography variant="body2" className="mb-2">Visibility</Typography>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={sections.find(s => s.id === selectedSection)?.visible || false}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleSectionVisibility(selectedSection)}
                    />
                  }
                  label="Visible"
                />
              </FormControl>
              
              <FormControl fullWidth size="small">
                <Typography variant="body2" className="mb-2">Size</Typography>
                <div className="grid grid-cols-2 gap-2">
                  <TextField
                    label="Width"
                    type="number"
                    size="small"
                    value={sections.find(s => s.id === selectedSection)?.position.width || 300}
                  />
                  <TextField
                    label="Height"
                    type="number"
                    size="small"
                    value={sections.find(s => s.id === selectedSection)?.position.height || 200}
                  />
                </div>
              </FormControl>
            </div>
          </div>
        )}
      </div>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onClose={() => setShowTemplateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Choose a Template</DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {templates.map(template => (
              <Card 
                key={template.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => applyTemplate(template)}
              >
                <CardContent className="p-4">
                  <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    <Typography variant="body2" className="text-gray-500">
                      {template.name}
                    </Typography>
                  </div>
                  <Typography variant="h6" className="font-medium mb-1">
                    {template.name}
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 mb-2">
                    {template.description}
                  </Typography>
                  <Chip 
                    label={template.category} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ReportBuilder;
