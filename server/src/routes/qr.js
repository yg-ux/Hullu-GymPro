import express from 'express';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, getOne, getAll } from '../models/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Check if gym has QR feature (Pro or Enterprise)
function checkQrFeature(gym) {
  return gym.subscription_plan === 'pro' || gym.subscription_plan === 'enterprise';
}

// Get or generate customer QR code
router.get('/:customerId', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customerId } = req.params;

    // Check subscription
    const gym = getOne('SELECT * FROM gyms WHERE id = ?', [gymId]);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    if (!checkQrFeature(gym)) {
      return res.status(403).json({
        error: 'QR code check-in is available on Pro and Enterprise plans only',
        requires_plan: 'pro'
      });
    }

    // Verify customer belongs to this gym
    const customer = getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [customerId, gymId]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if QR code already exists
    let qrRecord = getOne('SELECT * FROM qr_codes WHERE customer_id = ? AND is_active = 1', [customerId]);

    if (!qrRecord) {
      // Generate new QR code
      const qrCode = `${gymId}-${customerId}-${uuidv4().substring(0, 8)}`;

      // Generate QR image as base64 data URL
      const qrData = JSON.stringify({
        gym: gymId,
        customer: customerId,
        code: qrCode,
        name: customer.name
      });

      const qrImage = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1a1a2e',
          light: '#ffffff'
        }
      });

      const qrId = uuidv4();
      runQuery(`
        INSERT INTO qr_codes (id, gym_id, customer_id, code, qr_image, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `, [qrId, gymId, customerId, qrCode, qrImage]);

      qrRecord = getOne('SELECT * FROM qr_codes WHERE id = ?', [qrId]);
    }

    res.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone
      },
      qr: {
        id: qrRecord.id,
        code: qrRecord.code,
        image: qrRecord.qr_image,
        created_at: qrRecord.created_at
      }
    });
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});

// Scan QR code and auto check-in
router.post('/scan', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { qr_data } = req.body;

    if (!qr_data) {
      return res.status(400).json({ error: 'QR data is required' });
    }

    // Check subscription
    const gym = getOne('SELECT * FROM gyms WHERE id = ?', [gymId]);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    if (!checkQrFeature(gym)) {
      return res.status(403).json({
        error: 'QR code check-in is available on Pro and Enterprise plans only',
        requires_plan: 'pro'
      });
    }

    let qrInfo;
    try {
      qrInfo = JSON.parse(qr_data);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    // Verify QR belongs to this gym
    if (qrInfo.gym !== gymId) {
      return res.status(400).json({ error: 'QR code is not valid for this gym' });
    }

    // Find customer
    const customer = getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [qrInfo.customer, gymId]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Verify QR exists
    const qrRecord = getOne('SELECT * FROM qr_codes WHERE customer_id = ? AND code = ? AND is_active = 1', [qrInfo.customer, qrInfo.code]);
    if (!qrRecord) {
      return res.status(400).json({ error: 'Invalid or expired QR code' });
    }

    // Check if customer membership is valid
    const today = new Date();
    const endDate = new Date(customer.membership_end);
    if (endDate < today) {
      return res.status(400).json({
        error: 'Customer membership has expired',
        customer: {
          id: customer.id,
          name: customer.name,
          membership_end: customer.membership_end
        }
      });
    }

    // Check if already checked in
    const existingCheckIn = getOne(`
      SELECT * FROM attendance
      WHERE customer_id = ? AND gym_id = ? AND check_out IS NULL
      ORDER BY check_in DESC LIMIT 1
    `, [customer.id, gymId]);

    if (existingCheckIn) {
      return res.status(400).json({
        error: 'Customer is already checked in',
        already_checked_in: true,
        check_in_time: existingCheckIn.check_in,
        customer: {
          id: customer.id,
          name: customer.name
        }
      });
    }

    // Create check-in
    const attendanceId = uuidv4();
    const checkInTime = new Date().toISOString();

    runQuery(`
      INSERT INTO attendance (id, gym_id, customer_id, check_in)
      VALUES (?, ?, ?, ?)
    `, [attendanceId, gymId, customer.id, checkInTime]);

    res.status(201).json({
      success: true,
      message: 'Check-in successful via QR code',
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        membership_end: customer.membership_end
      },
      check_in: checkInTime
    });
  } catch (error) {
    console.error('QR scan error:', error);
    res.status(500).json({ error: 'Failed to process QR scan' });
  }
});

// Regenerate QR code
router.post('/:customerId/regenerate', authenticateToken, async (req, res) => {
  try {
    const gymId = req.user.gym_id;
    const { customerId } = req.params;

    // Check subscription
    const gym = getOne('SELECT * FROM gyms WHERE id = ?', [gymId]);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    if (!checkQrFeature(gym)) {
      return res.status(403).json({
        error: 'QR code check-in is available on Pro and Enterprise plans only',
        requires_plan: 'pro'
      });
    }

    // Verify customer belongs to this gym
    const customer = getOne('SELECT * FROM customers WHERE id = ? AND gym_id = ?', [customerId, gymId]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Deactivate old QR codes
    runQuery('UPDATE qr_codes SET is_active = 0 WHERE customer_id = ?', [customerId]);

    // Generate new QR code
    const qrCode = `${gymId}-${customerId}-${uuidv4().substring(0, 8)}`;

    const qrData = JSON.stringify({
      gym: gymId,
      customer: customerId,
      code: qrCode,
      name: customer.name
    });

    const qrImage = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff'
      }
    });

    const qrId = uuidv4();
    runQuery(`
      INSERT INTO qr_codes (id, gym_id, customer_id, code, qr_image, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [qrId, gymId, customerId, qrCode, qrImage]);

    const qrRecord = getOne('SELECT * FROM qr_codes WHERE id = ?', [qrId]);

    res.json({
      message: 'QR code regenerated successfully',
      qr: {
        id: qrRecord.id,
        code: qrRecord.code,
        image: qrRecord.qr_image
      }
    });
  } catch (error) {
    console.error('Regenerate QR error:', error);
    res.status(500).json({ error: 'Failed to regenerate QR code' });
  }
});

export default router;