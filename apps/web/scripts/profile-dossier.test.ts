import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getProfileDossierStats,
  getProfileInventoryGroups,
  getProfileRoleBadge,
} from '../src/components/profile/profileDossierMeta.ts';

test('profile role badge gives administrators a ceremonial keeper title', () => {
  assert.deepEqual(getProfileRoleBadge(true), {
    label: '管理员',
    title: '深渊档案馆执钥人',
    tone: 'gold',
  });
});

test('profile dossier stats preserve currency and forum footprint order', () => {
  assert.deepEqual(
    getProfileDossierStats({
      coins: 1525,
      stardust: 30,
      forumStats: {
        postCount: 3,
        replyCount: 11,
        likeCountReceived: 8,
        bestReplyCount: 2,
      },
    }).map((item) => [item.key, item.label, item.value]),
    [
      ['coins', '锈蚀硬币', 1525],
      ['stardust', '虚银', 30],
      ['posts', '主题帖', 3],
      ['replies', '回复', 11],
      ['likes', '获赞', 8],
      ['bestReplies', '最佳回复', 2],
    ],
  );
});

test('profile inventory groups separate titles from equipped relics and general items', () => {
  const groups = getProfileInventoryGroups([
    { itemKey: 'frame_gold', quantity: 1, item: { category: 'avatar_frame' } },
    { itemKey: 'title_keeper', quantity: 1, item: { category: 'title' } },
    { itemKey: 'relic_shell', quantity: 1, item: { category: 'relic' } },
    { itemKey: 'lantern', quantity: 3, item: { category: 'tool' } },
  ]);

  assert.deepEqual(groups.map((group) => [group.key, group.label, group.count]), [
    ['titles', '身份印记', 1],
    ['relics', '异常遗物', 1],
    ['frames', '头像框', 1],
    ['supplies', '随身物资', 1],
  ]);
});
