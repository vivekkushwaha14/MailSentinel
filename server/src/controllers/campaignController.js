const Campaign = require('../models/Campaign');
const Indicator = require('../models/Indicator');

// @desc    Get all campaigns
// @route   GET /api/campaigns
// @access  Private
exports.getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate('emails')
      .populate('cases')
      .sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get campaign details
// @route   GET /api/campaigns/:id
// @access  Private
exports.getCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('emails')
      .populate('cases');
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get campaign graph data
// @route   GET /api/campaigns/:id/graph
// @access  Private
exports.getCampaignGraph = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('emails', 'subject from date')
      .populate('cases', 'caseId title severity status');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const indicators = await Indicator.find({ emails: { $in: campaign.emails.map((email) => email._id) } });
    const nodes = [
      { id: campaign._id.toString(), label: campaign.name, type: 'campaign' },
      ...campaign.emails.map((email) => ({
        id: email._id.toString(),
        label: email.subject || 'Email',
        type: 'email',
        meta: email.from?.address
      })),
      ...indicators.map((indicator) => ({
        id: indicator._id.toString(),
        label: indicator.value,
        type: indicator.type
      }))
    ];

    const edges = [
      ...campaign.emails.map((email) => ({
        id: `${campaign._id}-${email._id}`,
        source: campaign._id.toString(),
        target: email._id.toString(),
        label: 'contains'
      })),
      ...indicators.flatMap((indicator) =>
        indicator.emails
          .filter((emailId) => campaign.emails.some((email) => email._id.toString() === emailId.toString()))
          .map((emailId) => ({
            id: `${emailId}-${indicator._id}`,
            source: emailId.toString(),
            target: indicator._id.toString(),
            label: indicator.type
          }))
      )
    ];

    res.json({ campaign, nodes, edges });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
