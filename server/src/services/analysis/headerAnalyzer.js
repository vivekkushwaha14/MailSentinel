/**
 * Analyzes email headers for SPF, DKIM, DMARC results and routing anomalies
 * @param {Object} headers - Raw headers from mailparser
 * @returns {Object} - Forensic header analysis
 */
const buildRouteTimeline = (receivedHops = []) => {
  const timeline = [...receivedHops]
    .sort((a, b) => (a.hop || 0) - (b.hop || 0))
    .map((hop) => ({
      ...hop,
      delayFromPreviousSeconds: null,
      anomalies: []
    }));

  for (let i = 1; i < timeline.length; i += 1) {
    const previousDate = timeline[i - 1].date ? new Date(timeline[i - 1].date) : null;
    const currentDate = timeline[i].date ? new Date(timeline[i].date) : null;

    if (!previousDate || !currentDate || Number.isNaN(previousDate.getTime()) || Number.isNaN(currentDate.getTime())) {
      continue;
    }

    const delaySeconds = Math.round((currentDate - previousDate) / 1000);
    timeline[i].delayFromPreviousSeconds = delaySeconds;

    if (delaySeconds < 0) {
      timeline[i].anomalies.push('NEGATIVE_HOP_DELAY');
    } else if (delaySeconds > 30 * 60) {
      timeline[i].anomalies.push('LONG_HOP_DELAY');
    }
  }

  return timeline;
};

exports.analyzeHeaders = (headers, receivedHops = []) => {
  const routeTimeline = buildRouteTimeline(receivedHops);
  const results = {
    spfPass: null,
    dkimPass: null,
    dmarcPass: null,
    routingAnomalies: [],
    errors: [],
    routeTimeline,
    authResults: {}
  };

  // 1. Extract Authentication-Results
  const authResultsHeader = headers.get('authentication-results');
  if (authResultsHeader) {
    const rawAuth = Array.isArray(authResultsHeader) ? authResultsHeader[0] : authResultsHeader;
    
    results.spfPass = rawAuth.includes('spf=pass');
    results.dkimPass = rawAuth.includes('dkim=pass');
    results.dmarcPass = rawAuth.includes('dmarc=pass');
    
    results.authResults = {
      raw: rawAuth,
      spf: results.spfPass ? 'pass' : (rawAuth.includes('spf=fail') ? 'fail' : 'unknown'),
      dkim: results.dkimPass ? 'pass' : (rawAuth.includes('dkim=fail') ? 'fail' : 'unknown'),
      dmarc: results.dmarcPass ? 'pass' : (rawAuth.includes('dmarc=fail') ? 'fail' : 'unknown')
    };
  }

  // 2. Routing Anomalies (Simplified)
  const receivedHeaders = headers.get('received');
  if (!receivedHeaders) {
    results.routingAnomalies.push('No Received headers found - possible forging or direct injection');
  } else {
    const receivedArray = Array.isArray(receivedHeaders) ? receivedHeaders : [receivedHeaders];

    // Check for unusual gaps or suspicious relays (placeholder logic)
    if (receivedArray.length > 15) {
      results.routingAnomalies.push('Excessive number of relays detected');
    }

    for (let i = 1; i < routeTimeline.length; i += 1) {
      if (routeTimeline[i].anomalies.includes('NEGATIVE_HOP_DELAY')) {
        results.routingAnomalies.push('Received header dates are out of order');
        break;
      }
    }

    if (routeTimeline.some((hop) => hop.anomalies.includes('LONG_HOP_DELAY'))) {
      results.routingAnomalies.push('Long delay detected between Received header hops');
    }
  }

  return results;
};
