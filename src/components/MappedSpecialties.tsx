import React from 'react';
import { Paper, Typography, IconButton, Tooltip } from '@mui/material';
import { PencilIcon as EditIcon, TrashIcon as DeleteIcon } from '@heroicons/react/24/outline';
import { ISpecialtyMapping } from '../types/specialty';

interface MappedSpecialtiesProps {
  mapping: ISpecialtyMapping;
  onEdit?: () => void;
  onDelete?: () => void;
}

const MappedSpecialties: React.FC<MappedSpecialtiesProps> = ({ mapping, onEdit, onDelete }) => {
  // Color mapping for different survey sources
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'SullivanCotter':
        return '#818CF8';
      case 'Gallagher':
        return '#F472B6';
      case 'MGMA':
        return '#34D399';
      default:
        return '#9CA3AF';
    }
  };

  // Format date to be more readable
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Paper className="p-6 relative">
      {/* Header with standardized name and actions */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <Typography variant="h6" className="font-medium text-gray-900">
            {mapping.standardizedName}
          </Typography>
          <Typography variant="caption" className="text-gray-500">
            Last updated: {formatDate(mapping.updatedAt)}
          </Typography>
        </div>
        <div className="flex space-x-2">
          {onEdit && (
            <Tooltip title="Edit mapping">
              <IconButton onClick={onEdit} size="small">
                <EditIcon className="h-5 w-5 text-gray-500" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title="Delete mapping">
              <IconButton onClick={onDelete} size="small">
                <DeleteIcon className="h-5 w-5 text-gray-500" />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Connected specialties display */}
      <div className="relative mt-4">
        {/* Visual connector line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        {/* Source specialties */}
        <div className="space-y-3">
          {mapping.sourceSpecialties.map((specialty) => (
            <div key={specialty.id} className="flex items-center ml-8 relative">
              {/* Connector line to main vertical line */}
              <div className="absolute -left-4 top-1/2 h-0.5 w-4 bg-gray-200" />
              
              {/* Specialty card */}
              <div 
                className="flex-1 p-3 rounded-lg border border-gray-200"
                style={{ borderLeftColor: getSourceColor(specialty.surveySource), borderLeftWidth: '4px' }}
              >
                <div className="flex justify-between items-center">
                  <Typography className="font-medium">
                    {specialty.specialty}
                  </Typography>
                  <Typography variant="caption" style={{ color: getSourceColor(specialty.surveySource) }}>
                    {specialty.surveySource}
                  </Typography>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Paper>
  );
};

export default MappedSpecialties; 