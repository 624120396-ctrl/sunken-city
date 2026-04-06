import { useState, useCallback } from 'react';
import { useAuthStore } from '@stores/auth.store';

interface CombatState {
  status: 'IDLE' | 'IN_PROGRESS' | 'PAUSED' | 'ENDED';
  currentRound: number;
  currentTurnIndex: number;
  turnOrder: Combatant[];
  log: CombatLogEntry[];
}

interface Combatant {
  userId: string;
  characterId?: string;
  nickname: string;
  characterName?: string;
  dex: number;
  hp: number;
  maxHp: number;
  mp: number;
  san: number;
  isKP: boolean;
}

interface CombatLogEntry {
  id: string;
  round: number;
  actor: string;
  action: string;
  target?: string;
  result: string;
  timestamp: string;
}

interface UseCombatOptions {
  roomId: string;
  socket: any;
  onCombatStarted?: (state: CombatState) => void;
  onCombatUpdated?: (state: CombatState) => void;
  onCombatEnded?: (state: CombatState) => void;
  onAttackResult?: (result: any) => void;
  onTurnChanged?: (data: { nextTurn: string; round: number }) => void;
}

export function useCombat({
  roomId,
  socket,
  onCombatStarted,
  onCombatUpdated,
  onCombatEnded,
  onAttackResult,
  onTurnChanged,
}: UseCombatOptions) {
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const { user } = useAuthStore();

  const isMyTurn = combatState?.status === 'IN_PROGRESS' && combatState.turnOrder[combatState.currentTurnIndex]?.userId === user?.id;

  const startCombat = useCallback(() => {
    socket?.emit('combat:start', { roomId });
  }, [socket, roomId]);

  const attack = useCallback((data: {
    targetUserId: string;
    skillName?: string;
    skillValue?: number;
    weaponDamage?: string;
    armorValue?: number;
  }) => {
    socket?.emit('combat:attack', { roomId, ...data });
  }, [socket, roomId]);

  const nextTurn = useCallback(() => {
    socket?.emit('combat:next_turn', { roomId });
  }, [socket, roomId]);

  const endCombat = useCallback(() => {
    socket?.emit('combat:end', { roomId });
  }, [socket, roomId]);

  const setupCombatListeners = useCallback(() => {
    if (!socket) return;

    socket.on('combat:started', (state: CombatState) => {
      setCombatState(state);
      onCombatStarted?.(state);
    });

    socket.on('combat:updated', (state: CombatState) => {
      setCombatState(state);
      onCombatUpdated?.(state);
    });

    socket.on('combat:ended', (state: CombatState) => {
      setCombatState(state);
      onCombatEnded?.(state);
    });

    socket.on('combat:attack_result', (result: any) => {
      onAttackResult?.(result);
    });

    socket.on('combat:turn_changed', (data: { nextTurn: string; round: number }) => {
      onTurnChanged?.(data);
    });

    return () => {
      socket.off('combat:started');
      socket.off('combat:updated');
      socket.off('combat:ended');
      socket.off('combat:attack_result');
      socket.off('combat:turn_changed');
    };
  }, [socket, onCombatStarted, onCombatUpdated, onCombatEnded, onAttackResult, onTurnChanged]);

  return {
    combatState,
    isMyTurn,
    startCombat,
    attack,
    nextTurn,
    endCombat,
    setupCombatListeners,
  };
}