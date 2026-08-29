const { parseEmlFile } = require('../services/email/emailParser');
const { runFullAnalysis } = require('../services/email/emailExtractor');
const { calculateThreatScore } = require('../services/scoring/threatScorer');
const { detectCampaign } = require('../services/correlation/campaignDetector');
const Email = require('../models/Email');
const Evidence = require('../models/Evidence');
const Case = require('../models/Case');
const Analysis = require('../models/Analysis');
const Indicator = require('../models/Indicator');
const crypto = require('crypto');

// Helper to save indicators
const saveIndicators = async (type, value, emailId, caseId) => {
  if (!value) return;
  try {
    let indicator = await Indicator.findOne({ value });
    if (!indicator) {
      indicator = new Indicator({ type, value, emails: [emailId] });
      if (caseId) indicator.cases = [caseId];
    } else {
      if (!indicator.emails.includes(emailId)) indicator.emails.push(emailId);
      if (caseId && !indicator.cases.includes(caseId)) indicator.cases.push(caseId);
    }
    await indicator.save();
    return indicator._id;
  } catch (e) {
    console.error(`[-] Error saving indicator ${value}: ${e.message}`);
  }
};

// @desc    Get analyzed emails
// @route   GET /api/emails
// @access  Private
exports.getEmails = async (req, res) => {
  try {
    const filter = {};
    if (req.query.caseId) filter.caseId = req.query.caseId;

    const emails = await Email.find(filter)
      .populate('caseId', 'caseId title status severity')
      .populate('evidenceId', 'evidenceId originalFilename fileHash uploadedAt')
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 100);

    const analyses = await Analysis.find({
      emailId: { $in: emails.map((email) => email._id) }
    }).select('emailId threatScore riskLevel createdAt');

    const analysisByEmailId = new Map(
      analyses.map((analysis) => [analysis.emailId.toString(), analysis.toObject()])
    );

    res.json(
      emails.map((email) => ({
        ...email.toObject(),
        analysis: analysisByEmailId.get(email._id.toString()) || null
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload and parse .eml file
// @route   POST /api/emails/upload
// @access  Private
exports.uploadEmail = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const { caseId } = req.body;

  try {
    // 1. Parse and Run Analysis
    const parsedData = await parseEmlFile(req.file.path);
    const analysisResults = await runFullAnalysis(parsedData);
    const scoreResults = calculateThreatScore(analysisResults);

    // 2. Create Evidence record
    const evidenceId = `EVI-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const evidence = await Evidence.create({
      evidenceId,
      originalFilename: req.file.originalname,
      fileHash: parsedData.fileHash,
      storagePath: req.file.path,
      uploadedBy: req.user._id,
      caseId: caseId || null
    });

    // 3. Create Email record
    const email = await Email.create({
      caseId: caseId || null,
      evidenceId: evidence._id,
      messageId: parsedData.messageId,
      from: parsedData.from,
      to: parsedData.to,
      cc: parsedData.cc,
      subject: parsedData.subject,
      date: parsedData.date,
      replyTo: parsedData.replyTo,
      returnPath: parsedData.returnPath,
      receivedHeaders: parsedData.receivedHeaders,
      bodyText: parsedData.bodyText,
      bodyHtml: parsedData.bodyHtml,
      authenticationResults: {
        spf: { status: analysisResults.headerForensics.authResults?.spf || 'unknown' },
        dkim: [{ status: analysisResults.headerForensics.authResults?.dkim || 'unknown' }],
        dmarc: { status: analysisResults.headerForensics.authResults?.dmarc || 'unknown' }
      }
    });

    // 4. Create Analysis record
    const finalAnalysis = await Analysis.create({
      emailId: email._id,
      caseId: caseId || null,
      threatScore: scoreResults.threatScore,
      riskLevel: scoreResults.riskLevel,
      scoreBreakdown: scoreResults.scoreBreakdown,
      headerForensics: analysisResults.headerForensics,
      senderAnalysis: analysisResults.senderAnalysis,
      keywordAnalysis: analysisResults.keywordAnalysis,
      urlAnalysis: analysisResults.urlAnalysis,
      attachmentAnalysis: analysisResults.attachmentAnalysis,
      threatIntel: analysisResults.threatIntel,
      analystSummary: analysisResults.analystSummary
    });

    // 5. Save Indicators for correlation
    const indicatorIds = [];
    // From address
    indicatorIds.push(await saveIndicators('sender', parsedData.from.address, email._id, caseId));
    // Domain
    indicatorIds.push(await saveIndicators('domain', parsedData.from.domain, email._id, caseId));
    // URLs
    for (const url of analysisResults.urlAnalysis.suspiciousUrls) {
      indicatorIds.push(await saveIndicators('url', url.url, email._id, caseId));
    }
    // Received path IPs
    for (const hop of parsedData.receivedHeaders || []) {
      indicatorIds.push(await saveIndicators('ip', hop.ip, email._id, caseId));
    }
    // Attachments
    for (const att of analysisResults.attachmentAnalysis.attachments) {
      indicatorIds.push(await saveIndicators('attachment_hash', att.fileHash, email._id, caseId));
    }

    // 6. Link to Case if provided
    if (caseId) {
      const existingCase = await Case.findById(caseId);
      if (existingCase) {
        existingCase.emails.push(email._id);
        // Link all unique indicators found to the case
        for (const id of indicatorIds) {
          if (id && !existingCase.indicators.includes(id)) {
            existingCase.indicators.push(id);
          }
        }
        await existingCase.save();
      }
    }

    // 7. Trigger Campaign Detection (Async)
    detectCampaign(email._id);

    res.status(201).json({
      message: 'Analysis complete',
      emailId: email._id,
      caseId: caseId || null,
      threatScore: scoreResults.threatScore,
      riskLevel: scoreResults.riskLevel
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Error processing email: ${error.message}` });
  }
};

// @desc    Update analyst verdict
// @route   PUT /api/emails/:id/verdict
// @access  Private
exports.updateVerdict = async (req, res) => {
  const { status, confidence, note } = req.body;

  try {
    const email = await Email.findById(req.params.id);
    if (!email) {
      return res.status(404).json({ message: 'Email not found' });
    }

    email.verdict = {
      status,
      confidence,
      note,
      reviewedBy: req.user._id,
      reviewedAt: new Date()
    };

    await email.save();
    res.json(email.verdict);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get email details with analysis
// @route   GET /api/emails/:id
// @access  Private
exports.getEmail = async (req, res) => {
  try {
    const email = await Email.findById(req.params.id)
      .populate('evidenceId')
      .populate('caseId', 'caseId title status severity');
    if (!email) {
      return res.status(404).json({ message: 'Email not found' });
    }
    
    const analysis = await Analysis.findOne({ emailId: email._id });
    
    res.json({ email, analysis });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
