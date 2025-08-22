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

  if (req.method === 'DELETE') {
    try {
      const { surveyId } = req.query;
      
      if (!surveys.has(surveyId)) {
        return res.status(404).json({ error: 'Survey not found' });
      }
      
      surveys.delete(surveyId);
      surveyData.delete(surveyId);
      
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
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}




