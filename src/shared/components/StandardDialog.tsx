import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import type { DialogProps } from '@mui/material/Dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface StandardDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidth?: DialogProps['maxWidth'];
  fullWidth?: boolean;
  disableBackdropClose?: boolean;
  contentClassName?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * StandardDialog
 * - Single source of truth for Dialog chrome (header/content/actions)
 * - Matches the app's "Google-style" dialogs (spacing, borders, close affordance)
 *
 * NOTE: This standardizes the shell only. Content remains feature-owned.
 */
export const StandardDialog: React.FC<StandardDialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'md',
  fullWidth = true,
  disableBackdropClose = false,
  contentClassName,
  actions,
  children,
}) => {
  return (
    <Dialog
      open={open}
      onClose={(_event: object, reason: 'backdropClick' | 'escapeKeyDown') => {
        if (disableBackdropClose && reason === 'backdropClick') return;
        onClose();
      }}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          {icon ? (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                bgcolor: 'grey.50',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {icon}
            </Box>
          ) : null}

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }} noWrap>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
          aria-label="Close dialog"
          size="small"
          sx={{
            borderRadius: '8px',
            color: 'text.secondary',
            '&:hover': { backgroundColor: '#f3f4f6' },
          }}
        >
          <XMarkIcon className="h-5 w-5" />
        </IconButton>
      </DialogTitle>

      <DialogContent className={contentClassName ?? 'p-6'}>
        {children}
      </DialogContent>

      {actions ? (
        <DialogActions sx={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', gap: 1.5 }}>
          {actions}
        </DialogActions>
      ) : null}
    </Dialog>
  );
};

