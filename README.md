# CollabX

**Turning community problems into collaborative action.**

CollabX is a civic collaboration platform that converts static complaints into live, verified "challenges." Citizens, students, and organizations post real problems, get matched with verified solvers, coordinate through real-time chat, and track resolution progress from 0% to 100% — all in the open.

Built for **Smart India Hackathon** — Problem Statement ID `SIH26043` — under the theme **Smart Education**.

[![Made for SIH 2026](https://img.shields.io/badge/Smart%20India%20Hackathon-2026-FF7A45)](https://www.sih.gov.in/)
[![React](https://img.shields.io/badge/Frontend-React%2019-149ECA)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E)](https://supabase.com/)
[![Express](https://img.shields.io/badge/API-Express-000000)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-MIT-blue)](#license)

**Live demo:** [collabx-sves.vercel.app](https://collabx-sves.vercel.app)

---

## ✨ What CollabX Does

- **Post a challenge** — Any verified citizen, student, or organization posts a real problem, tagged with the skills needed to solve it.
- **Get matched** — Challenges reach solvers whose skills fit, drawn from a curated dataset of 130+ roles and skills.
- **Collaborate in real time** — A dedicated chat room spins up automatically the moment someone agrees to help, with live message sync and unread badges.
- **Track progress in the open** — Posters update resolution progress from 0% to 100%, visible to solvers and the public feed alike.
- **Report emergencies instantly** — A one-click emergency pathway skips standard sign-up friction for urgent, life-safety reports, with strict anti-abuse limits.
- **Verify identities** — ID document uploads, organization domain checks, and email confirmation keep the platform spam-resistant.
- **Govern with oversight** — An admin portal gives full visibility into posts, users, and chat rooms, with cascading soft-delete and audit logging.

---

## 🧱 Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React 19, Vite, Tailwind CSS |
| Backend API | Node.js, Express |
| Database & Auth | Supabase (PostgreSQL), Row-Level Security |
| Realtime | Supabase Realtime (WebSockets) |
| Storage | Supabase Storage (signed URLs) |
| Deployment | Vercel |

---

## 🏛️ Monorepo Directory Architecture

```
CollabX/
├── frontend/                     # Client Web Application
│   ├── public/                   # Static assets & icons
│   ├── src/                      # React 19 application
│   │   ├── assets/               # Bundled assets
│   │   ├── components/           # UI components (Navbar, Autocomplete, PostCard, Modals)
│   │   ├── context/               # AppContext & Realtime subscription listeners
│   │   ├── data/                  # 130+ Curated Roles & Skills dataset
│   │   ├── lib/                   # Storage layer, Supabase client & fallback shims
│   │   └── pages/                 # Views (FeedPage, MessagesPage, AdminPortalPage, AuthPage)
│   ├── index.html                # Vite HTML shell
│   ├── package.json              # Frontend dependencies & scripts
│   ├── vite.config.js            # Vite configuration
│   └── tailwind.config.js        # Tailwind CSS styling
│
├── backend/                      # Server & Database Service
│   ├── database/                 # SQL Schemas, RLS Policies & Triggers
│   │   └── supabase_schema.sql
│   ├── scripts/                  # DB Verification & Diagnostic scripts
│   │   └── verify_supabase.js
│   ├── src/                      # Express REST API Server
│   │   ├── config/                # Supabase service configuration
│   │   ├── controllers/           # Business logic & Gating authorization
│   │   ├── routes/                # API endpoint routers (/api/posts, /api/admin)
│   │   └── server.js              # API entrypoint
│   └── package.json              # Backend dependencies & scripts
│
├── package.json                  # Root Monorepo workspace orchestrator
├── vercel.json                   # Deployment rewrite configuration
└── README.md                     # This documentation file
```

---

## 🚀 Quickstart

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project (URL + anon/service keys)

### Environment Variables

Create a `.env` file in `frontend/` and `backend/` respectively (see `.env.example` if present):

```bash
# frontend/.env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# backend/.env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=5000
```

### Running from Root

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the **Frontend** Vite development server |
| `npm run build` | Builds the **Frontend** for production |
| `npm run backend:dev` | Starts the **Backend** Express server with file watching |
| `npm run backend` | Runs the **Backend** server in production mode |
| `npm run backend:verify` | Runs database connectivity and schema verification |
| `npm run lint` | Runs the codebase linter |

### Running from Subdirectories

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
npm install
npm run dev
```

---

## 🗄️ Database Setup

The full schema, Row-Level Security policies, and triggers live in `backend/database/supabase_schema.sql`. Run this against a fresh Supabase project via the SQL editor, then verify connectivity with:

```bash
npm run backend:verify
```

---

## 🔐 Security

- **Row-Level Security (RLS)** is enforced at the database level — users cannot read or modify posts, profiles, or messages they don't own.
- **ID documents and attachments** are stored in private buckets and served only via time-limited signed URLs.
- **Emergency accounts** are capped at one urgent post to prevent spam/flooding.
- **Admin actions** are logged with timestamps and justification for auditability.

---

## 🗺️ Roadmap

- [ ] AI-powered duplicate report detection
- [ ] Multi-language support via Bhashini API
- [ ] GIS-based, location-aware solver matching
- [ ] Ward-level analytics dashboards for municipal partners

---

## 🤝 Contributing

Issues and pull requests are welcome. Please open an issue describing the change before submitting a large PR.


## 👥 Team

**Team CollabX** — Smart India Hackathon 2026, Problem Statement SIH26043.
