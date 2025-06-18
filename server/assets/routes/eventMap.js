// file for handling all back-end map operations
const express = require('express');
const map = express.Router();
const nodemailer = require('nodemailer');
const db = require('../../server.js');

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
    let { email, storeAddress, taskId, task, description, start_time, end_time, date, external} = req.body;
    email = email.toLowerCase();
    start_time = convertTime(start_time)
    end_time = convertTime(end_time)

    // found on regex website
    const emailRegex = /^(?:(?:[\w`~!#$%^&*\-=+;:{}'|,?\/]+(?:(?:\.(?:"(?:\\?[\w`~!#$%^&*\-=+;:{}'|,?\/\.()<>\[\] @]|\\"|\\\\)*"|[\w`~!#$%^&*\-=+;:{}'|,?\/]+))*\.[\w`~!#$%^&*\-=+;:{}'|,?\/]+)?)|(?:"(?:\\?[\w`~!#$%^&*\-=+;:{}'|,?\/\.()<>\[\] @]|\\"|\\\\)+"))@(?:[a-zA-Z\d\-]+(?:\.[a-zA-Z\d\-]+)*|\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\])$/;
    if (!(emailRegex.test(email)))
    {
      return res.status(400).json({error: "Not a valid email"});
    }
  
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
          return res.status(405).json({error: "Email has already been sent under this google account"});
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
  subject: "Volunteer Opportunity: " + task,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      
      <!-- Header -->
      <div style="background-color: #4CAF50; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">
          Volunteer Opportunity
        </h1>
        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">
          ${task}
        </p>
      </div>

      <!-- Content -->
      <div style="padding: 30px;">
        
        <!-- Description -->
        <div style="margin-bottom: 25px;">
          <h2 style="color: #333; margin: 0 0 10px 0; font-size: 18px; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">
            Description
          </h2>
          <p style="color: #666; margin: 0; font-size: 16px; line-height: 1.5;">
            ${description}
          </p>
        </div>

        <!-- Location -->
        <div style="margin-bottom: 25px;">
          <h2 style="color: #333; margin: 0 0 10px 0; font-size: 18px; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">
            Location
          </h2>
          <p style="color: #666; margin: 0; font-size: 16px; line-height: 1.5;">
            ${storeAddress}
          </p>
        </div>

        <!-- Date -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #333; margin: 0 0 10px 0; font-size: 18px; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">
            Date & Time
          </h2>
          <p style="color: #666; margin: 0; font-size: 16px; line-height: 1.5; font-weight: bold;">
            ${date} at ${start_time} to ${end_time}
          </p>
        </div>

        <!-- Link Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${external}" style="background-color: #4CAF50; color: white; text-decoration: none; padding: 15px 30px; font-size: 16px; font-weight: bold;">
            View More Details
          </a>
        </div>

      </div>

      <!-- Footer -->
      <div style="background-color: #333; color: white; text-align: center; padding: 20px;">
        <p style="margin: 0; font-size: 14px;">
          Thank you for volunteering with us!
        </p>
      </div>
    </div>
  `
};
  
      await transporter.sendMail(mailOptions);
      res.status(200).json({message: "Email successfully sent and firebase database successfully updated"});
  
    } catch (error) {
      res.status(500).json(error.message);
      console.log(error);
    }
  });

function convertTime(militaryTime) {
  // Split the time into hours and minutes
  const parts = militaryTime.split(":");
  const hour = parseInt(parts[0]);
  const minute = parts[1];

  // Determine if it's AM or PM
  let period = "AM";
  if (hour >= 12) {
    period = "PM";
  }

  // Convert to 12-hour format
  let standardHour = hour % 12;
  if (standardHour === 0) {
    standardHour = 12;
  }

  // Return the final result
  return standardHour + ":" + minute + " " + period;
}

module.exports = map;