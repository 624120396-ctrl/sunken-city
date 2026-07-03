import { useState } from 'react';
import {
  cancelRoom,
  enterFinishing,
  pauseRoom,
  resumeRoom,
  startRoom,
} from '@/services/room-lifecycle.service';
import type { RoomCapabilities, RoomLifecycle } from '@/types/room-contract';

interface KpLifecycleControlsProps {
  roomId: string;
  capabilities?: RoomCapabilities;
  lifecycle?: RoomLifecycle;
  onChanged: () => void;
}

type ActionKey = 'start' | 'pause' | 'resume' | 'finishing' | 'cancel';

export function KpLifecycleControls({
  roomId,
  capabilities,
  lifecycle,
  onChanged,
}: KpLifecycleControlsProps) {
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null);

  const actions = [
    {
      key: 'start' as const,
      label: '开场',
      allowed: capabilities?.canStartRoom,
      run: () => startRoom(roomId),
    },
    {
      key: 'pause' as const,
      label: '暂停',
      allowed: capabilities?.canPauseRoom,
      run: () => pauseRoom(roomId),
    },
    {
      key: 'resume' as const,
      label: '继续',
      allowed: capabilities?.canResumeRoom,
      run: () => resumeRoom(roomId),
    },
    {
      key: 'finishing' as const,
      label: '进入终局',
      allowed: capabilities?.canEnterFinishing,
      confirmText: '确定要进入终局吗？进入后将进入结算流程。',
      run: () => enterFinishing(roomId),
    },
    {
      key: 'cancel' as const,
      label: '取消房间',
      allowed: capabilities?.canCancelRoom,
      confirmText: '确定要取消这个房间吗？',
      run: () => cancelRoom(roomId),
    },
  ].filter((action) => action.allowed);

  if (actions.length === 0) return null;

  const handleAction = async (action: (typeof actions)[number]) => {
    if (action.confirmText && !confirm(action.confirmText)) return;

    try {
      setPendingAction(action.key);
      await action.run();
      onChanged();
    } catch (error: any) {
      alert(error.message || '房间状态更新失败');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" data-lifecycle={lifecycle}>
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={() => handleAction(action)}
          disabled={pendingAction !== null}
          className="btn-v2 rounded border border-[#3a3a3a]/60 bg-[#15151d]/80 px-3 py-1.5 text-xs text-[#e8d4a0] transition-colors hover:border-[#c9a227]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingAction === action.key ? '处理中...' : action.label}
        </button>
      ))}
    </div>
  );
}
