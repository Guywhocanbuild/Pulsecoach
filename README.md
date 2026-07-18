# 🔴 PulseCoach

**An AI health companion that reads your real data and talks back — on web and iOS, from one backend.**

Week 02 of the [52-App Challenge](https://github.com/Guywhocanbuild) — building 52 apps in 52 weeks to demonstrate full-stack + iOS engineering to founders and hiring teams.

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Groq](https://img.shields.io/badge/AI-Groq%20Llama%203.3%2070B-F55036)
![SwiftUI](https://img.shields.io/badge/iOS-SwiftUI-0066CC?logo=swift&logoColor=white)
![HealthKit](https://img.shields.io/badge/Apple-HealthKit-000000?logo=apple&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## What it does

PulseCoach connects an LLM intelligence layer directly to your health data. Tell it *"I drank
300ml of water"* in plain English, and it parses the intent, extracts the quantity, and writes
straight to the database via tool-calling — no regex, no manual parsing, no forms required
(though those exist too, for when you'd rather just type a number).

- **Real tool-calling AI coach** — Groq (Llama 3.3 70B) streams responses and autonomously
  decides when a message should be logged as a health action
- **Two full clients, one backend** — vanilla JS web app and a native SwiftUI iOS app, both
  speaking the identical JSON contract
- **HealthKit on iOS**, with a manual-entry + demo-data fallback on web (and in the Simulator,
  where HealthKit returns no real data by design)
- **Editable goals** with sane human bounds — no one's setting a 100,000ml water target
- **Full auth flow** — register, login, forgot/reset password, login security alerts, all via
  Resend's HTTPS API (Railway blocks outbound SMTP entirely)

---

## Screenshots

| Web — Dashboard | iOS — Dashboard |
|---|---|
| ![Web dashboard](docs/screenshots/web-dashboard.png) | ![iOS dashboard](docs/screenshots/ios-dashboard-2.png) |

| Web — Coach chat | iOS — Auth |
|---|---|
| ![Web chat](docs/screenshots/web-chat.png) | ![iOS auth](docs/screenshots/ios-auth.png) |

Full case study with design rationale, architecture decisions, and a real debugging trail:
[**PulseCoach-Case-Study.pdf**](./PulseCoach-Case-Study.pdf)

---

## Architecture

```
┌────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  SwiftUI App    │     │   Express Server       │     │  MongoDB Atlas   │
│  (iOS/Simulator)│────▶│  /api/auth               │────▶│  Users            │
│                 │ JWT │  /api/health              │     │  HealthLogs       │
│  HealthKit ──┐  │     │  /api/coach/chat           │     └─────────────────┘
└──────────────┼──┘     │  express.static(public/) ───┼──▶ also serves the
               │        └──────────────┬──────────────┘    Web Client below
               ▼                       │ SSE stream
   (Simulator: falls back              ▼
    to manual/demo data,      ┌──────────────────────┐
    same as web)                │   Groq API             │
                                │  Llama 3.3 70B          │
                                │  + tool calling          │
                                └──────────────────────┘
```

One Express server does triple duty: REST API, static file host for the web client
(`express.static`), and the streaming bridge to Groq. Both frontends hit the exact same routes.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Node.js, Express | Single server for API + both frontends |
| Database | MongoDB Atlas, Mongoose | Flexible schema across varied metric types |
| Auth | JWT, bcrypt | Stateless, reused pattern from a prior project |
| AI | Groq — Llama 3.3 70B | Fast inference, OpenAI-compatible tool-calling |
| Email | Resend | HTTPS API — Railway blocks outbound SMTP |
| Web frontend | Vanilla JS, Chart.js | No build step, fast iteration |
| iOS | SwiftUI, Swift Charts, HealthKit | Native performance, real on-device health data |

---

## API reference

All routes prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` | Sends welcome email |
| POST | `/auth/login` | `{ email, password }` | Sends login security alert |
| GET | `/auth/me` | — | 🔒 |
| POST | `/auth/forgot-password` | `{ email }` | Always returns generic message (no email enumeration) |
| POST | `/auth/reset-password` | `{ token, password }` | Token expires in 15 min |
| PATCH | `/auth/goals` | `{ dailyWaterML, dailyStepGoal, dailyActiveEnergyGoal, dailySleepHours }` | 🔒 Bounded server-side |

### Health data

| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/health/log` | `{ type, value, source?, loggedAt? }` | 🔒 Backdatable, value bounds enforced per type |
| DELETE | `/health/log/:id` | — | 🔒 Scoped to requesting user only |
| GET | `/health/today` | — | 🔒 Aggregated snapshot |
| GET | `/health/today/logs` | — | 🔒 Individual entries, for the delete-log UI |
| GET | `/health/weekly` | — | 🔒 Last 7 days, raw entries |
| POST | `/health/demo` | `{ shuffle? }` | 🔒 Fixed dataset by default; `shuffle:true` for random |

### Coach

| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/coach/chat` | `{ message, healthSnapshot? }` | 🔒 SSE stream — `text`, `log_created`, `error`, `done` events |

---

## Running locally

```bash
git clone https://github.com/Guywhocanbuild/pulsecoach.git
cd pulsecoach
npm install
cp .env.example .env   # fill in your own Mongo URI, JWT secret, Groq + Resend keys
npm run dev
```

Open the URL it prints (`http://localhost:5001` by default — port 5000 is often reserved by
AirPlay Receiver on macOS). The same server hosts the web client, the API, and the AI chat
endpoint — no separate frontend process needed.

For iOS: open `PulseCoachiOS/` in Xcode, add the HealthKit capability, add the required
`NSHealthShareUsageDescription` / `NSHealthUpdateUsageDescription` Info.plist entries, and run
on Simulator or a real device (HealthKit only returns real data on-device).

---

## A note on credentials

Every API key, database connection string, and JWT secret used during development has been
rotated. `.env.example` ships with placeholder values only — nothing in this repository or the
accompanying case study PDF contains a live credential.

---

## What's next

Part of a 52-week build challenge. Next up: deployment (Railway), then Week 03.

**Guy Who Can Build** — [github.com/Guywhocanbuild](https://github.com/Guywhocanbuild)
