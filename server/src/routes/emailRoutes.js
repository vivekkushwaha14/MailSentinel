const express = require('express');
const router = express.Router();
const { getEmails, uploadEmail, getEmail, updateVerdict } = require('../controllers/emailController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', protect, getEmails);
router.post('/upload', protect, upload.single('email'), uploadEmail);
router.put('/:id/verdict', protect, updateVerdict);
router.get('/:id', protect, getEmail);

module.exports = router;
