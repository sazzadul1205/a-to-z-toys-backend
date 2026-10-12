import fs from "node:fs";
import path from "node:path";
import { logger } from "../config/logger.js";

export async function getLogFilesHandler(req, res) {
  try {
    const files = logger.getLogFiles();
    const logDir = logger.getLogDir();
    const fileInfos = files.map((filename) => {
      const fullPath = path.join(logDir, filename);
      const stat = fs.statSync(fullPath);
      return {
        filename,
        size: stat.size,
        createdAt: stat.birthtime ? stat.birthtime.toISOString() : null,
        modifiedAt: stat.mtime.toISOString(),
      };
    }).sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));

    res.json({ files: fileInfos });
  } catch (err) {
    logger.error("Failed to list log files", { error: err.message });
    res.status(500).json({ error: "Failed to list log files", details: err.message });
  }
}

export async function readLogHandler(req, res) {
  try {
    const { filename } = req.params;

    // Prevent path traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ error: "Invalid filename" });
    }
    if (!filename.endsWith(".log")) {
      return res.status(400).json({ error: "Only .log files are accessible" });
    }

    const content = logger.readLogFile(filename);
    if (content === null) {
      return res.status(404).json({ error: `Log file not found: ${filename}` });
    }

    const lines = content.split("\n").filter((l) => l.trim());
    const limit = Number(req.query.limit) || 500;
    const offset = Number(req.query.offset) || 0;
    const sliced = lines.slice(offset, offset + limit);

    res.json({
      filename,
      totalLines: lines.length,
      offset,
      limit,
      lines: sliced,
    });
  } catch (err) {
    logger.error("Failed to read log file", { error: err.message });
    res.status(500).json({ error: "Failed to read log file", details: err.message });
  }
}

export async function clearLogsHandler(req, res) {
  try {
    const logDir = logger.getLogDir();
    if (!fs.existsSync(logDir)) {
      return res.json({ message: "No log files to clear" });
    }

    const files = fs.readdirSync(logDir).filter((f) => f.endsWith(".log"));
    const deleted = files.length;
    for (const f of files) {
      fs.unlinkSync(path.join(logDir, f));
    }

    logger.info("Log files cleared", { count: deleted });
    res.json({ message: "Logs cleared", deleted });
  } catch (err) {
    logger.error("Failed to clear logs", { error: err.message });
    res.status(500).json({ error: "Failed to clear logs", details: err.message });
  }
}
