const Analysis = require('../models/Analysis');
const Email = require('../models/Email');
const { analyzeThreatWithAI } = require('../services/aiService');

// @desc    Run optional AI intelligence over an existing rule-based analysis
// @route   POST /api/analysis/:id/ai
// @access  Private
exports.analyzeWithAI = async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found' });
    }

    const email = await Email.findById(analysis.emailId);
    if (!email) {
      return res.status(404).json({ message: 'Email not found for analysis' });
    }

    const aiResult = await analyzeThreatWithAI({
      email: email.toObject(),
      analysis: analysis.toObject()
    });

    res.json(aiResult);
  } catch (error) {
    console.error(`[-] AI analysis endpoint error: ${error.message}`);
    res.status(500).json({
      aiAvailable: false,
      available: false,
      message: 'AI analysis could not be completed. Existing rule-based analysis is unaffected.'
    });
  }
};
