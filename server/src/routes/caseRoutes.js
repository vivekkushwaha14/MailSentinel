const express = require('express');
const router = express.Router();
const { getCases, createCase, updateCase, getCase, addNote } = require('../controllers/caseController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getCases);
router.post('/', protect, createCase);
router.put('/:id', protect, updateCase);
router.get('/:id', protect, getCase);
router.post('/:id/notes', protect, addNote);

module.exports = router;
