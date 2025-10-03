import React from 'react';
import { UnmappedSpecialties } from './UnmappedSpecialties';
import { MappedSpecialties } from './MappedSpecialties';
import { LearnedMappings } from './LearnedMappings';
import { IUnmappedSpecialty, ISpecialtyMapping } from '../types/mapping';

interface SpecialtyMappingContentProps {
  // Active tab
  activeTab: 'unmapped' | 'mapped' | 'learned';
  
  // Unmapped tab props
  unmappedSpecialties: IUnmappedSpecialty[];
  selectedSpecialties: IUnmappedSpecialty[];
  unmappedSearchTerm: string;
  onUnmappedSearchChange: (term: string) => void;
  onSpecialtySelect: (specialty: IUnmappedSpecialty) => void;
  onSpecialtyDeselect: (specialty: IUnmappedSpecialty) => void;
  onClearSelection: () => void;
  onRefresh: () => void;
  
  // Mapped tab props
  mappings: ISpecialtyMapping[];
  mappedSearchTerm: string;
  onMappedSearchChange: (term: string) => void;
  onDeleteMapping: (mappingId: string) => void;
  
  // Learned tab props
  learnedMappings: Record<string, string>;
  learnedMappingsWithSource: Array<{original: string, corrected: string, surveySource: string}>;
  learnedSearchTerm: string;
  onLearnedSearchChange: (term: string) => void;
  onRemoveLearnedMapping: (original: string) => void;
  onApplyAllLearnedMappings: () => void;
  onClearAllLearnedMappings: () => void;
}

/**
 * Tab content component for SpecialtyMapping
 * Handles rendering of different tab content based on activeTab
 * Extracted for better maintainability and single responsibility
 */
export const SpecialtyMappingContent: React.FC<SpecialtyMappingContentProps> = ({
  activeTab,
  // Unmapped props
  unmappedSpecialties,
  selectedSpecialties,
  unmappedSearchTerm,
  onUnmappedSearchChange,
  onSpecialtySelect,
  onSpecialtyDeselect,
  onClearSelection,
  onRefresh,
  // Mapped props
  mappings,
  mappedSearchTerm,
  onMappedSearchChange,
  onDeleteMapping,
  // Learned props
  learnedMappings,
  learnedMappingsWithSource,
  learnedSearchTerm,
  onLearnedSearchChange,
  onRemoveLearnedMapping,
  onApplyAllLearnedMappings,
  onClearAllLearnedMappings
}) => {
  return (
    <div className="min-h-[400px]">
      {activeTab === 'unmapped' && (
        <UnmappedSpecialties
          unmappedSpecialties={unmappedSpecialties}
          selectedSpecialties={selectedSpecialties}
          searchTerm={unmappedSearchTerm}
          onSearchChange={onUnmappedSearchChange}
          onSpecialtySelect={onSpecialtySelect}
          onSpecialtyDeselect={onSpecialtyDeselect}
          onClearSelection={onClearSelection}
          onRefresh={onRefresh}
        />
      )}
      {activeTab === 'mapped' && (
        <MappedSpecialties
          mappings={mappings}
          searchTerm={mappedSearchTerm}
          onSearchChange={onMappedSearchChange}
          onDeleteMapping={onDeleteMapping}
        />
      )}
      {activeTab === 'learned' && (
        <LearnedMappings
          learnedMappings={learnedMappings}
          learnedMappingsWithSource={learnedMappingsWithSource}
          searchTerm={learnedSearchTerm}
          onSearchChange={onLearnedSearchChange}
          onRemoveLearnedMapping={onRemoveLearnedMapping}
          onApplyAllMappings={onApplyAllLearnedMappings}
          onClearAllMappings={onClearAllLearnedMappings}
        />
      )}
    </div>
  );
};
