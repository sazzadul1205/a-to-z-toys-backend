#!/usr/bin/env node
// Production entrypoint. Same as `node server.js` but forces NODE_ENV=production
// (so helmet, CORS, and rate-limit defaults take their production values) and
// refuses to start unless JWT_SECRET is explicitly set — a generated secret
// would invalidate every token on restart.
import "./env-check.js";
import "../server.js";