/**
 * 幻影剧本 3.0 - 样板剧本配置
 * 
 * 剧本名称：《迷雾庄园的晚宴》
 * 类型：推理/悬疑
 * 难度：中等
 * 预计时长：30-45分钟
 */

export const sampleScenario = {
  id: 'sample-mystery-manor',
  title: '迷雾庄园的晚宴',
  description: '一座位于迷雾山脉深处的古老庄园，一场突如其来的暴雨将一群陌生人困在了这里。当晚，庄园主人离奇死亡，而凶手就在这些人之中...',
  coverImage: '/assets/scenarios/mystery-manor/cover.jpg',
  difficulty: 'NORMAL',
  estimatedDuration: 45,
  minPlayers: 1,
  maxPlayers: 1,
  supportsKPLess: true,
  supportsKPMode: false,
  status: 'PUBLISHED',
  version: 1,
  tags: ['推理', '悬疑', '暴风雪山庄'],
  era: '现代',
  
  // 剧本角色
  characters: [
    {
      id: 'char-butler',
      name: '老管家',
      description: '在庄园工作了三十年的老管家，对庄园的一切都了如指掌',
      avatar: '/assets/scenarios/mystery-manor/characters/butler-avatar.png',
      sprites: {
        normal: '/assets/scenarios/mystery-manor/characters/butler-normal.png',
        surprised: '/assets/scenarios/mystery-manor/characters/butler-surprised.png',
        sad: '/assets/scenarios/mystery-manor/characters/butler-sad.png',
      },
    },
    {
      id: 'char-daughter',
      name: '艾琳娜',
      description: '庄园主人的独生女，美丽而神秘的年轻女子',
      avatar: '/assets/scenarios/mystery-manor/characters/elena-avatar.png',
      sprites: {
        normal: '/assets/scenarios/mystery-manor/characters/elena-normal.png',
        angry: '/assets/scenarios/mystery-manor/characters/elena-angry.png',
        crying: '/assets/scenarios/mystery-manor/characters/elena-crying.png',
      },
    },
    {
      id: 'char-guest',
      name: '侦探',
      description: '受邀参加晚宴的知名侦探，意外卷入了这起案件',
      avatar: '/assets/scenarios/mystery-manor/characters/detective-avatar.png',
      sprites: {
        normal: '/assets/scenarios/mystery-manor/characters/detective-normal.png',
        thinking: '/assets/scenarios/mystery-manor/characters/detective-thinking.png',
      },
    },
  ],

  // 剧本节点
  nodes: [
    {
      id: 'node-001-intro',
      nodeId: 'intro',
      title: '暴风雨之夜',
      type: 'STORY',
      content: '暴雨如注，雷声轰鸣。你站在迷雾庄园的大门前，手中的邀请函已经被雨水打湿...',
      bgUrl: '/assets/scenarios/mystery-manor/bg/stormy-night.jpg',
      bgmUrl: '/assets/scenarios/mystery-manor/bgm/tension.mp3',
      speakerId: null,
      speakerExpression: null,
      transitionType: 'fade',
    },
    {
      id: 'node-002-dinner',
      nodeId: 'dinner',
      title: '晚宴',
      type: 'STORY',
      content: '晚宴在压抑的气氛中进行。庄园主人坐在长桌的主位，脸色阴沉...',
      bgUrl: '/assets/scenarios/mystery-manor/bg/dining-room.jpg',
      speakerId: 'char-butler',
      speakerExpression: 'normal',
      transitionType: 'dissolve',
    },
    {
      id: 'node-003-murder',
      nodeId: 'murder',
      title: '惊变',
      type: 'STORY',
      content: '突然，庄园主人捂住胸口，面色发紫，从椅子上滑落...',
      bgUrl: '/assets/scenarios/mystery-manor/bg/dining-room-dark.jpg',
      sfxUrl: '/assets/scenarios/mystery-manor/sfx/scream.mp3',
      speakerId: 'char-daughter',
      speakerExpression: 'surprised',
      transitionType: 'glitch',
      cgUrl: '/assets/scenarios/mystery-manor/cg/murder-scene.jpg',
    },
    {
      id: 'node-004-investigation',
      nodeId: 'investigation',
      title: '调查开始',
      type: 'INVESTIGATION',
      content: '庄园主人确认死亡。作为在场的侦探，你必须找出凶手...',
      bgUrl: '/assets/scenarios/mystery-manor/bg/library.jpg',
      speakerId: 'char-guest',
      speakerExpression: 'thinking',
      transitionType: 'fade',
    },
    {
      id: 'node-005-doubt-poison',
      nodeId: 'doubt-poison',
      title: '毒杀疑云',
      type: 'DOUBT',
      content: '庄园主人明显是中毒身亡。但是谁下的毒？又是如何下毒的？',
      bgUrl: '/assets/scenarios/mystery-manor/bg/dining-room.jpg',
      transitionType: 'fade',
    },
    {
      id: 'node-006-ending-success',
      nodeId: 'ending-success',
      title: '真相大白',
      type: 'ENDING',
      content: '在你的缜密推理下，凶手无处遁形。正义终将得到伸张...',
      bgUrl: '/assets/scenarios/mystery-manor/bg/sunrise.jpg',
      bgmUrl: '/assets/scenarios/mystery-manor/bgm/victory.mp3',
      speakerId: 'char-guest',
      speakerExpression: 'normal',
      transitionType: 'fade',
      cgUrl: '/assets/scenarios/mystery-manor/cg/good-ending.jpg',
    },
    {
      id: 'node-007-ending-fail',
      nodeId: 'ending-fail',
      title: '迷雾重重',
      type: 'ENDING',
      content: '你的推理出现了错误。真凶从你身边溜走，消失在了迷雾中...',
      bgUrl: '/assets/scenarios/mystery-manor/bg/mist.jpg',
      bgmUrl: '/assets/scenarios/mystery-manor/bgm/sad.mp3',
      speakerId: 'char-guest',
      speakerExpression: 'sad',
      transitionType: 'fade',
    },
  ],

  // 线索
  clues: [
    {
      id: 'clue-wine-glass',
      name: '红酒杯',
      description: '庄园主人使用的红酒杯，杯壁上残留着少量液体，散发着苦杏仁的气味',
      icon: '/assets/scenarios/mystery-manor/icons/wine-glass.png',
      type: 'ITEM',
      unlockCondition: {
        type: 'NODE_REACHED',
        data: { nodeId: 'node-003-murder' },
      },
    },
    {
      id: 'clue-letter',
      name: '威胁信',
      description: '在庄园主人的书房发现的一封匿名信，信中威胁要取他的性命',
      icon: '/assets/scenarios/mystery-manor/icons/letter.png',
      type: 'ITEM',
      unlockCondition: {
        type: 'NODE_REACHED',
        data: { nodeId: 'node-004-investigation' },
      },
    },
    {
      id: 'clue-butler-testimony',
      name: '老管家的证词',
      description: '老管家称，晚宴前他曾看到艾琳娜在厨房逗留，神色慌张',
      icon: '/assets/scenarios/mystery-manor/icons/testimony.png',
      type: 'PERSON',
      unlockCondition: {
        type: 'NODE_REACHED',
        data: { nodeId: 'node-004-investigation' },
      },
    },
    {
      id: 'clue-poison-bottle',
      name: '毒药瓶',
      description: '藏在艾琳娜房间抽屉里的一个小瓶子，里面残留着剧毒物质',
      icon: '/assets/scenarios/mystery-manor/icons/poison.png',
      type: 'ITEM',
      unlockCondition: {
        type: 'NODE_REACHED',
        data: { nodeId: 'node-004-investigation' },
      },
    },
    {
      id: 'clue-inheritance',
      name: '遗嘱',
      description: '庄园主人最近修改了遗嘱，艾琳娜将继承全部财产，但有一个附加条件...',
      icon: '/assets/scenarios/mystery-manor/icons/will.png',
      type: 'ITEM',
      unlockCondition: {
        type: 'NODE_REACHED',
        data: { nodeId: 'node-004-investigation' },
      },
    },
  ],

  // 疑点
  doubts: [
    {
      id: 'doubt-001-murder-method',
      nodeId: 'node-005-doubt-poison',
      title: '毒杀疑云',
      description: '庄园主人死于毒杀。谁是凶手？动机是什么？',
      requiredClueCount: 3,
      correctClueIds: ['clue-wine-glass', 'clue-poison-bottle', 'clue-inheritance'],
      successNodeId: 'node-006-ending-success',
      failNodeId: 'node-007-ending-fail',
      maxRetry: 3,
      modePunishment: {
        TRPG: { sanityLoss: 5, triggerBE: false },
        STORY: null,
      },
    },
  ],

  // 节点连接
  edges: [
    { from: 'node-001-intro', to: 'node-002-dinner', label: '进入庄园' },
    { from: 'node-002-dinner', to: 'node-003-murder', label: '继续' },
    { from: 'node-003-murder', to: 'node-004-investigation', label: '开始调查' },
    { from: 'node-004-investigation', to: 'node-005-doubt-poison', label: '分析案情' },
  ],
};

export default sampleScenario;
