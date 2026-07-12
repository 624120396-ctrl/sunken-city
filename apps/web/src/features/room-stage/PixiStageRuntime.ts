import type { StageViewModel } from './stage-view-model';

export async function mountPixiStage(container: HTMLElement, model: StageViewModel) {
  const { Application, Container, Graphics, Text } = await import('pixi.js');
  const app = new Application();
  await app.init({ resizeTo: container, background: '#071217', antialias: true });
  container.replaceChildren(app.canvas);
  const scene = new Container();
  const background = new Graphics().rect(0, 0, app.renderer.width, app.renderer.height).fill('#0e2930');
  scene.addChild(background);
  scene.addChild(new Text({ text: model.scene.title, style: { fill: '#f4dfab', fontSize: 24 } }));
  model.actors.filter((actor) => actor.entered).forEach((actor, index) => scene.addChild(new Text({ text: actor.name, style: { fill: '#f4dfab', fontSize: 17 }, x: 44 + index * 130, y: app.renderer.height - 64 })));
  app.stage.addChild(scene);
  return () => app.destroy({ removeView: true }, { children: true });
}
