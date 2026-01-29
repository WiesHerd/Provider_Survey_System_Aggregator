/**
 * Validation Issue List
 * Apple-style inline messages
 * 
 * Design Philosophy:
 * - Inline messages, not tables or heavy cards
 * - Minimal chrome, maximum clarity
 * - Close to Apple HIG inline message patterns
 * - Breathing room and white space
 */

import React, { memo, useMemo } from 'react';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { CompleteValidationResult } from '../types/validation';
import {
  GroupedIssue,
  groupRelatedIssues,
  prioritizeIssues
} from '../utils/errorMessageFormatter';

export interface ValidationIssueListProps {
  validationResult: CompleteValidationResult | null;
  maxIssues?: number;
}

/**
 * Clean, scannable list of validation issues
 */
export const ValidationIssueList: React.FC<ValidationIssueListProps> = memo(({
  validationResult,
  maxIssues = 8
}) => {
  const groupedIssues = useMemo(() => {
    if (!validationResult) return [];
    const allIssues = [
      ...validationResult.tier1.errors,
      ...validationResult.tier2.warnings,
      ...validationResult.tier3.info
    ];
    if (allIssues.length === 0) return [];
    return groupRelatedIssues(prioritizeIssues(allIssues));
  }, [validationResult]);

  if (!validationResult || groupedIssues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {groupedIssues.slice(0, maxIssues).map((issue, index) => (
        <IssueRow key={`issue-${index}`} issue={issue} />
      ))}
    </div>
  );
});

ValidationIssueList.displayName = 'ValidationIssueList';

// Issue Row Component - Apple inline message style
interface IssueRowProps {
  issue: GroupedIssue;
}

const IssueRow: React.FC<IssueRowProps> = memo(({ issue }) => {
  const getIconAndColor = () => {
    switch (issue.severity) {
      case 'critical':
        return {
          icon: <XCircleIcon className="h-5 w-5" />,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200'
        };
      case 'warning':
        return {
          icon: <ExclamationTriangleIcon className="h-5 w-5" />,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200'
        };
      default:
        return {
          icon: <InformationCircleIcon className="h-5 w-5" />,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200'
        };
    }
  };

  const { icon, color, bg, border } = getIconAndColor();
  const hasDetails = issue.details && (
    (issue.details.affectedRows && issue.details.affectedRows.length > 0) ||
    (issue.details.affectedColumns && issue.details.affectedColumns.length > 0)
  );

  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${border} ${bg}`}>
      <div className={`flex-shrink-0 ${color}`}>
        {icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-5">
          {issue.primary}
        </p>
        <p className="text-sm text-gray-700 leading-5 mt-1">
          {issue.guidance}
        </p>
        
        {hasDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            {issue.details?.affectedRows && issue.details.affectedRows.length > 0 && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Rows:</span>{' '}
                {formatRowList(issue.details.affectedRows)}
              </div>
            )}
            {issue.details?.affectedColumns && issue.details.affectedColumns.length > 0 && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Columns:</span>{' '}
                {issue.details.affectedColumns.slice(0, 5).join(', ')}
                {issue.details.affectedColumns.length > 5 && ` +${issue.details.affectedColumns.length - 5} more`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

IssueRow.displayName = 'IssueRow';

// Helper Functions
function formatRowList(rows: number[]): string {
  if (rows.length === 0) return '';
  if (rows.length <= 5) return rows.join(', ');
  return `${rows.slice(0, 5).join(', ')} +${rows.length - 5} more`;
}
