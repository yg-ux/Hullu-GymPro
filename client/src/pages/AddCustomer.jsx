import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, MEMBERSHIP_TYPES, getMembershipDays } from '../utils/api';
import { useToast } from '../context/ToastContext';
import clsx from 'clsx';
import {
  ArrowLeft,
  Upload,
  X,
  Camera,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  AlertCircle,
  DollarSign,
  Zap
} from 'lucide-react';

export default function AddCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    membership_type: '1_month',
    membership_duration: '1_month',
    amount: '',
    emergency_contact: '',
    notes: '',
  });

  const THREE_DAYS_DURATIONS = [
    { value: '1_month',  label: '1 Month  (3 days/week)',  days: 30  },
    { value: '2_months', label: '2 Months (3 days/week)',  days: 60  },
    { value: '3_months', label: '3 Months (3 days/week)',  days: 90  },
    { value: '6_months', label: '6 Months (3 days/week)',  days: 180 },
    { value: '1_year',   label: '1 Year   (3 days/week)',  days: 365 },
  ];

  const [fieldErrors, setFieldErrors] = useState({});
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadCustomer();
    }
  }, [id]);

  const loadCustomer = async () => {
    try {
      const customer = await api.get(`/customers/${id}`);
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        membership_type: customer.membership_type || '1_month',
        amount: customer.amount || '',
        emergency_contact: customer.emergency_contact || '',
        notes: customer.notes || '',
      });
      if (customer.photo) {
        setPhotoPreview(customer.photo);
      }
    } catch (error) {
      console.error('Failed to load customer:', error);
      toast.error('Failed to load customer data');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast.error('Photo too large. Please use an image under 1MB.');
        return;
      }
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const validate = () => {
    const errors = {};
    const name = formData.name.trim();
    const phone = formData.phone.trim();
    const email = formData.email.trim();
    const amount = formData.amount;

    if (!name) {
      errors.name = 'Name is required';
    } else if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (phone && phone.replace(/\D/g, '').length < 7) {
      errors.phone = 'Enter a valid phone number (at least 7 digits)';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Enter a valid email address';
    }

    if (!isEditing) {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        errors.amount = 'Amount must be greater than 0';
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the errors below');
      return;
    }

    setLoading(true);

    try {
      let photoData = null;
      if (photo && photo instanceof File) {
        photoData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(photo);
        });
      } else if (photoPreview && !photo) {
        photoData = photoPreview;
      }

      const submitData = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        emergency_contact: formData.emergency_contact || null,
        notes: formData.notes || null,
        photo: photoData,
      };

      if (isEditing) {
        await api.put(`/customers/${id}`, submitData);
        toast.success('Customer updated successfully!');
      } else {
        submitData.membership_type = formData.membership_type;
        submitData.amount = formData.amount;
        if (formData.membership_type === '3_days_week') {
          submitData.membership_duration = formData.membership_duration;
        }
        await api.post('/customers', submitData);
        toast.success('Customer added successfully!');
      }

      setTimeout(() => {
        navigate('/customers');
      }, 1000);
    } catch (error) {
      toast.error(error.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const is3DaysWeek = formData.membership_type === '3_days_week';
  const isDaily = formData.membership_type === 'daily';
  const membershipDays = is3DaysWeek
    ? (THREE_DAYS_DURATIONS.find(d => d.value === formData.membership_duration)?.days || 30)
    : getMembershipDays(formData.membership_type);
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + membershipDays * 24 * 60 * 60 * 1000);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={isEditing ? `/customers/${id}` : '/customers'} className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditing ? 'Edit Customer' : 'Add New Customer'}
          </h1>
          <p className="text-gray-400">
            {isEditing ? 'Update customer information' : 'Fill in the details to add a new member'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Customer Photo</h2>

          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-40 h-40 rounded-2xl object-cover border-2 border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-40 h-40 rounded-2xl bg-dark-200 border-2 border-dashed border-gray-700 flex flex-col items-center justify-center">
                  <Camera className="w-12 h-12 text-gray-500 mb-2" />
                  <span className="text-sm text-gray-500">No photo</span>
                </div>
              )}
            </div>

            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <span className="btn-secondary inline-flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {photoPreview ? 'Change Photo' : 'Upload Photo'}
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-2">JPG, PNG, GIF up to 1MB</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={clsx('input-field pl-10', fieldErrors.name && 'border-red-500 focus:ring-red-500')}
                placeholder="Enter customer's full name"
              />
            </div>
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={clsx('input-field pl-10', fieldErrors.phone && 'border-red-500 focus:ring-red-500')}
                  placeholder="+251911234567"
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={clsx('input-field pl-10', fieldErrors.email && 'border-red-500 focus:ring-red-500')}
                  placeholder="email@example.com"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.email}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Emergency Contact</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="emergency_contact"
                value={formData.emergency_contact}
                onChange={handleChange}
                className="input-field pl-10"
                placeholder="Name and phone number"
              />
            </div>
          </div>
        </div>

        {/* Membership & Payment - Only show for new customers */}
        {!isEditing && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Membership & Payment</h2>

            {/* Walk-in banner */}
            {isDaily && (
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 font-semibold">Walk-in / Daily Pass</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    This customer pays per visit. Their pass is valid <span className="text-white font-medium">today only</span>.
                    When they return, use <span className="text-white font-medium">Extend Membership</span> on their profile to record a new daily payment.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Membership Type</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    name="membership_type"
                    value={formData.membership_type}
                    onChange={handleChange}
                    className="input-field pl-10"
                  >
                    {MEMBERSHIP_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration selector — only shown for 3 days/week */}
                {is3DaysWeek && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Duration <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {THREE_DAYS_DURATIONS.map(opt => (
                        <label
                          key={opt.value}
                          className={clsx(
                            'flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-all',
                            formData.membership_duration === opt.value
                              ? 'border-gym-500 bg-gym-500/10 text-white'
                              : 'border-gray-700 bg-dark-200 text-gray-400 hover:border-gray-500'
                          )}
                        >
                          <input
                            type="radio"
                            name="membership_duration"
                            value={opt.value}
                            checked={formData.membership_duration === opt.value}
                            onChange={handleChange}
                            className="accent-gym-500"
                          />
                          <span className="text-sm font-medium">{opt.label}</span>
                          <span className="ml-auto text-xs text-gray-500">{opt.days} days</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount Paid (ETB) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className={clsx('input-field pl-10', fieldErrors.amount && 'border-red-500 focus:ring-red-500')}
                    placeholder="Enter amount paid"
                    min="1"
                  />
                </div>
                {fieldErrors.amount && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.amount}
                  </p>
                )}
              </div>
            </div>

            {/* Preview card */}
            {isDaily ? (
              <div className="p-4 bg-dark-200 rounded-lg border border-amber-500/30">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Valid On</p>
                    <p className="text-lg font-bold text-amber-400">{startDate.toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500">Today only</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Pass Type</p>
                    <p className="text-lg font-bold text-white">Daily</p>
                    <p className="text-xs text-gray-500">1 visit</p>
                  </div>
                </div>
                {formData.amount && (
                  <div className="mt-4 pt-4 border-t border-gray-700 text-center">
                    <p className="text-sm text-gray-400">Amount paid:</p>
                    <p className="text-2xl font-bold text-green-400">ETB {parseFloat(formData.amount || 0).toLocaleString()}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-dark-200 rounded-lg border border-gray-700">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Duration</p>
                    <p className="text-lg font-bold text-white">{membershipDays} days</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Start Date</p>
                    <p className="text-lg font-bold text-white">{startDate.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">End Date</p>
                    <p className="text-lg font-bold text-green-400">{endDate.toLocaleDateString()}</p>
                  </div>
                </div>
                {formData.amount && (
                  <div className="mt-4 pt-4 border-t border-gray-700 text-center">
                    <p className="text-sm text-gray-400">Amount paid: </p>
                    <p className="text-2xl font-bold text-green-400">ETB {parseFloat(formData.amount || 0).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Edit Mode Message */}
        {isEditing && (
          <div className="card p-6">
            <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-400 font-medium">To extend membership, go to customer detail and click Extend</p>
                <p className="text-sm text-gray-400 mt-1">Membership dates and payment cannot be modified here.</p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Additional Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="input-field pl-10 h-32 resize-none"
                placeholder="Any special requirements, medical conditions, preferences..."
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            to={isEditing ? `/customers/${id}` : '/customers'}
            className="btn-secondary flex-1 justify-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 justify-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isEditing ? 'Updating...' : 'Adding...'}
              </span>
            ) : (
              isEditing ? 'Save Changes' : isDaily ? 'Register Walk-in & Record Payment' : 'Add Customer & Record Payment'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
