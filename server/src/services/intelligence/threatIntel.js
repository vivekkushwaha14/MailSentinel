const crypto = require('crypto');
const path = require('path');
const { resolveIPIntel } = require('./ipIntelligence');

const SUSPICIOUS_TLDS = new Set(['top', 'xyz', 'work', 'bid', 'click', 'ga', 'cf', 'ml', 'tk', 'zip', 'mov']);
const TRUSTED_DOMAINS = new Set(['google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'paypal.com', 'linkedin.com']);
const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly', 'rebrand.ly']);
const DANGEROUS_HASH_PREFIXES = ['000000', 'deadbe', 'badbad'];
let registeredProvider = null;
let configuredProviderLoaded = false;

const normalizeDomain = (domain = '') => domain.toLowerCase().replace(/^www\./, '').trim();

const getRootDomain = (hostname = '') => {
  const parts = normalizeDomain(hostname).split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  return parts.slice(-2).join('.');
};

const enrichDomain = (domain = '') => {
  const normalized = normalizeDomain(domain);
  const parts = normalized.split('.').filter(Boolean);
  const tld = parts.at(-1) || '';
  const rootDomain = getRootDomain(normalized);
  const indicators = [];
  let reputation = 'unknown';
  let riskScore = 0;

  if (!normalized) {
    indicators.push('DOMAIN_MISSING');
    riskScore += 4;
  }

  if (TRUSTED_DOMAINS.has(rootDomain)) {
    reputation = 'trusted';
  }

  if (SUSPICIOUS_TLDS.has(tld)) {
    indicators.push('SUSPICIOUS_TLD');
    riskScore += 12;
  }

  if (parts.length > 4) {
    indicators.push('DEEP_SUBDOMAIN_CHAIN');
    riskScore += 8;
  }

  if (/\d{4,}/.test(normalized) || normalized.includes('--')) {
    indicators.push('RANDOMIZED_DOMAIN_PATTERN');
    riskScore += 8;
  }

  if (riskScore >= 15) reputation = 'suspicious';
  if (riskScore >= 25) reputation = 'malicious';

  return {
    domain: normalized,
    rootDomain,
    reputation,
    riskScore: Math.min(riskScore, 100),
    indicators,
    source: 'local-rules'
  };
};

const enrichIp = async (ip = '') => {
  const octets = ip.split('.').map(Number);
  const isPrivate = ip.startsWith('10.') || ip.startsWith('192.168.') ||
    (ip.startsWith('172.') && octets[1] >= 16 && octets[1] <= 31) ||
    ip === '127.0.0.1';
  const isDocumentation = ip.startsWith('192.0.2.') || ip.startsWith('198.51.100.') || ip.startsWith('203.0.113.');
  const indicators = [];
  let reputation = 'unknown';
  let riskScore = 0;

  if (isPrivate) {
    indicators.push('PRIVATE_IP');
    reputation = 'internal';
  }

  if (isDocumentation) {
    indicators.push('DOCUMENTATION_RANGE');
  }

  if (!isPrivate && !isDocumentation && ip) {
    riskScore += 3;
  }

  const geoIntel = await resolveIPIntel(ip);

  return {
    ip,
    reputation,
    riskScore,
    indicators,
    source: 'local-rules',
    version: geoIntel.version,
    organization: geoIntel.organization,
    asn: geoIntel.asn,
    isp: geoIntel.isp,
    country: geoIntel.country,
    countryCode: geoIntel.countryCode,
    region: geoIntel.region,
    city: geoIntel.city,
    latitude: geoIntel.latitude,
    longitude: geoIntel.longitude,
    geolocationSource: geoIntel.geolocationSource,
    geolocationConfidence: geoIntel.geolocationConfidence,
    geolocation: geoIntel.geolocation
  };
};

const enrichHash = (hash = '') => {
  const normalized = hash.toLowerCase();
  const indicators = [];
  let reputation = 'unknown';
  let riskScore = 0;

  if (DANGEROUS_HASH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    indicators.push('LOCAL_BAD_HASH_PATTERN');
    reputation = 'malicious';
    riskScore = 90;
  }

  return {
    hash,
    reputation,
    riskScore,
    indicators,
    source: 'local-rules'
  };
};

const fingerprint = (value) => crypto.createHash('sha256').update(value || '').digest('hex').slice(0, 16);

const loadConfiguredProvider = () => {
  if (registeredProvider || configuredProviderLoaded) return registeredProvider;
  configuredProviderLoaded = true;

  const modulePath = process.env.MAILSENTINEL_THREAT_INTEL_PROVIDER;
  if (!modulePath) return null;

  try {
    const resolvedPath = path.isAbsolute(modulePath)
      ? modulePath
      : path.resolve(process.cwd(), modulePath);
    registeredProvider = require(resolvedPath);
  } catch (error) {
    console.error(`[-] Threat intel provider load failed: ${error.message}`);
  }

  return registeredProvider;
};

const mergeIntelItem = (localItem, providerItem = {}) => {
  if (!providerItem || typeof providerItem !== 'object') return localItem;

  return {
    ...localItem,
    ...providerItem,
    riskScore: Math.max(localItem.riskScore || 0, providerItem.riskScore || 0),
    indicators: [...new Set([...(localItem.indicators || []), ...(providerItem.indicators || [])])],
    source: providerItem.source || localItem.source
  };
};

const enrichWithProvider = async (methodName, localItem) => {
  const provider = loadConfiguredProvider();
  if (!provider || typeof provider[methodName] !== 'function') return localItem;

  try {
    const providerItem = await provider[methodName](localItem);
    return mergeIntelItem(localItem, providerItem);
  } catch (error) {
    return mergeIntelItem(localItem, {
      indicators: [`${methodName.toUpperCase()}_PROVIDER_ERROR`],
      source: localItem.source
    });
  }
};

const enrichUrl = (urlItem) => {
  const domainIntel = enrichDomain(urlItem.domain);
  const isShortener = SHORTENERS.has(domainIntel.rootDomain);
  const indicators = [...new Set([...(urlItem.indicators || []), ...domainIntel.indicators])];
  let reputation = domainIntel.reputation;
  let riskScore = domainIntel.riskScore + (urlItem.indicators?.length || 0) * 6;

  if (isShortener) {
    indicators.push('URL_SHORTENER');
    riskScore += 12;
  }

  if (riskScore >= 20 && reputation === 'unknown') reputation = 'suspicious';
  if (riskScore >= 40) reputation = 'malicious';

  return {
    value: urlItem.url,
    fingerprint: fingerprint(urlItem.url),
    type: 'url',
    reputation,
    riskScore: Math.min(riskScore, 100),
    indicators,
    source: 'local-rules'
  };
};

exports.registerThreatIntelProvider = (provider) => {
  registeredProvider = provider;
  configuredProviderLoaded = true;
};

exports.enrichThreatIntel = async ({ emailData, urlAnalysis, attachmentAnalysis }) => {
  const domains = new Map();
  const ips = new Map();
  const urls = [];
  const hashes = [];

  if (emailData.from?.domain) domains.set(emailData.from.domain, enrichDomain(emailData.from.domain));
  if (emailData.replyTo?.domain) domains.set(emailData.replyTo.domain, enrichDomain(emailData.replyTo.domain));
  if (emailData.returnPath?.domain) domains.set(emailData.returnPath.domain, enrichDomain(emailData.returnPath.domain));

  urlAnalysis.suspiciousUrls.forEach((url) => {
    urls.push(enrichUrl(url));
    if (url.domain) domains.set(url.domain, enrichDomain(url.domain));
  });

  emailData.receivedHeaders?.forEach((hop) => {
    if (hop.ip) ips.set(hop.ip, hop.ip);
  });

  attachmentAnalysis.attachments.forEach((attachment) => {
    if (attachment.fileHash) hashes.push(enrichHash(attachment.fileHash));
  });

  const enrichedDomains = await Promise.all(
    [...domains.values()].map((item) => enrichWithProvider('enrichDomain', item))
  );
  const enrichedIps = await Promise.all(
    [...ips.values()].map(async (ip) => enrichWithProvider('enrichIp', await enrichIp(ip)))
  );
  const enrichedUrls = await Promise.all(
    urls.map((item) => enrichWithProvider('enrichUrl', item))
  );
  const enrichedHashes = await Promise.all(
    hashes.map((item) => enrichWithProvider('enrichHash', item))
  );

  const localAggregate = {
    domains: enrichedDomains,
    ips: enrichedIps,
    urls: enrichedUrls,
    hashes: enrichedHashes
  };

  const provider = loadConfiguredProvider();
  if (provider && typeof provider.enrichThreatIntel === 'function') {
    try {
      const aggregate = await provider.enrichThreatIntel({
        emailData,
        urlAnalysis,
        attachmentAnalysis,
        localIntel: localAggregate
      });

      if (aggregate && typeof aggregate === 'object') {
        localAggregate.domains = aggregate.domains || localAggregate.domains;
        localAggregate.ips = aggregate.ips || localAggregate.ips;
        localAggregate.urls = aggregate.urls || localAggregate.urls;
        localAggregate.hashes = aggregate.hashes || localAggregate.hashes;
      }
    } catch (error) {
      localAggregate.providerError = error.message;
    }
  }

  const riskScore = [
    ...localAggregate.domains,
    ...localAggregate.ips,
    ...localAggregate.urls,
    ...localAggregate.hashes
  ]
    .reduce((total, item) => total + (item.riskScore || 0), 0);

  return {
    riskScore: Math.min(riskScore, 100),
    domains: localAggregate.domains,
    ips: localAggregate.ips,
    urls: localAggregate.urls,
    hashes: localAggregate.hashes,
    generatedAt: new Date(),
    provider: provider?.name || process.env.MAILSENTINEL_THREAT_INTEL_PROVIDER || 'local-rules',
    providerError: localAggregate.providerError || ''
  };
};
