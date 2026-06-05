import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  Dumbbell, 
  Users, 
  CreditCard, 
  Clock,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Sun,
  Moon,
  Upload,
  Palette
} from 'lucide-react';

// Color themes for gyms
const COLOR_THEMES = [
  { id: 'default', name: 'Ocean Blue', primary: 'from-blue-500 to-blue-700', accent: 'blue-500' },
  { id: 'emerald', name: 'Forest Green', primary: 'from-emerald-500 to-emerald-700', accent: 'emerald-500' },
  { id: 'purple', name: 'Royal Purple', primary: 'from-purple-500 to-purple-700', accent: 'purple-500' },
  { id: 'red', name: 'Power Red', primary: 'from-red-500 to-red-700', accent: 'red-500' },
  { id: 'amber', name: 'Golden Amber', primary: 'from-amber-500 to-amber-700', accent: 'amber-500' },
  { id: 'cyan', name: 'Teal Cyan', primary: 'from-cyan-500 to-cyan-700', accent: 'cyan-500' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : true;
  });
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    gymName: '', 
    ownerName: '', 
    email: '', 
    phone: '', 
    password: '',
    colorTheme: 'default',
    logo: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Apply dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = await api.post('/auth/login', { email: loginForm.email, password: loginForm.password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('gym', JSON.stringify(data.gym));
      localStorage.setItem('subscription', JSON.stringify(data.subscription));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = await api.post('/auth/register', registerForm);
      localStorage.setItem('token', data.token);
      localStorage.setItem('gym', JSON.stringify(data.gym));
      localStorage.setItem('subscription', JSON.stringify(data.subscription));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 1024 * 1024) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegisterForm({ ...registerForm, logo: reader.result });
      };
      reader.readAsDataURL(file);
    } else {
      setError('Logo must be under 1MB');
    }
  };

  const features = [
    {
      icon: Users,
      title: 'Member Management',
      description: 'Track all your members with photos, contact info, and membership status.'
    },
    {
      icon: CreditCard,
      title: 'Payment Tracking',
      description: 'Record payments instantly. Auto-calculate renewals and track revenue.'
    },
    {
      icon: Clock,
      title: 'Check-in System',
      description: 'One-tap check-in/out. Know exactly who\'s at the gym right now.'
    },
    {
      icon: CheckCircle,
      title: 'Smart Scheduling',
      description: '3 days/week memberships with automatic visit tracking.'
    }
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 ${darkMode ? 'bg-gray-900/80' : 'bg-white/80'} backdrop-blur-xl border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${darkMode ? 'from-blue-500 to-blue-700' : 'from-blue-600 to-blue-800'} flex items-center justify-center`}>
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Hullu Gyms</span>
            </div>

            {/* Dark mode toggle */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>Features</a>
              <a href="#pricing" className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>Pricing</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => { setShowLogin(true); setShowRegister(false); }}
                className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setShowRegister(true); setShowLogin(false); }}
                className={`px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors`}
              >
                Start Free Trial
              </button>
            </div>

            {/* Mobile menu button */}
            <button 
              className={`md:hidden p-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-4 space-y-4`}>
            <a href="#features" className={`block ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Features</a>
            <a href="#pricing" className={`block ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pricing</a>
            <button onClick={() => { setShowLogin(true); setMobileMenuOpen(false); }} className="btn-ghost w-full">Sign In</button>
            <button onClick={() => { setShowRegister(true); setMobileMenuOpen(false); }} className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium">Start Free Trial</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-sm mb-8">
            14 Days Free Trial • No Credit Card Required
          </div>
          
          <h1 className={`text-3xl md:text-5xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6 leading-tight`}>
            Gym Management<br />
            <span className="bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>
          
          <p className={`text-lg md:text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto mb-10`}>
            The complete solution for managing your gym. Track members, payments, 
            and check-ins — all from your phone.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setShowRegister(true)}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-lg transition-colors"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2 inline" />
            </button>
            <button 
              onClick={() => setShowLogin(true)}
              className={`px-8 py-4 ${darkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'} rounded-xl font-medium text-lg transition-colors`}
            >
              I Have an Account
            </button>
          </div>

          {/* Startup reality message */}
          <div className="max-w-xl mx-auto mt-12 p-6 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              🎉 We're just getting started! As an early adopter, you'll get <strong className="text-blue-400">lifetime discounts</strong> and help shape the future of Hullu Gyms.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={`py-16 px-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Everything You Need
            </h2>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-lg max-w-2xl mx-auto`}>
              Simple tools to run your gym efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`p-6 rounded-xl ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>{feature.title}</h3>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Simple Pricing
            </h2>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-lg`}>
              Start free, upgrade when you're ready
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Starter */}
            <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Starter</h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>For small gyms</p>
              <div className="mb-4">
                <span className="text-3xl font-bold text-blue-500">ETB 3,000</span>
                <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>/month</span>
              </div>
              <ul className="space-y-2 mb-6">
                {['Up to 100 members', 'Payment tracking', 'Check-in system', 'Email support'].map((f, i) => (
                  <li key={i} className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => setShowRegister(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Start Free Trial
              </button>
            </div>

            {/* Pro */}
            <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border-2 border-blue-500' : 'bg-white border-2 border-blue-600'} relative`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 rounded-full text-xs font-medium text-white">
                Popular
              </div>
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Pro</h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>For growing gyms</p>
              <div className="mb-4">
                <span className="text-3xl font-bold text-blue-500">ETB 5,000</span>
                <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>/month</span>
              </div>
              <ul className="space-y-2 mb-6">
                {['Up to 500 members', 'SMS reminders', 'Advanced analytics', 'Priority support'].map((f, i) => (
                  <li key={i} className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => setShowRegister(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Start Free Trial
              </button>
            </div>

            {/* Enterprise */}
            <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Enterprise</h3>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>For large operations</p>
              <div className="mb-4">
                <span className="text-3xl font-bold text-blue-500">ETB 10,000</span>
                <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>/month</span>
              </div>
              <ul className="space-y-2 mb-6">
                {['Unlimited members', 'Multi-location', 'API access', 'Dedicated support'].map((f, i) => (
                  <li key={i} className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => setShowRegister(true)}
                className={`w-full py-3 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'} rounded-lg font-medium transition-colors`}
              >
                Contact Sales
              </button>
            </div>
          </div>

          <p className={`text-center ${darkMode ? 'text-gray-500' : 'text-gray-500'} mt-8`}>
            All plans include 14-day free trial • No setup fees • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-8 px-4 border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center`}>
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Hullu Gyms</span>
          </div>
          <p className={`${darkMode ? 'text-gray-500' : 'text-gray-500'} text-sm`}>
            © 2024 Hullu Gyms. Built in Ethiopia 🇪🇹
          </p>
        </div>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm`} onClick={() => setShowLogin(false)} />
          <div className={`relative ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border w-full max-w-md p-8 animate-scale-in`}>
            <button onClick={() => setShowLogin(false)} className={`absolute top-4 right-4 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              <X className="w-6 h-6" />
            </button>
            
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6`}>Sign In</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={`block text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="you@gym.com"
                  required
                />
              </div>
              <div>
                <label className={`block text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            
            <p className={`mt-6 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
              Don't have an account?{' '}
              <button onClick={() => { setShowLogin(false); setShowRegister(true); }} className="text-blue-500 hover:underline">
                Start free trial
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm`} onClick={() => setShowRegister(false)} />
          <div className={`relative ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border w-full max-w-md p-6 animate-scale-in max-h-[90vh] overflow-y-auto`}>
            <button onClick={() => setShowRegister(false)} className={`absolute top-4 right-4 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              <X className="w-6 h-6" />
            </button>
            
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Welcome</h2>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>14 days free, no credit card required</p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Logo Upload */}
              <div className="text-center">
                <div className={`w-20 h-20 rounded-xl ${darkMode ? 'bg-gray-900' : 'bg-gray-100'} border-2 border-dashed ${darkMode ? 'border-gray-600' : 'border-gray-300'} mx-auto mb-2 flex items-center justify-center cursor-pointer overflow-hidden`}>
                  {registerForm.logo ? (
                    <img src={registerForm.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className={`w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  )}
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <span className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:underline`}>
                    {registerForm.logo ? 'Change Logo' : 'Upload Gym Logo'}
                  </span>
                </label>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>JPG, PNG up to 1MB</p>
              </div>

              {/* Gym Name */}
              <div>
                <label className={`block text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Gym Name *</label>
                <input
                  type="text"
                  value={registerForm.gymName}
                  onChange={(e) => setRegisterForm({...registerForm, gymName: e.target.value})}
                  className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="My Fitness Gym"
                  required
                />
              </div>

              {/* Owner Name */}
              <div>
                <label className={`block text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Your Name *</label>
                <input
                  type="text"
                  value={registerForm.ownerName}
                  onChange={(e) => setRegisterForm({...registerForm, ownerName: e.target.value})}
                  className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="John Doe"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className={`block text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Email *</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                  className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className={`block text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Phone</label>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                  className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="+251911234567"
                />
              </div>

              {/* Password */}
              <div>
                <label className={`block text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Password *</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                  className={`w-full px-4 py-3 rounded-lg ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="••••••••"
                  required
                  minLength="6"
                />
              </div>

              {/* Color Theme */}
              <div>
                <label className={`block text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                  <Palette className="w-4 h-4 inline mr-1" />
                  Theme Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setRegisterForm({...registerForm, colorTheme: theme.id})}
                      className={`w-full h-10 rounded-lg bg-gradient-to-br ${theme.primary} ${
                        registerForm.colorTheme === theme.id ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                      }`}
                      title={theme.name}
                    />
                  ))}
                </div>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                  {COLOR_THEMES.find(t => t.id === registerForm.colorTheme)?.name}
                </p>
              </div>

              <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors">
                {loading ? 'Creating account...' : 'Start Free Trial'}
              </button>
            </form>
            
            <p className={`mt-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm`}>
              Already have an account?{' '}
              <button onClick={() => { setShowRegister(false); setShowLogin(true); }} className="text-blue-500 hover:underline">
                Sign in
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}