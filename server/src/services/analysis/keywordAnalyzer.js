const KEYWORD_RULES = [
  {
    category: 'urgency',
    keywords: ['urgent', 'immediately', 'action required', 'act now', 'final notice', 'expires today', 'last warning', 'within 24 hours', 'account will be blocked'],
    severity: 'medium',
    score: 5
  },
  {
    category: 'credential-harvesting',
    keywords: ['verify account', 'verify your identity', 'login', 'sign in', 'password', 'username', 'credentials', 'authentication', 'confirm identity', 'security verification'],
    severity: 'high',
    score: 8
  },
  {
    category: 'financial-fraud',
    keywords: ['payment', 'invoice', 'bank account', 'wire transfer', 'beneficiary', 'refund', 'transaction', 'billing', 'credit card', 'debit card', 'upi'],
    severity: 'medium',
    score: 6
  },
  {
    category: 'subscription-scam',
    keywords: ['subscription', 'subscribe', 'renewal', 'renew', 'membership', 'expired', 'expiration', 'payment failed', 'billing issue'],
    severity: 'medium',
    score: 4
  },
  {
    category: 'bec',
    keywords: ['ceo', 'cfo', 'director', 'manager', 'executive', 'confidential', 'urgent payment', 'transfer immediately', 'gift card'],
    severity: 'high',
    score: 10
  }
];

/**
 * Analyzes email body for suspicious keywords and patterns
 * @param {string} text - Plain text email body
 * @returns {Array} - Detected keyword indicators
 */
exports.analyzeKeywords = (text) => {
  if (!text) return [];

  const detections = [];
  const lowerText = text.toLowerCase();

  KEYWORD_RULES.forEach(rule => {
    rule.keywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        detections.push({
          category: rule.category,
          matchedText: keyword,
          severity: rule.severity,
          explanation: `Detected keyword associated with ${rule.category}: "${keyword}"`,
          scoreImpact: rule.score
        });
      }
    });
  });

  return detections;
};
