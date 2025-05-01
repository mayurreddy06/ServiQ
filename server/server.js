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

// Database reference
const db = admin.database();
module.exports = db;

// Configure view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'assets/views'));

const session = require('express-session');
const flash = require('connect-flash');
app.use(session({
  secret: 'userVerification',
  resave: true, // Changed to true to ensure session updates are saved
  saveUninitialized: false,
  cookie: {
    maxAge: 60000 * 120,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}));

// Middleware
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(flash());

// Verification code generator
function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString(); // 6-digit code
}

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

// Verify email transporter
transporter.verify((error) => {
  if (error) {
    console.error('❌ Email transporter verification failed:', error);
  } else {
    console.log('✅ Email transporter is ready');
  }
});

// Session middleware with verification sync
app.use(async (req, res, next) => {
  if (req.session.user) {
    res.locals.email = req.session.user.email;
    
    // Sync verification status from database
    try {
      const userRef = db.ref(`agency_accounts/${req.session.user.uid}`);
      const snapshot = await userRef.once('value');
      const userData = snapshot.val();
      
      if (userData) {
        res.locals.isVerified = userData.isVerified;
        req.session.user.isVerified = userData.isVerified;
      } else {
        res.locals.isVerified = false;
      }
    } catch (error) {
      console.error('Session verification check error:', error);
      res.locals.isVerified = false;
    }
  } else {
    res.locals.email = undefined;
    res.locals.isVerified = false;
  }
  
  res.set('Cache-Control', 'no-store');
  next();
});

// Enhanced verification middleware
app.use(async (req, res, next) => {
  const allowedRoutes = [
    '/', 
    '/auth/login', 
    '/auth/register',
    '/auth/verify-email',
    '/auth/resend-verification',
    '/about',
    '/auth/status',
    '/auth/logout',
    '/assets',
    '/auth/check-verification'
  ];

  // Skip verification for allowed routes
  if (allowedRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  // Check if user is logged in
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  // For unverified users, only allow access to verification flow
  if (!req.session.user.isVerified && !req.path.startsWith('/auth/verify-email')) {
    return res.redirect('/auth/verify-email');
  }

  next();
});

// Routes
const volunteerDataRouter = require('./assets/js/routes/volunteerData.js');
const rateLimiter = require('./assets/js/middleware/rateLimiter.js');
app.use("/", volunteerDataRouter);

app.get('/', (req, res) => {
  res.render("homePage.ejs");
});

app.get('/about', (req, res) => {
  res.render("about.ejs");
});

app.get('/admin/post', async (req, res) => {
  res.render("taskpost.ejs");
});

app.get('/admin/view', (req, res) => {
  res.render('viewPosts.ejs');
});

// Auth Routes
app.get('/auth/register', (req, res) => {
  const registerError = req.flash('registerError');
  res.render("signup.ejs", {registerError});
});

app.post('/auth/register', async (req, res) => {
  const {agencyName, agencyDesc, email, password, password2} = req.body;

  if (!email || !password || !agencyName || !agencyDesc) {
    req.flash('registerError', 'Not all required fields are filled out');
    return res.redirect('/auth/register');
  }

  if (!(password === (password2))) {
    req.flash('registerError', 'The passwords do not match');
    return res.redirect('/auth/register');
  }

  try {
    const verificationCode = generateVerificationCode();
    
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: agencyName,
      emailVerified: false
    });

    await db.ref(`agency_accounts/${userRecord.uid}`).set({
      email,
      name: agencyName,
      accountType: 'agency',
      agencyDescription: agencyDesc,
      createdAt: new Date().toISOString(),
      isVerified: false,
      verificationCode,
      verificationCodeExpires: Date.now() + 3600000 // 1 hour
    });

    // Send verification email
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: 'Verify Your Email',
      html: `
        <h2>Welcome to ServiQ, ${agencyName}!</h2>
        <p>Your verification code is: <strong>${verificationCode}</strong></p>
        <p>This code will expire in 1 hour.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    // Create session
    req.session.user = { 
      email,
      uid: userRecord.uid,
      isVerified: false 
    };

    return res.redirect('/auth/verify-email');
  } catch (error) {
    if (error.code == "auth/email-already-exists") {
      req.flash('registerError', 'The email is already in use by another account');
    } else if (error.code == "auth/invalid-password") {
      req.flash('registerError', 'The password must be at least 6 characters long');
    }
    return res.redirect('/auth/register');
  }
});

app.get('/auth/login', (req, res) => {
  res.render("signIn.ejs");
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // 1. First authenticate with Firebase
    const userCredential = await admin.auth().getUserByEmail(email);
    const userRecord = userCredential;

    // 2. Check database record
    const userRef = db.ref(`agency_accounts/${userRecord.uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    if (!userData) {
      return res.status(404).json({ 
        success: false,
        message: "Account not found in our system" 
      });
    }

    // 3. Create session (regardless of verification status)
    req.session.user = {
      uid: userRecord.uid,
      email: userRecord.email,
      isVerified: userData.isVerified || false
    };

    // 4. Respond based on verification status
    if (userData.isVerified) {
      return res.json({ 
        success: true,
        verified: true
      });
    } else {
      return res.json({ 
        success: true,
        verified: false,
        message: "Verification required"
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    let message = "Invalid email or password";
    
    if (error.code === 'auth/user-not-found') {
      message = "Account not found";
    } else if (error.code === 'auth/wrong-password') {
      message = "Incorrect password";
    }
    
    res.status(401).json({ 
      success: false,
      message 
    });
  }
});

// Verification Routes
app.get('/auth/verify-email', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  
  const error = req.flash('error');
  res.render('verifyEmail.ejs', { 
    email: req.session.user.email,
    userId: req.session.user.uid,
    messages: { error }
  });
});

app.post('/auth/verify-email', async (req, res) => {
  const { code } = req.body;
  const { uid } = req.session.user;

  try {
    const userRef = db.ref(`agency_accounts/${uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    if (!userData) {
      req.flash('error', 'User not found');
      return res.redirect('/auth/register');
    }

    if (userData.isVerified) {
      req.flash('error', 'Email already verified');
      return res.redirect('/');
    }

    if (userData.verificationCode !== code) {
      req.flash('error', 'Invalid verification code');
      return res.redirect('/auth/verify-email');
    }

    if (Date.now() > userData.verificationCodeExpires) {
      req.flash('error', 'Verification code has expired');
      return res.redirect('/auth/verify-email');
    }

    // Update both database and Firebase Auth
    await Promise.all([
      userRef.update({ 
        isVerified: true,
        verificationCode: null,
        verificationCodeExpires: null
      }),
      admin.auth().updateUser(uid, { emailVerified: true })
    ]);

    // Update session and ensure it's saved
    req.session.user.isVerified = true;
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
        req.flash('error', 'Session error. Please try again.');
        return res.redirect('/auth/verify-email');
      }
      return res.redirect('/admin/post');
    });

  } catch (error) {
    console.error('Verification error:', error);
    req.flash('error', 'Verification failed. Please try again.');
    return res.redirect('/auth/verify-email');
  }
});

app.post('/auth/resend-verification', async (req, res) => {
  const { uid } = req.session.user;

  try {
    const userRef = db.ref(`agency_accounts/${uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userData.isVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const newCode = generateVerificationCode();
    await userRef.update({
      verificationCode: newCode,
      verificationCodeExpires: Date.now() + 3600000
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: userData.email,
      subject: 'New Verification Code',
      html: `
        <p>Your new verification code is: <strong>${newCode}</strong></p>
        <p>This code will expire in 1 hour.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'New verification code sent' });
  } catch (error) {
    console.error('Resend error:', error);
    res.status(500).json({ error: 'Failed to resend verification code' });
  }
});

// Verification status check
app.get('/auth/check-verification', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ verified: false });
  }

  try {
    const userRef = db.ref(`agency_accounts/${req.session.user.uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();
    
    return res.json({ 
      verified: userData?.isVerified || false 
    });
  } catch (error) {
    console.error('Verification check error:', error);
    return res.status(500).json({ error: 'Verification check failed' });
  }
});

// Auth status and logout
app.get("/auth/status", (req, res) => {
  return req.session.user ? 
    res.status(200).json({user: req.session.user}) : 
    res.status(401).json({message: "user not logged in"});
});

app.get("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.clearCookie("hello");
    return res.status(200).json({message: "user successfully logged out"});
  });
});

// Volunteer registration email endpoint
app.post('/sendEmail', async (req, res) => {
  const { email, storeAddress, category, taskId} = req.body;
  
  if (!email || !storeAddress || !category || !taskId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const safeEmail = email.replace(/\./g, "_");
    const taskRef = db.ref(`volunteer_opportunities/${taskId}`);
    const taskSnapshot = await taskRef.once("value");
    const taskData = taskSnapshot.val();

    if (!taskData) {
      return res.status(401).json({ error: "Task not found" });
    }

    const registrations = taskData.registrations || {
      count: 0,
      volunteers: {}
    };

    if (registrations.volunteers[safeEmail]) {
      return res.status(400).json({ error: "Already registered for this task" });
    }

    registrations.count += 1;
    registrations.volunteers[safeEmail] = true;
    
    await taskRef.update({ registrations });

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

// Debug endpoints (can be removed in production)
app.get('/debug/session', (req, res) => {
  res.json({
    session: req.session,
    locals: res.locals
  });
});

app.get('/debug/user/:uid', async (req, res) => {
  try {
    const snapshot = await db.ref(`agency_accounts/${req.params.uid}`).once('value');
    res.json({
      dbUser: snapshot.val(),
      firebaseUser: await admin.auth().getUser(req.params.uid)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});