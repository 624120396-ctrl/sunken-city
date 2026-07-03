import { cn } from '@lib/utils';
import type { RoomLifecycle, RoomRoleView } from '@/types/room-contract';

const lifecycleLabels: Record<RoomLifecycle, string> = {
  PREPARING: '准备中',
  READY: '待开场',
  IN_PROGRESS: '进行中',
  PAUSED: '暂停中',
  FINISHING: '结算中',
  FINISHED: '已结团',
  CANCELLED: '已取消',
};

const roleLabels: Partial<Record<RoomRoleView, string>> = {
  OWNER_KP: '主持人',
  ASSISTANT_KP: '助理 KP',
  PLAYER: '调查员',
  OBSERVER: '观察者',
  NON_MEMBER: '未加入',
};

interface RoomLifecycleBannerProps {
  lifecycle?: RoomLifecycle;
  myRole?: RoomRoleView;
  className?: string;
}

export function RoomLifecycleBanner({ lifecycle, myRole, className }: RoomLifecycleBannerProps) {
  if (!lifecycle && !myRole) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded border border-[#3a3a3a]/50 bg-[#0f1016]/70 px-3 py-2 text-xs text-[#b0a898]',
        className
      )}
    >
      {lifecycle && (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c9a227]" />
          <span className="text-[#e8d4a0]">{lifecycleLabels[lifecycle]}</span>
        </span>
      )}
      {myRole && roleLabels[myRole] && (
        <span className="border-l border-[#3a3a3a]/60 pl-2">
          {roleLabels[myRole]}
        </span>
      )}
    </div>
  );
}
