import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';
import {
  Search,
  Plus,
  X,
  User,
  Mail,
  Shield,
  Clock,
  Edit,
  Trash2,
  UserCheck,
  Building,
  ChevronDown
} from 'lucide-react';
import clsx from 'clsx';

// Role configuration
const ROLES = {
  admin: {
    label: 'Admin',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: Shield,
    permissions: ['full']
  },
  manager: {
    label: 'Manager',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: Building,
    permissions: ['customers', 'staff', 'reports', 'settings']
  },
  trainer: {
    label: 'Trainer',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: UserCheck,
    permissions: ['customers']
  },
  receptionist: {
    label: 'Receptionist',
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

function formatLastLogin(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  if (isNaN(date)) return 'Never';
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Normalise API response — server stores username, client expects name/email
function normaliseStaff(member) {
  return {
    ...member,
    name: member.name || member.username || 'Staff',
    email: member.email || member.username || '',
    status: member.status || 'active',
  };
}

export default function Staff() {
  const { subscription } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ open: false, staff: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState([]);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const data = await api.get('/staff');
      setStaff((data.staff || []).map(normaliseStaff));
      setLoading(false);
    } catch (error) {
      console.error('Failed to load staff:', error);
      // If Pro plan not active, show message
      setStaff([]);
      setLoading(false);
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
      toast.success(`${staffMember.name} has been removed`);
    } catch (error) {
      toast.error(error.message || 'Failed to delete staff member');
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Staff
              <span className="ml-2 text-lg font-normal text-gray-400">({filteredStaff.length})</span>
            </h1>
            <p className="text-gray-400 mt-1">
              Manage your team members and role-based access
            </p>
          </div>
          <Link 
            to="/staff/new" 
            className="btn-primary inline-flex items-center gap-2 shadow-lg shadow-gym-500/30"
          >
            <Plus className="w-5 h-5" />
            Add Staff Member
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
                placeholder="Search staff by name or email..."
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
              <option value="all">All Roles</option>
              {Object.entries(ROLES).map(([key, role]) => (
                <option key={key} value={key}>{role.label}</option>
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
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: 'all', label: 'Total', icon: User, color: 'from-gym-500 to-purple-500' },
            { key: 'admin', label: 'Admins', icon: Shield, color: 'from-purple-500 to-pink-500' },
            { key: 'trainer', label: 'Trainers', icon: UserCheck, color: 'from-green-500 to-emerald-500' },
            { key: 'receptionist', label: 'Reception', icon: Building, color: 'from-yellow-500 to-orange-500' }
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
              <span className="text-white font-medium">{selectedStaff.length} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:shadow-lg transition-all">
                Change Role
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black rounded-lg font-medium hover:shadow-lg transition-all">
                Deactivate
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
            <h3 className="text-lg font-medium text-white mb-2">No staff found</h3>
            <p className="text-gray-400 mb-6">
              {search || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Start by adding your first staff member'}
            </p>
            {!search && roleFilter === 'all' && statusFilter === 'all' && (
              <Link to="/staff/new" className="btn-primary inline-flex items-center gap-2 shadow-lg">
                <Plus className="w-5 h-5" />
                Add Staff Member
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
                formatLastLogin={formatLastLogin}
              />
            ))}
          </div>
        )}

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
                    <h3 className="text-lg font-semibold text-white">Delete Staff Member</h3>
                    <p className="text-sm text-gray-400">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-gray-300 mb-6">
                  Are you sure you want to delete <span className="font-semibold text-white">{deleteModal.staff?.name}</span>? 
                  They will lose access to the system immediately.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteModal({ open: false, staff: null })}
                    disabled={deleteLoading}
                    className="flex-1 px-4 py-2.5 bg-dark-200 text-white rounded-lg font-medium hover:bg-dark-300 transition-all disabled:opacity-50"
                  >
                    Cancel
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
                        Deleting...
                      </>
                    ) : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
  );
}

function StaffCard({ member, roles, selected, onSelect, onEdit, onDelete, formatLastLogin }) {
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
            {roleConfig.label}
          </span>
        </div>

        {/* Last Login */}
        <div className="w-full pt-3 border-t border-gray-800/50">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">Last seen: </span>
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
            Edit
          </button>
          <button 
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-200 text-gray-300 text-xs font-medium rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all hover:scale-105"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}