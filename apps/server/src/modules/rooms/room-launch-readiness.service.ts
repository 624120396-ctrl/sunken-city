export type LaunchReadinessItemStatus = 'DONE' | 'TODO' | 'INFO';
export type LaunchReadinessStatus = 'READY' | 'NEEDS_ATTENTION';

export interface LaunchReadinessItem {
  key: string;
  label: string;
  status: LaunchReadinessItemStatus;
  detail: string;
}

export interface LaunchReadinessInput {
  currentObjective: string;
  nextSession: null | { scheduledAt: Date | null; status: string };
  attendanceSummary: Record<string, number>;
  playerMembers: Array<{ userId: string; characterId: string | null }>;
  sceneCount: number;
  publicClueCount: number;
  pendingApplicationCount: number;
  checklist: Array<{ text: string; done: boolean }>;
}

export interface LaunchReadinessView {
  status: LaunchReadinessStatus;
  doneCount: number;
  todoCount: number;
  items: LaunchReadinessItem[];
}

function item(key: string, label: string, done: boolean, detail: string): LaunchReadinessItem {
  return {
    key,
    label,
    status: done ? 'DONE' : 'TODO',
    detail,
  };
}

export function buildRoomLaunchReadiness(input: LaunchReadinessInput): LaunchReadinessView {
  const pendingAttendance = input.attendanceSummary.PENDING ?? 0;
  const missingCharacters = input.playerMembers.filter(member => !member.characterId).length;
  const unfinishedChecklist = input.checklist.filter(entry => !entry.done).length;
  const hasNextSession = Boolean(input.nextSession?.scheduledAt && input.nextSession.status !== 'CANCELLED');

  const items: LaunchReadinessItem[] = [
    item(
      'next-session',
      '下次开团时间',
      hasNextSession,
      hasNextSession ? '已设置下次开团时间。' : '还没有有效的下次开团时间。'
    ),
    item(
      'attendance',
      '成员出勤确认',
      pendingAttendance === 0,
      pendingAttendance === 0 ? '成员出勤已确认。' : `还有 ${pendingAttendance} 名成员未确认出勤。`
    ),
    item(
      'characters',
      '玩家角色绑定',
      missingCharacters === 0,
      missingCharacters === 0 ? '玩家都已绑定角色。' : `还有 ${missingCharacters} 名玩家未绑定角色。`
    ),
    item(
      'objective',
      '当前目标',
      Boolean(input.currentObjective.trim()),
      input.currentObjective.trim() ? '已设置当前目标。' : '还没有设置当前目标。'
    ),
    item(
      'scene',
      '场景准备',
      input.sceneCount > 0,
      input.sceneCount > 0 ? `已有 ${input.sceneCount} 个场景。` : '还没有场景或地点档案。'
    ),
    item(
      'clues',
      '公开线索',
      input.publicClueCount > 0,
      input.publicClueCount > 0 ? `已有 ${input.publicClueCount} 条公开线索。` : '还没有可公开线索。'
    ),
    item(
      'prep-checklist',
      '备团清单',
      unfinishedChecklist === 0,
      unfinishedChecklist === 0 ? '备团清单没有未完成项。' : `备团清单还有 ${unfinishedChecklist} 项未完成。`
    ),
  ];

  if (input.pendingApplicationCount > 0) {
    items.push({
      key: 'recruitment',
      label: '待审核申请',
      status: 'INFO',
      detail: `还有 ${input.pendingApplicationCount} 个入团申请待处理。`,
    });
  }

  const doneCount = items.filter(entry => entry.status === 'DONE').length;
  const todoCount = items.filter(entry => entry.status === 'TODO').length;

  return {
    status: todoCount === 0 ? 'READY' : 'NEEDS_ATTENTION',
    doneCount,
    todoCount,
    items,
  };
}
