import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
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
import smsRoutes from './routes/sms.js';
import expensesRoutes from './routes/expenses.js';
import recurringExpensesRoutes from './routes/recurring-expenses.js';
import equipmentRoutes from './routes/equipment.js';
import packagesRoutes from './routes/packages.js';
import portalRoutes from './routes/portal.js';
import branchesRoutes from './routes/branches.js';
import pushRoutes from './routes/push.js';
import progressRoutes from './routes/progress.js';
import { reminderService } from './services/reminderService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS — restrict to known frontend origin
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting — login attempts only (not registration, settings, etc.)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Relaxed limit for admin dashboard data
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many admin requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Routes — apply login limiter only to login & password endpoints, not register
app.post('/api/auth/login', loginLimiter);
app.post('/api/auth/forgot-password', loginLimiter);
app.post('/api/auth/reset-password', loginLimiter);
app.post('/api/admin/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/recurring-expenses', recurringExpensesRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/progress', progressRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: 'v3', timestamp: new Date().toISOString() });
});

// Direct SMS update endpoint - for updating demo gym
app.post('/api/update-demo-sms', async (req, res) => {
  const { secret } = req.body;
  const adminSecret = process.env.ADMIN_SECRET;
  const seedSecret = process.env.SEED_SECRET;

  if (!adminSecret || (secret !== adminSecret && secret !== seedSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { getDb, saveDatabase } = await import('./models/database.js');
    const db = getDb();
    const smsKey = process.env.GEEZSMS_API_KEY;
    if (!smsKey) return res.status(500).json({ error: 'GEEZSMS_API_KEY not configured' });

    db.run("UPDATE gyms SET sms_enabled = 1, sms_api_key = ? WHERE email = 'demo@afrofitness.com'", [smsKey]);
    saveDatabase();

    res.json({ success: true, message: 'SMS updated for demo gym' });
  } catch (error) {
    console.error('Update SMS error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Scheduled SMS reminders endpoint (call daily via cron)
app.post('/api/cron/sms-reminders', async (req, res) => {
  const { secret } = req.body;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await reminderService.runAllChecks();
    res.json({ success: true, message: 'SMS reminders processed' });
  } catch (error) {
    console.error('Cron SMS reminders failed:', error);
    res.status(500).json({ error: 'Failed to process reminders' });
  }
});

// Demo seeding endpoint
app.post('/api/seed-demo', (req, res) => {
  const { secret } = req.body;
  const seedSecret = process.env.SEED_SECRET;

  if (!seedSecret || secret !== seedSecret) {
    return res.status(401).json({ error: 'Invalid secret key' });
  }

  import('./models/database.js').then(({ getDb, runQuery, getOne, saveDatabase }) => {
    import('bcryptjs').then(({ default: bcrypt }) => {
      import('uuid').then(({ v4: uuidv4 }) => {
        const db = getDb();

        const existingGym = db.exec("SELECT * FROM gyms WHERE email = 'demo@afrofitness.com'");
        if (existingGym.length > 0 && existingGym[0].values.length > 0) {
          // Always refresh subscription_end to 1 year from now and fix SMS
          const futureEnd = new Date(); futureEnd.setFullYear(futureEnd.getFullYear() + 1);
          const smsApiKey = process.env.GEEZSMS_API_KEY;
          db.run(`UPDATE gyms SET subscription_status='active', subscription_plan='pro', subscription_end=?, max_members=-1, sms_enabled=?, color_theme='purple' WHERE email='demo@afrofitness.com'`,
            [futureEnd.toISOString().split('T')[0], smsApiKey ? 1 : 0]);
          // Fix owner user name/email fields
          db.run(`UPDATE gym_users SET name='Demo Owner', email='demo@afrofitness.com' WHERE username='demo@afrofitness.com'`);
          saveDatabase();
          return res.json({ message: 'Demo gym refreshed', email: 'demo@afrofitness.com', password: 'Demo1234' });
        }

        const gymId = uuidv4();
        const userId = uuidv4();
        const today = new Date();
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const membershipDurations = { '1_month': 30, '2_months': 60, '3_months': 90, '6_months': 180, '1_year': 365, '3_days_week': 30 };
        const ethiopianNames = [
          'Abebe Tadesse', 'Tigist Haile', 'Mohammed Ali', 'Aster Demissie', 'John Smith',
          'Fatima Omar', 'Samuel Girma', 'Helen Tesfaye', 'Tadesse Bekele', 'Birtukan Feyissa',
          'Yonas Solomon', 'Mahlet Alemu', 'Dagmawi Habte', 'Selamawit Solomon', 'Henok Tadesse',
          'Hiwot Girma', 'Kaleb Ayele', 'Emebet Bekele', 'Dawit Mengistu', 'Tigist Wolde',
          'Abraham Kebede', 'Meselech Asrat', 'Samuel Hailu', 'Liya Teklu', 'Mikhael Dawit',
          'Hana Kassa', 'Yosef Yirdaw', 'Frehiwot Amare', 'Daniel Girma', 'Almaz Seyoum',
          'Abel Tesfaye', 'Mekdes Alemu', 'Zewdu Haile', 'Tigist Mengistu', 'Samrawit Girma',
          'Bekele Demissie', 'Tigist Tadesse', 'Hailu Kebede', 'Frehiwot Belete', 'Tadesse Alemu',
          'Mahlet Girma', 'Dagmawi Tadesse', 'Selamawit Hailu', 'Abraham Wolde', 'Helen Girma',
          'Yonas Bekele', 'Aster Alemu', 'Samuel Tadesse', 'Mahlet Solomon'
        ];
        const membershipTypes = ['1_month', '2_months', '3_months', '6_months', '1_year', '3_days_week'];
        const paymentMethods = ['cash', 'card', 'mobile'];
        const smsApiKey = process.env.GEEZSMS_API_KEY || null;

        try {
          const oneYearAhead = new Date(today); oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);
          db.run(`
            INSERT INTO gyms (id, name, slug, email, phone, subscription_status, subscription_plan, subscription_start, subscription_end, max_members, sms_enabled, sms_api_key, color_theme, created_at)
            VALUES (?, ?, ?, ?, ?, 'active', 'pro', ?, ?, -1, ?, ?, 'purple', ?)
          `, [gymId, 'Afro Fitness Center', 'afro-fitness-center', 'demo@afrofitness.com', '+251911000000',
              oneYearAgo.toISOString().split('T')[0], oneYearAhead.toISOString().split('T')[0],
              smsApiKey ? 1 : 0, smsApiKey, today.toISOString()]);

          const hashedPassword = bcrypt.hashSync('Demo1234', 10);
          db.run(`INSERT INTO gym_users (id, gym_id, username, name, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?, 'owner', ?)`,
            [userId, gymId, 'demo@afrofitness.com', 'Demo Owner', 'demo@afrofitness.com', hashedPassword, today.toISOString()]);

          for (let i = 0; i < 50; i++) {
            const customerId = uuidv4();
            const name = ethiopianNames[i % ethiopianNames.length] + (i >= ethiopianNames.length ? ` ${Math.floor(i / ethiopianNames.length) + 1}` : '');
            const phone = `+251912${String(1000000 + Math.floor(Math.random() * 9000000))}`;
            const membership_type = membershipTypes[Math.floor(Math.random() * membershipTypes.length)];
            const duration = membershipDurations[membership_type];

            const daysAgo = Math.floor(Math.random() * 365);
            const membershipStart = new Date(today);
            membershipStart.setDate(membershipStart.getDate() - daysAgo);
            const membershipEnd = new Date(membershipStart);
            membershipEnd.setDate(membershipEnd.getDate() + duration);
            const status = membershipEnd < today ? 'expired' : 'active';

            db.run(`INSERT INTO customers (id, gym_id, name, phone, email, membership_type, membership_start, membership_end, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [customerId, gymId, name, phone, `${name.toLowerCase().replace(/\s/g, '.')}@email.com`,
               membership_type, membershipStart.toISOString().split('T')[0], membershipEnd.toISOString().split('T')[0], status, membershipStart.toISOString()]);

            const numPayments = 3 + Math.floor(Math.random() * 6);
            for (let j = 0; j < numPayments; j++) {
              const paymentId = uuidv4();
              const paymentDaysAgo = Math.floor(Math.random() * Math.min(daysAgo + 30, 365));
              const paymentDate = new Date(today);
              paymentDate.setDate(paymentDate.getDate() - paymentDaysAgo);
              let amount = 1500;
              if (membership_type === '1_year') amount = 12000;
              else if (membership_type === '6_months') amount = 7000;
              else if (membership_type === '3_months') amount = 4000;
              else if (membership_type === '2_months') amount = 2800;

              db.run(`INSERT INTO payments (id, gym_id, customer_id, amount, payment_method, payment_date, membership_type, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [paymentId, gymId, customerId, amount, paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                 paymentDate.toISOString().split('T')[0], membership_type, membershipStart.toISOString().split('T')[0], membershipEnd.toISOString().split('T')[0], paymentDate.toISOString()]);
            }

            if (status === 'active' || Math.random() > 0.5) {
              const numCheckIns = 10 + Math.floor(Math.random() * 40);
              for (let k = 0; k < numCheckIns; k++) {
                const attendanceId = uuidv4();
                const checkInDate = new Date(membershipStart);
                checkInDate.setDate(checkInDate.getDate() + Math.floor(Math.random() * duration));
                if (checkInDate > today) continue;
                const checkInTime = new Date(checkInDate);
                checkInTime.setHours(6 + Math.floor(Math.random() * 12));
                checkInTime.setMinutes(Math.floor(Math.random() * 60));
                let checkOut = null;
                if (Math.random() > 0.3) {
                  const co = new Date(checkInTime);
                  co.setHours(checkInTime.getHours() + 1 + Math.floor(Math.random() * 2));
                  checkOut = co.toISOString();
                }
                db.run(`INSERT INTO attendance (id, gym_id, customer_id, check_in, check_out) VALUES (?, ?, ?, ?, ?)`,
                  [attendanceId, gymId, customerId, checkInTime.toISOString(), checkOut]);
              }
            }
          }

          saveDatabase();
          res.json({
            success: true,
            message: 'Demo gym created successfully!',
            gym: { name: 'Afro Fitness Center', email: 'demo@afrofitness.com', password: 'Demo1234', plan: 'Pro' },
            stats: { customers: 50, dataRange: '1 year' }
          });
        } catch (error) {
          console.error('Seed error:', error);
          res.status(500).json({ error: 'Failed to seed demo data: ' + error.message });
        }
      });
    }).catch(err => res.status(500).json({ error: 'Module import failed: ' + err.message }));
  }).catch(err => res.status(500).json({ error: 'Module import failed: ' + err.message }));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
});

async function startServer() {
  try {
    await initDatabase();
    console.log('✅ Database ready');

    // Run SMS reminders every day at 08:00 AM (Africa/Addis_Ababa = UTC+3)
    cron.schedule('0 5 * * *', () => {
      console.log('⏰ Daily cron: running SMS reminders...');
      reminderService.runAllChecks().catch(e =>
        console.error('Cron reminder error:', e.message)
      );
    }, { timezone: 'UTC' });
    console.log('📅 Daily SMS reminder cron scheduled (08:00 EAT / 05:00 UTC)');

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
