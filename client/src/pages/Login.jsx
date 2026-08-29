import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/auth';

const Login = () => {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login, register, user, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'register') {
        await register(username, email, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="grid min-h-screen bg-gray-100 lg:grid-cols-[1fr_460px]">
      <section className="hidden bg-gray-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded bg-white text-gray-950">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-lg font-semibold">MailSentinel</p>
            <p className="text-xs font-medium uppercase text-gray-400">Email threat forensics</p>
          </div>
        </div>
        <div className="max-w-2xl">
          <h1 className="text-5xl font-semibold leading-tight tracking-normal">
            Analyze suspicious email evidence with explainable scoring.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-gray-300">
            Parse EML files, preserve evidence metadata, detect phishing signals, and organize investigations into cases and campaigns.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm text-gray-300">
          <div className="border-t border-gray-700 pt-3">Headers</div>
          <div className="border-t border-gray-700 pt-3">Indicators</div>
          <div className="border-t border-gray-700 pt-3">Campaigns</div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <form onSubmit={handleSubmit} className="w-full max-w-md rounded border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded bg-gray-950 text-white lg:hidden">
              <ShieldCheck size={22} />
            </div>
            <h2 className="text-2xl font-semibold">{mode === 'login' ? 'Sign in' : 'Create analyst account'}</h2>
            <p className="mt-1 text-sm text-gray-500">Use an analyst account to access investigations.</p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded border border-gray-200 bg-gray-50 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`rounded px-3 py-2 ${mode === 'login' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`rounded px-3 py-2 ${mode === 'register' ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500'}`}
            >
              Register
            </button>
          </div>

          {mode === 'register' && (
            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Username</span>
              <input
                required
                minLength={3}
                value={username}
                className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-gray-950"
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
          )}

          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
            <div className="flex rounded border border-gray-300 focus-within:border-gray-950">
              <span className="flex w-10 items-center justify-center text-gray-400">
                <Mail size={17} />
              </span>
              <input
                required
                type="email"
                value={email}
                className="min-w-0 flex-1 rounded-r px-1 py-2 outline-none"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Password</span>
            <input
              required
              minLength={6}
              type="password"
              value={password}
              className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-gray-950"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {submitting ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
      </form>
      </section>
    </div>
  );
};

export default Login;
