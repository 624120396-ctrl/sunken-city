import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, '..');

function readProjectFile(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function assertContract(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const backgroundOptions = readProjectFile('src/components/background/backgroundOptions.ts');
const appBackground = readProjectFile('src/components/background/AppBackground.tsx');
const tokens = readProjectFile('src/styles/tokens-v2.css');
const backgroundCss = readProjectFile('src/styles/background-v2.css');
const systemCss = readProjectFile('src/styles/system-v2.css');
const surface = readProjectFile('src/components/system/Surface.tsx');
const systemIndex = readProjectFile('src/components/system/index.ts');
const roomListPage = readProjectFile('src/pages/rooms/RoomListPage.tsx');
const economyShell = readProjectFile('src/components/economy/EconomyPageShell.tsx');
const shopPage = readProjectFile('src/pages/shop/ShopPage.tsx');
const inventoryPage = readProjectFile('src/pages/inventory/InventoryPage.tsx');
const marketPage = readProjectFile('src/pages/market/RelicMarketPage.tsx');
const dashboardPage = readProjectFile('src/pages/dashboard/DashboardPage.tsx');
const characterListPage = readProjectFile('src/pages/characters/CharacterListPage.tsx');
const characterDetailPage = readProjectFile('src/pages/characters/CharacterDetailPage.tsx');
const characterGrowthPage = readProjectFile('src/pages/characters/CharacterGrowthPage.tsx');
const characterCreatePage = readProjectFile('src/pages/characters/CharacterCreateV2Page.tsx');
const backgroundPicker = readProjectFile('src/components/background/BackgroundPicker.tsx');
const profilePage = readProjectFile('src/pages/profile/ProfilePage.tsx');
const forumListPage = readProjectFile('src/pages/forum/ForumListPage.tsx');
const forumBoardPage = readProjectFile('src/pages/forum/ForumBoardPage.tsx');
const forumPostPage = readProjectFile('src/pages/forum/ForumPostPage.tsx');
const forumNewPostPage = readProjectFile('src/pages/forum/ForumNewPostPage.tsx');
const ranksPage = readProjectFile('src/pages/ranks/RanksPage.tsx');
const titlesPage = readProjectFile('src/pages/titles/TitlesPage.tsx');

const expectedBackgroundProfiles = {
  'bg-vellum': 'luminous',
  'bg-sunken': 'balanced',
  'bg-ocean-blue': 'balanced',
  'bg-ruins-beige': 'luminous',
  'bg-deep-sea': 'dark',
  'bg-underwater-city': 'balanced',
  'bg-void-runes': 'dark',
};

assertContract(
  backgroundOptions.includes('BackgroundReadabilityProfile'),
  'Background options must define BackgroundReadabilityProfile.'
);

for (const [id, profile] of Object.entries(expectedBackgroundProfiles)) {
  const optionPattern = new RegExp(
    `id:\\s*['"]${id}['"][\\s\\S]*?readabilityProfile:\\s*['"]${profile}['"]`
  );

  assertContract(
    optionPattern.test(backgroundOptions),
    `Background "${id}" must use readabilityProfile "${profile}".`
  );
}

assertContract(
  appBackground.includes('data-bg-profile={selected.readabilityProfile}'),
  'AppBackground must expose selected.readabilityProfile as data-bg-profile.'
);

for (const tokenName of [
  '--coc-surface-page',
  '--coc-surface-panel',
  '--coc-surface-solid',
  '--coc-surface-glass',
  '--coc-surface-elevated',
  '--coc-surface-danger',
  '--coc-on-surface-primary',
  '--coc-on-surface-secondary',
  '--coc-accent-blood-surface',
]) {
  assertContract(tokens.includes(tokenName), `Missing design token ${tokenName}.`);
}

for (const profileSelector of [
  '[data-bg-profile="luminous"]',
  '[data-bg-profile="balanced"]',
  '[data-bg-profile="dark"]',
]) {
  assertContract(
    tokens.includes(profileSelector) || backgroundCss.includes(profileSelector),
    `Missing CSS profile selector ${profileSelector}.`
  );
}

for (const variant of ['page', 'panel', 'solid', 'glass', 'elevated', 'danger']) {
  assertContract(
    surface.includes(`'${variant}'`) && systemCss.includes(`data-variant="${variant}"`),
    `Surface variant "${variant}" must be typed and styled.`
  );
}

for (const component of ['PageShell', 'ReadablePanel', 'ActionCard', 'DataCard']) {
  const componentPath = join(root, `src/components/system/${component}.tsx`);
  assertContract(existsSync(componentPath), `Missing system component ${component}.tsx.`);
  assertContract(
    systemIndex.includes(`export { ${component}`),
    `System index must export ${component}.`
  );
}

assertContract(
  roomListPage.includes("from '@components/system'") &&
    roomListPage.includes('PageShell') &&
    roomListPage.includes('ActionCard') &&
    roomListPage.includes('ReadablePanel') &&
    roomListPage.includes('DataCard'),
  'RoomListPage must use the readable system components.'
);

assertContract(
  !roomListPage.includes('CthulhuCard3D') && !roomListPage.includes('card-layer-2'),
  'RoomListPage must not use legacy 3D cards or card-layer-2.'
);

assertContract(
  economyShell.includes("from '@components/system'") &&
    economyShell.includes('PageShell') &&
    economyShell.includes('ActionCard'),
  'EconomyPageShell must use PageShell and ActionCard.'
);

for (const [name, source] of Object.entries({
  ShopPage: shopPage,
  InventoryPage: inventoryPage,
  RelicMarketPage: marketPage,
})) {
  assertContract(source.includes("from '@components/system'"), `${name} must import the readable system.`);
  assertContract(!source.includes('card-layer-2'), `${name} must not use card-layer-2.`);
}

assertContract(
  dashboardPage.includes("from '@components/system'") &&
    dashboardPage.includes('PageShell') &&
    dashboardPage.includes('ActionCard') &&
    dashboardPage.includes('DataCard'),
  'DashboardPage must use PageShell, ActionCard, and DataCard.'
);

assertContract(
  characterListPage.includes("from '@components/system'") &&
    characterListPage.includes('PageShell') &&
    characterListPage.includes('Surface') &&
    characterListPage.includes('Button'),
  'CharacterListPage must use the readable system shell.'
);

assertContract(!characterListPage.includes('card-layer-2'), 'CharacterListPage must not use card-layer-2.');

for (const [name, source] of Object.entries({
  CharacterDetailPage: characterDetailPage,
  CharacterGrowthPage: characterGrowthPage,
  CharacterCreateV2Page: characterCreatePage,
})) {
  assertContract(source.includes("from '@components/system'"), `${name} must import the readable system.`);
  assertContract(source.includes('PageShell'), `${name} must use PageShell.`);
}

assertContract(
  backgroundPicker.includes('readabilityProfile') &&
    backgroundPicker.includes('profileLabels') &&
    backgroundPicker.includes('明亮') &&
    backgroundPicker.includes('平衡') &&
    backgroundPicker.includes('暗色'),
  'BackgroundPicker must label the readability profile for each background.'
);

for (const [name, source] of Object.entries({
  ProfilePage: profilePage,
  ForumListPage: forumListPage,
  ForumBoardPage: forumBoardPage,
  ForumPostPage: forumPostPage,
  ForumNewPostPage: forumNewPostPage,
  RanksPage: ranksPage,
  TitlesPage: titlesPage,
})) {
  assertContract(source.includes("from '@components/system'"), `${name} must import the readable system.`);
  assertContract(source.includes('PageShell'), `${name} must use PageShell.`);
}

for (const [name, source] of Object.entries({
  ForumListPage: forumListPage,
  ForumBoardPage: forumBoardPage,
  ForumNewPostPage: forumNewPostPage,
  RanksPage: ranksPage,
  TitlesPage: titlesPage,
})) {
  assertContract(!source.includes('card-layer-2'), `${name} must not use card-layer-2.`);
}

console.log('UI system contract check passed.');
