import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../data/gym.db');

const TRIAL_DAYS = 14;
const membershipDurations = {
  '1_month': 30,
  '2_months': 60,
  '3_months': 90,
  '6_months': 180,
  '1_year': 365,
  '3_days_week': 30
};

const ethiopianNames = [
  'Abebe Tadesse', 'Tigist Haile', 'Mohammed Ali', 'Aster Demissie', 'John Smith',
  'Fatima Omar', 'Samuel Girma', 'Helen Tesfaye', 'Tadesse Bekele', 'Birtukan Feyissa',
  'Yonas Solomon', 'Mahlet Alemu', 'Dagmawi Habte', 'Selamawit Solomon', 'Henok Tadesse',
  'Hiwot Girma', 'Kaleb Ayele', 'Emebet Bekele', 'Dawit Mengistu', 'Tigist Wolde',
  'Abraham Kebede', 'Meselech Asrat', 'Samuel Hailu', 'Liya Teklu', 'Mikhael Dawit',
  'Hana Kassa', 'Yosef Yirdaw', 'Frehiwot Amare', 'Daniel Girma', ' Almaz Seyoum',
  'Abel Tesfaye', 'Mekdes Alemu', 'Zewdu Haile', 'Tigist Mengistu', 'Samrawit Girma',
  'Bekele Demissie', 'Tigist Tadesse', 'Hailu Kebede', 'Frehiwot Belete', 'Tadesse Alemu',
  'Mahlet Girma', 'Dagmawi Tadesse', 'Selamawit Hailu', 'Abraham Wolde', 'Helen Girma',
  'Yonas Bekele', 'Aster Alemu', 'Samuel Tadesse', 'Mahlet Solomon'
];

const membershipTypes = ['1_month', '2_months', '3_months', '6_months', '1_year', '3_days_week'];
const paymentMethods = ['cash', 'card', 'mobile'];

async function createDemoGym() {
  const SQL = await initSqlJs();
  
  if (!fs.existsSync(dbPath)) {
    console.log('Database not found at:', dbPath);
    return;
  }
  
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  console.log('Connected to database');
  
  // Create demo gym
  const gymId = uuidv4();
  const userId = uuidv4();
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  // Check if demo gym already exists
  const existingGym = db.exec("SELECT * FROM gyms WHERE email = 'demo@afrofitness.com'");
  if (existingGym.length > 0 && existingGym[0].values.length > 0) {
    console.log('Demo gym already exists!');
    const gym = db.exec("SELECT id FROM gyms WHERE email = 'demo@afrofitness.com'")[0].values[0];
    console.log('Gym ID:', gym[0]);
    
    // Show credentials
    const user = db.exec("SELECT * FROM gym_users WHERE username = 'demo@afrofitness.com'")[0];
    if (user && user.values.length > 0) {
      console.log('\nLogin credentials:');
      console.log('Email: demo@afrofitness.com');
      console.log('Password: Demo1234');
    }
    return;
  }
  
  // Create gym with Pro plan
  db.run(`
    INSERT INTO gyms (id, name, slug, email, phone, subscription_status, subscription_plan, subscription_start, subscription_end, max_members, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', 'pro', ?, ?, -1, ?)
  `, [
    gymId, 
    'Afro Fitness Center', 
    'afro-fitness-center', 
    'demo@afrofitness.com', 
    '+251911000000',
    oneYearAgo.toISOString().split('T')[0],
    today.toISOString().split('T')[0],
    today.toISOString()
  ]);
  
  console.log('Created gym: Afro Fitness Center');
  
  // Create owner user
  const hashedPassword = bcrypt.hashSync('Demo1234', 10);
  db.run(`
    INSERT INTO gym_users (id, gym_id, username, password, role, created_at)
    VALUES (?, ?, ?, ?, 'owner', ?)
  `, [userId, gymId, 'demo@afrofitness.com', hashedPassword, today.toISOString()]);
  
  console.log('Created user: demo@afrofitness.com / Demo1234');
  
  // Create 50 customers with 1 year of data
  let totalCustomers = 0;
  const customersCreated = [];
  
  for (let i = 0; i < 50; i++) {
    const customerId = uuidv4();
    const name = ethiopianNames[i % ethiopianNames.length] + (i > ethiopianNames.length ? ` ${Math.floor(i / ethiopianNames.length) + 1}` : '');
    const phone = `+251912${String(1000000 + Math.floor(Math.random() * 9000000))}`;
    const email = `${name.toLowerCase().replace(/\s/g, '.')}@email.com`;
    
    // Random membership type
    const membership_type = membershipTypes[Math.floor(Math.random() * membershipTypes.length)];
    const duration = membershipDurations[membership_type];
    
    // Random start date within the last year
    const daysAgo = Math.floor(Math.random() * 365);
    const membershipStart = new Date(today);
    membershipStart.setDate(membershipStart.getDate() - daysAgo);
    
    // Membership end
    const membershipEnd = new Date(membershipStart);
    membershipEnd.setDate(membershipEnd.getDate() + duration);
    
    // Status based on membership end date
    let status = 'active';
    if (membershipEnd < today) {
      status = 'expired';
    }
    
    db.run(`
      INSERT INTO customers (id, gym_id, name, phone, email, membership_type, membership_start, membership_end, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      customerId,
      gymId,
      name,
      phone,
      email,
      membership_type,
      membershipStart.toISOString().split('T')[0],
      membershipEnd.toISOString().split('T')[0],
      status,
      membershipStart.toISOString()
    ]);
    
    totalCustomers++;
    customersCreated.push({ id: customerId, name, membership_type });
    
    // Create 3-8 payments per customer
    const numPayments = 3 + Math.floor(Math.random() * 6);
    for (let j = 0; j < numPayments; j++) {
      const paymentId = uuidv4();
      
      // Random payment date within the year
      const paymentDaysAgo = Math.floor(Math.random() * Math.min(daysAgo + 30, 365));
      const paymentDate = new Date(today);
      paymentDate.setDate(paymentDate.getDate() - paymentDaysAgo);
      
      // Amount based on membership type
      let amount = 1500;
      if (membership_type === '1_year') amount = 12000;
      else if (membership_type === '6_months') amount = 7000;
      else if (membership_type === '3_months') amount = 4000;
      else if (membership_type === '2_months') amount = 2800;
      
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      
      db.run(`
        INSERT INTO payments (id, gym_id, customer_id, amount, payment_method, payment_date, membership_type, start_date, end_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        paymentId,
        gymId,
        customerId,
        amount,
        paymentMethod,
        paymentDate.toISOString().split('T')[0],
        membership_type,
        membershipStart.toISOString().split('T')[0],
        membershipEnd.toISOString().split('T')[0],
        paymentDate.toISOString()
      ]);
    }
    
    // Create attendance records for active customers
    if (status === 'active' || Math.random() > 0.5) {
      const numCheckIns = 10 + Math.floor(Math.random() * 40);
      for (let k = 0; k < numCheckIns; k++) {
        const attendanceId = uuidv4();
        const checkInDate = new Date(membershipStart);
        checkInDate.setDate(checkInDate.getDate() + Math.floor(Math.random() * duration));
        
        if (checkInDate > today) continue;
        
        const checkInTime = new Date(checkInDate);
        checkInTime.setHours(6 + Math.floor(Math.random() * 12)); // Random hour between 6am and 6pm
        checkInTime.setMinutes(Math.floor(Math.random() * 60));
        
        // 70% chance of having a check-out time
        let checkOut = null;
        if (Math.random() > 0.3) {
          const checkOutTime = new Date(checkInTime);
          checkOutTime.setHours(checkInTime.getHours() + 1 + Math.floor(Math.random() * 2));
          checkOut = checkOutTime.toISOString();
        }
        
        db.run(`
          INSERT INTO attendance (id, gym_id, customer_id, check_in, check_out)
          VALUES (?, ?, ?, ?, ?)
        `, [
          attendanceId,
          gymId,
          customerId,
          checkInTime.toISOString(),
          checkOut
        ]);
      }
    }
  }
  
  console.log(`Created ${totalCustomers} customers with payments and attendance records`);
  
  // Save database
  const data = db.export();
  const outputBuffer = Buffer.from(data);
  fs.writeFileSync(dbPath, outputBuffer);
  
  console.log('\n✅ Demo gym created successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Email:    demo@afrofitness.com');
  console.log('Password: Demo1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 Gym Details:');
  console.log('- Name: Afro Fitness Center');
  console.log('- Plan: Pro (unlimited members)');
  console.log('- Members: 50');
  console.log('- Data range: 1 year');
}

createDemoGym().catch(console.error);