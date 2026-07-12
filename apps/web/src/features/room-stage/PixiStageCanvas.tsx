import { useEffect, useRef, useState } from 'react';
import type { StageViewModel } from './stage-view-model';
import { mountPixiStage } from './PixiStageRuntime';

export function PixiStageCanvas({ model, onFallback }: { model: StageViewModel; onFallback: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!host.current || failed || !window.WebGLRenderingContext) { if (!window.WebGLRenderingContext) onFallback(); return; }
    let dispose: (() => void) | undefined;
    let cancelled = false;
    const contextLost = (event: Event) => { event.preventDefault(); setFailed(true); onFallback(); };
    host.current.addEventListener('webglcontextlost', contextLost);
    void mountPixiStage(host.current, model).then((cleanup) => { if (cancelled) cleanup(); else dispose = cleanup; }).catch(() => { if (!cancelled) { setFailed(true); onFallback(); } });
    return () => { cancelled = true; host.current?.removeEventListener('webglcontextlost', contextLost); dispose?.(); };
  }, [failed, model, onFallback]);
  if (failed) return null;
  return <div className="room-stage-pixi" ref={host} aria-hidden="true" />;
}
