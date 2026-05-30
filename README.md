# Rivet × Crewline — blue-collar hiring MVP

A **real, working full-stack web app** — the blue-collar equivalent of phiny (worker side, **Rivet**) and Crosslane (employer side, **Crewline**). Auth, a SQLite database, and a real matching engine. Both sides ship in one app.

Built with **zero npm dependencies** — it uses Node 22's built-in SQLite and crypto modules. That means no `npm install`, no native builds, no fragile toolchain. Just Node and one command.

---

## Run it (≈30 seconds)

Requires **Node.js ≥ 22.5** (`node --version` to check).

```bash
cd rivet-crewline
npm start            # = node --experimental-sqlite server.js
```

Open **http://localhost:3000**.

### Demo logins (password `demo1234` for all)
| Role | Email | Lands on |
|------|-------|----------|
| Worker (Rivet) | `marcus@rivet.test` | `/app` — readiness score + matches |
| Employer (Crewline) | `ops@sunvalley.test` | `/console` — overview + pipeline |

Or click **Get started** to sign up fresh as either side.

---

## What's real (not mocked)

- **Auth** — signup/login, scrypt-hashed passwords, signed-cookie sessions, worker/employer role separation and route guards.
- **Database** — SQLite (`data/rivet.db`), 5 tables: users, worker_profiles, credentials, jobs, applications. Seeds demo data on first run.
- **Matching engine** (`matching.js`) — every match score is computed live from trade fit (+ adjacency), pay vs. the worker's floor, location, and verified-credential coverage. Change a worker's credentials or a job's pay and the scores move.
- **Worker app (Rivet):** onboarding → readiness score → ranked job matches → job detail with score breakdown → one-tap apply → applications tracker → credential wallet (add a cert, watch readiness rise).
- **Employer console (Crewline):** overview KPIs + hot candidates → post a job (instantly matched) → 5-stage pipeline kanban (move candidates between stages) → recommended candidates → talent search with live filters.

---

## Demo script for the co-founders (≈4 min)

1. **Land on `/`** — the two-sided pitch. "phiny + Crosslane, rebuilt for the trades."
2. **Log in as Marcus (worker).** Show the readiness score, the ranked matches (note the % — it's computed), open a job to show the *why-you-match* breakdown.
3. **Add a credential** on the Work Card → readiness jumps → matches re-rank. This is the "single-player utility" wedge from the strategy.
4. **Log out, log in as the employer.** Overview → open the Electrician job → the kanban (Marcus is already in Interview) → drag-equivalent stage move.
5. **Talent Search** → filter to a trade → show the verified pool the worker side produced. That's the flywheel, live.

---

## Project layout

```
rivet-crewline/
├── server.js     HTTP server, router, sessions, all route handlers
├── db.js         schema + seed (Node built-in SQLite)
├── matching.js   readiness + match scoring (pure, testable)
├── views.js      server-rendered HTML
├── styles.css    design system
├── package.json  scripts only — no dependencies
└── data/         SQLite file (created on first run; git-ignore this)
```

## Maintaining & extending
- **Reset the DB:** `npm run reset` (deletes `data/`, reseeds on next start).
- **Auto-reload while editing:** `npm run dev`.
- **Tune matching:** all weights live in `scoreMatch()` / `readiness()` in `matching.js`.
- **Add a screen:** add a render fn in `views.js`, wire a route in `server.js`.

## Deploying to company servers
It's a single Node process — host it anywhere Node 22+ runs:
```bash
PORT=8080 RIVET_SECRET="a-long-random-string" RIVET_DATA_DIR=/var/lib/rivet npm start
```
- `RIVET_SECRET` — **set this in production** (signs session cookies).
- `RIVET_DATA_DIR` — where the SQLite file lives (use a persistent volume).
- Put it behind nginx/Caddy for TLS, or run in Docker (`FROM node:22-slim`, `CMD ["npm","start"]`).

## Honest limitations (this is an MVP)
- Credentials "auto-verify" in the demo — production needs real state-board / issuer verification (this is the moat; build it next).
- No file uploads, email, or background checks yet.
- Sessions are stateless cookies; SQLite suits a demo and a single node. Swap to Postgres when you scale horizontally.
