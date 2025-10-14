/**
 * Standard Tooltip Component
 * 
 * A reusable tooltip component that provides consistent styling and behavior
 * across the entire application. This is the single source of truth for all
 * tooltips in the app.
 * 
 * CRITICAL: All tooltips in the app should use this component to maintain
 * consistency and avoid multiple tooltip implementations.
 */

import React from 'react';
import { Tooltip as MuiTooltip } from '@mui/material';

export interface StandardTooltipProps {
  /** Tooltip content - can be string, React element, or JSX */
  title: React.ReactNode;
  /** Tooltip placement */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end';
  /** Whether to show arrow */
  arrow?: boolean;
  /** Delay before showing tooltip (ms) */
  enterDelay?: number;
  /** Delay before hiding tooltip (ms) */
  leaveDelay?: number;
  /** Whether tooltip is disabled */
  disabled?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Children element to attach tooltip to */
  children: React.ReactElement;
  /** Additional props passed to MUI Tooltip */
  [key: string]: any;
}

/**
 * Standard Tooltip component with consistent enterprise styling
 * 
 * @param title - Tooltip content (string, React element, or JSX)
 * @param placement - Tooltip placement (default: 'top')
 * @param arrow - Whether to show arrow (default: true)
 * @param enterDelay - Delay before showing (default: 500ms)
 * @param leaveDelay - Delay before hiding (default: 200ms)
 * @param disabled - Whether tooltip is disabled
 * @param className - Additional CSS classes
 * @param size - Size variant (affects font size and padding)
 * @param children - Element to attach tooltip to
 */
export const StandardTooltip: React.FC<StandardTooltipProps> = ({
  title,
  placement = 'top',
  arrow = true,
  enterDelay = 500,
  leaveDelay = 200,
  disabled = false,
  className = '',
  size = 'medium',
  children,
  ...props
}) => {
  // Get size-specific styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          fontSize: '0.75rem', // 12px
          padding: '4px 8px',
          maxWidth: '200px'
        };
      case 'medium':
        return {
          fontSize: '0.875rem', // 14px
          padding: '6px 12px',
          maxWidth: '300px'
        };
      case 'large':
        return {
          fontSize: '1rem', // 16px
          padding: '8px 16px',
          maxWidth: '400px'
        };
      default:
        return {
          fontSize: '0.875rem',
          padding: '6px 12px',
          maxWidth: '300px'
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <MuiTooltip
      title={title}
      placement={placement}
      arrow={arrow}
      enterDelay={enterDelay}
      leaveDelay={leaveDelay}
      disabled={disabled}
      className={className}
      componentsProps={{
        tooltip: {
          sx: {
            // Google-style minimal tooltip
            backgroundColor: '#2d3748', // Google's dark gray
            color: '#ffffff',
            fontSize: sizeStyles.fontSize,
            padding: sizeStyles.padding,
            maxWidth: sizeStyles.maxWidth,
            fontWeight: 400, // Lighter weight like Google
            borderRadius: '8px', // More rounded like Google
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', // Subtle shadow
            border: 'none', // No border like Google
            '& .MuiTooltip-arrow': {
              color: '#2d3748',
              '&::before': {
                border: 'none', // No border on arrow
              }
            }
          }
        },
        popper: {
          sx: {
            zIndex: 1300
          }
        }
      }}
      {...props}
    >
      {children}
    </MuiTooltip>
  );
};

/**
 * Simple tooltip for basic text content
 * 
 * @param text - Simple text content
 * @param children - Element to attach tooltip to
 * @param props - Additional tooltip props
 */
export const SimpleTooltip: React.FC<{
  text: string;
  children: React.ReactElement;
} & Omit<StandardTooltipProps, 'title'>> = ({ text, children, ...props }) => (
  <StandardTooltip title={text} {...props}>
    {children}
  </StandardTooltip>
);

/**
 * Rich tooltip for complex content (HTML, multiple lines, etc.)
 * 
 * @param content - Rich content (JSX, HTML, etc.)
 * @param children - Element to attach tooltip to
 * @param props - Additional tooltip props
 */
export const RichTooltip: React.FC<{
  content: React.ReactNode;
  children: React.ReactElement;
} & Omit<StandardTooltipProps, 'title'>> = ({ content, children, ...props }) => (
  <StandardTooltip title={content} {...props}>
    {children}
  </StandardTooltip>
);

/**
 * Help tooltip for information icons (i icon)
 * 
 * @param helpText - Help text content
 * @param children - Element to attach tooltip to (usually an info icon)
 * @param props - Additional tooltip props
 */
export const HelpTooltip: React.FC<{
  helpText: string;
  children: React.ReactElement;
} & Omit<StandardTooltipProps, 'title'>> = ({ helpText, children, ...props }) => (
  <StandardTooltip 
    title={helpText} 
    placement="top"
    enterDelay={300}
    leaveDelay={100}
    size="small"
    {...props}
  >
    {children}
  </StandardTooltip>
);

export default StandardTooltip;
