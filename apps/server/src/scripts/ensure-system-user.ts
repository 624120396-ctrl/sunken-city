/**
 * 检查并创建系统用户
 */

import { prisma } from '../config/database';

export async function ensureSystemUser(): Promise<string> {
  const systemUserId = 'system-admin-001';
  
  // 检查系统用户是否存在
  let user = await prisma.user.findUnique({
    where: { id: systemUserId },
  });
  
  if (!user) {
    console.log('🤖 创建系统用户...');
    
    // 获取当前最大 displayId
    const lastUser = await prisma.user.findFirst({
      orderBy: { displayId: 'desc' },
    });
    const nextDisplayId = (lastUser?.displayId ?? 0) + 1;
    
    user = await prisma.user.create({
      data: {
        id: systemUserId,
        displayId: nextDisplayId,
        email: 'system@sunken-city.local',
        nickname: '系统',
        password: 'SYSTEM_USER_NO_LOGIN',
        isAdmin: true,
      },
    });
    console.log(`✅ 系统用户创建成功: ${user.id}`);
  }
  
  return user.id;
}
