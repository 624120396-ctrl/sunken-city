import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@stores/auth.store';

// 布局
import { MainLayout } from '@components/layout/MainLayout';
import { AdminLayout } from '@components/layout/AdminLayout';

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
import { RoomPage } from '@pages/rooms/RoomPage';
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

// 论坛
import { ForumListPage } from '@pages/forum/ForumListPage';
import { ForumBoardPage } from '@pages/forum/ForumBoardPage';
import { ForumPostPage } from '@pages/forum/ForumPostPage';
import { ForumNewPostPage } from '@pages/forum/ForumNewPostPage';

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

function App() {
  const { isAuthenticated } = useAuthStore();

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
    <Routes>
      {/* 管理后台路由 */}
      <Route path="/admin" element={<AdminLayout><AdminDashboardPage /></AdminLayout>} />
      <Route path="/admin/users" element={<AdminLayout><AdminUsersPage /></AdminLayout>} />
      <Route path="/admin/characters" element={<AdminLayout><AdminCharactersPage /></AdminLayout>} />
      <Route path="/admin/rooms" element={<AdminLayout><AdminRoomsPage /></AdminLayout>} />
      <Route path="/admin/settings" element={<AdminLayout><AdminSettingsPage /></AdminLayout>} />
      <Route path="/admin/rank-title" element={<AdminLayout><AdminRankTitlePage /></AdminLayout>} />
      <Route path="/admin/announcements" element={<AdminLayout><AdminAnnouncementsPage /></AdminLayout>} />
      <Route path="/admin/shop" element={<AdminLayout><AdminShopPage /></AdminLayout>} />
      <Route path="/admin/board-moderators" element={<AdminLayout><AdminBoardModeratorsPage /></AdminLayout>} />

      {/* 主站路由 */}
      <Route path="*" element={
        <MainLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/characters" element={<CharacterListPage />} />
            <Route path="/characters/new" element={<CharacterCreateV2Page />} />
            <Route path="/characters/:id" element={<CharacterDetailPage />} />
            <Route path="/characters/:id/edit" element={<CharacterEditPage />} />
            <Route path="/characters/:id/growth" element={<CharacterGrowthPage />} />
            <Route path="/rooms" element={<RoomListPage />} />
            <Route path="/rooms/:roomId" element={<RoomPage />} />
            <Route path="/rooms/:roomId/report" element={<RoomReportPage />} />
            <Route path="/rooms/:roomId/dice-history" element={<DiceHistoryPage />} />
            <Route path="/ranks" element={<RanksPage />} />
            <Route path="/titles" element={<TitlesPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/forums" element={<ForumListPage />} />
            <Route path="/forums/board/:boardKey" element={<ForumBoardPage />} />
            <Route path="/forums/new" element={<ForumNewPostPage />} />
            <Route path="/forums/:postId" element={<ForumPostPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      } />
    </Routes>
  );
}

export default App;
