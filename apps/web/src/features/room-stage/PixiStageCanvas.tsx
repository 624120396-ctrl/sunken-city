import { useEffect, useRef, useState } from 'react';
import type { StageViewModel } from './stage-view-model';
import { mountPixiStage } from './PixiStageRuntime';

export function PixiStageCanvas({ model, onFallback }: { model: StageViewModel; onFallback: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!host.current || failed || !window.WebGLRenderingContext) { if (!window.WebGLRenderingContext) onFallback(); return; }
    let dispose: (() => void) | undefined;
    void mountPixiStage(host.current, model).then((cleanup) => { dispose = cleanup; }).catch(() => { setFailed(true); onFallback(); });
    return () => dispose?.();
  }, [failed, model, onFallback]);
  if (failed) return null;
  return <div className="room-stage-pixi" ref={host} aria-hidden="true" />;
}
