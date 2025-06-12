// main back end file, all routes stem from here
const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
require('dotenv').config();
const cors = require('cors');
const session = require('express-session');
const flash = require('connect-flash');
const redis = require('redis');
const RedisStore = require('connect-redis').default;

// Create Redis client
const redisClient = redis.createClient({
  port: 6379,
  host: 'localhost'
});

redisClient.connect().catch(console.error);

// Use environment variable or fallback to default path
const serviceAccountPath = process.env.FIREBASE_JSON || './path/to/your/firebase-service-account.json';
const serviceAccount = require(serviceAccountPath);
const app = express();
const PORT = 3000;
const { getAuth } = require('firebase-admin/auth');
app.use(cookieParser("secret"));

const allowedOrigins = ['http://localhost:3000']

app.use(cors({
  origin: allowedOrigins,
  credentials: true // needed if you're using cookies or sessions
}));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_URL
});

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'userVerification',
  resave: false,
  saveUninitialized: false,
  name: "mycookieapp",
  cookie: {
    maxAge: 60000 * 120,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

app.use(flash());

// Database reference
const db = admin.database();
module.exports = db;

// middleware

// can serve static files
app.use(express.static(path.join(__dirname, 'assets')));

// allows front end to send json
app.use(express.json());

// allows front end form submissions to sent tags with "name" attribute, stored in req.body
app.use(express.urlencoded({extended: true}));

// allows app to use ejs files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../client/views'));

// tells the server to look into these files (for the views)
app.use('/styles', express.static(path.join(__dirname, '../client/styles')));
app.use('/images', express.static(path.join(__dirname, '../client/images')));
app.use('/scripts', express.static(path.join(__dirname, '../client/scripts')));
app.use('/config', express.static(path.join(__dirname, './assets')));
app.use('/bootstrap', express.static(__dirname + '/../node_modules/bootstrap/dist'));
app.use('/flatpickr', express.static(__dirname + '/../node_modules/flatpickr/dist'));

// checks if user is logged in, to set local variables, before performing any routes
app.use(async (req, res, next) => {
  if (req.session.user?.uid) {
    // sets local variable to be used in EJS files, to see if the user is logged in or not
    res.locals.uid = req.session.user.uid;
    res.locals.email = req.session.user.email;
    if ((req.session.user.isVerified === false) && !(req.path === '/auth/verify-email'))
    {
      // redirects user if they a session has started (meaning account created), not verified, and not currently on the verify email page
      // this forces the user to stay on this page when they are not verified yet
      return res.redirect("/auth/verify-email");
    }
  }
  // prevents browser from saving data per session
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/', (req, res) => {
  res.render("homePage.ejs");
});

app.get('/about', (req, res) => {
  res.render("about.ejs");
});

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    redisUrl: process.env.REDIS_URL ? 'configured' : 'not configured'
  };

  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.ping();
      healthData.redis = 'connected';
      healthData.sessionStore = 'redis';
    } else if (redisClient) {
      healthData.redis = 'client exists but not connected';
      healthData.sessionStore = sessionStore ? (sessionStore.constructor.name === 'FileStore' ? 'file' : 'other') : 'memory';
    } else {
      healthData.redis = 'not configured';
      healthData.sessionStore = sessionStore ? (sessionStore.constructor.name === 'FileStore' ? 'file' : 'other') : 'memory';
    }
    
    res.status(200).json(healthData);
  } catch (error) {
    healthData.status = 'unhealthy';
    healthData.redis = 'error';
    healthData.error = error.message;
    healthData.sessionStore = sessionStore ? 'fallback' : 'memory';
    
    res.status(503).json(healthData);
  }
});

// Debug endpoint to check session store status
app.get('/debug/session', (req, res) => {
  res.json({
    sessionStoreType: sessionStore ? sessionStore.constructor.name : 'MemoryStore',
    redisClientExists: !!redisClient,
    redisClientOpen: redisClient ? redisClient.isOpen : false,
    redisUrl: process.env.REDIS_URL ? 'configured' : 'not configured',
    environment: process.env.NODE_ENV || 'development'
  });
});

// routes
const volunteerData = require('./assets/routes/volunteerData.js');
const loggedIn = require('./assets/middleware/loggedIn.js');
app.use("/volunteer-data", loggedIn, volunteerData);

const adminPages = require("./assets/routes/admin.js");
app.use("/admin", loggedIn, adminPages);

const loggedOut = require("./assets/middleware/loggedOut.js");
const userAuth = require("./assets/routes/auth.js");
app.use("/auth", loggedOut, userAuth);

const map = require("./assets/routes/eventMap.js");
app.use("/map", map);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send(err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, closing Redis connection...');
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, closing Redis connection...');
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log('Server running on http://localhost:'+ PORT);
  console.log('Visit /health for health check');
  console.log('Visit /debug/session for session store debug info');
});