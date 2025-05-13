import React, { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  DialogContent,
  Box,
} from '@mui/material';
import { FairMarketValuePrintable } from './FairMarketValuePrintable';

type CompareType = 'TCC' | 'wRVUs' | 'CFs';

interface CompensationComponent {
  id: string;
  name: string;
  value: string;
  label: string;
}

interface MarketData {
  tcc: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  wrvu: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  cf: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

interface PrintDialogProps {
  open: boolean;
  onClose: () => void;
  data: {
    filters: {
      specialty: string;
      providerType: string;
      region: string;
      compareType: CompareType;
    };
    compensation: {
      total: number;
      components: CompensationComponent[];
      marketPercentile: number;
    };
    productivity: {
      wrvus: number;
      wrvuPercentile: number;
    };
    marketData: MarketData | null;
    conversionFactor: number;
  };
}

export const PrintDialog: React.FC<PrintDialogProps> = ({ open, onClose, data }) => {
  const componentRef = useRef<HTMLDivElement>(null);

  // Add print styles to the document when the dialog opens
  useEffect(() => {
    if (open) {
      // Create a style element for print styles
      const style = document.createElement('style');
      style.setAttribute('type', 'text/css');
      style.setAttribute('id', 'print-styles');
      style.textContent = `
        @media print {
          body * {
            visibility: hidden;
          margin: 0;
            padding: 0;
          }
          .printable-report, .printable-report * {
            visibility: visible;
          }
          .printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
          }
          @page {
            size: letter;
            margin: 0.5in;
          }
        }
      `;
      document.head.appendChild(style);

      // Clean up when the dialog closes
      return () => {
        const styleElement = document.getElementById('print-styles');
        if (styleElement) {
          styleElement.remove();
        }
      };
    }
  }, [open]);

  const handlePrint = () => {
    if (componentRef.current) {
      window.print();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle>Print Fair Market Value Analysis</DialogTitle>
      <DialogContent sx={{ overflow: 'auto' }}>
        <Box ref={componentRef}>
          <FairMarketValuePrintable {...data} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handlePrint}
          variant="contained" 
          color="primary"
        >
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 