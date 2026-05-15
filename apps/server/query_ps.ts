import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const scenario = await prisma.scenario.findFirst({ where: { title: '画框囚徒' } });
  if (!scenario) { console.log('Scenario not found'); return; }
  const nodes = await prisma.scenarioNode.findMany({ where: { scenarioId: scenario.id }, orderBy: { nodeId: 'asc' } });
  console.log('=== Nodes ===');
  for (const n of nodes) { console.log(`${n.nodeId}#${n.worldState} | ${n.title} | ${n.type}`); }
  const edges = await prisma.scenarioEdge.findMany({ where: { scenarioId: scenario.id }, include: { fromNode: true, toNode: true } });
  console.log('=== Edges ===');
  for (const e of edges) { console.log(`${e.fromNode.nodeId}#${e.fromNode.worldState} -> ${e.toNode.nodeId}#${e.toNode.worldState} | ${e.label} | ${e.type}`); }
}
main().catch(console.error).finally(() => prisma.$disconnect());
