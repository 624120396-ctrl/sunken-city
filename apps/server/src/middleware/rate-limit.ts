import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 20, // 每 IP 每窗口最多 20 次登录/注册尝试
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ success: false, message: '请求过于频繁，请稍后再试' });
  },
});

export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 上传接口限制更宽松
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ success: false, message: '上传过于频繁，请稍后再试' });
  },
});

export const searchRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ success: false, message: '搜索过于频繁，请稍后再试' });
  },
});
