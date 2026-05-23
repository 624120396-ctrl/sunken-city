import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { Tooltip } from '@components/ui/Tooltip';
import { ParticleBurst } from '@components/ui/ParticleBurst';
import { useState } from 'react';
import { ShoppingBag, Coins, Sparkles, Filter } from 'lucide-react';
import { useAuthStore } from '@stores/auth.store';
import { getShopItems, purchaseItem, type ShopItem } from '@services/shop.service';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@components/ui/Toast';

const rarityBorder: Record<string, string> = {
  common: 'border-coc-parchment-dim',
  rare: 'border-coc-gold',
  epic: 'border-coc-madness',
  legendary: 'border-purple-400',
  mythical: 'border-rose-300',
};

const rarityText: Record<string, string> = {
  common: 'text-coc-parchment-dim',
  rare: 'text-coc-gold',
  epic: 'text-coc-madness',
  legendary: 'text-purple-400',
  mythical: 'text-rose-300',
};

const CATEGORIES = [
  { value: '', label: '全部' },
  { value: 'consumable', label: '消耗品' },
  { value: 'avatar_frame', label: '头像框' },
  { value: 'dice_skin', label: '骰子皮肤' },
  { value: 'card_skin', label: '卡面皮肤' },
  { value: 'room_theme', label: '房间主题' },
  { value: 'title', label: '印记' },
  { value: 'relic', label: '遗物' },
];

export function ShopPage() {
  const { user, updateUser } = useAuthStore();
  const { showToast } = useToast();
  const [category, setCategory] = useState('');
  const [burstItem, setBurstItem] = useState<string | null>(null);

  const {
    data: items,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['shopItems', category],
    queryFn: () => getShopItems(category || undefined),
    select: (data) => data.items,
    staleTime: 60 * 1000,
  });

  const purchaseMutation = useMutation({
    mutationFn: (item: ShopItem) => purchaseItem(item.key, 1),
    onSuccess: (res, item) => {
      updateUser(res.user);
      setBurstItem(item.key);
      showToast(`购买成功！获得 ${item.name}`, 'success');
      setTimeout(() => setBurstItem(null), 800);
    },
    onError: (err: any) => {
      showToast('购买失败：' + err.message, 'error');
    },
  });

  const handlePurchase = (item: ShopItem) => {
    purchaseMutation.mutate(item);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-7 h-7 text-coc-gold" />
          <h1 className="text-2xl font-ritual font-bold text-coc-parchment">拉莱耶遗珍</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-coc-parchment">
            <Coins size={16} className="text-coc-gold" />
            <span>{user?.coins ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-coc-parchment">
            <Sparkles size={16} className="text-purple-400" />
            <span>{user?.stardust ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-coc-void/60 border border-coc-gold/20 rounded-lg text-sm text-coc-parchment-dim space-y-2 leading-relaxed">
        <p>并非每一件物品都应当留存于日光之下。</p>
        <p>
          本馆所陈，皆自深海古城打捞，或是神秘存在将不可名状之物凝固为可触的实物
          ——旧日支配者梦境的残影、禁忌仪轨的碎片。头像框、房间皮肤，是你在幻梦境中的面具与殿堂；
          每一件藏品都经“考古学会”名义鉴定，但其真实来历……我们建议您保持沉默。
        </p>
        <p className="text-coc-gold/80">理性选购，勿溯其源。</p>
      </div>

      {/* 分类过滤 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-coc-parchment-dim" />
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`px-3 py-1.5 rounded border text-sm transition-colors btn-v2 ${
              category === c.value
                ? 'bg-coc-gold text-coc-abyss border-coc-gold'
                : 'border-coc-void text-coc-parchment hover:border-coc-gold'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 商品网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 bg-coc-abyss/40 rounded animate-pulse border border-coc-void" />
          ))
        ) : error ? (
          <div className="col-span-full text-center py-16 text-red-300">
            <p>加载失败，请稍后重试</p>
          </div>
        ) : items?.length === 0 ? (
          <div className="col-span-full text-center py-16 text-coc-parchment-dim">
            <EmptyState
              icon={EmptyIcons.Shop}
              title="暂无商品"
              description="过段时间再来看看吧，深渊的货架从不空置太久。"
              size="sm"
              animate={false}
            />
          </div>
        ) : (
          items?.map((item) => (
            <div
              key={item.key}
              className="card-layer-2 h-full"
            >
              <div className="h-full p-4 flex flex-col gap-3">
                <div className={`h-32 rounded border ${rarityBorder[item.rarity] || 'border-coc-void'} bg-coc-abyss/30 flex items-center justify-center`}>
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt={item.name} className="max-h-28 object-contain" />
                  ) : (
                    <span className="text-coc-parchment-dim text-sm">无预览</span>
                  )}
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-ritual font-bold text-coc-parchment">{item.name}</p>
                    <Tooltip content={{
                    common: '普通藏品 — 基础装饰',
                    rare: '稀有藏品 — 限定外观',
                    epic: '史诗藏品 — 传奇之物',
                    legendary: '传说藏品 — 深渊馈赠',
                    mythical: '神话藏品 — 不可名状'
                  }[item.rarity] || item.rarity}>
                    <p className={`text-xs ${rarityText[item.rarity] || 'text-coc-parchment-dim'} cursor-help`}>{item.rarity}</p>
                  </Tooltip>
                  </div>
                </div>

                <p className="text-sm text-coc-parchment-dim line-clamp-2">{item.description}</p>

                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm">
                      {item.currency === 'coin' ? (
                        <>
                          <Coins size={14} className="text-coc-gold" />
                          <span className="text-coc-parchment">{item.price}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="text-purple-400" />
                          <span className="text-coc-parchment">{item.price}</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={purchaseMutation.isPending && purchaseMutation.variables?.key === item.key}
                      className="relative btn-v2 px-4 py-1.5 bg-coc-gold text-coc-abyss rounded text-sm font-medium hover:bg-coc-gold-glow transition-colors disabled:opacity-50"
                    >
                      <ParticleBurst trigger={burstItem === item.key} onComplete={() => setBurstItem(null)} />
                      {purchaseMutation.isPending && purchaseMutation.variables?.key === item.key ? '购买中...' : '购买'}
                    </button>
                  </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
