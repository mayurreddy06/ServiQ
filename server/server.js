const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
require('dotenv').config();

const serviceAccount = require(process.env.FIREBASE_JSON);
const app = express();
const PORT = 3002;
const { getAuth } = require('firebase-admin/auth');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'assets/views'));
app.use(cookieParser("secret"));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_URL
});
const session = require('express-session');
const flash = require('connect-flash');
app.use(session({
  secret: 'userVerification',
  resave: true,
  saveUninitialized: false,
  cookie: {
    maxAge: 60000 * 120,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
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

// routes
const volunteerData = require('./assets/js/routes/volunteerData.js');
const loggedIn = require('./assets/js/middleware/loggedIn.js');
app.use("/volunteer-data", loggedIn, volunteerData);

const adminPages = require("./assets/js/routes/admin.js");
app.use("/admin", loggedIn, adminPages);

const userAuth = require("./assets/js/routes/auth.js");
app.use("/auth", userAuth);

const map = require("./assets/js/routes/map.js");
app.use("/map", map);

// Start server
app.listen(PORT, () => {
  console.log('Server running on http://localhost:'+ PORT);
});