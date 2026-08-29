/**
 * Analyzes email attachments for potential risks
 * @param {Array} attachments - Parsed attachments from mailparser
 * @returns {Object} - Attachment analysis results
 */
exports.analyzeAttachments = (attachments) => {
  if (!attachments || attachments.length === 0) {
    return { totalAttachments: 0, attachments: [] };
  }

  const processedAttachments = attachments.map(att => {
    const indicators = [];
    let riskLevel = 'NONE';
    const extension = (att.extension || '').toLowerCase();
    const contentSample = att.contentSample || '';
    const textSample = att.textSample || '';

    // 1. Double Extensions (e.g. invoice.pdf.exe)
    const parts = att.filename ? att.filename.split('.') : [];
    if (parts.length > 2) {
      indicators.push('DOUBLE_EXTENSION');
      riskLevel = 'HIGH';
    }

    // 2. Executable/Script Extensions
    const riskyExtensions = [
      'exe', 'com', 'bat', 'cmd', 'sh', 'vbs', 'js', 'jar', 
      'msi', 'scr', 'pif', 'ps1'
    ];
    if (riskyExtensions.includes(extension)) {
      indicators.push('EXECUTABLE_FILE');
      riskLevel = 'HIGH';
    }

    // 3. Macro-Enabled Office Files
    const macroExtensions = ['docm', 'xlsm', 'pptm'];
    if (macroExtensions.includes(extension)) {
      indicators.push('MACRO_ENABLED_FILE');
      riskLevel = 'MEDIUM';
    }

    // 4. Archive Files
    const archiveExtensions = ['zip', 'rar', '7z', 'iso', 'tar', 'gz'];
    if (archiveExtensions.includes(extension)) {
      indicators.push('ARCHIVE_FILE');
      if (riskLevel === 'NONE') riskLevel = 'LOW';
    }

    const expectedMimeByExtension = {
      pdf: 'application/pdf',
      txt: 'text/plain',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      zip: 'application/zip'
    };

    if (expectedMimeByExtension[extension] && att.contentType && att.contentType !== expectedMimeByExtension[extension]) {
      indicators.push('MIME_EXTENSION_MISMATCH');
      if (riskLevel === 'NONE') riskLevel = 'MEDIUM';
    }

    const magicByExtension = {
      pdf: '25504446',
      png: '89504e47',
      jpg: 'ffd8ff',
      jpeg: 'ffd8ff',
      zip: '504b0304'
    };

    if (magicByExtension[extension] && contentSample && !contentSample.startsWith(magicByExtension[extension])) {
      indicators.push('MAGIC_NUMBER_MISMATCH');
      riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM';
    }

    const embeddedUrls = textSample.match(/https?:\/\/[^\s<>"')]+/g) || [];
    if (embeddedUrls.length > 0) {
      indicators.push('EMBEDDED_URLS');
      if (riskLevel === 'NONE') riskLevel = 'LOW';
    }

    // Adjust risk based on indicators
    if (indicators.length > 0 && riskLevel === 'NONE') {
      riskLevel = 'LOW';
    }

    return {
      filename: att.filename,
      extension: att.extension,
      mimeType: att.contentType,
      size: att.size,
      fileHash: att.checksum, // mailparser provides checksum
      indicators,
      riskLevel,
      deepAnalysis: {
        mimeMismatch: indicators.includes('MIME_EXTENSION_MISMATCH'),
        magicNumberMismatch: indicators.includes('MAGIC_NUMBER_MISMATCH'),
        embeddedUrls: [...new Set(embeddedUrls)].slice(0, 10),
        contentSample
      }
    };
  });

  return {
    totalAttachments: attachments.length,
    attachments: processedAttachments
  };
};
