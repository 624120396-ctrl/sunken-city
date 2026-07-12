import { useState } from 'react';
import { Send } from 'lucide-react';
import { STAGE_CONTRACT_VERSION, type StageCommandEnvelope } from '../../../../shared/stage/stage-contract';
import type { StageViewModel } from './stage-view-model';
import { canSubmitStageComposer, selectStageMessageTargets, shouldClearStageComposer } from './stage-composer';

const actions = ['点头', '摇头', '沉默', '靠近', '后退', '转身', '惊愕', '受伤', '倒下'];
const actionValue: Record<string, string> = { 点头: 'nod', 摇头: 'shake_head', 沉默: 'silence', 靠近: 'approach', 后退: 'retreat', 转身: 'turn', 惊愕: 'startled', 受伤: 'injured', 倒下: 'fall' };

export function StageComposerControls({ model, onDispatch }: { model: StageViewModel; onDispatch: (command: StageCommandEnvelope) => Promise<unknown> }) {
  const [content, setContent] = useState('');
  const [action, setAction] = useState('nod');
  const [targetUserId, setTargetUserId] = useState<string>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const ownActors = model.actors.filter((actor) => actor.ownerUserId === model.viewer.userId);
  const [actorId, setActorId] = useState<string>();
  const ownActor = ownActors.find((actor) => actor.actorId === actorId) ?? ownActors[0];
  const targets = selectStageMessageTargets(model);
  if (!model.capabilities.canControlOwnStageActor || !ownActor) return null;
  const isPrivate = model.channelKind === 'PRIVATE_THREAD';
  const togglePresence = async () => {
    setSubmitting(true); setError(undefined);
    try {
      const command: StageCommandEnvelope = ownActor.entered
        ? { contractVersion: STAGE_CONTRACT_VERSION, commandId: crypto.randomUUID(), channelId: model.channelId, expectedRevision: model.revision, commandType: 'ACTOR_EXIT', payload: { actorId: ownActor.actorId } }
        : { contractVersion: STAGE_CONTRACT_VERSION, commandId: crypto.randomUUID(), channelId: model.channelId, expectedRevision: model.revision, commandType: 'ACTOR_ENTER', payload: { actorId: ownActor.actorId, zone: 'center' } };
      const result = await onDispatch(command);
      if (!shouldClearStageComposer(result)) setError((result as { message?: string })?.message || '舞台命令未被接受');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '舞台命令失败'); }
    finally { setSubmitting(false); }
  };
  if (!ownActor.entered) return <div className="room-stage-composer">{ownActors.length > 1 && <select value={ownActor.actorId} onChange={(event) => setActorId(event.target.value)} aria-label="本人舞台角色">{ownActors.map((actor) => <option key={actor.actorId} value={actor.actorId}>{actor.name}</option>)}</select>}<button type="button" onClick={() => void togglePresence()} disabled={submitting}>让{ownActor.name}进入舞台</button>{error && <p role="status">{error}</p>}</div>;
  const submit = async () => {
    const text = content.trim();
    if (submitting || !canSubmitStageComposer({ content: text, channelKind: model.channelKind, targetUserId })) return;
    setSubmitting(true); setError(undefined);
    try {
      const result = await onDispatch({ contractVersion: STAGE_CONTRACT_VERSION, commandId: crypto.randomUUID(), channelId: model.channelId, expectedRevision: model.revision, commandType: 'ACTOR_PERFORM', payload: { actorId: ownActor.actorId, action }, messageDraft: { content: text, mode: isPrivate ? 'PRIVATE' : 'PUBLIC', ...(isPrivate ? { targetUserId } : {}) } });
      if (shouldClearStageComposer(result)) { setContent(''); setTargetUserId(undefined); }
      else setError((result as { message?: string })?.message || '舞台命令未被接受');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '舞台命令失败'); }
    finally { setSubmitting(false); }
  };
  return <div className="room-stage-composer">{ownActors.length > 1 && <select value={ownActor.actorId} onChange={(event) => setActorId(event.target.value)} aria-label="本人舞台角色">{ownActors.map((actor) => <option key={actor.actorId} value={actor.actorId}>{actor.name}</option>)}</select>}<select value={action} onChange={(event) => setAction(event.target.value)} aria-label="舞台动作">{actions.map((label) => <option key={label} value={actionValue[label]}>{label}</option>)}</select>{isPrivate && <select value={targetUserId ?? ''} onChange={(event) => setTargetUserId(event.target.value || undefined)} aria-label="私密舞台接收者"><option value="">选择接收者</option>{targets.map((target) => <option key={target.userId} value={target.userId}>{target.label}</option>)}</select>}<input value={content} maxLength={2000} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); } }} placeholder="以角色身份表演或发言" /><button type="button" onClick={() => void submit()} disabled={submitting || !canSubmitStageComposer({ content, channelKind: model.channelKind, targetUserId })} aria-label="发送舞台表演"><Send size={15} /></button><button type="button" onClick={() => void togglePresence()} disabled={submitting}>离开舞台</button>{error && <p role="status">{error}</p>}</div>;
}
