import React from 'react';
import { Box, Paper, Typography, Grid } from '@mui/material';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface ProviderMetrics {
  totalCompensation: number;
  incentivePayment: number;
  incentiveChange: number;
  estimatedWRVUs: number;
  wrvuChange: number;
  workSchedule: {
    weeksWorked: number;
    vacation: number;
    cme: number;
    holidays: number;
    regularClinicHours: number;
  };
  patientMetrics: {
    encounters: number;
    newPatients: number;
    patientsPerDay: number;
    avgWRVUPerEncounter: number;
    adjWRVUPerEncounter: number;
    baseSalary: number;
    wrvuConversion: number;
  };
  productivityMetrics: {
    annualClinicDays: number;
    annualClinicalHours: number;
    encountersPerWeek: number;
    annualPatientEncounters: number;
    currentWRVUPerEncounter: number;
    adjustedWRVUPerEncounter: number;
    potentialAdditionalIncentive: number;
    wrvusPerDay: number;
    patientsPerDay: number;
  };
}

export const ProviderAnalytics: React.FC<ProviderMetrics> = ({
  totalCompensation,
  incentivePayment,
  incentiveChange,
  estimatedWRVUs,
  wrvuChange,
  workSchedule,
  patientMetrics,
  productivityMetrics
}) => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3} component="div">
        {/* Key Metrics Section */}
        <Grid item xs={12} component="div">
          <Grid container spacing={2} component="div">
            <Grid item xs={12} md={4} component="div">
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Total Compensation</Typography>
                <Typography variant="h5">{formatCurrency(totalCompensation)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4} component="div">
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Incentive Payment</Typography>
                <Typography variant="h5">
                  {formatCurrency(incentivePayment)}
                  <Typography component="span" color="success.main" sx={{ ml: 1 }}>
                    (+{formatCurrency(incentiveChange)})
                  </Typography>
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4} component="div">
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Estimated Annual wRVUs</Typography>
                <Typography variant="h5">
                  {formatNumber(estimatedWRVUs)}
                  <Typography component="span" color="success.main" sx={{ ml: 1 }}>
                    (+{formatNumber(wrvuChange)})
                  </Typography>
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        {/* Provider Input Data Section */}
        <Grid item xs={12} component="div">
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Provider Input Data</Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>Work Schedule</Typography>
              <Grid container spacing={2} component="div">
                <Grid item xs={6} component="div">
                  <Typography color="text.secondary">Weeks Worked:</Typography>
                  <Typography>{workSchedule.weeksWorked} weeks/year</Typography>
                </Grid>
                <Grid item xs={6} component="div">
                  <Typography color="text.secondary">Vacation:</Typography>
                  <Typography>{workSchedule.vacation} weeks</Typography>
                </Grid>
                <Grid item xs={6} component="div">
                  <Typography color="text.secondary">CME:</Typography>
                  <Typography>{workSchedule.cme} days</Typography>
                </Grid>
                <Grid item xs={6} component="div">
                  <Typography color="text.secondary">Holidays:</Typography>
                  <Typography>{workSchedule.holidays} days</Typography>
                </Grid>
                <Grid item xs={12} component="div">
                  <Typography variant="subtitle2" gutterBottom>Shift Types</Typography>
                  <Typography color="text.secondary">Regular Clinic:</Typography>
                  <Typography>{workSchedule.regularClinicHours} hrs × 6/week</Typography>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>Patient Encounters</Typography>
              <Grid container spacing={2} component="div">
                <Grid item xs={6} component="div">
                  <Typography color="text.secondary">Patients Per Day:</Typography>
                  <Typography>{patientMetrics.patientsPerDay}</Typography>
                </Grid>
                <Grid item xs={6} component="div">
                  <Typography color="text.secondary">Avg wRVU/Encounter:</Typography>
                  <Typography>{formatNumber(patientMetrics.avgWRVUPerEncounter, 2)}</Typography>
                </Grid>
                <Grid item xs={6} component="div">
                  <Typography color="text.secondary">Adj wRVU/Encounter:</Typography>
                  <Typography>{formatNumber(patientMetrics.adjWRVUPerEncounter, 2)}</Typography>
                </Grid>
                <Grid item xs={6} component="div">
                  <Typography color="text.secondary">Base Salary:</Typography>
                  <Typography>{formatCurrency(patientMetrics.baseSalary)}</Typography>
                </Grid>
                <Grid item xs={6} component="div">
                  <Typography color="text.secondary">wRVU Conversion:</Typography>
                  <Typography>{formatNumber(patientMetrics.wrvuConversion, 2)}/wRVU</Typography>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>

        {/* Productivity Metrics Section */}
        <Grid item xs={12} component="div">
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Productivity Metrics</Typography>
            <Grid container spacing={2} component="div">
              <Grid item xs={6} md={3} component="div">
                <Typography color="text.secondary">wRVUs per Day</Typography>
                <Typography variant="h6">{formatNumber(productivityMetrics.wrvusPerDay)}</Typography>
              </Grid>
              <Grid item xs={6} md={3} component="div">
                <Typography color="text.secondary">Patients per Day</Typography>
                <Typography variant="h6">{formatNumber(productivityMetrics.patientsPerDay)}</Typography>
              </Grid>
              <Grid item xs={6} md={3} component="div">
                <Typography color="text.secondary">Total Encounters</Typography>
                <Typography variant="h6">{formatNumber(patientMetrics.encounters)}</Typography>
              </Grid>
              <Grid item xs={6} md={3} component="div">
                <Typography color="text.secondary">New Patients</Typography>
                <Typography variant="h6">{formatNumber(patientMetrics.newPatients)}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProviderAnalytics; 