/**
 * 数据库种子脚本
 * 用于初始化样板剧本数据
 * 
 * 使用方式:
 * npx ts-node src/scripts/seed-scenario.ts
 */

import { prisma } from '../config/database';
import { sampleScenario } from '../data/sample-scenario';
import { ensureSystemUser } from './ensure-system-user';

async function seedScenario() {
  console.log('🌱 开始播种样板剧本数据...\n');

  try {
    // 0. 确保系统用户存在
    const authorId = await ensureSystemUser();

    // 1. 检查是否已存在同名剧本
    const existing = await prisma.scenario.findFirst({
      where: { title: sampleScenario.title },
    });

    if (existing) {
      console.log(`⚠️ 剧本 "${sampleScenario.title}" 已存在，跳过创建`);
      console.log(`   剧本ID: ${existing.id}`);
      return;
    }

    // 2. 创建剧本
    console.log('📖 创建剧本...');
    const scenario = await prisma.scenario.create({
      data: {
        title: sampleScenario.title,
        description: sampleScenario.description,
        coverImage: sampleScenario.coverImage,
        difficulty: sampleScenario.difficulty,
        estimatedDuration: sampleScenario.estimatedDuration,
        maxPlayers: sampleScenario.maxPlayers,
        minPlayers: sampleScenario.minPlayers,
        supportsKPLess: sampleScenario.supportsKPLess,
        supportsKPMode: sampleScenario.supportsKPMode,
        status: sampleScenario.status,
        version: sampleScenario.version,
        tags: sampleScenario.tags.join(','),
        era: sampleScenario.era,
        authorId: authorId,
      },
    });
    console.log(`✅ 剧本创建成功: ${scenario.id}`);

    // 3. 创建角色
    console.log('\n👥 创建角色...');
    for (const char of sampleScenario.characters) {
      await prisma.scenarioCharacter.create({
        data: {
          scenarioId: scenario.id,
          name: char.name,
          description: char.description,
          avatar: char.avatar,
          sprites: JSON.stringify(char.sprites),
        },
      });
      console.log(`  ✅ ${char.name}`);
    }

    // 4. 创建节点
    console.log('\n📍 创建剧情节点...');
    const nodeMap = new Map<string, string>(); // 用于映射旧ID到新ID

    for (const node of sampleScenario.nodes) {
      const created = await prisma.scenarioNode.create({
        data: {
          scenarioId: scenario.id,
          nodeId: node.nodeId,
          title: node.title,
          type: node.type,
          content: node.content,
          bgUrl: node.bgUrl,
          cgUrl: node.cgUrl,
          bgmUrl: node.bgmUrl,
          sfxUrl: node.sfxUrl,
          transitionType: node.transitionType,
          speakerId: node.speakerId,
          speakerExpression: node.speakerExpression,
        },
      });
      nodeMap.set(node.id, created.id);
      console.log(`  ✅ ${node.title} (${node.type})`);
    }

    // 5. 创建线索
    console.log('\n🔍 创建线索...');
    for (const clue of sampleScenario.clues) {
      await prisma.clue.create({
        data: {
          scenarioId: scenario.id,
          name: clue.name,
          description: clue.description,
          icon: clue.icon,
          type: clue.type,
          unlockCondition: JSON.stringify(clue.unlockCondition),
        },
      });
      console.log(`  ✅ ${clue.name}`);
    }

    // 6. 创建疑点（需要先找到正确的节点ID）
    console.log('\n❓ 创建疑点...');
    for (const doubt of sampleScenario.doubts) {
      const nodeDbId = nodeMap.get(doubt.nodeId);
      if (!nodeDbId) {
        console.warn(`  ⚠️ 找不到节点 ${doubt.nodeId}，跳过疑点 ${doubt.title}`);
        continue;
      }

      // 转换线索ID为数据库ID（这里简化处理，实际应该查询）
      const clueDbIds: string[] = [];
      
      await prisma.doubt.create({
        data: {
          scenarioId: scenario.id,
          nodeId: nodeDbId,
          title: doubt.title,
          description: doubt.description,
          requiredClueCount: doubt.requiredClueCount,
          correctClueIds: JSON.stringify(clueDbIds), // 简化：空数组，实际应该关联
          successNodeId: nodeMap.get(doubt.successNodeId) || '',
          failNodeId: nodeMap.get(doubt.failNodeId) || '',
          maxRetry: doubt.maxRetry,
          modePunishment: doubt.modePunishment
            ? JSON.stringify(doubt.modePunishment)
            : null,
        },
      });
      console.log(`  ✅ ${doubt.title}`);
    }

    // 7. 创建节点连接
    console.log('\n🔗 创建节点连接...');
    for (const edge of sampleScenario.edges) {
      const fromId = nodeMap.get(edge.from);
      const toId = nodeMap.get(edge.to);
      
      if (!fromId || !toId) {
        console.warn(`  ⚠️ 跳过无效连接: ${edge.from} -> ${edge.to}`);
        continue;
      }

      await prisma.scenarioEdge.create({
        data: {
          scenarioId: scenario.id,
          fromNodeId: fromId,
          toNodeId: toId,
          label: edge.label,
          type: 'NORMAL',
        },
      });
      console.log(`  ✅ ${edge.label}`);
    }

    console.log('\n🎉 样板剧本播种完成！');
    console.log(`\n剧本ID: ${scenario.id}`);
    console.log(`剧本名称: ${sampleScenario.title}`);
    console.log(`节点数量: ${sampleScenario.nodes.length}`);
    console.log(`角色数量: ${sampleScenario.characters.length}`);
    console.log(`线索数量: ${sampleScenario.clues.length}`);
    console.log(`疑点数量: ${sampleScenario.doubts.length}`);

  } catch (error) {
    console.error('\n❌ 播种失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  seedScenario()
    .then(() => {
      console.log('\n✨ 完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 错误:', error);
      process.exit(1);
    });
}

export { seedScenario };
