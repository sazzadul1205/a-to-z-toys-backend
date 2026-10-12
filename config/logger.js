import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, "..");
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT, "data");
const LOG_DIR = path.join(DATA_DIR, "logs");

const LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const LEVEL_NAMES = Object.keys(LEVELS);
const COLORS = {
  error: "\x1b[31m",
  warn: "\x1b[33m",
  info: "\x1b[36m",
  http: "\x1b[35m",
  debug: "\x1b[37m",
};
const RESET = "\x1b[0m";

let levelEnv = (process.env.LOG_LEVEL || "info").toLowerCase();
let currentLevel = LEVELS[levelEnv] ?? LEVELS.info;
const enableFile = process.env.LOG_FILE !== "false";

function ensureLogDir() {
  if (!enableFile) return;
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    /* best-effort */
  }
}

function formatTime() {
  return new Date().toISOString();
}

function padLevel(name) {
  return name.toUpperCase().padEnd(5);
}

function formatLine(levelName, message, meta) {
  const ts = formatTime();
  const parts = [ts, padLevel(levelName)];
  const reqId = global.__requestId;
  if (reqId) parts.push(`reqId=${reqId.slice(0, 8)}`);
  parts.push(message);
  let line = parts.join(" ");
  if (meta && Object.keys(meta).length > 0) {
    try {
      line += " " + JSON.stringify(meta);
    } catch {
      /* ignore circular refs */
    }
  }
  return line;
}

function writeFile(levelName, levelValue, line) {
  if (!enableFile || levelValue < currentLevel) return;
  ensureLogDir();
  const dateStr = new Date().toISOString().slice(0, 10);
  const logFile = path.join(LOG_DIR, `${dateStr}.log`);
  try {
    fs.appendFileSync(logFile, line + "\n", { encoding: "utf-8" });
  } catch {
    /* file write failure is non-fatal */
  }
}

function writeConsole(levelName, levelValue, line) {
  if (levelValue < currentLevel) return;
  const color = COLORS[levelName] || "";
  const colored = color ? `${color}${line}${RESET}` : line;
  if (levelName === "error") {
    console.error(colored);
  } else if (levelName === "warn") {
    console.warn(colored);
  } else {
    console.log(colored);
  }
}

function log(levelName, message, meta) {
  const levelValue = LEVELS[levelName];
  if (levelValue < currentLevel) return;
  const line = formatLine(levelName, message, meta);
  writeConsole(levelName, levelValue, line);
  writeFile(levelName, levelValue, line);
}

export const logger = {
  error: (message, meta) => log("error", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  info: (message, meta) => log("info", message, meta),
  http: (message, meta) => log("http", message, meta),
  debug: (message, meta) => log("debug", message, meta),
  getLevel: () => levelEnv,
  setLevel: (newLevel) => {
    levelEnv = newLevel.toLowerCase();
    currentLevel = LEVELS[levelEnv] ?? LEVELS.info;
  },
  getLogDir: () => LOG_DIR,
  getLogFiles: () => {
    try {
      return fs.existsSync(LOG_DIR)
        ? fs.readdirSync(LOG_DIR).filter((f) => f.endsWith(".log"))
        : [];
    } catch {
      return [];
    }
  },
  readLogFile: (filename) => {
    const target = path.join(LOG_DIR, filename);
    if (!fs.existsSync(target)) return null;
    return fs.readFileSync(target, "utf-8");
  },
};

global.__logger = logger;
