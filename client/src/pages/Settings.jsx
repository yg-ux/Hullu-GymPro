import { useState, useEffect, useRef } from 'react';
import { api, formatCurrency } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Building,
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
  X,
  Upload,
  Image,
  Shield,
  Server,
  UserCheck,
  Download,
  Tag,
  Plus,
  Trash2,
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

      {/* ── Membership Pricing Packages ── */}
      <PricingPackagesPanel toast={toast} />


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

      {/* ── Change Password ── */}
      <ChangePasswordForm toast={toast} t={t} />
    </div>
  );
}

const MEMBERSHIP_TYPES = [
  { value: 'daily', label: 'Daily Pass' },
  { value: '1_month', label: '1 Month' },
  { value: '2_months', label: '2 Months' },
  { value: '3_months', label: '3 Months' },
  { value: '6_months', label: '6 Months' },
  { value: '1_year', label: '1 Year' },
  { value: '3_days_week', label: '3×/Week' },
];

function PricingPackagesPanel({ toast }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', membership_type: '1_month', price: '', description: '', is_active: true });

  useEffect(() => { loadPackages(); }, []);

  const loadPackages = async () => {
    try {
      const data = await api.get('/packages');
      setPackages(data.data || []);
    } catch { toast.error('Failed to load pricing packages'); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setEditing(null); setForm({ name: '', membership_type: '1_month', price: '', description: '', is_active: true }); setShowForm(true); };
  const openEdit = (pkg) => { setEditing(pkg); setForm({ name: pkg.name, membership_type: pkg.membership_type, price: String(pkg.price), description: pkg.description || '', is_active: pkg.is_active }); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return toast.error('Name and price are required');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/packages/${editing.id}`, { ...form, price: parseFloat(form.price) });
        toast.success('Package updated');
      } else {
        await api.post('/packages', { ...form, price: parseFloat(form.price) });
        toast.success('Package created');
      }
      setShowForm(false);
      loadPackages();
    } catch (err) { toast.error(err.message || 'Failed to save package'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (pkg) => {
    if (!confirm(`Delete "${pkg.name}"?`)) return;
    try {
      await api.delete(`/packages/${pkg.id}`);
      toast.success('Package deleted');
      loadPackages();
    } catch { toast.error('Failed to delete package'); }
  };

  const toggleActive = async (pkg) => {
    try {
      await api.put(`/packages/${pkg.id}`, { is_active: !pkg.is_active });
      loadPackages();
    } catch { toast.error('Failed to update package'); }
  };

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-600/20 flex items-center justify-center">
            <Tag className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Pricing Packages</h2>
            <p className="text-xs text-gray-500 mt-0.5">Preset prices for your membership plans</p>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Package
        </button>
      </div>

      {/* Explanation box */}
      <div className="p-4 bg-amber-500/8 border border-amber-500/20 rounded-xl space-y-2">
        <p className="text-sm font-medium text-amber-300">💡 What are pricing packages?</p>
        <p className="text-sm text-gray-400 leading-relaxed">
          Pricing packages are <span className="text-white font-medium">quick-select buttons</span> that appear on the Add Member form. Instead of typing a price every time, staff can click a package to instantly fill in the membership type and amount.
        </p>
        <ul className="space-y-1 text-xs text-gray-500 mt-1">
          <li className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">•</span> Create one package per plan you offer (e.g. "Monthly Basic — 1,500 ETB", "3 Months — 4,000 ETB")</li>
          <li className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">•</span> All active packages show up as buttons when adding or renewing a member</li>
          <li className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">•</span> Clicking a package auto-selects the membership type and fills the price — no typing needed</li>
          <li className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">•</span> Use the toggle on each package to hide it temporarily without deleting it</li>
        </ul>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />)}</div>
      ) : packages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No pricing packages yet</p>
          <p className="text-xs mt-1">Add your first package to auto-fill prices when adding members</p>
        </div>
      ) : (
        <div className="space-y-2">
          {packages.map(pkg => (
            <div key={pkg.id} className={clsx('flex items-center gap-3 p-3 rounded-xl border transition-all', pkg.is_active ? 'bg-dark-200 border-gray-700' : 'bg-dark-300 border-gray-800 opacity-60')}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white text-sm">{pkg.name}</span>
                  <span className="text-xs bg-gym-500/20 text-gym-400 px-2 py-0.5 rounded-full">
                    {MEMBERSHIP_TYPES.find(t => t.value === pkg.membership_type)?.label || pkg.membership_type}
                  </span>
                </div>
                {pkg.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{pkg.description}</p>}
              </div>
              <span className="text-gym-400 font-bold text-sm flex-shrink-0">{formatCurrency(pkg.price)}</span>
              <button onClick={() => toggleActive(pkg)} title={pkg.is_active ? 'Deactivate' : 'Activate'}
                className={clsx('w-8 h-4 rounded-full transition-colors flex-shrink-0 relative', pkg.is_active ? 'bg-green-500' : 'bg-gray-600')}>
                <span className={clsx('absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform', pkg.is_active ? 'translate-x-4 left-0.5' : 'translate-x-0 left-0.5')} />
              </button>
              <button onClick={() => openEdit(pkg)} className="p-1.5 text-gray-400 hover:text-white transition-colors"><Save className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete(pkg)} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-300 rounded-2xl p-6 w-full max-w-md space-y-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{editing ? 'Edit Package' : 'New Package'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Package Name</label>
                <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="input-field" placeholder="e.g. Monthly Basic" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Membership Type</label>
                  <select value={form.membership_type} onChange={e => setForm(p => ({...p, membership_type: e.target.value}))} className="input-field">
                    {MEMBERSHIP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Price (ETB)</label>
                  <input type="number" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} className="input-field" placeholder="1500" min="0" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description (optional)</label>
                <input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="input-field" placeholder="What's included..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
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

