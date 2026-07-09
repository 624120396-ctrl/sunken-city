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
const appRoutes = readProjectFile('src/App.tsx');
const sideNav = readProjectFile('src/components/layout/SideNavV2.tsx');
const commandPalette = readProjectFile('src/components/ui/CommandPalette.tsx');
const notificationBell = readProjectFile('src/components/notifications/NotificationBell.tsx');
const notificationMeta = readProjectFile('src/services/notification-meta.ts');
const tokens = readProjectFile('src/styles/tokens-v2.css');
const backgroundCss = readProjectFile('src/styles/background-v2.css');
const systemCss = readProjectFile('src/styles/system-v2.css');
const storyEntryCss = readProjectFile('src/styles/story-entry.css');
const dreamingCss = readProjectFile('src/styles/dreaming.css');
const rankTitleCss = readProjectFile('src/styles/rank-title.css');
const profileCss = readProjectFile('src/styles/profile.css');
const surface = readProjectFile('src/components/system/Surface.tsx');
const pageShell = readProjectFile('src/components/system/PageShell.tsx');
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
const friendListPage = readProjectFile('src/pages/friends/FriendListPage.tsx');
const messageCenterPage = readProjectFile('src/pages/messages/MessageCenterPage.tsx');
const dreamingPage = readProjectFile('src/pages/dreaming/DreamingPage.tsx');
const fishingPage = readProjectFile('src/pages/fishing/FishingPage.tsx');
const roomPage = readProjectFile('src/pages/rooms/RoomPage.tsx');
const roomChatTranscript = readProjectFile('src/pages/rooms/components/RoomChatTranscript.tsx');
const roomChatComposer = readProjectFile('src/pages/rooms/components/RoomChatComposer.tsx');
const roomPlayerView = readProjectFile('src/pages/rooms/components/RoomPlayerView.tsx');
const roomVisualCss = readProjectFile('src/styles/room-visual-rebuild.css');
const legacyCard = readProjectFile('src/components/system/Card.tsx');
const skeleton = readProjectFile('src/components/ui/Skeleton.tsx');

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

assertContract(
  appRoutes.includes("import('@pages/messages/MessageCenterPage')") &&
    appRoutes.includes('MessageCenterPage') &&
    appRoutes.includes('path="/messages"'),
  'MessageCenterPage must be routed at /messages.'
);

assertContract(
  sideNav.includes("path: '/messages'") && sideNav.includes("label: '消息中心'"),
  'SideNavV2 must expose the routed message center.'
);

assertContract(
  commandPalette.includes("path: '/messages'") &&
    commandPalette.includes("label: '消息中心'") &&
    !commandPalette.includes("path: '/world'") &&
    !commandPalette.includes("path: '/help'"),
  'CommandPalette must expose /messages and must not expose unrouted /world or /help entries.'
);

assertContract(
  commandPalette.includes("label: '首页'") &&
    commandPalette.includes("label: '故事书'") &&
    commandPalette.includes("label: '旧日低语'") &&
    commandPalette.includes("label: '位阶'") &&
    commandPalette.includes("label: '印记'"),
  'CommandPalette labels must match the visible product navigation vocabulary.'
);

assertContract(
  messageCenterPage.includes('PageShell') &&
    messageCenterPage.includes('Surface') &&
    messageCenterPage.includes("material=\"archive\"") &&
    messageCenterPage.includes('message-center-page') &&
    messageCenterPage.includes('getNotificationLayerLabel') &&
    messageCenterPage.includes('getNotificationLayerDescription') &&
    !messageCenterPage.includes('RuneBorder') &&
    !messageCenterPage.includes('h-[calc(100vh-3rem)]'),
  'MessageCenterPage must use the readable non-room archive shell with classified notification layers.'
);

assertContract(
  notificationMeta.includes('getNotificationLayer') &&
    notificationMeta.includes('coordination') &&
    notificationMeta.includes('social') &&
    notificationMeta.includes('system') &&
    notificationMeta.includes('调度') &&
    notificationMeta.includes('社交') &&
    notificationMeta.includes('系统'),
  'Notification metadata must define shared coordination/social/system layers.'
);

assertContract(
  notificationBell.includes('getNotificationLayer') &&
    notificationBell.includes('notificationLayer') &&
    notificationBell.includes("navigate('/messages')") &&
    notificationBell.includes('调度') &&
    notificationBell.includes('社交') &&
    notificationBell.includes('系统') &&
    notificationBell.includes('消息中心') &&
    !notificationBell.includes('bg-coc-accent-red text-white hover:bg-coc-blood.glow'),
  'NotificationBell must mirror MessageCenterPage layers and route users to the full message center.'
);

assertContract(
  friendListPage.includes('friend-social-page') &&
    friendListPage.includes('调查员社交台') &&
    friendListPage.includes('联系人册') &&
    friendListPage.includes('待处理申请') &&
    friendListPage.includes('同行状态') &&
    friendListPage.includes('material="archive"') &&
    friendListPage.includes('进入消息中心') &&
    !friendListPage.includes('SOCIAL LEDGER') &&
    !friendListPage.includes('我的好友'),
  'FriendListPage must present investigator social as a readable contact dossier, not a generic friend list.'
);

assertContract(
  profilePage.includes('profile-investigator-dossier') &&
    profilePage.includes('调查员档案') &&
    profilePage.includes('公开身份') &&
    profilePage.includes('长期留存') &&
    profilePage.includes('角色档案') &&
    profilePage.includes('进入消息中心') &&
    profilePage.includes("material=\"archive\"") &&
    !profilePage.includes('profile settings') &&
    !profilePage.includes('个人档案'),
  'ProfilePage must present the profile as an investigator dossier linked to characters, messages, and long-term retention.'
);

assertContract(
  characterDetailPage.includes('character-public-dossier') &&
    characterDetailPage.includes('调查员卷宗') &&
    characterDetailPage.includes('公开经历') &&
    characterDetailPage.includes('房间经历卷宗') &&
    characterDetailPage.includes('报告归档') &&
    characterDetailPage.includes('阅读调查报告') &&
    characterDetailPage.includes('结案记号') &&
    characterDetailPage.includes("material=\"archive\"") &&
    !characterDetailPage.includes('查看属性、技能、战斗配置和背景档案'),
  'CharacterDetailPage must frame non-room character details as a Call of Cthulhu-style public dossier and report archive.'
);

assertContract(
  forumListPage.includes('旧日低语档案') &&
    forumListPage.includes('低语卷宗') &&
    forumListPage.includes('未启封的档案') &&
    !forumListPage.includes('论坛索引') &&
    !forumListPage.includes('主题'),
  'ForumListPage copy must use the Old Whispers archive voice instead of generic forum wording.'
);

assertContract(
  forumBoardPage.includes('旧日低语分卷') &&
    forumBoardPage.includes('誊录低语') &&
    forumBoardPage.includes('卷宗概览') &&
    forumBoardPage.includes('封存卷宗') &&
    !forumBoardPage.includes('forum board') &&
    !forumBoardPage.includes('发布主题') &&
    !forumBoardPage.includes('普通帖子'),
  'ForumBoardPage copy must use the Old Whispers archive voice instead of generic board/thread wording.'
);

assertContract(
  forumPostPage.includes('低语档案') &&
    forumPostPage.includes('原始记录') &&
    forumPostPage.includes('回声档案') &&
    forumPostPage.includes('誊写回声') &&
    !forumPostPage.includes('forum post') &&
    !forumPostPage.includes('普通讨论') &&
    !forumPostPage.includes('写下你的回复'),
  'ForumPostPage copy must use the Old Whispers archive voice instead of generic post/reply wording.'
);

assertContract(
  forumNewPostPage.includes('誊录一则低语') &&
    forumNewPostPage.includes('密档标题') &&
    forumNewPostPage.includes('低语正文') &&
    forumNewPostPage.includes('封入档案') &&
    !forumNewPostPage.includes('forum editor') &&
    !forumNewPostPage.includes('发布主题') &&
    !forumNewPostPage.includes('请输入标题'),
  'ForumNewPostPage copy must use the Old Whispers archive voice instead of generic editor wording.'
);

assertContract(
  fishingPage.includes('blackwater-harbor-page') &&
    fishingPage.includes('黑水港作业台') &&
    fishingPage.includes('潮汐等待') &&
    fishingPage.includes('咬钩警讯') &&
    fishingPage.includes('收竿结算') &&
    fishingPage.includes('渔获账本') &&
    fishingPage.includes('可疑渔获') &&
    fishingPage.includes('封存') &&
    fishingPage.includes('material="archive"') &&
    !fishingPage.includes('当前水况') &&
    !fishingPage.includes('港务图鉴') &&
    !fishingPage.includes('港务账本') &&
    !fishingPage.includes('出售成功'),
  'FishingPage must present Blackwater Harbor as a staged playable workbench with a collection ledger, not a generic fishing dashboard.'
);

assertContract(
  dreamingPage.includes('drowned-oracle-page') &&
    dreamingPage.includes('溺者之牌仪式台') &&
    dreamingPage.includes('今日入梦') &&
    dreamingPage.includes('选牌仪式') &&
    dreamingPage.includes('翻牌解梦') &&
    dreamingPage.includes('梦兆图鉴') &&
    dreamingPage.includes('历史梦兆') &&
    dreamingPage.includes('解牌代价') &&
    dreamingPage.includes('material="archive"') &&
    !dreamingPage.includes('入梦门槛') &&
    !dreamingPage.includes('历史梦录') &&
    !dreamingPage.includes('今日占卜') &&
    !dreamingPage.includes('梦境状态') &&
    !dreamingPage.includes('还没有任何梦境记录'),
  'DreamingPage must present Drowned Oracle as a staged ritual table with archive and history, not a generic divination page.'
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
  '--coc-texture-keeper-parchment',
]) {
  assertContract(tokens.includes(tokenName), `Missing design token ${tokenName}.`);
}

assertContract(
  tokens.includes("url('/ui-textures/room-v6-aged-parchment-white.webp')") &&
    systemCss.includes('data-material="archive"') &&
    systemCss.includes('var(--coc-texture-keeper-parchment)') &&
    !systemCss.includes('var(--coc-texture-archive-paper);'),
  'Archive Surface material must use the room KP chat parchment texture instead of the old generic archive paper.'
);

assertContract(
  systemCss.includes('grid-template-columns: minmax(0, 1fr) 12rem') &&
    systemCss.includes('.coc-page-shell__header.coc-surface-v2') &&
    pageShell.includes('padding="none"') &&
    systemCss.includes('linear-gradient(90deg, rgba(9, 21, 24, 0.88), rgba(20, 36, 38, 0.72) 52%, rgba(53, 64, 51, 0.64))') &&
    systemCss.includes('background-size: auto, auto, 840px 260px') &&
    systemCss.includes('var(--coc-texture-header-cold-mist)') &&
    !systemCss.includes('var(--coc-texture-room-header-ritual)') &&
    !tokens.includes('--coc-texture-room-header-ritual') &&
    systemCss.includes('var(--coc-texture-gold-vertical-sigil)') &&
    systemCss.includes('var(--coc-texture-gold-sunburst-arc)') &&
    systemCss.includes('.coc-page-shell__actions button:first-child') &&
    systemCss.includes('.coc-page-shell__actions button:last-child') &&
    systemCss.includes('.coc-page-shell__resource-ledger'),
  'PageShell top bars must copy the room-list header source exactly: cold-mist texture, 90deg green gradient, sigil, sunburst, and action well.'
);

assertContract(
  systemCss.includes('.coc-archive-subcard') &&
    systemCss.includes('var(--coc-texture-keeper-parchment)') &&
    dreamingPage.includes('coc-archive-subcard') &&
    fishingPage.includes('coc-archive-subcard'),
  'Nested cards in non-room archive pages must use the KP parchment subcard treatment instead of dark child blocks.'
);

assertContract(
  dreamingPage.includes('coc-page-shell__resource-ledger') &&
    dreamingPage.includes('dream-oracle-status-strip') &&
    dreamingPage.includes('dream-oracle-entry-grid') &&
    dreamingPage.includes('dream-oracle-entry-card') &&
    dreamingPage.includes('dream-oracle-brief-card__heading') &&
    dreamingCss.includes('.dream-oracle-entry-grid') &&
    dreamingCss.includes('grid-template-columns: repeat(3, minmax(0, 1fr))') &&
    dreamingCss.includes('min-height: 5.25rem') &&
    !dreamingCss.includes('.dream-oracle-tabs') &&
    !dreamingCss.includes('.dream-oracle-phase-card') &&
    dreamingCss.includes('.dream-oracle-brief-card__body') &&
    dreamingCss.includes('var(--coc-texture-keeper-parchment)') &&
    !dreamingCss.includes('padding-top: 2rem') &&
    !dreamingPage.includes('className="flex items-center gap-2 text-xs font-bold uppercase text-purple-200"'),
  'Drowned Oracle must align header currency, top spacing, phase strip, and side-card text with room-list and PL parchment patterns.'
);

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
  systemCss.includes('@media (min-width: 2200px)') &&
    systemCss.includes('width: 100%') &&
    systemCss.includes('minmax(24rem, 30rem)'),
  'PageShell must expand to the available content width on ultrawide desktop screens.'
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
  dashboardPage.includes('/dashboard-card-character.png') &&
    dashboardPage.includes('/dashboard-card-room.png') &&
    dashboardPage.includes('/dashboard-card-abyss.png') &&
    dashboardPage.includes('whispersHovered') &&
    dashboardPage.includes('GlassCard') &&
    dashboardPage.includes('[@media(min-width:2200px)]:space-y-10') &&
    !dashboardPage.includes('max-w-[118rem]') &&
    dashboardPage.includes('[@media(min-width:2200px)]:grid-cols-3') &&
    dashboardPage.includes('grid-cols-[repeat(auto-fit,minmax(15rem,17rem))]') &&
    !dashboardPage.includes('PageShell') &&
    !dashboardPage.includes('ActionCard'),
  'DashboardPage must preserve immersive cards with adaptive widescreen layout.'
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
  FriendListPage: friendListPage,
  DreamingPage: dreamingPage,
  FishingPage: fishingPage,
})) {
  assertContract(source.includes("from '@components/system'"), `${name} must import the readable system.`);
  assertContract(source.includes('PageShell'), `${name} must use PageShell.`);
}

for (const [name, source] of Object.entries({
  FriendListPage: friendListPage,
  DreamingPage: dreamingPage,
  FishingPage: fishingPage,
})) {
  assertContract(
    source.includes('coc-section-group') || source.includes('coc-section-stack'),
    `${name} must use section spacing primitives to prevent adjacent Surface collision.`
  );
}

for (const [name, source] of Object.entries({
  ProfilePage: profilePage,
  ForumListPage: forumListPage,
  ForumBoardPage: forumBoardPage,
  RanksPage: ranksPage,
  TitlesPage: titlesPage,
  FriendListPage: friendListPage,
  DreamingPage: dreamingPage,
  FishingPage: fishingPage,
})) {
  assertContract(
    !source.includes('contentClassName="max-w-'),
    `${name} must not constrain PageShell content width on desktop.`
  );
}

assertContract(
  forumListPage.includes('[@media(min-width:2200px)]:grid-cols-4') &&
    ranksPage.includes('[@media(min-width:2200px)]:grid-cols-8') &&
    titlesPage.includes('[@media(min-width:2200px)]:grid-cols-8') &&
    profilePage.includes('xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]') &&
    profilePage.includes('[@media(min-width:2200px)]:grid-cols-8') &&
    friendListPage.includes('[@media(min-width:2200px)]:grid-cols-4') &&
    dreamingPage.includes('[@media(min-width:2200px)]:grid-cols-6') &&
    fishingPage.includes('xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)]'),
  'Index and settings pages must use expanded desktop grids.'
);

assertContract(
  storyEntryCss.includes('.story-entry-page') &&
    storyEntryCss.includes('width: min(100%, 132rem)') &&
    rankTitleCss.includes('.rank-title-page') &&
    rankTitleCss.includes('width: min(100%, 132rem)') &&
    profileCss.includes('.profile-page') &&
    profileCss.includes('width: min(100%, 132rem)'),
  'Story, rank-title, and profile shells must not override ultrawide PageShell with narrow widths.'
);

for (const [name, source] of Object.entries({
  ForumListPage: forumListPage,
  ForumBoardPage: forumBoardPage,
  ForumNewPostPage: forumNewPostPage,
  RanksPage: ranksPage,
  TitlesPage: titlesPage,
  FriendListPage: friendListPage,
  DreamingPage: dreamingPage,
  FishingPage: fishingPage,
})) {
  assertContract(!source.includes('card-layer-2'), `${name} must not use card-layer-2.`);
}

for (const [name, source] of Object.entries({
  FriendListPage: friendListPage,
  DreamingPage: dreamingPage,
  FishingPage: fishingPage,
})) {
  assertContract(!source.includes('max-w-5xl mx-auto'), `${name} must not use the legacy narrow page wrapper.`);
  assertContract(source.includes('Surface'), `${name} must use readable Surface layers.`);
}

assertContract(
  !fishingPage.includes('DoubleBezelCard'),
  'FishingPage must not depend on DoubleBezelCard for the Blackwater Harbor layout.'
);

assertContract(
    roomPage.includes("from '@components/system'") &&
    roomPage.includes('Surface') &&
    roomPage.includes('room-gameplay-shell') &&
    roomPage.includes('RoomChatTranscript') &&
    roomChatTranscript.includes('room-message-list') &&
    roomPage.includes('room-mobile-action-drawer-toggle'),
  'RoomPage must use the readable system shell while preserving mobile chat controls.'
);

assertContract(
    roomPage.includes('room-mobile-scene-card') &&
    roomPage.includes('useState(!isMobile)') &&
    roomPage.includes('if (isMobile) setShowSceneBanner(false)') &&
    roomPage.includes('room-mobile-chat-header') &&
    roomPage.includes('room-mobile-chat-header__title') &&
    roomPage.includes('room-mobile-chat-meta-strip') &&
    !roomPage.includes('room-mobile-bottom-dock--player') &&
    roomPage.includes('room-mobile-bottom-dock--keeper') &&
    roomPage.includes('data-room-mobile-pl-primary-action') &&
    roomPage.includes('data-room-mobile-kp-lite-action') &&
    roomPage.includes('closeMobileActionSurfaces') &&
    roomPage.includes('setShowMobileQuickRolls(false)') &&
    roomPage.includes('room-mobile-tools-sheet') &&
    roomPage.includes('room-mobile-keeper-stage') &&
    roomPage.includes('room-mobile-layer-panel') &&
    roomPage.includes('room-mobile-information-panels') &&
    roomPlayerView.includes('room-player-mobile-info-stack') &&
    roomPlayerView.includes('room-player-mobile-status-strip') &&
    roomPlayerView.includes('room-player-mobile-layer-summary') &&
    roomPlayerView.includes('room-player-mobile-layer-content') &&
    roomChatTranscript.includes('room-mobile-chat-bubbles') &&
    roomChatTranscript.includes('room-mobile-chat-bubbles__bubble') &&
    roomPage.includes('room-mobile-tools-sheet__quick-rolls') &&
    roomPage.includes('room-mobile-tools-sheet__grid') &&
    roomPage.includes('room-mobile-tool-tile') &&
    roomPage.includes('room-mobile-tool-tile__icon') &&
    roomPage.includes('data-mobile-tool-id="character"') &&
    roomPage.includes('data-mobile-tool-id="clues"') &&
    roomPage.includes('data-mobile-tool-id="members"') &&
    roomPage.includes('data-mobile-tool-id="notes"') &&
    roomPage.includes('data-mobile-tool-id="subrooms"') &&
    roomPage.includes('data-mobile-tool-id="archive"') &&
    roomPage.includes('data-mobile-tool-id="more"') &&
    roomChatComposer.includes('room-mobile-chat-composer-plus') &&
    roomChatComposer.includes('room-mobile-chat-composer-dice') &&
    roomVisualCss.includes('.room-mobile-tools-sheet') &&
    roomVisualCss.includes('.room-mobile-tools-sheet__quick-rolls') &&
    roomVisualCss.includes('.room-mobile-chat-header') &&
    roomVisualCss.includes('.room-mobile-chat-meta-strip') &&
    roomVisualCss.includes('.room-mobile-chat-composer-plus') &&
    roomVisualCss.includes('.room-mobile-chat-composer-dice') &&
    roomVisualCss.includes('grid-template-columns: 2.75rem 2.75rem minmax(0, 1fr) 2.75rem') &&
    roomVisualCss.includes('.room-mobile-chat-bubbles') &&
    roomVisualCss.includes('.room-mobile-chat-bubbles__bubble') &&
    roomVisualCss.includes('.room-mobile-tools-sheet__grid') &&
    roomVisualCss.includes('.room-mobile-tool-tile') &&
    roomVisualCss.includes('.room-mobile-tool-tile__icon') &&
    roomVisualCss.includes('.room-mobile-chat-bubbles') &&
    roomVisualCss.includes("background: #f8f5eb url('/ui-textures/room-v6-aged-parchment-white.webp') center / cover no-repeat !important;") &&
    roomVisualCss.includes('.room-mobile-bottom-dock--keeper') &&
    roomVisualCss.includes('--room-mobile-dock-space') &&
    roomVisualCss.includes('.room-mobile-keeper-stage') &&
    roomVisualCss.includes('.room-player-mobile-status-strip') &&
    roomVisualCss.includes('grid-row: 1') &&
    roomVisualCss.includes('.room-player-mobile-layer-summary') &&
    roomVisualCss.includes('.room-player-mobile-layer-content') &&
    roomVisualCss.includes('@media (max-width: 380px)') &&
    roomVisualCss.includes('.room-mobile-layer-panel') &&
    roomVisualCss.includes('data-mobile-mobile-first-room="true"'),
  'Room mobile layout must use chat-first KP/PL stage, scene card, bottom tools sheet, and layered information panels.'
);

assertContract(
  !roomPage.includes('DoubleBezelCard'),
  'RoomPage must not depend on DoubleBezelCard for the main gameplay shell.'
);

for (const [name, source] of Object.entries({
  SystemCard: legacyCard,
  Skeleton: skeleton,
})) {
  assertContract(
    !source.includes('card-layer-2') && !source.includes('coc-card-v2') && source.includes('Surface'),
    `${name} must be backed by Surface instead of legacy card classes.`
  );
}

console.log('UI system contract check passed.');
