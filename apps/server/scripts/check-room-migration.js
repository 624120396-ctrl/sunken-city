const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is required. PowerShell example: $env:DATABASE_URL="file:./dev.db"; npm run check:room-migration'
  );
  process.exit(2);
}

const prisma = new PrismaClient();

const expectedTables = [
  'RoomRun',
  'RoomRunParticipant',
  'RoomCharacterLock',
  'RoomSettlement',
];
const roomMigrationName = '20260703080000_add_room_lifecycle_and_settlement';

async function tableNames() {
  const quoted = expectedTables
    .concat('_prisma_migrations')
    .map((name) => `'${name}'`)
    .join(',');
  const rows = await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${quoted}) ORDER BY name`
  );
  return rows.map((row) => row.name);
}

async function migrationRows() {
  try {
    return await prisma.$queryRawUnsafe(
      'SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY migration_name'
    );
  } catch {
    return [];
  }
}

async function main() {
  const tables = await tableNames();
  const migrations = await migrationRows();
  const missingTables = expectedTables.filter((name) => !tables.includes(name));
  const roomMigration = migrations.find((row) => row.migration_name === roomMigrationName) || null;

  const result = {
    ok: missingTables.length === 0,
    expectedTables,
    existingRoomTables: expectedTables.filter((name) => tables.includes(name)),
    missingTables,
    hasPrismaMigrationsTable: tables.includes('_prisma_migrations'),
    roomMigrationName,
    roomMigrationRecorded: Boolean(roomMigration),
    roomMigrationFinishedAt: roomMigration?.finished_at || null,
    recommendation: null,
  };

  if (missingTables.length > 0) {
    result.recommendation = 'Apply the room lifecycle migration after backing up the database.';
  } else if (!roomMigration) {
    result.recommendation =
      `Tables exist but migration is not recorded. After backup, mark it applied with: npx prisma migrate resolve --applied ${roomMigrationName}`;
  } else {
    result.recommendation = 'Room lifecycle tables and migration record are present.';
  }

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
