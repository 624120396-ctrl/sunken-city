import { useState, useRef, useEffect } from 'react';
import { User, Lock, Save, Eye, EyeOff, Camera, ChevronLeft, Upload, X, Package, Coins, Sparkles, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@stores/auth.store';
import { apiFetch } from '@lib/api';
import { DataCard, PageShell, Surface } from '@components/system';
import { uploadFile } from '@services/upload.service';
import { getInventory, equipItem, type InventoryItem } from '@services/shop.service';
import { generateImage } from '@services/ai.service';
import { getUserForumStats } from '@services/forum.service';
import { setDisplayedTitle } from '@services/rank-title.service';
import { MessageSquare, ThumbsUp, Award, FileText } from 'lucide-react';
import { BackgroundPicker } from '@components/background/BackgroundPicker';
import { DEFAULT_BACKGROUND_ID } from '@components/background/backgroundOptions';

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

  return (
    <PageShell
      eyebrow="profile settings"
      title={
        <span className="flex items-center gap-3">
          <User className="h-7 w-7 text-[var(--coc-accent-gold)]" />
          个人中心
        </span>
      }
      description="管理头像、昵称、背景、背包、论坛足迹与账户安全。"
      actions={
        <div className="grid min-w-[220px] grid-cols-1 gap-2 sm:grid-cols-2">
          <DataCard
            label="锈蚀硬币"
            value={user?.coins ?? 0}
            icon={<Coins size={16} />}
            tone="gold"
          />
          <DataCard
            label="虚银"
            value={user?.stardust ?? 0}
            icon={<Sparkles size={16} />}
            tone="madness"
          />
        </div>
      }
      contentClassName="max-w-4xl"
    >
      <Surface variant="panel" padding="sm" className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-[var(--coc-text-secondary)] transition-colors hover:text-[var(--coc-text-primary)]"
        >
          <ChevronLeft size={18} />
          <span>返回控制台</span>
        </Link>
      </Surface>

      {/* 资料卡片 */}
      <Surface variant="solid" tone="gold" padding="lg">
          <h2 className="text-lg font-ritual font-bold text-[#e8d4a0] mb-6 flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#c9a227]" />
            基本资料
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-20 h-20 rounded-full bg-coc-void border-2 border-coc-gold/30 overflow-hidden flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-coc-parchment-dim" />
                )}
                {user?.frameUrl && (
                  <img
                    src={user.frameUrl}
                    alt="frame"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-[#0a0a0f]/70 flex items-center justify-center">
                    <span className="text-xs text-[#e8d4a0]">上传中...</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0f] border border-coc-void text-[#e8d4a0] rounded hover:border-coc-gold transition-colors text-sm disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    上传头像
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAiModal(true)}
                    disabled={aiGenerating}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0f] border border-coc-void text-[#c9a227] rounded hover:border-coc-gold transition-colors text-sm disabled:opacity-50"
                  >
                    <Wand2 className="w-4 h-4" />
                    AI 生成
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={clearAvatar}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-coc-parchment-dim hover:text-[#a63848] transition-colors text-sm"
                    >
                      <X className="w-4 h-4" />
                      清除
                    </button>
                  )}
                </div>
                <p className="text-xs text-coc-parchment-faded">支持 JPG、PNG、GIF、WebP，最大 5MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
            </div>

            {user?.displayId != null && (
              <div className="font-mono text-xs text-[#c9a227] mb-2">用户编号：#{String(user.displayId).padStart(8, '0')}</div>
            )}

            <div>
              <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">头像 URL（可选）</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-coc-void rounded text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-coc-void rounded text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-5 py-2 bg-coc-gold text-coc-abyss rounded hover:bg-coc-gold-glow transition-colors font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingProfile ? '保存中...' : '保存资料'}
              </button>
            </div>
          </form>
      </Surface>

      {/* 全局背景选择 */}
      <BackgroundPicker
        value={selectedBackground}
        saving={savingBackground}
        onChange={setSelectedBackground}
        onSave={handleSaveBackground}
      />

      {/* 背包卡片 */}
      <Surface variant="solid" tone="madness" padding="lg">
          <h2 className="text-lg font-ritual font-bold text-[#e8d4a0] mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-coc-madness-glow" />
            我的背包
          </h2>

          {inventoryLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-[#0a0a0f]/40 rounded animate-pulse" />
              ))}
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-10 text-coc-parchment-dim">
              背包空空如也，去<Link to="/shop" className="text-[#c9a227] hover:underline">拉莱耶遗珍</Link>看看吧。
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {inventory.map((inv) => {
                const isTitle = inv.item?.category === 'title';
                const isEquipped = !isTitle && user?.equippedFrame === inv.itemKey;
                const isDisplayed = isTitle && user?.displayedTitleKey === inv.itemKey;
                const active = isEquipped || isDisplayed;

                return (
                  <div
                    key={inv.id}
                    className={`p-3 rounded border ${rarityColor[inv.item?.rarity || 'common'] || 'border-coc-void'} bg-[#0a0a0f]/30 flex flex-col gap-2`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#e8d4a0] truncate">{inv.item?.name || inv.itemKey}</span>
                      {inv.quantity > 1 && (
                        <span className="text-xs text-coc-parchment-dim">x{inv.quantity}</span>
                      )}
                    </div>
                    {inv.item?.iconUrl ? (
                      isTitle ? (
                        <div className="w-12 h-12 flex items-center justify-center text-3xl mx-auto">
                          {inv.item.iconUrl}
                        </div>
                      ) : (
                        <img src={inv.item.iconUrl} alt="" className="w-12 h-12 object-contain mx-auto" />
                      )
                    ) : (
                      <div className="w-12 h-12 rounded bg-coc-void flex items-center justify-center text-coc-parchment-dim text-xs mx-auto">
                        {isTitle ? '印记' : '无图'}
                      </div>
                    )}
                    <button
                      onClick={() =>
                        isTitle
                          ? handleDisplayTitle(isDisplayed ? null : inv.itemKey)
                          : handleEquip(isEquipped ? null : inv.itemKey)
                      }
                      disabled={equippingKey === inv.itemKey || equippingKey === 'unset'}
                      className={`mt-1 w-full py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
                        active
                          ? 'bg-coc-madness/20 text-coc-madness-glow border border-coc-madness/40'
                          : 'bg-coc-gold text-coc-abyss hover:bg-coc-gold-glow'
                      }`}
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

      {/* 修改密码卡片 */}
      {/* 论坛足迹卡片 */}
      <Surface variant="solid" tone="madness" padding="lg">
          <h2 className="text-lg font-ritual font-bold text-[#e8d4a0] mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-coc-madness-glow" />
            论坛足迹
          </h2>
          {!forumStats ? (
            <div className="text-center py-6 text-coc-parchment-dim">加载中...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded bg-[#0a0a0f]/30 border border-coc-void text-center">
                <div className="text-2xl font-bold text-[#e8d4a0]">{forumStats.postCount}</div>
                <div className="text-xs text-coc-parchment-dim mt-1 flex items-center justify-center gap-1">
                  <FileText size={12} /> 主题帖
                </div>
              </div>
              <div className="p-4 rounded bg-[#0a0a0f]/30 border border-coc-void text-center">
                <div className="text-2xl font-bold text-[#e8d4a0]">{forumStats.replyCount}</div>
                <div className="text-xs text-coc-parchment-dim mt-1 flex items-center justify-center gap-1">
                  <MessageSquare size={12} /> 回复
                </div>
              </div>
              <div className="p-4 rounded bg-[#0a0a0f]/30 border border-coc-void text-center">
                <div className="text-2xl font-bold text-[#e8d4a0]">{forumStats.likeCountReceived}</div>
                <div className="text-xs text-coc-parchment-dim mt-1 flex items-center justify-center gap-1">
                  <ThumbsUp size={12} /> 获赞
                </div>
              </div>
              <div className="p-4 rounded bg-[#0a0a0f]/30 border border-coc-void text-center">
                <div className="text-2xl font-bold text-[#e8d4a0]">{forumStats.bestReplyCount}</div>
                <div className="text-xs text-coc-parchment-dim mt-1 flex items-center justify-center gap-1">
                  <Award size={12} /> 最佳回复
                </div>
              </div>
            </div>
          )}
      </Surface>

      <Surface variant="solid" tone="madness" padding="lg">
          <h2 className="text-lg font-ritual font-bold text-[#e8d4a0] mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5 text-coc-madness-glow" />
            修改密码
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-5">
            <div className="relative">
              <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">当前密码</label>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-coc-void rounded text-[#e8d4a0] focus:border-coc-madness focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-[1.9rem] text-coc-parchment-dim hover:text-[#e8d4a0]"
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">新密码</label>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-coc-void rounded text-[#e8d4a0] focus:border-coc-madness focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-[1.9rem] text-coc-parchment-dim hover:text-[#e8d4a0]"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div>
              <label className="block text-sm text-coc-parchment-dim mb-1 font-rune">确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-coc-void rounded text-[#e8d4a0] focus:border-coc-madness focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex items-center gap-2 px-5 py-2 bg-coc-madness text-[#e8d4a0] rounded hover:bg-coc-madness-glow transition-colors font-medium disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                {changingPassword ? '修改中...' : '修改密码'}
              </button>
            </div>
          </form>
      </Surface>

      {/* AI 生成头像弹窗 */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Surface variant="elevated" padding="lg" className="w-full max-w-md space-y-4">
            <h3 className="text-lg font-ritual font-bold text-[#e8d4a0]">AI 生成头像</h3>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="描述你想要的头像风格，例如：克苏鲁风格，年轻的侦探，戴着圆顶礼帽，眼神锐利，黑白素描"
              className="w-full px-3 py-2 bg-[#0a0a0f] border border-coc-void rounded text-[#e8d4a0] focus:border-coc-gold focus:outline-none min-h-[100px]"
              maxLength={600}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-coc-parchment-dim">{aiPrompt.length}/600</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowAiModal(false); setAiPrompt(''); }}
                  className="px-4 py-2 text-coc-parchment-dim hover:text-[#e8d4a0] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="px-4 py-2 bg-coc-gold text-coc-abyss rounded font-medium hover:bg-coc-gold-glow disabled:opacity-50"
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
