import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDate, formatCurrency, getMembershipLabel, getPaymentMethodLabel } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  CreditCard,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Filter,
  ChevronDown,
  Lock,
  Crown,
  ArrowUpRight,
  Check,
  X,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import PageHint from '../components/PageHint';

export default function Reports() {
  return <ReportsContent />;
}

function ReportsContent() {
  const navigate = useNavigate();
  const { gym } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState('this_month');
  const [reportType, setReportType] = useState('summary');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/stats/reports?range=${dateRange}`);
      setReportData(data);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async (type) => {
    setExporting(true);
    try {
      const data = await api.get('/stats/export');
      
      let csvContent = '';
      let filename = '';

      if (type === 'customers') {
        filename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = 'Name,Phone,Email,Membership Type,Membership Start,Membership End,Status,Created At\n';
        csvContent += data.customers.map(c => 
          `"${c.name}","${c.phone || ''}","${c.email || ''}","${getMembershipLabel(c.membership_type)}","${formatDate(c.membership_start)}","${formatDate(c.membership_end)}","${c.status || 'active'}","${formatDate(c.created_at)}"`
        ).join('\n');
      } else if (type === 'payments') {
        filename = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = 'Customer,Amount,Payment Method,Date\n';
        csvContent += data.payments.map(p => 
          `"${p.customer_name || 'N/A'}",${p.amount},"${getPaymentMethodLabel(p.payment_method)}","${formatDate(p.payment_date)}"`
        ).join('\n');
      } else {
        filename = `report_export_${new Date().toISOString().split('T')[0]}.csv`;
        csvContent = 'Metric,Value\n';
        csvContent += `Total Revenue,${data.summary.total_revenue}\n`;
        csvContent += `Total Customers,${data.summary.total_customers}\n`;
        csvContent += `Total Payments,${data.summary.total_payments}\n`;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const data = await api.get('/stats/export');
      
      // Create a printable report window
      const printWindow = window.open('', '_blank');
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${t('reports.pdfTitle')}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
            .header h1 { color: #6366f1; margin: 0; }
            .header p { color: #666; margin: 5px 0 0; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
            .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
            .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
            .stat-label { font-size: 12px; color: #666; }
            .stat-value { font-size: 24px; font-weight: bold; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background: #fafafa; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${t('reports.pdfTitle')}</h1>
            <p>${t('reports.generatedOn')} ${formatDate(new Date())}</p>
            <p>${t('reports.gymLabel')} ${gym?.name || t('reports.na')}</p>
          </div>

          <div class="section">
            <h2>${t('reports.summary')}</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">${t('reports.totalRevenue')}</div>
                <div class="stat-value">${formatCurrency(data.summary.total_revenue)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">${t('reports.totalCustomers')}</div>
                <div class="stat-value">${data.summary.total_customers}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">${t('reports.totalPayments')}</div>
                <div class="stat-value">${data.summary.total_payments}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">${t('reports.activeCustomers')}</div>
                <div class="stat-value">${data.customers.filter(c => new Date(c.membership_end) >= new Date()).length}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>${t('reports.recentPaymentsTop10')}</h2>
            <table>
              <thead>
                <tr>
                  <th>${t('reports.colCustomer')}</th>
                  <th>${t('common.amount')}</th>
                  <th>${t('reports.colMethod')}</th>
                  <th>${t('common.date')}</th>
                </tr>
              </thead>
              <tbody>
                ${data.payments.slice(0, 10).map(p => `
                  <tr>
                    <td>${p.customer_name || t('reports.na')}</td>
                    <td>${formatCurrency(p.amount)}</td>
                    <td>${getPaymentMethodLabel(p.payment_method)}</td>
                    <td>${formatDate(p.payment_date)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>${t('reports.customerList')}</h2>
            <table>
              <thead>
                <tr>
                  <th>${t('common.name')}</th>
                  <th>${t('common.phone')}</th>
                  <th>${t('membership.type')}</th>
                  <th>${t('reports.colExpires')}</th>
                </tr>
              </thead>
              <tbody>
                ${data.customers.slice(0, 20).map(c => `
                  <tr>
                    <td>${c.name}</td>
                    <td>${c.phone || t('reports.na')}</td>
                    <td>${getMembershipLabel(c.membership_type)}</td>
                    <td>${formatDate(c.membership_end)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>${t('reports.pdfFooter')} • ${t('reports.generatedOn')} ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gym-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHint id="reports">
        The Members report shows membership growth — new members, expirations, and your active count over a chosen date range. The Payments report breaks revenue down by plan type so you can see which plans are most popular. The Attendance report shows check-in frequency per member and total daily foot traffic. Any section can be exported as a CSV for use in Excel or Google Sheets. All reports respond to the date range picker at the top of the page.
      </PageHint>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            {t('reports.title')}
          </h1>
          <p className="text-gray-400 mt-1">{t('reports.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadReportData}
            className="btn-secondary inline-flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
            {t('reports.refresh')}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Date Range Selector */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="pl-10 pr-10 py-2.5 bg-dark-200 border border-gray-700 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-gym-500"
            >
              <option value="this_week">{t('reports.thisWeek')}</option>
              <option value="this_month">{t('reports.thisMonth')}</option>
              <option value="last_month">{t('reports.lastMonth')}</option>
              <option value="last_3_months">{t('reports.last3Months')}</option>
              <option value="last_6_months">{t('reports.last6Months')}</option>
              <option value="this_year">{t('reports.thisYear')}</option>
              <option value="all_time">{t('reports.allTime')}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2 bg-dark-200 rounded-lg p-1">
            {['summary', 'revenue', 'members', 'attendance'].map((type) => (
              <button
                key={type}
                onClick={() => setReportType(type)}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                  reportType === type
                    ? "bg-gym-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-dark-300"
                )}
              >
                {t(`reports.${type}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExportCSV('summary')}
            disabled={exporting}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t('reports.exportCSV')}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="btn-primary inline-flex items-center gap-2 shadow-lg shadow-gym-500/30"
          >
            <Printer className="w-4 h-4" />
            {t('reports.printReport')}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportStatCard
          title={t('reports.totalRevenue')}
          value={reportData?.revenue?.total || 0}
          icon={DollarSign}
          trend={reportData?.revenue?.trend}
          color="green"
        />
        <ReportStatCard
          title={t('reports.totalPayments')}
          value={reportData?.payments?.count || 0}
          icon={CreditCard}
          trend={reportData?.payments?.trend}
          color="blue"
        />
        <ReportStatCard
          title={t('reports.activeMembers')}
          value={reportData?.members?.active || 0}
          icon={Users}
          trend={reportData?.members?.trend}
          color="purple"
        />
        <ReportStatCard
          title={t('reports.avgTransaction')}
          value={reportData?.revenue?.average || 0}
          icon={Activity}
          trend={reportData?.revenue?.avgTrend}
          color="gym"
          prefix="ETB "
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Summary */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gym-400" />
              {t('reports.monthlySummary')}
            </h2>
          </div>
          
          <div className="space-y-4">
            {reportData?.monthly_summary?.map((month, index) => (
              <div key={month.month} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">{month.month}</span>
                  <span className="text-sm font-medium text-white">{formatCurrency(month.total)}</span>
                </div>
                <div className="h-3 bg-dark-300 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gym-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(month.total / (reportData?.revenue?.maxMonth || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-gray-400" />
              {t('reports.revenueByMethod')}
            </h2>
          </div>
          
          <div className="space-y-4">
            {reportData?.revenue_by_method?.map((method, index) => {
              const colors = ['from-green-500 to-emerald-500', 'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500'];
              const percentage = (method.total / (reportData?.revenue?.total || 1)) * 100;
              
              return (
                <div key={method.method} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300 capitalize">{method.method?.replace('_', ' ')}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-white">{formatCurrency(method.total)}</span>
                      <span className="text-xs text-gray-500 ml-2">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="h-4 bg-dark-300 rounded-full overflow-hidden">
                    <div
                      className={clsx("h-full rounded-full transition-all duration-1000 bg-gradient-to-r", colors[index % colors.length])}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Member Statistics */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              {t('reports.memberStatistics')}
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-dark-200 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-400 mb-1">{t('reports.newMembers')}</p>
              <p className="text-2xl font-bold text-white">+{reportData?.members?.new || 0}</p>
              <p className="text-xs text-green-400 mt-1">
                {t('reports.vsLastPeriod', { sign: reportData?.members?.newTrend > 0 ? '+' : '', value: reportData?.members?.newTrend || 0 })}
              </p>
            </div>
            <div className="bg-dark-200 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-400 mb-1">{t('reports.renewals')}</p>
              <p className="text-2xl font-bold text-white">{reportData?.members?.renewals || 0}</p>
              <p className="text-xs text-blue-400 mt-1">{t('reports.activeRenewals')}</p>
            </div>
          </div>

          <div className="space-y-3">
            {reportData?.membership_breakdown?.map((item, index) => (
              <div key={item.type} className="flex items-center justify-between p-3 bg-dark-200/50 rounded-xl hover:bg-dark-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold",
                    index === 0 ? "bg-gym-500/15 text-gym-400" :
                    index === 1 ? "bg-blue-500/15 text-blue-400" :
                    "bg-purple-500/15 text-purple-400"
                  )}>
                    {item.count}
                  </div>
                  <span className="text-sm text-gray-300">{getMembershipLabel(item.type)}</span>
                </div>
                <span className="text-sm font-medium text-white">{t('reports.membersUnit', { count: item.count })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Trends */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              {t('reports.attendanceTrends')}
            </h2>
            <span className="text-sm text-gray-400">
              <span className="text-white font-semibold">{reportData?.attendance?.total || 0}</span> check-ins
            </span>
          </div>

          {(() => {
            // Build a 14-slot array with a real date for each slot
            const today = new Date();
            const slots = Array.from({ length: 14 }, (_, i) => {
              const d = new Date(today);
              d.setDate(today.getDate() - (13 - i));
              const key = d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
              return { date: d, key };
            });

            // Map API daily data by date key
            const dailyByDate = {};
            (reportData?.attendance?.daily || []).forEach(day => {
              const k = (day.date || day.check_date || '').slice(0, 10);
              if (k) dailyByDate[k] = day.count || 0;
            });

            const bars = slots.map(slot => ({
              date: slot.date,
              count: dailyByDate[slot.key] || 0,
            }));

            const maxCount = Math.max(...bars.map(b => b.count), 1);
            const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            // Format peak day from ISO to readable
            const rawPeak = reportData?.attendance?.peak_day;
            const peakFormatted = rawPeak
              ? new Date(rawPeak).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'N/A';

            // Format busiest hour from "05:00" to "5 AM" / "2 PM"
            const rawHour = reportData?.attendance?.busiest_hour;
            const hourFormatted = rawHour
              ? (() => {
                  const h = parseInt(rawHour.split(':')[0], 10);
                  if (isNaN(h)) return rawHour;
                  return h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
                })()
              : 'N/A';

            return (
              <>
                {/* Bar chart */}
                <div className="relative mb-1">
                  {/* Horizontal guide lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ bottom: '24px' }}>
                    {[maxCount, Math.ceil(maxCount / 2), 0].map((val, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600 w-4 text-right flex-shrink-0">{val}</span>
                        <div className="flex-1 border-t border-gray-800" />
                      </div>
                    ))}
                  </div>

                  {/* Bars */}
                  <div className="flex items-end justify-between h-36 pl-7 pb-6">
                    {bars.map((bar, i) => {
                      const heightPct = (bar.count / maxCount) * 100;
                      const isToday = i === 13;
                      const label = DAY_ABBR[bar.date.getDay()];
                      const showLabel = i % 2 === 0 || isToday;
                      const dateLabel = bar.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                      return (
                        <div key={i} className="flex flex-col items-center justify-end relative group h-full" style={{ width: '20px' }}>
                          {/* Tooltip */}
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-100 border border-gray-700 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                            {dateLabel}: {bar.count} check-in{bar.count !== 1 ? 's' : ''}
                          </div>

                          {/* Bar */}
                          <div
                            className={clsx(
                              'w-4 rounded-sm transition-colors cursor-default',
                              bar.count === 0
                                ? 'bg-gray-800'
                                : isToday
                                  ? 'bg-green-400 group-hover:bg-green-300'
                                  : 'bg-green-600 group-hover:bg-green-500'
                            )}
                            style={{ height: bar.count === 0 ? '3px' : `${Math.max(heightPct, 8)}%` }}
                          />

                          {/* Day label */}
                          {showLabel && (
                            <span className={clsx(
                              'absolute -bottom-5 text-[10px]',
                              isToday ? 'text-green-400 font-medium' : 'text-gray-600'
                            )}>
                              {isToday ? 'Today' : label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="bg-dark-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">{t('reports.avgDaily')}</p>
                    <p className="text-lg font-bold text-white">{reportData?.attendance?.avg_daily || 0}</p>
                    <p className="text-xs text-gray-500">per day</p>
                  </div>
                  <div className="bg-dark-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">{t('reports.peakDay')}</p>
                    <p className="text-lg font-bold text-white">{peakFormatted}</p>
                    <p className="text-xs text-gray-500">most check-ins</p>
                  </div>
                  <div className="bg-dark-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">{t('reports.busiestHour')}</p>
                    <p className="text-lg font-bold text-white">{hourFormatted}</p>
                    <p className="text-xs text-gray-500">peak time</p>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Top Customers */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            {t('reports.topCustomers')}
          </h2>
          <button
            onClick={() => handleExportCSV('customers')}
            className="text-sm text-gym-400 hover:text-gym-300 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            {t('reports.exportList')}
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                <th className="pb-3 font-medium">{t('reports.colNum')}</th>
                <th className="pb-3 font-medium">{t('reports.colCustomer')}</th>
                <th className="pb-3 font-medium">{t('reports.colTotalPaid')}</th>
                <th className="pb-3 font-medium">{t('reports.colPayments')}</th>
                <th className="pb-3 font-medium">{t('reports.colLastPayment')}</th>
                <th className="pb-3 font-medium">{t('reports.colMembership')}</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.top_customers?.map((customer, index) => (
                <tr key={customer.id} className="border-b border-gray-800/50 hover:bg-dark-200/50 transition-all animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                  <td className="py-4 text-gray-500">{index + 1}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gym-500/15 flex items-center justify-center text-gym-400 font-bold">
                        {customer.name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p className="font-medium text-white">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.phone || t('reports.noPhone')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-green-400 font-medium">{formatCurrency(customer.total_paid)}</td>
                  <td className="py-4 text-gray-400">{customer.payment_count || 0}</td>
                  <td className="py-4 text-gray-400 text-sm">{formatDate(customer.last_payment_date)}</td>
                  <td className="py-4">
                    <span className={clsx(
                      "px-2 py-1 rounded text-xs font-medium",
                      new Date(customer.membership_end) >= new Date() 
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    )}>
                      {getMembershipLabel(customer.membership_type)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Export Section */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Download className="w-5 h-5 text-gray-400" />
          {t('reports.quickExport')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleExportCSV('customers')}
            disabled={exporting}
            className="flex items-center gap-4 p-4 bg-dark-200/50 rounded-xl hover:bg-dark-200 border border-gray-800 hover:border-gray-700 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center group-hover:from-blue-500/30 group-hover:to-cyan-500/30 transition-all">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-white">{t('reports.customerList')}</p>
              <p className="text-sm text-gray-500">{t('reports.csvFormat')}</p>
            </div>
          </button>
          
          <button
            onClick={() => handleExportCSV('payments')}
            disabled={exporting}
            className="flex items-center gap-4 p-4 bg-dark-200/50 rounded-xl hover:bg-dark-200 border border-gray-800 hover:border-gray-700 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center group-hover:from-green-500/30 group-hover:to-emerald-500/30 transition-all">
              <CreditCard className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-white">{t('reports.paymentHistory')}</p>
              <p className="text-sm text-gray-500">{t('reports.csvFormat')}</p>
            </div>
          </button>
          
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-4 p-4 bg-dark-200/50 rounded-xl hover:bg-dark-200 border border-gray-800 hover:border-gray-700 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-white">{t('reports.fullReport')}</p>
              <p className="text-sm text-gray-500">{t('reports.printablePDF')}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportStatCard({ title, value, icon: Icon, trend, color, prefix = '' }) {
  const colors = {
    green: { bg: 'bg-green-500/10', text: 'text-green-400', icon: 'from-green-500 to-green-600' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'from-blue-500 to-blue-600' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: 'from-purple-500 to-purple-600' },
    gym: { bg: 'bg-gym-500/10', text: 'text-gym-400', icon: 'from-gym-500 to-gym-600' },
    yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: 'from-yellow-500 to-yellow-600' },
  };
  
  const c = colors[color] || colors.blue;
  const isPositive = trend >= 0;

  return (
    <div className="glass-card p-5 border border-gray-800 hover-lift animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend !== undefined && trend !== null && (
            <div className={clsx(
              "flex items-center gap-1 mt-2 text-xs",
              isPositive ? "text-green-400" : "text-red-400"
            )}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className={clsx("p-3 rounded-xl bg-gradient-to-br shadow-lg", c.icon)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}