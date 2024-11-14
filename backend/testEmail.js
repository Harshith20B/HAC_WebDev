const nodemailer = require('nodemailer');
require('dotenv').config(); // Ensure you load your environment variables
//trialPassHdemo@13#1
//UQEXM479CN87VMC1KEWYW1Y8
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    method: 'PLAIN' // Explicitly set the authentication method to PLAIN
  }
});

// Define the email options
const mailOptions = {
  from: process.env.EMAIL_USER,
  to: 'harsh20y@gmail.com', // Replace with the test email address
  subject: 'Test Email',
  text: 'This is a test email.'
};

// Send the email
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error sending email:', error);  // Log error to the console
    if (error.response) {
      console.error('Server response:', error.response);  // Print detailed response from the email server
    }
  } else {
    console.log('Email sent:', info.response);  // Log successful email send
  }
});
