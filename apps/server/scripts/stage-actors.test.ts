import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
import { ensureBoundStageActor, stageActorBindingScopeKey } from '../src/modules/rooms/stage/stage-actors.ts';

const serverRoot = join(__dirname, '..');
const databasePath = join(serverRoot, 'prisma', `.stage-actors-${process.pid}-${Date.now()}.db`);
const migrationsRoot = join(serverRoot, 'prisma', 'migrations');
const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');

function createMigratedDatabaseCopy() {
  copyFileSync(join(serverRoot, 'prisma', 'dev.db'), databasePath);
  for (const migration of readdirSync(migrationsRoot).filter((name) => name >= '20260712090000_add_shared_stage_runtime').sort()) {
    const migrationFile = join(migrationsRoot, migration, 'migration.sql');
    if (!existsSync(migrationFile)) continue;
    execFileSync(process.execPath, [prismaCli, 'db', 'execute', '--file', migrationFile, '--url', `file:./prisma/${basename(databasePath)}`], { cwd: serverRoot, stdio: 'ignore' });
  }
}

function actorStore() {
  const rows = new Map<string, any>();
  let creates = 0;
  return {
    client: {
      stageActorState: {
        async upsert({ where, create }: any) {
          const key = `${where.channelId_scopeKey.channelId}/${where.channelId_scopeKey.scopeKey}`;
          const existing = rows.get(key);
          if (existing) return existing;
          creates += 1;
          const created = { id: `actor-${creates}`, ...create };
          rows.set(key, created);
          return created;
        },
        async findUnique({ where }: any) {
          return rows.get(`${where.channelId_scopeKey.channelId}/${where.channelId_scopeKey.scopeKey}`) ?? null;
        },
      },
    },
    rows,
    get creates() { return creates; },
  };
}

test('parallel bound actor seeds use one channel-scoped actor identity', async () => {
  const store = actorStore();
  const input = { client: store.client, channelId: 'channel-1', member: { userId: 'user-1', characterId: 'character-1' } };
  const [first, second] = await Promise.all([ensureBoundStageActor(input), ensureBoundStageActor(input)]);
  assert.equal(first?.id, second?.id);
  assert.equal(store.creates, 1);
  assert.equal(first?.scopeKey, 'binding:user-1:character-1');
});

test('bound actor scopes distinguish a user character and channel', async () => {
  const store = actorStore();
  const first = await ensureBoundStageActor({ client: store.client, channelId: 'channel-1', member: { userId: 'user-1', characterId: 'character-1' } });
  const differentCharacter = await ensureBoundStageActor({ client: store.client, channelId: 'channel-1', member: { userId: 'user-1', characterId: 'character-2' } });
  const differentChannel = await ensureBoundStageActor({ client: store.client, channelId: 'channel-2', member: { userId: 'user-1', characterId: 'character-1' } });
  assert.notEqual(first?.id, differentCharacter?.id);
  assert.notEqual(first?.id, differentChannel?.id);
  assert.equal(stageActorBindingScopeKey({ userId: 'user-1', characterId: 'character-1' }), 'binding:user-1:character-1');
});

test('a unique conflict reads the concurrent canonical binding actor', async () => {
  const canonical = { id: 'actor-canonical', scopeKey: 'binding:user-1:character-1' };
  const actor = await ensureBoundStageActor({
    client: { stageActorState: {
      async upsert() { throw { code: 'P2002' }; },
      async findUnique() { return canonical; },
    } },
    channelId: 'channel-1',
    member: { userId: 'user-1', characterId: 'character-1' },
  });
  assert.equal(actor, canonical);
});

test('two concurrent database seeds persist exactly one bound actor', async (t) => {
  createMigratedDatabaseCopy();
  const prisma = new PrismaClient({ datasources: { db: { url: `file:./${basename(databasePath)}` } } });
  t.after(async () => {
    await prisma.$disconnect();
    if (existsSync(databasePath)) rmSync(databasePath, { force: true });
  });
  const suffix = `${process.pid}-${Date.now()}`;
  const userId = `actor-user-${suffix}`;
  const roomId = `actor-room-${suffix}`;
  const channelId = `actor-channel-${suffix}`;
  // The copied baseline intentionally predates unrelated User columns, so use
  // the minimal historical SQL shape rather than the current User projection.
  await prisma.$executeRawUnsafe('INSERT INTO "User" ("id", "displayId", "email", "nickname", "password", "updatedAt") VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', userId, (Date.now() % 1_000_000_000) + 500_000_000, `${userId}@test.local`, 'Actor', 'x');
  await prisma.$executeRawUnsafe('INSERT INTO "Room" ("id", "roomId", "name", "creatorId", "updatedAt") VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)', roomId, `ACTOR-${suffix}`, 'Actor seed test', userId);
  await prisma.$executeRawUnsafe('INSERT INTO "StageChannel" ("id", "roomId", "kind", "scopeKey", "status", "revision", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', channelId, roomId, 'MAIN_ROOM', 'main', 'ACTIVE', 0);
  const input = { client: prisma, channelId, member: { userId, characterId: 'bound-character-1' } };
  const [first, second] = await Promise.all([ensureBoundStageActor(input), ensureBoundStageActor(input)]);
  const rows = await prisma.stageActorState.findMany({ where: { channelId } });
  assert.equal(first?.id, second?.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].scopeKey, 'binding:' + userId + ':bound-character-1');
});
