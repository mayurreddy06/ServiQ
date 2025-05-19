// file for handling account creation, user login with or without google, and sending email verification codes
const express = require('express');
const auth = express.Router();
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('../../server.js');


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

auth.get("/google", async (req, res) => {
    const { email, uid } = req.query;
    const userRef = db.ref(`agency_accounts/${uid}`);
    const snapshot = await userRef.once("value");
  
    if (snapshot.exists()) {
      req.session.user = {
        uid,
        email,
        isVerified: true
      };
      // redirects back to the homepage, successfully logs in user
      return res.redirect("/");
    } else {
      // if this is the users first time logging in with this google account, it has them redirect to POST to create agency name and description
      return res.render("googleSignUp.ejs");
    }
  });
  
  auth.post("/google", async (req, res) => {
    // found in googlesignup.ejs
    const { agencyName, agencyDesc, uid, email } = req.body;
  
    // adds google account directly in firebase database with agency name and description
    await db.ref(`agency_accounts/${uid}`).set({
      email,
      name: agencyName,
      accountType: 'agency',
      agencyDescription: agencyDesc,
      createdAt: new Date().toISOString()
    });
  
    req.session.user = {
      uid,
      email,
      isVerified: true
    };
    res.status(200).json({message: "User information successfully stored in firebase"});
  
  });
  
  auth.get('/register', (req, res) => {
    // flash message for register errors encountered
    const registerError = req.flash('registerError');
    res.render("signup.ejs", {registerError});
  });
  
  auth.post('/register', async (req, res) => {
    const {agencyName, agencyDesc, email, password, password2} = req.body;
  
    if (!email || !password || !password2 || !agencyName || !agencyDesc) {
      req.flash('registerError', 'Not all required fields are filled out');
      return res.redirect('/auth/register');
    }
  
    // check if passwords match
    if (!(password === (password2))) {
      req.flash('registerError', 'The passwords do not match');
      return res.redirect('/auth/register');
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
  
      req.session.user = { 
        email,
        uid: userRecord.uid,
        isVerified: false 
      };
  
      // redirects so user verifies email
      return res.redirect('/auth/verify-email');
    } catch (error) {
      console.log(error);
      if (error.code == "auth/email-already-exists") 
      {
        req.flash('registerError', 'The email is already in use by another account');
      } 
      else if (error.code == "auth/invalid-password") 
      {
        req.flash('registerError', 'The password must be at least 6 characters long');
      }
      else
      {
        req.flash('registerError', 'Password does not meet requirements or internal sever error');
      }
      return res.redirect('/auth/register');
    }
  });
  
  auth.get('/login', (req, res) => {
    res.render("signIn.ejs");
  });
  
  auth.post('/login', async (req, res) => {
    const {email} = req.body;
    console.log(email);
    
    try {
      // user authentication directly with Firebase's authentication system
      const userCredential = await admin.auth().getUserByEmail(email);
      const userRecord = userCredential;
  
      // check if user exists in database
      const userRef = db.ref(`agency_accounts/${userRecord.uid}`);
      const snapshot = await userRef.once('value');
      const userData = snapshot.val();
  
      if (!userData) {
        return res.status(404).json({error: "User does not exist in Firebase"});
      }
  
      // create session
      req.session.user = {
        uid: userRecord.uid,
        email: userRecord.email,
        isVerified: userData.isVerified || false
      };
  
      return res.status(200).json({message: "User successfully logged in"});
  
    } catch (error) {
      return res.status(500).json({error: "Internal server error" + error});
    }
  });
  
  
  auth.get('/verify-email', (req, res) => {
    const emailVerifyError = req.flash('emailVerifyError');
    res.render('verifyEmail.ejs', {emailVerifyError});
  });
  
  auth.post('/verify-email', async (req, res) => {
    const { code } = req.body;
    const { uid } = req.session.user;
  
    try {
      // checks if user is in the database
      const userRef = db.ref(`agency_accounts/${uid}`);
      const snapshot = await userRef.once('value');
      const userData = snapshot.val();
      if (!userData) {
        // redirect user if doesn't exist
        return res.redirect('/auth/register');
      }
  
      if (userData.isVerified) {
        // redirect user if already verified
        return res.redirect('/');
      }
  
      if (userData.verificationCode !== code) {
        req.flash('emailVerifyError', 'Invalid verification code');
        return res.redirect('/auth/verify-email');
      }
  
      if (Date.now() > userData.verificationCodeExpires) {
        req.flash('emailVerifyError', 'Verification code has expired');
        return res.redirect('/auth/verify-email');
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
  
      req.session.user.isVerified = true;
  
      // redirects back to homepage, automatically logging in the user since the session is already created
      return res.redirect("/");
  
    } catch (error) {
      console.error('Verification error:', error);
      req.flash('emailVerifyError', 'Verification failed. Please try again.');
      return res.redirect('/auth/verify-email');
    }
  });
  
  // not working no idea why???
  auth.get('/resend-verification', async (req, res) => {
    const uid = req.session.user.uid;
  
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
        html: `<p>Your new verification code is: <b>` + newCode + `</b></p> <p>This code will expire in 1 hour.</p>
        `
      };
  
      await transporter.sendMail(mailOptions);
      res.status(200).json({message: "New verficiation code successfuly sent"});
    } catch (error) {
      console.log("internal server error " + error);
      res.status(500).json({error});
    }
  });
  
  // direct front end access of checking if the user is logged in
  auth.get("/status", (req, res) => {
    return req.session.user ? res.status(200).json({uid: req.session.user.uid}) : res.status(401).json({error: "User not logged in"});
  });
  
  // logs user out by destorying the session
  auth.get("/logout", (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        return res.status(401).json({error: error});
      }
      return res.status(200).json({message: "user successfully logged out"});
    });
  });

module.exports = auth;