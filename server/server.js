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
const RedisStore = require('connect-redis');

// Use environment variable or fallback to default path
const serviceAccountPath = process.env.FIREBASE_JSON || './path/to/your/firebase-service-account.json';
const serviceAccount = require(serviceAccountPath);
const app = express();
const PORT = 3000;
const { getAuth } = require('firebase-admin/auth');
app.use(cookieParser("secret"));

const allowedOrigins = ['http://localhost:3000', 'https://serviq.onrender.com', 'https://serviq-volunteer.org'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true // needed if you're using cookies or sessions
}));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_URL
});

// Initialize Redis client with fallback
let redisClient = null;
let sessionStore = null;

if (process.env.REDIS_URL) {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.error('Redis server refused connection');
          return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          console.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    // Handle Redis connection events
    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    redisClient.on('ready', () => {
      console.log('Redis client ready');
    });

    redisClient.on('end', () => {
      console.log('Redis connection ended');
    });

    // Connect to Redis
    redisClient.connect().then(() => {
      console.log('Redis connection established');
      sessionStore = new RedisStore({
        client: redisClient,
        prefix: "serviq_session:",
        ttl: 7200 // 2 hours in seconds
      });
    }).catch((error) => {
      console.error('Failed to connect to Redis:', error);
      redisClient = null;
    });

  } catch (error) {
    console.error('Redis initialization failed:', error);
    redisClient = null;
  }
}

// Fallback to file-based sessions if Redis fails
if (!redisClient && process.env.NODE_ENV === 'production') {
  try {
    const FileStore = require('session-file-store')(session);
    sessionStore = new FileStore({
      path: './sessions',
      ttl: 7200,
      retries: 5,
      factor: 1,
      minTimeout: 50,
      maxTimeout: 86400
    });
    
    sessionStore.on('error', (error) => {
      console.error('Session store error:', error);
    });
    console.log('Using file-based session store as fallback');
  } catch (error) {
    console.warn('Failed to initialize FileStore, falling back to MemoryStore:', error);
    sessionStore = undefined;
  }
}

app.use(session({
  store: sessionStore,
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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    if (redisClient) {
      await redisClient.ping();
      res.status(200).json({ 
        status: 'healthy', 
        redis: 'connected',
        sessionStore: 'redis',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(200).json({ 
        status: 'healthy', 
        redis: 'not configured',
        sessionStore: sessionStore ? 'file' : 'memory',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      redis: 'disconnected',
      error: error.message,
      sessionStore: sessionStore ? 'fallback' : 'memory',
      timestamp: new Date().toISOString()
    });
  }
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
});