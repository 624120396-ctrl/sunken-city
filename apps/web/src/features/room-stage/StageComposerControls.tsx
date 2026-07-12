import { useState } from 'react';
import { Send } from 'lucide-react';
import { STAGE_CONTRACT_VERSION, type StageCommandEnvelope } from '../../../../shared/stage/stage-contract';
import type { StageViewModel } from './stage-view-model';

const actions = ['点头', '摇头', '沉默', '靠近', '后退', '转身', '惊愕', '受伤', '倒下'];
const actionValue: Record<string, string> = { 点头: 'nod', 摇头: 'shake_head', 沉默: 'silence', 靠近: 'approach', 后退: 'retreat', 转身: 'turn', 惊愕: 'startled', 受伤: 'injured', 倒下: 'fall' };

export function StageComposerControls({ model, onDispatch }: { model: StageViewModel; onDispatch: (command: StageCommandEnvelope) => Promise<unknown> }) {
  const [content, setContent] = useState('');
  const [action, setAction] = useState('nod');
  const ownActor = model.actors.find((actor) => actor.entered && actor.ownerUserId === model.viewer.userId);
  if (!model.capabilities.canControlOwnStageActor || !ownActor) return null;
  const submit = () => {
    const text = content.trim();
    if (!text) return;
    void onDispatch({ contractVersion: STAGE_CONTRACT_VERSION, commandId: crypto.randomUUID(), channelId: model.channelId, expectedRevision: model.revision, commandType: 'ACTOR_PERFORM', payload: { actorId: ownActor.actorId, action }, messageDraft: { content: text, mode: model.channelKind === 'PRIVATE_THREAD' ? 'PRIVATE' : 'PUBLIC' } });
    setContent('');
  };
  return <div className="room-stage-composer"><select value={action} onChange={(event) => setAction(event.target.value)} aria-label="舞台动作">{actions.map((label) => <option key={label} value={actionValue[label]}>{label}</option>)}</select><input value={content} maxLength={2000} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} placeholder="以角色身份表演或发言" /><button type="button" onClick={submit} disabled={!content.trim()} aria-label="发送舞台表演"><Send size={15} /></button></div>;
}
