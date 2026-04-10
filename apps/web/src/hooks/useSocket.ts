import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@stores/auth.store';

interface UseSocketOptions {
  roomId: string;
  onMessage?: (message: any) => void;
  onDiceRoll?: (roll: any) => void;
  onMemberJoined?: (member: any) => void;
  onMemberLeft?: (member: any) => void;
  onMemberOnline?: (data: any) => void;
  onMemberOffline?: (data: any) => void;
  onRoomJoined?: (data: any) => void;
  onCombatStarted?: (state: any) => void;
  onCombatUpdated?: (state: any) => void;
  onCombatEnded?: (state: any) => void;
  onCombatTurnChanged?: (data: any) => void;
  onAttackResult?: (result: any) => void;
  onSanityDeducted?: (data: any) => void;
  onHistoryMessages?: (messages: any[]) => void;
  onCountdownUpdated?: (data: any) => void;
  onPrivateMessageReceived?: (data: any) => void;
}

export function useSocket({
  roomId,
  onMessage,
  onDiceRoll,
  onMemberJoined,
  onMemberLeft,
  onMemberOnline,
  onMemberOffline,
  onRoomJoined,
  onHistoryMessages,
  onCombatStarted,
  onCombatUpdated,
  onCombatEnded,
  onCombatTurnChanged,
  onAttackResult,
  onSanityDeducted,
  onCountdownUpdated,
  onPrivateMessageReceived,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore(state => state.token);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 回调 ref：避免闭包陈旧问题
  const callbacksRef = useRef<Partial<UseSocketOptions>>({});
  useEffect(() => {
    callbacksRef.current = {
      onMessage,
      onDiceRoll,
      onMemberJoined,
      onMemberLeft,
      onMemberOnline,
      onMemberOffline,
      onRoomJoined,
      onCombatStarted,
      onCombatUpdated,
      onCombatEnded,
      onCombatTurnChanged,
      onAttackResult,
      onSanityDeducted,
      onHistoryMessages,
      onCountdownUpdated,
      onPrivateMessageReceived,
    };
  }, [
    onMessage, onDiceRoll, onMemberJoined, onMemberLeft, onMemberOnline,
    onMemberOffline, onRoomJoined, onCombatStarted, onCombatUpdated,
    onCombatEnded, onCombatTurnChanged, onAttackResult, onSanityDeducted, onHistoryMessages,
    onCountdownUpdated, onPrivateMessageReceived,
  ]);

  // 组件挂载状态
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 重连状态
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token || !roomId) return;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    console.log('Connecting to Socket.io:', socketUrl);

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      reconnection: false, // 手动控制重连
    });

    socketRef.current = socket;

    const handleReconnect = () => {
      if (reconnectAttemptsRef.current >= 5) {
        if (mountedRef.current) {
          setError('连接失败，已达到最大重试次数');
        }
        return;
      }
      const delay = 1000 * Math.pow(2, reconnectAttemptsRef.current);
      console.log(`Socket 尝试重连，第${reconnectAttemptsRef.current + 1}次，延迟${delay}ms`);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current += 1;
        socket.connect();
      }, delay);
    };

    socket.on('connect', () => {
      if (!mountedRef.current) return;
      console.log('Socket connected, ID:', socket.id);
      setConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
      socket.emit('room:join', { roomId });
    });

    socket.on('connect_error', (err) => {
      if (!mountedRef.current) return;
      console.error('Socket connection error:', err);
      setError('连接失败: ' + err.message);
      setConnected(false);
      handleReconnect();
    });

    socket.on('disconnect', (reason) => {
      if (!mountedRef.current) return;
      console.log('Socket disconnected:', reason);
      setConnected(false);
      if (reason !== 'io client disconnect') {
        handleReconnect();
      }
    });

    socket.on('room:joined', (data) => {
      if (data.messages?.length > 0) {
        callbacksRef.current.onHistoryMessages?.(data.messages);
      }
      callbacksRef.current.onRoomJoined?.(data);
    });

    socket.on('room:member_joined', (data) => {
      callbacksRef.current.onMemberJoined?.(data);
    });

    socket.on('room:member_left', (data) => {
      callbacksRef.current.onMemberLeft?.(data);
    });

    socket.on('room:member_online', (data) => {
      callbacksRef.current.onMemberOnline?.(data);
    });

    socket.on('room:member_offline', (data) => {
      callbacksRef.current.onMemberOffline?.(data);
    });

    socket.on('message:received', (data) => {
      callbacksRef.current.onMessage?.(data);
    });

    socket.on('dice:result', (data) => {
      callbacksRef.current.onDiceRoll?.(data);
    });

    socket.on('combat:started', (data) => {
      callbacksRef.current.onCombatStarted?.(data);
    });

    socket.on('combat:updated', (data) => {
      callbacksRef.current.onCombatUpdated?.(data);
    });

    socket.on('combat:turn_changed', (data) => {
      callbacksRef.current.onCombatTurnChanged?.(data);
    });

    socket.on('combat:ended', (data) => {
      callbacksRef.current.onCombatEnded?.(data);
    });

    socket.on('combat:attack_result', (data) => {
      callbacksRef.current.onAttackResult?.(data);
    });

    socket.on('sanity:deducted', (data) => {
      callbacksRef.current.onSanityDeducted?.(data);
    });

    socket.on('countdown:updated', (data) => {
      callbacksRef.current.onCountdownUpdated?.(data);
    });

    socket.on('private_message:received', (data) => {
      callbacksRef.current.onPrivateMessageReceived?.(data);
    });

    socket.on('error', (data) => {
      if (!mountedRef.current) return;
      console.error('Socket error:', data);
      setError(data.message);
    });

    return () => {
      socket.emit('room:leave', { roomId });
      socket.disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [token, roomId]);

  const sendMessage = useCallback((content: string, characterId?: string, isSecret?: boolean, messageType?: string) => {
    socketRef.current?.emit('message:send', {
      roomId,
      content,
      characterId,
      isSecret,
      messageType,
    });
  }, [roomId]);

  const rollDice = useCallback((data: {
    rollType: string;
    targetName?: string;
    targetValue?: number;
    characterId?: string;
    isSecret?: boolean;
  }) => {
    socketRef.current?.emit('dice:roll', {
      roomId,
      ...data,
    });
  }, [roomId]);

  return {
    socket: socketRef,
    connected,
    error,
    sendMessage,
    rollDice,
  };
}
