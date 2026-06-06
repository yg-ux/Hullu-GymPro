import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll, getDb } from '../models/database.js';
import { authenticateToken, requireActiveSubscription } from './auth.js';

const router = express.Router();

// Check if gym has staff feature (Pro or Enterprise)
function checkStaffFeature(gym) {
  return gym.subscription_plan === 'pro' || gym.subscription_plan === 'enterprise';
}

// Get staff limit based on plan
function getStaffLimit(plan) {
  switch (plan) {
    case 'starter':
      return 0;
    case 'pro':
      return 3;
    case 'enterprise':
      return -1; // unlimited
    default:
      return 0;
  }
}

// Get all staff for the gym
router.get('/', authenticateToken, (req, res) => {
  try {
    const gymId = req.user.gym_id;

    // Check subscription
    const gym = getOne('SELECT * FROM gyms WHERE id = ?', [gymId]);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    if (!checkStaffFeature(gym)) {
      return res.status(403).json({
        error: 'Staff management is available on Pro and Enterprise plans only',
        requires_plan: 'pro'
      });
    }

    const staff = getAll(`
      SELECT id, gym_id, username, role, created_at, updated_at
      FROM gym_users
      WHERE gym_id = ?
      ORDER BY created_at ASC
    `, [gymId]);

    const staffLimit = getStaffLimit(gym.subscription_plan);

    res.json({
      staff,
      limit: staffLimit,
      used: staff.length,
      available: staffLimit === -1 ? -1 : staffLimit - staff.length
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to get staff list' });
  }
});

// Add new staff member
router.post('/', authenticateToken, requireActiveSubscription, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { username, password, role = 'receptionist' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check subscription
    const gym = getOne('SELECT * FROM gyms WHERE id = ?', [gymId]);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    if (!checkStaffFeature(gym)) {
      return res.status(403).json({
        error: 'Staff management is available on Pro and Enterprise plans only',
        requires_plan: 'pro'
      });
    }

    // Check staff limit
    const staffLimit = getStaffLimit(gym.subscription_plan);
    const currentStaff = getAll('SELECT * FROM gym_users WHERE gym_id = ?', [gymId]);

    if (staffLimit !== -1 && currentStaff.length >= staffLimit) {
      return res.status(403).json({
        error: `Staff limit reached. Upgrade to Enterprise for unlimited staff.`,
        current_limit: staffLimit,
        requires_plan: 'enterprise'
      });
    }

    // Check if username already exists
    const existingUser = getOne('SELECT * FROM gym_users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'trainer', 'receptionist'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Valid roles: ' + validRoles.join(', ') });
    }

    const staffId = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);

    runQuery(`
      INSERT INTO gym_users (id, gym_id, username, password, role)
      VALUES (?, ?, ?, ?, ?)
    `, [staffId, gymId, username, hashedPassword, role]);

    const newStaff = getOne(`
      SELECT id, gym_id, username, role, created_at
      FROM gym_users WHERE id = ?
    `, [staffId]);

    res.status(201).json({
      staff: newStaff,
      message: 'Staff member added successfully'
    });
  } catch (error) {
    console.error('Add staff error:', error);
    res.status(500).json({ error: 'Failed to add staff member' });
  }
});

// Update staff member
router.put('/:id', authenticateToken, requireActiveSubscription, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const staffId = req.params.id;
    const { username, role, active } = req.body;

    // Check if staff belongs to this gym
    const staff = getOne('SELECT * FROM gym_users WHERE id = ? AND gym_id = ?', [staffId, gymId]);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Cannot modify owner
    if (staff.role === 'owner') {
      return res.status(403).json({ error: 'Cannot modify owner account' });
    }

    const updates = [];
    const values = [];

    if (username) {
      // Check if new username is taken
      const existing = getOne('SELECT * FROM gym_users WHERE username = ? AND id != ?', [username, staffId]);
      if (existing) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      updates.push('username = ?');
      values.push(username);
    }

    if (role) {
      const validRoles = ['admin', 'manager', 'trainer', 'receptionist'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push('role = ?');
      values.push(role);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(staffId);
      values.push(gymId);

      runQuery(`UPDATE gym_users SET ${updates.join(', ')} WHERE id = ? AND gym_id = ?`, values);
    }

    const updatedStaff = getOne(`
      SELECT id, gym_id, username, role, created_at, updated_at
      FROM gym_users WHERE id = ?
    `, [staffId]);

    res.json({
      staff: updatedStaff,
      message: 'Staff member updated successfully'
    });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// Delete staff member
router.delete('/:id', authenticateToken, requireActiveSubscription, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const staffId = req.params.id;

    // Check if staff belongs to this gym
    const staff = getOne('SELECT * FROM gym_users WHERE id = ? AND gym_id = ?', [staffId, gymId]);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Cannot delete owner
    if (staff.role === 'owner') {
      return res.status(403).json({ error: 'Cannot delete owner account' });
    }

    // Cannot delete self
    if (staffId === req.user.id) {
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

    runQuery('DELETE FROM gym_users WHERE id = ? AND gym_id = ?', [staffId, gymId]);

    res.json({ message: 'Staff member removed successfully' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Failed to remove staff member' });
  }
});

// Reset staff password
router.post('/:id/reset-password', authenticateToken, requireActiveSubscription, (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const staffId = req.params.id;
    const { new_password } = req.body;

    // Check if staff belongs to this gym
    const staff = getOne('SELECT * FROM gym_users WHERE id = ? AND gym_id = ?', [staffId, gymId]);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Cannot modify owner
    if (staff.role === 'owner' && staffId !== req.user.id) {
      return res.status(403).json({ error: 'Only owner can change their own password' });
    }

    if (!new_password) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = bcrypt.hashSync(new_password, 10);
    runQuery('UPDATE gym_users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedPassword, staffId]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;