const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const authRoutes = require('./routes/authRoutes');
const landmarkRoutes = require('./routes/landmarkRoutes');
const exploreRoutes = require('./routes/exploreRoutes');
const productRoutes = require('./routes/productRoutes');
const travelPlanRoutes = require('./routes/travelPlanRoutes');
const addBookmark = require('./routes/userRoutes');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Add session middleware before your routes
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your_secret_key', // Add SESSION_SECRET in .env
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // set to true if using https
  })
);

// API Routes
app.use('/api', productRoutes);
app.use('/api/travelplans', travelPlanRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/landmarks', landmarkRoutes);
app.use('/api/bookmark', addBookmark);
app.use('/api/auth', authRoutes);

// Serve static files from the React build folder
const buildPath = path.join(__dirname, 'build'); // Adjust path if needed
app.use(express.static(buildPath));

// Catch-all route to serve the frontend for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

console.log(process.env.EMAIL_USER, process.env.EMAIL_PASS); // Log the credentials

// MongoDB Connection and Server Start
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() =>
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  )
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit the process if DB connection fails
  });
