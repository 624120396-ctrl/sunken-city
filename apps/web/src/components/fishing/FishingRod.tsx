import { forwardRef } from 'react';

export const FishingRod = forwardRef<SVGCircleElement>((_, ref) => {
  return (
    <svg
      className="absolute top-8 left-8 w-32 h-64 pointer-events-none fishing-rod"
      viewBox="0 0 100 200"
      fill="none"
    >
      {/* handle */}
      <path d="M20 180 L25 200 L35 200 L30 180 Z" fill="#5c4033" />
      {/* rod body */}
      <path d="M25 180 Q30 100 80 20" stroke="#8b7355" strokeWidth="4" strokeLinecap="round" />
      {/* guides */}
      <circle cx="35" cy="150" r="2" fill="#a0a0a0" />
      <circle cx="45" cy="110" r="2" fill="#a0a0a0" />
      <circle cx="60" cy="70" r="2" fill="#a0a0a0" />
      {/* tip */}
      <circle ref={ref} cx="80" cy="20" r="3" fill="#c0c0c0" />
    </svg>
  );
});
