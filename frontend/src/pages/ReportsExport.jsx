import React, { useState } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { FileSpreadsheet, Download, Calendar, CalendarDays, AlertCircle } from 'lucide-react';

export const ReportsExport = () => {
  const { showToast } = useAuth();
  
  // Daily parameters
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10));
  const [exportingDaily, setExportingDaily] = useState(false);

  // Monthly parameters
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [exportingMonthly, setExportingMonthly] = useState(false);

  const handleDownload = async (path, filename) => {
    try {
      const isDaily = path.includes('/daily');
      if (isDaily) setExportingDaily(true);
      else setExportingMonthly(true);

      const blob = await api.download(path);
      
      // Create a temporary link to download the file blob
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(`Exported "${filename}" successfully!`);
    } catch (e) {
      console.error('Blob export error:', e);
      showToast(e.message || 'Report download failed.', 'error');
    } finally {
      setExportingDaily(false);
      setExportingMonthly(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} id="reports-grid">
        
        {/* DAILY REPORT PANEL */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
            <Calendar size={22} color="var(--primary)" />
            <h3 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Daily Attendance Report</h3>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
            Export attendance check-in details for a specific day. Includes checkout details, GPS coordinates, device info, and admin override comments.
          </p>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Select Report Date</label>
            <input
              type="date"
              className="form-control"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
              disabled={exportingDaily}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => handleDownload(`/admin/reports/daily?date=${dailyDate}&format=csv`, `daily_attendance_${dailyDate}.csv`)}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between' }}
              disabled={exportingDaily}
            >
              <span>Export Daily CSV</span>
              <Download size={16} />
            </button>

            <button
              onClick={() => handleDownload(`/admin/reports/daily?date=${dailyDate}&format=excel`, `daily_attendance_${dailyDate}.xlsx`)}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', borderColor: 'rgba(16,185,129,0.3)' }}
              disabled={exportingDaily}
            >
              <span style={{ color: 'var(--status-present)' }}>Export Daily Excel</span>
              <FileSpreadsheet size={16} color="var(--status-present)" />
            </button>

            <button
              onClick={() => handleDownload(`/admin/reports/daily?date=${dailyDate}&format=pdf`, `daily_attendance_${dailyDate}.pdf`)}
              className="btn btn-primary"
              style={{ justifyContent: 'space-between' }}
              disabled={exportingDaily}
            >
              <span>Export Daily PDF</span>
              <Download size={16} />
            </button>
          </div>
        </div>

        {/* MONTHLY SUMMARY PANEL */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
            <CalendarDays size={22} color="var(--primary)" />
            <h3 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Monthly Telemetry Report</h3>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
            Export aggregated monthly check-in metrics for all active employees. Calculates total present days, late check-ins, absentees, and overall percentage rates.
          </p>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Select Summary Billing Month</label>
            <input
              type="month"
              className="form-control"
              value={monthlyMonth}
              onChange={(e) => setMonthlyMonth(e.target.value)}
              disabled={exportingMonthly}
            />
          </div>

          {/* Paid Holidays Guidelines Note Banner */}
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '20px'
            }}
          >
            <AlertCircle size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              Sundays and Second Saturdays are counted as Present Holidays in monthly reports.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => handleDownload(`/admin/reports/monthly?month=${monthlyMonth}&format=csv`, `monthly_attendance_${monthlyMonth}.csv`)}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between' }}
              disabled={exportingMonthly}
            >
              <span>Export Monthly CSV</span>
              <Download size={16} />
            </button>

            <button
              onClick={() => handleDownload(`/admin/reports/monthly?month=${monthlyMonth}&format=excel`, `monthly_attendance_${monthlyMonth}.xlsx`)}
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', borderColor: 'rgba(16,185,129,0.3)' }}
              disabled={exportingMonthly}
            >
              <span style={{ color: 'var(--status-present)' }}>Export Monthly Excel</span>
              <FileSpreadsheet size={16} color="var(--status-present)" />
            </button>

            <button
              onClick={() => handleDownload(`/admin/reports/monthly?month=${monthlyMonth}&format=pdf`, `monthly_attendance_${monthlyMonth}.pdf`)}
              className="btn btn-primary"
              style={{ justifyContent: 'space-between' }}
              disabled={exportingMonthly}
            >
              <span>Export Monthly PDF</span>
              <Download size={16} />
            </button>
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 768px) {
          #reports-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ReportsExport;
