import { logActivity } from '../models/database.js';

export function logCustomerAdded(gymId, userId, customerId, customerName) {
  logActivity(gymId, userId, 'customer_added', 'customer', customerId, { name: customerName })
    .catch(e => console.warn('Activity log failed:', e.message));
}

export function logCustomerUpdated(gymId, userId, customerId, customerName) {
  logActivity(gymId, userId, 'customer_updated', 'customer', customerId, { name: customerName })
    .catch(e => console.warn('Activity log failed:', e.message));
}

export function logCustomerDeleted(gymId, userId, customerId, customerName) {
  logActivity(gymId, userId, 'customer_deleted', 'customer', customerId, { name: customerName })
    .catch(e => console.warn('Activity log failed:', e.message));
}

export function logPaymentRecorded(gymId, userId, paymentId, amount, customerName) {
  logActivity(gymId, userId, 'payment_recorded', 'payment', paymentId, { amount, customer: customerName })
    .catch(e => console.warn('Activity log failed:', e.message));
}

export function logPaymentDeleted(gymId, userId, paymentId) {
  logActivity(gymId, userId, 'payment_deleted', 'payment', paymentId, null)
    .catch(e => console.warn('Activity log failed:', e.message));
}

export function logCheckIn(gymId, userId, customerId, customerName) {
  logActivity(gymId, userId, 'check_in', 'customer', customerId, { name: customerName })
    .catch(e => console.warn('Activity log failed:', e.message));
}

export function logCheckOut(gymId, userId, customerId, customerName) {
  logActivity(gymId, userId, 'check_out', 'customer', customerId, { name: customerName })
    .catch(e => console.warn('Activity log failed:', e.message));
}

export function logStaffAdded(gymId, userId, staffId, staffUsername) {
  logActivity(gymId, userId, 'staff_added', 'staff', staffId, { username: staffUsername })
    .catch(e => console.warn('Activity log failed:', e.message));
}

export function logStaffDeleted(gymId, userId, staffId, staffUsername) {
  logActivity(gymId, userId, 'staff_deleted', 'staff', staffId, { username: staffUsername })
    .catch(e => console.warn('Activity log failed:', e.message));
}
