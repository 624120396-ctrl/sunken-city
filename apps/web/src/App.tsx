import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
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
import { DashboardPage } from '@pages/dashboard/DashboardPage';
import { CharacterListPage } from '@pages/characters/CharacterListPage';
import { CharacterCreateV2Page } from '@pages/characters/CharacterCreateV2Page';
import { CharacterEditPage } from '@pages/characters/CharacterEditPage';
import { CharacterDetailPage } from '@pages/characters/CharacterDetailPage';
import { CharacterGrowthPage } from '@pages/characters/CharacterGrowthPage';
import { RoomListPage } from '@pages/rooms/RoomListPage';
// import { RoomPage } from '@pages/rooms/RoomPage'; // 懒加载
import { RoomReportPage } from '@pages/rooms/RoomReportPage';
import { DiceHistoryPage } from '@pages/rooms/DiceHistoryPage';

// 位阶与印记
import { RanksPage } from '@pages/ranks/RanksPage';
import { TitlesPage } from '@pages/titles/TitlesPage';

// 个人中心
import { ProfilePage } from '@pages/profile/ProfilePage';

// 商店
import { ShopPage } from '@pages/shop/ShopPage';
import { InventoryPage } from '@pages/inventory/InventoryPage';
import { RelicMarketPage } from '@pages/market/RelicMarketPage';

// 论坛
import { ForumListPage } from '@pages/forum/ForumListPage';
import { ForumBoardPage } from '@pages/forum/ForumBoardPage';
import { ForumPostPage } from '@pages/forum/ForumPostPage';
import { ForumNewPostPage } from '@pages/forum/ForumNewPostPage';

// 好友
import { FriendListPage } from '@pages/friends/FriendListPage';
import { FishingPage } from '@pages/fishing/FishingPage';
import { DreamingPage } from '@pages/dreaming/DreamingPage';
import { SoloStartPage } from '@pages/solo/SoloStartPage';
import { SoloPlayerPage } from '@pages/solo/SoloPlayerPage';
import ScenarioSelectPage from '@pages/scenarios/select';
import ScenarioEditorPage from '@pages/scenarios/editor';

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

// 懒加载 — 重页面
import { PageSkeleton } from '@components/ui/Skeleton';
const RoomPage = lazy(() => import('@pages/rooms/RoomPage').then(m => ({ default: m.RoomPage })));

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
              <Route path="/" element={<PageTransition><DashboardPage /></PageTransition>} />
              <Route path="/characters" element={<PageTransition><CharacterListPage /></PageTransition>} />
              <Route path="/characters/new" element={<PageTransition><CharacterCreateV2Page /></PageTransition>} />
              <Route path="/characters/:id" element={<PageTransition><CharacterDetailPage /></PageTransition>} />
              <Route path="/characters/:id/edit" element={<Navigate to="/characters/:id" replace />} />
              <Route path="/characters/:id/growth" element={<PageTransition><CharacterGrowthPage /></PageTransition>} />
              <Route path="/rooms" element={<PageTransition><RoomListPage /></PageTransition>} />
              <Route path="/rooms/:roomId" element={
                <Suspense fallback={<PageSkeleton />}>
                  <PageTransition><RoomPage /></PageTransition>
                </Suspense>
              } />
              <Route path="/rooms/:roomId/report" element={<PageTransition><RoomReportPage /></PageTransition>} />
              <Route path="/rooms/:roomId/dice-history" element={<PageTransition><DiceHistoryPage /></PageTransition>} />
              <Route path="/ranks" element={<PageTransition><RanksPage /></PageTransition>} />
              <Route path="/titles" element={<PageTransition><TitlesPage /></PageTransition>} />
              <Route path="/shop" element={<PageTransition><ShopPage /></PageTransition>} />
              <Route path="/inventory" element={<PageTransition><InventoryPage /></PageTransition>} />
              <Route path="/market" element={<PageTransition><RelicMarketPage /></PageTransition>} />
              <Route path="/forums" element={<PageTransition><ForumListPage /></PageTransition>} />
              <Route path="/forums/board/:boardKey" element={<PageTransition><ForumBoardPage /></PageTransition>} />
              <Route path="/forums/new" element={<PageTransition><ForumNewPostPage /></PageTransition>} />
              <Route path="/forums/:postId" element={<PageTransition><ForumPostPage /></PageTransition>} />
              <Route path="/friends" element={<PageTransition><FriendListPage /></PageTransition>} />
              <Route path="/fishing" element={<PageTransition><FishingPage /></PageTransition>} />
              <Route path="/dream" element={<PageTransition><DreamingPage /></PageTransition>} />
              <Route path="/solo" element={<PageTransition><SoloStartPage /></PageTransition>} />
              <Route path="/solo/:scenarioId" element={<PageTransition><SoloPlayerPage /></PageTransition>} />
              <Route path="/solo/session/:sessionId" element={<PageTransition><SoloPlayerPage /></PageTransition>} />
              <Route path="/scenarios" element={<PageTransition><ScenarioSelectPage /></PageTransition>} />
              <Route path="/scenarios/new" element={<PageTransition><ScenarioEditorPage /></PageTransition>} />
              <Route path="/scenarios/:id/edit" element={<PageTransition><ScenarioEditorPage /></PageTransition>} />
              <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
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
