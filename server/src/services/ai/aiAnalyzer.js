const path = require('path');

let registeredProvider = null;
let configuredProviderLoaded = false;

const loadConfiguredProvider = () => {
  if (registeredProvider || configuredProviderLoaded) return registeredProvider;
  configuredProviderLoaded = true;

  const modulePath = process.env.MAILSENTINEL_AI_PROVIDER;
  if (!modulePath) return null;

  try {
    const resolvedPath = path.isAbsolute(modulePath)
      ? modulePath
      : path.resolve(process.cwd(), modulePath);
    registeredProvider = require(resolvedPath);
  } catch (error) {
    console.error(`[-] AI provider load failed: ${error.message}`);
  }

  return registeredProvider;
};

exports.registerAiProvider = (provider) => {
  registeredProvider = provider;
  configuredProviderLoaded = true;
};

const buildDeterministicExplanation = (emailData, analysis) => {
  const reasons = [];

  if (analysis.headerForensics.spfPass === false || analysis.headerForensics.dkimPass === false || analysis.headerForensics.dmarcPass === false) {
    reasons.push('mail authentication failed or is incomplete');
  }
  if (analysis.senderAnalysis.lookalikeDomainDetected) {
    reasons.push(`sender identity resembles ${analysis.senderAnalysis.targetBrand}`);
  }
  if (analysis.senderAnalysis.replyToMismatch || analysis.senderAnalysis.returnPathMismatch) {
    reasons.push('reply or return path differs from the visible sender');
  }
  if (analysis.urlAnalysis.suspiciousUrls.length > 0) {
    reasons.push(`${analysis.urlAnalysis.suspiciousUrls.length} suspicious URL indicator(s) were found`);
  }
  if (analysis.attachmentAnalysis.attachments.some((attachment) => ['MEDIUM', 'HIGH'].includes(attachment.riskLevel))) {
    reasons.push('one or more attachments require manual review');
  }
  if (analysis.keywordAnalysis.length > 0) {
    reasons.push('the message uses social-engineering language');
  }
  if (analysis.threatIntel?.riskScore > 0) {
    reasons.push('local reputation checks found risky infrastructure patterns');
  }

  const summary = reasons.length
    ? `This email should be reviewed because ${reasons.join(', ')}.`
    : 'No strong phishing indicators were detected by the configured local rules.';

  const recommendedActions = reasons.length
    ? ['Preserve the original EML as evidence.', 'Block or monitor listed IOCs.', 'Validate the sender through an out-of-band channel.', 'Escalate if the user interacted with links or attachments.']
    : ['Archive the analysis result.', 'Keep the evidence available if a related campaign emerges.'];

  return {
    summary,
    likelyAttackType: inferAttackType(emailData, analysis),
    confidence: inferConfidence(analysis),
    recommendedActions,
    provider: 'deterministic-rules'
  };
};

exports.analyzePhishingProbability = async (emailData, analysis = {}) => {
  const provider = loadConfiguredProvider();
  if (provider && typeof provider.analyzePhishingProbability === 'function') {
    try {
      return await provider.analyzePhishingProbability(emailData, analysis);
    } catch (error) {
      return {
        phishingProbability: estimatePhishingProbability(analysis),
        explanation: `Provider failed; deterministic estimate used. ${error.message}`,
        provider: 'deterministic-rules',
        providerError: error.message
      };
    }
  }

  return {
    phishingProbability: estimatePhishingProbability(analysis),
    explanation: buildDeterministicExplanation(emailData, analysis).summary,
    provider: 'deterministic-rules'
  };
};

exports.generateInvestigationExplanation = async (emailData, analysis) => {
  const deterministic = buildDeterministicExplanation(emailData, analysis);
  const provider = loadConfiguredProvider();

  if (!provider || typeof provider.generateInvestigationExplanation !== 'function') {
    return deterministic;
  }

  try {
    const providerExplanation = await provider.generateInvestigationExplanation({
      emailData,
      analysis,
      deterministic
    });

    return {
      ...deterministic,
      ...providerExplanation,
      recommendedActions: providerExplanation?.recommendedActions || deterministic.recommendedActions,
      provider: providerExplanation?.provider || provider.name || 'external-provider'
    };
  } catch (error) {
    return {
      ...deterministic,
      providerError: error.message
    };
  }
};

const inferAttackType = (emailData, analysis) => {
  const subject = (emailData.subject || '').toLowerCase();
  const categories = new Set(analysis.keywordAnalysis.map((item) => item.category));

  if (categories.has('credential-harvesting') || analysis.urlAnalysis.suspiciousUrls.length > 0) return 'credential phishing';
  if (categories.has('bec') || subject.includes('invoice') || subject.includes('payment')) return 'business email compromise';
  if (analysis.attachmentAnalysis.attachments.some((attachment) => attachment.riskLevel === 'HIGH')) return 'malware delivery';
  return 'unknown or low-confidence social engineering';
};

const inferConfidence = (analysis) => {
  const signals = [
    analysis.headerForensics.spfPass === false,
    analysis.headerForensics.dkimPass === false,
    analysis.headerForensics.dmarcPass === false,
    analysis.senderAnalysis.lookalikeDomainDetected,
    analysis.urlAnalysis.suspiciousUrls.length > 0,
    analysis.attachmentAnalysis.attachments.some((attachment) => ['MEDIUM', 'HIGH'].includes(attachment.riskLevel)),
    analysis.keywordAnalysis.length > 2,
    analysis.threatIntel?.riskScore > 20
  ].filter(Boolean).length;

  if (signals >= 5) return 'high';
  if (signals >= 2) return 'medium';
  return 'low';
};

const estimatePhishingProbability = (analysis) => {
  const score = Number(analysis?.threatScore || 0);
  if (score > 0) return Math.min(score, 100);

  const signals = [
    analysis.headerForensics?.spfPass === false,
    analysis.headerForensics?.dkimPass === false,
    analysis.headerForensics?.dmarcPass === false,
    analysis.senderAnalysis?.lookalikeDomainDetected,
    analysis.urlAnalysis?.suspiciousUrls?.length > 0,
    analysis.attachmentAnalysis?.attachments?.some((attachment) => ['MEDIUM', 'HIGH'].includes(attachment.riskLevel)),
    analysis.keywordAnalysis?.length > 0
  ].filter(Boolean).length;

  return Math.min(signals * 14, 95);
};
