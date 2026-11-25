# FoodBridge — Surplus Food Redistribution Platform

FoodBridge is a modular, startup-ready full-stack web prototype connecting surplus food donors (individuals, campus messes, restaurants, event halls) with verified NGOs and authorized receivers.

## Project Structure

- `backend/` — Node.js + Express REST API, Zod validation, JWT + RBAC auth, Multer file uploads, background expiry watcher, and SQLite (`node:sqlite`) local database (plus PostgreSQL `001_init_postgres.sql` schema for production).
- `frontend/` — Responsive React + Vite + Tailwind CSS v4 web app with Donor Hub, NGO & Receiver Hub, Admin Oversight Console, and Food Discovery feed.

## Quick Start (Windows PowerShell)

### 1. Start the Backend API (port 5000)
```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

### 2. Start the Frontend App (port 5173)
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173` in your browser.

## Demo Accounts (Pre-Seeded)
- **Donor (Campus Mess):** `donor@foodbridge.org` / `FoodBridge@123`
- **Verified NGO (HopePlate):** `ngo@foodbridge.org` / `FoodBridge@123`
- **Pending NGO:** `pending.ngo@foodbridge.org` / `FoodBridge@123`
- **Platform Admin:** `roy638878@gmail.com` / `PPiiYY@@63`

## Run Automated Backend Tests
```powershell
cd backend
npm.cmd test
```
