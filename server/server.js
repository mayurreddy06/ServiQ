const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const { exec } = require('child_process'); // Import child_process
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

app.post('/add-discount', async (req, res) => {
  const { storeName, discountAmount, lat, lng, timestamp } = req.body;

  if (!storeName || !discountAmount || !lat || !lng || !timestamp) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const ref = db.ref('shopping_discounts');
    await ref.push({ storeName, discountAmount, location: { lat, lng }, timestamp });

    // Run Python script after adding new data
    exec('python Agent.py', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing Python script: ${error.message}`);
      }
      if (stderr) {
        console.error(`Python Script Error: ${stderr}`);
      }
      console.log(`Python Script Output: ${stdout}`);
    });

    res.status(200).send('Discount added successfully');
  } catch (error) {
    console.error('Error adding discount:', error);
    res.status(500).send('Error adding discount');
  }
});

// Route to fetch all discounts from Firebase
app.get('/get-discounts', async (req, res) => {
  try {
    const ref = db.ref('shopping_discounts');
    const snapshot = await ref.once('value');
    const discounts = snapshot.val();

    if (!discounts) {
      return res.status(200).json([]); // No discounts found
    }

    const currentTime = Date.now();
    const validDiscounts = {};

    // Filter discounts less than 24 hours old
    for (const key in discounts) {
      const { timestamp } = discounts[key];
      if (currentTime - timestamp < 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
        validDiscounts[key] = discounts[key];
      } else {
        // Remove expired items from the database
        await ref.child(key).remove();
      }
    }

    res.status(200).json(validDiscounts);
  } catch (error) {
    console.error('Error fetching discounts:', error);
    res.status(500).send('Error fetching discounts');
  }
});

// Function to clean expired items every hour
const cleanExpiredItems = async () => {
  try {
    const ref = db.ref('shopping_discounts');
    const snapshot = await ref.once('value');
    const discounts = snapshot.val();

    if (!discounts) return;

    const currentTime = Date.now();

    for (const key in discounts) {
      const { timestamp } = discounts[key];
      if (currentTime - timestamp >= 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
        await ref.child(key).remove(); // Remove expired items
        console.log(`Removed expired discount: ${key}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning expired items:', error);
  }
};

// Run cleanup every hour
setInterval(cleanExpiredItems, 60 * 60 * 1000); // 1 hour in milliseconds

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
