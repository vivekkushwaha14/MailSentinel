import { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileUp, ShieldAlert } from 'lucide-react';

const Analyze = () => {
  const [searchParams] = useSearchParams();
  const [file, setFile] = useState(null);
  const [caseId, setCaseId] = useState(() => searchParams.get('caseId') || '');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api.get('/cases')
      .then((res) => {
        if (active) setCases(res.data);
      })
      .catch(() => {
        if (active) setCases([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setLoading(true);
    const formData = new FormData();
    formData.append('email', file);
    if (caseId) formData.append('caseId', caseId);

    try {
      const res = await api.post('/emails/upload', formData);
      navigate(`/investigation/${res.data.emailId}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-normal">Analyze email</h2>
        <p className="mt-1 text-sm text-gray-500">Upload a suspicious `.eml` file and attach it to an investigation case if needed.</p>
      </div>

      <form onSubmit={handleUpload} className="rounded border border-gray-200 bg-white p-5 shadow-sm">
        <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center hover:border-gray-500">
          <FileUp size={36} className="text-gray-400" />
          <span className="mt-4 text-sm font-semibold text-gray-900">{file ? file.name : 'Choose an EML file'}</span>
          <span className="mt-1 text-xs text-gray-500">Maximum upload size is 10 MB.</span>
          <input
            type="file"
            accept=".eml,message/rfc822"
            onChange={(e) => setFile(e.target.files[0])}
            className="sr-only"
          />
        </label>

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Case</span>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 outline-none focus:border-gray-950"
            >
              <option value="">No case selected</option>
              {cases.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.caseId} - {item.title}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={loading || !file}
            className="inline-flex items-center justify-center gap-2 rounded bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            <ShieldAlert size={17} />
            {loading ? 'Analyzing...' : 'Run analysis'}
          </button>
        </div>

        {error && <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      </form>
    </div>
  );
};

export default Analyze;
