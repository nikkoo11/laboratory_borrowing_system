import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap,
  FlaskConical,
} from 'lucide-react';

export default function AuthView() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [regForm, setRegForm] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    department: 'Civil Engineering',
    user_type: 'student',
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginForm.username, loginForm.password);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Invalid credentials.'
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
      setSuccess('Account created! You can now sign in.');
      setIsRegister(false);
      setLoginForm({ username: regForm.username, password: regForm.password });
    } catch (err) {
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

  const switchTab = (toRegister) => {
    setIsRegister(toRegister);
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center selection:bg-orange-500 selection:text-white overflow-hidden">

      {/* ── Full-screen campus background ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/campus.jpg')" }}
      />
      {/* Dark overlay — stronger at bottom for legibility */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/60 to-black/80" />
      {/* Subtle maroon tint to match CSU colors */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#4a0000]/40 via-transparent to-transparent" />

      {/* ── Floating particle dots (decorative) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-orange-400/30 animate-pulse"
            style={{
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.7}s`,
            }}
          />
        ))}
      </div>

      {/* ── Main card ── */}
      <div className="relative z-10 w-full max-w-md mx-4">

        {/* Institution header above the card */}
        <div className="text-center mb-5">
          {/* Logo ring */}
          <div className="relative inline-block mb-3">
            <div className="w-20 h-20 mx-auto rounded-full p-[3px] bg-gradient-to-tr from-orange-600 via-amber-400 to-orange-500 shadow-2xl shadow-orange-600/40">
              <img
                src="/logo.png"
                alt="CSU Logo"
                className="w-full h-full object-cover rounded-full bg-white"
              />
            </div>
            {/* Online indicator */}
            <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black shadow" />
          </div>

          <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-orange-400 mb-0.5">
            Cagayan State University — Carig Campus
          </p>
          <h1 className="text-xl font-extrabold text-white tracking-tight drop-shadow-lg">
            College of Engineering &amp; Architecture
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <FlaskConical size={13} className="text-orange-400" />
            <span className="text-xs text-white/70 font-medium">
              Laboratory Equipment Borrowing &amp; Custody System
            </span>
            <FlaskConical size={13} className="text-orange-400" />
          </div>
        </div>

        {/* Glass card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden">

          {/* Card top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-orange-600 via-amber-400 to-orange-500" />

          <div className="px-6 py-7 sm:px-8">

            {/* Tab switcher */}
            <div className="flex rounded-2xl bg-black/30 p-1 mb-6 border border-white/10">
              {[
                { label: 'Sign In', value: false },
                { label: 'Register', value: true },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => switchTab(value)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
                    isRegister === value
                      ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/40'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Feedback banners ── */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-start gap-2 text-rose-200 text-xs backdrop-blur">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-start gap-2 text-emerald-200 text-xs backdrop-blur">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* ────────── LOGIN FORM ────────── */}
            {!isRegister ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-widest mb-1.5">
                    Username / Student ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                      <User size={14} />
                    </div>
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      placeholder="e.g. admin or 21-04981"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-all backdrop-blur"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-widest mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                      <Lock size={14} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-all backdrop-blur"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-white/70 transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-orange-600/40 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enter Laboratory System</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

            ) : (
              /* ────────── REGISTER FORM ────────── */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'First Name', field: 'first_name', placeholder: 'Juan' },
                    { label: 'Last Name', field: 'last_name', placeholder: 'Dela Cruz' },
                  ].map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-widest mb-1.5">
                        {label}
                      </label>
                      <input
                        type="text"
                        required
                        value={regForm[field]}
                        onChange={(e) => setRegForm({ ...regForm, [field]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-all"
                      />
                    </div>
                  ))}
                </div>

                {/* Username */}
                <div>
                  <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-widest mb-1.5">
                    Username / ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                      <User size={14} />
                    </div>
                    <input
                      type="text"
                      required
                      value={regForm.username}
                      onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                      placeholder="e.g. 21-04981"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-widest mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                      <Lock size={14} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      placeholder="Create a strong password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-white/70 transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Role + Department */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-widest mb-1.5">
                      Role
                    </label>
                    <select
                      value={regForm.user_type}
                      onChange={(e) => setRegForm({ ...regForm, user_type: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-all"
                    >
                      <option value="student" className="bg-zinc-900">Student</option>
                      <option value="faculty" className="bg-zinc-900">Faculty</option>
                      <option value="staff" className="bg-zinc-900">Staff</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-white/70 uppercase tracking-widest mb-1.5">
                      Department
                    </label>
                    <select
                      value={regForm.department}
                      onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/50 transition-all"
                    >
                      {[
                        'Civil Engineering',
                        'Electrical Engineering',
                        'Electronics Engineering',
                        'Computer Engineering',
                        'Architecture',
                        'Chemical Engineering',
                        'Geodetic Engineering',
                      ].map((d) => (
                        <option key={d} value={d} className="bg-zinc-900">{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-orange-600/40 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <GraduationCap size={15} />
                      <span>Create COEA Account</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Card bottom strip */}
          <div className="px-6 py-3 border-t border-white/10 bg-black/20 text-center">
            <p className="text-[10px] text-white/40 font-medium tracking-wide">
              CSU COEA • Laboratory Borrowing System • Ad Optimum Educans
            </p>
          </div>
        </div>

        {/* Below-card tagline */}
        <p className="text-center text-[11px] text-white/30 mt-4">
          Authorized personnel only. All access is logged and monitored.
        </p>
      </div>
    </div>
  );
}
