import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const migration = join(__dirname, '..', 'prisma', 'migrations', '20260712120000_stage_actor_binding_scope', 'migration.sql');

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
INSERT INTO "StageActorState" VALUES
  ('stale', 'channel-1', 'PLAYER_CHARACTER', 'user-1', 'character-1', NULL, NULL, NULL, NULL, 'left', 1, 'PUBLIC', 0, '{"action":"old"}', '2026-07-12T01:00:00.000Z'),
  ('current', 'channel-1', 'PLAYER_CHARACTER', 'user-1', 'character-1', NULL, NULL, NULL, NULL, 'right', 0, 'PUBLIC', 0, '{"action":"new"}', '2026-07-12T02:00:00.000Z'),
  ('other-character', 'channel-1', 'PLAYER_CHARACTER', 'user-1', 'character-2', NULL, NULL, NULL, NULL, 'center', 0, 'PUBLIC', 0, '{}', '2026-07-12T01:00:00.000Z'),
  ('other-channel', 'channel-2', 'PLAYER_CHARACTER', 'user-1', 'character-1', NULL, NULL, NULL, NULL, 'center', 0, 'PUBLIC', 0, '{}', '2026-07-12T01:00:00.000Z'),
  ('npc', 'channel-1', 'NPC', NULL, NULL, 'npc-1', NULL, NULL, NULL, 'center', 1, 'PUBLIC', 0, '{}', '2026-07-12T01:00:00.000Z');
''')
db.executescript(open(sys.argv[1], encoding='utf-8').read())
rows = db.execute('SELECT id, channelId, scopeKey, zone, stateJson FROM "StageActorState" ORDER BY id').fetchall()
assert ('current', 'channel-1', 'binding:user-1:character-1', 'right', '{"action":"new"}') in rows
assert not any(row[0] == 'stale' for row in rows)
assert ('other-character', 'channel-1', 'binding:user-1:character-2', 'center', '{}') in rows
assert ('other-channel', 'channel-2', 'binding:user-1:character-1', 'center', '{}') in rows
assert ('npc', 'channel-1', 'legacy:npc', 'center', '{}') in rows
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
  db.commit()
  db.executescript(open(final, encoding='utf-8').read())
  rows = db.execute('SELECT id, scopeKey, zone, stateJson FROM "StageActorState" WHERE channelId = ?', ('copy-channel',)).fetchall()
  assert rows == [('newer-copy', 'binding:copy-user:copy-character', 'right', '{"action":"newer"}')]
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
