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

const allowedOrigins = ['http://localhost:3000', 'https://serviq.onrender.com/', 'https://www.serviq-volunteer.org/']

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

const jwt = require('jsonwebtoken');

// Replace your existing auth middleware with this:
app.use(async (req, res, next) => {
  // Set default values FIRST
  res.locals.uid = null;
  res.locals.email = null;
  res.locals.isVerified = false;
  res.locals.user = null;
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
          console.log("JWT token valid - setting user data");

          req.user = {
            uid: decoded.uid,
            email: decoded.email,
            isVerified: userData.isVerified || decoded.isVerified,
            userData: userData
          };

          // Set locals for EJS templates
          res.locals.uid = decoded.uid;
          res.locals.email = decoded.email;
          res.locals.isVerified = userData.isVerified || decoded.isVerified;
          res.locals.user = userData;
          console.log("User UID set in res.locals from JWT:", res.locals.uid);
        }
      } catch (jwtError) {
        console.log('JWT token verification failed:', jwtError.message);
        // Clear invalid cookie
        res.clearCookie('authToken');
      }
    }

    // Always call next at the end
    next();

  } catch (error) {
    console.log("Middleware error:", error.message);
    next();
  }
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
app.use('/bootstrap-icons', express.static(__dirname + '/../node_modules/bootstrap-icons'));
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

app.get("/navbar", (req, res) => {
  res.render("navbar.ejs", {uid: res.locals.uid});
})

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
  if (!(req.originalUrl === '/volunteer-data') && req.method === 'GET' && !(req.user))
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
app.use("/volunteer-data", requireAuth, volunteerData);
app.use("/admin", requireAuth, adminPages);
app.use("/auth", userAuth); // Auth routes handle their own middleware
app.use("/map", map);

app.use((req, res, next) => {
  let errorCode = 404;
  let errorMessage = "The page you're looking for doesn't exist or has been moved"
  res.render('errorPage.ejs', {errorCode, errorMessage})
});


// Start server
app.listen(PORT, () => {
  console.log('Server running on http://localhost:'+ PORT);
});