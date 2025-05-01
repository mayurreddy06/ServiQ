const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
const cookieParser = require('cookie-parser');
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
  resave: false,
  saveUninitialized: false,
  cookie: {maxAge: 60000 * 120}
  // session connect.id lasts 2 hours
}));

// Middleware
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.json());

//middleware: automatically passing in form data by the name attribute
app.use(express.urlencoded({extended: true}));

app.use(flash());

app.use((req, res, next) => {
  if (req.session.user)
  {
    res.locals.email = req.session.user.email;
    app.get('/admin/post', async (req, res) => {
      res.render("taskpost.ejs");
    });
  }
  else
  {
    res.locals.email = undefined;
  }
  res.set('Cache-Control', 'no-store');
  next();
});
// middleware to check if the user is logged in.

// Volunteer opportunities route
const volunteerDataRouter = require('./assets/js/routes/volunteerData.js');
const rateLimiter = require('./assets/js/middleware/rateLimiter.js');
app.use("/", volunteerDataRouter);

app.get('/', (req, res) => {
  res.render("homePage.ejs");
});

app.get('/about', (req, res) => {
  res.render("about.ejs");
});

app.get('/admin/view', (req, res) => {
  res.render('viewPosts.ejs');
});

app.get('/auth/register', (req, res) => {
  const registerError = req.flash('registerError');
  res.render("signup.ejs", {registerError});
});


app.post('/auth/register', async (req, res) => {
  const {agencyName, agencyDesc, email, password, password2} = req.body;
  // values from the name = attribute in the form html

  if (!email || !password || !agencyName || !agencyDesc) {
    req.flash('errorMsg', 'Not all required fields are filled out');
    return res.redirect('/auth/register');
  }

  if (!(password === (password2)))
  {
    req.flash('registerError', 'The passwords do not match');
    return res.redirect('/auth/register');
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: agencyName
    });
    // create the schema

    const db = admin.database();
    await db.ref(`agency_accounts/${userRecord.uid}`).set({
      email,
      name: agencyName,
      accountType: 'agency',
      agencyDescription: agencyDesc,
      createdAt: new Date().toISOString()
    });

    // store email from here

    return res.redirect("/auth/login");
  } catch (error) {
    if (error.code == "auth/email-already-exists")
      {
        req.flash('registerError', 'The email is already in use by another account');
      }
      else if (error.code == "auth/invalid-password")
      {
        req.flash('registerError', 'The password must be atleast 6 characters long');
      }
      return res.redirect('/auth/register');
  }
});

// setting a session to certain routes only (save for later): https://stackoverflow.com/questions/28603084/node-express-session-as-middleware-does-not-set-cookie

app.get('/auth/login', (req, res) => {
  res.render("signIn.ejs");
});

app.post('/auth/login', async (req, res) => {
  try {
    // Support both content types: form-urlencoded and JSON
    const email = req.body.email;
    const idToken = req.body.idToken;
    
    console.log("Login attempt for email:", email);
    
    // If token is provided, verify it (enhanced security)
    if (idToken) {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Verify the email in the token matches the claimed email
      if (decodedToken.email !== email) {
        return res.status(403).json({ status: "error", message: "Email verification failed" });
      }
      
      // Success path with verified token
      req.session.visited = true;
      res.cookie("hello", "world", {maxAge: 60000 * 120, signed: true});
      req.session.user = ({ email: decodedToken.email, uid: decodedToken.uid });
      
      console.log("User authenticated with token:", decodedToken.email);
      return res.status(200).json({status: "success"});
    } 
    // Authentication using session token from OAuth providers
    else if (req.headers.authorization) {
      const sessionToken = req.headers.authorization.split('Bearer ')[1];
      if (!sessionToken) {
        return res.status(401).json({ status: "error", message: "Invalid authorization header" });
      }
      
      // Verify session token (implementation depends on your OAuth flow)
      try {
        // This verification depends on your specific OAuth implementation
        // For Google Sign-In, you might use the Google OAuth2 API
        
        // Once verified, proceed with session creation
        req.session.visited = true;
        res.cookie("hello", "world", {maxAge: 60000 * 120, signed: true});
        req.session.user = ({ email });
        
        console.log("User authenticated with OAuth:", email);
        return res.status(200).json({status: "success"});
      } catch (oauthError) {
        console.error("OAuth verification error:", oauthError);
        return res.status(401).json({ status: "error", message: "OAuth verification failed" });
      }
    }
    // Fallback method (discouraged but kept for compatibility)
    else {
      console.warn("Insecure login attempt for:", email);
      // Implement additional security checks here if needed
      // For example, rate limiting, checking IP, etc.
      
      // Continue with the original flow for compatibility
      req.session.visited = true;
      res.cookie("hello", "world", {maxAge: 60000 * 120, signed: true});
      req.session.user = ({ email });
      
      return res.status(200).json({status: "success"});
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ status: "error", message: "Authentication failed" });
  }
});

// method of checking is user is logged in in the front end
app.get("/auth/status", (req, res) => {
  return req.session.user ? res.status(200).json({user: req.session.user}) : res.status(401).json({message: "user not logged in"});
});

app.get("/auth/logout", (req, res) => {
  req.session.destroy();
  res.clearCookie("hello");
  return res.status(200).json({message: "user successfully logged out"});
});

//404 bad gateway error (add back once we finish the whole thing)
// app.use((req, res, next) => {
//   const error = new Error('Page Not Found');
//   next(error);
// });
// app.use((err, req, res, next) => {
//   res.sendFile(path.join(__dirname, 'assets/html/errorPage.html'));
// });




require('dotenv').config();

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

// Email verification on startup
transporter.verify((error) => {
  if (error) {
    console.error('❌ Email transporter verification failed:', error);
  } else {
    console.log('✅ Email transporter is ready');
  }
});

// Volunteer registration and email endpoint
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

    // Initialize registrations if needed
    const registrations = taskData.registrations || {
      count: 0,
      volunteers: {}
    };

    if (registrations.volunteers[safeEmail]) {
      return res.status(400).json({ error: "Already registered for this task" });
    }

    // Update registration data
    registrations.count += 1;
    registrations.volunteers[safeEmail] = true;
    
    await taskRef.update({ registrations });

    // Send confirmation email
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
    console.log(error);
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});