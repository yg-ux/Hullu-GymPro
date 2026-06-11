import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatDate, formatCurrency, getPaymentMethodLabel } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Users,
  PieChart,
  ArrowRight,
  ChevronRight,
  Clock,
  RefreshCw,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  Building2,
  Smartphone,
  Banknote,
  Sparkles,
  BarChart3
} from 'lucide-react';
import clsx from 'clsx';

// Animated Counter Hook
function useAnimatedCounter(endValue, duration = 1000, delay = 0) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const timeout = setTimeout(() => {
      let startTime = null;
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(easeOutQuart * endValue));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeout);
  }, [isVisible, endValue, duration, delay]);

  return { count, ref };
}

// Format number with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Summary Card Component
function SummaryCard({ title, value, icon: Icon, color, trend, trendUp, delay, animated, isCurrency }) {
  const { count, ref } = useAnimatedCounter(typeof value === 'number' ? value : 0, 1500, delay);

  const colors = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', icon: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', icon: 'from-purple-500 to-purple-600', glow: 'shadow-purple-500/20' },
    gold: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', icon: 'from-amber-500 to-amber-600', glow: 'shadow-amber-500/20' },
  };

  const c = colors[color] || colors.emerald;

  return (
    <div
      ref={ref}
      className={clsx(
        "glass-card p-5 border transition-all duration-500 hover-lift",
        c.border,
        animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold text-white">
            {isCurrency ? formatCurrency(count) : formatNumber(count)}
          </p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trendUp !== undefined && (
                trendUp ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                )
              )}
              <span className={clsx("text-xs", trendUp ? "text-emerald-400" : "text-red-400")}>{trend}</span>
            </div>
          )}
        </div>
        <div className={clsx("p-3 rounded-xl bg-gradient-to-br shadow-lg", c.icon, c.glow)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

// Label helpers for all periods — locale-aware via Intl.DateTimeFormat
function parseLabel(str, period, locale = 'default') {
  if (!str) return { short: '', long: str || '' };

  if (period === 'monthly') {
    // "2026-06" → localised month abbr / full month + year
    const parts = str.split('-');
    if (parts.length >= 2) {
      const idx = parseInt(parts[1], 10) - 1;
      if (idx >= 0 && idx < 12) {
        const d = new Date(parseInt(parts[0], 10), idx, 1);
        return {
          short: d.toLocaleDateString(locale, { month: 'short' }),
          long:  d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
        };
      }
    }
  }

  if (period === 'daily') {
    // "2026-06-07" → localised short date
    const parts = str.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(d)) {
        return {
          short: d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
          long:  d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' }),
        };
      }
    }
  }

  if (period === 'weekly') {
    // "2026-W22" → "Wk 22" / "Week 22, 2026"
    const match = str.match(/^(\d{4})-W(\d+)$/);
    if (match) return { short: `Wk ${parseInt(match[2], 10)}`, long: `Week ${parseInt(match[2], 10)}, ${match[1]}` };
  }

  if (period === 'yearly') {
    return { short: str, long: str };
  }

  return { short: str, long: str };
}

// Revenue Chart Component
function RevenueChart({ data, period, onPeriodChange, animated, stats }) {
  const { t, lang } = useLanguage();
  const locale = lang === 'am' ? 'am-ET' : 'en-US';
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const periods = [
    { key: 'daily', label: t('revenue.daily') },
    { key: 'weekly', label: t('revenue.weekly') },
    { key: 'monthly', label: t('revenue.monthly') },
    { key: 'yearly', label: t('revenue.yearly') },
  ];

  const VW = 900, VH = 280;
  const pad = { top: 20, right: 20, bottom: 52, left: 64 };
  const innerW = VW - pad.left - pad.right;
  const innerH = VH - pad.top - pad.bottom;
  const GRID = 4;

  const maxVal = data.length > 0 ? Math.max(...data.map(d => d.total), 1) : 1;
  const slotW = data.length > 0 ? innerW / data.length : innerW;
  const barW = Math.min(slotW * 0.55, 42);

  const xOf = (i) => pad.left + slotW * i + slotW / 2;
  const baseY = pad.top + innerH;

  // Rounded-top-only bar path: flat bottom, rounded top corners
  const barPath = (cx, barY, w, h, r) => {
    if (h <= 0) return '';
    const x = cx - w / 2;
    const cr = Math.min(r, w / 2, h);
    return `M${x},${barY + h} L${x},${barY + cr} Q${x},${barY} ${x + cr},${barY} L${x + w - cr},${barY} Q${x + w},${barY} ${x + w},${barY + cr} L${x + w},${barY + h} Z`;
  };

  const fmtY = (v) => {
    if (v === 0) return '0';
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return Math.round(v).toString();
  };

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-white flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          {t('revenue.revenueOverTime')}
        </h2>
        <div className="flex items-center bg-dark-300/60 rounded-xl p-1 gap-0.5">
          {periods.map((p) => {
            const periodDataMap = {
              daily: stats?.daily_trend,
              weekly: stats?.weekly_trend,
              monthly: stats?.monthly_trend,
              yearly: stats?.yearly_trend,
            };
            const count = periodDataMap[p.key]?.length ?? null;
            const hasData = count !== null && count > 0;
            return (
              <button
                key={p.key}
                onClick={() => onPeriodChange(p.key)}
                className={clsx(
                  "flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200",
                  period === p.key
                    ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                {p.label}
                {count !== null && (
                  <span className={clsx(
                    "text-[10px] px-1 rounded-full font-medium",
                    period === p.key
                      ? "bg-emerald-500/30 text-emerald-300"
                      : hasData
                        ? "bg-gray-700 text-gray-400"
                        : "bg-gray-800 text-gray-600"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {data.length > 0 ? (
        <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#34d399" stopOpacity="1" />
              <stop offset="60%"  stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#065f46" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="barGradHov" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#6ee7b7" stopOpacity="1" />
              <stop offset="60%"  stopColor="#34d399" stopOpacity="1" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
            </linearGradient>
            <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Grid lines + Y labels */}
          {Array.from({ length: GRID + 1 }, (_, i) => {
            const frac = i / GRID;
            const val  = maxVal * (1 - frac);
            const y    = pad.top + innerH * frac;
            return (
              <g key={i}>
                <line
                  x1={pad.left} y1={y} x2={VW - pad.right} y2={y}
                  stroke={i === GRID ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}
                  strokeWidth={i === GRID ? 1.5 : 1}
                  strokeDasharray={i === GRID ? '' : '4 6'}
                />
                <text x={pad.left - 8} y={y + 4} textAnchor="end"
                  fill="#4b5563" fontSize="11" fontFamily="ui-sans-serif, system-ui, sans-serif">
                  {fmtY(val)}
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
            const isHov = hoveredIdx === i;
            const { short, long } = parseLabel(item.label, period, locale);

            // Tooltip — always render above the bar with enough room
            const TW = 130, TH = 46;
            const tipX = Math.min(Math.max(cx - TW / 2, pad.left), VW - pad.right - TW);
            const tipY = Math.max(barY - TH - 14, pad.top);
            const caretX = Math.min(Math.max(cx, tipX + 14), tipX + TW - 14);

            return (
              <g key={item.label || i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}>

                {/* Hit zone */}
                <rect x={cx - slotW / 2} y={pad.top} width={slotW} height={innerH} fill="transparent" />

                {/* Hover background lane */}
                {isHov && (
                  <rect x={cx - barW / 2 - 5} y={pad.top} width={barW + 10} height={innerH}
                    rx={8} fill="rgba(52,211,153,0.06)" />
                )}

                {/* Main bar — rounded top only */}
                {barH > 0 && (
                  <path
                    d={barPath(cx, barY, barW, barH, 6)}
                    fill={isHov ? 'url(#barGradHov)' : 'url(#barGrad)'}
                    opacity={isHov ? 1 : 0.82}
                    filter={isHov ? 'url(#glow)' : undefined}
                    style={{
                      transition: `opacity 0.2s`,
                    }}
                  />
                )}

                {/* Thin highlight line at top edge */}
                {barH > 8 && (
                  <line
                    x1={cx - barW / 2 + 4} y1={barY + 1.5}
                    x2={cx + barW / 2 - 4} y2={barY + 1.5}
                    stroke={isHov ? '#a7f3d0' : '#6ee7b7'}
                    strokeWidth="2" strokeLinecap="round"
                    opacity={isHov ? 0.9 : 0.45}
                  />
                )}

                {/* X-axis label */}
                <text x={cx} y={baseY + 18} textAnchor="middle"
                  fill={isHov ? '#9ca3af' : '#4b5563'}
                  fontSize={data.length > 20 ? 8 : data.length > 12 ? 9 : 10}
                  fontWeight={isHov ? '600' : '400'}
                  fontFamily="ui-sans-serif, system-ui, sans-serif">
                  {short}
                </text>

                {/* Tooltip */}
                {isHov && (
                  <g>
                    {/* Shadow */}
                    <rect x={tipX + 3} y={tipY + 3} width={TW} height={TH} rx={9} fill="rgba(0,0,0,0.4)" />
                    {/* Box */}
                    <rect x={tipX} y={tipY} width={TW} height={TH} rx={9}
                      fill="#0f172a" stroke="#34d399" strokeWidth="1.2" strokeOpacity="0.5" />
                    {/* Dot */}
                    <circle cx={tipX + 14} cy={tipY + 16} r={4} fill="#34d399" />
                    {/* Period label */}
                    <text x={tipX + 25} y={tipY + 20} fill="#6ee7b7" fontSize="9" fontWeight="500"
                      fontFamily="ui-sans-serif, system-ui, sans-serif">
                      {long}
                    </text>
                    {/* Amount — larger, white */}
                    <text x={tipX + 14} y={tipY + 37} fill="white" fontSize="12" fontWeight="800"
                      fontFamily="ui-sans-serif, system-ui, sans-serif">
                      ETB {item.total.toLocaleString()}
                    </text>
                    {/* Caret */}
                    <path d={`M${caretX - 6},${tipY + TH} L${caretX},${tipY + TH + 7} L${caretX + 6},${tipY + TH}`}
                      fill="#0f172a" stroke="#34d399" strokeOpacity="0.5" strokeWidth="1" strokeLinejoin="round" />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      ) : (
        <div className="h-52 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 text-gray-700" />
            <p className="text-sm font-medium text-gray-400">{t('revenue.noDataForPeriod')}</p>
            <p className="text-xs text-gray-600 mt-1">
              {period === 'daily' && t('revenue.noDataDaily')}
              {period === 'weekly' && t('revenue.noDataWeekly')}
              {period === 'monthly' && t('revenue.noDataMonthly')}
              {period === 'yearly' && t('revenue.noDataYearly')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Payment Methods Breakdown
function PaymentMethodsChart({ data, animated }) {
  const { t } = useLanguage();
  const colors = [
    { icon: Building2, gradient: 'from-blue-500 to-cyan-500', text: 'text-blue-400' },
    { icon: CreditCard, gradient: 'from-purple-500 to-pink-500', text: 'text-purple-400' },
    { icon: Banknote, gradient: 'from-green-500 to-emerald-500', text: 'text-green-400' },
    { icon: Smartphone, gradient: 'from-amber-500 to-orange-500', text: 'text-amber-400' },
  ];

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-semibold text-white flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <PieChart className="w-6 h-6 text-white" />
        </div>
        {t('revenue.paymentMethods')}
      </h2>

      {data.length > 0 ? (
        <div className="space-y-4">
          {data.map((item, index) => {
            const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const colorIndex = index % colors.length;
            const c = colors[colorIndex];

            return (
              <div key={item.payment_method} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={clsx("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center", c.gradient)}>
                      <c.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-gray-300">{getPaymentMethodLabel(item.payment_method)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-medium">{item.count}</span>
                    <span className="text-gray-400 text-sm ml-2">{formatCurrency(item.total)}</span>
                  </div>
                </div>
                <div className="h-3 bg-dark-300 rounded-full overflow-hidden">
                  <div
                    className={clsx("h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r", c.gradient)}
                    style={{
                      width: animated ? `${percentage}%` : '0%',
                      transitionDelay: `${index * 200}ms`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <PieChart className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p>{t('revenue.noPaymentData')}</p>
        </div>
      )}
    </div>
  );
}

// Top Customers Component
function TopCustomers({ customers, animated }) {
  const { t } = useLanguage();
  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-semibold text-white flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Users className="w-6 h-6 text-white" />
        </div>
        {t('revenue.topCustomers')}
      </h2>

      {customers.length > 0 ? (
        <div className="space-y-4">
          {customers.map((customer, index) => (
            <Link
              key={customer.id}
              to={`/customers/${customer.id}`}
              className="flex items-center gap-4 p-4 bg-dark-200/50 rounded-xl hover:bg-dark-200 transition-all animate-slide-up hover-lift"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-lg font-bold shadow-lg shadow-amber-500/30">
                {customer.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{customer.name}</p>
                <p className="text-xs text-gray-400">{t('revenue.paymentsLabel', { count: customer.payment_count || 0 })}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-amber-400">{formatCurrency(customer.total_spent)}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p>{t('revenue.noCustomerData')}</p>
        </div>
      )}
    </div>
  );
}

// Recent Transactions Component
function RecentTransactions({ transactions, animated }) {
  const { t } = useLanguage();
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          {t('revenue.recentTransactions')}
        </h2>
        <Link to="/customers" className="text-sm text-gym-400 hover:text-gym-300 flex items-center gap-1 transition-colors">
          {t('revenue.viewAll')} <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {transactions.length > 0 ? (
        <div className="space-y-3">
          {transactions.map((transaction, index) => (
            <Link
              key={transaction.id}
              to={`/customers/${transaction.customer_id}`}
              className="flex items-center justify-between p-4 bg-dark-200/50 rounded-xl hover:bg-dark-200 transition-all animate-slide-up hover-lift"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{transaction.customer_name}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(transaction.payment_date)} • {getPaymentMethodLabel(transaction.payment_method)}
                  </p>
                </div>
              </div>
              <span className="text-lg font-bold text-green-400">+{formatCurrency(transaction.amount)}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p>{t('revenue.noRecentTx')}</p>
        </div>
      )}
    </div>
  );
}

// Forecast Card Component
function ForecastCard({ forecast, animated }) {
  const { t } = useLanguage();
  return (
    <div className="glass-card p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {t('revenue.revenueForecast')}
          </h2>
          <div className="text-xs text-gray-400">{t('revenue.next30Days')}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-dark-200/50 rounded-xl border border-gray-800/50">
            <p className="text-sm text-gray-400 mb-1">{t('revenue.predictedRevenue')}</p>
            <p className="text-2xl font-bold text-purple-400">
              {forecast?.predicted_revenue ? formatCurrency(forecast.predicted_revenue) : '--'}
            </p>
          </div>
          <div className="p-4 bg-dark-200/50 rounded-xl border border-gray-800/50">
            <p className="text-sm text-gray-400 mb-1">{t('revenue.growthRate')}</p>
            <div className="flex items-center gap-2">
              {forecast?.growth_rate >= 0 ? (
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-red-400" />
              )}
              <span className={clsx(
                "text-2xl font-bold",
                forecast?.growth_rate >= 0 ? "text-emerald-400" : "text-red-400"
              )}>
                {forecast?.growth_rate !== undefined ? `${forecast.growth_rate > 0 ? '+' : ''}${forecast.growth_rate.toFixed(1)}%` : '--'}
              </span>
            </div>
          </div>
        </div>

        {forecast?.projected_payments !== undefined && (
          <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{t('revenue.projectedPayments')}</span>
              <span className="text-lg font-bold text-white">{forecast.projected_payments}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-dark-200 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-600" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">{description}</p>
    </div>
  );
}

// ── Revenue Goal Widget ───────────────────────────────────────────────────
function RevenueGoalWidget({ thisMonth }) {
  const { t } = useLanguage();
  const [goal, setGoal]           = useState(null);   // number | null
  const [editing, setEditing]     = useState(false);
  const [input, setInput]         = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    api.get('/auth/gym-settings').then(data => {
      const v = parseFloat(data?.revenue_goal);
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
    } catch { /* noop */ } finally {
      setSaving(false);
    }
  };

  const pct = goal ? Math.min(Math.round((thisMonth / goal) * 100), 100) : 0;
  const achieved = goal && thisMonth >= goal;
  const barColor = achieved
    ? 'from-emerald-400 to-emerald-500'
    : pct >= 60
      ? 'from-gym-400 to-gym-500'
      : pct >= 30
        ? 'from-amber-400 to-amber-500'
        : 'from-red-400 to-red-500';

  return (
    <div className="glass-card p-5 border border-gray-800/60">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gym-500 to-gym-700 flex items-center justify-center shadow-md shadow-gym-500/30">
            <Target className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">{t('revenue.goalTitle')}</span>
        </div>
        {!editing && (
          <button
            onClick={() => { setInput(goal ? String(goal) : ''); setEditing(true); }}
            className="text-xs text-gym-400 hover:text-gym-300 transition-colors px-2 py-1 rounded-lg hover:bg-gym-500/10"
          >
            {goal ? t('revenue.goalEdit') : t('revenue.goalSet')}
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('revenue.goalPlaceholder')}
            className="flex-1 bg-dark-300 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gym-500/60"
            autoFocus
          />
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-2 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-dark-300 transition-colors"
          >
            {t('revenue.goalCancel')}
          </button>
          <button
            onClick={saveGoal}
            disabled={saving}
            className="px-3 py-2 text-xs font-medium bg-gym-500 hover:bg-gym-400 text-white rounded-xl transition-colors disabled:opacity-60"
          >
            {saving ? '...' : t('revenue.goalSave')}
          </button>
        </div>
      ) : goal ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">{formatCurrency(thisMonth)}</span>
            <span className={achieved ? 'text-emerald-400 font-semibold' : 'text-gray-400'}>
              {achieved ? t('revenue.goalAchieved') : t('revenue.goalProgress', { pct })}
            </span>
            <span className="text-gray-400">{formatCurrency(goal)}</span>
          </div>
          <div className="h-3 bg-dark-300 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-right">
            {t('revenue.goalAmt', { current: formatCurrency(thisMonth), goal: formatCurrency(goal) })}
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">
          {t('revenue.goalPlaceholder')}
        </p>
      )}
    </div>
  );
}

export default function Revenue() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('monthly');
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (stats) {
      setTimeout(() => setAnimated(true), 100);
    }
  }, [stats]);

  useEffect(() => {
    // Update chart data based on selected period
    if (stats) {
      let data = [];
      switch (chartPeriod) {
        case 'daily':
          data = stats.daily_trend || [];
          break;
        case 'weekly':
          data = stats.weekly_trend || [];
          break;
        case 'monthly':
          data = stats.monthly_trend || [];
          break;
        case 'yearly':
          data = stats.yearly_trend || [];
          break;
        default:
          data = stats.monthly_trend || [];
      }
      setChartData(data);
    }
  }, [chartPeriod, stats]);

  const loadStats = async () => {
    try {
      const data = await api.get('/stats/revenue');
      setStats(data || {
        total_revenue: 0,
        this_month: 0,
        this_week: 0,
        today: 0,
        payment_methods: [],
        top_customers: [],
        recent_transactions: [],
        monthly_trend: [],
        forecast: {}
      });
    } catch (error) {
      console.error('Failed to load revenue stats:', error);
      setStats({
        total_revenue: 0,
        this_month: 0,
        this_week: 0,
        today: 0,
        payment_methods: [],
        top_customers: [],
        recent_transactions: [],
        monthly_trend: [],
        forecast: {}
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-gym-600/30 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-gym-500 border-t-transparent animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            {t('revenue.title')}
            <span className="gradient-text">{t('revenue.overview')}</span>
          </h1>
          <p className="text-gray-400 mt-1">{t('revenue.subtitle')}</p>
        </div>
        <button
          onClick={loadStats}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {t('revenue.refreshData')}
        </button>
      </div>

      {/* Revenue Goal */}
      <RevenueGoalWidget thisMonth={stats?.this_month || 0} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <SummaryCard
          title={t('revenue.totalRevenue')}
          value={stats?.total_revenue || 0}
          icon={Wallet}
          color="emerald"
          trend={t('revenue.allTimeLabel')}
          delay={0}
          animated={animated}
          isCurrency
        />
        <SummaryCard
          title={t('revenue.thisMonth')}
          value={stats?.this_month || 0}
          icon={Calendar}
          color="blue"
          trend={t('revenue.vsLastMonth')}
          trendUp={true}
          delay={100}
          animated={animated}
          isCurrency
        />
        <SummaryCard
          title={t('revenue.thisWeek')}
          value={stats?.this_week || 0}
          icon={TrendingUp}
          color="purple"
          trend={t('revenue.onTrack')}
          trendUp={true}
          delay={200}
          animated={animated}
          isCurrency
        />
        <SummaryCard
          title={t('revenue.today')}
          value={stats?.today || 0}
          icon={DollarSign}
          color="gold"
          trend={stats?.today > 1000 ? t('revenue.goodDay') : t('revenue.belowAverage')}
          trendUp={stats?.today > 1000}
          delay={300}
          animated={animated}
          isCurrency
        />
      </div>

      {/* Revenue Chart */}
      <RevenueChart
        data={chartData}
        period={chartPeriod}
        onPeriodChange={setChartPeriod}
        animated={animated}
        stats={stats}
      />

      {/* Payment Methods & Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentMethodsChart
          data={stats?.payment_methods || []}
          animated={animated}
        />
        <TopCustomers
          customers={stats?.top_customers || []}
          animated={animated}
        />
      </div>

      {/* Recent Transactions & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions
          transactions={stats?.recent_transactions || []}
          animated={animated}
        />
        <ForecastCard
          forecast={stats?.forecast || {}}
          animated={animated}
        />
      </div>
    </div>
  );
}