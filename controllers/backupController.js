import {
  createBackup,
  restoreBackup,
  listBackups,
  deleteBackup,
  getBackupData,
} from "../services/backupService.js";
import { logger } from "../config/logger.js";

export async function createBackupHandler(req, res) {
  try {
    const result = await createBackup({ createdBy: req.user?.email || "unknown" });
    res.status(201).json({
      message: "Backup created successfully",
      filename: result.filename,
      size: result.size,
      metadata: result.backup.metadata,
    });
  } catch (err) {
    logger.error("Backup creation failed", { error: err.message });
    res.status(500).json({ error: "Backup failed", details: err.message });
  }
}

export async function restoreBackupHandler(req, res) {
  try {
    const { filename } = req.params;
    const options = {
      clearFirst: req.body?.clearFirst !== false,
      skipCollections: req.body?.skipCollections,
    };
    const result = await restoreBackup(filename, options);
    res.json({
      message: "Restore completed",
      filename,
      restoreLog: result.restoreLog,
    });
  } catch (err) {
    if (err.code === "BACKUP_NOT_FOUND" || err.code === "BACKUP_CORRUPT") {
      return res.status(404).json({ error: err.message });
    }
    logger.error("Restore failed", { error: err.message });
    res.status(500).json({ error: "Restore failed", details: err.message });
  }
}

export async function listBackupsHandler(req, res) {
  try {
    const backups = await listBackups();
    res.json({ backups });
  } catch (err) {
    logger.error("List backups failed", { error: err.message });
    res.status(500).json({ error: "Failed to list backups", details: err.message });
  }
}

export async function deleteBackupHandler(req, res) {
  try {
    const { filename } = req.params;
    await deleteBackup(filename);
    res.json({ message: "Backup deleted", filename });
  } catch (err) {
    if (err.code === "BACKUP_NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    logger.error("Delete backup failed", { error: err.message });
    res.status(500).json({ error: "Failed to delete backup", details: err.message });
  }
}

export async function getBackupHandler(req, res) {
  try {
    const { filename } = req.params;
    const data = await getBackupData(filename);
    res.json(data);
  } catch (err) {
    if (err.code === "BACKUP_NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
    logger.error("Get backup failed", { error: err.message });
    res.status(500).json({ error: "Failed to read backup", details: err.message });
  }
}


