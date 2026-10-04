import { userRepository } from "../models/index.js";
import { signToken } from "../config/jwt.js";

const INVALID_CREDENTIALS = "Invalid email or password";

// A real hash of a throwaway string. Compared against when no account matches
// so an unknown email costs the same as a wrong password and the response
// cannot be used to enumerate admins by timing.
const DUMMY_HASH = "$2b$10$hNCzfU1QeNRbmS42pPvjMuyIFBg.N33CMT9STFmKKDXLXf9uBhFSq";

export async function login(req, res) {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const record = await userRepository.findOne(
      (u) => String(u.email).toLowerCase() === email,
    );

    const passwordMatches = await userRepository.verifyPassword(
      password,
      record ? record.password : DUMMY_HASH,
    );

    if (!record || !passwordMatches) {
      return res.status(401).json({ error: INVALID_CREDENTIALS });
    }

    if (record.role !== "Admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const token = await signToken(record);

    res.json({ token, user: await userRepository.findByIdSafe(record._id) });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ error: "Login failed" });
  }
}

export function me(req, res) {
  res.json({ user: req.user });
}