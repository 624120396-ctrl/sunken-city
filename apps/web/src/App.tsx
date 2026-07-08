import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, type ComponentType } from 'react';
import { useAuthStore } from '@stores/auth.store';
import { AnimatePresence } from 'motion/react';
import { ToastProvider } from '@components/ui/Toast';
import { CommandPalette } from '@components/ui/CommandPalette';

// 动画
import { PageTransition } from '@components/ui/Animation';

// 布局
import { AdminLayout } from '@components/layout/AdminLayout';
import { AppShellV2 } from '@components/layout/AppShellV2';

// 页面
import { LoginPage } from '@pages/auth/LoginPage';
import { RegisterPage } from '@pages/auth/RegisterPage';
import { CharacterEditPage } from '@pages/characters/CharacterEditPage';

// 管理后台
import { AdminDashboardPage } from '@pages/admin/AdminDashboardPage';
import { AdminUsersPage } from '@pages/admin/AdminUsersPage';
import { AdminCharactersPage } from '@pages/admin/AdminCharactersPage';
import { AdminRoomsPage } from '@pages/admin/AdminRoomsPage';
import { AdminSettingsPage } from '@pages/admin/AdminSettingsPage';
import { AdminRankTitlePage } from '@pages/admin/AdminRankTitlePage';
import { AdminAnnouncementsPage } from '@pages/admin/AdminAnnouncementsPage';
import { AdminShopPage } from '@pages/admin/AdminShopPage';
import { AdminBoardModeratorsPage } from '@pages/admin/AdminBoardModeratorsPage';
import { AdminRelicMarketPage } from '@pages/admin/AdminRelicMarketPage';
import { AdminDreamCardPage } from '@pages/admin/AdminDreamCardPage';

import { PageSkeleton } from '@components/ui/Skeleton';

function lazyNamed<T extends ComponentType<any>>(
  loader: () => Promise<Record<string, T>>,
  exportName: string
) {
  return lazy(() => loader().then((module) => ({ default: module[exportName] })));
}

// 主站路由页按需加载，避免房间系统首屏拉入所有页面代码。
const DashboardPage = lazyNamed(() => import('@pages/dashboard/DashboardPage'), 'DashboardPage');
const CharacterListPage = lazyNamed(() => import('@pages/characters/CharacterListPage'), 'CharacterListPage');
const CharacterCreateV2Page = lazyNamed(() => import('@pages/characters/CharacterCreateV2Page'), 'CharacterCreateV2Page');
const CharacterDetailPage = lazyNamed(() => import('@pages/characters/CharacterDetailPage'), 'CharacterDetailPage');
const CharacterGrowthPage = lazyNamed(() => import('@pages/characters/CharacterGrowthPage'), 'CharacterGrowthPage');
const RoomListPage = lazyNamed(() => import('@pages/rooms/RoomListPage'), 'RoomListPage');
const RoomPage = lazy(() => import('@pages/rooms/RoomPage').then(m => ({ default: m.RoomPage })));
const RoomReportPage = lazyNamed(() => import('@pages/rooms/RoomReportPage'), 'RoomReportPage');
const DiceHistoryPage = lazyNamed(() => import('@pages/rooms/DiceHistoryPage'), 'DiceHistoryPage');
const RanksPage = lazyNamed(() => import('@pages/ranks/RanksPage'), 'RanksPage');
const TitlesPage = lazyNamed(() => import('@pages/titles/TitlesPage'), 'TitlesPage');
const ProfilePage = lazyNamed(() => import('@pages/profile/ProfilePage'), 'ProfilePage');
const ShopPage = lazyNamed(() => import('@pages/shop/ShopPage'), 'ShopPage');
const InventoryPage = lazyNamed(() => import('@pages/inventory/InventoryPage'), 'InventoryPage');
const RelicMarketPage = lazyNamed(() => import('@pages/market/RelicMarketPage'), 'RelicMarketPage');
const ForumListPage = lazyNamed(() => import('@pages/forum/ForumListPage'), 'ForumListPage');
const ForumBoardPage = lazyNamed(() => import('@pages/forum/ForumBoardPage'), 'ForumBoardPage');
const ForumPostPage = lazyNamed(() => import('@pages/forum/ForumPostPage'), 'ForumPostPage');
const ForumNewPostPage = lazyNamed(() => import('@pages/forum/ForumNewPostPage'), 'ForumNewPostPage');
const FriendListPage = lazyNamed(() => import('@pages/friends/FriendListPage'), 'FriendListPage');
const FishingPage = lazyNamed(() => import('@pages/fishing/FishingPage'), 'FishingPage');
const DreamingPage = lazyNamed(() => import('@pages/dreaming/DreamingPage'), 'DreamingPage');
const SoloStartPage = lazyNamed(() => import('@pages/solo/SoloStartPage'), 'SoloStartPage');
const SoloPlayerPage = lazyNamed(() => import('@pages/solo/SoloPlayerPage'), 'SoloPlayerPage');
const ScenarioSelectPage = lazy(() => import('@pages/scenarios/select'));
const ScenarioEditorPage = lazy(() => import('@pages/scenarios/editor'));

function routeElement(Page: ComponentType) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageTransition><Page /></PageTransition>
    </Suspense>
  );
}

function App() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <>
      <ToastProvider>
      <Routes>
        {/* 管理后台路由 */}
        <Route path="/admin" element={<AdminLayout><AdminDashboardPage /></AdminLayout>} />
      <Route path="/admin/users" element={<AdminLayout><AdminUsersPage /></AdminLayout>} />
      <Route path="/admin/characters" element={<AdminLayout><AdminCharactersPage /></AdminLayout>} />
      <Route path="/admin/characters/:id/edit" element={<AdminLayout><CharacterEditPage /></AdminLayout>} />
      <Route path="/admin/rooms" element={<AdminLayout><AdminRoomsPage /></AdminLayout>} />
      <Route path="/admin/settings" element={<AdminLayout><AdminSettingsPage /></AdminLayout>} />
      <Route path="/admin/rank-title" element={<AdminLayout><AdminRankTitlePage /></AdminLayout>} />
      <Route path="/admin/announcements" element={<AdminLayout><AdminAnnouncementsPage /></AdminLayout>} />
      <Route path="/admin/shop" element={<AdminLayout><AdminShopPage /></AdminLayout>} />
      <Route path="/admin/board-moderators" element={<AdminLayout><AdminBoardModeratorsPage /></AdminLayout>} />
      <Route path="/admin/relic-market" element={<AdminLayout><AdminRelicMarketPage /></AdminLayout>} />
      <Route path="/admin/dream-cards" element={<AdminLayout><AdminDreamCardPage /></AdminLayout>} />

      {/* 主站路由 */}
      <Route path="*" element={
        <AppShellV2>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={routeElement(DashboardPage)} />
              <Route path="/characters" element={routeElement(CharacterListPage)} />
              <Route path="/characters/new" element={routeElement(CharacterCreateV2Page)} />
              <Route path="/characters/:id" element={routeElement(CharacterDetailPage)} />
              <Route path="/characters/:id/edit" element={<Navigate to="/characters/:id" replace />} />
              <Route path="/characters/:id/growth" element={routeElement(CharacterGrowthPage)} />
              <Route path="/rooms" element={routeElement(RoomListPage)} />
              <Route path="/rooms/:roomId" element={routeElement(RoomPage)} />
              <Route path="/rooms/:roomId/report" element={routeElement(RoomReportPage)} />
              <Route path="/rooms/:roomId/dice-history" element={routeElement(DiceHistoryPage)} />
              <Route path="/ranks" element={routeElement(RanksPage)} />
              <Route path="/titles" element={routeElement(TitlesPage)} />
              <Route path="/shop" element={routeElement(ShopPage)} />
              <Route path="/inventory" element={routeElement(InventoryPage)} />
              <Route path="/market" element={routeElement(RelicMarketPage)} />
              <Route path="/forums" element={routeElement(ForumListPage)} />
              <Route path="/forums/board/:boardKey" element={routeElement(ForumBoardPage)} />
              <Route path="/forums/new" element={routeElement(ForumNewPostPage)} />
              <Route path="/forums/:postId" element={routeElement(ForumPostPage)} />
              <Route path="/friends" element={routeElement(FriendListPage)} />
              <Route path="/fishing" element={routeElement(FishingPage)} />
              <Route path="/dream" element={routeElement(DreamingPage)} />
              <Route path="/solo" element={routeElement(SoloStartPage)} />
              <Route path="/solo/:scenarioId" element={routeElement(SoloPlayerPage)} />
              <Route path="/solo/session/:sessionId" element={routeElement(SoloPlayerPage)} />
              <Route path="/scenarios" element={routeElement(ScenarioSelectPage)} />
              <Route path="/scenarios/new" element={routeElement(ScenarioEditorPage)} />
              <Route path="/scenarios/:id/edit" element={routeElement(ScenarioEditorPage)} />
              <Route path="/profile" element={routeElement(ProfilePage)} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </AppShellV2>
      } />
    </Routes>
    </ToastProvider>
    <CommandPalette />
  </>
);
}

export default App;
