// utils/logger.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __file = fileURLToPath(import.meta.url);
const __dir = path.dirname(__file);

const logsDir = path.join(__dir, "..", "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const appLog = path.join(logsDir, "app.log");
const errLog = path.join(logsDir, "errors.log");

function appendLog(file, line) {
  try {
    fs.appendFileSync(file, `${new Date().toISOString()} ${line}\n`);
  } catch (e) {
    // if logging fails, fallback to console
    console.error("Failed writing log:", e);
  }
}

export const logger = {
  info: (...args) => {
    console.log("[INFO]", ...args);
    appendLog(appLog, `[INFO] ${args.map(String).join(" ")}`);
  },
  warn: (...args) => {
    console.warn("[WARN]", ...args);
    appendLog(appLog, `[WARN] ${args.map(String).join(" ")}`);
  },
  error: (...args) => {
    console.error("[ERROR]", ...args);
    appendLog(errLog, `[ERROR] ${args.map(String).join(" ")}`);
  },
  debug: (...args) => {
    console.debug("[DEBUG]", ...args);
    appendLog(appLog, `[DEBUG] ${args.map(String).join(" ")}`);
  },
};

export function logShutdown(reason, err) {
  logger.error(`[SHUTDOWN] ${reason}`, err ? (err.stack || err.message) : "");
}

export function logUnhandledError(err, context = "unhandled") {
  logger.error(`[UNHANDLED:${context}]`, err?.stack || err?.message || err);
}
