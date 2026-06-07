import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  Key,
  Eye,
  EyeOff,
  Shuffle,
  Send,
  AlertCircle,
  Building,
  UserCheck,
  Lock
} from 'lucide-react';
import clsx from 'clsx';

// Role configuration with descriptions
const ROLES = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access to all features including billing, staff management, and settings',
    icon: Shield,
    color: 'from-purple-500 to-pink-500'
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Can manage customers, staff, and view reports. No access to billing.',
    icon: Building,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    value: 'trainer',
    label: 'Trainer',
    description: 'Can only view and manage customers assigned to them',
    icon: UserCheck,
    color: 'from-green-500 to-emerald-500'
  },
  {
    value: 'receptionist',
    label: 'Receptionist',
    description: 'Can only check-in and check-out customers',
    icon: Lock,
    color: 'from-yellow-500 to-orange-500'
  }
];

function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function AddStaff() {
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'receptionist',
    password: '',
    sendCredentials: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await api.post('/staff', {
        username: formData.email,
        email: formData.email,
        name: formData.name,
        phone: formData.phone || null,
        role: formData.role,
        password: formData.password,
      });

      toast.success(`${formData.name} has been added to your team`);
      setTimeout(() => navigate('/staff'), 1000);
    } catch (error) {
      toast.error(error.message || 'Failed to create staff member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          to="/staff" 
          className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-dark-100 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Add Staff Member</h1>
          <p className="text-gray-400 mt-1">Create a new team member account</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <User className="w-4 h-4" />
            Full Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter staff member's full name"
            className={clsx(
              "input-field",
              errors.name && "border-red-500 focus:border-red-500"
            )}
          />
          {errors.name && (
            <p className="text-red-400 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="staff@example.com"
            className={clsx(
              "input-field",
              errors.email && "border-red-500 focus:border-red-500"
            )}
          />
          {errors.email && (
            <p className="text-red-400 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Number <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+251 91 234 5678"
            className="input-field"
          />
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Role & Permissions
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ROLES.map(role => {
              const Icon = role.icon;
              const isSelected = formData.role === role.value;
              
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: role.value }))}
                  className={clsx(
                    "p-4 rounded-xl border transition-all duration-300 text-left",
                    isSelected
                      ? "border-gym-500 bg-gym-500/10 ring-2 ring-gym-500/30"
                      : "border-gray-800 bg-dark-100 hover:border-gray-700 hover:bg-dark-200"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={clsx(
                      "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0",
                      role.color
                    )}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={clsx(
                        "font-semibold transition-colors",
                        isSelected ? "text-white" : "text-gray-300"
                      )}>
                        {role.label}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {role.description}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 rounded-full bg-gym-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {errors.role && (
            <p className="text-red-400 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.role}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Key className="w-4 h-4" />
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter a secure password"
              className={clsx(
                "input-field pr-12",
                errors.password && "border-red-500 focus:border-red-500"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="text-sm text-gym-400 hover:text-gym-300 flex items-center gap-1 transition-colors"
          >
            <Shuffle className="w-4 h-4" />
            Auto-generate secure password
          </button>
          {errors.password && (
            <p className="text-red-400 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.password}
            </p>
          )}
        </div>

        {/* Send Credentials */}
        <div className="glass-card p-4 bg-dark-100/50 border border-gray-800/50">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="sendCredentials"
              checked={formData.sendCredentials}
              onChange={handleChange}
              className="mt-1 w-5 h-5 rounded border-gray-600 bg-dark-200 text-gym-500 focus:ring-gym-500 focus:ring-offset-dark-100"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-gym-400" />
                <span className="font-medium text-white">Send login credentials via email</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                The staff member will receive an email with their login details
              </p>
            </div>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-800/50">
          <Link 
            to="/staff" 
            className="flex-1 px-4 py-3 bg-dark-200 text-white rounded-xl font-medium text-center hover:bg-dark-300 transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 gradient-primary btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </div>
            ) : (
              'Create Staff Member'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}