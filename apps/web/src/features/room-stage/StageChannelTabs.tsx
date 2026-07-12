import type { StageChannelProjection } from '../../../../shared/stage/stage-contract';

export function StageChannelTabs({ channels, activeChannelId, onChange }: { channels: StageChannelProjection[]; activeChannelId?: string; onChange: (channelId: string) => void }) {
  return <nav className="room-stage-tabs" aria-label="舞台轨道">{channels.map((entry) => <button key={entry.channel.id} type="button" disabled={entry.status !== 'ACTIVE'} aria-pressed={activeChannelId === entry.channel.id} onClick={() => onChange(entry.channel.id)}><span>{entry.display.label}</span><small>{entry.scope.type === 'ROOM' ? '公开' : entry.scope.type === 'SUB_ROOM' ? '子房间' : '私密'}</small></button>)}</nav>;
}
