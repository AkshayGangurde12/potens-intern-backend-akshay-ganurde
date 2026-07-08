<div align="center">

# 🔐 Tamper-Evident Log Service

**A production-ready, append-only audit log API with cryptographic SHA-256 hash chaining.**

Every log entry is cryptographically linked to the one before it.  
Tamper with any record and the entire chain breaks — instantly detectable.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Docker (Recommended)](#-docker-recommended)
  - [Local Development](#-local-development)
- [API Reference](#-api-reference)
- [Hash Chain Design](#-hash-chain-design)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Scripts](#-scripts)

---

## 🔍 Overview

This service provides a tamper-evident audit log backed by a cryptographic hash chain — similar in principle to blockchain, but purpose-built for lightweight audit logging.

Each log entry stores:
- The **SHA-256 hash of its own content** (actor + action + payload + timestamp)
- A **reference to the previous entry's hash** — forming an unbreakable chain

If anyone modifies a historical record directly in the database, the hash no longer matches and every subsequent hash in the chain breaks. A single `GET /api/verify` call detects this immediately.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔒 **Append-only records** | No `UPDATE` or `DELETE` — entries are immutable once written |
| ⛓️ **SHA-256 hash chaining** | Each entry's hash covers actor, action, payload, previousHash, and timestamp |
| 🔍 **Tamper detection** | Full chain verification walks every record and reports the first broken link |
| 🗝️ **API key auth** | Constant-time key comparison prevents timing-based enumeration attacks |
| 📄 **Structured logging** | Pino JSON logs with `x-api-key` header redacted |
| ✅ **Input validation** | Zod schemas with descriptive field-level error messages |
| 🚦 **Rate limiting** | Configurable fixed-window limiter per IP address |
| 📑 **Pagination** | Page/pageSize on log listing with total metadata |
| 📤 **Filtered export** | Export entries as JSON filtered by actor and/or date range |
| 🐳 **Docker-first** | Multi-stage build, non-root user, auto-migration on start |

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 18+ |
| Framework | Express | 4.x |
| Database | PostgreSQL | 15 |
| ORM | Prisma | 6.x |
| Validation | Zod | 3.x |
| Logging | Pino + pino-http | 8.x / 9.x |
| Security | Helmet + express-rate-limit | — |
| Testing | Jest + Supertest + fast-check | 29.x |
| Containerisation | Docker + Docker Compose | — |

---

## 🏗 Architecture

```
HTTP Request
     │
     ▼
┌─────────────────────────────────┐
│          Middleware Stack        │
│  Helmet → CORS → Body Parser    │
│  Pino Logger → Rate Limiter     │
│  Auth (x-api-key) → Validation  │
└────────────────┬────────────────┘
                 │
     ┌───────────▼───────────┐
     │      Controllers      │  ← thin HTTP in/out layer
     └───────────┬───────────┘
                 │
     ┌───────────▼────────────────────┐
     │          Services               │
     │                                 │
     │  LogService                     │
     │  ├─ HashService (SHA-256)       │
     │  └─ LogRepository (Prisma)      │
     │                                 │
     │  VerificationService            │
     │  └─ full chain integrity walk   │
     │                                 │
     │  ExportService                  │
     └─────────────────────────────────┘
                 │
     ┌───────────▼───────────┐
     │    PostgreSQL (Prisma) │
     └───────────────────────┘
```

**Key design decisions:**
- Controllers contain zero business logic — they only translate HTTP ↔ service calls
- `HashService` is a pure module with no I/O, making it fully unit-testable
- `VerificationService` reads directly from the repository to avoid circular dependencies through `LogService`
- Writes use Prisma transactions to prevent partial inserts

---

## 🚀 Getting Started

### Prerequisites

- **[Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/)** — recommended, no other dependencies needed
- **Node.js 18+** — only for local development
- **PostgreSQL 15** — only for local development without Docker

### Environment Variables

```bash
cp .env.example .env
```

Then edit `.env`:

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `API_KEY` | ✅ | — | Secret for `x-api-key` header on all `/api/*` routes |
| `PORT` | — | `3000` | HTTP port |
| `NODE_ENV` | — | `development` | `development` \| `production` |
| `LOG_LEVEL` | — | `info` | `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` |
| `CORS_ORIGIN` | — | `*` | Allowed CORS origin (restrict in production) |
| `RATE_LIMIT_MAX` | — | `100` | Max requests per window per IP |
| `RATE_LIMIT_WINDOW_MS` | — | `60000` | Rate limit window (ms) |
| `POSTGRES_USER` | — | `log_user` | Docker Compose DB user |
| `POSTGRES_PASSWORD` | — | `changeme` | Docker Compose DB password |
| `POSTGRES_DB` | — | `tamper_log` | Docker Compose DB name |

> ⚠️ **`API_KEY` is required.** All `/api/*` requests return `401` if it is missing or wrong.

---

### 🐳 Docker (Recommended)

The fastest way to run the full stack. No local Node.js or PostgreSQL needed.

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env and set API_KEY at minimum

# 2. Build and start Postgres + app
docker compose up --build

# Or using the npm shorthand:
npm run docker:up
```

On start the container automatically:
1. Waits for Postgres to be healthy
2. Runs `prisma migrate deploy`
3. Starts the Express server

```bash
# Stop containers (data volume is preserved)
docker compose down
# or
npm run docker:down
```

The API is available at **`http://localhost:3000`**

---

### 💻 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env

# 3. Start a local Postgres instance (or use Docker for just the DB)
docker compose up postgres -d

# 4. Run migrations
npm run migrate:dev

# 5. Generate Prisma client
npm run prisma:generate

# 6. Start the dev server (nodemon, auto-restarts on file changes)
npm run dev
```

The API is available at **`http://localhost:3000`**

---

## 📡 API Reference

### Authentication

All `/api/*` endpoints require:

```http
x-api-key: your-secret-api-key
```

Missing or invalid key → `401 Unauthorized`

---

### `GET /health`

Liveness + database connectivity check. **No auth required.** Designed for load balancers.

<details>
<summary>Response 200</summary>

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "uptime": 42.3
  }
}
```
</details>

---

### `POST /api/log`

Create a new log entry and append it to the hash chain.

```http
POST /api/log
Content-Type: application/json
x-api-key: your-key
```

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `actor` | string | ✅ | 1–100 characters |
| `action` | string | ✅ | 1–500 characters |
| `payload` | object | — | Any JSON object; omit or pass `null` |

```json
{
  "actor": "user:42",
  "action": "order.placed",
  "payload": {
    "orderId": "ord_001",
    "total": 99.99
  }
}
```

<details>
<summary>Response 201 — Created</summary>

```json
{
  "success": true,
  "message": "Log entry created",
  "data": {
    "id": "3f4a1c2d-8b5e-4f3a-9c1d-2e6f7a8b9c0d",
    "actor": "user:42",
    "action": "order.placed",
    "payload": { "orderId": "ord_001", "total": 99.99 },
    "previousHash": "a3f1e2d4...",
    "currentHash": "7b2e9c1f...",
    "createdAt": "2026-07-08T12:00:00.000Z"
  }
}
```
</details>

<details>
<summary>Response 422 — Validation error</summary>

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "actor", "message": "actor must be at least 1 character" }
  ]
}
```
</details>

---

### `GET /api/log/:id`

Retrieve a single entry by UUID. Includes an individual hash verification check for that entry.

```http
GET /api/log/3f4a1c2d-8b5e-4f3a-9c1d-2e6f7a8b9c0d
x-api-key: your-key
```

<details>
<summary>Response 200</summary>

```json
{
  "success": true,
  "data": {
    "entry": {
      "id": "3f4a1c2d-...",
      "actor": "user:42",
      "action": "order.placed",
      "payload": { "orderId": "ord_001", "total": 99.99 },
      "previousHash": "a3f1e2d4...",
      "currentHash": "7b2e9c1f...",
      "createdAt": "2026-07-08T12:00:00.000Z"
    },
    "verificationStatus": true
  }
}
```
</details>

<details>
<summary>Response 404 — Not found</summary>

```json
{
  "success": false,
  "error": "Log entry not found"
}
```
</details>

---

### `GET /api/logs`

Paginated list of all entries ordered by `createdAt ASC`.

```http
GET /api/logs?page=1&pageSize=20
x-api-key: your-key
```

| Query Param | Default | Description |
|---|---|---|
| `page` | `1` | Page number (1-indexed) |
| `pageSize` | `20` | Items per page |

<details>
<summary>Response 200</summary>

```json
{
  "success": true,
  "data": [ ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 87,
    "totalPages": 5
  }
}
```
</details>

---

### `GET /api/verify`

Walk the **entire** log chain in insertion order. Recomputes every SHA-256 hash and checks previousHash linkage. Reports the first broken entry if tampering is detected.

```http
GET /api/verify
x-api-key: your-key
```

<details>
<summary>Response 200 — Chain intact ✅</summary>

```json
{
  "success": true,
  "data": {
    "success": true,
    "totalEntries": 87
  }
}
```
</details>

<details>
<summary>Response 200 — Tampering detected ⚠️</summary>

```json
{
  "success": true,
  "data": {
    "success": false,
    "totalEntries": 87,
    "brokenEntryId": "3f4a1c2d-...",
    "reason": "Hash mismatch",
    "expectedHash": "7b2e9c1f...",
    "actualHash":   "deadbeef..."
  }
}
```
</details>

---

### `GET /api/export`

Export entries as a JSON array with optional filters. All query params are optional.

```http
GET /api/export?actor=user:42&from=2026-01-01T00:00:00Z&to=2026-12-31T23:59:59Z
x-api-key: your-key
```

| Query Param | Type | Description |
|---|---|---|
| `actor` | string | Filter by exact actor value |
| `from` | ISO-8601 datetime | Entries on or after this timestamp |
| `to` | ISO-8601 datetime | Entries on or before this timestamp |

<details>
<summary>Response 200</summary>

```json
{
  "success": true,
  "data": [
    {
      "id": "3f4a1c2d-...",
      "actor": "user:42",
      "action": "order.placed",
      "payload": { "orderId": "ord_001" },
      "previousHash": "a3f1...",
      "currentHash": "7b2e...",
      "createdAt": "2026-07-08T12:00:00.000Z"
    }
  ]
}
```
</details>

---

## ⛓️ Hash Chain Design

```
Genesis Entry                    Entry N                       Entry N+1
┌──────────────────┐            ┌──────────────────┐          ┌──────────────────┐
│ actor            │            │ actor            │          │ actor            │
│ action           │            │ action           │          │ action           │
│ payload          │            │ payload          │          │ payload          │
│ previousHash:"0" │──SHA-256──▶│ previousHash ────┼─SHA-256─▶│ previousHash     │
│ createdAt        │            │ createdAt        │          │ createdAt        │
│                  │            │                  │          │                  │
│ currentHash: H1  │            │ currentHash: H2  │          │ currentHash: H3  │
└──────────────────┘            └──────────────────┘          └──────────────────┘
```

**Serialisation format** (field order is fixed and must never change):

```
actor | action | JSON.stringify(payload) | previousHash | createdAt.toISOString()
```

Fields are joined with `|` and hashed with SHA-256.

**Rules:**
- The genesis entry uses the sentinel string `"0"` as `previousHash` (stored as `null` in the DB, resolved to `"0"` for hashing)
- Every subsequent entry uses the `currentHash` of the immediately preceding entry
- Modifying any historical field changes that entry's hash, which breaks the `previousHash` reference in the next entry, cascading forward through the entire chain

---

## 📁 Project Structure

```
.
├── src/
│   ├── app.js                        # Express app factory & middleware stack
│   ├── server.js                     # HTTP server entry point
│   ├── config/
│   │   ├── env.js                    # Validated environment config
│   │   └── database.js               # Prisma client singleton
│   ├── constants/                    # HTTP status codes, messages, route strings
│   ├── controllers/
│   │   ├── log.controller.js         # Log endpoint handlers
│   │   └── health.controller.js      # Health check handler
│   ├── errors/
│   │   └── AppError.js               # Custom error class
│   ├── lib/
│   │   └── logger.js                 # Pino logger instance
│   ├── middlewares/
│   │   ├── auth.middleware.js        # API key validation (timing-safe)
│   │   ├── error.middleware.js       # 404 + global error handler
│   │   ├── validate.middleware.js    # Zod body validation
│   │   └── requestLogger.js         # Per-request logging
│   ├── repositories/
│   │   └── log.repository.js        # All Prisma queries (data access layer)
│   ├── routes/
│   │   ├── log.routes.js            # /api/* routes
│   │   └── health.routes.js         # /health route
│   ├── services/
│   │   ├── hash.service.js          # SHA-256 computation & chain verification
│   │   ├── log.service.js           # Create, read, list, export logic
│   │   ├── verification.service.js  # Full-chain integrity verification
│   │   └── export.service.js        # Export facade
│   ├── utils/
│   │   ├── asyncHandler.js          # Async error wrapper for Express
│   │   ├── pagination.js            # Page/pageSize parsing & meta builder
│   │   ├── response.helper.js       # Consistent JSON response helpers
│   │   ├── crypto.js                # Crypto utilities
│   │   └── date.js                  # Date utilities
│   └── validators/
│       └── log.validator.js         # Zod schemas (CreateLog, ExportFilter)
│
├── prisma/
│   ├── schema.prisma                # LogEntry data model
│   └── migrations/                  # Auto-generated migration SQL
│
├── tests/
│   ├── unit/                        # Unit tests — services, middlewares
│   ├── integration/                 # Integration tests — full HTTP via Supertest
│   └── property/                    # Property-based tests via fast-check
│
├── .env.example                     # Environment variable template
├── docker-compose.yml               # Postgres + app services
├── Dockerfile                       # Multi-stage production build
└── jest.config.js                   # Jest configuration
```

---

## 🧪 Testing

The test suite enforces **80% line and function coverage** and runs across three layers:

| Layer | Tool | What it tests |
|---|---|---|
| Unit | Jest | Services and middlewares in isolation with mocked dependencies |
| Integration | Jest + Supertest | Full HTTP request/response cycle against the real Express app |
| Property-based | Jest + fast-check | Hash-chain invariants across randomly generated inputs |

```bash
# Run the full test suite
npm test

# Run with coverage report (enforces 80% threshold)
npm run test:coverage
```

> **Integration tests need a database.**
> Spin up Postgres before running them locally:
> ```bash
> docker compose up postgres -d
> ```

---

## 📜 Scripts

| Script | Command | Description |
|---|---|---|
| `start` | `node src/server.js` | Start in production mode |
| `dev` | `nodemon src/server.js` | Start with auto-reload (development) |
| `test` | `jest --forceExit` | Run all tests once |
| `test:coverage` | `jest --coverage --forceExit` | Run tests with coverage report |
| `lint` | `eslint src --ext .js` | Lint source files |
| `format` | `prettier --write "src/**/*.js"` | Format source files |
| `migrate:dev` | `prisma migrate dev` | Create and apply a new migration (dev) |
| `migrate:deploy` | `prisma migrate deploy` | Apply pending migrations (production) |
| `prisma:generate` | `prisma generate` | Regenerate Prisma client |
| `docker:up` | `docker compose up --build` | Build and start full Docker stack |
| `docker:down` | `docker compose down` | Stop and remove containers |

---

<div align="center">

Built with Node.js · Express · PostgreSQL · Prisma · Docker

</div>
#   p o t e n s - i n t e r n - b a c k e n d - s h r e y a s - t h o m b a l  
 