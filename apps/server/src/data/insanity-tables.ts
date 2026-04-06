// COC7e 临时疯狂表（1D10 小时效果）
// 基于克苏鲁的呼唤第七版快速开始规则与标准调查员手册

export interface TemporaryInsanityEntry {
  roll: number;
  name: string;
  description: string;
  durationDice: string; // 固定为 1D10 小时
}

export const TEMPORARY_INSANITY_TABLE: TemporaryInsanityEntry[] = [
  {
    roll: 1,
    name: '失忆',
    description: '调查员陷入五内俱焚的失忆。他无法记起自己的身份、身处何地，以及任何与调查员生涯有关的事情。',
    durationDice: '1D10',
  },
  {
    roll: 2,
    name: '假性残疾',
    description: '调查员陷入了心理性的失明、失聪或躯体功能丧失。该残疾可能持续数小时。',
    durationDice: '1D10',
  },
  {
    roll: 3,
    name: '狂暴',
    description: '调查员陷入无法控制的愤怒与暴力冲动，可能攻击最近的盟友或周遭的物件。',
    durationDice: '1D10',
  },
  {
    roll: 4,
    name: '偏执',
    description: '调查员变得极度多疑，认为所有人都在针对自己，甚至最亲近的同伴也不可信。',
    durationDice: '1D10',
  },
  {
    roll: 5,
    name: '人际依赖',
    description: '调查员不可抑制地依恋身边的某一个人，将其视为精神支柱，若分离则陷入崩溃。',
    durationDice: '1D10',
  },
  {
    roll: 6,
    name: '昏厥',
    description: '调查员当即昏倒在地，持续至症状结束或受到严重惊扰。',
    durationDice: '1D10',
  },
  {
    roll: 7,
    name: '逃避行为',
    description: '调查员不顾一切逃离现场，尽全力远离所有与当前恐怖相关的事物，哪怕身处绝境。',
    durationDice: '1D10',
  },
  {
    roll: 8,
    name: '歇斯底里',
    description: '调查员大笑、哭泣、尖叫，或做出任何不受控制的戏剧性行为，无法正常思考。',
    durationDice: '1D10',
  },
  {
    roll: 9,
    name: '恐惧',
    description: '调查员患上一种新的恐惧症。每当面对恐惧源时，需进行理智检定否则逃离。',
    durationDice: '1D10',
  },
  {
    roll: 10,
    name: '躁狂',
    description: '调查员患上一种新的躁狂症。无法抑制地沉溺于某种行为或执念，置其他事务于不顾。',
    durationDice: '1D10',
  },
];

export function rollD10(): number {
  return Math.floor(Math.random() * 10) + 1;
}

export function getTemporaryInsanity(roll: number): TemporaryInsanityEntry {
  const entry = TEMPORARY_INSANITY_TABLE.find(e => e.roll === roll);
  return entry || TEMPORARY_INSANITY_TABLE[0];
}
