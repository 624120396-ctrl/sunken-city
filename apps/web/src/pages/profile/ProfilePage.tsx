import { useState, useRef, useEffect } from 'react';
import { User, Lock, Save, Eye, EyeOff, Camera, Upload, X, Package, Coins, Sparkles, Wand2, Mail, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@stores/auth.store';
import { apiFetch } from '@lib/api';
import { PageShell, Surface } from '@components/system';
import { uploadFile } from '@services/upload.service';
import { getInventory, equipItem, type InventoryItem } from '@services/shop.service';
import { generateImage } from '@services/ai.service';
import { getUserForumStats } from '@services/forum.service';
import { setDisplayedTitle } from '@services/rank-title.service';
import { MessageSquare, ThumbsUp, Award, FileText } from 'lucide-react';
import { BackgroundPicker } from '@components/background/BackgroundPicker';
import { DEFAULT_BACKGROUND_ID } from '@components/background/backgroundOptions';
import {
  getProfileDossierStats,
  getProfileInventoryGroups,
  getProfileRoleBadge,
} from '@components/profile/profileDossierMeta';

const rarityColor: Record<string, string> = {
  common: 'border-coc-parchment-dim',
  rare: 'border-coc-gold',
  epic: 'border-coc-madness',
  legendary: 'border-purple-400',
  mythical: 'border-rose-300',
};

export function ProfilePage() {
  const { user, updateUser } = useAuthStore();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [equippingKey, setEquippingKey] = useState<string | null>(null);

  const [forumStats, setForumStats] = useState<{
    postCount: number;
    replyCount: number;
    likeCountReceived: number;
    bestReplyCount: number;
  } | null>(null);

  const [selectedBackground, setSelectedBackground] = useState(user?.preferredBackground || DEFAULT_BACKGROUND_ID);
  const [savingBackground, setSavingBackground] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    fetchInventory();
    if (user?.id) {
      getUserForumStats(user.id).then(setForumStats).catch(() => setForumStats(null));
    }
  }, []);

  const fetchInventory = async () => {
    try {
      setInventoryLoading(true);
      const data = await getInventory();
      setInventory(data.inventory);
    } catch (err) {
      console.error('获取背包失败:', err);
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleEquip = async (itemKey: string | null) => {
    try {
      setEquippingKey(itemKey || 'unset');
      const data = await equipItem(itemKey);
      if (data.user) {
        updateUser(data.user);
      } else {
        updateUser({ equippedFrame: itemKey || undefined });
      }
      alert(data.message || (itemKey ? '装备成功' : '已卸下'));
    } catch (err) {
      alert('装备失败：' + (err as Error).message);
    } finally {
      setEquippingKey(null);
    }
  };

  const handleDisplayTitle = async (titleKey: string | null) => {
    try {
      setEquippingKey(titleKey || 'unset');
      await setDisplayedTitle(titleKey);
      updateUser({ displayedTitleKey: titleKey || undefined });
      alert(titleKey ? '印记已展示' : '已取消展示印记');
    } catch (err) {
      alert('设置印记失败：' + (err as Error).message);
    } finally {
      setEquippingKey(null);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    try {
      setUploading(true);
      const data = await uploadFile(file);
      setAvatarUrl(data.url);
    } catch (err) {
      alert('上传失败：' + (err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearAvatar = () => {
    setAvatarUrl('');
  };

  const handleSaveBackground = async () => {
    try {
      setSavingBackground(true);
      const res = await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ preferredBackground: selectedBackground }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '保存失败');
      }
      updateUser(data.data.user);
      alert('全局背景已更新');
    } catch (err) {
      alert('保存失败：' + (err as Error).message);
    } finally {
      setSavingBackground(false);
    }
  };
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setAiGenerating(true);
      const data = await generateImage(aiPrompt.trim(), '1920x1920');
      setAvatarUrl(data.url);
      setShowAiModal(false);
      setAiPrompt('');
    } catch (err) {
      alert('生成失败：' + (err as Error).message);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const res = await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ nickname: nickname.trim(), avatarUrl: avatarUrl.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '保存失败');
      }
      updateUser(data.data.user);
      alert('资料已更新');
    } catch (err) {
      alert('保存失败：' + (err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('两次输入的新密码不一致');
      return;
    }
    try {
      setChangingPassword(true);
      const res = await apiFetch('/auth/me/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '修改失败');
      }
      alert(data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      alert('修改失败：' + (err as Error).message);
    } finally {
      setChangingPassword(false);
    }
  };

  const roleBadge = getProfileRoleBadge(user?.isAdmin);
  const dossierStats = getProfileDossierStats({
    coins: user?.coins,
    stardust: user?.stardust,
    forumStats,
  });
  const inventoryGroups = getProfileInventoryGroups(inventory);
  const displayId = user?.displayId != null ? `#${String(user.displayId).padStart(8, '0')}` : '未登记';
  const dossierStatIcons = {
    coins: <Coins size={16} />,
    stardust: <Sparkles size={16} />,
    posts: <FileText size={16} />,
    replies: <MessageSquare size={16} />,
    likes: <ThumbsUp size={16} />,
    bestReplies: <Award size={16} />,
  };

  return (
    <PageShell
      className="profile-page profile-investigator-dossier"
      eyebrow="PROFILE DOSSIER"
      title={
        <span className="flex items-center gap-3">
          <User className="h-7 w-7 text-[var(--coc-accent-gold)]" />
          调查员档案
        </span>
      }
      description="你留在城中的影子被缓慢装订，纸页合拢时，海雾仍认得它。"
      actions={
        <div className="profile-page__header-actions">
          <Link to="/characters" className="profile-tool-button">
            <BookOpen className="h-4 w-4" />
            角色档案
          </Link>
          <Link to="/messages" className="profile-tool-button" data-tone="gold">
            <Mail className="h-4 w-4" />
            进入消息中心
          </Link>
        </div>
      }
    >
      <Surface variant="solid" tone={roleBadge.tone} material="archive" padding="lg" className="profile-identity-card">
        <div className="profile-identity-card__avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
          ) : (
            <User className="h-14 w-14 text-[var(--coc-on-surface-muted)]" />
          )}
          {user?.frameUrl && (
            <img src={user.frameUrl} alt="frame" className="absolute inset-0 h-full w-full pointer-events-none" />
          )}
          {uploading && <div className="profile-identity-card__uploading">上传中...</div>}
        </div>
        <div className="profile-identity-card__body">
          <div className="profile-role-badge" data-tone={roleBadge.tone}>
            <span>{roleBadge.label}</span>
            <strong>{roleBadge.title}</strong>
          </div>
          <h2>{user?.nickname || nickname || '未命名调查员'}</h2>
          <p>登记编号 {displayId} · 当前展示印记 {user?.displayedTitleKey || '未选择'}</p>
        </div>
        <div className="profile-identity-card__stats [@media(min-width:2200px)]:grid-cols-8">
          {dossierStats.map((stat) => (
            <div key={stat.key} className="profile-stat-card" data-tone={stat.tone}>
              <div className="profile-stat-card__icon">{dossierStatIcons[stat.key]}</div>
              <span>{stat.label}</span>
              <strong>{forumStats || stat.key === 'coins' || stat.key === 'stardust' ? stat.value : '...'}</strong>
            </div>
          ))}
        </div>
      </Surface>

      <Surface variant="panel" material="archive" padding="md" className="profile-entry-ledger">
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[var(--coc-accent-gold)]/45 to-transparent" />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="profile-entry-card">
            <div className="profile-entry-card__label">
              <User className="h-4 w-4" />
              公开身份
            </div>
            <div className="profile-entry-card__title">
              {user?.nickname || nickname || '未命名调查员'}
            </div>
            <div className="profile-entry-card__body">
              头像、昵称和展示印记会影响其他调查员看到你的第一眼。
            </div>
          </div>
          <Link
            to="/characters"
            className="coc-focus-ring profile-entry-card"
          >
            <div className="profile-entry-card__label">
              <BookOpen className="h-4 w-4" />
              角色档案
            </div>
            <div className="profile-entry-card__title">查看调查员角色</div>
            <div className="profile-entry-card__body">
              角色、经历和公开展示将继续在角色页沉淀。
            </div>
          </Link>
          <Link
            to="/messages"
            className="coc-focus-ring profile-entry-card"
          >
            <div className="profile-entry-card__label">
              <FileText className="h-4 w-4" />
              长期留存
            </div>
            <div className="profile-entry-card__title">通知、私信与归档入口</div>
            <div className="profile-entry-card__body">
              排期、申请、公告和社交消息从这里回到完整消息中心。
            </div>
          </Link>
        </div>
      </Surface>

      <div className="profile-layout-grid xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="profile-side-stack">
          <Surface variant="solid" tone="gold" material="archive" padding="lg" className="profile-form-card">
          <div className="profile-section-heading">
            <Camera className="h-5 w-5" />
            <div>
              <h2>档案形象</h2>
              <p>头像、昵称与公开展示信息。</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="profile-avatar-tools">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="profile-tool-button">
                <Upload className="h-4 w-4" />
                上传头像
              </button>
              <button type="button" onClick={() => setShowAiModal(true)} disabled={aiGenerating} className="profile-tool-button" data-tone="gold">
                <Wand2 className="h-4 w-4" />
                AI 生成
              </button>
              {avatarUrl && (
                <button type="button" onClick={clearAvatar} className="profile-tool-button" data-tone="blood">
                  <X className="h-4 w-4" />
                  清除
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>

            <label className="profile-field">
              <span>头像 URL（可选）</span>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
              />
            </label>

            <label className="profile-field">
              <span>昵称</span>
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} />
            </label>

            <button type="submit" disabled={savingProfile} className="profile-primary-button">
              <Save className="h-4 w-4" />
              {savingProfile ? '保存中...' : '保存档案'}
            </button>
          </form>
          </Surface>

          <Surface variant="solid" tone="madness" material="archive" padding="lg" className="profile-security-card">
            <div className="profile-section-heading">
              <Lock className="h-5 w-5" />
              <div>
                <h2>账户封印</h2>
                <p>更新登录密码，不影响角色资料。</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="profile-form">
            <div className="relative">
              <label className="profile-password-label">当前密码</label>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="profile-password-input"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="profile-eye-button"
                aria-label={showCurrent ? '隐藏当前密码' : '显示当前密码'}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <label className="profile-password-label">新密码</label>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="profile-password-input"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="profile-eye-button"
                aria-label={showNew ? '隐藏新密码' : '显示新密码'}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div>
              <label className="profile-password-label">确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="profile-password-input"
              />
            </div>

              <button type="submit" disabled={changingPassword} className="profile-secondary-button">
                <Lock className="h-4 w-4" />
                {changingPassword ? '修改中...' : '更新封印'}
              </button>
          </form>
          </Surface>
        </div>

        <BackgroundPicker value={selectedBackground} saving={savingBackground} onChange={setSelectedBackground} onSave={handleSaveBackground} />
      </div>

      <Surface variant="solid" tone="ocean" material="archive" padding="lg" className="profile-inventory-card">
        <div className="profile-section-heading">
          <Package className="h-5 w-5" />
          <div>
            <h2>随身藏品</h2>
            <p>将可展示物、遗物与头像框按用途分组，避免背包变成平铺清单。</p>
          </div>
        </div>

        <div className="profile-inventory-groups">
          {inventoryGroups.map((group) => (
            <div key={group.key} className="profile-inventory-group" data-group={group.key}>
              <span>{group.label}</span>
              <strong>{inventoryLoading ? '...' : group.count}</strong>
              <p>{group.description}</p>
            </div>
          ))}
        </div>

        {inventoryLoading ? (
          <div className="profile-item-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="profile-item-skeleton" />
            ))}
          </div>
        ) : inventory.length === 0 ? (
          <div className="profile-empty-state">
            背包空空如也，去 <Link to="/shop">无名集市</Link> 看看吧。
          </div>
        ) : (
          <div className="profile-item-grid">
            {inventory.map((inv) => {
              const isTitle = inv.item?.category === 'title';
              const isEquipped = !isTitle && user?.equippedFrame === inv.itemKey;
              const isDisplayed = isTitle && user?.displayedTitleKey === inv.itemKey;
              const active = isEquipped || isDisplayed;

              return (
                <div key={inv.id} className="profile-item-card" data-active={active ? 'true' : 'false'}>
                  <div className={`profile-item-card__icon ${rarityColor[inv.item?.rarity || 'common'] || 'border-coc-void'}`}>
                    {inv.item?.iconUrl ? (
                      isTitle ? (
                        <span>{inv.item.iconUrl}</span>
                      ) : (
                        <img src={inv.item.iconUrl} alt="" />
                      )
                    ) : (
                      <span>{isTitle ? '印记' : '无图'}</span>
                    )}
                  </div>
                  <div className="profile-item-card__body">
                    <strong>{inv.item?.name || inv.itemKey}</strong>
                    <span>{inv.quantity > 1 ? `x${inv.quantity}` : isTitle ? '身份展示' : '个人藏品'}</span>
                  </div>
                  <button
                    onClick={() =>
                      isTitle
                        ? handleDisplayTitle(isDisplayed ? null : inv.itemKey)
                        : handleEquip(isEquipped ? null : inv.itemKey)
                    }
                    disabled={equippingKey === inv.itemKey || equippingKey === 'unset'}
                  >
                    {equippingKey === inv.itemKey || (active && equippingKey === 'unset')
                      ? '处理中...'
                      : isTitle
                      ? isDisplayed
                        ? '已展示'
                        : '展示'
                      : isEquipped
                      ? '已装备'
                      : '装备'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Surface>

      {/* AI 生成头像弹窗 */}
      {showAiModal && (
        <div className="profile-ai-modal">
          <Surface variant="elevated" material="archive" padding="lg" className="profile-ai-card">
            <h3>AI 生成头像</h3>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="描述你想要的头像风格，例如：克苏鲁风格，年轻的侦探，戴着圆顶礼帽，眼神锐利，黑白素描"
              className="profile-ai-card__textarea"
              maxLength={600}
            />
            <div className="profile-ai-card__footer">
              <span>{aiPrompt.length}/600</span>
              <div>
                <button
                  onClick={() => { setShowAiModal(false); setAiPrompt(''); }}
                  className="profile-secondary-button"
                >
                  取消
                </button>
                <button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="profile-primary-button"
                >
                  {aiGenerating ? '生成中...' : '生成'}
                </button>
              </div>
            </div>
          </Surface>
        </div>
      )}
    </PageShell>
  );
}
