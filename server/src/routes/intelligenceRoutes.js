const express = require('express');
const router = express.Router();
const { getIPIntel, getDomainIntel } = require('../controllers/intelligenceController');
const { protect } = require('../middleware/authMiddleware');

router.get('/ip/:ip', protect, getIPIntel);
router.get('/domain/:domain', protect, getDomainIntel);

module.exports = router;
