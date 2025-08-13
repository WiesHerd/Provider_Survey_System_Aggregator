const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Test server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Survey Aggregator Backend - Test Server',
    status: 'running'
  });
});

app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
});

