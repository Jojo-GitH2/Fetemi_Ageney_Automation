import React, { useState } from 'react';
import { supabase } from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, Loader2, Target } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    
    setError('');
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden p-6">
      <div className="glass-card w-full max-w-md p-8 md:p-10 relative z-10 animate-fade-in border border-border shadow-2xl bg-white">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 mb-6 shadow-sm ring-1 ring-primary-100 hidden sm:inline-flex">
            <Target className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-textMain tracking-tight">Fetemi Portal</h2>
          <p className="text-textMuted mt-2 font-medium">Log in to your workspace.</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 shadow-sm">
            <AlertCircle size={20} />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-border rounded-xl text-textMain placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-border rounded-xl text-textMain placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-sm font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
