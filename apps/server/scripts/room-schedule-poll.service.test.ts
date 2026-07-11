import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { copyFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Prisma } from '@prisma/client';

const serverRoot = join(__dirname, '..');
const databasePath = join(serverRoot, 'prisma', `.room-schedule-service-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_URL = `file:./${basename(databasePath)}`;

const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');
copyFileSync(join(serverRoot, 'prisma', 'dev.db'), databasePath);
const migrationsRoot = join(serverRoot, 'prisma', 'migrations');
for (const migration of readdirSync(migrationsRoot)
  .filter(name => name >= '20260703080000' && existsSync(join(migrationsRoot, name, 'migration.sql')))
  .sort()) {
  execFileSync(process.execPath, [
    prismaCli,
    'db', 'execute',
    '--file', join(migrationsRoot, migration, 'migration.sql'),
    '--url', `file:./prisma/${basename(databasePath)}`,
  ], {
    cwd: serverRoot,
    env: process.env,
    stdio: 'ignore',
  });
}

let prisma: any;
let createRoomSchedulePoll: Handler;
let downloadRoomNextSessionCalendar: Handler;
let finalizeRoomSchedulePoll: Handler;
let getRoomSchedulePolls: Handler;
let saveRoomScheduleVotes: Handler;
let updateRoomSchedulePoll: Handler;

before(async () => {
  ({ prisma } = await import('../src/config/database.ts'));
  ({
    createRoomSchedulePoll,
    downloadRoomNextSessionCalendar,
    finalizeRoomSchedulePoll,
    getRoomSchedulePolls,
    saveRoomScheduleVotes,
    updateRoomSchedulePoll,
  } = await import('../src/modules/rooms/room-schedule-poll.service.ts'));
});

after(async () => {
  await prisma.$disconnect();
  if (existsSync(databasePath)) rmSync(databasePath, { force: true });
});

type Handler = (req: any, res: any, next: (error?: unknown) => void) => Promise<void>;

let sequence = 0;

async function fixture() {
  sequence += 1;
  const suffix = `${process.pid}-${sequence}`;
  const ownerId = `owner-${suffix}`;
  const playerId = `player-${suffix}`;
  const outsiderId = `outsider-${suffix}`;
  const displayBase = 900_000_000 + (process.pid % 100_000) * 100 + sequence * 10;
  await prisma.user.createMany({
    data: [
      { id: ownerId, displayId: displayBase + 1, email: `${ownerId}@test.local`, nickname: 'Owner', password: 'x' },
      { id: playerId, displayId: displayBase + 2, email: `${playerId}@test.local`, nickname: 'Player', password: 'x' },
      { id: outsiderId, displayId: displayBase + 3, email: `${outsiderId}@test.local`, nickname: 'Outsider', password: 'x' },
    ],
  });
  const room = await prisma.room.create({
    data: {
      roomId: `ROOM-${suffix}`,
      name: `Room ${suffix}`,
      creatorId: ownerId,
      members: {
        create: [
          { userId: ownerId, role: 'KP' },
          { userId: playerId, role: 'PLAYER' },
        ],
      },
    },
  });
  return { room, ownerId, playerId, outsiderId };
}

function pollPayload(offsetDays = 3) {
  const now = Date.now();
  const firstStart = new Date(now + offsetDays * 24 * 60 * 60_000);
  const secondStart = new Date(firstStart.getTime() + 24 * 60 * 60_000);
  return {
    title: '专项服务测试排期',
    timezone: 'Asia/Shanghai',
    closesAt: new Date(now + 24 * 60 * 60_000).toISOString(),
    options: [
      { startsAt: firstStart.toISOString(), endsAt: new Date(firstStart.getTime() + 4 * 60 * 60_000).toISOString() },
      { startsAt: secondStart.toISOString(), endsAt: new Date(secondStart.getTime() + 4 * 60 * 60_000).toISOString() },
    ],
  };
}

async function invoke(handler: Handler, input: {
  roomId: string;
  userId?: string;
  pollId?: string;
  body?: unknown;
}) {
  let statusCode = 200;
  let body: any;
  let sent: any;
  let error: any;
  const headers = new Map<string, string>();
  const req = {
    user: input.userId ? { userId: input.userId } : undefined,
    params: { roomId: input.roomId, pollId: input.pollId },
    body: input.body ?? {},
    app: { get: () => undefined },
    protocol: 'http',
    get: () => 'localhost',
  };
  const res = {
    status(code: number) { statusCode = code; return this; },
    json(value: unknown) { body = value; return this; },
    send(value: unknown) { sent = value; return this; },
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value); },
  };
  await handler(req as any, res as any, nextError => { error = nextError; });
  return { statusCode, body, sent, error, headers };
}

async function createPoll(roomId: string, ownerId: string) {
  const result = await invoke(createRoomSchedulePoll, { roomId, userId: ownerId, body: pollPayload() });
  assert.equal(result.error, undefined);
  assert.equal(result.statusCode, 201);
  return result.body.poll;
}

test('non-members cannot read room schedule polls', async () => {
  const { room, outsiderId } = await fixture();
  const result = await invoke(getRoomSchedulePolls, { roomId: room.roomId, userId: outsiderId });
  assert.equal(result.error?.statusCode, 403);
});

test('schedule management follows room capabilities', async () => {
  const { room, ownerId, playerId } = await fixture();
  const denied = await invoke(createRoomSchedulePoll, { roomId: room.roomId, userId: playerId, body: pollPayload() });
  assert.equal(denied.error?.statusCode, 403);
  const allowed = await invoke(createRoomSchedulePoll, { roomId: room.roomId, userId: ownerId, body: pollPayload() });
  assert.equal(allowed.statusCode, 201);
  assert.equal(allowed.error, undefined);
});

test('finalization rejects an option owned by another poll', async () => {
  const first = await fixture();
  const second = await fixture();
  const firstPoll = await createPoll(first.room.roomId, first.ownerId);
  const secondPoll = await createPoll(second.room.roomId, second.ownerId);
  const result = await invoke(finalizeRoomSchedulePoll, {
    roomId: first.room.roomId,
    userId: first.ownerId,
    pollId: firstPoll.id,
    body: { optionId: secondPoll.options[0].id },
  });
  assert.equal(result.error?.statusCode, 400);
});

test('expired open polls reject ordinary updates and votes with 409', async () => {
  const { room, ownerId, playerId } = await fixture();
  const poll = await createPoll(room.roomId, ownerId);
  await prisma.roomSchedulePoll.update({
    where: { id: poll.id },
    data: { closesAt: new Date(Date.now() - 60_000) },
  });
  const reopenPayload = {
    ...pollPayload(4),
    options: poll.options.map((option: any, index: number) => ({
      id: option.id,
      startsAt: pollPayload(4).options[index].startsAt,
      endsAt: pollPayload(4).options[index].endsAt,
    })),
  };
  const update = await invoke(updateRoomSchedulePoll, {
    roomId: room.roomId,
    userId: ownerId,
    pollId: poll.id,
    body: reopenPayload,
  });
  assert.equal(update.error?.statusCode, 409);
  const vote = await invoke(saveRoomScheduleVotes, {
    roomId: room.roomId,
    userId: playerId,
    pollId: poll.id,
    body: { votes: [{ optionId: poll.options[0].id, status: 'AVAILABLE' }] },
  });
  assert.equal(vote.error?.statusCode, 409);
});

test('finalization atomically schedules the session and resets formal attendance', async () => {
  const { room, ownerId, playerId } = await fixture();
  const poll = await createPoll(room.roomId, ownerId);
  await prisma.roomAttendanceConfirmation.createMany({
    data: [
      { roomId: room.id, userId: ownerId, status: 'AVAILABLE' },
      { roomId: room.id, userId: playerId, status: 'TENTATIVE' },
    ],
  });
  const result = await invoke(finalizeRoomSchedulePoll, {
    roomId: room.roomId,
    userId: ownerId,
    pollId: poll.id,
    body: { optionId: poll.options[0].id },
  });
  assert.equal(result.error, undefined);
  const [savedPoll, nextSession, attendance] = await Promise.all([
    prisma.roomSchedulePoll.findUnique({ where: { id: poll.id } }),
    prisma.roomNextSession.findUnique({ where: { roomId: room.id } }),
    prisma.roomAttendanceConfirmation.findMany({ where: { roomId: room.id }, orderBy: { userId: 'asc' } }),
  ]);
  assert.equal(savedPoll?.status, 'FINALIZED');
  assert.equal(nextSession?.status, 'SCHEDULED');
  assert.equal(nextSession?.scheduledAt?.toISOString(), poll.options[0].startsAt);
  assert.deepEqual(attendance.map(entry => entry.status), ['PENDING', 'PENDING']);
});

test('concurrent poll creation leaves one open poll and returns one 409', async () => {
  const { room, ownerId } = await fixture();
  const [first, second] = await Promise.all([
    invoke(createRoomSchedulePoll, { roomId: room.roomId, userId: ownerId, body: pollPayload() }),
    invoke(createRoomSchedulePoll, { roomId: room.roomId, userId: ownerId, body: pollPayload(4) }),
  ]);
  const successes = [first, second].filter(result => result.statusCode === 201 && !result.error);
  const conflicts = [first, second].filter(result => result.error?.statusCode === 409);
  assert.equal(successes.length, 1);
  assert.equal(conflicts.length, 1);
  assert.equal(await prisma.roomSchedulePoll.count({ where: { roomId: room.id, status: 'OPEN' } }), 1);
});

test('concurrent finalization commits once and returns one 409', async () => {
  const { room, ownerId } = await fixture();
  const poll = await createPoll(room.roomId, ownerId);
  const [first, second] = await Promise.all([
    invoke(finalizeRoomSchedulePoll, { roomId: room.roomId, userId: ownerId, pollId: poll.id, body: { optionId: poll.options[0].id } }),
    invoke(finalizeRoomSchedulePoll, { roomId: room.roomId, userId: ownerId, pollId: poll.id, body: { optionId: poll.options[1].id } }),
  ]);
  const successes = [first, second].filter(result => !result.error);
  const conflicts = [first, second].filter(result => result.error?.statusCode === 409);
  assert.equal(successes.length, 1);
  assert.equal(conflicts.length, 1);
  assert.equal(await prisma.roomNextSession.count({ where: { roomId: room.id } }), 1);
});

test('create maps Prisma write conflicts to 409', async () => {
  const { room, ownerId } = await fixture();
  const originalTransaction = prisma.$transaction.bind(prisma);
  (prisma as any).$transaction = async () => {
    throw new Prisma.PrismaClientKnownRequestError('write conflict', {
      code: 'P2034',
      clientVersion: Prisma.prismaVersion.client,
    });
  };
  try {
    const result = await invoke(createRoomSchedulePoll, { roomId: room.roomId, userId: ownerId, body: pollPayload() });
    assert.equal(result.error?.statusCode, 409);
  } finally {
    (prisma as any).$transaction = originalTransaction;
  }
});

test('ICS download requires room membership and returns calendar data to members', async () => {
  const { room, ownerId, playerId, outsiderId } = await fixture();
  await prisma.roomNextSession.create({
    data: {
      roomId: room.id,
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60_000),
      timezone: 'Asia/Shanghai',
      title: '正式场次',
      status: 'SCHEDULED',
      updatedById: ownerId,
    },
  });
  const denied = await invoke(downloadRoomNextSessionCalendar, { roomId: room.roomId, userId: outsiderId });
  assert.equal(denied.error?.statusCode, 403);
  const allowed = await invoke(downloadRoomNextSessionCalendar, { roomId: room.roomId, userId: playerId });
  assert.equal(allowed.error, undefined);
  assert.match(String(allowed.sent), /BEGIN:VCALENDAR/);
  assert.match(allowed.headers.get('content-type') ?? '', /text\/calendar/);
});
