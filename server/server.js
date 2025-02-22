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
  const { storeAddress, category, start_time, spots, timestamp, task, searchBar, location, date} = req.body;


  if (!storeAddress || !category || !start_time || !spots || !timestamp || !task || !searchBar || !location || !date) {
    return res.status(400).send('Missing required fields');
  }


  try {
    const ref = db.ref('volunteer_opportunities'); // Correct spelling // Changed from 'shopping_discounts'
    await ref.push({ storeAddress, category, start_time, spots, timestamp, task, searchBar, location, date});


    res.status(200).send('Volunteer opportunity added successfully');
  } catch (error) {
    console.error('Error adding volunteer opportunity:', error);
    res.status(500).send('Error adding volunteer opportunity');
  }
});

app.get('/get-volunteer-tasks', async (req, res) => {
  try {
    const ref = db.ref('volunteer_opportunities'); // Ensure this matches your DB
    const snapshot = await ref.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ message: "No volunteer tasks found" });
    }

    const tasks = snapshot.val(); // Firebase stores data as an object
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching volunteer tasks:', error);
    res.status(500).json({ message: 'Error fetching volunteer tasks' });
  }
});

// Route to add user inputted data
app.post('/add-user-data', async (req, res) => {
  const { timestamp, searchBar } = req.body;


  if ( !timestamp || !searchBar) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const ref = db.ref('user_input'); // Changed from 'shopping_discounts'
    await ref.push({ timestamp, searchBar});


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
