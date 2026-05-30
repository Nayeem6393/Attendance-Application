import db from '../config/db.js';
import logAudit from '../utils/audit.js';

// GET /api/employees (Admin only)
export const getEmployees = async (req, res) => {
  try {
    const { department, status, search } = req.query;

    let query = `
      SELECT u.id, u.name, u.email, u.mobile, u.department, u.designation, u.employee_id, u.status, u.created_at,
             (CASE WHEN ft.id IS NOT NULL THEN 'enrolled' ELSE 'not_enrolled' END) as face_status
      FROM users u
      LEFT JOIN face_templates ft ON u.id = ft.user_id
      WHERE u.role = 'employee'
    `;
    const args = [];

    if (department) {
      query += ' AND u.department = ?';
      args.push(department);
    }

    if (status) {
      query += ' AND u.status = ?';
      args.push(status);
    }

    if (search) {
      query += ' AND (u.name LIKE ? OR u.employee_id LIKE ? OR u.email LIKE ?)';
      args.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY u.created_at DESC';

    const result = await db.execute({ sql: query, args });
    return res.json({ employees: result.rows });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ error: 'Failed to fetch employee list.' });
  }
};

// GET /api/employees/:id (Admin or Owner)
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    // Security: Only allow admin or the owner employee to access this
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied. You can only view your own details.' });
    }

    const result = await db.execute({
      sql: `
        SELECT u.id, u.name, u.email, u.mobile, u.department, u.designation, u.employee_id, u.status, u.created_at,
               (CASE WHEN ft.id IS NOT NULL THEN 'enrolled' ELSE 'not_enrolled' END) as face_status
        FROM users u
        LEFT JOIN face_templates ft ON u.id = ft.user_id
        WHERE u.id = ?
      `,
      args: [id]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    return res.json({ employee: result.rows[0] });
  } catch (error) {
    console.error('Error fetching employee by ID:', error);
    return res.status(500).json({ error: 'Failed to retrieve employee profile.' });
  }
};

// PUT /api/employees/:id (Admin or Owner)
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, department, designation } = req.body;

    // Security check
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied. You can only update your own details.' });
    }

    const checkUser = await db.execute({
      sql: 'SELECT id, name FROM users WHERE id = ?',
      args: [id]
    });

    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = checkUser.rows[0];
    const now = new Date().toISOString();

    // Admins can update department/designation. Employees can update name/mobile.
    if (req.user.role === 'admin') {
      await db.execute({
        sql: `
          UPDATE users 
          SET name = ?, mobile = ?, department = ?, designation = ?, updated_at = ?
          WHERE id = ?
        `,
        args: [name || user.name, mobile || user.mobile, department, designation, now, id]
      });
    } else {
      await db.execute({
        sql: `
          UPDATE users 
          SET name = ?, mobile = ?, updated_at = ?
          WHERE id = ?
        `,
        args: [name || user.name, mobile || user.mobile, now, id]
      });
    }

    await logAudit(req.user.id, 'UPDATE_EMPLOYEE', `Updated details for user ${user.name} (ID: ${id}).`, req);

    return res.json({ message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Error updating employee:', error);
    return res.status(500).json({ error: 'Failed to update employee details.' });
  }
};

// DELETE /api/employees/:id (Admin only)
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Admin cannot delete their own account.' });
    }

    const checkUser = await db.execute({
      sql: 'SELECT id, name, employee_id FROM users WHERE id = ?',
      args: [id]
    });

    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const employee = checkUser.rows[0];

    // Delete user from DB (foreign key relations face_templates and attendance_records CASCADE automatically)
    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [id]
    });

    await logAudit(req.user.id, 'DELETE_EMPLOYEE', `Deleted employee account: ${employee.name} (ID: ${employee.employee_id}).`, req);

    return res.json({ message: `Employee "${employee.name}" deleted successfully.` });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return res.status(500).json({ error: 'Failed to delete employee.' });
  }
};

// PUT /api/employees/:id/approve (Admin only)
export const approveEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const checkUser = await db.execute({
      sql: 'SELECT name, employee_id, status FROM users WHERE id = ?',
      args: [id]
    });

    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const employee = checkUser.rows[0];
    if (employee.status === 'active') {
      return res.status(400).json({ error: 'Employee is already active.' });
    }

    const now = new Date().toISOString();
    await db.execute({
      sql: "UPDATE users SET status = 'active', updated_at = ? WHERE id = ?",
      args: [now, id]
    });

    await logAudit(req.user.id, 'APPROVE_EMPLOYEE', `Approved employee account: ${employee.name} (ID: ${employee.employee_id}).`, req);

    return res.json({ message: `Employee "${employee.name}" approved successfully. Account is now active.` });
  } catch (error) {
    console.error('Error approving employee:', error);
    return res.status(500).json({ error: 'Failed to approve employee.' });
  }
};

// PUT /api/employees/:id/reject (Admin only)
export const rejectEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const checkUser = await db.execute({
      sql: 'SELECT name, employee_id, status FROM users WHERE id = ?',
      args: [id]
    });

    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const employee = checkUser.rows[0];
    if (employee.status === 'rejected') {
      return res.status(400).json({ error: 'Employee is already rejected.' });
    }

    const now = new Date().toISOString();
    await db.execute({
      sql: "UPDATE users SET status = 'rejected', updated_at = ? WHERE id = ?",
      args: [now, id]
    });

    await logAudit(req.user.id, 'REJECT_EMPLOYEE', `Rejected employee account: ${employee.name} (ID: ${employee.employee_id}).`, req);

    return res.json({ message: `Employee "${employee.name}" has been rejected.` });
  } catch (error) {
    console.error('Error rejecting employee:', error);
    return res.status(500).json({ error: 'Failed to reject employee.' });
  }
};
