if (!self.__DB_WORKER_LOADED__) {
  self.__DB_WORKER_LOADED__ = true;

  const SCHEMA = `
CREATE TABLE IF NOT EXISTS profiles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  color       TEXT    NOT NULL DEFAULT '#F26157',
  avatar      TEXT,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id  INTEGER NOT NULL,
  site        TEXT    NOT NULL,
  date        TEXT    NOT NULL,
  seconds     INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(profile_id, site, date)
);

CREATE TABLE IF NOT EXISTS goals (
  profile_id  INTEGER NOT NULL,
  site        TEXT    NOT NULL,
  daily_max   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, site),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  profile_id  INTEGER PRIMARY KEY,
  theme       TEXT    NOT NULL DEFAULT 'dark',
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_sites (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id  INTEGER NOT NULL,
  hostname    TEXT    NOT NULL,
  label       TEXT    NOT NULL,
  color       TEXT    NOT NULL DEFAULT '#94a3b8',
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(profile_id, hostname)
);

CREATE TABLE IF NOT EXISTS pinned_sites (
  profile_id  INTEGER NOT NULL,
  pin_slot    INTEGER NOT NULL CHECK(pin_slot IN (1, 2, 3)),
  site_key    TEXT    NOT NULL,
  PRIMARY KEY (profile_id, pin_slot),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL
);

INSERT OR IGNORE INTO config (key, value) VALUES
  ('schema_version',      '1'),
  ('active_profile_id',   ''),
  ('idle_threshold',      '60'),
  ('default_daily_max',   '12600'),
  ('summary_start_hour',  '20'),
  ('summary_end_hour',    '23'),
  ('summary_end_minute',  '56');

CREATE INDEX IF NOT EXISTS idx_sessions_profile_date ON sessions(profile_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
`;

  const SEED_SQL = `
INSERT INTO profiles (name, color, avatar) VALUES ('Default', '#F26157', 'D');

INSERT INTO goals (profile_id, site, daily_max) VALUES
  (1, 'youtube',   12600),
  (1, 'instagram', 12600),
  (1, 'x',         12600);

INSERT INTO settings (profile_id, theme) VALUES (1, 'dark');

INSERT INTO pinned_sites (profile_id, pin_slot, site_key) VALUES
  (1, 1, 'youtube'),
  (1, 2, 'instagram'),
  (1, 3, 'x');

UPDATE config SET value = '1' WHERE key = 'active_profile_id';
`;

  let db = null;
  let SQL = null;

  function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async function loadSqlJs() {
    if (SQL) return SQL;
    SQL = await initSqlJs({
      locateFile: file => chrome.runtime.getURL(`lib/${file}`)
    });
    return SQL;
  }

  async function initDB() {
    if (db) return db;
    const SqlJs = await loadSqlJs();
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle('togltabs.db', { create: true });

    let dbBytes = null;
    try {
      const file = await fileHandle.getFile();
      const buffer = await file.arrayBuffer();
      if (buffer.byteLength > 0) dbBytes = new Uint8Array(buffer);
    } catch {}

    db = dbBytes ? new SqlJs.Database(dbBytes) : new SqlJs.Database();
    db.run(SCHEMA);

    const profileCount = db.exec("SELECT COUNT(*) FROM profiles")[0]?.values?.[0]?.[0] || 0;
    if (!profileCount) {
      db.run(SEED_SQL);
      await persistDB();
    }
    return db;
  }

  async function reloadDB() {
    db = null;
    return initDB();
  }

  async function persistDB() {
    if (!db) return;
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle('togltabs.db', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(db.export());
    await writable.close();
  }

  function getActiveProfileId() {
    const result = db.exec("SELECT value FROM config WHERE key = 'active_profile_id'");
    return parseInt(result[0]?.values?.[0]?.[0], 10) || 1;
  }

  function upsertSession(profileId, site, seconds, date = getLocalDateKey()) {
    db.run(`
      INSERT INTO sessions (profile_id, site, date, seconds)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(profile_id, site, date)
      DO UPDATE SET seconds = seconds + excluded.seconds
    `, [profileId, site, date, seconds]);
  }

  function getTodayUsage(profileId, date = getLocalDateKey()) {
    const result = db.exec(
      "SELECT site, seconds FROM sessions WHERE profile_id = ? AND date = ?",
      [profileId, date]
    );
    const usage = { youtube: 0, instagram: 0, x: 0 };
    (result[0]?.values || []).forEach(([site, seconds]) => {
      usage[site] = seconds;
    });
    return usage;
  }

  function getGoals(profileId) {
    const result = db.exec(
      "SELECT site, daily_max FROM goals WHERE profile_id = ?",
      [profileId]
    );
    const goals = { youtube: 12600, instagram: 12600, x: 12600 };
    (result[0]?.values || []).forEach(([site, max]) => {
      goals[site] = max;
    });
    return goals;
  }

  function getCustomSites(profileId) {
    const result = db.exec(
      "SELECT id, hostname, label, color FROM custom_sites WHERE profile_id = ? ORDER BY created_at",
      [profileId]
    );
    return (result[0]?.values || []).map(([id, hostname, label, color]) => ({ id, hostname, label, color }));
  }

  function getPinnedSites(profileId) {
    const result = db.exec(
      "SELECT pin_slot, site_key FROM pinned_sites WHERE profile_id = ? ORDER BY pin_slot",
      [profileId]
    );
    const pins = {};
    (result[0]?.values || []).forEach(([slot, key]) => {
      pins[slot] = key;
    });
    return pins;
  }

  function getTheme(profileId) {
    const result = db.exec("SELECT theme FROM settings WHERE profile_id = ?", [profileId]);
    return result[0]?.values?.[0]?.[0] || 'dark';
  }

  self.DB = {
    initDB,
    reloadDB,
    persistDB,
    getActiveProfileId,
    upsertSession,
    getTodayUsage,
    getGoals,
    getCustomSites,
    getPinnedSites,
    getTheme
  };
}
