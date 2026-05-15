import { prisma } from '../../config/database';

export interface ScenarioSummary {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  difficulty: string;
  estimatedDuration: number;
  tags: string | null;
  status: string;
  playCount: number;
  rating: number;
  createdAt: Date;
}

export interface CreateScenarioInput {
  title: string;
  description?: string;
  coverImage?: string;
  difficulty: string;
  estimatedDuration: number;
  minPlayers: number;
  maxPlayers: number;
  supportsKPLess: boolean;
  supportsKPMode: boolean;
  tags?: string;
  era?: string;
  version?: number;
  status?: string;
}

export class ScenarioService {
  /**
   * 列出所有已发布剧本
   */
  async listScenarios(): Promise<ScenarioSummary[]> {
    const scenarios = await prisma.scenario.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        difficulty: true,
        estimatedDuration: true,
        tags: true,
        status: true,
        playCount: true,
        rating: true,
        createdAt: true,
      },
    });
    return scenarios;
  }

  /**
   * 获取剧本详情
   */
  async getScenarioById(scenarioId: string): Promise<ScenarioSummary | null> {
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        difficulty: true,
        estimatedDuration: true,
        tags: true,
        status: true,
        playCount: true,
        rating: true,
        createdAt: true,
      },
    });
    return scenario;
  }

  /**
   * 创建新剧本
   */
  async createScenario(
    input: CreateScenarioInput,
    authorId: string
  ): Promise<ScenarioSummary> {
    const scenario = await prisma.scenario.create({
      data: {
        title: input.title,
        description: input.description || '',
        coverImage: input.coverImage || null,
        difficulty: input.difficulty,
        estimatedDuration: input.estimatedDuration,
        minPlayers: input.minPlayers,
        maxPlayers: input.maxPlayers,
        supportsKPLess: input.supportsKPLess,
        supportsKPMode: input.supportsKPMode,
        tags: input.tags || '',
        era: input.era || '现代',
        version: input.version || 1,
        status: input.status || 'DRAFT',
        authorId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        difficulty: true,
        estimatedDuration: true,
        tags: true,
        status: true,
        playCount: true,
        rating: true,
        createdAt: true,
      },
    });
    return scenario;
  }

  /**
   * 更新剧本
   */
  async updateScenario(
    scenarioId: string,
    input: Partial<CreateScenarioInput>
  ): Promise<ScenarioSummary> {
    const scenario = await prisma.scenario.update({
      where: { id: scenarioId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
        ...(input.difficulty && { difficulty: input.difficulty }),
        ...(input.estimatedDuration && { estimatedDuration: input.estimatedDuration }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.era && { era: input.era }),
        ...(input.status && { status: input.status }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        difficulty: true,
        estimatedDuration: true,
        tags: true,
        status: true,
        playCount: true,
        rating: true,
        createdAt: true,
      },
    });
    return scenario;
  }

  /**
   * 删除剧本
   */
  async deleteScenario(scenarioId: string): Promise<void> {
    await prisma.scenario.delete({
      where: { id: scenarioId },
    });
  }

  /**
   * 获取剧本完整详情（包含节点、角色、线索）
   */
  async getScenarioFullDetail(scenarioId: string) {
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: {
        nodes: {
          include: {
            doubts: true,
            outgoingEdges: true,
            incomingEdges: true,
          },
        },
        characters: true,
        clues: true,
      },
    });
    return scenario;
  }
}

export const scenarioService = new ScenarioService();
