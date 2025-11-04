/**
 * File Upload component
 * This component handles drag-and-drop file uploads with progress tracking
 */

import React, { memo, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  CloudArrowUpIcon,
  XMarkIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { FileUploadProps } from '../types/upload';
import { formatFileSize } from '../../../shared/utils';

/**
 * File Upload component for drag-and-drop file handling
 * 
 * @param files - Array of files to display
 * @param onDrop - Callback when files are dropped
 * @param onRemove - Callback when a file is removed
 * @param onClear - Callback when all files are cleared
 * @param uploadProgress - Upload progress state
 * @param disabled - Whether the component is disabled
 */
export const FileUpload: React.FC<FileUploadProps> = memo(({
  files,
  onDrop,
  onRemove,
  onClear,
  uploadProgress,
  disabled = false
}) => {
  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'application/csv': ['.csv']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    multiple: true,
    disabled
  });

  // Event handlers
  const handleRemoveFile = useCallback((file: any) => {
    onRemove(file);
  }, [onRemove]);

  const handleClearFiles = useCallback(() => {
    onClear();
  }, [onClear]);

  return (
    <Box sx={{ mb: 3 }}>
      {/* Upload Area */}
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease-in-out',
          '&:hover': !disabled ? {
            borderColor: 'primary.main',
            bgcolor: 'action.hover'
          } : {},
          opacity: disabled ? 0.6 : 1
        }}
      >
        <input {...getInputProps()} />
        
        <CloudArrowUpIcon 
          style={{ 
            width: 48, 
            height: 48, 
            color: isDragActive ? '#1976d2' : '#666',
            marginBottom: 16
          }} 
        />
        
        <Typography variant="h6" sx={{ mb: 1 }}>
          {isDragActive ? 'Drop files here' : 'Drag & drop CSV files here'}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          or click to select files
        </Typography>
        
        <Typography variant="caption" color="text.secondary">
          Maximum 10 files, 10MB each
        </Typography>
      </Box>

      {/* Upload Progress */}
      {uploadProgress.isUploading && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              Uploading {uploadProgress.currentFile}...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {uploadProgress.currentFileIndex + 1} of {uploadProgress.totalFiles}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={uploadProgress.progress} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Selected Files ({files.length})
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearFiles}
              disabled={disabled || uploadProgress.isUploading}
              sx={{ borderRadius: '8px' }}
            >
              Clear All
            </Button>
          </Box>

          <List sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
            {files.map((file, index) => (
              <ListItem
                key={file.id || index}
                sx={{
                  borderBottom: index < files.length - 1 ? 1 : 0,
                  borderColor: 'divider'
                }}
              >
                <DocumentIcon style={{ width: 24, height: 24, marginRight: 12, color: '#666' }} />
                
                <ListItemText
                  primary={file.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip 
                        label={formatFileSize(file.size)} 
                        size="small" 
                        variant="outlined"
                        sx={{ borderRadius: '4px' }}
                      />
                      <Chip 
                        label="CSV" 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                        sx={{ borderRadius: '4px' }}
                      />
                    </Box>
                  }
                />
                
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveFile(file)}
                    disabled={disabled || uploadProgress.isUploading}
                    sx={{ color: 'error.main' }}
                  >
                    <XMarkIcon style={{ width: 20, height: 20 }} />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Upload Instructions */}
      {files.length === 0 && !uploadProgress.isUploading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Supported formats:</strong> CSV files only<br />
            <strong>File size limit:</strong> 10MB per file<br />
            <strong>Maximum files:</strong> 10 files per upload
          </Typography>
        </Alert>
      )}
    </Box>
  );
});

FileUpload.displayName = 'FileUpload';
