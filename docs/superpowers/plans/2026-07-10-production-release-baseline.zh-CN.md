# Production Release Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为《沉没之城》建立可重复、可审计、可回滚的生产发布通道，替代长期按文件覆盖导致的服务器源码漂移。

**Architecture:** 本地从干净 commit 构建 release 包，服务器解包到 `/opt/coc-platform-releases/<commit>`，生产流量由 `/opt/coc-platform-current` 指针、PM2 和 Nginx 共同指向当前版本。数据库、环境变量、uploads 和备份统一留在 `/opt/coc-platform-data`，应用版本目录只保存可替换的代码和构建产物。

**Tech Stack:** PowerShell 本地构建脚本、Bash 服务器发布脚本、React/Vite 静态构建、Express/Prisma/SQLite 后端、PM2、Nginx。

## Global Constraints

- 不删除 `/opt/coc-platform`、旧备份、生产数据库或 uploads。
- 所有生产写操作先备份。
- 不把服务器 Git HEAD 当成线上版本。
- 未授权深度测试时，只做发布专项必要轻量验证。
- 不碰后台/admin、产品功能、房间权限、Socket、骰点、战斗和业务数据。

---

### Task 1: 本地 Release 包

**Files:**
- Create: `scripts/release/build-production-release.ps1`

**Interfaces:**
- Consumes: Git commit id, local `apps/server` and `apps/web` build scripts.
- Produces: `RELEASES/coc-platform-<shortCommit>.tar.gz`, `.sha256`, and embedded `release-manifest.json`.

- [x] **Step 1: Require a tracked-clean working tree**

Run:

```powershell
git diff --quiet
git diff --cached --quiet
```

Expected: exit code `0`.

- [x] **Step 2: Build server and web**

Run:

```powershell
cd apps/server; npm run build
cd ../web; npm run build
```

Expected: both commands exit `0`.

- [x] **Step 3: Package committed source plus build artifacts**

Use `git archive` for committed source, then copy `apps/server/dist` and `apps/web/dist` into the package.

### Task 2: 服务器 Release 管理

**Files:**
- Create: `scripts/release/server-release.sh`

**Interfaces:**
- Consumes: uploaded release archive and commit id.
- Produces: `/opt/coc-platform-releases/<commit>`, `/opt/coc-platform-current`, PM2/Nginx switch and rollback commands.

- [x] **Step 1: Implement `inspect`**

Output current release pointer, persistent data paths, legacy root, PM2 cwd and exec path without printing secret values.

- [x] **Step 2: Implement `prepare`**

Create the release directory, install dependencies, link persistent `.env` and uploads, and avoid changing production traffic.

- [x] **Step 3: Implement `migrate`**

Back up `/opt/coc-platform-data/dev.db`, then run `npx prisma migrate deploy`.

- [x] **Step 4: Implement `activate` and `rollback`**

Switch `/opt/coc-platform-current`, update Nginx static/upload roots, restart PM2 from the current pointer, and verify local backend health.

### Task 3: 中文运维文档

**Files:**
- Create: `docs/production-release-baseline-2026-07-10.zh-CN.md`

**Interfaces:**
- Consumes: read-only production inventory and release script behavior.
- Produces: operator-facing baseline, release steps, rollback entry, and risk notes.

- [x] **Step 1: Record read-only inventory**

Document PM2, Nginx, data paths, migration state, static asset state and server Git drift.

- [x] **Step 2: Record release and rollback commands**

Document build, upload, prepare, migrate, activate, health and rollback commands.

- [x] **Step 3: Record boundaries**

Document the no-delete rule for `/opt/coc-platform`, backups, database, uploads and existing drift.

### Task 4: 语音发布闸门

**Files:**
- Modify: `scripts/release/server-release.sh`
- Modify: `docs/production-release-baseline-2026-07-10.zh-CN.md`

**Interfaces:**
- Consumes: `docs/room-realtime-voice-channel-v1-phase0-phase1-handoff-2026-07-10.zh-CN.md`, production process/port/TLS read-only checks.
- Produces: `server-release.sh voice-readiness` and a Chinese release gate for LiveKit/coturn production deployment.

- [x] **Step 1: Add a read-only voice readiness command**

Run:

```bash
bash scripts/release/server-release.sh voice-readiness
```

Expected before voice infra exists: non-zero exit, with missing env/process/port/TLS hints and no secret values.

- [x] **Step 2: Document voice deployment prerequisites**

Record required LiveKit/coturn deployment location, domain/TLS, port reachability, secret injection path, health/log/rollback commands and no-migration rollback handling.
