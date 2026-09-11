# CollabX Platform — Full-Stack Monorepo

Welcome to the **CollabX Platform** repository. The codebase is organized into dedicated **frontend** and **backend** packages.

---

## 🏛️ Monorepo Directory Architecture

```
CollabX/
├── frontend/                     # Client Web Application
│   ├── public/                   # Static assets & icons
│   ├── src/                      # React 19 application
│   │   ├── assets/               # Bundled assets
│   │   ├── components/           # UI components (Navbar, Autocomplete, PostCard, Modals)
│   │   ├── context/              # AppContext & Realtime subscription listeners
│   │   ├── data/                 # 130+ Curated Roles & Skills dataset
│   │   ├── lib/                  # Storage layer, Supabase client & fallback shims
│   │   └── pages/                # Views (FeedPage, MessagesPage, AdminPortalPage, AuthPage)
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
│   │   ├── config/               # Supabase service configuration
│   │   ├── controllers/          # Business logic & Gating authorization
│   │   ├── routes/               # API endpoint routers (/api/posts, /api/admin)
│   │   └── server.js             # API entrypoint
│   └── package.json              # Backend dependencies & scripts
│
├── package.json                  # Root Monorepo workspace orchestrator
├── vercel.json                   # Deployment rewrite configuration
└── README.md                     # This documentation file
```

---

## 🚀 Quickstart Commands

### Running from Root

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the **Frontend** Vite development server |
| `npm run build` | Builds the **Frontend** for production |
| `npm run backend:dev` | Starts the **Backend** Express server with file watching |
| `npm run backend` | Runs the **Backend** server in production mode |
| `npm run backend:verify`| Runs database connectivity and schema verification |
| `npm run lint` | Runs the codebase linter |

### Running from Subdirectories

- **Frontend**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```

- **Backend**:
  ```bash
  cd backend
  npm install
  npm run dev
  ```

