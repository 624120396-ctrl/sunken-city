import { z } from 'zod';

export const startSoloSessionSchema = z.object({
  characterId: z.string().min(1, '角色卡ID不能为空'),
});

export const advanceNodeSchema = z.object({
  edgeId: z.string().min(1, '边ID不能为空'),
});

export const rollDiceSchema = z.object({
  skill: z.string().min(1, '技能名不能为空'),
  difficulty: z.number().int().min(1).max(99).default(50),
});

export const backtrackSchema = z.object({
  targetNodeId: z.string().min(1, '目标节点ID不能为空'),
  targetWorldState: z.string().default('normal'),
});

export const npcTalkSchema = z.object({
  npcIndex: z.number().int().min(0, 'NPC索引不能为负'),
  playerChoice: z.string().min(1, '玩家选择不能为空'),
});

export const unlockClueSchema = z.object({
  clue: z.string().min(1, '线索不能为空'),
});

export type NpcTalkInput = z.infer<typeof npcTalkSchema>;
export type UnlockClueInput = z.infer<typeof unlockClueSchema>;
