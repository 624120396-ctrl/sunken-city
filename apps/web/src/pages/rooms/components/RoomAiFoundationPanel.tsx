import { useEffect, useMemo, useState } from 'react';
import { Bot, ClipboardList, RefreshCw, Save, ShieldCheck, Sparkles } from 'lucide-react';
import {
  createRoomAiJob,
  getRoomAiContextPreview,
  getRoomAiJobs,
  getRoomAiSettings,
  getRoomAiUsageLedger,
  saveRoomAiSettings,
} from '@/services/room-ai.service';
import type {
  RoomAiContextPreview,
  RoomAiJobView,
  RoomAiSettingsView,
  RoomAiTaskType,
  RoomAiUsageLedgerView,
} from '@/types/room-ai-contract';

interface RoomAiFoundationPanelProps {
  roomId: string;
  canUseKPTools: boolean;
}

const taskLabels: Record<RoomAiTaskType, string> = {
  CLUE_DRAFT: '线索草稿',
  NPC_DRAFT: 'NPC 草稿',
  SCENE_DRAFT: '场景草稿',
  SESSION_RECAP_DRAFT: '上次回顾草稿',
  CURRENT_OBJECTIVE_DRAFT: '当前目标草稿',
  OPEN_QUESTIONS_DRAFT: '未解决问题草稿',
  CHARACTER_VOICE_DRAFT: '角色口吻草稿',
  IMAGE_ASSET_DRAFT: '素材图片草稿',
};

const defaultTask: RoomAiTaskType = 'SESSION_RECAP_DRAFT';

function defaultSettings(): RoomAiSettingsView {
  return {
    enabled: false,
    textAssistantEnabled: false,
    imageWorkshopEnabled: false,
    voiceReservedStatus: 'DISABLED_READ_ONLY',
    defaultTextProvider: '',
    defaultTextModelId: '',
    defaultCharacterProvider: '',
    defaultCharacterModelId: '',
    defaultImageProvider: '',
    defaultImageModelId: '',
    playerVisibleContextEnabled: true,
    kpPrivateContextEnabled: false,
    monthlyCostLimitCents: 0,
    updatedById: null,
    createdAt: null,
    updatedAt: null,
  };
}

export function RoomAiFoundationPanel({ roomId, canUseKPTools }: RoomAiFoundationPanelProps) {
  const [settings, setSettings] = useState<RoomAiSettingsView>(defaultSettings());
  const [context, setContext] = useState<RoomAiContextPreview | null>(null);
  const [jobs, setJobs] = useState<RoomAiJobView[]>([]);
  const [ledger, setLedger] = useState<RoomAiUsageLedgerView[]>([]);
  const [taskType, setTaskType] = useState<RoomAiTaskType>(defaultTask);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contextStats = useMemo(() => {
    if (!context) return null;
    return {
      clues: context.publicClues.length,
      npcs: context.publicNpcs.length,
      scenes: context.publicScenes.length,
      timeline: context.publicTimeline.length,
    };
  }, [context]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [loadedSettings, loadedContext] = await Promise.all([
        getRoomAiSettings(roomId),
        getRoomAiContextPreview(roomId),
      ]);
      setSettings(loadedSettings);
      setContext(loadedContext);
      if (canUseKPTools) {
        const [loadedJobs, loadedLedger] = await Promise.all([
          getRoomAiJobs(roomId),
          getRoomAiUsageLedger(roomId),
        ]);
        setJobs(loadedJobs);
        setLedger(loadedLedger);
      }
    } catch (err: any) {
      setError(err?.message || 'AI 基础资料加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [roomId, canUseKPTools]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveRoomAiSettings(roomId, {
        enabled: settings.enabled,
        textAssistantEnabled: settings.textAssistantEnabled,
        imageWorkshopEnabled: settings.imageWorkshopEnabled,
        defaultTextProvider: settings.defaultTextProvider || undefined,
        defaultTextModelId: settings.defaultTextModelId || undefined,
        defaultCharacterProvider: settings.defaultCharacterProvider || undefined,
        defaultCharacterModelId: settings.defaultCharacterModelId || undefined,
        defaultImageProvider: settings.defaultImageProvider || undefined,
        defaultImageModelId: settings.defaultImageModelId || undefined,
        playerVisibleContextEnabled: settings.playerVisibleContextEnabled,
        monthlyCostLimitCents: settings.monthlyCostLimitCents,
      });
      setSettings(saved);
    } catch (err: any) {
      setError(err?.message || 'AI 设置保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateJob() {
    setSaving(true);
    setError(null);
    try {
      const job = await createRoomAiJob(roomId, {
        taskType,
        prompt,
        visibility: 'KP_ONLY',
        includeContextSnapshot: true,
      });
      setJobs(prev => [job, ...prev]);
      setPrompt('');
    } catch (err: any) {
      setError(err?.message || 'AI 草稿任务创建失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mb-3 rounded-lg border border-[#3a3a3a]/50 bg-[#101018]/80 p-3 text-sm text-[#8f8778]">
        AI 基础资料加载中...
      </section>
    );
  }

  return (
    <section className="mb-3 rounded-lg border border-[#3a3a3a]/55 bg-[#101018]/88 p-3 shadow-lg shadow-black/20">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#f4ead1]">
          <Bot size={16} className="text-[#c9a227]" />
          AI 副手基础
        </div>
        <button
          type="button"
          onClick={() => void load()}
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

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
        <div className="rounded border border-[#3a3a3a]/45 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-[#8f8778]">
            <ShieldCheck size={14} />
            安全边界
          </div>
          <div className="space-y-2 text-xs text-[#d8ccb4]">
            <p>执行模式：只创建草稿任务，不调用供应商接口。</p>
            <p>上下文：{context?.scope ?? 'PLAYER_VISIBLE'}</p>
            <p>语音能力：只读关闭。</p>
            <p>KP 私密上下文：关闭。</p>
            {contextStats && (
              <p>
                已纳入公开资料：线索 {contextStats.clues}、NPC {contextStats.npcs}、场景 {contextStats.scenes}、日志 {contextStats.timeline}
              </p>
            )}
            {context?.ownCharacter && (
              <p>你的角色：{context.ownCharacter.name} / {context.ownCharacter.occupation}</p>
            )}
          </div>
        </div>

        <div className="rounded border border-[#3a3a3a]/45 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-[#8f8778]">
            <Sparkles size={14} />
            房间 AI 设置
          </div>
          {canUseKPTools ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-[#d8ccb4]">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={event => setSettings(prev => ({ ...prev, enabled: event.target.checked }))}
                />
                启用 AI 副手配置
              </label>
              <label className="flex items-center gap-2 text-xs text-[#d8ccb4]">
                <input
                  type="checkbox"
                  checked={settings.textAssistantEnabled}
                  onChange={event => setSettings(prev => ({ ...prev, textAssistantEnabled: event.target.checked }))}
                />
                允许文本草稿任务
              </label>
              <label className="flex items-center gap-2 text-xs text-[#d8ccb4]">
                <input
                  type="checkbox"
                  checked={settings.imageWorkshopEnabled}
                  onChange={event => setSettings(prev => ({ ...prev, imageWorkshopEnabled: event.target.checked }))}
                />
                允许图片素材任务预留
              </label>
              <input
                value={settings.defaultTextModelId ?? ''}
                onChange={event => setSettings(prev => ({ ...prev, defaultTextModelId: event.target.value }))}
                placeholder="文本模型 ID，例如 deepseek-v4.1-flash"
                className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-xs text-[#f4ead1]"
              />
              <input
                type="number"
                min={0}
                value={settings.monthlyCostLimitCents}
                onChange={event => setSettings(prev => ({ ...prev, monthlyCostLimitCents: Number(event.target.value) }))}
                className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-xs text-[#f4ead1]"
              />
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="btn-v2 inline-flex min-h-9 items-center gap-1.5 rounded border border-[#c9a227]/45 bg-[#3a2d10]/55 px-3 text-xs font-bold text-[#f4d778] disabled:opacity-50"
              >
                <Save size={14} />
                保存设置
              </button>
            </div>
          ) : (
            <div className="space-y-2 text-xs text-[#d8ccb4]">
              <p>文本草稿：{settings.textAssistantEnabled ? '已允许' : '未开启'}</p>
              <p>图片素材：{settings.imageWorkshopEnabled ? '已允许' : '未开启'}</p>
              <p>模型：{settings.defaultTextModelId || '未配置'}</p>
            </div>
          )}
        </div>

        <div className="rounded border border-[#3a3a3a]/45 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-[#8f8778]">
            <ClipboardList size={14} />
            草稿任务
          </div>
          {canUseKPTools ? (
            <div className="space-y-2">
              <select
                value={taskType}
                onChange={event => setTaskType(event.target.value as RoomAiTaskType)}
                className="w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-xs text-[#f4ead1]"
              >
                {Object.entries(taskLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <textarea
                value={prompt}
                onChange={event => setPrompt(event.target.value)}
                rows={3}
                placeholder="给未来 AI 副手的草稿要求"
                className="w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-xs text-[#f4ead1]"
              />
              <button
                type="button"
                onClick={() => void handleCreateJob()}
                disabled={saving}
                className="btn-v2 inline-flex min-h-9 items-center gap-1.5 rounded border border-[#c9a227]/45 bg-[#3a2d10]/55 px-3 text-xs font-bold text-[#f4d778] disabled:opacity-50"
              >
                <Sparkles size={14} />
                创建草稿任务
              </button>
              <div className="max-h-32 space-y-1 overflow-y-auto pt-1">
                {jobs.length === 0 ? (
                  <div className="text-xs text-[#6b6558]">暂无 AI 草稿任务</div>
                ) : jobs.map(job => (
                  <div key={job.id} className="rounded border border-[#3a3a3a]/35 px-2 py-1 text-xs text-[#d8ccb4]">
                    {taskLabels[job.taskType]} · {job.status} · {job.provider}/{job.modelId}
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-[#8f8778]">用量审计记录：{ledger.length} 条</div>
            </div>
          ) : (
            <div className="text-xs text-[#8f8778]">只有 KP 可以创建 AI 草稿任务。</div>
          )}
        </div>
      </div>
    </section>
  );
}
