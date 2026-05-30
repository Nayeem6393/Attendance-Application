import db from '../config/db.js';
import { getLocalTimeDetails } from './attendance.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// Helper to escape CSV fields
const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  return str;
};

// Helper to get number of days in a YYYY-MM month
const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

// Helper to find the second Saturday in a given year and month (1-indexed month)
const getSecondSaturday = (year, month) => {
  let saturdaysCount = 0;
  for (let day = 1; day <= 31; day++) {
    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getMonth() !== month - 1) break; // Exceeded the month
    if (dateObj.getDay() === 6) { // 6 = Saturday
      saturdaysCount++;
      if (saturdaysCount === 2) {
        return day;
      }
    }
  }
  return null;
};

// Helper to calculate required sessions in a YYYY-MM month for an employee
const calculateRequiredSessions = async (userId, userDept, monthString) => {
  try {
    const [year, month] = monthString.split('-').map(Number);
    const totalDays = getDaysInMonth(year, month);

    // Fetch all active sessions
    const sessionsResult = await db.execute("SELECT * FROM attendance_sessions WHERE is_active = 1");
    const activeSessions = sessionsResult.rows;

    // Fetch employee's selected session assignments
    const assignmentsResult = await db.execute({
      sql: 'SELECT session_id FROM attendance_session_assignments WHERE user_id = ?',
      args: [userId]
    });
    const assignedSessionIds = new Set(assignmentsResult.rows.map(r => r.session_id));

    let requiredCount = 0;

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day);
      // Get weekday name (e.g. 'Monday')
      const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
      const dayName = formatter.format(date);

      for (const session of activeSessions) {
        // Check assignment
        let isAssigned = false;
        if (session.assignment_type === 'all') {
          isAssigned = true;
        } else if (session.assignment_type === 'department') {
          isAssigned = userDept && session.department && userDept.toLowerCase().trim() === session.department.toLowerCase().trim();
        } else if (session.assignment_type === 'selected') {
          isAssigned = assignedSessionIds.has(session.id);
        }

        if (!isAssigned) continue;

        // Check if today is a working day for session
        const workingDays = session.working_days ? session.working_days.split(',') : [];
        if (workingDays.includes(dayName)) {
          requiredCount++;
        }
      }
    }

    return requiredCount;
  } catch (error) {
    console.error('Error calculating required sessions:', error);
    return 26 * 2; // Return sensible default if computation errors
  }
};

// ==========================================
// DAILY ATTENDANCE EXPORTS
// ==========================================

export const exportDailyReport = async (req, res) => {
  try {
    const { date, format } = req.query;
    
    let targetDate = date;
    if (!targetDate) {
      const settingsResult = await db.execute({
        sql: "SELECT timezone FROM attendance_settings WHERE id = 'singleton'",
        args: []
      });
      const timezone = settingsResult.rows.length > 0 ? settingsResult.rows[0].timezone : 'Asia/Kolkata';
      targetDate = getLocalTimeDetails(timezone).dateStr;
    }

    // Get Daily records cross-joined with assigned sessions
    const result = await db.execute({
      sql: `
        SELECT u.employee_id, u.name, u.department, u.designation,
               COALESCE(ar.status, 'Absent') as attendance_status,
               ar.check_in_time, ar.latitude, ar.longitude, ar.remarks, ar.face_match_score,
               s.title as session_title, s.session_type
        FROM users u
        CROSS JOIN attendance_sessions s
        LEFT JOIN attendance_records ar ON u.id = ar.user_id AND ar.date = ? AND ar.session_id = s.id
        WHERE u.role = 'employee' AND u.status = 'active' AND s.is_active = 1
          AND (
            s.assignment_type = 'all'
            OR (s.assignment_type = 'department' AND u.department IS NOT NULL AND s.department IS NOT NULL AND LOWER(u.department) = LOWER(s.department))
            OR (s.assignment_type = 'selected' AND EXISTS (
              SELECT 1 FROM attendance_session_assignments asa 
              WHERE asa.session_id = s.id AND asa.user_id = u.id
            ))
          )
        ORDER BY u.name ASC, s.start_time ASC
      `,
      args: [targetDate]
    });

    const records = result.rows;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="daily_attendance_${targetDate}.csv"`);
      
      let csvContent = 'Date,Employee ID,Name,Department,Session Name,Session Type,Status,Check-in Time,Face Match Score,Location (Lat/Lng),Remarks\n';
      
      records.forEach(r => {
        const checkIn = r.check_in_time || 'N/A';
        const faceMatch = r.face_match_score !== null && r.face_match_score !== undefined ? `${r.face_match_score}%` : 'N/A';
        const location = r.latitude ? `${r.latitude}/${r.longitude}` : 'N/A';
        const remark = r.remarks || (r.attendance_status === 'Absent' ? 'Not marked within attendance window' : 'N/A');
        
        csvContent += [
          targetDate,
          r.employee_id,
          r.name,
          r.department,
          r.session_title,
          r.session_type,
          r.attendance_status,
          checkIn,
          faceMatch,
          location,
          remark
        ].map(escapeCSV).join(',') + '\n';
      });

      return res.send(csvContent);
    } 
    
    else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Daily Attendance');

      worksheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Employee ID', key: 'employeeId', width: 15 },
        { header: 'Name', key: 'name', width: 22 },
        { header: 'Department', key: 'department', width: 18 },
        { header: 'Session Name', key: 'sessionTitle', width: 22 },
        { header: 'Session Type', key: 'sessionType', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Check-in Time', key: 'checkIn', width: 15 },
        { header: 'Face Match Score', key: 'faceMatch', width: 18 },
        { header: 'Location (Lat/Lng)', key: 'location', width: 25 },
        { header: 'Remarks', key: 'remarks', width: 35 }
      ];

      // Format Header Row
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4F46E5' } // Indigo color
      };

      records.forEach(r => {
        worksheet.addRow({
          date: targetDate,
          employeeId: r.employee_id,
          name: r.name,
          department: r.department,
          sessionTitle: r.session_title,
          sessionType: r.session_type,
          status: r.attendance_status,
          checkIn: r.check_in_time || 'N/A',
          faceMatch: r.face_match_score !== null && r.face_match_score !== undefined ? `${r.face_match_score.toFixed(0)}%` : 'N/A',
          location: r.latitude ? `${r.latitude}, ${r.longitude}` : 'N/A',
          remarks: r.remarks || (r.attendance_status === 'Absent' ? 'Not marked within attendance window' : 'N/A')
        });
      });

      // Conditional color codes for status cells
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const statusCell = row.getCell(7);
          if (statusCell.value === 'Present') {
            statusCell.font = { color: { argb: '16A34A' }, bold: true }; // Green
          } else if (statusCell.value === 'Late') {
            statusCell.font = { color: { argb: 'EA580C' }, bold: true }; // Orange
          } else {
            statusCell.font = { color: { argb: 'DC2626' }, bold: true }; // Red
          }
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="daily_attendance_${targetDate}.xlsx"`);
      
      await workbook.xlsx.write(res);
      return res.end();
    } 
    
    else if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="daily_attendance_${targetDate}.pdf"`);
      
      doc.pipe(res);

      // Title header
      doc.rect(20, 20, doc.page.width - 40, 50).fill('#4F46E5');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16).text('Daily Session Attendance Report', 35, 30);
      doc.font('Helvetica').fontSize(10).text(`Date: ${targetDate}  |  Generated on: ${new Date().toLocaleDateString()}`, 35, 52);

      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(11).text('Attendance Table Summary', 20, 85);

      // Table Headers
      const startX = 20;
      let startY = 105;
      const colWidths = [50, 95, 75, 95, 60, 45, 55, 60, 85, 135];
      const headers = ['Emp ID', 'Employee Name', 'Department', 'Session', 'Type', 'Status', 'Check-In', 'Face Match', 'Location', 'Remarks'];

      doc.rect(startX, startY, doc.page.width - 40, 20).fill('#E2E8F0');
      doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8.5);

      let curX = startX;
      headers.forEach((h, idx) => {
        doc.text(h, curX + 3, startY + 6, { width: colWidths[idx] - 6, align: 'left' });
        curX += colWidths[idx];
      });

      startY += 20;

      // Table Rows
      records.forEach((r, idx) => {
        // Handle pagination overflow
        if (startY > doc.page.height - 40) {
          doc.addPage({ margin: 20, size: 'A4', layout: 'landscape' });
          startY = 30;
          doc.rect(startX, startY, doc.page.width - 40, 20).fill('#E2E8F0');
          doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8.5);
          let tempX = startX;
          headers.forEach((h, i) => {
            doc.text(h, tempX + 3, startY + 6, { width: colWidths[i] - 6, align: 'left' });
            tempX += colWidths[i];
          });
          startY += 20;
        }

        // Row background
        if (idx % 2 === 0) {
          doc.rect(startX, startY, doc.page.width - 40, 20).fill('#F8FAFC');
        }

        doc.fillColor('#475569').font('Helvetica').fontSize(7.5);
        
        let tx = startX;
        doc.text(r.employee_id, tx + 3, startY + 6, { width: colWidths[0] - 6, lineBreak: false });
        tx += colWidths[0];
        doc.text(r.name, tx + 3, startY + 6, { width: colWidths[1] - 6, lineBreak: false });
        tx += colWidths[1];
        doc.text(r.department || 'N/A', tx + 3, startY + 6, { width: colWidths[2] - 6, lineBreak: false });
        tx += colWidths[2];
        doc.text(r.session_title, tx + 3, startY + 6, { width: colWidths[3] - 6, lineBreak: false });
        tx += colWidths[3];
        doc.text(r.session_type, tx + 3, startY + 6, { width: colWidths[4] - 6, lineBreak: false });
        tx += colWidths[4];

        // Format status color in PDF
        const status = r.attendance_status;
        if (status === 'Present') {
          doc.fillColor('#16A34A').font('Helvetica-Bold');
        } else if (status === 'Late') {
          doc.fillColor('#EA580C').font('Helvetica-Bold');
        } else {
          doc.fillColor('#DC2626').font('Helvetica-Bold');
        }
        doc.text(status, tx + 3, startY + 6, { width: colWidths[5] - 6, lineBreak: false });
        
        doc.fillColor('#475569').font('Helvetica');
        tx += colWidths[5];
        doc.text(r.check_in_time || 'N/A', tx + 3, startY + 6, { width: colWidths[6] - 6, lineBreak: false });
        tx += colWidths[6];
        doc.text(r.face_match_score !== null && r.face_match_score !== undefined ? `${r.face_match_score.toFixed(0)}%` : 'N/A', tx + 3, startY + 6, { width: colWidths[7] - 6, lineBreak: false });
        tx += colWidths[7];
        doc.text(r.latitude ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}` : 'N/A', tx + 3, startY + 6, { width: colWidths[8] - 6, lineBreak: false });
        tx += colWidths[8];
        doc.text(r.remarks || (status === 'Absent' ? 'Not marked within attendance window' : 'N/A'), tx + 3, startY + 6, { width: colWidths[9] - 6, lineBreak: false });

        startY += 20;
      });

      doc.end();
      return;
    }

    return res.status(400).json({ error: 'Unsupported format request.' });
  } catch (error) {
    console.error('Daily report export error:', error);
    return res.status(500).json({ error: 'Export failed.' });
  }
};

// ==========================================
// MONTHLY ATTENDANCE EXPORTS
// ==========================================

export const exportMonthlyReport = async (req, res) => {
  try {
    const { month, format } = req.query; // YYYY-MM

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Valid month parameter (YYYY-MM) is required.' });
    }

    const [year, monthNum] = month.split('-').map(Number);
    const totalDays = getDaysInMonth(year, monthNum);
    const secondSaturdayDate = getSecondSaturday(year, monthNum);

    // 1. Query active employees
    const employeesResult = await db.execute({
      sql: "SELECT id, name, employee_id, department, designation FROM users WHERE role = 'employee' AND status = 'active' ORDER BY name ASC",
      args: []
    });
    const employees = employeesResult.rows;

    // 2. Fetch all active sessions
    const sessionsResult = await db.execute("SELECT * FROM attendance_sessions WHERE is_active = 1");
    const activeSessions = sessionsResult.rows;

    const summaryRecords = [];
    const detailedRecords = []; // Stores detailed rows for ALL employees to dump in Excel Detailed / CSV

    for (const emp of employees) {
      // Fetch employee's selected session assignments
      const assignmentsResult = await db.execute({
        sql: 'SELECT session_id FROM attendance_session_assignments WHERE user_id = ?',
        args: [emp.id]
      });
      const assignedSessionIds = new Set(assignmentsResult.rows.map(r => r.session_id));

      // Fetch all attendance records for this user in YYYY-MM
      const recordsResult = await db.execute({
        sql: 'SELECT * FROM attendance_records WHERE user_id = ? AND date LIKE ?',
        args: [emp.id, `${month}-%`]
      });
      const userRecordsMap = {}; // Key: "YYYY-MM-DD:session_id"
      recordsResult.rows.forEach(r => {
        userRecordsMap[`${r.date}:${r.session_id}`] = r;
      });

      let workingSessionDays = 0;
      let holidaySessionDays = 0;
      let actualPresentSessions = 0;
      let lateSessions = 0;
      let absentSessions = 0;
      let holidayPresentSessions = 0;

      for (let day = 1; day <= totalDays; day++) {
        const dateObj = new Date(year, monthNum - 1, day);
        const dateStr = `${month}-${String(day).padStart(2, '0')}`;
        const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
        const dayName = formatter.format(dateObj);

        // Check if it's Sunday or Second Saturday
        const isSunday = dayName === 'Sunday';
        const isSecondSaturday = dayName === 'Saturday' && day === secondSaturdayDate;
        const isHoliday = isSunday || isSecondSaturday;
        const holidayRemarks = isSunday ? 'Sunday Holiday' : (isSecondSaturday ? 'Second Saturday Holiday' : null);

        for (const session of activeSessions) {
          // Check if session is assigned to employee
          let isAssigned = false;
          if (session.assignment_type === 'all') {
            isAssigned = true;
          } else if (session.assignment_type === 'department') {
            isAssigned = emp.department && session.department && emp.department.toLowerCase().trim() === session.department.toLowerCase().trim();
          } else if (session.assignment_type === 'selected') {
            isAssigned = assignedSessionIds.has(session.id);
          }

          if (!isAssigned) continue;

          if (isHoliday) {
            holidaySessionDays++;
            holidayPresentSessions++;

            detailedRecords.push({
              employeeId: emp.employee_id,
              name: emp.name,
              department: emp.department || 'N/A',
              date: dateStr,
              day: dayName,
              sessionTitle: session.title,
              status: 'Present',
              attendanceType: 'Holiday',
              checkIn: 'Holiday',
              faceMatch: 'Not Required',
              location: 'Not Required',
              remarks: holidayRemarks
            });
          } else {
            // Regular working day
            const workingDays = session.working_days ? session.working_days.split(',') : [];
            if (workingDays.includes(dayName)) {
              workingSessionDays++;

              // Look up attendance record
              const record = userRecordsMap[`${dateStr}:${session.id}`];
              if (record) {
                if (record.status === 'Present') {
                  actualPresentSessions++;
                } else if (record.status === 'Late') {
                  lateSessions++;
                } else {
                  absentSessions++;
                }

                detailedRecords.push({
                  employeeId: emp.employee_id,
                  name: emp.name,
                  department: emp.department || 'N/A',
                  date: dateStr,
                  day: dayName,
                  sessionTitle: session.title,
                  status: record.status,
                  attendanceType: 'Regular',
                  checkIn: record.check_in_time || 'N/A',
                  faceMatch: record.face_match_score !== null && record.face_match_score !== undefined ? `${record.face_match_score.toFixed(0)}%` : 'N/A',
                  location: record.latitude ? `${record.latitude}, ${record.longitude}` : 'N/A',
                  remarks: record.remarks || 'N/A'
                });
              } else {
                absentSessions++;
                detailedRecords.push({
                  employeeId: emp.employee_id,
                  name: emp.name,
                  department: emp.department || 'N/A',
                  date: dateStr,
                  day: dayName,
                  sessionTitle: session.title,
                  status: 'Absent',
                  attendanceType: 'Regular',
                  checkIn: 'N/A',
                  faceMatch: 'N/A',
                  location: 'N/A',
                  remarks: 'Not marked within attendance window'
                });
              }
            }
          }
        }
      }

      const total_required_sessions = workingSessionDays + holidaySessionDays;
      const present_sessions = actualPresentSessions + lateSessions + holidayPresentSessions;
      const rate = total_required_sessions > 0 ? parseFloat(((present_sessions / total_required_sessions) * 100).toFixed(1)) : 0.0;

      summaryRecords.push({
        employee_id: emp.employee_id,
        name: emp.name,
        department: emp.department || 'N/A',
        designation: emp.designation || 'N/A',
        total_required_sessions,
        present_sessions,
        late_sessions: lateSessions,
        absent_sessions: absentSessions,
        holiday_present_sessions: holidayPresentSessions,
        attendance_percentage: rate
      });
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="monthly_detailed_${month}.csv"`);

      let csvContent = 'Employee ID,Employee Name,Department,Date,Day,Session Name,Status,Attendance Type,Check-in Time,Face Match Score,Location,Remarks\n';

      detailedRecords.forEach(r => {
        csvContent += [
          r.employeeId,
          r.name,
          r.department,
          r.date,
          r.day,
          r.sessionTitle,
          r.status,
          r.attendanceType,
          r.checkIn,
          r.faceMatch,
          r.location,
          r.remarks
        ].map(escapeCSV).join(',') + '\n';
      });

      return res.send(csvContent);
    } 
    
    else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      
      // Sheet 1: Summary Sheet
      const worksheetSummary = workbook.addWorksheet('Monthly Summary');
      worksheetSummary.columns = [
        { header: 'Month', key: 'month', width: 12 },
        { header: 'Employee ID', key: 'employeeId', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Designation', key: 'designation', width: 20 },
        { header: 'Total Required Sessions', key: 'required', width: 22 },
        { header: 'Present Sessions (incl. Holidays)', key: 'present', width: 25 },
        { header: 'Late Sessions', key: 'late', width: 18 },
        { header: 'Absent Sessions', key: 'absent', width: 18 },
        { header: 'Paid Holiday Sessions', key: 'holidayPresent', width: 22 },
        { header: 'Attendance %', key: 'rate', width: 18 }
      ];

      // Styling summary headers
      worksheetSummary.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      worksheetSummary.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '0E7490' } // Cyan/Teal corporate header
      };

      summaryRecords.forEach(r => {
        worksheetSummary.addRow({
          month,
          employeeId: r.employee_id,
          name: r.name,
          department: r.department,
          designation: r.designation,
          required: r.total_required_sessions,
          present: r.present_sessions,
          late: r.late_sessions,
          absent: r.absent_sessions,
          holidayPresent: r.holiday_present_sessions,
          rate: `${r.attendance_percentage}%`
        });
      });

      // Sheet 2: Detailed Logs Sheet
      const worksheetDetailed = workbook.addWorksheet('Detailed Logs');
      worksheetDetailed.columns = [
        { header: 'Employee ID', key: 'employeeId', width: 15 },
        { header: 'Employee Name', key: 'name', width: 25 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Day', key: 'day', width: 12 },
        { header: 'Session Name', key: 'sessionTitle', width: 22 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Attendance Type', key: 'attendanceType', width: 18 },
        { header: 'Check-in Time', key: 'checkIn', width: 15 },
        { header: 'Face Match Score', key: 'faceMatch', width: 18 },
        { header: 'Location', key: 'location', width: 25 },
        { header: 'Remarks', key: 'remarks', width: 35 }
      ];

      // Styling detailed headers
      worksheetDetailed.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      worksheetDetailed.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4F46E5' } // Indigo color
      };

      detailedRecords.forEach(r => {
        worksheetDetailed.addRow({
          employeeId: r.employeeId,
          name: r.name,
          department: r.department,
          date: r.date,
          day: r.day,
          sessionTitle: r.sessionTitle,
          status: r.status,
          attendanceType: r.attendanceType,
          checkIn: r.checkIn,
          faceMatch: r.faceMatch,
          location: r.location,
          remarks: r.remarks
        });
      });

      // Conditional color codes for status cells inside Detailed worksheet
      worksheetDetailed.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const statusCell = row.getCell(7); // Status column
          if (statusCell.value === 'Present') {
            statusCell.font = { color: { argb: '16A34A' }, bold: true }; // Green
          } else if (statusCell.value === 'Late') {
            statusCell.font = { color: { argb: 'EA580C' }, bold: true }; // Orange
          } else {
            statusCell.font = { color: { argb: 'DC2626' }, bold: true }; // Red
          }
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="monthly_attendance_${month}.xlsx"`);
      
      await workbook.xlsx.write(res);
      return res.end();
    } 
    
    else if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="monthly_attendance_${month}.pdf"`);

      doc.pipe(res);

      // Title
      doc.rect(20, 20, doc.page.width - 40, 50).fill('#0E7490');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16).text('Monthly Attendance Telemetry Summary', 35, 30);
      doc.font('Helvetica').fontSize(10).text(`Billing Period Month: ${month}  |  Generated on: ${new Date().toLocaleDateString()}`, 35, 52);

      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(11).text('Monthly Aggregated Checklist', 20, 85);

      // Headers
      const startX = 20;
      let startY = 105;
      const colWidths = [50, 100, 95, 95, 60, 60, 60, 60, 95];
      const headers = ['Emp ID', 'Employee Name', 'Department', 'Designation', 'Required', 'Present', 'Late', 'Absent', 'Percentage (%)'];

      doc.rect(startX, startY, doc.page.width - 40, 20).fill('#E2E8F0');
      doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8.5);

      let curX = startX;
      headers.forEach((h, idx) => {
        doc.text(h, curX + 3, startY + 6, { width: colWidths[idx] - 6, align: 'left' });
        curX += colWidths[idx];
      });

      startY += 20;

      // Rows
      summaryRecords.forEach((r, idx) => {
        if (startY > doc.page.height - 40) {
          doc.addPage({ margin: 20, size: 'A4', layout: 'landscape' });
          startY = 30;
          doc.rect(startX, startY, doc.page.width - 40, 20).fill('#E2E8F0');
          doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8.5);
          let tempX = startX;
          headers.forEach((h, i) => {
            doc.text(h, tempX + 3, startY + 6, { width: colWidths[i] - 6, align: 'left' });
            tempX += colWidths[i];
          });
          startY += 20;
        }

        if (idx % 2 === 0) {
          doc.rect(startX, startY, doc.page.width - 40, 20).fill('#F8FAFC');
        }

        doc.fillColor('#475569').font('Helvetica').fontSize(7.5);

        let tx = startX;
        doc.text(r.employee_id, tx + 3, startY + 6, { width: colWidths[0] - 6, lineBreak: false });
        tx += colWidths[0];
        doc.text(r.name, tx + 3, startY + 6, { width: colWidths[1] - 6, lineBreak: false });
        tx += colWidths[1];
        doc.text(r.department || 'N/A', tx + 3, startY + 6, { width: colWidths[2] - 6, lineBreak: false });
        tx += colWidths[2];
        doc.text(r.designation || 'N/A', tx + 3, startY + 6, { width: colWidths[3] - 6, lineBreak: false });
        tx += colWidths[3];
        doc.text(String(r.total_required_sessions), tx + 3, startY + 6, { width: colWidths[4] - 6, lineBreak: false });
        tx += colWidths[4];
        doc.text(String(r.present_sessions), tx + 3, startY + 6, { width: colWidths[5] - 6, lineBreak: false });
        tx += colWidths[5];
        doc.text(String(r.late_sessions), tx + 3, startY + 6, { width: colWidths[6] - 6, lineBreak: false });
        tx += colWidths[6];
        doc.text(String(r.absent_sessions), tx + 3, startY + 6, { width: colWidths[7] - 6, lineBreak: false });
        tx += colWidths[7];

        const rate = r.attendance_percentage;
        if (rate >= 85) {
          doc.fillColor('#16A34A').font('Helvetica-Bold');
        } else if (rate >= 60) {
          doc.fillColor('#EA580C').font('Helvetica-Bold');
        } else {
          doc.fillColor('#DC2626').font('Helvetica-Bold');
        }

        doc.text(`${rate}%`, tx + 3, startY + 6, { width: colWidths[8] - 6, lineBreak: false });

        startY += 20;
      });

      doc.end();
      return;
    }

    return res.status(400).json({ error: 'Unsupported format request.' });
  } catch (error) {
    console.error('Monthly summary report export error:', error);
    return res.status(500).json({ error: 'Export failed.' });
  }
};
