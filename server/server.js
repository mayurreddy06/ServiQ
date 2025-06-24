// main back end file, all routes stem from here
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const cookieParser = require('cookie-parser');
// environment variables
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');

// Firebase
const serviceAccountPath = process.env.FIREBASE_JSON;
const serviceAccount = require(serviceAccountPath);
const app = express();
const PORT = 3000;

app.use(cookieParser("secret"));

// The second and third are the origins on render
const allowedOrigins = ['http://localhost:3000', 'https://serviq.onrender.com/', 'https://www.serviq-volunteer.org/']

// allows cross-origins (allowing the use of the particular domains specified above) needed for deployment on Render
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_URL,
  storageBucket: "store-discount-finder.firebasestorage.app"
});

// Database reference
const db = admin.database();
module.exports = db;

// middleware to define variables to be used in EJS for updating the navbar, displaying email on dashboard, etc.
app.use(async (req, res, next) => {
  // Set default values FIRST
  res.locals.uid = null;
  res.locals.email = null;
  req.user = null;

  try {
    // Check for JWT cookie first
    const jwtToken = req.cookies.authToken;

    if (jwtToken) {
      try {
        // Verify JWT token
        const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);

        // Get user data from database
        const userRef = db.ref(`agency_accounts/${decoded.uid}`);
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        if (userData) {

          req.user = {
            uid: decoded.uid,
            email: decoded.email,
            isVerified: userData.isVerified || decoded.isVerified,
            userData: userData
          };

          // setting the local variables
          res.locals.uid = decoded.uid;
          res.locals.email = decoded.email;
        }
      } catch (jwtError) {
        console.log('JWT token verification failed:', jwtError.message);
        // Clear invalid cookie
        res.clearCookie('authToken');
      }
    }
    next();

  } catch (error) {
    console.log("Error while validating JWT token: ", error.message);
    next();
  }
});

// Allows us to pass variables in the body on the front end and retrieve on the back end by doing req.body
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Allows to use EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../client/views'));

// Static file middleware (allows us to declare the specific routes below)
app.use(express.static(path.join(__dirname, 'assets')));

// Specific Static file routes
app.use('/styles', express.static(path.join(__dirname, '../client/styles')));
app.use('/images', express.static(path.join(__dirname, '../client/images')));
app.use('/scripts', express.static(path.join(__dirname, '../client/scripts')));
app.use('/config', express.static(path.join(__dirname, './assets')));
// these were specifically installed libraries
app.use('/bootstrap', express.static(__dirname + '/../node_modules/bootstrap/dist'));
app.use('/bootstrap-icons', express.static(__dirname + '/../node_modules/bootstrap-icons'));
app.use('/flatpickr', express.static(__dirname + '/../node_modules/flatpickr/dist'));

// doesn't store requests in the browsers memory
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Main routes
app.get('/', (req, res) => {
  let googlePlacesToken = "https://maps.googleapis.com/maps/api/js?key=" + process.env.GOOGLE_PLACES_TOKEN + "&libraries=places";
  res.render("homePage.ejs", {googlePlacesToken});
});

app.get('/about', (req, res) => {
  res.render("about.ejs");
});

// Imported Routes
const volunteerData = require('./assets/routes/volunteerData.js');
const adminPages = require("./assets/routes/admin.js");
const userAuth = require("./assets/routes/auth.js");
const map = require("./assets/routes/eventMap.js");

// This is to prevent logged out users from accessing routes that only logged in users can (ex: CRUD dashboard for events)
const requireAuth = (req, res, next) => {
  // The only exception is the /volunteer-data GET route which is to get the map data on the homepage
  if (!(req.baseUrl === '/volunteer-data') && req.method === 'GET' && !(req.user))
  {
      let errorCode = 401;
      let errorMessage = "You are not authorized to access this page"
      res.render('errorPage.ejs', {errorCode, errorMessage})
  }
  else
  {
    next();
  }
  
};

// Apply route middlewares
app.use("/volunteer-data", requireAuth, volunteerData);
app.use("/admin", requireAuth, adminPages);
app.use("/auth", userAuth);
app.use("/map", map);

// if the user enters a random url under our domain, they will be redirected to an error page
app.use((req, res, next) => {
  let errorCode = 404;
  let errorMessage = "The page you're looking for doesn't exist or has been moved"
  res.render('errorPage.ejs', {errorCode, errorMessage})
});

app.listen(PORT, () => {
  console.log('Server running on http://localhost:'+ PORT);
});