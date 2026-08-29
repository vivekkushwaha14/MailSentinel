const { simpleParser } = require('mailparser');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Parses a raw .eml file and returns structured data
 * @param {string} filePath - Path to the .eml file
 * @returns {Promise<Object>} - Structured email data
 */
exports.parseEmlFile = async (filePath) => {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    // Calculate SHA-256 hash for evidence preservation
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Parse the email
    const parsed = await simpleParser(fileBuffer);
    const returnPathHeader = parsed.headers.get('return-path');
    const returnPathAddress = typeof returnPathHeader === 'string'
      ? returnPathHeader.replace(/[<>]/g, '').trim()
      : '';
    
    return {
      messageId: parsed.messageId,
      from: {
        name: parsed.from?.value[0]?.name || '',
        address: parsed.from?.value[0]?.address || '',
        domain: parsed.from?.value[0]?.address?.split('@')[1] || ''
      },
      to: parsed.to?.value.map(recipient => ({
        name: recipient.name || '',
        address: recipient.address || ''
      })) || [],
      cc: parsed.cc?.value.map(recipient => ({
        name: recipient.name || '',
        address: recipient.address || ''
      })) || [],
      subject: parsed.subject || '(No Subject)',
      date: parsed.date || new Date(),
      replyTo: parsed.replyTo ? {
        name: parsed.replyTo.value[0]?.name || '',
        address: parsed.replyTo.value[0]?.address || '',
        domain: parsed.replyTo.value[0]?.address?.split('@')[1] || ''
      } : null,
      returnPath: returnPathAddress ? {
        address: returnPathAddress,
        domain: returnPathAddress.split('@')[1] || ''
      } : null,
      receivedHeaders: exports.extractReceivedHops(parsed.headers),
      headers: parsed.headers,
      bodyText: parsed.text,
      bodyHtml: parsed.html,
      attachments: parsed.attachments.map(attachment => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        extension: attachment.filename ? attachment.filename.split('.').pop() : '',
        contentId: attachment.contentId,
        checksum: attachment.checksum,
        contentSample: attachment.content ? attachment.content.subarray(0, 16).toString('hex') : '',
        textSample: attachment.content ? attachment.content.subarray(0, 4096).toString('utf8') : ''
      })),
      fileHash: fileHash
    };
  } catch (error) {
    console.error(`[-] Error parsing EML: ${error.message}`);
    throw error;
  }
};

/**
 * Extracts and structures the Received headers for transmission path analysis
 * @param {Map} headers - Parsed headers Map from mailparser
 * @returns {Array} - Array of structured hops
 */
exports.extractReceivedHops = (headers) => {
  const receivedHeaders = headers.get('received');
  if (!receivedHeaders) return [];

  const hops = [];
  const receivedArray = Array.isArray(receivedHeaders) ? receivedHeaders : [receivedHeaders];

  receivedArray.forEach((header, index) => {
    const raw = String(header);
    const fromMatch = raw.match(/\bfrom\s+([^;\n]+?)(?=\s+by\s|\s+with\s|;|$)/i);
    const byMatch = raw.match(/\bby\s+([^;\n]+?)(?=\s+with\s|\s+id\s|;|$)/i);
    const ipMatch = raw.match(/\b((?:\d{1,3}\.){3}\d{1,3})\b/);
    const datePart = raw.includes(';') ? raw.split(';').pop().trim() : '';
    const parsedDate = datePart ? new Date(datePart) : null;
    const ip = ipMatch?.[1] || '';
    const octets = ip.split('.').map(Number);
    const isPrivate = ip.startsWith('10.') || ip.startsWith('192.168.') ||
      (ip.startsWith('172.') && octets[1] >= 16 && octets[1] <= 31);

    hops.push({
      hop: receivedArray.length - index,
      raw,
      from: fromMatch?.[1]?.trim() || '',
      by: byMatch?.[1]?.trim() || '',
      date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
      ip,
      isPrivate
    });
  });

  return hops;
};
