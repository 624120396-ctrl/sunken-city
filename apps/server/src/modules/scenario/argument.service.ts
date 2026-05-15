import { prisma } from '../../config/database';
import type {
  SubmitArgumentDto,
  ArgumentResultDto,
  ArgumentRecordView,
} from './argument.dto';

/**
 * 论证服务
 * 处理玩家论证提交、验证和记录
 */
export class ArgumentService {
  /**
   * 提交论证并验证
   * @returns 论证结果和下一节点
   */
  async submitArgument(
    sessionId: string,
    payload: SubmitArgumentDto
  ): Promise<ArgumentResultDto> {
    const { doubtId, selectedClueIds } = payload;

    // 1. 获取疑点信息
    const doubt = await prisma.doubt.findUnique({
      where: { id: doubtId },
    });

    if (!doubt) {
      throw new Error('疑点不存在');
    }

    // 2. 验证线索数量
    if (selectedClueIds.length < doubt.requiredClueCount) {
      await this.recordArgument(sessionId, doubtId, selectedClueIds, 'FAIL');
      return {
        success: false,
        result: 'INSUFFICIENT_CLUES',
        message: `需要至少 ${doubt.requiredClueCount} 条线索，当前只选择了 ${selectedClueIds.length} 条`,
        nextNodeId: doubt.failNodeId,
      };
    }

    // 3. 验证线索是否正确
    const correctClueIds: string[] = doubt.correctClueIds
      ? JSON.parse(doubt.correctClueIds)
      : [];
    const selectedSet = new Set(selectedClueIds);
    const correctSet = new Set(correctClueIds);

    // 计算匹配度
    let matchCount = 0;
    for (const clueId of selectedSet) {
      if (correctSet.has(clueId)) {
        matchCount++;
      }
    }

    const accuracy = matchCount / correctSet.size;
    const isSuccess = accuracy >= 0.8; // 80% 正确率算成功

    // 4. 记录论证
    await this.recordArgument(
      sessionId,
      doubtId,
      selectedClueIds,
      isSuccess ? 'SUCCESS' : 'FAIL'
    );

    // 5. 返回结果
    if (isSuccess) {
      return {
        success: true,
        result: 'SUCCESS',
        message: '推理正确！真相逐渐浮现...',
        nextNodeId: doubt.successNodeId,
        accuracy,
      };
    } else {
      // 检查是否需要应用惩罚（TRPG 模式）
      const punishment = doubt.modePunishment
        ? JSON.parse(doubt.modePunishment)
        : null;

      return {
        success: false,
        result: 'FAIL',
        message: '这条推理似乎走入了死胡同...',
        nextNodeId: doubt.failNodeId,
        accuracy,
        punishment: punishment || undefined,
      };
    }
  }

  /**
   * 记录论证历史
   */
  private async recordArgument(
    sessionId: string,
    doubtId: string,
    selectedClueIds: string[],
    result: 'SUCCESS' | 'FAIL' | 'ABORT'
  ): Promise<void> {
    await prisma.argumentRecord.create({
      data: {
        sessionId,
        doubtId,
        selectedClueIds: JSON.stringify(selectedClueIds),
        result,
      },
    });
  }

  /**
   * 获取会话的论证历史
   */
  async getArgumentHistory(sessionId: string): Promise<ArgumentRecordView[]> {
    const records = await prisma.argumentRecord.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(this.toView);
  }

  /**
   * 获取疑点的论证统计
   */
  async getDoubtStatistics(doubtId: string): Promise<{
    total: number;
    success: number;
    fail: number;
    successRate: number;
  }> {
    const records = await prisma.argumentRecord.findMany({
      where: { doubtId },
    });

    const total = records.length;
    const success = records.filter((r) => r.result === 'SUCCESS').length;
    const fail = records.filter((r) => r.result === 'FAIL').length;

    return {
      total,
      success,
      fail,
      successRate: total > 0 ? Math.round((success / total) * 100) : 0,
    };
  }

  /**
   * 检查玩家是否已完成某疑点
   */
  async hasCompletedDoubt(
    sessionId: string,
    doubtId: string
  ): Promise<boolean> {
    const record = await prisma.argumentRecord.findFirst({
      where: {
        sessionId,
        doubtId,
        result: 'SUCCESS',
      },
    });
    return !!record;
  }

  /**
   * 转换数据库模型为视图模型
   */
  private toView(record: any): ArgumentRecordView {
    return {
      id: record.id,
      sessionId: record.sessionId,
      doubtId: record.doubtId,
      selectedClueIds: record.selectedClueIds
        ? JSON.parse(record.selectedClueIds)
        : [],
      result: record.result,
      createdAt: record.createdAt,
    };
  }
}

export const argumentService = new ArgumentService();
