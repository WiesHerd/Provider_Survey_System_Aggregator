import { v4 as uuidv4 } from 'uuid';
import csv from 'csv-parser';
import fs from 'fs';

// In-memory storage for Vercel (since SQLite doesn't work on serverless)
let surveys = new Map();
let surveyData = new Map();

// Parse CSV data from string (for Vercel)
function parseCSVData(csvData) {
  return new Promise((resolve, reject) => {
    const results = [];
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        results.push(row);
      }
    }
    
    resolve(results);
  });
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { filename, data, name, year, type } = req.body;
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: 'No data provided or invalid format' });
      }

      const surveyId = uuidv4();
      const surveyName = name || filename || 'Uploaded Survey';
      const surveyType = type || 'Compensation';
      const surveyYear = year || new Date().getFullYear().toString();
      
      // Store survey metadata
      surveys.set(surveyId, {
        id: surveyId,
        filename: surveyName,
        surveyType: surveyType,
        surveyYear: surveyYear,
        rowCount: data.length,
        createdAt: new Date().toISOString()
      });
      
      // Store survey data
      surveyData.set(surveyId, data);
      
      res.status(200).json({
        success: true,
        message: 'Survey uploaded to in-memory database',
        surveyId: surveyId,
        filename: surveyName,
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
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

