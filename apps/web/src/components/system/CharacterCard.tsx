import { Link } from 'react-router-dom';
import { OccultBadge } from '@components/ui/OccultBadge';
import { CthulhuProgress } from '@components/ui/CthulhuProgress';

export interface CharacterCardData {
  id: string;
  name: string;
  occupation: string;
  hp: number;
  san: number;
  maxHp: number;
  maxSan: number;
  portraitUrl?: string | null;
}

interface CharacterCardProps {
  character: CharacterCardData;
}

export function CharacterCard({ character }: CharacterCardProps) {
  return (
    <Link to={`/characters/${character.id}`} className="block group">
      <div className="relative h-full min-h-[180px] rounded-xl overflow-hidden border border-[#3a3a3a]/40 bg-black/50 shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-[#8b2635]/30 hover:shadow-[0_0_30px_rgba(139,38,53,0.12)]">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={character.portraitUrl || '/dashboard-character-default.png'}
            alt=""
            className="w-full h-[120%] object-cover object-top animate-character-pan"
            draggable={false}
          />
        </div>
        <div
          className="absolute inset-y-0 left-0 w-[45%] backdrop-blur-[13px] bg-[#0a0a0f]/40 pointer-events-none"
          style={{
            maskImage: 'linear-gradient(to right, black 60%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 60%, transparent 100%)',
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-[#8b2635]/30 via-[#8b2635]/10 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        <div className="relative p-5 flex flex-col h-full min-h-[180px] max-w-[55%]">
          <div className="mb-2">
            <h3 className="font-bold text-base text-[#f5f0e6] tracking-wide">{character.name}</h3>
            <p className="text-xs text-[#a69b85] tracking-wider mt-0.5">{character.occupation}</p>
          </div>
          <div className="space-y-2 mt-auto">
            <CthulhuProgress type="status" variant="hp" current={character.hp} max={character.maxHp} />
            <CthulhuProgress type="status" variant="san" current={character.san} max={character.maxSan} />
          </div>
          {character.san < 30 && (
            <div className="mt-2">
              <OccultBadge type="eye2" size="sm" pulse label="疯狂" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
