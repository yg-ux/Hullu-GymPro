import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getMembershipLabel, formatDate } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowLeft, Search, CheckCircle, XCircle, Clock, Snowflake,
  AlertTriangle, User, Dumbbell
} from 'lucide-react';
import clsx from 'clsx';

const RESET_DELAY = 4000;

export default function Kiosk() {
  const navigate = useNavigate();
  const { gym } = useAuth();
  const { t: tr } = useLanguage();
  const inputRef = useRef(null);

  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState(null);
  const [searching, setSearching] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [stage, setStage] = useState('idle'); // idle | found | success | error | frozen | expired
  const [message, setMessage] = useState('');
  const [time, setTime] = useState(new Date());

  // Clock
  useEffect(() => {
    const intervalId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Auto-reset after success/error
  useEffect(() => {
    if (['success', 'error', 'frozen', 'expired'].includes(stage)) {
      const timerId = setTimeout(reset, RESET_DELAY);
      return () => clearTimeout(timerId);
    }
  }, [stage]);

  // Focus input on idle
  useEffect(() => {
    if (stage === 'idle') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [stage]);

  const reset = () => {
    setPhone('');
    setCustomer(null);
    setStage('idle');
    setMessage('');
  };

  const handleSearch = async () => {
    if (!phone.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(`/customers?search=${encodeURIComponent(phone)}&limit=1`);
      const customers = res.customers || res.data || [];
      if (customers.length === 0) {
        setMessage(tr('kiosk.notFound'));
        setStage('error');
        return;
      }
      const found = customers[0];
      if (found.is_frozen) {
        setCustomer(found);
        setMessage(tr('kiosk.frozenUntil', { date: formatDate(found.frozen_until) }));
        setStage('frozen');
        return;
      }
      if (found.status === 'expired') {
        setCustomer(found);
        setMessage(tr('kiosk.expiredRenew'));
        setStage('expired');
        return;
      }
      setCustomer(found);
      setStage('found');
    } catch (e) {
      setMessage(e.message || tr('kiosk.notFound'));
      setStage('error');
    } finally {
      setSearching(false);
    }
  };

  const handleCheckIn = async () => {
    if (!customer) return;
    setCheckingIn(true);
    try {
      await api.post('/attendance/check-in', { customer_id: customer.id });
      setMessage(tr('kiosk.welcome', { name: customer.name.split(' ')[0] }));
      setStage('success');
    } catch (e) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('frozen')) {
        setMessage(msg);
        setStage('frozen');
      } else if (msg.toLowerCase().includes('expired')) {
        setMessage(tr('kiosk.expiredRenew'));
        setStage('expired');
      } else if (msg.toLowerCase().includes('already checked in')) {
        setMessage(tr('kiosk.alreadyCheckedIn', { name: customer.name.split(' ')[0] }));
        setStage('success');
      } else {
        setMessage(msg || tr('kiosk.notFound'));
        setStage('error');
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const sessionsLeft = customer
    ? Math.max(0, (customer.total_sessions || 0) - (customer.sessions_used || 0))
    : 0;

  return (
    <div className="min-h-screen bg-dark-200 flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/50">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">{tr('kiosk.exitKiosk')}</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gym-500/20 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-gym-400" />
          </div>
          <span className="font-semibold text-white">{gym?.name || 'Gym Kiosk'}</span>
        </div>
        <div className="text-right">
          <p className="text-xl font-mono font-semibold text-white tabular-nums">
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xs text-gray-500">
            {time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* SUCCESS */}
        {stage === 'success' && (
          <div className="text-center animate-fade-in">
            <div className="w-32 h-32 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-20 h-20 text-emerald-400" />
            </div>
            <h2 className="text-5xl font-bold text-white mb-2">{message}</h2>
            <p className="text-emerald-400 text-xl mt-3">{tr('kiosk.checkInSuccess')}</p>
            <p className="text-gray-500 mt-4 text-sm">{tr('kiosk.resetting')}</p>
          </div>
        )}

        {/* FROZEN */}
        {stage === 'frozen' && (
          <div className="text-center animate-fade-in">
            <div className="w-32 h-32 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
              <Snowflake className="w-20 h-20 text-blue-400" />
            </div>
            {customer && <h2 className="text-4xl font-bold text-white mb-3">{customer.name}</h2>}
            <p className="text-blue-400 text-xl">{tr('kiosk.membershipFrozen')}</p>
            <p className="text-gray-400 mt-2">{message}</p>
            <p className="text-gray-500 mt-4 text-sm">{tr('kiosk.seeStaffUnfreeze')}</p>
          </div>
        )}

        {/* EXPIRED */}
        {stage === 'expired' && (
          <div className="text-center animate-fade-in">
            <div className="w-32 h-32 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-20 h-20 text-amber-400" />
            </div>
            {customer && <h2 className="text-4xl font-bold text-white mb-3">{customer.name}</h2>}
            <p className="text-amber-400 text-xl">{tr('kiosk.membershipExpired')}</p>
            <p className="text-gray-400 mt-2">{message}</p>
            <p className="text-gray-500 mt-4 text-sm">{tr('kiosk.seeStaffRenew')}</p>
          </div>
        )}

        {/* ERROR */}
        {stage === 'error' && (
          <div className="text-center animate-fade-in">
            <div className="w-32 h-32 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-20 h-20 text-red-400" />
            </div>
            <p className="text-red-400 text-2xl font-semibold">{message}</p>
            <p className="text-gray-500 mt-4 text-sm">{tr('kiosk.resetting')}</p>
          </div>
        )}

        {/* FOUND — show member card */}
        {stage === 'found' && customer && (
          <div className="w-full max-w-md animate-fade-in">
            <div className="bg-dark-100 rounded-2xl border border-gray-800 p-8 mb-6 text-center">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-2xl bg-gym-500/20 flex items-center justify-center mx-auto mb-4 text-5xl font-bold text-gym-400">
                {customer.photo
                  ? <img src={customer.photo} alt={customer.name} className="w-full h-full rounded-2xl object-cover" />
                  : customer.name?.charAt(0).toUpperCase()
                }
              </div>
              <h2 className="text-3xl font-bold text-white mb-1">{customer.name}</h2>
              <p className="text-gray-400 mb-4">{getMembershipLabel(customer.membership_type)}</p>

              {/* Sessions/Days */}
              {['3_days_week', 'daily'].includes(customer.membership_type) ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gym-500/15 border border-gym-500/30">
                  <span className="text-2xl font-bold text-gym-400">{sessionsLeft}</span>
                  <span className="text-gray-400 text-sm">
                    {customer.membership_type === 'daily'
                      ? tr('kiosk.passesRemaining')
                      : tr('kiosk.sessionsRemaining')}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gym-500/15 border border-gym-500/30">
                  <Clock className="w-5 h-5 text-gym-400" />
                  <span className="text-gym-400 font-semibold">
                    {tr('kiosk.daysLeft', { n: customer.days_until_expiry > 0 ? customer.days_until_expiry : 0 })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 py-4 rounded-xl bg-dark-300 border border-gray-700 text-gray-300 text-lg font-medium hover:bg-dark-100 transition-all"
              >
                {tr('kiosk.cancel')}
              </button>
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="flex-2 flex-grow-[2] py-4 rounded-xl bg-gym-500/25 border border-gym-500/50 text-gym-300 text-lg font-bold hover:bg-gym-500/35 transition-all flex items-center justify-center gap-3"
              >
                {checkingIn ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    {tr('kiosk.checkIn')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* IDLE — phone input */}
        {stage === 'idle' && (
          <div className="w-full max-w-md text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-gym-500/20 flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-gym-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">{tr('kiosk.title')}</h1>
            <p className="text-gray-400 mb-10">{tr('kiosk.subtitle')}</p>

            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={tr('kiosk.phonePlaceholder')}
                className="flex-1 px-5 py-4 text-2xl bg-dark-100 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-gym-500 text-center tracking-widest font-mono"
                autoFocus
                inputMode="numeric"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !phone.trim()}
                className="px-6 py-4 rounded-xl bg-gym-500/25 border border-gym-500/50 text-gym-400 hover:bg-gym-500/35 transition-all disabled:opacity-40"
              >
                {searching ? (
                  <span className="animate-spin block">⏳</span>
                ) : (
                  <Search className="w-7 h-7" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
