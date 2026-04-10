interface CatchRevealProps {
  item: {
    key: string;
    name: string;
    description?: string;
    rarity: 'JUNK' | 'COMMON' | 'UNCOMMON' | 'RARE' | 'ELDRITCH';
    sellPrice: number;
    sellCurrency: string;
    isCollection?: boolean;
    iconUrl?: string;
  };
  onSell: () => void;
  onKeep: () => void;
}

export function CatchReveal({ item, onSell, onKeep }: CatchRevealProps) {
  const rarityGlow: Record<string, string> = {
    JUNK: '',
    COMMON: 'glow-common',
    UNCOMMON: 'glow-uncommon',
    RARE: 'glow-rare',
    ELDRITCH: 'glow-eldritch',
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-auto">
      {item.rarity === 'ELDRITCH' && <div className="eldritch-flash" />}
      <div className={`catch-reveal-card ${rarityGlow[item.rarity] || ''}`}>
        <div className="reveal-inner">
          <div className="item-icon">
            {item.iconUrl ? (
              <img src={item.iconUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">?</span>
            )}
          </div>
          <h3 className="item-name">{item.name}</h3>
          <p className="item-rarity">{item.rarity}</p>
          <p className="item-desc">{item.description || '……'}</p>
          <div className="flex gap-3 mt-4">
            {item.isCollection && (
              <button onClick={onKeep} className="coc-btn-secondary flex-1">
                收入藏品柜
              </button>
            )}
            <button onClick={onSell} className="coc-btn-primary flex-1">
              出售换 {item.sellPrice} {item.sellCurrency === 'coin' ? '锈蚀硬币' : '虚银'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
