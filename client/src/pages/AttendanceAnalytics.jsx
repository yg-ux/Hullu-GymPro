import { useState, useEffect } from 'react';
import { api, formatDate } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { StatCardSkeleton } from '../components/Skeleton';
import {
  Activity, Clock, Users, TrendingUp, BarChart3, Calendar, LogIn
} from 'lucide-react';
import clsx from 'clsx';

export default function AttendanceAnalytics() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
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

  const dayNames = [t('day.sun'), t('day.mon'), t('day.tue'), t('day.wed'), t('day.thu'), t('day.fri'), t('day.sat')];

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
          value={peakHoursData[0]?.hour?.replace(':00', '') || '—'}
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
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
        {t('analytics.noData')}
      </div>
    );
  }

  const maxVisits = Math.max(...data.map(d => parseInt(d.visits) || 0), 1);
  const chartH = 120;

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${data.length * 60} ${chartH + 30}`} className="w-full" style={{ height: 'auto' }}>
        {data.map((day, i) => {
          const visits = parseInt(day.visits) || 0;
          const barH = Math.max((visits / maxVisits) * chartH, visits > 0 ? 4 : 0);
          const barY = chartH - barH;
          const cx = i * 60 + 30;
          const barW = 32;
          const isToday = day.date === new Date().toISOString().split('T')[0];
          return (
            <g key={day.date}>
              <rect x={cx - barW/2} y={barY} width={barW} height={barH}
                rx={4} fill={isToday ? 'rgb(var(--gym-400-rgb))' : 'rgb(var(--gym-500-rgb) / 0.5)'} />
              <text x={cx} y={chartH + 16} textAnchor="middle" fill="#6b7280" fontSize="10">
                {new Date(day.date + 'T12:00:00Z').toLocaleDateString('en', { weekday: 'short' })}
              </text>
              {visits > 0 && (
                <text x={cx} y={barY - 4} textAnchor="middle" fill="#9ca3af" fontSize="9">
                  {visits}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
