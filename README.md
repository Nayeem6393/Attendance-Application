# 🛡️ Employee Attendance Monitoring Dashboard System

A premium, full-stack, enterprise-grade **Employee Attendance Monitoring Web Application** featuring dual-factor authentication (Interactive Facial Biometrics + GPS Geolocation), real-time rule-based time window gating (grace periods, late markings), background auto-absence flagging, and advanced administrative reports exports (CSV, styled Excel spread-sheets, and formatted PDF summaries).

---

## 🚀 Key Architectural Highlights

1. **Dual-Factor Security Check-In**:
   - **GPS Geolocation Gating**: Captures latitude, longitude, and accuracy radius directly from the browser's Geolocation API, verifying structural location integrity at check-in.
   - **Interactive Liveness Face ID**: Captures visual canvas biometric coordinates in a high-tech glowing scanning oval. Guides the employee through a 4-step liveness routine (*Look Straight, Turn Left, Turn Right, and Blink Eyes*) to prevent photo/video spoofing.
   - **Euclidean Vector Comparisons**: Translates facial geometry landmarks into a secure 128-dimensional vector, storing the template securely on Turso. Calculates Euclidean distance (`distance <= 0.15`) on the backend to authorize check-ins.
2. **Dynamic Gating Time Window**:
   - Time window boundaries are dynamically calculated using the server's native `Intl.DateTimeFormat` for the configured timezone (e.g. `'Asia/Kolkata'`), keeping it platform-independent.
   - Automatically differentiates between **Present** (checked in during the grace window) and **Late** statuses.
3. **Background Auto-Absence Engine**:
   - A background process ticks every 60 seconds. On working days, if the end-time window passes, the engine automatically checks all active employees and generates **Absent** records with the remark `"Not marked within attendance time"` for anyone who failed to check in.
   - Features a manual administrative simulation trigger to execute the job instantly for verification.
4. **Rich Multi-Format Exports**:
   - **CSV**: Lightweight, raw string-escaped CSV spreadsheets.
   - **Excel**: Highly polished workbooks utilizing `exceljs` with colored headers and status font coding (emerald for Present, orange for Late, red for Absent).
   - **PDF**: Fully rendered vector PDF reports built using `pdfkit` featuring clean corporate grid alignments, headers, and status badges.

---

## 🛠️ Technology Stack

- **Frontend**: React.js (Vite, React Router, Lucide Icons, Recharts)
- **Backend**: Node.js + Express.js (JWT authentication, bcryptjs, pdfkit, exceljs)
- **Database**: Turso (using `@libsql/client` cloud-hosted SQLite)
- **Authentication**: Stateless JSON Web Tokens (JWT) with Role-Based Access Control (RBAC)

---

## 📂 Project Structure

```
c:/Attendance/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js            # Turso connection
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT & Role validation rules
│   │   │   └── error.js         # Express global error catcher
│   │   ├── controllers/
│   │   │   ├── auth.js          # Shared login, employee registration
│   │   │   ├── face.js          # Face enrollment & vector matching
│   │   │   ├── employee.js      # Admin approvals and employee database
│   │   │   ├── attendance.js    # check-ins, history, and telemetry aggregates
│   │   │   ├── settings.js      # Gating window rules settings
│   │   │   └── reports.js       # CSV, Excel, and PDF report exporters
│   │   ├── routes/              # Express API routers mapping
│   │   ├── scheduler/
│   │   │   └── autoAbsent.js    # Background ticking absence scheduler
│   │   ├── utils/
│   │   │   ├── audit.js         # Audit logging helper
│   │   │   └── helpers.js
│   │   ├── index.js             # Main server entry
│   │   └── seed.js              # Database initialization & Admin seed
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Layout.jsx       # Side navigation shell (responsive drawer)
│   │   │   ├── StatCard.jsx     # Glowing glassmorphic KPI cards
│   │   │   └── WebcamCapture.jsx # Glowing HUD webcam visual sensor overlay
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Global session context & toast popups
│   │   ├── pages/
│   │   │   ├── Login.jsx        # Common Auth Entry Gate
│   │   │   ├── Register.jsx     # Employee-only Registration Form
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── EmployeeDashboard.jsx
│   │   │   ├── FaceIdEnrollment.jsx # Biometric scan setup
│   │   │   ├── MarkAttendance.jsx   # Geolocation + Face check-in portal
│   │   │   ├── AttendanceHistory.jsx
│   │   │   ├── Profile.jsx          # Personal detail modifier
│   │   │   ├── AdminDashboard.jsx   # Aggregated analytics dashboard
│   │   │   ├── EmployeeManagement.jsx # Database table & approval triggers
│   │   │   ├── PendingApprovals.jsx
│   │   │   ├── AttendanceTracking.jsx # Tracking log table & map overlay
│   │   │   ├── AttendanceSettings.jsx # Schedule rules configurator
│   │   │   └── ReportsExport.jsx      # Telemetry download center
│   │   ├── utils/
│   │   │   ├── api.js           # Fetch request wrapper with token inject
│   │   │   └── faceBiometrics.js # Biometric math & contrast telemetry
│   │   ├── App.jsx              # Main router map and guards
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 🔑 Seeding & Default Credentials

During database initialization, the system automatically checks for the existence of an Administrator account. If missing, it securely seeds a default admin in the `users` table:

- **Seeded Admin Email**: `admin@example.com`
- **Seeded Admin Password**: `Admin@123`
- **Seeded Admin Role**: `admin`
- **Seeded Admin Status**: `active`

*Note: These default credentials can be configured directly inside `backend/.env`.*

---

## ⚡ Quick Start Setup

### Step 1: Initialize Database & Seed Administrator
Ensure you have the required credentials loaded in `backend/.env` (pre-configured with the provided Turso credentials during active pair programming). Run the database seeding script to initialize the SQLite schema and seed the active admin:
```bash
cd backend
npm run seed
```

### Step 2: Start Backend Express Server
Launch the Node dev server. It runs on Port `5000` by default and activates the minute-interval Auto-Absent scheduler ticker:
```bash
npm start
# or for hot-reloads
npm run dev
```

### Step 3: Run the React Frontend Application
Open a new shell and start the Vite frontend server. It usually launches on `http://localhost:5173` (configured to proxy requests seamlessly to backend api):
```bash
cd frontend
npm install
npm run dev
```

---

## 🛡️ API Endpoints Summary

### Auth Services
- `POST /api/auth/register` - Registers new Employee account. (Forces `role: employee` and `status: pending`).
- `POST /api/auth/login` - Shared credentials verifier. Issues JWT containing user scope.
- `POST /api/auth/logout` - Logs session termination.
- `GET /api/auth/me` - Fresh session token verifier.

### Face ID Biometrics
- `POST /api/face/enroll` - Encrypts and commits a 128-dimensional biometric template.
- `POST /api/face/verify` - Verifies live visual landmarks against registered templates.
- `POST /api/face/reset/:employeeId` - Admin action to wipe Face ID records.

### Employee Management
- `GET /api/employees` - Admin list of employees with search and status filters.
- `GET /api/employees/:id` - Fetch user details.
- `PUT /api/employees/:id` - Edit employee name/mobile (or admin overrides).
- `DELETE /api/employees/:id` - Admin delete account.
- `PUT /api/employees/:id/approve` - Admin action to set status to `active`.
- `PUT /api/employees/:id/reject` - Admin action to set status to `rejected`.

### Attendance & Rules Settings
- `POST /api/attendance/mark` - Check-in portal matching face vectors and GPS values.
- `GET /api/attendance/today` - Fetch today's gating status and marking record.
- `GET /api/attendance/my-history` - Aggregated logs and histories for employees.
- `GET /api/admin/settings/attendance` - LoadSingleton Rules settings.
- `PUT /api/admin/settings/attendance` - Modify Rules settings.

### Administrative Trackers & Downloads
- `GET /api/admin/attendance` - Full tracking grid with search filters.
- `GET /api/admin/attendance/daily` - Daily compliance lists.
- `GET /api/admin/attendance/monthly` - Monthly aggregated metrics list.
- `PUT /api/admin/attendance/manual` - Admin manual override to force mark attendance.
- `POST /api/admin/attendance/run-auto-absent` - Instantly trigger the end-of-day scheduler.
- `GET /api/admin/reports/daily/export?format=csv|excel|pdf` - Daily reports.
- `GET /api/admin/reports/monthly/export?format=csv|excel|pdf` - Monthly reports.
