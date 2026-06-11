import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useSubscriptionGate } from '../context/AuthContext';
import {
  ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, X, Download, Loader2
} from 'lucide-react';
import clsx from 'clsx';

const MEMBERSHIP_OPTIONS = [
  { value: '1_month',  label: '1 Month' },
  { value: '2_months', label: '2 Months' },
  { value: '3_months', label: '3 Months' },
  { value: '6_months', label: '6 Months' },
  { value: '1_year',   label: '1 Year' },
  { value: '3_days_week', label: '3 Days/Week' },
  { value: 'daily',   label: 'Day Pass' },
];

const EXPECTED_COLUMNS = ['name', 'phone', 'email', 'membership_type', 'notes'];

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line) => {
    const result = [];
    let inQuotes = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQuotes) { inQuotes = true; }
      else if (ch === '"' && inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"' && inQuotes) { inQuotes = false; }
      else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
  const rows = lines.slice(1).map(line => {
    const cells = parseRow(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] || ''; });
    return obj;
  });
  return { headers, rows };
}

export default function ImportCustomers() {
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const gate = useSubscriptionGate();
  const fileRef = useRef(null);

  const [step, setStep] = useState('upload'); // upload | preview | result
  const [csvData, setCsvData] = useState(null);
  const [columnMap, setColumnMap] = useState({});
  const [defaultMembership, setDefaultMembership] = useState('1_month');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error(t('import.csvOnly'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseCSV(text);
      if (parsed.rows.length === 0) {
        toast.error(t('import.emptyFile'));
        return;
      }

      // Auto-map columns
      const map = {};
      EXPECTED_COLUMNS.forEach(col => {
        const found = parsed.headers.find(h => h === col || h.replace(/[^a-z_]/g, '') === col);
        if (found) map[col] = found;
      });
      // If no 'name' found, try 'full name', 'fullname', etc.
      if (!map.name) {
        const nameCand = parsed.headers.find(h => h.includes('name'));
        if (nameCand) map.name = nameCand;
      }

      setCsvData(parsed);
      setColumnMap(map);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const mappedRows = csvData?.rows.map(row => ({
    name: row[columnMap.name] || '',
    phone: row[columnMap.phone] || '',
    email: row[columnMap.email] || '',
    membership_type: row[columnMap.membership_type] || defaultMembership,
    notes: row[columnMap.notes] || '',
  })) || [];

  const validRows = mappedRows.filter(r => r.name.trim().length >= 2);
  const invalidRows = mappedRows.filter(r => r.name.trim().length < 2);

  const handleImport = async () => {
    if (!gate()) return;
    if (validRows.length === 0) {
      toast.error(t('import.noValidRows'));
      return;
    }
    setImporting(true);
    try {
      const res = await api.post('/customers/bulk-import', { members: validRows });
      setResult(res);
      setStep('result');
      if (res.success > 0) toast.success(t('import.successToast', { n: res.success }));
    } catch (err) {
      toast.error(err.message || t('import.failed'));
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'name,phone,email,membership_type,notes\nJohn Doe,0912345678,john@email.com,1_month,Regular member\nJane Smith,0987654321,,3_months,';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'members-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/customers" className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('import.title')}</h1>
          <p className="text-gray-400">{t('import.subtitle')}</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {['upload', 'preview', 'result'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              step === s ? 'bg-gym-500 text-white' :
              ['upload','preview','result'].indexOf(step) > i ? 'bg-green-500 text-white' :
              'bg-dark-200 text-gray-500'
            )}>
              {['upload','preview','result'].indexOf(step) > i ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={step === s ? 'text-white font-medium' : 'text-gray-500'}>
              {t(`import.step${i + 1}`)}
            </span>
            {i < 2 && <div className="w-8 h-px bg-gray-700 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="card p-12 border-2 border-dashed border-gray-700 hover:border-gym-500/60 cursor-pointer transition-all group text-center"
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            <div className="w-16 h-16 rounded-2xl bg-gym-500/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-gym-500/20 transition-colors">
              <Upload className="w-8 h-8 text-gym-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('import.dropzone')}</h3>
            <p className="text-gray-400 text-sm">{t('import.dropzoneHint')}</p>
            <p className="text-xs text-gray-600 mt-2">{t('import.maxRows')}</p>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              {t('import.templateTitle')}
            </h3>
            <p className="text-xs text-gray-400 mb-3">{t('import.templateHint')}</p>
            <div className="overflow-x-auto rounded-lg border border-gray-800 mb-3">
              <table className="w-full text-xs">
                <thead><tr className="bg-dark-200">
                  {EXPECTED_COLUMNS.map(c => <th key={c} className="px-3 py-2 text-gray-400 text-left font-mono">{c}</th>)}
                </tr></thead>
                <tbody><tr>
                  <td className="px-3 py-2 text-gray-300">John Doe</td>
                  <td className="px-3 py-2 text-gray-300">0912345678</td>
                  <td className="px-3 py-2 text-gray-300">john@email.com</td>
                  <td className="px-3 py-2 text-gray-300">1_month</td>
                  <td className="px-3 py-2 text-gray-300">Regular member</td>
                </tr></tbody>
              </table>
            </div>
            <div className="text-xs text-gray-500 mb-3">
              {t('import.membershipValues')}: {MEMBERSHIP_OPTIONS.map(o => <code key={o.value} className="mx-0.5 px-1 py-0.5 bg-dark-300 rounded text-gray-400">{o.value}</code>)}
            </div>
            <button onClick={downloadTemplate} className="btn-secondary inline-flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" />
              {t('import.downloadTemplate')}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Column Mapping */}
      {step === 'preview' && csvData && (
        <div className="space-y-4">
          {/* Column mapping */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{t('import.mapColumns')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EXPECTED_COLUMNS.map(col => (
                <div key={col}>
                  <label className="block text-xs text-gray-400 mb-1 capitalize">{col} {col === 'name' && <span className="text-red-400">*</span>}</label>
                  <select
                    value={columnMap[col] || ''}
                    onChange={e => setColumnMap(prev => ({ ...prev, [col]: e.target.value || undefined }))}
                    className="input-field text-sm"
                  >
                    <option value="">{t('import.notMapped')}</option>
                    {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {!columnMap.name && (
              <p className="mt-3 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {t('import.nameRequired')}
              </p>
            )}
          </div>

          {/* Default membership type (for rows without it) */}
          <div className="card p-5">
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('import.defaultMembership')}</label>
            <select
              value={defaultMembership}
              onChange={e => setDefaultMembership(e.target.value)}
              className="input-field"
            >
              {MEMBERSHIP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">{t('import.defaultMembershipHint')}</p>
          </div>

          {/* Preview table */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">{t('import.preview')}</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-400">{validRows.length} {t('import.valid')}</span>
                {invalidRows.length > 0 && <span className="text-red-400">{invalidRows.length} {t('import.invalid')}</span>}
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-xs">
                <thead><tr className="bg-dark-200 border-b border-gray-800">
                  <th className="px-3 py-2 text-left text-gray-400">#</th>
                  <th className="px-3 py-2 text-left text-gray-400">{t('import.colName')}</th>
                  <th className="px-3 py-2 text-left text-gray-400">{t('import.colPhone')}</th>
                  <th className="px-3 py-2 text-left text-gray-400">{t('import.colMembership')}</th>
                  <th className="px-3 py-2 text-left text-gray-400">{t('import.colStatus')}</th>
                </tr></thead>
                <tbody>
                  {mappedRows.slice(0, 10).map((row, i) => {
                    const valid = row.name.trim().length >= 2;
                    return (
                      <tr key={i} className={clsx('border-b border-gray-800/40', !valid && 'bg-red-500/5')}>
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 text-white">{row.name || <span className="text-red-400 italic">{t('import.missing')}</span>}</td>
                        <td className="px-3 py-2 text-gray-300">{row.phone || '-'}</td>
                        <td className="px-3 py-2 text-gray-300">{row.membership_type}</td>
                        <td className="px-3 py-2">
                          {valid
                            ? <span className="text-green-400">✓</span>
                            : <span className="text-red-400">{t('import.noName')}</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {mappedRows.length > 10 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-center text-gray-500">
                        {t('import.moreRows', { n: mappedRows.length - 10 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setStep('upload'); setCsvData(null); }} className="btn-secondary flex-1">
              {t('common.back')}
            </button>
            <button
              onClick={handleImport}
              disabled={importing || !columnMap.name || validRows.length === 0}
              className="btn-primary flex-1 inline-flex items-center justify-center gap-2"
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t('import.importing')}</>
              ) : (
                <>{t('import.importBtn', { n: validRows.length })}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="card p-8 text-center">
            <div className={clsx(
              'w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4',
              result.success > 0 ? 'bg-green-500/20' : 'bg-red-500/20'
            )}>
              {result.success > 0
                ? <CheckCircle className="w-10 h-10 text-green-400" />
                : <AlertCircle className="w-10 h-10 text-red-400" />}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{t('import.doneTitle')}</h2>
            <p className="text-gray-400 mb-6">{result.message}</p>

            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-6">
              <div className="bg-green-500/10 border border-green-500/25 rounded-xl p-4">
                <p className="text-3xl font-bold text-green-400">{result.success}</p>
                <p className="text-xs text-gray-400 mt-1">{t('import.added')}</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4">
                <p className="text-3xl font-bold text-red-400">{result.failed}</p>
                <p className="text-xs text-gray-400 mt-1">{t('import.failed')}</p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="text-left mb-6 p-4 bg-dark-200 rounded-xl">
                <p className="text-xs font-semibold text-red-400 mb-2">{t('import.errors')}:</p>
                <ul className="space-y-1">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i} className="text-xs text-gray-400">• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button onClick={() => { setStep('upload'); setCsvData(null); setResult(null); }} className="btn-secondary">
                {t('import.importMore')}
              </button>
              <Link to="/customers" className="btn-primary">{t('import.viewCustomers')}</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
