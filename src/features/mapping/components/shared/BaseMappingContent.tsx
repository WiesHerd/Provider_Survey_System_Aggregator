import React from 'react';

interface BaseMappingContentProps {
  activeTab: 'unmapped' | 'mapped' | 'learned';
  children: React.ReactNode;
}

/**
 * BaseMappingContent component - Wrapper for tab content with consistent styling
 * Provides consistent min-height, transitions, and layout for all mapping screen content
 * 
 * @param activeTab - Currently active tab
 * @param children - Tab content to render
 */
export const BaseMappingContent: React.FC<BaseMappingContentProps> = ({
  activeTab,
  children
}) => {
  return (
    <div className="min-h-[400px]">
      {children}
    </div>
  );
};
