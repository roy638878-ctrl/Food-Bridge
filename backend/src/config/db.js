import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "url";
import { env } from "./env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = path.resolve(__dirname, "../db/migrations/001_init_sqlite.sql");

let dbInstance = null;

/**
 * Initialize and return a singleton SQLite DatabaseSync instance.
 * Enables foreign keys and WAL mode for safe concurrent reads/writes.
 */
export function getDb(customPath = null) {
  if (dbInstance && !customPath) return dbInstance;

  const targetPath = customPath || path.resolve(process.cwd(), env.dbPath);
  if (targetPath !== ":memory:") {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  }

  const db = new DatabaseSync(targetPath);
  db.exec("PRAGMA foreign_keys = ON;");
  if (targetPath !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL;");
  }

  const schemaSql = fs.readFileSync(MIGRATION_PATH, "utf8");
  db.exec(schemaSql);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

/**
 * Execute a callback inside an atomic SQLite IMMEDIATE transaction.
 */
export function runTransaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Ignore rollback error if transaction already closed
    }
    throw err;
  }
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
