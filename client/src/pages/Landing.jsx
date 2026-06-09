import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import {
  Dumbbell, Users, CreditCard, Clock, CheckCircle, ArrowRight,
  Menu, X, Upload, Palette, BarChart3, MessageSquare, Shield,
  Star, Zap, TrendingUp, UserCheck, Bell, ChevronRight, Globe, Flame, Lock
} from 'lucide-react';

const COLOR_THEMES = [
  { id: 'default', name: 'Ocean Blue',    primary: 'from-blue-500 to-blue-700',     dot: 'bg-blue-500' },
  { id: 'emerald', name: 'Forest Green',  primary: 'from-emerald-500 to-emerald-700', dot: 'bg-emerald-500' },
  { id: 'purple',  name: 'Royal Purple',  primary: 'from-purple-500 to-purple-700',  dot: 'bg-purple-500' },
  { id: 'red',     name: 'Power Red',     primary: 'from-red-500 to-red-700',        dot: 'bg-red-500' },
  { id: 'amber',   name: 'Golden Amber',  primary: 'from-amber-500 to-amber-700',    dot: 'bg-amber-500' },
  { id: 'cyan',    name: 'Teal Cyan',     primary: 'from-cyan-500 to-cyan-700',      dot: 'bg-cyan-500' },
];

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: 'Free forever',
    description: 'Perfect to get started',
    color: 'border-gray-700',
    badge: null,
    features: [
      { text: 'Up to 10 members', included: true },
      { text: 'Check-in / Check-out', included: true },
      { text: 'Payment tracking', included: true },
      { text: 'Basic reports', included: true },
      { text: 'SMS notifications', included: false },
      { text: 'Revenue analytics', included: false },
      { text: 'Staff accounts', included: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 1499,
    priceLabel: 'ETB 1,499',
    description: 'For growing gyms',
    color: 'border-blue-500',
    badge: 'Most Popular',
    promo: true,
    features: [
      { text: 'Up to 100 members', included: true },
      { text: 'Check-in / Check-out', included: true },
      { text: 'Payment tracking', included: true },
      { text: 'SMS notifications', included: true },
      { text: 'Staff accounts (3)', included: true },
      { text: 'Revenue analytics', included: false },
      { text: 'Unlimited members', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 3499,
    priceLabel: 'ETB 3,499',
    description: 'Full power, no limits',
    color: 'border-purple-500',
    badge: 'Best Value',
    promo: true,
    features: [
      { text: 'Unlimited members', included: true },
      { text: 'Check-in / Check-out', included: true },
      { text: 'Payment tracking', included: true },
      { text: 'SMS notifications', included: true },
      { text: 'Unlimited staff accounts', included: true },
      { text: 'Revenue analytics', included: true },
      { text: 'Priority support', included: true },
    ],
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [showRegister, setShowRegister] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    gymName: '', ownerName: '', email: '', phone: '', password: '', colorTheme: 'default', logo: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Lock scroll when modal open
  useEffect(() => {
    document.body.style.overflow = showRegister ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showRegister]);

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
    if (!file) return;
    if (file.size > 1024 * 1024) { setError('Logo must be under 1MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setRegisterForm(p => ({ ...p, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Hullu Gyms
            </span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2">
              Sign In
            </button>
            <button onClick={() => setShowRegister(true)} className="text-sm px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20">
              Start Free Trial
            </button>
          </div>

          {/* Mobile button */}
          <button className="md:hidden p-2 text-gray-400" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800 p-4 space-y-4">
            <a href="#features" className="block text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how" className="block text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="#pricing" className="block text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="w-full py-3 border border-gray-700 rounded-xl text-white font-medium">Sign In</button>
            <button onClick={() => { setShowRegister(true); setMobileMenuOpen(false); }} className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white font-medium">Start Free Trial</button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-blue-600/20 via-purple-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-8">
            <Zap className="w-3.5 h-3.5" />
            14-Day Free Trial · No Credit Card Required
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
            Run Your Gym Like
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              A Pro
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Hullu Gyms gives Ethiopian gym owners everything they need — member management, payments, SMS reminders, attendance tracking, and staff control — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button onClick={() => setShowRegister(true)}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl font-semibold text-lg transition-all shadow-2xl shadow-blue-500/30 hover:scale-[1.02]">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-semibold text-lg transition-all border border-gray-700">
              I Have an Account
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: '500+', label: 'Members Tracked' },
              { value: '99%', label: 'Uptime' },
              { value: '🇪🇹', label: 'Made in Ethiopia' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 px-4 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything Your Gym Needs</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">Built specifically for Ethiopian gym owners who want to grow their business without the hassle.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: 'Member Management', desc: 'Add members with photos, track their membership type, expiry date, and payment history all in one profile.', color: 'text-blue-400 bg-blue-500/10' },
              { icon: CreditCard, title: 'Payment Tracking', desc: 'Record cash, card, or mobile payments instantly. Auto-calculate renewal dates. Never miss a payment again.', color: 'text-green-400 bg-green-500/10' },
              { icon: Clock, title: 'Check-in / Check-out', desc: 'One-tap attendance tracking. See who\'s in the gym right now and track visit history per member.', color: 'text-purple-400 bg-purple-500/10' },
              { icon: MessageSquare, title: 'SMS Notifications', desc: 'Automatic welcome messages, payment confirmations, and expiry reminders sent to your members in Amharic or English.', color: 'text-pink-400 bg-pink-500/10' },
              { icon: BarChart3, title: 'Revenue Analytics', desc: 'See your monthly revenue, most popular plans, and growth trends with clean charts and reports.', color: 'text-amber-400 bg-amber-500/10' },
              { icon: UserCheck, title: 'Staff Management', desc: 'Give your receptionists, trainers, and managers their own login with role-based access. Keep control of who sees what.', color: 'text-cyan-400 bg-cyan-500/10' },
              { icon: Shield, title: 'Secure & Reliable', desc: 'Your data is safe. Encrypted tokens, rate limiting, and daily backups keep your gym\'s data protected.', color: 'text-red-400 bg-red-500/10' },
              { icon: Bell, title: 'Expiry Reminders', desc: 'Automatic SMS reminders sent 7 days and 1 day before membership expiry. Reduce churn effortlessly.', color: 'text-indigo-400 bg-indigo-500/10' },
              { icon: Globe, title: 'Access Anywhere', desc: 'Works on any device — phone, tablet, or desktop. No app install needed. Open your browser and go.', color: 'text-teal-400 bg-teal-500/10' },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gray-800 border border-gray-700 hover:border-gray-600 transition-all group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Up and Running in Minutes</h2>
            <p className="text-gray-400 text-lg">No training required. If you can use a smartphone, you can use Hullu Gyms.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Register Your Gym', desc: 'Create your free account in 60 seconds. Add your gym name, logo, and pick your brand color.', icon: Dumbbell },
              { step: '02', title: 'Add Your Members', desc: 'Import or manually add your members. Set their membership type, record their first payment — done.', icon: Users },
              { step: '03', title: 'Manage & Grow', desc: 'Check members in, send SMS reminders, track revenue, and give staff their own access. Everything automated.', icon: TrendingUp },
            ].map((s, i) => (
              <div key={i} className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-5xl font-black text-gray-800 absolute -top-4 left-1/2 -translate-x-1/2 select-none">{s.step}</p>
                <h3 className="text-xl font-semibold text-white mb-2 mt-2">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                {i < 2 && <div className="hidden sm:block absolute top-8 left-[calc(50%+60px)] right-0 h-px bg-gradient-to-r from-gray-700 to-transparent" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 px-4 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400 text-lg">Start free. Upgrade when your gym grows.</p>

            {/* Early Bird Banner */}
            <div className="mt-8 inline-flex flex-col sm:flex-row items-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 rounded-2xl text-sm">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Flame className="w-4 h-4 flex-shrink-0" />
                Early Bird Launch Offer — Limited Spots!
              </div>
              <span className="hidden sm:block text-amber-600">·</span>
              <span className="text-amber-200/80">
                The <span className="font-bold text-amber-300">first 10 gyms</span> to register get the promotional price{' '}
                <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                  <Lock className="w-3 h-3" /> locked in for 6 months
                </span>{' '}
                + priority support &amp; free onboarding.
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`relative flex flex-col p-8 rounded-2xl bg-gray-800 border-2 transition-all ${plan.color}`}>
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-xs font-bold text-white shadow-lg">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    {plan.promo && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded-full text-amber-400 text-xs font-semibold">
                        <Flame className="w-3 h-3" /> Promo Price
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{plan.priceLabel}</span>
                    {plan.price > 0 && <span className="text-gray-400">/month</span>}
                  </div>
                  {plan.promo && (
                    <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-400/80 bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2">
                      <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>First 10 gyms get this price locked in for 6 months.</span>
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className={`flex items-center gap-3 text-sm ${f.included ? 'text-gray-300' : 'text-gray-600'}`}>
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${f.included ? 'text-green-400' : 'text-gray-700'}`} />
                      <span className={f.included ? '' : 'line-through'}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setShowRegister(true)}
                  className={`w-full py-3.5 rounded-xl font-semibold transition-all ${
                    plan.id === 'starter'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/20'
                      : plan.id === 'pro'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/20'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {plan.id === 'free' ? 'Get Started Free' : 'Start Free Trial'}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center space-y-1">
            <p className="text-gray-500 text-sm">
              All paid plans include a 14-day free trial · No setup fees · Cancel anytime · Prices in Ethiopian Birr
            </p>
            <p className="text-amber-500/70 text-xs flex items-center justify-center gap-1.5">
              <Flame className="w-3 h-3" />
              Promotional pricing — available to the first 10 gyms only. Regular pricing applies after launch.
            </p>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL / CTA ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Testimonial */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-3xl p-10 text-center mb-16">
            <div className="flex justify-center mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />)}
            </div>
            <p className="text-xl text-gray-300 italic mb-6 max-w-2xl mx-auto">
              "Before Hullu Gyms I was using paper notebooks. Now I can see all my members, who paid, who didn't, and send them reminders from my phone. My gym feels professional."
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">A</div>
              <div className="text-left">
                <p className="font-semibold text-white">Abebe Tadesse</p>
                <p className="text-sm text-gray-400">Owner, Addis Fitness Center</p>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Modernize Your Gym?</h2>
            <p className="text-gray-400 text-lg mb-8">Join gym owners across Ethiopia who manage smarter with Hullu Gyms.</p>
            <button onClick={() => setShowRegister(true)}
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl font-semibold text-lg transition-all shadow-2xl shadow-blue-500/30 hover:scale-[1.02]">
              Start Free — No Commitment
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Hullu Gyms</span>
          </div>
          <p className="text-gray-500 text-sm">© 2025 Hullu Gyms. Gym Management Software · Built in Ethiopia 🇪🇹</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Sign In</button>
          </div>
        </div>
      </footer>

      {/* ── REGISTER MODAL ── */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowRegister(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowRegister(false)} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">Create Your Gym Account</h2>
              <p className="text-gray-400 text-sm">14 days free · No credit card required</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <label className="cursor-pointer flex-shrink-0">
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <div className="w-16 h-16 rounded-2xl bg-gray-800 border-2 border-dashed border-gray-600 hover:border-blue-500 flex items-center justify-center overflow-hidden transition-colors">
                    {registerForm.logo
                      ? <img src={registerForm.logo} alt="Logo" className="w-full h-full object-cover" />
                      : <Upload className="w-6 h-6 text-gray-500" />}
                  </div>
                </label>
                <div>
                  <p className="text-sm font-medium text-gray-300">Gym Logo</p>
                  <p className="text-xs text-gray-500">Click to upload (JPG/PNG, max 1MB)</p>
                </div>
              </div>

              {/* Fields */}
              {[
                { label: 'Gym Name *', key: 'gymName', type: 'text', placeholder: 'My Fitness Center' },
                { label: 'Your Name *', key: 'ownerName', type: 'text', placeholder: 'Abebe Tadesse' },
                { label: 'Email *', key: 'email', type: 'email', placeholder: 'you@example.com' },
                { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+251911234567' },
                { label: 'Password *', key: 'password', type: 'password', placeholder: '••••••••' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-400 mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    value={registerForm[f.key]}
                    onChange={e => setRegisterForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    required={f.label.includes('*')}
                    minLength={f.key === 'password' ? 6 : undefined}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              ))}

              {/* Color Theme */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Palette className="w-4 h-4" /> Dashboard Theme Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setRegisterForm(p => ({ ...p, colorTheme: theme.id }))}
                      title={theme.name}
                      className={`h-10 rounded-xl bg-gradient-to-br ${theme.primary} transition-all ${
                        registerForm.colorTheme === theme.id
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Selected: <span className="text-gray-300">{COLOR_THEMES.find(t => t.id === registerForm.colorTheme)?.name}</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {loading ? 'Creating account…' : 'Start Free Trial'}
              </button>
            </form>

            <p className="mt-4 text-center text-gray-500 text-sm">
              Already have an account?{' '}
              <button onClick={() => { setShowRegister(false); navigate('/login'); }} className="text-blue-400 hover:underline">
                Sign in
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
