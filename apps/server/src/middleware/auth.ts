import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error';

interface AuthRequest extends Request {
  userId?: string;
  user?: {
    userId: string;
    nickname: string;
    isAdmin: boolean;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', '未提供认证令牌', 401);
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      nickname: string;
      isAdmin: boolean;
    };

    req.userId = decoded.userId;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('INVALID_TOKEN', '认证令牌无效', 401));
    }
  }
}

export type { AuthRequest };