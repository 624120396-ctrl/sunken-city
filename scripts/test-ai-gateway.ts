import * as fs from 'fs';
import * as path from 'path';

type Provider = 'volcengine' | 'glm5' | 'hunyuan' | 'seed20';

async function main() {
  let provider: Provider = 'volcengine';
  if (process.argv.includes('--provider=glm5')) provider = 'glm5';
  if (process.argv.includes('--provider=hunyuan')) provider = 'hunyuan';
  if (process.argv.includes('--provider=seed20')) provider = 'seed20';

  if (provider === 'glm5') {
    if (!process.env.GLM5_API_KEY) {
      console.error('错误：缺少环境变量 GLM5_API_KEY');
      process.exit(1);
    }
  } else if (provider === 'hunyuan') {
    if (!process.env.HUNYUAN_API_KEY) {
      console.error('错误：缺少环境变量 HUNYUAN_API_KEY');
      process.exit(1);
    }
  } else if (provider === 'seed20') {
    if (!process.env.SEED20_API_KEY && !process.env.ARK_API_KEY) {
      console.error('错误：缺少环境变量 SEED20_API_KEY 或 ARK_API_KEY');
      process.exit(1);
    }
  } else {
    if (!process.env.ARK_API_KEY) {
      console.error('错误：缺少环境变量 ARK_API_KEY');
      console.error('请运行：export ARK_API_KEY=9c948a84-5209-44a9-adbe-d3af9b0d35ea');
      process.exit(1);
    }
  }

  const mode = process.argv.find(a => !a.startsWith('--provider=')) || 'default';

  const gateway = await import(
    provider === 'glm5'
      ? '../apps/server/src/utils/glm5-gateway.js'
      : provider === 'hunyuan'
      ? '../apps/server/src/utils/hunyuan-gateway.js'
      : provider === 'seed20'
      ? '../apps/server/src/utils/seed20-gateway.js'
      : '../apps/server/src/utils/ai-gateway.js'
  );

  if (mode === 'schema') {
    const schemaPath = path.resolve(__dirname, '../apps/server/prisma/schema.prisma');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const sampleRoute = path.resolve(__dirname, '../apps/server/src/modules/admin/admin.routes.ts');
    const routeCode = fs.readFileSync(sampleRoute, 'utf8').slice(0, 3000);

    console.log(`正在使用 ${provider} 审查 schema.prisma 的潜在风险...`);
    const result = await gateway.reviewPrismaSchemaChange(
      '// 旧版本（假设无 displayedCharacterId）',
      schema,
      routeCode
    );
    console.log('\n=== 审查结果 ===\n');
    console.log(result);
    return;
  }

  if (mode === 'test') {
    const routePath = path.resolve(__dirname, '../apps/server/src/modules/dice/dice.routes.ts');
    const routeCode = fs.readFileSync(routePath, 'utf8');

    console.log(`正在使用 ${provider} 为 dice.routes.ts 生成测试用例...`);
    const result = await gateway.generateRouteTests(routeCode);
    console.log('\n=== 生成的测试代码 ===\n');
    console.log(result);
    return;
  }

  if (mode === 'frontend') {
    const pagePath = path.resolve(__dirname, '../apps/web/src/pages/characters/CharacterDetailPage.tsx');
    const source = fs.readFileSync(pagePath, 'utf8');

    console.log(`正在使用 ${provider} 诊断 CharacterDetailPage 技能名称显示问题...`);
    const result = await gateway.diagnoseFrontendIssue(
      source,
      '调查员档案中的技能名称显示可能有异常，请全面检查渲染逻辑、数据解析、构建产物问题。'
    );
    console.log('\n=== 诊断结果 ===\n');
    console.log(result);
    return;
  }

  // 默认：简单对话测试
  if (provider === 'hunyuan') {
    console.log(`正在通过 ${provider} 发送 NPC 对话测试请求...`);
    const result = await gateway.generateNpcDialogue({
      npcName: '老约翰',
      npcProfile: '阿卡姆镇旧书店的老板，表面和善，实则知晓大量禁忌知识。',
      npcMood: '警惕但好奇',
      sceneContext: '昏暗的旧书店，霉味与旧纸张的气息混杂',
      recentDialogue: '玩家：我在找一本关于星象的古书。',
      playerMessage: '这本书对我很重要，有人告诉我你这里可能有。',
    });
    console.log('\n=== NPC 对话测试结果 ===\n');
    console.log(result);
    return;
  }

  if (provider === 'seed20') {
    console.log(`正在通过 ${provider} 发送 KP 助手测试请求...`);
    const result = await gateway.kpAssistant({
      sceneName: '废弃的医院地下室',
      sceneDesc: '潮湿的空气中弥漫着福尔马林与腐烂混合的气味。走廊尽头传来滴答的水声，一盏忽明忽暗的荧光灯下，有一扇被铁链锁住的门。',
      recentLogs: '雷·克尔杰：我检查了一下门锁，看起来锈迹斑斑。\n艾克夏：让我来，我学过一些机械知识。\n[艾克夏投掷锁匠技能，失败]\n雷·克尔杰：没时间了，我直接踹门！',
      characters: [
        { name: '雷·克尔杰', occupation: '退役军人', keySkills: '格斗 75、力量 80', currentHp: 12, currentSan: 55 },
        { name: '艾克夏', occupation: '机械师', keySkills: '锁匠 60、侦查 70', currentHp: 10, currentSan: 60 },
      ],
      playerAction: '雷·克尔杰决定用肩膀撞开被铁链锁住的门。',
    });
    console.log('\n=== KP 助手测试结果 ===\n');
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`正在通过 ${provider} 发送默认测试请求...`);
  const result = await gateway.codingChat([{ role: 'user', content: '你好，请确认 API 连接正常' }]);
  console.log('\n=== 默认测试结果 ===\n');
  console.log(result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
