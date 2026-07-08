# Implementation Plan: Tamper-Evident Log Service — Full Production Implementation

## Overview

This plan covers the complete production-ready implementation across all nine phases: project foundation, core infrastructure, database layer, cryptographic hash chain, business logic, API layer, testing, deployment, and documentation. All tasks use TypeScript. Each task builds on previous ones; no orphaned code is left unwired. Tasks marked `*` are optional and will not be auto-implemented.

---

## Phase 1 — Project Foundation

_Scaffold the project: folder structure, TypeScript config, environment config, Prisma schema, Express app factory, Pino logger, health endpoint, rate limiting, and initial tests._

## Tasks

- [x] 1. Scaffold project structure and version-control hygiene
  - [x] 1.1 Create top-level directories and placeholder files
    - Create `src/config/`, `src/controllers/`, `src/services/`, `src/repositories/`, `src/routes/`, `src/middlewares/`, `src/validators/`, `src/utils/`, `src/interfaces/`, `src/types/`, `src/constants/`, `src/errors/`, `src/lib/` (each with a `.gitkeep`)
    - Create `prisma/`, `tests/property/`, `tests/integration/`, `logs/` directories
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [x] 1.2 Create `.gitignore`
    - Exclude `node_modules/`, `dist/`, `.env`, `logs/`
    - _Requirements: 12.2_

  - [x] 1.3 Create `.env.example`
    - Document every variable: `PORT`, `NODE_ENV`, `DATABASE_URL`, `LOG_LEVEL`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` with placeholder values
    - _Requirements: 4.8_

- [x] 2. Configure `package.json` with pinned dependencies and scripts
  - [x] 2.1 Initialise `package.json` with production dependencies
    - Pin exact versions: `express`, `@prisma/client`, `pino`, `pino-http`, `pino-pretty`, `zod`, `helmet`, `cors`, `dotenv`, `express-rate-limit`
    - Set `"main": "dist/server.js"` and `"engines": { "node": ">=18" }`
    - _Requirements: 2.1_

  - [x] 2.2 Add development dependencies to `package.json`
    - Pin exact versions: `typescript`, `prisma`, `ts-node`, `ts-node-dev`, `@types/express`, `@types/cors`, `@types/node`, `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`, `fast-check`
    - _Requirements: 2.2_

  - [x] 2.3 Add npm scripts to `package.json`
    - `build`: `tsc --project tsconfig.json`
    - `start`: `node dist/server.js`
    - `dev`: `ts-node-dev --respawn --transpile-only src/server.ts`
    - `test`: `jest --forceExit`
    - `test:coverage`: `jest --coverage --forceExit`
    - `migrate:dev`: `prisma migrate dev`
    - `migrate:deploy`: `prisma migrate deploy`
    - `db:generate`: `prisma generate`
    - _Requirements: 2.3_

- [x] 3. Configure TypeScript (`tsconfig.json`)
  - [x] 3.1 Create `tsconfig.json` with strict settings
    - Set `"strict": true`, `"target": "ES2020"`, `"module": "commonjs"`, `"outDir": "./dist"`, `"rootDir": "./src"`, `"esModuleInterop": true`, `"skipLibCheck": true`, `"forceConsistentCasingInFileNames": true`
    - Exclude `node_modules`, `dist`, `tests`
    - _Requirements: 3.1, 3.2_

- [x] 4. Implement shared TypeScript types
  - [x] 4.1 Create `src/types/config.types.ts`
    - Export `NodeEnv = 'development' | 'test' | 'production'`
    - Export `LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'`
    - _Requirements: 4.2, 4.5_

  - [x] 4.2 Create `src/types/health.types.ts`
    - Export `HealthResponse` interface with `status`, `database`, `timestamp` fields
    - _Requirements: 10.1, 10.3_

  - [x] 4.3 Create `src/types/log-entry.types.ts`
    - Export `LogEntryRecord` interface: `id`, `actor`, `action`, `payload`, `previousHash`, `currentHash`, `createdAt`
    - _Requirements: 5.1_


- [x] 5. Implement the environment config module (`src/config/index.ts`)
  - [x] 5.1 Write Zod schema and `AppConfig` interface
    - Define schema: `PORT` (int, 1–65535), `NODE_ENV` (enum), `DATABASE_URL` (non-empty string), `LOG_LEVEL` (enum, default `info`), `RATE_LIMIT_MAX` (positive int, default `100`), `RATE_LIMIT_WINDOW_MS` (positive int, default `60000`)
    - Export `AppConfig` interface matching the schema output
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 11.3, 11.4_

  - [x] 5.2 Add startup validation and frozen config export
    - Call `dotenv.config()` at the top of the module
    - Parse `process.env` against the Zod schema; on failure log the field-level Zod errors and call `process.exit(1)`
    - Export `const config: Readonly<AppConfig>` frozen with `Object.freeze`
    - _Requirements: 4.1, 4.3, 4.6, 4.7_

  - [x]* 5.3 Write property tests for config validation (Property 1 & 2)
    - **Property 1: Config rejects invalid env vars** — use `fc.record` to generate env objects with one or more required fields set to out-of-range or wrong-type values; assert Zod parse returns an error
    - **Property 2: Config accepts all valid env combinations** — generate env objects with valid field values; assert parse succeeds and result is frozen (`Object.isFrozen`)
    - Tag: `// Feature: tamper-evident-log-service, Property 1 & 2`
    - Minimum 100 runs per property
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 11.4_

- [x] 6. Implement the Pino logger singleton (`src/lib/logger.ts`)
  - [x] 6.1 Write `createLogger` factory and export singleton
    - `createLogger(level, nodeEnv)`: use `pino-pretty` transport when `nodeEnv === 'development'`; raw JSON otherwise
    - Set redacted paths: `['req.headers.authorization', 'req.body.password', 'req.body.token', 'req.body.secret', '*.token', '*.secret', '*.password', '*.authorization']`
    - Export `logger` singleton initialised with `config.logLevel` and `config.nodeEnv`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_

  - [x]* 6.2 Write property tests for logger behaviour (Property 9 & 10)
    - **Property 9: Logger redacts sensitive fields** — generate arbitrary string values for `authorization`, `password`, `token`, `secret` fields; assert raw values are absent from serialised output
    - **Property 10: Logger format follows NODE_ENV** — for `production` assert output is valid JSON; for `development` assert output is not a raw JSON line
    - Tag: `// Feature: tamper-evident-log-service, Property 9 & 10`
    - Minimum 100 runs per property
    - _Requirements: 9.2, 9.3, 9.4, 9.6_

- [x] 7. Implement the Prisma client singleton (`src/lib/prisma.ts`)
  - [x] 7.1 Create Prisma client singleton
    - Instantiate a single `PrismaClient` and export it as `prisma`
    - Reuse the existing instance in hot-reload dev environments via `global.__prisma` guard
    - _Requirements: 5.3_

- [x] 8. Define Prisma schema and run first migration
  - [x] 8.1 Write `prisma/schema.prisma`
    - Configure generator (`prisma-client-js`) and datasource (`postgresql`, `DATABASE_URL`)
    - Define `LogEntry` model: `id` (UUID PK), `actor` (VarChar 255), `action` (VarChar 500), `payload` (Json?), `previousHash` (String?), `currentHash` (unique VarChar 128), `createdAt` (Timestamptz default now); add `@@index([createdAt])`
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 8.2 Run initial Prisma migration
    - Execute `npm run migrate:dev -- --name init_log_entry` to generate migration SQL under `prisma/migrations/`
    - Commit the generated migration files to version control
    - _Requirements: 6.1, 6.4_

- [x] 9. Implement custom error base class (`src/errors/AppError.ts`)
  - [x] 9.1 Create `AppError` class
    - Extend `Error` with `statusCode: number`, `code: string`, `isOperational: boolean`
    - Restore prototype chain with `Object.setPrototypeOf(this, new.target.prototype)`
    - _Requirements: 7.5_

- [x] 10. Implement error-handling middleware (`src/middlewares/error.middleware.ts`)
  - [x] 10.1 Write `notFoundHandler` middleware
    - Respond `404` with `{ "error": "Not Found" }`
    - _Requirements: 7.4_

  - [x] 10.2 Write `globalErrorHandler` error middleware
    - Log error details via `logger.error`; respond `500` with `{ "error": "Internal Server Error" }` — no stack field in response body
    - Handle `AppError.statusCode` to support non-500 operational errors
    - _Requirements: 7.5_

  - [x]* 10.3 Write property tests for error middleware (Property 7 & 8)
    - **Property 7: 404 on unregistered routes** — generate random HTTP methods and path strings; assert every response is 404 with `{ "error": "Not Found" }`
    - **Property 8: Error handler never leaks stack traces** — for any `Error` instance assert response body JSON contains no `stack` key and status is 500
    - Tag: `// Feature: tamper-evident-log-service, Property 7 & 8`
    - Minimum 100 runs per property
    - _Requirements: 7.4, 7.5_

- [x] 11. Checkpoint — verify types, config, logger, Prisma, and middleware compile cleanly
  - Run `npm run build` and confirm zero TypeScript errors. Run `npm test` for all tests written so far. Ask the user if any questions arise.


- [x] 12. Implement the health service (`src/services/health.service.ts`)
  - [x] 12.1 Write `checkHealth` function
    - Run `prisma.$queryRaw\`SELECT 1\`` inside a `Promise.race` with a 1000 ms timeout
    - Return `HealthStatus` with `status`, `database`, and ISO-8601 UTC `timestamp` — never throw to the caller
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x]* 12.2 Write property tests for health service (Property 5 & 6)
    - **Property 5: Health DB reachability** — for a mock that either resolves or rejects `$queryRaw`, assert `database === 'ok' ↔ status === 200` and `database === 'unreachable' ↔ status === 503`
    - **Property 6: Health timestamp validity** — assert `new Date(body.timestamp)` is a valid non-NaN Date within a 5-second window of `Date.now()` at request time
    - Tag: `// Feature: tamper-evident-log-service, Property 5 & 6`
    - Minimum 100 runs per property
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 13. Implement the health controller (`src/controllers/health.controller.ts`)
  - [x] 13.1 Write `healthCheck` controller function
    - Call `checkHealth()` and map `status === 'ok'` → HTTP 200 and `status === 'degraded'` → HTTP 503
    - Pass unexpected errors to `next(err)`
    - _Requirements: 10.1, 10.3_

- [x] 14. Implement the health router (`src/routes/health.routes.ts`)
  - [x] 14.1 Create `healthRouter` and wire `GET /health` to `healthCheck`
    - Export `healthRouter: Router`
    - _Requirements: 7.3, 10.1_

- [x] 15. Implement the Express app factory (`src/app.ts`)
  - [x] 15.1 Write `createApp(config)` factory
    - Register middleware in exact order: `helmet()`, `cors()`, `express.json({ limit: '1mb' })`, `pino-http({ logger })`, `rateLimit({ max, windowMs, handler })`
    - Mount `healthRouter` at `/health`
    - Register `notFoundHandler` then `globalErrorHandler` last
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 11.1, 11.2, 11.3_

  - [x]* 15.2 Write property tests for rate limiting (Property 3 & 4)
    - **Property 3: Rate-limit defaults** — assert middleware is configured with `max = 100` and `windowMs = 60000` when vars are absent
    - **Property 4: Rate-limit enforcement** — generate random `maxRequests` (1–20); assert all requests at or below limit are non-429 and the next is 429
    - Tag: `// Feature: tamper-evident-log-service, Property 3 & 4`
    - Minimum 100 runs per property
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 16. Implement the server entry point (`src/server.ts`)
  - [x] 16.1 Write `main()` bootstrap function
    - Import `createApp(config)` and call `app.listen(config.port)`
    - Log `info` on successful start (port + NODE_ENV)
    - On `listen` error log `error` and `process.exit(1)`
    - _Requirements: 8.1, 8.2, 8.4_

  - [x] 16.2 Implement graceful shutdown signal handlers
    - Register `SIGTERM` and `SIGINT` handlers
    - Call `server.close()` to stop accepting new connections; allow up to 30 s for in-flight requests
    - After drain (or timeout), call `prisma.$disconnect()` then `process.exit(0)`; if disconnect takes > 5 s, `process.exit(1)`
    - _Requirements: 8.3, 8.5_

- [x] 17. Configure Jest (`jest.config.ts`)
  - [x] 17.1 Create Jest configuration file
    - Set `preset: 'ts-jest'`, `testEnvironment: 'node'`, `roots: ['<rootDir>/tests']`
    - Configure `collectCoverageFrom: ['src/**/*.ts']` and `coverageThreshold: { global: { lines: 80, functions: 80 } }`
    - _Design: Testing Strategy_

- [x] 18. Write Phase 1 integration tests
  - [x] 18.1 Write health endpoint integration tests (`tests/integration/health.test.ts`)
    - Mock `src/lib/prisma` via `jest.mock`; test: DB reachable → 200, DB unreachable → 503, DB timeout → 503
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 18.2 Write rate-limit integration tests (`tests/integration/rate-limit.test.ts`)
    - Send `RATE_LIMIT_MAX + 1` requests in one window; assert the last response is 429 with `{ "error": "Too Many Requests" }`
    - _Requirements: 11.1, 11.2_

  - [x] 18.3 Write 404 and error-handler integration tests (`tests/integration/app.test.ts`)
    - Request an unknown path → assert 404 + `{ "error": "Not Found" }`; mount a test route that throws → assert 500 + `{ "error": "Internal Server Error" }` with no `stack` field
    - _Requirements: 7.4, 7.5_

- [x] 19. Write initial README.md (`README.md`)
  - [x] 19.1 Create `README.md` with Phase 1 sections
    - Sections: **Project Overview**, **Prerequisites**, **Installation**, **Environment Variables** table, **Available npm Scripts** table, **Database Setup**, **API Endpoint Reference** for `GET /health`
    - _Requirements: 12.1_

- [x] 20. Phase 1 final verification checkpoint
  - Run `npm run build` — confirm zero TypeScript compilation errors and output in `dist/`
  - Run `npm test` — confirm all property-based and integration tests pass with ≥ 80% line and function coverage
  - Ensure all tests pass, ask the user if any questions arise.

---

## Phase 2 — Core Infrastructure

_Add API key authentication, complete the error middleware, async error wrapper, Zod validation middleware, and a typed response helper utility. Extend config and environment files._

> **Checkpoint before Phase 2:** Phase 1 build and tests must pass (`npm run build && npm test`).

- [x] 21. Extend config for API key authentication
  - [x] 21.1 Add `API_KEY` field to Zod schema in `src/config/index.ts`
    - Add `API_KEY` as a non-empty string in the Zod schema and the `AppConfig` interface
    - Validate at startup per Requirement 4.3; missing or empty key causes `process.exit(1)`
    - _Requirements: 4.2, 4.3_

  - [x] 21.2 Add `API_KEY` placeholder to `.env.example`
    - Add `API_KEY=your-secret-api-key-here` to `.env.example`
    - _Requirements: 4.8_


- [x] 22. Implement API key authentication middleware (`src/middlewares/auth.middleware.ts`)
  - [x] 22.1 Write `requireApiKey` middleware
    - Read `API_KEY` from `config`; compare against the `x-api-key` request header (constant-time comparison)
    - If header is absent or the value does not match, respond `401` with `{ "error": "Unauthorized" }` and call no further middleware
    - If valid, call `next()`
    - _Design: API key auth; referenced by Phase 6 routes_

- [x] 23. Complete global error handler (`src/middlewares/error.middleware.ts`)
  - [x] 23.1 Enhance `globalErrorHandler` to handle `AppError` instances
    - If `err instanceof AppError && err.isOperational`, respond with `err.statusCode` and `{ "error": err.message }`
    - Otherwise fall back to 500 `{ "error": "Internal Server Error" }`
    - Log all errors at `error` level; never include stack trace in response body
    - _Requirements: 7.5_

- [x] 24. Implement async error wrapper utility (`src/utils/asyncHandler.ts`)
  - [x] 24.1 Write `asyncHandler` higher-order function
    - Accept an async Express route handler and return a synchronous wrapper that catches any rejected promise and forwards it to `next(err)`
    - _Design: used by all async controllers in Phase 6_

- [x] 25. Implement Zod validation middleware factory (`src/middlewares/validate.middleware.ts`)
  - [x] 25.1 Write `validateBody(schema)` middleware factory
    - Accept a Zod schema; parse `req.body` against it
    - On success, replace `req.body` with the parsed (and type-narrowed) value and call `next()`
    - On failure, respond `422` with `{ "error": "Validation Error", "details": <zod issues array> }`
    - _Design: used by POST /api/log in Phase 6_

- [x] 26. Implement response helper utility (`src/utils/response.helper.ts`)
  - [x] 26.1 Write `sendSuccess` and `sendError` typed helpers
    - `sendSuccess(res, statusCode, data)`: writes `{ "data": data }` with the given status
    - `sendError(res, statusCode, message, details?)`: writes `{ "error": message, "details": details }` with the given status
    - Both helpers set `Content-Type: application/json`
    - _Design: used by all controllers for consistent response shape_

- [x] 27. Phase 2 verification checkpoint
  - Run `npm run build` — confirm zero TypeScript errors across new middleware and utility files
  - Run `npm test` — confirm existing Phase 1 tests still pass
  - Ensure all tests pass, ask the user if any questions arise.

---

## Phase 3 — Database Layer

_Add a typed repository interface and a concrete Prisma-backed repository for `LogEntry`. No business logic belongs in this layer._

> **Checkpoint before Phase 3:** Phase 2 build and tests must pass.

- [x] 28. Define log repository interface (`src/interfaces/log-repository.interface.ts`)
  - [x] 28.1 Write `ILogRepository` interface
    - Declare method signatures: `findById(id: string): Promise<LogEntryRecord | null>`, `findLatest(): Promise<LogEntryRecord | null>`, `create(data: CreateLogData): Promise<LogEntryRecord>`, `findAll(page: number, pageSize: number): Promise<LogEntryRecord[]>`, `count(): Promise<number>`
    - Export `CreateLogData` type: `{ actor, action, payload, previousHash, currentHash }`
    - _Design: repository pattern; satisfies Dependency Inversion for testability_

- [x] 29. Implement log repository (`src/repositories/log.repository.ts`)
  - [x] 29.1 Implement `LogRepository` class satisfying `ILogRepository`
    - `findById`: call `prisma.logEntry.findUnique({ where: { id } })`; return `null` if not found
    - `findLatest`: call `prisma.logEntry.findFirst({ orderBy: { createdAt: 'desc' } })`; return `null` for empty table
    - `create`: call `prisma.logEntry.create({ data: { ... } })` with all provided fields
    - `findAll`: call `prisma.logEntry.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'asc' } })`
    - `count`: call `prisma.logEntry.count()`
    - Use the shared `prisma` singleton from `src/lib/prisma.ts`; no business logic
    - _Design: data-access layer; Requirements: 5.1, 5.3_

- [x] 30. Phase 3 verification checkpoint
  - Run `npm run build` — confirm repository and interface compile without errors
  - Ensure all tests pass, ask the user if any questions arise.

---

## Phase 4 — Cryptographic Hash Chain

_Implement the SHA-256 hash service that computes, chains, and verifies log entry hashes._

> **Checkpoint before Phase 4:** Phase 3 build must pass.

- [x] 31. Define hash-related types (`src/types/hash.types.ts`)
  - [x] 31.1 Write `HashInput` and `ChainVerificationResult` types
    - `HashInput`: `{ actor: string; action: string; payload: Record<string, unknown> | null; previousHash: string; timestamp: Date }`
    - `ChainVerificationResult`: `{ valid: boolean; totalEntries: number; brokenAt?: string }` — `brokenAt` is the `id` of the first invalid entry
    - _Design: hash service types_


- [x] 32. Implement hash service (`src/services/hash.service.ts`)
  - [x] 32.1 Write `computeHash(data: HashInput): string`
    - Use Node.js built-in `crypto.createHash('sha256')` with hex digest
    - Serialise fields in deterministic order: `actor`, `action`, `payload` (JSON.stringify or `null`), `previousHash`, `timestamp` (ISO string)
    - _Design: hash chain; Requirements: 5.1_

  - [x] 32.2 Write `buildGenesisHash` and `buildChainHash` helpers
    - `buildGenesisHash(actor, action, payload, timestamp)`: calls `computeHash` with `previousHash` set to the literal string `"0"`
    - `buildChainHash(actor, action, payload, previousHash, timestamp)`: calls `computeHash` with the provided `previousHash`
    - _Design: hash chain_

  - [x] 32.3 Write `verifyChain(entries: LogEntryRecord[]): ChainVerificationResult`
    - Walk entries in `createdAt` ASC order
    - For the first entry (genesis): recompute hash using `buildGenesisHash` and compare to `entry.currentHash`
    - For subsequent entries: recompute hash using `buildChainHash` with the previous entry's `currentHash` and compare
    - Return `{ valid: true, totalEntries: n }` if all match; otherwise `{ valid: false, totalEntries: n, brokenAt: <id of first mismatch> }`
    - Empty array returns `{ valid: true, totalEntries: 0 }`
    - _Design: chain verification_

  - [x]* 32.4 Write unit tests for hash service (`tests/unit/hash.service.test.ts`)
    - Test deterministic hash output: same input always produces same hash
    - Test genesis vs chain hash: genesis uses `"0"` as previous, chain uses real hash
    - Test `verifyChain` detects tampering: modify one entry's `currentHash` and assert `valid: false` with correct `brokenAt`
    - Test empty array: assert `valid: true, totalEntries: 0`
    - _Design: hash service_

- [x] 33. Phase 4 verification checkpoint
  - Run `npm run build && npm test` — confirm hash service compiles and all unit tests pass
  - Ensure all tests pass, ask the user if any questions arise.

---

## Phase 5 — Business Logic

_Implement the log service, verification service, export service, and Zod request validators._

> **Checkpoint before Phase 5:** Phase 4 build and tests must pass.

- [x] 34. Write Zod request validators (`src/validators/log.validator.ts`)
  - [x] 34.1 Write `CreateLogSchema`
    - `actor`: non-empty string, 1–255 chars
    - `action`: non-empty string, 1–500 chars
    - `payload`: optional `z.record(z.unknown())` or `null`
    - Export `CreateLogDto` type inferred from the schema
    - _Design: request validation; Requirements: 5.1_

- [x] 35. Implement log service (`src/services/log.service.ts`)
  - [x] 35.1 Write `createLogEntry(dto: CreateLogDto): Promise<LogEntryRecord>`
    - Call `repository.findLatest()` to get the previous entry (or `null` for genesis)
    - If previous entry exists, call `buildChainHash`; otherwise call `buildGenesisHash`
    - Call `repository.create({ actor, action, payload, previousHash: previous?.currentHash ?? null, currentHash })`
    - Return the created `LogEntryRecord`
    - _Design: log service; Requirements: 5.1_

  - [x] 35.2 Write `getLogEntryById(id: string): Promise<LogEntryRecord>`
    - Call `repository.findById(id)`
    - If result is `null`, throw `new AppError('Log entry not found', 404, 'NOT_FOUND')`
    - Return the found record
    - _Design: log service; Requirements: 5.1_

  - [x] 35.3 Write `getAllLogEntries(page, pageSize): Promise<PaginatedResult<LogEntryRecord>>`
    - Call `repository.findAll(page, pageSize)` and `repository.count()`
    - Return `{ data: entries, meta: { page, pageSize, total } }`
    - Export `PaginatedResult<T>` type: `{ data: T[]; meta: { page: number; pageSize: number; total: number } }`
    - _Design: log service; Requirements: 5.1_

  - [x]* 35.4 Write unit tests for log service (`tests/unit/log.service.test.ts`)
    - Mock `ILogRepository` with Jest manual mocks
    - Test `createLogEntry`: genesis case (`findLatest` returns null, `buildGenesisHash` called with `"0"`), chain case (hash of previous entry used)
    - Test `getLogEntryById`: found case returns record, not-found case throws 404 `AppError`
    - _Design: log service_

- [x] 36. Implement verification service (`src/services/verification.service.ts`)
  - [x] 36.1 Write `verifyIntegrity(): Promise<ChainVerificationResult>`
    - Call `repository.findAll` for ALL entries ordered by `createdAt` ASC (use a large `pageSize` or a dedicated `findAllOrdered` repository method)
    - Delegate to `hash.service.verifyChain(entries)`
    - Return the `ChainVerificationResult`
    - _Design: verification; Requirements: 5.1_

- [x] 37. Implement export service (`src/services/export.service.ts`)
  - [x] 37.1 Write `exportAsJson(): Promise<LogEntryRecord[]>`
    - Retrieve all entries ordered by `createdAt` ASC (same approach as verification service)
    - Return the array of `LogEntryRecord` objects without transformation
    - _Design: export_

- [x] 38. Phase 5 verification checkpoint
  - Run `npm run build && npm test` — confirm all business logic compiles and unit tests pass
  - Ensure all tests pass, ask the user if any questions arise.

---

## Phase 6 — API Layer

_Wire controllers, routes, and mount everything under the `/api` prefix in `src/app.ts`._

> **Checkpoint before Phase 6:** Phase 5 build and tests must pass.

- [x] 39. Implement log controller (`src/controllers/log.controller.ts`)
  - [x] 39.1 Write `createLog` handler for `POST /api/log`
    - Wrap with `asyncHandler`; call `log.service.createLogEntry(req.body)`; use `sendSuccess(res, 201, entry)`
    - _Requirements: 5.1; Design: API layer_

  - [x] 39.2 Write `getLogById` handler for `GET /api/log/:id`
    - Wrap with `asyncHandler`; validate `:id` is a non-empty UUID-format string; call `log.service.getLogEntryById(id)`; use `sendSuccess(res, 200, entry)`; 404 propagated via `AppError`
    - _Requirements: 5.1; Design: API layer_

  - [x] 39.3 Write `getLogs` handler for `GET /api/logs`
    - Wrap with `asyncHandler`; parse `page` (default 1) and `pageSize` (default 20, max 100) from `req.query`; call `log.service.getAllLogEntries(page, pageSize)`; use `sendSuccess(res, 200, result)`
    - _Requirements: 5.1; Design: API layer_

  - [x] 39.4 Write `verifyChain` handler for `GET /api/verify`
    - Wrap with `asyncHandler`; call `verification.service.verifyIntegrity()`; use `sendSuccess(res, 200, result)`
    - _Design: verification endpoint_

  - [x] 39.5 Write `exportLogs` handler for `GET /api/export`
    - Wrap with `asyncHandler`; call `export.service.exportAsJson()`; use `sendSuccess(res, 200, entries)`
    - _Design: export endpoint_


- [x] 40. Implement log routes (`src/routes/log.routes.ts`)
  - [x] 40.1 Create `logRouter` and declare all five routes
    - Apply `requireApiKey` middleware to all routes on this router
    - `POST /log` → `validateBody(CreateLogSchema)` → `createLog`
    - `GET /log/:id` → `getLogById`
    - `GET /logs` → `getLogs`
    - `GET /verify` → `verifyChain`
    - `GET /export` → `exportLogs`
    - Export `logRouter: Router`
    - _Design: routes; Requirements: 5.1_

- [x] 41. Mount API routes in `src/app.ts`
  - [x] 41.1 Import `logRouter` and mount at `/api` in `createApp`
    - Add `app.use('/api', logRouter)` after existing middleware, before `notFoundHandler`
    - _Design: app factory_

- [x] 42. Phase 6 verification checkpoint
  - Run `npm run build` — confirm zero TypeScript errors across controllers and routes
  - Run `npm test` — confirm all existing tests still pass
  - Ensure all tests pass, ask the user if any questions arise.

---

## Phase 7 — Testing

_Add comprehensive unit and integration tests covering all new layers introduced in Phases 2–6._

> **Checkpoint before Phase 7:** Phase 6 build and tests must pass.

- [x] 43. Unit tests — auth middleware (`tests/unit/auth.middleware.test.ts`)
  - [x] 43.1 Write auth middleware unit tests
    - Valid `x-api-key` header matching config → `next()` called, no response sent
    - Missing `x-api-key` header → `401` with `{ "error": "Unauthorized" }`
    - Wrong `x-api-key` value → `401` with `{ "error": "Unauthorized" }`
    - _Design: auth middleware_

  - [x]* 43.2 Write property test for auth middleware
    - Generate random strings as API key values; assert any value that is not the exact configured key returns `401`
    - Tag: `// Feature: tamper-evident-log-service, auth property`
    - _Design: auth middleware_

- [x] 44. Unit tests — validate middleware (`tests/unit/validate.middleware.test.ts`)
  - [x] 44.1 Write validate middleware unit tests
    - Valid body matching `CreateLogSchema` → `next()` called, `req.body` replaced with parsed value
    - Missing required field (`actor` absent) → `422` with validation details
    - Field exceeds max length → `422` with validation details
    - _Design: validate middleware_

- [x] 45. Unit tests — hash service (`tests/unit/hash.service.test.ts`)
  - Already declared as task 32.4 above; ensure it covers all branches before Phase 7 integration tests run
  - [x] 45.1 Verify hash service test coverage is complete
    - Confirm all four cases from 32.4 are implemented; add any missing edge-case tests for `verifyChain` with single-entry chains
    - _Design: hash service_

- [x] 46. Unit tests — log service (`tests/unit/log.service.test.ts`)
  - Already declared as task 35.4 above; extend if needed
  - [x] 46.1 Extend log service tests for pagination
    - Add test for `getAllLogEntries` returning correct `meta` object (`page`, `pageSize`, `total`)
    - _Design: log service_

- [x] 47. Integration tests — `POST /api/log` (`tests/integration/log.test.ts`)
  - [x] 47.1 Write POST /api/log integration tests
    - Happy path: valid body + valid API key → 201 with `LogEntryRecord` including `currentHash`
    - Missing required field (`actor` absent) → 422
    - Missing `x-api-key` header → 401
    - Invalid `x-api-key` value → 401
    - Mock repository via `jest.mock` to avoid DB dependency
    - _Design: log endpoint; Requirements: 5.1_

- [x] 48. Integration tests — `GET /api/verify` (`tests/integration/verify.test.ts`)
  - [x] 48.1 Write GET /api/verify integration tests
    - Empty chain (no entries) → 200 with `{ valid: true, totalEntries: 0 }`
    - Valid chain of N entries → 200 with `{ valid: true, totalEntries: N }`
    - Tampered chain (one `currentHash` modified in mock data) → 200 with `{ valid: false, brokenAt: <id> }`
    - Missing `x-api-key` → 401
    - Mock repository via `jest.mock`
    - _Design: verification endpoint_

- [x] 49. Integration tests — `GET /api/export` (`tests/integration/export.test.ts`)
  - [x] 49.1 Write GET /api/export integration tests
    - Empty store → 200 with `[]`
    - Store with entries → 200 with all entries ordered by `createdAt` ASC
    - Missing `x-api-key` → 401
    - Mock repository via `jest.mock`
    - _Design: export endpoint_

- [x] 50. Integration tests — `GET /api/logs` (`tests/integration/logs-list.test.ts`)
  - [x] 50.1 Write GET /api/logs integration tests
    - Default pagination (no query params) → 200 with `{ data, meta: { page: 1, pageSize: 20, total } }`
    - Custom `page` and `pageSize` params → correct `meta` values returned
    - `pageSize` exceeding max (100) → clamped or 422
    - Missing `x-api-key` → 401
    - Mock repository via `jest.mock`
    - _Design: list endpoint_

- [x] 51. Integration tests — `GET /api/log/:id` (`tests/integration/log-by-id.test.ts`)
  - [x] 51.1 Write GET /api/log/:id integration tests
    - Valid UUID for existing entry → 200 with `LogEntryRecord`
    - Valid UUID for non-existent entry → 404
    - Invalid / non-UUID `:id` format → 422 or 400
    - Missing `x-api-key` → 401
    - Mock repository via `jest.mock`
    - _Design: get-by-id endpoint_

- [x] 52. Phase 7 verification checkpoint
  - Run `npm run test:coverage` — confirm all tests pass and ≥ 80% line and function coverage is maintained
  - Ensure all tests pass, ask the user if any questions arise.

---

## Phase 8 — Deployment

_Add Docker and docker-compose configuration for a self-contained production deployment._

> **Checkpoint before Phase 8:** Phase 7 build and tests must pass.


- [x] 53. Add Docker-related env vars to `.env.example`
  - [x] 53.1 Append Docker Compose variables to `.env.example`
    - Add `POSTGRES_USER=log_user`, `POSTGRES_PASSWORD=changeme`, `POSTGRES_DB=tamper_log` with comments explaining they are used by the `docker-compose.yml` postgres service
    - _Design: deployment_

- [x] 54. Add Docker scripts to `package.json`
  - [x] 54.1 Add `docker:build` and `docker:up` scripts
    - `docker:build`: `docker build -t tamper-evident-log-service .`
    - `docker:up`: `docker compose up --build`
    - _Design: deployment_

- [x] 55. Write multi-stage `Dockerfile`
  - [x] 55.1 Create `Dockerfile` with build and production stages
    - **Build stage** (`node:18-alpine` as `builder`): copy `package*.json`, run `npm ci`, copy `src/`, `tsconfig.json`, `prisma/`; run `npm run build` and `npx prisma generate`
    - **Production stage** (`node:18-alpine`): set `NODE_ENV=production`; copy `dist/` from builder, copy `node_modules/` from builder, copy `prisma/` for migrations; expose port `3000`; `CMD ["node", "dist/server.js"]`
    - Non-root user (`node`) for the production stage
    - _Design: deployment_

- [x] 56. Write `docker-compose.yml`
  - [x] 56.1 Create `docker-compose.yml` with `app` and `postgres` services
    - `postgres` service: image `postgres:15-alpine`, environment vars (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) from `.env`, named volume `postgres_data`, healthcheck `pg_isready`
    - `app` service: build from `Dockerfile`, depends on `postgres` (condition `service_healthy`), environment vars including `DATABASE_URL` pointing to the postgres service, port mapping `3000:3000`
    - Define `volumes: postgres_data:` at the bottom
    - _Design: deployment_

- [x] 57. Phase 8 verification checkpoint
  - Verify `Dockerfile` builds successfully (`docker:build`)
  - Verify `docker-compose.yml` is valid YAML and references correct service names
  - Ensure all tests pass, ask the user if any questions arise.

---

## Phase 9 — Documentation

_Expand `README.md` with full API reference, authentication guide, hash chain explanation, Docker instructions, architecture summary, and test guide._

> **Checkpoint before Phase 9:** Phase 8 Docker build must succeed.

- [x] 58. Expand `README.md` with production documentation
  - [x] 58.1 Add Authentication section
    - Explain `x-api-key` header requirement; show example `curl` command with header
    - Describe what happens on missing or invalid key (401 response)
    - _Design: auth middleware_

  - [x] 58.2 Add full API reference section
    - Document all five endpoints with: HTTP method, path, auth requirement, request body/params, success response shape, error responses
    - Include `POST /api/log`, `GET /api/log/:id`, `GET /api/logs`, `GET /api/verify`, `GET /api/export`
    - _Design: API layer_

  - [x] 58.3 Add Hash Chain explanation section
    - Explain how tamper-evidence works: each entry stores SHA-256 of `{actor, action, payload, previousHash, timestamp}`; genesis uses `"0"` as previous; verification walks all entries in insertion order and recomputes each hash
    - Describe what `GET /api/verify` returns and how `brokenAt` identifies the first tampered entry
    - _Design: hash chain_

  - [x] 58.4 Add Docker setup section
    - Prerequisites: Docker and Docker Compose installed
    - Step-by-step: copy `.env.example` to `.env`, fill in values, run `docker:up`, run `migrate:deploy` inside the container
    - _Design: deployment_

  - [x] 58.5 Add architecture summary section
    - ASCII or Mermaid diagram showing the layer stack: Client → Rate Limit → Auth → Validate → Controller → Service → Repository → Prisma → PostgreSQL
    - One-line description of each layer's responsibility
    - _Design: architecture_

  - [x] 58.6 Add How to run tests section
    - Commands: `npm test` (all tests), `npm run test:coverage` (with coverage report), and how to run a single test file with `jest --testPathPattern`
    - Note that integration tests mock the Prisma client and do not require a live database
    - _Design: testing strategy_

- [x] 59. Final production-ready verification checkpoint
  - Run `npm run build` — confirm zero TypeScript errors across the entire codebase
  - Run `npm run test:coverage` — confirm all tests pass and coverage thresholds are met
  - Run `docker:build` — confirm Docker image builds successfully
  - Ensure all tests pass, ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and will not be auto-implemented; they can be skipped for a faster MVP
- Every task references specific design components or requirements for full traceability
- The app factory pattern (task 15.1) keeps `src/app.ts` decoupled from `src/server.ts`, enabling Supertest to import the app without binding a port
- Property tests use `fc.assert(fc.property(...), { numRuns: 100 })` minimum, tagged with `// Feature: tamper-evident-log-service, Property N`
- Repository mocks in integration tests allow Phase 7 tests to run without a live PostgreSQL instance
- The `verifyChain` function in Phase 4 is a pure function over an array — ideal for property-based testing
- Docker multi-stage build keeps the production image lean by excluding TypeScript source and dev dependencies
- The `asyncHandler` wrapper (task 24.1) is required by all async controllers; always use it to prevent unhandled promise rejections from bypassing the global error handler


## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "1.3"]
    },
    {
      "id": 1,
      "tasks": ["2.1", "2.2", "2.3", "3.1"]
    },
    {
      "id": 2,
      "tasks": ["4.1", "4.2", "4.3"]
    },
    {
      "id": 3,
      "tasks": ["5.1", "5.2", "9.1", "17.1"]
    },
    {
      "id": 4,
      "tasks": ["5.3", "6.1", "7.1", "8.1"]
    },
    {
      "id": 5,
      "tasks": ["6.2", "8.2", "10.1", "10.2"]
    },
    {
      "id": 6,
      "tasks": ["10.3", "12.1"]
    },
    {
      "id": 7,
      "tasks": ["12.2", "13.1"]
    },
    {
      "id": 8,
      "tasks": ["14.1"]
    },
    {
      "id": 9,
      "tasks": ["15.1"]
    },
    {
      "id": 10,
      "tasks": ["15.2", "16.1"]
    },
    {
      "id": 11,
      "tasks": ["16.2"]
    },
    {
      "id": 12,
      "tasks": ["18.1", "18.2", "18.3"]
    },
    {
      "id": 13,
      "tasks": ["19.1"]
    },
    {
      "id": 14,
      "tasks": ["21.1"]
    },
    {
      "id": 15,
      "tasks": ["21.2", "22.1"]
    },
    {
      "id": 16,
      "tasks": ["23.1", "24.1", "25.1", "26.1"]
    },
    {
      "id": 17,
      "tasks": ["28.1"]
    },
    {
      "id": 18,
      "tasks": ["29.1"]
    },
    {
      "id": 19,
      "tasks": ["31.1"]
    },
    {
      "id": 20,
      "tasks": ["32.1"]
    },
    {
      "id": 21,
      "tasks": ["32.2", "32.3"]
    },
    {
      "id": 22,
      "tasks": ["32.4"]
    },
    {
      "id": 23,
      "tasks": ["34.1"]
    },
    {
      "id": 24,
      "tasks": ["35.1", "36.1", "37.1"]
    },
    {
      "id": 25,
      "tasks": ["35.2", "35.3"]
    },
    {
      "id": 26,
      "tasks": ["35.4"]
    },
    {
      "id": 27,
      "tasks": ["39.1", "39.2", "39.3", "39.4", "39.5"]
    },
    {
      "id": 28,
      "tasks": ["40.1"]
    },
    {
      "id": 29,
      "tasks": ["41.1"]
    },
    {
      "id": 30,
      "tasks": ["43.1", "44.1", "45.1", "46.1"]
    },
    {
      "id": 31,
      "tasks": ["43.2"]
    },
    {
      "id": 32,
      "tasks": ["47.1", "48.1", "49.1", "50.1", "51.1"]
    },
    {
      "id": 33,
      "tasks": ["53.1", "54.1"]
    },
    {
      "id": 34,
      "tasks": ["55.1"]
    },
    {
      "id": 35,
      "tasks": ["56.1"]
    },
    {
      "id": 36,
      "tasks": ["58.1", "58.2", "58.3", "58.4", "58.5", "58.6"]
    }
  ]
}
```
