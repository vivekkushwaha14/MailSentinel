const { resolveIPIntel } = require('../services/intelligence/ipIntelligence');
const { resolveDomainIntel } = require('../services/intelligence/domainIntelligence');
const IPIntelligence = require('../models/IPIntelligence');
const DomainIntelligence = require('../models/DomainIntelligence');

// @desc    Get IP Intelligence
// @route   GET /api/intelligence/ip/:ip
// @access  Private
exports.getIPIntel = async (req, res) => {
  const { ip } = req.params;

  try {
    let intel = await IPIntelligence.findOne({ ip });

    // Cache hit and not older than 24h
    if (intel && (new Date() - intel.lastUpdated < 24 * 60 * 60 * 1000)) {
      return res.json(intel);
    }

    const resolved = await resolveIPIntel(ip);
    
    if (intel) {
      Object.assign(intel, resolved);
      await intel.save();
    } else {
      intel = await IPIntelligence.create(resolved);
    }

    res.json(intel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Domain Intelligence
// @route   GET /api/intelligence/domain/:domain
// @access  Private
exports.getDomainIntel = async (req, res) => {
  const { domain } = req.params;

  try {
    let intel = await DomainIntelligence.findOne({ domain });

    if (intel && (new Date() - intel.lastUpdated < 24 * 60 * 60 * 1000)) {
      return res.json(intel);
    }

    const resolved = await resolveDomainIntel(domain);
    
    if (intel) {
      Object.assign(intel, resolved);
      await intel.save();
    } else {
      intel = await DomainIntelligence.create(resolved);
    }

    res.json(intel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
