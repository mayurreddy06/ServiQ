// file for handling all back-end map operations
const express = require('express');
const map = express.Router();
const nodemailer = require('nodemailer');
const db = require('../../../server.js');

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

// sends email to user when sign up for event after clicking on a marker on 
// the map, and updates firebase with # of registrations and emails of users that signed up
map.post('/email', async (req, res) => {
    let { email, storeAddress, category, taskId} = req.body;
    email = email.toLowerCase();
  
    try {
      const taskRef = db.ref(`volunteer_opportunities/${taskId}`);
      const taskSnapshot = await taskRef.once("value");
      const taskData = taskSnapshot.val();
  
      if (!taskData) {
        return res.status(404).json({ error: "This volunteering event no longer exists" });
      }
  
      // replaces all periods with undescores, you cannot store names with periods as key values in firebase
      const underscoreEmail = email.replace(/\./g, "_");
      let registrations;
      try
      {
        // if users are signed up, the registrations field already exists in firebase
        registrations = taskData.registrations;
  
        // if the email already exists in the database in firebase, the user is already signed up
        if (registrations.volunteers[underscoreEmail]) {
          return res.status(405).json({error: "This event has already been registered for by this email"});
        }
      }
      catch(error)
      {
        // creates the registrations fields in firebase if no user is signed up
        registrations = {
          count: 0,
          volunteers: {}
        }
      }
  
      registrations.count += 1;
      registrations.volunteers[underscoreEmail] = true;
  
      // updates in firebase
      await taskRef.update({ registrations });
  
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Volunteer Registration Confirmation",
        html: `<p>You have successfully registered for a volunteer task at <b>` + storeAddress + `</b> in the <b>` + category + `</b> category.</p>
          <p>You are <b>volunteer #` + registrations.count + `</b>.</p>`,
      };
  
      await transporter.sendMail(mailOptions);
      res.status(200).json({message: "Email successfully sent and firebase database successfuly updated"});
  
    } catch (error) {
      res.status(500).json(error.message);
    }
  });

module.exports = map;