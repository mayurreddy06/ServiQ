// file for handling account creation, user login with or without google, and sending email verification codes
const express = require('express');
const auth = express.Router();
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

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

auth.post("/google/verify", async (req, res) => {
  try {
    const {uid, email} = req.body;
    const userRef = db.ref(`agency_accounts/${uid}`);
    const snapshot = await userRef.once("value");
    
    if (!(snapshot.exists())) {
      return res.status(406).json({error: "Google user does not exist in the database"});
    }
    // CREATE JWT COOKIE HERE
    const jwtPayload = {
      uid: uid,
      email: email,
      isVerified: true
    };

    const jwtToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, { 
      expiresIn: '24h' 
    });

    // Set HTTP-only cookie
    res.cookie('authToken', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    });

    // User exists, they can proceed
    return res.status(200).json({message: "Google exists in firebase"});
    
  } catch(error) {
    console.error(error);
    return res.status(500).json({error: "Internal server error when trying to verify google account in database"});
  }
});

auth.get("/google", async (req, res) => {
  res.render("googleSignUp.ejs");
});

auth.post("/google/create", async (req, res) => {
  try {
    const { agencyName, agencyDesc, email, uid} = req.body;
  
    // adds google account directly in firebase database with agency name and description
    await db.ref(`agency_accounts/${uid}`).set({
      email: email,
      name: agencyName,
      accountType: 'agency',
      agencyDescription: agencyDesc,
      createdAt: new Date().toISOString()
    });

    // do not need to create JWT cookies in register proccess, will redirect to login directly instead
    // // CREATE JWT COOKIE HERE
    // const jwtPayload = {
    //   uid: uid,
    //   email: email,
    //   isVerified: true
    // };

    // const jwtToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, { 
    //   expiresIn: '24h' 
    // });

    // // Set HTTP-only cookie
    // res.cookie('authToken', jwtToken, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   maxAge: 24 * 60 * 60 * 1000, // 24 hours
    //   sameSite: 'lax'
    // });

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
    // creates user in firebase authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: agencyName,
      emailVerified: false
    });

    // adds account to database immediately (user can login but with limited access until verified)
    await db.ref(`agency_accounts/${userRecord.uid}`).set({
      email,
      name: agencyName,
      accountType: 'agency',
      agencyDescription: agencyDesc,
      createdAt: new Date().toISOString(),
      isVerified: false
    });
    // EMAIL VERIFICATION CODE keep if want to re-implement later


    // // Generate email verification link (Firebase handles this)
    // const actionCodeSettings = {
    //   // url: `${process.env.FRONTEND_URL}/auth/login`,
    //   url: `http://localhost:3000/auth/login`, // Redirect after verification
    //   handleCodeInApp: false,
    // };

    // const emailVerificationLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

    // Send custom email with verification link
    // const mailOptions = {
    //   from: process.env.EMAIL,
    //   to: email,
    //   subject: 'Verify Your Email',
    //   html: `
    //     <h2>Welcome to ServiQ, ${agencyName}!</h2>
    //     <p>Please click the link below to verify your email address:</p>
    //     <a href="${emailVerificationLink}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">Verify Email</a>
    //     <p>Or copy and paste this link in your browser:</p>
    //     <p>${emailVerificationLink}</p>
    //   `
    // };

    // await transporter.sendMail(mailOptions);

    return res.status(200).json({message: "User account successfully created"});
  } catch (error) {
    console.log(error);
    if (error.code == "auth/email-already-exists") {
      return res.status(400).json({error: 'The email is already in use by another account'});
    } 
    else if (error.code == "auth/invalid-password") {
      return res.status(400).json({error: 'The password must be at least 6 characters long'});
    }
    else {
      return res.status(400).json({error: 'Password does not meet requirements or internal sever error'});
    }
  }
});

// auth.get('/agency', async (req, res) => {
  
// })

auth.get('/login', (req, res) => {
  res.render("signIn.ejs");
});

// Update your existing login route
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

    // Update database verification status based on Firebase Auth
    if (emailVerified && !userData.isVerified) {
      await userRef.update({ isVerified: true });
    }

    // CREATE JWT COOKIE HERE
    const jwtPayload = {
      uid: uid,
      email: email,
      isVerified: emailVerified || userData.isVerified
    };

    const jwtToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, { 
      expiresIn: '24h' 
    });

    // Set HTTP-only cookie
    res.cookie('authToken', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    });

    return res.status(200).json({message: "User successfully logged in"});

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({error: "Authentication failed: " + error.message});
  }
});

// Add logout route to clear cookie
auth.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.status(200).json({message: "Logged out successfully"});
});
  
// No longer needed - Firebase handles email verification
auth.get('/verify-email', (req, res) => {
  res.render('verifyEmail.ejs');
});
  
// No longer needed - Firebase handles email verification
auth.post('/verify-email', async (req, res) => {
  return res.status(400).json({error: "Email verification is handled by Firebase directly"});
});
  
// Resend verification email using Firebase
auth.post('/resend-verification', async (req, res) => {
  const { uid, email } = req.user;

  try {
    // Check if already verified
    if (req.user.emailVerified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate new verification link
    const actionCodeSettings = {
      url: `${process.env.FRONTEND_URL}/auth/login`,
      handleCodeInApp: false,
    };

    const emailVerificationLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

    // Get user data for name
    const userRef = db.ref(`agency_accounts/${uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    // Send new verification email
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: 'New Verification Link',
      html: `
        <h2>Hello ${userData?.name || 'User'}!</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="${emailVerificationLink}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">Verify Email</a>
        <p>Or copy and paste this link in your browser:</p>
        <p>${emailVerificationLink}</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({message: "New verification code successfully sent"});
  } catch (error) {
    console.log("internal server error " + error);
    res.status(500).json({error: "Failed to resend verification code"});
  }
});

// Get user status - requires authentication
auth.get("/status", async (req, res) => {
  try {
    const uid = res.locals.uid;
    console.log(uid);
    
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