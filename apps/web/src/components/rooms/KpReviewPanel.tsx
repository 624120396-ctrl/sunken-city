import { useState, useEffect } from 'react';
import { apiFetch } from '@lib/api';
import { Check, X } from 'lucide-react';
import { getRarityColorClass } from '@data/relics';

interface Application {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  applyNote?: string;
  broughtRelics: string[]; // CharacterRelic ids
  character?: {
    id: string;
    name: string;
    occupation: string;
    hp: number; maxHp: number; mp: number; maxMp: number; san: number; maxSan: number;
    str: number; con: number; siz: number; dex: number; app: number; int: number; pow: number; edu: number; luck: number; mov: number; build: number;
  };
  submittedAt: string;
}

interface KpReviewPanelProps {
  applications: Application[];
  onRefresh: () => void;
  roomId: string;
}

interface RelicInfo {
  id: string;
  key: string;
  name: string;
  rarity: string;
}

export function KpReviewPanel({ applications, onRefresh, roomId }: KpReviewPanelProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [relicMap, setRelicMap] = useState<Record<string, RelicInfo>>({});

  useEffect(() => {
    const loadRelics = async () => {
      try {
        const res = await apiFetch('/relics/registry');
        const data = await res.json();
        const registry: Record<string, { key: string; name: string; rarity: string }> = {};
        (data.data?.relics || []).forEach((r: any) => {
          registry[r.key] = r;
        });

        // 需要把 broughtRelics 中的 CharacterRelic id 映射到 relicKey
        // 这里先收集所有 id，然后批量查询（但没有批量接口）
        // 更简单：我们在 applications 里已经有了 broughtRelics 的 id，
        // 先通过 character 去查角色的遗物列表，然后构建 id -> info 映射
        const allIds = applications.flatMap((a) => a.broughtRelics);
        if (allIds.length === 0) return;
        const charIds = [...new Set(applications.map((a) => a.character?.id).filter(Boolean))];
        const idMap: Record<string, RelicInfo> = {};
        await Promise.all(
          charIds.map(async (cid) => {
            const r = await apiFetch(`/relics/character/${cid}`);
            const d = await r.json();
            (d.data?.relics || []).forEach((rel: any) => {
              idMap[rel.id] = {
                id: rel.id,
                key: rel.relicKey,
                name: registry[rel.relicKey]?.name || rel.relicKey,
                rarity: registry[rel.relicKey]?.rarity || 'common',
              };
            });
          })
        );
        setRelicMap(idMap);
      } catch (err) {
        console.error('加载遗物信息失败', err);
      }
    };
    if (applications.length > 0) {
      loadRelics();
    }
  }, [applications]);

  const handleApprove = async (memberId: string) => {
    try {
      await apiFetch(`/rooms/${roomId}/applications/${memberId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: 'approve' }),
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || '审核失败');
    }
  };

  const handleReject = async (memberId: string) => {
    if (!reason.trim() || reason.trim().length < 5) {
      alert('拒绝理由至少需要5个字');
      return;
    }
    try {
      await apiFetch(`/rooms/${roomId}/applications/${memberId}/review`, {
        method: 'POST',
        body: JSON.stringify({ action: 'reject', reason: reason.trim() }),
      });
      setRejectingId(null);
      setReason('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || '拒绝失败');
    }
  };

  if (applications.length === 0) return null;

  return (
    <div className="rounded border border-coc-gold/50 bg-coc-gold/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-coc-accent-red text-[10px] font-bold text-white">
          {applications.length}
        </span>
        <span className="text-sm font-bold text-coc-parchment">待审核申请</span>
      </div>

      <div className="space-y-3">
        {applications.map((app) => (
          <div key={app.id} className="rounded border border-coc-void bg-coc-bg-secondary/50 p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {app.avatarUrl ? (
                  <img src={app.avatarUrl} className="h-8 w-8 rounded-full object-cover" alt="" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-coc-bg-tertiary text-xs text-coc-parchment">
                    {app.nickname[0]}
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-coc-parchment">{app.nickname}</div>
                  {app.character && (
                    <div className="text-xs text-coc-text-muted">
                      {app.character.name} · {app.character.occupation} · HP {app.character.hp}/{app.character.maxHp}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {rejectingId === app.id ? (
                  <button
                    onClick={() => setRejectingId(null)}
                    className="rounded px-2 py-1 text-xs text-coc-text-muted hover:text-coc-parchment"
                  >
                    取消
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleApprove(app.id)}
                      className="flex items-center gap-1 rounded bg-coc-gold px-2 py-1 text-xs font-bold text-coc-abyss hover:bg-coc-gold-glow"
                    >
                      <Check size={12} /> 通过
                    </button>
                    <button
                      onClick={() => setRejectingId(app.id)}
                      className="ml-1 flex items-center gap-1 rounded bg-red-900/40 px-2 py-1 text-xs text-red-200 hover:bg-red-900/60"
                    >
                      <X size={12} /> 拒绝
                    </button>
                  </>
                )}
              </div>
            </div>

            {app.applyNote && (
              <div className="mt-2 text-xs text-coc-text-secondary">备注：{app.applyNote}</div>
            )}

            {app.broughtRelics.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-coc-text-muted">携带遗物：</span>
                {app.broughtRelics.map((rid) => {
                  const info = relicMap[rid];
                  if (!info) return <span key={rid} className="text-coc-text-muted">未知遗物</span>;
                  return (
                    <span
                      key={rid}
                      className={`rounded border px-1.5 py-0.5 ${getRarityColorClass(info.rarity)}`}
                    >
                      {info.name}
                    </span>
                  );
                })}
              </div>
            )}

            {rejectingId === app.id && (
              <div className="mt-3">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="请输入拒绝理由（至少5个字）"
                  className="w-full rounded border border-coc-void bg-coc-abyss p-2 text-xs text-coc-parchment focus:border-coc-gold focus:outline-none"
                  rows={2}
                />
                <button
                  onClick={() => handleReject(app.id)}
                  className="mt-2 w-full rounded bg-red-900/40 py-1.5 text-xs font-bold text-red-200 hover:bg-red-900/60"
                >
                  确认拒绝
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
