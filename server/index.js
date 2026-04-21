const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors()); // allows frontend to talk to backend
app.use(express.json()); // allows backend to read JSON data

// Define a route that sends back a message
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

const PORT = 5055;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
