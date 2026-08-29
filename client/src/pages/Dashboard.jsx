import { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, FileText, FolderKanban, Network } from 'lucide-react';

const riskClass = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200'
};

const Dashboard = () => {
  const [data, setData] = useState({ cases: [], emails: [], campaigns: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.all([
      api.get('/cases'),
      api.get('/emails?limit=8'),
      api.get('/campaigns')
    ])
      .then(([casesRes, emailsRes, campaignsRes]) => {
        if (!active) return;
        setData({
          cases: casesRes.data,
          emails: emailsRes.data,
          campaigns: campaignsRes.data
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load dashboard data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const openCases = data.cases.filter((item) => item.status !== 'closed' && item.status !== 'resolved').length;
  const highRiskEmails = data.emails.filter((item) => ['HIGH', 'CRITICAL'].includes(item.analysis?.riskLevel)).length;
  const latestEmails = data.emails.slice(0, 5);
  const activeCampaigns = data.campaigns.filter((item) => item.confidence !== 'low').length;

  if (loading) {
    return <div className="rounded border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">Current investigation load and recent email analysis.</p>
        </div>
        <Link
          to="/analyze"
          className="inline-flex items-center justify-center gap-2 rounded bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <FileText size={16} />
          Analyze email
        </Link>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Total cases" value={data.cases.length} icon={FolderKanban} />
        <Metric title="Open cases" value={openCases} icon={Activity} />
        <Metric title="High risk emails" value={highRiskEmails} icon={AlertTriangle} />
        <Metric title="Campaign leads" value={activeCampaigns} icon={Network} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h3 className="font-semibold">Recent analyses</h3>
            <Link to="/analyze" className="text-sm font-medium text-gray-600 hover:text-gray-950">New upload</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {latestEmails.length === 0 ? (
              <EmptyState text="No analyzed emails yet." />
            ) : (
              latestEmails.map((email) => (
                <Link
                  key={email._id}
                  to={`/investigation/${email._id}`}
                  className="grid gap-3 px-5 py-4 hover:bg-gray-50 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{email.subject}</p>
                    <p className="mt-1 truncate text-sm text-gray-500">{email.from?.address || 'Unknown sender'}</p>
                  </div>
                  <span className={`w-fit rounded border px-2.5 py-1 text-xs font-semibold ${riskClass[email.analysis?.riskLevel] || 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                    {email.analysis?.riskLevel || 'PENDING'}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h3 className="font-semibold">Active cases</h3>
            <Link to="/cases" className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-950">
              View all <ArrowRight size={15} />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data.cases.slice(0, 5).length === 0 ? (
              <EmptyState text="Create a case to organize evidence." />
            ) : (
              data.cases.slice(0, 5).map((item) => (
                <Link key={item._id} to={`/cases/${item._id}`} className="block px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="mt-1 text-xs font-medium uppercase text-gray-500">{item.caseId}</p>
                    </div>
                    <span className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                      {item.severity}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const Metric = ({ title, value, icon: Icon }) => (
  <div className="rounded border border-gray-200 bg-white p-5">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <Icon size={18} className="text-gray-400" />
    </div>
    <p className="mt-4 text-3xl font-semibold tracking-normal">{value}</p>
  </div>
);

const EmptyState = ({ text }) => (
  <div className="px-5 py-8 text-center text-sm text-gray-500">{text}</div>
);

export default Dashboard;
