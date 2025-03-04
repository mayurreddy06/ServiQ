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
app.use(express.static(path.join(__dirname, '..'))); // Serve static files from the "client" directory
app.use('/css', express.static(path.join(__dirname, '../css'))); // Serve CSS files
app.use('/js', express.static(path.join(__dirname, '../js'))); // Serve JS files
app.use('/website-designing', express.static(path.join(__dirname, '../website-designing'))); // Serve website-designing files
app.use(express.json());

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '/client/map.html'));
});

app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'signup.html'));
});

app.get('/signlog.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'signlog.html'));
});

app.get('/websiteDesignTest.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'websiteDesignTest.html'));
});


// Saves additional account data in database
app.post('/add-account', async (req, res) => {
  const { uid, email, name, accountType, agencyDescription } = req.body;

  if (!uid || !email || !name) {
    return res.status(400).send('Missing required fields');
  }

  try {
    if (accountType === 'user') {
      await db.ref(`user_accounts/${uid}`).set({ email, name, accountType });
    } else if (accountType === 'agency') {
      await db.ref(`agency_accounts/${uid}`).set({ email, name, accountType, agencyDescription });
    }
    
    return res.status(200).send("User data saved successfully");
  } catch (error) {
    console.error('Error saving user data:', error);
    return res.status(500).send(error.message);
  }
});

// Mapbox Key Route
app.get('/websiteDesignTest.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'websiteDesignTest.html'));
});

app.get('/signlog.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'signlog.html'));
});

app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'signup.html'));
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

require('dotenv').config();

console.log("EMAIL:", process.env.EMAIL);
console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD);


const nodemailer = require('nodemailer');

// Email sending route
// Email sending route & Volunteer Registration Tracking
app.post('/send-email', async (req, res) => {
  const { email, storeAddress, category, taskId } = req.body;

  if (!email || !storeAddress || !category || !taskId) {
    return res.status(400).send("Missing required fields.");
  }

  try {
    const safeEmail = email.replace(/\./g, "_");

    // 🔹 Fetch volunteer task details from Firebase
    const taskRef = db.ref(`volunteer_opportunities/${taskId}`);
    const taskSnapshot = await taskRef.once("value");
    const taskData = taskSnapshot.val();

    if (!taskData) {
      return res.status(404).send("Task not found.");
    }

    // Extract relevant data
    const { start_time, end_time, date } = taskData;

    // 🔹 Fetch existing registrations
    const regRef = taskRef.child("registrations");
    const regSnapshot = await regRef.once("value");
    let regData = regSnapshot.val() || { count: 0, volunteers: {} };

    if (regData.volunteers && regData.volunteers[safeEmail]) {
      return res.status(400).send("You have already registered for this task.");
    }

    // Increment registration count and save email
    regData.count += 1;
    regData.volunteers[safeEmail] = true;
    await regRef.set(regData);

    // Generate an unregister link
    const unregisterLink = `http://localhost:${PORT}/unregister?email=${encodeURIComponent(email)}&taskId=${taskId}`;

    // 🔹 Send Email with Event Date & Time
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD, 
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Volunteer Registration Confirmation",
      html: `
        <p>You have successfully registered for a volunteer task at <b>${storeAddress}</b> in the <b>${category}</b> category.</p>
        <p><strong>📅 Date:</strong> ${date}</p>
        <p><strong>⏰ Time:</strong> ${start_time} - ${end_time}</p>
        <p>You are volunteer #${regData.count}.</p>
        <p>If you need to unregister, click the link below:</p>
        <p><a href="${unregisterLink}">Unregister from this task</a></p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${email}`);

    res.status(200).send({ message: "Email sent successfully.", count: regData.count });

  } catch (error) {
    console.error("❌ Email sending error:", error);
    res.status(500).send("Error sending email.");
  }
});


// Unregister Route: Allows users to unregister from a volunteer task
app.get("/unregister", async (req, res) => {
  const { email, taskId } = req.query;

  if (!email || !taskId) {
    return res.status(400).send("Missing required parameters.");
  }

  try {
    // Convert email to Firebase-safe format
    const safeEmail = email.replace(/\./g, "_");

    // Reference the volunteer task in Firebase
    const taskRef = db.ref(`volunteer_opportunities/${taskId}/registrations`);
    const taskSnapshot = await taskRef.once("value");
    let taskData = taskSnapshot.val();

    // If task doesn't exist or email isn't registered, return an error
    if (!taskData || !taskData.volunteers || !taskData.volunteers[safeEmail]) {
      return res.status(400).send("You are not registered for this task.");
    }

    // Remove email from registered volunteers
    delete taskData.volunteers[safeEmail];
    taskData.count = Math.max(0, taskData.count - 1); // Ensure count never goes negative

    // Update Firebase
    await taskRef.set(taskData);

    console.log(`📉 ${email} unregistered from task ${taskId}. Count is now ${taskData.count}`);

    res.send(`
      <h2>You have successfully unregistered from the volunteer task.</h2>
      <p>Your updated volunteer count is now ${taskData.count}.</p>
    `);

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).send("Error processing unregistration.");
  }
});




// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});