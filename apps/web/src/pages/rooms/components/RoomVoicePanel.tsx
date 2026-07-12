import { useEffect, useMemo, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
} from '@livekit/components-react';
import { Headphones, Mic, MicOff, PhoneOff, RefreshCw, Radio } from 'lucide-react';
import { cn } from '@lib/utils';
import {
  getRoomVoiceStatus,
  getRoomVoiceToken,
  type RoomVoiceStatus,
  type RoomVoiceToken,
} from '@/services/room-voice.service';
import {
  resolveRoomVoiceConnectionLabel,
  resolveRoomVoiceFallback,
  summarizeRoomVoiceParticipants,
} from './roomVoiceMeta';

type RoomVoiceTone = 'idle' | 'ready' | 'loading' | 'connected' | 'error';

interface RoomVoicePanelProps {
  roomId: string;
  compact?: boolean;
  className?: string;
}

function RoomVoiceSessionControls({
  canPublishAudio,
  onLeave,
}: {
  canPublishAudio: boolean;
  onLeave: () => void;
}) {
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const summary = useMemo(() => summarizeRoomVoiceParticipants(participants), [participants]);
  const speakers = summary.speakers.length > 0 ? summary.speakers.join('、') : '暂无发言';

  return (
    <div className="room-voice-session">
      <div className="room-voice-session__meta">
        <span>{resolveRoomVoiceConnectionLabel(String(connectionState))}</span>
        <b>{summary.count} 人在线</b>
      </div>
      <div className="room-voice-session__speaking" data-speaking={summary.speakers.length > 0 ? 'true' : 'false'}>
        <Radio size={14} />
        <span>{speakers}</span>
      </div>
      <div className="room-voice-session__actions">
        <button
          type="button"
          disabled={!canPublishAudio}
          onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          aria-pressed={isMicrophoneEnabled}
        >
          {isMicrophoneEnabled ? <Mic size={15} /> : <MicOff size={15} />}
          <span>{canPublishAudio ? (isMicrophoneEnabled ? '麦克风开' : '麦克风关') : '仅收听'}</span>
        </button>
        <button type="button" onClick={onLeave}>
          <PhoneOff size={15} />
          <span>离开</span>
        </button>
      </div>
    </div>
  );
}

export function RoomVoicePanel({ roomId, compact = false, className }: RoomVoicePanelProps) {
  const [status, setStatus] = useState<RoomVoiceStatus | null>(null);
  const [credentials, setCredentials] = useState<RoomVoiceToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<RoomVoiceTone>('idle');

  useEffect(() => {
    let cancelled = false;
    getRoomVoiceStatus(roomId)
      .then((nextStatus) => {
        if (!cancelled) {
          setStatus(nextStatus);
          setTone(nextStatus.status === 'READY' ? 'ready' : 'idle');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const fallback = resolveRoomVoiceFallback(err);
          setError(fallback.message);
          setTone(fallback.tone);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const joinVoice = async () => {
    setTone('loading');
    setError(null);
    try {
      const token = await getRoomVoiceToken(roomId);
      setCredentials(token);
      setTone('connected');
    } catch (err) {
      const fallback = resolveRoomVoiceFallback(err);
      setError(fallback.message);
      setTone(fallback.tone);
    }
  };

  const leaveVoice = () => {
    setCredentials(null);
    setTone(status?.status === 'READY' ? 'ready' : 'idle');
  };

  const unavailable = status?.status === 'MISSING_CONFIG';
  const canJoin = !credentials && !unavailable && tone !== 'loading';

  return (
    <section className={cn('room-voice-panel', compact && 'room-voice-panel--compact', className)} data-tone={tone}>
      <header className="room-voice-panel__header">
        <span className="room-voice-panel__icon">
          <Headphones size={16} />
        </span>
        <div>
          <b>房间语音</b>
          <small>{credentials ? '真人语音频道' : unavailable ? '等待部署配置' : 'LiveKit 音频'}</small>
        </div>
      </header>

      {credentials ? (
        <LiveKitRoom
          serverUrl={credentials.serverUrl}
          token={credentials.token}
          connect
          audio={credentials.permissions.canPublishAudio}
          video={false}
          onMediaDeviceFailure={() => setError('无法访问麦克风，请检查浏览器权限。')}
          onError={(err) => {
            const fallback = resolveRoomVoiceFallback(err);
            setError(fallback.message);
            setTone(fallback.tone);
          }}
          onDisconnected={leaveVoice}
        >
          <RoomAudioRenderer />
          <RoomVoiceSessionControls
            canPublishAudio={credentials.permissions.canPublishAudio}
            onLeave={leaveVoice}
          />
        </LiveKitRoom>
      ) : (
        <div className="room-voice-panel__body">
          <p>{error || (unavailable ? '语音服务还未接入生产配置。' : '加入后可与本房间成员实时通话。')}</p>
          <button type="button" disabled={!canJoin} onClick={() => void joinVoice()}>
            {tone === 'loading' ? <RefreshCw size={15} /> : <Mic size={15} />}
            <span>{tone === 'loading' ? '连接中' : '加入语音'}</span>
          </button>
        </div>
      )}

      {error && credentials && <p className="room-voice-panel__error">{error}</p>}
    </section>
  );
}
