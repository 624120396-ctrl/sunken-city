import { getCatchRevealMeta, type CatchRarity } from './catchRevealMeta';

interface CatchRevealProps {
  item: {
    key: string;
    name: string;
    description?: string;
    rarity: CatchRarity;
    sellPrice: number;
    sellCurrency: string;
    isCollection?: boolean;
    iconUrl?: string;
  };
  onSell: () => void;
  onKeep: () => void;
}

export function CatchReveal({ item, onSell, onKeep }: CatchRevealProps) {
  const meta = getCatchRevealMeta(item.rarity);
  const rarityGlow: Record<string, string> = {
    JUNK: '',
    COMMON: 'glow-common',
    UNCOMMON: 'glow-uncommon',
    RARE: 'glow-rare',
    ELDRITCH: 'glow-eldritch',
  };

  return (
    <div className="catch-reveal-overlay absolute inset-0 z-20 flex items-center justify-center pointer-events-auto">
      {item.rarity === 'ELDRITCH' && <div className="eldritch-flash" />}
      <div
        data-rarity={item.rarity}
        data-tone={meta.tone}
        className={`catch-reveal catch-reveal-card ${rarityGlow[item.rarity] || ''}`}
      >
        <div className="reveal-inner">
          <div className="catch-reveal__header">
            <div>
              <p className="catch-reveal__eyebrow">{meta.label}</p>
              <p className="catch-reveal__headline">{meta.headline}</p>
            </div>
            <div className="catch-reveal__seal">{meta.seal}</div>
          </div>
          <div className="item-icon">
            {item.iconUrl ? (
              <img src={item.iconUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <span className="catch-reveal__sigil">{item.rarity === 'ELDRITCH' ? '!' : '?'}</span>
            )}
          </div>
          <h3 className="item-name">{item.name}</h3>
          <p className="item-rarity">{item.rarity}</p>
          <p className="item-desc">{item.description || '……'}</p>
          <div className="catch-reveal__ledger">
            <span>{meta.valueLabel}</span>
            <strong>{item.sellPrice} {item.sellCurrency === 'coin' ? '锈蚀硬币' : '虚银'}</strong>
          </div>
          {item.isCollection && <div className="catch-reveal__collection">NEW COLLECTION ENTRY</div>}
          <div className="catch-reveal__actions">
            {item.isCollection && (
              <button onClick={onKeep} className="coc-btn-secondary catch-reveal__button">
                收入藏品柜
              </button>
            )}
            <button onClick={onSell} className="coc-btn-primary catch-reveal__button">
              出售换取报酬
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
