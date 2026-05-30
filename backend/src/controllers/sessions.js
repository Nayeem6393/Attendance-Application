import db from '../config/db.js';
import logAudit from '../utils/audit.js';
import { getLocalTimeDetails } from './attendance.js';

// Helper to convert 'HH:MM' to minutes since midnight
const parseTimeToMins = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// GET /api/admin/attendance-sessions
export const getSessions = async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT s.*, u.name as creator_name
      FROM attendance_sessions s
      LEFT JOIN users u ON s.created_by = u.id
      ORDER BY s.created_at DESC
    `);
    
    // Parse working_days back to array if sent as string or JSON
    const sessions = result.rows.map(s => {
      let days = [];
      if (s.working_days) {
        if (s.working_days.startsWith('[')) {
          try {
            days = JSON.parse(s.working_days);
          } catch (_) {
            days = s.working_days.split(',');
          }
        } else {
          days = s.working_days.split(',');
        }
      }
      return { ...s, working_days: days };
    });

    return res.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({ error: 'Failed to retrieve attendance sessions.' });
  }
};

// POST /api/admin/attendance-sessions
export const createSession = async (req, res) => {
  try {
    const {
      title,
      session_type,
      start_time,
      end_time,
      grace_period_minutes,
      timezone,
      working_days,
      assignment_type,
      department,
      is_active
    } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start time, and end time are required.' });
    }

    const workingDaysStr = Array.isArray(working_days)
      ? working_days.join(',')
      : working_days || 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday';

    const creatorId = req.user.id;
    const now = new Date().toISOString();

    const insertResult = await db.execute({
      sql: `
        INSERT INTO attendance_sessions (
          title, session_type, start_time, end_time, grace_period_minutes,
          timezone, working_days, assignment_type, department, is_active,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        title,
        session_type || 'custom',
        start_time,
        end_time,
        grace_period_minutes !== undefined ? parseInt(grace_period_minutes, 10) : 15,
        timezone || 'Asia/Kolkata',
        workingDaysStr,
        assignment_type || 'all',
        department || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        creatorId,
        now,
        now
      ]
    });

    const newSessionId = Number(insertResult.lastInsertRowid);

    await logAudit(
      req.user.id,
      'CREATE_ATTENDANCE_SESSION',
      `Created session "${title}" (${session_type || 'custom'}). Window: ${start_time}-${end_time}.`,
      req
    );

    return res.status(201).json({
      message: 'Attendance session created successfully.',
      session_id: newSessionId
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ error: 'Failed to create attendance session.' });
  }
};

// PUT /api/admin/attendance-sessions/:id
export const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      session_type,
      start_time,
      end_time,
      grace_period_minutes,
      timezone,
      working_days,
      assignment_type,
      department,
      is_active
    } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Title, start time, and end time are required.' });
    }

    const workingDaysStr = Array.isArray(working_days)
      ? working_days.join(',')
      : working_days || 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday';

    const now = new Date().toISOString();

    const checkSession = await db.execute({
      sql: 'SELECT id FROM attendance_sessions WHERE id = ?',
      args: [id]
    });

    if (checkSession.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance session not found.' });
    }

    await db.execute({
      sql: `
        UPDATE attendance_sessions
        SET title = ?, session_type = ?, start_time = ?, end_time = ?, grace_period_minutes = ?,
            timezone = ?, working_days = ?, assignment_type = ?, department = ?, is_active = ?,
            updated_at = ?
        WHERE id = ?
      `,
      args: [
        title,
        session_type,
        start_time,
        end_time,
        parseInt(grace_period_minutes, 10),
        timezone,
        workingDaysStr,
        assignment_type,
        department || null,
        is_active ? 1 : 0,
        now,
        id
      ]
    });

    // If assignment type changed from selected, clean up old manual assignments
    if (assignment_type !== 'selected') {
      await db.execute({
        sql: 'DELETE FROM attendance_session_assignments WHERE session_id = ?',
        args: [id]
      });
    }

    await logAudit(
      req.user.id,
      'UPDATE_ATTENDANCE_SESSION',
      `Updated session "${title}" (ID: ${id}). Window: ${start_time}-${end_time}.`,
      req
    );

    return res.json({ message: 'Attendance session updated successfully.' });
  } catch (error) {
    console.error('Error updating session:', error);
    return res.status(500).json({ error: 'Failed to update attendance session.' });
  }
};

// DELETE /api/admin/attendance-sessions/:id
export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    const checkSession = await db.execute({
      sql: 'SELECT title FROM attendance_sessions WHERE id = ?',
      args: [id]
    });

    if (checkSession.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance session not found.' });
    }

    const title = checkSession.rows[0].title;

    // Delete session (cascade removes assignments)
    await db.execute({
      sql: 'DELETE FROM attendance_sessions WHERE id = ?',
      args: [id]
    });

    // Clean up assignments
    await db.execute({
      sql: 'DELETE FROM attendance_session_assignments WHERE session_id = ?',
      args: [id]
    });

    await logAudit(
      req.user.id,
      'DELETE_ATTENDANCE_SESSION',
      `Deleted attendance session "${title}" (ID: ${id}).`,
      req
    );

    return res.json({ message: `Attendance session "${title}" deleted successfully.` });
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({ error: 'Failed to delete attendance session.' });
  }
};

// PATCH /api/admin/attendance-sessions/:id/toggle
export const toggleSession = async (req, res) => {
  try {
    const { id } = req.params;

    const checkSession = await db.execute({
      sql: 'SELECT title, is_active FROM attendance_sessions WHERE id = ?',
      args: [id]
    });

    if (checkSession.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance session not found.' });
    }

    const session = checkSession.rows[0];
    const nextStatus = session.is_active === 1 ? 0 : 1;

    await db.execute({
      sql: 'UPDATE attendance_sessions SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [nextStatus, id]
    });

    await logAudit(
      req.user.id,
      'TOGGLE_ATTENDANCE_SESSION',
      `Toggled status of session "${session.title}" to ${nextStatus ? 'Active' : 'Inactive'}.`,
      req
    );

    return res.json({
      message: `Session "${session.title}" has been ${nextStatus ? 'activated' : 'deactivated'} successfully.`,
      is_active: nextStatus
    });
  } catch (error) {
    console.error('Error toggling session:', error);
    return res.status(500).json({ error: 'Failed to toggle session status.' });
  }
};

// POST /api/admin/attendance-sessions/:id/assign
export const assignSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_ids } = req.body; // Array of employee user IDs

    if (!Array.isArray(user_ids)) {
      return res.status(400).json({ error: 'user_ids must be a valid array.' });
    }

    const checkSession = await db.execute({
      sql: 'SELECT title FROM attendance_sessions WHERE id = ?',
      args: [id]
    });

    if (checkSession.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance session not found.' });
    }

    // 1. Clear existing assignments
    await db.execute({
      sql: 'DELETE FROM attendance_session_assignments WHERE session_id = ?',
      args: [id]
    });

    // 2. Insert new assignments
    if (user_ids.length > 0) {
      for (const uid of user_ids) {
        await db.execute({
          sql: 'INSERT OR IGNORE INTO attendance_session_assignments (session_id, user_id) VALUES (?, ?)',
          args: [id, uid]
        });
      }
    }

    await logAudit(
      req.user.id,
      'ASSIGN_ATTENDANCE_SESSION',
      `Assigned session "${checkSession.rows[0].title}" (ID: ${id}) to ${user_ids.length} employees.`,
      req
    );

    return res.json({ message: 'Employees successfully assigned to the session.' });
  } catch (error) {
    console.error('Error assigning employees to session:', error);
    return res.status(500).json({ error: 'Failed to assign employees.' });
  }
};

// GET /api/admin/attendance-sessions/:id/assignments
export const getSessionAssignments = async (req, res) => {
  try {
    const { id } = req.params;

    const checkSession = await db.execute({
      sql: 'SELECT title FROM attendance_sessions WHERE id = ?',
      args: [id]
    });

    if (checkSession.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance session not found.' });
    }

    const result = await db.execute({
      sql: `
        SELECT u.id, u.name, u.email, u.department, u.employee_id
        FROM attendance_session_assignments a
        JOIN users u ON a.user_id = u.id
        WHERE a.session_id = ? AND u.role = 'employee' AND u.status = 'active'
        ORDER BY u.name ASC
      `,
      args: [id]
    });

    return res.json({ assignments: result.rows });
  } catch (error) {
    console.error('Error getting session assignments:', error);
    return res.status(500).json({ error: 'Failed to retrieve session assignments.' });
  }
};

// GET /api/employee/attendance-sessions/today
export const getTodaySessionsEmployee = async (req, res) => {
  try {
    const userId = req.user.id;
    const userDept = req.user.department;

    // Fetch all active sessions
    const activeSessionsResult = await db.execute("SELECT * FROM attendance_sessions WHERE is_active = 1");
    const activeSessions = activeSessionsResult.rows;

    // Check if employee has reference photo enrolled
    const faceCheck = await db.execute({
      sql: 'SELECT id FROM employee_photos WHERE user_id = ?',
      args: [userId]
    });
    const faceEnrolled = faceCheck.rows.length > 0;

    const todaySessions = [];

    for (const session of activeSessions) {
      // 1. Check assignment
      let isAssigned = false;
      if (session.assignment_type === 'all') {
        isAssigned = true;
      } else if (session.assignment_type === 'department') {
        isAssigned = userDept && session.department && userDept.toLowerCase().trim() === session.department.toLowerCase().trim();
      } else if (session.assignment_type === 'selected') {
        const assignmentCheck = await db.execute({
          sql: 'SELECT id FROM attendance_session_assignments WHERE session_id = ? AND user_id = ?',
          args: [session.id, userId]
        });
        isAssigned = assignmentCheck.rows.length > 0;
      }

      if (!isAssigned) continue;

      // Get local time details in the session's configured timezone
      const localTime = getLocalTimeDetails(session.timezone);
      const { dateStr, timeStr, hour, minute, dayName } = localTime;

      // 2. Check if today's weekday is in working days
      const days = session.working_days ? session.working_days.split(',') : [];
      if (!days.includes(dayName)) continue;

      // 3. Determine check-in status from DB
      const recordResult = await db.execute({
        sql: `SELECT status, check_in_time, remarks, face_match_score
              FROM attendance_records
              WHERE user_id = ? AND date = ? AND session_id = ?`,
        args: [userId, dateStr, session.id]
      });

      const hasRecord = recordResult.rows.length > 0;
      const record = hasRecord ? recordResult.rows[0] : null;

      let status = 'not_started';
      let checkInDetails = null;

      if (hasRecord) {
        if (record.status === 'Absent') {
          status = 'missed';
        } else {
          status = 'marked';
          checkInDetails = {
            time: record.check_in_time,
            status: record.status,
            remarks: record.remarks,
            matchScore: record.face_match_score
          };
        }
      } else {
        // Compute dynamically based on current time bounds
        const currentMins = hour * 60 + minute;
        const startMins = parseTimeToMins(session.start_time);
        const endMins = parseTimeToMins(session.end_time);

        if (currentMins < startMins) {
          status = 'not_started';
        } else if (currentMins >= startMins && currentMins <= endMins) {
          status = 'open';
        } else {
          status = 'missed';
        }
      }

      todaySessions.push({
        id: session.id,
        title: session.title,
        session_type: session.session_type,
        start_time: session.start_time,
        end_time: session.end_time,
        grace_period_minutes: session.grace_period_minutes,
        timezone: session.timezone,
        status,
        check_in: checkInDetails
      });
    }

    return res.json({ sessions: todaySessions, faceEnrolled });
  } catch (error) {
    console.error('Error fetching today sessions for employee:', error);
    return res.status(500).json({ error: 'Failed to retrieve today\'s attendance sessions.' });
  }
};
