# TransitOps — Smart Transport Operations Platform

TransitOps is a centralized transport management platform designed to manage the complete lifecycle of fleet operations — including vehicle registrations, driver compliance, trip scheduling, active dispatch controls, maintenance schedules, fuel logging, and reports/analytics.

The system is equipped with **Role-Based Access Control (RBAC)** across the frontend UI modules and protected server-side API routes.

---

## 🚀 Quick Start Instructions

This project is configured to run fully offline using a **local SQLite database** to ensure zero-dependency, self-contained database operations.

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

### 2. Backend Installation & Start
Navigate to the `server` directory, install dependencies, prepare the SQLite database, and start the API server:

```bash
cd server
npm install
npx prisma db push
npm run db:seed
npm run dev
```

*The backend server will start listening on `http://localhost:3000`.*

### 3. Frontend Installation & Start
Navigate to the `client` directory, install dependencies, and start the Vite development server:

```bash
cd client
npm install
npm run dev
```

*The frontend application will start listening on `http://localhost:5173`.*

---

## 🔑 Login Credentials (RBAC Roles)

The database is seeded with credentials for each operational role. Use the passwords listed below to log in:

### Default UI Credentials (Password: `password123`)
- **Dispatcher** (Dashboard, Trips, Settings):  
  📧 `raven.k@transitops.in`  
- **Fleet Manager** (Fleet Registry, Maintenance, Settings):  
  📧 `fleet.m@transitops.in`  
- **Safety Officer** (Drivers, Trips (view), Settings):  
  📧 `safety.o@transitops.in`  
- **Financial Analyst** (Fuel & Expenses, Analytics, Trips (view), Settings):  
  📧 `analyst.f@transitops.in`  

### Clean Role Credentials (Password: `password`)
- **Dispatcher**: `dispatcher@transitops.in`  
- **Fleet Manager**: `fleet_manager@transitops.in`  
- **Safety Officer**: `safety_officer@transitops.in`  
- **Financial Analyst**: `financial_analyst@transitops.in`  

---

## 🛠️ Implemented Features

### 1. Dashboard Module
- Displays Live KPIs: Active Vehicles, Available Vehicles, In Maintenance, Active/Pending Trips, Drivers On Duty, and Fleet Utilization (%).
- Wired with filters (Vehicle Type, Status, Region) that fetch filtered analytics.
- Automated refetching: updates live on focus and polls backend every 10 seconds.

### 2. Vehicle Registry
- Full CRUD operations protected by `FleetManager` role guards.
- Registration number uniqueness validation surfaced inline.
- Color-coded status badges for vehicle states (`Available`, `On Trip`, `In Shop`, `Retired`).
- **Vehicle Document Management**: Click `Docs` on any vehicle to upload/delete simulated certificates (Insurance, PUC, Fitness, RC) with auto-calculating status colors based on expiry dates.

### 3. Driver Management
- Full CRUD operations protected by `SafetyOfficer` role guards.
- Displays license categories, safety scores (color-coded), and expiration warnings.
- **Email Expiry Alerts**: Click `Send Expiry Alerts` (Safety Officer only) to dispatch simulated notification emails to all drivers whose licenses have expired or are expiring within 30 days.

### 4. Trip Dispatcher
- Dispatches active trips with real-time validations (checks vehicle availability, active/suspended driver licenses, and prevents dispatching if cargo weight exceeds maximum vehicle load capacity).
- Status flow: `Draft` → `Dispatched` (sets vehicle/driver status to `OnTrip`) → `Completed` (restores vehicle/driver to `Available` and updates odometers) or `Cancelled` (restores vehicle/driver to `Available`).

### 5. Maintenance Registry
- Logs maintenance work and updates the linked vehicle status to `InShop` in one transaction.
- Completing a maintenance task marks the log `Completed` and restores the vehicle back to `Available` (unless `Retired`).

### 6. Fuel & Expense Management
- Logs vehicle fuel fills (liters, costs) and trip expenses (tolls and misc).
- Dynamically computes total operational costs (Fuel + Maintenance + Tolls + Misc) per vehicle.

### 7. Reports & Analytics
- Visualizes key metrics: Average Fuel Efficiency, Fleet Utilization, Total Operational Cost, and Fleet ROI.
- **Charts & Visual Analytics**: Interactive Recharts bar charts showing Monthly Revenue and normalized progress bars for Top Costliest Vehicles.
- **Exports**: Supports instant download of detailed per-vehicle analytics to **CSV** and prints clean, print-friendly **PDF** reports (configured with `@media print` CSS overrides).

### 8. System & UI Polishes
- **Theme Switch**: Light / Dark mode toggle in the Sidebar footer, persisting selections to `localStorage`.
- **Table Column Sorting**: Sort tables in Fleet Registry and Driver Registry by clicking column headers (updates lists dynamically with `▲`/`▼` indicators).
