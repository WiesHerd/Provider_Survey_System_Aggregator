/**
 * Reports Feature - Public API
 * 
 * Enterprise-grade report building following patterns from Microsoft Power BI, Tableau, and Salesforce
 */

// Components
export { default as ReportBuilder } from './components/ReportBuilder';
export { default as ReportTemplates } from './components/ReportTemplates';
export { default as VisualFilterBuilder } from './components/VisualFilterBuilder';

// Types
export interface ReportSection {
  id: string;
  type: 'chart' | 'table' | 'kpi' | 'text' | 'filter';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  data: any;
  styling: any;
  visible: boolean;
}

export interface ReportTemplate {
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

export interface FilterCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  values?: any[];
  label: string;
}

export interface FilterGroup {
  id: string;
  name: string;
  conditions: FilterCondition[];
  operator: 'AND' | 'OR';
  isActive: boolean;
}










