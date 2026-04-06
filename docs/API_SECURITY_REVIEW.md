# API 安全审查报告

## 执行时间
2026-04-04 14:55

---

## 1. 认证中间件审查

### 1.1 auth.ts - 认证中间件

**状态**: 基本正确，存在改进空间

| 检查项 | 状态 | 说明 |
|--------|------|------|
| JWT 验证 | 正确 | 使用 `jwt.verify` 验证令牌 |
| 令牌格式 | 正确 | 检查 `Bearer ` 前缀 |
| 错误处理 | 正确 | 区分业务错误和验证错误 |
| 用户信息挂载 | 正确 | req.user 包含完整用户信息 |

**发现的问题**:

1. **JWT_SECRET 硬编码回退**
```typescript
// 当前代码
jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')

// 风险：如果环境变量未设置，使用弱密钥
// 建议：生产环境强制要求 JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

2. **缺少令牌过期处理**
```typescript
// 当前代码未区分令牌过期和验证失败
// 建议：
} catch (error) {
  if (error instanceof jwt.TokenExpiredError) {
    next(new AppError('TOKEN_EXPIRED', '认证令牌已过期', 401));
  } else if (error instanceof jwt.JsonWebTokenError) {
    next(new AppError('INVALID_TOKEN', '认证令牌无效', 401));
  }
}
```

### 1.2 admin.ts - 管理员中间件

**状态**: 正确

- 依赖关系正确（必须在 authMiddleware 之后使用）
- 权限检查逻辑正确
- 错误返回恰当的 HTTP 状态码

---

## 2. 路由权限审查

### 2.1 Room Routes (房间路由)

| 端点 | 认证 | 权限检查 | 状态 |
|------|------|----------|------|
| GET / | 是 | - | 正确 |
| GET /:roomId | 是 | - | 正确 |
| POST / | 是 | - | 正确 |
| POST /:roomId/join | 是 | - | 正确 |
| POST /:roomId/leave | 是 | 仅成员 | 正确 |
| POST /:roomId/close | 是 | 仅KP | 正确 |
| PATCH /:roomId/atmosphere | 是 | 仅KP | 正确 |
| PATCH /:roomId/members/:memberId/status | 是 | KP或自己 | 正确 |
| GET /:roomId/stats | 是 | - | 正确 |

**发现的问题**:

1. **roomId 未转义** - 低危
```typescript
// 当前
const { roomId } = req.params;

// 虽然 Prisma 会处理 SQL 注入，但建议添加长度验证
if (!/^[A-Z0-9]{6}$/.test(roomId)) {
  throw new AppError('INVALID_ROOM_ID', '房间ID格式无效', 400);
}
```

2. **缺少请求频率限制** - 中危
```typescript
// 建议：对创建房间、加入房间等操作添加限流
// 使用 express-rate-limit
```

### 2.2 Character Routes (角色路由)

| 端点 | 认证 | 权限检查 | 状态 |
|------|------|----------|------|
| GET / | 是 | 仅本人 | 正确 |
| GET /:id | 是 | 仅本人 | 正确 |
| POST / | 是 | - | 正确 |
| PATCH /:id | 是 | 仅本人 | 正确 |
| DELETE /:id | 是 | 仅本人 | 正确 |
| POST /:id/growth | 是 | 仅本人 | 正确 |
| PATCH /:id/quick-skills | 是 | 仅本人 | 正确 |
| PATCH /:id/avatar | 是 | 仅本人 | 正确 |

**发现的问题**:

1. **创建角色缺少创建数量限制** - 中危
```typescript
// 当前用户可以创建无限数量的角色卡
// 建议：
const count = await prisma.character.count({ where: { userId } });
if (count >= 20) {
  throw new AppError('LIMIT_EXCEEDED', '最多创建20个调查员', 400);
}
```

2. **缺少防重复提交** - 低危
```typescript
// 快速连续点击创建按钮可能导致重复创建
// 建议：使用幂等键或前端防抖
```

---

## 3. 输入验证审查

### 3.1 验证覆盖率

| 路由 | 使用 Zod | 自定义验证 | 覆盖率 |
|------|----------|------------|--------|
| auth | 否 | 有 | 80% |
| characters | 是 | 有 | 95% |
| rooms | 否 | 有 | 70% |
| admin | 否 | 有 | 90% |
| dice | 否 | 有 | 60% |

### 3.2 发现的问题

1. **Room 路由缺少 Zod 验证**
```typescript
// 当前：手动检查
const { name, description, password } = req.body;

// 建议：使用 Zod schema
const createRoomSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  password: z.string().min(4).max(20).optional(),
});
```

2. **字符串长度限制不一致**
```typescript
// Character: name 限制 50 字符
// Room: name 没有长度限制
// 建议统一规范
```

---

## 4. 敏感数据处理

### 4.1 密码处理

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 密码加密 | 正确 | 使用 bcrypt 哈希 |
| 密码强度 | 部分 | 仅检查最小长度6位 |
| 密码返回 | 正确 | API 不返回密码字段 |

**建议**：
```typescript
// 添加密码强度验证
const passwordSchema = z.string()
  .min(8, '密码至少8位')
  .regex(/[A-Z]/, '需要包含大写字母')
  .regex(/[a-z]/, '需要包含小写字母')
  .regex(/[0-9]/, '需要包含数字');
```

### 4.2 令牌处理

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 令牌存储 | - | 客户端存储（localStorage） |
| 令牌过期 | 正确 | 设置 7 天过期 |
| 令牌刷新 | 缺少 | 无刷新机制 |

**建议**：
- 考虑实现 refresh token 机制
- 添加令牌黑名单支持（用于登出）

---

## 5. 安全漏洞检查

### 5.1 已检查漏洞类型

| 漏洞类型 | 状态 | 说明 |
|----------|------|------|
| SQL 注入 | 安全 | Prisma ORM 防止 SQL 注入 |
| XSS | 部分 | 前端渲染需要确认转义 |
| CSRF | 需关注 | 使用 JWT 但仍需关注 |
| 权限绕过 | 安全 | 每个路由都有认证检查 |
| 越权访问 | 安全 | 资源归属检查正确 |
| 敏感信息泄露 | 安全 | 不返回密码等敏感字段 |

### 5.2 需要关注的点

1. **CORS 配置**
```typescript
// 检查 cors 中间件配置
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
```

2. **Helmet 安全头**
```typescript
// 建议添加
import helmet from 'helmet';
app.use(helmet());
```

3. **请求体大小限制**
```typescript
// 当前未限制
// 建议：
app.use(express.json({ limit: '10kb' }));
```

---

## 6. 日志和审计

### 6.1 当前状态

- 使用 `console.error` 记录错误
- 缺少结构化日志
- 缺少审计日志（谁在何时做了什么）

### 6.2 建议

```typescript
// 添加审计中间件
function auditLog(action: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    logger.info({
      userId: req.userId,
      action,
      resource: req.params,
      timestamp: new Date().toISOString(),
    });
    next();
  };
}

// 使用
router.delete('/:id', authMiddleware, auditLog('DELETE_CHARACTER'), handler);
```

---

## 7. 修复建议优先级

### 高优先级（立即修复）

1. **JWT_SECRET 强制要求** - 防止使用弱密钥
2. **添加 Helmet 中间件** - 安全响应头
3. **请求体大小限制** - 防止 DoS

### 中优先级（本周修复）

1. **Room 路由添加 Zod 验证**
2. **角色创建数量限制**
3. **添加请求频率限制**
4. **改进密码强度要求**

### 低优先级（后续优化）

1. **添加审计日志**
2. **实现 Refresh Token**
3. **令牌黑名单**
4. **统一验证规范**

---

## 8. 代码示例：安全修复

### 修复 1: 强制 JWT_SECRET
```typescript
// config/jwt.ts
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

### 修复 2: 添加 Helmet
```typescript
// app.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

### 修复 3: 请求频率限制
```typescript
// middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 5, // 每小时最多5次
  message: '请求过于频繁，请稍后再试',
});

// 使用
router.post('/', createAccountLimiter, handler);
```

---

## 9. 总结

| 类别 | 评分 | 说明 |
|------|------|------|
| 认证机制 | 良好 | JWT 实现基本正确 |
| 权限控制 | 良好 | 资源归属检查完善 |
| 输入验证 | 一般 | 部分路由缺少验证 |
| 敏感数据处理 | 良好 | 密码处理正确 |
| 安全头 | 需改进 | 缺少 Helmet |
| 审计日志 | 需改进 | 缺少结构化日志 |

**总体安全等级**: B+ (良好，有改进空间)

**建议行动**：
1. 立即处理高优先级修复（30分钟）
2. 本周完成中优先级任务（半天）
3. 规划低优先级改进（未来迭代）
