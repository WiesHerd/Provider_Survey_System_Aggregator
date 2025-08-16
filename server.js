const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Environment detection
const isVercel = process.env.VERCEL === '1';
const isLocal = !isVercel;

// Database configuration
let dbPath;
let database;

if (isLocal) {
  // Local development: Use SQLite
  dbPath = path.join(__dirname, 'survey_data.db');
} else {
  // Vercel: Use in-memory storage
  database = {
    surveys: new Map(),
    surveyData: new Map()
  };
}

// Initialize database
async function initDatabase() {
  if (isLocal) {
    // SQLite for local development
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS surveys (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        surveyType TEXT NOT NULL DEFAULT 'Compensation',
        surveyYear TEXT NOT NULL DEFAULT '2025',
        rowCount INTEGER NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);

    // Add missing columns if they don't exist (migration)
    try {
      await db.run('ALTER TABLE surveys ADD COLUMN surveyType TEXT DEFAULT "Compensation"');
    } catch (error) {
      // Column already exists, ignore error
    }
    
    try {
      await db.run('ALTER TABLE surveys ADD COLUMN surveyYear TEXT DEFAULT "2025"');
    } catch (error) {
      // Column already exists, ignore error
    }
    
    // Add updatedAt column to column_mappings if it doesn't exist
    try {
      await db.run('ALTER TABLE column_mappings ADD COLUMN updatedAt TEXT');
      // Update existing records to have updatedAt = createdAt
      await db.run('UPDATE column_mappings SET updatedAt = createdAt WHERE updatedAt IS NULL');
    } catch (error) {
      // Column already exists, ignore error
    }

    await db.exec(`
      CREATE TABLE IF NOT EXISTS survey_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        surveyId TEXT NOT NULL,
        data TEXT NOT NULL,
        FOREIGN KEY (surveyId) REFERENCES surveys (id)
      )
    `);

    // Create specialty mappings table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS specialty_mappings (
        id TEXT PRIMARY KEY,
        standardizedName TEXT NOT NULL,
        sourceSpecialties TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);

              // Create column mappings table
          await db.exec(`
            CREATE TABLE IF NOT EXISTS column_mappings (
              id TEXT PRIMARY KEY,
              standardizedName TEXT NOT NULL,
              sourceColumns TEXT NOT NULL,
              createdAt TEXT NOT NULL,
              updatedAt TEXT NOT NULL
            )
          `);

    return db;
  } else {
    // In-memory for Vercel
    return database;
  }
}

// Parse CSV file
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        // Clean up the uploaded file
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });
        resolve(results);
      })
      .on('error', (error) => {
        // Clean up the uploaded file
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });
        reject(error);
      });
  });
}

// API Routes
app.get('/api/surveys', async (req, res) => {
  try {
    const db = await initDatabase();
    
    if (isLocal) {
      // SQLite implementation
      const surveys = await db.all('SELECT * FROM surveys ORDER BY createdAt DESC');
      
      // Handle migration for existing surveys without surveyType and surveyYear
      const migratedSurveys = surveys.map(survey => {
        if (!survey.surveyType || survey.surveyType === 'Compensation' || !survey.surveyYear || survey.surveyYear === '2025') {
          // Extract survey type from filename or use default
          let surveyType = 'Compensation';
          if (survey.filename.toLowerCase().includes('mgma')) {
            surveyType = 'MGMA';
          } else if (survey.filename.toLowerCase().includes('sullivan')) {
            surveyType = 'Sullivan Cotter';
          } else if (survey.filename.toLowerCase().includes('gallagher')) {
            surveyType = 'Gallagher';
          }
          
          // Extract year from filename or use current year
          let surveyYear = new Date(survey.createdAt).getFullYear().toString();
          const yearMatch = survey.filename.match(/(20\d{2})/);
          if (yearMatch) {
            surveyYear = yearMatch[1];
          }
          
          // Update the database record
          db.run(
            'UPDATE surveys SET surveyType = ?, surveyYear = ? WHERE id = ?',
            [surveyType, surveyYear, survey.id]
          );
          
          return {
            ...survey,
            surveyType,
            surveyYear
          };
        }
        return survey;
      });
      
      await db.close();
      
      res.json({
        surveys: migratedSurveys,
        total: migratedSurveys.length,
        message: 'Data retrieved from SQLite database'
      });
    } else {
      // In-memory implementation
      const surveys = Array.from(db.surveys.values()).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      res.json({
        surveys: surveys,
        total: surveys.length,
        message: 'Data retrieved from in-memory database'
      });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Database connection failed',
      message: error.message,
      surveys: [],
      total: 0
    });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, year, type } = req.body;
    const filename = name || req.file.originalname;
    const surveyType = type || 'Compensation';
    const surveyYear = year || new Date().getFullYear().toString();
    
    // Parse the CSV file
    const data = await parseCSV(req.file.path);
    
    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'No data found in file' });
    }

    const db = await initDatabase();
    const surveyId = uuidv4();
    
    if (isLocal) {
      // SQLite implementation
      await db.run(
        'INSERT INTO surveys (id, filename, surveyType, surveyYear, rowCount, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [surveyId, filename, surveyType, surveyYear, data.length, new Date().toISOString()]
      );
      
      // Save survey data
      for (const row of data) {
        await db.run(
          'INSERT INTO survey_data (surveyId, data) VALUES (?, ?)',
          [surveyId, JSON.stringify(row)]
        );
      }
      
      await db.close();
    } else {
      // In-memory implementation
      db.surveys.set(surveyId, {
        id: surveyId,
        filename: filename,
        surveyType: surveyType,
        surveyYear: surveyYear,
        rowCount: data.length,
        createdAt: new Date().toISOString()
      });
      
      db.surveyData.set(surveyId, data);
    }
    
    res.json({
      success: true,
      message: isLocal ? 'Survey uploaded to SQLite database' : 'Survey uploaded to in-memory database',
      surveyId: surveyId,
      filename: filename,
      surveyType: surveyType,
      surveyYear: surveyYear,
      rows: data.length
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

// Get survey data with pagination and filters
app.get('/api/survey/:surveyId/data', async (req, res) => {
  try {
    const { surveyId } = req.params;
    const { page = 1, limit = 100, specialty, providerType, region } = req.query;
    
    const db = await initDatabase();
    
    if (isLocal) {
      // SQLite implementation
      // Build WHERE clause for filters
      let whereClause = 'WHERE surveyId = ?';
      let params = [surveyId];
      
      if (specialty || providerType || region) {
        whereClause += ' AND (';
        const conditions = [];
        
        if (specialty) {
          conditions.push("json_extract(data, '$.specialty') LIKE ?");
          params.push(`%${specialty}%`);
        }
        
        if (providerType) {
          conditions.push("json_extract(data, '$.providerType') LIKE ?");
          params.push(`%${providerType}%`);
        }
        
        if (region) {
          conditions.push("json_extract(data, '$.region') LIKE ?");
          params.push(`%${region}%`);
        }
        
        whereClause += conditions.join(' OR ') + ')';
      }
      
      // Get total count
      const countResult = await db.get(`SELECT COUNT(*) as total FROM survey_data ${whereClause}`, params);
      const total = countResult.total;
      
      // Get paginated data
      const offset = (page - 1) * limit;
      const rows = await db.all(
        `SELECT data FROM survey_data ${whereClause} ORDER BY id LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      );
      
      // Parse JSON data
      const parsedRows = rows.map(row => JSON.parse(row.data));
      
      await db.close();
      
      res.json({
        rows: parsedRows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      });
    } else {
      // In-memory implementation
      const surveyData = db.surveyData.get(surveyId);
      if (!surveyData) {
        return res.status(404).json({ error: 'Survey not found' });
      }
      
      // Apply filters
      let filteredData = surveyData;
      if (specialty || providerType || region) {
        filteredData = surveyData.filter(row => {
          return (!specialty || row.specialty?.includes(specialty)) &&
                 (!providerType || row.providerType?.includes(providerType)) &&
                 (!region || row.region?.includes(region));
        });
      }
      
      const total = filteredData.length;
      const offset = (page - 1) * limit;
      const paginatedData = filteredData.slice(offset, offset + parseInt(limit));
      
      res.json({
        rows: paginatedData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      });
    }
  } catch (error) {
    console.error('Error fetching survey data:', error);
    res.status(500).json({
      error: 'Failed to fetch survey data',
      message: error.message
    });
  }
});

// Get survey metadata (includes original columns list)
app.get('/api/survey/:surveyId/meta', async (req, res) => {
  try {
    const { surveyId } = req.params;
    
    const db = await initDatabase();
    
    if (isLocal) {
      // SQLite implementation
      const survey = await db.get('SELECT * FROM surveys WHERE id = ?', [surveyId]);
      
      if (!survey) {
        await db.close();
        return res.status(404).json({ error: 'Survey not found' });
      }
      
      // Get the first few rows to extract column headers
      const sampleData = await db.all('SELECT data FROM survey_data WHERE surveyId = ? LIMIT 1', [surveyId]);
      
      await db.close();
      
      let columns = [];
      if (sampleData.length > 0) {
        // Extract column names from the actual CSV data (stored as JSON)
        const firstRow = JSON.parse(sampleData[0].data);
        columns = Object.keys(firstRow);
      }
      
      res.json({
        columns,
        surveyType: survey.surveyType,
        surveyYear: survey.surveyYear,
        rowCount: survey.rowCount
      });
    } else {
      // In-memory implementation
      const survey = db.surveys.get(surveyId);
      
      if (!survey) {
        return res.status(404).json({ error: 'Survey not found' });
      }
      
      // Get sample data to extract columns
      const sampleData = db.surveyData.get(surveyId);
      let columns = [];
      
      if (sampleData && sampleData.length > 0) {
        // Extract column names from the actual CSV data
        columns = Object.keys(sampleData[0]);
      }
      
      res.json({
        columns,
        surveyType: survey.surveyType,
        surveyYear: survey.surveyYear,
        rowCount: survey.rowCount
      });
    }
  } catch (error) {
    console.error('Error fetching survey metadata:', error);
    res.status(500).json({
      error: 'Failed to fetch survey metadata',
      message: error.message
    });
  }
});

// Get survey filters (unique values for specialty, providerType, region)
app.get('/api/survey/:surveyId/filters', async (req, res) => {
  try {
    const { surveyId } = req.params;
    
    const db = await initDatabase();
    
    if (isLocal) {
      // SQLite implementation
      const rows = await db.all('SELECT data FROM survey_data WHERE surveyId = ?', [surveyId]);
      
      // Parse and extract unique values
      const specialties = new Set();
      const providerTypes = new Set();
      const regions = new Set();
      
      rows.forEach(row => {
        const data = JSON.parse(row.data);
        if (data.specialty) specialties.add(data.specialty);
        if (data.providerType) providerTypes.add(data.providerType);
        if (data.region) regions.add(data.region);
      });
      
      await db.close();
      
      res.json({
        specialties: Array.from(specialties).sort(),
        providerTypes: Array.from(providerTypes).sort(),
        regions: Array.from(regions).sort()
      });
    } else {
      // In-memory implementation
      const surveyData = db.surveyData.get(surveyId);
      if (!surveyData) {
        return res.status(404).json({ error: 'Survey not found' });
      }
      
      const specialties = new Set();
      const providerTypes = new Set();
      const regions = new Set();
      
      surveyData.forEach(row => {
        if (row.specialty) specialties.add(row.specialty);
        if (row.providerType) providerTypes.add(row.providerType);
        if (row.region) regions.add(row.region);
      });
      
      res.json({
        specialties: Array.from(specialties).sort(),
        providerTypes: Array.from(providerTypes).sort(),
        regions: Array.from(regions).sort()
      });
    }
  } catch (error) {
    console.error('Error fetching survey filters:', error);
    res.status(500).json({
      error: 'Failed to fetch survey filters',
      message: error.message
    });
  }
});

// Delete a specific survey
app.delete('/api/survey/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params;
    
    const db = await initDatabase();
    
    if (isLocal) {
      // SQLite implementation
      // Delete survey data first (due to foreign key constraint)
      await db.run('DELETE FROM survey_data WHERE surveyId = ?', [surveyId]);
      
      // Delete survey record
      const result = await db.run('DELETE FROM surveys WHERE id = ?', [surveyId]);
      
      await db.close();
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Survey not found' });
      }
    } else {
      // In-memory implementation
      if (!db.surveys.has(surveyId)) {
        return res.status(404).json({ error: 'Survey not found' });
      }
      
      db.surveys.delete(surveyId);
      db.surveyData.delete(surveyId);
    }
    
    res.json({
      success: true,
      message: 'Survey deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting survey:', error);
    res.status(500).json({
      error: 'Failed to delete survey',
      message: error.message
    });
  }
});

// Delete all surveys
app.delete('/api/surveys', async (req, res) => {
  try {
    const db = await initDatabase();
    
    if (isLocal) {
      // SQLite implementation
      // Delete all survey data first (due to foreign key constraint)
      await db.run('DELETE FROM survey_data');
      
      // Delete all survey records
      const result = await db.run('DELETE FROM surveys');
      
      await db.close();
      
      res.json({
        success: true,
        message: `Deleted ${result.changes} surveys successfully`
      });
    } else {
      // In-memory implementation
      const count = db.surveys.size;
      db.surveys.clear();
      db.surveyData.clear();
      
      res.json({
        success: true,
        message: `Deleted ${count} surveys successfully`
      });
    }
  } catch (error) {
    console.error('Error deleting all surveys:', error);
    res.status(500).json({
      error: 'Failed to delete all surveys',
      message: error.message
    });
  }
});

// Specialty Mapping API endpoints
app.get('/api/mappings/specialty', async (req, res) => {
  try {
    const db = await initDatabase();
    
    if (isLocal) {
      // SQLite implementation
      const mappings = await db.all('SELECT * FROM specialty_mappings ORDER BY createdAt DESC');
      
      // Parse the sourceSpecialties JSON
      const parsedMappings = mappings.map(mapping => ({
        id: mapping.id,
        standardizedName: mapping.standardizedName,
        sourceSpecialties: JSON.parse(mapping.sourceSpecialties),
        createdAt: mapping.createdAt
      }));
      
      await db.close();
      
      res.json(parsedMappings);
    } else {
      // In-memory implementation
      const mappings = Array.from(db.specialtyMappings?.values() || []).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      res.json(mappings);
    }
  } catch (error) {
    console.error('Error fetching specialty mappings:', error);
    res.status(500).json({
      error: 'Failed to fetch specialty mappings',
      message: error.message
    });
  }
});

app.post('/api/mappings/specialty', async (req, res) => {
  try {
    const { standardizedName, sourceSpecialties } = req.body;
    
    if (!standardizedName || !sourceSpecialties) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const db = await initDatabase();
    const mappingId = uuidv4();
    
    if (isLocal) {
      // SQLite implementation
      await db.run(
        'INSERT INTO specialty_mappings (id, standardizedName, sourceSpecialties, createdAt) VALUES (?, ?, ?, ?)',
        [mappingId, standardizedName, JSON.stringify(sourceSpecialties), new Date().toISOString()]
      );
      
      await db.close();
    } else {
      // In-memory implementation
      if (!db.specialtyMappings) {
        db.specialtyMappings = new Map();
      }
      
      db.specialtyMappings.set(mappingId, {
        id: mappingId,
        standardizedName,
        sourceSpecialties,
        createdAt: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: 'Specialty mapping created successfully',
      mappingId
    });
  } catch (error) {
    console.error('Error creating specialty mapping:', error);
    res.status(500).json({
      error: 'Failed to create specialty mapping',
      message: error.message
    });
  }
});

app.delete('/api/mappings/specialty/:mappingId', async (req, res) => {
  try {
    const { mappingId } = req.params;
    
    const db = await initDatabase();
    
    if (isLocal) {
      // SQLite implementation
      const result = await db.run('DELETE FROM specialty_mappings WHERE id = ?', [mappingId]);
      
      await db.close();
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Mapping not found' });
      }
    } else {
      // In-memory implementation
      if (!db.specialtyMappings || !db.specialtyMappings.has(mappingId)) {
        return res.status(404).json({ error: 'Mapping not found' });
      }
      
      db.specialtyMappings.delete(mappingId);
    }
    
    res.json({
      success: true,
      message: 'Specialty mapping deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting specialty mapping:', error);
    res.status(500).json({
      error: 'Failed to delete specialty mapping',
      message: error.message
    });
  }
});

// Column Mapping API endpoints
app.get('/api/mappings/column', async (req, res) => {
  try {
    const db = await initDatabase();
    
    if (isLocal) {
      // SQLite implementation
      const mappings = await db.all('SELECT * FROM column_mappings ORDER BY createdAt DESC');
      
      // Parse the sourceColumns JSON
      const parsedMappings = mappings.map(mapping => ({
        id: mapping.id,
        standardizedName: mapping.standardizedName,
        sourceColumns: JSON.parse(mapping.sourceColumns),
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt || mapping.createdAt // Fallback for existing records
      }));
      
      await db.close();
      
      res.json(parsedMappings);
    } else {
      // In-memory implementation
      const mappings = Array.from(db.columnMappings?.values() || []).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      res.json(mappings);
    }
  } catch (error) {
    console.error('Error fetching column mappings:', error);
    res.status(500).json({
      error: 'Failed to fetch column mappings',
      message: error.message
    });
  }
});

app.post('/api/mappings/column', async (req, res) => {
  try {
    const { standardizedName, sourceColumns } = req.body;
    
    if (!standardizedName || !sourceColumns) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const db = await initDatabase();
    const mappingId = uuidv4();
    
    if (isLocal) {
      // SQLite implementation
      const now = new Date().toISOString();
      await db.run(
        'INSERT INTO column_mappings (id, standardizedName, sourceColumns, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        [mappingId, standardizedName, JSON.stringify(sourceColumns), now, now]
      );
      
      await db.close();
    } else {
      // In-memory implementation
      if (!db.columnMappings) {
        db.columnMappings = new Map();
      }
      
      const now = new Date().toISOString();
      db.columnMappings.set(mappingId, {
        id: mappingId,
        standardizedName,
        sourceColumns,
        createdAt: now,
        updatedAt: now
      });
    }
    
    res.json({
      success: true,
      message: 'Column mapping created successfully',
      mappingId
    });
  } catch (error) {
    console.error('Error creating column mapping:', error);
    res.status(500).json({
      error: 'Failed to create column mapping',
      message: error.message
    });
  }
});

app.delete('/api/mappings/column/:mappingId', async (req, res) => {
  try {
    const { mappingId } = req.params;
    
    const db = await initDatabase();
    
    if (isLocal) {
      // SQLite implementation
      const result = await db.run('DELETE FROM column_mappings WHERE id = ?', [mappingId]);
      
      await db.close();
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Mapping not found' });
      }
    } else {
      // In-memory implementation
      if (!db.columnMappings || !db.columnMappings.has(mappingId)) {
        return res.status(404).json({ error: 'Mapping not found' });
      }
      
      db.columnMappings.delete(mappingId);
    }
    
    res.json({
      success: true,
      message: 'Column mapping deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting column mapping:', error);
    res.status(500).json({
      error: 'Failed to delete column mapping',
      message: error.message
    });
  }
});

app.delete('/api/mappings/column', async (req, res) => {
  try {
    const db = await initDatabase();
    
    if (isLocal) {
      // SQLite implementation
      const result = await db.run('DELETE FROM column_mappings');
      
      await db.close();
      
      res.json({
        success: true,
        message: `Deleted ${result.changes} column mappings successfully`
      });
    } else {
      // In-memory implementation
      const count = db.columnMappings?.size || 0;
      if (db.columnMappings) {
        db.columnMappings.clear();
      }
      
      res.json({
        success: true,
        message: `Deleted ${count} column mappings successfully`
      });
    }
  } catch (error) {
    console.error('Error deleting all column mappings:', error);
    res.status(500).json({
      error: 'Failed to delete all column mappings',
      message: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'survey-aggregator-api',
    environment: isVercel ? 'vercel' : 'local',
    database: isVercel ? 'in-memory' : 'sqlite'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${isVercel ? 'Vercel (in-memory)' : 'Local (SQLite)'}`);
  console.log(`📊 API endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/surveys`);
  console.log(`   POST /api/upload`);
  console.log(`   DELETE /api/surveys`);
  console.log(`   DELETE /api/survey/:id`);
  console.log(`   GET  /api/survey/:id/data`);
  console.log(`   GET  /api/survey/:id/meta`);
  console.log(`   GET  /api/survey/:id/filters`);
  console.log(`   GET  /api/mappings/specialty`);
  console.log(`   POST /api/mappings/specialty`);
  console.log(`   DELETE /api/mappings/specialty/:id`);
  console.log(`   GET  /api/mappings/column`);
  console.log(`   POST /api/mappings/column`);
  console.log(`   DELETE /api/mappings/column/:id`);
  console.log(`   DELETE /api/mappings/column`);
});