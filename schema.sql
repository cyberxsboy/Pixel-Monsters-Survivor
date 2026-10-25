-- D1 / SQLite 结构（wrangler d1 execute pixel_monsters_survivor --file=./schema.sql）
CREATE TABLE IF NOT EXISTS saves (
  token   TEXT PRIMARY KEY,
  nick    TEXT NOT NULL DEFAULT '幸存者',
  data    TEXT NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_saves_updated ON saves(updated);

CREATE TABLE IF NOT EXISTS ranks (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  token   TEXT NOT NULL,
  nick    TEXT NOT NULL,
  mon     TEXT NOT NULL DEFAULT '',
  ms      INTEGER NOT NULL,
  scope   TEXT NOT NULL DEFAULT 'today',
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ranks_scope_ms ON ranks(scope, ms DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ranks_token_scope ON ranks(token, scope);
