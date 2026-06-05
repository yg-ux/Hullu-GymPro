import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, formatDate, formatCurrency } from '../utils/api';
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
function SummaryCard({ title, value, icon: Icon, color, trend, trendUp, delay, animated }) {
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
            {title.includes('Revenue') || title.includes('Amount') || title.includes('Total')
              ? formatCurrency(count)
              : formatNumber(count)}
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

// Revenue Chart Component
function RevenueChart({ data, period, onPeriodChange, animated }) {
  const periods = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'yearly', label: 'Yearly' },
  ];

  // Simple bar chart implementation
  const maxValue = data.length > 0 ? Math.max(...data.map(d => d.total)) : 0;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          Revenue Over Time
        </h2>
        <div className="flex items-center gap-2">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => onPeriodChange(p.key)}
              className={clsx(
                "px-3 py-1.5 text-sm rounded-lg transition-all duration-300",
                period === p.key
                  ? "bg-gym-500/30 text-gym-400 border border-gym-500/50"
                  : "text-gray-400 hover:text-white hover:bg-dark-100"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {data.length > 0 ? (
        <div className="h-64 flex items-end gap-2">
          {data.map((item, index) => {
            const height = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
            const isCurrent = index === data.length - 1;

            return (
              <div
                key={item.label || index}
                className="flex-1 flex flex-col items-center gap-2 group"
              >
                <div className="w-full flex flex-col items-center justify-end h-44">
                  <div
                    className={clsx(
                      "w-full rounded-t-lg transition-all duration-1000 ease-out cursor-pointer relative",
                      isCurrent
                        ? "bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/40"
                        : "bg-gradient-to-t from-gray-600 to-gray-500 group-hover:from-gray-500 group-hover:to-gray-400"
                    )}
                    style={{
                      height: animated ? `${Math.max(height, 5)}%` : '0%',
                      transitionDelay: `${index * 100}ms`
                    }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity glass-card px-3 py-2 shadow-xl whitespace-nowrap z-10">
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="text-sm font-bold text-white">{formatCurrency(item.total)}</p>
                      {item.count && <p className="text-xs text-gray-400">{item.count} payments</p>}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{item.label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p>No revenue data available</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Payment Methods Breakdown
function PaymentMethodsChart({ data, animated }) {
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
        Payment Methods
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
                    <span className="text-gray-300 capitalize">{item.payment_method?.replace('_', ' ') || 'Unknown'}</span>
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
          <p>No payment data available</p>
        </div>
      )}
    </div>
  );
}

// Top Customers Component
function TopCustomers({ customers, animated }) {
  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-semibold text-white flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Users className="w-6 h-6 text-white" />
        </div>
        Top Customers
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
                <p className="text-xs text-gray-400">{customer.payment_count || 0} payments</p>
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
          <p>No customer data available</p>
        </div>
      )}
    </div>
  );
}

// Recent Transactions Component
function RecentTransactions({ transactions, animated }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          Recent Transactions
        </h2>
        <Link to="/customers" className="text-sm text-gym-400 hover:text-gym-300 flex items-center gap-1 transition-colors">
          View all <ChevronRight className="w-4 h-4" />
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
                    {formatDate(transaction.payment_date)} • {transaction.payment_method?.replace('_', ' ')}
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
          <p>No recent transactions</p>
        </div>
      )}
    </div>
  );
}

// Forecast Card Component
function ForecastCard({ forecast, animated }) {
  return (
    <div className="glass-card p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            Revenue Forecast
          </h2>
          <div className="text-xs text-gray-400">Next 30 days</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-dark-200/50 rounded-xl border border-gray-800/50">
            <p className="text-sm text-gray-400 mb-1">Predicted Revenue</p>
            <p className="text-2xl font-bold text-purple-400">
              {forecast?.predicted_revenue ? formatCurrency(forecast.predicted_revenue) : '--'}
            </p>
          </div>
          <div className="p-4 bg-dark-200/50 rounded-xl border border-gray-800/50">
            <p className="text-sm text-gray-400 mb-1">Growth Rate</p>
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
              <span className="text-sm text-gray-300">Projected Payments</span>
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

export default function Revenue() {
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
      setStats(data);
    } catch (error) {
      console.error('Failed to load revenue stats:', error);
      // Use mock data for demo
      setStats({
        total_revenue: 245000,
        this_month: 42500,
        this_week: 8750,
        today: 1250,
        payment_methods: [
          { payment_method: 'cash', count: 45, total: 95000 },
          { payment_method: 'card', count: 32, total: 85000 },
          { payment_method: 'mobile', count: 28, total: 65000 },
        ],
        top_customers: [
          { id: 1, name: 'Abebe Kebede', total_spent: 12500, payment_count: 8 },
          { id: 2, name: 'Tigist Haile', total_spent: 9800, payment_count: 6 },
          { id: 3, name: 'John Smith', total_spent: 7500, payment_count: 5 },
          { id: 4, name: 'Aster Demissie', total_spent: 6200, payment_count: 4 },
          { id: 5, name: 'Mohammed Ali', total_spent: 5800, payment_count: 4 },
        ],
        recent_transactions: [
          { id: 1, customer_id: 1, customer_name: 'Abebe Kebede', amount: 1500, payment_date: new Date().toISOString(), payment_method: 'cash' },
          { id: 2, customer_id: 2, customer_name: 'Tigist Haile', amount: 2000, payment_date: new Date(Date.now() - 86400000).toISOString(), payment_method: 'card' },
          { id: 3, customer_id: 3, customer_name: 'John Smith', amount: 1800, payment_date: new Date(Date.now() - 172800000).toISOString(), payment_method: 'mobile' },
          { id: 4, customer_id: 4, customer_name: 'Aster Demissie', amount: 1500, payment_date: new Date(Date.now() - 259200000).toISOString(), payment_method: 'cash' },
          { id: 5, customer_id: 5, customer_name: 'Mohammed Ali', amount: 2000, payment_date: new Date(Date.now() - 345600000).toISOString(), payment_method: 'card' },
        ],
        monthly_trend: [
          { month: '2025-07', label: 'Jul', total: 18500, count: 12 },
          { month: '2025-08', label: 'Aug', total: 21000, count: 14 },
          { month: '2025-09', label: 'Sep', total: 19800, count: 13 },
          { month: '2025-10', label: 'Oct', total: 24500, count: 16 },
          { month: '2025-11', label: 'Nov', total: 23200, count: 15 },
          { month: '2025-12', label: 'Dec', total: 28500, count: 18 },
          { month: '2026-01', label: 'Jan', total: 26800, count: 17 },
          { month: '2026-02', label: 'Feb', total: 31200, count: 20 },
          { month: '2026-03', label: 'Mar', total: 29500, count: 19 },
          { month: '2026-04', label: 'Apr', total: 35800, count: 22 },
          { month: '2026-05', label: 'May', total: 42500, count: 25 },
        ],
        forecast: {
          predicted_revenue: 46500,
          growth_rate: 8.5,
          projected_payments: 28,
        },
        trends: {
          daily: [
            { label: 'Mon', total: 1200 },
            { label: 'Tue', total: 1800 },
            { label: 'Wed', total: 1500 },
            { label: 'Thu', total: 2200 },
            { label: 'Fri', total: 2800 },
            { label: 'Sat', total: 3200 },
            { label: 'Sun', total: 2400 },
          ],
          weekly: [
            { label: 'Week 1', total: 8500 },
            { label: 'Week 2', total: 9200 },
            { label: 'Week 3', total: 7800 },
            { label: 'Week 4', total: 10200 },
          ],
          yearly: [
            { label: '2024', total: 185000 },
            { label: '2025', total: 245000 },
            { label: '2026', total: 165000 },
          ],
        },
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
            Revenue Analytics
            <span className="gradient-text">Overview</span>
          </h1>
          <p className="text-gray-400 mt-1">Track your gym's financial performance and growth.</p>
        </div>
        <button
          onClick={loadStats}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <SummaryCard
          title="Total Revenue"
          value={stats?.total_revenue || 0}
          icon={Wallet}
          color="emerald"
          trend="All time"
          delay={0}
          animated={animated}
        />
        <SummaryCard
          title="This Month"
          value={stats?.this_month || 0}
          icon={Calendar}
          color="blue"
          trend={`+12.5% vs last month`}
          trendUp={true}
          delay={100}
          animated={animated}
        />
        <SummaryCard
          title="This Week"
          value={stats?.this_week || 0}
          icon={TrendingUp}
          color="purple"
          trend="On track"
          trendUp={true}
          delay={200}
          animated={animated}
        />
        <SummaryCard
          title="Today"
          value={stats?.today || 0}
          icon={DollarSign}
          color="gold"
          trend={stats?.today > 1000 ? "Good day!" : "Below average"}
          trendUp={stats?.today > 1000}
          delay={300}
          animated={animated}
        />
      </div>

      {/* Revenue Chart */}
      <RevenueChart
        data={chartData}
        period={chartPeriod}
        onPeriodChange={setChartPeriod}
        animated={animated}
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