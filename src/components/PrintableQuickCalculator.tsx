import React from 'react';
import {
  Box,
  Typography,
  useTheme,
} from '@mui/material';

interface PrintableQuickCalculatorProps {
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

export const PrintableQuickCalculator: React.FC<PrintableQuickCalculatorProps> = ({ data }) => {
  return (
    <Box sx={{
      p: 4,
      '@media print': {
        padding: '0.5in',
        backgroundColor: 'white',
      }
    }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Provider Analytics Dashboard
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          Quick Calculator wRVU Adjustments
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Generated on {new Date().toLocaleDateString()}
        </Typography>
      </Box>

      {/* Top Metrics */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 2,
        mb: 3
      }}>
        <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Total Compensation</Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h6">{formatCurrency(data.totalCompensation)}</Typography>
          </Box>
        </Box>

        <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Incentive Payment</Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h6">{formatCurrency(data.incentivePayment)}</Typography>
            <Typography variant="caption" color="success.main">+{formatCurrency(data.incentiveIncrease)}</Typography>
          </Box>
        </Box>

        <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Estimated Annual wRVUs</Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h6">{formatNumber(data.estimatedWRVUs)}</Typography>
            <Typography variant="caption" color="success.main">+{formatNumber(data.wrvuIncrease)}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Two Column Layout */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 3
      }}>
        {/* Provider Input Data */}
        <Box sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Provider Input Data</Typography>
          
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Work Schedule</Typography>
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Weeks Worked:</Typography>
              <Typography>{data.workSchedule.weeksWorked} weeks/year</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Vacation:</Typography>
              <Typography>{data.workSchedule.vacation} weeks</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>CME:</Typography>
              <Typography>{data.workSchedule.cme} days</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Holidays:</Typography>
              <Typography>{data.workSchedule.holidays} days</Typography>
            </Box>
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>Shift Types</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography>Regular Clinic:</Typography>
            <Typography>{data.workSchedule.hoursPerWeek} hrs × 6/week</Typography>
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>Patient Encounters</Typography>
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Patients Per Day:</Typography>
              <Typography>{data.patientMetrics.patientsPerDay}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Avg wRVU/Encounter:</Typography>
              <Typography>{formatNumber(data.patientMetrics.avgWRVUPerEncounter, 2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Adj wRVU/Encounter:</Typography>
              <Typography>{formatNumber(data.patientMetrics.adjWRVUPerEncounter, 2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Base Salary:</Typography>
              <Typography>{formatCurrency(data.patientMetrics.baseSalary)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>wRVU Conversion:</Typography>
              <Typography>{formatNumber(data.patientMetrics.wrvuConversion, 2)}/wRVU</Typography>
            </Box>
          </Box>
        </Box>

        {/* Productivity Metrics */}
        <Box sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Productivity Metrics</Typography>

          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Annual Clinic Days</Typography>
              <Typography variant="h6">{data.productivity.annualClinicDays}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Annual Clinical Hours</Typography>
              <Typography variant="h6">{formatNumber(data.productivity.annualClinicalHours)}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Encounters per Week</Typography>
              <Typography variant="h6">{data.productivity.encountersPerWeek}</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography>Annual Patient Encounters</Typography>
              <Typography variant="h6">{formatNumber(data.productivity.annualPatientEncounters)}</Typography>
            </Box>
          </Box>

          <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>Projected Increase with Adjusted wRVU</Typography>
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Current wRVU per Encounter:</Typography>
              <Typography>{formatNumber(data.productivity.currentWRVUPerEncounter, 2)} = {formatNumber(data.estimatedWRVUs)} wRVUs</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Adjusted wRVU per Encounter:</Typography>
              <Typography>{formatNumber(data.productivity.adjustedWRVUPerEncounter, 2)} = {formatNumber(data.estimatedWRVUs + data.wrvuIncrease)} wRVUs</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Potential Additional Incentive:</Typography>
              <Typography color="success.main">+{formatCurrency(data.productivity.potentialAdditionalIncentive)}</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Typography variant="caption" color="text.secondary" sx={{ 
        display: 'block', 
        textAlign: 'center', 
        mt: 3,
        fontStyle: 'italic'
      }}>
        *Green values indicate potential increases with adjusted wRVU per encounter.
      </Typography>
    </Box>
  );
}; 