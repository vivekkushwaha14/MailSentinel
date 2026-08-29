import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Network } from 'lucide-react';
import api from '../services/api';

const confidenceClass = {
  low: 'border-gray-200 bg-gray-50 text-gray-600',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  high: 'border-red-200 bg-red-50 text-red-700'
};

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api.get('/campaigns')
      .then((res) => {
        if (active) setCampaigns(res.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load campaigns');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="rounded border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading campaigns...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-normal">Campaigns</h2>
        <p className="mt-1 text-sm text-gray-500">Correlated email clusters detected from shared indicators.</p>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="rounded border border-gray-200 bg-white">
        <div className="divide-y divide-gray-100">
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <Network size={34} className="text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-700">No campaigns detected</p>
              <p className="mt-1 max-w-md text-sm text-gray-500">Campaigns appear when analyzed emails share strong sender, domain, IP, or attachment indicators.</p>
            </div>
          ) : (
            campaigns.map((campaign) => (
              <div key={campaign._id} className="px-5 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <Link to={`/campaigns/${campaign._id}`} className="min-w-0 hover:underline">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${confidenceClass[campaign.confidence]}`}>
                        {campaign.confidence}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium uppercase text-gray-500">{campaign.campaignId}</p>
                    {campaign.description && <p className="mt-2 text-sm text-gray-600">{campaign.description}</p>}
                  </Link>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <Metric label="Emails" value={campaign.emails?.length || 0} />
                    <Metric label="Cases" value={campaign.cases?.length || 0} />
                    <Metric label="Score" value={campaign.correlationScore || 0} />
                  </div>
                </div>
                {campaign.emails?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {campaign.emails.slice(0, 6).map((email) => (
                      <Link
                        key={email._id}
                        to={`/investigation/${email._id}`}
                        className="rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-white"
                      >
                        {email.subject || email._id}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

const Metric = ({ label, value }) => (
  <div className="min-w-20 rounded border border-gray-200 bg-gray-50 px-3 py-2">
    <p className="font-semibold text-gray-950">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

export default Campaigns;
