import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import {
  Dumbbell, CheckCircle, ArrowRight, ArrowLeft, Users,
  Phone, MapPin, Palette, UserPlus, Sparkles, ChevronRight,
  Building2, Clock, CreditCard, MessageSquare, SkipForward
} from 'lucide-react';

const COLOR_THEMES = [
  { id: 'default', name: 'Blue',    dot: 'bg-blue-500',    ring: 'ring-blue-500'    },
  { id: 'purple',  name: 'Purple',  dot: 'bg-purple-500',  ring: 'ring-purple-500'  },
  { id: 'emerald', name: 'Green',   dot: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { id: 'red',     name: 'Red',     dot: 'bg-red-500',     ring: 'ring-red-500'     },
  { id: 'amber',   name: 'Amber',   dot: 'bg-amber-500',   ring: 'ring-amber-500'   },
  { id: 'rose',    name: 'Rose',    dot: 'bg-rose-500',    ring: 'ring-rose-500'    },
];

const MEMBERSHIP_TYPES = [
  { value: '1_month',     label: '1 Month'    },
  { value: '3_months',    label: '3 Months'   },
  { value: '6_months',    label: '6 Months'   },
  { value: '1_year',      label: '1 Year'     },
  { value: '3_days_week', label: '3 Days/Week' },
];

const STEPS = [
  { id: 1, label: 'Welcome'  },
  { id: 2, label: 'Profile'  },
  { id: 3, label: 'Member'   },
  { id: 4, label: 'Done'     },
];

export default function Onboarding() {
  const { gym, updateGym } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]     = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [memberAdded, setMemberAdded] = useState(false);

  // Step 2 — gym profile
  const [profile, setProfile] = useState({
    phone:       gym?.phone       || '',
    address:     gym?.address     || '',
    color_theme: gym?.color_theme || 'default',
  });

  // Step 3 — first member
  const [member, setMember] = useState({
    name:            '',
    phone:           '',
    membership_type: '1_month',
  });

  const next = () => { setError(''); setStep(s => s + 1); };
  const back = () => { setError(''); setStep(s => s - 1); };

  const finish = () => {
    localStorage.setItem('onboarding_done', 'true');
    navigate('/dashboard');
  };

  // ── Step 2 save ─────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await api.put('/auth/gym', profile);
      updateGym(data.gym);
      next();
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 3 save ─────────────────────────────────────────────────────────
  const saveMember = async () => {
    if (!member.name.trim() || !member.phone.trim()) {
      setError('Name and phone number are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.post('/customers', {
        name:             member.name.trim(),
        phone:            member.phone.trim(),
        membership_type:  member.membership_type,
        membership_start: today,
      });
      setMemberAdded(true);
      next();
    } catch (err) {
      setError(err.message || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const skipMember = () => { setError(''); next(); };

  return (
    <div className="min-h-dvh bg-dark-200 flex flex-col items-center
                    justify-start sm:justify-center px-4 py-6 sm:py-10">

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[500px]
                        bg-gym-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-5 sm:mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gym-500/20 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-gym-400" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-white">Hullu Gyms</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-1 sm:gap-2 mb-5 sm:mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold
                              transition-all duration-300
                              ${step > s.id
                                ? 'bg-gym-500 text-white'
                                : step === s.id
                                  ? 'bg-gym-500/20 border-2 border-gym-500 text-gym-400'
                                  : 'bg-dark-100 border border-white/10 text-gray-500'}`}>
                {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
              </div>
              <span className={`ml-1 sm:ml-1.5 text-xs font-medium hidden sm:block
                               ${step >= s.id ? 'text-gray-300' : 'text-gray-600'}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 sm:mx-2 transition-all duration-500
                                ${step > s.id ? 'bg-gym-500' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-dark-100 border border-white/8 rounded-2xl p-5 sm:p-8 shadow-2xl">

          {/* ═══ STEP 1 — WELCOME ═══════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                                bg-gym-500/15 border border-gym-500/25 mb-4">
                  <Sparkles className="w-8 h-8 text-gym-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Welcome to Hullu Gyms! 🎉
                </h1>
                <p className="text-gray-400 text-sm">
                  Hi <span className="text-gym-400 font-semibold">{gym?.name}</span> — your account is ready.
                  Let's get you set up in under 2 minutes.
                </p>
              </div>

              {/* Trial banner */}
              <div className="bg-gym-500/10 border border-gym-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gym-400" />
                  <span className="text-sm font-semibold text-gym-300">14-day free trial — full Starter access</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Users,        text: 'Member management'     },
                    { icon: CreditCard,   text: 'Payment tracking'      },
                    { icon: MessageSquare,text: 'Automated SMS alerts'   },
                    { icon: Building2,    text: 'Staff & role access'    },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-gray-300">
                      <Icon className="w-3.5 h-3.5 text-gym-400 flex-shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={next}
                className="w-full py-3.5 rounded-xl bg-gym-500 hover:bg-gym-600
                           text-white font-semibold flex items-center justify-center gap-2
                           transition-all hover:shadow-lg hover:shadow-gym-500/25 text-base"
              >
                Let's get started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ═══ STEP 2 — GYM PROFILE ════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Complete your gym profile</h2>
                <p className="text-gray-400 text-sm">Help your members recognize your gym.</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number</span>
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-dark-300 border border-white/10
                             text-white placeholder-gray-500 focus:outline-none focus:ring-2
                             focus:ring-gym-500/50 text-base"
                  placeholder="e.g. 0911 234 567"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Address</span>
                </label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-dark-300 border border-white/10
                             text-white placeholder-gray-500 focus:outline-none focus:ring-2
                             focus:ring-gym-500/50 text-base"
                  placeholder="e.g. Bole, Addis Ababa"
                />
              </div>

              {/* Color theme */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <span className="flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> App Color Theme</span>
                </label>
                <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
                  {COLOR_THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setProfile(p => ({ ...p, color_theme: t.id }))}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs
                                  font-medium transition-all min-h-[44px]
                                  ${profile.color_theme === t.id
                                    ? 'border-white/30 bg-white/10 text-white'
                                    : 'border-white/8 text-gray-400 hover:border-white/20'}`}
                    >
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${t.dot}`} />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={back}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-white/10
                             text-gray-400 hover:text-white hover:border-white/20 text-sm transition-all
                             min-h-[48px]"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-gym-500 hover:bg-gym-600
                             text-white font-semibold flex items-center justify-center gap-2
                             text-sm transition-all disabled:opacity-60 min-h-[48px]"
                >
                  {saving ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg> Saving...</>
                  ) : (
                    <>Save & Continue <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3 — ADD FIRST MEMBER ═══════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xl font-bold text-white">Add your first member</h2>
                  <button
                    onClick={skipMember}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" /> Skip
                  </button>
                </div>
                <p className="text-gray-400 text-sm">Register a member to see how it works.</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={member.name}
                  onChange={e => setMember(m => ({ ...m, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-dark-300 border border-white/10
                             text-white placeholder-gray-500 focus:outline-none focus:ring-2
                             focus:ring-gym-500/50 text-base"
                  placeholder="e.g. Abebe Tadesse"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={member.phone}
                  onChange={e => setMember(m => ({ ...m, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-dark-300 border border-white/10
                             text-white placeholder-gray-500 focus:outline-none focus:ring-2
                             focus:ring-gym-500/50 text-base"
                  placeholder="e.g. 0911 234 567"
                />
              </div>

              {/* Membership type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Membership Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {MEMBERSHIP_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setMember(m => ({ ...m, membership_type: t.value }))}
                      className={`py-3 px-3 rounded-lg border text-sm font-medium text-left
                                  transition-all min-h-[48px]
                                  ${member.membership_type === t.value
                                    ? 'border-gym-500/60 bg-gym-500/10 text-gym-300'
                                    : 'border-white/8 text-gray-400 hover:border-white/20'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={back}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-white/10
                             text-gray-400 hover:text-white hover:border-white/20 text-sm transition-all
                             min-h-[48px]"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={saveMember}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-gym-500 hover:bg-gym-600
                             text-white font-semibold flex items-center justify-center gap-2
                             text-sm transition-all disabled:opacity-60 min-h-[48px]"
                >
                  {saving ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg> Adding...</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Add Member</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 4 — ALL SET ════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in text-center">
              <div>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                                bg-emerald-500/15 border border-emerald-500/25 mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">You're all set! 🚀</h2>
                <p className="text-gray-400 text-sm">
                  {memberAdded
                    ? 'Your gym profile is ready and your first member is registered.'
                    : 'Your gym profile is ready. You can add members anytime from the dashboard.'}
                </p>
              </div>

              {/* Next steps */}
              <div className="bg-dark-300 rounded-xl p-4 text-left space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">What to do next</p>
                {[
                  { icon: Users,         text: 'Add your members',       path: '/customers/new' },
                  { icon: CreditCard,    text: 'Record their payments',   path: '/customers'     },
                  { icon: Phone,         text: 'Try the check-in screen', path: '/check-in'      },
                  { icon: MessageSquare, text: 'Enable SMS in Settings',  path: '/settings'      },
                ].map(({ icon: Icon, text, path }) => (
                  <button
                    key={path}
                    onClick={() => { localStorage.setItem('onboarding_done', 'true'); navigate(path); }}
                    className="w-full flex items-center justify-between group py-1.5 min-h-[44px]"
                  >
                    <span className="flex items-center gap-2.5 text-sm text-gray-300
                                     group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4 text-gym-400 flex-shrink-0" />
                      {text}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gym-400
                                            transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>

              <button
                onClick={finish}
                className="w-full py-3.5 rounded-xl bg-gym-500 hover:bg-gym-600
                           text-white font-semibold flex items-center justify-center gap-2
                           transition-all hover:shadow-lg hover:shadow-gym-500/25 text-base
                           min-h-[52px]"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

        {/* Step counter */}
        <p className="text-center text-xs text-gray-600 mt-4">
          Step {step} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
