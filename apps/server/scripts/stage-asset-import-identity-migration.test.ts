import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const migration = join(__dirname, '..', 'prisma', 'migrations', '20260712140000_stage_asset_import_identity', 'migration.sql');

test('stage asset import identity migration backfills a scoped key and enforces one row per room-kind-hash', () => {
  assert.equal(existsSync(migration), true);
  const program = String.raw`
import sqlite3, sys
db = sqlite3.connect(':memory:')
db.executescript('''
CREATE TABLE "StageAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roomId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "deletedAt" DATETIME
);
INSERT INTO "StageAsset" VALUES ('a1', 'room-1', 'BGM', 'same', NULL);
INSERT INTO "StageAsset" VALUES ('a2', 'room-1', 'BGM', 'same', NULL);
''')
db.executescript(open(sys.argv[1], encoding='utf-8').read())
assert db.execute('SELECT "importKey" FROM "StageAsset" WHERE id = ?', ('a1',)).fetchone() == ('BGM:same',)
assert db.execute('SELECT "importKey" FROM "StageAsset" WHERE id = ?', ('a2',)).fetchone() == ('BGM:same:legacy:a2',)
try:
  db.execute('INSERT INTO "StageAsset" (id, roomId, kind, hash, importKey) VALUES (?, ?, ?, ?, ?)', ('a3', 'room-1', 'BGM', 'same', 'BGM:same'))
  raise AssertionError('unique import identity was not enforced')
except sqlite3.IntegrityError:
  pass
`;
  execFileSync('python', ['-c', program, migration], { stdio: 'inherit' });
});

test('two concurrent SQLite import creates leave exactly one canonical identity row', () => {
  const program = String.raw`
import os, sqlite3, sys, tempfile, threading
fd, path = tempfile.mkstemp(suffix='.db')
os.close(fd)
db = sqlite3.connect(path)
db.executescript('''
CREATE TABLE "StageAsset" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roomId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "deletedAt" DATETIME
);
''')
db.executescript(open(sys.argv[1], encoding='utf-8').read())
db.close()
barrier = threading.Barrier(2)
results = []
def create(asset_id):
  con = sqlite3.connect(path, timeout=2)
  try:
    barrier.wait()
    con.execute('INSERT INTO "StageAsset" (id, roomId, kind, hash, importKey) VALUES (?, ?, ?, ?, ?)', (asset_id, 'room-1', 'BGM', 'same', 'BGM:same'))
    con.commit()
    results.append('created')
  except sqlite3.IntegrityError:
    results.append('duplicate')
  finally:
    con.close()
threads = [threading.Thread(target=create, args=(f'a{i}',)) for i in range(2)]
for thread in threads: thread.start()
for thread in threads: thread.join()
verify = sqlite3.connect(path)
assert sorted(results) == ['created', 'duplicate']
assert verify.execute('SELECT count(*), min(importKey) FROM "StageAsset"').fetchone() == (1, 'BGM:same')
verify.close()
os.remove(path)
`;
  execFileSync('python', ['-c', program, migration], { stdio: 'inherit' });
});
