// main back end file, all routes stem from here
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const cors = require('cors');

// Use environment variable or fallback to default path
const serviceAccountPath = process.env.FIREBASE_JSON || './path/to/your/firebase-service-account.json';
const serviceAccount = require(serviceAccountPath);
const app = express();
const PORT = 3000;

app.use(cookieParser("secret"));

const allowedOrigins = ['http://localhost:3000']

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_URL
});

// Database reference
const db = admin.database();
module.exports = db;

// Middleware to verify Firebase token and set user data
app.use(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Get user data from database
      const userRef = db.ref(`agency_accounts/${decodedToken.uid}`);
      const snapshot = await userRef.once('value');
      const userData = snapshot.val();
      
      if (userData) {
        // Set user data for use in templates and routes
        console.log("There is user data");
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          isVerified: userData.isVerified || decodedToken.email_verified,
          userData: userData
        };
        
        // Set locals for EJS templates ONLY if user exists
        res.locals.uid = decodedToken.uid;
        res.locals.email = decodedToken.email;
        res.locals.isVerified = userData.isVerified || decodedToken.email_verified;
        res.locals.user = userData;
        console.log(res.locals.uid);
      }
    }
  } catch (error) {
    // Token is invalid or expired, continue without user data
    console.log('Auth token verification failed:', error.message);
  }
  
  // Don't set any default values - leave res.locals empty if no authenticated user
  // This way, EJS can properly check if locals.uid is undefined
  
  next();
});

// Static file middleware
app.use(express.static(path.join(__dirname, 'assets')));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../client/views'));

// Static file routes
app.use('/styles', express.static(path.join(__dirname, '../client/styles')));
app.use('/images', express.static(path.join(__dirname, '../client/images')));
app.use('/scripts', express.static(path.join(__dirname, '../client/scripts')));
app.use('/config', express.static(path.join(__dirname, './assets')));
app.use('/bootstrap', express.static(__dirname + '/../node_modules/bootstrap/dist'));
app.use('/flatpickr', express.static(__dirname + '/../node_modules/flatpickr/dist'));

// Cache control middleware
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Public routes
app.get('/', (req, res) => {
  res.render("homePage.ejs");
});

app.get('/about', (req, res) => {
  res.render("about.ejs");
});

// Route imports
const volunteerData = require('./assets/routes/volunteerData.js');
const adminPages = require("./assets/routes/admin.js");
const userAuth = require("./assets/routes/auth.js");
const map = require("./assets/routes/eventMap.js");

// Middleware for protected routes
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({error: "Authentication required"});
  }
  next();
};

const requireVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({error: "Authentication required"});
  }
  if (!req.user.isVerified) {
    return res.status(403).json({error: "Email verification required"});
  }
  next();
};

// Apply route middlewares
app.use("/volunteer-data", requireVerification, volunteerData);
app.use("/admin", requireVerification, adminPages);
app.use("/auth", userAuth); // Auth routes handle their own middleware
app.use("/map", map);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({error: 'Internal server error'});
});

// Start server
app.listen(PORT, () => {
  console.log('Server running on http://localhost:'+ PORT);
});