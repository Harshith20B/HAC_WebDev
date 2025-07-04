const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const landmarkRoutes = require('./routes/landmarkRoutes');
const exploreRoutes = require('./routes/exploreRoutes');
const productRoutes = require('./routes/productRoutes');
const travelPlanRoutes = require('./routes/travelPlanRoutes');
const userRoutes = require('./routes/userRoutes');
const postsRoutes = require('./routes/postsRoutes');

dotenv.config();
const app = express();

// ======== ALLOW ALL ORIGINS WITH CREDENTIALS =========
app.use(cors({
  origin: (origin, callback) => {
    callback(null, origin || '*');
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

// Increase JSON body limit for media
app.use(express.json({ limit: '50mb' }));

// Add security headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  next();
});

// API Routes
app.use('/api', productRoutes);
app.use('/api/travelplans', travelPlanRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/landmarks', landmarkRoutes);
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/social', postsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Serve static files and handle frontend routes
const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// MongoDB Connection and Server Start
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() =>
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  )
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
