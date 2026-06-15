import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Dumbbell, Users, CreditCard, Clock, CheckCircle, ArrowRight,
  Menu, X, Upload, Palette, BarChart3, MessageSquare, Shield,
  Star, Zap, TrendingUp, UserCheck, Bell, ChevronRight, Flame, Lock,
  Phone, ChevronDown, Award, Heart, Activity, Check, Minus
} from 'lucide-react';

const COLOR_THEMES = [
  { id: 'default', name: 'Blue',    nameKey: 'landing.theme.default', primary: 'from-blue-500 to-blue-700',     dot: 'bg-blue-500' },
  { id: 'emerald', name: 'Green',   nameKey: 'landing.theme.emerald', primary: 'from-emerald-500 to-emerald-700', dot: 'bg-emerald-500' },
  { id: 'purple',  name: 'Purple',  nameKey: 'landing.theme.purple',  primary: 'from-purple-500 to-purple-700',  dot: 'bg-purple-500' },
  { id: 'red',     name: 'Red',     nameKey: 'landing.theme.red',     primary: 'from-red-500 to-red-700',        dot: 'bg-red-500' },
  { id: 'amber',   name: 'Amber',   nameKey: 'landing.theme.amber',   primary: 'from-amber-500 to-amber-700',    dot: 'bg-amber-500' },
  { id: 'cyan',    name: 'Cyan',    nameKey: 'landing.theme.cyan',    primary: 'from-cyan-500 to-cyan-700',      dot: 'bg-cyan-500' },
];

const PLANS = [
  {
    id: 'free',
    nameKey: 'landing.plan.free.name',
    price: 0,
    description: 'Get started at no cost',
    features: [
      'Up to 10 members',
      'Check-in & check-out with live gym view',
      'Payment recording & member history',
      'Dashboard with daily activity summary',
    ],
  },
  {
    id: 'starter',
    nameKey: 'landing.plan.starter.name',
    price: 1499,
    description: 'For gyms ready to grow',
    popular: true,
    features: [
      'Up to 100 members',
      'Everything in Free',
      'Automated SMS — welcome, payment & expiry alerts',
      'Up to 3 staff accounts with role-based access',
      'Attendance analytics — visit trends & peak hours',
      'Monthly expense & recurring bill tracking',
      'Pricing packages for faster member registration',
    ],
  },
  {
    id: 'pro',
    nameKey: 'landing.plan.pro.name',
    price: 3499,
    description: 'Full power, no limits',
    features: [
      'Unlimited members',
      'Everything in Starter',
      'Revenue analytics — income, plan breakdown & trends',
      'Retention insights — spot members at risk of leaving',
      'Equipment tracker — maintenance & condition logs',
      'CSV export & reports for any date range',
      'Unlimited staff accounts',
      'Priority support',
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'Do I need internet all the time?',
    a: 'You need internet to sync data and send SMS messages. Basic check-in and viewing member info works with a slow connection. We recommend a stable connection for the best experience.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes. You can cancel or downgrade at any time from the Settings page. Your data is never deleted — you just move to the free plan limits.',
  },
  {
    q: 'Is my members\' data safe?',
    a: 'All data is stored securely. Each gym\'s data is completely isolated — no other gym can see your members or payments.',
  },
  {
    q: 'How does the free plan work?',
    a: 'The free plan is permanent — not a trial. You can manage up to 10 members, track payments, and use check-in/out forever at no cost. Upgrade when you need more.',
  },
  {
    q: 'Can multiple staff use the same account?',
    a: 'Yes. On Starter and Pro plans you can add staff accounts with different roles — receptionist, trainer, manager — each with their own login and permissions.',
  },
  {
    q: 'How do the SMS reminders work?',
    a: 'Hullu Gyms automatically sends SMS messages to members when their membership is about to expire, and a welcome message when they first register. No setup needed.',
  },
];

export default function Landing() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    gymName: '', ownerName: '', email: '', phone: '', password: '', colorTheme: 'default', logo: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  // Lock scroll when modal open
  useEffect(() => {
    document.body.style.overflow = showRegister ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showRegister]);

  // Sticky CTA — appear after scrolling past the hero
  useEffect(() => {
    const handleScroll = () => setShowStickyCTA(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(registerForm);
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
    if (file.size > 1024 * 1024) { setError(t('landing.register.logoTooBig')); return; }
    const reader = new FileReader();
    reader.onloadend = () => setRegisterForm(p => ({ ...p, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Hullu Gyms
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">{t('landing.nav.features')}</a>
            <a href="#how" className="hover:text-white transition-colors">{t('landing.nav.howItWorks')}</a>
            <a href="#pricing" className="hover:text-white transition-colors">{t('landing.nav.pricing')}</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2">
              {t('landing.nav.signIn')}
            </button>
            <button onClick={() => setShowRegister(true)} className="text-sm px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20">
              {t('landing.nav.startFreeTrial')}
            </button>
          </div>

          <button className="md:hidden p-2 text-gray-400" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-900 border-t border-gray-800 p-4 space-y-4">
            <a href="#features" className="block text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.features')}</a>
            <a href="#how" className="block text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.howItWorks')}</a>
            <a href="#pricing" className="block text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.pricing')}</a>
            <a href="#faq" className="block text-gray-400 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="w-full py-3 border border-gray-700 rounded-xl text-white font-medium">{t('landing.nav.signIn')}</button>
            <button onClick={() => { setShowRegister(true); setMobileMenuOpen(false); }} className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white font-medium">{t('landing.nav.startFreeTrial')}</button>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-blue-600/15 via-purple-600/8 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-8">
                <Zap className="w-3.5 h-3.5" />
                {t('landing.hero.badge')}
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
                {t('landing.hero.title1')}
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {t('landing.hero.title2')}
                </span>
              </h1>

              <p className="text-lg text-gray-400 mb-10 leading-relaxed">
                {t('landing.hero.subtitle')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <button onClick={() => setShowRegister(true)}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl font-semibold text-lg transition-all shadow-2xl shadow-blue-500/30 hover:scale-[1.02]">
                  {t('landing.hero.ctaStart')}
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={() => navigate('/login')}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-semibold text-lg transition-all border border-gray-700">
                  {t('landing.hero.ctaHaveAccount')}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {[
                  { value: '⚡', label: t('landing.hero.stat1') },
                  { value: '🆓', label: t('landing.hero.stat2') },
                  { value: '🇪🇹', label: t('landing.hero.stat3') },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — app mockup */}
            <div className="hidden lg:block">
              <AppMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 px-4 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">{t('landing.features.kicker')}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('landing.features.title')}</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">{t('landing.features.subtitle')}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users,        title: t('landing.features.memberMgmt.title'),  desc: t('landing.features.memberMgmt.desc'),  color: 'text-blue-400 bg-blue-500/10' },
              { icon: CreditCard,   title: t('landing.features.payments.title'),    desc: t('landing.features.payments.desc'),    color: 'text-green-400 bg-green-500/10' },
              { icon: Clock,        title: t('landing.features.checkin.title'),     desc: t('landing.features.checkin.desc'),     color: 'text-purple-400 bg-purple-500/10' },
              { icon: MessageSquare,title: t('landing.features.sms.title'),         desc: t('landing.features.sms.desc'),         color: 'text-pink-400 bg-pink-500/10' },
              { icon: BarChart3,    title: t('landing.features.analytics.title'),   desc: t('landing.features.analytics.desc'),   color: 'text-amber-400 bg-amber-500/10' },
              { icon: UserCheck,    title: t('landing.features.staff.title'),       desc: t('landing.features.staff.desc'),       color: 'text-cyan-400 bg-cyan-500/10' },
              { icon: Shield,       title: t('landing.features.secure.title'),      desc: t('landing.features.secure.desc'),      color: 'text-red-400 bg-red-500/10' },
              { icon: Bell,         title: t('landing.features.reminders.title'),   desc: t('landing.features.reminders.desc'),   color: 'text-indigo-400 bg-indigo-500/10' },
              { icon: Activity,     title: t('landing.features.anywhere.title'),    desc: t('landing.features.anywhere.desc'),    color: 'text-teal-400 bg-teal-500/10' },
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
            <p className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-3">{t('landing.how.kicker')}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('landing.how.title')}</h2>
            <p className="text-gray-400 text-lg">{t('landing.how.subtitle')}</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: t('landing.how.step1.title'), desc: t('landing.how.step1.desc'), icon: Dumbbell },
              { step: '02', title: t('landing.how.step2.title'), desc: t('landing.how.step2.desc'), icon: Users },
              { step: '03', title: t('landing.how.step3.title'), desc: t('landing.how.step3.desc'), icon: TrendingUp },
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

      {/* ── WHO IT'S FOR ── */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-widest mb-3">Who It's For</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Built for Every Type of Gym</h2>
            <p className="text-gray-400 text-lg">Whether you run a small boxing gym or a large fitness center, Hullu Gyms adapts to your workflow.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: Dumbbell,  label: 'Bodybuilding & Weight Gyms', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
              { icon: Award,     label: 'Boxing & Martial Arts',       color: 'text-red-400 bg-red-500/10 border-red-500/20' },
              { icon: Heart,     label: 'Yoga & Wellness Studios',     color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
              { icon: Zap,       label: 'CrossFit & HIIT Centers',     color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
              { icon: Users,     label: 'Community Fitness Centers',   color: 'text-green-400 bg-green-500/10 border-green-500/20' },
              { icon: TrendingUp,label: 'Sports Training Academies',   color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
            ].map((item, i) => (
              <div key={i} className={`flex flex-col items-center gap-3 p-5 rounded-2xl bg-gray-800 border ${item.color.split(' ')[2]} text-center hover:scale-[1.02] transition-transform`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color.split(' ').slice(0,2).join(' ')}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-200">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-3">Why Switch</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Hullu Gyms vs. Doing It Manually</h2>
            <p className="text-gray-400 text-lg">See why gym owners are moving away from notebooks and WhatsApp groups.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800/80">
                  <th className="text-left px-6 py-4 text-gray-400 font-medium w-1/2">Feature</th>
                  <th className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 text-blue-400 font-bold">
                      <Dumbbell className="w-4 h-4" /> Hullu Gyms
                    </span>
                  </th>
                  <th className="px-6 py-4 text-center text-gray-500 font-medium">Notebook / WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {[
                  ['Member check-in tracking',       true,  false],
                  ['Auto SMS expiry reminders',       true,  false],
                  ['Payment history per member',      true,  false],
                  ['Staff accounts with permissions', true,  false],
                  ['Revenue & attendance analytics',  true,  false],
                  ['Works on phone & tablet',         true,  'Partial'],
                  ['Search members instantly',        true,  false],
                  ['Bulk CSV member import',          true,  false],
                  ['Free to start',                   true,  true],
                ].map(([label, hullu, manual], i) => (
                  <tr key={i} className="bg-gray-900/40 hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-3.5 text-gray-300">{label}</td>
                    <td className="px-6 py-3.5 text-center">
                      {hullu === true
                        ? <Check className="w-5 h-5 text-green-400 mx-auto" />
                        : <Minus className="w-5 h-5 text-gray-600 mx-auto" />}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {manual === true
                        ? <Check className="w-5 h-5 text-green-400 mx-auto" />
                        : manual === 'Partial'
                          ? <span className="text-xs text-amber-500 font-medium">Partial</span>
                          : <Minus className="w-5 h-5 text-gray-700 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 px-4 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-green-400 text-sm font-semibold uppercase tracking-widest mb-3">{t('landing.pricing.kicker')}</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('landing.pricing.title')}</h2>
            <p className="text-gray-400 text-lg">{t('landing.pricing.subtitle')}</p>

            <div className="mt-8 inline-flex flex-col sm:flex-row items-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 rounded-2xl text-sm">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Flame className="w-4 h-4 flex-shrink-0" />
                {t('landing.pricing.earlyBird')}
              </div>
              <span className="hidden sm:block text-amber-600">·</span>
              <span className="text-amber-200/80">
                {t('landing.pricing.earlyBirdPart1')} <span className="font-bold text-amber-300">{t('landing.pricing.earlyBirdFirst10')}</span> {t('landing.pricing.earlyBirdPart2')}{' '}
                <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                  <Lock className="w-3 h-3" /> {t('landing.pricing.earlyBirdLocked')}
                </span>{' '}
                {t('landing.pricing.earlyBirdPart3')}
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5 items-start">
            {PLANS.map((plan) => (
              <div key={plan.id} className={clsx(
                'relative flex flex-col rounded-2xl border bg-gray-800/60 transition-all',
                plan.popular
                  ? 'border-white/20 shadow-xl'
                  : 'border-gray-700/80'
              )}>
                {plan.popular && (
                  <div className="absolute -top-3 left-6">
                    <span className="px-3 py-1 bg-white text-gray-900 text-xs font-semibold rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-6 pb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t(plan.nameKey)}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    {plan.price === 0 ? (
                      <span className="text-3xl font-bold text-white">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white">ETB {plan.price.toLocaleString()}</span>
                        <span className="text-gray-400 text-sm">/mo</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{plan.description}</p>
                </div>

                <div className="px-6 pb-6 flex-1 border-t border-gray-700/60 pt-5">
                  <ul className="space-y-3">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                        <Check className="w-4 h-4 flex-shrink-0 text-green-400 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 pt-0">
                  <button
                    onClick={() => setShowRegister(true)}
                    className={clsx(
                      'w-full py-3 rounded-lg font-medium text-sm transition-all',
                      plan.popular
                        ? 'bg-white text-gray-900 hover:bg-gray-100'
                        : 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
                    )}
                  >
                    {plan.price === 0 ? 'Get started free' : 'Start free trial'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center space-y-1">
            <p className="text-gray-500 text-sm">{t('landing.pricing.footnote1')}</p>
            <p className="text-amber-500/70 text-xs flex items-center justify-center gap-1.5">
              <Flame className="w-3 h-3" />
              {t('landing.pricing.footnote2')}
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Common Questions</h2>
            <p className="text-gray-400 text-lg">Everything you need to know before getting started.</p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-800/50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-white pr-4">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-gray-400 text-sm leading-relaxed border-t border-gray-800 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Still have questions?{' '}
              <a
                href="https://wa.me/251970782859"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 font-medium inline-flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" /> Chat with us on WhatsApp
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL / CTA ── */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-3xl p-10 text-center mb-16">
            <div className="flex justify-center mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />)}
            </div>
            <p className="text-xl text-gray-300 italic mb-6 max-w-2xl mx-auto">
              {t('landing.testimonial.quote')}
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold">A</div>
              <div className="text-left">
                <p className="font-semibold text-white">{t('landing.testimonial.name')}</p>
                <p className="text-sm text-gray-400">{t('landing.testimonial.role')}</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('landing.finalCta.title')}</h2>
            <p className="text-gray-400 text-lg mb-8">{t('landing.finalCta.subtitle')}</p>
            <button onClick={() => setShowRegister(true)}
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl font-semibold text-lg transition-all shadow-2xl shadow-blue-500/30 hover:scale-[1.02]">
              {t('landing.finalCta.button')}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-4 border-t border-gray-800 bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Hullu Gyms</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                Gym management software built for Ethiopian gym owners. Simple, affordable, and powerful.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="text-gray-400 font-semibold text-sm mb-4 uppercase tracking-wide">Quick Links</p>
              <div className="space-y-2 text-sm text-gray-500">
                <a href="#features" className="block hover:text-white transition-colors">{t('landing.nav.features')}</a>
                <a href="#pricing" className="block hover:text-white transition-colors">{t('landing.nav.pricing')}</a>
                <a href="#faq" className="block hover:text-white transition-colors">FAQ</a>
                <button onClick={() => navigate('/login')} className="block hover:text-white transition-colors text-left">{t('landing.nav.signIn')}</button>
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-gray-400 font-semibold text-sm mb-4 uppercase tracking-wide">Contact & Support</p>
              <div className="space-y-3">
                <a
                  href="https://wa.me/251970782859"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-gray-500 hover:text-green-400 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <Phone className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-gray-300 group-hover:text-green-400 font-medium transition-colors">WhatsApp Support</p>
                    <p>+251 970 782 859</p>
                  </div>
                </a>
                <a
                  href="tel:+251970782859"
                  className="flex items-center gap-3 text-sm text-gray-500 hover:text-blue-400 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <Phone className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-gray-300 group-hover:text-blue-400 font-medium transition-colors">Call Us</p>
                    <p>+251 970 782 859</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-sm">{t('landing.footer.copyright')} 🇪🇹</p>
            <div className="flex gap-6 text-sm text-gray-600">
              <span className="cursor-default hover:text-gray-400 transition-colors">Privacy Policy</span>
              <span className="cursor-default hover:text-gray-400 transition-colors">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── STICKY MOBILE CTA ── */}
      <div className={`md:hidden fixed bottom-0 inset-x-0 z-40 transition-transform duration-300 ${showStickyCTA ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="bg-gray-900/95 backdrop-blur-xl border-t border-gray-700 px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Get Started Free</p>
            <p className="text-gray-400 text-xs">Start instantly, no payment needed</p>
          </div>
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold text-sm shadow-lg"
          >
            Start Free <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── REGISTER MODAL ── */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowRegister(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowRegister(false)} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">{t('landing.register.title')}</h2>
              <p className="text-gray-400 text-sm">{t('landing.register.subtitle')}</p>
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
                  <p className="text-sm font-medium text-gray-300">{t('landing.register.logoLabel')}</p>
                  <p className="text-xs text-gray-500">{t('landing.register.logoHint')}</p>
                </div>
              </div>

              {/* Fields */}
              {[
                { label: 'Gym Name',   key: 'gymName',   type: 'text',     placeholder: 'My Fitness Center', required: true },
                { label: 'Your Name',  key: 'ownerName', type: 'text',     placeholder: 'Abebe Tadesse',     required: true },
                { label: 'Email',      key: 'email',     type: 'email',    placeholder: 'you@example.com',   required: true },
                { label: 'Phone',      key: 'phone',     type: 'tel',      placeholder: '+251911234567',     required: false },
                { label: 'Password',   key: 'password',  type: 'password', placeholder: '••••••••',          required: true },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    {f.label} {f.required && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type={f.type}
                    value={registerForm[f.key]}
                    onChange={e => setRegisterForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    required={f.required}
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
                  Selected: <span className="text-gray-300">{COLOR_THEMES.find(th => th.id === registerForm.colorTheme)?.name}</span>
                </p>
              </div>

              {/* Privacy */}
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-blue-300 font-semibold">{t('landing.register.privacyTitle')}</span>{' '}
                  {t('landing.register.privacyBody')}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
              >
                {loading ? 'Creating account…' : 'Get Started Free'}
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

// ── App mockup shown in hero on desktop ──────────────────────────────────────
function AppMockup() {
  return (
    <div className="relative select-none">
      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl scale-105 pointer-events-none" />

      {/* Browser chrome */}
      <div className="relative bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-700">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <div className="flex-1 mx-3 h-6 bg-gray-800 rounded-md flex items-center px-3">
            <span className="text-[10px] text-gray-500">hullugyms.app/dashboard</span>
          </div>
        </div>

        {/* Dashboard body */}
        <div className="p-4 bg-gray-950 space-y-3">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Members',       value: '248',       color: 'text-blue-400' },
              { label: "Today's Check-ins", value: '34',    color: 'text-green-400' },
              { label: 'Revenue',       value: 'ETB 12.4K', color: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Recent check-ins list */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Recent Check-ins</p>
              <span className="text-[9px] text-green-400 font-medium">● Live</span>
            </div>
            {[
              { name: 'Abebe Tadesse', time: '2 min ago',  status: 'active',   initials: 'AT' },
              { name: 'Meron Hailu',   time: '8 min ago',  status: 'active',   initials: 'MH' },
              { name: 'Dawit Kebede',  time: '15 min ago', status: 'expiring', initials: 'DK' },
              { name: 'Sara Alemu',    time: '22 min ago', status: 'active',   initials: 'SA' },
            ].map(m => (
              <div key={m.name} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-700/50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                  {m.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white truncate font-medium">{m.name}</p>
                  <p className="text-[9px] text-gray-500">{m.time}</p>
                </div>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${
                  m.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>

          {/* Mini bar chart */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-3">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Weekly Visits</p>
            <div className="flex items-end gap-1 h-10">
              {[40, 65, 55, 80, 70, 90, 75].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm" style={{
                  height: `${h}%`,
                  background: i === 6
                    ? 'linear-gradient(to top, rgb(99,102,241), rgb(168,85,247))'
                    : 'rgb(55,65,81)'
                }} />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <span key={i} className="flex-1 text-center text-[8px] text-gray-600">{d}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -bottom-3 -left-4 bg-green-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-lg shadow-green-500/30 whitespace-nowrap">
        ✓ Abebe just checked in
      </div>
      <div className="absolute -top-3 -right-4 bg-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-lg shadow-blue-500/30 whitespace-nowrap">
        📱 SMS reminder sent
      </div>
    </div>
  );
}
