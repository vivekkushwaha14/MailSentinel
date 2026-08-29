const { scoreForRule } = require('../analysis/ruleEngine');

/**
 * Calculates a deterministic threat score (0-100) based on analysis results
 * @param {Object} analysis - The aggregated forensic analysis results
 * @returns {Object} - Total score, risk level, and breakdown
 */
exports.calculateThreatScore = (analysis) => {
  let totalScore = 0;
  const scoreBreakdown = [];

  // 1. Authentication Risk (Max 20)
  let authScore = 0;
  if (analysis.headerForensics.spfPass === false) {
    const impact = scoreForRule('SPF_FAIL', 7);
    authScore += impact;
    if (impact > 0) scoreBreakdown.push({ category: 'Authentication', scoreImpact: impact, ruleId: 'SPF_FAIL', explanation: 'SPF authentication failed' });
  }
  if (analysis.headerForensics.dkimPass === false) {
    const impact = scoreForRule('DKIM_FAIL', 7);
    authScore += impact;
    if (impact > 0) scoreBreakdown.push({ category: 'Authentication', scoreImpact: impact, ruleId: 'DKIM_FAIL', explanation: 'DKIM signature verification failed' });
  }
  if (analysis.headerForensics.dmarcPass === false) {
    const impact = scoreForRule('DMARC_FAIL', 6);
    authScore += impact;
    if (impact > 0) scoreBreakdown.push({ category: 'Authentication', scoreImpact: impact, ruleId: 'DMARC_FAIL', explanation: 'DMARC policy check failed' });
  }
  totalScore += Math.min(authScore, 20);

  // 2. Sender / Identity Risk (Max 15)
  let senderScore = 0;
  if (analysis.senderAnalysis.displayNameSpoofing) {
    const impact = scoreForRule('NAME_SPOOF', 5);
    senderScore += impact;
    if (impact > 0) scoreBreakdown.push({ category: 'SenderIdentity', scoreImpact: impact, ruleId: 'NAME_SPOOF', explanation: 'Display name spoofing detected' });
  }
  if (analysis.senderAnalysis.lookalikeDomainDetected) {
    const impact = scoreForRule('LOOKALIKE_DOMAIN', 10);
    senderScore += impact;
    if (impact > 0) scoreBreakdown.push({ category: 'SenderIdentity', scoreImpact: impact, ruleId: 'LOOKALIKE_DOMAIN', explanation: `Lookalike domain detected (Similarity to ${analysis.senderAnalysis.targetBrand})` });
  }
  if (analysis.senderAnalysis.replyToMismatch) {
    const impact = scoreForRule('REPLYTO_MISMATCH', 5);
    senderScore += impact;
    if (impact > 0) scoreBreakdown.push({ category: 'SenderIdentity', scoreImpact: impact, ruleId: 'REPLYTO_MISMATCH', explanation: 'Reply-To domain differs from From domain' });
  }
  if (analysis.senderAnalysis.returnPathMismatch) {
    const impact = scoreForRule('RETURNPATH_MISMATCH', 4);
    senderScore += impact;
    if (impact > 0) scoreBreakdown.push({ category: 'SenderIdentity', scoreImpact: impact, ruleId: 'RETURNPATH_MISMATCH', explanation: 'Return-Path domain differs from From domain' });
  }
  totalScore += Math.min(senderScore, 15);

  // 3. URL Risk (Max 20)
  let urlScore = 0;
  analysis.urlAnalysis.suspiciousUrls.forEach(url => {
    if (url.indicators.includes('IP_ADDRESS_URL')) urlScore += 10;
    if (url.indicators.includes('LOOKALIKE_DOMAIN')) urlScore += 8;
    if (url.indicators.includes('EXCESSIVE_SUBDOMAINS')) urlScore += 5;
    if (url.indicators.includes('SUSPICIOUS_TLD')) urlScore += 4;
  });
  if (urlScore > 0) {
    const impact = Math.min(urlScore, scoreForRule('SUSPICIOUS_URLS', 20));
    if (impact > 0) {
      scoreBreakdown.push({ category: 'URL', scoreImpact: impact, ruleId: 'SUSPICIOUS_URLS', explanation: `Detected ${analysis.urlAnalysis.suspiciousUrls.length} suspicious URL indicators` });
      totalScore += impact;
    }
  }

  // 4. Content / Pattern Risk (Max 15)
  let contentScore = 0;
  const uniqueCategories = new Set();
  analysis.keywordAnalysis.forEach(k => {
    contentScore += k.scoreImpact;
    uniqueCategories.add(k.category);
  });
  if (contentScore > 0) {
    const impact = Math.min(contentScore, scoreForRule('KEYWORD_PATTERNS', 15));
    if (impact > 0) {
      scoreBreakdown.push({ category: 'Content', scoreImpact: impact, ruleId: 'KEYWORD_PATTERNS', explanation: `Detected high-risk keywords across ${uniqueCategories.size} categories` });
      totalScore += impact;
    }
  }

  // 5. Attachment Risk (Max 10)
  let attScore = 0;
  analysis.attachmentAnalysis.attachments.forEach(att => {
    if (att.riskLevel === 'HIGH') attScore += 10;
    else if (att.riskLevel === 'MEDIUM') attScore += 5;
    else if (att.riskLevel === 'LOW') attScore += 2;
  });
  if (attScore > 0) {
    const impact = Math.min(attScore, scoreForRule('DANGEROUS_ATTACHMENTS', 10));
    if (impact > 0) {
      scoreBreakdown.push({ category: 'Attachment', scoreImpact: impact, ruleId: 'DANGEROUS_ATTACHMENTS', explanation: 'Potentially dangerous file attachments detected' });
      totalScore += impact;
    }
  }

  // 6. Threat Intelligence Risk (Max 15)
  if (analysis.threatIntel?.riskScore > 0) {
    const impact = Math.min(Math.ceil(analysis.threatIntel.riskScore / 4), scoreForRule('THREAT_INTEL_MATCH', 15));
    if (impact > 0) {
      scoreBreakdown.push({ category: 'ThreatIntel', scoreImpact: impact, ruleId: 'THREAT_INTEL_MATCH', explanation: 'Local reputation rules flagged infrastructure or file indicators' });
      totalScore += impact;
    }
  }

  // Cap total score at 100
  totalScore = Math.min(totalScore, 100);

  // Risk Level Mapping
  let riskLevel = 'LOW';
  if (totalScore >= 75) riskLevel = 'CRITICAL';
  else if (totalScore >= 50) riskLevel = 'HIGH';
  else if (totalScore >= 25) riskLevel = 'MEDIUM';

  return {
    threatScore: totalScore,
    riskLevel,
    scoreBreakdown
  };
};
