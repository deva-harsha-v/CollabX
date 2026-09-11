# CollabX Frontend Web Application

Welcome to the **CollabX Frontend Web Application**. Built with React 19, Vite, Tailwind CSS, Lucide Icons, and Supabase Real-time subscriptions.

---

## 📁 Directory Architecture

```
frontend/
├── public/                 # Static assets, icons, and diagrams
├── src/
│   ├── assets/             # Internal bundled assets & animations
│   ├── components/         # Reusable UI components (Navbar, PostCard, Modals, Autocomplete)
│   ├── context/            # React AppContext & Realtime listeners
│   ├── data/               # Curated datasets (130+ professional roles & skills)
│   ├── lib/                # Storage layer, Supabase client & local cache fallbacks
│   ├── pages/              # Primary views (FeedPage, MessagesPage, AdminPortalPage, AuthPage)
│   ├── App.css             # Component styles & animations
│   ├── App.jsx             # React Router configuration
│   ├── index.css           # Global Tailwind CSS directives & color variables
│   └── main.jsx            # React root mount entrypoint
├── index.html              # Single page application HTML shell
├── package.json            # Frontend dependencies & npm scripts
├── postcss.config.js       # PostCSS plugins
├── tailwind.config.js      # Tailwind CSS configuration
├── vite.config.js          # Vite configuration
└── README.md               # This documentation file
```

---

## 🚀 Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Production Build
```bash
npm run build
```
