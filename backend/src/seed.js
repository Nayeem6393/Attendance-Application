import db from './config/db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid'; // Let's use a simple custom UUID generator or standard crypto.randomUUID to avoid dependencies if crypto is native
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

function generateUUID() {
  return crypto.randomUUID();
}

async function seed() {
  console.log('--- Database Seeding Started ---');

  try {
    // 1. Create tables
    console.log('Creating tables if they do not exist...');

    // Users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        mobile TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
        department TEXT,
        designation TEXT,
        employee_id TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'rejected')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    console.log('✓ "users" table initialized.');

    // Face Templates table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS face_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        face_embedding TEXT NOT NULL,
        enrollment_status TEXT NOT NULL CHECK(enrollment_status IN ('enrolled', 'pending')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
    console.log('✓ "face_templates" table initialized.');

    // Attendance Records table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        status TEXT NOT NULL CHECK(status IN ('Present', 'Absent', 'Late')),
        check_in_time TEXT, -- HH:MM:SS
        latitude REAL,
        longitude REAL,
        location_accuracy REAL,
        device_info TEXT,
        face_verified INTEGER NOT NULL CHECK(face_verified IN (0, 1)),
        remarks TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        session_id INTEGER,
        attendance_photo_url TEXT,
        face_match_score REAL,
        face_match_passed INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, date, session_id) -- Prevents duplicate attendance for the same session on the same day
      )
    `);
    console.log('✓ "attendance_records" table initialized.');

    // Attendance Sessions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        session_type TEXT DEFAULT 'custom',
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        grace_period_minutes INTEGER DEFAULT 15,
        timezone TEXT DEFAULT 'Asia/Kolkata',
        working_days TEXT DEFAULT 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
        assignment_type TEXT DEFAULT 'all',
        department TEXT,
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ "attendance_sessions" table initialized.');

    // Attendance Session Assignments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS attendance_session_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(session_id, user_id),
        FOREIGN KEY(session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ "attendance_session_assignments" table initialized.');

    // Attendance Settings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS attendance_settings (
        id TEXT PRIMARY KEY, -- 'singleton'
        start_time TEXT NOT NULL, -- HH:MM
        end_time TEXT NOT NULL, -- HH:MM
        grace_period_minutes INTEGER NOT NULL DEFAULT 15,
        timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
        working_days TEXT NOT NULL, -- JSON array of strings
        auto_absent_enabled INTEGER NOT NULL CHECK(auto_absent_enabled IN (0, 1)) DEFAULT 1,
        updated_by TEXT,
        updated_at TEXT NOT NULL
      )
    `);
    console.log('✓ "attendance_settings" table initialized.');

    // Audit Logs table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        description TEXT,
        ip_address TEXT,
        device_info TEXT,
        created_at TEXT NOT NULL
      )
    `);
    console.log('✓ "audit_logs" table initialized.');

    // Late Login Requests table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS late_login_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
        reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, date)
      )
    `);
    console.log('✓ "late_login_requests" table initialized.');

    // 2. Seed default admin account
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    console.log(`Checking if Admin user "${adminEmail}" exists...`);
    const adminCheck = await db.execute({
      sql: 'SELECT * FROM users WHERE role = ?',
      args: ['admin']
    });

    if (adminCheck.rows.length === 0) {
      console.log('No Admin found. Creating default admin...');
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const adminId = generateUUID();
      const now = new Date().toISOString();

      await db.execute({
        sql: `
          INSERT INTO users (id, name, email, mobile, password_hash, role, department, designation, employee_id, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'admin', 'Management', 'System Administrator', 'ADM001', 'active', ?, ?)
        `,
        args: [adminId, 'Admin User', adminEmail, '0000000000', passwordHash, now, now]
      });

      // Also create an audit log
      await db.execute({
        sql: `
          INSERT INTO audit_logs (id, user_id, action, description, ip_address, device_info, created_at)
          VALUES (?, ?, 'SEED', 'System Admin account seeded successfully during initialization.', '127.0.0.1', 'System Server', ?)
        `,
        args: [generateUUID(), adminId, now]
      });

      console.log('✓ Admin user seeded successfully.');
    } else {
      console.log('✓ Admin user already exists. Skipping creation.');
    }

    // 3. Seed default attendance settings
    console.log('Checking for default attendance settings...');
    const settingsCheck = await db.execute({
      sql: 'SELECT * FROM attendance_settings WHERE id = ?',
      args: ['singleton']
    });

    if (settingsCheck.rows.length === 0) {
      console.log('No settings found. Seeding default settings...');
      const now = new Date().toISOString();
      const workingDays = JSON.stringify(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

      await db.execute({
        sql: `
          INSERT INTO attendance_settings (id, start_time, end_time, grace_period_minutes, timezone, working_days, auto_absent_enabled, updated_by, updated_at)
          VALUES ('singleton', '09:00', '10:00', 15, 'Asia/Kolkata', ?, 1, 'system', ?)
        `,
        args: [workingDays, now]
      });
      console.log('✓ Default attendance settings seeded successfully.');
    } else {
      console.log('✓ Attendance settings already exist. Skipping.');
    }

    // 4. Seed default attendance sessions
    console.log('Checking for default attendance sessions...');
    const sessionsCheck = await db.execute("SELECT id FROM attendance_sessions LIMIT 1");
    if (sessionsCheck.rows.length === 0) {
      console.log('No sessions found. Seeding default Morning and Evening sessions...');
      await db.execute({
        sql: `INSERT INTO attendance_sessions (title, session_type, start_time, end_time, grace_period_minutes, timezone, working_days, assignment_type, is_active)
              VALUES ('Morning Attendance', 'morning', '09:00', '10:00', 15, 'Asia/Kolkata', 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday', 'all', 1)`,
        args: []
      });
      await db.execute({
        sql: `INSERT INTO attendance_sessions (title, session_type, start_time, end_time, grace_period_minutes, timezone, working_days, assignment_type, is_active)
              VALUES ('Evening Attendance', 'evening', '17:00', '18:00', 15, 'Asia/Kolkata', 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday', 'all', 1)`,
        args: []
      });
      console.log('✓ Default attendance sessions seeded successfully.');
    } else {
      console.log('✓ Attendance sessions already exist. Skipping.');
    }

    console.log('--- Database Seeding Completed Successfully ---');
    process.exit(0);
  } catch (error) {
    console.error('CRITICAL: Database seeding failed with error:', error);
    process.exit(1);
  }
}

seed();
