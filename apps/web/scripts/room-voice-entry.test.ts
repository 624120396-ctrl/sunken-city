import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const roomPage = await readFile(new URL('../src/pages/rooms/RoomPage.tsx', import.meta.url), 'utf8');
const playerView = await readFile(new URL('../src/pages/rooms/components/RoomPlayerView.tsx', import.meta.url), 'utf8');
const commandRail = await readFile(new URL('../src/pages/rooms/components/RoomCommandRail.tsx', import.meta.url), 'utf8');

test('room voice keeps dedicated KP, PL desktop, and PL mobile entry points', () => {
  assert.match(roomPage, /<RoomVoicePanel roomId=\{roomId \|\| ''\} compact className="room-mobile-tools-sheet__voice" \/>/);
  assert.match(roomPage, /voicePanel=\{canUseKPTools \? <RoomVoicePanel roomId=\{roomId \|\| ''\} \/> : undefined\}/);
  assert.match(commandRail, /room-command-rail__section--voice/);
  assert.match(playerView, /import \{ RoomVoicePanel \} from '\.\/RoomVoicePanel';/);
  assert.match(playerView, /<RoomVoicePanel roomId=\{roomId\} compact className="room-player-board__voice" \/>/);
});
