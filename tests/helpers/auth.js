import request from "supertest";
import app from "../../app.js";
import { userRepository } from "../../models/index.js";
import { signToken } from "../../config/jwt.js";

// Fixed secret so tests never touch data/.jwt-secret.
process.env.JWT_SECRET = process.env.JWT_SECRET || "jest-only-signing-secret";

export const ADMIN_USER = {
  name: "Test Admin",
  email: "admin@test.local",
  password: "admin12345",
  role: "Admin",
};

export const CUSTOMER_USER = {
  name: "Test Customer",
  email: "customer@test.local",
  password: "customer123",
  role: "Customer",
};

async function upsertUser(seed) {
  const existing = await userRepository.findOne(
    (u) => String(u.email).toLowerCase() === seed.email,
  );
  if (!existing) await userRepository.createUser(seed);

  const stored = await userRepository.findOne(
    (u) => String(u.email).toLowerCase() === seed.email,
  );
  return signToken(stored);
}

// Call from beforeEach after cleanData(): the data wipe removes all accounts.
export async function ensureAdminToken() {
  return upsertUser(ADMIN_USER);
}

export async function signIn(seed) {
  return upsertUser(seed);
}

let adminAgent = null;
let customerAgent = null;

function buildAgent(token) {
  const agent = request.agent(app);
  const authed = (test) => test.set("Authorization", `Bearer ${token}`);
  return {
    get: (url) => authed(agent.get(url)),
    post: (url) => authed(agent.post(url)),
    put: (url) => authed(agent.put(url)),
    patch: (url) => authed(agent.patch(url)),
    delete: (url) => authed(agent.delete(url)),
  };
}

export function api() {
  if (!adminAgent) {
    throw new Error("Call ensureAdminToken() before using api()");
  }
  return adminAgent;
}

export function setAdminAgent(token) {
  adminAgent = buildAgent(token);
  return adminAgent;
}

export function customerApi() {
  if (!customerAgent) {
    throw new Error("Call signIn(CUSTOMER_USER) before using customerApi()");
  }
  return customerAgent;
}

export function setCustomerAgent(token) {
  customerAgent = buildAgent(token);
  return customerAgent;
}

export async function setupAdmin() {
  return setAdminAgent(await ensureAdminToken());
}

export async function setupCustomer() {
  return setCustomerAgent(await signIn(CUSTOMER_USER));
}