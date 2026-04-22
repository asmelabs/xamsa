# Contributing

Thank you for contributing to Xamsa. This document covers the rules and conventions for working on the project. Please read it before making changes.

For local setup, see the [Setup Guide](/docs/SETUP.md). For the monorepo layout, see [Project Structure](/docs/STRUCTURE.md).

## Table of Contents

- [Branch Strategy](#branch-strategy)
- [Making Changes](#making-changes)
- [Commit Conventions](#commit-conventions)
- [Changesets](#changesets)
- [Pull Requests](#pull-requests)
- [Code Quality](#code-quality)
- [Dependencies](#dependencies)

---

## Branch Strategy

### Long-lived branch

| Branch | Purpose                                   | Deploys To |
| ------ | ----------------------------------------- | ---------- |
| `main` | Production. Keep stable and deployable.   | Production |

**Do not commit directly to `main` when your team uses pull requests.** Create a short-lived branch and merge via PR.

### Short-lived branches

Branch from **`main`**, open a PR back into **`main`**.

| Prefix      | Purpose                                    | Example                          |
| ----------- | ------------------------------------------ | -------------------------------- |
| `feature/`  | New features                               | `feature/pack-rating`            |
| `fix/`      | Bug fixes                                  | `fix/game-buzz-race`             |
| `refactor/` | Restructure without behavior change        | `refactor/api-pack-service`      |
| `chore/`    | Tooling, config, dependency updates        | `chore/bump-prisma`              |
| `docs/`     | Documentation                              | `docs/setup-env`                 |
| `test/`     | Tests                                      | `test/pack-schemas`              |
| `perf/`     | Performance                                | `perf/leaderboard-query`         |

### Workflow

```
1. Pull latest main
   git checkout main
   git pull origin main

2. Create your branch
   git checkout -b feature/your-feature

3. Make changes, commit, push

4. Open a PR into main

5. After review → merge (squash if that’s team policy)
```

### Branch naming

Use lowercase kebab-case, descriptive but concise:

```
✅  feature/host-controls
✅  fix/auth-session-cookie

❌  feature/newFeature
❌  fix/bug
```

---

## Making Changes

### Where to work

- **API procedures / domain logic?** → `packages/api`
- **Database schema / migrations?** → `packages/db`
- **Shared UI?** → `packages/ui`
- **Shared Zod schemas?** → `packages/schemas`
- **Utilities?** → `packages/utils`
- **Auth configuration?** → `packages/auth`
- **Email?** → `packages/mail`
- **Ably / realtime helpers?** → `packages/ably`
- **Env validation?** → `packages/env`
- **App routes, pages, app-specific components?** → `apps/web`

If unsure, see [Project Structure](/docs/STRUCTURE.md) or ask in the PR.

### General rules

- Keep PRs focused: one concern per PR.
- Test locally before pushing.
- If your change touches multiple packages, run `bun run build` before opening a PR.
- For **schema changes you intend to merge**, use **migrations** (`bun run db:migrate`), not `db:push`. Reserve `db:push` for quick local experiments.

---

## Commit Conventions

Commits must follow [Conventional Commits](https://www.conventionalcommits.org). **[Commitlint](https://commitlint.js.org)** runs on the `commit-msg` hook via Lefthook. Messages that do not match [commitlint.config.mjs](/commitlint.config.mjs) are rejected.

Merge commits, Dependabot, release automation, and similar are **ignored** by Commitlint (see the `ignores` array in that file).

### Format

```
type(scope): description
```

Use imperative, lowercase description, no trailing period.

### Types

Allowed types are defined in `commitlint.config.mjs`. They include:

| Type       | When to use                                                   |
| ---------- | ------------------------------------------------------------- |
| `feat`     | New feature                                                   |
| `fix`      | Bug fix                                                       |
| `refactor` | Internal change, same behavior                                |
| `chore`    | Tooling, deps, housekeeping                                   |
| `docs`     | Documentation only                                            |
| `style`    | Formatting-only (not CSS/UI design)                           |
| `test`     | Tests                                                         |
| `perf`     | Performance                                                   |
| `ci`       | CI/CD                                                         |
| `build`    | Build system or dependency wiring                             |
| `revert`   | Revert a prior commit                                         |
| `merge`    | Merge-related (when applicable)                               |
| `release`  | Release / versioning (often automation)                     |
| `wip`      | Work in progress (use sparingly)                              |

### Scopes

Scopes are **required to be one of the allowed values** when you include a scope; see `commitlint.config.mjs` for the full list. Typical values:

**App:** `web`

**Packages:** `api`, `auth`, `ably`, `config`, `db`, `env`, `mail`, `schemas`, `ui`, `utils`

**Other:** `deps`, `ci`, `root`, `release`

### Examples

```
feat(api): add pack rating procedure
feat(web): improve host game controls
fix(auth): correct session cookie path
chore(db): add migration for pack publish timestamp
docs(root): clarify env file location
```

---

## Changesets

[Changesets](https://github.com/changesets/changesets) track meaningful changes to shared packages and support changelog generation. Configuration lives in [.changeset/config.json](/.changeset/config.json) with `baseBranch: main`.

### When to create a changeset

Add a changeset when your PR changes behavior or the public surface of a **workspace package** under `packages/` (for example `api`, `db`, `ui`, `schemas`).

**You usually do not need a changeset for:**

- Changes only under `apps/web` that do not alter shared package APIs
- Documentation-only PRs
- CI or dev-tooling-only changes

### How to create a changeset

```bash
bun run changeset
```

Follow the prompts, then commit the new file under `.changeset/`. Release automation (if you add it later) often uses commit subjects like `Version Packages` or `chore(release)`; those are ignored by Commitlint.

---

## Pull Requests

### Before opening a PR

1. Rebase or merge the latest `main`.
2. Run:
   ```bash
   bun run check
   bun run check-types
   ```
3. Confirm the project builds:
   ```bash
   bun run build
   ```
4. If you changed a shared package in a way users or other packages care about, include a changeset.
5. For UI changes, add screenshots or a short recording when helpful.

### Guidelines

- **Title:** `type(scope): description` when possible.
- **Description:** What changed, why, and how to verify.
- Keep PRs small; split large work when you can.
- Link issues when applicable.

### Review

- Wait for required approvals per team policy.
- Address review feedback in the thread.

---

## Code Quality

### Automated checks (Lefthook)

Hooks install automatically after `bun install` via the root `prepare` script. If you cloned the repo before that existed, run `bun run prepare` once.

| Hook        | What runs                    | Blocks on failure |
| ----------- | ---------------------------- | ----------------- |
| `pre-commit` | Biome on staged files       | Yes               |
| `commit-msg` | Commitlint on the message   | Yes               |

Do **not** bypass hooks with `--no-verify` except in emergencies; fix the reported issue instead.

### Manual checks

```bash
bun run check
bun run check-types
```

### Style

- Let Biome format and lint the code.
- Prefer TypeScript; avoid `any` without a short justification.
- Prefer named exports unless the framework expects a default.
- Keep files focused and names clear.

---

## Dependencies

### Adding a dependency

Install in the **app or package that needs it**:

```bash
bun add <package> --filter=web
bun add <package> --filter=@xamsa/ui
bun add -D <package> --filter=@xamsa/api
```

Use the **root** only for repo-wide tooling (e.g. Turborepo, Biome, Lefthook, Commitlint, Changesets).

### Before adding

- Check existing `packages/*` for the same capability.
- Prefer maintained packages with good TypeScript support.
- For large or opinionated deps, align with maintainers first.
