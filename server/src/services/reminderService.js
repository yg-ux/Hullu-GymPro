/**
 * Scheduled SMS Reminders Service
 * Sends membership expiry and subscription renewal reminders
 */

import { getAll, getOne } from '../models/database.js';
import { smsService } from './smsService.js';

class ReminderService {
  constructor() {
    // Run every day at midnight
    this.schedule = '0 0 * * *'; // Cron: daily at midnight
  }

  /**
   * Check and send membership expiry reminders
   * Reminds 7 days and 1 day before expiry
   */
  async checkMembershipExpirations() {
    console.log('🔔 Checking membership expirations...');
    
    try {
      // Get all active customers with expiring memberships
      const today = new Date();
      const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Get customers expiring in 7 days or 1 day
      const expiringCustomers = getAll(`
        SELECT c.*, g.name as gym_name, g.sms_enabled
        FROM customers c
        JOIN gyms g ON c.gym_id = g.id
        WHERE c.status = 'active'
        AND c.membership_end IS NOT NULL
        AND (
          date(c.membership_end) = date('now', '+7 days')
          OR date(c.membership_end) = date('now', '+1 day')
          OR date(c.membership_end) = date('now')
        )
      `);

      console.log(`Found ${expiringCustomers.length} customers with expiring memberships`);

      for (const customer of expiringCustomers) {
        if (!customer.phone || !customer.sms_enabled) continue;

        const expiryDate = new Date(customer.membership_end);
        const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        // Check if we already sent a reminder for this expiry
        // (This is simplified - in production you'd track sent reminders)
        try {
          await smsService.sendMembershipExpiryReminder(customer, { name: customer.gym_name }, daysLeft);
          console.log(`Sent expiry reminder to ${customer.name} (${daysLeft} days left)`);
        } catch (error) {
          console.error(`Failed to send reminder to ${customer.phone}:`, error);
        }
      }
    } catch (error) {
      console.error('Membership expiration check failed:', error);
    }
  }

  /**
   * Check and send subscription renewal reminders
   * Reminds gym owners 7 days before their subscription expires
   */
  async checkSubscriptionRenewals() {
    console.log('📅 Checking subscription renewals...');
    
    try {
      // Get gyms with subscriptions expiring in 7 days
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

        try {
          await smsService.sendSubscriptionRenewalReminder(gym, 7);
          console.log(`Sent subscription reminder to ${gym.name}`);
        } catch (error) {
          console.error(`Failed to send subscription reminder to ${gym.phone}:`, error);
        }
      }
    } catch (error) {
      console.error('Subscription renewal check failed:', error);
    }
  }

  /**
   * Run all scheduled checks
   */
  async runAllChecks() {
    console.log('⏰ Running scheduled SMS checks...');
    await this.checkMembershipExpirations();
    await this.checkSubscriptionRenewals();
    console.log('✅ Scheduled checks complete');
  }
}

export const reminderService = new ReminderService();
export default reminderService;