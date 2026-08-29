const { getDetectionRules, updateDetectionRule } = require('../services/analysis/ruleEngine');

// @desc    Get configured detection rules
// @route   GET /api/rules
// @access  Private
exports.getRules = async (req, res) => {
  res.json(getDetectionRules());
};

// @desc    Update a detection rule for this server runtime
// @route   PUT /api/rules/:id
// @access  Private
exports.updateRule = async (req, res) => {
  const rule = updateDetectionRule(req.params.id, req.body);
  if (!rule) {
    return res.status(404).json({ message: 'Rule not found' });
  }

  res.json(rule);
};
