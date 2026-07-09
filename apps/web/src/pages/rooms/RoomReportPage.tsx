import { DoubleBezelCard } from '@components/ui/DoubleBezelCard';
import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Clock, Users, Sword, Brain, Heart, Save, Download, Gift } from 'lucide-react';
import { apiFetch, handleApiResponse } from '@lib/api';

interface ReportData {
  id: string;
  title: string;
  summary: string;
  date: string;
  duration: number;
  roomStatus: string;
  isCreator: boolean;
  participants: {
    userId: string;
    name: string;
    role: string;
    character?: string;
    characterId?: string;
    hp: number | null;
    isAlive: boolean;
  }[];
  keyEvents: {
    time: string;
    event: string;
  }[];
  combatRecords: {
    round: number;
    time: string;
    actor: string;
    action: string;
    target?: string;
    result: string;
  }[];
  skillChecks: {
    time: string;
    character: string;
    skill: string;
    roll: number;
    successLevel: string;
  }[];
  characterProgress: {
    userId?: string;
    characterId?: string;
    name: string;
    hpChange?: { before: number; after: number };
    mpChange?: { before: number; after: number };
    sanChange?: { before: number; after: number };
    skillGrowth?: { name: string; before: number; after: number }[];
    settlement?: {
      outcome?: string;
      hpFinal?: number | null;
      mpFinal?: number | null;
      sanFinal?: number | null;
      expAward?: number;
      skillGrowth?: unknown[];
      itemChanges?: unknown[];
      kpNote?: string | null;
      status?: string;
    };
  }[];
  investigation?: {
    lastRecap: string;
    currentObjective: string;
    unresolvedQuestions: string[];
    pinnedMessage: string;
    currentScene: {
      title: string;
      publicSummary: string;
      atmosphere: string;
    } | null;
    publicClues: Array<{
      id: string;
      title: string;
      content: string;
      source: string | null;
      status: string;
      revealedAt: string | null;
    }>;
    timeline: Array<{
      time: string;
      eventType: string;
      title: string;
      content: string | null;
    }>;
  };
  lootedRelics: {
    characterId: string;
    relicKey: string;
    characterName: string;
    relicName: string;
    awardedAt: string;
  }[];
}

export function RoomReportPage() {
  const { roomId } = useParams();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'combat' | 'skills' | 'growth' | 'relics'>('overview');
  const [relicRegistry, setRelicRegistry] = useState<Array<{ key: string; name: string; description: string; rarity: string }>>([]);
  const [awardSelections, setAwardSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchReport();
  }, [roomId]);

  const fetchReport = async () => {
    try {
      const response = await apiFetch(`/rooms/${roomId}/report`);
      const data = await handleApiResponse<ReportData | { data: ReportData }>(response);
      const reportData = 'data' in data ? data.data : data;
      setReport(reportData);
      setEditedSummary(reportData.summary || '');
      if (reportData.isCreator) {
        fetchRelicRegistry();
      }
    } catch (error) {
      console.error('获取报告失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelicRegistry = async () => {
    try {
      const res = await apiFetch('/relics/registry');
      const data = await handleApiResponse<{ relics: any[] }>(res);
      setRelicRegistry(data.relics || []);
    } catch (err) {
      console.error('获取遗物列表失败', err);
    }
  };

  const handleAwardRelic = async (characterId: string) => {
    const relicKey = awardSelections[characterId];
    if (!relicKey) return;
    try {
      const res = await apiFetch(`/rooms/${roomId}/report/relics`, {
        method: 'POST',
        body: JSON.stringify({ characterId, relicKey }),
      });
      const data = await handleApiResponse<{ message: string }>(res);
      alert(data.message);
      fetchReport();
    } catch (err: any) {
      alert(err.message || '发放失败');
    }
  };

  const handleSaveSummary = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await apiFetch(`/rooms/${roomId}/report`, {
        method: 'PATCH',
        body: JSON.stringify({ summary: editedSummary }),
      });
      setReport({ ...report, summary: editedSummary });
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!report) return;
    window.open(`/api/rooms/${roomId}/report/export`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-coc-accent-red border-t-transparent" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <FileText size={48} className="mx-auto text-coc-text-muted mb-4" />
        <p className="text-coc-text-secondary">报告不存在</p>
        <Link to={`/rooms/${roomId}`} className="text-coc-accent-red hover:underline mt-2 inline-block">
          返回房间
        </Link>
      </div>
    );
  }

  return (
    <div className="room-report-archive max-w-5xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to={`/rooms/${roomId}`} className="coc-btn-secondary p-2">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-bold">{report.title}</h1>
            <p className="text-coc-text-secondary">{report.date}</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="coc-btn-primary flex items-center gap-2"
        >
          <Download size={18} />
          导出Markdown
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="room-report-archive__stats grid grid-cols-4 gap-4 mb-6">
        <DoubleBezelCard variant="default" runeCorners innerClassName="p-4 text-center">
          <Clock size={20} className="mx-auto mb-2 text-coc-accent-gold" />
          <div className="text-2xl font-bold">{report.duration}</div>
          <div className="text-xs text-coc-text-muted">分钟</div>
        </DoubleBezelCard>
        <DoubleBezelCard variant="default" runeCorners innerClassName="p-4 text-center">
          <Users size={20} className="mx-auto mb-2 text-coc-accent-cyan" />
          <div className="text-2xl font-bold">{report.participants.length}</div>
          <div className="text-xs text-coc-text-muted">参与者</div>
        </DoubleBezelCard>
        <DoubleBezelCard variant="default" runeCorners innerClassName="p-4 text-center">
          <Sword size={20} className="mx-auto mb-2 text-coc-accent-red" />
          <div className="text-2xl font-bold">{report.combatRecords.length}</div>
          <div className="text-xs text-coc-text-muted">战斗记录</div>
        </DoubleBezelCard>
        <DoubleBezelCard variant="default" runeCorners innerClassName="p-4 text-center">
          <Brain size={20} className="mx-auto mb-2 text-coc-accent-gold" />
          <div className="text-2xl font-bold">{report.skillChecks.length}</div>
          <div className="text-xs text-coc-text-muted">技能检定</div>
        </DoubleBezelCard>
      </div>

      {/* Tab导航 */}
      <div className="room-report-archive__tabs flex gap-2 mb-6 border-b border-coc-border">
        {[
          { id: 'overview', label: '概览', icon: FileText },
          { id: 'combat', label: '战斗记录', icon: Sword },
          { id: 'skills', label: '技能检定', icon: Brain },
          { id: 'growth', label: '角色成长', icon: Heart },
          { id: 'relics', label: '遗物发放', icon: Gift },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-coc-accent-red text-coc-accent-red'
                : 'border-transparent text-coc-text-secondary hover:text-coc-text-primary'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 参与者 */}
          <DoubleBezelCard variant="default" runeCorners innerClassName="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Users size={18} />
              参与者
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {report.participants.map((p, i) => (
                <div key={i} className="p-3 bg-coc-bg-tertiary rounded">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-coc-text-secondary">
                    {p.role === 'KP' ? '守秘人' : '调查员'}
                    {p.character && ` · ${p.character}`}
                  </div>
                </div>
              ))}
            </div>
          </DoubleBezelCard>

          {/* 故事概要 */}
          <DoubleBezelCard variant="default" runeCorners innerClassName="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <FileText size={18} />
                故事概要
              </h3>
              <button
                onClick={handleSaveSummary}
                disabled={saving || editedSummary === report.summary}
                className="coc-btn-secondary text-sm flex items-center gap-1"
              >
                <Save size={14} />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
            <textarea
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              placeholder="记录这次跑团的故事概要..."
              className="w-full h-32 coc-input resize-none"
            />
          </DoubleBezelCard>

          {/* 调查档案 */}
          {report.investigation && (
            <DoubleBezelCard variant="default" runeCorners innerClassName="p-4">
              <h3 className="font-bold mb-4">调查档案</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded bg-coc-bg-tertiary p-3">
                  <div className="text-xs text-coc-text-muted mb-1">当前调查目标</div>
                  <div className="text-sm whitespace-pre-wrap">{report.investigation.currentObjective || '暂无'}</div>
                </div>
                <div className="rounded bg-coc-bg-tertiary p-3">
                  <div className="text-xs text-coc-text-muted mb-1">当前场景</div>
                  <div className="text-sm">{report.investigation.currentScene?.title || '暂无'}</div>
                  {report.investigation.currentScene?.publicSummary && (
                    <div className="mt-1 text-xs text-coc-text-secondary line-clamp-2">{report.investigation.currentScene.publicSummary}</div>
                  )}
                </div>
              </div>
              {report.investigation.pinnedMessage && (
                <div className="mt-3 rounded bg-coc-accent-gold/10 p-3 text-sm text-coc-accent-gold">
                  {report.investigation.pinnedMessage}
                </div>
              )}
              {report.investigation.lastRecap && (
                <div className="mt-3">
                  <div className="text-xs text-coc-text-muted mb-1">上次回顾</div>
                  <p className="whitespace-pre-wrap text-sm text-coc-text-secondary">{report.investigation.lastRecap}</p>
                </div>
              )}
              {report.investigation.unresolvedQuestions.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-coc-text-muted mb-1">未解决问题</div>
                  <ul className="space-y-1 text-sm text-coc-text-secondary">
                    {report.investigation.unresolvedQuestions.map(question => <li key={question}>· {question}</li>)}
                  </ul>
                </div>
              )}
              {report.investigation.publicClues.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-coc-text-muted mb-2">公开线索</div>
                  <div className="space-y-2">
                    {report.investigation.publicClues.map(clue => (
                      <div key={clue.id} className="rounded bg-coc-bg-tertiary/70 p-2 text-sm">
                        <span className="font-medium text-coc-parchment">{clue.title}</span>
                        {clue.source && <span className="ml-2 text-xs text-coc-text-muted">{clue.source}</span>}
                        {clue.content && <p className="mt-1 text-coc-text-secondary">{clue.content}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {report.investigation.timeline.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-coc-text-muted mb-2">调查日志</div>
                  <div className="space-y-1.5">
                    {report.investigation.timeline.map(entry => (
                      <div key={`${entry.time}-${entry.title}`} className="flex gap-3 text-sm">
                        <span className="w-20 shrink-0 text-coc-accent-gold">{new Date(entry.time).toLocaleTimeString()}</span>
                        <span className="text-coc-text-secondary">{entry.title}{entry.content ? `：${entry.content}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DoubleBezelCard>
          )}

          {/* 关键事件 */}
          {report.keyEvents.length > 0 && (
            <DoubleBezelCard variant="default" runeCorners innerClassName="p-4">
              <h3 className="font-bold mb-4">关键事件</h3>
              <div className="space-y-2">
                {report.keyEvents.map((e, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="text-coc-accent-gold w-20 flex-shrink-0">
                      {new Date(e.time).toLocaleTimeString()}
                    </span>
                    <span>{e.event}</span>
                  </div>
                ))}
              </div>
            </DoubleBezelCard>
          )}
        </div>
      )}

      {activeTab === 'combat' && (
        <DoubleBezelCard variant="default" runeCorners innerClassName="p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Sword size={18} />
            战斗记录
          </h3>
          {report.combatRecords.length === 0 ? (
            <EmptyState
              icon={EmptyIcons.Combat}
              title="暂无战斗记录"
              description="这场调查尚未发生战斗。"
              size="sm"
              animate={false}
            />
          ) : (
            <div className="space-y-3">
              {report.combatRecords.map((r, i) => (
                <div key={i} className="p-3 bg-coc-bg-tertiary rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-coc-accent-red/20 text-coc-accent-red px-2 py-0.5 rounded">
                      第{r.round}回合
                    </span>
                    <span className="text-xs text-coc-text-muted">
                      {new Date(r.time).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-coc-accent-cyan">{r.actor}</span>
                    <span className="text-coc-text-secondary"> {r.action} </span>
                    {r.target && <span className="text-coc-accent-gold">{r.target}</span>}
                  </div>
                  <div className="text-xs text-coc-text-secondary mt-1">{r.result}</div>
                </div>
              ))}
            </div>
          )}
        </DoubleBezelCard>
      )}

      {activeTab === 'skills' && (
        <DoubleBezelCard variant="default" runeCorners innerClassName="p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Brain size={18} />
            技能检定记录
          </h3>
          {report.skillChecks.length === 0 ? (
            <EmptyState
              icon={EmptyIcons.Dice}
              title="暂无技能检定记录"
              description="还没有人进行过技能检定。"
              size="sm"
              animate={false}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-coc-text-secondary border-b border-coc-border">
                    <th className="text-left py-2">时间</th>
                    <th className="text-left py-2">角色</th>
                    <th className="text-left py-2">技能</th>
                    <th className="text-center py-2">骰值</th>
                    <th className="text-left py-2">结果</th>
                  </tr>
                </thead>
                <tbody>
                  {report.skillChecks.map((s, i) => (
                    <tr key={i} className="border-b border-coc-border/50">
                      <td className="py-2">{new Date(s.time).toLocaleTimeString()}</td>
                      <td className="py-2">{s.character}</td>
                      <td className="py-2">{s.skill}</td>
                      <td className="py-2 text-center">{s.roll}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          s.successLevel?.includes('成功') && !s.successLevel?.includes('失败')
                            ? 'bg-green-500/20 text-green-400'
                            : s.successLevel?.includes('失败')
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-coc-accent-gold/20 text-coc-accent-gold'
                        }`}>
                          {s.successLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DoubleBezelCard>
      )}

      {activeTab === 'growth' && (
        <DoubleBezelCard variant="default" runeCorners innerClassName="p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Heart size={18} />
            角色成长
          </h3>
          {report.characterProgress.length === 0 ? (
            <EmptyState
              icon={EmptyIcons.Investigator}
              title="暂无成长记录"
              description="调查员们尚未获得成长。"
              size="sm"
              animate={false}
            />
          ) : (
            <div className="space-y-4">
              {report.characterProgress.map((c, i) => (
                <div key={i} className="p-4 bg-coc-bg-tertiary rounded">
                  <h4 className="font-bold mb-3">{c.name}</h4>
                  {c.settlement?.outcome && (
                    <div className="mb-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-coc-accent-gold/20 px-2 py-0.5 text-coc-accent-gold">
                        结局：{c.settlement.outcome}
                      </span>
                      <span className="rounded bg-coc-bg-secondary px-2 py-0.5 text-coc-text-secondary">
                        状态：{c.settlement.status || 'DRAFT'}
                      </span>
                      <span className="rounded bg-coc-bg-secondary px-2 py-0.5 text-coc-text-secondary">
                        EXP：{c.settlement.expAward ?? 0}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-xs text-coc-text-muted">HP</div>
                      <div className="text-sm">
                        {c.hpChange?.before ?? '-'} → {c.settlement?.hpFinal ?? c.hpChange?.after ?? '-'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-coc-text-muted">MP</div>
                      <div className="text-sm">
                        {c.mpChange?.before ?? '-'} → {c.settlement?.mpFinal ?? c.mpChange?.after ?? '-'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-coc-text-muted">SAN</div>
                      <div className="text-sm">
                        {c.sanChange?.before ?? '-'} → {c.settlement?.sanFinal ?? c.sanChange?.after ?? '-'}
                      </div>
                    </div>
                  </div>
                  {c.settlement?.kpNote && (
                    <div className="mb-3 rounded bg-coc-bg-secondary/70 p-3 text-sm text-coc-text-secondary">
                      <span className="text-coc-text-muted">KP 备注：</span>{c.settlement.kpNote}
                    </div>
                  )}
                  {c.skillGrowth && c.skillGrowth.length > 0 && (
                    <div>
                      <div className="text-xs text-coc-text-muted mb-1">技能成长</div>
                      <div className="flex flex-wrap gap-2">
                        {c.skillGrowth.map((s, j) => (
                          <span key={j} className="text-xs bg-coc-accent-gold/20 text-coc-accent-gold px-2 py-0.5 rounded">
                            {s.name}: {s.before}% → {s.after}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DoubleBezelCard>
      )}
      {activeTab === 'relics' && (
        <DoubleBezelCard variant="default" runeCorners innerClassName="p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Gift size={18} />
            遗物发放
          </h3>

          {/* 已发放列表 */}
          {report.lootedRelics.length > 0 ? (
            <div className="mb-6 space-y-2">
              <h4 className="text-sm text-coc-text-muted">本场已发放遗物</h4>
              {report.lootedRelics.map((lr, i) => (
                <div key={i} className="flex items-center justify-between rounded bg-coc-bg-tertiary p-3">
                  <div>
                    <div className="font-medium text-coc-parchment">{lr.relicName}</div>
                    <div className="text-xs text-coc-text-muted">获得者：{lr.characterName}</div>
                  </div>
                  <div className="text-xs text-coc-text-muted">
                    {new Date(lr.awardedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-6 text-sm text-coc-text-muted">本场尚无遗物发放记录。</p>
          )}

          {/* KP 发放区 */}
          {report.isCreator ? (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-coc-parchment">为存活调查员发放遗物</h4>
              {report.participants
                .filter((p) => p.role === 'PLAYER' && p.isAlive)
                .map((p) => {
                  const alreadyAwarded = report.lootedRelics.some(
                    (lr) => lr.characterId === p.characterId
                  );
                  if (alreadyAwarded) {
                    return (
                      <div key={p.characterId} className="rounded border border-coc-void bg-coc-bg-tertiary/40 p-3 text-sm text-coc-text-muted">
                        {p.character} · 已获得遗物
                      </div>
                    );
                  }
                  return (
                    <div key={p.characterId} className="flex items-center gap-3 rounded border border-coc-void bg-coc-bg-tertiary p-3">
                      <div className="flex-1 text-sm text-coc-parchment">{p.character}</div>
                      <select
                        value={awardSelections[p.characterId || ''] || ''}
                        onChange={(e) =>
                          setAwardSelections((prev) => ({
                            ...prev,
                            [p.characterId || '']: e.target.value,
                          }))
                        }
                        className="rounded border border-coc-void bg-coc-abyss px-2 py-1 text-sm text-coc-parchment focus:border-coc-gold focus:outline-none"
                      >
                        <option value="">选择遗物</option>
                        {relicRegistry.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.name}（{r.rarity}）
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAwardRelic(p.characterId || '')}
                        disabled={!awardSelections[p.characterId || '']}
                        className="rounded bg-coc-gold px-3 py-1 text-xs font-bold text-coc-abyss hover:bg-coc-gold-glow disabled:opacity-50"
                      >
                        发放
                      </button>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-coc-text-muted">只有 KP 可以发放遗物。</p>
          )}
        </DoubleBezelCard>
      )}
    </div>
  );
}
