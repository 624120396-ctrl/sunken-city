const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const scenario = await prisma.scenario.findFirst({ where: { title: '画框囚徒' } });
  const nodes = await prisma.scenarioNode.findMany({
    where: { scenarioId: scenario.id, nodeId: 'secret_garden' },
    include: { outgoingEdges: { include: { toNode: true } } }
  });
  for (const n of nodes) {
    console.log(`Node ${n.id} (ws=${n.worldState}) has ${n.outgoingEdges.length} edges:`);
    for (const e of n.outgoingEdges) {
      console.log(`  -> ${e.toNode.nodeId}#${e.toNode.worldState} | ${e.label} | ${e.type} | cond=${e.conditions}`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
