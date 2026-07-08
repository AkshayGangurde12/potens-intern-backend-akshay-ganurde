# Requirements Document

## Introduction

The Tamper-Evident Append-Only Log Service is a production-ready backend system built with Node.js, Express.js, TypeScript, and PostgreSQL (via Prisma ORM). It provides a cryptographically-linked audit log where each entry references the hash of its predecessor, making any retroactive tampering detectable. The service exposes a RESTful HTTP API secured by API key authentication. This document covers the foundational project setup phase: folder structure, configuration, database schema, server bootstrap, and health endpoint. Business logic (hash generation, chain verification, CRUD APIs, and authentication) will be specified in subsequent phases.

## Glossary

- **Server**: The Express.js HTTP server process that handles incoming API requests.
- **App**: The Express.js application instance responsible for middleware registration and routing.
- **Config**: The configuration module that reads and validates environment variables.
- **Database**: The PostgreSQL relational database used for persistent storage.
- **Prisma_Client**: The Prisma ORM client used to interact with the Database.
- **LogEntry**: The primary domain entity representing a single immutable audit log record.
- **Health_Endpoint**: The HTTP route that reports the operational status of the Server and its dependencies.
- **Logger**: The Pino-based structured logging utility used across all modules.
- **Environment**: The set of runtime environment variables that configure the application.
- **Migration**: A Prisma-managed, versioned database schema change script.
- **Schema**: The Prisma schema file defining the data model and database connection.

## Requirements

---

### Requirement 1: Project Folder Structure

**User Story:** As a backend engineer, I want a well-defined folder structure, so that the codebase is maintainable, navigable, and follows separation-of-concerns principles from the start.

#### Acceptance Criteria

1. THE Server SHALL organise source code under a top-level `src/` directory containing at minimum the subdirectories: `config/`, `controllers/`, `services/`, `repositories/`, `routes/`, `middlewares/`, `validators/`, `utils/`, `interfaces/`, `types/`, `constants/`, `errors/`, and `lib/`.
2. THE Server SHALL place the module that creates and configures the Express application instance in `src/app.ts` and the HTTP server entry point in `src/server.ts`.
3. THE Server SHALL maintain Prisma schema and migration files under a top-level `prisma/` directory.
4. THE Server SHALL store test source files under a top-level `tests/` directory.
5. THE Server SHALL write runtime log output files to a top-level `logs/` directory.

---

### Requirement 2: Dependency and Package Configuration

**User Story:** As a backend engineer, I want a correctly configured `package.json`, so that all runtime and development dependencies are declared with pinned versions and standard scripts are available.

#### Acceptance Criteria

1. THE Server SHALL declare the following production dependencies in `package.json` using exact semver versions (no range operators): `express`, `@prisma/client`, `pino`, `pino-http`, `zod`, `helmet`, `cors`, `dotenv`, `express-rate-limit`.
2. THE Server SHALL declare the following development dependencies in `package.json` using exact semver versions (no range operators): `typescript`, `prisma`, `ts-node`, `ts-node-dev`, `@types/express`, `@types/cors`, `@types/node`, `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`.
3. THE Server SHALL expose the following npm scripts in `package.json`: `build` (compiles TypeScript to `dist/`), `start` (runs `dist/server.js`), `dev` (runs `ts-node-dev` with hot reload), `test` (runs Jest), `migrate:dev` (runs Prisma migrate dev), `migrate:deploy` (runs Prisma migrate deploy), and `db:generate` (runs Prisma generate).

---

### Requirement 3: TypeScript Configuration

**User Story:** As a backend engineer, I want a strict TypeScript configuration, so that type errors are caught at compile time and the output is compatible with the Node.js runtime.

#### Acceptance Criteria

1. THE Server SHALL include a `tsconfig.json` at the project root with `"strict": true`, `"target": "ES2020"`, `"module": "commonjs"`, `"outDir": "./dist"`, and `"rootDir": "./src"`.
2. THE Server SHALL configure `tsconfig.json` to exclude `node_modules/`, `dist/`, and `tests/` from compilation.
3. IF the TypeScript compiler encounters a type error, THEN THE Server SHALL fail the build, produce no output files, and emit a non-zero exit code.
4. IF the TypeScript compiler encounters no type errors, THEN THE Server SHALL write all compiled JavaScript output to the `./dist` directory.

---

### Requirement 4: Environment Configuration

**User Story:** As a backend engineer, I want environment variables loaded and validated at startup, so that the application fails fast with a descriptive error when required configuration is missing or malformed.

#### Acceptance Criteria

1. WHEN the application starts, THE Config SHALL read environment variables from a `.env` file at the project root using `dotenv` before any other module initialises.
2. WHEN the application starts, THE Config SHALL validate all environment variables against a Zod schema before any other module initialises.
3. IF a required environment variable (`DATABASE_URL`, `PORT`, `NODE_ENV`, `LOG_LEVEL`) is absent or fails validation, THEN THE Config SHALL log a human-readable error message identifying which variable failed and why (e.g., "PORT must be an integer between 1 and 65535"), and terminate the process with exit code `1`.
4. IF `PORT` is present, THEN THE Config SHALL validate it is an integer in the range 1–65535; otherwise it SHALL fail per Criterion 3.
5. IF `NODE_ENV` is present, THEN THE Config SHALL validate it is one of `development`, `test`, or `production`; otherwise it SHALL fail per Criterion 3.
6. THE Config SHALL export a typed, immutable configuration object such that any attempt to mutate its properties at runtime throws or is rejected by the TypeScript compiler.
7. IF the `.env` file is absent from the project root, THEN THE Config SHALL still validate environment variables already present in the process environment and SHALL NOT treat the missing file itself as a fatal error.
8. THE Server SHALL include a `.env.example` file at the project root documenting every required and optional environment variable with placeholder values.

---

### Requirement 5: Prisma Schema and LogEntry Model

**User Story:** As a backend engineer, I want a Prisma schema that models the LogEntry domain entity, so that the database structure matches the append-only, tamper-evident requirements of the service.

#### Acceptance Criteria

1. THE Schema SHALL declare a `LogEntry` model with the following fields:
   - `id` — unique identifier (UUID, primary key, auto-generated)
   - `actor` — non-nullable string, maximum 255 characters, identifying the entity that created the entry
   - `action` — non-nullable string, maximum 500 characters, describing the event being logged
   - `payload` — nullable JSON field for structured metadata
   - `previousHash` — nullable string referencing the `currentHash` of the immediately preceding LogEntry (null for the genesis entry)
   - `currentHash` — non-nullable, unique string of up to 128 characters containing the cryptographic hash of this entry
   - `createdAt` — non-nullable timestamp, defaulting to the current database time, with no automatic update default
2. THE Schema SHALL configure the database provider as `postgresql` and read the connection string from the `DATABASE_URL` environment variable.
3. WHEN the `db:generate` script is executed, THE Prisma_Client SHALL be generated from the Schema and made available for import by application modules.
4. THE Schema SHALL define a database index on the `createdAt` field of the `LogEntry` model to support efficient chain traversal queries.

---

### Requirement 6: Database Migration

**User Story:** As a backend engineer, I want versioned database migrations, so that schema changes are reproducible and auditable across all environments.

#### Acceptance Criteria

1. WHEN the `migrate:dev` script is executed in a development environment, THE Prisma_Client SHALL apply all migrations present in `prisma/migrations/` that are not yet recorded in the migration history table, and update the Database schema accordingly.
2. WHEN the `migrate:deploy` script is executed in a production environment, THE Prisma_Client SHALL apply only previously-generated migration files without creating new ones.
3. WHEN the `migrate:deploy` script encounters a migration file in `prisma/migrations/` that is not in an expected state (e.g., checksums do not match), THE Prisma_Client SHALL abort deployment and report the specific conflicting migration file.
4. THE Prisma_Client SHALL store all migration files under `prisma/migrations/` as individual SQL files with associated metadata files, each committed to version control.
5. IF a migration fails during execution, THEN THE Prisma_Client SHALL halt execution, preserve the database in its pre-migration state where possible, and emit an error message identifying the failed migration file.

---

### Requirement 7: Express Application Initialisation

**User Story:** As a backend engineer, I want a clean Express app factory function, so that the application can be instantiated independently of the server for testing purposes.

#### Acceptance Criteria

1. THE App SHALL be created by a factory function exported from `src/app.ts` that registers all middleware and routes without binding to a port.
2. THE App SHALL register the following middleware in order: `helmet` (security headers), `cors` (cross-origin policy), `express.json` (JSON body parsing with a maximum body size of 1 MB), `pino-http` (HTTP request logging), and `express-rate-limit` (rate limiting configured per Requirement 11).
3. THE App SHALL mount the health route at the path `/health`.
4. IF an unhandled route is requested, THEN THE App SHALL respond with HTTP status `404` and a JSON body `{ "error": "Not Found" }`.
5. IF an unhandled error reaches the global error handler, THEN THE App SHALL respond with HTTP status `500` and a JSON body `{ "error": "Internal Server Error" }` without leaking stack traces to the client.

---

### Requirement 8: HTTP Server Bootstrap

**User Story:** As a backend engineer, I want the server entry point to handle startup and shutdown gracefully, so that the service does not drop in-flight requests or leave database connections open on termination.

#### Acceptance Criteria

1. THE Server SHALL import the App factory, bind it to the port specified in the Config, and begin accepting connections.
2. WHEN the Server starts successfully, THE Logger SHALL emit a structured log entry at `info` level recording the bound port and `NODE_ENV`.
3. WHEN a `SIGTERM` or `SIGINT` signal is received, THE Server SHALL stop accepting new connections, allow in-flight requests up to 30 seconds to complete, close the Prisma_Client connection, and then exit with code `0`.
4. IF the Server fails to start (e.g., port already in use), THEN THE Logger SHALL emit a structured log entry at `error` level with the failure reason and THE Server SHALL exit with code `1`.
5. IF in-flight requests do not complete within the 30-second graceful shutdown grace period, THEN THE Server SHALL forcibly close remaining connections, attempt to close the Prisma_Client connection, and exit with code `0`; IF the Prisma_Client connection cannot be closed within a further 5 seconds, THE Server SHALL exit with code `1`.

---

### Requirement 9: Structured Logging

**User Story:** As a backend engineer, I want structured JSON logging via Pino, so that log output is machine-parseable and suitable for ingestion by log aggregation systems.

#### Acceptance Criteria

1. THE Logger SHALL be a singleton Pino instance initialised with the `LOG_LEVEL` value from the Config, where valid levels are `trace`, `debug`, `info`, `warn`, `error`, and `fatal`; IF `LOG_LEVEL` is absent or is not one of these values, THE Logger SHALL default to `info`.
2. IF `NODE_ENV` is `production`, THEN THE Logger SHALL output logs in JSON format.
3. IF `NODE_ENV` is `development`, THEN THE Logger SHALL output logs in pretty-printed format.
4. IF `NODE_ENV` is any other value, THEN THE Logger SHALL output logs in JSON format.
5. WHILE the Server is handling an HTTP request, THE Logger SHALL record the HTTP method, URL, response status code, and response time in milliseconds in the request log entry at response completion.
6. THE Logger SHALL never include raw API keys, passwords, bearer tokens, or fields named `secret`, `token`, `authorization`, or `password` in log output; such fields SHALL be redacted before logging.

---

### Requirement 10: Health Endpoint

**User Story:** As a platform engineer, I want a `/health` endpoint, so that load balancers and monitoring systems can verify the service is operational.

#### Acceptance Criteria

1. WHEN a `GET /health` request is received and the Database is reachable, THE Health_Endpoint SHALL respond with HTTP status `200` and a JSON body containing at minimum: `{ "status": "ok", "database": "ok", "timestamp": "<ISO-8601 UTC datetime string>" }`.
2. WHEN a `GET /health` request is received, THE Health_Endpoint SHALL verify Database connectivity by executing a lightweight query against the Prisma_Client within a 1000-millisecond timeout.
3. IF the Database is unreachable at the time of a `GET /health` request, THEN THE Health_Endpoint SHALL respond with HTTP status `503` and a JSON body containing at minimum `{ "status": "degraded", "database": "unreachable", "timestamp": "<ISO-8601 UTC datetime string>" }`.
4. IF the Database connectivity check does not complete within 1000 milliseconds, THEN THE Health_Endpoint SHALL treat the Database as unreachable and respond per Criterion 3.
5. WHEN the Database is reachable and a `GET /health` request is received, THE Health_Endpoint SHALL respond within 2000 milliseconds.

---

### Requirement 11: Rate Limiting

**User Story:** As a platform engineer, I want rate limiting applied globally, so that the service is protected from request flooding and abuse.

#### Acceptance Criteria

1. THE App SHALL apply `express-rate-limit` as a global middleware using a fixed-window algorithm, limiting each IP address to a configurable maximum number of requests per time window.
2. WHEN a client exceeds the rate limit, THE App SHALL respond with HTTP status `429` and a JSON body `{ "error": "Too Many Requests" }`.
3. THE App SHALL read rate limit parameters `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS` from the Config; IF these variables are absent, THE App SHALL default to a maximum of 100 requests per 60,000 milliseconds.
4. IF `RATE_LIMIT_MAX` or `RATE_LIMIT_WINDOW_MS` is present but fails validation (e.g., not a positive integer), THEN THE Config SHALL treat this as a configuration error per Requirement 4, Criterion 3, and terminate the process with exit code `1`.

---

### Requirement 12: README Documentation

**User Story:** As a developer joining the project, I want a comprehensive README, so that I can understand, set up, and run the service without external assistance.

#### Acceptance Criteria

1. THE Server SHALL include a `README.md` at the project root containing all of the following sections with the minimum content specified:
   - **Project Overview**: a description of the service's purpose (tamper-evident, append-only audit log) and key capabilities.
   - **Prerequisites**: Node.js minimum version and PostgreSQL minimum version required to run the service.
   - **Installation**: sequential shell commands sufficient to clone the repository, install dependencies, and configure the environment for local development.
   - **Environment Variables**: a reference table listing every variable name, a one-line description, and an example value.
   - **Available npm Scripts**: the name and a one-line description for at minimum the `start`, `build`, `test`, and `migrate:dev` scripts.
   - **Database Setup**: step-by-step migration instructions using `migrate:dev` and `db:generate`.
   - **API Endpoint Reference**: for the health check endpoint, the HTTP method, URL path, purpose description, and expected success status code.
2. THE Server SHALL include a `.gitignore` file that excludes `node_modules/`, `dist/`, `.env`, and `logs/` from version control.
