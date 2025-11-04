/**
 * Standardized button styles for all mapping screens
 * Ensures consistent styling across Provider Types, Regions, Variables, and Column Mapping
 */

export const BUTTON_STYLES = {
  // Primary action buttons (green)
  primary: 'inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 border border-green-600',
  
  // Secondary action buttons (purple)
  secondary: 'inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 border border-purple-600',
  
  // Info action buttons (indigo)
  info: 'inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 border border-indigo-600',
  
  // Danger action buttons (red)
  danger: 'inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400',
  
  // Neutral action buttons (gray)
  neutral: 'inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200',
  
  // Toggle buttons (select all/deselect all)
  toggle: 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-offset-2',
  
  // Toggle button states
  toggleActive: 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
  toggleInactive: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500',
  
  // Disabled state
  disabled: 'opacity-50 cursor-not-allowed',
  
  // Help button
  help: 'p-2 hover:bg-gray-100 rounded-lg transition-all duration-200',
  
  // Clear all button (mapped tab)
  clearAll: 'inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400'
} as const;

/**
 * Helper function to combine button styles with modifiers
 */
export const combineButtonStyles = (base: string, ...modifiers: string[]): string => {
  return [base, ...modifiers].join(' ');
};

/**
 * Common button style combinations
 */
export const BUTTON_COMBINATIONS = {
  // Primary with disabled state
  primaryDisabled: combineButtonStyles(BUTTON_STYLES.primary, BUTTON_STYLES.disabled),
  
  // Toggle button active state
  toggleActive: combineButtonStyles(BUTTON_STYLES.toggle, BUTTON_STYLES.toggleActive),
  
  // Toggle button inactive state
  toggleInactive: combineButtonStyles(BUTTON_STYLES.toggle, BUTTON_STYLES.toggleInactive),
  
  // Toggle button with disabled state
  toggleDisabled: combineButtonStyles(BUTTON_STYLES.toggle, BUTTON_STYLES.toggleInactive, BUTTON_STYLES.disabled)
} as const;
