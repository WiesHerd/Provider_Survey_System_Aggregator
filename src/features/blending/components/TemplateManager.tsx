/**
 * Template Manager Component
 * 
 * This component manages saved specialty blend templates,
 * allowing users to save, load, and organize their blends.
 */

import React, { useState } from 'react';
import { SpecialtyBlendTemplate } from '../types/blending';

interface TemplateManagerProps {
  templates: SpecialtyBlendTemplate[];
  onLoadTemplate: (templateId: string) => void;
  onBack: () => void;
  onClose: () => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  onLoadTemplate,
  onBack,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  
  // Get unique tags from templates
  const allTags = Array.from(
    new Set(templates.flatMap(template => template.tags))
  );
  
  // Filter templates based on search and tag
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag === 'all' || template.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });
  
  const handleLoadTemplate = (templateId: string) => {
    onLoadTemplate(templateId);
  };
  
  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      // TODO: Implement delete functionality
      console.log('Delete template:', templateId);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Template Manager</h1>
              <p className="text-gray-600 mt-1">Manage your saved specialty blend templates</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Back to Blending
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Templates
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by name or description..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Tag
              </label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Filter templates by tag"
              >
                <option value="all">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Templates Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Saved Templates ({filteredTemplates.length})
            </h2>
          </div>
          
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2">No templates found</p>
              <p className="text-sm">Create and save your first template</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {template.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Delete template"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">{template.specialties.length}</span> specialties
                    </div>
                    <div className="text-xs text-gray-600">
                      Created: {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-600">
                      By: {template.createdBy}
                    </div>
                  </div>
                  
                  {/* Tags */}
                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleLoadTemplate(template.id)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Load Template
                    </button>
                    <button
                      onClick={() => {/* TODO: Implement edit functionality */}}
                      className="px-3 py-2 bg-gray-600 text-white text-xs font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
