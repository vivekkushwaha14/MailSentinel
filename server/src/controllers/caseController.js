const Case = require('../models/Case');
const crypto = require('crypto');

// @desc    Get all cases
// @route   GET /api/cases
// @access  Private
exports.getCases = async (req, res) => {
  try {
    const cases = await Case.find()
      .populate('emails', 'subject from date createdAt')
      .populate('indicators', 'type value')
      .sort({ createdAt: -1 });
    res.json(cases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new case
// @route   POST /api/cases
// @access  Private
exports.createCase = async (req, res) => {
  const { title, description, severity } = req.body;

  try {
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Case title is required' });
    }

    const caseId = `CASE-${new Date().getFullYear()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const newCase = await Case.create({
      caseId,
      title: title.trim(),
      description,
      severity,
      notes: []
    });

    res.status(201).json(newCase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update case metadata
// @route   PUT /api/cases/:id
// @access  Private
exports.updateCase = async (req, res) => {
  const allowedUpdates = ['title', 'description', 'severity', 'status'];
  const updates = {};

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  try {
    const updatedCase = await Case.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    })
      .populate('emails', 'subject from date createdAt')
      .populate('indicators', 'type value');

    if (!updatedCase) {
      return res.status(404).json({ message: 'Case not found' });
    }

    res.json(updatedCase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get case details
// @route   GET /api/cases/:id
// @access  Private
exports.getCase = async (req, res) => {
  try {
    const singleCase = await Case.findById(req.params.id)
      .populate('emails')
      .populate('indicators');
    
    if (!singleCase) {
      return res.status(404).json({ message: 'Case not found' });
    }
    res.json(singleCase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add note to case
// @route   POST /api/cases/:id/notes
// @access  Private
exports.addNote = async (req, res) => {
  try {
    if (!req.body.note || !req.body.note.trim()) {
      return res.status(400).json({ message: 'Note is required' });
    }

    const singleCase = await Case.findById(req.params.id);
    if (!singleCase) {
      return res.status(404).json({ message: 'Case not found' });
    }

    singleCase.notes.push({
      analystId: req.user._id,
      note: req.body.note.trim()
    });

    await singleCase.save();

    const populatedCase = await Case.findById(req.params.id)
      .populate('emails')
      .populate('indicators');

    res.status(201).json(populatedCase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
