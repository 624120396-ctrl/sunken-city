import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Socket } from 'socket.io-client';
import { apiFetch, handleApiResponse } from '@lib/api';
import {
  STAGE_CONTRACT_VERSION, STAGE_SOCKET_EVENTS,
  type StageCommandEnvelope, type StageEventSource, type StageSnapshot, type StageStatusProjection,
} from '../../../../shared/stage/stage-contract';
import { applyStageEvent } from './stage-view-model';
import { acceptAuthoritativeSnapshot, canDispatchStageCommand, isStageUsable, selectActiveChannel, selectNewerSnapshot, sendStageCommand } from './stage-channel-controller';

const statusPath = (roomId: string) => `/rooms/${roomId}/stage/status`;
const snapshotPath = (roomId: string, channelId: string) => `/rooms/${roomId}/stage/channels/${channelId}/snapshot`;

export function useRoomStageChannel(roomId: string, socketRef: RefObject<Socket | null>, connected: boolean) {
  const [status, setStatus] = useState<StageStatusProjection>();
  const [activeChannelId, setActiveChannelId] = useState<string>();
  const [snapshot, setSnapshot] = useState<StageSnapshot>();
  const [error, setError] = useState<string>();
  const requestToken = useRef(0);

  const loadStatus = useCallback(async () => {
    const next = await handleApiResponse<StageStatusProjection>(await apiFetch(statusPath(roomId)));
    if (next.contractVersion !== STAGE_CONTRACT_VERSION) throw new Error('舞台契约版本不匹配');
    setStatus(next);
    setSnapshot(undefined);
    setActiveChannelId((current) => selectActiveChannel(next, current));
    return next;
  }, [roomId]);

  const loadSnapshot = useCallback(async (channelId: string) => {
    const token = ++requestToken.current;
    const next = await handleApiResponse<StageSnapshot>(await apiFetch(snapshotPath(roomId, channelId)));
    if (next.contractVersion !== STAGE_CONTRACT_VERSION || next.channel.id !== channelId) throw new Error('舞台快照无效');
    if (token === requestToken.current) setSnapshot((current) => acceptAuthoritativeSnapshot(current, next) || current);
    return next;
  }, [roomId]);

  useEffect(() => { requestToken.current += 1; setStatus(undefined); setSnapshot(undefined); setActiveChannelId(undefined); setError(undefined); void loadStatus().catch((cause: Error) => setError(cause.message)); }, [loadStatus]);
  const enabled = isStageUsable(status);
  useEffect(() => { if (!enabled) { requestToken.current += 1; setSnapshot(undefined); setActiveChannelId(undefined); } }, [enabled]);
  useEffect(() => { if (enabled && activeChannelId) { setSnapshot(undefined); void loadSnapshot(activeChannelId).catch((cause: Error) => setError(cause.message)); } }, [activeChannelId, enabled, loadSnapshot]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected || !enabled || !activeChannelId) return;
    const join = { roomId, channelId: activeChannelId };
    const onEvent = (event: StageEventSource) => setSnapshot((current) => {
      if (event.contractVersion !== STAGE_CONTRACT_VERSION) return current;
      if (event.eventType === 'CHANNEL_ENABLE' || event.eventType === 'CHANNEL_DISABLE') void loadStatus().catch((cause: Error) => setError(cause.message));
      const next = current && applyStageEvent(current, event);
      if (!next && current?.channel.id === event.channelId) void loadSnapshot(activeChannelId).catch((cause: Error) => setError(cause.message));
      return next || current;
    });
    const onSnapshot = (next: StageSnapshot) => { if (next.contractVersion === STAGE_CONTRACT_VERSION && next.channel.id === activeChannelId) setSnapshot((current) => selectNewerSnapshot(current, next) || current); };
    // A join acknowledgement is not a snapshot contract.  Every reconnect begins
    // by replacing local revision state from the authoritative HTTP snapshot.
    void loadSnapshot(activeChannelId).catch((cause: Error) => setError(cause.message));
    socket.emit(STAGE_SOCKET_EVENTS.JOIN_CHANNEL, join);
    socket.on(STAGE_SOCKET_EVENTS.EVENT, onEvent);
    socket.on(STAGE_SOCKET_EVENTS.SNAPSHOT, onSnapshot);
    return () => {
      socket.emit(STAGE_SOCKET_EVENTS.LEAVE_CHANNEL, { channelId: activeChannelId });
      socket.off(STAGE_SOCKET_EVENTS.EVENT, onEvent);
      socket.off(STAGE_SOCKET_EVENTS.SNAPSHOT, onSnapshot);
    };
  }, [activeChannelId, connected, enabled, loadSnapshot, loadStatus, roomId, socketRef]);

  const dispatch = useCallback(async (envelope: StageCommandEnvelope) => {
    if (!snapshot || envelope.channelId !== snapshot.channel.id || !canDispatchStageCommand(snapshot.projection.capabilities, envelope.commandType)) return { accepted: false, message: '当前舞台能力不允许此操作' };
    const socket = socketRef.current;
    if (!socket) return { accepted: false, message: '舞台连接不可用' };
    const ack = await sendStageCommand(socket, { roomId, envelope });
    if (!ack.accepted && ack.outcome === 'CONFLICT') {
      if (ack.recovery.type === 'AUTHORITATIVE_SNAPSHOT') setSnapshot(ack.recovery.snapshot);
      else await loadSnapshot(envelope.channelId);
    }
    if (ack.accepted && ack.outcome === 'REPLAYED' && ack.revision > snapshot.revision) await loadSnapshot(envelope.channelId);
    if (!ack.accepted) setError(ack.error.message);
    return ack;
  }, [loadSnapshot, roomId, snapshot, socketRef]);

  return { status, activeChannelId, setActiveChannelId, snapshot, error, loadSnapshot, dispatch };
}
