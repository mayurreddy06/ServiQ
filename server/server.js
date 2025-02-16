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
  databaseURL: process.env.FIREBASE_URL,
});


// Database reference
const db = admin.database();
module.exports = db;


// Middleware to serve static files and parse JSON body
app.use(express.static(path.join(__dirname, '../client')));
app.use(express.json());


// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'websiteDesignTest.html'));
});


// Route to add volunteer data
app.post('/add-volunteer-data', async (req, res) => {
  const { storeAddress, category, start_time, end_time, spots, timestamp } = req.body;


  if (!storeAddress || !category || !start_time || !end_time || !spots || !timestamp) {
    return res.status(400).send('Missing required fields');
  }


  try {
    const ref = db.ref('volunteer_opportunities'); // Changed from 'shopping_discounts'
    await ref.push({ storeAddress, category, start_time, end_time, spots, timestamp });


    res.status(200).send('Volunteer opportunity added successfully');
  } catch (error) {
    console.error('Error adding volunteer opportunity:', error);
    res.status(500).send('Error adding volunteer opportunity');
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
