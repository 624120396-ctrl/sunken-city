import { useEffect, useMemo, useState } from 'react';
import { Check, ListTodo, Megaphone, RefreshCw, Save, Trash2, UserCheck } from 'lucide-react';
import {
  createRoomActionQueueItem,
  deleteRoomActionQueueItem,
  getRoomCommunication,
  saveRoomCommunicationState,
  updateRoomActionQueueItem,
} from '@/services/room-communication.service';
import type {
  RoomCommunicationView,
  RoomQueueKind,
  RoomQueueStatus,
} from '@/types/room-communication-contract';

interface RoomCommunicationPanelProps {
  roomId: string;
}

const kindLabels: Record<RoomQueueKind, string> = {
  SPEAK: '发言',
  ACTION: '行动',
  CHECK_IN: '点名',
};

const statusLabels: Record<RoomQueueStatus, string> = {
  WAITING: '等待中',
  ACTIVE: '轮到TA',
  DONE: '已完成',
  CANCELLED: '已取消',
};

const defaultChecklist = ['耳机 / 麦克风已准备', '环境安静', '当前场景已确认'];

export function RoomCommunicationPanel({ roomId }: RoomCommunicationPanelProps) {
  const [data, setData] = useState<RoomCommunicationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState('');
  const [spotlightUserId, setSpotlightUserId] = useState('');
  const [keeperPrompt, setKeeperPrompt] = useState('');
  const [environmentText, setEnvironmentText] = useState(defaultChecklist.join('\n'));
  const [requestKind, setRequestKind] = useState<RoomQueueKind>('SPEAK');
  const [requestLabel, setRequestLabel] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [checkInUserId, setCheckInUserId] = useState('');
  const [checkInLabel, setCheckInLabel] = useState('请确认当前行动');

  async function loadCommunication() {
    setLoading(true);
    setError(null);
    try {
      const loaded = await getRoomCommunication(roomId);
      setData(loaded);
      setCurrentTopic(loaded.state?.currentTopic ?? '');
      setSpotlightUserId(loaded.state?.spotlightUserId ?? '');
      setKeeperPrompt(loaded.state?.keeperPrompt ?? '');
      setEnvironmentText((loaded.state?.environmentChecklist.length ? loaded.state.environmentChecklist : defaultChecklist).join('\n'));
    } catch (err: any) {
      setError(err?.message || '沟通队列加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCommunication();
  }, [roomId]);

  const activeItem = useMemo(() => data?.queue.find(item => item.status === 'ACTIVE') ?? null, [data?.queue]);
  const waitingItems = useMemo(() => data?.queue.filter(item => item.status === 'WAITING') ?? [], [data?.queue]);
  const spotlightName = data?.members.find(member => member.userId === data.state?.spotlightUserId)?.name ?? null;

  async function handleSaveState() {
    setSaving(true);
    setError(null);
    try {
      const state = await saveRoomCommunicationState(roomId, {
        currentTopic,
        spotlightUserId: spotlightUserId || null,
        keeperPrompt,
        environmentChecklist: environmentText.split('\n').map(item => item.trim()).filter(Boolean),
      });
      setData(prev => prev ? { ...prev, state } : prev);
    } catch (err: any) {
      setError(err?.message || '沟通焦点保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRequest() {
    const label = requestLabel.trim() || (requestKind === 'SPEAK' ? '我想发言' : '我想行动');
    setSaving(true);
    setError(null);
    try {
      const item = await createRoomActionQueueItem(roomId, {
        kind: requestKind,
        label,
        note: requestNote,
      });
      setData(prev => prev ? { ...prev, queue: [...prev.queue, item] } : prev);
      setRequestLabel('');
      setRequestNote('');
    } catch (err: any) {
      setError(err?.message || '加入轮候失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCheckIn() {
    if (!checkInUserId) return;
    setSaving(true);
    setError(null);
    try {
      const item = await createRoomActionQueueItem(roomId, {
        kind: 'CHECK_IN',
        label: checkInLabel || '请确认当前行动',
        targetUserId: checkInUserId,
      });
      setData(prev => prev ? { ...prev, queue: [...prev.queue, item] } : prev);
      setCheckInUserId('');
    } catch (err: any) {
      setError(err?.message || '点名提醒失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateItem(itemId: string, status: RoomQueueStatus) {
    setSaving(true);
    setError(null);
    try {
      const item = await updateRoomActionQueueItem(roomId, itemId, { status });
      setData(prev => {
        if (!prev) return prev;
        const nextQueue = prev.queue
          .map(existing => existing.id === item.id ? item : status === 'ACTIVE' && existing.status === 'ACTIVE' ? { ...existing, status: 'WAITING' as RoomQueueStatus } : existing)
          .filter(existing => existing.status === 'WAITING' || existing.status === 'ACTIVE');
        return { ...prev, queue: nextQueue };
      });
    } catch (err: any) {
      setError(err?.message || '轮候状态更新失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    setSaving(true);
    setError(null);
    try {
      await deleteRoomActionQueueItem(roomId, itemId);
      setData(prev => prev ? { ...prev, queue: prev.queue.filter(item => item.id !== itemId) } : prev);
    } catch (err: any) {
      setError(err?.message || '轮候项删除失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mb-3 rounded-lg border border-[#3a3a3a]/50 bg-[#101018]/80 p-3 text-sm text-[#8f8778]">
        沟通队列加载中...
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="mb-3 rounded-lg border border-[#3a3a3a]/55 bg-[#101018]/88 p-3 shadow-lg shadow-black/20">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#f4ead1]">
          <ListTodo size={16} className="text-[#c9a227]" />
          沟通秩序
        </div>
        <button
          type="button"
          onClick={() => void loadCommunication()}
          className="btn-v2 inline-flex min-h-8 items-center gap-1 rounded border border-[#3a3a3a]/60 px-2 text-xs text-[#b0a898]"
        >
          <RefreshCw size={13} />
          刷新
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded border border-[#a63848]/50 bg-[#4a111a]/35 px-3 py-2 text-xs text-[#f1b7bd]">
          {error}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr]">
        <div className="rounded border border-[#3a3a3a]/45 bg-black/20 p-3">
          <div className="mb-2 text-xs text-[#8f8778]">当前焦点</div>
          <div className="mb-2 text-sm font-medium text-[#f4ead1]">
            {data.state?.currentTopic || '尚未设置当前讨论焦点'}
          </div>
          <div className="mb-2 text-xs text-[#b0a898]">
            {activeItem
              ? `现在轮到：${activeItem.targetName || activeItem.requesterName || activeItem.label}`
              : spotlightName
                ? `关注对象：${spotlightName}`
                : '暂无指定对象'}
          </div>
          {data.state?.keeperPrompt && (
            <p className="mb-3 whitespace-pre-wrap text-xs text-[#d8ccb4]">{data.state.keeperPrompt}</p>
          )}
          {data.canManageCommunication && (
            <div className="space-y-2">
              <input
                value={currentTopic}
                onChange={event => setCurrentTopic(event.target.value)}
                placeholder="当前讨论什么"
                className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <select
                value={spotlightUserId}
                onChange={event => setSpotlightUserId(event.target.value)}
                className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              >
                <option value="">不指定成员</option>
                {data.members.map(member => (
                  <option key={member.userId} value={member.userId}>{member.name}</option>
                ))}
              </select>
              <textarea
                value={keeperPrompt}
                onChange={event => setKeeperPrompt(event.target.value)}
                rows={2}
                placeholder="给全员看的轻提示"
                className="w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <textarea
                value={environmentText}
                onChange={event => setEnvironmentText(event.target.value)}
                rows={3}
                placeholder="开场前环境检查，每行一项"
                className="w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <button
                type="button"
                onClick={() => void handleSaveState()}
                disabled={saving}
                className="btn-v2 inline-flex min-h-9 items-center gap-1.5 rounded border border-[#c9a227]/45 bg-[#3a2d10]/55 px-3 text-xs font-bold text-[#f4d778] disabled:opacity-50"
              >
                <Save size={14} />
                保存焦点
              </button>
            </div>
          )}
        </div>

        <div className="rounded border border-[#3a3a3a]/45 bg-black/20 p-3">
          <div className="mb-2 text-xs text-[#8f8778]">我要排队</div>
          <div className="space-y-2">
            <select
              value={requestKind}
              onChange={event => setRequestKind(event.target.value as RoomQueueKind)}
              className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
            >
              <option value="SPEAK">我想发言</option>
              <option value="ACTION">我想行动</option>
            </select>
            <input
              value={requestLabel}
              onChange={event => setRequestLabel(event.target.value)}
              placeholder="简短说明"
              className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
            />
            <input
              value={requestNote}
              onChange={event => setRequestNote(event.target.value)}
              placeholder="补充备注"
              className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
            />
            <button
              type="button"
              onClick={() => void handleCreateRequest()}
              disabled={saving}
              className="btn-v2 inline-flex min-h-9 items-center gap-1.5 rounded border border-[#3a3a3a]/60 px-3 text-xs text-[#e8d4a0] disabled:opacity-50"
            >
              <UserCheck size={14} />
              加入轮候
            </button>
          </div>

          {data.canManageCommunication && (
            <div className="mt-4 border-t border-[#3a3a3a]/35 pt-3">
              <div className="mb-2 text-xs text-[#8f8778]">KP 点名提醒</div>
              <select
                value={checkInUserId}
                onChange={event => setCheckInUserId(event.target.value)}
                className="mb-2 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              >
                <option value="">选择成员</option>
                {data.members.map(member => (
                  <option key={member.userId} value={member.userId}>{member.name}</option>
                ))}
              </select>
              <input
                value={checkInLabel}
                onChange={event => setCheckInLabel(event.target.value)}
                className="mb-2 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
              />
              <button
                type="button"
                onClick={() => void handleCreateCheckIn()}
                disabled={saving || !checkInUserId}
                className="btn-v2 inline-flex min-h-9 items-center gap-1.5 rounded border border-[#c9a227]/45 bg-[#3a2d10]/55 px-3 text-xs font-bold text-[#f4d778] disabled:opacity-50"
              >
                <Megaphone size={14} />
                发起提醒
              </button>
            </div>
          )}
        </div>

        <div className="rounded border border-[#3a3a3a]/45 bg-black/20 p-3">
          <div className="mb-2 text-xs text-[#8f8778]">轮候队列</div>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {[activeItem, ...waitingItems.filter(item => item.id !== activeItem?.id)].filter(Boolean).map(item => (
              <article key={item!.id} className="rounded border border-[#3a3a3a]/35 bg-black/20 p-2">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#f4ead1]">{item!.label}</div>
                    <div className="text-[11px] text-[#8f8778]">
                      {kindLabels[item!.kind]} · {statusLabels[item!.status]} · {item!.targetName || item!.requesterName || '成员'}
                    </div>
                  </div>
                  {(data.canManageCommunication || item!.canCancel) && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteItem(item!.id)}
                      className="shrink-0 rounded p-1 text-[#8f8778] hover:bg-[#a63848]/15 hover:text-[#f1b7bd]"
                      aria-label="删除轮候项"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                {item!.note && <p className="mb-2 text-xs text-[#d8ccb4]">{item!.note}</p>}
                {data.canManageCommunication && (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleUpdateItem(item!.id, 'ACTIVE')}
                      className="btn-v2 inline-flex min-h-8 items-center gap-1 rounded border border-[#c9a227]/40 px-2 text-[11px] text-[#f4d778]"
                    >
                      <UserCheck size={12} />
                      轮到TA
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleUpdateItem(item!.id, 'DONE')}
                      className="btn-v2 inline-flex min-h-8 items-center gap-1 rounded border border-[#3a3a3a]/60 px-2 text-[11px] text-[#b0a898]"
                    >
                      <Check size={12} />
                      完成
                    </button>
                  </div>
                )}
              </article>
            ))}
            {data.queue.length === 0 && (
              <div className="text-xs text-[#6b6558]">暂无轮候项</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
