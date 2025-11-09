/**
 * Command Palette Component
 * 
 * Enterprise-grade command palette (Cmd/Ctrl+K) for quick navigation and actions.
 * Inspired by VS Code, Linear, and Notion.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  ArrowRightIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  DocumentTextIcon,
  ChartBarIcon,
  MapIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

// Funnel icon SVG (not available in heroicons)
const FunnelIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" />
  </svg>
);

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'navigation' | 'actions' | 'filters' | 'views';
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  // Context-specific props
  onExport?: () => void;
  onPrint?: () => void;
  onClearFilters?: () => void;
  availableSpecialties?: string[];
  availableRegions?: string[];
  currentFilters?: {
    specialty?: string;
    providerType?: string;
    surveySource?: string;
    dataCategory?: string;
    year?: string;
  };
  onFilterChange?: (filter: string, value: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExport,
  onPrint,
  onClearFilters,
  availableSpecialties = [],
  availableRegions = [],
  currentFilters = {},
  onFilterChange
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Navigation commands
  const navigationCommands: Command[] = useMemo(() => [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      icon: <DocumentTextIcon className="h-4 w-4" />,
      action: () => { navigate('/dashboard'); onClose(); },
      category: 'navigation',
      keywords: ['dashboard', 'home', 'main']
    },
    {
      id: 'nav-upload',
      label: 'Go to Survey Upload',
      icon: <ArrowDownTrayIcon className="h-4 w-4" />,
      action: () => { navigate('/upload'); onClose(); },
      category: 'navigation',
      keywords: ['upload', 'survey', 'import']
    },
    {
      id: 'nav-benchmarking',
      label: 'Go to Survey Analytics',
      icon: <ChartBarIcon className="h-4 w-4" />,
      action: () => { navigate('/benchmarking'); onClose(); },
      category: 'navigation',
      keywords: ['analytics', 'benchmarking', 'survey', 'data']
    },
    {
      id: 'nav-regional',
      label: 'Go to Regional Analytics',
      icon: <MapIcon className="h-4 w-4" />,
      action: () => { navigate('/regional-analytics'); onClose(); },
      category: 'navigation',
      keywords: ['regional', 'region', 'geography', 'location']
    },
    {
      id: 'nav-specialty-mapping',
      label: 'Go to Specialty Mapping',
      icon: <Cog6ToothIcon className="h-4 w-4" />,
      action: () => { navigate('/specialty-mapping'); onClose(); },
      category: 'navigation',
      keywords: ['specialty', 'mapping', 'map']
    }
  ], [navigate, onClose]);

  // Action commands
  const actionCommands: Command[] = useMemo(() => {
    const actions: Command[] = [];
    
    if (onExport) {
      actions.push({
        id: 'action-export',
        label: 'Export to Excel',
        icon: <ArrowDownTrayIcon className="h-4 w-4" />,
        action: () => { onExport(); onClose(); },
        category: 'actions',
        keywords: ['export', 'excel', 'download', 'save']
      });
    }
    
    if (onPrint) {
      actions.push({
        id: 'action-print',
        label: 'Print Report',
        icon: <PrinterIcon className="h-4 w-4" />,
        action: () => { onPrint(); onClose(); },
        category: 'actions',
        keywords: ['print', 'pdf', 'report']
      });
    }
    
    if (onClearFilters) {
      actions.push({
        id: 'action-clear-filters',
        label: 'Clear All Filters',
        icon: <XMarkIcon className="h-4 w-4" />,
        action: () => { onClearFilters(); onClose(); },
        category: 'actions',
        keywords: ['clear', 'reset', 'filters', 'remove']
      });
    }
    
    return actions;
  }, [onExport, onPrint, onClearFilters, onClose]);

  // Context-specific commands (data category switching, etc.)
  const contextCommands: Command[] = useMemo(() => {
    const commands: Command[] = [];
    
    // Data Category switching (for Regional Analytics screen)
    if (onFilterChange) {
      const dataCategories = [
        { value: 'Compensation', label: 'Switch to Compensation Data', keywords: ['compensation', 'tcc', 'salary'] },
        { value: 'Call Pay', label: 'Switch to Call Pay Data', keywords: ['call', 'pay', 'on-call', 'oncall'] },
        { value: 'Moonlighting', label: 'Switch to Moonlighting Data', keywords: ['moonlighting', 'moonlight'] }
      ];
      
      dataCategories.forEach(cat => {
        commands.push({
          id: `switch-category-${cat.value}`,
          label: cat.label,
          icon: <ChartBarIcon className="h-4 w-4" />,
          action: () => { 
            onFilterChange('dataCategory', cat.value); 
            onClose(); 
          },
          category: 'filters',
          keywords: ['category', 'data', 'switch', ...cat.keywords]
        });
      });
    }
    
    return commands;
  }, [onFilterChange, onClose]);

  // Combine all commands
  const allCommands = useMemo(() => [
    ...navigationCommands,
    ...actionCommands,
    ...contextCommands
  ], [navigationCommands, actionCommands, contextCommands]);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return allCommands;
    }
    
    const query = searchQuery.toLowerCase();
    return allCommands.filter(cmd => {
      const labelMatch = cmd.label.toLowerCase().includes(query);
      const keywordMatch = cmd.keywords?.some(kw => kw.includes(query));
      return labelMatch || keywordMatch;
    });
  }, [searchQuery, allCommands]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {
      navigation: [],
      actions: [],
      filters: [],
      views: []
    };
    
    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });
    
    return groups;
  }, [filteredCommands]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
    filters: 'Quick Switch',
    views: 'Views'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Command Palette */}
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 outline-none text-gray-900 placeholder-gray-400"
          />
          <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div 
          ref={listRef}
          className="max-h-[400px] overflow-y-auto"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, commands]) => {
              if (commands.length === 0) return null;
              
              return (
                <div key={category} className="py-2">
                  <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {categoryLabels[category]}
                  </div>
                  {commands.map((cmd, index) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    const isSelected = globalIndex === selectedIndex;
                    
                    return (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isSelected 
                            ? 'bg-indigo-50 text-indigo-900' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`flex-shrink-0 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`}>
                          {cmd.icon}
                        </div>
                        <span className="flex-1 font-medium">{cmd.label}</span>
                        {isSelected && (
                          <ArrowRightIcon className="h-4 w-4 text-indigo-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↵</kbd>
              <span>Select</span>
            </span>
          </div>
          <span>{filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
};

