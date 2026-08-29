const path = require('path');

let registeredProvider = null;
let configuredProviderLoaded = false;

const KNOWN_IP_GEO = {
  '1.1.1.1': {
    asn: 'AS13335',
    isp: 'Cloudflare',
    organization: 'Cloudflare',
    country: 'Australia',
    countryCode: 'AU',
    region: 'Queensland',
    city: 'South Brisbane',
    latitude: -27.4766,
    longitude: 153.0166,
    geolocationSource: 'built-in-known-ip'
  },
  '8.8.8.8': {
    asn: 'AS15169',
    isp: 'Google LLC',
    organization: 'Google Public DNS',
    country: 'United States',
    countryCode: 'US',
    region: 'California',
    city: 'Mountain View',
    latitude: 37.4223,
    longitude: -122.0847,
    geolocationSource: 'built-in-known-ip'
  },
  '9.9.9.9': {
    asn: 'AS19281',
    isp: 'Quad9',
    organization: 'Quad9',
    country: 'Switzerland',
    countryCode: 'CH',
    region: 'Zurich',
    city: 'Zurich',
    latitude: 47.3769,
    longitude: 8.5417,
    geolocationSource: 'built-in-known-ip'
  }
};

const loadConfiguredProvider = () => {
  if (registeredProvider || configuredProviderLoaded) return registeredProvider;
  configuredProviderLoaded = true;

  const modulePath = process.env.MAILSENTINEL_IP_GEO_PROVIDER;
  if (!modulePath) return null;

  try {
    const resolvedPath = path.isAbsolute(modulePath)
      ? modulePath
      : path.resolve(process.cwd(), modulePath);
    registeredProvider = require(resolvedPath);
  } catch (error) {
    console.error(`[-] IP geolocation provider load failed: ${error.message}`);
  }

  return registeredProvider;
};

exports.registerIpGeolocationProvider = (provider) => {
  registeredProvider = provider;
  configuredProviderLoaded = true;
};

const classifyIp = (ip) => {
  const octets = ip.split('.').map(Number);
  const isPrivate = ip.startsWith('10.') || ip.startsWith('192.168.') ||
    (ip.startsWith('172.') && octets[1] >= 16 && octets[1] <= 31) ||
    ip === '127.0.0.1';
  const isDocumentation = ip.startsWith('192.0.2.') || ip.startsWith('198.51.100.') || ip.startsWith('203.0.113.');
  const version = ip.includes(':') ? 'IPv6' : 'IPv4';

  return { isPrivate, isDocumentation, version };
};

const withGeoObject = (intel) => ({
  ...intel,
  geolocation: {
    country: intel.country || '',
    countryCode: intel.countryCode || '',
    region: intel.region || '',
    city: intel.city || '',
    latitude: intel.latitude,
    longitude: intel.longitude,
    source: intel.geolocationSource || 'local-rules',
    confidence: intel.geolocationConfidence || (Number.isFinite(intel.latitude) && Number.isFinite(intel.longitude) ? 'medium' : 'unknown')
  }
});

/**
 * Resolves IP network and geolocation intelligence.
 * External lookups can be supplied through MAILSENTINEL_IP_GEO_PROVIDER.
 * @param {string} ip - IP address to resolve
 * @returns {Promise<Object>} - IP intelligence data
 */
exports.resolveIPIntel = async (ip) => {
  const { isPrivate, isDocumentation, version } = classifyIp(ip);

  if (isPrivate) {
    return withGeoObject({
      ip,
      version,
      isPrivate: true,
      organization: 'Local Network / Private IP',
      country: 'Internal',
      city: 'Private Range',
      geolocationSource: 'local-rules',
      geolocationConfidence: 'high',
      lastUpdated: new Date()
    });
  }

  if (isDocumentation) {
    return withGeoObject({
      ip,
      version,
      isPrivate: false,
      organization: 'Documentation Range',
      country: 'Reserved',
      city: 'Documentation',
      geolocationSource: 'local-rules',
      geolocationConfidence: 'high',
      lastUpdated: new Date()
    });
  }

  const provider = loadConfiguredProvider();
  if (provider && typeof provider.resolveIPIntel === 'function') {
    try {
      return withGeoObject({
        ip,
        version,
        isPrivate: false,
        ...(await provider.resolveIPIntel(ip)),
        lastUpdated: new Date()
      });
    } catch (error) {
      return withGeoObject({
        ip,
        version,
        isPrivate: false,
        organization: 'Unknown',
        country: 'Unknown',
        city: 'Unknown',
        geolocationSource: 'provider-error',
        geolocationConfidence: 'unknown',
        geolocationError: error.message,
        lastUpdated: new Date()
      });
    }
  }

  if (KNOWN_IP_GEO[ip]) {
    return withGeoObject({
      ip,
      version,
      isPrivate: false,
      ...KNOWN_IP_GEO[ip],
      geolocationConfidence: 'medium',
      lastUpdated: new Date()
    });
  }

  return withGeoObject({
    ip,
    version,
    isPrivate: false,
    organization: 'Unknown',
    country: 'Unknown',
    city: 'Unknown',
    geolocationSource: 'local-rules',
    geolocationConfidence: 'unknown',
    lastUpdated: new Date()
  });
};
