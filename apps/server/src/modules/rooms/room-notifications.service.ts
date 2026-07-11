import type { PrismaClient } from '@prisma/client';
import type { Server } from 'socket.io';
import { logger } from '../../utils/logger';
import { createNotification, type CreateNotificationInput } from '../notifications/notifications.service';

type RoomNotificationPayload = Pick<CreateNotificationInput, 'type' | 'title' | 'content' | 'link'>;

export interface RoomNotificationRoom {
  creatorId: string;
  roomId: string;
  title?: string | null;
  members: Array<{ userId: string; role?: string; leftAt: Date | null }>;
}

export function collectRoomNotificationRecipients(room: RoomNotificationRoom, actorId?: string): string[] {
  const recipients = new Set<string>();
  recipients.add(room.creatorId);
  for (const member of room.members) {
    if (!member.leftAt) recipients.add(member.userId);
  }
  if (actorId) recipients.delete(actorId);
  return [...recipients];
}

export function collectRoomManagerNotificationRecipients(room: RoomNotificationRoom, actorId?: string): string[] {
  const recipients = new Set<string>();
  recipients.add(room.creatorId);
  for (const member of room.members) {
    if (!member.leftAt && member.role === 'KP') recipients.add(member.userId);
  }
  if (actorId) recipients.delete(actorId);
  return [...recipients];
}

function roomTitle(roomTitle?: string | null) {
  return roomTitle?.trim() || '房间';
}

function roomLink(roomId: string) {
  return `/rooms/${roomId}`;
}

function formatSessionDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : '时间待定';
}

function formatScheduleDate(date: Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function buildNextSessionNotification(input: {
  roomTitle?: string | null;
  roomId: string;
  status: string;
  scheduledAt: Date | null;
  title: string;
}): RoomNotificationPayload {
  const titlePrefix = roomTitle(input.roomTitle);
  if (input.status === 'CANCELLED') {
    return {
      type: 'room_next_session',
      title: `${titlePrefix}：下一次跑团已取消`,
      content: 'KP 已取消下一次跑团安排，请留意后续公告。',
      link: roomLink(input.roomId),
    };
  }

  const verb = input.status === 'RESCHEDULED' ? '已改期' : '已安排';
  const sessionTitle = input.title?.trim() ? `「${input.title.trim()}」` : '下一次跑团';
  return {
    type: 'room_next_session',
    title: `${titlePrefix}：下一次跑团${verb}`,
    content: `${sessionTitle}：${formatSessionDate(input.scheduledAt)}。请在房间协作区确认是否参加。`,
    link: roomLink(input.roomId),
  };
}

export function buildAnnouncementNotification(input: {
  roomTitle?: string | null;
  roomId: string;
  title: string;
  content: string;
}): RoomNotificationPayload {
  const title = input.title?.trim() || '新公告';
  return {
    type: 'room_announcement',
    title: `${roomTitle(input.roomTitle)}：${title}`,
    content: input.content,
    link: roomLink(input.roomId),
  };
}

export function buildSchedulePollFinalizedNotification(input: {
  roomTitle?: string | null;
  roomId: string;
  pollTitle: string;
  startsAt: Date;
  timezone: string;
  isReschedule?: boolean;
}): RoomNotificationPayload {
  return {
    type: 'room_schedule_poll_finalized',
    title: `${roomTitle(input.roomTitle)}：跑团时间${input.isReschedule ? '已改期' : '已确定'}`,
    content: `${input.pollTitle || '排期投票'}已收口为 ${formatScheduleDate(input.startsAt, input.timezone)}。请进入房间完成正式确认；排期投票不等同出席确认。`,
    link: roomLink(input.roomId),
  };
}

export function buildSchedulePollCancelledNotification(input: {
  roomTitle?: string | null;
  roomId: string;
  pollTitle: string;
}): RoomNotificationPayload {
  return {
    type: 'room_schedule_poll_cancelled',
    title: `${roomTitle(input.roomTitle)}：排期投票已取消`,
    content: `${input.pollTitle || '本次排期投票'}已由 KP 取消，请留意后续安排。`,
    link: roomLink(input.roomId),
  };
}

export function buildSchedulePollReminderNotification(input: {
  roomTitle?: string | null;
  roomId: string;
  pollTitle: string;
  closesAt: Date | null;
  timezone: string;
}): RoomNotificationPayload {
  const deadline = input.closesAt ? `，截止时间为 ${formatScheduleDate(input.closesAt, input.timezone)}` : '';
  return {
    type: 'room_schedule_poll_reminder',
    title: `${roomTitle(input.roomTitle)}：请回复排期投票`,
    content: `你尚未提交「${input.pollTitle || '开团时间投票'}」${deadline}。请进入房间标记各候选时间。`,
    link: roomLink(input.roomId),
  };
}

export function buildApplicationReviewNotification(input: {
  roomTitle?: string | null;
  roomId: string;
  status: string;
  reviewNote: string;
}): RoomNotificationPayload {
  const approved = input.status === 'APPROVED';
  return {
    type: 'room_application_review',
    title: `${roomTitle(input.roomTitle)}：入团申请${approved ? '已通过' : '未通过'}`,
    content: input.reviewNote?.trim() || (approved ? '你的入团申请已通过，可以前往房间完成加入。' : '你的入团申请暂未通过。'),
    link: roomLink(input.roomId),
  };
}

export function buildApplicationSubmittedNotification(input: {
  roomTitle?: string | null;
  roomId: string;
  applicantName: string;
  message: string;
}): RoomNotificationPayload {
  return {
    type: 'room_application_submitted',
    title: `${roomTitle(input.roomTitle)}：收到新的入团申请`,
    content: `${input.applicantName || '玩家'} 提交了入团申请。${input.message?.trim() || ''}`.trim(),
    link: roomLink(input.roomId),
  };
}

export function buildRoomInvitationNotification(input: {
  roomTitle?: string | null;
  roomId: string;
  inviterName: string;
  role: string;
  message: string;
}): RoomNotificationPayload {
  const roleText = input.role === 'OBSERVER' ? '旁观者' : '玩家';
  return {
    type: 'room_invite',
    title: `${roomTitle(input.roomTitle)}：收到房间邀请`,
    content: `${input.inviterName || 'KP'} 邀请你以${roleText}身份加入房间。${input.message?.trim() || ''}`.trim(),
    link: roomLink(input.roomId),
  };
}

export async function notifyRoomMembers(input: {
  prisma: PrismaClient;
  io?: Server | null;
  room: RoomNotificationRoom;
  actorId?: string;
  notification: RoomNotificationPayload;
}) {
  const recipients = collectRoomNotificationRecipients(input.room, input.actorId);
  await Promise.all(recipients.map(userId => createNotification(input.prisma, input.io, {
    userId,
    ...input.notification,
  })));
}

export async function notifyRoomManagers(input: {
  prisma: PrismaClient;
  io?: Server | null;
  room: RoomNotificationRoom;
  actorId?: string;
  notification: RoomNotificationPayload;
}) {
  const recipients = collectRoomManagerNotificationRecipients(input.room, input.actorId);
  await Promise.all(recipients.map(userId => createNotification(input.prisma, input.io, {
    userId,
    ...input.notification,
  })));
}

export async function tryNotifyRoomMembers(input: Parameters<typeof notifyRoomMembers>[0]) {
  try {
    await notifyRoomMembers(input);
  } catch (error) {
    logger.warn('房间通知发送失败', error);
  }
}

export async function tryNotifyRoomManagers(input: Parameters<typeof notifyRoomManagers>[0]) {
  try {
    await notifyRoomManagers(input);
  } catch (error) {
    logger.warn('房间 KP 通知发送失败', error);
  }
}

export async function tryNotifyRoomUser(input: {
  prisma: PrismaClient;
  io?: Server | null;
  userId: string;
  notification: RoomNotificationPayload;
}) {
  try {
    await createNotification(input.prisma, input.io, {
      userId: input.userId,
      ...input.notification,
    });
  } catch (error) {
    logger.warn('房间单人通知发送失败', error);
  }
}
