const express = require("express");
const app = express();

// Simple test routes
app.get('/test', (req, res) => {
  res.json({ message: 'GET /test works' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'GET /api/test works' });
});

app.listen(3001, () => {
  console.log('Server running on 3001 for diagnostic tests');
});
