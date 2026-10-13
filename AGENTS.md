# AGENTS — A to Z Kids World API

Express 5 (ESM) JSON-file API. JSON files under `data/` are the store; Mongoose
schemas validate input. Every write is admin-only.

## Commands

| Command                 | What                                                                     |
| ----------------------- | ------------------------------------------------------------------------ |
| `npm run dev`           | nodemon, `http://localhost:3000`.                                        |
| `npm start`             | plain `node server.js`.                                                  |
| `npm run seed`          | Idempotent catalogue + first admin account.                              |
| `npm test`              | Jest + supertest, `--runInBand --experimental-vm-modules` (JSON engine). |
| `npm run test:sqlite`   | Same suite with `DATA_SOURCE=sqlite` (in-memory DB).                     |
| `npm run test:engines`  | Runs `npm test` then `npm run test:sqlite`.                              |
| `npm run test:coverage` | Same, with coverage.                                                     |

There is no `lint` or `build` script — the static gate is the test suite
(150 tests across 15 suites).

## Ports & process ownership of rate counters

- Listens on `http://localhost:3000`.
- Rate-limit counters live in the API process, so the limits **must** be raised for
  the browser E2E run and read from the _API terminal_, not the Playwright terminal:
  ```bash
  RATE_LIMIT_MAX=100000 RATE_LIMIT_WINDOW_MS=3600000 \
  REVIEW_SUBMIT_LIMIT=10000 REVIEW_SUBMIT_WINDOW_MS=600000 \
  npm start
  ```
  The E2E global setup checks this and aborts with these instructions if the API is
  still throttling.

## Environment

Plain env vars (loaded from a git-ignored `.env` via `dotenv`, with shell values
taking precedence). See `README.md` for the full table. Key entries:
`PORT` (3000), `CORS_ORIGIN` (\*), `JWT_SECRET`, `JWT_EXPIRES_IN` (1d),
`DATA_SOURCE` (`json`|`sqlite`|`mysql`, default `json`) selects the engine;
`DB_SQLITE_PATH`; `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` (MySQL only);
`DB_SYNC`. Data lives in `DATA_DIR` (default `./data`; tests use `.test-data/`). Feature flags: `ORDER_PROCESSING`,
`INVENTORY_MANAGEMENT`. Rate-limit knobs: `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`,
`REVIEW_SUBMIT_LIMIT`, `REVIEW_SUBMIT_WINDOW_MS`.

## Logging

- `config/logger.js` provides a leveled logger (`error`, `warn`, `info`, `http`, `debug`).
  Console output is always on; file output writes to `data/logs/<date>.log`.
- `LOG_LEVEL` env var sets the threshold (default `info`); `LOG_FILE=false` disables
  file output in tests or constrained environments.
- `middleware/logging.js` assigns a request ID, logs every HTTP request/response
  (method, URL, status, duration), and logs unhandled errors with stack traces.
  Routes: `GET /logs` (list), `GET /logs/:filename` (read), `DELETE /logs` (clear) —
  all admin-only.

## Backup & Restore

- `services/backupService.js` exports all collections via the repository layer
  (works across JSON, SQLite, and MySQL backends) to timestamped JSON files in
  `data/backups/`.
- Routes (admin-only):
  - `GET /backup` — list available backups
  - `POST /backup` — create a new backup
  - `GET /backup/:filename/data` — preview backup contents
  - `POST /backup/:filename/restore` — restore (optionally `skipCollections`, `clearFirst`)
  - `DELETE /backup/:filename` — delete a backup
- Admin route is registered in `src/App.jsx`; UI lives in
  `src/Frontend/Pages/BackupRestore/`.

## Order credit / debt

- `POST /orders` accepts `paymentMethod: "due"`; the order is created with
  `status: "Due"`, `amountPaid: 0`, and a `balance` equal to the order total.
- `discountType: "fixed"|"percentage"` and `discountValue` are stored alongside
  `discount` so the frontend can round-trip the discount correctly.
- `customerEmail` and `customerAddress` are accepted and stored.
- Orders with `amountPaid < total` carry a `balance` representing what is still owed.

## Auth model

- `POST /auth/login` returns `{ token, user }` **only for `role: "Admin"`**; non-admins
  get `403`, so there is no customer session to manage.
- The token is a JWT carrying `pwd` (`passwordChangedAt` at issue time); changing a
  password invalidates all prior tokens. `GET /auth/me` revalids on mount.
- Access: public reads (`GET /products`, `/categories`, `/reviews`, summaries);
  public `POST /reviews` (its own limiter); everything else + `/users`/`/orders`/
  `/upload` requires an admin token. Unauth → 401, auth-but-not-admin → 403.
- Demoting/deleting the **last** Admin returns `409`.

## Tests never touch `data/`

`tests/setupEnv.js` sets `DATA_DIR` to `.test-data/`, which each test clears, so a
`npm test` no longer wipes the seeded catalogue or admin account.

The same suite runs against every `DATA_SOURCE` (`json`, `sqlite`, `mysql`); use
`npm run test:sqlite` / `npm run test:engines`. SQLite tests run against an
in-memory DB (`DB_SQLITE_PATH=:memory:`, set by `tests/setupEnv.js`) so per-file
module registries never leave a locked database file behind. `npm install` must
be allowed to build `better-sqlite3` (recorded under `allowScripts` in
`package.json`); with install scripts blocked the native addon cannot load and
the SQLite tests cannot run.

See `README.md` for details on uploads, storage, seeding flags, and the route tests'
throwaway-admin auth helper (`tests/helpers/auth.js`).
