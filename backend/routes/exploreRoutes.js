const express = require('express');
const router = express.Router();
const { searchLandmarks } = require('../controllers/exploreController');

router.get('/search', searchLandmarks);

module.exports = router;
