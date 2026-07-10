import { Megaphone, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Surface } from '@components/system';

interface RoomListRecruitmentEntryProps {
  onOpenRecruitmentHub?: () => void;
}

export function RoomListRecruitmentEntry({ onOpenRecruitmentHub }: RoomListRecruitmentEntryProps) {
  const navigate = useNavigate();

  const handleOpenRecruitmentHub = () => {
    if (onOpenRecruitmentHub) {
      onOpenRecruitmentHub();
      return;
    }

    navigate('/recruitments');
  };

  return (
    <Surface variant="panel" material="archive" padding="md" className="room-library-recruitment-entry">
      <div className="room-library-recruitment-entry__header">
        <span className="room-library-recruitment-entry__seal">
          <Megaphone size={16} />
        </span>
        <div>
          <div className="room-library-index-title room-library-recruitment-entry__title">跑团招募</div>
          <div className="room-library-recruitment-entry__badges">
            <span className="room-library-badge" data-tone="gold">独立系统</span>
            <span className="room-library-badge" data-tone="muted">接口预留</span>
          </div>
        </div>
      </div>
      <p className="room-library-recruitment-entry__copy">
        发布或浏览站内、站外、线下等任意形式的跑团招募。故事书只保留入口，不再把招募当作房间附属列表。
      </p>
      <Button
        type="button"
        variant="secondary"
        onClick={handleOpenRecruitmentHub}
        className="room-library-recruitment-entry__action"
        icon={<ArrowRight size={15} />}
      >
        进入招募版
      </Button>
    </Surface>
  );
}
