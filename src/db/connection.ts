import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { schema } from './schema';

export type DB = Database.Database;

export function openDatabase(filename: string): DB {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(schema);
  return db;
}
