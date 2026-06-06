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

// Secret seed endpoint to create demo data
app.post('/api/seed-demo', (req, res) => {
  const { secret } = req.body;
  
  // Check secret key (use env var or default for development)
  const SEED_SECRET = process.env.SEED_SECRET || 'SEED123';
  
  if (secret !== SEED_SECRET) {
    return res.status(401).json({ error: 'Invalid secret key' });
  }
  
  // Import required modules dynamically
  import('./models/database.js').then(({ getDb, runQuery, getOne, saveDatabase }) => {
    import('bcryptjs').then(({ default: bcrypt }) => {
      import('uuid').then(({ v4: uuidv4 }) => {
        const db = getDb();
        
        // Check if demo gym already exists
        const existingGym = db.exec("SELECT * FROM gyms WHERE email = 'demo@afrofitness.com'");
        if (existingGym.length > 0 && existingGym[0].values.length > 0) {
          return res.json({ message: 'Demo gym already exists', email: 'demo@afrofitness.com', password: 'Demo1234' });
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
        
        try {
          // Create demo gym
          db.run(`
            INSERT INTO gyms (id, name, slug, email, phone, subscription_status, subscription_plan, subscription_start, subscription_end, max_members, created_at)
            VALUES (?, ?, ?, ?, ?, 'active', 'pro', ?, ?, -1, ?)
          `, [gymId, 'Afro Fitness Center', 'afro-fitness-center', 'demo@afrofitness.com', '+251911000000', oneYearAgo.toISOString().split('T')[0], today.toISOString().split('T')[0], today.toISOString()]);
          
          // Create owner user
          const hashedPassword = bcrypt.hashSync('Demo1234', 10);
          db.run(`INSERT INTO gym_users (id, gym_id, username, password, role, created_at) VALUES (?, ?, ?, ?, 'owner', ?)`, [userId, gymId, 'demo@afrofitness.com', hashedPassword, today.toISOString()]);
          
          // Create 50 customers
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
              [customerId, gymId, name, phone, `${name.toLowerCase().replace(/\s/g, '.')}@email.com`, membership_type, membershipStart.toISOString().split('T')[0], membershipEnd.toISOString().split('T')[0], status, membershipStart.toISOString()]);
            
            // Create 3-8 payments per customer
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
                [paymentId, gymId, customerId, amount, paymentMethods[Math.floor(Math.random() * paymentMethods.length)], paymentDate.toISOString().split('T')[0], membership_type, membershipStart.toISOString().split('T')[0], membershipEnd.toISOString().split('T')[0], paymentDate.toISOString()]);
            }
            
            // Create attendance for active customers
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
                
                db.run(`INSERT INTO attendance (id, gym_id, customer_id, check_in, check_out) VALUES (?, ?, ?, ?, ?)`, [attendanceId, gymId, customerId, checkInTime.toISOString(), checkOut]);
              }
            }
          }
          
          saveDatabase();
          
          res.json({
            success: true,
            message: 'Demo gym created successfully!',
            gym: {
              name: 'Afro Fitness Center',
              email: 'demo@afrofitness.com',
              password: 'Demo1234',
              plan: 'Pro'
            },
            stats: {
              customers: 50,
              dataRange: '1 year'
            }
          });
        } catch (error) {
          console.error('Seed error:', error);
          res.status(500).json({ error: 'Failed to seed demo data: ' + error.message });
        }
      });
    }).catch(err => {
      res.status(500).json({ error: 'Module import failed: ' + err.message });
    });
  }).catch(err => {
    res.status(500).json({ error: 'Module import failed: ' + err.message });
  });
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
