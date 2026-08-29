const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b';

const AI_UNAVAILABLE_MESSAGE = 'AI analysis is currently unavailable. Add NVIDIA_API_KEY to enable AI Intelligence.';

const SYSTEM_PROMPT = [
  'You are an advanced cybersecurity email and file forensic intelligence assistant.',
  'Analyze existing rule-based security findings.',
  'Correlate suspicious indicators and identify likely phishing or social engineering patterns.',
  'Explain why an email or file appears suspicious and prioritize the most dangerous indicators.',
  'Provide practical recommendations.',
  'Avoid unsupported assumptions.',
  'Clearly distinguish between detected facts and AI interpretation.',
  'Never claim a file is malware unless sufficient evidence is provided.',
  'Return structured JSON only with this schema:',
  '{"aiAvailable":true,"threatAssessment":"SAFE | LOW | MEDIUM | HIGH | CRITICAL","confidence":0,"summary":"","primaryThreats":[],"suspiciousIndicators":[],"reasoning":"","recommendedActions":[],"userWarning":""}'
].join('\n');

const unavailableResponse = (message = AI_UNAVAILABLE_MESSAGE) => ({
  aiAvailable: false,
  available: false,
  message,
  threatAssessment: '',
  confidence: 0,
  summary: '',
  primaryThreats: [],
  suspiciousIndicators: [],
  reasoning: '',
  recommendedActions: [],
  userWarning: ''
});

const normalizeArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

const buildAiInput = (analysisData = {}) => {
  const { email = {}, analysis = {} } = analysisData;

  return {
    email: {
      sender: email.from?.address || '',
      senderName: email.from?.name || '',
      subject: email.subject || '',
      body: String(email.bodyText || '').slice(0, 12000)
    },
    ruleBasedAnalysis: {
      riskScore: analysis.threatScore || 0,
      riskLevel: analysis.riskLevel || '',
      scoreBreakdown: normalizeArray(analysis.scoreBreakdown),
      suspiciousKeywords: normalizeArray(analysis.keywordAnalysis),
      urlFindings: normalizeArray(analysis.urlAnalysis?.suspiciousUrls),
      fileFindings: normalizeArray(analysis.attachmentAnalysis?.attachments),
      senderFindings: analysis.senderAnalysis || {},
      headerFindings: analysis.headerForensics || {},
      threatIntel: analysis.threatIntel || {},
      analystSummary: analysis.analystSummary || {}
    }
  };
};
const extractJson = (content = '') => {
  const trimmed = String(content).trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);

  return match ? match[0] : '';
};

const validateAiResponse = (value) => {
  if (!value || typeof value !== 'object') {
    throw new Error('AI response is not an object.');
  }

  const allowedAssessments = new Set(['SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
  const threatAssessment = allowedAssessments.has(value.threatAssessment)
    ? value.threatAssessment
    : 'LOW';

  return {
    aiAvailable: true,
    threatAssessment,
    confidence: Math.max(0, Math.min(100, Number(value.confidence) || 0)),
    summary: String(value.summary || ''),
    primaryThreats: normalizeArray(value.primaryThreats).map(String),
    suspiciousIndicators: normalizeArray(value.suspiciousIndicators).map(String),
    reasoning: String(value.reasoning || ''),
    recommendedActions: normalizeArray(value.recommendedActions).map(String),
    userWarning: String(value.userWarning || '')
  };
};

const parseAiResponse = (content) => {
  const json = extractJson(content);
  if (!json) throw new Error('AI response did not contain JSON.');
  return validateAiResponse(JSON.parse(json));
};

const callNvidia = async (payload) => {
  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(payload) }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA API request failed with ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  return parseAiResponse(data.choices?.[0]?.message?.content || '');
};

exports.analyzeThreatWithAI = async (analysisData) => {
  if (!process.env.NVIDIA_API_KEY) {
    return unavailableResponse();
  }

  if (typeof fetch !== 'function') {
    return unavailableResponse('AI analysis is unavailable because this Node.js runtime does not provide fetch.');
  }

  try {
    const payload = buildAiInput(analysisData);
    return await callNvidia(payload);
  } catch (error) {
    console.error(`[-] NVIDIA AI analysis failed: ${error.message}`);
    return unavailableResponse('AI analysis is temporarily unavailable. Existing rule-based analysis is unaffected.');
  }
};

exports.buildAiInput = buildAiInput;
exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
exports.NVIDIA_MODEL = NVIDIA_MODEL;
exports.NVIDIA_BASE_URL = NVIDIA_BASE_URL;
