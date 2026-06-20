<div align="center">

# 🌊 Bluesky Scaffolder

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TanStack](https://img.shields.io/badge/TanStack-Router%20%2B%20Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)](https://tanstack.com)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Lovable](https://img.shields.io/badge/Built%20with-Lovable.dev-E879F9?style=for-the-badge)](https://lovable.dev)

**A modern, full-featured React scaffolding template for SWMMEnablement web applications — built on TanStack Start, Radix UI, and Tailwind CSS.**

[🚀 Quick Start](#-quick-start) · [📦 Tech Stack](#-tech-stack) · [🗂️ Project Structure](#️-project-structure) · [🛠️ Development](#️-development) · [🤝 Contributing](#-contributing)

</div>

---

## 🌐 Overview

**Bluesky Scaffolder** is the canonical front-end starter template for the [SWMMEnablement](https://github.com/SWMMEnablement) organization. It provides a production-ready React application scaffold optimized for rapid development of water infrastructure modeling interfaces, dashboards, and tooling. 

Bootstrapped via [Lovable.dev](https://lovable.dev) and powered by the **TanStack** ecosystem, this template ships with a comprehensive UI component library (shadcn/ui + Radix), full TypeScript support, and a Bun-based toolchain for fast iteration.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🧭 **File-based Routing** | TanStack Router with automatic code-splitting |
| ⚡ **Server-Side Rendering** | TanStack Start (Nitro) for SSR / hybrid rendering |
| 🎨 **50+ UI Components** | Full shadcn/ui component suite via Radix UI primitives |
| 📊 **Charts & Data Viz** | Recharts integration ready for SWMM result plots |
| 📋 **Forms** | React Hook Form + Zod schema validation |
| 🌗 **Theming** | Tailwind CSS v4 with CSS variable-based dark/light mode |
| 🔁 **Data Fetching** | TanStack Query v5 with suspense and optimistic updates |
| 🔍 **Code Quality** | ESLint + Prettier pre-configured |
| 📦 **Fast Toolchain** | Bun as package manager and runtime |

---

## 📦 Tech Stack

<details>
<summary><strong>🟦 Core Framework</strong></summary>

- **React 19** — UI rendering with concurrent features
- **TypeScript 5.8** — Full type safety across the codebase
- **Vite 7** — Lightning-fast HMR and build tooling
- **TanStack Router 1.x** — Type-safe file-based routing with search params
- **TanStack Start 1.x** — Full-stack SSR framework (Nitro under the hood)
- **TanStack Query 5** — Async state management and data synchronization

</details>

<details>
<summary><strong>🎨 UI / Styling</strong></summary>

- **Tailwind CSS v4** — Utility-first CSS framework
- **Radix UI** — Accessible, unstyled component primitives (accordion, dialog, dropdown, tabs, tooltip, and more)
- **shadcn/ui** — Pre-built component patterns on top of Radix + Tailwind
- **Lucide React** — Clean, consistent icon library
- **tw-animate-css** — Animation utilities for Tailwind

</details>

<details>
<summary><strong>📊 Data & Forms</strong></summary>

- **Recharts 2.x** — Composable charting for simulation results and analytics
- **React Hook Form 7** — Performant form state management
- **Zod 3.x** — TypeScript-first schema validation
- **date-fns 4** — Date manipulation utilities
- **Embla Carousel** — Touch-friendly carousel components

</details>

<details>
<summary><strong>🛠️ Developer Experience</strong></summary>

- **Bun** — Ultra-fast JavaScript runtime and package manager
- **ESLint 9 + Prettier 3** — Opinionated linting and formatting
- **TypeScript ESLint** — Type-aware linting rules
- **Vite TsConfig Paths** — Clean import aliases via `tsconfig.json` paths

</details>

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) `>= 1.x` (recommended) **or** Node.js `>= 18`
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/SWMMEnablement/bluesky-scaffolder.git
cd bluesky-scaffolder

# 2. Install dependencies (using Bun)
bun install

# 3. Start the development server
bun run dev
```

The app will be available at **`http://localhost:5173`** (or the next available port).

---

## 🗂️ Project Structure

```
bluesky-scaffolder/
├── public/              # Static assets (favicon, images)
├── src/
│   ├── components/      # Reusable UI components (shadcn/ui + custom)
│   │   └── ui/          # Radix-based primitive components
│   ├── routes/          # TanStack Router file-based routes
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Shared utilities (cn helper, API clients)
│   └── styles/          # Global CSS and Tailwind configuration
├── .lovable/            # Lovable.dev project configuration
├── components.json      # shadcn/ui component registry config
├── vite.config.ts       # Vite + TanStack Start configuration
├── tsconfig.json        # TypeScript compiler configuration
├── bunfig.toml          # Bun runtime configuration
└── package.json         # Project metadata and scripts
```

---

## 🛠️ Development

### Available Scripts

```bash
bun run dev          # Start development server with HMR
bun run build        # Production build
bun run build:dev    # Development build (useful for debugging)
bun run preview      # Preview production build locally
bun run lint         # Run ESLint
bun run format       # Auto-format with Prettier
```

### Adding New shadcn/ui Components

This project uses the [shadcn/ui](https://ui.shadcn.com) component system. Add new components using:

```bash
bunx shadcn@latest add <component-name>
# Example: bunx shadcn@latest add calendar
```

Components are installed into `src/components/ui/` and can be customized freely.

### Environment Variables

Create a `.env.local` file at the project root for local overrides:

```env
VITE_API_BASE_URL=http://localhost:3000
# Add other VITE_ prefixed variables here
```

> ⚠️ Only variables prefixed with `VITE_` are exposed to the browser bundle.

---

## 🔌 Integration with SWMMEnablement

This scaffolder is designed to serve as the front-end layer for SWMMEnablement tools. Typical integration points include:

- **SWMM5 result visualization** — Wire Recharts to parsed `.rpt` or JSON output from the SWMM engine
- **InfoWorks ICM dashboards** — Build network summary and flood map views
- **EPANET-UI** — Embed hydraulic simulation controls and result tables
- **REST API connectivity** — Use TanStack Query hooks to fetch model run results from a backend service

---

## 🤝 Contributing

Contributions are welcome from the SWMMEnablement community and beyond.

1. **Fork** this repository
2. **Create** a feature branch: `git checkout -b feat/your-feature`
3. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
4. **Push** to the branch: `git push origin feat/your-feature`
5. **Open** a Pull Request

Please follow the existing code style (enforced by ESLint + Prettier) and include meaningful commit messages.

---

## 📄 License

This project is maintained by the [SWMMEnablement](https://github.com/SWMMEnablement) organization. See repository settings for license details.

---

<div align="center">

Built with 💧 by the **SWMMEnablement** team · Powered by [Lovable.dev](https://lovable.dev)

</div>
