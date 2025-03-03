require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD, // Using your App Password
  },
});

const mailOptions = {
  from: process.env.EMAIL,
  to: 'your-email@gmail.com', // Replace with your personal email to test
  subject: 'Test Email from Nodemailer',
  text: 'This is a test email sent using Nodemailer and Gmail SMTP!',
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('❌ Email Sending Error:', error);
  } else {
    console.log('✅ Email Sent Successfully:', info.response);
  }
});
