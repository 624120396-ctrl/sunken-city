import { ScenarioNode, ScenarioEdge } from '@prisma/client';

interface Condition {
  operator: '===' | '!==' | '>' | '<' | '>=' | '<=' | 'includes' | 'and' | 'or';
  field: string;
  value: unknown;
  conditions?: Condition[];
}

interface ConditionalText {
  condition: Condition;
  text: string;
}

interface NodeMetadata {
  conditionalTexts?: ConditionalText[] | string;
  [key: string]: unknown;
}

interface EdgeCondition {
  conditions?: Condition[];
  [key: string]: unknown;
}

function getFieldValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

export function evalCondition(
  condition: Condition,
  globalState: Record<string, unknown>,
): boolean {
  const { operator } = condition;

  if (operator === 'and') {
    const conditions = condition.conditions || [];
    if (conditions.length === 0) return true;
    return conditions.every((c) => evalCondition(c, globalState));
  }

  if (operator === 'or') {
    const conditions = condition.conditions || [];
    if (conditions.length === 0) return false;
    return conditions.some((c) => evalCondition(c, globalState));
  }

  const { field, value } = condition;
  const fieldValue = getFieldValue(globalState, field);

  switch (operator) {
    case '===':
      return fieldValue === value;
    case '!==':
      return fieldValue !== value;
    case '>':
      if (typeof fieldValue !== 'number' || typeof value !== 'number') return false;
      return fieldValue > value;
    case '<':
      if (typeof fieldValue !== 'number' || typeof value !== 'number') return false;
      return fieldValue < value;
    case '>=':
      if (typeof fieldValue !== 'number' || typeof value !== 'number') return false;
      return fieldValue >= value;
    case '<=':
      if (typeof fieldValue !== 'number' || typeof value !== 'number') return false;
      return fieldValue <= value;
    case 'includes':
      if (Array.isArray(fieldValue)) return fieldValue.includes(value);
      if (typeof fieldValue === 'string' && typeof value === 'string') return fieldValue.includes(value);
      return false;
    default:
      return false;
  }
}

export function evaluateConditionalTexts(
  node: ScenarioNode,
  globalState: Record<string, unknown>,
): string {
  const content = node.content || '';
  const metadata = node.metadata as NodeMetadata | string | null;

  if (!metadata) {
    return content;
  }

  let parsedMetadata: NodeMetadata;
  if (typeof metadata === 'string') {
    try {
      parsedMetadata = JSON.parse(metadata) as NodeMetadata;
    } catch {
      return content;
    }
  } else {
    parsedMetadata = metadata;
  }

  const conditionalTexts = parsedMetadata.conditionalTexts;
  if (!conditionalTexts || !Array.isArray(conditionalTexts)) {
    return content;
  }

  for (const ct of conditionalTexts) {
    if (!ct.condition || !ct.text) continue;
    if (evalCondition(ct.condition as Condition, globalState)) {
      return content + ct.text;
    }
  }

  return content;
}

export function filterVisibleEdges(
  edges: ScenarioEdge[],
  globalState: Record<string, unknown>,
): ScenarioEdge[] {
  return edges.filter((edge) => {
    const rawConditions = edge.conditions as string | null | object;

    if (!rawConditions) {
      return true;
    }

    let parsedCondition: EdgeCondition;
    if (typeof rawConditions === 'string') {
      try {
        parsedCondition = JSON.parse(rawConditions) as EdgeCondition;
      } catch {
        return true;
      }
    } else {
      parsedCondition = rawConditions as EdgeCondition;
    }

    const conditions = parsedCondition.conditions;
    if (!conditions || conditions.length === 0) {
      return true;
    }

    return conditions.every((c) => evalCondition(c, globalState));
  });
}

export interface CharacterEvaluationData {
  str: number;
  con: number;
  siz: number;
  dex: number;
  app: number;
  int: number;
  pow: number;
  edu: number;
  luck: number;
  skills: Record<string, number>;
}

export interface RuntimeEvaluationData {
  hp: number;
  mp: number;
  san: number;
  maxHp: number;
  maxMp: number;
  maxSan: number;
}

export function buildEvaluationContext(
  globalState: Record<string, unknown>,
  character?: CharacterEvaluationData | null,
  runtimeState?: RuntimeEvaluationData | null
): Record<string, unknown> {
  const context: Record<string, unknown> = { ...globalState };

  if (character) {
    context.character = {
      STR: character.str,
      CON: character.con,
      SIZ: character.siz,
      DEX: character.dex,
      APP: character.app,
      INT: character.int,
      POW: character.pow,
      EDU: character.edu,
      LUCK: character.luck,
      skills: character.skills,
    };
  }

  if (runtimeState) {
    context.runtime = {
      HP: runtimeState.hp,
      MP: runtimeState.mp,
      SAN: runtimeState.san,
      maxHP: runtimeState.maxHp,
      maxMP: runtimeState.maxMp,
      maxSAN: runtimeState.maxSan,
    };
  }

  return context;
}
