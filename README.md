# ParkWise — Smart Parking Management System

**ParkWise** is a full-stack smart parking management and intelligent slot recommendation platform. Built with **Node.js**, **Express 5**, and **MongoDB Atlas**, it replaces legacy browser-only storage with a multi-location backend architecture featuring ACID transactions for double-booking prevention, role-based access control (RBAC), interactive geospatial facility discovery, and live countdown-synchronized booking management.

---

## 🌟 Overview & Workflows

### 👤 User Workflow (Driver)
1. **Registration & Authentication**: Drivers register an account (`/register.html`) or log in (`/login.html`). Upon authentication, a signed JWT is issued and stored in browser `sessionStorage` (tab-scoped; zero plaintext passwords stored in the browser).
2. **Facility Discovery & Search**: Drivers browse public parking locations (`/locations.html`) using debounced text search, city/area filtering, current total/available slot counters, and an interactive Leaflet map.
3. **Slot Recommendation & Selection**: Viewing a location (`/booking.html?locationId=...`) displays compatible enabled parking slots (`car`, `bike`, `ev`) with clear pricing in paise and integer Rupees. The system provides deterministic top-3 rule-based slot recommendations prioritizing lowest price and nearest distance.
4. **Immediate Booking**: Booking a slot executes an atomic MongoDB transaction. Pre-POST recovery guards prevent duplicate payments across network timeouts using unique UUID `requestId` idempotency.
5. **Saved Vehicles & Autofill**: Drivers manage frequently used vehicles (`label`, `registrationNumber`, `type`) from the dashboard modal. Compatible saved vehicles automatically autofill the booking form with strict type safety.
6. **Active Dashboard & History**: Drivers track their active reservation with a live second-by-second countdown synchronized to server time (`/dashboard.html`). Past records can be searched, sorted, and paginated (`/history.html`), and active bookings can be cancelled atomically to release the claimed slot.

### 🛡️ Administrator Workflow (Operator)
1. **Operator Sign-In**: Administrators authenticate via `/login.html`. Dynamic database role verification grants access to the restricted console (`/admin.html`).
2. **Create Draft Facility**: Admins create a new parking facility (`name`, `category`, `address`, `city`, `area`, `contactPhone`, `latitude`, `longitude`, `facilities`). New facilities start in `draft` status.
3. **Add Parking Slots**: Admins create individual slots (`code`, `zone`, `floor`, `vehicleType`, `pricePerHourPaise`, `distanceFromEntry`, `features`) scoped to the facility.
4. **Publish Facility**: Transitioning a facility to `active` is validated against backend preconditions: a location cannot be published until it possesses valid coordinates, an address, and at least one enabled slot.
5. **Manage Slot Operations**: Admins can toggle a slot's `serviceStatus` to `maintenance` or `disabled` without corrupting active booking snapshots.
6. **Telemetry & Audit Logging**: Admins monitor system-wide occupancy statistics and audit driver bookings with populated user contact details (sensitive `passwordHash` strictly excluded).

---

## 🏗️ Architecture & Technology Stack

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                       Client Browser                        │
│   Vanilla JS (ES6 Modules) • Semantic HTML5 • CSS3 Modern  │
│   Leaflet.js Map • SessionStore JWT • Client Clock Sync     │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON REST API (HTTP locally; HTTPS when deployed behind TLS)
┌──────────────────────────────▼──────────────────────────────┐
│                    Express 5 API Server                     │
│   Helmet Security Headers • Rate Limiting • Auth Middleware │
│   Booking Concurrency Service • Expiry Sweeper Reconciler   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose 8 / Replica Set
┌──────────────────────────────▼──────────────────────────────┐
│                     MongoDB Atlas Cluster                   │
│   ACID Transactions • Partial Unique Indexes • Expiry Reconciliation │
│   Users • Locations • Slots • Bookings • Vehicles           │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack
- **Backend Runtime**: Node.js (v20+)
- **API Framework**: Express 5 (`express@5.0.1`)
- **Database & ODM**: MongoDB Atlas (Replica Set required for transactions) with Mongoose 8 (`mongoose@8.24.5`)
- **Security & Cryptography**: Helmet 8, bcryptjs (10 salt rounds, 72-byte truncation guard), JSON Web Tokens (`jsonwebtoken`)
- **Frontend Architecture**: Pure Vanilla JavaScript (zero UI framework dependencies), CSS Custom Properties, Glassmorphism dark mode, Leaflet 1.9.4
- **Testing Runner**: Node native test runner (`node:test`, `node:assert`); integration tests use the separate TEST_MONGODB_URI database.
- **API Verification**: Postman Collection (v2.1.0 schema) and Postman CLI

---

## 🔌 API Endpoint Summary

| Route Group | Base Path | Auth Level | Purpose |
| :--- | :--- | :--- | :--- |
| **System Diagnostics** | `GET /api/health`, `GET /api/ready` | Public | Liveness probe and MongoDB Atlas readiness verification. |
| **Authentication** | `/api/auth` | Public / Bearer | `POST /register`, `POST /login`, `GET /me` (token verification). |
| **Public Locations** | `/api/locations` | Public | Search, city/area filtering, detail, slot availability, and slot recommendations. |
| **Bookings** | `/api/bookings` | User Bearer | `POST /` (atomic slot claim), `GET /me` (all-time counts & pagination), `PATCH /:id/cancel`. |
| **Saved Vehicles** | `/api/vehicles` | User Bearer | `GET /me`, `POST /`, `PATCH /:id`, `DELETE /:id` (strictly user-isolated CRUD). |
| **Admin Operations** | `/api/admin` | Admin Bearer | `/summary` (occupancy metrics), `/locations` (CRUD & publish), `/slots` (nested management), `/bookings` (audit log). |

---

## 🚀 Setup & Installation (Windows PowerShell)

Follow these steps to set up and run ParkWise locally:

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create your local `.env` configuration file from `.env.example`:
```bash
cp .env.example .env
```
Open `.env` and set your credentials:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/parkwise?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=1h
```

### 3. Verify Database Connectivity
Test read-only connectivity to your MongoDB Atlas cluster:
```bash
npm run db:check
```

### 4. Seed Demo Parking Facilities
Populate standard demo parking locations and slots:
```bash
npm run seed:demo
```

### 5. Create Local Administrator Account
Generate administrator credentials using the interactive CLI:
```bash
npm run admin:create
```

### 6. Start Server
Development:
```bash
npm run dev
```
Production:
```bash
npm start
```
Open your browser to: **`http://localhost:5000`**

---

## 📁 Project Structure

```
ParkWise/
├── frontend/                # Client-side web application
│   ├── index.html           # Landing page
│   ├── dashboard.html       # Driver dashboard & profile management
│   ├── booking.html         # Interactive slot selection & booking
│   ├── locations.html       # Public facility search & Leaflet map
│   ├── history.html         # Booking history & session cancellation
│   ├── admin.html           # Operator console (facility CRUD & audit logs)
│   ├── login.html & register.html
│   ├── js/                  # Modular client scripts (api.js, auth.js, booking.js, etc.)
│   ├── css/                 # Modern styling tokens & glassmorphic dark mode
│   └── uploads/profiles/    # User-uploaded profile photos (Multer)
├── server/                  # Backend application (Node.js & Express 5)
│   ├── app.js               # Express 5 app, security headers, routing
│   ├── server.js            # HTTP listener, lifecycle management & expiry sweeper
│   ├── config/              # Database connection & environment validation
│   ├── controllers/         # Request handling & DTO sanitization
│   ├── middleware/          # Auth guards, rate limiters, Multer upload
│   ├── models/              # Mongoose schemas (User, ParkingLocation, ParkingSlot, Booking, Vehicle)
│   ├── routes/              # REST API endpoints
│   ├── services/            # ACID transactions, CAS expiry reconciler, recommendation engine
│   └── scripts/             # CLI utilities (checkDb.js, seedDemo.js, createAdmin.js, lint.js)
├── data/                    # Demo parking seed template
└── .env                     # Local configuration
```

---

## 🧪 Code Quality & Syntax Linting

```bash
npm run lint
```
Validates strict JavaScript syntax across all backend and frontend files.

---

## ⚖️ Technical Boundaries & Features

- **Profile Photos via Multer**: Multi-format image uploads (`image/jpeg`, `image/png`, `image/webp`, `image/gif`) with 2 MB bounds and automatic file cleanup.
- **Immediate Bookings**: On-demand allocations with ACID transaction double-booking prevention.
- **Paise Currency Precision**: All tariffs stored as integer paise to prevent floating-point calculation drift.
- **Pure Standards**: Zero heavy UI frameworks; clean semantic HTML5, CSS3, and ES6 JavaScript.
