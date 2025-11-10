/**
 * Validation Banner Component
 * Enterprise-grade, user-centric error reporting
 * Clean, minimal design focused on actionable guidance
 */

import React, { useState, memo, useMemo, useEffect } from 'react';
import { Box, Typography, Collapse, IconButton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { CompleteValidationResult } from '../types/validation';
import {
  formatUserMessage,
  groupRelatedIssues,
  prioritizeIssues,
  UserFriendlyMessage,
  GroupedIssue
} from '../utils/errorMessageFormatter';

export interface ValidationBannerProps {
  validationResult: CompleteValidationResult | null;
  headers?: string[];
  rows?: any[][];
  onDismiss?: () => void;
  collapsible?: boolean;
}

/**
 * Validation Banner component for displaying validation results
 * Enterprise-grade design: user-centric, clear, actionable
 * 
 * @param validationResult - Complete validation result from validation engine
 * @param onDismiss - Optional callback when banner is dismissed
 * @param collapsible - Whether the banner details can be collapsed
 */
export const ValidationBanner: React.FC<ValidationBannerProps> = memo(({
  validationResult,
  headers = [],
  rows = [],
  onDismiss,
  collapsible = true
}) => {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  // Transform and group issues
  const groupedIssues = useMemo(() => {
    if (!validationResult) return null;

    const allIssues = [
      ...validationResult.tier1.errors,
      ...validationResult.tier2.warnings,
      ...validationResult.tier3.info
    ];

    if (allIssues.length === 0) return null;

    // Prioritize and group
    const prioritized = prioritizeIssues(allIssues);
    return groupRelatedIssues(prioritized);
  }, [validationResult]);

  // Initialize expansion state: critical errors expanded by default
  useEffect(() => {
    if (!groupedIssues) return;
    
    const initialExpanded = new Set<string>();
    groupedIssues.forEach((group, index) => {
      if (group.severity === 'critical') {
        initialExpanded.add(`card-${index}`);
      }
    });
    setExpandedCards(initialExpanded);
  }, [groupedIssues]);

  if (!validationResult || !groupedIssues || dismissed) {
    return null;
  }

  const handleToggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
      {groupedIssues.map((group, index) => {
        const cardId = `card-${index}`;
        const expanded = expandedCards.has(cardId);
        
        return (
          <ValidationMessageCard
            key={cardId}
            issueNumber={index + 1}
            group={group}
            headers={headers}
            rows={rows}
            expanded={expanded}
            onToggleExpand={() => handleToggleCard(cardId)}
            collapsible={collapsible}
          />
        );
      })}
    </Box>
  );
});

ValidationBanner.displayName = 'ValidationBanner';

/**
 * Individual validation message card
 */
interface ValidationMessageCardProps {
  issueNumber: number;
  group: GroupedIssue;
  headers: string[];
  rows: any[][];
  expanded: boolean;
  onToggleExpand: () => void;
  collapsible: boolean;
}

const ValidationMessageCard: React.FC<ValidationMessageCardProps> = memo(({
  issueNumber,
  group,
  headers,
  rows,
  expanded,
  onToggleExpand,
  collapsible
}) => {
  const { severity, primary, guidance, details } = group;

  // Design tokens - uniform styling for all issues
  const designTokens = {
    critical: {
      borderColor: '#E5E7EB', // Uniform border color for all
      backgroundColor: '#FFFFFF', // Uniform background for all
      iconColor: '#DC2626', // Red icon for all issues
      textColor: '#374151',
      guidanceColor: '#6B7280'
    },
    warning: {
      borderColor: '#E5E7EB', // Uniform border color for all
      backgroundColor: '#FFFFFF', // Uniform background for all
      iconColor: '#DC2626', // Red icon for all issues
      textColor: '#374151',
      guidanceColor: '#6B7280'
    },
    info: {
      borderColor: '#E5E7EB', // Uniform border color for all
      backgroundColor: '#FFFFFF', // Uniform background for all
      iconColor: '#DC2626', // Red icon for all issues
      textColor: '#374151',
      guidanceColor: '#6B7280'
    }
  };

  const tokens = designTokens[severity];
  // Use triangle warning icon for all issues for consistency
  const IconComponent = ExclamationTriangleIcon;

  const hasDetails = details && (
    (details.affectedRows && details.affectedRows.length > 0) ||
    (details.affectedColumns && details.affectedColumns.length > 0)
  );

  return (
    <Box
      sx={{
        backgroundColor: tokens.backgroundColor,
        border: `1px solid ${tokens.borderColor}`, // Uniform border for all containers
        borderRadius: '8px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        transition: 'all 200ms ease'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          p: 2,
          pb: expanded && hasDetails ? 1.5 : 2
        }}
      >
        {/* Icon */}
        <IconComponent
          style={{
            width: 20,
            height: 20,
            color: tokens.iconColor,
            flexShrink: 0,
            marginTop: 1
          }}
        />

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Issue Number and Primary Message */}
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: tokens.textColor,
              fontSize: '15px',
              lineHeight: 1.5,
              mb: 0.75
            }}
          >
            Issue {issueNumber}: {primary}
          </Typography>

          {/* Guidance */}
          <Typography
            variant="body2"
            sx={{
              color: tokens.guidanceColor,
              fontSize: '13px',
              lineHeight: 1.6,
              mb: expanded && hasDetails ? 1.5 : 0
            }}
          >
            {guidance}
          </Typography>

          {/* Details (collapsible) */}
          {hasDetails && (
            <Collapse in={expanded} timeout={200}>
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #E5E7EB' }}>
                {/* Show duplicate rows table if this is a duplicate issue */}
                {group.primary.toLowerCase().includes('duplicate') && 
                 details.affectedRows && 
                 details.affectedRows.length > 0 && 
                 headers.length > 0 && 
                 rows.length > 0 ? (
                  <DuplicateRowsTable
                    headers={headers}
                    rows={rows}
                    affectedRows={details.affectedRows}
                  />
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {details.affectedRows && details.affectedRows.length > 0 && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: tokens.guidanceColor,
                          fontSize: '12px',
                          lineHeight: 1.5,
                          display: 'block'
                        }}
                      >
                        Affected rows: {formatRowList(details.affectedRows)}
                      </Typography>
                    )}
                    {details.affectedColumns && details.affectedColumns.length > 0 && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: tokens.guidanceColor,
                          fontSize: '12px',
                          lineHeight: 1.5,
                          display: 'block'
                        }}
                      >
                        Affected columns: {details.affectedColumns.join(', ')}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Collapse>
          )}
        </Box>

        {/* Expand/Collapse Button */}
        {collapsible && hasDetails && (
          <IconButton
            size="small"
            onClick={onToggleExpand}
            sx={{
              color: '#6B7280',
              flexShrink: 0,
              mt: 0.5,
              '&:hover': {
                backgroundColor: '#F9FAFB',
                color: '#374151'
              },
              transition: 'all 200ms ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
            aria-label={expanded ? 'Hide details' : 'Show details'}
          >
            <ChevronDownIcon style={{ width: 16, height: 16 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
});

ValidationMessageCard.displayName = 'ValidationMessageCard';

/**
 * Format row list for display (show first 5, then "and X more")
 */
function formatRowList(rows: number[]): string {
  if (rows.length === 0) return '';
  if (rows.length <= 5) return rows.join(', ');
  return `${rows.slice(0, 5).join(', ')} and ${rows.length - 5} more`;
}

/**
 * Duplicate Rows Table Component
 * Shows duplicate rows in a clean, simple table for user review
 */
interface DuplicateRowsTableProps {
  headers: string[];
  rows: any[][];
  affectedRows: number[];
}

const DuplicateRowsTable: React.FC<DuplicateRowsTableProps> = memo(({
  headers,
  rows,
  affectedRows
}) => {
  // Group ALL duplicate rows by their content (not just the sample from affectedRows)
  // This ensures users see all duplicates, not just a sample
  const duplicateGroups = useMemo(() => {
    const rowMap = new Map<string, number[]>();
    
    // Scan ALL rows to find duplicates (not just affectedRows)
    rows.forEach((row, rowIndex) => {
      const hash = JSON.stringify(row);
      if (!rowMap.has(hash)) {
        rowMap.set(hash, []);
      }
      rowMap.get(hash)!.push(rowIndex + 1); // Store 1-based row number
    });
    
    // Only return groups with duplicates (more than 1 row)
    // Sort by row numbers for consistent display
    return Array.from(rowMap.entries())
      .filter(([_, rowNums]) => rowNums.length > 1)
      .map(([hash, rowNums]) => ({
        hash,
        rowNumbers: rowNums.sort((a, b) => a - b),
        rowData: rows[rowNums[0] - 1] // Use first row as representative
      }))
      .sort((a, b) => a.rowNumbers[0] - b.rowNumbers[0]); // Sort groups by first row number
  }, [rows]);

  if (duplicateGroups.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '12px' }}>
        No duplicate rows found.
      </Typography>
    );
  }

  return (
    <Box sx={{ mt: 0.5 }}>
      {duplicateGroups.map((group, groupIndex) => (
        <Box key={groupIndex} sx={{ mb: groupIndex < duplicateGroups.length - 1 ? 2 : 0 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#6B7280', 
              fontSize: '12px', 
              fontWeight: 500,
              display: 'block',
              mb: 1
            }}
          >
            Rows {group.rowNumbers.join(', ')} are identical
          </Typography>
          
          <Box
            sx={{
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              overflow: 'hidden',
              maxHeight: 200,
              overflowY: 'auto',
              backgroundColor: '#FFFFFF'
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      backgroundColor: '#F9FAFB',
                      fontWeight: 600,
                      fontSize: '12px',
                      py: 1,
                      borderBottom: '1px solid #E5E7EB',
                      width: 60,
                      position: 'sticky',
                      top: 0,
                      zIndex: 1
                    }}
                  >
                    Row
                  </TableCell>
                  {headers.map((header, idx) => (
                    <TableCell
                      key={idx}
                      sx={{
                        backgroundColor: '#F9FAFB',
                        fontWeight: 600,
                        fontSize: '12px',
                        py: 1,
                        borderBottom: '1px solid #E5E7EB',
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {group.rowNumbers.map((rowNum) => {
                  const rowIndex = rowNum - 1;
                  const rowData = rows[rowIndex] || [];
                  
                  return (
                    <TableRow
                      key={rowNum}
                      sx={{
                        '&:hover': {
                          backgroundColor: '#F9FAFB'
                        },
                        '&:last-child td': {
                          borderBottom: 'none'
                        }
                      }}
                    >
                      <TableCell
                        sx={{
                          fontSize: '12px',
                          py: 1,
                          fontWeight: 500,
                          color: '#6B7280',
                          borderRight: '1px solid #E5E7EB'
                        }}
                      >
                        {rowNum}
                      </TableCell>
                      {rowData.map((cell, cellIdx) => (
                        <TableCell
                          key={cellIdx}
                          sx={{
                            fontSize: '12px',
                            py: 1,
                            color: '#374151',
                            maxWidth: 150,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={String(cell || '')}
                        >
                          {String(cell || '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Box>
      ))}
    </Box>
  );
});

DuplicateRowsTable.displayName = 'DuplicateRowsTable';
