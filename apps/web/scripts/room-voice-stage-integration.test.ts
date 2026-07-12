import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const roomPage = await readFile(new URL('../src/pages/rooms/RoomPage.tsx', import.meta.url), 'utf8');
const stageShell = await readFile(new URL('../src/features/room-stage/RoomStageShell.tsx', import.meta.url), 'utf8');
const serverIndex = await readFile(new URL('../../server/src/index.ts', import.meta.url), 'utf8');
const stageRoutes = await readFile(new URL('../../server/src/modules/rooms/stage/stage.routes.ts', import.meta.url), 'utf8');

test('voice integration preserves the shared stage entry points', () => {
  assert.match(roomPage, /import \{ RoomStageShell \} from '\.\.\/\.\.\/features\/room-stage\/RoomStageShell';/);
  assert.match(roomPage, /<RoomStageShell roomId=\{roomId \|\| ''\} socketRef=\{socket\} connected=\{connected\} isMobile=\{isMobile\} \/>/);
  assert.match(stageShell, /StageChannelTabs/);
  assert.match(serverIndex, /import stageRoutes from '\.\/modules\/rooms\/stage\/stage\.routes';/);
  assert.match(serverIndex, /app\.use\('\/api\/rooms', stageRoutes\);/);
  assert.match(stageRoutes, /router\.get\('\/:roomId\/stage\/status'/);
});
