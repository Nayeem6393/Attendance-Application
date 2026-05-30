import db from '../config/db.js';
import logAudit from '../utils/audit.js';

// GET /api/admin/settings/attendance
export const getSettings = async (req, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM attendance_settings WHERE id = 'singleton'",
      args: []
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance settings not found.' });
    }

    const settings = result.rows[0];
    
    // Parse working days from stringified JSON
    try {
      settings.working_days = JSON.parse(settings.working_days);
    } catch (e) {
      settings.working_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }

    return res.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ error: 'Failed to retrieve attendance settings.' });
  }
};

// PUT /api/admin/settings/attendance (Admin only)
export const updateSettings = async (req, res) => {
  try {
    const {
      grace_period_minutes,
      timezone,
      auto_absent_enabled
    } = req.body;

    if (grace_period_minutes === undefined || !timezone || auto_absent_enabled === undefined) {
      return res.status(400).json({ error: 'Missing required configuration fields.' });
    }

    const now = new Date().toISOString();
    const updater = req.user.name;

    await db.execute({
      sql: `
        UPDATE attendance_settings
        SET grace_period_minutes = ?, timezone = ?, auto_absent_enabled = ?, updated_by = ?, updated_at = ?
        WHERE id = 'singleton'
      `,
      args: [
        parseInt(grace_period_minutes, 10),
        timezone,
        auto_absent_enabled ? 1 : 0,
        updater,
        now
      ]
    });

    await logAudit(
      req.user.id,
      'UPDATE_SETTINGS',
      `Updated global defaults settings: Grace: ${grace_period_minutes}m, Timezone: ${timezone}, Auto-Absent: ${auto_absent_enabled}.`,
      req
    );

    return res.json({ message: 'Global system defaults updated successfully.' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ error: 'Failed to update global system defaults.' });
  }
};
