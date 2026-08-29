import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileSearch, MessageSquarePlus, Save } from 'lucide-react';
import api from '../services/api';

const CaseDetail = () => {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [note, setNote] = useState('');
  const [form, setForm] = useState({ status: 'open', severity: 'low' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/cases/${id}`)
      .then((res) => {
        if (!active) return;
        setCaseData(res.data);
        setForm({ status: res.data.status, severity: res.data.severity });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load case');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const updateCase = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await api.put(`/cases/${id}`, form);
      setCaseData(res.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update case');
    } finally {
      setSaving(false);
    }
  };

  const addNote = async (event) => {
    event.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    setError('');

    try {
      const res = await api.post(`/cases/${id}/notes`, { note });
      setCaseData(res.data);
      setNote('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to add note');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded border border-gray-200 bg-white p-6 text-sm text-gray-600">Loading case...</div>;
  }

  if (!caseData) {
    return <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || 'Case not found'}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">{caseData.caseId}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal">{caseData.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{caseData.description || 'No description provided.'}</p>
        </div>
        <Link
          to={`/analyze?caseId=${caseData._id}`}
          className="inline-flex items-center justify-center gap-2 rounded bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          <FileSearch size={17} />
          Add email
        </Link>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="rounded border border-gray-200 bg-white p-5">
          <h3 className="font-semibold">Case controls</h3>
          <form onSubmit={updateCase} className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-950"
              >
                <option value="open">Open</option>
                <option value="in-progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
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
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
            >
              <Save size={16} />
              Save changes
            </button>
          </form>

          <form onSubmit={addNote} className="mt-6 border-t border-gray-200 pt-5">
            <h3 className="font-semibold">Notes</h3>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-3 w-full resize-y rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-950"
              placeholder="Add analyst note"
            />
            <button
              type="submit"
              disabled={saving || !note.trim()}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              <MessageSquarePlus size={16} />
              Add note
            </button>
          </form>
        </section>

        <section className="rounded border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h3 className="font-semibold">Evidence emails</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {caseData.emails?.length ? (
              caseData.emails.map((email) => (
                <Link key={email._id} to={`/investigation/${email._id}`} className="block px-5 py-4 hover:bg-gray-50">
                  <p className="font-medium">{email.subject}</p>
                  <p className="mt-1 text-sm text-gray-500">{email.from?.address || 'Unknown sender'}</p>
                </Link>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No emails have been attached to this case.</div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="font-semibold">Indicators</h3>
        </div>
        <div className="flex flex-wrap gap-2 p-5">
          {caseData.indicators?.length ? (
            caseData.indicators.map((indicator) => (
              <span key={indicator._id} className="rounded border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                {indicator.type}: {indicator.value}
              </span>
            ))
          ) : (
            <p className="text-sm text-gray-500">No indicators have been correlated yet.</p>
          )}
        </div>
      </section>

      <section className="rounded border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="font-semibold">Analyst notes</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {caseData.notes?.length ? (
            [...caseData.notes].reverse().map((item) => (
              <div key={item._id || item.createdAt} className="px-5 py-4">
                <p className="text-sm leading-6 text-gray-700">{item.note}</p>
                <p className="mt-2 text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-center text-sm text-gray-500">No notes yet.</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default CaseDetail;
