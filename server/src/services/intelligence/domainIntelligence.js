const dns = require('dns').promises;

/**
 * Resolves DNS records for a domain
 * @param {string} domain - Domain name to query
 * @returns {Promise<Object>} - DNS records
 */
exports.resolveDomainIntel = async (domain) => {
  const results = {
    domain,
    aRecords: [],
    aaaaRecords: [],
    mxRecords: [],
    nsRecords: [],
    txtRecords: [],
    lastUpdated: new Date()
  };

  try {
    // A records
    try {
      results.aRecords = await dns.resolve4(domain);
    } catch (e) {}

    // MX records
    try {
      results.mxRecords = await dns.resolveMx(domain);
    } catch (e) {}

    // NS records
    try {
      results.nsRecords = await dns.resolveNs(domain);
    } catch (e) {}

    // TXT records
    try {
      const txt = await dns.resolveTxt(domain);
      results.txtRecords = txt.map(t => t.join(' '));
    } catch (e) {}

    return results;
  } catch (error) {
    console.error(`[-] DNS resolution error for ${domain}: ${error.message}`);
    return results;
  }
};
