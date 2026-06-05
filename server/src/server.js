import express from 'express';
import cors from 'cors';
import { initDatabase } from './models/database.js';
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import paymentRoutes from './routes/payments.js';
import statsRoutes from './routes/stats.js';
import revenueRoutes from './routes/revenue.js';
import staffRoutes from './routes/staff.js';
import attendanceRoutes from './routes/attendance.js';
import qrRoutes from './routes/qr.js';
import reportsRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test registration endpoint (for debugging)
app.post('/api/test-register', (req, res) => {
  console.log('🧪 Test registration endpoint called');
  console.log('Body:', req.body);
  res.json({ received: true, body: req.body });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('Request URL:', req.url);
  console.error('Request Method:', req.method);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Start server only after database is initialized
async function startServer() {
  try {
    await initDatabase();
    console.log('✅ Database ready');
    
    app.listen(PORT, () => {
      console.log(`🏋️ Hullu Gym Server running on http://localhost:${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
