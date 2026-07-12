import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import type { Socket } from 'socket.io-client';
import { Music2, PanelTop } from 'lucide-react';
import { createStageViewModel } from './stage-view-model';
import { useRoomStageChannel } from './useRoomStageChannel';
import { DomStageFallback } from './DomStageFallback';
import { PixiStageCanvas } from './PixiStageCanvas';
import { StageChannelTabs } from './StageChannelTabs';
import { StageComposerControls } from './StageComposerControls';
import { StageDirectorTools } from './StageDirectorTools';
import { useStageAudio } from './useStageAudio';

export function RoomStageShell({ roomId, socketRef, connected, isMobile }: { roomId: string; socketRef: RefObject<Socket | null>; connected: boolean; isMobile: boolean }) {
  const stage = useRoomStageChannel(roomId, socketRef, connected);
  const [preference, setPreference] = useState<'stage' | 'traditional'>(() => localStorage.getItem('room-stage-view') === 'stage' ? 'stage' : 'traditional');
  const [pixiAvailable, setPixiAvailable] = useState(true);
  useEffect(() => { localStorage.setItem('room-stage-view', preference); }, [preference]);
  const model = useMemo(() => stage.snapshot ? createStageViewModel(stage.snapshot) : undefined, [stage.snapshot]);
  const audio = useStageAudio(model || { channelId: 'none', channelKind: 'MAIN_ROOM', scene: { title: '' }, actors: [], capabilities: { canUseStage: false, canControlOwnStageActor: false, canManageStage: false, canManageStageAssets: false, canExportStageReplay: false }, viewer: { userId: '', kind: 'OBSERVER', roomRole: '' }, revision: 0 });
  const fallback = useCallback(() => setPixiAvailable(false), []);
  if (!stage.status?.stageEnabled || !stage.status.enabled || !stage.status.capabilities.canUseStage) return null;
  return <section className="room-stage-shell" data-stage-mobile={isMobile ? 'true' : 'false'}><header className="room-stage-shell__bar"><span><PanelTop size={15} />共享即兴舞台</span><button type="button" onClick={() => setPreference((value) => value === 'stage' ? 'traditional' : 'stage')}>{preference === 'stage' ? '返回传统视图' : '进入舞台'}</button></header>{stage.status.channels.length > 1 && <StageChannelTabs channels={stage.status.channels} activeChannelId={stage.activeChannelId} onChange={stage.setActiveChannelId} />}{stage.error && <p className="room-stage-shell__error" role="status">{stage.error}</p>}{preference === 'stage' && model && <><div className="room-stage-shell__scene">{pixiAvailable && !isMobile ? <PixiStageCanvas model={model} onFallback={fallback} /> : null}<DomStageFallback model={model} /></div>{audio.hasAudio && <button type="button" className="room-stage-shell__audio" onClick={() => void audio.enable()}><Music2 size={14} />启用舞台声音</button>}{audio.error && <p role="status">{audio.error}</p>}<StageComposerControls model={model} onDispatch={stage.dispatch} /><StageDirectorTools model={model} onDispatch={stage.dispatch} /></>}</section>;
}
