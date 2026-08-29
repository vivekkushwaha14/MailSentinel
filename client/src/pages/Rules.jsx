import { useEffect, useState } from 'react';
import { Save, SlidersHorizontal } from 'lucide-react';
import api from '../services/api';

const Rules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/rules')
      .then((res) => {
        if (!active) return;
        if (!Array.isArray(res.data)) {
          setError('Rules API returned an unexpected response.');
          setRules([]);
          return;
        }
        setRules(res.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load rules');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateLocalRule = (id, updates) => {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, ...updates } : rule));
  };

  const saveRule = async (rule) => {
    setError('');
    try {
      const res = await api.put(`/rules/${rule.id}`, {
        enabled: rule.enabled,
        scoreImpact: rule.scoreImpact,
        severity: rule.severity
      });
      updateLocalRule(rule.id, res.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save rule');
    }
  };

  if (loading) {
    return <div className="rounded border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading detection rules...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-normal">Detection rules</h2>
        <p className="mt-1 text-sm text-gray-500">Tune enabled rules and score impact for newly analyzed emails.</p>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <section className="rounded border border-gray-200 bg-white">
        <div className="divide-y divide-gray-100">
          {rules.map((rule) => (
            <div key={rule.id} className="grid gap-4 px-5 py-4 xl:grid-cols-[1fr_360px] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <SlidersHorizontal size={16} className="text-gray-400" />
                  <h3 className="font-semibold">{rule.id}</h3>
                  <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">{rule.category}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{rule.description}</p>
              </div>

              <div className="grid grid-cols-[90px_1fr_44px] gap-3 sm:grid-cols-[90px_110px_1fr_44px]">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => updateLocalRule(rule.id, { enabled: e.target.checked })}
                  />
                  Active
                </label>
                <select
                  value={rule.severity}
                  onChange={(e) => updateLocalRule(rule.id, { severity: e.target.value })}
                  className="hidden rounded border border-gray-300 bg-white px-2 py-2 text-sm outline-none focus:border-gray-950 sm:block"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rule.scoreImpact}
                  onChange={(e) => updateLocalRule(rule.id, { scoreImpact: Number(e.target.value) })}
                  className="min-w-0 rounded border border-gray-300 px-2 py-2 text-sm outline-none focus:border-gray-950"
                  aria-label={`${rule.id} score impact`}
                />
                <button
                  type="button"
                  onClick={() => saveRule(rule)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  aria-label={`Save ${rule.id}`}
                >
                  <Save size={16} />
                </button>
              </div>
            </div>
          ))}
          {rules.length === 0 && !error && (
            <div className="px-5 py-8 text-center text-sm text-gray-500">No detection rules are configured.</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Rules;
