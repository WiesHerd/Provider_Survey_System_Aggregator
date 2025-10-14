/**
 * Report Templates Library
 * 
 * Pre-built templates following enterprise patterns from Power BI, Tableau, and Salesforce
 */

import React, { useState, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  IconButton, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';
import { 
  StarIcon, 
  EyeIcon, 
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'compensation' | 'specialty' | 'regional' | 'trends' | 'executive';
  subcategory: string;
  preview: string;
  configuration: any;
  popularity: number;
  tags: string[];
  createdBy: string;
  lastModified: Date;
  isPublic: boolean;
}

interface ReportTemplatesProps {
  onSelectTemplate: (template: ReportTemplate) => void;
  onCreateCustom: () => void;
}

const TEMPLATE_CATEGORIES = [
  { id: 'compensation', name: 'Compensation Analysis', icon: '💰' },
  { id: 'specialty', name: 'Specialty Reports', icon: '🏥' },
  { id: 'regional', name: 'Regional Analysis', icon: '🌍' },
  { id: 'trends', name: 'Trend Analysis', icon: '📈' },
  { id: 'executive', name: 'Executive Dashboards', icon: '👔' }
];

const SAMPLE_TEMPLATES: ReportTemplate[] = [
  {
    id: 'comp-specialty-comparison',
    name: 'Specialty Compensation Comparison',
    description: 'Compare compensation across specialties with percentile breakdowns',
    category: 'compensation',
    subcategory: 'Specialty Analysis',
    preview: '/api/templates/comp-specialty-preview.png',
    configuration: {
      sections: [
        {
          id: 'kpi-overview',
          type: 'kpi',
          title: 'Compensation Overview',
          position: { x: 0, y: 0, width: 400, height: 150 },
          data: { metrics: ['tcc_p50', 'wrvu_p50'] }
        },
        {
          id: 'specialty-chart',
          type: 'chart',
          title: 'Specialty Comparison',
          position: { x: 0, y: 160, width: 600, height: 400 },
          data: { 
            chartType: 'bar',
            dimension: 'specialty',
            metrics: ['tcc_p50', 'tcc_p75', 'tcc_p90']
          }
        }
      ]
    },
    popularity: 95,
    tags: ['compensation', 'specialty', 'percentiles'],
    createdBy: 'System',
    lastModified: new Date(),
    isPublic: true
  },
  {
    id: 'regional-trends',
    name: 'Regional Compensation Trends',
    description: 'Track compensation trends across geographic regions over time',
    category: 'regional',
    subcategory: 'Trend Analysis',
    preview: '/api/templates/regional-trends-preview.png',
    configuration: {
      sections: [
        {
          id: 'trend-chart',
          type: 'chart',
          title: 'Regional Trends',
          position: { x: 0, y: 0, width: 800, height: 400 },
          data: { 
            chartType: 'line',
            dimension: 'region',
            metrics: ['tcc_p50'],
            timeSeries: true
          }
        }
      ]
    },
    popularity: 87,
    tags: ['regional', 'trends', 'time-series'],
    createdBy: 'System',
    lastModified: new Date(),
    isPublic: true
  },
  {
    id: 'executive-dashboard',
    name: 'Executive Compensation Dashboard',
    description: 'High-level executive view of compensation metrics and KPIs',
    category: 'executive',
    subcategory: 'Executive Summary',
    preview: '/api/templates/executive-dashboard-preview.png',
    configuration: {
      sections: [
        {
          id: 'exec-kpis',
          type: 'kpi',
          title: 'Key Metrics',
          position: { x: 0, y: 0, width: 400, height: 200 },
          data: { metrics: ['tcc_p50', 'wrvu_p50', 'cf_p50'] }
        },
        {
          id: 'summary-table',
          type: 'table',
          title: 'Summary Table',
          position: { x: 420, y: 0, width: 600, height: 300 },
          data: { 
            dimension: 'specialty',
            metrics: ['tcc_p25', 'tcc_p50', 'tcc_p75', 'tcc_p90']
          }
        }
      ]
    },
    popularity: 92,
    tags: ['executive', 'dashboard', 'kpi'],
    createdBy: 'System',
    lastModified: new Date(),
    isPublic: true
  },
  {
    id: 'provider-type-analysis',
    name: 'Provider Type Analysis',
    description: 'Compare compensation across different provider types',
    category: 'specialty',
    subcategory: 'Provider Analysis',
    preview: '/api/templates/provider-type-preview.png',
    configuration: {
      sections: [
        {
          id: 'provider-chart',
          type: 'chart',
          title: 'Provider Type Comparison',
          position: { x: 0, y: 0, width: 600, height: 400 },
          data: { 
            chartType: 'bar',
            dimension: 'providerType',
            metrics: ['tcc_p50', 'wrvu_p50']
          }
        }
      ]
    },
    popularity: 78,
    tags: ['provider-type', 'comparison', 'analysis'],
    createdBy: 'System',
    lastModified: new Date(),
    isPublic: true
  },
  {
    id: 'survey-source-comparison',
    name: 'Survey Source Comparison',
    description: 'Compare data quality and coverage across survey sources',
    category: 'trends',
    subcategory: 'Data Quality',
    preview: '/api/templates/survey-comparison-preview.png',
    configuration: {
      sections: [
        {
          id: 'source-metrics',
          type: 'kpi',
          title: 'Data Coverage',
          position: { x: 0, y: 0, width: 400, height: 150 },
          data: { metrics: ['n_orgs', 'n_incumbents'] }
        },
        {
          id: 'source-chart',
          type: 'chart',
          title: 'Source Comparison',
          position: { x: 0, y: 160, width: 600, height: 300 },
          data: { 
            chartType: 'pie',
            dimension: 'surveySource',
            metrics: ['tcc_p50']
          }
        }
      ]
    },
    popularity: 65,
    tags: ['survey-source', 'data-quality', 'comparison'],
    createdBy: 'System',
    lastModified: new Date(),
    isPublic: true
  }
];

export const ReportTemplates: React.FC<ReportTemplatesProps> = ({
  onSelectTemplate,
  onCreateCustom
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'name' | 'date'>('popularity');
  const [showPreview, setShowPreview] = useState<ReportTemplate | null>(null);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = SAMPLE_TEMPLATES;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        t.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return b.popularity - a.popularity;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return b.lastModified.getTime() - a.lastModified.getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchTerm, selectedCategory, sortBy]);

  const handleSelectTemplate = (template: ReportTemplate) => {
    onSelectTemplate(template);
  };

  const handlePreviewTemplate = (template: ReportTemplate) => {
    setShowPreview(template);
  };

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h5" className="font-semibold text-gray-900">
              Report Templates
            </Typography>
            <Typography variant="body2" className="text-gray-600">
              Choose from pre-built templates or create your own
            </Typography>
          </div>
          <Button
            variant="contained"
            onClick={onCreateCustom}
            startIcon={<DocumentDuplicateIcon className="h-4 w-4" />}
          >
            Create Custom Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <TextField
              fullWidth
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 mr-2" />
              }}
            />
          </div>

          {/* Category Filter */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedCategory(e.target.value)}
              label="Category"
            >
              <MenuItem value="all">All Categories</MenuItem>
              {TEMPLATE_CATEGORIES.map(category => (
                <MenuItem key={category.id} value={category.id}>
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Sort */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSortBy(e.target.value as 'popularity' | 'name' | 'date')}
              label="Sort By"
            >
              <MenuItem value="popularity">Popularity</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="date">Date</MenuItem>
            </Select>
          </FormControl>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <Card 
              key={template.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleSelectTemplate(template)}
            >
              <CardContent className="p-0">
                {/* Preview Image */}
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-purple-50 rounded-t-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 bg-white rounded-lg shadow-sm flex items-center justify-center">
                      <span className="text-2xl">
                        {TEMPLATE_CATEGORIES.find(c => c.id === template.category)?.icon}
                      </span>
                    </div>
                    <Typography variant="body2" className="text-gray-600">
                      {template.name}
                    </Typography>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Typography variant="h6" className="font-semibold text-gray-900">
                      {template.name}
                    </Typography>
                    <div className="flex items-center space-x-1">
                      <IconButton 
                        size="small"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handlePreviewTemplate(template);
                        }}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </IconButton>
                      <IconButton size="small">
                        <StarIcon className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>

                  <Typography variant="body2" className="text-gray-600 mb-3">
                    {template.description}
                  </Typography>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Chip 
                        label={template.category} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                      <Chip 
                        label={`${template.popularity}%`} 
                        size="small" 
                        color="success" 
                        variant="outlined"
                      />
                    </div>
                    <Typography variant="caption" className="text-gray-500">
                      {template.lastModified.toLocaleDateString()}
                    </Typography>
                  </div>

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map(tag => (
                      <Chip 
                        key={tag}
                        label={tag} 
                        size="small" 
                        variant="outlined"
                        className="text-xs"
                      />
                    ))}
                    {template.tags.length > 3 && (
                      <Chip 
                        label={`+${template.tags.length - 3}`} 
                        size="small" 
                        variant="outlined"
                        className="text-xs"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
            </div>
            <Typography variant="h6" className="text-gray-500 mb-2">
              No templates found
            </Typography>
            <Typography variant="body2" className="text-gray-400">
              Try adjusting your search or filter criteria
            </Typography>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!showPreview} onClose={() => setShowPreview(null)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <div className="flex items-center justify-between">
            <span>{showPreview?.name}</span>
            <Button
              variant="contained"
              onClick={() => showPreview && handleSelectTemplate(showPreview)}
            >
              Use This Template
            </Button>
          </div>
        </DialogTitle>
        <DialogContent>
          {showPreview && (
            <div className="space-y-4">
              <Typography variant="body1" className="text-gray-600">
                {showPreview.description}
              </Typography>
              
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <Typography variant="body2" className="text-gray-500">
                  Template Preview - {showPreview.name}
                </Typography>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Typography variant="subtitle2" className="font-semibold mb-2">
                    Template Details
                  </Typography>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span>{showPreview.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Popularity:</span>
                      <span>{showPreview.popularity}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span>{showPreview.lastModified.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Typography variant="subtitle2" className="font-semibold mb-2">
                    Tags
                  </Typography>
                  <div className="flex flex-wrap gap-1">
                    {showPreview.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(null)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => showPreview && handleSelectTemplate(showPreview)}
          >
            Use Template
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ReportTemplates;
