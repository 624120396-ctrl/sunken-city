import { useEffect, useRef } from 'react';

interface FishingLineProps {
  rodTipRef: React.RefObject<SVGCircleElement>;
  bobberRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  state: string;
}

export function FishingLine({ rodTipRef, bobberRef, containerRef, state }: FishingLineProps) {
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    let rafId = 0;

    const updatePath = () => {
      if (!pathRef.current || !rodTipRef.current || !bobberRef.current || !containerRef.current) {
        rafId = requestAnimationFrame(updatePath);
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const rodRect = rodTipRef.current.getBoundingClientRect();
      const bobberRect = bobberRef.current.getBoundingClientRect();

      const x1 = rodRect.left + rodRect.width / 2 - containerRect.left;
      const y1 = rodRect.top + rodRect.height / 2 - containerRect.top;
      const x2 = bobberRect.left + bobberRect.width / 2 - containerRect.left;
      const y2 = bobberRect.top + bobberRect.height / 2 - containerRect.top;

      const cx = (x1 + x2) / 2;
      const sag = state === 'idle' || state === 'result' ? 0 : state === 'reeling' ? 5 : 40;
      const cy = (y1 + y2) / 2 + sag;

      pathRef.current.setAttribute('d', `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);
      rafId = requestAnimationFrame(updatePath);
    };

    rafId = requestAnimationFrame(updatePath);
    return () => cancelAnimationFrame(rafId);
  }, [rodTipRef, bobberRef, containerRef, state]);

  return (
    <svg className="absolute inset-0 pointer-events-none fishing-line-svg">
      <path ref={pathRef} stroke="rgba(200,200,200,0.3)" strokeWidth="1.5" fill="none" />
    </svg>
  );
}
