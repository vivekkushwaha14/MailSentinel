import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import { MapContainer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Download, ExternalLink, FileWarning, Link as LinkIcon, MailWarning, MapPin, Save, ShieldCheck } from 'lucide-react';

const riskStyles = {
  LOW: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-700',
  HIGH: 'border-orange-200 bg-orange-50 text-orange-700',
  CRITICAL: 'border-red-200 bg-red-50 text-red-700'
};

const formatDelay = (seconds) => {
  if (seconds === null || seconds === undefined) return '';
  if (seconds < 0) return `${seconds}s`;
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
};

const Investigation = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [verdict, setVerdict] = useState({ status: 'unreviewed', confidence: 'low', note: '' });
  const [savingVerdict, setSavingVerdict] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/emails/${id}`)
      .then((res) => {
        if (!active) return;
        setData(res.data);
        setVerdict({
          status: res.data.email.verdict?.status || 'unreviewed',
          confidence: res.data.email.verdict?.confidence || 'low',
          note: res.data.email.verdict?.note || ''
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load investigation');
      });

    return () => {
      active = false;
    };
  }, [id]);

  const downloadReport = async (format) => {
    const responseType = format === 'json' ? 'json' : 'text';
    const res = await api.get(`/reports/${id}?format=${format}`, { responseType });
    const content = format === 'json' ? JSON.stringify(res.data, null, 2) : res.data;
    const mimeType = format === 'csv' ? 'text/csv' : format === 'html' ? 'text/html' : 'application/json';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = format === 'csv'
      ? `mailsentinel-iocs-${id}.csv`
      : `mailsentinel-report-${id}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const saveVerdict = async (event) => {
    event.preventDefault();
    setSavingVerdict(true);
    setError('');

    try {
      const res = await api.put(`/emails/${id}/verdict`, verdict);
      setData((current) => ({
        ...current,
        email: { ...current.email, verdict: res.data }
      }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save verdict');
    } finally {
      setSavingVerdict(false);
    }
  };

  if (!data && !error) {
    return <div className="rounded border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading investigation details...</div>;
  }

  if (error) {
    return <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  const { email, analysis } = data;
  const recipients = email.to?.map((item) => item.address).filter(Boolean).join(', ') || 'No recipients parsed';
  const linkedCaseId = email.caseId?._id || email.caseId;
  const suspiciousUrls = analysis?.urlAnalysis?.suspiciousUrls || [];
  const attachments = analysis?.attachmentAnalysis?.attachments || [];
  const keywords = analysis?.keywordAnalysis || [];
  const routeTimeline = analysis?.headerForensics?.routeTimeline || email.receivedHeaders || [];
  const threatIntel = analysis?.threatIntel;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-gray-500">{email.messageId || 'No message id'}</p>
          <h1 className="mt-1 break-words text-2xl font-semibold tracking-normal">{email.subject}</h1>
          {linkedCaseId && (
            <Link to={`/cases/${linkedCaseId}`} className="mt-2 inline-flex text-sm font-medium text-gray-600 hover:text-gray-950">
              Open linked case
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {['json', 'csv', 'html'].map((format) => (
            <button
              key={format}
              type="button"
              onClick={() => downloadReport(format)}
              className="inline-flex items-center justify-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm font-semibold uppercase text-gray-800 hover:bg-gray-50"
            >
              <Download size={15} />
              {format}
            </button>
          ))}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Threat score" value={`${analysis?.threatScore ?? 0}/100`} icon={MailWarning} tone={riskStyles[analysis?.riskLevel]} />
        <Metric label="Risk level" value={analysis?.riskLevel || 'LOW'} icon={ShieldCheck} tone={riskStyles[analysis?.riskLevel]} />
        <Metric label="Suspicious URLs" value={suspiciousUrls.length} icon={LinkIcon} />
        <Metric label="Attachments" value={attachments.length} icon={FileWarning} />
      </section>

      <section className="rounded border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold">Message metadata</h2>
        </div>
        <dl className="grid gap-px bg-gray-100 text-sm sm:grid-cols-2">
          <Metadata label="From" value={email.from?.address || 'Unknown'} />
          <Metadata label="To" value={recipients} />
          <Metadata label="Reply-To" value={email.replyTo?.address || 'Not present'} />
          <Metadata label="Date" value={email.date ? new Date(email.date).toLocaleString() : 'Unknown'} />
          <Metadata label="Evidence" value={email.evidenceId?.originalFilename || 'Unknown file'} />
          <Metadata label="SHA-256" value={email.evidenceId?.fileHash || 'Unavailable'} />
        </dl>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="rounded border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold">Analyst explanation</h2>
          </div>
          <div className="p-5">
            <p className="text-sm leading-6 text-gray-700">{analysis?.analystSummary?.summary || 'No summary available.'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                Type: {analysis?.analystSummary?.likelyAttackType || 'unknown'}
              </span>
              <span className="rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                Confidence: {analysis?.analystSummary?.confidence || 'low'}
              </span>
            </div>
            {analysis?.analystSummary?.recommendedActions?.length > 0 && (
              <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-gray-600">
                {analysis.analystSummary.recommendedActions.map((action) => <li key={action}>{action}</li>)}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold">Analyst verdict</h2>
          </div>
          <form onSubmit={saveVerdict} className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Verdict</span>
                <select
                  value={verdict.status}
                  onChange={(e) => setVerdict({ ...verdict, status: e.target.value })}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-950"
                >
                  <option value="unreviewed">Unreviewed</option>
                  <option value="malicious">Malicious</option>
                  <option value="suspicious">Suspicious</option>
                  <option value="benign">Benign</option>
                  <option value="false_positive">False positive</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Confidence</span>
                <select
                  value={verdict.confidence}
                  onChange={(e) => setVerdict({ ...verdict, confidence: e.target.value })}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-950"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
            <textarea
              rows={4}
              value={verdict.note}
              onChange={(e) => setVerdict({ ...verdict, note: e.target.value })}
              className="w-full resize-y rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-950"
              placeholder="Verdict note"
            />
            <button
              type="submit"
              disabled={savingVerdict}
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              <Save size={16} />
              {savingVerdict ? 'Saving...' : 'Save verdict'}
            </button>
          </form>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="rounded border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold">Forensic score breakdown</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {analysis?.scoreBreakdown?.length ? (
              analysis.scoreBreakdown.map((item) => (
                <div key={`${item.ruleId}-${item.category}`} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-medium">{item.category}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.explanation}</p>
                    <p className="mt-1 text-xs font-medium uppercase text-gray-400">{item.ruleId}</p>
                  </div>
                  <span className="w-fit rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-semibold text-gray-700">
                    +{item.scoreImpact}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No scoring rules were triggered.</div>
            )}
          </div>
        </section>

        <section className="rounded border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold">Authentication</h2>
          </div>
          <div className="space-y-3 p-5">
            <AuthStatus label="SPF" value={analysis?.headerForensics?.spfPass} />
            <AuthStatus label="DKIM" value={analysis?.headerForensics?.dkimPass} />
            <AuthStatus label="DMARC" value={analysis?.headerForensics?.dmarcPass} />
            {analysis?.headerForensics?.routingAnomalies?.length > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {analysis.headerForensics.routingAnomalies.join(', ')}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Suspicious URLs">
          {suspiciousUrls.length ? (
            suspiciousUrls.map((item) => (
              <div key={item.url} className="rounded border border-gray-200 p-3">
                <a href={item.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 break-all text-sm font-medium text-gray-900 hover:underline">
                  {item.url}
                  <ExternalLink size={14} className="mt-0.5 shrink-0 text-gray-400" />
                </a>
                <TagList items={item.indicators} />
                {(item.finalUrl && item.finalUrl !== item.url) && (
                  <p className="mt-2 break-all text-xs text-gray-500">Final URL: {item.finalUrl}</p>
                )}
                {item.redirectChain?.length > 0 && (
                  <div className="mt-3 space-y-2 rounded border border-gray-100 bg-gray-50 p-2">
                    {item.redirectChain.map((redirect) => (
                      <p key={`${redirect.status}-${redirect.from}-${redirect.to}`} className="break-all text-xs text-gray-600">
                        {`${redirect.status}: ${redirect.from} -> ${redirect.to}`}
                      </p>
                    ))}
                  </div>
                )}
                {item.sandbox && (
                  <p className="mt-2 text-xs text-gray-500">
                    Sandbox fetch: {item.sandbox.networkFetchEnabled ? 'enabled' : 'disabled'} · timeout {item.sandbox.timeoutMs || 0}ms
                  </p>
                )}
                {item.fetchError && <p className="mt-2 text-xs font-medium text-amber-700">{item.fetchError}</p>}
              </div>
            ))
          ) : (
            <Empty text="No suspicious URLs detected." />
          )}
        </Panel>

        <Panel title="Attachments">
          {attachments.length ? (
            attachments.map((item) => (
              <div key={`${item.filename}-${item.fileHash}`} className="rounded border border-gray-200 p-3">
                <p className="break-words text-sm font-medium">{item.filename}</p>
                <p className="mt-1 text-xs text-gray-500">{item.mimeType || item.extension} · {item.size || 0} bytes</p>
                <TagList items={[item.riskLevel, ...(item.indicators || [])]} />
                {item.fileHash && <p className="mt-2 break-all text-xs text-gray-500">Hash: {item.fileHash}</p>}
                {item.deepAnalysis?.embeddedUrls?.length > 0 && (
                  <div className="mt-3 rounded border border-gray-100 bg-gray-50 p-2">
                    <p className="text-xs font-semibold uppercase text-gray-500">Embedded URLs</p>
                    {item.deepAnalysis.embeddedUrls.map((url) => (
                      <p key={url} className="mt-1 break-all text-xs text-gray-600">{url}</p>
                    ))}
                  </div>
                )}
                {(item.deepAnalysis?.mimeMismatch || item.deepAnalysis?.magicNumberMismatch || item.deepAnalysis?.contentSample) && (
                  <div className="mt-3 grid gap-2 text-xs text-gray-500">
                    {item.deepAnalysis.mimeMismatch && <span>MIME mismatch detected</span>}
                    {item.deepAnalysis.magicNumberMismatch && <span>File signature mismatch detected</span>}
                    {item.deepAnalysis.contentSample && <span className="break-all">Signature sample: {item.deepAnalysis.contentSample}</span>}
                  </div>
                )}
              </div>
            ))
          ) : (
            <Empty text="No attachments found." />
          )}
        </Panel>

        <Panel title="Content indicators">
          {keywords.length ? (
            keywords.slice(0, 12).map((item) => (
              <div key={`${item.category}-${item.matchedText}`} className="rounded border border-gray-200 p-3">
                <p className="text-sm font-medium">{item.matchedText}</p>
                <p className="mt-1 text-xs text-gray-500">{item.category} · {item.severity}</p>
              </div>
            ))
          ) : (
            <Empty text="No suspicious keywords detected." />
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Threat intelligence">
          {threatIntel ? (
            <>
              <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm">
                <p className="font-semibold">Local risk score: {threatIntel.riskScore || 0}/100</p>
                <p className="mt-1 text-gray-500">Provider: {threatIntel.provider || 'local-rules'}</p>
              </div>
              <IntelGroup title="Domains" items={threatIntel.domains} labelKey="domain" />
              <IpGeolocation items={threatIntel.ips} />
              <IntelGroup title="Hashes" items={threatIntel.hashes} labelKey="hash" />
            </>
          ) : (
            <Empty text="No enrichment data available." />
          )}
        </Panel>

        <Panel title="Header route timeline">
          {routeTimeline.length ? (
            routeTimeline.map((hop) => (
              <div key={`${hop.hop}-${hop.raw || hop.ip}`} className="rounded border border-gray-200 p-3">
                <p className="text-sm font-semibold">Hop {hop.hop}: {hop.from || 'Unknown source'}</p>
                <p className="mt-1 text-sm text-gray-600">By {hop.by || 'unknown relay'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {hop.ip && <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">{hop.ip}</span>}
                  {hop.isPrivate && <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">private</span>}
                  {formatDelay(hop.delayFromPreviousSeconds) && <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">delay {formatDelay(hop.delayFromPreviousSeconds)}</span>}
                  {hop.date && <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">{new Date(hop.date).toLocaleString()}</span>}
                </div>
                <TagList items={hop.anomalies || []} />
              </div>
            ))
          ) : (
            <Empty text="No Received headers were parsed." />
          )}
        </Panel>
      </div>

      <section className="rounded border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold">Plain text body</h2>
        </div>
        <div className="max-h-96 overflow-auto p-5">
          <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">{email.bodyText || 'No plain text body parsed.'}</pre>
        </div>
      </section>
    </div>
  );
};

const Metric = ({ label, value, icon: Icon, tone = 'border-gray-200 bg-white text-gray-950' }) => (
  <div className={`rounded border p-5 ${tone}`}>
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium opacity-80">{label}</p>
      <Icon size={18} className="opacity-70" />
    </div>
    <p className="mt-4 text-2xl font-semibold tracking-normal">{value}</p>
  </div>
);

const Metadata = ({ label, value }) => (
  <div className="bg-white p-4">
    <dt className="text-xs font-semibold uppercase text-gray-500">{label}</dt>
    <dd className="mt-1 break-words text-gray-900">{value}</dd>
  </div>
);

const AuthStatus = ({ label, value }) => {
  const status = value === true ? 'pass' : value === false ? 'fail' : 'unknown';
  const className = value === true
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : value === false
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-gray-200 bg-gray-50 text-gray-600';

  return (
    <div className="flex items-center justify-between rounded border border-gray-200 p-3">
      <span className="text-sm font-medium">{label}</span>
      <span className={`rounded border px-2.5 py-1 text-xs font-semibold ${className}`}>{status}</span>
    </div>
  );
};

const Panel = ({ title, children }) => (
  <section className="rounded border border-gray-200 bg-white">
    <div className="border-b border-gray-200 px-5 py-4">
      <h2 className="font-semibold">{title}</h2>
    </div>
    <div className="space-y-3 p-5">{children}</div>
  </section>
);

const TagList = ({ items }) => (
  <div className="mt-3 flex flex-wrap gap-2">
    {items.filter(Boolean).map((item) => (
      <span key={item} className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">{item}</span>
    ))}
  </div>
);

const Empty = ({ text }) => <p className="text-sm text-gray-500">{text}</p>;

const IntelGroup = ({ title, items = [], labelKey }) => {
  if (!items.length) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      <div className="space-y-2">
        {items.slice(0, 8).map((item) => (
          <div key={item[labelKey]} className="rounded border border-gray-200 p-3">
            <p className="break-words text-sm font-medium">{item[labelKey]}</p>
            <p className="mt-1 text-xs text-gray-500">{item.reputation || 'unknown'} · risk {item.riskScore || 0}</p>
            <TagList items={item.indicators || []} />
          </div>
        ))}
      </div>
    </div>
  );
};

const IpGeolocation = ({ items = [] }) => {
  if (!items.length) return null;

  const geoPoints = items.filter((item) =>
    Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
  );
  const center = geoPoints.length
    ? [geoPoints[0].latitude, geoPoints[0].longitude]
    : [20, 0];

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <MapPin size={15} className="text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700">IP geolocation</h3>
      </div>

      {geoPoints.length > 0 && (
        <div className="mb-3 overflow-hidden rounded border border-gray-200">
          <MapContainer center={center} zoom={2} scrollWheelZoom={false} attributionControl={false} style={{ height: 220, width: '100%' }}>
            {geoPoints.map((item) => (
              <CircleMarker
                key={item.ip}
                center={[item.latitude, item.longitude]}
                radius={8}
                pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.75 }}
              >
                <Popup>
                  <strong>{item.ip}</strong>
                  <br />
                  {[item.city, item.region, item.country].filter(Boolean).join(', ') || 'Unknown location'}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      <div className="space-y-2">
        {items.slice(0, 8).map((item) => (
          <div key={item.ip} className="rounded border border-gray-200 p-3">
            <p className="break-words text-sm font-medium">{item.ip}</p>
            <p className="mt-1 text-xs text-gray-500">
              {[item.city, item.region, item.country].filter(Boolean).join(', ') || 'Unknown location'}
              {item.organization ? ` · ${item.organization}` : ''}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Source: {item.geolocationSource || item.geolocation?.source || 'local-rules'} · confidence {item.geolocationConfidence || item.geolocation?.confidence || 'unknown'}
            </p>
            <TagList items={[item.reputation, ...(item.indicators || [])]} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Investigation;
