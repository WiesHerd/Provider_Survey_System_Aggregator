import React from 'react';
import { IColumnInfo } from '../../../types/column';
import { UnmappedItemsGrid } from './shared/UnmappedItemsGrid';
import { ColumnCard } from './ColumnCard';

interface UnmappedColumnsProps {
  unmappedColumns: IColumnInfo[];
  selectedColumns: IColumnInfo[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onColumnSelect: (column: IColumnInfo) => void;
  onClearSelection?: () => void;
  onRefresh: () => void;
}

/**
 * UnmappedColumns component for displaying and managing unmapped columns
 * Uses the shared UnmappedItemsGrid for consistent layout and styling
 * 
 * @param unmappedColumns - List of unmapped columns
 * @param selectedColumns - Currently selected columns
 * @param searchTerm - Current search term
 * @param onSearchChange - Callback when search term changes
 * @param onColumnSelect - Callback when a column is selected/deselected
 * @param onClearSelection - Callback to clear all selections
 * @param onRefresh - Callback to refresh data
 */
export const UnmappedColumns: React.FC<UnmappedColumnsProps> = ({
  unmappedColumns,
  selectedColumns,
  searchTerm,
  onSearchChange,
  onColumnSelect,
  onClearSelection,
  onRefresh
}) => {
  return (
    <UnmappedItemsGrid
      items={unmappedColumns}
      groupByKey={(column) => column.surveySource}
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      selectedItems={selectedColumns}
      onClearSelection={onClearSelection}
      onRefresh={onRefresh}
      renderCard={(column, isSelected) => (
        <ColumnCard
          key={column.id}
          column={column}
          isSelected={isSelected}
          onSelect={onColumnSelect}
        />
      )}
      entityName="columns"
    />
  );
};
