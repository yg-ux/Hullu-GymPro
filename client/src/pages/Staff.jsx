import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../utils/api';
import {
  Search,
  Plus,
  X,
  User,
  Users,
  Mail,
  Shield,
  Clock,
  Edit,
  Trash2,
  UserCheck,
  Building,
  ChevronDown,
  Phone,
  Briefcase,
  Calendar,
} from 'lucide-react';
import clsx from 'clsx';
import PageHint from '../components/PageHint';

// Role configuration
const ROLES = {
  admin: {
    labelKey: 'staff.roleAdmin',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: Shield,
    permissions: ['full']
  },
  manager: {
    labelKey: 'staff.roleManager',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: Building,
    permissions: ['customers', 'staff', 'reports', 'settings']
  },
  trainer: {
    labelKey: 'staff.roleTrainer',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: UserCheck,
    permissions: ['customers']
  },
  receptionist: {
    labelKey: 'staff.roleReceptionist',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: User,
    permissions: ['checkin']
  }
};

// Mock staff data (in production this would come from API)
const mockStaff = [
  {
    id: 1,
    name: 'Mekdes Tadesse',
    email: 'mekdes@hullugym.com',
    phone: '+251911234567',
    role: 'admin',
    status: 'active',
    last_login: '2026-06-04T10:30:00Z',
    created_at: '2025-01-15T08:00:00Z'
  },
  {
    id: 2,
    name: 'Tigist Haile',
    email: 'tigist@hullugym.com',
    phone: '+251912345678',
    role: 'manager',
    status: 'active',
    last_login: '2026-06-04T09:15:00Z',
    created_at: '2025-03-20T08:00:00Z'
  },
  {
    id: 3,
    name: 'Abebe Kebede',
    email: 'abebe@hullugym.com',
    phone: '+251913456789',
    role: 'trainer',
    status: 'active',
    last_login: '2026-06-03T16:45:00Z',
    created_at: '2025-06-10T08:00:00Z'
  },
  {
    id: 4,
    name: 'Selamawit Solomon',
    email: 'selam@hullugym.com',
    phone: '+251914567890',
    role: 'receptionist',
    status: 'active',
    last_login: '2026-06-04T08:00:00Z',
    created_at: '2025-08-01T08:00:00Z'
  },
  {
    id: 5,
    name: 'Daniel Girma',
    email: 'daniel@hullugym.com',
    phone: '+251915678901',
    role: 'trainer',
    status: 'inactive',
    last_login: '2026-05-28T14:00:00Z',
    created_at: '2025-02-14T08:00:00Z'
  }
];

function formatLastLogin(dateString, t) {
  if (!dateString) return t('staff.lastLoginNever');
  const date = new Date(dateString);
  if (isNaN(date)) return t('staff.lastLoginNever');
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return t('staff.lastLoginMinutes').replace('{n}', diffMins);
  if (diffHours < 24) return t('staff.lastLoginHours').replace('{n}', diffHours);
  if (diffDays < 7) return t('staff.lastLoginDays').replace('{n}', diffDays);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Normalise API response — server stores username, client expects name/email
function normaliseStaff(member, fallbackName) {
  return {
    ...member,
    name: member.name || member.username || fallbackName,
    email: member.email || member.username || '',
    status: member.status || 'active',
  };
}

export default function Staff() {
  const { subscription } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useLanguage();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ open: false, staff: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState([]);

  // ── Employee Directory state ──────────────────────────────────────────────
  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [empModal, setEmpModal] = useState({ open: false, employee: null });
  const [empForm, setEmpForm] = useState({ name: '', phone: '', email: '', position: '', salary: '', start_date: '', notes: '', status: 'active' });
  const [empSaving, setEmpSaving] = useState(false);
  const [empDeleteModal, setEmpDeleteModal] = useState({ open: false, employee: null });

  useEffect(() => {
    loadStaff();
    loadEmployees();
  }, []);

  const loadStaff = async () => {
    try {
      const data = await api.get('/staff');
      setStaff((data.staff || []).map(m => normaliseStaff(m, t('staff.staffFallbackName'))));
      setLoading(false);
    } catch (error) {
      console.error('Failed to load staff:', error);
      // If Pro plan not active, show message
      setStaff([]);
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await api.get('/employees');
      setEmployees(data.employees || []);
    } catch { setEmployees([]); }
    finally { setEmpLoading(false); }
  };

  const openAddEmployee = () => {
    setEmpForm({ name: '', phone: '', email: '', position: '', salary: '', start_date: '', notes: '', status: 'active' });
    setEmpModal({ open: true, employee: null });
  };

  const openEditEmployee = (emp) => {
    setEmpForm({
      name: emp.name || '', phone: emp.phone || '', email: emp.email || '',
      position: emp.position || '', salary: emp.salary || '', start_date: emp.start_date || '',
      notes: emp.notes || '', status: emp.status || 'active',
    });
    setEmpModal({ open: true, employee: emp });
  };

  const saveEmployee = async () => {
    if (!empForm.name.trim()) { toast.error('Name is required'); return; }
    setEmpSaving(true);
    try {
      if (empModal.employee) {
        const updated = await api.put(`/employees/${empModal.employee.id}`, empForm);
        setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
        toast.success('Employee updated');
      } else {
        const newEmp = await api.post('/employees', empForm);
        setEmployees(prev => [...prev, newEmp]);
        toast.success(`${empForm.name} added to directory`);
      }
      setEmpModal({ open: false, employee: null });
    } catch (err) {
      toast.error(err.message || 'Failed to save employee');
    } finally { setEmpSaving(false); }
  };

  const deleteEmployee = async (emp) => {
    try {
      await api.delete(`/employees/${emp.id}`);
      setEmployees(prev => prev.filter(e => e.id !== emp.id));
      setEmpDeleteModal({ open: false, employee: null });
      toast.success(`${emp.name} removed`);
    } catch (err) {
      toast.error(err.message || 'Failed to remove employee');
    }
  };

  const filteredStaff = staff.filter(member => {
    const matchesSearch = !search || 
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleDelete = async (staffMember) => {
    try {
      setDeleteLoading(true);
      await api.delete(`/staff/${staffMember.id}`);
      setStaff(prev => prev.filter(s => s.id !== staffMember.id));
      setDeleteModal({ open: false, staff: null });
      toast.success(t('staff.toastRemoved').replace('{name}', staffMember.name));
    } catch (error) {
      toast.error(error.message || t('staff.toastDeleteFailed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedStaff.length === filteredStaff.length) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff(filteredStaff.map(s => s.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedStaff(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
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
        <PageHint id="staff">
          Click Add Staff and fill in the name, phone, and role — staff log in with their username and the password you set. Roles: Receptionist handles check-in and member lookup; Trainer adds attendance view; Manager gets full access except billing settings; Owner has no restrictions. To reset a forgotten password, click the key icon next to a staff member's name. To track salaries as an expense, go to Expenses → Monthly Bills and add a recurring bill under the Salaries category.
        </PageHint>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {t('staff.title')}
              <span className="ml-2 text-lg font-normal text-gray-400">({filteredStaff.length})</span>
            </h1>
            <p className="text-gray-400 mt-1">
              {t('staff.subtitle')}
            </p>
          </div>
          <Link
            to="/staff/new"
            className="btn-primary inline-flex items-center gap-2 shadow-lg shadow-gym-500/30"
          >
            <Plus className="w-5 h-5" />
            {t('staff.addStaffMember')}
          </Link>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 group">
            <div className="absolute inset-0 bg-gradient-to-r from-gym-500 to-purple-500 rounded-xl blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('staff.searchPlaceholder')}
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

          {/* Role Filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field pr-8 appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="all">{t('staff.allRoles')}</option>
              {Object.entries(ROLES).map(([key, role]) => (
                <option key={key} value={key}>{t(role.labelKey)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field pr-8 appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="all">{t('staff.allStatus')}</option>
              <option value="active">{t('staff.statusActive')}</option>
              <option value="inactive">{t('staff.statusInactive')}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: 'all', label: t('staff.statTotal'), icon: User, color: 'from-gym-500 to-purple-500' },
            { key: 'admin', label: t('staff.statAdmins'), icon: Shield, color: 'from-purple-500 to-pink-500' },
            { key: 'trainer', label: t('staff.statTrainers'), icon: UserCheck, color: 'from-green-500 to-emerald-500' },
            { key: 'receptionist', label: t('staff.statReception'), icon: Building, color: 'from-yellow-500 to-orange-500' }
          ].map(stat => {
            const count = stat.key === 'all' 
              ? staff.length 
              : staff.filter(s => s.role === stat.key).length;
            
            return (
              <button
                key={stat.key}
                onClick={() => setRoleFilter(stat.key === 'all' ? 'all' : stat.key)}
                className={clsx(
                  "glass-card p-4 text-left transition-all duration-300 hover:scale-[1.02]",
                  roleFilter === (stat.key === 'all' ? 'all' : stat.key) 
                    ? "ring-2 ring-gym-500/50" : ""
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                    stat.color
                  )}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bulk Actions Bar */}
        {selectedStaff.length > 0 && (
          <div className="glass-card p-4 flex items-center justify-between animate-slide-down">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gym-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-gym-400" />
              </div>
              <span className="text-white font-medium">{selectedStaff.length} {t('staff.selected')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg transition-all">
                {t('staff.changeRole')}
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-lg font-medium hover:shadow-lg transition-all">
                {t('staff.deactivate')}
              </button>
              <button 
                onClick={() => setSelectedStaff([])}
                className="p-2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Staff Grid/List */}
        {filteredStaff.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-dark-200 flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">{t('staff.noStaffFound')}</h3>
            <p className="text-gray-400 mb-6">
              {search || roleFilter !== 'all' || statusFilter !== 'all'
                ? t('staff.tryAdjustingFilters')
                : t('staff.startByAdding')}
            </p>
            {!search && roleFilter === 'all' && statusFilter === 'all' && (
              <Link to="/staff/new" className="btn-primary inline-flex items-center gap-2 shadow-lg">
                <Plus className="w-5 h-5" />
                {t('staff.addStaffMember')}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {filteredStaff.map((member) => (
              <StaffCard
                key={member.id}
                member={member}
                roles={ROLES}
                selected={selectedStaff.includes(member.id)}
                onSelect={() => toggleSelect(member.id)}
                onEdit={() => navigate(`/staff/${member.id}/edit`)}
                onDelete={() => setDeleteModal({ open: true, staff: member })}
                formatLastLogin={(d) => formatLastLogin(d, t)}
                t={t}
              />
            ))}
          </div>
        )}

        {/* ── Employee Directory ─────────────────────────────────────────────── */}
        <div className="glass-card p-6">
          <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-gym-400" />
                Employee Directory
                {!empLoading && (
                  <span className="text-sm font-normal text-gray-500">({employees.length})</span>
                )}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">Track your staff without giving them system access</p>
            </div>
            <button onClick={openAddEmployee} className="btn-primary inline-flex items-center gap-2 text-sm flex-shrink-0">
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </div>

          {empLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-14 bg-dark-200/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-dark-200 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-gray-600" />
              </div>
              <p className="text-gray-400 text-sm font-medium">No employees yet</p>
              <p className="text-gray-600 text-xs mt-1">Add trainers, cleaners, security — anyone you want to keep a record of</p>
              <button onClick={openAddEmployee} className="mt-4 btn-primary inline-flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" />
                Add First Employee
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/40">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-start gap-3 py-3.5">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gym-500/15 flex items-center justify-center flex-shrink-0 text-sm font-bold text-gym-400 mt-0.5">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{emp.name}</p>
                      {emp.position && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-dark-300 text-gray-400">{emp.position}</span>
                      )}
                      {emp.status === 'inactive' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-500">Inactive</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                      {emp.phone && (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</span>
                      )}
                      {emp.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Since {new Date(emp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                      {emp.salary && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          ETB {parseFloat(emp.salary).toLocaleString()}/mo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions — always visible (no hover-only on mobile) */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditEmployee(emp)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-dark-200 rounded-lg transition-colors"
                      aria-label="Edit employee"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEmpDeleteModal({ open: true, employee: emp })}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      aria-label="Delete employee"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModal.open && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setDeleteModal({ open: false, staff: null })} />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="glass-card p-6 max-w-md w-full animate-scale-in">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{t('staff.deleteStaffMember')}</h3>
                    <p className="text-sm text-gray-400">{t('staff.deleteCannotUndo')}</p>
                  </div>
                </div>
                <p className="text-gray-300 mb-6">
                  {t('staff.deleteConfirmStart')} <span className="font-semibold text-white">{deleteModal.staff?.name}</span>{t('staff.deleteConfirmEnd')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal({ open: false, staff: null })}
                    disabled={deleteLoading}
                    className="flex-1 px-4 py-2.5 bg-dark-200 text-white rounded-lg font-medium hover:bg-dark-300 transition-all disabled:opacity-50"
                  >
                    {t('staff.cancel')}
                  </button>
                  <button
                    onClick={() => handleDelete(deleteModal.staff)}
                    disabled={deleteLoading}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {deleteLoading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {t('staff.deleting')}
                      </>
                    ) : t('staff.delete')}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        {/* Employee Add / Edit Modal */}
        {empModal.open && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setEmpModal({ open: false, employee: null })} />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="glass-card p-6 max-w-md w-full animate-scale-in max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-white mb-5">
                  {empModal.employee ? 'Edit Employee' : 'Add Employee'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Full Name *</label>
                    <input
                      type="text"
                      value={empForm.name}
                      onChange={e => setEmpForm(p => ({ ...p, name: e.target.value }))}
                      className="input-field w-full"
                      placeholder="e.g. Abebe Bekele"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Position / Job Title</label>
                    <input
                      type="text"
                      value={empForm.position}
                      onChange={e => setEmpForm(p => ({ ...p, position: e.target.value }))}
                      className="input-field w-full"
                      placeholder="e.g. Personal Trainer, Cleaner, Security"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1.5 block">Phone</label>
                      <input
                        type="tel"
                        value={empForm.phone}
                        onChange={e => setEmpForm(p => ({ ...p, phone: e.target.value }))}
                        className="input-field w-full"
                        placeholder="09..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1.5 block">Start Date</label>
                      <input
                        type="date"
                        value={empForm.start_date}
                        onChange={e => setEmpForm(p => ({ ...p, start_date: e.target.value }))}
                        className="input-field w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1.5 block">Monthly Salary (ETB)</label>
                      <input
                        type="number"
                        value={empForm.salary}
                        onChange={e => setEmpForm(p => ({ ...p, salary: e.target.value }))}
                        className="input-field w-full"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1.5 block">Email</label>
                      <input
                        type="email"
                        value={empForm.email}
                        onChange={e => setEmpForm(p => ({ ...p, email: e.target.value }))}
                        className="input-field w-full"
                        placeholder="optional"
                      />
                    </div>
                  </div>
                  {empModal.employee && (
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1.5 block">Status</label>
                      <select
                        value={empForm.status}
                        onChange={e => setEmpForm(p => ({ ...p, status: e.target.value }))}
                        className="input-field w-full"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1.5 block">Notes</label>
                    <textarea
                      value={empForm.notes}
                      onChange={e => setEmpForm(p => ({ ...p, notes: e.target.value }))}
                      className="input-field w-full resize-none"
                      rows={2}
                      placeholder="Any additional info..."
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setEmpModal({ open: false, employee: null })}
                    className="flex-1 px-4 py-2.5 bg-dark-200 text-white rounded-xl font-medium hover:bg-dark-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEmployee}
                    disabled={empSaving}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {empSaving ? 'Saving...' : empModal.employee ? 'Save Changes' : 'Add Employee'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Employee Delete Modal */}
        {empDeleteModal.open && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setEmpDeleteModal({ open: false, employee: null })} />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="glass-card p-6 max-w-sm w-full animate-scale-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Remove Employee</h3>
                    <p className="text-sm text-gray-400">This cannot be undone</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm mb-5">
                  Remove <span className="font-semibold text-white">{empDeleteModal.employee?.name}</span> from the directory?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEmpDeleteModal({ open: false, employee: null })}
                    className="flex-1 px-4 py-2.5 bg-dark-200 text-white rounded-xl font-medium hover:bg-dark-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteEmployee(empDeleteModal.employee)}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-all"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
  );
}

function StaffCard({ member, roles, selected, onSelect, onEdit, onDelete, formatLastLogin, t }) {
  const [isHovered, setIsHovered] = useState(false);
  const roleConfig = roles[member.role] || roles.admin;
  const RoleIcon = roleConfig.icon;

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        "glass-card p-5 transition-all duration-300 relative",
        selected ? "border-gym-500 ring-2 ring-gym-500/30" : "hover:border-gym-500/50",
        member.status === 'inactive' && "opacity-70"
      )}
    >
      {/* Selection Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className={clsx(
          "absolute top-4 right-4 p-2 rounded-lg transition-all z-10",
          selected 
            ? "bg-gym-500 text-white" 
            : "bg-dark-200 text-gray-400 hover:text-white"
        )}
      >
        {selected ? (
          <div className="w-5 h-5 flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-5 h-5 border-2 border-current rounded" />
        )}
      </button>

      {/* Gradient Background on Hover */}
      <div className={clsx(
        "absolute inset-0 bg-gradient-to-br from-gym-500/5 to-purple-500/5 transition-opacity duration-300",
        isHovered ? "opacity-100" : "opacity-0"
      )} />

      <div className="relative">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative">
            <div className={clsx(
              "w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg transition-all duration-300",
              member.status === 'active' 
                ? "bg-gradient-to-br from-gym-500 to-purple-600" 
                : "bg-gradient-to-br from-gray-500 to-gray-600"
            )}>
              {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            
            {/* Status Indicator */}
            <div className={clsx(
              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-dark-100",
              member.status === 'active' ? "bg-green-500 animate-pulse" : "bg-gray-500"
            )} />
          </div>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-white text-center mb-1 truncate w-full">{member.name}</h3>
        
        {/* Email */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-3">
          <Mail className="w-4 h-4" />
          <span className="truncate max-w-[180px]">{member.email}</span>
        </div>

        {/* Role Badge */}
        <div className="flex justify-center mb-4">
          <span className={clsx(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium border",
            roleConfig.color
          )}>
            <RoleIcon className="w-4 h-4" />
            {t(roleConfig.labelKey)}
          </span>
        </div>

        {/* Last Login */}
        <div className="w-full pt-3 border-t border-gray-800/50">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">{t('staff.lastSeen')} </span>
            <span className="text-gray-300">{formatLastLogin(member.last_login)}</span>
          </div>
        </div>

        {/* Quick Actions on Hover */}
        <div className={clsx(
          "flex justify-center gap-2 mt-4 pt-4 border-t border-gray-800/50 transition-all duration-300",
          isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}>
          <button 
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all hover:scale-105"
          >
            <Edit className="w-3 h-3" />
            {t('staff.edit')}
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-200 text-gray-300 text-xs font-medium rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all hover:scale-105"
          >
            <Trash2 className="w-3 h-3" />
            {t('staff.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}