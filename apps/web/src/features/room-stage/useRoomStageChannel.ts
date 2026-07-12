import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { Socket } from 'socket.io-client';
import { apiFetch, handleApiResponse } from '@lib/api';
import {
  STAGE_CONTRACT_VERSION, STAGE_SOCKET_EVENTS,
  type StageCommandAck, type StageCommandEnvelope, type StageEvent, type StageSnapshot, type StageStatusProjection,
} from '../../../../shared/stage/stage-contract';
import { applyStageEvent } from './stage-view-model';
import { canDispatchStageCommand, selectNewerSnapshot } from './stage-channel-controller';

const statusPath = (roomId: string) => `/rooms/${roomId}/stage/status`;
const snapshotPath = (roomId: string, channelId: string) => `/rooms/${roomId}/stage/channels/${channelId}/snapshot`;

export function useRoomStageChannel(roomId: string, socketRef: RefObject<Socket | null>, connected: boolean) {
  const [status, setStatus] = useState<StageStatusProjection>();
  const [activeChannelId, setActiveChannelId] = useState<string>();
  const [snapshot, setSnapshot] = useState<StageSnapshot>();
  const [error, setError] = useState<string>();

  const loadStatus = useCallback(async () => {
    const next = await handleApiResponse<StageStatusProjection>(await apiFetch(statusPath(roomId)));
    if (next.contractVersion !== STAGE_CONTRACT_VERSION) throw new Error('舞台契约版本不匹配');
    setStatus(next);
    setActiveChannelId((current) => next.channels.some((entry) => entry.channel.id === current) ? current : next.channels.find((entry) => entry.status === 'ACTIVE')?.channel.id);
    return next;
  }, [roomId]);

  const loadSnapshot = useCallback(async (channelId: string) => {
    const next = await handleApiResponse<StageSnapshot>(await apiFetch(snapshotPath(roomId, channelId)));
    if (next.contractVersion !== STAGE_CONTRACT_VERSION || next.channel.id !== channelId) throw new Error('舞台快照无效');
    setSnapshot(next);
    return next;
  }, [roomId]);

  useEffect(() => { void loadStatus().catch((cause: Error) => setError(cause.message)); }, [loadStatus]);
  useEffect(() => { if (activeChannelId) void loadSnapshot(activeChannelId).catch((cause: Error) => setError(cause.message)); }, [activeChannelId, loadSnapshot]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected || !activeChannelId) return;
    const join = { roomId, channelId: activeChannelId };
    const onEvent = (event: StageEvent) => setSnapshot((current) => {
      const next = current && applyStageEvent(current, event);
      if (!next && current?.channel.id === event.channelId) void loadSnapshot(activeChannelId).catch((cause: Error) => setError(cause.message));
      return next || current;
    });
    const onSnapshot = (next: StageSnapshot) => { if (next.contractVersion === STAGE_CONTRACT_VERSION) setSnapshot((current) => selectNewerSnapshot(current, next) || current); };
    socket.emit(STAGE_SOCKET_EVENTS.JOIN_CHANNEL, join);
    socket.on(STAGE_SOCKET_EVENTS.EVENT, onEvent);
    socket.on(STAGE_SOCKET_EVENTS.SNAPSHOT, onSnapshot);
    return () => {
      socket.emit(STAGE_SOCKET_EVENTS.LEAVE_CHANNEL, { channelId: activeChannelId });
      socket.off(STAGE_SOCKET_EVENTS.EVENT, onEvent);
      socket.off(STAGE_SOCKET_EVENTS.SNAPSHOT, onSnapshot);
    };
  }, [activeChannelId, connected, loadSnapshot, roomId, socketRef]);

  const dispatch = useCallback(async (envelope: StageCommandEnvelope) => {
    if (!snapshot || envelope.channelId !== snapshot.channel.id || !canDispatchStageCommand(snapshot.projection.capabilities, envelope.commandType)) return { accepted: false, message: '当前舞台能力不允许此操作' };
    const socket = socketRef.current;
    if (!socket) return { accepted: false, message: '舞台连接不可用' };
    const ack = await new Promise<StageCommandAck>((resolve) => socket.emit(STAGE_SOCKET_EVENTS.COMMAND, { roomId, envelope }, resolve));
    if (!ack.accepted && ack.outcome === 'CONFLICT' && ack.recovery.type === 'AUTHORITATIVE_SNAPSHOT') setSnapshot(ack.recovery.snapshot);
    if (!ack.accepted) setError(ack.error.message);
    return ack;
  }, [roomId, snapshot, socketRef]);

  return { status, activeChannelId, setActiveChannelId, snapshot, error, loadSnapshot, dispatch };
}
