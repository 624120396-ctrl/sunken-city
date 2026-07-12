import { useEffect, useRef, useState } from 'react';
import type { StageViewModel } from './stage-view-model';
import { StageAudioRuntime } from './StageAudioRuntime';

export function useStageAudio(model: StageViewModel, active: boolean) {
  const runtime = useRef(new StageAudioRuntime());
  const [error, setError] = useState<string>();
  useEffect(() => { if (!active) runtime.current.stop(); return () => runtime.current.stop(); }, [active, model.channelId]);
  const enable = async () => {
    try { await runtime.current.unlock([model.scene.bgm?.proxyUrl, model.scene.ambience?.proxyUrl].filter((url): url is string => Boolean(url))); setError(undefined); }
    catch { runtime.current.stop(); setError('浏览器未能启用舞台音频，可稍后重试。'); }
  };
  return { enable, error, hasAudio: Boolean(model.scene.bgm || model.scene.ambience) };
}
