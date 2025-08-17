import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Button, Box, Chip } from '@mui/material';
import { indexedDBInspector } from '../utils/indexedDBInspector';

interface SurveyInfo {
  id: string;
  name: string;
  type: string;
  year: string;
  rowCount: number;
  uploadDate: Date;
}

interface IndexedDBStatus {
  totalSurveys: number;
  surveys: SurveyInfo[];
}

const IndexedDBStatus: React.FC = () => {
  const [status, setStatus] = useState<IndexedDBStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const result = await indexedDBInspector.getStatus();
      setStatus(result);
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    if (window.confirm('Are you sure you want to delete ALL surveys from IndexedDB? This cannot be undone.')) {
      setLoading(true);
      try {
        await indexedDBInspector.clearAllData();
        await loadStatus();
        alert('All data cleared successfully!');
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('Error clearing data');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (!status) {
    return (
      <Card className="mb-4">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            IndexedDB Status
          </Typography>
          <Typography color="textSecondary">
            {loading ? 'Loading...' : 'No data available'}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            IndexedDB Status
          </Typography>
          <Box>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={loadStatus}
              disabled={loading}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button 
              variant="outlined" 
              color="error" 
              size="small" 
              onClick={clearAllData}
              disabled={loading || status.totalSurveys === 0}
            >
              Clear All
            </Button>
          </Box>
        </Box>

        <Typography variant="body2" color="textSecondary" gutterBottom>
          Total Surveys: {status.totalSurveys}
        </Typography>

        {status.surveys.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
              Stored Surveys:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {status.surveys.map((survey) => (
                <Chip
                  key={survey.id}
                  label={`${survey.name} ${survey.year} (${survey.rowCount} rows)`}
                  variant="outlined"
                  size="small"
                  color="primary"
                />
              ))}
            </Box>
          </Box>
        )}

        {status.totalSurveys === 0 && (
          <Typography variant="body2" color="textSecondary">
            No surveys stored in IndexedDB
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default IndexedDBStatus;
