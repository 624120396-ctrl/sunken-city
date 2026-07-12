import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const migration = join(__dirname, '..', 'prisma', 'migrations', '20260712120000_stage_actor_binding_scope', 'migration.sql');
const serverRoot = join(__dirname, '..');
const migrationsRoot = join(serverRoot, 'prisma', 'migrations');
const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');

test('stage actor binding scope migration exists as an independently deployable migration', () => {
  assert.equal(existsSync(migration), true);
});

test('migration keeps the newest duplicate binding state and enforces its non-null scope identity', () => {
  const program = String.raw`
import sqlite3, sys
db = sqlite3.connect(':memory:')
db.executescript('''
CREATE TABLE "StageActorState" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "channelId" TEXT NOT NULL,
  "actorKind" TEXT NOT NULL,
  "ownerUserId" TEXT,
  "characterId" TEXT,
  "npcId" TEXT,
  "temporaryName" TEXT,
  "portraitPackId" TEXT,
  "portraitVariantId" TEXT,
  "zone" TEXT NOT NULL DEFAULT 'center',
  "entered" BOOLEAN NOT NULL DEFAULT false,
  "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
  "lockedByKp" BOOLEAN NOT NULL DEFAULT false,
  "stateJson" TEXT NOT NULL DEFAULT '{}',
  "updatedAt" DATETIME NOT NULL
);
CREATE TABLE "StageSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "channelId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "contractVersion" TEXT NOT NULL,
  "projectionJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL
);
INSERT INTO "StageActorState" VALUES
  ('stale', 'channel-1', 'PLAYER_CHARACTER', 'user-1', 'character-1', NULL, NULL, NULL, NULL, 'left', 1, 'PUBLIC', 0, '{"action":"old"}', '2026-07-12T01:00:00.000Z'),
  ('current', 'channel-1', 'PLAYER_CHARACTER', 'user-1', 'character-1', NULL, NULL, NULL, NULL, 'right', 0, 'PUBLIC', 0, '{"action":"new"}', '2026-07-12T02:00:00.000Z'),
  ('other-character', 'channel-1', 'PLAYER_CHARACTER', 'user-1', 'character-2', NULL, NULL, NULL, NULL, 'center', 0, 'PUBLIC', 0, '{}', '2026-07-12T01:00:00.000Z'),
  ('other-channel', 'channel-2', 'PLAYER_CHARACTER', 'user-1', 'character-1', NULL, NULL, NULL, NULL, 'center', 0, 'PUBLIC', 0, '{}', '2026-07-12T01:00:00.000Z'),
  ('npc', 'channel-1', 'NPC', NULL, NULL, 'npc-1', NULL, NULL, NULL, 'center', 1, 'PUBLIC', 0, '{}', '2026-07-12T01:00:00.000Z');
INSERT INTO "StageSnapshot" VALUES
  ('snapshot-stale', 'channel-1', 'room-1', 9, 'stage.d1a.v1.1', '{"actors":[{"actorId":"stale","actorKind":"PLAYER_CHARACTER","ownerUserId":"user-1","characterId":"character-1","zone":"left","entered":true,"visibility":"PUBLIC"}]}', '2026-07-12T01:00:00.000Z', '2026-07-12T01:00:00.000Z');
''')
db.executescript(open(sys.argv[1], encoding='utf-8').read())
rows = db.execute('SELECT id, channelId, scopeKey, zone, stateJson FROM "StageActorState" ORDER BY id').fetchall()
assert ('current', 'channel-1', 'binding:user-1:character-1', 'right', '{"action":"new"}') in rows
assert not any(row[0] == 'stale' for row in rows)
assert ('other-character', 'channel-1', 'binding:user-1:character-2', 'center', '{}') in rows
assert ('other-channel', 'channel-2', 'binding:user-1:character-1', 'center', '{}') in rows
assert ('npc', 'channel-1', 'legacy:npc', 'center', '{}') in rows
snapshot = db.execute('SELECT json_extract(projectionJson, "$.actors[0].actorId"), json_array_length(projectionJson, "$.actors"), json_valid(projectionJson) FROM "StageSnapshot" WHERE id = ?', ('snapshot-stale',)).fetchone()
assert snapshot == ('current', 1, 1)
try:
  db.execute('INSERT INTO "StageActorState" (id, channelId, scopeKey, actorKind, zone, entered, visibility, lockedByKp, stateJson, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ('duplicate', 'channel-1', 'binding:user-1:character-1', 'PLAYER_CHARACTER', 'center', 0, 'PUBLIC', 0, '{}', '2026-07-12T03:00:00.000Z'))
  raise AssertionError('unique scope index was not enforced')
except sqlite3.IntegrityError:
  pass
`;
  execFileSync('python', ['-c', program, migration], { stdio: 'inherit' });
});

test('migration applies duplicate cleanup to a disposable copy of the real pre-stage database', () => {
  const program = String.raw`
import os, shutil, sqlite3, sys, tempfile
source, migrations, final = sys.argv[1:]
fd, path = tempfile.mkstemp(suffix='.db')
os.close(fd)
shutil.copyfile(source, path)
db = sqlite3.connect(path)
try:
  for name in ('20260712090000_add_shared_stage_runtime', '20260712103000_stage_contract_v1_1', '20260712113000_stage_runtime_integrity'):
    db.executescript(open(os.path.join(migrations, name, 'migration.sql'), encoding='utf-8').read())
  db.execute('INSERT INTO "StageActorState" (id, channelId, actorKind, ownerUserId, characterId, zone, entered, visibility, lockedByKp, stateJson, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ('older-copy', 'copy-channel', 'PLAYER_CHARACTER', 'copy-user', 'copy-character', 'left', 1, 'PUBLIC', 0, '{"action":"older"}', '2026-07-12T01:00:00.000Z'))
  db.execute('INSERT INTO "StageActorState" (id, channelId, actorKind, ownerUserId, characterId, zone, entered, visibility, lockedByKp, stateJson, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ('newer-copy', 'copy-channel', 'PLAYER_CHARACTER', 'copy-user', 'copy-character', 'right', 0, 'PUBLIC', 0, '{"action":"newer"}', '2026-07-12T02:00:00.000Z'))
  db.execute('INSERT INTO "StageSnapshot" (id, channelId, roomId, revision, contractVersion, projectionJson, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', ('copy-snapshot', 'copy-channel', 'copy-room', 1, 'stage.d1a.v1.1', '{"actors":[{"actorId":"older-copy","actorKind":"PLAYER_CHARACTER","ownerUserId":"copy-user","characterId":"copy-character","zone":"left","entered":true,"visibility":"PUBLIC"}]}'))
  db.commit()
  db.executescript(open(final, encoding='utf-8').read())
  rows = db.execute('SELECT id, scopeKey, zone, stateJson FROM "StageActorState" WHERE channelId = ?', ('copy-channel',)).fetchall()
  assert rows == [('newer-copy', 'binding:copy-user:copy-character', 'right', '{"action":"newer"}')]
  assert db.execute('SELECT json_extract(projectionJson, "$.actors[0].actorId") FROM "StageSnapshot" WHERE id = ?', ('copy-snapshot',)).fetchone() == ('newer-copy',)
  try:
    db.execute('INSERT INTO "StageActorState" (id, channelId, scopeKey, actorKind, zone, entered, visibility, lockedByKp, stateJson, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ('duplicate-copy', 'copy-channel', 'binding:copy-user:copy-character', 'PLAYER_CHARACTER', 'center', 0, 'PUBLIC', 0, '{}', '2026-07-12T03:00:00.000Z'))
    raise AssertionError('copy did not enforce the unique binding scope')
  except sqlite3.IntegrityError:
    pass
finally:
  db.close()
  os.remove(path)
`;
  execFileSync('python', ['-c', program, join(__dirname, '..', 'prisma', 'dev.db'), join(__dirname, '..', 'prisma', 'migrations'), migration], { stdio: 'inherit' });
});

test('Prisma SQLite executor runs the JSON1 snapshot rewrite on a database copy', () => {
  const databasePath = join(serverRoot, 'prisma', `.stage-actor-json1-${process.pid}-${Date.now()}.db`);
  copyFileSync(join(serverRoot, 'prisma', 'dev.db'), databasePath);
  try {
    for (const name of readdirSync(migrationsRoot).filter((entry) => entry >= '20260712090000_add_shared_stage_runtime' && entry < '20260712120000_stage_actor_binding_scope').sort()) {
      execFileSync(process.execPath, [prismaCli, 'db', 'execute', '--file', join(migrationsRoot, name, 'migration.sql'), '--url', `file:./prisma/${basename(databasePath)}`], { cwd: serverRoot, stdio: 'ignore' });
    }
    const seed = String.raw`
import sqlite3, sys
db = sqlite3.connect(sys.argv[1])
db.execute('INSERT INTO "StageActorState" (id, channelId, actorKind, ownerUserId, characterId, zone, entered, visibility, lockedByKp, stateJson, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ('json-stale', 'json-channel', 'PLAYER_CHARACTER', 'json-user', 'json-character', 'left', 1, 'PUBLIC', 0, '{}', '2026-07-12T01:00:00.000Z'))
db.execute('INSERT INTO "StageActorState" (id, channelId, actorKind, ownerUserId, characterId, zone, entered, visibility, lockedByKp, stateJson, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', ('json-current', 'json-channel', 'PLAYER_CHARACTER', 'json-user', 'json-character', 'right', 0, 'PUBLIC', 0, '{}', '2026-07-12T02:00:00.000Z'))
db.execute('INSERT INTO "StageSnapshot" (id, channelId, roomId, revision, contractVersion, projectionJson, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', ('json-snapshot', 'json-channel', 'json-room', 1, 'stage.d1a.v1.1', '{"actors":[{"actorId":"json-stale","actorKind":"PLAYER_CHARACTER","ownerUserId":"json-user","characterId":"json-character","zone":"left","entered":true,"visibility":"PUBLIC"}]}'))
db.commit()
db.close()
`;
    execFileSync('python', ['-c', seed, databasePath], { stdio: 'inherit' });
    execFileSync(process.execPath, [prismaCli, 'db', 'execute', '--file', migration, '--url', `file:./prisma/${basename(databasePath)}`], { cwd: serverRoot, stdio: 'inherit' });
    const verify = String.raw`
import sqlite3, sys
db = sqlite3.connect(sys.argv[1])
assert db.execute('SELECT json_extract(projectionJson, "$.actors[0].actorId") FROM "StageSnapshot" WHERE id = ?', ('json-snapshot',)).fetchone() == ('json-current',)
assert db.execute('SELECT count(*) FROM "StageActorState" WHERE channelId = ?', ('json-channel',)).fetchone() == (1,)
`;
    execFileSync('python', ['-c', verify, databasePath], { stdio: 'inherit' });
  } finally {
    if (existsSync(databasePath)) rmSync(databasePath, { force: true });
  }
});
