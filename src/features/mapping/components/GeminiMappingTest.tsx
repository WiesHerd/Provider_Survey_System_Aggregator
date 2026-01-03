/**
 * Gemini Mapping Test Component
 * 
 * EXPERIMENTAL: Test component for Gemini API-based specialty auto-mapping.
 * This component is isolated and does not affect the main mapping functionality.
 * 
 * Access via: /test/gemini-mapping
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Paper,
  Stack
} from '@mui/material';
import {
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { geminiMappingService, GeminiMappingRequest, GeminiMappingResponse } from '../../../services/GeminiMappingService';

interface TestResult {
  request: GeminiMappingRequest;
  response: GeminiMappingResponse | null;
  error: string | null;
  timestamp: Date;
}

export const GeminiMappingTest: React.FC = () => {
  const [sourceSpecialty, setSourceSpecialty] = useState('');
  const [surveySource, setSurveySource] = useState<'MGMA' | 'SullivanCotter' | 'Gallagher'>('MGMA');
  const [providerType, setProviderType] = useState<'PHYSICIAN' | 'APP' | ''>('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = geminiMappingService.isConfigured();

  const handleTest = async () => {
    if (!sourceSpecialty.trim()) {
      setError('Please enter a source specialty');
      return;
    }

    if (!isConfigured) {
      setError('Gemini API key not configured. Please set REACT_APP_GEMINI_API_KEY in .env.local');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: GeminiMappingRequest = {
        sourceSpecialty: sourceSpecialty.trim(),
        surveySource,
        context: providerType ? { providerType: providerType as 'PHYSICIAN' | 'APP' } : undefined
      };

      const response = await geminiMappingService.mapSpecialty(request);

      setResults(prev => [{
        request,
        response,
        error: null,
        timestamp: new Date()
      }, ...prev]);

      setSourceSpecialty(''); // Clear input for next test
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      setResults(prev => [{
        request: {
          sourceSpecialty: sourceSpecialty.trim(),
          surveySource,
          context: providerType ? { providerType: providerType as 'PHYSICIAN' | 'APP' } : undefined
        },
        response: null,
        error: errorMessage,
        timestamp: new Date()
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getDomainColor = (domain?: string): string => {
    switch (domain) {
      case 'PEDIATRIC': return 'info';
      case 'ADULT': return 'default';
      case 'APP_OTHER': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Card elevation={3}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <SparklesIcon className="h-8 w-8 text-purple-600" />
            <Typography variant="h4" component="h1">
              Gemini API Specialty Mapping Test
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Experimental Feature:</strong> This test uses Google Gemini API to assist with specialty mapping.
              It handles pediatric vs adult specialties and different naming standards across survey sources.
              This does not affect your main mapping functionality.
            </Typography>
          </Alert>

          {!isConfigured && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>API Key Not Configured:</strong> Please set <code>REACT_APP_GEMINI_API_KEY</code> in your <code>.env.local</code> file.
              </Typography>
            </Alert>
          )}

          <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
            <Stack spacing={3}>
              <TextField
                label="Source Specialty"
                value={sourceSpecialty}
                onChange={(e) => setSourceSpecialty(e.target.value)}
                placeholder="e.g., Cardiology - Interventional, Pediatric Cardiology, etc."
                fullWidth
                disabled={loading || !isConfigured}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading && isConfigured) {
                    handleTest();
                  }
                }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Survey Source</InputLabel>
                  <Select
                    value={surveySource}
                    onChange={(e) => setSurveySource(e.target.value as typeof surveySource)}
                    label="Survey Source"
                    disabled={loading || !isConfigured}
                  >
                    <MenuItem value="MGMA">MGMA</MenuItem>
                    <MenuItem value="SullivanCotter">SullivanCotter</MenuItem>
                    <MenuItem value="Gallagher">Gallagher</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Provider Type (Optional)</InputLabel>
                  <Select
                    value={providerType}
                    onChange={(e) => setProviderType(e.target.value as typeof providerType)}
                    label="Provider Type (Optional)"
                    disabled={loading || !isConfigured}
                  >
                    <MenuItem value="">Any</MenuItem>
                    <MenuItem value="PHYSICIAN">Physician</MenuItem>
                    <MenuItem value="APP">APP</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Button
                variant="contained"
                onClick={handleTest}
                disabled={loading || !isConfigured || !sourceSpecialty.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <SparklesIcon className="h-5 w-5" />}
                sx={{ py: 1.5 }}
              >
                {loading ? 'Testing...' : 'Test Mapping'}
              </Button>
            </Stack>
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {results.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Test Results ({results.length})
              </Typography>
              
              {results.map((result, index) => (
                <Card key={index} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Source Specialty
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {result.request.sourceSpecialty}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          {result.request.surveySource} • {result.timestamp.toLocaleTimeString()}
                        </Typography>
                      </Box>
                      {result.response && (
                        <Chip
                          label={`${(result.response.confidence * 100).toFixed(0)}% confidence`}
                          color={getConfidenceColor(result.response.confidence)}
                          size="small"
                        />
                      )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {result.error ? (
                      <Alert severity="error" icon={<XCircleIcon className="h-5 w-5" />}>
                        <Typography variant="body2">{result.error}</Typography>
                      </Alert>
                    ) : result.response ? (
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Suggested Mapping
                          </Typography>
                          <Typography variant="h6" color="primary">
                            {result.response.suggestedMapping}
                          </Typography>
                          {result.response.domain && (
                            <Chip
                              label={result.response.domain}
                              color={getDomainColor(result.response.domain)}
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Box>

                        <Box>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Reasoning
                          </Typography>
                          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                            {result.response.reasoning}
                          </Typography>
                        </Box>

                        {result.response.alternatives && result.response.alternatives.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Alternative Mappings
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {result.response.alternatives.map((alt, altIndex) => (
                                <Chip
                                  key={altIndex}
                                  label={`${alt.name} (${(alt.confidence * 100).toFixed(0)}%)`}
                                  variant="outlined"
                                  size="small"
                                />
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Stack>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {results.length === 0 && !loading && (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
              <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <Typography variant="body1" color="text.secondary">
                Enter a source specialty above and click "Test Mapping" to see results
              </Typography>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
