import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Load environmental parameters
dotenv.config();

// Imports API Router configurations
import authRoutes from './routes/auth.js';
import faceRoutes from './routes/face.js';
import employeeRoutes from './routes/employee.js';
import attendanceRoutes from './routes/attendance.js';
import settingsRoutes from './routes/settings.js';
import reportsRoutes from './routes/reports.js';
import { adminRouter as adminSessionsRoutes, employeeRouter as employeeSessionsRoutes } from './routes/sessions.js';

// Error Middleware and Schedulers
import errorHandler from './middleware/error.js';
import { initAutoAbsentScheduler } from './scheduler/autoAbsent.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with selective origins (all allowed for local developer convenience)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Express middleware to parse incoming request structures (expanded to 10mb for secure base64 biometrics)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use(morgan('dev'));

// Server heartbeat sanity check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Configure REST API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin/settings/attendance', settingsRoutes);
app.use('/api/admin/reports', reportsRoutes);
app.use('/api/admin/attendance-sessions', adminSessionsRoutes);
app.use('/api/employee/attendance-sessions', employeeSessionsRoutes);

// Catch-all route handler for non-existent routes
app.use((req, res, next) => {
  const error = new Error(`Route Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Global Error Catching Middleware
app.use(errorHandler);

// Start listening and initialize tickers
app.listen(PORT, async () => {
  console.log(`=============================================`);
  console.log(`🚀 Server successfully launched on Port: ${PORT}`);
  console.log(`🏠 Workspace: c:\\Attendance\\backend`);
  console.log(`=============================================`);

  // Self-healing: Ensure late_login_requests, employee_photos, attendance_sessions, session_assignments and attendance_records modifications exist automatically
  try {
    const db = (await import('./config/db.js')).default;
    const { ensureUploadDirectories } = await import('./utils/photoStorage.js');
    
    // Ensure uploads/ directories exist
    ensureUploadDirectories();
    console.log('✓ Uploads storage subdirectories initialized.');

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
    console.log('✓ "late_login_requests" table verified/created.');

    // Create employee_photos table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS employee_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        reference_photo_url TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ "employee_photos" table verified/created.');

    // Create attendance_sessions table
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
    console.log('✓ "attendance_sessions" table verified/created.');

    // Create attendance_session_assignments table
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
    console.log('✓ "attendance_session_assignments" table verified/created.');

    // Migrations logic for attendance_records to shift UNIQUE constraint to (user_id, date, session_id)
    try {
      const colInfo = await db.execute("PRAGMA table_info(attendance_records)");
      const hasSessionId = colInfo.rows.some(r => r.name === 'session_id');

      if (!hasSessionId) {
        console.log('⚡ Migrating "attendance_records" to support multiple sessions...');
        // 1. Create temporary new table
        await db.execute(`
          CREATE TABLE IF NOT EXISTS attendance_records_new (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('Present', 'Absent', 'Late')),
            check_in_time TEXT,
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
            UNIQUE(user_id, date, session_id)
          )
        `);

        // 2. Ensure default sessions exist to map historical records
        const sessionCheck = await db.execute("SELECT id FROM attendance_sessions WHERE session_type = 'morning'");
        let morningSessionId = 1;
        if (sessionCheck.rows.length === 0) {
          const morningInsert = await db.execute({
            sql: `INSERT INTO attendance_sessions (title, session_type, start_time, end_time, grace_period_minutes, timezone, working_days, assignment_type, is_active)
                  VALUES ('Morning Attendance', 'morning', '09:00', '10:00', 15, 'Asia/Kolkata', 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday', 'all', 1)`,
            args: []
          });
          morningSessionId = Number(morningInsert.lastInsertRowid || 1);
        } else {
          morningSessionId = Number(sessionCheck.rows[0].id);
        }

        const eveningCheck = await db.execute("SELECT id FROM attendance_sessions WHERE session_type = 'evening'");
        if (eveningCheck.rows.length === 0) {
          await db.execute({
            sql: `INSERT INTO attendance_sessions (title, session_type, start_time, end_time, grace_period_minutes, timezone, working_days, assignment_type, is_active)
                  VALUES ('Evening Attendance', 'evening', '17:00', '18:00', 15, 'Asia/Kolkata', 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday', 'all', 1)`,
            args: []
          });
        }

        // 3. Move old logs safely
        await db.execute({
          sql: `
            INSERT INTO attendance_records_new (
              id, user_id, date, status, check_in_time, latitude, longitude, location_accuracy,
              device_info, face_verified, remarks, created_at, updated_at, session_id,
              attendance_photo_url, face_match_score, face_match_passed
            )
            SELECT
              id, user_id, date, status, check_in_time, latitude, longitude, location_accuracy,
              device_info, face_verified, remarks, created_at, updated_at, ?,
              attendance_photo_url, face_match_score, face_match_passed
            FROM attendance_records
          `,
          args: [morningSessionId]
        });

        // 4. Swap tables
        await db.execute("DROP TABLE attendance_records");
        await db.execute("ALTER TABLE attendance_records_new RENAME TO attendance_records");
        console.log('✓ "attendance_records" migrated successfully to session-unique schema.');
      } else {
        // Seed default Morning & Evening sessions if none exist
        const sessionCheck = await db.execute("SELECT id FROM attendance_sessions LIMIT 1");
        if (sessionCheck.rows.length === 0) {
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
          console.log('✓ Default attendance sessions seeded.');
        }
      }
    } catch (migErr) {
      console.error('Error during self-healing table migration:', migErr);
    }

  } catch (err) {
    console.error('Error running self-healing startup migrations:', err);
  }

  // Start background Auto-Absent scheduler
  initAutoAbsentScheduler();
});
