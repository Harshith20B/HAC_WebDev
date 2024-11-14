const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes'); // Correct import
require('dotenv').config();
const app = express();

app.use(cors());
app.use(express.json());
const session = require('express-session');

// Add session middleware before your routes
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_secret_key', // Add SESSION_SECRET in .env
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true if using https
  })
);

app.use('/api/auth', authRoutes);  // Use the routes for authentication
console.log(process.env.EMAIL_USER, process.env.EMAIL_PASS);  // Log the credentials
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1); // Exit the process if DB connection fails
  });
