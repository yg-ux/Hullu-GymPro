import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, MEMBERSHIP_TYPES, getMembershipDays } from '../utils/api';
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
  CheckCircle,
  DollarSign
} from 'lucide-react';

export default function AddCustomer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    membership_type: '1_month',
    amount: '',
    emergency_contact: '',
    notes: '',
  });
  
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      setError('Failed to load customer data');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Limit to 500KB for base64 storage
      if (file.size > 500 * 1024) {
        setError('Photo too large. Please use an image under 500KB.');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Convert photo to base64 if it's a file
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
        setSuccess('Customer updated successfully!');
      } else {
        submitData.membership_type = formData.membership_type;
        submitData.amount = formData.amount;
        const customer = await api.post('/customers', submitData);
        
        setSuccess('Customer added successfully!');
      }

      setTimeout(() => {
        navigate('/customers');
      }, 1500);
    } catch (error) {
      setError(error.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const membershipDays = getMembershipDays(formData.membership_type);
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

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg animate-slide-up">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-green-400">{success}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg animate-slide-up">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

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
            <p className="text-xs text-gray-500 mt-2">JPG, PNG, GIF up to 5MB</p>
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
                className="input-field pl-10"
                placeholder="Enter customer's full name"
                required
              />
            </div>
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
                  className="input-field pl-10"
                  placeholder="+251911234567"
                />
              </div>
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
                  className="input-field pl-10"
                  placeholder="email@example.com"
                />
              </div>
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

        {/* Membership & Payment - Only show for new customers, not edit mode */}
        {!isEditing && (
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Membership & Payment</h2>
            
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount Paid (ETB) <span className="text-yellow-400">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="input-field pl-10"
                    placeholder="Enter amount paid"
                    required
                    min="1"
                  />
                </div>
              </div>
            </div>

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
          </div>
        )}

        {/* Edit Mode Message - Membership Extension */}
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
              isEditing ? 'Save Changes' : 'Add Customer & Record Payment'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
