import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Honours DATA_DIR so the test suite keeps its generated secret out of the
// app's real data directory.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "data");
const SECRET_FILE = path.join(DATA_DIR, ".jwt-secret");

const DEFAULT_EXPIRES_IN = "1d";

let secretPromise = null;

async function resolveSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;

  try {
    const existing = await fs.readFile(SECRET_FILE, "utf-8");
    const trimmed = existing.trim();
    if (trimmed) return trimmed;
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  const generated = crypto.randomBytes(48).toString("hex");
  await fs.writeFile(SECRET_FILE, generated, { encoding: "utf-8", mode: 0o600 });
  console.warn(
    "[auth] JWT_SECRET is not set. Generated a secret at data/.jwt-secret. " +
      "Set JWT_SECRET in the environment for stable tokens across data resets.",
  );
  return generated;
}

export function getJwtSecret() {
  if (!secretPromise) {
    secretPromise = resolveSecret().catch((err) => {
      secretPromise = null;
      throw err;
    });
  }
  return secretPromise;
}

export function getTokenExpiry() {
  return process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN;
}

export async function signToken(user) {
  const secret = await getJwtSecret();
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
      email: user.email,
      // A password change moves this timestamp, which invalidates every
      // token already issued for the account.
      pwd: new Date(user.passwordChangedAt ?? 0).getTime(),
    },
    secret,
    { expiresIn: getTokenExpiry() },
  );
}

export async function verifyToken(token) {
  const secret = await getJwtSecret();
  return jwt.verify(token, secret);
}
