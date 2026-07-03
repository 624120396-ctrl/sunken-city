import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Save, ScrollText } from 'lucide-react';
import { finalizeRoom } from '@/services/room-lifecycle.service';
import { getRoomSettlements, saveRoomSettlement } from '@/services/room-settlement.service';
import type {
  RoomJsonValue,
  RoomSettlementEntryView,
  RoomSettlementOutcome,
  RoomSettlementSavePayload,
  RoomSettlementStatus,
  RoomSettlementView,
} from '@/types/room-contract';

const outcomeLabels: Record<RoomSettlementOutcome, string> = {
  SURVIVED: '存活',
  DEAD: '死亡',
  MISSING: '失踪',
  INSANE: '永久疯狂',
  WITHDREW: '退出',
};

const outcomeOptions = Object.keys(outcomeLabels) as RoomSettlementOutcome[];

interface SettlementFormState {
  outcome: RoomSettlementOutcome;
  hpFinal: string;
  mpFinal: string;
  sanFinal: string;
  expAward: string;
  skillGrowthText: string;
  itemChangesText: string;
  kpNote: string;
  status: RoomSettlementStatus;
}

interface RoomSettlementPanelProps {
  roomId: string;
  onFinalized: () => void;
}

function formatArray(value: RoomJsonValue[] | undefined) {
  return JSON.stringify(value ?? [], null, 2);
}

function buildForm(entry: RoomSettlementEntryView): SettlementFormState {
  const settlement = entry.settlement;
  return {
    outcome: settlement?.outcome ?? 'SURVIVED',
    hpFinal: String(settlement?.hpFinal ?? entry.participant.currentHp),
    mpFinal: String(settlement?.mpFinal ?? entry.participant.currentMp),
    sanFinal: String(settlement?.sanFinal ?? entry.participant.currentSan),
    expAward: String(settlement?.expAward ?? 0),
    skillGrowthText: formatArray(settlement?.skillGrowth),
    itemChangesText: formatArray(settlement?.itemChanges),
    kpNote: settlement?.kpNote ?? '',
    status: settlement?.status ?? 'DRAFT',
  };
}

function parseArrayText(text: string, label: string): RoomJsonValue[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parsed = JSON.parse(trimmed) as RoomJsonValue;
  if (!Array.isArray(parsed)) {
    throw new Error(`${label} 必须是 JSON 数组`);
  }
  return parsed;
}

function parseOptionalNumber(value: string, label: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (!Number.isInteger(numeric) || numeric < 0) {
    throw new Error(`${label} 必须是非负整数`);
  }
  return numeric;
}

export function RoomSettlementPanel({ roomId, onFinalized }: RoomSettlementPanelProps) {
  const [entries, setEntries] = useState<RoomSettlementEntryView[]>([]);
  const [forms, setForms] = useState<Record<string, SettlementFormState>>({});
  const [loading, setLoading] = useState(true);
  const [savingCharacterId, setSavingCharacterId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSettlements() {
      try {
        setLoading(true);
        setError(null);
        const data = await getRoomSettlements(roomId);
        if (cancelled) return;
        setEntries(data.settlements);
        setForms(Object.fromEntries(data.settlements.map(entry => [entry.participant.characterId, buildForm(entry)])));
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '结算草案加载失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettlements();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const updateForm = (characterId: string, patch: Partial<SettlementFormState>) => {
    setForms(prev => ({
      ...prev,
      [characterId]: {
        ...prev[characterId],
        ...patch,
      },
    }));
  };

  const mergeSavedSettlement = (settlement: RoomSettlementView) => {
    setEntries(prev => prev.map(entry => (
      entry.participant.characterId === settlement.characterId
        ? { ...entry, settlement }
        : entry
    )));
    setForms(prev => ({
      ...prev,
      [settlement.characterId]: {
        ...prev[settlement.characterId],
        status: settlement.status,
        skillGrowthText: formatArray(settlement.skillGrowth),
        itemChangesText: formatArray(settlement.itemChanges),
      },
    }));
  };

  const handleSave = async (entry: RoomSettlementEntryView, status: RoomSettlementStatus) => {
    const characterId = entry.participant.characterId;
    const form = forms[characterId];
    if (!form) return;

    try {
      setSavingCharacterId(characterId);
      setError(null);
      const payload: RoomSettlementSavePayload = {
        outcome: form.outcome,
        hpFinal: parseOptionalNumber(form.hpFinal, '最终 HP'),
        mpFinal: parseOptionalNumber(form.mpFinal, '最终 MP'),
        sanFinal: parseOptionalNumber(form.sanFinal, '最终 SAN'),
        expAward: parseOptionalNumber(form.expAward, '经验奖励') ?? 0,
        skillGrowth: parseArrayText(form.skillGrowthText, '技能成长'),
        itemChanges: parseArrayText(form.itemChangesText, '物品变化'),
        kpNote: form.kpNote.trim() || null,
        status,
      };
      const result = await saveRoomSettlement(roomId, characterId, payload);
      mergeSavedSettlement(result.settlement);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : '结算草案保存失败');
    } finally {
      setSavingCharacterId(null);
    }
  };

  const handleFinalize = async () => {
    const confirmed = window.confirm(
      '此操作会释放本场角色占用，并将确认的结算结果写回角色卡。已结团房间不会继续普通游戏推进。'
    );
    if (!confirmed) return;

    try {
      setFinalizing(true);
      setError(null);
      const result = await finalizeRoom(roomId, {
        finishSummary: {
          finalizedAt: new Date().toISOString(),
          source: 'settlement-workbench',
        },
      });
      alert(`结团完成，已写回 ${result.appliedSettlementCount ?? 0} 条确认结算。`);
      onFinalized();
    } catch (finalizeError: unknown) {
      setError(finalizeError instanceof Error ? finalizeError.message : '结团失败');
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <section className="mb-4 rounded-xl border border-[#3a3a3a]/60 bg-[#101018]/88 p-4 shadow-lg shadow-black/20">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ScrollText size={18} className="text-[#e8d4a0]" />
          <div>
            <h2 className="text-sm font-bold text-[#f4ead1]">结算工作台</h2>
            <p className="text-xs text-[#9c9486]">保存草案或确认单名调查员的结算，最终写回由结团操作执行。</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleFinalize}
          disabled={finalizing || loading}
          className="btn-v2 rounded border border-[#c9a227]/50 bg-[#3a2d10]/80 px-3 py-2 text-xs font-bold text-[#f4d778] transition-colors hover:border-[#f4d778]/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {finalizing ? '结团中...' : '确认结团并写回角色卡'}
        </button>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#a63848]/40 bg-[#4a111a]/30 p-3 text-sm text-[#f1b7bd]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-6 text-center text-sm text-[#9c9486]">正在读取结算草案...</div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#3a3a3a]/70 p-5 text-center text-sm text-[#9c9486]">
          当前跑团没有可结算的玩家角色。
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => {
            const characterId = entry.participant.characterId;
            const form = forms[characterId];
            const pending = savingCharacterId === characterId;

            if (!form) return null;

            return (
              <div key={characterId} className="rounded-lg border border-[#2f2f38] bg-[#15151d]/80 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#f4ead1]">{entry.participant.characterName}</h3>
                    <p className="text-xs text-[#8f8778]">PL：{entry.participant.userNickname}</p>
                  </div>
                  <span className="rounded border border-[#3a3a3a]/70 px-2 py-1 text-xs text-[#b0a898]">
                    {form.status === 'CONFIRMED' ? '已确认' : form.status === 'APPROVED' ? '已批准' : '草案'}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-6">
                  <label className="md:col-span-2 text-xs text-[#b0a898]">
                    结局
                    <select
                      value={form.outcome}
                      onChange={event => updateForm(characterId, { outcome: event.target.value as RoomSettlementOutcome })}
                      className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
                    >
                      {outcomeOptions.map(outcome => (
                        <option key={outcome} value={outcome}>{outcomeLabels[outcome]}</option>
                      ))}
                    </select>
                  </label>
                  {[
                    ['hpFinal', '最终 HP', `${entry.participant.currentHp}/${entry.participant.maxHp}`],
                    ['mpFinal', '最终 MP', `${entry.participant.currentMp}/${entry.participant.maxMp}`],
                    ['sanFinal', '最终 SAN', `${entry.participant.currentSan}/${entry.participant.maxSan}`],
                    ['expAward', '经验', '0'],
                  ].map(([key, label, placeholder]) => (
                    <label key={key} className="text-xs text-[#b0a898]">
                      {label}
                      <input
                        type="number"
                        min={0}
                        value={form[key as keyof SettlementFormState]}
                        placeholder={placeholder}
                        onChange={event => updateForm(characterId, { [key]: event.target.value })}
                        className="mt-1 w-full rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
                      />
                    </label>
                  ))}
                </div>

                <label className="mt-3 block text-xs text-[#b0a898]">
                  KP 备注
                  <textarea
                    value={form.kpNote}
                    onChange={event => updateForm(characterId, { kpNote: event.target.value })}
                    className="mt-1 h-20 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 text-sm text-[#f4ead1]"
                    placeholder="记录伤势、后遗症、剧情备注等"
                  />
                </label>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-[#b0a898]">
                    技能成长 JSON 数组
                    <textarea
                      value={form.skillGrowthText}
                      onChange={event => updateForm(characterId, { skillGrowthText: event.target.value })}
                      className="mt-1 h-24 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 font-mono text-xs text-[#f4ead1]"
                    />
                  </label>
                  <label className="text-xs text-[#b0a898]">
                    物品变化 JSON 数组
                    <textarea
                      value={form.itemChangesText}
                      onChange={event => updateForm(characterId, { itemChangesText: event.target.value })}
                      className="mt-1 h-24 w-full resize-none rounded border border-[#3a3a3a] bg-[#0d0d13] px-2 py-2 font-mono text-xs text-[#f4ead1]"
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleSave(entry, 'DRAFT')}
                    disabled={pending}
                    className="btn-v2 inline-flex items-center gap-1.5 rounded border border-[#3a3a3a]/70 bg-[#1b1b24] px-3 py-2 text-xs text-[#e8d4a0] hover:border-[#c9a227]/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={14} />
                    {pending ? '保存中...' : '保存草案'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(entry, 'CONFIRMED')}
                    disabled={pending}
                    className="btn-v2 inline-flex items-center gap-1.5 rounded border border-[#2f6f58]/70 bg-[#143528]/80 px-3 py-2 text-xs text-[#bdebd5] hover:border-[#5bc79a]/70 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle2 size={14} />
                    {pending ? '确认中...' : '确认结算'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
