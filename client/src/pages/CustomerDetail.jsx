import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, getStatusColor, formatDate, formatDateTime, getMembershipLabel, MEMBERSHIP_TYPES, formatCurrency, getMembershipPrice, getPaymentMethodLabel } from '../utils/api';
import { resizeImage } from '../utils/imageUtils';
import { useToast } from '../context/ToastContext';
import { useAuth, useSubscriptionGate } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  X,
  Camera,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Clock,
  User,
  AlertTriangle,
  LogIn,
  LogOut,
  FileText,
  Wifi,
  WifiOff,
  Snowflake,
  Play,
  Printer,
  History,
  Receipt,
  Share2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import clsx from 'clsx';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const gate = useSubscriptionGate();
  const { t } = useLanguage();
  const canDelete = !['receptionist', 'trainer'].includes(user?.role);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [photoFullscreen, setPhotoFullscreen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Delete form state
  const [deleteCode, setDeleteCode] = useState('');
  
  // Notes inline edit state
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // Freeze form state
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeDays, setFreezeDays] = useState('');
  const [freezeReason, setFreezeReason] = useState('');
  const [freezeHistory, setFreezeHistory] = useState([]);
  const [freezeHistoryLoading, setFreezeHistoryLoading] = useState(false);

  // Portal link state
  const [portalToken, setPortalToken] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalCopied, setPortalCopied] = useState(false);

  // Extend form state
  const [extendMembershipType, setExtendMembershipType] = useState('1_month');
  const [extendDurationKey, setExtendDurationKey] = useState('1_month'); // for 3_days_week
  const [extendPaymentMethod, setExtendPaymentMethod] = useState('cash');
  const [customAmount, setCustomAmount] = useState('');
  const [totalDue, setTotalDue] = useState('');
  const [extendMode, setExtendMode] = useState('daily'); // 'daily' | 'upgrade' — only used for daily members

  const THREE_DAYS_DURATIONS = [
    { value: '1_month',  label: t('membership.monthly'),    sessions: 12  },
    { value: '2_months', label: '2 ' + t('customers.period'), sessions: 24  },
    { value: '3_months', label: t('membership.quarterly'),  sessions: 36  },
    { value: '6_months', label: '6 ' + t('customers.period'), sessions: 72  },
    { value: '1_year',   label: t('membership.yearly'),     sessions: 144 },
  ];
  
  useEffect(() => {
    loadCustomer();
    loadFreezeHistory();
    loadPortalToken();
  }, [id]);

  const loadPortalToken = async () => {
    try {
      const data = await api.get(`/portal/my/${id}`);
      setPortalToken(data.token ? data : null);
    } catch { setPortalToken(null); }
  };

  // Fetches (or lazily creates) the permanent portal link for members registered
  // before auto-generation was added
  const generatePortalLink = async () => {
    setPortalLoading(true);
    try {
      const data = await api.post(`/portal/generate/${id}`, {});
      setPortalToken(data);
      toast.success('Portal link ready!');
    } catch (err) { toast.error(err.message || 'Failed to load portal link'); }
    finally { setPortalLoading(false); }
  };

  const copyPortalLink = () => {
    if (!portalToken?.url) return;
    navigator.clipboard.writeText(portalToken.url).then(() => {
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 2000);
    });
  };

  const loadFreezeHistory = async () => {
    setFreezeHistoryLoading(true);
    try {
      const data = await api.get(`/customers/${id}/freezes`);
      setFreezeHistory(Array.isArray(data) ? data : []);
    } catch {
      setFreezeHistory([]);
    } finally {
      setFreezeHistoryLoading(false);
    }
  };

  const handleFreeze = async (e) => {
    e.preventDefault();
    if (!gate()) return;
    if (!freezeDays || parseInt(freezeDays) < 1) {
      toast.error(t('customers.toastEnterDay'));
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.post(`/customers/${id}/freeze`, {
        days: parseInt(freezeDays),
        reason: freezeReason || undefined,
      });
      setCustomer(res.customer);
      setShowFreezeModal(false);
      setFreezeDays('');
      setFreezeReason('');
      await loadFreezeHistory();
      toast.success(res.message || t('customers.toastFrozen'));
    } catch (error) {
      toast.error(error.message || t('customers.toastFreezeFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfreeze = async () => {
    if (!gate()) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/customers/${id}/unfreeze`, {});
      setCustomer(res.customer);
      toast.success(res.message || t('customers.toastUnfrozen'));
    } catch (error) {
      toast.error(error.message || t('customers.toastUnfreezeFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const loadCustomer = async () => {
    try {
      const data = await api.get(`/customers/${id}`);
      setCustomer(data);
      setNotesValue(data.notes || '');
      setExtendMembershipType(data.membership_type);
    } catch (error) {
      console.error('Failed to load customer:', error);
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      await api.put(`/customers/${id}`, { notes: notesValue });
      setCustomer(prev => ({ ...prev, notes: notesValue }));
      setEditingNotes(false);
      toast.success(t('customers.notesSaved'));
    } catch {
      toast.error(t('customers.notesSaveFailed'));
    } finally {
      setNotesSaving(false);
    }
  };

  const handleCheckIn = async () => {
    if (!gate()) return;
    try {
      setActionLoading(true);
      await api.post(`/customers/${id}/check-in`);
      await loadCustomer();
      toast.success(t('customers.toastCheckInSuccess'));
    } catch (error) {
      toast.error(error.message || t('customers.toastCheckInFailed2'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!gate()) return;
    try {
      setActionLoading(true);
      await api.post(`/customers/${id}/check-out`);
      await loadCustomer();
      toast.success(t('customers.toastCheckOutSuccess'));
    } catch (error) {
      toast.error(error.message || t('customers.toastCheckOutFailed2'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async (e) => {
    e.preventDefault();
    if (!gate()) return;
    try {
      setActionLoading(true);
      const amount = parseInt(customAmount) || 0;
      const td = totalDue ? parseFloat(totalDue) : null;
      await api.post('/payments', {
        customer_id: id,
        amount: amount,
        payment_method: extendPaymentMethod,
        membership_type: extendMembershipType,
        ...(extendMembershipType === '3_days_week' ? { duration_key: extendDurationKey } : {}),
        ...(td && td > amount ? { total_due: td } : {}),
      });
      await loadCustomer();
      setShowExtendModal(false);
      const msg = extendMembershipType === 'daily'
        ? t('customers.toastDailyAdded')
        : extendMembershipType === '3_days_week'
          ? t('customers.toastSessionsAdded')
          : t('customers.toastExtended');
      toast.success(msg);
    } catch (error) {
      toast.error(error.message || t('customers.toastExtendFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!gate()) return;
    try {
      setActionLoading(true);
      await api.delete(`/customers/${id}`, { delete_code: deleteCode });
      toast.success(t('customers.toastDeleted'));
      navigate('/customers');
    } catch (error) {
      toast.error(error.message || t('customers.toastDeleteFailed'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gym-500" />
      </div>
    );
  }

  if (!customer) return null;

  // Check if currently checked in
  const currentAttendance = customer.attendance?.find(a => !a.check_out);
  const isCheckedIn = !!currentAttendance;

  // Separate check-ins and check-outs for display
  const attendanceHistory = customer.attendance || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/customers" className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
          <p className="text-gray-400">{t('customers.detailSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {canDelete && (
            <Link to={`/customers/${id}/edit`} className="btn-secondary inline-flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              {t('common.edit')}
            </Link>
          )}
          {canDelete && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn-danger inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {t('common.delete')}
          </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="card p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Photo */}
              <div className="flex flex-col items-center">
                <div 
                  className="relative cursor-pointer group"
                  onClick={() => customer.photo && setPhotoFullscreen(true)}
                >
                  {customer.photo ? (
                    <img
                      src={customer.photo}
                      alt={customer.name}
                      className="w-32 h-32 rounded-2xl object-cover border-2 border-gray-700"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-gym-500 to-gym-700 flex items-center justify-center text-4xl font-bold text-white">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {customer.photo && (
                    <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
                <span className={clsx('status-badge mt-3', getStatusColor(customer.status))}>
                  {customer.status === 'expiring' ? t('customers.statusExpiringSoon')
                    : customer.status === 'active' ? t('customers.statusActive')
                    : customer.status === 'expired' ? t('customers.statusExpired')
                    : t('customers.statusInactive')}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem icon={Phone} label={t('customers.phone')} value={customer.phone || t('customers.notProvided')} />
                <InfoItem icon={Mail} label={t('customers.email')} value={customer.email || t('customers.notProvided')} />
                <InfoItem icon={Calendar} label={t('customers.memberSince')} value={formatDate(customer.membership_start)} />
                <InfoItem icon={Calendar} label={t('customers.membershipEnds')} value={formatDate(customer.membership_end)} highlight={customer.status === 'expiring'} />
                <InfoItem icon={CreditCard} label={t('customers.membershipType')} value={getMembershipLabel(customer.membership_type)} />
                {customer.emergency_contact && (
                  <InfoItem icon={Phone} label={t('customers.emergencyContact')} value={customer.emergency_contact} />
                )}
              </div>
            </div>

            {/* Notes — always visible with inline edit */}
            <div className="mt-6 pt-6 border-t border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-400">{t('customers.notes')}</span>
                </div>
                {!editingNotes && (
                  <button
                    onClick={() => { setNotesValue(customer.notes || ''); setEditingNotes(true); }}
                    className="flex items-center gap-1.5 text-xs text-gym-400 hover:text-gym-300 transition-colors px-2 py-1 rounded-lg hover:bg-gym-500/10"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {customer.notes ? t('customers.notesEdit') : t('customers.notesAdd')}
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notesValue}
                    onChange={e => setNotesValue(e.target.value)}
                    rows={4}
                    placeholder={t('customers.notesPlaceholder')}
                    className="w-full bg-dark-300 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-gym-500/60 transition-colors"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingNotes(false)}
                      className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-dark-300"
                    >
                      {t('customers.notesCancel')}
                    </button>
                    <button
                      onClick={handleSaveNotes}
                      disabled={notesSaving}
                      className="px-3 py-1.5 text-xs font-medium bg-gym-500 hover:bg-gym-400 text-white rounded-lg transition-colors disabled:opacity-60"
                    >
                      {notesSaving ? '...' : t('revenue.goalSave')}
                    </button>
                  </div>
                </div>
              ) : customer.notes ? (
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{customer.notes}</p>
              ) : (
                <p className="text-gray-500 text-sm italic">{t('customers.notesPlaceholder')}</p>
              )}
            </div>
          </div>

          {/* Membership Progress */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">{t('customers.membershipProgress')}</h2>

            {['3_days_week', 'daily'].includes(customer.membership_type) ? (() => {
              const used = customer.sessions_used || 0;
              const total = customer.total_sessions || 0;
              const remaining = Math.max(0, total - used);
              const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
              const isDaily = customer.membership_type === 'daily';
              const daysLeft = customer.days_until_expiry;
              return (
                <div className="space-y-4">
                  {/* Sessions progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-gray-400 text-sm">{isDaily ? t('customers.dailyPasses') : t('customers.sessions')} {t('customers.remainingLabel')}</p>
                        <p className={clsx(
                          'text-3xl font-bold',
                          remaining > 3 ? 'text-green-400' : remaining > 0 ? 'text-yellow-400' : 'text-red-400'
                        )}>
                          {remaining} <span className="text-lg font-normal text-gray-500">/ {total}</span>
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">{t('customers.used').replace('{n}', used)}</p>
                    </div>
                    <div className="relative h-3 bg-dark-300 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'absolute left-0 top-0 h-full rounded-full transition-all',
                          remaining > 3 ? 'bg-gradient-to-r from-green-500 to-green-400'
                            : remaining > 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                            : 'bg-gradient-to-r from-red-500 to-red-400'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Date expiry (3_days_week only) */}
                  {!isDaily && (
                    <div className="space-y-2 pt-2 border-t border-gray-800">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-gray-400 text-sm">{t('customers.daysRemaining')}</p>
                          <p className={clsx(
                            'text-2xl font-bold',
                            daysLeft > 7 ? 'text-green-400' : daysLeft > 0 ? 'text-yellow-400' : 'text-red-400'
                          )}>
                            {daysLeft > 0 ? daysLeft : 0} <span className="text-base font-normal text-gray-500">{t('customers.days')}</span>
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">{t('customers.endsOn').replace('{date}', formatDate(customer.membership_end))}</p>
                      </div>
                      <div className="relative h-2 bg-dark-300 rounded-full overflow-hidden">
                        {(() => {
                          const start = new Date(customer.membership_start);
                          const end = new Date(customer.membership_end);
                          const now = new Date();
                          const total = end - start;
                          const elapsed = now - start;
                          const p = Math.min(Math.max((elapsed / total) * 100, 0), 100);
                          return (
                            <div
                              className={clsx(
                                'absolute left-0 top-0 h-full rounded-full',
                                daysLeft > 7 ? 'bg-green-500' : daysLeft > 0 ? 'bg-yellow-500' : 'bg-red-500'
                              )}
                              style={{ width: `${p}%` }}
                            />
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {remaining <= 3 && remaining > 0 && (
                    <p className="text-xs text-yellow-400">{t('customers.warnFewLeft').replace('{n}', remaining).replace('{label}', isDaily ? t('customers.dailyPasses') : t('customers.sessions'))}</p>
                  )}
                  {remaining === 0 && (
                    <p className="text-xs text-red-400">{t('customers.warnNoneLeft').replace('{label}', isDaily ? t('customers.dailyPasses') : t('customers.sessions'))}</p>
                  )}
                  {!isDaily && daysLeft <= 7 && daysLeft > 0 && (
                    <p className="text-xs text-yellow-400">{t('customers.warnPeriodExpires').replace('{n}', daysLeft).replace('{s}', daysLeft !== 1 ? 's' : '')}</p>
                  )}
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t('customers.started').replace('{date}', formatDate(customer.membership_start))}</span>
                    <span className="text-gray-600">{isDaily ? t('customers.sessionTracked') : t('customers.threePerWeek')}</span>
                  </div>
                </div>
              );
            })() : (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">{t('customers.daysRemaining')}</span>
                  <span className={clsx(
                    "font-bold text-xl",
                    customer.days_until_expiry > 7 && "text-green-400",
                    customer.days_until_expiry > 0 && customer.days_until_expiry <= 7 && "text-yellow-400",
                    customer.days_until_expiry <= 0 && "text-red-400"
                  )}>
                    {customer.days_until_expiry > 0 ? customer.days_until_expiry : 0} {t('customers.days')}
                  </span>
                </div>
                <div className="relative h-4 bg-dark-300 rounded-full overflow-hidden">
                  {(() => {
                    const start = new Date(customer.membership_start);
                    const end = new Date(customer.membership_end);
                    const now = new Date();
                    const total = end - start;
                    const elapsed = now - start;
                    const progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);
                    return (
                      <div
                        className={clsx(
                          "absolute left-0 top-0 h-full rounded-full transition-all",
                          customer.status === 'active' && "bg-gradient-to-r from-green-500 to-green-400",
                          customer.status === 'expiring' && "bg-gradient-to-r from-yellow-500 to-yellow-400",
                          customer.status === 'expired' && "bg-gradient-to-r from-red-500 to-red-400"
                        )}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    );
                  })()}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{t('customers.started').replace('{date}', formatDate(customer.membership_start))}</span>
                  <span>{t('customers.expiresLabel')} {formatDate(customer.membership_end)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Check-in / Check-out Section */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">{t('customers.attendanceToday')}</h2>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Current Status */}
              <div className={clsx(
                "flex-1 p-4 rounded-xl border-2",
                isCheckedIn 
                  ? "bg-green-500/10 border-green-500/50" 
                  : "bg-gray-500/10 border-gray-500/50"
              )}>
                <div className="flex items-center gap-3 mb-2">
                  {isCheckedIn ? (
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-green-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                      <WifiOff className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-white">
                      {isCheckedIn ? t('customers.currentlyCheckedIn') : t('customers.notCheckedIn')}
                    </p>
                    {isCheckedIn && currentAttendance && (
                      <p className="text-sm text-green-400">
                        {t('customers.since').replace('{time}', new Date(currentAttendance.check_in).toLocaleTimeString())}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {isCheckedIn ? (
                  <button 
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="btn-secondary h-full flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <>
                        <LogOut className="w-5 h-5" />
                        {t('customers.checkOut')}
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                    className="btn-primary h-full flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        {t('customers.checkIn')}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Attendance History */}
            {attendanceHistory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3">{t('customers.recentAttendance')}</h3>
                <div className="space-y-2">
                  {attendanceHistory.slice(0, 5).map((log, index) => (
                    <div 
                      key={log.id}
                      className="flex items-center justify-between p-3 bg-dark-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {/* Date */}
                        <div className="text-center px-3 py-1 bg-dark-300 rounded-lg">
                          <p className="text-xs text-gray-400">
                            {new Date(log.check_in).toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                          <p className="text-lg font-bold text-white">
                            {new Date(log.check_in).getDate()}
                          </p>
                        </div>
                        
                        {/* Check-in Time */}
                        <div>
                          <div className="flex items-center gap-2">
                            <LogIn className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-gray-300">
                              {new Date(log.check_in).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          
                          {/* Check-out Time (Separate) */}
                          {log.check_out ? (
                            <div className="flex items-center gap-2 mt-1">
                              <LogOut className="w-4 h-4 text-red-400" />
                              <span className="text-sm text-gray-400">
                                {new Date(log.check_out).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-4 h-4 text-yellow-400" />
                              <span className="text-sm text-yellow-400">{t('customers.stillInGym')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Duration */}
                      {log.check_out && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{t('customers.duration')}</p>
                          <p className="text-sm text-gray-300">
                            {t('customers.minutesShort').replace('{n}', Math.round((new Date(log.check_out) - new Date(log.check_in)) / (1000 * 60)))}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Outstanding Debt Banner */}
          {(() => {
            const outstanding = (customer.payments || []).reduce((sum, p) => {
              if (p.total_due && p.total_due > p.amount) return sum + (p.total_due - p.amount);
              return sum;
            }, 0);
            if (outstanding <= 0) return null;
            return (
              <div className="card p-4 border border-orange-500/30 bg-orange-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-orange-400">{t('customers.outstandingDebt')}</p>
                      <p className="text-xs text-gray-400">{t('customers.outstandingDebtSub')}</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-orange-400">{formatCurrency(outstanding)}</span>
                </div>
              </div>
            );
          })()}

          {/* Payments History */}
          {customer.payments && customer.payments.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gym-400" />
                {t('customers.paymentHistory')}
              </h2>
              <div className="space-y-3">
                {customer.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-dark-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{formatCurrency(payment.amount)}</p>
                          {payment.total_due && payment.total_due > payment.amount && (
                            <span className="text-xs px-1.5 py-0.5 bg-orange-500/15 text-orange-400 rounded-md font-medium">
                              -{formatCurrency(payment.total_due - payment.amount)} {t('customers.debtLabel')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{formatDate(payment.payment_date)} · {getPaymentMethodLabel(payment.payment_method)}</p>
                      </div>
                    </div>
                    <a
                      href={`/receipt/${payment.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gym-500/10 border border-gym-500/20 text-gym-400 text-xs hover:bg-gym-500/20 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      {t('customers.receipt')}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Freeze History */}
          {(freezeHistory.length > 0 || freezeHistoryLoading) && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                {t('customers.freezeHistoryTitle')}
              </h2>
              {freezeHistoryLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-14 bg-dark-200 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {freezeHistory.map(f => (
                    <div key={f.id} className="flex items-start gap-3 p-3 bg-dark-200 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Snowflake className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          {t('customers.frozenFor')} <span className="font-semibold">{f.duration_days} {t('customers.daysLabel').replace('{s}', f.duration_days !== 1 ? 's' : '')}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(f.frozen_at)} → {formatDate(f.unfreeze_at)}
                          {f.created_by_name && ` · ${t('customers.byUser').replace('{name}', f.created_by_name)}`}
                        </p>
                        {f.reason && <p className="text-xs text-gray-400 mt-0.5 italic">"{f.reason}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Check-in/Check-out History */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">{t('customers.checkHistory')}</h2>
            {customer.attendance && customer.attendance.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {customer.attendance.slice(0, 10).map((log) => (
                  <div 
                    key={log.id}
                    className="flex items-center gap-3 p-3 bg-dark-200 rounded-lg"
                  >
                    <div className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      log.check_out ? "bg-red-500/20" : "bg-green-500/20"
                    )}>
                      {log.check_out ? (
                        <LogOut className="w-4 h-4 text-red-400" />
                      ) : (
                        <LogIn className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        {log.check_out ? t('customers.checkedOut') : t('customers.checkedIn')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDateTime(log.check_in)}
                        {log.check_out && ` - ${formatDateTime(log.check_out)}`}
                      </p>
                    </div>
                    {log.check_in && log.check_out && (
                      <span className="text-xs text-gray-500">
                        {Math.round((new Date(log.check_out) - new Date(log.check_in)) / 60000)}{t('time.minAbbrev')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('customers.noAttendanceHistory')}</p>
              </div>
            )}
</div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">{t('customers.quickActions')}</h2>
            <div className="space-y-3">
              <button
                onClick={() => { setExtendMode('daily'); setExtendMembershipType(customer.membership_type); setShowExtendModal(true); }}
                className="btn-primary w-full justify-center"
                disabled={customer.is_frozen}
              >
                <Calendar className="w-5 h-5" />
                {t('customers.extendMembership')}
              </button>

              {customer.is_frozen ? (
                <button
                  onClick={handleUnfreeze}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition-all text-sm font-medium"
                >
                  <Play className="w-4 h-4" />
                  {actionLoading ? t('customers.unfreezing') : t('customers.unfreezeMembership')}
                </button>
              ) : (
                <button
                  onClick={() => setShowFreezeModal(true)}
                  disabled={customer.status === 'expired'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-dark-300 border border-gray-700 text-gray-300 hover:border-blue-500/40 hover:text-blue-400 transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Snowflake className="w-4 h-4" />
                  {t('customers.freezeMembership')}
                </button>
              )}
            </div>
          </div>

          {/* Frozen status card */}
          {customer.is_frozen && (
            <div className="card p-5 border border-blue-500/30 bg-blue-500/5">
              <div className="flex items-start gap-3">
                <Snowflake className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-400">{t('customers.membershipFrozen')}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t('customers.frozenUntil')} <span className="text-white font-medium">{formatDate(customer.frozen_until)}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{t('customers.checkInDisabled')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Membership Info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">{t('customers.membershipSummary')}</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{t('customers.plan')}</span>
                <span className="text-white font-medium">{getMembershipLabel(customer.membership_type)}</span>
              </div>
              {customer.membership_start && customer.membership_end && !['daily'].includes(customer.membership_type) && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{t('customers.period')}</span>
                  <span className="text-white font-medium text-sm">
                    {new Date(customer.membership_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {customer.membership_type !== '3_days_week' && ' → ' + new Date(customer.membership_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {customer.membership_type === '3_days_week' && ' ' + t('customers.sessionTrackedShort')}
                  </span>
                </div>
              )}
              {customer.max_visits_per_week > 0 && (() => {
                const used = customer.visits_this_week || 0;
                const max = customer.max_visits_per_week;
                const remaining = Math.max(0, max - used);
                const limitReached = used >= max;
                return (
                  <div className="py-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400">{t('customers.weeklyVisits')}</span>
                      <span className={clsx(
                        'text-sm font-bold',
                        limitReached ? 'text-red-400' : 'text-yellow-400'
                      )}>
                        {t('customers.usedSlash').replace('{used}', used).replace('{max}', max)}
                        {!limitReached && (
                          <span className="text-gray-400 font-normal"> {t('customers.leftSuffix').replace('{n}', remaining)}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex gap-1.5 mb-1.5">
                      {Array.from({ length: max }, (_, i) => (
                        <div
                          key={i}
                          className={clsx(
                            'flex-1 h-2.5 rounded-full transition-all',
                            i < used ? 'bg-yellow-400' : 'bg-gray-700'
                          )}
                        />
                      ))}
                    </div>
                    {limitReached ? (
                      <p className="text-xs text-red-400">{t('customers.weeklyLimitReached')}</p>
                    ) : (
                      <p className="text-xs text-gray-500">{t('customers.visitsRemaining').replace('{n}', remaining).replace('{s}', remaining !== 1 ? 's' : '')}</p>
                    )}
                  </div>
                );
              })()}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{t('customers.statusLabel')}</span>
                <span className={clsx(
                  customer.status === 'active' && "text-green-400",
                  customer.status === 'expiring' && "text-yellow-400",
                  customer.status === 'expired' && "text-red-400"
                )}>
                  {customer.status === 'expiring' ? t('customers.statusExpiringSoon')
                    : customer.status === 'active' ? t('customers.statusActive')
                    : customer.status === 'expired' ? t('customers.statusExpired')
                    : t('customers.statusInactive')}
                </span>
              </div>
              {['3_days_week', 'daily'].includes(customer.membership_type) ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{customer.membership_type === 'daily' ? t('customers.passesLeft') : t('customers.sessionsLeft')}</span>
                    <span className={clsx(
                      "font-bold text-lg",
                      Math.max(0, (customer.total_sessions || 0) - (customer.sessions_used || 0)) > 3 && "text-green-400",
                      Math.max(0, (customer.total_sessions || 0) - (customer.sessions_used || 0)) > 0 && Math.max(0, (customer.total_sessions || 0) - (customer.sessions_used || 0)) <= 3 && "text-yellow-400",
                      Math.max(0, (customer.total_sessions || 0) - (customer.sessions_used || 0)) === 0 && "text-red-400"
                    )}>
                      {Math.max(0, (customer.total_sessions || 0) - (customer.sessions_used || 0))} / {customer.total_sessions || 0}
                    </span>
                  </div>
                  {customer.membership_type === '3_days_week' && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">{t('customers.colDaysLeft')}</span>
                      <span className={clsx(
                        "font-bold text-lg",
                        customer.days_until_expiry > 7 && "text-green-400",
                        customer.days_until_expiry > 0 && customer.days_until_expiry <= 7 && "text-yellow-400",
                        customer.days_until_expiry <= 0 && "text-red-400"
                      )}>
                        {customer.days_until_expiry > 0 ? customer.days_until_expiry : 0}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">{t('customers.colDaysLeft')}</span>
                  <span className={clsx(
                    "font-bold text-lg",
                    customer.days_until_expiry > 7 && "text-green-400",
                    customer.days_until_expiry > 0 && customer.days_until_expiry <= 7 && "text-yellow-400",
                    customer.days_until_expiry <= 0 && "text-red-400"
                  )}>
                    {customer.days_until_expiry > 0 ? customer.days_until_expiry : 0}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-400">{t('customers.totalPaid')}</span>
                <span className="text-gym-400 font-medium">
                  {formatCurrency(customer.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)}
                </span>
              </div>
              {/* Outstanding balance */}
              {(customer.outstanding_balance > 0) && (
                <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-red-400 text-sm font-medium">Outstanding Balance</span>
                  <span className="text-red-400 font-bold">{formatCurrency(customer.outstanding_balance)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Member Self-Service Portal */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-gym-400" />
              <h3 className="text-sm font-semibold text-white">Member Portal Link</h3>
            </div>
            <p className="text-xs text-gray-500">Share a personal link so the member can view their own membership status.</p>
            {portalToken ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-dark-200 rounded-lg border border-gray-700">
                  <ExternalLink className="w-3 h-3 text-gray-500 flex-shrink-0" />
                  <span className="text-xs text-gray-400 truncate flex-1">{portalToken.url}</span>
                </div>
                <button onClick={copyPortalLink} className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-gym-500/20 border border-gym-500/30 text-gym-400 rounded-lg text-xs hover:bg-gym-500/30 transition-colors">
                  {portalCopied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Link</>}
                </button>
              </div>
            ) : (
              <button onClick={generatePortalLink} disabled={portalLoading} className="w-full flex items-center justify-center gap-2 py-2 bg-gym-500/20 border border-gym-500/30 text-gym-400 rounded-lg text-sm hover:bg-gym-500/30 transition-colors">
                <Share2 className="w-4 h-4" />
                {portalLoading ? 'Loading...' : 'Get Portal Link'}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Photo Fullscreen Modal */}
      {photoFullscreen && customer.photo && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPhotoFullscreen(false)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors"
            onClick={() => setPhotoFullscreen(false)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={customer.photo}
            alt={customer.name}
            className="max-w-full max-h-full object-contain rounded-lg animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Extend Modal */}
      {showExtendModal && (
        <Modal onClose={() => setShowExtendModal(false)} title={
          customer.membership_type === 'daily' && extendMode === 'upgrade' ? t('customers.extendMembership')
          : customer.membership_type === 'daily' ? t('customers.addDailyPass')
          : customer.membership_type === '3_days_week' ? t('customers.addSessions')
          : t('customers.extendMembership')
        }>
          <form onSubmit={handleExtend} className="space-y-4">
            {/* Current status badge */}
            <div className={clsx(
              "p-4 rounded-xl border-2 text-center",
              customer.status === 'active' && "bg-green-500/10 border-green-500/50",
              customer.status === 'expiring' && "bg-yellow-500/10 border-yellow-500/50",
              customer.status === 'expired' && "bg-red-500/10 border-red-500/50"
            )}>
              {['3_days_week', 'daily'].includes(customer.membership_type) ? (
                <>
                  <p className={clsx(
                    "text-2xl font-bold",
                    (customer.total_sessions - customer.sessions_used) > 3 ? 'text-green-400'
                    : (customer.total_sessions - customer.sessions_used) > 0 ? 'text-yellow-400'
                    : 'text-red-400'
                  )}>
                    {t('customers.sessionsLeftNum').replace('{n}', Math.max(0, customer.total_sessions - customer.sessions_used))}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">{t('customers.usedOfTotal').replace('{used}', customer.sessions_used).replace('{total}', customer.total_sessions)}</p>
                </>
              ) : (
                <>
                  <p className={clsx(
                    "text-2xl font-bold",
                    customer.status === 'active' && "text-green-400",
                    customer.status === 'expiring' && "text-yellow-400",
                    customer.status === 'expired' && "text-red-400"
                  )}>
                    {customer.status === 'expiring' ? t('customers.statusExpiringSoon')
                      : customer.status === 'active' ? t('customers.statusActive')
                      : customer.status === 'expired' ? t('customers.statusExpired')
                      : t('customers.statusInactive')}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {customer.days_until_expiry > 0 ? t('customers.daysRemainingShort').replace('{n}', customer.days_until_expiry) : t('customers.expiredLabel')}
                  </p>
                </>
              )}
            </div>

            {/* Daily: toggle between "Add Daily Pass" and "Switch to Plan" */}
            {customer.membership_type === 'daily' && (
              <div className="flex rounded-lg overflow-hidden border border-gray-700">
                <button
                  type="button"
                  onClick={() => { setExtendMode('daily'); setExtendMembershipType('daily'); }}
                  className={clsx(
                    'flex-1 py-2 text-sm font-medium transition-colors border-r',
                    extendMode === 'daily'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-dark-200 text-gray-400 hover:text-gray-200 border-gray-700'
                  )}
                >
                  Add Daily Pass
                </button>
                <button
                  type="button"
                  onClick={() => { setExtendMode('upgrade'); setExtendMembershipType('1_month'); }}
                  className={clsx(
                    'flex-1 py-2 text-sm font-medium transition-colors',
                    extendMode === 'upgrade'
                      ? 'bg-gym-500/20 text-gym-400'
                      : 'bg-dark-200 text-gray-400 hover:text-gray-200'
                  )}
                >
                  Switch to Plan
                </button>
              </div>
            )}

            {/* Daily pass info — shown only when in daily mode */}
            {customer.membership_type === 'daily' && extendMode === 'daily' && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                <p className="text-amber-400 font-semibold text-lg">{t('customers.onePerPayment')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('customers.eachAddsSession')}</p>
              </div>
            )}

            {/* 3_days_week: duration selector */}
            {customer.membership_type === '3_days_week' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('customers.durationToAdd')}</label>
                <div className="space-y-2">
                  {THREE_DAYS_DURATIONS.map(opt => (
                    <label key={opt.value} className={clsx(
                      'flex items-center justify-between px-4 py-2.5 rounded-lg border cursor-pointer transition-all',
                      extendDurationKey === opt.value
                        ? 'border-gym-500 bg-gym-500/10 text-white'
                        : 'border-gray-700 bg-dark-200 text-gray-400 hover:border-gray-500'
                    )}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="extend_duration"
                          value={opt.value}
                          checked={extendDurationKey === opt.value}
                          onChange={() => setExtendDurationKey(opt.value)}
                          className="accent-gym-500"
                        />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </div>
                      <span className="text-sm font-bold text-gym-400">{t('customers.plusSessions').replace('{n}', opt.sessions)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Other types + daily-upgrade: membership type selector + summary */}
            {(!['daily', '3_days_week'].includes(customer.membership_type) || (customer.membership_type === 'daily' && extendMode === 'upgrade')) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{t('customers.membershipDuration')}</label>
                  <select
                    value={extendMembershipType}
                    onChange={(e) => setExtendMembershipType(e.target.value)}
                    className="input-field"
                  >
                    {MEMBERSHIP_TYPES.filter(t => !['daily', '3_days_week'].includes(t.value)).map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="p-4 bg-dark-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{t('customers.newEndDate')}</span>
                    <span className="text-white font-medium">
                      {(() => {
                        const currentEnd = new Date(customer.membership_end);
                        const today = new Date();
                        const startDate = currentEnd > today ? customer.membership_end : today.toISOString().split('T')[0];
                        const days = MEMBERSHIP_TYPES.find(t => t.value === extendMembershipType)?.days || 30;
                        const newEnd = new Date(new Date(startDate).getTime() + days * 24 * 60 * 60 * 1000);
                        return formatDate(newEnd.toISOString().split('T')[0]);
                      })()}
                    </span>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('customers.totalDueEtb')}</label>
              <input
                type="number"
                value={totalDue}
                onChange={(e) => setTotalDue(e.target.value)}
                placeholder={t('customers.totalDuePlaceholder')}
                className="input-field"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">{t('customers.totalDueHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('customers.paymentAmountEtb')}</label>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder={t('customers.enterAmount')}
                className="input-field"
                min="0"
              />
              {/* Debt summary */}
              {totalDue && customAmount && parseFloat(totalDue) > parseFloat(customAmount) && (
                <div className="mt-2 flex items-center gap-2 p-2.5 bg-orange-500/10 border border-orange-500/25 rounded-lg">
                  <span className="text-xs text-orange-400 font-medium">
                    {t('customers.debtRemaining')}: ETB {(parseFloat(totalDue) - parseFloat(customAmount)).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('customers.paymentMethod')}</label>
              <select
                value={extendPaymentMethod}
                onChange={(e) => setExtendPaymentMethod(e.target.value)}
                className="input-field"
              >
                <option value="cash">{t('customers.cash')}</option>
                <option value="mobile_transfer">{t('customers.mobileTransfer')}</option>
                <option value="bank_transfer">{t('customers.bankTransfer')}</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setShowExtendModal(false)} className="btn-secondary flex-1">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={actionLoading} className="btn-primary flex-1 bg-green-600 hover:bg-green-700 border-green-600">
                {actionLoading ? t('customers.processing') :
                  customer.membership_type === 'daily' && extendMode === 'upgrade' ? t('customers.payAndExtend')
                  : customer.membership_type === 'daily' ? t('customers.payAndAddPass')
                  : customer.membership_type === '3_days_week' ? t('customers.payAndAddSessions')
                  : t('customers.payAndExtend')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Freeze Modal */}
      {showFreezeModal && (
        <Modal onClose={() => setShowFreezeModal(false)} title={t('customers.freezeMembership')}>
          <form onSubmit={handleFreeze} className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/25 rounded-xl">
              <Snowflake className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-300 font-medium">{t('customers.pausesMembership')}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('customers.freezeExplain')}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('customers.freezeDuration')}</label>
              <input
                type="number"
                value={freezeDays}
                onChange={e => setFreezeDays(e.target.value)}
                placeholder={t('customers.freezeDaysPlaceholder')}
                className="input-field"
                min="1"
                max="365"
                required
              />
              {freezeDays && parseInt(freezeDays) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('customers.willUnfreezeOn').replace('{date}', new Date(Date.now() + parseInt(freezeDays) * 86400000)
                    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('customers.reason')} <span className="text-gray-600">{t('customers.optional')}</span></label>
              <input
                type="text"
                value={freezeReason}
                onChange={e => setFreezeReason(e.target.value)}
                placeholder={t('customers.reasonPlaceholder')}
                className="input-field"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowFreezeModal(false)} className="btn-secondary flex-1">
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={actionLoading || !freezeDays || parseInt(freezeDays) < 1}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 transition-all font-medium disabled:opacity-40"
              >
                <Snowflake className="w-4 h-4" />
                {actionLoading ? t('customers.freezing') : t('customers.freezeMembership')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal onClose={() => setShowDeleteModal(false)} title={t('customers.deleteCustomer')}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-red-400 font-medium">{t('customers.deleteWarning')}</p>
                <p className="text-sm text-gray-400">
                  {t('customers.deleteExplain').replace('{name}', customer.name)}
                </p>
              </div>
            </div>
            <form onSubmit={handleDelete} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('customers.securityCode')}</label>
                <input
                  type="password"
                  value={deleteCode}
                  onChange={(e) => setDeleteCode(e.target.value)}
                  className="input-field"
                  placeholder={t('customers.enterSecurityCode')}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{t('customers.defaultCode')}</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={actionLoading} className="btn-danger flex-1">
                  {actionLoading ? t('customers.deleting') : t('customers.deleteCustomer')}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={clsx("w-5 h-5 mt-0.5", highlight ? "text-yellow-400" : "text-gray-400")} />
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={clsx(
          "text-sm",
          highlight ? "text-yellow-400 font-medium" : "text-white"
        )}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-100 rounded-2xl border border-gray-800 w-full max-w-md p-6 animate-scale-in shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
