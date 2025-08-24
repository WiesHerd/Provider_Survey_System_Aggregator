// In-memory storage for Vercel (since SQLite doesn't work on serverless)
let surveys = new Map();
let surveyData = new Map();

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const { surveyId } = req.query;
      
      const data = surveyData.get(surveyId);
      if (!data) {
        return res.status(404).json({ error: 'Survey not found' });
      }
      
      const specialties = new Set();
      const providerTypes = new Set();
      const regions = new Set();
      
      data.forEach(row => {
        if (row.specialty) specialties.add(row.specialty);
        if (row.providerType) providerTypes.add(row.providerType);
        if (row.region) regions.add(row.region);
      });
      
      res.json({
        specialties: Array.from(specialties).sort(),
        providerTypes: Array.from(providerTypes).sort(),
        regions: Array.from(regions).sort()
      });
    } catch (error) {
      console.error('Error fetching survey filters:', error);
      res.status(500).json({
        error: 'Failed to fetch survey filters',
        message: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}





