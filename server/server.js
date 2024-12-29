const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config(); 
const serviceAccount = require(process.env.FIREBASE_JSON);

const app = express();
const PORT = 3000;

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_URL
});

// Database reference
const db = admin.database();
module.exports = db;

// Middleware to serve static files and parse JSON body
app.use(express.static(path.join(__dirname, '../client')));
app.use(express.json());

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'mapboxkey.html'));
});

// Add-discount route
app.post('/add-discount', async (req, res) => {
  const { storeName, discountAmount, lat, lng } = req.body;

  if (!storeName || !discountAmount || !lat || !lng) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const ref = db.ref('shopping_discounts');
    await ref.push({ storeName, discountAmount, location: { lat, lng } });
    res.status(200).send('Discount added successfully');
  } catch (error) {
    console.error('Error adding discount:', error);
    res.status(500).send('Error adding discount');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
