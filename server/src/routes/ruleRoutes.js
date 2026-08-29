const express = require('express');
const router = express.Router();
const { getRules, updateRule } = require('../controllers/ruleController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getRules);
router.put('/:id', protect, updateRule);

module.exports = router;
