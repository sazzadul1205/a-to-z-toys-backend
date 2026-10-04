import { verifyToken } from "../config/jwt.js";
import { userRepository } from "../models/index.js";

function extractToken(req) {
  const header = req.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const user = await userRepository.findByIdSafe(payload.sub);
  if (!user) {
    return res.status(401).json({ error: "Account no longer exists" });
  }

  // A password change invalidates tokens issued before it.
  if (payload.pwd !== new Date(user.passwordChangedAt ?? 0).getTime()) {
    return res.status(401).json({ error: "Session invalidated, sign in again" });
  }

  req.user = user;
  return next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  return next();
}