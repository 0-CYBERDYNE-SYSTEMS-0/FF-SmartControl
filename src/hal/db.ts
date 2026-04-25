import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const dbPath = join(process.cwd(), 'data', 'fft_nano.db');
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

export function runMigrations(): void {
  const db = getDb();
  const migrationPath = join(__dirname, 'migration.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  db.exec(sql);
}
