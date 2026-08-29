const fs = require('fs');
const path = require('path');

const RULE_STORE_PATH = path.join(__dirname, '../../../data/detectionRules.json');

const DEFAULT_DETECTION_RULES = [
  { id: 'SPF_FAIL', category: 'Authentication', scoreImpact: 7, severity: 'medium', enabled: true, description: 'SPF authentication failed.' },
  { id: 'DKIM_FAIL', category: 'Authentication', scoreImpact: 7, severity: 'medium', enabled: true, description: 'DKIM authentication failed.' },
  { id: 'DMARC_FAIL', category: 'Authentication', scoreImpact: 6, severity: 'high', enabled: true, description: 'DMARC authentication failed.' },
  { id: 'NAME_SPOOF', category: 'SenderIdentity', scoreImpact: 5, severity: 'medium', enabled: true, description: 'Display name uses trusted/security wording that does not match sender identity.' },
  { id: 'LOOKALIKE_DOMAIN', category: 'SenderIdentity', scoreImpact: 10, severity: 'high', enabled: true, description: 'Sender or URL domain resembles a known brand.' },
  { id: 'REPLYTO_MISMATCH', category: 'SenderIdentity', scoreImpact: 5, severity: 'medium', enabled: true, description: 'Reply-To domain differs from sender domain.' },
  { id: 'RETURNPATH_MISMATCH', category: 'SenderIdentity', scoreImpact: 4, severity: 'medium', enabled: true, description: 'Return-Path domain differs from sender domain.' },
  { id: 'SUSPICIOUS_URLS', category: 'URL', scoreImpact: 20, severity: 'high', enabled: true, description: 'Suspicious URL indicators were detected.' },
  { id: 'KEYWORD_PATTERNS', category: 'Content', scoreImpact: 15, severity: 'medium', enabled: true, description: 'High-risk social-engineering language was detected.' },
  { id: 'DANGEROUS_ATTACHMENTS', category: 'Attachment', scoreImpact: 10, severity: 'high', enabled: true, description: 'Potentially dangerous attachments were found.' },
  { id: 'THREAT_INTEL_MATCH', category: 'ThreatIntel', scoreImpact: 15, severity: 'high', enabled: true, description: 'Local reputation checks flagged one or more indicators.' }
];

const loadDetectionRules = () => {
  try {
    if (!fs.existsSync(RULE_STORE_PATH)) return DEFAULT_DETECTION_RULES.map((rule) => ({ ...rule }));

    const storedRules = JSON.parse(fs.readFileSync(RULE_STORE_PATH, 'utf8'));
    return DEFAULT_DETECTION_RULES.map((defaultRule) => ({
      ...defaultRule,
      ...(storedRules.find((rule) => rule.id === defaultRule.id) || {})
    }));
  } catch (error) {
    console.error(`[-] Rule store load failed: ${error.message}`);
    return DEFAULT_DETECTION_RULES.map((rule) => ({ ...rule }));
  }
};

const saveDetectionRules = () => {
  fs.mkdirSync(path.dirname(RULE_STORE_PATH), { recursive: true });
  fs.writeFileSync(`${RULE_STORE_PATH}.tmp`, JSON.stringify(DETECTION_RULES, null, 2));
  fs.renameSync(`${RULE_STORE_PATH}.tmp`, RULE_STORE_PATH);
};

const DETECTION_RULES = loadDetectionRules();

exports.getDetectionRules = () => DETECTION_RULES.map((rule) => ({ ...rule }));

exports.getRuleById = (id) => DETECTION_RULES.find((rule) => rule.id === id);

exports.updateDetectionRule = (id, updates) => {
  const rule = exports.getRuleById(id);
  if (!rule) return null;

  if (typeof updates.enabled === 'boolean') rule.enabled = updates.enabled;
  if (Number.isFinite(Number(updates.scoreImpact))) {
    rule.scoreImpact = Math.max(0, Math.min(100, Number(updates.scoreImpact)));
  }
  if (updates.severity && ['low', 'medium', 'high', 'critical'].includes(updates.severity)) {
    rule.severity = updates.severity;
  }

  saveDetectionRules();
  return rule;
};

exports.scoreForRule = (id, fallback = 0) => {
  const rule = exports.getRuleById(id);
  if (!rule || !rule.enabled) return 0;
  return Number.isFinite(rule.scoreImpact) ? rule.scoreImpact : fallback;
};
