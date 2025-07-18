// this file is currently not in use, but was previously used to test the nodemailer library initially
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const mailOptions = {
  from: process.env.EMAIL,
  to: 'your-email@gmail.com',
  subject: 'Test Email from Nodemailer',
  text: 'This is a test email sent using Nodemailer and Gmail SMTP!',
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Email Sending Error:', error);
  } else {
    console.log('Email Sent Successfully:', info.response);
  }
});
