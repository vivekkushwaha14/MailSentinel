const { calculateSimilarity, normalizeChars } = require('../../utils/similarity');
const { domainToASCII, domainToUnicode } = require('url');

// Common target brands for URL lookalike detection
const TARGET_BRANDS = ['paypal', 'microsoft', 'google', 'apple', 'amazon', 'bank', 'login', 'security'];
const REDIRECT_LIMIT = 5;
const FETCH_TIMEOUT_MS = Number(process.env.URL_ANALYSIS_TIMEOUT_MS || 2500);

const shouldResolveRedirects = () => process.env.MAILSENTINEL_ENABLE_URL_FETCH === 'true';

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'user-agent': 'MailSentinel-URL-Analyzer/1.0',
        ...(options.headers || {})
      }
    });
  } finally {
    clearTimeout(timeout);
  }
};

const resolveRedirectChain = async (initialUrl) => {
  if (!shouldResolveRedirects() || typeof fetch !== 'function') {
    return {
      enabled: false,
      redirectChain: [],
      finalUrl: initialUrl,
      redirectCount: 0,
      fetchError: ''
    };
  }

  const redirectChain = [];
  let currentUrl = initialUrl;
  let fetchError = '';

  for (let depth = 0; depth < REDIRECT_LIMIT; depth += 1) {
    try {
      let response = await fetchWithTimeout(currentUrl, { method: 'HEAD', redirect: 'manual' });
      if (response.status === 405 || response.status === 403) {
        response = await fetchWithTimeout(currentUrl, { method: 'GET', redirect: 'manual' });
      }

      const location = response.headers.get('location');
      if (![301, 302, 303, 307, 308].includes(response.status) || !location) {
        return {
          enabled: true,
          redirectChain,
          finalUrl: currentUrl,
          redirectCount: redirectChain.length,
          fetchError
        };
      }

      const nextUrl = new URL(location, currentUrl).toString();
      redirectChain.push({
        from: currentUrl,
        to: nextUrl,
        status: response.status
      });
      currentUrl = nextUrl;
    } catch (error) {
      fetchError = error.name === 'AbortError' ? 'URL_FETCH_TIMEOUT' : 'URL_FETCH_FAILED';
      break;
    }
  }

  return {
    enabled: true,
    redirectChain,
    finalUrl: currentUrl,
    redirectCount: redirectChain.length,
    fetchError: fetchError || (redirectChain.length >= REDIRECT_LIMIT ? 'REDIRECT_LIMIT_REACHED' : '')
  };
};

/**
 * Extracts and analyzes URLs from email content
 * @param {string} text - Plain text body
 * @param {string} html - HTML body
 * @returns {Object} - URL analysis results
 */
exports.analyzeUrls = async (text, html) => {
  const urlRegex = /https?:\/\/[^\s<>"']+/g;
  const urls = new Set();
  
  if (text) {
    const matches = text.match(urlRegex);
    if (matches) matches.forEach(u => urls.add(u));
  }
  
  if (html) {
    const matches = html.match(urlRegex);
    if (matches) matches.forEach(u => urls.add(u));
  }

  const suspiciousUrls = [];
  
  for (const rawUrl of urls) {
    try {
      const urlObj = new URL(rawUrl);
      const indicators = [];
      let isLookalike = false;
      let targetBrand = null;
      let similarityScore = 0;
      const hostname = urlObj.hostname.toLowerCase();
      const asciiHostname = domainToASCII(hostname);
      const unicodeHostname = domainToUnicode(hostname);
      const redirectHints = [];

      // 1. IP-address based URL
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipRegex.test(hostname)) {
        indicators.push('IP_ADDRESS_URL');
      }

      // 2. Unusual Ports
      if (urlObj.port && !['80', '443'].includes(urlObj.port)) {
        indicators.push('UNUSUAL_PORT');
      }

      // 3. Excessive Subdomains
      if (hostname.split('.').length > 4) {
        indicators.push('EXCESSIVE_SUBDOMAINS');
      }

      if (hostname !== unicodeHostname || asciiHostname.startsWith('xn--') || asciiHostname.includes('.xn--')) {
        indicators.push('PUNYCODE_OR_HOMOGRAPH');
      }

      if (urlObj.protocol !== 'https:') {
        indicators.push('NO_HTTPS');
      }

      ['url', 'u', 'target', 'redirect', 'redirect_uri', 'return', 'next', 'continue'].forEach((param) => {
        const value = urlObj.searchParams.get(param);
        if (value && /^https?:\/\//i.test(value)) redirectHints.push({ parameter: param, target: value });
      });

      if (redirectHints.length > 0) {
        indicators.push('EMBEDDED_REDIRECT_PARAMETER');
      }

      const redirectResolution = await resolveRedirectChain(rawUrl);
      if (redirectResolution.redirectCount > 0) {
        indicators.push('REDIRECT_CHAIN');
      }
      if (redirectResolution.fetchError === 'REDIRECT_LIMIT_REACHED') {
        indicators.push('EXCESSIVE_REDIRECTS');
      }

      // 4. Lookalike Domain Check
      const domainParts = hostname.split('.');
      const mainDomain = domainParts[domainParts.length - 2];
      
      if (mainDomain) {
        const normalizedDomain = normalizeChars(mainDomain);
        for (const brand of TARGET_BRANDS) {
          const similarity = calculateSimilarity(normalizedDomain, brand);
          if (similarity > 0.78 && mainDomain !== brand) {
            isLookalike = true;
            targetBrand = brand;
            similarityScore = Math.round(similarity * 100);
            indicators.push('LOOKALIKE_DOMAIN');
            break;
          }
        }
      }

      // 5. Deceptive TLDs (Simplified)
      const suspiciousTlds = ['top', 'xyz', 'work', 'bid', 'click', 'ga', 'cf', 'ml', 'tk'];
      const tld = domainParts[domainParts.length - 1];
      if (suspiciousTlds.includes(tld)) {
        indicators.push('SUSPICIOUS_TLD');
      }

      if (indicators.length > 0) {
        suspiciousUrls.push({
          url: rawUrl,
          indicators,
          domain: hostname,
          protocol: urlObj.protocol.replace(':', ''),
          port: urlObj.port || '',
          pathLength: urlObj.pathname.length,
          queryParamCount: [...urlObj.searchParams.keys()].length,
          redirectHints,
          redirectChain: redirectResolution.redirectChain,
          finalUrl: redirectResolution.finalUrl,
          redirectCount: redirectResolution.redirectCount,
          fetchError: redirectResolution.fetchError,
          sandbox: {
            networkFetchEnabled: redirectResolution.enabled,
            redirectLimit: REDIRECT_LIMIT,
            timeoutMs: FETCH_TIMEOUT_MS
          },
          punycode: asciiHostname !== unicodeHostname ? { ascii: asciiHostname, unicode: unicodeHostname } : null,
          isLookalike,
          similarityScore,
          targetBrand
        });
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }

  return {
    totalUrls: urls.size,
    suspiciousUrls
  };
};
