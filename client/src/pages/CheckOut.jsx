import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDateTime } from '../utils/api';
import { useAuth, useSubscriptionGate } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Users, 
  LogOut, 
  Clock,
  Wifi,
  Search,
  RefreshCw,
  User,
  Calendar,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import clsx from 'clsx';
import PageHint from '../components/PageHint';

export default function CheckOut() {
  const { subscription } = useAuth();
  const gate = useSubscriptionGate();
  const { t } = useLanguage();
  const [checkedInCustomers, setCheckedInCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadCheckedInCustomers();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadCheckedInCustomers, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadCheckedInCustomers = async () => {
    try {
      const data = await api.get('/attendance/current');
      setCheckedInCustomers(data.currently_present || []);
    } catch (err) {
      console.error('Failed to load checked-in customers:', err);
      setError(t('checkOut.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (customerId) => {
    if (!gate()) return;
    setActionLoading(customerId);
    setError('');
    setSuccess('');
    
    try {
      await api.post(`/customers/${customerId}/check-out`);
      const customerName = checkedInCustomers.find(c => c.customer_id === customerId)?.customer?.name || 'Customer';
      setSuccess(t('checkOut.checkedOutSuccess').replace('{name}', customerName));
      loadCheckedInCustomers();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOutAll = async () => {
    if (!gate()) return;
    if (checkedInCustomers.length === 0) return;
    
    if (!confirm(t('checkOut.confirmAll').replace('{n}', checkedInCustomers.length))) {
      return;
    }

    setLoading(true);
    try {
      for (const customer of checkedInCustomers) {
        await api.post(`/customers/${customer.customer_id}/check-out`);
      }
      setSuccess(t('checkOut.allCheckedOut').replace('{n}', checkedInCustomers.length));
      loadCheckedInCustomers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search term
  const filteredCustomers = checkedInCustomers.filter(customer => {
    if (!searchTerm) return true;
    const name = (customer.customer_name || customer.customer?.name || '').toLowerCase();
    const phone = (customer.customer_phone || customer.customer?.phone || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm.toLowerCase());
  });

  // Group customers by check-in time
  const groupByTime = () => {
    const now = new Date();
    const groups = {
      [t('checkOut.currentlyInGym')]: [],
      [t('checkOut.checkedInEarlier')]: [],
    };

    filteredCustomers.forEach(log => {
      const checkInTime = new Date(log.check_in);
      const hoursDiff = (now - checkInTime) / (1000 * 60 * 60);

      if (hoursDiff < 1) {
        groups[t('checkOut.currentlyInGym')].push(log);
      } else {
        groups[t('checkOut.checkedInEarlier')].push(log);
      }
    });

    return groups;
  };

  const groupedCustomers = groupByTime();

  if (loading && checkedInCustomers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gym-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <PageHint id="check-out">
        This page shows only members who have checked in but not yet left — your live view of who is currently inside. Click Check Out next to a member's name when they leave. If someone left without checking out, you can do it manually here at any time. Check-out times feed into visit duration stats in Attendance Analytics and give a complete picture of how long members stay.
      </PageHint>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('checkOut.title')}</h1>
          <p className="text-gray-400">
            {checkedInCustomers.length > 0
              ? t('checkOut.subtitleCount').replace('{n}', checkedInCustomers.length).replace('{s}', checkedInCustomers.length === 1 ? '' : 's')
              : t('checkOut.subtitleEmpty')
            }
          </p>
        </div>
        
        {checkedInCustomers.length > 0 && (
          <button
            onClick={handleCheckOutAll}
            disabled={loading}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
            {t('checkOut.checkOutAll')}
          </button>
        )}
      </div>

      {/* Live Member Count */}
      <div className={clsx(
        "flex items-center gap-5 p-5 rounded-2xl border transition-all",
        checkedInCustomers.length > 0
          ? "bg-green-500/10 border-green-500/30 shadow-lg shadow-green-500/10"
          : "bg-dark-200/40 border-gray-700/50"
      )}>
        <div className="relative flex-shrink-0">
          <div className={clsx(
            "w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black text-white shadow-xl select-none",
            checkedInCustomers.length > 0
              ? "bg-gradient-to-br from-green-400 to-emerald-600 shadow-green-500/40"
              : "bg-gradient-to-br from-gray-600 to-gray-700 shadow-gray-700/30"
          )}>
            {loading && checkedInCustomers.length === 0 ? '…' : checkedInCustomers.length}
          </div>
          {checkedInCustomers.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-green-400 border-2 border-dark-100 animate-pulse" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-white leading-tight">
            {checkedInCustomers.length === 1 ? 'Member Inside' : 'Members Inside'}
          </p>
          <p className={clsx("text-sm mt-1", checkedInCustomers.length > 0 ? "text-green-400" : "text-gray-500")}>
            {checkedInCustomers.length > 0
              ? `${checkedInCustomers.length} ${checkedInCustomers.length === 1 ? 'person is' : 'people are'} in the gym right now · live`
              : 'Gym is currently empty'}
          </p>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl animate-slide-up">
          <CheckCircle className="w-6 h-6 text-green-400" />
          <span className="text-green-400 font-medium">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-slide-up">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Search */}
      {checkedInCustomers.length > 0 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('checkOut.searchPlaceholder')}
            className="w-full pl-12 pr-4 py-3 bg-dark-200 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-gym-500 focus:outline-none transition-colors"
          />
        </div>
      )}

      {/* Customers List */}
      {filteredCustomers.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedCustomers).map(( [groupName, customers]) => {
            if (customers.length === 0) return null;
            
            return (
              <div key={groupName} className="space-y-3">
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                  {groupName} ({customers.length})
                </h2>
                
                <div className="space-y-2">
                  {customers.map((log) => (
                    <div
                      key={log.id}
                      className="card p-4 flex flex-col gap-3"
                    >
                      {/* Top row: avatar + info + duration */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-gym-500 to-gym-700 flex-shrink-0 flex items-center justify-center text-lg font-bold text-white">
                          {log.photo ? (
                            <img src={log.photo} alt={log.customer_name || log.customer?.name} className="w-full h-full object-cover" />
                          ) : (
                            (log.customer_name || log.customer?.name || '?').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold leading-tight">{log.customer_name || log.customer?.name || t('checkOut.unknown')}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                              {log.customer_phone || log.customer?.phone || t('checkOut.noPhone')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                              {t('checkOut.checkedInAt').replace('{time}', new Date(log.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))}
                            </span>
                          </div>
                        </div>
                        {/* Duration badge */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-500">{t('checkOut.duration')}</p>
                          <p className="text-base font-bold text-white">{formatDuration(new Date(log.check_in))}</p>
                        </div>
                      </div>

                      {/* Full-width check-out button */}
                      <button
                        onClick={() => handleCheckOut(log.customer_id)}
                        disabled={actionLoading === log.customer_id || !subscription?.valid}
                        className={clsx(
                          "w-full flex items-center justify-center gap-2 py-3 font-semibold rounded-xl transition-colors shadow-lg text-sm",
                          subscription?.valid
                            ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
                            : "bg-gray-700 text-gray-400 cursor-not-allowed"
                        )}
                      >
                        {actionLoading === log.customer_id ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <>
                            <LogOut className="w-4 h-4" />
                            {t('checkOut.checkOut')}
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : checkedInCustomers.length > 0 ? (
        <div className="card p-12 text-center">
          <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-300 font-medium">{t('checkOut.noMatches')}</p>
          <p className="text-gray-500 text-sm mt-1">{t('checkOut.tryDifferent')}</p>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-dark-300 flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-gray-500" />
          </div>
          <p className="text-gray-300 font-medium text-lg">{t('checkOut.noneCheckedIn')}</p>
          <p className="text-gray-500 text-sm mt-2">{t('checkOut.allCheckedOutMsg')}</p>

          <Link
            to="/check-in"
            className="btn-primary inline-flex items-center gap-2 mt-6"
          >
            {t('checkOut.goToCheckIn')}
          </Link>
        </div>
      )}
    </div>
  );
}

// Helper component for phone icon (lucide doesn't have one by default)
function Phone(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || 24}
      height={props.size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

// Helper function to format duration
function formatDuration(checkInTime) {
  const now = new Date();
  const diff = now - checkInTime;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}