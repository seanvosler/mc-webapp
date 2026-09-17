import { createClient } from '@libsql/client';

const fileUrl = process.env.DATABASE_URL ?? 'file:./data/app.db';
export const db = createClient({ url: fileUrl });

let schemaReady = false;

export function ensureSchema() {
  if (schemaReady) return;
  const ddl = `
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS notes_created_idx ON notes(created_at);
  `;
  db.batch(
    ddl
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((sql) => ({ sql }))
  );
  schemaReady = true;
}
