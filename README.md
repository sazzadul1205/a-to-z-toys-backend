# A to Z Kids World — API

Express 5 API for the toy storefront. JSON files under `data/` are the store;
Mongoose schemas are used purely for validation. Every write is admin-only.

```
config/      env-driven config, JWT signing, image processing, feature flags
controllers/ request handlers
middleware/  requireAuth / requireAdmin
models/      Mongoose schemas + a repository per collection
routes/      Express routers
scripts/     seed
tests/       Jest + supertest, against a throwaway data directory
```

## Running

```bash
npm install
npm run seed     # catalogue + first admin account
npm run dev      # nodemon, http://localhost:3000
npm start        # plain node
```

## Authentication

`POST /auth/login` takes an email and password and returns
`{ token, user }`. It issues tokens **only** for `role: "Admin"` accounts — a
non-admin gets `403`, so there is no customer session to manage.

The token is a JWT carrying `sub`, `role`, `email`, and `pwd`
(`passwordChangedAt` at issue time). `requireAuth` loads the user on every
request and compares `pwd` against the stored value, so **changing a password
invalidates every token already issued for that account**. That covers a
compromised password without needing a token blacklist.

`GET /auth/me` revalidates the token and returns the current user. The
storefront calls it on mount so a revoked account cannot linger in a stale
localStorage copy.

Passwords are never returned by any endpoint; `select: false` on the schema plus
an explicit strip in the repository means a stray field cannot leak one.

### Accounts

| Rule | Behaviour |
|---|---|
| Email must match `/^\S+@\S+\.\S+$/` | 400 otherwise |
| Password minimum 6 characters | 400 otherwise |
| Duplicate email | 409 |
| Demote or delete the **last** Admin | 409, so the staff area cannot be locked out |
| Change an Admin's password | Allowed — it does not count as demotion |

Non-admin accounts exist for review and order records; they simply cannot sign
in.

## Access rules

| Surface | Access |
|---|---|
| `GET /products`, `/categories`, `/reviews`, `/reviews/product/:id/summary` | Public |
| `POST /reviews` | Public, within a submit budget (see below) |
| `POST /auth/login` | Public, Admin only |
| `/uploads/*` static files | Public |
| Every other write, plus `/users`, `/orders`, `/upload` | Admin token |

Unauthenticated → `401`. Authenticated but not an admin → `403`.

`POST /reviews` has its own limiter (default 10 per hour per IP) so anonymous
spam cannot consume a visitor's general request allowance.

## Environment

Plain environment variables — there is no `dotenv`, so set them in the shell.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | API port |
| `CORS_ORIGIN` | `*` | Allowed browser origin |
| `JWT_SECRET` | generated | Signing key. If unset, a random secret is written to `data/.jwt-secret` (git-ignored) so tokens survive restarts. **Set it explicitly in production** — rotating it signs everyone out. |
| `JWT_EXPIRES_IN` | `1d` | Admin session length |
| `TRUST_PROXY` | unset | Number of proxy hops to trust for `req.ip`. Set this only when actually behind a proxy; `true` would let clients spoof `X-Forwarded-For` and defeat rate limiting. |
| `REVIEW_SUBMIT_LIMIT` | `10` | `POST /reviews` submissions per hour per IP |
| `DATA_DIR` | `./data` | Store location. The Jest suite points this at `.test-data/`. |
| `ORDER_PROCESSING` | enabled | `false` returns `403` on all order writes |
| `INVENTORY_MANAGEMENT` | enabled | `false` stops tracking stock |

## Seeding

```bash
npm run seed                    # idempotent
npm run seed -- --force         # add seed data alongside existing rows
npm run seed -- --reset-password
```

Seeding is safe to re-run: it skips categories and products that already exist.
It also **repairs** an admin account that has lost its role or name, which is
the only way back from a demoted admin — the API refuses to demote the last
Admin precisely so this state is not reachable through the app.

Override the account with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and
`SEED_ADMIN_NAME`.

**In production the seed refuses to run on the built-in defaults.** It requires
`SEED_ADMIN_EMAIL` and a `SEED_ADMIN_PASSWORD` of at least 12 characters, and
exits non-zero otherwise. Change the seeded password from
**Staff → your account → Password** before exposing this publicly.

## Uploads

`POST /upload/image` takes one file, `POST /upload/images` up to 5. Both convert
to WebP (1200×1200 max, `inside`, quality 80) and return a `/uploads/<name>.webp`
path.

- Accepted: JPEG, PNG, WebP, GIF, AVIF. Limit 5 MB.
- Decoded input is capped at 25 MP, so a small, heavily compressed file cannot
  force a huge allocation.
- Multi-file conversion runs **sequentially** — running every sharp pipeline at
  once scaled memory use by the file count.
- A failure part-way through deletes the files already written rather than
  leaving half a set behind.

Converted files are served from `/uploads` by `express.static` **before** the
rate limiter: they are cheap, cacheable, and public, so they should not spend a
visitor's API request budget.

## Storage

`models/JsonRepository.js` reads and writes one JSON file per collection. Writes
go to `<file>.tmp`, are `fsync`ed, then renamed over the target, so a crash
mid-write cannot leave a truncated file. Records carry a string `_id`.

This is not built for concurrent writers. `data/` is git-ignored.

## Tests

```bash
npm test
npm run test:coverage
```

201 tests across 18 suites, run with `--runInBand` and `--experimental-vm-modules`.

**Tests never touch `data/`.** `tests/setupEnv.js` sets `DATA_DIR` to
`.test-data/` before the data layer loads, and each test clears that directory.
This matters: the tests and the running app previously shared `data/`, so a
`npm test` wiped the seeded catalogue and the admin account.

Route tests authenticate through `tests/helpers/auth.js`, which creates a
throwaway admin per test.
