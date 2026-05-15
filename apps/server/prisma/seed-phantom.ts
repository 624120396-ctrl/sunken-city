import { PrismaClient } from '@prisma/client';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface YamlNode {
  nodeId: string;
  worldState: string;
  fallbackText: string;
  stageDirection: string;
  clues?: string[];
  npcs?: Array<{ name: string; dialogueHint: string }>;
  edges?: Array<{
    label: string;
    targetNodeId: string;
    condition?: string;
  }>;
}

async function main() {
  const yamlPath = process.argv[2] || '/tmp/seoul-work/phantom-scripts-demo-script-full.yaml';
  if (!fs.existsSync(yamlPath)) {
    console.error('YAML file not found:', yamlPath);
    process.exit(1);
  }

  const nodes = yaml.load(fs.readFileSync(yamlPath, 'utf8')) as YamlNode[];
  if (!Array.isArray(nodes)) {
    console.error('Invalid YAML: expected array of nodes');
    process.exit(1);
  }

  // 找一个作者（系统中第一个用户）
  const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!firstUser) {
    console.error('No user found in database. Cannot seed scenario.');
    process.exit(1);
  }

  const scenarioTitle = '画框囚徒';

  // 清理旧数据（如果存在）
  const existing = await prisma.scenario.findFirst({
    where: { title: scenarioTitle },
    include: { edges: true, nodes: true, sessions: true },
  });
  if (existing) {
    console.log('Removing existing scenario:', existing.id);
    // 由于外键级联删除，直接删 scenario 即可
    await prisma.scenario.delete({ where: { id: existing.id } });
  }

  // 1. 创建 Scenario
  const scenario = await prisma.scenario.create({
    data: {
      title: scenarioTitle,
      description: '一座废弃美术馆，一帧能呼吸的画作。调查员即是失踪画家本人。',
      authorId: firstUser.id,
      difficulty: 'NORMAL',
      estimatedDuration: 60,
      maxPlayers: 1,
      minPlayers: 1,
      supportsKPLess: true,
      supportsKPMode: false,
      status: 'PUBLISHED',
      version: 1,
      tags: 'solo,phantom,coc,module',
    },
  });
  console.log('Created scenario:', scenario.id);

  // 2. 创建 ScenarioNode
  const nodeRecords: Record<string, string> = {}; // key: nodeId#worldState -> dbId

  for (const n of nodes) {
    const metadata: any = {
      stageDirection: n.stageDirection,
      clues: n.clues || [],
      npcs: n.npcs || [],
    };

    const created = await prisma.scenarioNode.create({
      data: {
        scenarioId: scenario.id,
        nodeId: n.nodeId,
        worldState: n.worldState,
        title: n.nodeId,
        type: n.worldState === 'ending' ? 'ENDING' : n.worldState === 'system' ? 'SYSTEM' : 'STORY',
        content: n.fallbackText,
        metadata: JSON.stringify(metadata),
        positionX: 0,
        positionY: 0,
      },
    });

    const key = `${n.nodeId}#${n.worldState}`;
    nodeRecords[key] = created.id;
    console.log('Created node:', key, '->', created.id);
  }

  // 3. 创建 ScenarioEdge
  for (const n of nodes) {
    const fromKey = `${n.nodeId}#${n.worldState}`;
    const fromNodeId = nodeRecords[fromKey];
    if (!fromNodeId) {
      console.error('From node not found:', fromKey);
      continue;
    }

    for (const e of n.edges || []) {
      // 优先匹配同worldState的目标
      let toKey = `${e.targetNodeId}#${n.worldState}`;
      let toNodeId = nodeRecords[toKey];

      // 找不到则尝试 normal
      if (!toNodeId && n.worldState !== 'normal') {
        toKey = `${e.targetNodeId}#normal`;
        toNodeId = nodeRecords[toKey];
      }

      // 再尝试 corrupted（针对 corruption_check -> lobby_c 这种情况）
      if (!toNodeId && n.worldState !== 'corrupted') {
        toKey = `${e.targetNodeId}#corrupted`;
        toNodeId = nodeRecords[toKey];
      }

      // 再尝试 ending
      if (!toNodeId && n.worldState !== 'ending') {
        toKey = `${e.targetNodeId}#ending`;
        toNodeId = nodeRecords[toKey];
      }

      // 最后尝试 system
      if (!toNodeId && n.worldState !== 'system') {
        toKey = `${e.targetNodeId}#system`;
        toNodeId = nodeRecords[toKey];
      }

      if (!toNodeId) {
        console.error('Target node not found for edge:', fromKey, '->', e.targetNodeId);
        continue;
      }

      const conditions: any = {};
      if (e.condition) {
        conditions.expression = e.condition;
      }

      await prisma.scenarioEdge.create({
        data: {
          scenarioId: scenario.id,
          fromNodeId,
          toNodeId,
          type: e.condition ? 'CONDITIONAL' : 'DEFAULT',
          conditions: Object.keys(conditions).length ? JSON.stringify(conditions) : null,
          label: e.label,
          priority: 0,
          isDefault: !e.condition,
        },
      });
      console.log('Created edge:', fromKey, '->', e.targetNodeId, `(type=${e.condition ? 'CONDITIONAL' : 'DEFAULT'})`);
    }
  }

  // 4. 设置 startNode
  const startNodeKey = 'lobby#normal';
  const startNodeId = nodeRecords[startNodeKey];
  if (startNodeId) {
    await prisma.scenario.update({
      where: { id: scenario.id },
      data: { startNodeId },
    });
    console.log('Set startNode:', startNodeKey);
  } else {
    console.error('Start node not found!');
  }

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
