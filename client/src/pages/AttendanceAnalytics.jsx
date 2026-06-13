import { useState, useEffect } from 'react';
import { api, formatDate } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { StatCardSkeleton } from '../components/Skeleton';
import {
  Activity, Clock, Users, TrendingUp, BarChart3, Calendar, LogIn
} from 'lucide-react';
import clsx from 'clsx';
import PageHint from '../components/PageHint';

export default function AttendanceAnalytics() {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Heatmap state
  const [heatmap, setHeatmap] = useState(null);
  const [heatmapMonth, setHeatmapMonth] = useState('');
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  useEffect(() => {
    loadStats();
    loadHeatmap('');
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.get('/attendance/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load attendance stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHeatmap = async (month) => {
    setHeatmapLoading(true);
    try {
      const query = month ? `?month=${month}` : '';
      const data = await api.get(`/attendance/heatmap${query}`);
      setHeatmap(data);
      if (!month) setHeatmapMonth(data.month);
    } catch (e) {
      console.warn('Failed to load heatmap:', e);
    } finally {
      setHeatmapLoading(false);
    }
  };

  const handleHeatmapMonthChange = (month) => {
    setHeatmapMonth(month);
    loadHeatmap(month);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-10 w-72 bg-gray-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const peakHoursData = stats?.peak_hours || [];
  const maxPeakVisits = Math.max(...peakHoursData.map(h => parseInt(h.visits)), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHint id="attendance-analytics">
        <p className="font-semibold text-white mb-2">Understanding your foot traffic</p>
        <ul className="space-y-1.5 text-sm text-gray-300 leading-relaxed">
          <li><span className="text-gym-400 font-medium">Peak hours chart</span> — Shows which hours of the day get the most check-ins. Use this to decide when to have more staff on the floor and when you can run with fewer.</li>
          <li><span className="text-blue-400 font-medium">Busiest days heatmap</span> — A grid of days and times. Darker cells = more members present. Great for scheduling classes at high-traffic times.</li>
          <li><span className="text-yellow-400 font-medium">Trend over time</span> — The line chart shows daily or weekly check-in totals. Look for drops that coincide with holidays or local events, and spikes after promotions.</li>
          <li><span className="text-purple-400 font-medium">Practical use</span> — If Monday mornings are always packed, consider adding staff. If Sunday afternoons are empty, that might be a good time for maintenance or equipment cleaning.</li>
          <li><span className="text-gray-400 font-medium">Data comes from</span> — Every check-in recorded on the Check-In page feeds into these charts. The more consistently you use check-in, the more accurate these numbers are.</li>
        </ul>
      </PageHint>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gym-500/20 flex items-center justify-center">
            <Activity className="w-6 h-6 text-gym-400" />
          </div>
          {t('analytics.title')}
        </h1>
        <p className="text-gray-400 mt-1">{t('analytics.subtitle')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('analytics.todayVisits')}
          value={stats?.today?.total_visits || 0}
          icon={LogIn}
          color="green"
          sub={t('analytics.presentNow', { n: stats?.today?.currently_present || 0 })}
        />
        <StatCard
          title={t('analytics.weeklyVisits')}
          value={stats?.weekly?.total_visits || 0}
          icon={TrendingUp}
          color="blue"
          sub={t('analytics.uniqueVisitors', { n: stats?.weekly?.unique_visitors || 0 })}
        />
        <StatCard
          title={t('analytics.monthlyVisits')}
          value={stats?.monthly?.total_visits || 0}
          icon={Calendar}
          color="purple"
          sub={t('analytics.uniqueVisitors', { n: stats?.monthly?.unique_visitors || 0 })}
        />
        <StatCard
          title={t('analytics.peakHour')}
          value={peakHoursData[0]?.hour || '—'}
          icon={Clock}
          color="amber"
          sub={peakHoursData[0] ? t('analytics.peakVisits', { n: peakHoursData[0].visits }) : t('analytics.noData')}
          isText
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours Chart */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-gym-400" />
            {t('analytics.peakHoursTitle')}
          </h2>
          {peakHoursData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
              {t('analytics.noData')}
            </div>
          ) : (
            <div className="space-y-3">
              {peakHoursData.map((item, i) => {
                const pct = (parseInt(item.visits) / maxPeakVisits) * 100;
                return (
                  <div key={item.hour} className="flex items-center gap-3">
                    <div className="w-14 text-right text-sm font-mono text-gray-400 flex-shrink-0">
                      {item.hour}
                    </div>
                    <div className="flex-1 h-8 bg-dark-200 rounded-lg overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-lg flex items-center justify-end pr-3 transition-all duration-700',
                          i === 0 ? 'bg-gradient-to-r from-gym-600 to-gym-400' :
                          i === 1 ? 'bg-gradient-to-r from-gym-700 to-gym-500' :
                          'bg-gradient-to-r from-gym-800 to-gym-600'
                        )}
                        style={{ width: `${pct}%` }}
                      >
                        {pct > 30 && (
                          <span className="text-xs font-bold text-white">{item.visits}</span>
                        )}
                      </div>
                    </div>
                    <div className="w-8 text-sm text-gray-400 flex-shrink-0">{item.visits}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily Breakdown (last 7 days) */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              {t('analytics.dailyTitle')}
            </h2>
            <span className="text-xs text-gray-500">{t('analytics.7d')}</span>
          </div>
          <DailyChart data={stats?.daily_breakdown || []} t={t} />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visit Streak / Activity Summary */}
        <div className="glass-card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-400" />
            {t('analytics.visitSummary')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              {
                label: t('analytics.today'),
                value: stats?.today?.total_visits || 0,
                sub: t('analytics.checkIns'),
                color: 'text-green-400',
              },
              {
                label: t('analytics.thisWeek'),
                value: stats?.weekly?.total_visits || 0,
                sub: `${stats?.weekly?.unique_visitors || 0} ${t('analytics.uniquePeople')}`,
                color: 'text-blue-400',
              },
              {
                label: t('analytics.thisMonth'),
                value: stats?.monthly?.total_visits || 0,
                sub: `${stats?.monthly?.unique_visitors || 0} ${t('analytics.uniquePeople')}`,
                color: 'text-purple-400',
              },
            ].map(item => (
              <div key={item.label} className="bg-dark-200/50 rounded-xl p-4 border border-gray-800/60 text-center">
                <p className={clsx('text-3xl font-bold', item.color)}>{item.value}</p>
                <p className="text-xs text-gray-400 mt-1">{item.sub}</p>
                <p className="text-[11px] text-gray-600 mt-0.5 uppercase tracking-wide">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">{t('analytics.insights')}</h2>
          <div className="space-y-3">
            {peakHoursData.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-gym-500/10 border border-gym-500/20 rounded-xl">
                <Clock className="w-4 h-4 text-gym-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-300">
                  {t('analytics.insightPeakHour', { hour: peakHoursData[0]?.hour })}
                </p>
              </div>
            )}
            {stats?.today?.total_visits > 0 && (
              <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <Users className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-300">
                  {t('analytics.insightToday', { n: stats.today.currently_present || 0 })}
                </p>
              </div>
            )}
            {stats?.weekly?.total_visits === 0 && (
              <div className="flex items-start gap-2 p-3 bg-gray-500/10 border border-gray-700 rounded-xl">
                <Activity className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400">{t('analytics.noDataYet')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Heatmap */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" />
            {t('dashboard.heatmap')}
          </h2>
          {heatmap && heatmapMonth && (() => {
            const months = heatmap.availableMonths?.length > 0 ? heatmap.availableMonths : [heatmapMonth];
            const locale = lang === 'am' ? 'am-ET' : 'en-US';
            return (
              <select
                value={heatmapMonth}
                onChange={e => handleHeatmapMonthChange(e.target.value)}
                disabled={heatmapLoading}
                className="bg-dark-200 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 focus:border-gym-500 focus:outline-none disabled:opacity-50 cursor-pointer min-w-[160px]"
              >
                {months.map(m => {
                  const [year, mon] = m.split('-');
                  const label = new Date(parseInt(year), parseInt(mon) - 1, 1)
                    .toLocaleDateString(locale, { month: 'long', year: 'numeric' });
                  return <option key={m} value={m}>{label}</option>;
                })}
              </select>
            );
          })()}
        </div>

        {heatmapLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gym-500" />
          </div>
        ) : !heatmap || heatmap.max === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-500">
            <Calendar className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm">{t('dashboard.noHeatmapData')}</p>
          </div>
        ) : (
          <AttendanceHeatmap matrix={heatmap.matrix} max={heatmap.max} />
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, sub, isText }) {
  const colors = {
    green:  { bg: 'bg-green-500/10',  text: 'text-green-400',  icon: 'bg-green-500/20' },
    blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   icon: 'bg-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: 'bg-purple-500/20' },
    amber:  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  icon: 'bg-amber-500/20' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={clsx('glass-card p-5 border border-gray-800/60 hover-lift transition-all duration-300')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">{title}</p>
          <p className={clsx('font-bold', isText ? 'text-2xl' : 'text-3xl', c.text)}>{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={clsx('p-3 rounded-xl', c.icon)}>
          <Icon className={clsx('w-6 h-6', c.text)} />
        </div>
      </div>
    </div>
  );
}

function DailyChart({ data, t }) {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
        <BarChart3 className="w-8 h-8 opacity-30" />
        {t('analytics.noData')}
      </div>
    );
  }

  const values = data.map(d => parseInt(d.visits) || 0);
  const maxVisits = Math.max(...values, 1);
  const totalVisits = values.reduce((a, b) => a + b, 0);
  const todayStr = new Date().toISOString().split('T')[0];

  // Chart dimensions
  const W = 420, H = 140, PAD_LEFT = 28, PAD_BOTTOM = 32, PAD_TOP = 20;
  const chartW = W - PAD_LEFT - 8;
  const chartH = H - PAD_BOTTOM - PAD_TOP;
  const colW = chartW / data.length;
  const barW = Math.min(colW * 0.55, 36);

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD_TOP + chartH * (1 - f),
    label: f === 0 ? '' : Math.round(f * maxVisits),
  }));

  return (
    <div className="space-y-3">
      {/* Mini summary row */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>{totalVisits} total check-ins this week</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gym-400 inline-block" />
          Today
          <span className="w-2 h-2 rounded-full bg-gym-600/60 inline-block ml-2" />
          Other days
        </span>
      </div>

      {/* SVG Chart */}
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto', overflow: 'visible' }}>
          <defs>
            <linearGradient id="barGradToday" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--gym-400-rgb))" stopOpacity="1" />
              <stop offset="100%" stopColor="rgb(var(--gym-600-rgb))" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="barGradOther" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--gym-500-rgb))" stopOpacity="0.55" />
              <stop offset="100%" stopColor="rgb(var(--gym-700-rgb))" stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--gym-300-rgb))" stopOpacity="1" />
              <stop offset="100%" stopColor="rgb(var(--gym-500-rgb))" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map(({ y, label }) => (
            <g key={y}>
              <line x1={PAD_LEFT} y1={y} x2={W - 8} y2={y}
                stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray={label ? '4 4' : '0'} />
              {label > 0 && (
                <text x={PAD_LEFT - 4} y={y + 3.5} textAnchor="end"
                  fill="#4b5563" fontSize="8" fontFamily="monospace">{label}</text>
              )}
            </g>
          ))}

          {/* Baseline */}
          <line x1={PAD_LEFT} y1={PAD_TOP + chartH} x2={W - 8} y2={PAD_TOP + chartH}
            stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

          {/* Bars */}
          {data.map((day, i) => {
            const visits = parseInt(day.visits) || 0;
            const dateStr = typeof day.date === 'string' ? day.date.slice(0, 10) : new Date(day.date).toISOString().slice(0, 10);
            const isToday = dateStr === todayStr;
            const isHovered = hovered === i;
            const barH = Math.max((visits / maxVisits) * chartH, visits > 0 ? 6 : 0);
            const cx = PAD_LEFT + colW * i + colW / 2;
            const barX = cx - barW / 2;
            const barY = PAD_TOP + chartH - barH;
            const weekday = new Date(dateStr + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' });
            const fill = isHovered ? 'url(#barGradHover)' : isToday ? 'url(#barGradToday)' : 'url(#barGradOther)';
            const r = Math.min(6, barW / 2);

            return (
              <g key={dateStr}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}>

                {/* Hover background column */}
                <rect x={cx - colW * 0.45} y={PAD_TOP} width={colW * 0.9} height={chartH}
                  fill={isHovered ? 'rgba(255,255,255,0.03)' : 'transparent'}
                  rx={6} />

                {/* Bar with rounded top */}
                {barH > 0 && (
                  <path
                    d={`M${barX + r},${barY} h${barW - r * 2} a${r},${r} 0 0 1 ${r},${r} v${barH - r} h-${barW} v-${barH - r} a${r},${r} 0 0 1 ${r},-${r}z`}
                    fill={fill}
                  />
                )}

                {/* Today dot indicator */}
                {isToday && (
                  <circle cx={cx} cy={PAD_TOP + chartH + 20} r={2.5}
                    fill="rgb(var(--gym-400-rgb))" />
                )}

                {/* Day label */}
                <text x={cx} y={PAD_TOP + chartH + 14} textAnchor="middle"
                  fill={isToday ? 'rgb(var(--gym-400-rgb))' : isHovered ? '#d1d5db' : '#6b7280'}
                  fontSize="10" fontWeight={isToday ? '700' : '400'}>
                  {weekday}
                </text>

                {/* Value label above bar */}
                {(visits > 0 || isHovered) && (
                  <text x={cx} y={barH > 0 ? barY - 5 : PAD_TOP + chartH - 5}
                    textAnchor="middle"
                    fill={isToday ? 'rgb(var(--gym-300-rgb))' : isHovered ? '#e5e7eb' : '#9ca3af'}
                    fontSize="9.5" fontWeight="600">
                    {visits}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hovered !== null && (() => {
          const day = data[hovered];
          const visits = parseInt(day.visits) || 0;
          const dateStr = typeof day.date === 'string' ? day.date.slice(0, 10) : new Date(day.date).toISOString().slice(0, 10);
          const isToday = dateStr === todayStr;
          const label = new Date(dateStr + 'T12:00:00').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
          const pct = totalVisits > 0 ? Math.round((visits / totalVisits) * 100) : 0;
          return (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none z-20
              bg-gray-900/95 border border-gray-700 rounded-xl px-3 py-2 shadow-2xl text-center whitespace-nowrap">
              <p className="text-white font-semibold text-sm">
                {visits} {visits === 1 ? 'visit' : 'visits'}
                {isToday && <span className="ml-1.5 text-[10px] text-gym-400 font-normal">Today</span>}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">{label}</p>
              {totalVisits > 0 && <p className="text-gray-600 text-[10px] mt-0.5">{pct}% of week</p>}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Heatmap helpers ──────────────────────────────────────────────────────────
function heatmapColor(v, max) {
  if (v === 0 || max === 0) return 'rgba(255,255,255,0.06)';
  const intensity = Math.min(v / max, 1);
  const hue  = Math.round(120 * (1 - intensity));
  const sat  = Math.round(72 + intensity * 15);
  const lit  = Math.round(52 - intensity * 10);
  const alpha = 0.22 + intensity * 0.70;
  return `hsla(${hue},${sat}%,${lit}%,${alpha})`;
}

function formatHour(h) {
  if (h === 0)  return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function AttendanceHeatmap({ matrix, max }) {
  const { t } = useLanguage();
  const [tooltip, setTooltip] = useState(null);

  const dayLabels = [
    t('day.sun'), t('day.mon'), t('day.tue'), t('day.wed'),
    t('day.thu'), t('day.fri'), t('day.sat'),
  ];

  const total      = matrix.flat().reduce((s, v) => s + v, 0);
  const dayTotals  = matrix.map(row => row.reduce((s, v) => s + v, 0));
  const hourTotals = Array.from({ length: 24 }, (_, h) => matrix.reduce((s, row) => s + row[h], 0));
  const peakDayIdx  = dayTotals.indexOf(Math.max(...dayTotals));
  const peakHourIdx = hourTotals.indexOf(Math.max(...hourTotals));

  const showTooltip = (e, d, h, v) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTooltip({ x: r.left + r.width / 2, y: r.top, d, h, v });
  };
  const hideTooltip = () => setTooltip(null);

  const markedHours = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { value: total,                                      label: t('dashboard.heatmapTotal'),      sub: t('dashboard.heatmapCheckIns'), color: 'text-gym-400' },
          { value: total > 0 ? dayLabels[peakDayIdx]  : '—',  label: t('dashboard.heatmapBusiestDay'), sub: null,                           color: 'text-yellow-400' },
          { value: total > 0 ? formatHour(peakHourIdx): '—',  label: t('dashboard.heatmapPeakHour'),   sub: null,                           color: 'text-orange-400' },
        ].map(({ value, label, sub, color }) => (
          <div key={label} className="bg-dark-300/60 border border-gray-800/60 rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${color} leading-tight`}>{value}</p>
            {sub && <p className="text-[10px] text-gray-500">{sub}</p>}
            <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex pl-10 mb-1">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="flex-1 min-w-[20px] text-center text-[9px] text-gray-500 font-medium">
                {markedHours.includes(h) ? formatHour(h) : ''}
              </div>
            ))}
          </div>

          {matrix.map((row, d) => {
            const isPeakDay = total > 0 && d === peakDayIdx;
            return (
              <div key={d} className="flex items-center mb-[3px] group">
                <div className={`w-10 text-[11px] pr-2 shrink-0 flex items-center gap-1 ${isPeakDay ? 'text-yellow-400 font-semibold' : 'text-gray-500 font-medium'}`}>
                  {isPeakDay && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />}
                  {dayLabels[d]}
                </div>
                {row.map((v, h) => {
                  const isPeakHour = total > 0 && h === peakHourIdx;
                  return (
                    <div
                      key={h}
                      onMouseEnter={e => showTooltip(e, d, h, v)}
                      onMouseLeave={hideTooltip}
                      className={`flex-1 min-w-[20px] aspect-square mx-[1.5px] rounded-[4px] cursor-pointer
                        transition-all duration-150 hover:scale-125 hover:z-10 hover:ring-1 hover:ring-white/20
                        ${isPeakHour ? 'ring-1 ring-white/10' : ''}`}
                      style={{ background: heatmapColor(v, max) }}
                    />
                  );
                })}
              </div>
            );
          })}

          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-[10px] text-gray-500">{t('dashboard.heatmapLow')}</span>
            <div className="w-28 h-2.5 rounded-full" style={{
              background: 'linear-gradient(to right, ' + [
                'hsla(120,75%,50%,0.25)', 'hsla(105,77%,48%,0.45)', 'hsla(80,80%,47%,0.60)',
                'hsla(60,82%,47%,0.70)',  'hsla(35,84%,46%,0.80)',  'hsla(10,86%,46%,0.88)',
                'hsla(0,87%,44%,0.92)',
              ].join(', ') + ')',
            }} />
            <span className="text-[10px] text-gray-500">{t('dashboard.heatmapHigh')}</span>
          </div>
        </div>
      </div>

      {tooltip && (
        <div className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 shadow-2xl text-center whitespace-nowrap">
            <p className="text-white font-semibold text-sm">
              {tooltip.v > 0 ? `${tooltip.v} ${t('dashboard.heatmapCheckIns')}` : t('dashboard.heatmapNone')}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              {dayLabels[tooltip.d]} · {formatHour(tooltip.h)}–{formatHour((tooltip.h + 1) % 24)}
            </p>
          </div>
          <div className="w-2 h-2 bg-gray-900 border-b border-r border-gray-700 rotate-45 mx-auto -mt-[5px]" />
        </div>
      )}
    </div>
  );
}
