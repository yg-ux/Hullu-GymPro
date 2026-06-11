const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  } else if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
    config.body = options.body;
  }

  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, config);
  
  // Check response type first
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  
  // Read response body
  let data;
  try {
    if (isJson) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error('Non-JSON response:', text.substring(0, 200));
      throw new Error(`[${response.status}] Server returned non-JSON: ${text.substring(0, 200)}`);
    }
  } catch (e) {
    console.error('API Error:', e.message);
    if (e.message.includes(`[${response.status}]`)) {
      throw e;
    }
    throw new Error(`[${response.status}] ${e.message}`);
  }
  
  if (!response.ok) {
    // Fire global gate modal when the server blocks a write due to expired subscription
    if (response.status === 403 && data?.subscription_valid === false) {
      window.dispatchEvent(new CustomEvent('subscription-expired'));
    }
    throw new Error(data?.error || data?.details || data?.message || `Request failed`);
  }

  return data;
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: body }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: body }),
  delete: (endpoint, body) => request(endpoint, { method: 'DELETE', body: body }),
  upload: (endpoint, formData) => request(endpoint, { method: 'POST', body: formData }),
};

export const MEMBERSHIP_TYPES = [
  { value: 'daily', label: 'Daily (Walk-in)', days: 1 },
  { value: '1_month', label: '1 Month', days: 30 },
  { value: '2_months', label: '2 Months', days: 60 },
  { value: '3_months', label: '3 Months', days: 90 },
  { value: '6_months', label: '6 Months', days: 180 },
  { value: '1_year', label: '1 Year', days: 365 },
  { value: '3_days_week', label: '3 Days/Week', days: 30, max_visits_per_week: 3 },
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mobile_transfer', label: 'Mobile Transfer' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

export const getPaymentMethodLabel = (value) => {
  const method = PAYMENT_METHODS.find(m => m.value === value);
  if (method) return method.label;
  // Fallback: prettify raw value (mobile_money → Mobile Money)
  if (!value) return 'Cash';
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export const getStatusColor = (status) => {
  const colors = {
    active: 'status-active',
    expiring: 'status-expiring',
    expired: 'status-expired',
    inactive: 'status-inactive',
    frozen: 'status-frozen',
  };
  return colors[status] || 'status-inactive';
};

export const getStatusLabel = (status) => {
  const labels = {
    active: 'Active',
    expiring: 'Expiring Soon',
    expired: 'Expired',
    inactive: 'Inactive',
  };
  return labels[status] || status;
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getMembershipLabel = (type) => {
  const membership = MEMBERSHIP_TYPES.find(m => m.value === type);
  return membership ? membership.label : type;
};

export const getMembershipDays = (type) => {
  const membership = MEMBERSHIP_TYPES.find(m => m.value === type);
  return membership ? membership.days : 30;
};

export const getMembershipPrice = (type) => {
  const membership = MEMBERSHIP_TYPES.find(m => m.value === type);
  return membership ? membership.price : 0;
};

export const formatCurrency = (amount) => {
  return `ETB ${(amount || 0).toLocaleString()}`;
};
