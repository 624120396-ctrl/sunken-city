import { Archive, Compass, ScrollText } from 'lucide-react';
import { RoomInvestigationFocusStrip } from './RoomInvestigationFocusStrip';
import { RoomOperationsOverviewPanel } from './RoomOperationsOverviewPanel';
import { RoomCoordinationPanel } from './RoomCoordinationPanel';
import { RoomCommunicationPanel } from './RoomCommunicationPanel';
import { RoomRecruitmentPanel } from './RoomRecruitmentPanel';

interface RoomInvestigationWorkbenchProps {
  roomId: string;
  currentSceneTitle?: string | null;
  canViewInvestigation: boolean;
  canViewPublicContent: boolean;
  onOpenArchive: () => void;
}

export function RoomInvestigationWorkbench({
  roomId,
  currentSceneTitle,
  canViewInvestigation,
  canViewPublicContent,
  onOpenArchive,
}: RoomInvestigationWorkbenchProps) {
  return (
    <section className="room-investigation-workbench" aria-label="调查工作台">
      <div className="room-investigation-workbench__header">
        <div>
          <div className="room-investigation-workbench__eyebrow">
            <Compass size={13} />
            Investigation Workbench
          </div>
          <h2>调查工作台</h2>
          <p>汇总当前目标、公开档案、排期协作与行动轮候。</p>
        </div>
        {canViewInvestigation && (
          <button
            type="button"
            onClick={onOpenArchive}
            className="room-investigation-workbench__archive-button"
          >
            <Archive size={15} />
            打开调查档案
          </button>
        )}
      </div>

      {canViewInvestigation && (
        <RoomInvestigationFocusStrip
          roomId={roomId}
          currentSceneTitle={currentSceneTitle}
          canView={canViewInvestigation}
          onOpenArchive={onOpenArchive}
        />
      )}

      {canViewPublicContent ? (
        <div className="room-investigation-workbench__panels">
          <RoomOperationsOverviewPanel roomId={roomId} />
          <RoomCoordinationPanel roomId={roomId} />
          <RoomCommunicationPanel roomId={roomId} />
          <RoomRecruitmentPanel roomId={roomId} />
        </div>
      ) : (
        <div className="room-investigation-workbench__restricted">
          <ScrollText size={16} />
          当前身份暂无公开调查工作台权限；可使用右侧工具查看允许访问的房间功能。
        </div>
      )}
    </section>
  );
}
