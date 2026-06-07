import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Building2, Eye, EyeOff, Crown } from 'lucide-react';
import clsx from 'clsx';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.admin));
      navigate('/admin-dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center shadow-lg shadow-gym-500/30">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Hullu Gyms</h1>
          <p className="text-gray-400">Admin Dashboard</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8 animate-slide-up">
          <div className="flex items-center gap-2 mb-6">
            <Crown className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">Admin Access</h2>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hullugyms.com"
                className="w-full px-4 py-3 bg-dark-200 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gym-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 bg-dark-200 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gym-500 transition-colors pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={clsx(
                "w-full py-3 bg-gradient-to-r from-gym-600 to-purple-600 hover:from-gym-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-gym-500/20",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="mt-6 p-4 bg-dark-200/60 rounded-xl border border-gray-800 text-center">
          <p className="text-xs text-gray-500 mb-1">Default admin credentials</p>
          <p className="text-xs text-gray-400 font-mono">admin@hullugyms.com · admin123</p>
        </div>
      </div>
    </div>
  );
}