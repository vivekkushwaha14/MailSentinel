const Email = require('../models/Email');
const Analysis = require('../models/Analysis');
const Indicator = require('../models/Indicator');

// @desc    Generate forensic report
// @route   GET /api/reports/:id
// @access  Private
exports.generateReport = async (req, res) => {
  try {
    const email = await Email.findById(req.params.id)
      .populate('evidenceId')
      .populate('caseId', 'caseId title severity status');
    if (!email) return res.status(404).json({ message: 'Email not found' });

    const analysis = await Analysis.findOne({ emailId: email._id });
    const indicators = await Indicator.find({ emails: email._id });
    
    // Structure the report data
    const report = {
      caseId: email.caseId,
      emailMetadata: email,
      analysis: analysis,
      indicators,
      generatedAt: new Date()
    };

    if (req.query.format === 'csv') {
      const rows = [
        ['type', 'value'],
        ...indicators.map((indicator) => [indicator.type, indicator.value])
      ];
      const csv = rows
        .map((row) => row.map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="mailsentinel-iocs-${email._id}.csv"`);
      return res.send(csv);
    }

    if (req.query.format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(renderHtmlReport(report));
    }
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const renderHtmlReport = (report) => {
  const { emailMetadata: email, analysis, indicators } = report;
  const scoreBreakdown = analysis?.scoreBreakdown || [];

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>MailSentinel Report</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
      h1, h2 { margin-bottom: 8px; }
      section { border-top: 1px solid #d1d5db; padding-top: 16px; margin-top: 20px; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f3f4f6; }
      .score { font-size: 28px; font-weight: 700; }
      .muted { color: #6b7280; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(email.subject)}</h1>
    <p class="muted">Generated ${escapeHtml(new Date(report.generatedAt).toLocaleString())}</p>
    <p class="score">${analysis?.threatScore || 0}/100 ${escapeHtml(analysis?.riskLevel || 'LOW')}</p>
    <section>
      <h2>Message</h2>
      <table>
        <tr><th>From</th><td>${escapeHtml(email.from?.address)}</td></tr>
        <tr><th>To</th><td>${escapeHtml((email.to || []).map((item) => item.address).join(', '))}</td></tr>
        <tr><th>Date</th><td>${escapeHtml(email.date)}</td></tr>
        <tr><th>Evidence Hash</th><td>${escapeHtml(email.evidenceId?.fileHash)}</td></tr>
      </table>
    </section>
    <section>
      <h2>Analyst Summary</h2>
      <p>${escapeHtml(analysis?.analystSummary?.summary || 'No summary available.')}</p>
    </section>
    <section>
      <h2>Score Breakdown</h2>
      <table>
        <tr><th>Rule</th><th>Category</th><th>Impact</th><th>Explanation</th></tr>
        ${scoreBreakdown.map((item) => `<tr><td>${escapeHtml(item.ruleId)}</td><td>${escapeHtml(item.category)}</td><td>${item.scoreImpact}</td><td>${escapeHtml(item.explanation)}</td></tr>`).join('')}
      </table>
    </section>
    <section>
      <h2>Indicators</h2>
      <table>
        <tr><th>Type</th><th>Value</th></tr>
        ${indicators.map((item) => `<tr><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.value)}</td></tr>`).join('')}
      </table>
    </section>
  </body>
</html>`;
};
