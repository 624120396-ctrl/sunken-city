import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@stores/auth.store';

interface UseSocketOptions {
  roomId: string;
  onMessage?: (message: any) => void;
  onDiceRoll?: (roll: any) => void;
  onMemberJoined?: (member: any) => void;
  onMemberLeft?: (member: any) => void;
  onRoomJoined?: (data: any) => void;
  onCombatStarted?: (state: any) => void;
  onCombatUpdated?: (state: any) => void;
  onCombatEnded?: (state: any) => void;
  onAttackResult?: (result: any) => void;
  onSanityDeducted?: (data: any) => void;
  onHistoryMessages?: (messages: any[]) => void;
}

export function useSocket({
  roomId,
  onMessage,
  onDiceRoll,
  onMemberJoined,
  onMemberLeft,
  onRoomJoined,
  onHistoryMessages,
  onCombatStarted,
  onCombatUpdated,
  onCombatEnded,
  onAttackResult,
  onSanityDeducted,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const { token } = useAuthStore();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !roomId) return;

    // 连接Socket.io - 使用当前域名
    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    console.log('Connecting to Socket.io:', socketUrl);
    
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io',
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected, ID:', socket.id);
      setConnected(true);
      setError(null);
      
      // 加入房间
      socket.emit('room:join', { roomId });
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('连接失败: ' + err.message);
      setConnected(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });

    // 监听事件
    socket.on('room:joined', (data) => {
      console.log('Joined room:', data);
      if (data.messages?.length > 0) {
        onHistoryMessages?.(data.messages);
      }
      onRoomJoined?.(data);
    });

    socket.on('room:member_joined', (data) => {
      console.log('Member joined:', data);
      onMemberJoined?.(data);
    });

    socket.on('room:member_left', (data) => {
      console.log('Member left:', data);
      onMemberLeft?.(data);
    });

    socket.on('message:received', (data) => {
      console.log('Message received:', data);
      onMessage?.(data);
    });

    socket.on('dice:result', (data) => {
      console.log('Dice result:', data);
      onDiceRoll?.(data);
    });

    socket.on('combat:started', (data) => {
      console.log('Combat started:', data);
      onCombatStarted?.(data);
    });

    socket.on('combat:updated', (data) => {
      console.log('Combat updated:', data);
      onCombatUpdated?.(data);
    });

    socket.on('combat:ended', (data) => {
      console.log('Combat ended:', data);
      onCombatEnded?.(data);
    });

    socket.on('combat:attack_result', (data) => {
      console.log('Attack result:', data);
      onAttackResult?.(data);
    });

    socket.on('sanity:deducted', (data) => {
      console.log('Sanity deducted:', data);
      onSanityDeducted?.(data);
    });

    socket.on('error', (data) => {
      console.error('Socket error:', data);
      setError(data.message);
    });

    return () => {
      socket.emit('room:leave', { roomId });
      socket.disconnect();
    };
  }, [token, roomId]);

  // 发送消息
  const sendMessage = useCallback((content: string, characterId?: string, isSecret?: boolean, messageType?: string) => {
    socketRef.current?.emit('message:send', {
      roomId,
      content,
      characterId,
      isSecret,
      messageType,
    });
  }, [roomId]);

  // 投骰
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
