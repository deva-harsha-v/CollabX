# CollabX Backend Service & Database Layer

Welcome to the **CollabX Backend Service**. This module houses the complete REST API server, database migration schemas, and Supabase service integration.

---

## 📁 Directory Architecture

```
backend/
├── database/
│   └── supabase_schema.sql      # Complete SQL Schema, RLS Policies, Triggers & RPCs
├── scripts/
│   └── verify_supabase.js       # Database connectivity & schema validation script
├── src/
│   ├── config/
│   │   └── supabase.js          # Supabase client & service-role configuration
│   ├── controllers/
│   │   ├── adminController.js   # Supervisory portal logic & deletion telemetry
│   │   └── postsController.js   # Challenges, gating, and progress controllers
│   ├── routes/
│   │   ├── adminRoutes.js       # /api/admin endpoints
│   │   └── postsRoutes.js       # /api/posts endpoints
│   └── server.js                # Express API application entrypoint
├── .env.example                 # Environment configuration template
├── package.json                 # Backend dependencies & npm scripts
└── README.md                    # This documentation file
```

---

## 🚀 Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Verify Database Connectivity
```bash
npm run verify:db
```

---

## 📡 REST API Endpoints

| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status | Public |
| `GET` | `/api/posts` | Fetch live challenge feed | Public |
| `GET` | `/api/posts/:id` | Fetch challenge with gated authorization | Optional Token |
| `POST` | `/api/posts` | Create a new challenge brief | Authenticated |
| `PATCH` | `/api/posts/:id/progress` | Update challenge resolution progress (0-100%) | Author / Admin |
| `POST` | `/api/admin/login` | Super-admin portal authentication | Admin Key |
| `GET` | `/api/admin/posts` | Fetch all challenges ever created | Admin |
| `POST` | `/api/admin/delete-post` | Delete challenge with mandatory reason notification | Admin |
