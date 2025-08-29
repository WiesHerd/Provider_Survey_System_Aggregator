/**
 * API Endpoint: Get survey data in normalized format
 * 
 * Returns survey data in the new normalized structure:
 * - Each row represents one variable (TCC, wRVU, CF) for a specific specialty/provider/region combination
 * - Includes proper n_orgs and n_incumbents for each variable
 * - Supports filtering and pagination
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database setup
const dbPath = path.join(__dirname, '../../../../survey_data.db');
const db = new sqlite3.Database(dbPath);

/**
 * Get normalized survey data with filtering and pagination
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { surveyId } = req.query;
    
    if (!surveyId) {
      return res.status(400).json({ error: 'Survey ID is required' });
    }

    // Parse query parameters
    const {
      page = 1,
      limit = 100,
      specialty,
      providerType,
      geographicRegion,
      variable,
      sortBy = 'specialty',
      sortOrder = 'ASC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitValue = parseInt(limit);

    // Build WHERE clause for filtering
    const whereConditions = ['surveyId = ?'];
    const params = [surveyId];

    if (specialty) {
      whereConditions.push('specialty LIKE ?');
      params.push(`%${specialty}%`);
    }

    if (providerType) {
      whereConditions.push('providerType LIKE ?');
      params.push(`%${providerType}%`);
    }

    if (geographicRegion) {
      whereConditions.push('geographicRegion LIKE ?');
      params.push(`%${geographicRegion}%`);
    }

    if (variable) {
      whereConditions.push('variable = ?');
      params.push(variable);
    }

    const whereClause = whereConditions.join(' AND ');

    // Validate sort parameters
    const allowedSortFields = ['specialty', 'providerType', 'geographicRegion', 'variable', 'p50', 'n_orgs', 'n_incumbents'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'specialty';
    const sortDirection = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM survey_data_normalized
      WHERE ${whereClause}
    `;

    const totalCount = await new Promise((resolve, reject) => {
      db.get(countQuery, params, (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.total : 0);
      });
    });

    // Get paginated data
    const dataQuery = `
      SELECT 
        id,
        surveyId,
        specialty,
        providerType,
        geographicRegion,
        variable,
        n_orgs,
        n_incumbents,
        p25,
        p50,
        p75,
        p90,
        created_at
      FROM survey_data_normalized
      WHERE ${whereClause}
      ORDER BY ${sortField} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    const data = await new Promise((resolve, reject) => {
      db.all(dataQuery, [...params, limitValue, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Get unique values for filters
    const filterQuery = `
      SELECT 
        COUNT(DISTINCT specialty) as specialtyCount,
        COUNT(DISTINCT providerType) as providerTypeCount,
        COUNT(DISTINCT geographicRegion) as regionCount,
        COUNT(DISTINCT variable) as variableCount
      FROM survey_data_normalized
      WHERE surveyId = ?
    `;

    const filterStats = await new Promise((resolve, reject) => {
      db.get(filterQuery, [surveyId], (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });

    // Get unique values for dropdowns
    const uniqueValuesQuery = `
      SELECT 
        GROUP_CONCAT(DISTINCT specialty) as specialties,
        GROUP_CONCAT(DISTINCT providerType) as providerTypes,
        GROUP_CONCAT(DISTINCT geographicRegion) as regions,
        GROUP_CONCAT(DISTINCT variable) as variables
      FROM survey_data_normalized
      WHERE surveyId = ?
    `;

    const uniqueValues = await new Promise((resolve, reject) => {
      db.get(uniqueValuesQuery, [surveyId], (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });

    // Parse comma-separated values
    const parseCommaSeparated = (str) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];

    const response = {
      data,
      pagination: {
        page: parseInt(page),
        limit: limitValue,
        total: totalCount,
        pages: Math.ceil(totalCount / limitValue),
        hasNext: offset + limitValue < totalCount,
        hasPrev: page > 1
      },
      filters: {
        availableSpecialties: parseCommaSeparated(uniqueValues.specialties),
        availableProviderTypes: parseCommaSeparated(uniqueValues.providerTypes),
        availableRegions: parseCommaSeparated(uniqueValues.regions),
        availableVariables: parseCommaSeparated(uniqueValues.variables),
        stats: filterStats
      },
      metadata: {
        surveyId,
        totalRows: totalCount,
        variables: ['Total Cash Compensation', 'Work RVUs', 'Conversion Factor'],
        structure: 'normalized'
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error fetching normalized survey data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch survey data',
      message: error.message 
    });
  }
}
