/**
 * Telebirr Merchant API — Transaction Verification
 *
 * Required environment variables (set in Render):
 *   TELEBIRR_APP_ID        — App ID from Ethio Telecom merchant portal
 *   TELEBIRR_MERCHANT_CODE — Your merchant code
 *   TELEBIRR_PRIVATE_KEY   — RSA private key (PEM format, single line with \n escapes)
 *
 * Without these, verification is skipped and requests go to manual review as normal.
 */

import crypto from 'crypto';

const BASE_URL = process.env.TELEBIRR_BASE_URL
  || 'https://api.ethiomobilemoney.et:2443/ammapi/payment/service-openup';

function isConfigured() {
  return !!(
    process.env.TELEBIRR_APP_ID &&
    process.env.TELEBIRR_MERCHANT_CODE &&
    process.env.TELEBIRR_PRIVATE_KEY
  );
}

/**
 * Build and sign the request per Telebirr Open-Up API spec:
 * 1. Collect top-level params (appId, timestamp, nonce)
 * 2. Sort keys alphabetically → join as "key=value&..."
 * 3. RSA-SHA256 sign with merchant private key → Base64
 */
function buildSignedRequest(bodyPayload) {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const nonce     = crypto.randomBytes(8).toString('hex');
  const appId     = process.env.TELEBIRR_APP_ID;

  const signingParams = { appId, nonce, timestamp };
  const signingString = Object.keys(signingParams)
    .sort()
    .map(k => `${k}=${signingParams[k]}`)
    .join('&');

  // Private key may be stored with literal \n — convert to real newlines
  const privateKey = process.env.TELEBIRR_PRIVATE_KEY.replace(/\\n/g, '\n');

  const signer = crypto.createSign('SHA256');
  signer.update(signingString);
  const sign = signer.sign(privateKey, 'base64');

  return { appId, timestamp, nonce, sign, body: bodyPayload };
}

/**
 * Query a Telebirr transaction and return its status + amount.
 *
 * @param {string} transactionId  — The outTradeNo / transaction reference
 * @returns {{ verified: boolean, amount: number|null, status: string, error?: string }}
 */
export async function verifyTelebirrTransaction(transactionId) {
  if (!isConfigured()) {
    console.log('Telebirr: credentials not configured, skipping auto-verification');
    return { verified: false, amount: null, status: 'not_configured' };
  }

  try {
    const requestBody = buildSignedRequest({
      outTradeNo: transactionId,
      merCode: process.env.TELEBIRR_MERCHANT_CODE,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_URL}/queryPayment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    console.log('Telebirr query response:', JSON.stringify(data));

    // Telebirr returns code "0" or 200 for success
    const success = data.code === '0' || data.code === 0 || data.code === 200 || data.code === '200';

    if (!success) {
      return { verified: false, amount: null, status: 'api_error', error: data.message || 'Query failed' };
    }

    const txData = data.data || data.body || {};
    const tradeStatus = txData.tradeStatus || txData.status || '';
    const isPaid = ['SUCCESS', 'TRADE_SUCCESS', 'FINISHED', '2'].includes(String(tradeStatus).toUpperCase());

    const amount = parseFloat(txData.transAmount || txData.amount || 0);

    return {
      verified: isPaid,
      amount,
      status: tradeStatus,
      raw: txData,
    };
  } catch (error) {
    console.error('Telebirr verification error:', error.message);
    return { verified: false, amount: null, status: 'fetch_error', error: error.message };
  }
}
