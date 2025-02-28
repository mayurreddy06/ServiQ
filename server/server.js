const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const { exec } = require('child_process');
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

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/', 'signup.html'));
});

// Account Creation Route
app.post('/add-account', async (req, res) => {
  const { email, password, name, accountType, agencyDescription } = req.body;

  if (!email || !password) {
    return res.status(400).send('Missing required fields');
  }

  try {

    let accountRecord;

    if(accountType === 'user'){
      accountRecord = await admin.auth().createUser({
        email: email,
        password: password,
        name: name,
        accountType: accountType
      });

      await db.ref(`user_accounts/${accountRecord.uid}`).set({ email, name });
    } else if(accountType === 'agency'){
      accountRecord = await admin.auth().createUser({
        email: email,
        password: password,
        name: name,
        accountType: accountType,
        agencyDescription: agencyDescription
      });

      await db.ref(`agency_accounts/${accountRecord.uid}`).set({ email, name, agencyDescription });
    }
    
    return res.status(200).send("Created account successfully");

  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).send("An account with this email already exists.");
    }

    return res.status(500).send(error.message);
  }
});

// Mapbox Key Route
app.get('/websiteDesignTest.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'websiteDesignTest.html'));
});

app.get('/signlog.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/signlog', 'signlog.html'));
});

app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/signlog', 'signup.html'));
});

// Route to add a shopping discount
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

// Route to fetch all discounts
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

    // Filter and remove expired discounts
    for (const key in discounts) {
      const { timestamp } = discounts[key];
      if (currentTime - timestamp < 24 * 60 * 60 * 1000) {
        validDiscounts[key] = discounts[key];
      } else {
        await ref.child(key).remove(); // Remove expired items
      }
    }

    res.status(200).json(validDiscounts);
  } catch (error) {
    console.error('Error fetching discounts:', error);
    res.status(500).send('Error fetching discounts');
  }
});

// Function to clean expired discounts every hour
const cleanExpiredItems = async () => {
  try {
    const ref = db.ref('shopping_discounts');
    const snapshot = await ref.once('value');
    const discounts = snapshot.val();

    if (!discounts) return;

    const currentTime = Date.now();

    for (const key in discounts) {
      const { timestamp } = discounts[key];
      if (currentTime - timestamp >= 24 * 60 * 60 * 1000) {
        await ref.child(key).remove(); // Remove expired items
        console.log(`Removed expired discount: ${key}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning expired items:', error);
  }
};

// Run cleanup every hour
setInterval(cleanExpiredItems, 60 * 60 * 1000);

// Route to add volunteer data
app.post('/add-volunteer-data', async (req, res) => {
  const { storeAddress, category, start_time, end_time, spots, timestamp, task, location, date} = req.body;

  if (!storeAddress || !category || !start_time || !end_time || !spots || !timestamp || !task|| !location || !date) {
    return res.status(400).send('Missing required fields');
  }

  try {
    const ref = db.ref('volunteer_opportunities');
    await ref.push({ storeAddress, category, start_time, end_time, spots, timestamp, task, location, date});

    res.status(200).send('Volunteer opportunity added successfully');
  } catch (error) {
    console.error('Error adding volunteer opportunity:', error);
    res.status(500).send('Error adding volunteer opportunity');
  }
});

// Route to fetch all volunteer tasks
app.get('/get-volunteer-tasks', async (req, res) => {
  try {
    const ref = db.ref('volunteer_opportunities');
    const snapshot = await ref.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "No volunteer tasks found" });
    }

    const tasks = snapshot.val();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching volunteer tasks:', error);
    res.status(500).json({ message: 'Error fetching volunteer tasks' });
  }
});

// Route to add user inputted data
// app.post('/add-user-data', async (req, res) => {
//   const { timestamp, searchBar } = req.body;

//   if (!timestamp || !searchBar) {
//     return res.status(400).send('Missing required fields');
//   }

//   try {
//     const ref = db.ref('user_input');
//     await ref.push({ timestamp, searchBar });

//     res.status(200).send('User data added successfully');
//   } catch (error) {
//     console.error('Error adding user data:', error);
//     res.status(500).send('Error adding user data');
//   }
// });

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
