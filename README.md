<div align="center">

<img src="./public/icon.svg" alt="GameBox Icon" width="80" height="80" />

# GameBox

**Turn your imagination into playable web games in seconds.**  
Powered by agentic AI pair programming, cloud-isolated Daytona sandboxes, and realtime streaming with Trigger.dev.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?style=flat-square&logo=react)](https://react.dev/)
[![Trigger.dev](https://img.shields.io/badge/Trigger.dev-v4.5-orange?style=flat-square&logo=triggerdotdev)](https://trigger.dev/)
[![Daytona](https://img.shields.io/badge/Daytona-Sandboxes-cyan?style=flat-square)](https://daytona.io/)
[![Neon](https://img.shields.io/badge/Neon-Serverless%20Postgres-00e599?style=flat-square&logo=postgresql)](https://neon.tech/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## Overview

**GameBox** is an end-to-end AI game creation platform that pairs players with an autonomous game engineer. From a single prompt ("Create a neon cyberpunk top-down shooter" or "Pixel art dungeon crawler with grappling hook mechanics"), GameBox designs, writes, verifies, and runs fully playable HTML5/Canvas/JavaScript games inside dedicated cloud containers.

### Key Highlights

- **Autonomous AI Pair Programmer**: Multi-model intelligence using Google Gemini (2.5-Flash, 2.0-Flash) with automatic, zero-downtime fallback to Puter AI driver (`gpt-4o-mini`, `gemini-2.5-flash`).
- **Trigger.dev Realtime Agent Tasks**: Long-running background sessions powered by `@trigger.dev/sdk/ai` featuring bidirectional streaming, tool calling, and session persistence.
- **Daytona Cloud Sandboxes**: Every game is provisioned with an isolated Daytona runtime running a live HTTP game server. Code is written directly into `/home/daytona/game` and served live.
- **Instant Split-Screen Play**: Resizable split-screen layout with an interactive chat terminal on the left and a live game viewport on the right. When the AI finishes crafting your game, the preview seamlessly slides open with automated cache-busting revision reloads.
- **Bespoke UI & Dark Aesthetics**: Built with Tailwind CSS v4, Lucide icons, and Radix/shadcn primitives styled in a rich, dark theme.
- **Secure Multi-User Auth**: Authentication and session management powered by Clerk.
- **Serverless Database**: Powered by Neon Serverless Postgres and Drizzle ORM for lightning-fast schema push and persistence.

---

## 📸 Screenshots

### AI Game Studio & Live Preview
*Real-time split-screen interface featuring the streaming agent chat terminal on the left and the live playable Daytona sandbox on the right.*

![GameBox Live Game Studio](./public/screenshot-2.png)

### Dashboard & Game Discovery
*Intuitive dashboard for crafting prompt ideas, choosing starter presets, and exploring recent games.*

![GameBox Dashboard](./public/screenshot-1.png)

---

## System Architecture

```mermaid
graph TD
    User([Player / Developer]) -->|Web UI / Next.js 16| Frontend[GameBox Frontend]
    Frontend -->|Auth & User Session| Clerk[Clerk Auth]
    Frontend -->|Streaming Chat & Events| TriggerDev[Trigger.dev Cloud / Agent]
    
    subgraph "Agentic Game Engine"
        TriggerDev -->|AI Agent Task| LLM{AI Orchestrator}
        LLM -->|Primary| Gemini[Google Gemini 2.5 / 2.0]
        LLM -.->|Auto Fallback| Puter[Puter AI Driver / GPT-4o-mini]
        
        TriggerDev -->|Sandbox File Tools| DaytonaSDK[Daytona Cloud SDK]
        DaytonaSDK -->|Spawn & Write Files| Sandbox[Isolated Daytona Container]
        Sandbox -->|Serve HTTP localhost:3000| GamePreview[Live Game Runtime]
    end

    subgraph "Data & Persistence"
        Frontend -->|Queries & Updates| DB[(Neon Serverless Postgres)]
        TriggerDev -->|Hydrate & Persist Messages| DB
        DB --- Drizzle[Drizzle ORM]
    end

    GamePreview -->|Live Preview Iframe| Frontend
```

---

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | React server components, server actions, route handlers |
| **Language** | TypeScript | Strict type safety across frontend and background workers |
| **Styling** | Tailwind CSS v4 + shadcn/ui | Modern, responsive dark-mode styling and UI tokens |
| **AI SDK** | Vercel AI SDK (`ai`, `@ai-sdk/google`) | Streaming text generation, tool invocations, and UI streams |
| **Background Tasks** | Trigger.dev v4.5 (`@trigger.dev/sdk`) | Agentic chat loop, background job queuing, and token minting |
| **Cloud Sandboxes** | Daytona SDK (`@daytona/sdk`) | Disposable, secure cloud environments running Python web servers |
| **Database** | Neon Postgres + Drizzle ORM | Serverless Postgres database for games, chats, and metadata |
| **Authentication** | Clerk (`@clerk/nextjs`) | User sign-in, session tokens, and protected routes |
| **AI Driver Fallback** | Puter AI (`@heyputer/puter.js`) | Multi-model fallback driver preventing quota disruptions |

---

## Repository Structure

```text
game-box/
├── app/                       # Next.js App Router
│   ├── api/                   # API Routes (preview proxy, game actions, webhooks)
│   ├── games/                 # Game studio routes ([id]/page.tsx)
│   ├── layout.tsx             # Root layout with Clerk & Theme providers
│   └── page.tsx               # Home dashboard & game discovery
├── components/                # Reusable UI & Studio Components
│   ├── chat-composer.tsx      # Terminal-style message input & prompt bar
│   ├── chat-preview.tsx       # Live sandbox iframe with revision reload & controls
│   ├── chat-thread.tsx        # Message feed with tool execution markers & streaming
│   ├── game-chat.tsx          # Split-pane layout coordinator
│   └── ui/                    # Radix / shadcn UI components
├── lib/                       # Core Business Logic & Clients
│   ├── daytona/               # Daytona SDK client, sandbox lifecycle, health checks
│   ├── db/                    # Drizzle ORM client & database schema definitions
│   └── games/                 # Instructions, workflow prompts, and sandbox tools
├── trigger/                   # Trigger.dev Background Tasks
│   ├── chat.ts                # Main gameChat agentic loop & Puter fallback engine
│   └── example.ts             # Sample baseline background task
├── trigger.config.ts          # Trigger.dev v4 configuration (Node.js runtime, dirs)
└── drizzle.config.ts          # Drizzle ORM configuration
```

---

## Getting Started

### 1. Prerequisites

Ensure you have the following installed:
- [Node.js 20+](https://nodejs.org/) (Node 24 recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A [Trigger.dev](https://cloud.trigger.dev/) account
- A [Daytona](https://app.daytona.io/) account & API key
- A [Neon](https://neon.tech/) Postgres database
- A [Clerk](https://clerk.com/) application
- A Google AI Studio API key (Gemini)

### 2. Clone & Install Dependencies

```bash
git clone https://github.com/Vivek-736/Game-Box.git
cd Game-Box
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# Database (Neon Serverless Postgres)
DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# AI Provider (Google Gemini)
GEMINI_API_KEY="AIzaSy..."

# Fallback AI Provider (Puter)
PUTER_AUTH_TOKEN="eyJhb..."

# Daytona Cloud Sandboxes
DAYTONA_API_KEY="daytona_..."
DAYTONA_SERVER_URL="https://app.daytona.io/api"
DAYTONA_TARGET="us"

# Trigger.dev Background Engine
TRIGGER_SECRET_KEY="tr_dev_..."
```

### 4. Database Setup

Push the Drizzle schema directly to your Neon database:

```bash
npm run db:push
```

### 5. Running in Development

Open two terminal tabs:

**Terminal 1 — Next.js Application:**
```bash
npm run dev
```

**Terminal 2 — Trigger.dev Worker:**
```bash
npm run trigger:dev
```

Visit [http://localhost:3000](http://localhost:3000) to start building games!

---

## Deploying Trigger.dev Tasks

When deploying background tasks to Trigger.dev Cloud:

```bash
npm run trigger:deploy
```

This bundles your background task files, registers the `game-chat` agent, and deploys it to the Trigger.dev serverless fleet.

---

## How It Works: The Game Engineering Loop

1. **Prompt Ingestion**: The player types an idea (e.g. *"Create a Space Invaders clone with lasers and powerups"*).
2. **Daytona Provisioning**: An isolated cloud sandbox is created and a lightweight HTTP server is spun up in `/home/daytona/game`.
3. **Trigger.dev Agent Execution**: The `game-chat` agent streams reasoning steps to the frontend in real time.
4. **Resilient AI Calling**:
   - The engine calls Google Gemini models (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-2.5-flash`).
   - If Google free-tier quotas or 429 limits are encountered, it automatically switches to the Puter AI driver (`gpt-4o-mini`) without interrupting the user.
5. **Direct Sandbox Manipulation**: Tools write `index.html`, `style.css`, and `game.js` directly into the Daytona container.
6. **Live Preview Opening**: The split-pane preview automatically slides open and reloads via an internal revision counter so players can test their game instantly.

---

<div align="center">

**Made with 💖 by Vivek**

</div>
