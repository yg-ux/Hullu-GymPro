import { getAll, getOne, runQuery } from '../models/database.js';
import { smsService } from './smsService.js';
import { v4 as uuidv4 } from 'uuid';

class ReminderService {
  constructor() {
    this.schedule = '0 0 * * *';
  }

  async _alreadySentToday(customerId, messageType) {
    const today = new Date().toISOString().split('T')[0];
    const existing = await getOne(`
      SELECT id FROM sms_logs
      WHERE customer_id = ? AND message_type = ? AND created_at::date = ?::date
    `, [customerId, messageType, today]);
    return !!existing;
  }

  _logSms(gymId, customerId, phone, messageType, message, status) {
    runQuery(`
      INSERT INTO sms_logs (id, gym_id, customer_id, phone, message_type, message, status, sent_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [uuidv4(), gymId, customerId, phone, messageType, message, status])
      .catch(e => console.warn('Failed to log SMS:', e.message));
  }

  async checkMembershipExpirations() {
    console.log('🔔 Checking membership expirations...');
    try {
      const expiringCustomers = await getAll(`
        SELECT c.*, g.name as gym_name, g.sms_enabled, g.id as gym_id_ref
        FROM customers c
        JOIN gyms g ON c.gym_id = g.id
        WHERE c.status IN ('active', 'expiring')
          AND c.membership_end IS NOT NULL
          AND c.membership_type != 'daily'
          AND (
            c.membership_end::date = CURRENT_DATE + INTERVAL '3 days'
            OR c.membership_end::date = CURRENT_DATE
          )
          AND g.sms_enabled = 1
      `);

      console.log(`Found ${expiringCustomers.length} customers with expiring memberships`);

      for (const customer of expiringCustomers) {
        if (!customer.phone || !customer.sms_enabled) continue;

        const expiryDate = new Date(customer.membership_end);
        const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        const messageType = `expiry_${daysLeft}d`;

        if (await this._alreadySentToday(customer.id, messageType)) {
          console.log(`Skipping duplicate reminder for ${customer.name} (${messageType})`);
          continue;
        }

        try {
          const result = await smsService.sendMembershipExpiryReminder(
            customer,
            { name: customer.gym_name },
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
      const expiringGyms = await getAll(`
        SELECT *
        FROM gyms
        WHERE subscription_status = 'active'
          AND subscription_end IS NOT NULL
          AND subscription_end::date = CURRENT_DATE + INTERVAL '7 days'
          AND sms_enabled = 1
      `);

      console.log(`Found ${expiringGyms.length} gyms with expiring subscriptions`);

      for (const gym of expiringGyms) {
        if (!gym.phone) continue;

        const messageType = 'subscription_renewal_7d';
        if (await this._alreadySentToday(null, messageType + '_' + gym.id)) {
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
