import { useState } from 'react';
import { useAuthStore } from '@stores/auth.store';
import { DEFAULT_BACKGROUND_ID, getBackgroundById } from './backgroundOptions';

export function AppBackground() {
  const preferredBackground = useAuthStore((state) => state.user?.preferredBackground);
  const [failed, setFailed] = useState(false);
  const selected = getBackgroundById(failed ? DEFAULT_BACKGROUND_ID : preferredBackground);

  return (
    <div className="coc-app-bg" aria-hidden="true">
      <div
        key={selected.id}
        className="coc-app-bg__image"
        style={{ backgroundImage: `url("${selected.url}")` }}
      >
        <img
          src={selected.url}
          alt=""
          className="hidden"
          onError={() => setFailed(true)}
          onLoad={() => setFailed(false)}
        />
      </div>
      <div className="coc-app-bg__veil" />
    </div>
  );
}
