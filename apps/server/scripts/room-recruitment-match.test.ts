import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecruitmentStyleMatch } from '../src/modules/rooms/room-recruitment-match.service';

test('recruitment style match reports high overlap with normalized tags', () => {
  const match = buildRecruitmentStyleMatch(
    ['严肃调查', '恐怖氛围', '新手友好'],
    [' 恐怖氛围 ', '新手友好']
  );

  assert.equal(match.level, 'HIGH');
  assert.equal(match.score, 100);
  assert.deepEqual(match.matchedTags, ['恐怖氛围', '新手友好']);
  assert.deepEqual(match.unmatchedTags, []);
});

test('recruitment style match reports low overlap and missing preferences', () => {
  const match = buildRecruitmentStyleMatch(
    ['严肃调查', '长团'],
    ['轻松社交', '短团']
  );

  assert.equal(match.level, 'LOW');
  assert.equal(match.score, 0);
  assert.deepEqual(match.matchedTags, []);
  assert.deepEqual(match.unmatchedTags, ['轻松社交', '短团']);
  assert.match(match.summary, /偏低/);
});

test('recruitment style match stays unknown when player did not provide preferences', () => {
  const match = buildRecruitmentStyleMatch(['严肃调查'], []);

  assert.equal(match.level, 'UNKNOWN');
  assert.equal(match.score, null);
  assert.match(match.summary, /未填写/);
});
