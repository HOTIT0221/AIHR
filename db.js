// SQLite storage, using the SQLite engine built into Electron's Node runtime (node:sqlite).
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA_VERSION = 1;
const STATE_KEYS = ['new', 'preparing', 'inprogress', 'waiting', 'approved', 'rejected', 'onhold', 'inactive'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

let db;
let stmts;

function open(dir) {
  fs.mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(path.join(dir, 'hrmanager.db'));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;');
  migrate();

  stmts = {
    all: db.prepare('SELECT * FROM collaborators ORDER BY updated_at DESC'),
    get: db.prepare('SELECT * FROM collaborators WHERE id = ?'),
    upsert: db.prepare(`
      INSERT INTO collaborators
        (id, name, linkedin, contact, da_date, hs_date, anydesk_id, anydesk_password, state, notes, created_at, updated_at)
      VALUES
        (:id, :name, :linkedin, :contact, :da_date, :hs_date, :anydesk_id, :anydesk_password, :state, :notes, :created_at, :updated_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, linkedin = excluded.linkedin, contact = excluded.contact,
        da_date = excluded.da_date, hs_date = excluded.hs_date,
        anydesk_id = excluded.anydesk_id, anydesk_password = excluded.anydesk_password,
        state = excluded.state, notes = excluded.notes, updated_at = excluded.updated_at`),
    remove: db.prepare('DELETE FROM collaborators WHERE id = ?'),
    count: db.prepare('SELECT COUNT(*) AS n FROM collaborators'),
  };

  return migrateFromJson(dir);
}

function migrate() {
  const { user_version: v } = db.prepare('PRAGMA user_version').get();
  if (v < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS collaborators (
        id               TEXT PRIMARY KEY,
        name             TEXT NOT NULL,
        linkedin         TEXT NOT NULL DEFAULT '',
        contact          TEXT NOT NULL DEFAULT '',
        da_date          TEXT,             -- YYYY-MM-DD, NULL = not taken
        hs_date          TEXT,             -- YYYY-MM-DD, NULL = not taken
        anydesk_id       TEXT NOT NULL DEFAULT '',
        anydesk_password TEXT NOT NULL DEFAULT '',
        state            TEXT NOT NULL DEFAULT 'new',
        notes            TEXT NOT NULL DEFAULT '',
        created_at       INTEGER NOT NULL,
        updated_at       INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_collaborators_state ON collaborators(state);
    `);
  }
  // Future schema changes go here as `if (v < 2) { ... }`.
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

/** One-time import of the old collaborators.json store (kept as .migrated afterwards). */
function migrateFromJson(dir) {
  const file = path.join(dir, 'collaborators.json');
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const list = Array.isArray(parsed) ? parsed : parsed.collaborators || [];
    const res = upsertMany(list, { keepTimestamps: true });
    fs.renameSync(file, file + '.migrated');
    return `Moved ${res.added + res.updated} collaborators from the old JSON file into SQLite.`;
  } catch (err) {
    return `Could not import old collaborators.json: ${err.message}`;
  }
}

// ── Row <-> object mapping ──
const toObj = (r) => ({
  id: r.id,
  name: r.name,
  linkedin: r.linkedin,
  contact: r.contact,
  daDate: r.da_date || '',
  hsDate: r.hs_date || '',
  anydeskId: r.anydesk_id,
  anydeskPassword: r.anydesk_password,
  state: r.state,
  notes: r.notes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

function toRow(c, { keepTimestamps = false } = {}) {
  const name = String(c?.name ?? '').trim();
  if (!name) throw new Error('Name is required.');
  if (typeof c.id !== 'string' || !c.id) throw new Error('Missing id.');
  const now = Date.now();
  return {
    id: c.id,
    name,
    linkedin: String(c.linkedin ?? ''),
    contact: String(c.contact ?? ''),
    da_date: DATE_RE.test(c.daDate) ? c.daDate : null,
    hs_date: DATE_RE.test(c.hsDate) ? c.hsDate : null,
    anydesk_id: String(c.anydeskId ?? ''),
    anydesk_password: String(c.anydeskPassword ?? ''),
    state: STATE_KEYS.includes(c.state) ? c.state : 'new',
    notes: String(c.notes ?? ''),
    created_at: Number(c.createdAt) || now,
    updated_at: keepTimestamps ? Number(c.updatedAt) || now : now,
  };
}

// ── Public API ──
const list = () => stmts.all.all().map(toObj);

function upsert(c) {
  stmts.upsert.run(toRow(c));
  return toObj(stmts.get.get(c.id));
}

function remove(id) {
  stmts.remove.run(String(id));
}

function upsertMany(items, opts = {}) {
  let added = 0, updated = 0, skipped = 0;
  db.exec('BEGIN');
  try {
    for (const c of items) {
      if (!c || typeof c !== 'object' || !String(c.name ?? '').trim()) { skipped++; continue; }
      const item = { ...c, id: typeof c.id === 'string' && c.id ? c.id : require('crypto').randomUUID() };
      const exists = !!stmts.get.get(item.id);
      stmts.upsert.run(toRow(item, opts));
      exists ? updated++ : added++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return { added, updated, skipped };
}

/** Consistent snapshot copy of the whole database (safe while the app is running). */
function backupTo(file) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
  db.prepare('VACUUM INTO ?').run(file);
}

/** Read collaborators from another hrmanager .db file (for restore / moving PCs). */
function readExternal(file) {
  const other = new DatabaseSync(file, { readOnly: true });
  try {
    return other.prepare('SELECT * FROM collaborators').all().map(toObj);
  } finally {
    other.close();
  }
}

function close() {
  try { db?.close(); } catch {}
}

module.exports = { open, list, upsert, remove, upsertMany, backupTo, readExternal, close };
