# Setup

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database](#database)
- [Running the App](#running-the-app)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Make sure you have the following installed before proceeding.

### Git

Version control system. Required for cloning the repo.

- **macOS:** Most systems have it pre-installed. Check with `git --version`. If not installed: `xcode-select --install`
- **Linux (Ubuntu/Debian):** `sudo apt install git`
- **Windows:** Download from [git-scm.com/downloads](https://git-scm.com/downloads). During installation, select "Git from the command line and also from 3rd-party software."

### Bun

JavaScript/TypeScript runtime and package manager for this monorepo. The repo pins a version via `packageManager` in the root `package.json`.

- **macOS/Linux:**
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```
- **Windows (PowerShell):**
  ```powershell
  powershell -c "irm bun.sh/install.ps1 | iex"
  ```

Verify: `bun --version` (use a version compatible with the `packageManager` field, currently Bun 1.3.x).

Docs: [bun.sh/docs/installation](https://bun.sh/docs/installation)

### PostgreSQL

The app uses PostgreSQL with Prisma. Install a local server or use a hosted instance, and have a connection URL ready for `DATABASE_URL`.

### VS Code (optional)

Download from [code.visualstudio.com](https://code.visualstudio.com).

The repo includes `.vscode/settings.json` for shared editor defaults. If you add `.vscode/extensions.json` later, use the command palette → "Extensions: Show Recommended Extensions" to install suggested extensions.

---

## Installation

### 1. Clone the repository

```bash
git clone <repo-url>
cd xamsa
```

### 2. Install dependencies

```bash
bun install
```

This installs dependencies for all apps and packages via Bun workspaces.

The root **`prepare`** script runs **`lefthook install`**, which registers Git hooks (Biome on pre-commit, Commitlint on commit messages). If hooks never run after clone, execute `bun run prepare` once from the repo root.

---

## Configuration

### Environment variables

Secrets and config are **not** committed. Create a file at **`apps/web/.env`**. Prisma CLI is configured to load that file from `packages/db` (see `packages/db/prisma.config.ts`), and the TanStack Start app reads the same file at runtime.

Use `@xamsa/env` as the source of truth: server variables are validated in `packages/env/src/server.ts`, and client (Vite) variables in `packages/env/src/web.ts`.

**Server (`apps/web/.env`) — required for a full local run:**

| Variable | Notes |
| -------- | ----- |
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | At least 32 characters |
| `BETTER_AUTH_URL` | Base URL **of the deployment that serves `/api/auth`** — same origin clients use (scheme + host + port). If the app loads at `http://localhost:3001`, use that, not `:3000` |
| `BETTER_AUTH_API_KEY` | API key expected by Better Auth |
| `BCRYPT_SALT_ROUNDS` | Integer ≥ 1 |
| `ABLY_API_KEY` | Ably realtime |
| `RESEND_API_KEY` | Transactional email (Resend) |
| `EMAIL_FROM` | Sender address (valid email) |
| `CORS_ORIGIN` | Allowed origins; comma-separated URLs if more than one |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name (profile images) |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Web client ID (Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret for the same client |

**Google sign-in:** In Google Cloud Console, add authorized redirect URIs that match your app’s auth base URL plus `/api/auth/callback/google` (for example `http://localhost:3001/api/auth/callback/google` when `BETTER_AUTH_URL` is `http://localhost:3001`). The URI must match exactly.

**Transactional email:** `RESEND_API_KEY` and `EMAIL_FROM` power password reset messages from Better Auth. In **production**, users receive the reset link by email. In **development**, the link is printed to the server console instead.

**Optional:**

| Variable | Notes |
| -------- | ----- |
| `NODE_ENV` | `development` (default), `production`, or `test` |
| `SEND_NOTIFICATION_EMAIL_IN_DEV` | Optional. Set to `true` to send follower / game-winner emails via Resend when `NODE_ENV` is not `production`. Production sends these regardless. |
| `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` | Client PostHog token |
| `VITE_PUBLIC_POSTHOG_HOST` | PostHog host |
| `VITE_PUBLIC_SITE_URL` | Canonical public origin used for metadata and absolute URLs |
| `VITE_PUBLIC_BETTER_AUTH_URL` | Only if the SPA origin ≠ auth API origin (e.g. dev :3000 vs :3001). Omit when app and `/api/auth` share the same host — **do not** reuse `VITE_PUBLIC_SITE_URL` here (`www` vs apex causes CORS). Must match `BETTER_AUTH_URL` when set |

Never commit `.env` or secrets. `.gitignore` already excludes `.env` and `.env*.local`.

**OAuth / CSRF (“state_mismatch”)**

Better Auth verifies Google (and other) OAuth callbacks with short-lived verification state. Seeing a second request to `/api/auth/callback/google` (prefetch, double navigation, or automation) consume the same `state` can log an error **after** the first request already succeeded. In DevTools, confirm whether there are duplicate callback requests.

Keep **`BETTER_AUTH_URL`** equal to the exact origin that serves `/api/auth` for each deployment host (including `www` vs apex). **Do not** copy your canonical `VITE_PUBLIC_SITE_URL` into the auth client unless that is literally the host in the user’s address bar — otherwise API calls become cross-origin and browsers block them (CORS), e.g. on **sign out**. Set **`VITE_PUBLIC_BETTER_AUTH_URL`** only when the SPA runs on a different origin than the auth API (common in local dev); when the app and `/api/auth` share the same origin, leave it unset so the client uses `window.location.origin`.

---

## Database

We use [Prisma](https://www.prisma.io) with PostgreSQL. The schema lives under `packages/db/prisma/`.

### Initial setup

From the repo root:

```bash
# Generate the Prisma client (also runs on postinstall for @xamsa/db)
bun run db:generate
```

Then either:

- **Migrations (recommended for work you will commit):**  
  `bun run db:migrate` — runs `prisma migrate dev` in `@xamsa/db` and applies migrations from `packages/db/prisma/migrations/`.

- **Quick local sync (prototyping only):**  
  `bun run db:push` — pushes the schema without creating a migration. Prefer migrations for shared schema changes.

### After pulling changes

If the schema or migrations changed:

```bash
bun run db:generate
bun run db:migrate
```

(Use `db:deploy` in CI/production-style flows; the `web` app build runs migrate deploy as part of its build script.)

### Prisma Studio

```bash
bun run db:studio
```

### Seed data (optional)

```bash
bun run db:seed
```

---

## Running the App

### Development

Start all dev tasks (currently the `web` app via Turborepo):

```bash
bun run dev
```

Start only the web app:

```bash
bun run dev:web
```

The Vite dev server defaults to **[http://localhost:3001](http://localhost:3001)** (see `apps/web/vite.config.ts`).

### Build

```bash
bun run build
```

Root `build` runs `db:deploy` via Turborepo, then builds packages and apps. Ensure `DATABASE_URL` and other server env vars are set when you run a production build locally.

---

## Troubleshooting

### VS Code not showing TypeScript errors

Make sure `"typescript.validate.enable"` is **not** set to `false` in your user settings. Try restarting the TS server: `Cmd+Shift+P` / `Ctrl+Shift+P` → "TypeScript: Restart TS Server."

### Biome not formatting on save

Check that the Biome extension is installed if you rely on it. From the repo root, `bun run check` applies Biome with write. Lefthook also runs Biome on pre-commit.

### Prisma cannot find `DATABASE_URL`

Confirm `apps/web/.env` exists and contains `DATABASE_URL`. Prisma loads that path from `packages/db/prisma.config.ts`.

### Prisma client errors after pulling

```bash
bun run db:generate
bun run db:migrate
```

### Bun lockfile conflicts

Do not hand-merge `bun.lock`. Regenerate:

```bash
rm bun.lock
bun install
```

### OAuth logged `state_mismatch` after login still works

This is often a **duplicate** GET to `/api/auth/callback/google` after the flow already succeeded. Inspect the Network panel for duplicate callbacks. Align `BETTER_AUTH_URL`, Google’s authorized redirect URIs (`{BETTER_AUTH_URL}/api/auth/callback/google`), and optional `VITE_PUBLIC_BETTER_AUTH_URL` per [Configuration](#configuration).

### Port already in use

The dev server uses port **3001** by default.

- **macOS/Linux:** `lsof -i :3001` then `kill -9 <PID>`
- **Windows:** `netstat -ano | findstr :3001` then `taskkill /PID <PID> /F`
