/**
 * Signup Screen Component
 * 
 * Professional, minimal signup interface following Google-style design principles.
 * Clean, focused UI with proper validation and error handling.
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
  Link,
  Checkbox,
  FormControlLabel,
  LinearProgress
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { GoogleLogo } from './GoogleLogo';

/**
 * Signup screen props
 */
interface SignupScreenProps {
  onSwitchToLogin: () => void;
  onClose?: () => void;
}

/**
 * Signup Screen Component
 * 
 * Provides user registration with professional UI design.
 * Includes form validation, error handling, and loading states.
 */
export const SignupScreen: React.FC<SignupScreenProps> = ({ 
  onSwitchToLogin, 
  onClose 
}) => {
  const { signUp, signInWithGoogle, loading, error, clearError, isAvailable } = useAuth();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formErrors, setFormErrors] = useState<{ 
    email?: string; 
    password?: string; 
    confirmPassword?: string;
    terms?: string;
  }>({});

  // Password strength calculation
  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    if (!pwd) return { strength: 0, label: '', color: 'transparent' };
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z\d]/.test(pwd)) strength++;
    
    if (strength <= 2) return { strength, label: 'Weak', color: '#ef4444' };
    if (strength <= 3) return { strength, label: 'Fair', color: '#f59e0b' };
    if (strength <= 4) return { strength, label: 'Good', color: '#3b82f6' };
    return { strength, label: 'Strong', color: '#10b981' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    clearError();
    setFormErrors({});

    // Validate form
    const errors: { 
      email?: string; 
      password?: string; 
      confirmPassword?: string;
      terms?: string;
    } = {};
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
      errors.password = 'Password must contain both uppercase and lowercase letters';
    } else if (!/\d/.test(password)) {
      errors.password = 'Password must contain at least one number';
    }
    
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptedTerms) {
      errors.terms = 'You must accept the Terms of Service and Privacy Policy';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Attempt sign up
    try {
      await signUp(email.trim(), password);
      // Success - auth state change will be handled by AuthContext
    } catch (err) {
      // Error is already set in AuthContext and will be displayed
      console.error('Signup failed:', err);
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

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (formErrors.confirmPassword) {
      setFormErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
  };

  // Note: We always show the signup form, even if Firebase isn't configured
  // This allows users to see the UI and test the forms
  // A warning will be shown in the form if Firebase is unavailable

  // Log warning to console instead of showing on screen (more professional)
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
            Create your account
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              fontSize: '0.9375rem',
              color: '#64748b',
              fontWeight: 400
            }}
          >
            Get started with BenchPoint today
          </Typography>
        </Box>

        {/* Signup Card - Ultra Minimal */}
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

          {/* Signup Form */}
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
            <Box sx={{ mb: 2 }}>
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
                autoComplete="new-password"
              />
            </Box>

            {/* Password Strength Indicator - Modern */}
            {password && (
              <Box sx={{ mb: 3, mt: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(passwordStrength.strength / 5) * 100}
                    sx={{
                      flex: 1,
                      height: 4,
                      borderRadius: '4px',
                      backgroundColor: '#f1f5f9',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: passwordStrength.color,
                        borderRadius: '4px',
                        transition: 'all 0.3s ease'
                      }
                    }}
                  />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: passwordStrength.color, 
                      fontWeight: 600, 
                      minWidth: 50,
                      fontSize: '0.75rem',
                      letterSpacing: '0.025em'
                    }}
                  >
                    {passwordStrength.label}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Confirm Password Field */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                error={!!formErrors.confirmPassword}
                helperText={formErrors.confirmPassword}
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
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                        {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                autoComplete="new-password"
              />
            </Box>

            {/* Terms and Privacy Policy - Modern */}
            <Box sx={{ mb: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={acceptedTerms}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setAcceptedTerms(e.target.checked);
                      if (formErrors.terms) {
                        setFormErrors(prev => ({ ...prev, terms: undefined }));
                      }
                    }}
                    disabled={loading}
                    sx={{ 
                      color: formErrors.terms ? '#dc2626' : '#6366f1',
                      '&.Mui-checked': {
                        color: '#6366f1'
                      },
                      '&.Mui-disabled': {
                        color: '#cbd5e1'
                      }
                    }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
                    I agree to the{' '}
                    <Link
                      href="#"
                      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                        e.preventDefault();
                        // TODO: Open Terms of Service modal/page
                      }}
                      sx={{
                        color: '#6366f1',
                        textDecoration: 'none',
                        fontWeight: 500,
                        '&:hover': {
                          textDecoration: 'none',
                          color: '#4f46e5'
                        }
                      }}
                    >
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link
                      href="#"
                      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                        e.preventDefault();
                        // TODO: Open Privacy Policy modal/page
                      }}
                      sx={{
                        color: '#6366f1',
                        textDecoration: 'none',
                        fontWeight: 500,
                        '&:hover': {
                          textDecoration: 'none',
                          color: '#4f46e5'
                        }
                      }}
                    >
                      Privacy Policy
                    </Link>
                  </Typography>
                }
                sx={{ 
                  alignItems: 'flex-start',
                  m: 0,
                  '& .MuiFormControlLabel-label': {
                    mt: 0.5
                  }
                }}
              />
              {formErrors.terms && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, ml: 4.5, fontSize: '0.75rem', color: '#dc2626' }}>
                  {formErrors.terms}
                </Typography>
              )}
            </Box>

            {/* Create Account Button - Modern Gradient */}
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
                'Create Account'
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

            {/* Google Sign Up Button - Modern Style */}
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

            {/* Sign In Link - Minimal */}
            <Box sx={{ textAlign: 'center', pt: 2 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.875rem',
                  color: '#64748b'
                }}
              >
                Already have an account?{' '}
                <Link
                  component="button"
                  type="button"
                  onClick={onSwitchToLogin}
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
                  Sign in
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
