const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
require('dotenv').config();
// const Typesense = require('typesense');

// // Initialize Typesense Client
// const typesenseClient = new Typesense.Client({
//   nodes: [
//     {
//       host: 'bgrwny8ik1eu94djp-1.a1.typesense.net', // Replace with your Typesense Cloud node
//       port: '443',                                  // Use 443 for Typesense Cloud
//       protocol: 'https',                            // Use 'https' for Typesense Cloud
//     },
//   ],
//   apiKey: 'VXyvCuyJft5EEFTSaXfm0SaadQMSTRRn', // Use Admin API Key
//   connectionTimeoutSeconds: 2,
// });

const serviceAccount = require(process.env.FIREBASE_JSON);
const app = express();
const PORT = 3002;
const { getAuth } = require('firebase-admin/auth');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'assets/views'));

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

//middleware: automatically passing in form data by the name attribute
app.use(express.urlencoded({extended: true}))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets/html/homepage2.html'));
});

app.get('/map.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets/html/map.html'));
});

app.get('/taskpost.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets/html/taskpost.html'));
});

app.get('/homepage.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets/html/homepage.html'));
});

app.get('/auth/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets/html/newSignlog.html'));
});

app.get('/auth/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets/html/signup.html'));
});

app.post('/auth/register', async (req, res) => {
  const {agencyName, agencyDesc, email, password} = req.body;
  // values from the name = attribute in the form html

  if (!email || !password || !agencyName) {
    return res.status(400).json({
       error: 'Missing required fields' 
      });
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: agencyName
    });
    // create the schema

    const db = admin.database();
    await db.ref(`agency_accounts/${userRecord.uid}`).set({
      email,
      name: agencyName,
      accountType: 'agency',
      agencyDescription: agencyDesc,
      createdAt: new Date().toISOString()
    });

    // 3. Optionally create a custom token for immediate client-side login
    const token = await admin.auth().createCustomToken(userRecord.uid);

    // console.log(res.json({
    //   message: 'User registered successfully',
    //   uid: userRecord.uid,
    //   token // Send this to client if you want immediate login
    // }));

    res.redirect("/auth/login");
  } catch (error) {
    console.error('Registration error:', error);
  }
});
app.get('/viewPosts.ejs', (req, res) => {
  res.render('viewPosts.ejs');
});


// Volunteer opportunities route
const volunteerDataRouter = require('./assets/js/routes/volunteerData.js');
const rateLimiter = require('./assets/js/middleware/rateLimiter.js');
app.use("/", rateLimiter, volunteerDataRouter);

require('dotenv').config();

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