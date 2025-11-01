/**
 * Generate sample CSV files dynamically based on user selections
 * Always generates normalized/LONG format - content varies by provider type:
 * - CALL: Call Pay samples with Daily Rate On-Call Compensation
 * - PHYSICIAN/APP: Standard compensation samples with TCC, Work RVUs, CFs
 */

/**
 * Generate sample CSV content (always normalized/LONG format)
 * Content varies based on provider type:
 * - CALL: Daily Rate On-Call Compensation variable
 * - PHYSICIAN/APP: TCC, Work RVUs, CFs variables
 */
export const generateSampleCSV = (
  providerType?: 'PHYSICIAN' | 'APP' | 'CALL'
): string => {
  return generateNormalizedFormatCSV(providerType);
};

/**
 * Generate normalized format CSV (LONG format)
 */
const generateNormalizedFormatCSV = (providerType?: string): string => {
  // Standard column order: specialty, provider_type, geographic_region, variable, n_orgs, n_incumbents, percentiles
  const headers = ['specialty', 'provider_type', 'geographic_region', 'variable', 'n_orgs', 'n_incumbents', 'p25', 'p50', 'p75', 'p90'];
  
  // Generate sample rows based on provider type
  const sampleRows: string[][] = [];
  
  if (providerType === 'CALL') {
    // Call Pay samples - provider_type right after specialty
    sampleRows.push([
      'Emergency Medicine',
      'Emergency Medicine Physician',
      'National',
      'Daily Rate On-Call Compensation',
      '15',
      '42',
      '850',
      '1050',
      '1250',
      '1500'
    ]);
    sampleRows.push([
      'Radiology',
      'Radiology Physician',
      'National',
      'Daily Rate On-Call Compensation',
      '12',
      '38',
      '900',
      '1100',
      '1350',
      '1650'
    ]);
    sampleRows.push([
      'Cardiology',
      'Cardiology Physician',
      'National',
      'Daily Rate On-Call Compensation',
      '18',
      '55',
      '950',
      '1150',
      '1400',
      '1700'
    ]);
  } else {
    // Standard compensation samples - provider_type right after specialty
    sampleRows.push([
      'Cardiology',
      'Staff Physician',
      'National',
      'TCC',
      '25',
      '68',
      '425000',
      '485000',
      '550000',
      '625000'
    ]);
    sampleRows.push([
      'Cardiology',
      'Staff Physician',
      'National',
      'Work RVUs',
      '25',
      '68',
      '8500',
      '9500',
      '10500',
      '11800'
    ]);
    sampleRows.push([
      'Cardiology',
      'Staff Physician',
      'National',
      'CFs',
      '25',
      '68',
      '48.50',
      '51.05',
      '53.80',
      '56.95'
    ]);
    sampleRows.push([
      'Emergency Medicine',
      'Staff Physician',
      'National',
      'TCC',
      '20',
      '52',
      '385000',
      '435000',
      '490000',
      '560000'
    ]);
    sampleRows.push([
      'Emergency Medicine',
      'Staff Physician',
      'National',
      'Work RVUs',
      '20',
      '52',
      '7200',
      '8100',
      '9200',
      '10500'
    ]);
  }
  
  // Build CSV
  const csvLines = [
    headers.join(','),
    ...sampleRows.map(row => row.join(','))
  ];
  
  return csvLines.join('\n');
};


/**
 * Download generated sample CSV (always normalized/LONG format)
 * Auto-detects content based on provider type:
 * - CALL: Generates Call Pay sample with Daily Rate On-Call Compensation
 * - PHYSICIAN/APP: Generates standard compensation sample with TCC, Work RVUs, CFs
 */
export const downloadGeneratedSample = (
  providerType?: 'PHYSICIAN' | 'APP' | 'CALL',
  surveyType?: string
) => {
  const csvContent = generateSampleCSV(providerType);
  
  // Create filename based on selections
  const providerName = providerType?.toLowerCase() || 'physician';
  const surveyName = surveyType?.toLowerCase().replace(/\s+/g, '-').slice(0, 20) || 'sample';
  
  const filename = `sample-${providerName}-normalized-${surveyName}.csv`;
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  
  console.log(`✅ Generated and downloaded ${filename}`);
};

