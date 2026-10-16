// Refuses to boot in production without an explicit JWT secret. A generated
// secret (data/.jwt-secret) is fine for local dev but would sign every admin
// out on the next restart, so it is not acceptable for production.
import process from "node:process";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_ENV = "production";
}

const secret = process.env.JWT_SECRET;
if (!secret || secret.trim().length < 16) {
  console.error(
    "[startup] FATAL: JWT_SECRET must be set to a string of at least 16 characters " +
      "in production. See .env.production.",
  );
  process.exit(1);
}