// DEPRECATED: Use the new LoadingSpinner from shared/components instead
// This file is kept for backward compatibility only
import { 
  default as ModernLoadingSpinner,
  ButtonSpinner,
  PageSpinner,
  InlineSpinner,
  OverlaySpinner,
  SuspenseSpinner,
  TableSpinner
} from '../../shared/components/LoadingSpinner';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
}

// Backward compatibility wrapper - redirects to modern LoadingSpinner
const LoadingSpinner: React.FC<LoadingSpinnerProps> = (props) => {
  return <ModernLoadingSpinner {...props} />;
};

// Export modern components for backward compatibility
export { 
  ButtonSpinner,
  PageSpinner,
  InlineSpinner,
  OverlaySpinner,
  SuspenseSpinner,
  TableSpinner
};

export default LoadingSpinner;
