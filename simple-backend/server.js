const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Survey Aggregator Backend is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Survey Aggregator Backend',
    status: 'running',
    endpoints: ['/api/health']
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
