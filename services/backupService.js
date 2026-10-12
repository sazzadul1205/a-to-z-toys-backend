import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REGISTRY } from "../models/repositoryFactory.js";
import { DATA_DIR } from "../config/dataSource.js";
import { logger } from "../config/logger.js";
import { createRepository } from "../models/repositoryFactory.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BACKUP_DIR = path.join(DATA_DIR, "backups");

function ensureBackupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function formatTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function backupFilename(timestamp = null) {
  const ts = timestamp || formatTimestamp();
  return `backup-${ts}.json`;
}

function filePath(filename) {
  return path.join(BACKUP_DIR, filename);
}

export async function listBackups() {
  ensureBackupDir();
  try {
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json"));
    return files.map((filename) => {
      const fullPath = filePath(filename);
      const stat = fs.statSync(fullPath);
      let metadata = {};
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
        metadata = {
          createdAt: content.createdAt,
          version: content.version,
          dataSources: content.metadata?.dataSources,
          collectionCount: Object.keys(content.data || {}).length,
          collectionNames: Object.keys(content.data || []),
        };
      } catch {
        metadata = { parseError: true };
      }
      return {
        filename,
        size: stat.size,
        createdAt: stat.birthtime ? stat.birthtime.toISOString() : null,
        modifiedAt: stat.mtime.toISOString(),
        ...metadata,
      };
    }).sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function createBackup(options = {}) {
  ensureBackupDir();
  const timestamp = formatTimestamp();
  const filename = backupFilename(timestamp);
  const fullPath = filePath(filename);

  const backupData = {};
  const collectionSummaries = {};

  for (const [collectionName, Model] of REGISTRY) {
    try {
      const repo = createRepository(collectionName, Model);
      if (typeof repo.findAll !== "function") continue;

      const records = await repo.findAll();
      backupData[collectionName] = records;
      collectionSummaries[collectionName] = { count: records.length };

      logger.info(`Backed up collection: ${collectionName}`, { count: records.length });
    } catch (err) {
      logger.warn(`Failed to back up collection: ${collectionName}`, { error: err.message });
      collectionSummaries[collectionName] = { error: err.message };
    }
  }

  const backup = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    filename,
    metadata: {
      ...options,
      dataSources: process.env.DATA_SOURCE || "json",
      dataDir: DATA_DIR,
      collections: collectionSummaries,
    },
    data: backupData,
  };

  const tmpPath = `${fullPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(backup, null, 2), "utf-8");
  fs.renameSync(tmpPath, fullPath);

  logger.info("Backup created", { filename, size: fs.statSync(fullPath).size });
  return { filename, path: fullPath, backup };
}

export async function restoreBackup(filename, options = {}) {
  const fullPath = filePath(filename);
  if (!fs.existsSync(fullPath)) {
    const error = new Error(`Backup file not found: ${filename}`);
    error.code = "BACKUP_NOT_FOUND";
    throw error;
  }

  let backup;
  try {
    backup = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  } catch (err) {
    const error = new Error("Backup file is corrupt or invalid JSON");
    error.code = "BACKUP_CORRUPT";
    throw error;
  }

  if (backup.version !== "1.0") {
    logger.warn("Backup version mismatch", { expected: "1.0", actual: backup.version });
  }

  const restoreLog = {};
  const skipCollections = options.skipCollections || [];

  for (const [collectionName, Model] of REGISTRY) {
    if (skipCollections.includes(collectionName)) {
      restoreLog[collectionName] = { skipped: true };
      continue;
    }

    if (!(collectionName in backup.data)) {
      restoreLog[collectionName] = { skipped: true, reason: "not in backup" };
      continue;
    }

    try {
      const repo = createRepository(collectionName, Model);
      if (typeof repo.create !== "function" || typeof repo.deleteById !== "function") {
        restoreLog[collectionName] = { skipped: true, reason: "no write methods" };
        continue;
      }

      if (options.clearFirst !== false) {
        const existing = await repo.findAll();
        for (const record of existing) {
          await repo.deleteById(record._id);
        }
        restoreLog[collectionName] = { ...restoreLog[collectionName], cleared: existing.length };
      }

      let restored = 0;
      let errors = 0;
      for (const record of backup.data[collectionName]) {
        try {
          if (options.clearFirst !== false) {
            await repo.create(record);
          } else {
            const exists = await repo.findById(record._id);
            if (exists) {
              await repo.updateById(record._id, record);
            } else {
              await repo.create(record);
            }
          }
          restored++;
        } catch (err) {
          errors++;
          logger.warn(`Failed to restore record in ${collectionName}`, {
            error: err.message,
            id: record._id,
          });
        }
      }
      restoreLog[collectionName] = { ...restoreLog[collectionName], restored, errors };
      logger.info(`Restored collection: ${collectionName}`, { restored, errors });
    } catch (err) {
      restoreLog[collectionName] = { ...restoreLog[collectionName], error: err.message };
      logger.error(`Failed to restore collection: ${collectionName}`, { error: err.message });
    }
  }

  logger.info("Backup restore completed", { filename });
  return { filename, restoreLog };
}

export async function deleteBackup(filename) {
  const fullPath = filePath(filename);
  if (!fs.existsSync(fullPath)) {
    const error = new Error(`Backup file not found: ${filename}`);
    error.code = "BACKUP_NOT_FOUND";
    throw error;
  }
  fs.unlinkSync(fullPath);
  logger.info("Backup deleted", { filename });
  return { filename, deleted: true };
}

export async function getBackupData(filename) {
  const fullPath = filePath(filename);
  if (!fs.existsSync(fullPath)) {
    const error = new Error(`Backup file not found: ${filename}`);
    error.code = "BACKUP_NOT_FOUND";
    throw error;
  }
  const content = fs.readFileSync(fullPath, "utf-8");
  const backup = JSON.parse(content);
  return backup.data;
}
