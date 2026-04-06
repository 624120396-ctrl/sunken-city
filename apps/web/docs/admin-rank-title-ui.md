/**
 * 管理后台 - 位阶与印记系统页面结构
 */

// 在 AdminLayout 导航中添加菜单项
const ADMIN_MENU = [
  {
    category: "游戏系统",
    items: [
      { path: "/admin/ranks", name: "位阶管理", icon: "Crown" },
      { path: "/admin/titles", name: "印记管理", icon: "Award" },
    ]
  }
];

// ========== 位阶管理页面 ==========
// 路径: /admin/ranks
// 组件: AdminRanksPage

interface AdminRanksPage {
  // 顶部统计卡片
  stats: {
    totalRanks: number;      // 总位阶数
    activeRanks: number;     // 启用中
    totalUsers: number;      // 总用户数
    avgExp: number;          // 平均经验值
  };

  // 位阶列表
  rankList: {
    columns: [
      "等级",
      "名称",
      "所需经验",
      "用户数量",  // 统计当前位阶的用户数
      "状态",
      "操作"
    ];
    actions: ["编辑", "启用/禁用", "删除"];
  };

  // 编辑弹窗
  editModal: {
    fields: [
      { name: "level", label: "位阶等级", type: "number", min: 1, max: 20 },
      { name: "name", label: "位阶名称", type: "text" },
      { name: "expRequired", label: "所需经验", type: "number" },
      { name: "description", label: "位阶描述", type: "textarea" },
      { name: "icon", label: "图标", type: "emoji-picker" },
      { name: "color", label: "主题色", type: "color-picker" },
      { name: "privileges", label: "特权（预留）", type: "tags" },
    ];
  };

  // 可视化预览
  preview: {
    type: "ladder";  // 天梯图展示
    showUserDistribution: true;  // 显示每个位阶的用户分布
  };
}

// ========== 印记管理页面 ==========
// 路径: /admin/titles
// 组件: AdminTitlesPage

interface AdminTitlesPage {
  // 顶部统计
  stats: {
    totalTitles: number;
    byCategory: {
      exploration: number;
      combat: number;
      social: number;
      madness: number;
      special: number;
      hidden: number;
    };
    byRarity: {
      common: number;
      rare: number;
      epic: number;
      legendary: number;
      mythical: number;
    };
    totalUnlocked: number;  // 总解锁次数
  };

  // 筛选栏
  filters: {
    category: "全部" | "探索" | "战斗" | "社交" | "疯狂" | "特殊" | "隐藏";
    rarity: "全部" | "普通" | "稀有" | "史诗" | "传说" | "神话";
    status: "全部" | "启用" | "禁用";
    search: string;  // 搜索框
  };

  // 印记卡片网格
  titleGrid: {
    cardInfo: [
      "图标",
      "名称",
      "稀有度标签",
      "分类标签",
      "奖励经验",
      "解锁人数",  // 统计
      "状态"
    ];
    actions: ["编辑", "启用/禁用", "删除"];
  };

  // 编辑弹窗
  editModal: {
    sections: [
      {
        title: "基本信息",
        fields: [
          { name: "key", label: "唯一标识", type: "text", hint: "用于系统识别，如 first_step" },
          { name: "name", label: "印记名称", type: "text" },
          { name: "description", label: "描述", type: "textarea" },
        ]
      },
      {
        title: "分类与稀有度",
        fields: [
          { name: "category", label: "分类", type: "select", options: ["探索", "战斗", "社交", "疯狂", "特殊", "隐藏"] },
          { name: "rarity", label: "稀有度", type: "select", options: ["普通", "稀有", "史诗", "传说", "神话"] },
        ]
      },
      {
        title: "获取条件",
        fields: [
          { name: "condition", label: "条件描述", type: "text", placeholder: "完成1场跑团" },
          { name: "conditionCode", label: "条件代码", type: "select", options: ["manual", "first_game", "games_10", "games_50", ...], hint: "选择自动检测逻辑，manual表示仅手动授予" },
        ]
      },
      {
        title: "视觉与奖励",
        fields: [
          { name: "icon", label: "图标", type: "emoji-picker" },
          { name: "color", label: "主题色", type: "color-picker" },
          { name: "expReward", label: "奖励经验", type: "number" },
        ]
      },
      {
        title: "隐藏印记",
        fields: [
          { name: "isHidden", label: "是否隐藏", type: "switch" },
          { name: "hint", label: "获取提示", type: "text", placeholder: "在特定时间登录...", showIf: "isHidden" },
        ]
      }
    ];
  };
}

// ========== 用户印记管理页面 ==========
// 路径: /admin/users/:userId/titles
// 或者作为用户详情页的一个标签页
// 组件: AdminUserTitlesPage

interface AdminUserTitlesPage {
  // 用户基本信息
  userInfo: {
    id: string;
    nickname: string;
    email: string;
    currentExp: number;
    currentRank: {
      level: number;
      name: string;
      icon: string;
      color: string;
    };
    nextRank?: {
      name: string;
      expRequired: number;
    };
    progressToNext: number;  // 到下一级进度百分比
    displayedTitle: TitleConfig | null;
    unlockedCount: number;
    totalTitles: number;
  };

  // 经验值调整
  expAdjustment: {
    currentValue: number;
    newValue: number;
    adjustment: number;
    reason: string;
    previewRankChange: boolean;
  };

  // 印记管理区域
  titleManagement: {
    // 已解锁印记列表
    unlocked: {
      columns: ["图标", "名称", "分类", "稀有度", "解锁时间", "来源"];
      actions: ["撤销", "查看详情"];
    };

    // 授予印记按钮
    grantButton: {
      openModal: () => void;
    };

    // 授予印记弹窗
    grantModal: {
      search: string;  // 搜索未解锁的印记
      filters: {
        category: string;
        rarity: string;
      };
      titleList: TitleConfig[];  // 可授予的印记列表
      selectedTitle: TitleConfig | null;
      note: string;  // 授予备注
    };

    // 设置展示印记
    setDisplayed: {
      options: ("位阶名称" | TitleConfig)[];
      currentSelection: string | null;  // titleKey 或 null
    };
  };

  // 位阶变更历史
  rankHistory: {
    columns: ["时间", "操作", "经验变更", "位阶变更", "操作人", "原因"];
    pagination: true;
  };

  // 印记解锁日志
  titleUnlockLog: {
    columns: ["时间", "印记", "奖励经验", "解锁方式", "操作人", "备注"];
    pagination: true;
  };
}

// ========== 快捷操作 ==========
// 在用户列表页增加快捷操作

interface QuickActions {
  // 用户列表页每行增加操作按钮
  userListActions: [
    "查看详情",  // 跳转到用户详情
    "授予印记",  // 快速打开授予弹窗
    "调整经验",  // 快速调整经验值
  ];
}
