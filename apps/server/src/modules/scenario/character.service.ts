import { prisma } from '../../config/database';
import type {
  CreateScenarioCharacterDto,
  ScenarioCharacterQueryDto,
  UpdateScenarioCharacterDto,
  ScenarioCharacterView,
} from './character.dto';

/**
 * 角色服务
 * 处理剧本角色的创建、查询、更新
 */
export class CharacterService {
  /**
   * 查询剧本角色列表
   */
  async listCharacters(query: ScenarioCharacterQueryDto): Promise<ScenarioCharacterView[]> {
    const characters = await prisma.scenarioCharacter.findMany({
      where: {
        scenarioId: query.scenarioId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return characters.map(this.toView);
  }

  /**
   * 获取单个角色详情
   */
  async getCharacterById(characterId: string): Promise<ScenarioCharacterView | null> {
    const character = await prisma.scenarioCharacter.findUnique({
      where: { id: characterId },
    });
    return character ? this.toView(character) : null;
  }

  /**
   * 创建新角色
   */
  async createCharacter(payload: CreateScenarioCharacterDto): Promise<ScenarioCharacterView> {
    const character = await prisma.scenarioCharacter.create({
      data: {
        scenarioId: payload.scenarioId,
        name: payload.name,
        description: payload.description,
        avatar: payload.avatar,
        sprites: payload.sprites ? JSON.stringify(payload.sprites) : '{}',
      },
    });
    return this.toView(character);
  }

  /**
   * 更新角色
   */
  async updateCharacter(payload: UpdateScenarioCharacterDto): Promise<ScenarioCharacterView> {
    const data: any = {};
    if (payload.name) data.name = payload.name;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.avatar !== undefined) data.avatar = payload.avatar;
    if (payload.sprites) data.sprites = JSON.stringify(payload.sprites);

    const character = await prisma.scenarioCharacter.update({
      where: { id: payload.id },
      data,
    });
    return this.toView(character);
  }

  /**
   * 删除角色
   */
  async deleteCharacter(characterId: string): Promise<void> {
    await prisma.scenarioCharacter.delete({
      where: { id: characterId },
    });
  }

  /**
   * 转换数据库模型为视图模型
   */
  private toView(character: any): ScenarioCharacterView {
    return {
      id: character.id,
      scenarioId: character.scenarioId,
      name: character.name,
      description: character.description,
      avatar: character.avatar,
      sprites: character.sprites ? JSON.parse(character.sprites) : {},
      createdAt: character.createdAt,
      updatedAt: character.updatedAt,
    };
  }
}

export const characterService = new CharacterService();
