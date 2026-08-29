import { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { FolderPlus, Search } from 'lucide-react';

const Cases = () => {
  const [cases, setCases] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ title: '', severity: 'low', description: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/cases').then((res) => setCases(res.data));
  }, []);

  const createCase = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/cases', form);
      setCases((current) => [res.data, ...current]);
      setForm({ title: '', severity: 'low', description: '' });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create case');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCases = cases.filter((item) => {
    const haystack = `${item.caseId} ${item.title} ${item.status} ${item.severity}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-normal">Cases</h2>
        <p className="mt-1 text-sm text-gray-500">Create, track, and open investigation cases.</p>
      </div>

      <form onSubmit={createCase} className="rounded border border-gray-200 bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Title</span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-gray-950"
              placeholder="Suspicious payroll redirect"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Severity</span>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-950"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
        </div>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Description</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full resize-y rounded border border-gray-300 px-3 py-2 outline-none focus:border-gray-950"
          />
        </label>
        {error && <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 inline-flex items-center gap-2 rounded bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          <FolderPlus size={17} />
          {submitting ? 'Creating...' : 'Create case'}
        </button>
      </form>

      <div className="rounded border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold">Case queue</h3>
          <label className="flex rounded border border-gray-300 bg-white">
            <span className="flex w-9 items-center justify-center text-gray-400"><Search size={16} /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 rounded-r px-1 py-2 text-sm outline-none"
              placeholder="Search cases"
            />
          </label>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredCases.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">No cases found.</div>
          ) : (
            filteredCases.map((item) => (
              <Link key={item._id} to={`/cases/${item._id}`} className="grid gap-3 px-5 py-4 hover:bg-gray-50 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">{item.status}</span>
                    <span className="rounded border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600">{item.severity}</span>
                  </div>
                  <p className="mt-1 text-xs font-medium uppercase text-gray-500">{item.caseId}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {(item.emails?.length || 0)} emails · {(item.indicators?.length || 0)} indicators
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Cases;
