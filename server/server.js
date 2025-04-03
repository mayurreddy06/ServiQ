const express = require('express');
const path = require('path');
const admin = require('firebase-admin');


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
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_URL
});

// Database reference
const db = admin.database();
module.exports = db;

// Middleware to serve static files and parse JSON body
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

// Debug logging for email configuration
console.log("Email Configuration:");
console.log("EMAIL:", process.env.EMAIL);
console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD ? "***" : "Not set");
console.log("Using SMTP Host: smtp.zoho.com");

const nodemailer = require('nodemailer');

// Create reusable transporter object
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
  },
  debug: true // Enable debug mode
});

// Verify transporter configuration
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ Email transporter verification failed:', error);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response
    });
  } else {
    console.log('✅ Email transporter is ready to send messages');
  }
});

// Email sending route & Volunteer Registration Tracking
app.post('/send-email', async (req, res) => {
  try {
    console.log("✅ Received request:", req.body);

    const { email, storeAddress, category, taskId } = req.body;
    if (!email || !storeAddress || !category || !taskId) {
      console.error("❌ Missing required fields:", req.body);
      return res.status(400).json({ message: "Missing required fields." });
    }

    console.log("🔍 Looking for task with ID:", taskId);
    const safeEmail = email.replace(/\./g, "_");
    // Get the task reference
    const taskRef = db.ref(`volunteer_opportunities/${taskId}`);
    const taskSnapshot = await taskRef.once("value");
    const taskData = taskSnapshot.val();

    if (!taskData) {
      console.error("❌ Task not found:", taskId);
      console.error("Current path:", `volunteer_opportunities/${taskId}`);
      return res.status(404).json({ message: "Task not found." });
    }

    console.log("✅ Found task:", taskData);

    // Initialize registrations if they don't exist
    if (!taskData.registrations) {
      taskData.registrations = {
        count: 0,
        volunteers: {}
      };
    }

    // Check if already registered
    if (taskData.registrations.volunteers[safeEmail]) {
      console.warn(`⚠ ${email} is already registered.`);
      return res.status(400).json({ message: "You have already registered for this task." });
    }

    // Update registration data
    taskData.registrations.count += 1;
    taskData.registrations.volunteers[safeEmail] = true;

    console.log("📢 Attempting to update task with registration:", taskData);
    await taskRef.update(taskData);
    console.log("✅ Task update successful!");

    // 🔹 Send Confirmation Email
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Volunteer Registration Confirmation",
      html: `
        <p>You have successfully registered for a volunteer task at <b>${storeAddress}</b> in the <b>${category}</b> category.</p>
        <p>You are <strong>volunteer #${taskData.registrations.count}</strong>.</p>
      `,
    };

    console.log("📧 Attempting to send email to:", email);
    console.log("📧 Using sender email:", process.env.EMAIL);
    
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("📧 Email sent successfully! Message ID:", info.messageId);
      res.status(200).json({ message: "Email sent successfully.", count: taskData.registrations.count });
    } catch (emailError) {
      console.error("❌ Email sending failed:", {
        error: emailError,
        code: emailError.code,
        command: emailError.command,
        response: emailError.response,
        stack: emailError.stack
      });
      throw emailError; // Re-throw to be caught by outer try-catch
    }

  } catch (error) {
    console.error("❌ Error in send-email route:", {
      error: error,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    
    if (error.code === 'EAUTH') {
      res.status(500).json({ message: "Authentication failed. Please check email credentials." });
    } else if (error.code === 'ECONNECTION') {
      res.status(500).json({ message: "Connection failed. Please check network connectivity." });
    } else {
      res.status(500).json({ message: "Error sending email: " + error.message });
    }
  }
});





// app.get('/search-suggestions', async (req, res) => {
//   const { query } = req.query;

//   if (!query) {
//     return res.status(400).json({ error: 'Query parameter is required' });
//   }

//   console.log("This is the query: " + query);
//   try {
//     let search_parameters = {
//       'q': query,
//       'query_by': 'embedding',
//       'per_page': 5
//     }
    
//     // Use typesenseClient instead of client
//     const searchResults = await typesenseClient.collections('volunterTasks').documents().search(search_parameters);
    
//     const suggestions = searchResults.hits ? searchResults.hits.map(hit => hit.document) : [];
//     res.json(suggestions);
//   } catch (err) {
//     console.error('Error fetching search suggestions:', err);
//     res.status(500).json({ error: 'Error fetching search suggestions' });
//   }
// });
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});