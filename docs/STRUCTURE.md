# Project Structure

## Table of Contents

- [Overview](#overview)
- [Root Layout](#root-layout)
- [Apps](#apps)
- [Packages](#packages)
- [Configuration Files](#configuration-files)
- [Commands](#commands)

---

## Overview

Xamsa is a monorepo managed with [Turborepo](https://turbo.build/repo) and [Bun](https://bun.sh). Apps and shared packages live in one repository, with tasks orchestrated through Turborepo.

Top-level directories:

- **`apps/`** — Deployable applications.
- **`packages/`** — Internal libraries consumed by apps (and sometimes each other).

---

## Root Layout

```
xamsa/
├── .changeset/             → Changesets config and pending change notes
├── .github/                → GitHub workflows, community docs, label config
├── .vscode/                → Shared VS Code settings
├── apps/                   → Applications
├── docs/                   → Project documentation (e.g. SETUP, STRUCTURE)
├── packages/               → Shared packages
├── biome.json              → Biome linter and formatter
├── bts.jsonc               → Better-T-Stack generator metadata
├── bun.lock                → Bun lockfile (committed)
├── commitlint.config.mjs   → Commitlint rules (conventional commits)
├── lefthook.yml            → Git hooks (pre-commit Biome, commit-msg Commitlint)
├── package.json            → Root workspace and scripts (`prepare` runs lefthook install)
├── README.md               → Quick start and overview
├── terms.md                → Project terms (if applicable)
├── tsconfig.json           → Root TypeScript references / base path
└── turbo.json              → Turborepo pipeline and global env keys
```

---

## Apps

```
apps/
└── web/        → Full-stack app (TanStack Start, React, Vite, Nitro)
```

### `web`

Single deployable surface: quiz/game flows, packs, auth UI, and oRPC API routes colocated in the TanStack Start app. Realtime features use Ably; the API layer is implemented in `@xamsa/api` and mounted from the app.

- **Stack:** TanStack Start (TanStack Router), Vite, Nitro
- **Dev server:** default port `3001` (`apps/web/vite.config.ts`)
- **Product version:** CalVer in `src/data/app-releases-meta.ts`; release copy in `src/data/app-releases-data.ts` (structured highlights, no JSX); `/whats-new/` lists releases; Settings shows the current label via `src/lib/app-release.ts`.

---

## Packages

```
packages/
├── ably/       → Ably server/client helpers
├── api/        → oRPC routers, modules, business logic
├── auth/       → Better Auth configuration and helpers
├── config/     → Shared TS/Biome/tsconfig presets
├── db/         → Prisma schema, client, migrations, seeds
├── env/        → Type-safe env (t3-env + Zod) for server and Vite
├── mail/       → Transactional email (Resend)
├── schemas/    → Shared Zod schemas (API, DB-derived, etc.)
├── ui/         → Shared UI (shadcn-style components, Tailwind)
└── utils/      → Shared utilities
```

### `api`

oRPC procedure definitions and domain modules (games, packs, users, etc.). The `web` app imports the router and exposes it over HTTP.

- **Scope:** `@xamsa/api`

### `auth`

Better Auth setup shared with the app and API.

- **Scope:** `@xamsa/auth`

### `ably`

Ably integration for realtime channels.

- **Scope:** `@xamsa/ably`

### `config`

Base `tsconfig`, Biome-related shared config, etc.

- **Scope:** `@xamsa/config`

### `db`

Prisma schema (`prisma/schema/`), generated client, migrations, seed scripts. All DB access goes through this package.

- **Scope:** `@xamsa/db`

### `env`

Validated environment variables for server (`@xamsa/env/server`) and the Vite client (`@xamsa/env/web`).

- **Scope:** `@xamsa/env`

### `mail`

Email sending via Resend.

- **Scope:** `@xamsa/mail`

### `schemas`

Zod schemas shared between client and server.

- **Scope:** `@xamsa/schemas`

### `ui`

Shared components and global styles for the web app.

- **Scope:** `@xamsa/ui`

### `utils`

Small shared helpers (e.g. slugify, constants).

- **Scope:** `@xamsa/utils`

---

## Configuration Files

### `turbo.json`

Task graph, caching, and `globalEnv` keys passed through to tasks that need secrets (e.g. `DATABASE_URL`, auth, Ably, mail).

| Task          | Description             | Cached | Notes                     |
| ------------- | ----------------------- | ------ | ------------------------- |
| `build`       | Build packages and apps | Yes    | Depends on `^build`       |
| `dev`         | Dev servers             | No     | Long-running              |
| `lint`        | Lint                    | Yes    | Depends on `^lint`        |
| `check-types` | Typecheck               | Yes    | Depends on `^check-types` |
| `db:generate` | Prisma generate         | No     | —                         |
| `db:migrate`  | Prisma migrate dev      | No     | Interactive / persistent  |
| `db:deploy`   | Prisma migrate deploy   | No     | Used in build pipeline    |
| `db:push`     | Prisma db push          | No     | Local prototyping         |
| `db:studio`   | Prisma Studio           | No     | Persistent                |
| `db:seed`     | Seed scripts            | No     | —                         |

### `biome.json`

[Biome](https://biomejs.dev) is the single formatter and linter for the repo.

### `lefthook.yml`

[Lefthook](https://github.com/evilmartians/lefthook) runs **Biome** on staged files before commit and **Commitlint** on the commit message. Hooks are installed by the root **`prepare`** script (`lefthook install`), which runs after `bun install`. Existing clones that predate `prepare` should run `bun run prepare` once.

### `commitlint.config.mjs`

[Commitlint](https://commitlint.js.org) enforces conventional commits; scopes match this repo (`web`, `packages/*` names, `deps`, `ci`, `root`, `release`).

### `tsconfig.json` (root)

Root TypeScript configuration; packages and apps extend shared config from `@xamsa/config` where applicable.

### `bts.jsonc`

Metadata from the [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) generator (stack choices, addons).

---

## Commands

Run from the **repository root**.

### Development

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `bun run dev`     | Start Turborepo `dev` (e.g. web app) |
| `bun run dev:web` | Start only the `web` app             |

Ensure `apps/web/.env` is populated so server code and Prisma can run.

### Build

| Command         | Description                              |
| --------------- | ---------------------------------------- |
| `bun run build` | `db:deploy` then build all packages/apps |

### Code quality

| Command               | Description                                |
| --------------------- | ------------------------------------------ |
| `bun run check`       | Biome check with write (format + lint fix) |
| `bun run check-types` | TypeScript across the monorepo             |
| `bun run changeset`   | Add a Changesets note for package releases |

### Database

| Command               | Description                                 |
| --------------------- | ------------------------------------------- |
| `bun run db:generate` | Generate Prisma client                      |
| `bun run db:migrate`  | Create/apply migrations (dev workflow)      |
| `bun run db:push`     | Push schema without migrations (local only) |
| `bun run db:studio`   | Open Prisma Studio                          |
| `bun run db:seed`     | Run seed scripts                            |

### Turborepo filters

Target one package or app:

```bash
bunx turbo run build --filter=web
bunx turbo run dev --filter=web
bunx turbo run check-types --filter=@xamsa/api
```

Use `...` suffix to include dependencies, e.g. `web...`.
