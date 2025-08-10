const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sql = require('mssql');
const dotenv = require('dotenv');

// Load environment (azure creds live in env.local by convention)
dotenv.config({ path: path.join(__dirname, 'env.local') });

// Optional Azure SQL helpers
let getConnection, initializeDatabase;
let azureEnabled = false;
try {
  ({ getConnection, initializeDatabase } = require('./config/database'));
  azureEnabled = process.env.ENABLE_AZURE_SQL === 'true' && 
                 process.env.AZURE_SQL_SERVER && 
                 process.env.AZURE_SQL_DATABASE && 
                 process.env.AZURE_SQL_USER && 
                 process.env.AZURE_SQL_PASSWORD;
  
  if (azureEnabled) {
    console.log('🔗 Azure SQL enabled - will attempt dual-write');
  } else {
    console.log('📝 Azure SQL disabled - using SQLite only');
  }
} catch (error) {
  console.log('⚠️ Azure SQL configuration not available - using SQLite only');
  azureEnabled = false;
}

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Database setup (SQLite primary for local dev; optional Azure dual-write when enabled)
const dbPath = path.join(__dirname, 'survey_data.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Surveys table
  db.run(`CREATE TABLE IF NOT EXISTS surveys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    year INTEGER,
    type TEXT,
    uploadDate TEXT,
    rowCount INTEGER,
    specialtyCount INTEGER,
    dataPoints INTEGER,
    colorAccent TEXT,
    metadata TEXT
  )`);

  // Ensure 'metadata' column exists if DB was created before this field was added
  db.run('ALTER TABLE surveys ADD COLUMN metadata TEXT', (err) => {
    // Ignore error if column already exists
  });

  // Survey data table
  db.run(`CREATE TABLE IF NOT EXISTS survey_data (
    id TEXT PRIMARY KEY,
    surveyId TEXT,
    specialty TEXT,
    providerType TEXT,
    region TEXT,
    tcc REAL,
    cf REAL,
    wrvu REAL,
    count INTEGER,
    data TEXT, -- JSON blob of the original row with ALL columns
    FOREIGN KEY (surveyId) REFERENCES surveys (id)
  )`);

  // Try to add missing 'data' column if upgrading from older schema
  db.run('ALTER TABLE survey_data ADD COLUMN data TEXT', (err) => {
    // Ignore error if column already exists
  });

  // Specialty mappings table
  db.run(`CREATE TABLE IF NOT EXISTS specialty_mappings (
    id TEXT PRIMARY KEY,
    sourceSpecialty TEXT,
    mappedSpecialty TEXT,
    createdDate TEXT
  )`);

  // New normalized mappings schema (v2)
  db.run(`CREATE TABLE IF NOT EXISTS specialty_mappings_v2 (
    id TEXT PRIMARY KEY,
    standardizedName TEXT NOT NULL,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS specialty_mapping_sources_v2 (
    id TEXT PRIMARY KEY,
    mappingId TEXT NOT NULL,
    specialty TEXT,
    originalName TEXT,
    surveySource TEXT,
    createdAt TEXT,
    FOREIGN KEY (mappingId) REFERENCES specialty_mappings_v2 (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS column_mappings_v2 (
    id TEXT PRIMARY KEY,
    standardizedName TEXT NOT NULL,
    createdAt TEXT,
    updatedAt TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS column_mapping_sources_v2 (
    id TEXT PRIMARY KEY,
    mappingId TEXT NOT NULL,
    name TEXT,
    surveySource TEXT,
    dataType TEXT,
    createdAt TEXT,
    FOREIGN KEY (mappingId) REFERENCES column_mappings_v2 (id)
  )`);
});

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), azure: process.env.ENABLE_AZURE_SQL === 'true' });
});

// Upload survey
app.post('/api/upload', upload.single('file'), async (req, res) => {
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

    console.log(`📁 Starting upload: ${req.file.originalname} (${req.file.size} bytes)`);

    const { name, year, type } = req.body;
    const surveyId = uuidv4();
    const uploadDate = new Date().toISOString();
    
    // Parse CSV and extract data
    const results = [];
    const specialties = new Set();
    const providerTypes = new Set();
    const regions = new Set();
    let columns = [];
    
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        if (columns.length === 0) {
          columns = Object.keys(data);
        }
        results.push(data);
        // Handle different possible column name variations
        if (data.specialty || data.Specialty) specialties.add(data.specialty || data.Specialty);
        if (data.provider_type || data['Provider Type']) providerTypes.add(data.provider_type || data['Provider Type']);
        if (data.geographic_region || data.Region) regions.add(data.geographic_region || data.Region);
      })
      .on('end', async () => {
        clearTimeout(uploadTimeout); // Clear timeout on successful end
        try {
          // Insert survey metadata
          const metadata = JSON.stringify({
            specialties: Array.from(specialties),
            providerTypes: Array.from(providerTypes),
            regions: Array.from(regions),
            columns
          });

          // Optional: write to Azure SQL if enabled
          if (process.env.ENABLE_AZURE_SQL === 'true' && getConnection) {
            try {
              if (initializeDatabase) {
                await initializeDatabase();
              }
              const pool = await getConnection();
              // Insert survey into Azure
              await pool.request()
                .input('id', sql.NVarChar, surveyId)
                .input('name', sql.NVarChar, name)
                .input('year', sql.Int, parseInt(year))
                .input('type', sql.NVarChar, type)
                .input('uploadDate', sql.NVarChar, uploadDate)
                .input('rowCount', sql.Int, results.length)
                .input('specialtyCount', sql.Int, specialties.size)
                .input('dataPoints', sql.Int, results.length)
                .input('colorAccent', sql.NVarChar, '#6366F1')
                .input('metadata', sql.NVarChar, metadata)
                .query(`
                  INSERT INTO surveys (id, name, year, type, uploadDate, row_count, specialty_count, data_points, colorAccent, metadata)
                  VALUES (@id, @name, @year, @type, @uploadDate, @rowCount, @specialtyCount, @dataPoints, @colorAccent, @metadata)
                `);

              // Batch insert for survey_data rows (much faster than individual inserts)
              const batchSize = 100;
              const batches = [];
              
              for (let i = 0; i < results.length; i += batchSize) {
                batches.push(results.slice(i, i + batchSize));
              }

              console.log(`📊 Processing ${results.length} rows in ${batches.length} batches...`);

              for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} rows)`);
                
                try {
                  const values = batch.map((row, index) => {
                    const dataId = uuidv4();
                    const specialty = row.specialty || row.Specialty || '';
                    const providerType = row.provider_type || row['Provider Type'] || '';
                    const region = row.geographic_region || row.Region || '';
                    const tcc = Number.parseFloat(row.tcc_p50) || Number.parseFloat(row.TCC) || 0;
                    const cf = Number.parseFloat(row.cf_p50) || Number.parseFloat(row.CF) || 0;
                    const wrvu = Number.parseFloat(row.wrvu_p50) || Number.parseFloat(row.wRVU) || 0;
                    const count = Number.parseInt(row.n_incumbents) || Number.parseInt(row.Count) || 0;
                    
                    return `('${dataId}', '${surveyId}', '${specialty.replace(/'/g, "''")}', '${providerType.replace(/'/g, "''")}', '${region.replace(/'/g, "''")}', ${tcc}, ${cf}, ${wrvu}, ${count}, '${JSON.stringify(row).replace(/'/g, "''")}')`;
                  }).join(', ');

                  await pool.request().query(`
                    INSERT INTO survey_data (id, surveyId, specialty, providerType, region, tcc, cf, wrvu, count, data)
                    VALUES ${values}
                  `);
                  
                  console.log(`✅ Batch ${i + 1} completed successfully`);
                } catch (batchError) {
                  console.error(`❌ Error in batch ${i + 1}:`, batchError.message);
                  throw batchError; // Re-throw to be caught by outer try-catch
                }
              }

              console.log('✅ Azure SQL: upload stored successfully');
            } catch (azureErr) {
              console.error('⚠️ Azure SQL write failed (continuing with local SQLite):', azureErr.message);
            }
          }

          // Check if local SQLite has 'metadata' column
          db.all("PRAGMA table_info('surveys')", (pragmaErr, surveyCols) => {
            const hasMetadata = Array.isArray(surveyCols) && surveyCols.some(c => c.name === 'metadata');

            const insertSurveySql = hasMetadata
              ? `INSERT INTO surveys (id, name, year, type, uploadDate, rowCount, specialtyCount, dataPoints, colorAccent, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              : `INSERT INTO surveys (id, name, year, type, uploadDate, rowCount, specialtyCount, dataPoints, colorAccent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const insertSurveyParams = hasMetadata
              ? [surveyId, name, year, type, uploadDate, results.length, specialties.size, results.length, '#6366F1', metadata]
              : [surveyId, name, year, type, uploadDate, results.length, specialties.size, results.length, '#6366F1'];

            db.run(insertSurveySql, insertSurveyParams, function(err) {
              if (err) {
                console.error('Error inserting survey:', err);
                return res.status(500).json({ error: 'Database error' });
              }

              // Determine if 'data' column exists for survey_data
              db.all("PRAGMA table_info('survey_data')", (pragmaErr2, dataCols) => {
                const hasDataCol = Array.isArray(dataCols) && dataCols.some(c => c.name === 'data');

                const insertDataSql = hasDataCol
                  ? `INSERT INTO survey_data (id, surveyId, specialty, providerType, region, tcc, cf, wrvu, count, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                  : `INSERT INTO survey_data (id, surveyId, specialty, providerType, region, tcc, cf, wrvu, count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                const stmt = db.prepare(insertDataSql);

                results.forEach((row) => {
                  const dataId = uuidv4();
                  // Extract values with fallback column names
                  const specialty = row.specialty || row.Specialty || '';
                  const providerType = row.provider_type || row['Provider Type'] || '';
                  const region = row.geographic_region || row.Region || '';
                  // Extract numeric values with fallbacks
                  const tcc = Number.parseFloat(row.tcc_p50) || Number.parseFloat(row.TCC) || 0;
                  const cf = Number.parseFloat(row.cf_p50) || Number.parseFloat(row.CF) || 0;
                  const wrvu = Number.parseFloat(row.wrvu_p50) || Number.parseFloat(row.wRVU) || 0;
                  const count = Number.parseInt(row.n_incumbents) || Number.parseInt(row.Count) || 0;

                  const params = hasDataCol
                    ? [dataId, surveyId, specialty, providerType, region, tcc, cf, wrvu, count, JSON.stringify(row)]
                    : [dataId, surveyId, specialty, providerType, region, tcc, cf, wrvu, count];

                  stmt.run(params);
                });

                stmt.finalize((err) => {
                  if (err) {
                    console.error('Error finalizing data insert:', err);
                    clearTimeout(uploadTimeout);
                    return res.status(500).json({ error: 'Data insertion error' });
                  }

                  // Clean up uploaded file
                  fs.unlinkSync(req.file.path);

                  clearTimeout(uploadTimeout);
                  res.json({
                    success: true,
                    surveyId,
                    message: 'Survey uploaded successfully',
                    stats: {
                      rows: results.length,
                      specialties: specialties.size,
                      dataPoints: results.length
                    }
                  });
                });
              });
            });
          });
        } catch (error) {
          console.error('Error processing survey:', error);
          res.status(500).json({ error: 'Processing error' });
        }
      });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get all surveys
app.get('/api/surveys', (req, res) => {
  db.all('SELECT * FROM surveys ORDER BY uploadDate DESC', (err, rows) => {
    if (err) {
      console.error('Error fetching surveys:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get survey metadata (stored on upload)
app.get('/api/survey/:id/meta', (req, res) => {
  const { id } = req.params;
  db.get('SELECT metadata FROM surveys WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching survey metadata:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) return res.status(404).json({ error: 'Survey not found' });
    try {
      const meta = row.metadata ? JSON.parse(row.metadata) : {};
      res.json(meta);
    } catch (e) {
      res.json({});
    }
  });
});

// Get survey data with filters
app.get('/api/survey/:id/data', (req, res) => {
  const { id } = req.params;
  const { specialty, providerType, region, page = 1, limit = 100 } = req.query;
  
  let query = 'SELECT * FROM survey_data WHERE surveyId = ?';
  const params = [id];
  
  if (specialty) {
    query += ' AND specialty LIKE ?';
    params.push(`%${specialty}%`);
  }
  if (providerType) {
    query += ' AND providerType LIKE ?';
    params.push(`%${providerType}%`);
  }
  if (region) {
    query += ' AND region LIKE ?';
    params.push(`%${region}%`);
  }
  
  query += ' LIMIT ? OFFSET ?';
  const offset = (page - 1) * limit;
  params.push(parseInt(limit), offset);
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching survey data:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM survey_data WHERE surveyId = ?';
    const countParams = [id];
    
    if (specialty) {
      countQuery += ' AND specialty LIKE ?';
      countParams.push(`%${specialty}%`);
    }
    if (providerType) {
      countQuery += ' AND providerType LIKE ?';
      countParams.push(`%${providerType}%`);
    }
    if (region) {
      countQuery += ' AND region LIKE ?';
      countParams.push(`%${region}%`);
    }
    
    db.get(countQuery, countParams, (err, countRow) => {
      if (err) {
        console.error('Error counting data:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Parse JSON blob for full row reconstruction
      const data = rows.map(r => {
        let extra = {};
        try { extra = r.data ? JSON.parse(r.data) : {}; } catch {}
        const { id, surveyId, data: _omit, ...rest } = r;
        return { id, surveyId, ...extra, ...rest };
      });
      res.json({
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countRow.total,
          pages: Math.ceil(countRow.total / limit)
        }
      });
    });
  });
});

// Get unique values for filters
app.get('/api/survey/:id/filters', (req, res) => {
  const { id } = req.params;
  
  // Get distinct specialties
  db.all('SELECT DISTINCT specialty FROM survey_data WHERE surveyId = ? AND specialty IS NOT NULL', [id], (err, specialtyRows) => {
    if (err) {
      console.error('Error fetching specialties:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get distinct provider types
    db.all('SELECT DISTINCT providerType FROM survey_data WHERE surveyId = ? AND providerType IS NOT NULL', [id], (err, providerRows) => {
      if (err) {
        console.error('Error fetching provider types:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Get distinct regions
      db.all('SELECT DISTINCT region FROM survey_data WHERE surveyId = ? AND region IS NOT NULL', [id], (err, regionRows) => {
        if (err) {
          console.error('Error fetching regions:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        const filters = {
          specialties: specialtyRows.map(r => r.specialty).filter(Boolean),
          providerTypes: providerRows.map(r => r.providerType).filter(Boolean),
          regions: regionRows.map(r => r.region).filter(Boolean)
        };
        
        res.json(filters);
      });
    });
  });
});

// ------------------------
// Mapping persistence APIs
// ------------------------

// Helper to run SQLite queries as promises
function runAsync(sqlText, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sqlText, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function allAsync(sqlText, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sqlText, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Specialty mappings
app.get('/api/mappings/specialty', async (req, res) => {
  try {
    const mappings = await allAsync('SELECT * FROM specialty_mappings_v2');
    const result = [];
    for (const m of mappings) {
      const sources = await allAsync('SELECT * FROM specialty_mapping_sources_v2 WHERE mappingId = ?', [m.id]);
      result.push({
        id: m.id,
        standardizedName: m.standardizedName,
        sourceSpecialties: sources.map(s => ({
          id: s.id,
          specialty: s.specialty,
          originalName: s.originalName,
          surveySource: s.surveySource,
          mappingId: m.id
        })),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      });
    }
    res.json(result);
  } catch (err) {
    console.error('Error listing specialty mappings:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/mappings/specialty', async (req, res) => {
  try {
    const { standardizedName, sourceSpecialties = [] } = req.body || {};
    if (!standardizedName || !Array.isArray(sourceSpecialties)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    await runAsync('INSERT INTO specialty_mappings_v2 (id, standardizedName, createdAt, updatedAt) VALUES (?, ?, ?, ?)', [id, standardizedName, now, now]);
    for (const s of sourceSpecialties) {
      const sid = uuidv4();
      await runAsync('INSERT INTO specialty_mapping_sources_v2 (id, mappingId, specialty, originalName, surveySource, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [sid, id, s.specialty || s.name || '', s.originalName || s.name || '', s.surveySource || '', now]);
    }
    // Best-effort Azure dual-write
    if (azureEnabled && getConnection) {
      getConnection().then(async pool => {
        try {
          await pool.request()
            .input('id', sql.NVarChar, id)
            .input('standardizedName', sql.NVarChar, standardizedName)
            .input('createdAt', sql.NVarChar, now)
            .input('updatedAt', sql.NVarChar, now)
            .query('INSERT INTO specialty_mappings_v2 (id, standardizedName, createdAt, updatedAt) VALUES (@id, @standardizedName, @createdAt, @updatedAt)');
          for (const s of sourceSpecialties) {
            const sid = uuidv4();
            await pool.request()
              .input('id', sql.NVarChar, sid)
              .input('mappingId', sql.NVarChar, id)
              .input('specialty', sql.NVarChar, s.specialty || s.name || '')
              .input('originalName', sql.NVarChar, s.originalName || s.name || '')
              .input('surveySource', sql.NVarChar, s.surveySource || '')
              .input('createdAt', sql.NVarChar, now)
              .query('INSERT INTO specialty_mapping_sources_v2 (id, mappingId, specialty, originalName, surveySource, createdAt) VALUES (@id, @mappingId, @specialty, @originalName, @surveySource, @createdAt)');
          }
        } catch (e) {
          console.warn('Azure dual-write (specialty mappings) failed:', e.message);
        }
      });
    }
    res.status(201).json({ id, standardizedName, sourceSpecialties, createdAt: now, updatedAt: now });
  } catch (err) {
    console.error('Error creating specialty mapping:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/mappings/specialty/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM specialty_mapping_sources_v2 WHERE mappingId = ?', [id]);
    await runAsync('DELETE FROM specialty_mappings_v2 WHERE id = ?', [id]);
    if (azureEnabled && getConnection) {
      getConnection().then(async pool => {
        try {
          await pool.request().input('id', sql.NVarChar, id).query('DELETE FROM specialty_mapping_sources_v2 WHERE mappingId = @id');
          await pool.request().input('id', sql.NVarChar, id).query('DELETE FROM specialty_mappings_v2 WHERE id = @id');
        } catch (e) {
          console.warn('Azure dual-delete (specialty mappings) failed:', e.message);
        }
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting specialty mapping:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/mappings/specialty', async (req, res) => {
  try {
    await runAsync('DELETE FROM specialty_mapping_sources_v2');
    await runAsync('DELETE FROM specialty_mappings_v2');
    res.json({ success: true });
  } catch (err) {
    console.error('Error clearing specialty mappings:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Column mappings
app.get('/api/mappings/column', async (req, res) => {
  try {
    const mappings = await allAsync('SELECT * FROM column_mappings_v2');
    const result = [];
    for (const m of mappings) {
      const sources = await allAsync('SELECT * FROM column_mapping_sources_v2 WHERE mappingId = ?', [m.id]);
      result.push({
        id: m.id,
        standardizedName: m.standardizedName,
        sourceColumns: sources.map(s => ({ id: s.id, name: s.name, surveySource: s.surveySource, dataType: s.dataType, mappingId: m.id })),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      });
    }
    res.json(result);
  } catch (err) {
    console.error('Error listing column mappings:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/mappings/column', async (req, res) => {
  try {
    const { standardizedName, sourceColumns = [] } = req.body || {};
    if (!standardizedName || !Array.isArray(sourceColumns)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    await runAsync('INSERT INTO column_mappings_v2 (id, standardizedName, createdAt, updatedAt) VALUES (?, ?, ?, ?)', [id, standardizedName, now, now]);
    for (const c of sourceColumns) {
      const cid = uuidv4();
      await runAsync('INSERT INTO column_mapping_sources_v2 (id, mappingId, name, surveySource, dataType, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [cid, id, c.name || '', c.surveySource || '', c.dataType || 'string', now]);
    }
    res.status(201).json({ id, standardizedName, sourceColumns, createdAt: now, updatedAt: now });
  } catch (err) {
    console.error('Error creating column mapping:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/mappings/column/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await runAsync('DELETE FROM column_mapping_sources_v2 WHERE mappingId = ?', [id]);
    await runAsync('DELETE FROM column_mappings_v2 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting column mapping:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/mappings/column', async (req, res) => {
  try {
    await runAsync('DELETE FROM column_mapping_sources_v2');
    await runAsync('DELETE FROM column_mappings_v2');
    res.json({ success: true });
  } catch (err) {
    console.error('Error clearing column mappings:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete survey
app.delete('/api/survey/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM survey_data WHERE surveyId = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting survey data:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    db.run('DELETE FROM surveys WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting survey:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ success: true, message: 'Survey deleted successfully' });
    });
  });
});

// Delete all surveys
app.delete('/api/surveys', async (req, res) => {
  try {
    // Delete from SQLite
    db.run('DELETE FROM survey_data', function(err) {
      if (err) {
        console.error('Error deleting all survey data:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      db.run('DELETE FROM surveys', function(err) {
        if (err) {
          console.error('Error deleting all surveys:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Also delete from Azure SQL if enabled
        if (azureEnabled && getConnection) {
          getConnection().then(pool => {
            return pool.request().query('DELETE FROM survey_data');
          }).then(() => {
            return getConnection().then(pool => pool.request().query('DELETE FROM surveys'));
          }).then(() => {
            console.log('✅ Azure SQL: all surveys deleted');
          }).catch(azureErr => {
            console.error('⚠️ Azure SQL delete failed (continuing):', azureErr.message);
          });
        }
        
        res.json({ success: true, message: 'All surveys deleted successfully' });
      });
    });
  } catch (error) {
    console.error('Error in delete all surveys:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export survey data
app.get('/api/survey/:id/export', (req, res) => {
  const { id } = req.params;
  const { format = 'csv' } = req.query;
  
  if (format !== 'csv') {
    return res.status(400).json({ error: 'Only CSV export is supported' });
  }
  
  db.all('SELECT * FROM survey_data WHERE surveyId = ?', [id], (err, rows) => {
    if (err) {
      console.error('Error fetching data for export:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }
    
    // Reconstruct full rows using JSON blob plus scalar columns, then export using union of all keys
    const reconstructed = rows.map(r => {
      let extra = {};
      try { extra = r.data ? JSON.parse(r.data) : {}; } catch {}
      const { data: _omit, ...rest } = r;
      return { ...extra, ...rest };
    });
    const headerSet = new Set();
    reconstructed.forEach(r => Object.keys(r).forEach(k => {
      if (k !== 'surveyId') headerSet.add(k);
    }));
    const headers = Array.from(headerSet);
    const csvContent = [
      headers.join(','),
      ...reconstructed.map(row => 
        headers.map(header => {
          const value = row[header] ?? '';
          const str = String(value);
          return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',')
      )
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="survey-${id}.csv"`);
    res.send(csvContent);
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Survey Aggregator Backend running on port ${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});

