import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getStatusColor, formatDate, getMembershipLabel } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [summary, setSummary] = useState({ total: 0, active: 0, expiring: 0, expired: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('membership_end');
  const [viewMode, setViewMode] = useLocalStorage('customerViewMode', 'grid');
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const navigate = useNavigate();
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    loadCustomers(page, statusFilter, search);
  }, [page, statusFilter]);

  // Debounce search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      loadCustomers(1, statusFilter, search);
    }, 300);
    return () => clearTimeout(searchDebounceRef.current);
  }, [search]);

  const loadCustomers = async (p = 1, status = 'all', q = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: p, limit: 50 });
      if (status && status !== 'all') params.set('status', status);
      if (q) params.set('search', q);
      const data = await api.get(`/customers?${params}`);
      setCustomers(data.data || []);
      setPagination(data.pagination || null);
      setSummary(data.summary || { total: 0, active: 0, expiring: 0, expired: 0, inactive: 0 });
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error('Failed to load customers');
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
      toast.success('Export downloaded successfully');
    } catch (err) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const filteredCustomers = customers; // Server handles filtering now

  const statusCounts = {
    all: summary.total,
    active: summary.active,
    expiring: summary.expiring,
    expired: summary.expired,
    inactive: summary.inactive,
  };

  const getDaysDisplay = (customer) => {
    const days = customer.days_until_expiry;
    if (days > 0) {
      return `${days} days left`;
    } else if (days === 0) {
      return 'Expires today';
    } else {
      return `${Math.abs(days)} days overdue`;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Customers
            <span className="ml-2 text-lg font-normal text-gray-400">({statusCounts.all})</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your gym members and their memberships
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary hidden sm:inline-flex items-center gap-2"
            title="Export customers to CSV"
          >
            {exporting ? <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> : <Download className="w-4 h-4" />}
            Export
          </button>
          {subscription?.valid ? (
            <Link to="/customers/new" className="gradient-primary btn-primary inline-flex items-center gap-2 shadow-lg shadow-gym-500/30">
              <Plus className="w-5 h-5" />
              Add Customer
            </Link>
          ) : (
            <button 
              disabled
              className="opacity-50 cursor-not-allowed gradient-primary btn-primary inline-flex items-center gap-2"
              title="Subscription expired"
            >
              <Plus className="w-5 h-5" />
              Add Customer
            </button>
          )}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 stagger-children">
        {[
          { key: 'all', label: 'All', color: 'gray' },
          { key: 'active', label: 'Active', color: 'green' },
          { key: 'expiring', label: 'Expiring Soon', color: 'yellow' },
          { key: 'expired', label: 'Expired', color: 'red' },
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
              placeholder="Search by name or phone..."
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
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field pr-8 appearance-none cursor-pointer"
            >
              <option value="membership_end">By Expiry Date</option>
              <option value="name">By Name (A-Z)</option>
              <option value="created_at">Newest First</option>
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
            title="Bulk selection"
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
            <span className="text-white font-medium">{selectedCustomers.length} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:shadow-lg transition-all">
              Check-in All
            </button>
            <button className="px-4 py-2 bg-dark-200 text-white rounded-lg font-medium hover:bg-dark-300 transition-all">
              Export
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
          <h3 className="text-lg font-medium text-white mb-2">No customers found</h3>
          <p className="text-gray-400 mb-6">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your filters or search term'
              : 'Start by adding your first customer'}
          </p>
          {!search && statusFilter === 'all' && (
            <Link to="/customers/new" className="gradient-primary btn-primary inline-flex items-center gap-2 shadow-lg">
              <Plus className="w-5 h-5" />
              Add Your First Member
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
              getDaysDisplay={getDaysDisplay}
              getDaysColor={getDaysColor}
              selected={selectedCustomers.includes(customer.id)}
              onSelect={() => bulkActionOpen && toggleSelect(customer.id)}
              showBulkActions={bulkActionOpen}
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
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Customer</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 hidden sm:table-cell">Phone</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 hidden md:table-cell">Membership</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 whitespace-nowrap">Days Left</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400 hidden sm:table-cell">Expires</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer, index) => (
                <tr 
                  key={customer.id}
                  className="border-b border-gray-800/50 hover:bg-dark-100/30 cursor-pointer transition-colors animate-fade-in"
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
                      {customer.photo ? (
                        <img
                          src={customer.photo}
                          alt={customer.name}
                          className="w-10 h-10 rounded-xl object-cover border-2 border-gym-500/30"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gym-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-white">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{customer.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('status-badge', getStatusColor(customer.status))}>
                      {customer.status === 'expiring' ? 'Expiring' : customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                    {getMembershipLabel(customer.membership_type)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className={clsx("w-4 h-4 flex-shrink-0", getDaysColor(customer.days_until_expiry))} />
                      <span className={clsx("text-sm font-medium", getDaysColor(customer.days_until_expiry))}>
                        <span className="hidden sm:inline">{getDaysDisplay(customer)}</span>
                        <span className="sm:hidden">
                          {customer.days_until_expiry > 0
                            ? `${customer.days_until_expiry}d`
                            : customer.days_until_expiry === 0
                            ? 'Today'
                            : `${Math.abs(customer.days_until_expiry)}d over`}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-300">
                        {formatDate(customer.membership_end)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className="p-2 text-gray-400 hover:text-gym-400 hover:bg-gym-500/10 rounded-lg transition-all"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => navigate(`/customers/${customer.id}?edit=true`)}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function CustomerCard({ customer, onClick, getDaysDisplay, getDaysColor, selected, onSelect, showBulkActions }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        "glass-card p-5 cursor-pointer transition-all duration-300 relative overflow-hidden group",
        selected ? "border-gym-500 ring-2 ring-gym-500/30" : "hover:border-gym-500/50 hover-lift"
      )}
    >
      {/* Gradient background on hover */}
      <div className={clsx(
        "absolute inset-0 bg-gradient-to-br from-gym-500/5 to-purple-500/5 transition-opacity duration-300",
        isHovered ? "opacity-100" : "opacity-0"
      )} />

      <div className="relative">
        {/* Bulk Selection Checkbox */}
        {showBulkActions && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={clsx(
              "absolute top-0 right-0 p-2 rounded-lg transition-all z-10",
              selected 
                ? "bg-gym-500 text-white" 
                : "bg-dark-200 text-gray-400 hover:text-white"
            )}
          >
            {selected ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Quick Actions Overlay */}
        <div className={clsx(
          "absolute -top-2 right-0 flex gap-1 transition-all duration-300 z-10",
          isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}>
          <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="p-2 bg-dark-200 text-gray-400 hover:text-gym-400 rounded-lg shadow-lg transition-all hover:scale-110"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); /* Edit action */ }}
            className="p-2 bg-dark-200 text-gray-400 hover:text-blue-400 rounded-lg shadow-lg transition-all hover:scale-110"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        {/* Photo */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative">
            {customer.photo ? (
              <img
                src={customer.photo}
                alt={customer.name}
                className={clsx(
                  "w-20 h-20 rounded-2xl object-cover border-2 transition-all duration-300",
                  customer.status === 'active' ? "border-green-500/50" :
                  customer.status === 'expiring' ? "border-yellow-500/50" :
                  customer.status === 'expired' ? "border-red-500/50" : "border-gray-700"
                )}
              />
            ) : (
              <div className={clsx(
                "w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg transition-all duration-300",
                customer.status === 'active' ? "bg-gradient-to-br from-green-500 to-emerald-600" :
                customer.status === 'expiring' ? "bg-gradient-to-br from-yellow-500 to-orange-500" :
                customer.status === 'expired' ? "bg-gradient-to-br from-red-500 to-rose-600" :
                "bg-gradient-to-br from-gym-500 to-purple-600"
              )}>
                {customer.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Status indicator */}
            <div className={clsx(
              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-dark-100",
              customer.status === 'active' && "bg-green-500 animate-pulse",
              customer.status === 'expiring' && "bg-yellow-500 animate-pulse",
              customer.status === 'expired' && "bg-red-500",
              customer.status === 'inactive' && "bg-gray-500"
            )} />
          </div>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-white text-center mb-1 truncate w-full">{customer.name}</h3>
        
        {/* Phone */}
        <p className="text-sm text-gray-400 text-center mb-3">{customer.phone || 'No phone'}</p>

        {/* Status Badge */}
        <div className="flex justify-center mb-3">
          <span className={clsx('status-badge', getStatusColor(customer.status))}>
            {customer.status === 'expiring' ? 'Expiring Soon' : customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
          </span>
        </div>

        {/* Days Left - Progress Ring */}
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
              <span className="text-gray-400 text-sm ml-1">days</span>
            </div>
          </div>
        </div>

        {/* Expiry */}
        <div className="w-full pt-3 border-t border-gray-800/50">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Expires: </span>
            <span className="text-gray-300">{formatDate(customer.membership_end)}</span>
          </div>
        </div>

        {/* Quick Actions on Hover */}
        <div className={clsx(
          "flex justify-center gap-2 mt-3 pt-3 border-t border-gray-800/50 transition-all duration-300",
          isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}>
          <button 
            onClick={(e) => { e.stopPropagation(); /* Quick check-in */ }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-medium rounded-lg hover:shadow-lg hover:shadow-green-500/30 transition-all hover:scale-105"
          >
            <Zap className="w-3 h-3" />
            Check-in
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-200 text-gray-300 text-xs font-medium rounded-lg hover:bg-dark-300 transition-all hover:scale-105"
          >
            <Eye className="w-3 h-3" />
            View
          </button>
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