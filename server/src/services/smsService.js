/**
 * GeezSMS Integration Service
 * Handles all SMS notifications for GymPro
 */

const GEEZSMS_BASE_URL = 'https://api.geezsms.com/api/v1/sms';

class SmsService {
  /**
   * Send SMS to a phone number
   * @param {string} phone - Phone number (must start with 2519 or +2519)
   * @param {string} message - SMS message (max 335 chars)
   * @param {string} apiKey - Optional API key (uses gym's key if not provided)
   * @returns {Promise<object>} - API response
   */
  async sendSms(phone, message, apiKey = null) {
    if (!apiKey) {
      console.log('SMS: No API key provided, skipping SMS');
      return { success: false, message: 'SMS API key not configured' };
    }

    if (!phone || !message) {
      return { success: false, message: 'Phone and message are required' };
    }

    // Validate phone format (Ethiopian: 2519xxxxxxxx)
    let formattedPhone = phone.replace(/\s/g, '');
    if (!formattedPhone.startsWith('2519')) {
      if (formattedPhone.startsWith('+2519')) {
        formattedPhone = formattedPhone.substring(1); // Remove + prefix
      } else if (formattedPhone.startsWith('09')) {
        formattedPhone = '251' + formattedPhone.substring(1); // 09 -> 2519
      } else {
        return { success: false, message: 'Invalid phone format. Use 2519XXXXXXXX format.' };
      }
    }

    // Validate message length
    if (message.length > 335) {
      return { success: false, message: 'Message too long. Max 335 characters.' };
    }

    try {
      const response = await fetch(`${GEEZSMS_BASE_URL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          msg: message,
          token: apiKey
        })
      });

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
  async sendWelcomeSms(customer, gym) {
    const message = `Welcome to ${gym.name}! Your membership is now active. Check-in using your phone number. For help, contact us. - Hullu Gyms`;
    return await this.sendSms(customer.phone, message, gym.sms_api_key);
  }

  /**
   * Send payment confirmation SMS
   * @param {object} customer - Customer object
   * @param {object} payment - Payment object
   * @param {object} gym - Gym object
   */
  async sendPaymentConfirmation(customer, payment, gym) {
    const amount = parseFloat(payment.amount).toFixed(2);
    const endDate = new Date(payment.end_date).toLocaleDateString('en-ET');
    const message = `Payment confirmed! ${amount} ETB received for your ${customer.membership_type?.replace('_', ' ')} membership at ${gym.name}. Valid until ${endDate}. - Hullu Gyms`;
    return await this.sendSms(customer.phone, message, gym.sms_api_key);
  }

  /**
   * Send membership expiry reminder
   * @param {object} customer - Customer object
   * @param {object} gym - Gym object
   * @param {number} daysLeft - Days until expiry
   */
  async sendMembershipExpiryReminder(customer, gym, daysLeft) {
    let message;
    if (daysLeft <= 1) {
      message = `Reminder: Your membership at ${gym.name} expires ${daysLeft <= 0 ? 'today' : 'tomorrow'}! Please renew to continue enjoying our services. - Hullu Gyms`;
    } else {
      message = `Reminder: Your membership at ${gym.name} expires in ${daysLeft} days. Please visit us to renew. - Hullu Gyms`;
    }
    return await this.sendSms(customer.phone, message, gym.sms_api_key);
  }

  /**
   * Send subscription renewal reminder (for gym owners)
   * @param {object} gym - Gym object
   * @param {number} daysLeft - Days until subscription expires
   */
  async sendSubscriptionRenewalReminder(gym, daysLeft) {
    const message = `Hullu Gyms: Your subscription expires in ${daysLeft} days. Renew now to keep your gym active and avoid service interruption. - Hullu Gyms`;
    return await this.sendSms(gym.phone, message, gym.sms_api_key);
  }
}

export const smsService = new SmsService();
export default smsService;