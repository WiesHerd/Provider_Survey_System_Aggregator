/**
 * Data Normalization Utility
 * Converts wide-format survey data to normalized long format
 * 
 * Wide format: specialty, provider_type, region, n_orgs, n_incumbents, tcc_p25, tcc_p50, tcc_p75, tcc_p90, wrvu_p25, wrvu_p50, wrvu_p75, wrvu_p90, cf_p25, cf_p50, cf_p75, cf_p90
 * Normalized format: specialty, provider_type, geographic_region, variable, n_orgs, n_incumbents, p25, p50, p75, p90
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Transforms a single row from wide format to normalized format
 * @param {Object} row - The original wide-format row
 * @param {string} surveyId - The survey ID
 * @returns {Array} Array of 3 normalized rows (TCC, wRVU, CF)
 */
function normalizeRow(row, surveyId) {
  const normalizedRows = [];
  
  // Extract common fields
  const specialty = row.specialty || row.Specialty || '';
  const providerType = row.provider_type || row['Provider Type'] || '';
  const geographicRegion = row.geographic_region || row.Region || '';
  const n_orgs = parseInt(row.n_orgs) || 0;
  const n_incumbents = parseInt(row.n_incumbents) || 0;
  
  // Handle different column naming conventions
  const tcc_p25 = parseFloat(row.tcc_p25) || parseFloat(row.TCC_p25) || 0;
  const tcc_p50 = parseFloat(row.tcc_p50) || parseFloat(row.TCC_p50) || 0;
  const tcc_p75 = parseFloat(row.tcc_p75) || parseFloat(row.TCC_p75) || 0;
  const tcc_p90 = parseFloat(row.tcc_p90) || parseFloat(row.TCC_p90) || 0;
  
  const wrvu_p25 = parseFloat(row.wrvu_p25) || parseFloat(row.wRVU_p25) || 0;
  const wrvu_p50 = parseFloat(row.wrvu_p50) || parseFloat(row.wRVU_p50) || 0;
  const wrvu_p75 = parseFloat(row.wrvu_p75) || parseFloat(row.wRVU_p75) || 0;
  const wrvu_p90 = parseFloat(row.wrvu_p90) || parseFloat(row.wRVU_p90) || 0;
  
  const cf_p25 = parseFloat(row.cf_p25) || parseFloat(row.CF_p25) || 0;
  const cf_p50 = parseFloat(row.cf_p50) || parseFloat(row.CF_p50) || 0;
  const cf_p75 = parseFloat(row.cf_p75) || parseFloat(row.CF_p75) || 0;
  const cf_p90 = parseFloat(row.cf_p90) || parseFloat(row.CF_p90) || 0;
  
  // Create TCC row
  if (tcc_p50 > 0) {
    normalizedRows.push({
      id: uuidv4(),
      surveyId,
      specialty,
      providerType,
      geographicRegion,
      variable: 'Total Cash Compensation',
      n_orgs,
      n_incumbents,
      p25: tcc_p25,
      p50: tcc_p50,
      p75: tcc_p75,
      p90: tcc_p90,
      originalData: JSON.stringify(row)
    });
  }
  
  // Create wRVU row
  if (wrvu_p50 > 0) {
    normalizedRows.push({
      id: uuidv4(),
      surveyId,
      specialty,
      providerType,
      geographicRegion,
      variable: 'Work RVUs',
      n_orgs,
      n_incumbents,
      p25: wrvu_p25,
      p50: wrvu_p50,
      p75: wrvu_p75,
      p90: wrvu_p90,
      originalData: JSON.stringify(row)
    });
  }
  
  // Create CF row
  if (cf_p50 > 0) {
    normalizedRows.push({
      id: uuidv4(),
      surveyId,
      specialty,
      providerType,
      geographicRegion,
      variable: 'Conversion Factor',
      n_orgs,
      n_incumbents,
      p25: cf_p25,
      p50: cf_p50,
      p75: cf_p75,
      p90: cf_p90,
      originalData: JSON.stringify(row)
    });
  }
  
  return normalizedRows;
}

/**
 * Transforms an array of wide-format rows to normalized format
 * @param {Array} rows - Array of wide-format rows
 * @param {string} surveyId - The survey ID
 * @returns {Array} Array of normalized rows
 */
function normalizeData(rows, surveyId) {
  const normalizedData = [];
  
  for (const row of rows) {
    const normalizedRows = normalizeRow(row, surveyId);
    normalizedData.push(...normalizedRows);
  }
  
  return normalizedData;
}

/**
 * Validates that a row has the required fields for normalization
 * @param {Object} row - The row to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateRow(row) {
  const hasSpecialty = row.specialty || row.Specialty;
  const hasProviderType = row.provider_type || row['Provider Type'];
  const hasRegion = row.geographic_region || row.Region;
  
  // Check if at least one metric has data
  const hasTCC = parseFloat(row.tcc_p50) || parseFloat(row.TCC_p50);
  const hasWRVU = parseFloat(row.wrvu_p50) || parseFloat(row.wRVU_p50);
  const hasCF = parseFloat(row.cf_p50) || parseFloat(row.CF_p50);
  
  return hasSpecialty && hasProviderType && hasRegion && (hasTCC || hasWRVU || hasCF);
}

/**
 * Gets statistics about the normalization process
 * @param {Array} originalRows - Original wide-format rows
 * @param {Array} normalizedRows - Normalized rows
 * @returns {Object} Statistics object
 */
function getNormalizationStats(originalRows, normalizedRows) {
  const totalOriginalRows = originalRows.length;
  const totalNormalizedRows = normalizedRows.length;
  const avgRowsPerOriginal = totalNormalizedRows / totalOriginalRows;
  
  const variableCounts = {};
  normalizedRows.forEach(row => {
    variableCounts[row.variable] = (variableCounts[row.variable] || 0) + 1;
  });
  
  return {
    totalOriginalRows,
    totalNormalizedRows,
    avgRowsPerOriginal,
    variableCounts,
    expansionFactor: avgRowsPerOriginal
  };
}

module.exports = {
  normalizeRow,
  normalizeData,
  validateRow,
  getNormalizationStats
};
