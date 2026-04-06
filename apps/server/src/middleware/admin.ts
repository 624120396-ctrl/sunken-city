import { Request, Response, NextFunction } from 'express';
import { AppError } from './error';
import { AuthRequest } from './auth';

/**
 * 管理员权限验证中间件
 * 必须在 authMiddleware 之后使用
 */
export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', '未登录', 401);
    }

    if (!req.user.isAdmin) {
      throw new AppError('FORBIDDEN', '需要管理员权限', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
}
