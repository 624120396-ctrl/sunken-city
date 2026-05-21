import { Skeleton } from '@components/ui/Skeleton';

export function RoomSkeleton() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* 头部骨架 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton circle className="h-2 w-2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      {/* 主内容区骨架 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* 左侧成员列表 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="coc-card space-y-4">
            <Skeleton className="h-5 w-16" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton circle className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧聊天区 */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
          <div className="coc-card flex-1 flex flex-col min-h-0">
            {/* tabs */}
            <div className="flex items-center gap-4 mb-4 border-b border-coc-void pb-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>

            {/* 消息占位 */}
            <div className="flex-1 space-y-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton circle className="h-8 w-8" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-2 w-10" />
                    </div>
                    <Skeleton className="h-3 w-3/4" />
                    {i % 3 === 0 && <Skeleton className="h-3 w-1/2" />}
                  </div>
                </div>
              ))}
            </div>

            {/* 输入框占位 */}
            <div className="mt-4 flex items-center gap-2 pt-2 border-t border-coc-void">
              <Skeleton className="flex-1 h-10" />
              <Skeleton className="h-10 w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
