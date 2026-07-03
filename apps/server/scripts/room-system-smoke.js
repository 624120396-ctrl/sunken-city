const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config();

const baseUrl = process.env.ROOM_SYSTEM_SMOKE_BASE_URL || 'http://127.0.0.1:3001';
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

if (process.env.ROOM_SYSTEM_SMOKE_WRITE !== '1') {
  console.error('Refusing to create smoke data. Set ROOM_SYSTEM_SMOKE_WRITE=1 to run this script.');
  process.exit(2);
}

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is required. PowerShell example: $env:DATABASE_URL="file:./dev.db"; $env:ROOM_SYSTEM_SMOKE_WRITE="1"; npm run test:room-system'
  );
  process.exit(2);
}

const prisma = new PrismaClient();

async function request(path, options = {}) {
  const { token, method = 'GET', body, expect = 200 } = options;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (response.status !== expect) {
    throw new Error(`${method} ${path} expected ${expect}, got ${response.status}: ${text}`);
  }
  return json;
}

async function register(role) {
  const nickname = `CodexSmoke${role}${stamp.slice(-6)}`;
  const json = await request('/api/auth/register', {
    method: 'POST',
    expect: 201,
    body: {
      email: `codex-smoke-${role.toLowerCase()}-${stamp}@example.test`,
      nickname,
      password: 'password123',
    },
  });
  return { user: json.data.user, token: json.data.token, nickname };
}

async function createSmokeCharacter(userId) {
  const maxCharacter = await prisma.character.findFirst({
    orderBy: { displayId: 'desc' },
    select: { displayId: true },
  });

  return prisma.character.create({
    data: {
      displayId: (maxCharacter?.displayId || 0) + 1,
      userId,
      name: `CodexSmoke调查员${stamp}`,
      occupation: '调查记者',
      occupationKey: 'investigative_reporter',
      age: 30,
      str: 50,
      con: 50,
      siz: 50,
      dex: 50,
      app: 50,
      int: 60,
      pow: 55,
      edu: 70,
      luck: 50,
      creditRating: 20,
      hp: 12,
      mp: 11,
      san: 55,
      maxHp: 12,
      maxMp: 11,
      maxSan: 55,
      mov: 8,
      build: 0,
      db: '0',
      skills: JSON.stringify({ 侦查: 55 }),
      weapons: JSON.stringify([]),
      skillPointsJson: JSON.stringify({
        occupationPoints: 280,
        interestPoints: 120,
        usedOccupation: 0,
        usedInterest: 0,
      }),
    },
  });
}

async function main() {
  const kp = await register('KP');
  const pl = await register('PL');
  const observer = await register('OBS');
  const outsider = await register('OUT');
  const character = await createSmokeCharacter(pl.user.id);

  const roomResponse = await request('/api/rooms', {
    token: kp.token,
    method: 'POST',
    expect: 201,
    body: { name: `CodexSmoke房间${stamp}`, description: '房间系统专项冒烟验证，可忽略' },
  });
  const roomId = roomResponse.data.room.roomId;

  await request(`/api/rooms/${roomId}/join`, {
    token: pl.token,
    method: 'POST',
    body: { joinAs: 'PLAYER', characterId: character.id },
  });
  await request(`/api/rooms/${roomId}/join`, {
    token: observer.token,
    method: 'POST',
    body: { joinAs: 'OBSERVER' },
  });

  const kpDetail = await request(`/api/rooms/${roomId}`, { token: kp.token });
  if (kpDetail.data.room.myRole !== 'OWNER_KP') {
    throw new Error(`KP role mismatch: ${kpDetail.data.room.myRole}`);
  }
  if (!kpDetail.data.room.myCapabilities?.canUseKPTools) {
    throw new Error('KP cannot use KP tools');
  }
  const kpMember = kpDetail.data.room.members.find((member) => member.userId === kp.user.id);
  if (kpMember?.character) {
    throw new Error('KP unexpectedly has character binding');
  }

  const plDetail = await request(`/api/rooms/${roomId}`, { token: pl.token });
  if (plDetail.data.room.myRole !== 'PLAYER') {
    throw new Error(`PL role mismatch: ${plDetail.data.room.myRole}`);
  }

  const observerDetail = await request(`/api/rooms/${roomId}`, { token: observer.token });
  if (observerDetail.data.room.myRole !== 'OBSERVER') {
    throw new Error(`Observer role mismatch: ${observerDetail.data.room.myRole}`);
  }
  if (observerDetail.data.room.myCapabilities?.canSendPrivateMessage) {
    throw new Error('Observer should not send private messages');
  }

  await request(`/api/rooms/${roomId}/lifecycle/start`, { token: kp.token, method: 'POST' });
  await request(`/api/rooms/${roomId}/lifecycle/finishing`, { token: kp.token, method: 'POST' });

  await request(`/api/rooms/${roomId}/settlements`, { token: pl.token, expect: 403 });
  const settlements = await request(`/api/rooms/${roomId}/settlements`, { token: kp.token });
  if (settlements.data.lifecycle !== 'FINISHING') {
    throw new Error(`Settlement lifecycle mismatch: ${settlements.data.lifecycle}`);
  }
  if (settlements.data.settlements.length !== 1) {
    throw new Error(`Expected 1 settlement item, got ${settlements.data.settlements.length}`);
  }

  const kpNote = `CodexSmoke结算备注${stamp}`;
  await request(`/api/rooms/${roomId}/settlements/${character.id}`, {
    token: kp.token,
    method: 'PATCH',
    body: {
      outcome: 'SURVIVED',
      hpFinal: 10,
      mpFinal: 9,
      sanFinal: 50,
      expAward: 3,
      skillGrowth: [{ skillName: '侦查', before: 55, after: 56 }],
      itemChanges: [],
      kpNote,
      status: 'CONFIRMED',
    },
  });

  const finalized = await request(`/api/rooms/${roomId}/lifecycle/finalize`, {
    token: kp.token,
    method: 'POST',
    body: { finishSummary: { smoke: true, stamp } },
  });
  if (finalized.data.appliedSettlementCount !== 1) {
    throw new Error(`Applied settlement count mismatch: ${finalized.data.appliedSettlementCount}`);
  }

  const updatedCharacter = await prisma.character.findUniqueOrThrow({ where: { id: character.id } });
  if (updatedCharacter.hp !== 10 || updatedCharacter.mp !== 9 || updatedCharacter.san !== 50) {
    throw new Error(
      `Character writeback mismatch: hp=${updatedCharacter.hp}, mp=${updatedCharacter.mp}, san=${updatedCharacter.san}`
    );
  }

  const plRooms = await request('/api/rooms', { token: pl.token });
  const closedRoom = plRooms.data.rooms.find((room) => room.roomId === roomId);
  if (!closedRoom || closedRoom.lifecycle !== 'FINISHED') {
    throw new Error('Finished room not visible to related PL list');
  }

  const report = await request(`/api/rooms/${roomId}/report`, { token: pl.token });
  const progress = report.data.characterProgress.find((entry) => entry.name === character.name);
  if (!progress || progress.settlement?.kpNote !== kpNote) {
    throw new Error('Settlement report data missing for member');
  }
  await request(`/api/rooms/${roomId}/report`, { token: outsider.token, expect: 403 });

  const activeLocks = await prisma.roomCharacterLock.findMany({
    where: { characterId: character.id, status: 'ACTIVE' },
  });
  if (activeLocks.length !== 0) {
    throw new Error('Character lock still active after finalize');
  }

  console.log(JSON.stringify({
    ok: true,
    stamp,
    baseUrl,
    roomId,
    testUsers: [kp.nickname, pl.nickname, observer.nickname, outsider.nickname],
    characterId: character.id,
    checks: [
      'KP no character binding and KP capabilities',
      'PL joined with owned character',
      'Observer read-only capabilities',
      'PL cannot access settlement workbench',
      'start -> finishing -> settlement -> finalize',
      'finalize wrote HP/MP/SAN',
      'finished room visible to related PL',
      'member report includes settlement note',
      'non-member report denied',
      'character lock released',
    ],
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
