# AGENTS — A to Z Kids World API

Express 5 (ESM) JSON-file API. JSON files under `data/` are the store; Mongoose
schemas validate input. Every write is admin-only.

## Commands
| Command | What |
|---|---|
| `npm run dev` | nodemon, `http://localhost:3000`. |
| `npm start` | plain `node server.js`. |
| `npm run seed` | Idempotent catalogue + first admin account. |
| `npm test` | Jest + supertest, `--runInBand --experimental-vm-modules`. |
| `npm run test:coverage` | Same, with coverage. |

There is no `lint` or `build` script — the static gate is the test suite
(201 tests across 18 suites).

## Ports & process ownership of rate counters
- Listens on `http://localhost:3000`.
- Rate-limit counters live in the API process, so the limits **must** be raised for
  the browser E2E run and read from the *API terminal*, not the Playwright terminal:
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
`PORT` (3000), `CORS_ORIGIN` (*), `JWT_SECRET`, `JWT_EXPIRES_IN` (1d),
`DATA_SOURCE` (`json`|`sqlite`|`mysql`, default `json`) selects the engine;
`DB_SQLITE_PATH`; `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` (MySQL only);
`DB_SYNC`. Data lives in `DATA_DIR` (default `./data`; tests use `.test-data/`). Feature flags: `ORDER_PROCESSING`,
`INVENTORY_MANAGEMENT`. Rate-limit knobs: `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`,
`REVIEW_SUBMIT_LIMIT`, `REVIEW_SUBMIT_WINDOW_MS`.

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

See `README.md` for details on uploads, storage, seeding flags, and the route tests'
throwaway-admin auth helper (`tests/helpers/auth.js`).
