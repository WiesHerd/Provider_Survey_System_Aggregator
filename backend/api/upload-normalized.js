import { v4 as uuidv4 } from 'uuid';
import csv from 'csv-parser';
import fs from 'fs';
import { normalizeData } from '../utils/dataNormalizer.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set a timeout for the entire upload process
  const uploadTimeout = setTimeout(() => {
    console.error('⏰ Upload timeout - process taking too long');
    res.status(408).json({ error: 'Upload timeout - please try again with a smaller file' });
  }, 300000); // 5 minutes timeout

  try {
    if (!req.file) {
      clearTimeout(uploadTimeout);
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📁 Starting normalized upload: ${req.file.originalname} (${req.file.size} bytes)`);

    const { name, year, type } = req.body;
    const surveyId = uuidv4();
    const uploadDate = new Date().toISOString();
    
    // Parse CSV and detect format
    const results = [];
    const specialties = new Set();
    const providerTypes = new Set();
    const regions = new Set();
    let columns = [];
    let isNormalizedFormat = false;
    
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        if (columns.length === 0) {
          columns = Object.keys(data);
          // Detect if this is normalized format
          isNormalizedFormat = columns.some(col => 
            ['p25', 'p50', 'p75', 'p90', 'variable'].includes(col.toLowerCase())
          );
          console.log(`📊 Detected format: ${isNormalizedFormat ? 'Normalized' : 'Wide'}`);
        }
        results.push(data);
        
        // Extract filter options
        if (data.specialty || data.Specialty) specialties.add(data.specialty || data.Specialty);
        if (data.provider_type || data['Provider Type']) providerTypes.add(data.provider_type || data['Provider Type']);
        if (data.geographic_region || data.Region) regions.add(data.geographic_region || data.Region);
      })
      .on('end', async () => {
        clearTimeout(uploadTimeout);
        
        try {
          // Get database connection
          const { initDatabase } = await import('../config/database.js');
          const db = await initDatabase();
          
          // Insert survey metadata
          const metadata = JSON.stringify({
            format: isNormalizedFormat ? 'normalized' : 'wide',
            specialties: Array.from(specialties),
            providerTypes: Array.from(providerTypes),
            regions: Array.from(regions),
            columns
          });

          // Insert survey record
          await db.run(
            'INSERT INTO surveys (id, name, year, type, uploadDate, rowCount, specialtyCount, dataPoints, colorAccent, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [surveyId, name, year, type, uploadDate, results.length, specialties.size, results.length, '#6366F1', metadata]
          );

          if (isNormalizedFormat) {
            // Process normalized format data
            console.log('📊 Processing normalized format data...');
            
            const stmt = db.prepare(`
              INSERT INTO survey_data_normalized (
                id, surveyId, specialty, providerType, geographicRegion, 
                variable, n_orgs, n_incumbents, p25, p50, p75, p90, originalData
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            let normalizedRowCount = 0;
            
            results.forEach((row) => {
              try {
                // Validate required columns for normalized format
                const requiredColumns = ['specialty', 'provider_type', 'geographic_region', 'variable', 'n_orgs', 'n_incumbents', 'p25', 'p50', 'p75', 'p90'];
                const missingColumns = requiredColumns.filter(col => !row[col]);
                
                if (missingColumns.length > 0) {
                  console.warn(`⚠️ Row missing required columns: ${missingColumns.join(', ')}`);
                  return; // Skip this row
                }

                const dataId = uuidv4();
                const params = [
                  dataId,
                  surveyId,
                  row.specialty || '',
                  row.provider_type || '',
                  row.geographic_region || '',
                  row.variable || '',
                  parseInt(row.n_orgs) || 0,
                  parseInt(row.n_incumbents) || 0,
                  parseFloat(row.p25) || 0,
                  parseFloat(row.p50) || 0,
                  parseFloat(row.p75) || 0,
                  parseFloat(row.p90) || 0,
                  JSON.stringify(row)
                ];

                stmt.run(params);
                normalizedRowCount++;
              } catch (rowError) {
                console.error('❌ Error processing normalized row:', rowError);
              }
            });

            stmt.finalize((err) => {
              if (err) {
                console.error('Error finalizing normalized data insert:', err);
                clearTimeout(uploadTimeout);
                return res.status(500).json({ error: 'Normalized data insertion error' });
              }

              // Clean up uploaded file
              fs.unlinkSync(req.file.path);

              clearTimeout(uploadTimeout);
              res.json({
                success: true,
                surveyId,
                format: 'normalized',
                message: 'Normalized survey uploaded successfully',
                stats: {
                  originalRows: results.length,
                  normalizedRows: normalizedRowCount,
                  specialties: specialties.size,
                  dataPoints: normalizedRowCount
                }
              });
            });

          } else {
            // Process wide format data - normalize it
            console.log('📊 Processing wide format data and normalizing...');
            
            const normalizedData = normalizeData(results);
            console.log(`📊 Normalized ${results.length} wide rows into ${normalizedData.length} normalized rows`);

            const stmt = db.prepare(`
              INSERT INTO survey_data_normalized (
                id, surveyId, specialty, providerType, geographicRegion, 
                variable, n_orgs, n_incumbents, p25, p50, p75, p90, originalData
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            normalizedData.forEach((row) => {
              const dataId = uuidv4();
              const params = [
                dataId,
                surveyId,
                row.specialty || '',
                row.providerType || '',
                row.geographicRegion || '',
                row.variable || '',
                row.n_orgs || 0,
                row.n_incumbents || 0,
                row.p25 || 0,
                row.p50 || 0,
                row.p75 || 0,
                row.p90 || 0,
                JSON.stringify(row.originalData || {})
              ];

              stmt.run(params);
            });

            stmt.finalize((err) => {
              if (err) {
                console.error('Error finalizing wide-to-normalized data insert:', err);
                clearTimeout(uploadTimeout);
                return res.status(500).json({ error: 'Data normalization error' });
              }

              // Clean up uploaded file
              fs.unlinkSync(req.file.path);

              clearTimeout(uploadTimeout);
              res.json({
                success: true,
                surveyId,
                format: 'wide_normalized',
                message: 'Wide format survey normalized and uploaded successfully',
                stats: {
                  originalRows: results.length,
                  normalizedRows: normalizedData.length,
                  specialties: specialties.size,
                  dataPoints: normalizedData.length
                }
              });
            });
          }

        } catch (error) {
          console.error('Error processing survey:', error);
          clearTimeout(uploadTimeout);
          res.status(500).json({ error: 'Processing error', message: error.message });
        }
      });
  } catch (error) {
    console.error('Upload error:', error);
    clearTimeout(uploadTimeout);
    res.status(500).json({ error: 'Upload failed', message: error.message });
  }
}
