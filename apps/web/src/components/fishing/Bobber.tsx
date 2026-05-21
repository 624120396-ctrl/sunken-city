import { forwardRef } from 'react';

interface BobberProps {
  state: 'idle' | 'casting' | 'waiting' | 'biting' | 'reeling' | 'result';
}

export const Bobber = forwardRef<HTMLDivElement, BobberProps>(({ state }, ref) => {
  const isBiting = state === 'biting';
  const isWaiting = state === 'waiting' || state === 'casting';
  const hidden = state === 'idle' || state === 'result';

  return (
    <div
      ref={ref}
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 fishing-bobber ${
        isBiting ? 'biting' : isWaiting ? 'floating' : ''
      } ${hidden ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="bobber-body" />
      {isBiting && (
        <>
          <div className="ripple-ring ring-1" />
          <div className="ripple-ring ring-2" />
          <div className="ripple-ring ring-3" />
        </>
      )}
    </div>
  );
});
