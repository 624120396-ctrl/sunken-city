import { useState } from 'react';
import { Clapperboard, Eraser } from 'lucide-react';
import { STAGE_CONTRACT_VERSION, type StageCommandEnvelope } from '../../../../shared/stage/stage-contract';
import type { StageViewModel } from './stage-view-model';

export function StageDirectorTools({ model, onDispatch }: { model: StageViewModel; onDispatch: (command: StageCommandEnvelope) => Promise<unknown> }) {
  const [title, setTitle] = useState(model.scene.title);
  const [description, setDescription] = useState(model.scene.description || '');
  if (!model.capabilities.canManageStage) return null;
  const commandId = () => crypto.randomUUID();
  return <section className="room-stage-director" aria-label="舞台导演工具"><header><Clapperboard size={15} /><span>导演台</span></header><input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} aria-label="场景标题" /><textarea value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} aria-label="场景说明" rows={2} /><div><button type="button" onClick={() => void onDispatch({ contractVersion: STAGE_CONTRACT_VERSION, commandId: commandId(), channelId: model.channelId, expectedRevision: model.revision, commandType: 'SCENE_SET', payload: { title: title.trim(), description: description.trim() || undefined } })}>更新场景</button><button type="button" className="room-stage-director__clear" onClick={() => void onDispatch({ contractVersion: STAGE_CONTRACT_VERSION, commandId: commandId(), channelId: model.channelId, expectedRevision: model.revision, commandType: 'SCENE_CLEAR', payload: { clear: 'SCENE' } })}><Eraser size={14} />清场</button></div></section>;
}
