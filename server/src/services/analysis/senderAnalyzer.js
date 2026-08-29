const { calculateSimilarity, normalizeChars } = require('../../utils/similarity');

// Common target brands for lookalike detection
const TARGET_BRANDS = [
  'microsoft', 'google', 'apple', 'amazon', 'paypal', 'netflix', 
  'facebook', 'instagram', 'linkedin', 'twitter', 'outlook', 'office365',
  'bankofamerica', 'chase', 'wellsfargo', 'adobe', 'docusign', 'github',
  'dropbox', 'salesforce', 'stripe', 'zoom', 'slack'
];

/**
 * Analyzes sender identity and domain similarity
 * @param {Object} emailData - Parsed email data
 * @returns {Object} - Sender analysis results
 */
exports.analyzeSender = (emailData) => {
  const { from, replyTo, returnPath } = emailData;
  const results = {
    displayNameSpoofing: false,
    replyToMismatch: false,
    returnPathMismatch: false,
    lookalikeDomainDetected: false,
    targetBrand: null,
    similarityScore: 0,
    brandSignals: []
  };

  // 1. Display Name Spoofing
  // e.g. "Microsoft Security <hacker@evil.com>"
  const displayName = (from.name || '').toLowerCase();
  const fromAddress = (from.address || '').toLowerCase();
  const fromDomain = (from.domain || '').toLowerCase();
  
  const suspiciousNamePatterns = ['security', 'support', 'admin', 'verify', 'billing', 'account'];
  if (suspiciousNamePatterns.some(p => displayName.includes(p)) && !fromAddress.includes(displayName.split(' ')[0])) {
    results.displayNameSpoofing = true;
    results.brandSignals.push('SECURITY_WORDING_DISPLAY_NAME');
  }

  // 2. Reply-To Mismatch
  if (replyTo && replyTo.address.toLowerCase() !== fromAddress) {
    // Flag if domains are different
    if ((replyTo.domain || '').toLowerCase() !== fromDomain) {
      results.replyToMismatch = true;
    }
  }

  if (returnPath?.domain && returnPath.domain.toLowerCase() !== fromDomain) {
    results.returnPathMismatch = true;
  }

  // 3. Lookalike Domain Detection
  const senderDomain = fromDomain.split('.')[0];
  const normalizedSenderDomain = normalizeChars(senderDomain);

  for (const brand of TARGET_BRANDS) {
    const similarity = calculateSimilarity(normalizedSenderDomain, brand);
    const displayNameMentionsBrand = displayName.includes(brand);

    if ((similarity > 0.78 && senderDomain !== brand) || (displayNameMentionsBrand && !fromDomain.includes(brand))) {
      results.lookalikeDomainDetected = true;
      results.targetBrand = brand;
      results.similarityScore = Math.round(similarity * 100);
      results.brandSignals.push(displayNameMentionsBrand ? 'DISPLAY_NAME_BRAND_MISMATCH' : 'DOMAIN_SIMILARITY');
      break;
    }
  }

  return results;
};
