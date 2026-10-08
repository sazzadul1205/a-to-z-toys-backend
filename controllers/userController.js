import { userRepository } from "../models/index.js";

export async function listUsers(req, res) {
  try {
    const users = await userRepository.findAllSafe();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getUser(req, res) {
  try {
    const user = await userRepository.findByIdSafe(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createUser(req, res) {
  try {
    const user = await userRepository.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function updateUser(req, res) {
  try {
    const updated = await userRepository.updateUser(req.params.id, req.body, req.user._id);
    res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function deleteUser(req, res) {
  try {
    await userRepository.deleteUser(req.params.id, req.user._id);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}