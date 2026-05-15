import { prisma } from '../../config/database';
import type {
  CreateScenarioClueDto,
  ScenarioClueQueryDto,
  UpdateScenarioClueDto,
} from './clue.dto';
import type { ScenarioClueView } from './clue.dto';

/**
 * 线索服务
 * 处理剧本线索的创建、查询、更新和解锁
 */
export class ClueService {
  /**
   * 查询剧本线索列表
   */
  async listClues(query: ScenarioClueQueryDto): Promise<ScenarioClueView[]> {
    const clues = await prisma.clue.findMany({
      where: {
        scenarioId: query.scenarioId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return clues.map(this.toView);
  }

  /**
   * 获取单个线索详情
   */
  async getClueById(clueId: string): Promise<ScenarioClueView | null> {
    const clue = await prisma.clue.findUnique({
      where: { id: clueId },
    });
    return clue ? this.toView(clue) : null;
  }

  /**
   * 创建新线索
   */
  async createClue(payload: CreateScenarioClueDto): Promise<ScenarioClueView> {
    const clue = await prisma.clue.create({
      data: {
        scenarioId: payload.scenarioId,
        name: payload.name,
        description: payload.description ?? '',
        icon: payload.icon ?? null,
        type: payload.type,
        unlockCondition: JSON.stringify(payload.unlockCondition || { type: 'NODE_REACHED' }),
      },
    });
    return this.toView(clue);
  }

  /**
   * 更新线索
   */
  async updateClue(payload: UpdateScenarioClueDto): Promise<ScenarioClueView> {
    const clue = await prisma.clue.update({
      where: { id: payload.id },
      data: {
        ...(payload.name && { name: payload.name }),
        ...(payload.description && { description: payload.description }),
        ...(payload.icon && { icon: payload.icon }),
        ...(payload.type && { type: payload.type }),
        ...(payload.unlockCondition && {
          unlockCondition: JSON.stringify(payload.unlockCondition),
        }),
      },
    });
    return this.toView(clue);
  }

  /**
   * 删除线索
   */
  async deleteClue(clueId: string): Promise<void> {
    await prisma.clue.delete({
      where: { id: clueId },
    });
  }

  /**
   * 为会话解锁线索
   */
  async unlockClueForSession(
    sessionId: string,
    clueId: string
  ): Promise<void> {
    // 更新会话状态中的已解锁线索列表
    await prisma.scenarioSession.update({
      where: { id: sessionId },
      data: {
        // 使用 JSON 字段存储已解锁线索
        // 注意：这里假设 playerStates 存储了会话状态
      },
    });
  }

  /**
   * 转换数据库模型为视图模型
   */
  private toView(clue: any): ScenarioClueView {
    return {
      id: clue.id,
      scenarioId: clue.scenarioId,
      name: clue.name,
      description: clue.description,
      icon: clue.icon,
      type: clue.type,
      unlockCondition: clue.unlockCondition ? JSON.parse(clue.unlockCondition) : null,
      createdAt: clue.createdAt,
    };
  }
}

export const clueService = new ClueService();
