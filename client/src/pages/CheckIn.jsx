import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, formatDateTime } from '../utils/api';
import { 
  Phone, 
  Search, 
  LogIn, 
  UserPlus, 
  User, 
  Clock,
  Wifi,
  X,
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import clsx from 'clsx';

// QR Code generation using a simple approach
const QRCodeSVG = ({ value, size = 200 }) => {
  // Simple visual QR representation using SVG patterns
  // This is a simplified visual QR - for production use a proper QR library
  const gridSize = 25;
  const cellSize = size / gridSize;
  
  // Generate a deterministic pattern from the value
  const hash = value.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  
  const generateCell = (row, col) => {
    const seed = hash + row * 100 + col;
    return Math.abs(Math.sin(seed) * 10000) % 3 !== 0;
  };
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="qr-code-svg">
      <rect width={size} height={size} fill="white" />
      {/* Corner patterns */}
      <g fill="black">
        {/* Top-left corner */}
        <rect x={0} y={0} width={cellSize * 7} height={cellSize * 7} />
        <rect x={cellSize} y={cellSize} width={cellSize * 5} height={cellSize * 5} fill="white" />
        <rect x={cellSize * 2} y={cellSize * 2} width={cellSize * 3} height={cellSize * 3} />
        
        {/* Top-right corner */}
        <rect x={size - cellSize * 7} y={0} width={cellSize * 7} height={cellSize * 7} />
        <rect x={size - cellSize * 6} y={cellSize} width={cellSize * 5} height={cellSize * 5} fill="white" />
        <rect x={size - cellSize * 5} y={cellSize * 2} width={cellSize * 3} height={cellSize * 3} />
        
        {/* Bottom-left corner */}
        <rect x={0} y={size - cellSize * 7} width={cellSize * 7} height={cellSize * 7} />
        <rect x={cellSize} y={size - cellSize * 6} width={cellSize * 5} height={cellSize * 5} fill="white" />
        <rect x={cellSize * 2} y={size - cellSize * 5} width={cellSize * 3} height={cellSize * 3} />
      </g>
      
      {/* Data pattern */}
      {Array.from({ length: gridSize }, (_, row) =>
        Array.from({ length: gridSize }, (_, col) => {
          // Skip corners
          const inCorner = (
            (row < 8 && col < 8) ||
            (row < 8 && col >= gridSize - 8) ||
            (row >= gridSize - 8 && col < 8)
          );
          if (inCorner) return null;
          
          return generateCell(row, col) ? (
            <rect 
              key={`${row}-${col}`}
              x={col * cellSize} 
              y={row * cellSize} 
              width={cellSize} 
              height={cellSize}
              fill="black"
            />
          ) : null;
        })
      )}
    </svg>
  );
};

export default function CheckIn() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Auto-focus the phone input
    if (inputRef.current) {
      inputRef.current.focus();
    }
    loadRecentCheckIns();
  }, []);

  const loadRecentCheckIns = async () => {
    try {
      const data = await api.get('/attendance/today');
      // Backend returns { currently_present, checked_out, ... } - combine both
      const allToday = [...(data.currently_present || []), ...(data.checked_out || [])];
      setRecentCheckIns(allToday);
    } catch (err) {
      console.error('Failed to load recent check-ins:', err);
    }
  };

  const handleSearch = async (value) => {
    setPhone(value);
    setError('');
    
    if (value.length < 3) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await api.get(`/customers/search/phone?phone=${encodeURIComponent(value)}`);
      setSearchResults(data.customers || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (customerId) => {
    setActionLoading(customerId);
    setError('');
    setSuccess('');
    
    try {
      await api.post(`/customers/${customerId}/check-in`);
      setSuccess(`${searchResults.find(c => c.id === customerId)?.name || 'Customer'} checked in successfully!`);
      setSearchResults([]);
      setPhone('');
      loadRecentCheckIns();
      
      // Play success sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18AAA');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Check In</h1>
        <p className="text-gray-400">Search for a customer by phone number</p>
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
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-5 h-5 text-red-400" />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="card p-6">
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
          <input
            ref={inputRef}
            type="tel"
            value={phone}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by phone number..."
            className="w-full pl-14 pr-4 py-5 bg-dark-200 border-2 border-gray-700 rounded-2xl text-white text-xl placeholder-gray-500 focus:border-gym-500 focus:outline-none transition-colors"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gym-500" />
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((customer) => {
              const isActive = customer.status === 'active' || customer.status === 'expiring';
              
              return (
                <div 
                  key={customer.id}
                  className="flex items-center gap-4 p-4 bg-dark-200 rounded-xl border border-gray-700 hover:border-gym-500/50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-gym-500 to-gym-700 flex-shrink-0 flex items-center justify-center text-xl font-bold text-white">
                    {customer.photo ? (
                      <img src={customer.photo} alt={customer.name} className="w-full h-full object-cover" />
                    ) : (
                      customer.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{customer.name}</p>
                    <p className="text-gray-400 text-sm">{customer.phone}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx(
                        'status-badge',
                        customer.status === 'active' && 'status-active',
                        customer.status === 'expiring' && 'status-expiring',
                        customer.status === 'expired' && 'status-expired'
                      )}>
                        {customer.status === 'expiring' ? 'Expiring Soon' : customer.status}
                      </span>
                      {customer.days_until_expiry > 0 && (
                        <span className="text-xs text-gray-500">
                          {customer.days_until_expiry} days left
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Check-in Button */}
                  <button
                    onClick={() => handleCheckIn(customer.id)}
                    disabled={actionLoading === customer.id || !isActive}
                    className={clsx(
                      "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
                      isActive
                        ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20"
                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {actionLoading === customer.id ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        Check In
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {phone.length >= 3 && searchResults.length === 0 && !loading && (
          <div className="mt-6 text-center">
            <div className="inline-flex flex-col items-center gap-4 p-6">
              <div className="w-16 h-16 rounded-full bg-dark-300 flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-500" />
              </div>
              <div>
                <p className="text-gray-300 font-medium">No customers found</p>
                <p className="text-gray-500 text-sm mt-1">Try a different phone number</p>
              </div>
              <Link 
                to="/customers/new"
                state={{ phone: phone }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Add New Customer
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Link */}
      <div className="text-center">
        <Link 
          to="/customers/new"
          state={{ phone: phone }}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Customer not found? Add new customer
        </Link>
      </div>

      {/* Recent Check-ins Today */}
      {recentCheckIns.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Today's Check-ins
          </h2>
          
          <div className="space-y-3">
            {recentCheckIns.slice(0, 5).map((log) => (
              <div 
                key={log.id}
                className="flex items-center gap-4 p-3 bg-dark-200 rounded-lg"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gym-500 to-gym-700 flex items-center justify-center text-sm font-bold text-white">
                  {(log.customer_name || log.customer?.name)?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{log.customer_name || log.customer?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{log.customer_phone || log.customer?.phone || ''}</p>
                </div>
                {log.check_out ? (
                  <span className="text-xs text-red-400">Checked out</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <Wifi className="w-3 h-3" />
                    In gym
                  </span>
                )}
              </div>
            ))}
            
            {recentCheckIns.length > 5 && (
              <button 
                onClick={() => navigate('/check-out')}
                className="w-full flex items-center justify-center gap-2 py-3 text-gray-400 hover:text-white transition-colors"
              >
                View all ({recentCheckIns.length})
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}