# 🎫 TicketAdmin — Bronx Operations Console

<p align="center">
  <strong>Enterprise-grade ticket management, customer support operations, and notification dispatcher.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5+-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4.3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Pinia-4.0-FFD859?style=for-the-badge&logo=pinia&logoColor=black" alt="Pinia" />
  <img src="https://img.shields.io/badge/Vitest-4.1-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/Node-%3E%3D22.18.0-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node Engine" />
</p>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture & Tech Stack](#-system-architecture--tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running Development Server](#running-development-server)
- [Environment Variables Reference](#-environment-variables-reference)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Available Scripts](#-available-scripts)
- [Security Architecture](#-security-architecture)
- [Developer Tooling & Recommended Setup](#-developer-tooling--recommended-setup)
- [Contributing & Code Standards](#-contributing--code-standards)

---

## 🌟 Overview

**TicketAdmin** is a centralized administrative console designed for high-velocity support workflows and multi-tenant issue tracking within the Bronx ecosystem. 

Engineered with **Vue 3 (Composition API)**, **TypeScript**, and **Tailwind CSS v4**, TicketAdmin bridges customer requests submitted across multiple ingestion channels—including authenticated REST APIs, public self-service portals, and staff consoles—directly with operational agents, featuring real-time **Telegram Bot outbox notifications** for urgent escalations.

---

## ✨ Key Features

### 📋 Multi-Modal Ticket Workspace
- **Kanban Board**: Drag-and-drop cards across workflow columns (`Open`, `In Progress`, `Resolved`, `Closed`) with instant status transitions.
- **Interactive Data Table**: High-density view featuring configurable column visibility, facet counters, sorting, and pagination.
- **Faceted Search & Filters**: Filter instantly by Status, Priority (`Low`, `Medium`, `High`, `Critical`), Issue Type (`Bug`, `Enhancement`, `Question`, `Task`), Source, and Assignee.
- **Detailed Ticket Inspection**: Slide-over drawer and focused modal providing full ticket metadata, author info, status audit history, and direct assignee management.

### ✍️ Hybrid WYSIWYG & HTML Code Editor
- **Rich Text Mode**: Powered by **Tiptap** with support for headings, bold/italic formatting, links, lists, and code blocks.
- **Code Mode**: Direct HTML editing powered by **CodeMirror 6** with real-time syntax highlighting and instantaneous preview rendering.
- **Safe Rendering**: Built-in sanitization pipeline to safeguard agents from arbitrary markup injections.

### 💬 Threaded Collaboration & Attachments
- **Internal Notes vs. Public Discussion**: Distinguish between private staff notes and customer-facing responses.
- **Multi-File Attachments**: Drag-and-drop file uploaders with file size validation, mime-type detection, and preview attachments.

### 📊 Real-Time Analytics & Executive Reporting
- **KPI Metrics Dashboard**: Monitor total volume, active workload, resolution velocity, and critical open tickets.
- **Visual Analytics**: Interactive status distribution donuts, ticket category breakdown, and priority metrics.
- **Dynamic Date Filtering**: Built-in date range presets (`Today`, `Last 7 Days`, `Last 30 Days`, `This Month`, and `Custom Range`) with instant in-memory caching.

### 🤖 Telegram Bot Dispatcher & Subscriber Management
- **Instant Escalation Alerts**: Dispatches incoming ticket alerts directly to private Telegram chats of on-call engineers.
- **One-Click Invite Generation**: Generate cryptographically secured bot onboarding invite links on demand.
- **Subscriber Directory**: Inspect active chat IDs, toggle notification subscriptions, and fire automated test pings.

### 🌐 Public Client Ingestion Portal (`/client-ticket`)
- Standalone self-service ticket intake portal for authenticated external clients using `X-Client-ID` and `X-Client-Secret` verification.
- Client-side drag-and-drop file upload with live previews and error handling.

### 🌓 Adaptive Theming
- Native Dark / Light / System auto-detection with smooth transitions and persistent state.

---

## 🛠 System Architecture & Tech Stack

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Core Framework** | [Vue 3](https://vuejs.org/) (`^3.5.42`) | Progressive frontend framework using `<script setup>` Composition API |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (`~6.0.0`) | Strict type checking and enterprise contract validation |
| **Build & Tooling** | [Vite](https://vite.dev/) (`^8.2.2`) | Next-generation frontend tooling with lightning-fast HMR |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) (`^4.3.3`) | Modern utility-first CSS engine via `@tailwindcss/vite` |
| **State Management** | [Pinia](https://pinia.vuejs.org/) (`^4.0.3`) | Modular, type-safe state stores (`auth`, `ticket`, `report`, `settings`, `toast`, `theme`) |
| **Routing** | [Vue Router](https://router.vuejs.org/) (`^5.3.1`) | Client-side routing with navigation authentication guards |
| **Rich Text Editor** | [Tiptap](https://tiptap.dev/) (`^3.31.4`) | Headless WYSIWYG editor framework |
| **Code Editor** | [CodeMirror 6](https://codemirror.net/) | Extensible in-browser code editor with HTML grammar highlighting |
| **HTTP Client** | [Axios](https://axios-http.com/) (`^1.20.0`) | Promise-based HTTP client with origin-sanitized token injection |
| **Icons** | [Lucide Vue Next](https://lucide.dev/) (`^1.0.0`) | Clean, consistent SVG icon system |
| **Testing** | [Vitest](https://vitest.dev/) (`^4.1.11`) + Vue Test Utils | Unit and component testing suite |
| **Code Quality** | ESLint (`^10.10.0`), Oxlint (`~1.82.0`), Prettier | Multi-stage linting, fast static analysis, and code formatting |

---

## 📂 Project Directory Structure

```text
ticket-admin/
├── public/                 # Static assets & public favicon
├── src/
│   ├── __tests__/          # Vitest unit test suites
│   ├── api/                # API communication layer
│   │   ├── client.ts       # Axios instance, origin security & 401 interceptors
│   │   ├── reportApi.ts    # Dashboard analytics & reporting endpoints
│   │   ├── telegramApi.ts  # Telegram bot subscriber & invite endpoints
│   │   └── ticketApi.ts    # Tickets, comments, attachments & auth endpoints
│   ├── assets/             # Global styles and Tailwind configuration
│   ├── components/         # Reusable Vue components
│   │   ├── common/         # Base UI (Buttons, Inputs, Selects, Modals, WYSIWYG)
│   │   ├── dashboard/      # Metrics, status donut, and trend charts
│   │   ├── layout/         # Topbar, Sidebar, Notification & Toast containers
│   │   ├── settings/       # Telegram bot config, subscribers table & invite form
│   │   └── tickets/        # Kanban board, table view, modals & ticket cards
│   ├── router/             # Vue Router routes and authentication guards
│   ├── stores/             # Pinia centralized stores
│   │   ├── authStore.ts    # Authentication state, JWT tokens & RBAC permissions
│   │   ├── reportStore.ts  # Reporting cache and date range analytics
│   │   ├── settingsStore.ts# Telegram bot status and subscriber state
│   │   ├── themeStore.ts   # Dark / Light / System theme controller
│   │   ├── ticketStore.ts  # Ticket CRUD, filtering, pagination & comments
│   │   └── toastStore.ts   # Toast notifications
│   ├── types/              # TypeScript interfaces and domain schemas
│   │   ├── settings.ts     # Telegram subscriber & bot configuration types
│   │   └── ticket.ts       # Ticket, attachment, comment, user & report types
│   ├── utils/              # Helper utilities (HTML sanitizer, security helpers)
│   ├── views/              # Page views (Tickets, Dashboard, Clients, Settings, Login, ClientTicket)
│   ├── App.vue             # Root component
│   └── main.ts             # Application bootstrapping entrypoint
├── .env.example            # Environment configuration template
├── eslint.config.ts        # ESLint flat configuration
├── index.html              # HTML entrypoint
├── package.json            # Project dependencies and script declarations
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration with Tailwind CSS & manual chunking
```

---

## 🚀 Getting Started

### Prerequisites

Ensure your development environment meets the minimum engine specifications:
- **Node.js**: `^22.18.0` or `>=24.12.0`
- **Package Manager**: [pnpm](https://pnpm.io/) (recommended), `npm`, or `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ticket-admin
   ```

2. **Install project dependencies:**
   ```bash
   pnpm install
   ```

### Environment Setup

Copy the environment template and customize the variables for your target backend:

```bash
cp .env.example .env
```

Configure your `.env` file according to your backend host (see [Environment Variables Reference](#-environment-variables-reference)).

### Running Development Server

Start Vite's local development server with Hot Module Replacement (HMR):

```bash
pnpm dev
```

Open your browser and navigate to:
```
http://localhost:5173
```

---

## ⚙️ Environment Variables Reference

| Variable | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `string` | `http://127.0.0.1:8000/api/v1` | Base REST API URL for ticket, report, and subscriber endpoints. |
| `VITE_AUTH_BASE_URL` | `string` | `http://127.0.0.1:8000` | Host URL for root auth endpoints (`/token`, `/login`, `/two-factor`). |
| `VITE_API_SECRET` | `string` | `""` | Shared application secret used to retrieve temporary tokens via `POST /token`. |
| `VITE_CLIENT_ID` | `string` | `""` | Client identifier sent in `X-Client-ID` for public ticket submissions. |
| `VITE_CLIENT_SECRET` | `string` | `""` | Client secret sent in `X-Client-Secret` for public ticket submissions. |
| `VITE_TELEGRAM_BOT_USERNAME` | `string` | `""` | Telegram bot handle (e.g. `BronxTicketAlertBot`) displayed in settings. |

---

## 🛡️ Role-Based Access Control (RBAC)

TicketAdmin enforces strict permission controls based on the authenticated user's role:

| Capability | HQ Admin (`HQ ADMIN`) | Branch Staff (`BRANCH STAFF`) | Preview / Viewer (`PREVIEW`) |
| :--- | :---: | :---: | :---: |
| **View Tickets & Kanban** | ✅ | ✅ | ✅ |
| **Search & Apply Filters** | ✅ | ✅ | ✅ |
| **Create New Ticket** | ✅ | ✅ | ❌ |
| **Transition Ticket Status** | ✅ | ✅ | ❌ |
| **Delete Ticket** | ✅ | ❌ | ❌ |
| **Post Discussion Comments** | ✅ | ✅ | ❌ |
| **Post Internal Notes** | ✅ | ✅ | ❌ |
| **Generate Telegram Invites** | ✅ | ✅ | ❌ |
| **Manage Subscribers & Test Pings** | ✅ | ❌ | ❌ |
| **Two-Factor Authentication (2FA)** | Enforced | Optional | Optional |

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts the Vite development server with HMR. |
| `pnpm build` | Executes type-checking (`vue-tsc`) and builds minified production assets. |
| `pnpm build-only` | Runs Vite production bundling without type-checking. |
| `pnpm preview` | Serves the production build locally for verification. |
| `pnpm test:unit` | Executes all Vitest unit test suites. |
| `pnpm type-check` | Performs static TypeScript validation across `.vue` and `.ts` files via `vue-tsc`. |
| `pnpm lint` | Runs sequential linting passes using `oxlint` and `eslint --fix`. |
| `pnpm lint:oxlint` | Runs Oxlint for ultra-fast JavaScript/TypeScript linting. |
| `pnpm lint:eslint` | Runs ESLint for comprehensive Vue & TypeScript static analysis. |
| `pnpm format` | Formats codebase using Prettier. |

---

## 🔒 Security Architecture

TicketAdmin incorporates defensive measures to safeguard corporate assets and credentials:

1. **Origin-Bounded Token Injection**:
   The Axios interceptor strictly validates target URLs against configured internal origins (`API_BASE_URL` and `AUTH_BASE_URL`) before injecting the `Authorization: Bearer <token>` header, preventing token leakage to third-party domains.
2. **XSS & Markup Sanitization**:
   All user-provided HTML descriptions render through a dedicated viewer with sanitization logic to neutralize malicious script vectors and dangerous attributes.
3. **Hardened HTTP Response Headers**:
   The development and preview servers enforce secure defense-in-depth headers including `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and restrictive `Permissions-Policy`.
4. **Automated Session Revocation**:
   On receiving HTTP `401 Unauthorized` responses from trusted backend endpoints, the client purges cached session tokens and redirects unauthenticated users to `/login`.

---

## 💻 Developer Tooling & Recommended Setup

- **IDE**: [Visual Studio Code](https://code.visualstudio.com/)
- **Recommended Extensions**:
  - [Vue - Official (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) — Disable legacy Vetur.
  - [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) — Class auto-completion for Tailwind CSS v4.
  - [Prettier - Code Formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) — Automated code formatting.
- **TypeScript Workspace Setup**:
  This project utilizes `typescript-native-bridge`. When prompted in VS Code, select **Use Workspace Version** to ensure synchronization between the IDE language service and CLI build commands.
- **Browser DevTools**:
  Install [Vue.js DevTools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) and enable **Custom Object Formatter** in Chrome DevTools Settings.

---

## 🤝 Contributing & Code Standards

1. Ensure all TypeScript types are explicitly declared; avoid `any` wherever possible.
2. Run `pnpm type-check` and `pnpm lint` before submitting pull requests.
3. Add unit test coverage under `src/__tests__/` for new business logic and store modules.
4. Adhere to Tailwind utility conventions and keep layout components modular.

---

<p align="center">
  <sub>Built with ❤️ for Bronx Operations. Confidential and proprietary.</sub>
</p>
