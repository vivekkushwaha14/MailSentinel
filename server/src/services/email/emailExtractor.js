const { analyzeHeaders } = require('../analysis/headerAnalyzer');
const { analyzeSender } = require('../analysis/senderAnalyzer');
const { analyzeUrls } = require('../analysis/urlAnalyzer');
const { analyzeAttachments } = require('../analysis/attachmentAnalyzer');
const { analyzeKeywords } = require('../analysis/keywordAnalyzer');
const { enrichThreatIntel } = require('../intelligence/threatIntel');
const { generateInvestigationExplanation } = require('../ai/aiAnalyzer');

/**
 * Orchestrates the full extraction and analysis pipeline for an email
 * @param {Object} emailData - Structured data from emailParser
 * @returns {Object} - Complete forensic analysis object
 */
exports.runFullAnalysis = async (emailData) => {
  const headerResults = analyzeHeaders(emailData.headers, emailData.receivedHeaders);
  const senderResults = analyzeSender(emailData);
  const urlResults = await analyzeUrls(emailData.bodyText, emailData.bodyHtml);
  const attachmentResults = analyzeAttachments(emailData.attachments);
  const keywordResults = analyzeKeywords(emailData.bodyText);
  const threatIntel = await enrichThreatIntel({
    emailData,
    urlAnalysis: urlResults,
    attachmentAnalysis: attachmentResults
  });

  const analysis = {
    headerForensics: headerResults,
    senderAnalysis: senderResults,
    urlAnalysis: urlResults,
    attachmentAnalysis: attachmentResults,
    keywordAnalysis: keywordResults,
    threatIntel
  };

  return {
    ...analysis,
    analystSummary: await generateInvestigationExplanation(emailData, analysis)
  };
};
