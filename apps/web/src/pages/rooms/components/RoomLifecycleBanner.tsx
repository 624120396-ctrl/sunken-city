import { cn } from '@lib/utils';
import {
  roomLifecycleLabels,
  roomRoleFullLabels,
  type RoomLifecycle,
  type RoomRoleView,
} from '@/types/room-contract';

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
        'room-lifecycle-banner flex flex-wrap items-center gap-2 rounded border border-[#3a3a3a]/50 bg-[#0f1016]/70 px-3 py-2 text-xs text-[#b0a898]',
        className
      )}
    >
      {lifecycle && (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c9a227]" />
          <span className="text-[#e8d4a0]">{roomLifecycleLabels[lifecycle]}</span>
        </span>
      )}
      {myRole && roomRoleFullLabels[myRole] && (
        <span className="border-l border-[#3a3a3a]/60 pl-2">
          {roomRoleFullLabels[myRole]}
        </span>
      )}
    </div>
  );
}
