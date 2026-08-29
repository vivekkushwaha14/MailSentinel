const Indicator = require('../../models/Indicator');

/**
 * Finds emails related to a specific email based on shared indicators
 * @param {string} emailId - The email ID to find correlations for
 * @returns {Promise<Array>} - List of related emails and shared indicators
 */
exports.findCorrelations = async (emailId) => {
  try {
    // 1. Get all indicators associated with this email
    const indicators = await Indicator.find({ emails: emailId });
    if (indicators.length === 0) return [];

    const relatedEmailsMap = new Map();

    // 2. For each indicator, find other emails that share it
    for (const indicator of indicators) {
      for (const otherEmailId of indicator.emails) {
        if (otherEmailId.toString() === emailId.toString()) continue;

        const otherEmailIdStr = otherEmailId.toString();
        if (!relatedEmailsMap.has(otherEmailIdStr)) {
          relatedEmailsMap.set(otherEmailIdStr, {
            emailId: otherEmailId,
            sharedIndicators: []
          });
        }
        relatedEmailsMap.get(otherEmailIdStr).sharedIndicators.push({
          type: indicator.type,
          value: indicator.value
        });
      }
    }

    return Array.from(relatedEmailsMap.values());
  } catch (error) {
    console.error(`[-] Correlation error: ${error.message}`);
    return [];
  }
};
