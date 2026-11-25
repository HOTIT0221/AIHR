// SQLite storage, using the SQLite engine built into Electron's Node runtime (node:sqlite).
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

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
        (id, name, linkedin, contact, da_date, hs_date, da_state, hs_state, anydesk_id, anydesk_password, notes, created_at, updated_at)
      VALUES
        (:id, :name, :linkedin, :contact, :da_date, :hs_date, :da_state, :hs_state, :anydesk_id, :anydesk_password, :notes, :created_at, :updated_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, linkedin = excluded.linkedin, contact = excluded.contact,
        da_date = excluded.da_date, hs_date = excluded.hs_date,
        da_state = excluded.da_state, hs_state = excluded.hs_state,
        anydesk_id = excluded.anydesk_id, anydesk_password = excluded.anydesk_password,
        notes = excluded.notes, updated_at = excluded.updated_at`),
    remove: db.prepare('DELETE FROM collaborators WHERE id = ?'),
    count: db.prepare('SELECT COUNT(*) AS n FROM collaborators'),
  };

  return migrateFromJson(dir);
}

/** Schema migrations, keyed by PRAGMA user_version. Each step runs in its own transaction. */
function migrate() {
  let version = db.prepare('PRAGMA user_version').get().user_version;
  const step = (to, sql) => {
    if (version >= to) return;
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${to}`);
      db.exec('COMMIT');
      version = to;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };

  step(1, `
    CREATE TABLE IF NOT EXISTS collaborators (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      linkedin         TEXT NOT NULL DEFAULT '',
      contact          TEXT NOT NULL DEFAULT '',
      da_date          TEXT,             -- YYYY-MM-DD, NULL = no date
      hs_date          TEXT,             -- YYYY-MM-DD, NULL = no date
      anydesk_id       TEXT NOT NULL DEFAULT '',
      anydesk_password TEXT NOT NULL DEFAULT '',
      state            TEXT NOT NULL DEFAULT 'new',
      notes            TEXT NOT NULL DEFAULT '',
      created_at       INTEGER NOT NULL,
      updated_at       INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_collaborators_state ON collaborators(state);
  `);

  // v2: one status per assessment instead of one per person. The old state goes to the
  // assessments that have a date; an assessment without a date (while the other has one) starts as 'new'.
  step(2, `
    ALTER TABLE collaborators ADD COLUMN da_state TEXT NOT NULL DEFAULT 'new';
    ALTER TABLE collaborators ADD COLUMN hs_state TEXT NOT NULL DEFAULT 'new';
    UPDATE collaborators SET
      da_state = CASE WHEN da_date IS NULL AND hs_date IS NOT NULL THEN 'new' ELSE state END,
      hs_state = CASE WHEN hs_date IS NULL AND da_date IS NOT NULL THEN 'new' ELSE state END;
    DROP INDEX IF EXISTS idx_collaborators_state;
    ALTER TABLE collaborators DROP COLUMN state;
    CREATE INDEX idx_collaborators_da_state ON collaborators(da_state);
    CREATE INDEX idx_collaborators_hs_state ON collaborators(hs_state);
  `);
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
const cleanState = (s) => (STATE_KEYS.includes(s) ? s : 'new');

/** Same rule as migration v2, for old JSON backups and old .db files that only have one `state`. */
function splitLegacyState(state, daDate, hsDate) {
  const s = cleanState(state);
  const hasDa = DATE_RE.test(daDate || '');
  const hasHs = DATE_RE.test(hsDate || '');
  if (!hasDa && !hasHs) return { da: s, hs: s };
  return { da: hasDa ? s : 'new', hs: hasHs ? s : 'new' };
}

function toObj(r) {
  const legacy = r.da_state === undefined ? splitLegacyState(r.state, r.da_date, r.hs_date) : null;
  return {
    id: r.id,
    name: r.name,
    linkedin: r.linkedin,
    contact: r.contact,
    daDate: r.da_date || '',
    hsDate: r.hs_date || '',
    anydeskId: r.anydesk_id,
    anydeskPassword: r.anydesk_password,
    daState: legacy ? legacy.da : cleanState(r.da_state),
    hsState: legacy ? legacy.hs : cleanState(r.hs_state),
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toRow(c, { keepTimestamps = false } = {}) {
  const name = String(c?.name ?? '').trim();
  if (!name) throw new Error('Name is required.');
  if (typeof c.id !== 'string' || !c.id) throw new Error('Missing id.');
  const now = Date.now();
  const legacy = c.daState === undefined && c.hsState === undefined
    ? splitLegacyState(c.state, c.daDate, c.hsDate) : null;
  return {
    id: c.id,
    name,
    linkedin: String(c.linkedin ?? ''),
    contact: String(c.contact ?? ''),
    da_date: DATE_RE.test(c.daDate) ? c.daDate : null,
    hs_date: DATE_RE.test(c.hsDate) ? c.hsDate : null,
    anydesk_id: String(c.anydeskId ?? ''),
    anydesk_password: String(c.anydeskPassword ?? ''),
    da_state: legacy ? legacy.da : cleanState(c.daState),
    hs_state: legacy ? legacy.hs : cleanState(c.hsState),
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
