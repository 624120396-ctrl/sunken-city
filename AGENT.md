# AGENT.md — Agentic Coding 规范（沉没之城 / coc-platform）

> 规范来源：2026-05-30 基于 Agentic Coding 最佳实践制定

---

## 铁律：后端修改禁止在服务器直接执行

**错误流程**：服务器直接修改 → 服务器内 commit → 部署
**正确流程**：

```bash
# 1. 本地 workspace 修改后端代码
vim apps/server/src/modules/xxx.ts

# 2. 本地测试编译
npx tsc --noEmit

# 3. 提交并推送
git add -A
git commit -m "feat(module): 描述

Agent-Task: 任务ID/描述
Agent-Decision: 关键决策及理由
Agent-Limitation: 已知局限或后续TODO"
git push origin develop

# 4. 服务器拉取并重启
ssh root@64.90.30.232 "cd /opt/coc-platform && git pull && pm2 restart coc-server"
```

**前端部署**：本地 build → rsync dist → SSH 调用 deploy.sh（详见 TOOLS.md 部署规则）

---

## Branch 命名

| 类型 | 格式 | 示例 |
|------|------|------|
| 功能开发 | `agent/<task-id>-<description>` | `agent/PROJ-234-refresh-token` |
| 紧急修复 | `hotfix/<issue-desc>` | `hotfix/room-crash-fix` |
| 禁止直接提交到 `main` 或 `develop` | | |

---

## Commit 规范

### 前缀（保持现有）

| 前缀 | 场景 |
|------|------|
| feat | 新增功能、模块、页面 |
| fix | 修复 bug、错误、异常 |
| refactor | 重构代码、结构调整 |
| docs | 文档、README、注释 |
| ops | 部署脚本、配置、Docker |
| style | UI 调整、CSS、格式化 |
| test | 测试用例、QA 修复 |

### 必须包含的 Git Trailer

```
Agent-Task: <原始任务描述或任务ID>
Agent-Decision: <关键设计决策及理由（为什么用A不用B）>
Agent-Limitation: <已知局限或后续TODO>
```

### 示例

```
feat(room): 添加子房间导航支持

子房间支持从主房间导航直接进入，保留当前房间状态。

Agent-Task: 房间系统 V2.1 子房间功能
Agent-Decision: 使用 URL 参数 /room/:parentId/:subRoomId 而非嵌套路由
Agent-Limitation: 子房间超过10个时UI需要优化，待后续处理
```

---

## Checkpoint Commit（大任务）

超过 20 分钟的任务必须分阶段：

1. 数据模型/接口定义
2. 核心逻辑实现
3. 测试编写
4. 文档更新

阶段 commit 使用 `[WIP]` 前缀，完成后用 `git rebase -i` 整理为原子 commit。

---

## Atomic Commit 原则

一个 commit 只表达一个可解释、可回滚、可验证的语义变化。

**导航修改的 Atomic 边界**：新增导航入口时，一个 commit 必须同时包含：
- `GamePage.tsx` 的 TABS 数组
- `SidebarNav.tsx` 的新入口
- `MobileNav.tsx` 的新入口
- `stores/ui.ts` 的 GameTab/NavTab 类型更新

---

## 禁止提交的内容

- API keys、数据库连接串（使用环境变量）
- 构建产物 `dist/`、`node_modules`
- 本地配置文件 `.env*.local`
- 大体积二进制文件

---

## 并发任务隔离

遇到紧急修复时，使用 git worktree：

```bash
git worktree add ../coc-hotfix -b hotfix/xxx
cd ../coc-hotfix
# 修复 → commit → push → 开 PR
git worktree remove ../coc-hotfix
```

---

## 部署追溯

deploy.sh 自动记录部署信息到 `deploy.log`：

```
2026-05-24 14:30:00 | deployed: a1b2c3d | branch: develop
```
