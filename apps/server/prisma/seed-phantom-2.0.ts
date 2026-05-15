import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const scenario = await prisma.scenario.findFirst({ where: { title: '画框囚徒' } });
  if (!scenario) {
    console.error('❌ Scenario "画框囚徒" not found. Please run base seed first.');
    process.exit(1);
  }
  const scenarioId = scenario.id;

  // 1. Upsert Items
  const items = [
    {
      key: 'sedative',
      name: '镇定剂',
      type: 'consumable',
      effects: JSON.stringify([
        { target: 'san', operation: 'add', value: 5 },
        { target: 'corruption', operation: 'sub', value: 3 }
      ]),
      usableAt: JSON.stringify(['any']),
      description: '注射后短暂恢复理智，降低侵蚀值。',
      iconUrl: null
    },
    {
      key: 'broken_pocket_watch',
      name: '破损的怀表',
      type: 'key',
      effects: JSON.stringify([
        { target: 'checkpointFlags', operation: 'add', value: 'watch_used' }
      ]),
      usableAt: JSON.stringify(['greenhouse', 'corruption_check']),
      description: '指针停滞的旧怀表，蕴含微弱的意志豁免力量。',
      iconUrl: null
    }
  ];

  for (const item of items) {
    const existing = await prisma.scenarioItem.findFirst({ where: { scenarioId, key: item.key } });
    if (existing) {
      await prisma.scenarioItem.update({ where: { id: existing.id }, data: item });
      console.log(`🔄 Updated item: ${item.name}`);
    } else {
      await prisma.scenarioItem.create({ data: { ...item, scenarioId } });
      console.log(`➕ Created item: ${item.name}`);
    }
  }

  const promptSuffix = ", dark fantasy RPG scene illustration, cinematic composition, muted earthy tones with subtle crimson accents, chiaroscuro lighting, heavy oil painting texture, subtle horror atmosphere, atmospheric fog, highly detailed, no text, no UI, no watermark, 16:9 aspect ratio";

  // 2. Upsert node metadata (sceneImagePrompt)
  const nodeUpdates = [
    {
      nodeId: 'start',
      metadata: {
        sceneImagePrompt: "A dark gallery at midnight, moonlight cutting through tall windows, empty picture frames hanging crooked on velvet walls" + promptSuffix
      }
    },
    {
      nodeId: 'greenhouse',
      metadata: {
        sceneImagePrompt: "A Victorian greenhouse overtaken by twisted vines and rusted iron frames, strange bioluminescent flowers blooming in the dark, humid mist" + promptSuffix,
        clues: ['温室笔记']
      }
    },
    {
      nodeId: 'archive',
      metadata: {
        sceneImagePrompt: "Half-open iron cabinets and scattered letters, yellowed papers stacked, pale desk lamp illuminating 'blood and pigment' paragraph, flickering shadows" + promptSuffix,
        clues: ['画家手稿']
      }
    },
    {
      nodeId: 'corruption_check',
      metadata: {
        sceneImagePrompt: "Fingertips touching canvas, pigment crawling up arm like veins, sharp tinnitus visualized, flickering lights" + promptSuffix
      }
    },
    {
      nodeId: 'portrait_room',
      metadata: {
        sceneImagePrompt: "A grand salon with unfinished portraits on easels, eyes in the paintings seem to follow you, dust motes dancing in shafts of pale light" + promptSuffix
      }
    },
    {
      nodeId: 'mirror_hall',
      metadata: {
        sceneImagePrompt: "An endless corridor of cracked mirrors, each reflecting a slightly wrong version of the viewer, distant whispers from the glass" + promptSuffix
      }
    },
    {
      nodeId: 'secret_archive',
      metadata: {
        sceneImagePrompt: "Hidden cellar behind a false wall, rows of bound journals, a single candle burning with a violet flame" + promptSuffix
      }
    },
    {
      nodeId: 'landscape_room',
      metadata: {
        sceneImagePrompt: "Walls painted with impossible landscapes, the horizon bleeding into the ceiling, a palette knife embedded in the wooden floor" + promptSuffix
      }
    },
    {
      nodeId: 'exit_door',
      metadata: {
        sceneImagePrompt: "An ornate wooden door set in a crumbling plaster wall, light streaming from the cracks, dead roses piled at the threshold" + promptSuffix
      }
    }
  ];

  for (const n of nodeUpdates) {
    for (const worldState of ['normal', 'corrupted']) {
      const existing = await prisma.scenarioNode.findFirst({ where: { scenarioId, nodeId: n.nodeId, worldState } });
      if (existing) {
        const currentMeta = typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : (existing.metadata || {});
        const newMeta = { ...currentMeta, ...n.metadata };
        await prisma.scenarioNode.update({
          where: { id: existing.id },
          data: { metadata: JSON.stringify(newMeta), generatedImageUrl: null }
        });
        console.log(`🔄 Updated node: ${n.nodeId}#${worldState}`);
      } else {
        console.warn(`⚠️ Node not found: ${n.nodeId}#${worldState}`);
      }
    }
  }

  // 3. Upsert secret_garden node
  const secretGardenMeta = {
    stageDirection: "镜头缓缓扫过这片由不可能几何构成的花园。荆棘以违背引力的角度向上生长，在空中编织成巨大的笼状结构。一束不知来源的冷光落在石台上，照亮那半截炭笔与干涸的调色盘。守画人的身影在雾气中若隐若现，仿佛他本身就是这幅未完成的画作中最潦草的一笔。",
    sceneImagePrompt: "Geometric plants forming a natural cage, an old palette and charcoal on a central stone altar, eerie blue mist, surreal dark tone" + promptSuffix,
    npcs: [{
      name: '守画人',
      profile: '一位披着褪色斗篷的静默身影，他的面容似乎永远笼罩在阴影中。',
      mood: '审视',
      dialogueRounds: [
        {
          playerOptions: ['你是什么人？', '这里是什么地方？'],
          npcReplies: [
            '守画人没有立刻回答，只是缓缓抬起一只苍白的手，指向石台上的调色盘。',
            '他的声音仿佛从很远的地方传来："这里是未完成的角落，是所有画作不愿承认的背面。"'
          ]
        },
        {
          playerOptions: ['我要怎么离开？', '画框囚徒是什么意思？'],
          npcReplies: [
            '守画人微微侧头："离开？真正的门不在画框之外，而在你愿意承认的那一笔之中。"',
            '他的嘴角似乎抽动了一下，那几乎是个微笑："每个人最终都会成为自己故事的一部分，不是吗？"'
          ]
        }
      ]
    }]
  };

  for (const worldState of ['normal', 'corrupted']) {
    const existing = await prisma.scenarioNode.findFirst({ where: { scenarioId, nodeId: 'secret_garden', worldState } });
    if (!existing) {
      await prisma.scenarioNode.create({
        data: {
          scenarioId,
          nodeId: 'secret_garden',
          worldState,
          title: '秘密花园',
          type: 'STORY',
          content: worldState === 'corrupted'
            ? '植物变成了尖锐的几何刺，石台上 palette 里的颜料干涸成黑色血块。守画人伫立在阴影中，仿佛一尊被遗弃的雕像。'
            : '扭曲的几何植物构成天然牢笼，中央石台上放着画家的调色盘与半截炭笔。空气中有松节油与旧血混合的气味。',
          metadata: JSON.stringify(secretGardenMeta),
          positionX: 0,
          positionY: 0
        }
      });
      console.log(`➕ Created node: secret_garden#${worldState}`);
    } else {
      await prisma.scenarioNode.update({
        where: { id: existing.id },
        data: { metadata: JSON.stringify(secretGardenMeta), generatedImageUrl: null }
      });
      console.log(`🔄 Updated node: secret_garden#${worldState}`);
    }
  }

  // 4. Create edges with attribute thresholds
  const nodesMap: Record<string, string | null> = {};

  const nodeQueries = [
    { key: 'greenhouse#normal', nodeId: 'greenhouse', worldState: 'normal' },
    { key: 'greenhouse#corrupted', nodeId: 'greenhouse_c', worldState: 'corrupted' },
    { key: 'archive#normal', nodeId: 'archive', worldState: 'normal' },
    { key: 'archive#corrupted', nodeId: 'archive_c', worldState: 'corrupted' },
    { key: 'secret_garden#normal', nodeId: 'secret_garden', worldState: 'normal' },
    { key: 'secret_garden#corrupted', nodeId: 'secret_garden', worldState: 'corrupted' },
    { key: 'finale_normal#normal', nodeId: 'finale_normal', worldState: 'normal' },
    { key: 'finale_corrupted#corrupted', nodeId: 'finale_corrupted', worldState: 'corrupted' },
    { key: 'corruption_check#system', nodeId: 'corruption_check', worldState: 'system' },
    { key: 'ending_A#ending', nodeId: 'ending_A', worldState: 'ending' },
    { key: 'ending_B#ending', nodeId: 'ending_B', worldState: 'ending' },
    { key: 'ending_C#ending', nodeId: 'ending_C', worldState: 'ending' },
  ];

  for (const q of nodeQueries) {
    const n = await prisma.scenarioNode.findFirst({ where: { scenarioId, nodeId: q.nodeId, worldState: q.worldState } });
    nodesMap[q.key] = n?.id || null;
  }

  const edgeDefs: Array<any> = [];

  const addEdge = (fromKey: string, toKey: string, label: string, conditions: object, type = 'CONDITIONAL', priority = 10, runtimeChanges?: any[]) => {
    const fromId = nodesMap[fromKey];
    const toId = nodesMap[toKey];
    if (!fromId || !toId) {
      console.warn(`⚠️ Skip edge ${label}: missing node ${fromKey} -> ${toKey}`);
      return;
    }
    edgeDefs.push({
      fromNodeId: fromId,
      toNodeId: toId,
      label,
      conditions: JSON.stringify(conditions),
      type,
      priority,
      isDefault: false
    });
  };

  // greenhouse -> secret_garden
  for (const ws of ['normal', 'corrupted']) {
    addEdge(
      `greenhouse#${ws}`,
      `secret_garden#${ws}`,
      '暴力破门（需力量≥50）',
      {
        conditions: [{ field: 'character.STR', operator: '>=', value: 50 }],
        runtimeChanges: [{ target: 'hp', operation: 'sub', value: 2 }]
      },
      'CONDITIONAL',
      10
    );
    addEdge(
      `greenhouse#${ws}`,
      `secret_garden#${ws}`,
      '使用破损的怀表',
      {
        conditions: [{ field: 'inventory', operator: 'includes', value: 'broken_pocket_watch' }]
      },
      'CONDITIONAL',
      20
    );
  }

  // archive -> secret_garden
  for (const ws of ['normal', 'corrupted']) {
    addEdge(
      `archive#${ws}`,
      `secret_garden#${ws}`,
      '解析密码规律（需智力≥60）',
      {
        conditions: [{ field: 'character.INT', operator: '>=', value: 60 }],
        stateChanges: [{ variable: 'corruption', operation: 'sub', value: 2 }],
        runtimeChanges: [{ target: 'san', operation: 'add', value: 3 }]
      },
      'CONDITIONAL',
      10
    );
  }

  // secret_garden -> archive (return edges)
  for (const ws of ['normal', 'corrupted']) {
    const targetKey = ws === 'normal' ? 'archive#normal' : 'archive#corrupted';
    addEdge(
      `secret_garden#${ws}`,
      targetKey,
      ws === 'normal' ? '带着线索返回档案室' : '退回阴影之中',
      {},
      'DEFAULT',
      0
    );
  }

  for (const edge of edgeDefs) {
    const existing = await prisma.scenarioEdge.findFirst({
      where: { fromNodeId: edge.fromNodeId, toNodeId: edge.toNodeId, label: edge.label }
    });
    if (existing) {
      await prisma.scenarioEdge.update({ where: { id: existing.id }, data: edge });
      console.log(`🔄 Updated edge: ${edge.label}`);
    } else {
      await prisma.scenarioEdge.create({ data: { ...edge, scenarioId } });
      console.log(`➕ Created edge: ${edge.label}`);
    }
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
