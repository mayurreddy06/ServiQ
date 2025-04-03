const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = require(process.env.FIREBASE_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_URL
});

// Database reference
const db = admin.database();
module.exports = db;

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Configure view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'assets/views'));

// Middleware
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets/html/homepage2.html'));
});

const staticPages = {
  '/signlog.html': 'assets/html/newSignlog.html',
  '/map.html': 'assets/html/map.html',
  '/taskpost.html': 'assets/html/taskpost.html',
  '/homepage.html': 'assets/html/homepage.html',
  '/signup.html': 'assets/html/signup.html'
};

Object.entries(staticPages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, file));
  });
});

app.get('/viewPosts.ejs', (req, res) => {
  res.render('viewPosts.ejs');
});

// Dynamic routes
const volunteerDataRouter = require('./assets/js/routes/volunteerData.js');
const rateLimiter = require('./assets/js/middleware/rateLimiter.js');
app.use("/", rateLimiter, volunteerDataRouter);

// Account creation endpoint
app.post('/add-account', async (req, res) => {
  const { uid, email, name, accountType, agencyDescription } = req.body;

  if (!uid || !email || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const accountPath = accountType === 'user' 
      ? `user_accounts/${uid}`
      : `agency_accounts/${uid}`;
    
    const accountData = accountType === 'user'
      ? { email, name, accountType }
      : { email, name, accountType, agencyDescription };
    
    await db.ref(accountPath).set(accountData);
    return res.status(200).json({ message: "User data saved successfully" });
  } catch (error) {
    console.error('Error saving user data:', error);
    return res.status(500).json({ error: "Failed to save user login info to Firebase" });
  }
});

// Email configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Email verification on startup
transporter.verify((error) => {
  if (error) {
    console.error('❌ Email transporter verification failed:', error);
  } else {
    console.log('✅ Email transporter is ready');
  }
});

// Volunteer registration and email endpoint
app.post('/send-email', async (req, res) => {
  const { email, storeAddress, category, taskId } = req.body;
  
  if (!email || !storeAddress || !category || !taskId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const safeEmail = email.replace(/\./g, "_");
    const taskRef = db.ref(`volunteer_opportunities/${taskId}`);
    const taskSnapshot = await taskRef.once("value");
    const taskData = taskSnapshot.val();

    if (!taskData) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Initialize registrations if needed
    const registrations = taskData.registrations || {
      count: 0,
      volunteers: {}
    };

    if (registrations.volunteers[safeEmail]) {
      return res.status(400).json({ error: "Already registered for this task" });
    }

    // Update registration data
    registrations.count += 1;
    registrations.volunteers[safeEmail] = true;
    
    await taskRef.update({ registrations });

    // Send confirmation email
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Volunteer Registration Confirmation",
      html: `
        <p>You have successfully registered for a volunteer task at <b>${storeAddress}</b> in the <b>${category}</b> category.</p>
        <p>You are <strong>volunteer #${registrations.count}</strong>.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ 
      message: "Registration successful and email sent",
      count: registrations.count 
    });

  } catch (error) {
    console.error("Error in send-email route:", error);
    
    const errorResponse = {
      error: "Internal server error",
      details: error.message
    };

    if (error.code === 'EAUTH') {
      errorResponse.error = "Email authentication failed";
    } else if (error.code === 'ECONNECTION') {
      errorResponse.error = "Email connection failed";
    }

    res.status(500).json(errorResponse);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});