# Project Context & Handoff Guide: CollabX (SIH)

This document provides a comprehensive overview of the **CollabX** project for AI coding assistants (e.g., Claude, Antigravity) and developers.

---

## 1. Project Overview & Vision

**CollabX** is a verified civic synthesis platform designed to solve real-world community, environmental, and municipal emergencies by bridging the gap between frontline stakeholders and institutional researchers.

- **Problem Statement**: Grassroots civic issues (e.g., water contamination, urban heat islands, traffic infrastructure risks identified by citizens, NGOs, or municipalities) often go unsolved because they lack access to accredited academic research and specialized engineering labs.
- **Solution**: CollabX provides a verified, cryptographic pipeline where problem brief posters meet vetted university researchers, PhD scholars, and R&D labs to execute milestone-based solutions.
- **GitHub Repository**: `https://github.com/deva-harsha-v/CollabX.git`
- **Local Root**: `C:\Users\devah\.gemini\antigravity\scratch\SIH`

---

## 2. Technology Stack & Dependencies

- **Frontend Core**: React 19 (`react`, `react-dom` `^19.2.8`)
- **Build Tool & Bundler**: Vite 8 (`vite` `^8.3.0`, `@vitejs/plugin-react` `^6.1.1`)
- **Styling**: Tailwind CSS v4 (`tailwindcss` `^4.3.3`, `@tailwindcss/vite`, `@tailwindcss/postcss`, `autoprefixer`)
- **Icons**: Lucide React (`lucide-react` `^1.44.0`)
- **Linter**: Oxlint (`oxlint` `^1.81.0`)
- **Language**: JavaScript (JSX - React ES Modules)

---

## 3. Architecture & File Directory Structure

```
SIH/
├── index.html                  # HTML entry point (loads Outfit & Inter Google Fonts)
├── package.json                # Project dependencies & scripts
├── vite.config.js              # Vite configuration with React & Tailwind plugins
├── postcss.config.js           # PostCSS configuration
├── .oxlintrc.json              # Oxlint linting rules configuration
├── public/                     # Static assets
└── src/
    ├── main.jsx                # Application mounting point
    ├── App.jsx                 # Main layout shell & global modal state
    ├── index.css               # Global styles, Tailwind imports, custom animations & theme overrides
    ├── App.css                 # Supplementary styles
    └── components/
        ├── Navbar.jsx          # Top floating glassmorphic nav with scroll transition
        ├── Hero.jsx            # Section 1: Hero headline, CTA buttons & dispatch preview card
        ├── Mission.jsx         # Section 2: 3-column civic disconnect & problem explanation
        ├── HowItWorks.jsx      # Section 3: 4-step pipeline timeline
        ├── Security.jsx        # Section 4: Cryptographic trust pillars & verification rules
        ├── CTAFooter.jsx       # Section 5: Closing CTA, live metrics strip & footer
        ├── JoinModal.jsx       # Interactive onboarding modal (Poster vs. Solver registration & doc upload)
        └── Reveal.jsx          # Scroll-triggered entrance animation wrapper (IntersectionObserver)
```

---

## 4. UI/UX & Design System Guidelines

- **Color Palette**:
  - **Base Background**: `#060911` (Deep space dark background)
  - **Surfaces & Cards**: `#0b1222`, `#0c1426`, `#0d1629` with subtle borders (`rgba(56, 189, 248, 0.12)`)
  - **Accents**: Cyan (`#06b6d4`, `#22d3ee`), Teal (`#14b8a6`), Blue (`#0284c7`)
  - **Key Accent Rule**: The **Red Bubble Pill Button** (`.red-pill-button`) is strictly reserved for primary Call-to-Action (CTA) elements ("Join CollabX"). **No other UI elements should use red styling** to preserve high visual contrast.
- **Typography**:
  - Headings: `'Outfit', sans-serif`
  - Body & Data: `'Inter', sans-serif`, `monospace` for identifiers & status tags
- **Visual Effects**:
  - **Cyber Grid**: Background grid effect (`.cyber-grid`)
  - **Floating Orbs**: Smooth ambient blurred background lights (`.animate-orb-1`, `.animate-orb-2`, `.animate-orb-3`)
  - **Glassmorphism**: Backdrop blur (`backdrop-blur-xl`), translucent dark panels

---

## 5. Key Workflows & State Logic

1. **Section Navigation**:
   - The application is structured as a full-height 5-section landing page with smooth scroll links (`#hero`, `#mission`, `#how-it-works`, `#security`, `#join`).
2. **Onboarding Modal Flow (`JoinModal.jsx`)**:
   - Triggered by `onOpenJoin` from `Navbar`, `Hero`, or `CTAFooter`.
   - Role switching tab state (`poster` for Problem Posters vs. `solver` for Verified Solvers).
   - Mock document upload preview (`Choose Document` file picker input).
   - Form submission state toggle (`submitted: true`) displaying a verified KYC status badge (`KYC_STAGE_PENDING_REVIEW`).
3. **Scroll Animation System (`Reveal.jsx`)**:
   - Wraps elements using `IntersectionObserver` to trigger entrance animations (`fade-up`, `fade-down`, `scale-in`, `slide-left`).

---

## 6. Common Development Commands

- **Install Dependencies**: `npm install`
- **Start Dev Server**: `npm run dev`
- **Build Production Bundle**: `npm run build`
- **Preview Production Build**: `npm run preview`
- **Lint Codebase**: `npm run lint`

---

## 7. Operational Guidelines for AI Assistants

1. **Preserve Design Integrity**: Do not change the color scheme or introduce random red elements. Keep CTA buttons uniform using `.red-pill-button`.
2. **Maintain Clean React 19 Patterns**: Standard React hooks (`useState`, `useEffect`, `useRef`). Ensure clean teardowns for listeners or observers.
3. **Icons**: Use `lucide-react` for any added UI components to maintain visual consistency.
4. **Linting**: Ensure any code edits pass `oxlint` checks (`npm run lint`).
