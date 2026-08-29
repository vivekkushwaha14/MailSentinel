const Campaign = require('../../models/Campaign');
const { findCorrelations } = require('./correlationEngine');
const crypto = require('crypto');

/**
 * Detects and groups emails into campaigns based on correlation strength
 * @param {string} emailId - The newly analyzed email ID
 */
exports.detectCampaign = async (emailId) => {
  try {
    const correlations = await findCorrelations(emailId);
    if (correlations.length === 0) return;

    // Filter for strong correlations (e.g., sharing a suspicious domain or IP)
    const strongCorrelations = correlations.filter(c => 
      c.sharedIndicators.some(i => ['ip', 'domain', 'attachment_hash'].includes(i.type))
    );

    if (strongCorrelations.length === 0) return;

    // Check if any of the related emails already belong to a campaign
    const relatedEmailIds = strongCorrelations.map(c => c.emailId);
    let existingCampaign = await Campaign.findOne({ emails: { $in: relatedEmailIds } });

    if (existingCampaign) {
      // Add this email to existing campaign
      if (!existingCampaign.emails.includes(emailId)) {
        existingCampaign.emails.push(emailId);
        
        // Update shared indicators
        const indicators = strongCorrelations.flatMap(c => c.sharedIndicators);
        // This is a simplification; in a real app, you'd fetch the actual Indicator IDs
        
        await existingCampaign.save();
      }
    } else {
      // Create a new campaign
      const campaignId = `CAMP-${new Date().getFullYear()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      await Campaign.create({
        campaignId,
        name: `Possible Campaign ${campaignId}`,
        confidence: strongCorrelations.length > 2 ? 'high' : 'medium',
        emails: [emailId, ...relatedEmailIds],
        correlationScore: strongCorrelations.length * 10
      });
    }
  } catch (error) {
    console.error(`[-] Campaign detection error: ${error.message}`);
  }
};
