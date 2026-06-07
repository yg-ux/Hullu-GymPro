import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Building,
  Phone,
  MapPin,
  MessageSquare,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle,
  Lock,
  Zap
} from 'lucide-react';
import clsx from 'clsx';

export default function Settings() {
  const { gym, user } = useAuth();
  const toast = useToast();

  const [gymForm, setGymForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsAvailable, setSmsAvailable] = useState(false);
  const [gymLoading, setGymLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    loadGym();
  }, []);

  const loadGym = async () => {
    try {
      const data = await api.get('/auth/me');
      setGymForm({
        name: data.gym?.name || '',
        phone: data.gym?.phone || '',
        email: data.gym?.email || '',
        address: data.gym?.address || '',
      });
      setSmsEnabled(Boolean(data.gym?.sms_enabled));
      setSmsAvailable(Boolean(data.gym?.sms_available));
    } catch (err) {
      toast.error('Failed to load settings');
    } finally {
      setPageLoading(false);
    }
  };

  const handleGymSave = async (e) => {
    e.preventDefault();
    setGymLoading(true);
    try {
      await api.put('/auth/gym', { address: gymForm.address });
      toast.success('Address updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update address');
    } finally {
      setGymLoading(false);
    }
  };

  const handleSmsSave = async () => {
    setSmsLoading(true);
    try {
      await api.put('/auth/gym', { sms_enabled: smsEnabled });
      toast.success(smsEnabled ? 'SMS notifications enabled' : 'SMS notifications disabled');
    } catch (err) {
      toast.error(err.message || 'Failed to save SMS settings');
    } finally {
      setSmsLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {[1, 2].map(i => (
          <div key={i} className="card p-6 space-y-4">
            <div className="h-6 w-40 bg-gray-800 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-800 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your gym profile and notifications</p>
      </div>

      {/* Gym Profile */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-gym-600/20 flex items-center justify-center">
            <Building className="w-5 h-5 text-gym-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Gym Profile</h2>
        </div>

        {/* Read-only info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-dark-200 rounded-xl">
          <div>
            <p className="text-xs text-gray-500 mb-1">Gym Name</p>
            <p className="text-white font-medium">{gymForm.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Phone Number</p>
            <p className="text-white font-medium">{gymForm.phone || '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-500 mb-1">Email</p>
            <p className="text-white font-medium">{gymForm.email || '—'}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Gym name and phone are set at registration. Contact support to change them.
        </p>

        {/* Editable address */}
        <form onSubmit={handleGymSave} className="space-y-3 pt-2">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                value={gymForm.address}
                onChange={e => setGymForm(p => ({ ...p, address: e.target.value }))}
                className="input-field pl-10 h-20 resize-none"
                placeholder="Your gym address"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={gymLoading} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              {gymLoading ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </form>
      </div>

      {/* SMS Notifications */}
      {(() => {
        const smsPlanAllowed = ['starter', 'pro'].includes(gym?.subscription_plan);
        const canUseSms = smsPlanAllowed && smsAvailable;

        return (
          <div className={clsx('card p-6 space-y-4 relative', !smsPlanAllowed && 'overflow-hidden')}>
            {/* Plan-locked overlay */}
            {!smsPlanAllowed && (
              <div className="absolute inset-0 bg-dark-100/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gray-700/80 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-gray-400" />
                </div>
                <div className="text-center px-6">
                  <p className="font-semibold text-white mb-1">SMS is a Starter &amp; Pro feature</p>
                  <p className="text-sm text-gray-400">Upgrade your plan to send automatic SMS messages to your members.</p>
                </div>
                <a href="/subscription"
                  className="mt-1 px-5 py-2 bg-gradient-to-r from-gym-500 to-purple-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-lg">
                  Upgrade Now
                </a>
              </div>
            )}

            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-green-600/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">SMS Notifications</h2>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Zap className="w-3 h-3 text-gym-400" />
                  Powered by Hullu Gyms — no setup required
                </p>
              </div>
            </div>

            {/* Platform key not configured warning */}
            {smsPlanAllowed && !smsAvailable && (
              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>SMS is not yet activated on this platform. Contact Hullu Gyms support to enable it.</p>
              </div>
            )}

            {/* Enable toggle */}
            <div className="flex items-center justify-between p-4 bg-dark-200 rounded-lg border border-gray-700">
              <div>
                <p className="font-medium text-white">Enable SMS for my gym</p>
                <p className="text-sm text-gray-400 mt-0.5">Your members will receive automatic SMS updates</p>
              </div>
              <button
                type="button"
                onClick={() => canUseSms && setSmsEnabled(v => !v)}
                disabled={!canUseSms}
                className={clsx(
                  'relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed',
                  smsEnabled && canUseSms ? 'bg-green-500' : 'bg-gray-600'
                )}
              >
                <span className={clsx(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                  smsEnabled && canUseSms ? 'translate-x-6' : 'translate-x-0'
                )} />
              </button>
            </div>

            {/* What gets sent */}
            <div className="space-y-2 px-1">
              {[
                'Welcome message when a new member joins',
                'Payment confirmation after each payment',
                'Membership expiry reminder (7 days &amp; 1 day before)',
              ].map(text => (
                <div key={text} className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-400" />
                  <span dangerouslySetInnerHTML={{ __html: text }} />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSmsSave}
                disabled={smsLoading || !canUseSms}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {smsLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Change Password */}
      <ChangePasswordForm toast={toast} />
    </div>
  );
}

function ChangePasswordForm({ toast }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = 'Required';
    if (form.newPassword.length < 8) errs.newPassword = 'At least 8 characters';
    if (!/\d/.test(form.newPassword)) errs.newPassword = 'Must contain a number';
    if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed successfully');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center">
          <Lock className="w-5 h-5 text-purple-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Change Password</h2>
      </div>

      {[
        { name: 'currentPassword', label: 'Current Password' },
        { name: 'newPassword', label: 'New Password', hint: 'Min 8 characters, include a number' },
        { name: 'confirmPassword', label: 'Confirm New Password' },
      ].map(({ name, label, hint }) => (
        <div key={name}>
          <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              name={name}
              value={form[name]}
              onChange={handleChange}
              className={clsx('input-field pr-10', errors[name] && 'border-red-500')}
              placeholder="••••••••"
            />
            {name === 'currentPassword' && (
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
          {hint && !errors[name] && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
          {errors[name] && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors[name]}
            </p>
          )}
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          <Lock className="w-4 h-4" />
          {loading ? 'Updating...' : 'Change Password'}
        </button>
      </div>
    </form>
  );
}
