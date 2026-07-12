# 生产发布基线与可回滚发布通道

日期：2026-07-10

## 结论

线上当前仍运行在旧目录 `/opt/coc-platform`，PM2 进程 `coc-server` 从 `/opt/coc-platform/apps/server/dist/index.js` 启动，Nginx 静态根目录仍指向 `/opt/coc-platform/apps/server/public`。服务器 Git HEAD 是 `ac2f93c`，但线上实际已经包含后续静态资源、全站招募板和帮助页，以及 Prisma 迁移 `20260710090000_add_global_recruitment_board`。

因此后续发布不得再用“服务器 Git HEAD 等于线上版本”做判断。新基线采用平行 release 目录：

- 版本化发布目录：`/opt/coc-platform-releases/<commit>`
- 当前指针：`/opt/coc-platform-current`
- 持久化数据：`/opt/coc-platform-data`
- 持久化环境变量：`/opt/coc-platform-data/env/server.env`
- 持久化上传：`/opt/coc-platform-data/uploads`

`/opt/coc-platform` 暂时只作为旧生产根和回退参照保留，不清理、不覆盖。

## 只读盘点结果

- 生产入口：`https://coc.city/`
- 服务器：`64.90.30.232`
- PM2：`coc-server` 在线，fork 模式，PID `4063353`，当前工作目录 `/opt/coc-platform/apps/server`
- 后端端口：`3001`
- 本机健康检查：`http://127.0.0.1:3001/health` 返回 `{"status":"ok"}`
- 公网 `/health`：当前被前端 `index.html` 接住，不应作为唯一健康检查
- 数据库：`/opt/coc-platform-data/dev.db`
- 环境变量来源：`/opt/coc-platform/apps/server/.env`，变量名包括 `DATABASE_URL`、`JWT_SECRET`、`NODE_ENV`、`PORT`、`CLIENT_URL` 和 AI provider key；未在文档中回显密钥值
- Nginx：`/api`、`/socket.io` 代理到 `localhost:3001`；`/` 静态根为 `/opt/coc-platform/apps/server/public`；`/uploads` alias 为旧 public uploads
- 服务器工作区差异：`git status --porcelain` 约 200 项，其中多数是静态资源删除/新增和历史 dist 备份；不得自动清理
- 最新已确认备份：`/opt/coc-platform-data/backups/global-recruitment-about-help-20260710T033005Z`
- 已应用数据库迁移：`20260710090000_add_global_recruitment_board`
- 招募表存在：`GlobalRecruitmentPost`、`GlobalRecruitmentReport`、`GlobalRecruitmentResponse`

## 新发布流程

### 1. 本机构建 release 包

在 `Y:\sunkencity` 执行：

```powershell
.\scripts\release\build-production-release.ps1 -Commit HEAD
```

脚本会：

- 要求 tracked 工作区干净。
- 构建 `apps/server`。
- 构建 `apps/web`。
- 用 `git archive` 打包指定 commit 的源码。
- 把 `apps/server/dist` 与前端 `apps/web/dist` 注入 release 包。
- 生成 `release-manifest.json` 和 `.sha256`。

如需上传：

```powershell
.\scripts\release\build-production-release.ps1 -Commit HEAD -Upload
```

默认上传到：

`/opt/coc-platform-data/incoming-releases`

### 2. 服务器平行准备

上传后在服务器执行：

```bash
bash /path/to/server-release.sh prepare \
  --commit <commit> \
  --archive /opt/coc-platform-data/incoming-releases/coc-platform-<short>.tar.gz
```

`prepare` 只做平行目录准备，不改变生产流量：

- 创建 `/opt/coc-platform-releases/<commit>`。
- 首次创建 `/opt/coc-platform-data/env/server.env`，来源为旧 `.env`。
- 首次创建 `/opt/coc-platform-data/uploads`，来源为旧 uploads。
- 将 release 内 `.env` 与 uploads 软链到持久化目录。
- 安装服务端依赖并运行 Prisma generate。

### 3. 数据库迁移

迁移必须单独执行：

```bash
bash /path/to/server-release.sh migrate --commit <commit>
```

规则：

- 迁移前自动备份 `/opt/coc-platform-data/dev.db`。
- 只使用 release 内的 Prisma schema 与迁移目录。
- 对不可逆迁移，只能通过数据库备份回退，不能假设 Prisma 自动 down migration。

### 4. 受控切换

轻量验证通过后才执行：

```bash
bash /path/to/server-release.sh activate --commit <commit>
```

`activate` 会：

- 把 `/opt/coc-platform-current` 原子指向 release 目录。
- 备份 Nginx site 文件和 PM2 dump。
- 将 Nginx 静态根改为 `/opt/coc-platform-current/apps/server/public`。
- 将 `/health` 明确代理到后端。
- 将 `/uploads` 指向 `/opt/coc-platform-data/uploads`。
- 用 PM2 从 `/opt/coc-platform-current/apps/server/dist/index.js` 启动 `coc-server`。
- 运行本机后端健康检查。

### 5. 回滚

如果新版本已切换但发现问题，优先回滚应用目录：

```bash
bash /path/to/server-release.sh rollback --commit <previous-good-commit>
```

`<previous-good-commit>` 可使用 prepared release 的目录短 SHA、唯一 SHA 前缀，或该 release manifest 中的完整 SHA。脚本会依序解析精确目录、唯一前缀、manifest 完整 SHA，并在受控发布目录外再检查当前指针与 legacy checkout；任何多重匹配都会拒绝执行，绝不猜测回滚目标。当前生产若目录为 `de9dc9c5c0e4`、manifest 记录完整 SHA，可安全使用任一对应形式；操作记录优先保存完整 SHA。

数据库注意：

- 若本次只包含可兼容迁移，通常回滚应用即可。
- 若包含不可逆迁移或数据改写，必须先评估是否从 `dev.db.pre-migrate` 备份恢复。
- 恢复数据库前必须再次备份当前数据库，避免丢失用户新写入。

## 当前建议

鉴于服务器旧工作区已有约 200 项本地差异，第一步应先把新通道平行准备到 `/opt/coc-platform-releases/<commit>`，并用 `server-release.sh inspect`、`health`、Nginx 配置测试做轻量验证。只有确认 release 包、依赖安装、持久化软链、PM2 启动路径和回滚入口都可用后，才进行一次受控 `activate`。

本轮不得删除：

- `/opt/coc-platform`
- `/opt/coc-platform-data/backups`
- 旧 `apps/web/dist.prev-*`
- 旧 `apps/server/public/assets.prev-*`
- 生产数据库或 uploads

## 语音专项纳入发布闸门

语音专项交接文档：

`docs/room-realtime-voice-channel-v1-phase0-phase1-handoff-2026-07-10.zh-CN.md`

2026-07-10 只读检查结果：

- 当前服务器未发现 `livekit`、`coturn` 或 `turnserver` 进程。
- 当前未监听 `7880`、`7881`、`3478`、`5349` 或语音 relay 相关端口。
- 当前 Nginx 配置未发现 LiveKit/turn/voice 入口。
- 当前 `/etc/letsencrypt/live` 下未发现语音域名证书目录。

因此，语音线程当前可以进入“生产部署准备”，但不能直接切换生产流量。语音上线必须先满足以下闸门：

1. **实例位置**：记录可用 LiveKit 与 coturn 实例的真实部署位置。推荐目录为 `/opt/coc-voice/livekit`、`/opt/coc-voice/coturn`，运行方式可为 systemd 或 Docker Compose，但必须写明服务名、配置路径、日志路径和回滚方式。
2. **域名与入口**：确认浏览器可访问的 `LIVEKIT_URL=wss://<voice-domain>`，并记录 TLS 证书目录；LiveKit API/WebSocket 入口、Nginx/Caddy 代理和公网 DNS 必须通过轻量验证。
3. **网络端口**：确认 ICE TCP/UDP、TURN UDP/TLS 和 relay port range 的云防火墙、系统防火墙和进程监听状态。最低检查项为 `7880/tcp`、`7881/tcp`、`3478/udp`、`5349/tcp`、`50000-60000/udp` 或实际配置的 relay range。
4. **secret 注入**：`LIVEKIT_API_KEY`、`LIVEKIT_API_SECRET`、`LIVEKIT_URL`、`LIVEKIT_TOKEN_TTL_SECONDS`、`ROOM_VOICE_MAX_PARTICIPANTS`、`ROOM_VOICE_OBSERVER_CAN_SPEAK` 只写入 `/opt/coc-platform-data/env/server.env` 或等价 secret store，不提交到 Git，不写入 release 包。
5. **启动与日志**：LiveKit/coturn 必须有独立启动命令、健康检查、日志读取命令和失败回滚路径；`coc-server` 只负责签发 token，不承载媒体流。
6. **无迁移回滚**：如果语音发布不包含数据库迁移，仍需在发布前备份 `/opt/coc-platform-data/dev.db`，失败时按应用回滚、环境变量回滚、语音服务回滚三个层级恢复；数据库只在确认被写坏时恢复备份。
7. **生产流量保护**：未通过 `server-release.sh voice-readiness`、本机 `coc-server` health、LiveKit WebSocket/API 检查、TURN relay 可达性检查和双浏览器真实通话前，不切换生产语音入口。

只读检查命令：

```bash
bash /opt/coc-platform-current/scripts/release/server-release.sh voice-readiness
```

在首次切换到新发布通道前，可以从准备好的 release 目录执行同一命令：

```bash
bash /opt/coc-platform-releases/<commit>/scripts/release/server-release.sh voice-readiness
```

该命令只输出变量是否存在、进程/端口/TLS/Nginx 提示，不输出 secret 值。

## 给主线程的交接口径

- 新发布基线不再是服务器 Git HEAD，而是 `/opt/coc-platform-releases/<commit>` 加 `release-manifest.json`。
- 当前生产仍可由 `/opt/coc-platform` 回退参照，但后续发布应通过 `/opt/coc-platform-current` 指针切换。
- 回滚入口是 `server-release.sh rollback --commit <previous-good-commit>`。
- 数据库回滚必须按备份文件单独处理，尤其是不可逆迁移。
- 语音线程可以进入生产部署准备，但必须先补齐 LiveKit/coturn 实例、域名 TLS、端口可达性、secret 注入、服务健康检查和回滚记录；上述条件满足前不得切换语音生产流量。
