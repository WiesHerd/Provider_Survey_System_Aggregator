/**
 * Template Selector Component
 * 
 * Allows users to start from a pre-configured report template
 */

import React from 'react';
import { REPORT_TEMPLATES, ReportTemplate } from '../../templates/reportTemplates';
import { ReportConfigInput } from '../types/reportBuilder';

interface TemplateSelectorProps {
  onSelectTemplate: (config: ReportConfigInput) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelectTemplate }) => {
  const handleTemplateSelect = (template: ReportTemplate) => {
    const config: ReportConfigInput = {
      name: '',
      dimension: template.defaultGrouping,
      secondaryDimension: null,
      metric: template.defaultMetrics[0],
      metrics: template.defaultMetrics,
      chartType: template.defaultChartType === 'table' ? 'bar' : template.defaultChartType as 'bar' | 'line' | 'pie',
      filters: {
        specialties: [],
        regions: [],
        surveySources: [],
        providerTypes: [],
        years: []
      }
    };
    onSelectTemplate(config);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Start from Template</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {REPORT_TEMPLATES.slice(0, 6).map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className="p-3 text-left border border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <div className="flex items-center mb-2">
                <div className={`${template.iconColor} p-2 rounded-xl mr-2`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">{template.name}</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{template.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

