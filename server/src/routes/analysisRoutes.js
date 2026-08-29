const express = require('express');
const router = express.Router();
const { analyzeWithAI } = require('../controllers/analysisController');
const { protect } = require('../middleware/authMiddleware');

router.post('/:id/ai', protect, analyzeWithAI);

module.exports = router;
