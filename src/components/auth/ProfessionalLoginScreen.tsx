/**
 * Professional Login Screen Component
 * 
 * Silicon Valley modern design - inspired by Stripe, Linear, Vercel, Notion
 * Ultra-minimal, spacious, with modern typography and subtle interactions
 */

import React, { useState } from 'react';
import { 
  Button, 
  TextField, 
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
  VisibilityOff
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { GoogleLogo } from './GoogleLogo';

interface ProfessionalLoginScreenProps {
  onSwitchToSignup: () => void;
}

/**
 * Professional Login Screen
 * 
 * Silicon Valley modern design - clean, minimal, spacious
 */
export const ProfessionalLoginScreen: React.FC<ProfessionalLoginScreenProps> = ({ 
  onSwitchToSignup
}) => {
  const { signIn, signInWithGoogle, loading, error, clearError, isAvailable } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormErrors({});

    const errors: { email?: string; password?: string } = {};
    
    if (!email.trim()) {
      errors.email = 'Enter your email';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Enter a valid email address';
    }
    
    if (!password) {
      errors.password = 'Enter your password';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      clearError(); // Clear any previous errors
      await signIn(email.trim(), password);
      // Success - auth state change will be handled by AuthContext
    } catch (err) {
      // Error is already set in AuthContext and will be displayed
      console.error('Login failed:', err);
    }
  };

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

  // Log warning to console instead of showing on screen
  if (!isAvailable && process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Firebase not configured. Restart dev server after setting up .env.local');
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#ffffff',
        p: { xs: 3, sm: 4 },
        position: 'relative'
      }}
    >
      {/* Subtle background pattern */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.03) 0%, transparent 50%)',
          pointerEvents: 'none'
        }}
      />

      <Box sx={{ maxWidth: 400, width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Minimal Logo */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box
              component="img"
              src={process.env.PUBLIC_URL + '/benchpoint-icon.svg?v=7'}
              alt="BenchPoint"
              sx={{
                width: 32,
                height: 32,
                objectFit: 'contain'
              }}
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 600,
                fontSize: '1.25rem',
                color: '#0f172a',
                letterSpacing: '-0.02em',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
              }}
            >
              BenchPoint
            </Typography>
          </Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 600,
              color: '#0f172a',
              mb: 1,
              fontSize: { xs: '1.75rem', sm: '2rem' },
              letterSpacing: '-0.025em',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}
          >
            Welcome back
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.9375rem',
              color: '#64748b',
              fontWeight: 400
            }}
          >
            Sign in to your account to continue
          </Typography>
        </Box>

        {/* Login Card - Ultra Minimal */}
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            p: { xs: 5, sm: 6 },
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* Error Alert - Minimal */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 4, 
                borderRadius: '8px',
                fontSize: '0.875rem',
                bgcolor: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                '& .MuiAlert-icon': {
                  color: '#dc2626'
                },
                '& .MuiAlert-message': {
                  color: '#991b1b'
                }
              }}
              onClose={clearError}
            >
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit}>
            {/* Email Field */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                error={!!formErrors.email}
                helperText={formErrors.email}
                disabled={loading}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '0.9375rem',
                    bgcolor: '#f8fafc',
                    transition: 'all 0.2s ease',
                    '& fieldset': {
                      borderColor: '#e2e8f0',
                      borderWidth: '1px'
                    },
                    '&:hover': {
                      bgcolor: '#f1f5f9',
                      '& fieldset': {
                        borderColor: '#cbd5e1'
                      }
                    },
                    '&.Mui-focused': {
                      bgcolor: 'white',
                      '& fieldset': {
                        borderColor: '#6366f1',
                        borderWidth: '2px'
                      }
                    },
                    '&.Mui-disabled': {
                      bgcolor: '#f1f5f9'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.9375rem',
                    color: '#64748b',
                    fontWeight: 500,
                    '&.Mui-focused': {
                      color: '#6366f1'
                    }
                  },
                  '& .MuiFormHelperText-root': {
                    fontSize: '0.8125rem',
                    marginLeft: 0,
                    marginTop: '6px',
                    color: '#dc2626'
                  }
                }}
                autoComplete="email"
                autoFocus
              />
            </Box>

            {/* Password Field */}
            <Box sx={{ mb: 4 }}>
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                error={!!formErrors.password}
                helperText={formErrors.password}
                disabled={loading}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '0.9375rem',
                    bgcolor: '#f8fafc',
                    transition: 'all 0.2s ease',
                    '& fieldset': {
                      borderColor: '#e2e8f0',
                      borderWidth: '1px'
                    },
                    '&:hover': {
                      bgcolor: '#f1f5f9',
                      '& fieldset': {
                        borderColor: '#cbd5e1'
                      }
                    },
                    '&.Mui-focused': {
                      bgcolor: 'white',
                      '& fieldset': {
                        borderColor: '#6366f1',
                        borderWidth: '2px'
                      }
                    },
                    '&.Mui-disabled': {
                      bgcolor: '#f1f5f9'
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.9375rem',
                    color: '#64748b',
                    fontWeight: 500,
                    '&.Mui-focused': {
                      color: '#6366f1'
                    }
                  },
                  '& .MuiFormHelperText-root': {
                    fontSize: '0.8125rem',
                    marginLeft: 0,
                    marginTop: '6px',
                    color: '#dc2626'
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={loading}
                        size="small"
                        sx={{
                          color: '#64748b',
                          '&:hover': {
                            backgroundColor: 'transparent',
                            color: '#475569'
                          }
                        }}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                autoComplete="current-password"
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                <Link
                  component="button"
                  type="button"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    // TODO: Implement forgot password flow
                  }}
                  disabled={loading}
                  sx={{
                    textTransform: 'none',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    color: '#6366f1',
                    fontWeight: 500,
                    '&:hover': {
                      textDecoration: 'none',
                      color: '#4f46e5',
                      backgroundColor: 'transparent'
                    },
                    cursor: loading || !isAvailable ? 'not-allowed' : 'pointer',
                    '&:disabled': {
                      color: '#cbd5e1'
                    }
                  }}
                >
                  Forgot password?
                </Link>
              </Box>
            </Box>

            {/* Sign In Button - Modern Gradient */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !isAvailable}
              sx={{ 
                mb: 3, 
                py: 1.5,
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '0.9375rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  boxShadow: '0 4px 12px 0 rgba(99, 102, 241, 0.4)',
                  transform: 'translateY(-1px)'
                },
                '&:active': {
                  transform: 'translateY(0)'
                },
                '&:disabled': {
                  background: '#e2e8f0',
                  color: '#94a3b8',
                  boxShadow: 'none'
                }
              }}
            >
              {loading ? (
                <CircularProgress size={20} sx={{ color: 'white' }} />
              ) : (
                'Sign in'
              )}
            </Button>

            {/* Divider - Minimal */}
            <Box sx={{ display: 'flex', alignItems: 'center', my: 4 }}>
              <Box sx={{ flex: 1, height: '1px', bgcolor: '#e2e8f0' }} />
              <Typography 
                variant="body2" 
                sx={{ 
                  px: 2,
                  fontSize: '0.8125rem',
                  color: '#94a3b8',
                  fontWeight: 500
                }}
              >
                or
              </Typography>
              <Box sx={{ flex: 1, height: '1px', bgcolor: '#e2e8f0' }} />
            </Box>

            {/* Google Sign In Button - Modern Style */}
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
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '0.9375rem',
                fontWeight: 500,
                borderColor: '#e2e8f0',
                color: '#0f172a',
                backgroundColor: 'white',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#cbd5e1',
                  backgroundColor: '#f8fafc',
                  boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.05)',
                  transform: 'translateY(-1px)'
                },
                '&:active': {
                  transform: 'translateY(0)'
                },
                '&:disabled': {
                  borderColor: '#e2e8f0',
                  backgroundColor: '#f8fafc',
                  color: '#cbd5e1'
                }
              }}
              startIcon={<GoogleLogo size={18} />}
            >
              Continue with Google
            </Button>

            {/* Sign Up Link - Minimal */}
            <Box sx={{ textAlign: 'center', pt: 2 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.875rem',
                  color: '#64748b'
                }}
              >
                Don't have an account?{' '}
                <Link
                  component="button"
                  type="button"
                  onClick={onSwitchToSignup}
                  disabled={loading}
                  sx={{ 
                    textTransform: 'none',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#6366f1',
                    '&:hover': {
                      textDecoration: 'none',
                      color: '#4f46e5',
                      backgroundColor: 'transparent'
                    },
                    cursor: loading || !isAvailable ? 'not-allowed' : 'pointer',
                    '&:disabled': {
                      color: '#cbd5e1'
                    }
                  }}
                >
                  Sign up
                </Link>
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Footer - Ultra Minimal */}
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: '0.75rem',
              color: '#94a3b8',
              fontWeight: 400
            }}
          >
            © 2024 BenchPoint
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
