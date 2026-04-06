const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ where: { NOT: { avatarUrl: null } }, take: 5, select: { avatarUrl: true } })
  .then(r => { console.log(JSON.stringify(r, null, 2)); return p.$disconnect(); })
  .catch(e => { console.error(e); process.exit(1); });
