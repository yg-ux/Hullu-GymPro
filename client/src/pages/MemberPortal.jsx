import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { formatCurrency } from '../utils/api';
import {
  Dumbbell,
  Calendar,
  Clock,
  CreditCard,
  Image,
  CheckCircle,
  AlertTriangle,
  XCircle,
  LogIn,
  LogOut,
  Phone,
  TrendingUp,
  Snowflake,
  ChevronDown,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const themeScales = {
  default:   { r300:'125 211 252', r400:'56 189 248',  r500:'14 165 233',  r600:'2 132 199',   r700:'3 105 161'  },
  indigo:    { r300:'165 180 252', r400:'129 140 248', r500:'99 102 241',  r600:'79 70 229',   r700:'67 56 202'  },
  purple:    { r300:'216 180 254', r400:'192 132 252', r500:'168 85 247',  r600:'147 51 234',  r700:'126 34 206' },
  rose:      { r300:'253 164 175', r400:'251 113 133', r500:'244 63 94',   r600:'225 29 72',   r700:'190 18 60'  },
  red:       { r300:'252 165 165', r400:'248 113 113', r500:'239 68 68',   r600:'220 38 38',   r700:'185 28 28'  },
  amber:     { r300:'252 211 77',  r400:'251 191 36',  r500:'245 158 11',  r600:'217 119 6',   r700:'180 83 9'   },
  lime:      { r300:'190 242 100', r400:'163 230 53',  r500:'132 204 22',  r600:'101 163 13',  r700:'77 124 15'  },
  emerald:   { r300:'110 231 183', r400:'52 211 153',  r500:'16 185 129',  r600:'5 150 105',   r700:'4 120 87'   },
  teal:      { r300:'94 234 212',  r400:'45 212 191',  r500:'20 184 166',  r600:'13 148 136',  r700:'15 118 110' },
  gold:      { r300:'253 224 71',  r400:'250 204 21',  r500:'234 179 8',   r600:'161 98 7',    r700:'133 77 14'  },
  chocolate: { r300:'214 162 101', r400:'180 120 60',  r500:'146 64 14',   r600:'120 53 15',   r700:'92 40 10'   },
  slate:     { r300:'148 163 184', r400:'100 116 139', r500:'71 85 105',   r600:'51 65 85',    r700:'30 41 59'   },
};

function applyTheme(colorTheme) {
  const s = themeScales[colorTheme] || themeScales.default;
  document.documentElement.style.setProperty('--gym-300-rgb', s.r300);
  document.documentElement.style.setProperty('--gym-400-rgb', s.r400);
  document.documentElement.style.setProperty('--gym-500-rgb', s.r500);
  document.documentElement.style.setProperty('--gym-600-rgb', s.r600);
  document.documentElement.style.setProperty('--gym-700-rgb', s.r700);
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const diff = new Date(checkOut) - new Date(checkIn);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

const ANGLE_LABELS = {
  front: 'Front',
  back: 'Back',
  side_left: 'Left Side',
  side_right: 'Right Side',
};

const MEMBERSHIP_LABELS = {
  daily: 'Daily Walk-in',
  '1_month': '1 Month',
  '2_months': '2 Months',
  '3_months': '3 Months',
  '6_months': '6 Months',
  '1_year': '1 Year',
  '3_days_week': '3 Days/Week',
};

const SESSION_TYPES = ['daily', '3_days_week'];

function StatusBadge({ status }) {
  if (status === 'frozen') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
        <Snowflake className="w-3 h-3" /> Frozen
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
        <CheckCircle className="w-3 h-3" /> Active
      </span>
    );
  }
  if (status === 'expiring') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
        <AlertTriangle className="w-3 h-3" /> Expiring Soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
      <XCircle className="w-3 h-3" /> Expired
    </span>
  );
}

function DaysCounter({ member }) {
  const isSession = SESSION_TYPES.includes(member.membership_type);
  const is3DaysWeek = member.membership_type === '3_days_week';

  if (member.is_frozen) {
    return (
      <div className="text-center py-6">
        <div className="text-4xl font-black text-blue-400 leading-none">❄️</div>
        <div className="mt-2 text-sm text-blue-400 font-medium">Membership Paused</div>
        {member.frozen_until && (
          <div className="mt-1 text-xs text-gray-500">Resumes {formatDate(member.frozen_until)}</div>
        )}
      </div>
    );
  }

  if (isSession) {
    const remaining = Math.max(0, member.sessions_remaining ?? 0);
    const maxVisits = member.max_visits_per_week || 3;
    const usedThisWeek = member.visits_this_week || 0;
    const leftThisWeek = Math.max(0, maxVisits - usedThisWeek);

    return (
      <div className="py-5 px-4 space-y-4">
        {/* Overall sessions */}
        <div className="text-center">
          <div className="text-6xl font-black text-gym-400 leading-none tabular-nums">
            {remaining}
          </div>
          <div className="mt-1.5 text-sm text-gray-400 font-medium">sessions remaining</div>
        </div>

        {/* Weekly visit tracker — 3 days/week only */}
        {is3DaysWeek && maxVisits > 0 && (
          <div className="mt-2 pt-4 border-t border-gray-800/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium">This week's visits</span>
              <span style={{ color: leftThisWeek === 0 ? '#f87171' : 'rgb(var(--gym-400-rgb))' }}
                    className="font-semibold">
                {usedThisWeek} / {maxVisits} used · {leftThisWeek} left
              </span>
            </div>
            {/* Dot tracker */}
            <div className="flex gap-2 justify-center">
              {Array.from({ length: maxVisits }, (_, i) => (
                <div
                  key={i}
                  className="flex-1 h-3 rounded-full transition-all"
                  style={{
                    background: i < usedThisWeek
                      ? 'rgb(var(--gym-500-rgb))'
                      : 'rgba(255,255,255,0.08)',
                    border: i < usedThisWeek
                      ? '1px solid rgb(var(--gym-400-rgb) / 0.5)'
                      : '1px solid rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>
            {leftThisWeek === 0 && (
              <p className="text-xs text-center text-red-400 pt-0.5">Weekly limit reached — resets next Monday</p>
            )}
          </div>
        )}
      </div>
    );
  }

  const days = member.days_until_expiry;

  if (days === null || days === undefined) {
    return (
      <div className="text-center py-6">
        <div className="text-4xl font-black text-gray-500">—</div>
      </div>
    );
  }

  if (days < 0) {
    return (
      <div className="text-center py-6">
        <div className="text-5xl font-black text-red-400 leading-none tabular-nums">
          ⚠️ Expired {Math.abs(days)} {Math.abs(days) === 1 ? 'day' : 'days'} ago
        </div>
      </div>
    );
  }

  const color = days <= 7 ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-gym-400';

  return (
    <div className="text-center py-6">
      <div className={`text-7xl font-black leading-none tabular-nums ${color}`}>{days}</div>
      <div className="mt-2 text-sm text-gray-400 font-medium">days left</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-dark-200 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4 animate-pulse">
        <div className="h-24 bg-dark-300 rounded-2xl" />
        <div className="h-40 bg-dark-300 rounded-2xl" />
        <div className="h-32 bg-dark-300 rounded-2xl" />
        <div className="h-48 bg-dark-300 rounded-2xl" />
      </div>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen bg-dark-200 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
          <XCircle className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Link Expired or Invalid</h2>
        <p className="text-gray-400 text-sm">{message || 'This member portal link is no longer valid. Please ask your gym for a new link.'}</p>
        <div className="pt-2 text-xs text-gray-600">Powered by Hullu Gyms</div>
      </div>
    </div>
  );
}

export default function MemberPortal() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check-in state (managed independently so it survives data refetches)
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkedInAt, setCheckedInAt] = useState(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInError, setCheckInError] = useState(null);
  const [showCheckInPanel, setShowCheckInPanel] = useState(false);

  const fetchPortalData = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${API_BASE}/portal/view/${token}`);
      const json = await res.json();
      if (!res.ok) {
        if (!silent) setError(json?.error || json?.message || 'Invalid or expired link');
        return null;
      }
      setData(json);
      if (json.gym?.color_theme) applyTheme(json.gym.color_theme);
      return json;
    } catch (err) {
      if (!silent) setError('Failed to load member portal. Please try again.');
      return null;
    }
  }, [token]);

  useEffect(() => {
    async function init() {
      if (!token) { setError('No token provided'); setLoading(false); return; }
      const json = await fetchPortalData(false);
      if (json) {
        setIsCheckedIn(json.member?.is_checked_in || false);
        setCheckedInAt(json.member?.checked_in_at || null);
      }
      setLoading(false);
    }
    init();
  }, [token, fetchPortalData]);

  async function handleCheckIn() {
    setCheckInLoading(true);
    setCheckInError(null);
    try {
      const res = await fetch(`${API_BASE}/portal/check-in/${token}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setCheckInError(json.error || 'Failed to check in. Please try again.');
        return;
      }
      // Optimistic update
      setIsCheckedIn(true);
      setCheckedInAt(new Date().toISOString());
      setShowCheckInPanel(false);
      // Refetch to update attendance list & session counts
      fetchPortalData(true);
    } catch {
      setCheckInError('Network error. Please try again.');
    } finally {
      setCheckInLoading(false);
    }
  }

  async function handleCheckOut() {
    setCheckInLoading(true);
    setCheckInError(null);
    try {
      const res = await fetch(`${API_BASE}/portal/check-out/${token}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setCheckInError(json.error || 'Failed to check out. Please try again.');
        return;
      }
      // Optimistic update
      setIsCheckedIn(false);
      setCheckedInAt(null);
      setShowCheckInPanel(false);
      // Refetch to update attendance list
      fetchPortalData(true);
    } catch {
      setCheckInError('Network error. Please try again.');
    } finally {
      setCheckInLoading(false);
    }
  }

  if (loading) return <LoadingSkeleton />;
  if (error || !data) return <ErrorScreen message={error} />;

  const { member, gym, attendance = [], payments = [], progress_photos = [] } = data;
  const recentAttendance = attendance.slice(0, 10);
  const recentPayments = payments.slice(0, 5);
  const recentPhotos = progress_photos.slice(0, 4);

  const gymName = gym?.name || 'Your Gym';
  const gymLogo = gym?.logo;

  const checkInBlocked = member.is_frozen || (!isCheckedIn && member.status === 'expired');

  return (
    <div className="min-h-screen bg-dark-200 pb-16">
      {/* Gym Header */}
      <div
        className="py-6 px-4 border-b border-gray-800/50"
        style={{ background: 'linear-gradient(135deg, rgb(var(--gym-600-rgb) / 0.2), transparent)' }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {gymLogo ? (
              <img
                src={gymLogo}
                alt={gymName}
                className="w-12 h-12 rounded-xl object-cover border border-gym-500/30 flex-shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgb(var(--gym-500-rgb)), rgb(var(--gym-700-rgb)))',
                  boxShadow: '0 4px 14px rgb(var(--gym-500-rgb) / 0.35)',
                }}
              >
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-white">{gymName}</h1>
              <p className="text-xs text-gray-400">Member Portal</p>
            </div>
          </div>
          {gym?.phone && (
            <a
              href={`tel:${gym.phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-300 hover:text-white border border-gray-700/60 bg-dark-300/60 hover:bg-dark-300 transition-all flex-shrink-0"
            >
              <Phone className="w-3.5 h-3.5" style={{ color: 'rgb(var(--gym-400-rgb))' }} />
              {gym.phone}
            </a>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Member Card */}
        <div className="bg-dark-300 rounded-2xl border border-gray-800/60 overflow-hidden">
          {/* Card gradient top strip */}
          <div className="h-1" style={{ background: 'linear-gradient(90deg, rgb(var(--gym-400-rgb)), rgb(var(--gym-600-rgb)))' }} />
          <div className="p-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              {member.photo ? (
                <img
                  src={member.photo}
                  alt={member.name}
                  className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border-2"
                  style={{ borderColor: 'rgb(var(--gym-500-rgb) / 0.4)', boxShadow: '0 4px 16px rgb(var(--gym-500-rgb) / 0.35)' }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgb(var(--gym-500-rgb)), rgb(var(--gym-700-rgb)))',
                    boxShadow: '0 4px 16px rgb(var(--gym-500-rgb) / 0.4)',
                  }}
                >
                  {member.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white truncate">{member.name}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                    style={{
                      background: 'rgb(var(--gym-500-rgb) / 0.15)',
                      color: 'rgb(var(--gym-400-rgb))',
                      borderColor: 'rgb(var(--gym-500-rgb) / 0.3)',
                    }}
                  >
                    {MEMBERSHIP_LABELS[member.membership_type] || member.membership_type}
                  </span>
                  <StatusBadge status={member.status} />
                </div>
                <div className="mt-2 space-y-0.5">
                  {member.membership_start && (
                    <p className="text-xs text-gray-500">
                      Started: <span className="text-gray-400">{formatDate(member.membership_start)}</span>
                    </p>
                  )}
                  {member.membership_end && (
                    <p className="text-xs text-gray-500">
                      {member.status === 'expired' ? 'Expired' : 'Expires'}:{' '}
                      <span className="text-gray-400">{formatDate(member.membership_end)}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Outstanding balance warning */}
            {member.outstanding_balance > 0 && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/25">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-400">Outstanding Balance</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    You have an unpaid balance of{' '}
                    <span className="text-white font-semibold">{formatCurrency(member.outstanding_balance)}</span>.
                    {' '}Please settle it at the gym.
                  </p>
                </div>
              </div>
            )}

            {/* Frozen membership banner */}
            {member.is_frozen && (
              <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/25">
                <Snowflake className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-400">Membership Frozen</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Your membership is temporarily paused
                    {member.frozen_until ? ` until ${formatDate(member.frozen_until)}` : ''}.
                    Contact the gym to unfreeze.
                  </p>
                </div>
              </div>
            )}

            {/* Days Counter */}
            <div className="mt-4 rounded-xl bg-dark-400/60 border border-gray-800/40">
              <DaysCounter member={member} />
            </div>
          </div>
        </div>

        {/* ── Self Check-In Card ── */}
        <div className="bg-dark-300 rounded-2xl border border-gray-800/60 overflow-hidden">
          {/* Status header */}
          <div className="px-5 pt-5 pb-4 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ background: isCheckedIn ? 'rgb(34 197 94 / 0.15)' : 'rgb(var(--gym-500-rgb) / 0.15)' }}
            >
              {isCheckedIn
                ? <CheckCircle className="w-5 h-5 text-green-400" />
                : <LogIn className="w-5 h-5" style={{ color: 'rgb(var(--gym-400-rgb))' }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">
                {isCheckedIn ? 'Currently Inside' : 'Record Your Visit'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isCheckedIn
                  ? (checkedInAt ? `Since ${formatDateTime(checkedInAt)}` : 'Checked in')
                  : 'Tap to log your attendance'
                }
              </p>
            </div>
            {isCheckedIn && (
              <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Active
              </span>
            )}
          </div>

          {/* Action area */}
          <div className="px-5 pb-5 space-y-2">
            {/* Main toggle button */}
            <button
              onClick={() => { setShowCheckInPanel(p => !p); setCheckInError(null); }}
              disabled={checkInLoading || checkInBlocked}
              className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all"
              style={
                checkInBlocked
                  ? { background: 'rgb(255 255 255 / 0.05)', color: '#6b7280', cursor: 'not-allowed' }
                  : isCheckedIn
                    ? { background: 'rgb(245 158 11 / 0.15)', color: '#fbbf24', border: '1px solid rgb(245 158 11 / 0.3)' }
                    : { background: 'linear-gradient(135deg, rgb(var(--gym-500-rgb)), rgb(var(--gym-700-rgb)))', color: '#fff', boxShadow: '0 4px 14px rgb(var(--gym-500-rgb) / 0.3)' }
              }
            >
              {isCheckedIn
                ? <LogOut className="w-4 h-4 flex-shrink-0" />
                : <LogIn className="w-4 h-4 flex-shrink-0" />
              }
              <span className="flex-1 text-left">
                {isCheckedIn ? 'Check Out' : 'Check In Now'}
              </span>
              <ChevronDown
                className="w-4 h-4 flex-shrink-0 transition-transform"
                style={{
                  opacity: 0.6,
                  transform: showCheckInPanel ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            {/* Expanded confirmation panel */}
            {showCheckInPanel && !checkInBlocked && (
              <div className="rounded-xl bg-dark-400/80 border border-gray-800/60 p-4 space-y-3">
                {isCheckedIn ? (
                  <>
                    <p className="text-xs text-gray-400 text-center">Confirm you're done with your workout?</p>
                    <button
                      onClick={handleCheckOut}
                      disabled={checkInLoading}
                      className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                      style={{ opacity: checkInLoading ? 0.6 : 1 }}
                    >
                      {checkInLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Checking out…
                        </>
                      ) : (
                        <>
                          <LogOut className="w-4 h-4" />
                          Confirm Check Out
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">
                        Log your visit at <span className="text-white font-medium">{gymName}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={handleCheckIn}
                      disabled={checkInLoading}
                      className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg, rgb(var(--gym-500-rgb)), rgb(var(--gym-700-rgb)))',
                        opacity: checkInLoading ? 0.6 : 1,
                      }}
                    >
                      {checkInLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Checking in…
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Confirm Check In
                        </>
                      )}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowCheckInPanel(false)}
                  className="w-full py-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Error message */}
            {checkInError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{checkInError}</p>
              </div>
            )}

            {/* Contextual hint when blocked */}
            {member.is_frozen && (
              <p className="text-xs text-blue-400 text-center">Check-in is unavailable while your membership is frozen</p>
            )}
            {!member.is_frozen && !isCheckedIn && member.status === 'expired' && (
              <p className="text-xs text-red-400 text-center">Renew your membership to check in</p>
            )}
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="bg-dark-300 rounded-2xl border border-gray-800/60 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-gray-800/40">
            <LogIn className="w-4 h-4 text-gym-400" />
            <h3 className="text-sm font-semibold text-white">Recent Attendance</h3>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
              <TrendingUp className="w-3 h-3" />
              {SESSION_TYPES.includes(member.membership_type)
                ? <span>{member.sessions_used || 0} total visits</span>
                : <span>last {recentAttendance.length} visits shown</span>
              }
            </div>
          </div>
          {recentAttendance.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">No attendance records yet</div>
          ) : (
            <div className="divide-y divide-gray-800/40">
              {recentAttendance.map((entry, i) => {
                const duration = formatDuration(entry.check_in, entry.check_out);
                const isActiveEntry = !entry.check_out && i === 0;
                return (
                  <div key={entry.id || i} className="px-5 py-3 flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: isActiveEntry ? 'rgb(34 197 94 / 0.15)' : 'rgb(var(--gym-500-rgb) / 0.15)' }}
                    >
                      <CheckCircle
                        className="w-4 h-4"
                        style={{ color: isActiveEntry ? '#4ade80' : 'rgb(var(--gym-400-rgb))' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{formatDateTime(entry.check_in)}</p>
                      {isActiveEntry ? (
                        <p className="text-xs text-green-400 flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          Currently inside
                        </p>
                      ) : duration ? (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {duration}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-xs text-gray-600">{timeAgo(entry.check_in)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-dark-300 rounded-2xl border border-gray-800/60 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-gray-800/40">
            <CreditCard className="w-4 h-4 text-gym-400" />
            <h3 className="text-sm font-semibold text-white">Recent Payments</h3>
          </div>
          {recentPayments.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-500">No payment records</div>
          ) : (
            <div className="p-4 space-y-3">
              {recentPayments.map((payment, i) => (
                <div
                  key={payment.id || i}
                  className="flex items-center justify-between p-3 rounded-xl bg-dark-400/60 border border-gray-800/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {(payment.payment_method || 'cash').replace(/_/g, ' ')}
                        {payment.membership_type && ` · ${MEMBERSHIP_LABELS[payment.membership_type] || payment.membership_type}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatDate(payment.payment_date || payment.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress Photos */}
        {recentPhotos.length > 0 && (
          <div className="bg-dark-300 rounded-2xl border border-gray-800/60 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center gap-2 border-b border-gray-800/40">
              <Image className="w-4 h-4 text-gym-400" />
              <h3 className="text-sm font-semibold text-white">Progress Photos</h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {recentPhotos.map((photo, i) => (
                <div key={photo.id || i} className="relative rounded-xl overflow-hidden aspect-square bg-dark-400">
                  <img
                    src={photo.url || photo.photo_url}
                    alt={ANGLE_LABELS[photo.angle] || photo.angle || 'Progress'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-xs font-medium text-white">
                      {ANGLE_LABELS[photo.angle] || photo.angle || 'Photo'}
                    </p>
                    <p className="text-[10px] text-gray-300">{formatDate(photo.taken_at || photo.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 pb-8 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-gray-600">
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Powered by <span className="font-semibold text-gray-500">Hullu Gyms</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
