/**
 * Enhanced Custom Reports Component
 * 
 * Integrates enterprise-grade report building patterns from Microsoft Power BI, Tableau, and Salesforce
 * with the existing survey data infrastructure.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Tabs, 
  Tab, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  PlusIcon, 
  EyeIcon, 
  DocumentDuplicateIcon,
  ShareIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { ReportBuilder, ReportTemplates, VisualFilterBuilder } from '../index';
import { getDataService } from '../../../services/DataService';
import { useYear } from '../../../contexts/YearContext';

interface EnhancedCustomReportsProps {
  data?: any[];
  title?: string;
}

interface ReportMode {
  id: 'builder' | 'templates' | 'filters';
  name: string;
  description: string;
  icon: string;
}

const REPORT_MODES: ReportMode[] = [
  {
    id: 'builder',
    name: 'Visual Builder',
    description: 'Drag-and-drop report creation',
    icon: '🎨'
  },
  {
    id: 'templates',
    name: 'Templates',
    description: 'Pre-built report templates',
    icon: '📋'
  },
  {
    id: 'filters',
    name: 'Advanced Filters',
    description: 'Visual filter builder',
    icon: '🔍'
  }
];

export const EnhancedCustomReports: React.FC<EnhancedCustomReportsProps> = ({
  data: propData,
  title = 'Enhanced Custom Reports'
}) => {
  // State management
  const [currentMode, setCurrentMode] = useState<'builder' | 'templates' | 'filters'>('builder');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Year context
  const { currentYear } = useYear();

  // Data service
  const dataService = useMemo(() => getDataService(), []);

  // Available fields for filter builder
  const availableFields = useMemo(() => [
    { id: 'specialty', name: 'Specialty', type: 'string' as const },
    { id: 'region', name: 'Geographic Region', type: 'string' as const },
    { id: 'surveySource', name: 'Survey Source', type: 'string' as const },
    { id: 'providerType', name: 'Provider Type', type: 'string' as const },
    { id: 'tcc_p50', name: 'TCC 50th Percentile', type: 'number' as const },
    { id: 'wrvu_p50', name: 'wRVU 50th Percentile', type: 'number' as const },
    { id: 'cf_p50', name: 'CF 50th Percentile', type: 'number' as const },
    { id: 'surveyYear', name: 'Survey Year', type: 'date' as const }
  ], []);

  // Load saved reports
  useEffect(() => {
    const loadSavedReports = async () => {
      try {
        const saved = localStorage.getItem('enhancedCustomReports');
        if (saved) {
          setSavedReports(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading saved reports:', error);
      }
    };

    loadSavedReports();
  }, []);

  // Save report
  const handleSaveReport = async (report: any) => {
    try {
      setLoading(true);
      
      const newReport = {
        ...report,
        id: `report-${Date.now()}`,
        created: new Date(),
        createdBy: 'Current User',
        version: '1.0'
      };

      const updatedReports = [...savedReports, newReport];
      setSavedReports(updatedReports);
      localStorage.setItem('enhancedCustomReports', JSON.stringify(updatedReports));
      
      setShowSaveDialog(false);
      setReportName('');
      setReportDescription('');
    } catch (error) {
      console.error('Error saving report:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export report
  const handleExportReport = async (report: any) => {
    try {
      setLoading(true);
      
      // Generate export data
      const exportData = {
        report: report,
        metadata: {
          exported: new Date().toISOString(),
          version: '1.0',
          format: 'JSON'
        }
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${report.name || 'untitled'}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
    } finally {
      setLoading(false);
    }
  };

  // Select template
  const handleSelectTemplate = (template: any) => {
    setCurrentMode('builder');
    // Template would be applied to the builder
  };

  // Create custom report
  const handleCreateCustom = () => {
    setCurrentMode('builder');
  };

  // Handle filters change
  const handleFiltersChange = (filters: any[]) => {
    console.log('Filters changed:', filters);
    // Apply filters to data
  };

  // Render current mode content
  const renderModeContent = () => {
    switch (currentMode) {
      case 'builder':
        return (
          <ReportBuilder
            onSave={handleSaveReport}
            onExport={handleExportReport}
          />
        );
      
      case 'templates':
        return (
          <ReportTemplates
            onSelectTemplate={handleSelectTemplate}
            onCreateCustom={handleCreateCustom}
          />
        );
      
      case 'filters':
        return (
          <div className="p-6">
            <VisualFilterBuilder
              availableFields={availableFields}
              onFiltersChange={handleFiltersChange}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h4" className="font-bold text-gray-900">
              {title}
            </Typography>
            <Typography variant="body1" className="text-gray-600">
              Enterprise-grade report building with drag-and-drop interface
            </Typography>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outlined"
              startIcon={<ShareIcon className="h-4 w-4" />}
              onClick={() => setShowShareDialog(true)}
            >
              Share
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Cog6ToothIcon className="h-4 w-4" />}
            >
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="bg-white border-b border-gray-200 px-6">
        <Tabs 
          value={currentMode} 
          onChange={(e: React.SyntheticEvent, value: 'builder' | 'templates' | 'filters') => setCurrentMode(value)}
          variant="fullWidth"
        >
          {REPORT_MODES.map(mode => (
            <Tab
              key={mode.id}
              value={mode.id}
              label={
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{mode.icon}</span>
                  <div className="text-left">
                    <div className="font-medium">{mode.name}</div>
                    <div className="text-xs text-gray-500">{mode.description}</div>
                  </div>
                </div>
              }
              sx={{ 
                textTransform: 'none',
                minHeight: 'auto',
                py: 2,
                '&.Mui-selected': {
                  color: '#6366f1'
                }
              }}
            />
          ))}
        </Tabs>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {renderModeContent()}
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Report</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-4">
            <TextField
              fullWidth
              label="Report Name"
              value={reportName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportName(e.target.value)}
              placeholder="Enter report name..."
            />
            
            <TextField
              fullWidth
              label="Description"
              value={reportDescription}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportDescription(e.target.value)}
              placeholder="Enter report description..."
              multiline
              rows={3}
            />
            
            <FormControl fullWidth>
              <Typography variant="body2" className="mb-2">Category</Typography>
              <Select
                value="custom"
                size="small"
              >
                <MenuItem value="custom">Custom Report</MenuItem>
                <MenuItem value="compensation">Compensation Analysis</MenuItem>
                <MenuItem value="specialty">Specialty Analysis</MenuItem>
                <MenuItem value="regional">Regional Analysis</MenuItem>
              </Select>
            </FormControl>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => handleSaveReport({ name: reportName, description: reportDescription })}
            disabled={!reportName.trim()}
          >
            Save Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onClose={() => setShowShareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Share Report</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-4">
            <Typography variant="body2" className="text-gray-600">
              Share this report with team members or generate a public link
            </Typography>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <TextField
                  fullWidth
                  placeholder="Enter email addresses..."
                  size="small"
                />
                <Button variant="outlined" size="small">
                  Add
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <TextField
                  fullWidth
                  value="https://reports.company.com/share/abc123"
                  size="small"
                  InputProps={{ readOnly: true }}
                />
                <Button variant="outlined" size="small">
                  Copy
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <FormControl size="small">
                <Typography variant="body2" className="mb-1">Permissions</Typography>
                <Select value="view" size="small">
                  <MenuItem value="view">View Only</MenuItem>
                  <MenuItem value="edit">Can Edit</MenuItem>
                  <MenuItem value="admin">Admin Access</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl size="small">
                <Typography variant="body2" className="mb-1">Expires</Typography>
                <Select value="never" size="small">
                  <MenuItem value="never">Never</MenuItem>
                  <MenuItem value="7days">7 Days</MenuItem>
                  <MenuItem value="30days">30 Days</MenuItem>
                </Select>
              </FormControl>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowShareDialog(false)}>Cancel</Button>
          <Button variant="contained">Share Report</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EnhancedCustomReports;
