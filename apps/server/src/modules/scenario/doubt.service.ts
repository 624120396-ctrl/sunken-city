import { prisma } from '../../config/database';
import type {
  CreateScenarioDoubtDto,
  ScenarioDoubtQueryDto,
  UpdateScenarioDoubtDto,
  ScenarioDoubtView,
} from './doubt.dto';

/**
 * 疑点服务
 * 处理剧本疑点的创建、查询、更新和论证验证
 */
export class DoubtService {
  /**
   * 查询剧本疑点列表
   */
  async listDoubts(query: ScenarioDoubtQueryDto): Promise<ScenarioDoubtView[]> {
    const doubts = await prisma.doubt.findMany({
      where: {
        scenarioId: query.scenarioId,
      },
      include: {
        node: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return doubts.map(this.toView);
  }

  /**
   * 获取单个疑点详情
   */
  async getDoubtById(doubtId: string): Promise<ScenarioDoubtView | null> {
    const doubt = await prisma.doubt.findUnique({
      where: { id: doubtId },
      include: { node: true },
    });
    return doubt ? this.toView(doubt) : null;
  }

  /**
   * 获取节点关联的疑点
   */
  async getDoubtsByNodeId(nodeId: string): Promise<ScenarioDoubtView[]> {
    const doubts = await prisma.doubt.findMany({
      where: { nodeId },
      include: { node: true },
    });
    return doubts.map(this.toView);
  }

  /**
   * 创建新疑点
   */
  async createDoubt(payload: CreateScenarioDoubtDto): Promise<ScenarioDoubtView> {
    const doubt = await prisma.doubt.create({
      data: {
        scenarioId: payload.scenarioId,
        nodeId: payload.nodeId,
        title: payload.title,
        description: payload.description ?? '',
        requiredClueCount: payload.requiredClueCount ?? 3,
        correctClueIds: JSON.stringify(payload.correctClueIds || []),
        successNodeId: payload.successNodeId,
        failNodeId: payload.failNodeId,
        maxRetry: payload.maxRetry ?? 3,
        modePunishment: payload.modePunishment
          ? JSON.stringify(payload.modePunishment)
          : null,
      },
    });
    return this.toView(doubt);
  }

  /**
   * 更新疑点
   */
  async updateDoubt(payload: UpdateScenarioDoubtDto): Promise<ScenarioDoubtView> {
    const data: any = {};
    if (payload.title) data.title = payload.title;
    if (payload.description) data.description = payload.description;
    if (payload.requiredClueCount !== undefined)
      data.requiredClueCount = payload.requiredClueCount;
    if (payload.correctClueIds)
      data.correctClueIds = JSON.stringify(payload.correctClueIds);
    if (payload.successNodeId) data.successNodeId = payload.successNodeId;
    if (payload.failNodeId) data.failNodeId = payload.failNodeId;
    if (payload.maxRetry !== undefined) data.maxRetry = payload.maxRetry;
    if (payload.modePunishment)
      data.modePunishment = JSON.stringify(payload.modePunishment);

    const doubt = await prisma.doubt.update({
      where: { id: payload.id },
      data,
    });
    return this.toView(doubt);
  }

  /**
   * 删除疑点
   */
  async deleteDoubt(doubtId: string): Promise<void> {
    await prisma.doubt.delete({
      where: { id: doubtId },
    });
  }

  /**
   * 转换数据库模型为视图模型
   */
  private toView(doubt: any): ScenarioDoubtView {
    return {
      id: doubt.id,
      scenarioId: doubt.scenarioId,
      nodeId: doubt.nodeId,
      title: doubt.title,
      description: doubt.description,
      requiredClueCount: doubt.requiredClueCount,
      correctClueIds: doubt.correctClueIds
        ? JSON.parse(doubt.correctClueIds)
        : [],
      successNodeId: doubt.successNodeId,
      failNodeId: doubt.failNodeId,
      maxRetry: doubt.maxRetry,
      modePunishment: doubt.modePunishment
        ? JSON.parse(doubt.modePunishment)
        : null,
      createdAt: doubt.createdAt,
    };
  }
}

export const doubtService = new DoubtService();
