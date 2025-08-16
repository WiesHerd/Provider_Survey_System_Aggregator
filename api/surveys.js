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
      const surveysList = Array.from(surveys.values()).sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      res.status(200).json({
        surveys: surveysList,
        total: surveysList.length,
        message: 'Data retrieved from in-memory database'
      });
    } catch (error) {
      console.error('Error fetching surveys:', error);
      res.status(500).json({
        error: 'Failed to fetch surveys',
        message: error.message,
        surveys: [],
        total: 0
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const count = surveys.size;
      surveys.clear();
      surveyData.clear();
      
      res.status(200).json({
        success: true,
        message: `Deleted ${count} surveys successfully`
      });
    } catch (error) {
      console.error('Error deleting all surveys:', error);
      res.status(500).json({
        error: 'Failed to delete all surveys',
        message: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
