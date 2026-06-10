import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatCurrency, formatDate, getMembershipLabel, getPaymentMethodLabel } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { Printer, ArrowLeft, CheckCircle } from 'lucide-react';

export default function Receipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/payments/${id}`)
      .then(setPayment)
      .catch(e => setError(e.message || t('receipt.notFound')))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gym-500" />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-dark-200 flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-lg">{error || t('receipt.notFound')}</p>
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gym-400 hover:text-gym-300">
          <ArrowLeft className="w-4 h-4" /> {t('receipt.goBack')}
        </button>
      </div>
    );
  }

  const receiptNumber = payment.id?.slice(-8).toUpperCase();

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .receipt-card {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
            background: white !important;
            color: black !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          .receipt-card * { color: black !important; border-color: #ddd !important; }
          .receipt-amount { color: #000 !important; }
          .receipt-header { background: white !important; border-bottom: 2px solid #000 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-dark-200 py-8 px-4">
        {/* Toolbar - hidden on print */}
        <div className="no-print max-w-2xl mx-auto mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('receipt.back')}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gym-500/20 border border-gym-500/40 text-gym-400 rounded-xl hover:bg-gym-500/30 transition-all"
          >
            <Printer className="w-5 h-5" />
            {t('receipt.print')}
          </button>
        </div>

        {/* Receipt Card */}
        <div className="receipt-card max-w-2xl mx-auto bg-dark-100 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="receipt-header p-8 bg-gradient-to-r from-gym-500/10 to-transparent border-b border-gray-800">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {payment.gym_logo ? (
                  <img src={payment.gym_logo} alt={payment.gym_name} className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gym-500/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gym-400">{payment.gym_name?.charAt(0) || 'G'}</span>
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-white">{payment.gym_name}</h1>
                  {payment.gym_phone && <p className="text-sm text-gray-400">{payment.gym_phone}</p>}
                  {payment.gym_email && <p className="text-sm text-gray-400">{payment.gym_email}</p>}
                  {payment.gym_address && <p className="text-sm text-gray-400">{payment.gym_address}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{t('receipt.label')}</p>
                <p className="text-lg font-bold text-white font-mono">#{receiptNumber}</p>
                <p className="text-sm text-gray-400 mt-1">{formatDate(payment.payment_date)}</p>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="p-8 text-center border-b border-gray-800">
            <div className="flex items-center justify-center gap-3 mb-2">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-400 uppercase tracking-wide">{t('receipt.paymentReceived')}</p>
            </div>
            <p className="receipt-amount text-5xl font-bold text-white mt-2">
              {formatCurrency(payment.amount)}
            </p>
            <p className="text-gray-400 mt-2">{getPaymentMethodLabel(payment.payment_method)}</p>
          </div>

          {/* Details */}
          <div className="p-8 space-y-6">
            {/* Member info */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('receipt.member')}</p>
              <div className="grid grid-cols-2 gap-4">
                <ReceiptRow label={t('receipt.name')} value={payment.customer_name} />
                {payment.customer_phone && <ReceiptRow label={t('receipt.phone')} value={payment.customer_phone} />}
                {payment.customer_email && <ReceiptRow label={t('receipt.email')} value={payment.customer_email} />}
              </div>
            </div>

            <div className="border-t border-gray-800" />

            {/* Membership info */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('receipt.membership')}</p>
              <div className="grid grid-cols-2 gap-4">
                <ReceiptRow label={t('receipt.type')} value={getMembershipLabel(payment.membership_type)} />
                <ReceiptRow label={t('receipt.paymentMethod')} value={getPaymentMethodLabel(payment.payment_method)} />
                {payment.start_date && <ReceiptRow label={t('receipt.startDate')} value={formatDate(payment.start_date)} />}
                {payment.end_date && payment.membership_type !== 'daily' && (
                  <ReceiptRow label={t('receipt.validUntil')} value={formatDate(payment.end_date)} />
                )}
              </div>
            </div>

            {payment.notes && (
              <>
                <div className="border-t border-gray-800" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('receipt.notes')}</p>
                  <p className="text-gray-300 text-sm">{payment.notes}</p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-6 bg-dark-200/50 border-t border-gray-800 text-center">
            <p className="text-gray-300 font-medium mb-1">{t('receipt.thankYou')}</p>
            <p className="text-gray-500 text-sm">{payment.gym_name} — {payment.gym_phone || payment.gym_email || ''}</p>
            <p className="text-gray-600 text-xs mt-3">{t('receipt.receiptId', { id: payment.id })}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function ReceiptRow({ label, value, capitalize }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-white ${capitalize ? 'capitalize' : ''}`}>{value || '—'}</p>
    </div>
  );
}
