import bcrypt from "bcryptjs";
import { createJsonRepository } from "./JsonRepository.js";
import { validateAndBuild } from "../config/validate.js";
import User from "./User.js";

const base = createJsonRepository("users");
const SALT_ROUNDS = 10;

function stripPassword(user) {
  if (!user) return user;
  const { password, ...safe } = user;
  return safe;
}

async function createUser(data) {
  const email = (data.email || "").trim().toLowerCase();

  const exists = await base.findOne(
    (u) => u.email.toLowerCase() === email,
  );
  if (exists) {
    const error = new Error("Email already registered");
    error.status = 409;
    throw error;
  }

  const { valid, errors } = await validateAndBuild(User, data);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const finalData = {
    ...data,
    email,
    password: hash,
    passwordChangedAt: data.passwordChangedAt ?? new Date(),
  };

  const { valid: v2, doc, errors: e2 } = await validateAndBuild(User, finalData);
  if (!v2) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = e2;
    throw error;
  }

  const created = await base.create(doc);
  return stripPassword(created);
}

async function countAdmins(excludeId) {
  const users = await base.findAll();
  return users.filter(
    (u) => u.role === "Admin" && String(u._id) !== String(excludeId),
  ).length;
}

// Guard against locking everyone out of the staff area.
async function assertAnotherAdminRemains(id) {
  if ((await countAdmins(id)) === 0) {
    const error = new Error("Cannot remove the last remaining Admin account");
    error.status = 409;
    throw error;
  }
}

async function deleteUser(id) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  if (existing.role === "Admin") {
    await assertAnotherAdminRemains(existing._id);
  }

  await base.deleteById(existing._id);
  return stripPassword(existing);
}

async function updateUser(id, data) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  if (
    data.email &&
    data.email.toLowerCase() !== existing.email.toLowerCase()
  ) {
    const dup = await base.findOne(
      (u) => u.email.toLowerCase() === data.email.toLowerCase(),
    );
    if (dup) {
      const error = new Error("Email already registered");
      error.status = 409;
      throw error;
    }
  }

  if (data.role && data.role !== existing.role && data.role !== "Admin") {
    await assertAnotherAdminRemains(existing._id);
  }

  let newPassword = existing.password;
  let passwordChangedAt = existing.passwordChangedAt;
  if (data.password) {
    newPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    passwordChangedAt = new Date();
  }

  const merged = {
    ...existing,
    ...data,
    _id: existing._id,
    createdAt: existing.createdAt,
    password: newPassword,
    passwordChangedAt,
  };

  const { valid, doc, errors } = await validateAndBuild(User, merged);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  const updated = await base.updateById(existing._id, doc);
  return stripPassword(updated);
}

async function findAllSafe() {
  const users = await base.findAll();
  return users.map(stripPassword);
}

async function findByIdSafe(id) {
  const user = await base.findById(id);
  return stripPassword(user);
}

async function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export const userRepository = {
  ...base,
  createUser,
  updateUser,
  deleteUser,
  findAllSafe,
  findByIdSafe,
  verifyPassword,
};