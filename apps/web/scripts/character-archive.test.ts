import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCharacterArchiveSummary,
  getCharacterCondition,
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
