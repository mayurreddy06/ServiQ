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
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets/html/homepage.html'));
});

app.get('/signlog.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets/html/signlog.html'));
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

app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets/html/signup.html'));
})


// Route to add volunteer data
app.post('/volunteer-data', async (req, res) => {
  const { storeAddress, category, start_time, end_time, spots, timestamp, task, location, date, description } = req.body;

  if (!storeAddress || !category || !start_time || !end_time || !spots || !timestamp || !task || !location || !date || !description) {
    return res.json({
      status: "FAILED",
      message: "Missing fields"
    });
  }

  try {
    const ref = db.ref('volunteer_opportunities');
    const newTaskRef = ref.push(); 
    // Capture the reference to the new data
    await newTaskRef.set({ storeAddress, category, start_time, end_time, spots, timestamp, task, location, date, description });

    // // Index into Typesense (only timestamp, category, and task)
    // const typesenseDocument = {
    //   id: newTaskRef.key, // Use Firebase key as the Typesense document ID
    //   timestamp: parseInt(timestamp, 10), // Ensure timestamp is an integer
    //   category,
    //   task,
    //   description,
    // };

    // console.log('Indexing document into Typesense:', typesenseDocument);

    // // Use typesenseClient to add the document to the collection
    // await typesenseClient.collections('volunteerTasks').documents().create(typesenseDocument);
    // console.log('Document indexed successfully');

    res.json({
      status: "SUCCESS",
      message: "Data successfully injected to Firebase"
    });
  } catch (error) {
    console.error('Error adding volunteer opportunity:', error);
    res.json({
      status: "FAILED",
      message: "Firebase reference does not exist"
    });
  }
});

// Route to fetch all volunteer tasks
app.get('/volunteer-data', async (req, res) => {
  try {
    const ref = db.ref('volunteer_opportunities');
    const data = await ref.once('value');
    const tasks = data.val();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching volunteer tasks:', error);
    res.json({
      status : "FAILED",
      message: "Data could not be fetched from firebase"
    });
  }
});

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
    return res.json({
      message: "Failed to user login info to Firebase"
    });
  }
});

require('dotenv').config();

console.log("EMAIL:", process.env.EMAIL);
console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD);

const nodemailer = require('nodemailer');

// Email sending route
// Email sending route & Volunteer Registration Tracking
app.post('/send-email', async (req, res) => {
  try {
    console.log("✅ Received request:", req.body);

    const { email, storeAddress, category, taskId } = req.body;
    if (!email || !storeAddress || !category || !taskId) {
      console.error("❌ Missing required fields:", req.body);
      return res.status(400).send("Missing required fields.");
    }

    const safeEmail = email.replace(/\./g, "_");
    const registrationPath = `volunteer_opportunities/${taskId}/registrations`;

    console.log(`📌 Checking registration at: ${registrationPath}`);

    // 🔹 Fetch existing registrations for the specific task
    const regRef = db.ref(registrationPath);
    const regSnapshot = await regRef.once("value");
    let regData = regSnapshot.val() || { count: 0, volunteers: {} };

    console.log("📊 Current Registration Data:", regData);

    if (regData.volunteers[safeEmail]) {
      console.warn(`⚠ ${email} is already registered.`);
      return res.status(400).send("You have already registered for this task.");
    }

    // 🔹 Update Firebase Registration Data under the task
    regData.count += 1;
    regData.volunteers[safeEmail] = true;

    console.log("📢 Attempting to update Firebase with:", regData);
    await regRef.set(regData);
    console.log("✅ Firebase update successful!");

    // 🔍 Confirm Update by Fetching Again
    const verifySnapshot = await regRef.once("value");
    console.log("🔄 Firebase Data After Update:", verifySnapshot.val());

    if (!verifySnapshot.val()) {
      console.error("❌ Firebase update failed! Data not found.");
      return res.status(500).send("Error: Firebase did not save the update.");
    }

    console.log("✅ Firebase update confirmed!");

    // 🔹 Send Confirmation Email
    const transporter = nodemailer.createTransport({
      service: "gmail",
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
        <p>You are <strong>volunteer #${regData.count}</strong>.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("📧 Email sent successfully!");

    res.status(200).send({ message: "Email sent successfully.", count: regData.count });

  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).send("Error sending email.");
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