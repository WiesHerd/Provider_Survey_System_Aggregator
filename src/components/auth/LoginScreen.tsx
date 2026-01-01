/**
 * Login Screen Component
 * 
 * Professional, minimal login interface following Google-style design principles.
 * Clean, focused UI with proper error handling and loading states.
 */

import React, { useState } from 'react';
import { 
  Button, 
  TextField, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Email as EmailIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { GoogleLogo } from './GoogleLogo';

/**
 * Login screen props
 */
interface LoginScreenProps {
  onSwitchToSignup: () => void;
  onClose?: () => void;
}

/**
 * Login Screen Component
 * 
 * Provides email/password authentication with professional UI design.
 * Includes form validation, error handling, and loading states.
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onSwitchToSignup, 
  onClose 
}) => {
  const { signIn, signInWithGoogle, loading, error, clearError, isAvailable } = useAuth();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    clearError();
    setFormErrors({});

    // Validate form
    const errors: { email?: string; password?: string } = {};
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Attempt sign in
    try {
      await signIn(email.trim(), password);
      // Success - auth state change will be handled by AuthContext
    } catch (err) {
      // Error is handled by AuthContext and displayed below
      console.error('Login failed:', err);
    }
  };

  // Handle input changes
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (formErrors.email) {
      setFormErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (formErrors.password) {
      setFormErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  // Show unavailable message if Firebase is not configured
  if (!isAvailable) {
    return (
      <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center">
            <Typography variant="h5" gutterBottom color="text.secondary">
              Cloud Sync Unavailable
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Firebase is not configured. You can continue using the app with local storage.
            </Typography>
            {onClose && (
              <Button 
                variant="outlined" 
                onClick={onClose}
                sx={{ minWidth: 120 }}
              >
                Continue
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <CardContent sx={{ p: 4 }}>
        <Box textAlign="center" sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Sign In
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Access your cloud-synced survey data
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={clearError}
          >
            {error}
          </Alert>
        )}

        {/* Login Form */}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            error={!!formErrors.email}
            helperText={formErrors.email}
            disabled={loading}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              ),
            }}
            autoComplete="email"
            autoFocus
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={handlePasswordChange}
            error={!!formErrors.password}
            helperText={formErrors.password}
            disabled={loading}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    disabled={loading}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            autoComplete="current-password"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ 
              mb: 2, 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              },
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Sign In'
            )}
          </Button>

          {/* Divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
            <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
            <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
              OR
            </Typography>
            <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
          </Box>

          {/* Google Sign In Button */}
          <Button
            fullWidth
            variant="outlined"
            onClick={async () => {
              try {
                clearError(); // Clear any previous errors
                await signInWithGoogle();
                // Success - auth state change will be handled by AuthContext
              } catch (err) {
                // Error is already set in AuthContext, but we log it for debugging
                const errorMessage = err instanceof Error ? err.message : 'Google sign in failed';
                console.error('Google sign in failed:', errorMessage);
                // Error will be displayed by the error Alert above
              }
            }}
            disabled={loading}
            sx={{ 
              mb: 3,
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              borderColor: '#dadce0',
              color: '#3c4043',
              '&:hover': {
                borderColor: '#dadce0',
                backgroundColor: '#f8f9fa',
                boxShadow: '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)'
              }
            }}
            startIcon={<GoogleLogo size={18} />}
          >
            Continue with Google
          </Button>

          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9375rem' }}>
              Don't have an account?{' '}
              <Link
                component="button"
                type="button"
                onClick={onSwitchToSignup}
                disabled={loading}
                sx={{ 
                  textTransform: 'none',
                  textDecoration: 'none',
                  fontWeight: 500,
                  color: '#6366f1',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: '#4f46e5'
                  },
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Sign up
              </Link>
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
