import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getStatusColor, formatDate, getMembershipLabel } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import Pagination from '../components/Pagination';
import { CustomerCardSkeleton } from '../components/Skeleton';
import {
  Search,
  Plus,
  Grid3X3,
  List,
  X,
  User,
  Phone,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  Filter,
  SortAsc,
  Zap,
  MoreHorizontal,
  ChevronDown,
  UserCheck,
  Download
} from 'lucide-react';
import clsx from 'clsx';
import PageHint from '../components/PageHint';

// Custom hook for view mode persistence
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

export default function Customers() {
  const { subscription } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [summary, setSummary] = useState({ total: 0, active: 0, expiring: 0, expired: 0, inactive: 0, frozen: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent_activity');
  const [viewMode, setViewMode] = useLocalStorage('customerViewMode', 'grid');
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const navigate = useNavigate();
  const searchDebounceRef = useRef(null);
  const sortByRef = useRef(sortBy);
  const [checkedInIds, setCheckedInIds] = useState(new Set());

  // Load currently checked-in customers on mount
  useEffect(() => {
    api.get('/attendance/current')
      .then(data => {
        const ids = new Set((data.currently_present || []).map(a => a.customer_id));
        setCheckedInIds(ids);
      })
      .catch(() => {});
  }, []);

  const handleQuickCheckIn = async (e, customerId) => {
    e.stopPropagation();
    try {
      await api.post('/attendance/check-in', { customer_id: customerId });
      setCheckedInIds(prev => new Set([...prev, customerId]));
      toast.success(t('customers.toastCheckedIn'));
    } catch (err) {
      toast.error(err.message || t('customers.toastCheckInFailed'));
    }
  };

  const handleQuickCheckOut = async (e, customerId) => {
    e.stopPropagation();
    try {
      await api.post('/attendance/check-out', { customer_id: customerId });
      setCheckedInIds(prev => { const s = new Set(prev); s.delete(customerId); return s; });
      toast.success(t('customers.toastCheckedOut'));
    } catch (err) {
      toast.error(err.message || t('customers.toastCheckOutFailed'));
    }
  };

  // Keep ref in sync so debounce always uses the latest sort value
  useEffect(() => { sortByRef.current = sortBy; }, [sortBy]);

  useEffect(() => {
    loadCustomers(page, statusFilter, search, sortBy);
  }, [page, statusFilter, sortBy]);

  // Debounce search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      loadCustomers(1, statusFilter, search, sortByRef.current);
    }, 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [search]);

  const loadCustomers = async (p = 1, status = 'all', q = '', sort = 'recent_activity') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: p, limit: 50 });
      if (status && status !== 'all') params.set('status', status);
      if (q) params.set('search', q);
      params.set('sort', sort);
      const data = await api.get(`/customers?${params}`);
      setCustomers(data.data || []);
      setPagination(data.pagination || null);
      setSummary(data.summary || { total: 0, active: 0, expiring: 0, expired: 0, inactive: 0, frozen: 0 });
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error(t('customers.toastLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
      const params = new URLSearchParams({ format: 'csv' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`${API_BASE}/reports/customers?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('customers.toastExportSuccess'));
    } catch (err) {
      toast.error(err.message || t('customers.toastExportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    // Server already returned data in the correct order for recent_activity
    if (sortBy === 'recent_activity') return customers;
    const list = [...customers];
    if (sortBy === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'created_at') {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else {
      // Default: membership_end (soonest expiry first, nulls last)
      list.sort((a, b) => {
        if (!a.membership_end && !b.membership_end) return 0;
        if (!a.membership_end) return 1;
        if (!b.membership_end) return -1;
        return new Date(a.membership_end) - new Date(b.membership_end);
      });
    }
    return list;
  }, [customers, sortBy]);

  const statusCounts = {
    all: summary.total,
    active: summary.active,
    expiring: summary.expiring,
    expired: summary.expired,
    inactive: summary.inactive,
    frozen: summary.frozen,
  };

  const getDaysDisplay = (customer) => {
    const days = customer.days_until_expiry;
    if (days > 0) {
      return t('customers.daysLeft').replace('{n}', days);
    } else if (days === 0) {
      return t('customers.expiresToday');
    } else {
      return t('customers.daysOverdue').replace('{n}', Math.abs(days));
    }
  };

  const getDaysColor = (days) => {
    if (days > 7) return 'text-green-400';
    if (days > 0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setPage(1);
    setSelectedCustomers([]);
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const toggleSelect = (customerId) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  // Skeleton grid shown inline rather than replacing the whole page

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHint id="customers">
        Search by name or phone number, or filter by status (active, expiring, expired) using the dropdown. Click any member card to open their full profile — membership dates, all past payments, and check-in history. To register a new member click Add Member and fill in their details; you can record their first payment on the same screen. To renew, open the member's profile and click Record Payment — choosing a new plan extends the end date automatically. Card colors: green = active, yellow = expiring within 7 days, red = expired.
      </PageHint>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {t('customers.title')}
            <span className="ml-2 text-lg font-normal text-gray-400">({statusCounts.all})</span>
          </h1>
          <p className="text-gray-400 mt-1">
            {t('customers.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/customers/import"
            className="btn-secondary hidden sm:inline-flex items-center gap-2"
            title={t('customers.importCsv')}
          >
            <Download className="w-4 h-4 rotate-180" />
            {t('customers.importCsv')}
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary hidden sm:inline-flex items-center gap-2"
            title={t('customers.exportTitle')}
          >
            {exporting ? <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <Download className="w-4 h-4" />}
            {t('customers.export')}
          </button>
          {subscription?.valid ? (
            <Link to="/customers/new" className="btn-primary inline-flex items-center gap-2 shadow-lg shadow-gym-500/30">
              <Plus className="w-5 h-5" />
              {t('customers.addCustomer')}
            </Link>
          ) : (
            <button
              disabled
              className="opacity-50 cursor-not-allowed btn-primary inline-flex items-center gap-2"
              title={t('customers.subscriptionExpired')}
            >
              <Plus className="w-5 h-5" />
              {t('customers.addCustomer')}
            </button>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 stagger-children">
        {[
          { key: 'all', label: t('customers.tabAll'), color: 'gray' },
          { key: 'active', label: t('customers.tabActive'), color: 'green' },
          { key: 'expiring', label: t('customers.tabExpiring'), color: 'yellow' },
          { key: 'expired', label: t('customers.tabExpired'), color: 'red' },
          ...(summary.frozen > 0 ? [{ key: 'frozen', label: 'Frozen', color: 'blue' }] : []),
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleStatusFilter(tab.key)}
            className={clsx(
              "px-4 py-2 rounded-xl font-medium transition-all duration-300",
              statusFilter === tab.key
                ? tab.color === 'green' ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30"
                : tab.color === 'yellow' ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-black shadow-lg shadow-yellow-500/30"
                : tab.color === 'red' ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/30"
                : tab.color === 'blue' ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
                : "bg-gradient-to-r from-gym-500 to-purple-500 text-white shadow-lg shadow-gym-500/30"
                : "bg-dark-100 text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700"
            )}
          >
            {tab.label}
            <span className="ml-2 text-xs opacity-70">({statusCounts[tab.key]})</span>
          </button>
        ))}
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <div className="absolute inset-0 bg-gradient-to-r from-gym-500 to-purple-500 rounded-xl blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('customers.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-12 pr-10"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="input-field pr-8 appearance-none cursor-pointer"
            >
              <option value="recent_activity">Most Recently Active</option>
              <option value="membership_end">{t('customers.sortByExpiry')}</option>
              <option value="name">{t('customers.sortByName')}</option>
              <option value="created_at">{t('customers.sortNewest')}</option>
            </select>
            <SortAsc className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Bulk Selection Toggle */}
          <button
            onClick={() => {
              setBulkActionOpen(!bulkActionOpen);
              if (!bulkActionOpen) toggleSelectAll();
            }}
            className={clsx(
              "p-2.5 rounded-xl transition-all duration-300",
              bulkActionOpen || selectedCustomers.length > 0
                ? "bg-gym-500/20 text-gym-400 border border-gym-500/30"
                : "bg-dark-100 text-gray-400 hover:text-white border border-gray-800"
            )}
            title={t('customers.bulkSelection')}
          >
            <CheckSquare className="w-5 h-5" />
          </button>

          {/* View Mode */}
          <div className="flex bg-dark-100 rounded-xl p-1 border border-gray-800">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                "p-2 rounded-lg transition-all duration-300",
                viewMode === 'grid' 
                  ? "bg-gradient-to-br from-gym-500 to-purple-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                "p-2 rounded-lg transition-all duration-300",
                viewMode === 'list' 
                  ? "bg-gradient-to-br from-gym-500 to-purple-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCustomers.length > 0 && (
        <div className="glass-card p-4 flex items-center justify-between animate-slide-down">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gym-500/20 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-gym-400" />
            </div>
            <span className="text-white font-medium">{t('customers.selected').replace('{n}', selectedCustomers.length)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:shadow-lg transition-all">
              {t('customers.checkInAll')}
            </button>
            <button className="px-4 py-2 bg-dark-200 text-white rounded-lg font-medium hover:bg-dark-300 transition-all">
              {t('customers.export')}
            </button>
            <button 
              onClick={() => setSelectedCustomers([])}
              className="p-2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Customer List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <CustomerCardSkeleton key={i} />)}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-dark-200 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">{t('customers.noCustomersFound')}</h3>
          <p className="text-gray-400 mb-6">
            {search || statusFilter !== 'all'
              ? t('customers.adjustFilters')
              : t('customers.startAdding')}
          </p>
          {!search && statusFilter === 'all' && (
            <Link to="/customers/new" className="btn-primary inline-flex items-center gap-2 shadow-lg">
              <Plus className="w-5 h-5" />
              {t('customers.addFirstMember')}
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onClick={() => navigate(`/customers/${customer.id}`)}
              onCheckIn={handleQuickCheckIn}
              onCheckOut={handleQuickCheckOut}
              isCheckedIn={checkedInIds.has(customer.id)}
              getDaysDisplay={getDaysDisplay}
              getDaysColor={getDaysColor}
              selected={selectedCustomers.includes(customer.id)}
              onSelect={() => bulkActionOpen && toggleSelect(customer.id)}
              showBulkActions={bulkActionOpen}
              t={t}
            />
          ))}
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      ) : (
        <>
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/50 bg-gradient-to-r from-dark-100 to-dark-200">
                {bulkActionOpen && (
                  <th className="text-left px-4 py-3 w-12">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white">
                      {selectedCustomers.length === filteredCustomers.length ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </th>
                )}
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">{t('customers.colCustomer')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 hidden sm:table-cell">{t('common.phone')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">{t('common.status')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 hidden md:table-cell">{t('customers.colMembership')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 whitespace-nowrap">{t('customers.colDaysLeft')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 hidden sm:table-cell">{t('customers.colExpires')}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer, index) => {
                const isIn = checkedInIds.has(customer.id);
                return (
                <tr
                  key={customer.id}
                  className={clsx(
                    "border-b border-gray-800/50 cursor-pointer transition-colors animate-fade-in",
                    isIn ? "bg-green-500/5 hover:bg-green-500/10" : "hover:bg-dark-100/30"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => navigate(`/customers/${customer.id}`)}
                >
                  {bulkActionOpen && (
                    <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelect(customer.id); }}>
                      <button className="text-gray-400 hover:text-white">
                        {selectedCustomers.includes(customer.id) ? (
                          <CheckSquare className="w-5 h-5 text-gym-400" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        {customer.photo ? (
                          <img
                            src={customer.photo}
                            alt={customer.name}
                            className={clsx(
                              "w-10 h-10 rounded-xl object-cover border-2",
                              isIn ? "border-green-500/60" : "border-gym-500/30"
                            )}
                          />
                        ) : (
                          <div className={clsx(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg",
                            isIn ? "bg-gradient-to-br from-green-500 to-emerald-600"
                                 : "bg-gradient-to-br from-gym-500 to-purple-600"
                          )}>
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {isIn && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-dark-100 animate-pulse" />
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-white">{customer.name}</span>
                        {isIn && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/15 border border-green-500/25 px-1.5 py-0.5 rounded-full">
                            ● Inside
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{customer.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('status-badge', getStatusColor(customer.status))}>
                      {customer.status === 'expiring' ? t('customers.statusExpiring')
                        : customer.status === 'active' ? t('customers.statusActive')
                        : customer.status === 'expired' ? t('customers.statusExpired')
                        : customer.status === 'frozen' ? '❄ Frozen'
                        : t('customers.statusInactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                    {getMembershipLabel(customer.membership_type)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {customer.membership_type === 'daily' ? (
                      <span className="text-amber-400 text-sm font-medium">
                        🎫 {Math.max(0, (customer.total_sessions || 0) - (customer.sessions_used || 0))} passes
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Clock className={clsx("w-4 h-4 flex-shrink-0", getDaysColor(customer.days_until_expiry))} />
                        <span className={clsx("text-sm font-medium", getDaysColor(customer.days_until_expiry))}>
                          <span className="hidden sm:inline">{getDaysDisplay(customer)}</span>
                          <span className="sm:hidden">
                            {customer.days_until_expiry > 0
                              ? t('customers.daysShort').replace('{n}', customer.days_until_expiry)
                              : customer.days_until_expiry === 0
                              ? t('customers.today')
                              : t('customers.daysOverShort').replace('{n}', Math.abs(customer.days_until_expiry))}
                          </span>
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-300">
                        {customer.membership_type === 'daily' ? '—' : formatDate(customer.membership_end)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className="p-2 text-gray-400 hover:text-gym-400 hover:bg-gym-500/10 rounded-lg transition-all"
                        title={t('customers.view')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/customers/${customer.id}/edit`)}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                        title={t('common.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function CustomerCard({ customer, onClick, onCheckIn, onCheckOut, isCheckedIn, getDaysDisplay, getDaysColor, selected, onSelect, showBulkActions, t }) {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        "glass-card cursor-pointer transition-all duration-300 relative overflow-hidden group",
        isCheckedIn
          ? "border-green-500/60 ring-2 ring-green-500/25 shadow-lg shadow-green-500/15"
          : selected
            ? "border-gym-500 ring-2 ring-gym-500/30"
            : "hover:border-gym-500/50 hover-lift"
      )}
    >
      {/* Checked-in green shimmer background */}
      {isCheckedIn && (
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 to-emerald-500/5 pointer-events-none" />
      )}

      {/* Hover gradient (non-checked-in) */}
      {!isCheckedIn && (
        <div className={clsx(
          "absolute inset-0 bg-gradient-to-br from-gym-500/5 to-purple-500/5 transition-opacity duration-300 pointer-events-none",
          isHovered ? "opacity-100" : "opacity-0"
        )} />
      )}

      {/* ── Eye + Edit buttons — top-right corner of the card, appear on hover ── */}
      <div className={clsx(
        "absolute top-2 right-2 flex gap-1 transition-all duration-200 z-20",
        isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
      )}>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="p-1.5 bg-dark-100/90 backdrop-blur-sm text-gray-400 hover:text-gym-400 rounded-lg shadow-lg border border-gray-700/60 transition-all hover:scale-110"
          title={t('customers.view')}
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/customers/${customer.id}/edit`); }}
          className="p-1.5 bg-dark-100/90 backdrop-blur-sm text-gray-400 hover:text-blue-400 rounded-lg shadow-lg border border-gray-700/60 transition-all hover:scale-110"
          title={t('common.edit')}
        >
          <Edit className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── CHECKED-IN banner strip ── */}
      {isCheckedIn && (
        <div className="flex items-center justify-center gap-1.5 py-1.5 bg-green-500/20 border-b border-green-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-green-400 uppercase tracking-wide">Inside Now</span>
        </div>
      )}

      <div className="relative p-5">
        {/* Bulk Selection Checkbox */}
        {showBulkActions && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={clsx(
              "absolute top-0 right-0 p-2 rounded-lg transition-all z-10",
              selected ? "bg-gym-500 text-white" : "bg-dark-200 text-gray-400 hover:text-white"
            )}
          >
            {selected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
          </button>
        )}

        {/* Photo / Avatar */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative">
            {customer.photo ? (
              <img
                src={customer.photo}
                alt={customer.name}
                className={clsx(
                  "w-20 h-20 rounded-2xl object-cover border-2 transition-all duration-300",
                  isCheckedIn ? "border-green-400/70 shadow-lg shadow-green-500/30"
                  : customer.status === 'active' ? "border-green-500/50"
                  : customer.status === 'expiring' ? "border-yellow-500/50"
                  : customer.status === 'expired' ? "border-red-500/50"
                  : customer.status === 'frozen' ? "border-blue-500/50"
                  : "border-gray-700"
                )}
              />
            ) : (
              <div className={clsx(
                "w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg transition-all duration-300",
                isCheckedIn ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/40"
                : customer.status === 'active' ? "bg-gradient-to-br from-green-500 to-emerald-600"
                : customer.status === 'expiring' ? "bg-gradient-to-br from-yellow-500 to-orange-500"
                : customer.status === 'expired' ? "bg-gradient-to-br from-red-500 to-rose-600"
                : customer.status === 'frozen' ? "bg-gradient-to-br from-blue-500 to-cyan-600"
                : "bg-gradient-to-br from-gym-500 to-purple-600"
              )}>
                {customer.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Status dot — replaced by animated green ring when checked in */}
            {isCheckedIn ? (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-dark-100 flex items-center justify-center shadow-md shadow-green-500/50">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
              </div>
            ) : (
              <div className={clsx(
                "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-dark-100",
                customer.status === 'active' && "bg-green-500 animate-pulse",
                customer.status === 'expiring' && "bg-yellow-500 animate-pulse",
                customer.status === 'expired' && "bg-red-500",
                customer.status === 'inactive' && "bg-gray-500",
                customer.status === 'frozen' && "bg-blue-400"
              )} />
            )}
          </div>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-white text-center mb-1 truncate w-full">{customer.name}</h3>

        {/* Phone */}
        <p className="text-sm text-gray-400 text-center mb-3">{customer.phone || t('customers.noPhone')}</p>

        {/* Status Badge */}
        <div className="flex justify-center mb-3">
          <span className={clsx('status-badge', getStatusColor(customer.status))}>
            {customer.status === 'expiring' ? t('customers.statusExpiringSoon')
              : customer.status === 'active' ? t('customers.statusActive')
              : customer.status === 'expired' ? t('customers.statusExpired')
              : customer.status === 'frozen' ? '❄ Frozen'
              : t('customers.statusInactive')}
          </span>
        </div>

        {/* Days Left / Passes Left */}
        {customer.membership_type === 'daily' ? (
          <div className="w-full p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-amber-400 text-lg">🎫</span>
              <div className="text-center">
                <span className={clsx("font-bold text-xl",
                  (customer.total_sessions - customer.sessions_used) > 3 ? "text-green-400"
                  : (customer.total_sessions - customer.sessions_used) > 0 ? "text-yellow-400"
                  : "text-red-400"
                )}>
                  {Math.max(0, (customer.total_sessions || 0) - (customer.sessions_used || 0))}
                </span>
                <span className="text-gray-400 text-sm ml-1">{t('customers.passesLeft') || 'passes left'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full p-3 bg-dark-200/50 rounded-xl mb-3">
            <div className="flex items-center justify-center gap-3">
              <ProgressRing
                progress={Math.max(0, Math.min(100, (customer.days_until_expiry / 30) * 100))}
                status={customer.status}
                size={32}
              />
              <div className="text-center">
                <span className={clsx("font-bold text-xl", getDaysColor(customer.days_until_expiry))}>
                  {customer.days_until_expiry > 0 ? customer.days_until_expiry : 0}
                </span>
                <span className="text-gray-400 text-sm ml-1">{t('customers.days')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Expiry */}
        <div className="w-full pt-3 border-t border-gray-800/50">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            {customer.membership_type === 'daily' ? (
              <span className="text-amber-400 font-medium">{t('customers.dailyPassLabel') || 'Daily Walk-in Pass'}</span>
            ) : (
              <>
                <span className="text-gray-400">{t('customers.expiresLabel')} </span>
                <span className="text-gray-300">{formatDate(customer.membership_end)}</span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons — always visible when checked in, hover-only otherwise */}
        <div className={clsx(
          "flex justify-center gap-2 mt-3 pt-3 border-t transition-all duration-300",
          isCheckedIn
            ? "opacity-100 translate-y-0 border-green-500/20"
            : isHovered
              ? "opacity-100 translate-y-0 border-gray-800/50"
              : "opacity-0 translate-y-2 border-gray-800/50"
        )}>
          {isCheckedIn ? (
            <button
              onClick={(e) => onCheckOut(e, customer.id)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold rounded-lg hover:shadow-lg hover:shadow-red-500/30 transition-all hover:scale-105 w-full justify-center"
            >
              <Zap className="w-3.5 h-3.5" />
              Check Out
            </button>
          ) : (
            <>
              <button
                onClick={(e) => onCheckIn(e, customer.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium rounded-lg hover:shadow-lg hover:shadow-green-500/30 transition-all hover:scale-105"
              >
                <Zap className="w-3 h-3" />
                {t('customers.cardCheckIn')}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-200 text-gray-300 text-xs font-medium rounded-lg hover:bg-dark-300 transition-all hover:scale-105"
              >
                <Eye className="w-3 h-3" />
                {t('customers.view')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Progress Ring Component
function ProgressRing({ progress, status, size = 40 }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const getColor = () => {
    switch (status) {
      case 'active': return '#10b981';
      case 'expiring': return '#f59e0b';
      case 'expired': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="progress-ring" width={size} height={size}>
        <circle
          stroke="rgba(255,255,255,0.1)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="progress-ring-circle"
          stroke={getColor()}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <UserCheck className="w-3 h-3" style={{ color: getColor() }} />
      </div>
    </div>
  );
}