import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate, formatCurrency, getPaymentMethodLabel } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import {
  TrendingUp, Calendar, CreditCard, Users, ChevronRight, RefreshCw,
  Target, ArrowUpRight, ArrowDownRight, Wallet, Receipt, Building2,
  Smartphone, Banknote, Sparkles, BarChart3, Minus, Zap, Activity,
  DollarSign,
} from 'lucide-react';
import clsx from 'clsx';
import PageHint from '../components/PageHint';

// ── Animated counter ──────────────────────────────────────────────────────────
function useAnimatedCounter(endValue, duration = 1300, delay = 0) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStarted(true); },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started || !endValue) return;
    const t = setTimeout(() => {
      let s = null;
      const tick = (now) => {
        if (!s) s = now;
        const p = Math.min((now - s) / duration, 1);
        setCount(Math.floor((1 - Math.pow(1 - p, 3)) * endValue));
        if (p < 1) requestAnimationFrame(tick);
        else setCount(endValue);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [started, endValue, duration, delay]);

  return { count, ref };
}

// ── Mini sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data, width = 72, height = 24, color = '#34d399' }) {
  const vals = (data || []).slice(-14).map(d => parseFloat(d.total) || 0);
  if (vals.length < 2) return <div style={{ width, height }} />;

  const max = Math.max(...vals, 1);
  const step = width / (vals.length - 1);
  const pts  = vals.map((v, i) => `${i * step},${height - 2 - ((v / max) * (height - 4))}`).join(' ');
  const fill = `0,${height} ${pts} ${(vals.length - 1) * step},${height}`;
  const uid  = useRef(`spk${Math.random().toString(36).slice(2, 7)}`).current;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#${uid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={(vals.length - 1) * step}
        cy={height - 2 - ((vals[vals.length - 1] / max) * (height - 4))}
        r="2.5" fill={color}
      />
    </svg>
  );
}

// ── Progress ring ─────────────────────────────────────────────────────────────
function ProgressRing({ pct = 0, size = 120, stroke = 7 }) {
  const r     = (size - stroke) / 2;
  const circ  = 2 * Math.PI * r;
  const off   = circ * (1 - Math.min(pct, 100) / 100);
  const uid   = useRef(`ring${Math.random().toString(36).slice(2, 6)}`).current;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <defs>
        <linearGradient id={uid} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={`url(#${uid})`} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  );
}

// ── parseLabel (chart x-axis) ─────────────────────────────────────────────────
function parseLabel(str, period, locale = 'default') {
  if (!str) return { short: '', long: '' };
  const s = String(str).slice(0, 10);
  if (period === 'monthly') {
    const [y, m] = s.split('-');
    if (y && m) {
      const d = new Date(parseInt(y), parseInt(m) - 1, 1);
      return {
        short: d.toLocaleDateString(locale, { month: 'short' }),
        long:  d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
      };
    }
  }
  if (period === 'daily') {
    const [y, m, d] = s.split('-').map(Number);
    if (y && m && d) {
      const dt = new Date(y, m - 1, d);
      if (!isNaN(dt)) return {
        short: dt.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
        long:  dt.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
      };
    }
  }
  if (period === 'weekly') {
    const match = String(str).match(/^(\d{4})-W(\d+)$/);
    if (match) return { short: `W${parseInt(match[2])}`, long: `Week ${parseInt(match[2])}, ${match[1]}` };
  }
  if (period === 'yearly') return { short: String(str), long: String(str) };
  return { short: String(str), long: String(str) };
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO CARD — this month's revenue (the one number that matters most)
// ─────────────────────────────────────────────────────────────────────────────
function HeroCard({ stats, animated }) {
  const thisMonth  = parseFloat(stats?.this_month  || 0);
  const lastMonth  = parseFloat(stats?.last_month  || 0);
  const trend      = lastMonth > 0
    ? Math.round(((thisMonth - lastMonth) / lastMonth) * 10) / 10
    : null;
  const isUp = trend !== null && trend >= 0;

  const [goal, setGoal]       = useState(null);
  const [editing, setEditing] = useState(false);
  const [input, setInput]     = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    api.get('/auth/gym-settings').then(d => {
      const v = parseFloat(d?.revenue_goal);
      if (!isNaN(v) && v > 0) setGoal(v);
    }).catch(() => {});
  }, []);

  const saveGoal = async () => {
    const v = parseFloat(input);
    if (isNaN(v) || v <= 0) return;
    setSaving(true);
    try {
      await api.put('/auth/gym-settings', { revenue_goal: v });
      setGoal(v);
      setEditing(false);
    } catch { /* noop */ } finally { setSaving(false); }
  };

  const pct      = goal ? Math.min(Math.round((thisMonth / goal) * 100), 100) : 0;
  const achieved = goal && thisMonth >= goal;
  const { count, ref } = useAnimatedCounter(thisMonth, 1600, 120);

  const now       = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-dark-100 to-dark-300">
      {/* Ambient glows */}
      <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-emerald-600/6 blur-2xl pointer-events-none" />

      <div className="relative p-6 lg:p-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          {/* Left: number + trend */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Revenue · {monthName}
              </span>
            </div>

            <p className={clsx(
              "font-black text-white leading-none tracking-tight transition-all duration-700",
              "text-4xl sm:text-5xl lg:text-6xl",
              animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}>
              {formatCurrency(animated ? count : 0)}
            </p>

            <div className="flex items-center flex-wrap gap-3 mt-5">
              {trend !== null ? (
                <div className={clsx(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border",
                  isUp
                    ? "bg-emerald-500/12 text-emerald-400 border-emerald-500/25"
                    : "bg-red-500/12 text-red-400 border-red-500/25"
                )}>
                  {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {trend > 0 ? '+' : ''}{trend}% vs last month
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-gray-500 bg-dark-300/80 border border-gray-800">
                  <Minus className="w-3.5 h-3.5" /> No prior data
                </div>
              )}
              {lastMonth > 0 && (
                <span className="text-sm text-gray-500">
                  Last month: <span className="text-gray-400 font-medium">{formatCurrency(lastMonth)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: goal ring or goal-set prompt */}
          <div className="flex-shrink-0">
            {goal ? (
              <div className="flex flex-col items-center gap-1">
                <div className="relative">
                  <ProgressRing pct={animated ? pct : 0} size={124} stroke={8} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={clsx(
                      "text-2xl font-black",
                      achieved ? "text-emerald-400" : "text-white"
                    )}>{pct}%</span>
                    <span className="text-[10px] text-gray-500 -mt-0.5">of goal</span>
                  </div>
                </div>
                <button onClick={() => { setInput(String(goal)); setEditing(true); }}
                  className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors">
                  {formatCurrency(goal)} goal · edit
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-1 hover:border-gym-500/40 transition-colors cursor-pointer group"
                  onClick={() => setEditing(true)}>
                  <Target className="w-6 h-6 text-gray-600 group-hover:text-gym-400 transition-colors" />
                  <span className="text-[10px] text-gray-600 group-hover:text-gray-400 transition-colors text-center leading-tight">Set<br/>Goal</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Goal progress bar */}
        {goal && !editing && (
          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Target className="w-3 h-3" />
                Monthly goal
              </span>
              <span className={achieved ? "text-emerald-400 font-semibold" : ""}>
                {achieved ? "Achieved!" : `${formatCurrency(Math.max(0, goal - thisMonth))} remaining`}
              </span>
            </div>
            <div className="h-2 bg-dark-400/80 rounded-full overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full bg-gradient-to-r transition-all duration-1500 ease-out",
                  achieved ? "from-emerald-400 to-emerald-500"
                  : pct >= 75 ? "from-gym-400 to-gym-500"
                  : pct >= 40 ? "from-amber-400 to-amber-500"
                  : "from-red-400 to-red-500"
                )}
                style={{ width: animated ? `${pct}%` : '0%' }}
              />
            </div>
          </div>
        )}

        {/* Inline goal edit form */}
        {editing && (
          <div className="mt-4 flex items-center gap-2">
            <input
              type="number"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Monthly goal amount"
              className="flex-1 bg-dark-300 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gym-500/60"
              autoFocus
            />
            <button onClick={() => setEditing(false)}
              className="px-3 py-2 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-dark-300 transition-colors">
              Cancel
            </button>
            <button onClick={saveGoal} disabled={saving}
              className="px-3 py-2 text-xs font-semibold bg-gym-500 hover:bg-gym-400 text-white rounded-xl transition-colors disabled:opacity-50">
              {saving ? '…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD — compact metric with sparkline
// ─────────────────────────────────────────────────────────────────────────────
function KpiCard({ title, value, trendPct, icon: Icon, accent, sparkData, delay, animated, isCurrency, sub }) {
  const { count, ref } = useAnimatedCounter(parseFloat(value) || 0, 1200, delay);

  const A = {
    blue:   { border: 'border-blue-500/20',   icon: 'from-blue-500 to-blue-600',     spark: '#60a5fa', badge: 'bg-blue-500/12 text-blue-400 border-blue-500/25' },
    purple: { border: 'border-purple-500/20', icon: 'from-purple-500 to-purple-600', spark: '#c084fc', badge: 'bg-purple-500/12 text-purple-400 border-purple-500/25' },
    amber:  { border: 'border-amber-500/20',  icon: 'from-amber-400 to-amber-600',   spark: '#fbbf24', badge: 'bg-amber-500/12 text-amber-400 border-amber-500/25' },
    rose:   { border: 'border-rose-500/20',   icon: 'from-rose-500 to-rose-600',     spark: '#fb7185', badge: 'bg-rose-500/12 text-rose-400 border-rose-500/25' },
  };
  const c      = A[accent] || A.blue;
  const hasTrend = trendPct !== null && trendPct !== undefined;
  const isUp   = hasTrend && trendPct >= 0;

  return (
    <div
      ref={ref}
      className={clsx(
        "glass-card p-5 border flex flex-col justify-between gap-3 transition-all duration-700",
        c.border,
        animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
          {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
        </div>
        <div className={clsx("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md flex-shrink-0", c.icon)}>
          <Icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
        </div>
      </div>

      <p className="text-2xl font-black text-white leading-none">
        {isCurrency
          ? formatCurrency(animated ? count : 0)
          : (animated ? count.toLocaleString() : '—')}
      </p>

      <div className="flex items-end justify-between gap-2">
        {hasTrend ? (
          <div className={clsx(
            "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
            c.badge
          )}>
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trendPct > 0 ? '+' : ''}{trendPct}%
          </div>
        ) : (
          <div className="text-xs text-gray-700">—</div>
        )}
        <Sparkline data={sparkData} width={64} height={22} color={c.spark} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE CHART
// ─────────────────────────────────────────────────────────────────────────────
function RevenueChart({ data, period, onPeriodChange, animated, stats }) {
  const { t, lang } = useLanguage();
  const locale = lang === 'am' ? 'am-ET' : 'en-US';
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const periods = [
    { key: 'daily',   label: 'Day' },
    { key: 'weekly',  label: 'Week' },
    { key: 'monthly', label: 'Month' },
    { key: 'yearly',  label: 'Year' },
  ];

  const VW = 900, VH = 260;
  const pad = { top: 16, right: 16, bottom: 48, left: 60 };
  const innerW = VW - pad.left - pad.right;
  const innerH = VH - pad.top - pad.bottom;
  const GRID   = 4;

  const maxVal = data.length > 0 ? Math.max(...data.map(d => d.total), 1) : 1;
  const slotW  = data.length > 0 ? innerW / data.length : innerW;
  const barW   = Math.min(slotW * 0.55, 40);
  const xOf    = i => pad.left + slotW * i + slotW / 2;
  const baseY  = pad.top + innerH;

  const barPath = (cx, y, w, h, r) => {
    if (h <= 0) return '';
    const x  = cx - w / 2;
    const cr = Math.min(r, w / 2, h);
    return `M${x},${y + h} L${x},${y + cr} Q${x},${y} ${x + cr},${y} L${x + w - cr},${y} Q${x + w},${y} ${x + w},${y + cr} L${x + w},${y + h} Z`;
  };

  const fmtY = v => {
    if (v === 0) return '0';
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return Math.round(v).toString();
  };

  // Compute totals for the period header
  const periodTotal = data.reduce((s, d) => s + (parseFloat(d.total) || 0), 0);

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5 flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Revenue Over Time
          </h2>
          {periodTotal > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {period === 'daily'   && 'Last 30 days: '}
              {period === 'weekly'  && 'Last 13 weeks: '}
              {period === 'monthly' && 'Last 12 months: '}
              {period === 'yearly'  && 'All time: '}
              <span className="text-gray-300 font-medium">{formatCurrency(periodTotal)}</span>
            </p>
          )}
        </div>
        <div className="flex items-center bg-dark-400/60 rounded-xl p-1 gap-0.5">
          {periods.map(p => {
            const count = stats?.[`${p.key}_trend`]?.length ?? 0;
            return (
              <button key={p.key} onClick={() => onPeriodChange(p.key)}
                className={clsx(
                  "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200",
                  period === p.key
                    ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-300"
                )}>
                {p.label}
                {count > 0 && (
                  <span className={clsx(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    period === p.key ? "bg-emerald-500/30 text-emerald-300" : "bg-dark-200 text-gray-600"
                  )}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="px-2 py-3">
        {data.length > 0 ? (
          <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#34d399" stopOpacity="1" />
                <stop offset="70%"  stopColor="#10b981" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#065f46" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="barGH" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#6ee7b7" stopOpacity="1" />
                <stop offset="60%"  stopColor="#34d399" stopOpacity="1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Grid */}
            {Array.from({ length: GRID + 1 }, (_, i) => {
              const frac = i / GRID;
              const y    = pad.top + innerH * frac;
              return (
                <g key={i}>
                  <line x1={pad.left} y1={y} x2={VW - pad.right} y2={y}
                    stroke={i === GRID ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}
                    strokeWidth={i === GRID ? 1.5 : 1}
                    strokeDasharray={i === GRID ? '' : '3 6'} />
                  <text x={pad.left - 8} y={y + 4} textAnchor="end" fill="#374151"
                    fontSize="11" fontFamily="ui-sans-serif,system-ui,sans-serif">
                    {fmtY(maxVal * (1 - frac))}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {data.map((item, i) => {
              const cx   = xOf(i);
              const rawH = (item.total / maxVal) * innerH;
              const barH = animated ? Math.max(rawH, item.total > 0 ? 3 : 0) : 0;
              const barY = baseY - barH;
              const hov  = hoveredIdx === i;
              const { short, long } = parseLabel(item.label, period, locale);

              const TW = 148, TH = 48;
              const tipX  = Math.min(Math.max(cx - TW / 2, pad.left), VW - pad.right - TW);
              const tipY  = Math.max(barY - TH - 12, pad.top);
              const carX  = Math.min(Math.max(cx, tipX + 12), tipX + TW - 12);

              return (
                <g key={item.label || i}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ cursor: 'pointer' }}>

                  <rect x={cx - slotW / 2} y={pad.top} width={slotW} height={innerH} fill="transparent" />

                  {hov && (
                    <rect x={cx - barW / 2 - 6} y={pad.top} width={barW + 12} height={innerH}
                      rx={8} fill="rgba(52,211,153,0.07)" />
                  )}

                  {barH > 0 && (
                    <path d={barPath(cx, barY, barW, barH, 5)}
                      fill={hov ? 'url(#barGH)' : 'url(#barG)'}
                      opacity={hov ? 1 : 0.8}
                      filter={hov ? 'url(#glow)' : undefined}
                      style={{ transition: 'opacity 0.15s' }} />
                  )}

                  {barH > 6 && (
                    <line x1={cx - barW / 2 + 4} y1={barY + 1.5}
                      x2={cx + barW / 2 - 4} y2={barY + 1.5}
                      stroke={hov ? '#a7f3d0' : '#6ee7b7'}
                      strokeWidth="1.5" strokeLinecap="round"
                      opacity={hov ? 0.9 : 0.35} />
                  )}

                  <text x={cx} y={baseY + 16} textAnchor="middle"
                    fill={hov ? '#9ca3af' : '#374151'}
                    fontSize={data.length > 20 ? 8 : data.length > 12 ? 9 : 10}
                    fontWeight={hov ? '600' : '400'}
                    fontFamily="ui-sans-serif,system-ui,sans-serif">
                    {short}
                  </text>

                  {hov && (
                    <g>
                      <rect x={tipX + 3} y={tipY + 3} width={TW} height={TH} rx={8} fill="rgba(0,0,0,0.35)" />
                      <rect x={tipX} y={tipY} width={TW} height={TH} rx={8}
                        fill="#0f172a" stroke="#34d399" strokeWidth="1" strokeOpacity="0.4" />
                      <circle cx={tipX + 13} cy={tipY + 15} r="3.5" fill="#34d399" />
                      <text x={tipX + 24} y={tipY + 19} fill="#6ee7b7" fontSize="9" fontWeight="500"
                        fontFamily="ui-sans-serif,system-ui,sans-serif">{long}</text>
                      <text x={tipX + 13} y={tipY + 37} fill="white" fontSize="13" fontWeight="800"
                        fontFamily="ui-sans-serif,system-ui,sans-serif">
                        ETB {(item.total || 0).toLocaleString()}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p className="text-sm text-gray-500">No data for this period</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT METHODS — arc segments + ranked list
// ─────────────────────────────────────────────────────────────────────────────
function PaymentMethods({ data, animated }) {
  const COLORS = [
    { gradient: 'from-emerald-500 to-green-600', bar: 'bg-gradient-to-r from-emerald-500 to-green-500', text: 'text-emerald-400', Icon: Banknote },
    { gradient: 'from-blue-500 to-cyan-500',     bar: 'bg-gradient-to-r from-blue-500 to-cyan-400',    text: 'text-blue-400',    Icon: Smartphone },
    { gradient: 'from-purple-500 to-violet-600', bar: 'bg-gradient-to-r from-purple-500 to-violet-500', text: 'text-purple-400', Icon: Building2 },
    { gradient: 'from-amber-500 to-orange-500',  bar: 'bg-gradient-to-r from-amber-500 to-orange-400', text: 'text-amber-400',   Icon: CreditCard },
  ];

  const totalRevenue = data.reduce((s, d) => s + (parseFloat(d.total) || 0), 0);
  const maxRevenue   = Math.max(...data.map(d => parseFloat(d.total) || 0), 1);
  const sorted       = [...data].sort((a, b) => (parseFloat(b.total) || 0) - (parseFloat(a.total) || 0));

  return (
    <div className="glass-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          Payment Methods
        </h2>
        {totalRevenue > 0 && (
          <span className="text-xs text-gray-500 bg-dark-300/70 px-2 py-1 rounded-full">
            {formatCurrency(totalRevenue)}
          </span>
        )}
      </div>

      {sorted.length > 0 ? (
        <div className="space-y-4 flex-1">
          {sorted.map((item, i) => {
            const total  = parseFloat(item.total) || 0;
            const share  = totalRevenue > 0 ? (total / totalRevenue) * 100 : 0;
            const barPct = (total / maxRevenue) * 100;
            const c      = COLORS[i % COLORS.length];

            return (
              <div key={item.payment_method}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={clsx("w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0", c.gradient)}>
                      <c.Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <span className="text-sm text-gray-200 font-medium">{getPaymentMethodLabel(item.payment_method)}</span>
                      <span className="text-xs text-gray-600 ml-1.5">{item.count} txs</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white">{formatCurrency(total)}</span>
                    <span className={clsx("text-xs font-semibold ml-1.5", c.text)}>{share.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-dark-400 rounded-full overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full transition-all duration-1000 ease-out", c.bar)}
                    style={{ width: animated ? `${barPct}%` : '0%', transitionDelay: `${i * 100}ms` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600">
          <div className="text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-gray-700" />
            <p className="text-sm">No payment data</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP CUSTOMERS — leaderboard
// ─────────────────────────────────────────────────────────────────────────────
function TopCustomers({ customers }) {
  const MEDALS = ['🥇', '🥈', '🥉'];
  const AVATAR_GRADIENTS = [
    'from-amber-500 to-orange-500',
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-emerald-500 to-teal-500',
    'from-rose-500 to-pink-500',
  ];

  return (
    <div className="glass-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-white" />
          </div>
          Top Members
        </h2>
        <Link to="/customers" className="text-xs text-gym-400 hover:text-gym-300 flex items-center gap-1 transition-colors">
          All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {customers.length > 0 ? (
        <div className="space-y-1.5 flex-1">
          {customers.slice(0, 8).map((c, i) => (
            <Link key={c.id} to={`/customers/${c.id}`}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-dark-200/70 transition-all group">
              {/* Rank */}
              <div className="w-6 text-center flex-shrink-0">
                {i < 3
                  ? <span className="text-base leading-none">{MEDALS[i]}</span>
                  : <span className="text-xs font-bold text-gray-600">#{i + 1}</span>
                }
              </div>
              {/* Avatar */}
              <div className={clsx(
                "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
                AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
              )}>
                {c.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                  {c.name}
                </p>
                <p className="text-[10px] text-gray-600">{c.payment_count || 0} payments</p>
              </div>
              {/* Amount */}
              <span className="text-sm font-bold text-amber-400 flex-shrink-0">
                {formatCurrency(c.total_spent)}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600">
          <div className="text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-700" />
            <p className="text-sm">No data yet</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECENT TRANSACTIONS — feed / timeline style
// ─────────────────────────────────────────────────────────────────────────────
function RecentTransactions({ transactions }) {
  const methodIcon = m => {
    if (m === 'mobile_transfer' || m === 'mobile_money') return <Smartphone className="w-3.5 h-3.5" />;
    if (m === 'bank_transfer') return <Building2 className="w-3.5 h-3.5" />;
    return <Banknote className="w-3.5 h-3.5" />;
  };

  const methodColor = m => {
    if (m === 'mobile_transfer' || m === 'mobile_money') return 'bg-blue-500/10 text-blue-400';
    if (m === 'bank_transfer') return 'bg-purple-500/10 text-purple-400';
    return 'bg-emerald-500/10 text-emerald-400';
  };

  return (
    <div className="glass-card p-5 flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Receipt className="w-3.5 h-3.5 text-white" />
          </div>
          Recent Transactions
        </h2>
        <Link to="/customers" className="text-xs text-gym-400 hover:text-gym-300 flex items-center gap-1 transition-colors">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {transactions.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/20 via-gray-700/40 to-transparent" />

          <div className="space-y-1">
            {transactions.map((tx, i) => (
              <Link key={tx.id} to={`/customers/${tx.customer_id}`}
                className="relative flex items-center gap-3 pl-10 pr-3 py-2.5 rounded-xl hover:bg-dark-200/50 transition-all group">
                {/* Timeline dot */}
                <div className="absolute left-[13px] w-2.5 h-2.5 rounded-full bg-dark-300 border-2 border-emerald-500/40 group-hover:border-emerald-400/70 transition-colors flex-shrink-0" />

                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-gym-500/10 border border-gym-500/15 flex items-center justify-center text-sm font-bold text-gym-400 flex-shrink-0">
                  {tx.customer_name?.charAt(0)?.toUpperCase() || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                    {tx.customer_name || '—'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-gray-500">{formatDate(tx.payment_date)}</span>
                    <span className={clsx(
                      "inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      methodColor(tx.payment_method)
                    )}>
                      {methodIcon(tx.payment_method)}
                      {getPaymentMethodLabel(tx.payment_method)}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <span className="text-sm font-bold text-emerald-400 flex-shrink-0 group-hover:text-emerald-300 transition-colors">
                  +{formatCurrency(tx.amount)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center py-8 text-gray-600">
          <div className="text-center">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-700" />
            <p className="text-sm">No transactions yet</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST BANNER
// ─────────────────────────────────────────────────────────────────────────────
function ForecastBanner({ forecast }) {
  const growthRate = forecast?.growth_rate ?? 0;
  const isPos      = growthRate >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/8 via-dark-100 to-pink-500/5 p-5">
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-purple-500/6 blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-4 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/25">
          <Sparkles className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-medium mb-0.5">Next 30-Day Forecast</p>
          <p className="text-sm text-gray-300">
            Projected revenue: <span className="text-white font-bold">
              {forecast?.predicted_revenue ? formatCurrency(forecast.predicted_revenue) : '—'}
            </span>
          </p>
        </div>

        <div className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold flex-shrink-0",
          isPos
            ? "bg-emerald-500/12 text-emerald-400 border-emerald-500/25"
            : "bg-red-500/12 text-red-400 border-red-500/25"
        )}>
          {isPos ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}% trend
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function Revenue() {
  const { t } = useLanguage();
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [animated, setAnimated]         = useState(false);
  const [chartPeriod, setChartPeriod]   = useState('monthly');
  const [chartData, setChartData]       = useState([]);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { if (stats) setTimeout(() => setAnimated(true), 80); }, [stats]);
  useEffect(() => {
    if (!stats) return;
    const map = {
      daily:   stats.daily_trend,
      weekly:  stats.weekly_trend,
      monthly: stats.monthly_trend,
      yearly:  stats.yearly_trend,
    };
    setChartData(map[chartPeriod] || []);
  }, [chartPeriod, stats]);

  const loadStats = async () => {
    try {
      const data = await api.get('/stats/revenue');
      setStats(data || {});
    } catch (err) {
      console.error('Failed to load revenue stats:', err);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  // Trend helpers
  const pct = (curr, prev) => prev > 0 ? Math.round(((curr - prev) / prev) * 10) / 10 : null;
  const dayTrend  = pct(stats?.today     || 0, stats?.yesterday  || 0);
  const weekTrend = pct(stats?.this_week || 0, stats?.last_week  || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-emerald-600/25 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHint id="revenue">
        Every payment recorded against a member appears here automatically. The bar chart shows revenue over time — hover a bar for details. Payment Methods shows which method drives the most revenue. Set a monthly goal with the ring widget to track progress.
      </PageHint>

      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Revenue <span className="gradient-text">Overview</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Track income, trends and projections</p>
        </div>
        <button onClick={loadStats}
          className="btn-secondary inline-flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Hero + KPI strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hero spans 2 cols */}
        <div className="lg:col-span-2">
          <HeroCard stats={stats} animated={animated} />
        </div>

        {/* KPI column: 3 small cards stacked */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
          <KpiCard
            title="Today"
            value={stats?.today || 0}
            trendPct={dayTrend}
            icon={Zap}
            accent="amber"
            sparkData={stats?.daily_trend?.slice(-7)}
            delay={100}
            animated={animated}
            isCurrency
          />
          <KpiCard
            title="This Week"
            value={stats?.this_week || 0}
            trendPct={weekTrend}
            icon={Activity}
            accent="blue"
            sparkData={stats?.weekly_trend?.slice(-7)}
            delay={200}
            animated={animated}
            isCurrency
          />
          <KpiCard
            title="All Time"
            value={stats?.total_revenue || 0}
            trendPct={null}
            icon={Wallet}
            accent="purple"
            sparkData={stats?.monthly_trend?.slice(-7)}
            delay={300}
            animated={animated}
            isCurrency
            sub="Total collected"
          />
        </div>
      </div>

      {/* Forecast banner */}
      {stats?.forecast && (
        <ForecastBanner forecast={stats.forecast} />
      )}

      {/* Revenue chart */}
      <RevenueChart
        data={chartData}
        period={chartPeriod}
        onPeriodChange={setChartPeriod}
        animated={animated}
        stats={stats}
      />

      {/* Bottom grid: 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <PaymentMethods data={stats?.payment_methods || []} animated={animated} />
        <TopCustomers   customers={stats?.top_customers || []} />
        <RecentTransactions transactions={stats?.recent_transactions || []} />
      </div>
    </div>
  );
}
