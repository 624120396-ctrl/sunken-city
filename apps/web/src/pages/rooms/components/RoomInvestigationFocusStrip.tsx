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
    <section className="room-investigation-focus-strip">
      <div className="room-investigation-focus-strip__grid">
        <div className="room-investigation-focus-strip__item">
          <div className="room-investigation-focus-strip__label">
            <Target size={13} />
            当前目标
          </div>
          <p className="room-investigation-focus-strip__value">
            {focus?.currentObjective || '尚未设定'}
          </p>
        </div>
        <div className="room-investigation-focus-strip__item">
          <div className="room-investigation-focus-strip__label">
            {focus?.pinnedMessage ? <Pin size={13} /> : <MapPin size={13} />}
            {focus?.pinnedMessage ? '置顶消息' : '当前场景'}
          </div>
          <p className="room-investigation-focus-strip__value">
            {focus?.pinnedMessage || currentSceneTitle || '尚未设定'}
          </p>
        </div>
        <div className="room-investigation-focus-strip__item">
          <div className="room-investigation-focus-strip__label">
            {latestKeyDice ? <Dice5 size={13} /> : <Search size={13} />}
            {latestKeyDice ? '关键骰点' : '最新线索'}
          </div>
          <p className="room-investigation-focus-strip__value">
            {latestKeyDice?.title || latestClue?.title || '尚未记录'}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenArchive}
          className="room-investigation-focus-strip__archive"
        >
          <Archive size={14} />
          调查档案
        </button>
      </div>
    </section>
  );
}
