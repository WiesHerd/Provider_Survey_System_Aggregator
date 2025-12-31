/**
 * Filter Impact Indicator Component
 * 
 * Shows how many records each filter affects, helping users understand their selections
 */

import React from 'react';
import { Badge, Tooltip, Box } from '@mui/material';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface FilterImpactIndicatorProps {
  label: string;
  count: number;
  total: number;
  color?: string;
}

export const FilterImpactIndicator: React.FC<FilterImpactIndicatorProps> = ({
  label,
  count,
  total,
  color = '#6366f1'
}) => {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
  const impactText = count === total 
    ? 'All records' 
    : `${count.toLocaleString()} of ${total.toLocaleString()} (${percentage}%)`;

  return (
    <Tooltip 
      title={`${label}: ${impactText}`}
      arrow
      placement="top"
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'help'
        }}
      >
        <Badge
          badgeContent={count}
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: color,
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 600,
              minWidth: '20px',
              height: '20px',
              padding: '0 6px'
            }
          }}
        >
          <InformationCircleIcon className="h-4 w-4" style={{ color }} />
        </Badge>
      </Box>
    </Tooltip>
  );
};









