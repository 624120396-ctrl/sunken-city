const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const boards = [
  {
    key: 'lore',
    name: '密斯卡托尼克大学',
    description: '密大在考古学，神秘学，历史学，心理学等专业已然达到世界巅峰水平，学校每年吸引大量人才前来求学，然后再将其中一部分人输送进坟墓或者精神病院。【世界观研讨】',
    sortOrder: 0,
  },
  {
    key: 'strategy',
    name: '印斯茅斯镇',
    description: '每年在印斯茅斯和南极死去的调查员可以绕地球一圈。【跑团和模组交流】',
    sortOrder: 1,
  },
  {
    key: 'creative',
    name: '幻梦境',
    description: '沉睡之城中，每一个故事都是真实的谎言。【同人创作】',
    sortOrder: 2,
  },
  {
    key: 'tavern',
    name: '敦威治酒馆',
    description: '村口那间永远亮着油灯的木屋。\n本地人在这里交换流言、吹嘘冒险、抱怨天气，偶尔也低声讨论山谷深处的怪声。\n无关主线，不限话题——你可以发问、吐槽、分享跑团趣事，或者只是坐下来喝一杯。\n老板说这里没有酒单，想喝什么自己编。【闲聊】',
    sortOrder: 3,
  },
  {
    key: 'arkham_hall',
    name: '阿卡姆市政厅',
    description: '全镇唯一的官方事务办理处。\n公告在此张贴，BUG在此上报，使用问题在此申诉——请按秩序排队，勿向接待员提及你昨晚梦见的深潜者。\n办事效率受不可名状之力影响，请耐心等待。',
    sortOrder: 4,
  },
];

async function main() {
  for (const b of boards) {
    await prisma.forumBoard.upsert({
      where: { key: b.key },
      update: {
        name: b.name,
        description: b.description,
        sortOrder: b.sortOrder,
      },
      create: b,
    });
  }
  console.log('Forum boards updated.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
