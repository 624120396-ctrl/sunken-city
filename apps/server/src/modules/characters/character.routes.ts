import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import {
  rollCoreAttributes,
  generateAttributesByPointBuy,
  applyAgeAdjustment,
  calculateDerivedAttributes,
  calculateFinancials,
  calculateCharacterSkillPoints,
  createDefaultSkillMap,
  mergeSkillsWithDynamicBase,
} from '../../utils/character-calc';
import { COC7_OCCUPATIONS } from '../../data/occupations';
import { getDefaultSkills, resolveDynamicBaseValues } from '../../data/coc7-skills';

const router = Router();

// ========== 新角色创建 Schema (COC7e) ==========
const createCharacterSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50, '姓名最多50个字符'),
  occupationKey: z.string().min(1, '请选择职业'),
  age: z.number().int().min(15, '年龄至少15岁').max(89, '年龄最大89岁').default(25),
  gender: z.string().optional(),

  // 投骰/购点后的原始属性（尚未应用年龄修正）
  rawAttrs: z.object({
    str: z.number().int().min(15).max(90),
    con: z.number().int().min(15).max(90),
    siz: z.number().int().min(15).max(90),
    dex: z.number().int().min(15).max(90),
    app: z.number().int().min(15).max(90),
    int: z.number().int().min(15).max(90),
    pow: z.number().int().min(15).max(90),
    edu: z.number().int().min(15).max(90),
  }),

  // 最终属性（已应用年龄和EDU增强）
  finalAttrs: z.object({
    str: z.number().int().min(15).max(99),
    con: z.number().int().min(15).max(99),
    siz: z.number().int().min(15).max(99),
    dex: z.number().int().min(15).max(99),
    app: z.number().int().min(15).max(99),
    int: z.number().int().min(15).max(99),
    pow: z.number().int().min(15).max(99),
    edu: z.number().int().min(15).max(99),
  }),

  luck: z.number().int().min(15).max(90),
  creditRating: z.number().int().min(0).max(99),

  // 技能分配记录
  skills: z.record(z.number()),
  skillPointsJson: z.object({
    occupationPoints: z.number(),
    interestPoints: z.number(),
    usedOccupation: z.number(),
    usedInterest: z.number(),
  }),

  // 背景
  backgroundEntries: z.array(z.object({
    type: z.enum(['形象描述', '思想信念', '重要之人', '意义非凡之地', '宝贵之物', '特质']),
    content: z.string().min(1),
  })).optional(),
  keyConnection: z.enum(['形象描述', '思想信念', '重要之人', '意义非凡之地', '宝贵之物', '特质']).optional(),
  background: z.string().max(5000).optional(),

  weapons: z.array(z.any()).default([]),
  armor: z.any().optional(),
});

// ========== 辅助工具：获取职业信息 ==========
function getOccupationInfo(key: string) {
  return COC7_OCCUPATIONS.find(o => o.key === key);
}

// ========== 职业列表（供前端选择） ==========
router.get('/occupations', async (req, res, next) => {
  try {
    // 可以扩展为从数据库读取，目前先用内存常量
    res.json({
      success: true,
      data: {
        occupations: COC7_OCCUPATIONS.map(o => ({
          key: o.key,
          name: o.name,
          nameEn: o.nameEn,
          category: o.category,
          skillPointFormula: o.skillPointFormula,
          creditRatingMin: o.creditRatingMin,
          creditRatingMax: o.creditRatingMax,
          coreSkills: o.coreSkills,
          coreSkillDisplay: o.coreSkillDisplay,
          electiveDescription: o.electiveDescription,
          electivePool: o.electivePool,
          electiveCount: o.electiveCount,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 投骰生成属性 ==========
router.post('/generate/attributes/roll', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const attrs = rollCoreAttributes();
    res.json({
      success: true,
      data: { attrs, method: 'roll' },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 购点制生成属性 ==========
router.post('/generate/attributes/pointbuy', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({ points: z.array(z.number().int().min(15).max(90)).length(8) });
    const { points } = schema.parse(req.body);
    const attrs = generateAttributesByPointBuy(points);
    res.json({
      success: true,
      data: { attrs, method: 'pointbuy' },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 应用年龄修正 ==========
router.post('/generate/age-adjustment', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      age: z.number().int().min(15).max(89),
      rawAttrs: z.object({
        str: z.number().int(), con: z.number().int(), siz: z.number().int(),
        dex: z.number().int(), app: z.number().int(), int: z.number().int(),
        pow: z.number().int(), edu: z.number().int(),
      }),
    });
    const { age, rawAttrs } = schema.parse(req.body);
    const result = applyAgeAdjustment(rawAttrs, age);
    const derived = calculateDerivedAttributes(result.attrs, age);
    res.json({
      success: true,
      data: {
        age,
        rawAttrs,
        finalAttrs: result.attrs,
        eduEnhancements: result.eduEnhancements,
        luck: result.luck,
        derived,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 计算可用技能点 ==========
router.post('/generate/skill-points', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const schema = z.object({
      occupationKey: z.string(),
      finalAttrs: z.object({
        str: z.number().int(), con: z.number().int(), siz: z.number().int(), dex: z.number().int(), app: z.number().int(),
        int: z.number().int(), pow: z.number().int(), edu: z.number().int(),
      }),
    });
    const { occupationKey, finalAttrs } = schema.parse(req.body);
    const occ = getOccupationInfo(occupationKey);
    if (!occ) {
      throw new AppError('INVALID_OCCUPATION', '无效的职业', 400);
    }
    const points = calculateCharacterSkillPoints(occupationKey, finalAttrs);
    res.json({
      success: true,
      data: {
        occupationKey,
        occupationName: occ.name,
        creditRatingMin: occ.creditRatingMin,
        creditRatingMax: occ.creditRatingMax,
        coreSkills: occ.coreSkills,
        ...points,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 预览最终角色（不存库） ==========
router.post('/generate/preview', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createCharacterSchema.parse(req.body);
    const occ = getOccupationInfo(data.occupationKey);
    if (!occ) {
      throw new AppError('INVALID_OCCUPATION', '无效的职业', 400);
    }

    const derived = calculateDerivedAttributes(data.finalAttrs, data.age);
    const financials = calculateFinancials(data.creditRating);
    const defaultSkills = createDefaultSkillMap();
    const skillsWithDynamic = mergeSkillsWithDynamicBase(defaultSkills, {
      dex: data.finalAttrs.dex,
      edu: data.finalAttrs.edu,
    });
    const finalSkills = { ...skillsWithDynamic, ...data.skills };

    res.json({
      success: true,
      data: {
        preview: {
          name: data.name,
          occupation: occ.name,
          occupationKey: data.occupationKey,
          age: data.age,
          gender: data.gender,
          ...data.finalAttrs,
          luck: data.luck,
          creditRating: data.creditRating,
          ...derived,
          ...financials,
          skills: finalSkills,
          backgroundEntries: data.backgroundEntries || [],
          keyConnection: data.keyConnection,
          skillPoints: data.skillPointsJson,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 获取角色卡列表 ==========
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const characters = await prisma.character.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        displayId: true,
        name: true,
        portraitUrl: true,
        occupation: true,
        occupationKey: true,
        age: true,
        hp: true,
        mp: true,
        san: true,
        maxHp: true,
        maxMp: true,
        maxSan: true,
        str: true,
        dex: true,
        con: true,
        siz: true,
        app: true,
        int: true,
        pow: true,
        edu: true,
        luck: true,
        mov: true,
        build: true,
        db: true,
        creditRating: true,
        cash: true,
        assetsValue: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: { characters },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 获取单个角色卡 ==========
router.get('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const character = await prisma.character.findFirst({
      where: { id, userId },
    });

    if (!character) {
      throw new AppError('CHARACTER_NOT_FOUND', '调查员不存在', 404);
    }

    const parsedCharacter = {
      ...character,
      skills: JSON.parse(character.skills || '{}'),
      weapons: JSON.parse(character.weapons || '[]'),
      armor: character.armor ? JSON.parse(character.armor) : null,
      quickSkills: JSON.parse(character.quickSkills || '[]'),
      backgroundEntries: JSON.parse(character.backgroundEntries || '[]'),
      skillPointsJson: JSON.parse(character.skillPointsJson || '{}'),
    };

    res.json({
      success: true,
      data: { character: parsedCharacter },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 创建角色卡（COC7e 完整流程） ==========
router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const data = createCharacterSchema.parse(req.body);
    const userId = req.userId!;

    const occ = getOccupationInfo(data.occupationKey);
    if (!occ) {
      throw new AppError('INVALID_OCCUPATION', '无效的职业', 400);
    }

    // 校验信用评级范围
    if (data.creditRating < occ.creditRatingMin || data.creditRating > occ.creditRatingMax) {
      throw new AppError('INVALID_CREDIT_RATING', `信用评级应在 ${occ.creditRatingMin}-${occ.creditRatingMax} 之间`, 400);
    }

    // 校验技能点
    const available = calculateCharacterSkillPoints(data.occupationKey, data.finalAttrs);
    if (!available) {
      throw new AppError('INVALID_SKILL_POINTS', '技能点计算失败', 400);
    }
    if (data.skillPointsJson.usedOccupation > available.occupationPoints) {
      throw new AppError('SKILL_POINT_OVERFLOW', `本职技能点超出限制（可用 ${available.occupationPoints}）`, 400);
    }
    if (data.skillPointsJson.usedInterest > available.interestPoints) {
      throw new AppError('SKILL_POINT_OVERFLOW', `兴趣技能点超出限制（可用 ${available.interestPoints}）`, 400);
    }

    const derived = calculateDerivedAttributes(data.finalAttrs, data.age);
    const financials = calculateFinancials(data.creditRating);

    const defaultSkills = createDefaultSkillMap();
    const dynamicBases = resolveDynamicBaseValues({
      dex: data.finalAttrs.dex,
      edu: data.finalAttrs.edu,
    });
    const finalSkills = { ...defaultSkills, ...dynamicBases, ...data.skills };

    // 自动设置快捷技能栏（如果未自定义）
    let quickSkills = ["侦查", "聆听", "图书馆使用", "心理学", "话术"];

    const character = await prisma.character.create({
      data: {
        userId,
        name: data.name,
        occupation: occ.name,
        occupationKey: data.occupationKey,
        age: data.age,
        gender: data.gender,
        str: data.finalAttrs.str,
        con: data.finalAttrs.con,
        siz: data.finalAttrs.siz,
        dex: data.finalAttrs.dex,
        app: data.finalAttrs.app,
        int: data.finalAttrs.int,
        pow: data.finalAttrs.pow,
        edu: data.finalAttrs.edu,
        luck: data.luck,
        creditRating: data.creditRating,
        cash: financials.cash,
        assetsValue: financials.assetsValue,
        db: derived.db,
        hp: derived.hp,
        mp: derived.mp,
        san: derived.san,
        maxHp: derived.maxHp,
        maxMp: derived.maxMp,
        maxSan: derived.maxSan,
        mov: derived.mov,
        build: derived.build,
        skills: JSON.stringify(finalSkills),
        weapons: JSON.stringify(data.weapons),
        armor: data.armor ? JSON.stringify(data.armor) : null,
        background: data.background,
        backgroundEntries: JSON.stringify(data.backgroundEntries || []),
        keyConnection: data.keyConnection,
        skillPointsJson: JSON.stringify(data.skillPointsJson),
        quickSkills: JSON.stringify(quickSkills),
      },
    });

    // 首次创建角色：授予「初次迈步」印记
    let unlockedTitle: any = null;
    try {
      const existingTitle = await prisma.userTitle.findUnique({
        where: { userId_titleKey: { userId, titleKey: 'first_step' } },
      });
      if (!existingTitle) {
        unlockedTitle = await prisma.userTitle.create({
          data: { userId, titleKey: 'first_step', unlockedBy: 'system' },
        });
      }
    } catch (e) {
      console.error('授予 first_step 印记失败:', e);
    }

    res.status(201).json({
      success: true,
      data: { character, unlockedTitle },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 战后技能成长 ==========
router.post('/:id/growth', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { growths } = req.body;

    const existing = await prisma.character.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppError('CHARACTER_NOT_FOUND', '调查员不存在', 404);
    }

    const skills = JSON.parse(existing.skills || '{}');
    growths.forEach((growth: { skillName: string; newValue: number }) => {
      skills[growth.skillName] = growth.newValue;
    });

    const character = await prisma.character.update({
      where: { id },
      data: { skills: JSON.stringify(skills) },
    });

    res.json({
      success: true,
      data: {
        character: {
          ...character,
          skills: JSON.parse(character.skills || '{}'),
          weapons: JSON.parse(character.weapons || '[]'),
          armor: character.armor ? JSON.parse(character.armor) : null,
          quickSkills: JSON.parse(character.quickSkills || '[]'),
          backgroundEntries: JSON.parse(character.backgroundEntries || '[]'),
          skillPointsJson: JSON.parse(character.skillPointsJson || '{}'),
        },
        appliedGrowths: growths.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 更新快捷技能栏 ==========
router.patch('/:id/quick-skills', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { quickSkills } = req.body;

    if (!Array.isArray(quickSkills) || quickSkills.length > 6) {
      throw new AppError('INVALID_DATA', '快捷技能最多6个', 400);
    }

    const existing = await prisma.character.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppError('CHARACTER_NOT_FOUND', '调查员不存在', 404);
    }

    const character = await prisma.character.update({
      where: { id },
      data: { quickSkills: JSON.stringify(quickSkills) },
    });

    res.json({
      success: true,
      data: { quickSkills: JSON.parse(character.quickSkills) },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 更新角色头像 ==========
router.patch('/:id/avatar', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { avatarUrl } = req.body;

    const existing = await prisma.character.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppError('CHARACTER_NOT_FOUND', '调查员不存在', 404);
    }

    const character = await prisma.character.update({
      where: { id },
      data: { avatarUrl },
    });

    res.json({
      success: true,
      data: { avatarUrl: character.avatarUrl },
    });
  } catch (error) {
    next(error);
  }
});

// 删除角色卡
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const existing = await prisma.character.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new AppError('CHARACTER_NOT_FOUND', '调查员不存在', 404);
    }

    await prisma.character.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: '调查员已删除',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
