import { useState, useEffect, useRef } from 'react';
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
  Image
} from 'lucide-react';
import clsx from 'clsx';

const COLOR_THEMES = [
  { id: 'default', name: 'Ocean Blue',   from: '#0ea5e9', to: '#0284c7' },
  { id: 'emerald', name: 'Emerald Green', from: '#10b981', to: '#059669' },
  { id: 'purple',  name: 'Purple',        from: '#a855f7', to: '#9333ea' },
  { id: 'red',     name: 'Ruby Red',      from: '#ef4444', to: '#dc2626' },
  { id: 'amber',   name: 'Amber',         from: '#f59e0b', to: '#d97706' },
  { id: 'cyan',    name: 'Cyan',          from: '#06b6d4', to: '#0891b2' },
];

const THEME_SCALES = {
  default: { r300:'125 211 252', r400:'56 189 248',  r500:'14 165 233',  r600:'2 132 199',   r700:'3 105 161'  },
  emerald: { r300:'110 231 183', r400:'52 211 153',  r500:'16 185 129',  r600:'5 150 105',   r700:'4 120 87'   },
  purple:  { r300:'216 180 254', r400:'192 132 252', r500:'168 85 247',  r600:'147 51 234',  r700:'126 34 206' },
  red:     { r300:'252 165 165', r400:'248 113 113', r500:'239 68 68',   r600:'220 38 38',   r700:'185 28 28'  },
  amber:   { r300:'252 211 77',  r400:'251 191 36',  r500:'245 158 11',  r600:'217 119 6',   r700:'180 83 9'   },
  cyan:    { r300:'103 232 249', r400:'34 211 238',  r500:'6 182 212',   r600:'8 145 178',   r700:'14 116 144' },
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
