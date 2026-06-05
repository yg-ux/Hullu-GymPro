import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  Dumbbell, 
  Users, 
  CreditCard, 
  BarChart3, 
  Clock,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Star,
  Zap,
  Shield,
  Heart
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ gymName: '', ownerName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = await api.post('/auth/login', loginForm);
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

  const features = [
    {
      icon: Users,
      title: 'Smart Member Management',
      description: 'Track all your members with photos, contact info, and membership status at a glance.'
    },
    {
      icon: CreditCard,
      title: 'Payment Tracking',
      description: 'Record payments instantly. Auto-calculate renewals and track revenue trends.'
    },
    {
      icon: Clock,
      title: 'Check-in System',
      description: 'One-tap check-in/out. Know exactly who\'s at the gym right now.'
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'See revenue, active members, and expiring subscriptions with beautiful charts.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Each gym\'s data is completely isolated and protected.'
    },
    {
      icon: Zap,
      title: 'Instant Setup',
      description: 'Get started in minutes. No training required.'
    }
  ];

  const testimonials = [
    {
      name: 'Tadele Fitness',
      location: 'Addis Ababa',
      text: 'Best gym management system we\'ve used. Simple and effective!',
      rating: 5
    },
    {
      name: 'PowerHouse Gym',
      location: 'Bahir Dar',
      text: 'Helped us track payments and member renewals easily.',
      rating: 5
    },
    {
      name: 'FitZone Ethiopia',
      location: 'Hawassa',
      text: 'Our members love the check-in feature. Very organized now.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-dark-200">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-200/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gym-500 to-gym-700 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">GymPro</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a>
              <a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">Reviews</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => { setShowLogin(true); setShowRegister(false); }}
                className="btn-ghost"
              >
                Sign In
              </button>
              <button 
                onClick={() => { setShowRegister(true); setShowLogin(false); }}
                className="btn-primary"
              >
                Start Free Trial
              </button>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 text-gray-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-dark-100 border-t border-gray-800 p-4 space-y-4">
            <a href="#features" className="block text-gray-400 hover:text-white">Features</a>
            <a href="#pricing" className="block text-gray-400 hover:text-white">Pricing</a>
            <a href="#testimonials" className="block text-gray-400 hover:text-white">Reviews</a>
            <button onClick={() => { setShowLogin(true); setMobileMenuOpen(false); }} className="btn-ghost w-full">Sign In</button>
            <button onClick={() => { setShowRegister(true); setMobileMenuOpen(false); }} className="btn-primary w-full">Start Free Trial</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gym-500/10 border border-gym-500/30 rounded-full text-gym-400 text-sm mb-8">
            <Zap className="w-4 h-4" />
            14 Days Free Trial • No Credit Card Required
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Run Your Gym<br />
            <span className="bg-gradient-to-r from-gym-400 to-emerald-400 bg-clip-text text-transparent">
              Like a Pro
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            The complete gym management solution for Ethiopian gyms. Track members, payments, 
            and attendance — all in one beautiful app.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setShowRegister(true)}
              className="btn-primary px-8 py-4 text-lg"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button 
              onClick={() => setShowLogin(true)}
              className="btn-secondary px-8 py-4 text-lg"
            >
              I Have an Account
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16">
            <div>
              <p className="text-3xl font-bold text-white">100+</p>
              <p className="text-gray-500">Active Gyms</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">5000+</p>
              <p className="text-gray-500">Members Tracked</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">2M+</p>
              <p className="text-gray-500">ETB Processed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-dark-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Powerful features designed specifically for African gyms
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="card p-6 hover:border-gym-500/50 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gym-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-gym-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Simple Pricing
            </h2>
            <p className="text-gray-400 text-lg">
              Start free, upgrade when you're ready
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="card p-8 border-gray-800">
              <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
              <p className="text-gray-400 mb-6">Perfect for small gyms</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">ETB 3,000</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Up to 100 members', 'Payment tracking', 'Basic reports', 'Email support'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => setShowRegister(true)}
                className="btn-secondary w-full"
              >
                Start Free Trial
              </button>
            </div>

            {/* Pro - Featured */}
            <div className="card p-8 border-gym-500/50 bg-gradient-to-b from-gym-500/10 to-transparent relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gym-500 rounded-full text-sm font-medium text-white">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
              <p className="text-gray-400 mb-6">For growing gyms</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">ETB 5,000</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Up to 500 members', 'SMS reminders', 'Advanced analytics', 'Priority support', 'Custom branding'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <CheckCircle className="w-5 h-5 text-gym-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => setShowRegister(true)}
                className="btn-primary w-full"
              >
                Start Free Trial
              </button>
            </div>

            {/* Enterprise */}
            <div className="card p-8 border-gray-800">
              <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
              <p className="text-gray-400 mb-6">For large operations</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">ETB 10,000</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Unlimited members', 'Multi-location', 'API access', 'Dedicated support', 'Custom integrations'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => setShowRegister(true)}
                className="btn-secondary w-full"
              >
                Contact Sales
              </button>
            </div>
          </div>

          <p className="text-center text-gray-500 mt-8">
            All plans include 14-day free trial • No setup fees • Cancel anytime
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 bg-dark-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Loved by Gym Owners
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4">"{testimonial.text}"</p>
                <div>
                  <p className="font-medium text-white">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Heart className="w-12 h-12 text-red-400 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Built for Ethiopian Gyms
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            We understand the unique challenges of running a gym in Ethiopia. 
            GymPro is designed with you in mind.
          </p>
          <button 
            onClick={() => setShowRegister(true)}
            className="btn-primary px-8 py-4 text-lg"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gym-500 to-gym-700 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">GymPro</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 GymPro. Made with ❤️ in Ethiopia.
          </p>
        </div>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogin(false)} />
          <div className="relative bg-dark-100 rounded-2xl border border-gray-800 w-full max-w-md p-8 animate-scale-in">
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-bold text-white mb-6">Sign In</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  className="input-field"
                  placeholder="you@gym.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            
            <p className="mt-6 text-center text-gray-400 text-sm">
              Don't have an account?{' '}
              <button onClick={() => { setShowLogin(false); setShowRegister(true); }} className="text-gym-400 hover:underline">
                Start free trial
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRegister(false)} />
          <div className="relative bg-dark-100 rounded-2xl border border-gray-800 w-full max-w-md p-8 animate-scale-in max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowRegister(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-bold text-white mb-2">Start Your Free Trial</h2>
            <p className="text-gray-400 mb-6">14 days free, no credit card required</p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Gym Name *</label>
                <input
                  type="text"
                  value={registerForm.gymName}
                  onChange={(e) => setRegisterForm({...registerForm, gymName: e.target.value})}
                  className="input-field"
                  placeholder="Power Fitness Gym"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Your Name *</label>
                <input
                  type="text"
                  value={registerForm.ownerName}
                  onChange={(e) => setRegisterForm({...registerForm, ownerName: e.target.value})}
                  className="input-field"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email *</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                  className="input-field"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Phone</label>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                  className="input-field"
                  placeholder="+251911234567"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Password *</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                  className="input-field"
                  placeholder="••••••••"
                  required
                  minLength="6"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Creating account...' : 'Start Free Trial'}
              </button>
            </form>
            
            <p className="mt-6 text-center text-gray-400 text-sm">
              Already have an account?{' '}
              <button onClick={() => { setShowRegister(false); setShowLogin(true); }} className="text-gym-400 hover:underline">
                Sign in
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
