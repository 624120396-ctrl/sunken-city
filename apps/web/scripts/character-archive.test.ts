import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCharacterArchiveSummary,
  getCharacterCondition,
  getCharacterCreationSteps,
  getCharacterDossierTabs,
  getCharacterGrowthSummary,
  getCharacterVitals,
} from '../src/components/characters/characterArchiveMeta.ts';

const character = {
  id: 'c1',
  hp: 6,
  maxHp: 12,
  mp: 9,
  maxMp: 12,
  san: 22,
  maxSan: 50,
};

test('character vitals expose HP MP and SAN in archive order', () => {
  assert.deepEqual(getCharacterVitals(character).map((vital) => [vital.key, vital.label, vital.value, vital.max]), [
    ['hp', 'HP', 6, 12],
    ['mp', 'MP', 9, 12],
    ['san', 'SAN', 22, 50],
  ]);
});

test('character condition marks low sanity as endangered', () => {
  assert.deepEqual(getCharacterCondition(character), {
    label: '精神濒危',
    tone: 'blood',
  });
});

test('archive summary counts displayed and endangered investigators', () => {
  assert.deepEqual(
    getCharacterArchiveSummary({
      characters: [
        character,
        { ...character, id: 'c2', hp: 12, san: 48 },
      ],
      displayedId: 'c2',
    }),
    [
      { key: 'total', label: '登记调查员', value: 2, tone: 'gold' },
      { key: 'displayed', label: '展示档案', value: 1, tone: 'ocean' },
      { key: 'endangered', label: '危险状态', value: 1, tone: 'blood' },
    ],
  );
});

test('dossier tabs keep archive reading order and active state', () => {
  assert.deepEqual(getCharacterDossierTabs('combat').map((tab) => [tab.key, tab.label, tab.active]), [
    ['attributes', '属性', false],
    ['skills', '技能', false],
    ['combat', '战斗', true],
    ['background', '背景', false],
  ]);
});

test('creation steps expose seven intake seals with current step marked', () => {
  assert.deepEqual(getCharacterCreationSteps(3).map((step) => [step.index, step.label, step.active, step.complete]), [
    [1, '方式', false, true],
    [2, '属性', false, true],
    [3, '年龄', true, false],
    [4, '职业', false, false],
    [5, '技能', false, false],
    [6, '背景', false, false],
    [7, '确认', false, false],
  ]);
});

test('growth summary reports successful checks and gained points', () => {
  assert.deepEqual(
    getCharacterGrowthSummary([
      { success: true, oldValue: 45, newValue: 51 },
      { success: false, oldValue: 60, newValue: 60 },
      { success: true, oldValue: 20, newValue: 27 },
    ]),
    [
      { key: 'success', label: '成长成功', value: 2, tone: 'ocean' },
      { key: 'failed', label: '成长失败', value: 1, tone: 'blood' },
      { key: 'gained', label: '总成长点数', value: 13, tone: 'gold' },
    ],
  );
});
