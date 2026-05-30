import db from '../config/db.js';
import { getLocalTimeDetails } from '../controllers/attendance.js';
import logAudit from '../utils/audit.js';
import crypto from 'crypto';

// Helper to convert 'HH:MM' to minutes since midnight
const parseTimeToMins = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Core function to run the Auto-Absent check.
 * Searches all active sessions, and flags assigned employees as Absent if they did not check in.
 * @param {boolean} force - If true, bypasses time limits (useful for manual admin test triggers)
 */
export const runAutoAbsentCheck = async (force = false) => {
  console.log(`[Auto-Absent Scheduler] Running per-session check (Force Mode: ${force})...`);
  
  try {
    // 1. Fetch active sessions
    const sessionsResult = await db.execute("SELECT * FROM attendance_sessions WHERE is_active = 1");
    const activeSessions = sessionsResult.rows;

    if (activeSessions.length === 0) {
      console.log('[Auto-Absent Scheduler] No active sessions found.');
      return { success: true, count: 0, message: 'No active sessions.' };
    }

    let totalFlagged = 0;
    const now = new Date().toISOString();

    for (const session of activeSessions) {
      const { dateStr, timeStr, hour, minute, dayName } = getLocalTimeDetails(session.timezone);

      // Verify working days
      const days = session.working_days ? session.working_days.split(',') : [];
      if (!force && !days.includes(dayName)) {
        console.log(`[Auto-Absent Scheduler] Session "${session.title}" working days do not include today (${dayName}). Skipping.`);
        continue;
      }

      // Check if session has closed
      if (!force) {
        const currentMins = hour * 60 + minute;
        const endMins = parseTimeToMins(session.end_time);

        if (currentMins < endMins) {
          console.log(`[Auto-Absent Scheduler] Session "${session.title}" window is still open (closes at ${session.end_time}, current time is ${timeStr}). Skipping.`);
          continue;
        }
      }

      console.log(`[Auto-Absent Scheduler] Processing absent checks for session: "${session.title}"...`);

      // Fetch assigned employees
      let employees = [];
      if (session.assignment_type === 'all') {
        const res = await db.execute({
          sql: "SELECT id, name, employee_id FROM users WHERE role = 'employee' AND status = 'active'",
          args: []
        });
        employees = res.rows;
      } else if (session.assignment_type === 'department') {
        const res = await db.execute({
          sql: "SELECT id, name, employee_id FROM users WHERE role = 'employee' AND status = 'active' AND department = ?",
          args: [session.department]
        });
        employees = res.rows;
      } else if (session.assignment_type === 'selected') {
        const res = await db.execute({
          sql: `
            SELECT u.id, u.name, u.employee_id
            FROM users u
            JOIN attendance_session_assignments a ON u.id = a.user_id
            WHERE u.role = 'employee' AND u.status = 'active' AND a.session_id = ?
          `,
          args: [session.id]
        });
        employees = res.rows;
      }

      if (employees.length === 0) {
        console.log(`[Auto-Absent Scheduler] No assigned active employees for session "${session.title}".`);
        continue;
      }

      for (const emp of employees) {
        // Check if employee has any record for this date and session
        const recordCheck = await db.execute({
          sql: 'SELECT id FROM attendance_records WHERE user_id = ? AND date = ? AND session_id = ?',
          args: [emp.id, dateStr, session.id]
        });

        if (recordCheck.rows.length === 0) {
          // Employee did not mark -> Mark Absent!
          const recordId = crypto.randomUUID();
          await db.execute({
            sql: `
              INSERT INTO attendance_records (
                id, user_id, date, status, check_in_time, latitude, longitude,
                location_accuracy, device_info, face_verified, remarks, created_at, updated_at, session_id
              ) VALUES (?, ?, ?, 'Absent', NULL, 0.0, 0.0, 0.0, 'System Scheduler', 0, 'Not marked within attendance window', ?, ?, ?)
            `,
            args: [recordId, emp.id, dateStr, now, now, session.id]
          });

          await logAudit(
            emp.id,
            'AUTO_ABSENT_MARK',
            `System automatically marked employee ${emp.name} (ID: ${emp.employee_id}) as Absent for "${session.title}" (${dateStr}) due to session window closure.`,
            null
          );

          totalFlagged++;
        }
      }
    }

    console.log(`[Auto-Absent Scheduler] Absent check complete. Total absentees flagged: ${totalFlagged}`);
    return { success: true, count: totalFlagged };
  } catch (error) {
    console.error('[Auto-Absent Scheduler] CRITICAL ERROR:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Initializes the background scheduler.
 * Ticks every 1 minute to check and execute the auto-absent job dynamically.
 */
export const initAutoAbsentScheduler = () => {
  console.log('[Scheduler] Initializing dynamic Auto-Absent ticker (1 minute interval)...');
  
  // Tick every 60 seconds
  setInterval(async () => {
    try {
      // Check settings to see if auto_absent is enabled globally (singleton or default settings)
      const settingsResult = await db.execute({
        sql: "SELECT auto_absent_enabled FROM attendance_settings WHERE id = 'singleton'",
        args: []
      });

      if (settingsResult.rows.length > 0 && settingsResult.rows[0].auto_absent_enabled === 1) {
        await runAutoAbsentCheck(false);
      }
    } catch (e) {
      console.error('[Scheduler] Ticker error:', e);
    }
  }, 60 * 1000);
};
