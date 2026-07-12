import type { StageViewModel } from './stage-view-model';
import { resolveStageLayout } from './stage-layout';

export async function mountPixiStage(container: HTMLElement, model: StageViewModel) {
  const { Application, Container, Graphics, Text } = await import('pixi.js');
  const app = new Application();
  await app.init({ resizeTo: container, background: '#071217', antialias: true });
  container.replaceChildren(app.canvas);
  const scene = new Container();
  const background = new Graphics().rect(0, 0, app.renderer.width, app.renderer.height).fill('#0e2930');
  scene.addChild(background);
  scene.addChild(new Text({ text: model.scene.title, style: { fill: '#f4dfab', fontSize: 24 } }));
  const layout = resolveStageLayout(model.actors, 'desktop');
  layout.foreground.forEach((actor, index) => scene.addChild(new Text({ text: actor.name, style: { fill: '#f4dfab', fontSize: 17 }, x: 44 + index * 130, y: app.renderer.height - 64 })));
  if (layout.background.length) scene.addChild(new Text({ text: `后台：${layout.background.map((actor) => actor.name).join('、')}`, style: { fill: '#c5b58a', fontSize: 12 }, x: 16, y: 42 }));
  app.stage.addChild(scene);
  return () => app.destroy({ removeView: true }, { children: true });
}
