import { PrismaClient } from '@prisma/client';
import { COC7_OCCUPATIONS } from '../dist/data/occupations.js';

const prisma = new PrismaClient();

async function main() {
  for (const occ of COC7_OCCUPATIONS) {
    await prisma.occupation.upsert({
      where: { key: occ.key },
      update: {
        name: occ.name,
        nameEn: occ.nameEn,
        description: occ.description,
        category: occ.category,
        skillPointFormula: occ.skillPointFormula,
        creditRatingMin: occ.creditRatingMin,
        creditRatingMax: occ.creditRatingMax,
        coreSkills: JSON.stringify(occ.coreSkills),
        electiveSkills: JSON.stringify(
          occ.electivePool
            ? { pool: occ.electivePool, count: occ.electiveCount, description: occ.electiveDescription }
            : { description: occ.electiveDescription, count: occ.electiveCount }
        ),
      },
      create: {
        key: occ.key,
        name: occ.name,
        nameEn: occ.nameEn,
        description: occ.description,
        category: occ.category,
        skillPointFormula: occ.skillPointFormula,
        creditRatingMin: occ.creditRatingMin,
        creditRatingMax: occ.creditRatingMax,
        coreSkills: JSON.stringify(occ.coreSkills),
        electiveSkills: JSON.stringify(
          occ.electivePool
            ? { pool: occ.electivePool, count: occ.electiveCount, description: occ.electiveDescription }
            : { description: occ.electiveDescription, count: occ.electiveCount }
        ),
      },
    });
  }
  console.log(`已同步 ${COC7_OCCUPATIONS.length} 个职业模板到数据库`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
