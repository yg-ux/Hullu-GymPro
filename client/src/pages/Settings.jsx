import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Building,
  Phone,
  MapPin,
  MessageSquare,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle,
  Lock,
  Zap,
  Palette,
  Camera,
  X,
  Upload,
  Image,
  Shield,
  Server,
  UserCheck,
  Download,
  Send,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import clsx from 'clsx';

const COLOR_THEMES = [
  { id: 'default',   name: 'Ocean Blue',  from: '#0ea5e9', to: '#0284c7' },
  { id: 'indigo',    name: 'Indigo',      from: '#6366f1', to: '#4f46e5' },
  { id: 'purple',    name: 'Violet',      from: '#a855f7', to: '#9333ea' },
  { id: 'rose',      name: 'Rose Pink',   from: '#f43f5e', to: '#e11d48' },
  { id: 'red',       name: 'Ruby Red',    from: '#ef4444', to: '#dc2626' },
  { id: 'amber',     name: 'Amber',       from: '#f59e0b', to: '#d97706' },
  { id: 'lime',      name: 'Lime',        from: '#84cc16', to: '#65a30d' },
  { id: 'emerald',   name: 'Emerald',     from: '#10b981', to: '#059669' },
  { id: 'teal',      name: 'Teal',        from: '#14b8a6', to: '#0d9488' },
  { id: 'gold',      name: 'Gold',        from: '#eab308', to: '#a16207' },
  { id: 'chocolate', name: 'Chocolate',   from: '#92400e', to: '#78350f' },
  { id: 'slate',     name: 'Slate',       from: '#64748b', to: '#475569' },
];

const THEME_SCALES = {
  default:   { r300:'125 211 252', r400:'56 189 248',  r500:'14 165 233',  r600:'2 132 199',   r700:'3 105 161'  },
  indigo:    { r300:'165 180 252', r400:'129 140 248', r500:'99 102 241',  r600:'79 70 229',   r700:'67 56 202'  },
  purple:    { r300:'216 180 254', r400:'192 132 252', r500:'168 85 247',  r600:'147 51 234',  r700:'126 34 206' },
  rose:      { r300:'253 164 175', r400:'251 113 133', r500:'244 63 94',   r600:'225 29 72',   r700:'190 18 60'  },
  red:       { r300:'252 165 165', r400:'248 113 113', r500:'239 68 68',   r600:'220 38 38',   r700:'185 28 28'  },
  amber:     { r300:'252 211 77',  r400:'251 191 36',  r500:'245 158 11',  r600:'217 119 6',   r700:'180 83 9'   },
  lime:      { r300:'190 242 100', r400:'163 230 53',  r500:'132 204 22',  r600:'101 163 13',  r700:'77 124 15'  },
  emerald:   { r300:'110 231 183', r400:'52 211 153',  r500:'16 185 129',  r600:'5 150 105',   r700:'4 120 87'   },
  teal:      { r300:'94 234 212',  r400:'45 212 191',  r500:'20 184 166',  r600:'13 148 136',  r700:'15 118 110' },
  gold:      { r300:'253 224 71',  r400:'250 204 21',  r500:'234 179 8',   r600:'161 98 7',    r700:'133 77 14'  },
  chocolate: { r300:'214 162 101', r400:'180 120 60',  r500:'146 64 14',   r600:'120 53 15',   r700:'92 40 10'   },
  slate:     { r300:'148 163 184', r400:'100 116 139', r500:'71 85 105',   r600:'51 65 85',    r700:'30 41 59'   },
};

function applyTheme(themeId) {
  const s = THEME_SCALES[themeId] || THEME_SCALES.default;
  const el = document.documentElement;
  el.style.setProperty('--gym-300-rgb', s.r300);
  el.style.setProperty('--gym-400-rgb', s.r400);
  el.style.setProperty('--gym-500-rgb', s.r500);
  el.style.setProperty('--gym-600-rgb', s.r600);
  el.style.setProperty('--gym-700-rgb', s.r700);
}

export default function Settings() {
  const { gym, user, updateGym } = useAuth();
  const toast = useToast();
  const { lang, setLang, t } = useLanguage();

  const [gymForm, setGymForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsAvailable, setSmsAvailable] = useState(false);
  const [gymLoading, setGymLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Appearance state
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [appearanceLoading, setAppearanceLoading] = useState(false);
  const logoInputRef = useRef(null);

  useEffect(() => {
    loadGym();
  }, []);

  const loadGym = async () => {
    try {
      const data = await api.get('/auth/me');
      setGymForm({
        name: data.gym?.name || '',
        phone: data.gym?.phone || '',
        email: data.gym?.email || '',
        address: data.gym?.address || '',
      });
      setSmsEnabled(Boolean(data.gym?.sms_enabled));
      setSmsAvailable(Boolean(data.gym?.sms_available));
      setSelectedTheme(data.gym?.color_theme || 'default');
      setLogoPreview(data.gym?.logo || null);
    } catch (err) {
      toast.error(t('settings.failedLoad'));
    } finally {
      setPageLoading(false);
    }
  };

  const handleGymSave = async (e) => {
    e.preventDefault();
    setGymLoading(true);
    try {
      await api.put('/auth/gym', { address: gymForm.address });
      toast.success(t('settings.addressUpdated'));
    } catch (err) {
      toast.error(err.message || t('settings.failedAddress'));
    } finally {
      setGymLoading(false);
    }
  };

  const handleSmsSave = async () => {
    setSmsLoading(true);
    try {
      await api.put('/auth/gym', { sms_enabled: smsEnabled });
      toast.success(smsEnabled ? t('settings.smsEnabled') : t('settings.smsDisabled'));
    } catch (err) {
      toast.error(err.message || t('settings.failedSms'));
    } finally {
      setSmsLoading(false);
    }
  };

  const handleThemePreview = (themeId) => {
    setSelectedTheme(themeId);
    applyTheme(themeId);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error(t('settings.photoTooLarge'));
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleAppearanceSave = async () => {
    setAppearanceLoading(true);
    try {
      let logoData = logoPreview;
      if (logoFile) {
        logoData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
      }

      const payload = { color_theme: selectedTheme };
      if (logoFile || logoPreview === null) {
        payload.logo = logoData;
      }

      const res = await api.put('/auth/gym', payload);

      // Update context + localStorage immediately
      updateGym({ color_theme: selectedTheme, logo: res.gym?.logo ?? logoData });
      applyTheme(selectedTheme);

      toast.success(t('settings.appearanceSaved'));
      setLogoFile(null);
    } catch (err) {
      toast.error(err.message || t('settings.failedAppearance'));
      // Revert theme preview on error
      applyTheme(gym?.color_theme || 'default');
      setSelectedTheme(gym?.color_theme || 'default');
    } finally {
      setAppearanceLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-6 space-y-4">
            <div className="h-6 w-40 bg-gray-800 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-800 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>
        <p className="text-gray-400 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* ── Gym Appearance ── */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gym-600/20 flex items-center justify-center">
            <Palette className="w-5 h-5 text-gym-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">{t('settings.appearance')}</h2>
        </div>

        {/* Logo Upload */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-3">{t('settings.gymProfilePhoto')}</p>
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {logoPreview ? (
                <>
                  <img
                    src={logoPreview}
                    alt="Gym logo"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-gym-500/40"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-dark-200 border-2 border-dashed border-gray-700 flex flex-col items-center justify-center">
                  <Image className="w-7 h-7 text-gray-600 mb-1" />
                  <span className="text-xs text-gray-600">{t('settings.noPhoto')}</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-400 mb-2">{t('settings.uploadLogoHint')}</p>
              <label className="cursor-pointer">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <span className="btn-secondary inline-flex items-center gap-2 text-sm">
                  <Upload className="w-4 h-4" />
                  {logoPreview ? t('settings.changePhoto') : t('settings.uploadPhoto')}
                </span>
              </label>
              <p className="text-xs text-gray-600 mt-1.5">{t('settings.photoFormatHint')}</p>
            </div>
          </div>
        </div>

        {/* Color Theme */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-3">{t('settings.colorTheme')}</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {COLOR_THEMES.map(theme => (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleThemePreview(theme.id)}
                className={clsx(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                  selectedTheme === theme.id
                    ? 'border-white/50 bg-white/5 scale-105'
                    : 'border-gray-700 hover:border-gray-500'
                )}
              >
                <div
                  className="w-8 h-8 rounded-full shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
                />
                <span className="text-xs text-gray-400 text-center leading-tight">{theme.name}</span>
                {selectedTheme === theme.id && (
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">{t('settings.themePreviewHint')}</p>
        </div>

        {/* Language */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-3">{t('settings.languageLabel')}</p>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {[
              { id: 'en', name: 'English',  flag: '🇬🇧' },
              { id: 'am', name: 'አማርኛ',     flag: '🇪🇹' },
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { setLang(opt.id); toast.success(opt.id === 'am' ? t('settings.langChangedAm') : t('settings.langChangedEn')); }}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-xl border-2 transition-all',
                  lang === opt.id
                    ? 'border-white/50 bg-white/5 scale-[1.02]'
                    : 'border-gray-700 hover:border-gray-500'
                )}
              >
                <span className="text-2xl">{opt.flag}</span>
                <span className="text-sm font-semibold text-white">{opt.name}</span>
                {lang === opt.id && (
                  <CheckCircle className="w-4 h-4 text-white ml-auto" />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">{t('settings.languageChangeHint')}</p>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-800">
          <button
            type="button"
            onClick={handleAppearanceSave}
            disabled={appearanceLoading}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {appearanceLoading ? t('settings.saving') : t('settings.saveAppearance')}
          </button>
        </div>
      </div>

      {/* ── Gym Profile ── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-gym-600/20 flex items-center justify-center">
            <Building className="w-5 h-5 text-gym-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">{t('settings.gymProfile')}</h2>
        </div>

        {/* Read-only info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-dark-200 rounded-xl">
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('settings.gymName')}</p>
            <p className="text-white font-medium">{gymForm.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('settings.phoneNumber')}</p>
            <p className="text-white font-medium">{gymForm.phone || '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-500 mb-1">{t('settings.email')}</p>
            <p className="text-white font-medium">{gymForm.email || '—'}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {t('settings.profileNote')}
        </p>

        {/* Editable address */}
        <form onSubmit={handleGymSave} className="space-y-3 pt-2">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('settings.address')}</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea
                value={gymForm.address}
                onChange={e => setGymForm(p => ({ ...p, address: e.target.value }))}
                className="input-field pl-10 h-20 resize-none"
                placeholder={t('settings.addressPlaceholder')}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={gymLoading} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              {gymLoading ? t('settings.saving') : t('settings.saveAddress')}
            </button>
          </div>
        </form>
      </div>

      {/* ── SMS Notifications ── */}
      {(() => {
        const smsPlanAllowed = ['starter', 'pro'].includes(gym?.subscription_plan);
        const canUseSms = smsPlanAllowed && smsAvailable;

        return (
          <div className={clsx('card p-6 space-y-4 relative', !smsPlanAllowed && 'overflow-hidden')}>
            {!smsPlanAllowed && (
              <div className="absolute inset-0 bg-dark-100/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gray-700/80 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-gray-400" />
                </div>
                <div className="text-center px-6">
                  <p className="font-semibold text-white mb-1">{t('settings.smsLockedTitle')}</p>
                  <p className="text-sm text-gray-400">{t('settings.smsLockedDesc')}</p>
                </div>
                <a href="/subscription"
                  className="mt-1 px-5 py-2 bg-gradient-to-r from-gym-500 to-purple-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-lg">
                  {t('settings.upgradeNow')}
                </a>
              </div>
            )}

            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-green-600/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{t('settings.smsNotifications')}</h2>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Zap className="w-3 h-3 text-gym-400" />
                  {t('settings.smsPoweredBy')}
                </p>
              </div>
            </div>

            {smsPlanAllowed && !smsAvailable && (
              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{t('settings.smsNotActivated')}</p>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-dark-200 rounded-lg border border-gray-700">
              <div>
                <p className="font-medium text-white">{t('settings.enableSmsTitle')}</p>
                <p className="text-sm text-gray-400 mt-0.5">{t('settings.enableSmsDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() => canUseSms && setSmsEnabled(v => !v)}
                disabled={!canUseSms}
                className={clsx(
                  'relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed',
                  smsEnabled && canUseSms ? 'bg-green-500' : 'bg-gray-600'
                )}
              >
                <span className={clsx(
                  'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                  smsEnabled && canUseSms ? 'translate-x-6' : 'translate-x-0'
                )} />
              </button>
            </div>

            <div className="space-y-2 px-1">
              {[
                t('settings.smsFeatureWelcome'),
                t('settings.smsFeaturePayment'),
                t('settings.smsFeatureExpiry'),
              ].map(text => (
                <div key={text} className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-400" />
                  <span dangerouslySetInnerHTML={{ __html: text }} />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSmsSave}
                disabled={smsLoading || !canUseSms}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {smsLoading ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Data & Privacy ── */}
      <div className="card p-6 space-y-5 border border-blue-500/20 bg-blue-500/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{t('settings.privacyTitle')}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t('settings.privacySubtitle')}</p>
          </div>
        </div>

        {/* Core commitment */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/25 rounded-xl">
          <p className="text-sm text-blue-200 leading-relaxed">
            {t('settings.privacyCommitment')}
          </p>
        </div>

        {/* Three guarantees */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: UserCheck,
              color: 'text-green-400',
              bg: 'bg-green-500/10',
              title: t('settings.privacyGuarantee1Title'),
              desc: t('settings.privacyGuarantee1Desc'),
            },
            {
              icon: Server,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
              title: t('settings.privacyGuarantee2Title'),
              desc: t('settings.privacyGuarantee2Desc'),
            },
            {
              icon: Download,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
              title: t('settings.privacyGuarantee3Title'),
              desc: t('settings.privacyGuarantee3Desc'),
            },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className={`p-3 rounded-xl ${bg} flex items-start gap-3`}>
              <div className={`mt-0.5 flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-xs font-semibold ${color}`}>{title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* What data we store */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('settings.privacyWhatWeStore')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              t('settings.privacyData1'),
              t('settings.privacyData2'),
              t('settings.privacyData3'),
              t('settings.privacyData4'),
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-600 border-t border-gray-800/50 pt-3">
          {t('settings.privacyFooter')}
        </p>
      </div>

      {/* ── SMS & Notifications ── */}
      <SmsPanel toast={toast} />

      {/* ── Change Password ── */}
      <ChangePasswordForm toast={toast} t={t} />
    </div>
  );
}

function ChangePasswordForm({ toast, t }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = t('settings.errRequired');
    if (form.newPassword.length < 8) errs.newPassword = t('settings.errMin8');
    if (!/\d/.test(form.newPassword)) errs.newPassword = t('settings.errMustNumber');
    if (form.newPassword !== form.confirmPassword) errs.confirmPassword = t('settings.errNoMatch');
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success(t('settings.passwordChanged'));
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message || t('settings.failedPassword'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-purple-600/20 flex items-center justify-center">
          <Lock className="w-5 h-5 text-purple-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">{t('settings.changePassword')}</h2>
      </div>

      {[
        { name: 'currentPassword', label: t('settings.currentPassword') },
        { name: 'newPassword', label: t('settings.newPassword'), hint: t('settings.passwordHint') },
        { name: 'confirmPassword', label: t('settings.confirmPassword') },
      ].map(({ name, label, hint }) => (
        <div key={name}>
          <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              name={name}
              value={form[name]}
              onChange={handleChange}
              className={clsx('input-field pr-10', errors[name] && 'border-red-500')}
              placeholder="••••••••"
            />
            {name === 'currentPassword' && (
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
          {hint && !errors[name] && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
          {errors[name] && (
            <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors[name]}
            </p>
          )}
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
          <Lock className="w-4 h-4" />
          {loading ? t('settings.updating') : t('settings.changePassword')}
        </button>
      </div>
    </form>
  );
}

// ── SMS & Notifications Panel ────────────────────────────────────────────────
const SMS_TYPES = [
  { id: 'welcome',   label: 'Welcome SMS',              desc: 'Sent when a new member is registered',            color: 'text-gym-400',     bg: 'bg-gym-500/10',     border: 'border-gym-500/20'    },
  { id: 'payment',   label: 'Payment Confirmation',     desc: 'Sent after a payment is recorded',                color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20'},
  { id: 'expiry_3d', label: 'Expiry Reminder (3 days)', desc: 'Sent 3 days before membership expires',           color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'  },
  { id: 'expiry_1d', label: 'Expiry Reminder (1 day)',  desc: 'Sent the day before membership expires',          color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
  { id: 'expiry_0d', label: 'Expiry Day Notice',        desc: 'Sent on the day membership expires',              color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'    },
];

const TYPE_LABEL = {
  welcome:   'Welcome',
  payment:   'Payment',
  expiry_3d: 'Expiry 3d',
  expiry_1d: 'Expiry 1d',
  expiry_0d: 'Expiry Today',
  subscription_renewal_7d: 'Sub Renewal 7d',
  subscription_renewal_1d: 'Sub Renewal 1d',
};

function SmsPanel({ toast }) {
  const [tab, setTab] = useState('preview');
  const [previews, setPreviews] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [expandedType, setExpandedType] = useState(null);

  const [testPhone, setTestPhone] = useState('');
  const [testType, setTestType] = useState('welcome');
  const [testLoading, setTestLoading] = useState(false);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadPreviews = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const data = await api.get('/sms/preview');
      setPreviews(data);
    } catch (e) {
      toast.error('Failed to load SMS previews');
    } finally {
      setPreviewLoading(false);
    }
  }, [toast]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await api.get('/sms/logs');
      setLogs(data);
    } catch (e) {
      toast.error('Failed to load SMS logs');
    } finally {
      setLogsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (tab === 'preview' && !previews) loadPreviews();
    if (tab === 'logs') loadLogs();
  }, [tab]);

  const sendTest = async () => {
    if (!testPhone.trim()) { toast.error('Enter a phone number'); return; }
    setTestLoading(true);
    try {
      const res = await api.post('/sms/send-test', { phone: testPhone.trim(), type: testType });
      if (res.success) toast.success('Test SMS sent successfully!');
      else toast.error(res.message || 'SMS failed to send');
    } catch (e) {
      toast.error(e.message || 'Failed to send test SMS');
    } finally {
      setTestLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-ET', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gym-600/20 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-gym-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">SMS & Notifications</h2>
          <p className="text-xs text-gray-500">Preview message templates, send tests, and check delivery history</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-200 p-1 rounded-xl">
        {[
          { id: 'preview', label: 'Message Previews' },
          { id: 'test',    label: 'Send Test' },
          { id: 'logs',    label: 'Delivery Log' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all',
              tab === t.id ? 'bg-gym-600 text-white shadow' : 'text-gray-400 hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Preview Tab ── */}
      {tab === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Actual message text using your gym name. "Abebe Bikila" is a placeholder for the real member name.</p>
            <button onClick={loadPreviews} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Refresh">
              <RefreshCw className={clsx('w-4 h-4', previewLoading && 'animate-spin')} />
            </button>
          </div>

          {previewLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-dark-200 rounded-xl animate-pulse" />)}
            </div>
          ) : !previews ? (
            <button onClick={loadPreviews} className="w-full py-8 text-gym-400 text-sm hover:text-gym-300 transition-colors">
              Click to load previews
            </button>
          ) : (
            SMS_TYPES.map(type => (
              <div key={type.id} className={clsx('border rounded-xl overflow-hidden', type.border)}>
                <button
                  onClick={() => setExpandedType(expandedType === type.id ? null : type.id)}
                  className={clsx('w-full flex items-center justify-between px-4 py-3 transition-colors', type.bg)}
                >
                  <div className="flex items-center gap-3 text-left">
                    <div>
                      <p className={clsx('text-sm font-semibold', type.color)}>{type.label}</p>
                      <p className="text-xs text-gray-500">{type.desc}</p>
                    </div>
                  </div>
                  {expandedType === type.id
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>
                {expandedType === type.id && (
                  <div className="px-4 py-3 bg-dark-200/60 border-t border-gray-800">
                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap font-mono bg-dark-300 p-3 rounded-lg border border-gray-700">
                      {previews[type.id] || <span className="text-gray-600 italic">Preview not available</span>}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">{previews[type.id]?.length || 0} characters</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Test SMS Tab ── */}
      {tab === 'test' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-200">
            ⚠️ This sends a <strong>real SMS</strong> to the number you enter. Use it to verify your SMS service is working and check how messages look on a real phone.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone Number</label>
            <input
              type="tel"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              placeholder="e.g. 0912345678 or 251912345678"
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Message Type</label>
            <select value={testType} onChange={e => setTestType(e.target.value)} className="input w-full">
              {SMS_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={sendTest}
            disabled={testLoading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {testLoading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</>
              : <><Send className="w-4 h-4" /> Send Test SMS</>}
          </button>
        </div>
      )}

      {/* ── Logs Tab ── */}
      {tab === 'logs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Last 100 SMS attempts for your gym</p>
            <button onClick={loadLogs} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Refresh">
              <RefreshCw className={clsx('w-4 h-4', logsLoading && 'animate-spin')} />
            </button>
          </div>

          {logsLoading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-12 bg-dark-200 rounded-lg animate-pulse" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No SMS logs yet. Logs appear here once members are added or reminders run.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dark-200 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5">Date</th>
                    <th className="text-left px-4 py-2.5">Customer</th>
                    <th className="text-left px-4 py-2.5">Phone</th>
                    <th className="text-left px-4 py-2.5">Type</th>
                    <th className="text-left px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-dark-200/50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 opacity-50" />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white">{log.customer_name || <span className="text-gray-600">—</span>}</td>
                      <td className="px-4 py-3 text-gray-300 font-mono text-xs">{log.phone}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-dark-300 text-gray-300">
                          {TYPE_LABEL[log.message_type] || log.message_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium',
                          log.status === 'sent'   ? 'bg-emerald-500/15 text-emerald-400' :
                          log.status === 'failed' ? 'bg-red-500/15 text-red-400' :
                                                    'bg-gray-500/15 text-gray-400'
                        )}>
                          {log.status === 'sent' && <CheckCircle className="w-3 h-3" />}
                          {log.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
