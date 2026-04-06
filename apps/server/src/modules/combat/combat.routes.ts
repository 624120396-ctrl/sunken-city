import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { logger } from '../../utils/logger';

const router = Router();

// 战斗状态类型
type CombatStatus = 'IDLE' | 'IN_PROGRESS' | 'PAUSED' | 'ENDED';

interface CombatState {
  status: CombatStatus;
  currentRound: number;
  currentTurnIndex: number;
  turnOrder: Combatant[];
  log: CombatLogEntry[];
}

interface Combatant {
  userId: string;
  characterId?: string;
  nickname: string;
  characterName?: string;
  dex: number;
  hp: number;
  maxHp: number;
  mp: number;
  san: number;
  pow: number;
  isKP: boolean;
  weapons?: any[];
  armor?: any;
  equippedWeapon?: any;
  equippedArmor?: any;
}

interface CombatLogEntry {
  id: string;
  round: number;
  actor: string;
  action: string;
  target?: string;
  result: string;
  timestamp: string;
}

// 内存中的战斗状态 (生产环境应使用Redis)
const combatStates = new Map<string, CombatState>();

// 获取战斗状态
router.get('/rooms/:roomId/combat', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    
    const state = combatStates.get(roomId);
    if (!state) {
      return res.json({
        success: true,
        data: {
          status: 'IDLE',
          currentRound: 0,
          currentTurnIndex: 0,
          turnOrder: [],
          log: [],
        },
      });
    }

    res.json({
      success: true,
      data: state,
    });
  } catch (error) {
    next(error);
  }
});

// 开始战斗
router.post('/rooms/:roomId/combat/start', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;

    // 获取房间信息
    const room = await prisma.room.findUnique({
      where: { roomId },
      include: {
        members: {
          include: {
            user: { select: { id: true, nickname: true } },
            character: { 
              select: { 
                id: true, 
                name: true, 
                dex: true, 
                hp: true, 
                mp: true, 
                san: true,
                pow: true,
                weapons: true,
                armor: true,
              } 
            },
          },
        },
      },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    // 只有KP可以开始战斗
    const member = room.members.find(m => m.userId === userId);
    if (!member || member.role !== 'KP') {
      throw new AppError('FORBIDDEN', '只有KP可以开始战斗', 403);
    }

    // 构建战斗参与者列表 (按DEX排序)
    const combatants: Combatant[] = room.members
      .filter(m => m.leftAt === null)
      .map(m => {
        const weapons = m.character?.weapons ? JSON.parse(m.character.weapons as string) : [];
        const armor = m.character?.armor ? JSON.parse(m.character.armor as string) : null;
        return {
          userId: m.userId,
          characterId: m.character?.id,
          nickname: m.user.nickname,
          characterName: m.character?.name,
          dex: m.character?.dex || 50,
          hp: m.character?.hp || 10,
          maxHp: m.character?.hp || 10,
          mp: m.character?.mp || 10,
          san: m.character?.san || 50,
          pow: m.character?.pow || 50,
          isKP: m.role === 'KP',
          weapons,
          armor,
          equippedWeapon: weapons[0] || null,
          equippedArmor: armor,
        };
      })
      .sort((a, b) => b.dex - a.dex);

    const state: CombatState = {
      status: 'IN_PROGRESS',
      currentRound: 1,
      currentTurnIndex: 0,
      turnOrder: combatants,
      log: [{
        id: Date.now().toString(),
        round: 1,
        actor: '系统',
        action: '战斗开始',
        result: `第1回合，行动顺序: ${combatants.map(c => c.nickname).join(' > ')}`,
        timestamp: new Date().toISOString(),
      }],
    };

    combatStates.set(roomId, state);

    logger.info(`房间 ${roomId} 战斗开始`);

    res.json({
      success: true,
      data: state,
    });
  } catch (error) {
    next(error);
  }
});

// 执行攻击
router.post('/rooms/:roomId/combat/attack', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { targetUserId, useEquippedWeapon = true } = req.body;

    const state = combatStates.get(roomId);
    if (!state || state.status !== 'IN_PROGRESS') {
      throw new AppError('NO_COMBAT', '当前没有进行中的战斗', 400);
    }

    // 验证当前回合
    const currentCombatant = state.turnOrder[state.currentTurnIndex];
    if (currentCombatant.userId !== userId) {
      throw new AppError('NOT_YOUR_TURN', '不是你的回合', 400);
    }

    // 获取攻击者武器
    const attackerWeapon = useEquippedWeapon && currentCombatant.equippedWeapon 
      ? currentCombatant.equippedWeapon 
      : { name: '徒手', damage: '1D3', skill: '格斗', skillValue: 25 };
    
    const skillName = attackerWeapon.skill || '格斗';
    const skillValue = attackerWeapon.skillValue || 25;
    const weaponDamage = attackerWeapon.damage || '1D3';

    // 获取目标护甲
    const targetIndex = state.turnOrder.findIndex(c => c.userId === targetUserId);
    const targetCombatant = targetIndex >= 0 ? state.turnOrder[targetIndex] : null;
    const targetArmor = targetCombatant?.equippedArmor;
    const armorValue = targetArmor?.rating || 0;

    // 命中检定
    const hitRoll = Math.floor(Math.random() * 100) + 1;
    let hitSuccess = false;
    let hitLevel = '失败';

    if (hitRoll <= skillValue) {
      hitSuccess = true;
      if (hitRoll <= skillValue / 5) hitLevel = '极难成功';
      else if (hitRoll <= skillValue / 2) hitLevel = '困难成功';
      else hitLevel = '成功';
    } else if (hitRoll >= 96 && skillValue < 50) {
      hitLevel = '大失败';
    }

    let damage = 0;
    let finalDamage = 0;
    let damageRoll = '';

    if (hitSuccess) {
      // 计算伤害
      const diceMatch = weaponDamage.match(/(\d+)D(\d+)(?:\+([\d]+))?/i);
      if (diceMatch) {
        const count = parseInt(diceMatch[1]);
        const sides = parseInt(diceMatch[2]);
        const bonus = parseInt(diceMatch[3] || '0');
        let sum = bonus;
        const rolls: number[] = [];
        for (let i = 0; i < count; i++) {
          const r = Math.floor(Math.random() * sides) + 1;
          rolls.push(r);
          sum += r;
        }
        damage = sum;
        damageRoll = rolls.join('+');
        if (bonus > 0) damageRoll += `+${bonus}`;
      } else {
        damage = parseInt(weaponDamage) || 0;
      }

      // 护甲减伤
      finalDamage = Math.max(0, damage - armorValue);

      // 更新目标HP
      if (targetCombatant) {
        targetCombatant.hp = Math.max(0, targetCombatant.hp - finalDamage);
      }
    }

    // 记录日志
    const logEntry: CombatLogEntry = {
      id: Date.now().toString(),
      round: state.currentRound,
      actor: currentCombatant.nickname,
      action: `使用 ${attackerWeapon.name || skillName} 攻击`,
      target: targetCombatant?.nickname,
      result: `${hitRoll}/${skillValue} ${hitLevel}${hitSuccess ? `, 伤害: ${damageRoll}=${damage}${armorValue > 0 ? `(护甲-${armorValue})` : ''}=${finalDamage}` : ''}`,
      timestamp: new Date().toISOString(),
    };
    state.log.push(logEntry);

    // 保存到数据库
    await prisma.combatLog.create({
      data: {
        roomId,
        userId,
        round: state.currentRound,
        actor: currentCombatant.nickname,
        action: `使用 ${attackerWeapon.name || skillName} 攻击`,
        target: targetCombatant?.nickname,
        result: `${hitRoll}/${skillValue} ${hitLevel}${hitSuccess ? `, 伤害: ${damageRoll}=${damage}${armorValue > 0 ? `(护甲-${armorValue})` : ''}=${finalDamage}` : ''}`,
      },
    });

    logger.info(`房间 ${roomId} 战斗: ${currentCombatant.nickname} 使用 ${attackerWeapon.name || skillName} 攻击 ${hitSuccess ? '命中' : '未命中'}`);

    res.json({
      success: true,
      data: {
        hitRoll,
        hitLevel,
        hitSuccess,
        damage,
        finalDamage,
        damageRoll,
        weaponName: attackerWeapon.name || skillName,
        targetHp: targetCombatant?.hp,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 结束回合
router.post('/rooms/:roomId/combat/next-turn', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;

    const state = combatStates.get(roomId);
    if (!state || state.status !== 'IN_PROGRESS') {
      throw new AppError('NO_COMBAT', '当前没有进行中的战斗', 400);
    }

    // 验证当前回合
    const currentCombatant = state.turnOrder[state.currentTurnIndex];
    if (currentCombatant.userId !== userId) {
      throw new AppError('NOT_YOUR_TURN', '不是你的回合', 400);
    }

    // 推进回合
    state.currentTurnIndex++;
    if (state.currentTurnIndex >= state.turnOrder.length) {
      state.currentTurnIndex = 0;
      state.currentRound++;
      
      // 记录新回合开始
      state.log.push({
        id: Date.now().toString(),
        round: state.currentRound,
        actor: '系统',
        action: '新回合开始',
        result: `第${state.currentRound}回合`,
        timestamp: new Date().toISOString(),
      });
    }

    const nextCombatant = state.turnOrder[state.currentTurnIndex];

    res.json({
      success: true,
      data: {
        nextTurn: nextCombatant.nickname,
        round: state.currentRound,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 结束战斗
router.post('/rooms/:roomId/combat/end', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;

    const room = await prisma.room.findUnique({
      where: { roomId },
      include: { members: true },
    });

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
    }

    // 只有KP可以结束战斗
    const member = room.members.find(m => m.userId === userId);
    if (!member || member.role !== 'KP') {
      throw new AppError('FORBIDDEN', '只有KP可以结束战斗', 403);
    }

    const state = combatStates.get(roomId);
    if (state) {
      state.status = 'ENDED';
      state.log.push({
        id: Date.now().toString(),
        round: state.currentRound,
        actor: '系统',
        action: '战斗结束',
        result: '战斗已结束',
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`房间 ${roomId} 战斗结束`);

    res.json({
      success: true,
      message: '战斗已结束',
    });
  } catch (error) {
    next(error);
  }
});

// 治疗/恢复
router.post('/rooms/:roomId/combat/heal', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { targetUserId, amount, type = 'hp' } = req.body;

    const state = combatStates.get(roomId);
    if (!state || state.status !== 'IN_PROGRESS') {
      throw new AppError('NO_COMBAT', '当前没有进行中的战斗', 400);
    }

    // 验证当前回合
    const currentCombatant = state.turnOrder[state.currentTurnIndex];
    if (currentCombatant.userId !== userId) {
      throw new AppError('NOT_YOUR_TURN', '不是你的回合', 400);
    }

    // 找到目标
    const targetIndex = state.turnOrder.findIndex(c => c.userId === targetUserId);
    if (targetIndex === -1) {
      throw new AppError('TARGET_NOT_FOUND', '目标不存在', 404);
    }

    const target = state.turnOrder[targetIndex];
    const healAmount = Math.max(0, parseInt(amount) || 0);

    // 应用治疗
    if (type === 'hp') {
      target.hp = Math.min(target.maxHp, target.hp + healAmount);
    } else if (type === 'mp') {
      target.mp = Math.min(target.pow / 5, target.mp + healAmount);
    } else if (type === 'san') {
      target.san = Math.min(99, target.san + healAmount);
    }

    // 记录日志
    const logEntry: CombatLogEntry = {
      id: Date.now().toString(),
      round: state.currentRound,
      actor: currentCombatant.nickname,
      action: `治疗 ${target.nickname}`,
      result: `恢复 ${healAmount} 点${type.toUpperCase()}`,
      timestamp: new Date().toISOString(),
    };
    state.log.push(logEntry);

    // 保存到数据库
    await prisma.combatLog.create({
      data: {
        roomId,
        userId,
        round: state.currentRound,
        actor: currentCombatant.nickname,
        action: `治疗 ${target.nickname}`,
        result: `恢复 ${healAmount} 点${type.toUpperCase()}`,
      },
    });

    res.json({
      success: true,
      data: {
        target: target.nickname,
        type,
        amount: healAmount,
        currentValue: type === 'hp' ? target.hp : type === 'mp' ? target.mp : target.san,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;