/**
 * GeezSMS Integration Service
 * Handles all SMS notifications for GymPro
 */

const GEEZSMS_BASE_URL = 'https://api.geezsms.com/api/v1/sms';

// Convert ASCII letters/digits to Unicode Mathematical Bold Italic equivalents
// so they render as bold+italic on modern smartphones.
// Non-ASCII characters (e.g. Amharic) are passed through unchanged.
function bi(text) {
  return String(text).split('').map(c => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D468 + code - 65); // A-Z
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D482 + code - 97); // a-z
    if (code >= 48 && code <= 57)  return String.fromCodePoint(0x1D7CE + code - 48); // 0-9
    return c;
  }).join('');
}

class SmsService {
  /**
   * Send SMS to a phone number.
   * Uses the platform-level GEEZSMS_API_KEY from environment — no per-gym key needed.
   * @param {string} phone - Phone number (Ethiopian format)
   * @param {string} message - SMS message (max 335 chars)
   * @returns {Promise<object>} - API response
   */
  async sendSms(phone, message) {
    const apiKey = process.env.GEEZSMS_API_KEY;
    if (!apiKey) {
      console.log('SMS: GEEZSMS_API_KEY not set in environment, skipping SMS');
      return { success: false, message: 'SMS not configured on this server' };
    }

    if (!phone || !message) {
      return { success: false, message: 'Phone and message are required' };
    }

    // Normalize Ethiopian phone number to 251XXXXXXXXX format
    let formattedPhone = phone.replace(/[\s\-().]/g, ''); // strip spaces, dashes, parens

    if (formattedPhone.startsWith('+251')) {
      formattedPhone = formattedPhone.substring(1); // +2519x -> 2519x
    } else if (formattedPhone.startsWith('251')) {
      // already in 251x format — keep as-is
    } else if (formattedPhone.startsWith('0') && formattedPhone.length === 10) {
      formattedPhone = '251' + formattedPhone.substring(1); // 09xx -> 2519xx, 07xx -> 2517xx
    } else if (formattedPhone.length === 9) {
      formattedPhone = '251' + formattedPhone; // 9xxxxxxxx -> 2519xxxxxxxx
    } else {
      console.warn(`SMS: Unrecognized phone format: ${phone}`);
      return { success: false, message: `Unrecognized phone format: ${phone}` };
    }

    // Final sanity check: must be 251 + 9 digits = 12 digits total
    if (!/^251\d{9}$/.test(formattedPhone)) {
      console.warn(`SMS: Phone failed final validation: ${formattedPhone}`);
      return { success: false, message: `Invalid phone number: ${phone}` };
    }

    // Validate message length
    if (message.length > 335) {
      return { success: false, message: 'Message too long. Max 335 characters.' };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${GEEZSMS_BASE_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, msg: message, token: apiKey }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await response.json();

      if (response.ok) {
        console.log(`SMS sent successfully to ${formattedPhone}`);
        return { success: true, data };
      } else {
        console.error(`SMS failed to ${formattedPhone}:`, data);
        return { success: false, message: data.message || 'SMS sending failed' };
      }
    } catch (error) {
      console.error('SMS service error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send welcome SMS when customer registers for the first time
   * @param {object} customer - Customer object
   * @param {object} gym - Gym object
   */
  async sendWelcomeSms(customer, gym, portalUrl = null) {
    const amount = customer.amount ? `ETB ${parseFloat(customer.amount).toLocaleString()}` : null;
    const end = customer.membership_end
      ? new Date(customer.membership_end).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    const isDaily = customer.membership_type === 'daily';
    const duration = customer.membership_type
      ? customer.membership_type.replace(/_/g, ' ')
      : 'monthly';

    let message = `Hi ${customer.name}, welcome to ${gym.name}!`;
    if (isDaily) {
      if (amount) message += ` Daily pass — ${amount} received. Valid today only.`;
      message += ` See you on the floor!`;
    } else {
      if (amount) message += ` Your ${duration} membership is active — ${amount} received.`;
      if (end) message += ` Valid until ${end}.`;
      message += ` Keep showing up!`;
    }
    if (gym.phone) message += ` Call us: ${gym.phone}.`;
    if (portalUrl) message += ` Membership portal: ${portalUrl}`;

    return await this.sendSms(customer.phone, message);
  }

  /**
   * Send payment confirmation SMS
   * @param {object} customer - Customer object
   * @param {object} payment - Payment object
   * @param {object} gym - Gym object
   */
  async sendPaymentConfirmation(customer, payment, gym, portalUrl = null) {
    const amount = parseFloat(payment.amount).toLocaleString();
    const duration = customer.membership_type ? customer.membership_type.replace(/_/g, ' ') : 'membership';
    const endDate = payment.end_date
      ? new Date(payment.end_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;

    let message = `Hi ${customer.name}, payment confirmed! ETB ${amount} received for your ${duration} at ${gym.name}.`;
    if (endDate) message += ` Valid until ${endDate}.`;
    message += ` Keep it up!`;
    if (gym.phone) message += ` Call us: ${gym.phone}.`;
    if (portalUrl) message += ` Portal: ${portalUrl}`;

    return await this.sendSms(customer.phone, message);
  }

  /**
   * Send membership expiry reminder
   * @param {object} customer - Customer object
   * @param {object} gym - Gym object
   * @param {number} daysLeft - Days until expiry
   * @param {string|null} portalUrl - Member portal link
   */
  async sendMembershipExpiryReminder(customer, gym, daysLeft, portalUrl = null) {
    let message;
    if (daysLeft <= 0) {
      message = `Hi ${customer.name}, your membership at ${gym.name} has expired. Renew now to keep going!`;
    } else if (daysLeft === 1) {
      message = `Hi ${customer.name}, your membership at ${gym.name} expires tomorrow. Renew today!`;
    } else {
      message = `Hi ${customer.name}, your membership at ${gym.name} expires in ${daysLeft} days. Renew soon!`;
    }
    if (gym.phone) message += ` Call us: ${gym.phone}.`;
    if (portalUrl) message += ` Portal: ${portalUrl}`;
    return await this.sendSms(customer.phone, message);
  }

  /**
   * Send subscription renewal reminder (for gym owners)
   * @param {object} gym - Gym object
   * @param {number} daysLeft - Days until subscription expires
   */
  async sendSubscriptionRenewalReminder(gym, daysLeft) {
    const message = `Hullu Gyms: Your subscription expires in ${daysLeft} days. Renew now to keep your gym active and avoid service interruption. - Hullu Gyms`;
    return await this.sendSms(gym.phone, message);
  }
}

export const smsService = new SmsService();
export default smsService;
