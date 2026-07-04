# Rivet × Crewline — blue-collar hiring platform

A real, working full-stack web app: the blue-collar equivalent of phiny (worker side, **Rivet**) and Crosslane (employer side, **Crewline**). Real auth (incl. Google Sign-In), a persistent database, and a live matching engine. Both sides ship in one small Node app.

**Live:** https://rivet-crewline.onrender.com

---

## Run it locally

Requires **Node.js ≥ 18**.

```bash
cd rivet-crewline
npm install
npm start
```

Open **http://localhost:3000**. With no database env vars set, it uses a local SQLite file at `data/rivet.db` (created and seeded on first run) — no account or setup needed.

### Demo logins (password `demo1234` for all)
| Role | Email | Lands on |
|------|-------|----------|
| Worker (Rivet) | `marcus@rivet.test` | `/app` — readiness score + matches |
| Employer (Crewline) | `ops@sunvalley.test` | `/console` — overview + pipeline |

Or click **Get started** to sign up fresh, or **Continue with Google** (when Google env vars are set).

---

## What's real (not mocked)

- **Auth** — email/password (scrypt-hashed) **and Google Sign-In (OAuth)**, signed-cookie sessions (`Secure` in production), worker/employer role separation and route guards.
- **Database** — libSQL (SQLite dialect). Local dev uses a file; production uses **Turso** so data persists across restarts/redeploys. 5 tables: users, worker_profiles, credentials, jobs, applications. Schema + demo data are created automatically on first boot.
- **Matching engine** (`matching.js`) — every match score is computed live from trade fit (+ adjacency), pay vs. the worker's floor, location, and verified-credential coverage. Change a worker's credentials or a job's pay and the scores move.
- **Worker app (Rivet):** onboarding → readiness score → ranked job matches → job detail with score breakdown → one-tap apply → applications tracker → credential wallet.
- **Employer console (Crewline):** overview KPIs + hot candidates → post a job (instantly matched) → 5-stage pipeline kanban → recommended candidates → talent search with live filters.

---

## Configuration (environment variables)

| Var | Required | Purpose |
|-----|----------|---------|
| `PORT` | no (default 3000) | HTTP port |
| `RIVET_SECRET` | **prod** | signs session cookies — set to a long random string |
| `TURSO_DATABASE_URL` | prod (for persistence) | `libsql://…turso.io` — when unset, falls back to a local file |
| `TURSO_AUTH_TOKEN` | with Turso | Turso database token |
| `RIVET_DATA_DIR` | no | where the local-file DB lives when Turso is not configured |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | enables the "Continue with Google" button (hidden when unset) |

Google OAuth redirect URI: `<base-url>/auth/google/callback` (the base URL is derived from the request host).

---

## Deployment

Deployed on **Render** via `render.yaml` (Infrastructure-as-Code blueprint): `npm install` build, `node server.js` start, free instance. A GitHub Actions cron (`.github/workflows/keepalive.yml`) pings `/healthz` every ~10 min so the free instance doesn't cold-start. Persistence is provided by a free Turso database.

It's a single Node process — host it anywhere Node 18+ runs (Render, Fly, a VM, or Docker via the included `Dockerfile`).

---

## Project layout

```
rivet-crewline/
├── server.js                  HTTP server, router, sessions, auth, all route handlers
├── db.js                      libSQL/Turso data layer, schema, seed + idempotent enrichment
├── matching.js                readiness + match scoring (pure, testable)
├── views.js                   server-rendered HTML (+ OG image)
├── styles.css                 design system
├── render.yaml                Render blueprint
├── Dockerfile                 container build
├── .github/workflows/         keepalive cron
└── data/                      local SQLite file (dev only; git-ignored)
```

## Maintaining & extending
- **Reset the local DB:** `npm run reset` (deletes `data/`, reseeds on next start). Does not touch a remote Turso DB.
- **Auto-reload while editing:** `npm run dev`.
- **Tune matching:** all weights live in `scoreMatch()` / `readiness()` in `matching.js`.
- **Add a screen:** add a render fn in `views.js`, wire a route in `server.js`.

## Honest limitations (still an MVP)
- Credentials "auto-verify" in the demo — production needs real state-board / issuer verification (this is the moat; build it next).
- No file uploads, email, or background checks yet.
- Sessions are stateless signed cookies; fine for this scale.
