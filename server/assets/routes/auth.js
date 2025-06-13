// file for handling account creation, user login with or without google, and sending email verification codes
const express = require('express');
const auth = express.Router();
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Get database directly from Firebase admin instead of importing from server.js
const db = admin.database();

// verification code generator for verifying email
function generateVerificationCode() {
  // generates 6 digit code
  return crypto.randomInt(100000, 999999).toString();
}

// nodemailer library email configuration
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

// Middleware to verify Firebase ID token
async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({error: "No authentication token provided"});
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Add user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({error: "Invalid authentication token"});
  }
}

auth.post("/google/verify", async (req, res) => {
  try {
    const {uid, email} = req.body;
    const userRef = db.ref(`agency_accounts/${uid}`);
    const snapshot = await userRef.once("value");
    
    if (!(snapshot.exists())) {
      // Store temporary data in a temporary collection or return it to frontend
      return res.status(406).json({
        error: "Google user does not exist in the database",
        needsSetup: true,
        tempData: {uid, email}
      });
    }

    // User exists, they can proceed
    return res.status(200).json({
      message: "Google user exists in the database",
      user: {uid, email, isVerified: true}
    });
    
  } catch(error) {
    console.error(error);
    return res.status(500).json({error: "Internal server error when trying to verify google account in database"});
  }
});

auth.get("/google", async (req, res) => {
  res.render("googleSignUp.ejs");
});

auth.post("/google", async (req, res) => {
  try {
    const { agencyName, agencyDesc, uid, email } = req.body;
  
    // adds google account directly in firebase database with agency name and description
    await db.ref(`agency_accounts/${uid}`).set({
      email: email,
      name: agencyName,
      accountType: 'agency',
      agencyDescription: agencyDesc,
      createdAt: new Date().toISOString()
    });

    res.status(200).json({message: "User information successfully stored in firebase"});
  } catch (error) {
    console.error('Google signup error:', error);
    res.status(500).json({error: "Failed to create account"});
  }
});
  
auth.get('/register', (req, res) => {
  res.render("signup.ejs");
});
  
auth.post('/register', async (req, res) => {
  const {agencyName, agencyDesc, email, password, password2} = req.body;

  if (!email || !password || !password2 || !agencyName || !agencyDesc) {
    return res.status(400).json({error: 'Not all required fields are filled out'});
  }

  // check if passwords match
  if (!(password === (password2))) {
    return res.status(400).json({error: 'The passwords do not match'});
  }

  try {
    const verificationCode = generateVerificationCode();
    
    // creates user in firebase authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: agencyName,
      emailVerified: false
    });

    // adds account to database
    await db.ref(`agency_accounts/${userRecord.uid}`).set({
      email,
      name: agencyName,
      accountType: 'agency',
      agencyDescription: agencyDesc,
      createdAt: new Date().toISOString(),
      isVerified: false,
      verificationCode,
      // verification code expires in 1 hour
      verificationCodeExpires: Date.now() + 3600000
    });

    // send email using nodemailer
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

    // redirects so user verifies email
    return res.status(200).json({message: "User account successfully created"});
  } catch (error) {
    console.log(error);
    if (error.code == "auth/email-already-exists") 
    {
      return res.status(400).json({error: 'This email is already in use by another account'});
      req.flash('registerError', 'The email is already in use by another account');
    } 
    else if (error.code == "auth/invalid-password") 
    {
      return res.status(400).json({error: 'The password must be atleast 6 characters long'});
      req.flash('registerError', 'The password must be at least 6 characters long');
    }
    else
    {
      return res.status(400).json({error: 'Password does not meet requirements or internal server error'});
    }
  }
});

auth.get('/login', (req, res) => {
  res.render("signIn.ejs");
});
  
auth.post('/login', async (req, res) => {
  try {
    // Get the ID token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({error: "No authentication token provided"});
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const emailVerified = decodedToken.email_verified;

    // Check if user exists in database
    const userRef = db.ref(`agency_accounts/${uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    if (!userData) {
      return res.status(404).json({error: "User does not exist in Firebase"});
    }

    return res.status(200).json({message: "User successfully logged in"});

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({error: "Authentication failed: " + error.message});
  }
});
  
auth.get('/verify-email', (req, res) => {
  res.render('verifyEmail.ejs');
});
  
auth.post('/verify-email', verifyFirebaseToken, async (req, res) => {
  const { code } = req.body;
  const { uid } = req.user;

  try {
    // checks if user is in the database
    const userRef = db.ref(`agency_accounts/${uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();
    
    if (!userData) {
      return res.status(400).json({error: "User does not exist"});
    }

    if (userData.isVerified) {
      return res.status(400).json({error: "User has already been verified"});
    }

    if (userData.verificationCode !== code) {
      return res.status(406).json({error: "Invalid verification code"});
    }

    if (Date.now() > userData.verificationCodeExpires) {
      return res.status(406).json({error: "Verification code has expired"});
    }

   // updates firebase database and the authentication system
    await Promise.all([
      userRef.update({ 
        isVerified: true,
        verificationCode: null,
        verificationCodeExpires: null
      }),
      admin.auth().updateUser(uid, { emailVerified: true })
    ]);

    return res.status(200).json({message: "User email has been successfully verified"});

  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({error: "Internal server error"});
  }
});
  
auth.get('/resend-verification', verifyFirebaseToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    // checks database to see if user exists
    const userRef = db.ref(`agency_accounts/${uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userData.isVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // creates new verification code
    const newCode = generateVerificationCode();
    await userRef.update({
      verificationCode: newCode,
      verificationCodeExpires: Date.now() + 3600000
    });

    // sends new verification code with nodemailer
    const mailOptions = {
      from: process.env.EMAIL,
      to: userData.email,
      subject: 'New Verification Code',
      html: `<p>Your new verification code is: <b>${newCode}</b></p> <p>This code will expire in 1 hour.</p>`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({message: "New verification code successfully sent"});
  } catch (error) {
    console.log("internal server error " + error);
    res.status(500).json({error: "Failed to resend verification code"});
  }
});

// Get user status - requires authentication
auth.get("/status", verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    
    // Get user data from database
    const userRef = db.ref(`agency_accounts/${uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();
    
    if (!userData) {
      return res.status(404).json({error: "User not found in database"});
    }
    
    return res.status(200).json({
      uid: uid,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({error: "Failed to get user status"});
  }
});

// No logout route needed - frontend handles Firebase auth logout

module.exports = auth;