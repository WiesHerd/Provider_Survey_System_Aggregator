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
      const { page = 1, limit = 100, specialty, providerType, region } = req.query;
      
      const data = surveyData.get(surveyId);
      if (!data) {
        return res.status(404).json({ error: 'Survey not found' });
      }
      
      // Apply filters
      let filteredData = data;
      if (specialty || providerType || region) {
        filteredData = data.filter(row => {
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
    } catch (error) {
      console.error('Error fetching survey data:', error);
      res.status(500).json({
        error: 'Failed to fetch survey data',
        message: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}




