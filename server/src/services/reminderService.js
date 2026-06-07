import { getAll, getOne, runQuery } from '../models/database.js';
import { smsService } from './smsService.js';
import { v4 as uuidv4 } from 'uuid';

class ReminderService {
  constructor() {
    this.schedule = '0 0 * * *';
  }

  _alreadySentToday(customerId, messageType) {
    const today = new Date().toISOString().split('T')[0];
    const existing = getOne(`
      SELECT id FROM sms_logs
      WHERE customer_id = ? AND message_type = ? AND date(created_at) = ?
    `, [customerId, messageType, today]);
    return !!existing;
  }

  _logSms(gymId, customerId, phone, messageType, message, status) {
    try {
      runQuery(`
        INSERT INTO sms_logs (id, gym_id, customer_id, phone, message_type, message, status, sent_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [uuidv4(), gymId, customerId, phone, messageType, message, status]);
    } catch (e) {
      console.warn('Failed to log SMS:', e.message);
    }
  }

  async checkMembershipExpirations() {
    console.log('🔔 Checking membership expirations...');
    try {
      const expiringCustomers = getAll(`
        SELECT c.*, g.name as gym_name, g.sms_enabled, g.subscription_plan, g.id as gym_id_ref
        FROM customers c
        JOIN gyms g ON c.gym_id = g.id
        WHERE c.status IN ('active', 'expiring')
          AND c.membership_end IS NOT NULL
          AND (
            date(c.membership_end) = date('now', '+7 days')
            OR date(c.membership_end) = date('now', '+1 day')
            OR date(c.membership_end) = date('now')
          )
          AND g.sms_enabled = 1
          AND g.subscription_plan IN ('starter', 'pro')
      `);

      console.log(`Found ${expiringCustomers.length} customers with expiring memberships`);

      for (const customer of expiringCustomers) {
        if (!customer.phone || !customer.sms_enabled) continue;

        const expiryDate = new Date(customer.membership_end);
        const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        const messageType = `expiry_${daysLeft}d`;

        if (this._alreadySentToday(customer.id, messageType)) {
          console.log(`Skipping duplicate reminder for ${customer.name} (${messageType})`);
          continue;
        }

        try {
          const result = await smsService.sendMembershipExpiryReminder(
            customer,
            { name: customer.gym_name, sms_api_key: customer.sms_api_key },
            daysLeft
          );
          const status = result?.success ? 'sent' : 'failed';
          this._logSms(customer.gym_id, customer.id, customer.phone, messageType,
            `Expiry reminder (${daysLeft} days)`, status);
          console.log(`Sent expiry reminder to ${customer.name} (${daysLeft} days left) — ${status}`);
        } catch (error) {
          console.error(`Failed to send reminder to ${customer.phone}:`, error);
          this._logSms(customer.gym_id, customer.id, customer.phone, messageType,
            `Expiry reminder (${daysLeft} days)`, 'failed');
        }
      }
    } catch (error) {
      console.error('Membership expiration check failed:', error);
    }
  }

  async checkSubscriptionRenewals() {
    console.log('📅 Checking subscription renewals...');
    try {
      const expiringGyms = getAll(`
        SELECT *
        FROM gyms
        WHERE subscription_status = 'active'
          AND subscription_end IS NOT NULL
          AND date(subscription_end) = date('now', '+7 days')
          AND sms_enabled = 1
      `);

      console.log(`Found ${expiringGyms.length} gyms with expiring subscriptions`);

      for (const gym of expiringGyms) {
        if (!gym.phone) continue;

        const messageType = 'subscription_renewal_7d';
        if (this._alreadySentToday(null, messageType + '_' + gym.id)) {
          console.log(`Skipping duplicate subscription reminder for ${gym.name}`);
          continue;
        }

        try {
          const result = await smsService.sendSubscriptionRenewalReminder(gym, 7);
          const status = result?.success ? 'sent' : 'failed';
          this._logSms(gym.id, null, gym.phone, messageType, 'Subscription renewal reminder', status);
          console.log(`Sent subscription reminder to ${gym.name} — ${status}`);
        } catch (error) {
          console.error(`Failed to send subscription reminder to ${gym.phone}:`, error);
          this._logSms(gym.id, null, gym.phone, messageType, 'Subscription renewal reminder', 'failed');
        }
      }
    } catch (error) {
      console.error('Subscription renewal check failed:', error);
    }
  }

  async runAllChecks() {
    console.log('⏰ Running scheduled SMS checks...');
    await this.checkMembershipExpirations();
    await this.checkSubscriptionRenewals();
    console.log('✅ Scheduled checks complete');
  }
}

export const reminderService = new ReminderService();
export default reminderService;
