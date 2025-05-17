import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  useTheme,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import type { Theme } from '@mui/material/styles';
import type { SxProps } from '@mui/system';

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

interface QuickCalculatorProps {
  data: {
    totalCompensation: number;
    incentivePayment: number;
    incentiveIncrease: number;
    estimatedWRVUs: number;
    wrvuIncrease: number;
    workSchedule: {
      weeksWorked: number;
      vacation: number;
      cme: number;
      holidays: number;
      shiftType: string;
      hoursPerWeek: number;
    };
    productivity: {
      annualClinicDays: number;
      annualClinicalHours: number;
      encountersPerWeek: number;
      annualPatientEncounters: number;
      currentWRVUPerEncounter: number;
      adjustedWRVUPerEncounter: number;
      potentialAdditionalIncentive: number;
    };
    patientMetrics: {
      patientsPerDay: number;
      avgWRVUPerEncounter: number;
      adjWRVUPerEncounter: number;
      baseSalary: number;
      wrvuConversion: number;
    };
  };
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const QuickCalculator: React.FC<QuickCalculatorProps> = ({ data }) => {
  const theme = useTheme();
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedProviderType, setSelectedProviderType] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [incentivePayment, setIncentivePayment] = useState<number>(0);
  const [estimatedWRVUs, setEstimatedWRVUs] = useState<number>(0);

  const totalCompensation = baseSalary + incentivePayment;

  const dataForPrintDialog = {
    filters: {
      specialty: selectedSpecialty,
      providerType: selectedProviderType,
      region: selectedRegion,
      compareType: 'TCC' as CompareType
    },
    compensation: {
      total: totalCompensation,
      components: [
        {
          id: 'base-salary',
          name: 'baseSalary',
          value: baseSalary.toString(),
          label: 'Base Salary'
        },
        {
          id: 'incentive',
          name: 'incentive',
          value: incentivePayment.toString(),
          label: 'Incentive Payment'
        }
      ],
      marketPercentile: 0 // This would need to be calculated based on market data
    },
    productivity: {
      wrvus: estimatedWRVUs,
      wrvuPercentile: 0 // This would need to be calculated based on market data
    },
    marketData: null, // This would need to be populated with actual market data
    conversionFactor: totalCompensation / estimatedWRVUs
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Print Button */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography variant="h5">Quick Calculator</Typography>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => setPrintDialogOpen(true)}
        >
          Print Report
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quick Calculator
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Specialty</InputLabel>
              <Select
                value={selectedSpecialty}
                label="Specialty"
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                <MenuItem value="cardiology">Cardiology</MenuItem>
                <MenuItem value="orthopedics">Orthopedics</MenuItem>
                <MenuItem value="pediatrics">Pediatrics</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Provider Type</InputLabel>
              <Select
                value={selectedProviderType}
                label="Provider Type"
                onChange={(e) => setSelectedProviderType(e.target.value)}
              >
                <MenuItem value="physician">Physician</MenuItem>
                <MenuItem value="nurse">Nurse Practitioner</MenuItem>
                <MenuItem value="pa">Physician Assistant</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Region</InputLabel>
              <Select
                value={selectedRegion}
                label="Region"
                onChange={(e) => setSelectedRegion(e.target.value)}
              >
                <MenuItem value="northeast">Northeast</MenuItem>
                <MenuItem value="southeast">Southeast</MenuItem>
                <MenuItem value="midwest">Midwest</MenuItem>
                <MenuItem value="west">West</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Base Salary"
              type="number"
              value={baseSalary}
              onChange={(e) => setBaseSalary(Number(e.target.value))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Incentive Payment"
              type="number"
              value={incentivePayment}
              onChange={(e) => setIncentivePayment(Number(e.target.value))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Estimated wRVUs"
              type="number"
              value={estimatedWRVUs}
              onChange={(e) => setEstimatedWRVUs(Number(e.target.value))}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}; 