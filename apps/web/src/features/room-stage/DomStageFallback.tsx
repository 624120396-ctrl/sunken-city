import type { StageViewModel } from './stage-view-model';
import { resolveStageLayout } from './stage-layout';

export function DomStageFallback({ model }: { model: StageViewModel }) {
  const actors = resolveStageLayout(model.actors, 'mobile');
  return (
    <section className="room-stage-dom" aria-label={`舞台：${model.scene.title}`} data-stage-theme={model.scene.themePackId || 'system'}>
      {model.scene.background ? <img className="room-stage-dom__background" src={model.scene.background.proxyUrl} alt={`${model.scene.title}背景`} /> : <div className="room-stage-dom__system-bg" aria-hidden="true" />}
      <header className="room-stage-dom__header"><span>共享舞台</span><h3>{model.scene.title}</h3>{model.scene.description && <p>{model.scene.description}</p>}</header>
      <div className="room-stage-dom__actors" aria-live="polite">
        {actors.foreground.length === 0 ? <p>舞台暂时无人登场</p> : actors.foreground.map((actor) => <article key={actor.actorId} className="room-stage-dom__actor" data-zone={actor.zone}>
          {actor.portrait ? <img src={actor.portrait.proxyUrl} alt={`${actor.name}${actor.expression ? `，${actor.expression}` : ''}`} /> : <span className="room-stage-dom__silhouette" aria-label={`${actor.name}，系统剪影`} />}
          <b>{actor.name}</b>{actor.expression && <small>{actor.expression}</small>}{actor.action && <em>{actor.action}</em>}
        </article>)}{actors.background.length > 0 && <p className="room-stage-dom__backstage">后台仍有 {actors.background.map((actor) => actor.name).join('、')}</p>}
      </div>
    </section>
  );
}
