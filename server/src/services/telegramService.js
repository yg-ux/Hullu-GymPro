/**
 * Telegram Bot Notification Service
 *
 * Required environment variables (set in Render):
 *   TELEGRAM_BOT_TOKEN  — from @BotFather on Telegram
 *   TELEGRAM_CHAT_ID    — your personal Telegram chat/user ID
 */

const TELEGRAM_API = 'https://api.telegram.org';

function isConfigured() {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/**
 * Send a message to the configured Telegram chat.
 * Uses HTML parse mode so you can use <b>, <i>, <code> tags.
 */
export async function sendTelegramMessage(text) {
  if (!isConfigured()) {
    console.log('Telegram: not configured, skipping notification');
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `${TELEGRAM_API}/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'HTML',
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    const data = await response.json();
    if (!data.ok) {
      console.error('Telegram notification failed:', data.description);
    } else {
      console.log('Telegram notification sent');
    }
  } catch (error) {
    // Non-fatal — never block the main request
    console.warn('Telegram notification error:', error.message);
  }
}

/**
 * Notify when a gym submits a new subscription request.
 */
export async function notifyNewSubscriptionRequest({ gymName, gymEmail, plan, amount, paymentMethod, transactionId, durationMonths }) {
  const planLabel   = plan === 'pro' ? '⭐ Pro' : '🔹 Starter';
  const methodLabel = {
    telebirr:      '📱 Telebirr',
    cbe_birr:      '🏦 CBE Birr',
    bank_transfer: '🏦 Bank Transfer',
    cash:          '💵 Cash',
  }[paymentMethod] || paymentMethod;

  const text = [
    `🔔 <b>New Subscription Request</b>`,
    ``,
    `🏋️ <b>Gym:</b> ${gymName}`,
    `📧 <b>Email:</b> ${gymEmail || 'N/A'}`,
    `📦 <b>Plan:</b> ${planLabel}`,
    `📅 <b>Duration:</b> ${durationMonths} month${durationMonths > 1 ? 's' : ''}`,
    `💰 <b>Amount:</b> ETB ${Number(amount).toLocaleString()}`,
    `${methodLabel} <b>Payment:</b> ${paymentMethod}`,
    `🧾 <b>Transaction ID:</b> <code>${transactionId}</code>`,
    ``,
    `👉 <b>Action needed:</b> Log in to the admin dashboard to approve or decline.`,
  ].join('\n');

  await sendTelegramMessage(text);
}
