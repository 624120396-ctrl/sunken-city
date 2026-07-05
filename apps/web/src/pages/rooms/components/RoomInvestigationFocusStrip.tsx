import { useEffect, useState } from 'react';
import { Archive, Dice5, MapPin, Pin, Search, Target } from 'lucide-react';
import { getCurrentFocus, getInvestigationClues, getInvestigationTimeline } from '@/services/investigation.service';
import type { InvestigationClueView, InvestigationLogEntryView, RoomCurrentFocusView } from '@/types/investigation-contract';

interface RoomInvestigationFocusStripProps {
  roomId: string;
  currentSceneTitle?: string | null;
  canView: boolean;
  onOpenArchive: () => void;
}

export function RoomInvestigationFocusStrip({
  roomId,
  currentSceneTitle,
  canView,
  onOpenArchive,
}: RoomInvestigationFocusStripProps) {
  const [focus, setFocus] = useState<RoomCurrentFocusView | null>(null);
  const [latestClue, setLatestClue] = useState<InvestigationClueView | null>(null);
  const [latestKeyDice, setLatestKeyDice] = useState<InvestigationLogEntryView | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFocus() {
      if (!canView) return;
      try {
        const [loadedFocus, clues, timeline] = await Promise.all([
          getCurrentFocus(roomId),
          getInvestigationClues(roomId),
          getInvestigationTimeline(roomId),
        ]);
        if (!cancelled) {
          setFocus(loadedFocus);
          setLatestClue(clues[0] ?? null);
          setLatestKeyDice(timeline.find(entry => entry.eventType === 'DICE_KEY') ?? null);
        }
      } catch {
        if (!cancelled) {
          setFocus(null);
          setLatestClue(null);
          setLatestKeyDice(null);
        }
      }
    }

    void loadFocus();
    return () => {
      cancelled = true;
    };
  }, [roomId, canView]);

  if (!canView) return null;

  const hasContent = Boolean(currentSceneTitle || focus?.currentObjective || focus?.pinnedMessage || latestClue || latestKeyDice);
  if (!hasContent) return null;

  return (
    <section className="mb-3 rounded-lg border border-[#3a3a3a]/55 bg-[#101018]/88 p-3 shadow-lg shadow-black/20">
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-[#8f8778]">
            <Target size={13} />
            当前目标
          </div>
          <p className="truncate text-sm font-medium text-[#f4ead1]">
            {focus?.currentObjective || '尚未设定'}
          </p>
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-[#8f8778]">
            {focus?.pinnedMessage ? <Pin size={13} /> : <MapPin size={13} />}
            {focus?.pinnedMessage ? '置顶消息' : '当前场景'}
          </div>
          <p className="truncate text-sm text-[#d8ccb4]">
            {focus?.pinnedMessage || currentSceneTitle || '尚未设定'}
          </p>
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-[#8f8778]">
            {latestKeyDice ? <Dice5 size={13} /> : <Search size={13} />}
            {latestKeyDice ? '关键骰点' : '最新线索'}
          </div>
          <p className="truncate text-sm text-[#d8ccb4]">
            {latestKeyDice?.title || latestClue?.title || '尚未记录'}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenArchive}
          className="btn-v2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded border border-[#c9a227]/45 bg-[#3a2d10]/55 px-3 text-xs font-bold text-[#f4d778] hover:border-[#f4d778]/70"
        >
          <Archive size={14} />
          调查档案
        </button>
      </div>
    </section>
  );
}
