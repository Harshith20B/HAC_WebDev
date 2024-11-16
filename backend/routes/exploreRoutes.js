const express = require('express');
const router = express.Router();
const { getLandmarksWithImages} = require('../controllers/exploreController');

router.get('/search', getLandmarksWithImages);

module.exports = router;
