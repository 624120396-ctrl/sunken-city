import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { joinRoomAsObserver, joinRoomAsPlayer } from '@/services/room-binding.service';
import {
  getRoomRecruitment,
  joinApprovedRoomApplication,
  respondRoomInvitation,
} from '@/services/room-recruitment.service';
import type { RoomCapabilities, RoomLifecycle } from '@/types/room-contract';
import type { RoomRecruitmentView } from '@/types/room-recruitment-contract';

interface RoomJoinGateProps {
  roomId: string;
  characters: any[];
  capabilities?: RoomCapabilities;
  lifecycle?: RoomLifecycle;
  onJoined: () => void;
  onCancel: () => void;
}

export function RoomJoinGate({
  roomId,
  characters,
  capabilities,
  lifecycle,
  onJoined,
  onCancel,
}: RoomJoinGateProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState(characters[0]?.id ?? '');
  const [joiningAs, setJoiningAs] = useState<'PLAYER' | 'OBSERVER' | null>(null);
  const [recruitment, setRecruitment] = useState<RoomRecruitmentView | null>(null);
  const [recruitmentError, setRecruitmentError] = useState<string | null>(null);
  const canJoinAsPlayer = capabilities?.canJoinAsPlayer ?? true;
  const canJoinAsObserver = capabilities?.canJoinAsObserver ?? true;
  const approvedApplication = recruitment?.ownApplication?.status === 'APPROVED'
    ? recruitment.ownApplication
    : null;
  const pendingInvitation = recruitment?.ownInvitation?.status === 'PENDING'
    ? recruitment.ownInvitation
    : null;

  useEffect(() => {
    let cancelled = false;
    getRoomRecruitment(roomId)
      .then(data => {
        if (!cancelled) {
          setRecruitment(data);
          setRecruitmentError(null);
        }
      })
      .catch((error: any) => {
        if (!cancelled) setRecruitmentError(error?.message || '招募资料加载失败');
      });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const handleJoinAsPlayer = async () => {
    if (!selectedCharacterId) return;

    try {
      setJoiningAs('PLAYER');
      await joinRoomAsPlayer(roomId, selectedCharacterId);
      onJoined();
    } catch (error: any) {
      alert(error.message || '加入房间失败');
    } finally {
      setJoiningAs(null);
    }
  };

  const handleJoinAsObserver = async () => {
    try {
      setJoiningAs('OBSERVER');
      await joinRoomAsObserver(roomId);
      onJoined();
    } catch (error: any) {
      alert(error.message || '加入房间失败');
    } finally {
      setJoiningAs(null);
    }
  };

  const handleJoinApprovedApplication = async () => {
    if (!approvedApplication || !selectedCharacterId) return;

    try {
      setJoiningAs('PLAYER');
      await joinApprovedRoomApplication(roomId, approvedApplication.id, selectedCharacterId);
      onJoined();
    } catch (error: any) {
      alert(error.message || '加入房间失败');
    } finally {
      setJoiningAs(null);
    }
  };

  const handleInvitationResponse = async (status: 'ACCEPTED' | 'DECLINED') => {
    if (!pendingInvitation) return;
    if (status === 'ACCEPTED' && pendingInvitation.role === 'PLAYER' && !selectedCharacterId) return;

    try {
      setJoiningAs(pendingInvitation.role);
      await respondRoomInvitation(roomId, pendingInvitation.id, {
        status,
        characterId: status === 'ACCEPTED' && pendingInvitation.role === 'PLAYER' ? selectedCharacterId : undefined,
      });
      if (status === 'ACCEPTED') {
        onJoined();
        return;
      }
      const data = await getRoomRecruitment(roomId);
      setRecruitment(data);
    } catch (error: any) {
      alert(error.message || '处理邀请失败');
    } finally {
      setJoiningAs(null);
    }
  };

  return (
    <div className="space-y-4" data-lifecycle={lifecycle}>
      <p className="text-sm" style={{ color: '#8b8375' }}>
        选择调查员加入房间，或以观察者身份旁听。
      </p>

      {(approvedApplication || pendingInvitation || recruitmentError) && (
        <div className="rounded border border-[#3a3a3a]/40 bg-black/20 p-3 text-sm">
          {recruitmentError && (
            <p className="text-xs" style={{ color: '#a63848' }}>{recruitmentError}</p>
          )}
          {approvedApplication && (
            <div className="space-y-2">
              <p style={{ color: '#d4c5a8' }}>你的入房申请已通过，可以选择调查员加入。</p>
              <button
                type="button"
                onClick={handleJoinApprovedApplication}
                disabled={!selectedCharacterId || joiningAs !== null}
                className="btn-v2 w-full rounded border border-[#c9a227]/45 bg-[#3a2d10]/55 px-3 py-2 text-sm text-[#f4d778] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {joiningAs === 'PLAYER' ? '加入中...' : '使用已通过申请加入'}
              </button>
            </div>
          )}
          {pendingInvitation && (
            <div className="mt-2 space-y-2">
              <p style={{ color: '#d4c5a8' }}>
                你收到 KP 邀请，可作为{pendingInvitation.role === 'PLAYER' ? '调查员' : '观察者'}加入。
              </p>
              {pendingInvitation.message && (
                <p className="whitespace-pre-wrap text-xs" style={{ color: '#8b8375' }}>{pendingInvitation.message}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleInvitationResponse('ACCEPTED')}
                  disabled={(pendingInvitation.role === 'PLAYER' && !selectedCharacterId) || joiningAs !== null}
                  className="btn-v2 rounded border border-[#c9a227]/45 bg-[#3a2d10]/55 px-3 py-2 text-sm text-[#f4d778] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {joiningAs ? '处理中...' : '接受邀请'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleInvitationResponse('DECLINED')}
                  disabled={joiningAs !== null}
                  className="btn-v2 rounded border border-[#3a3a3a]/60 bg-black/30 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ color: '#8b8375' }}
                >
                  拒绝邀请
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {canJoinAsPlayer && (
        <div className="space-y-2">
          {characters.length === 0 ? (
            <div className="rounded border border-[#3a3a3a]/40 bg-black/20 p-4 text-center">
              <p className="text-sm" style={{ color: '#8b8375' }}>你还没有可用的调查员。</p>
              <Link
                to="/characters/new"
                className="mt-2 inline-block text-sm hover:underline"
                style={{ color: '#a63848' }}
              >
                创建调查员
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {characters.map((char) => (
                <label
                  key={char.id}
                  className="block cursor-pointer rounded border border-[#3a3a3a]/40 p-3 text-left transition-colors hover:border-[#a63848]/30 hover:bg-[#a63848]/15"
                  style={{ background: 'rgba(0,0,0,0.2)', color: '#d4c5a8' }}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="room-character"
                      value={char.id}
                      checked={selectedCharacterId === char.id}
                      onChange={() => setSelectedCharacterId(char.id)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{char.name}</div>
                      <div className="text-sm" style={{ color: '#8b8375' }}>
                        {char.occupation} | HP:{char.hp} MP:{char.mp} SAN:{char.san}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleJoinAsPlayer}
            disabled={!selectedCharacterId || joiningAs !== null}
            className="btn-v2 w-full rounded border border-[#a63848]/40 bg-[#4a111a]/35 px-3 py-2 text-sm text-[#e8d4a0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {joiningAs === 'PLAYER' ? '加入中...' : '以调查员身份加入'}
          </button>
        </div>
      )}

      {canJoinAsObserver && (
        <button
          type="button"
          onClick={handleJoinAsObserver}
          disabled={joiningAs !== null}
          className="btn-v2 w-full rounded border border-[#3a3a3a]/60 bg-black/30 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          style={{ color: '#8b8375' }}
        >
          {joiningAs === 'OBSERVER' ? '加入中...' : '以观察者身份加入'}
        </button>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-sm hover:underline"
        style={{ color: '#6b6558' }}
      >
        返回房间列表
      </button>
    </div>
  );
}
