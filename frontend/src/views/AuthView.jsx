import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  User, 
  ArrowRight, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

export default function AuthView() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  });

  const [regForm, setRegForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    department: 'Civil Engineering',
    user_type: 'student',
  });

  const handleQuickLogin = (username, password) => {
    setLoginForm({ username, password });
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginForm.username, loginForm.password);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        'Invalid username or password. Please verify your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await register(regForm);
      setSuccess('Account created successfully! You can now sign in.');
      setIsRegister(false);
      setLoginForm({ username: regForm.username, password: regForm.password });
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        setError(`${firstKey}: ${Array.isArray(val) ? val.join(' ') : val}`);
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] flex items-center justify-center p-4 selection:bg-orange-600 selection:text-white">
      <div className="w-full max-w-md">
        
        {/* CSU CEA Logo & Institutional Header */}
        <div className="text-center mb-6">
          <div className="inline-block relative">
            <div className="w-24 h-24 mx-auto rounded-full p-1 bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 shadow-xl shadow-orange-600/20 mb-3">
              <img
                src="/logo.png"
                alt="Cagayan State University - College of Engineering and Architecture"
                className="w-full h-full object-cover rounded-full bg-white shadow-inner"
              />
            </div>
          </div>
          
          <h2 className="text-xs font-semibold tracking-widest uppercase text-orange-500">
            Cagayan State University
          </h2>
          <h1 className="text-lg font-bold text-white tracking-tight mt-0.5">
            College of Engineering & Architecture
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Laboratory Equipment Borrowing & Custody System
          </p>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <span>AD OPTIMUM EDUCANTS &bull; 1981</span>
          </div>
        </div>

        {/* Minimalist Card */}
        <div className="bg-[#12141c] border border-zinc-800/90 rounded-2xl p-6 sm:p-7 shadow-2xl relative">
          

          {/* Error / Success Feedback */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2 text-emerald-300 text-xs">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Form Switch Tabs */}
          <div className="flex rounded-xl bg-zinc-900 p-1 mb-5 border border-zinc-800">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                !isRegister
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isRegister
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {/* LOGIN FORM */}
          {!isRegister ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Institutional ID / Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginForm.username}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, username: e.target.value })
                    }
                    placeholder="e.g. admin or student1"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Lock size={15} />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-semibold text-xs shadow-md shadow-orange-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter Laboratory System</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.first_name}
                    onChange={(e) =>
                      setRegForm({ ...regForm, first_name: e.target.value })
                    }
                    placeholder="Juan"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regForm.last_name}
                    onChange={(e) =>
                      setRegForm({ ...regForm, last_name: e.target.value })
                    }
                    placeholder="Dela Cruz"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <User size={14} />
                  </div>
                  <input
                    type="text"
                    required
                    value={regForm.username}
                    onChange={(e) =>
                      setRegForm({ ...regForm, username: e.target.value })
                    }
                    placeholder="e.g. 21-04981"
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Lock size={14} />
                  </div>
                  <input
                    type="password"
                    required
                    value={regForm.password}
                    onChange={(e) =>
                      setRegForm({ ...regForm, password: e.target.value })
                    }
                    placeholder="Create a password"
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Role / Type
                  </label>
                  <select
                    value={regForm.user_type}
                    onChange={(e) =>
                      setRegForm({ ...regForm, user_type: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Department
                  </label>
                  <select
                    value={regForm.department}
                    onChange={(e) =>
                      setRegForm({ ...regForm, department: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
                  >
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Electronics Engineering">Electronics Engineering</option>
                    <option value="Computer Engineering">Computer Engineering</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Chemical / Science">Chemical / Science</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-semibold text-xs shadow-md shadow-orange-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create CEA Account</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-zinc-500 mt-5">
          CSU College of Engineering & Architecture &bull; Official Laboratory System
        </p>

      </div>
    </div>
  );
}
