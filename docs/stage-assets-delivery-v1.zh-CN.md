# 私有舞台素材投递 V1 与单房间灰度准备

## 边界

本方案复用 `coc-server`：`stage-assets.coc.city` 只反代 `/delivery/:assetId` 到同一服务的 `/api/stage-assets/delivery/:assetId`，不增加常驻进程，也不公开目录或 `storageKey`。应用会把签名绑定到 `STAGE_ASSET_DELIVERY_BASE_URL` 的 origin，并仅接受该受信任反代提供的 host/protocol；`coc.city` 主站对同一路径固定返回 404。

`STAGE_ASSET_DELIVERY_SECRET` 仅由服务器执行 `scripts/release/configure-stage-assets-delivery.sh` 时生成，写入 `/opt/coc-platform-data/env/server.env`（0600）；严禁提交、打印或复制到 release 包。脚本每次更新前会在同目录创建 `server.env.stage-assets-delivery.<UTC>.bak`（0600），并通过同目录临时文件原子替换；失败时原 `server.env` 不会被覆盖。

## 部署顺序（本提交不执行）

1. 先将发布包 prepare 到独立 release；全局 `ROOM_STAGE_ENABLED` 保持未设置/false。
2. 在服务器执行 `configure-stage-assets-delivery.sh`，检查 `/opt/coc-platform-data/stage-assets` 为 0750 且 `server.env` 为 0600。若配置、Nginx 校验或 TLS 申请失败，使用脚本输出的精确 `cp -p <backup> /opt/coc-platform-data/env/server.env` 命令恢复环境文件，再移除未启用的 Nginx site；不要重启服务或开启房间。
3. 将 `ops/stage-assets/stage-assets.coc.city.nginx.conf` 安装为独立 Nginx site，获取该域名证书，`nginx -t` 后 reload。该 host 除 `/delivery/` 外均返回 404，access log 关闭以避免记录带签名的 query；必须保留 `X-Forwarded-Host $host` 和 `X-Forwarded-Proto https`。发布脚本生成的主站 Nginx 对 `/api/stage-assets/delivery/` 关闭 access log 并返回 404，不能删除该拒绝规则。
4. 以 `apps/server/scripts/stage-assets-import.ts` 受控导入背景、立绘和 BGM；导入命令只在目标服务器运行，并传入真实 room/user id，不把测试密码写入命令、日志或文档。
5. 由独立审计检查签名 URL（正确子域 200/206、过期/篡改/主站 host 403 或 404、目录穿越不可达）和 Nginx 仅暴露 delivery。delivery path 会绕开全局 `CLIENT_URL` CORS；响应包含 `Referrer-Policy: no-referrer`，仅允许 `STAGE_ASSET_ALLOWED_ORIGIN`（默认 `https://coc.city`）的无凭据 GET/HEAD/OPTIONS，其他 Origin 的预检必须 403，避免 bearer query 落入 Referer。
6. 审计通过后，才允许受控数据操作：为 `WUSOAN` seed StageAsset、StageThemePack、主舞台 scene；最后单独批准 `stageEnabled=true`。本轮不得写生产库，也不得开启全局开关。

## 素材与回滚

持久素材根：`/opt/coc-platform-data/stage-assets/<internal-room-id>/<kind>/<sha256>`。数据库只保存相对 `storageKey`；delivery 从不返回它。

若灰度失败：先把 WUSOAN `stageEnabled` 设回 false，并移除 Nginx site/环境变量（保留素材与数据库记录以便审计）；全局 `ROOM_STAGE_ENABLED` 不触碰。

## 受控工具约束

`stage-assets-import.ts` 仅接受目标房间的 active 成员作为上传者；`PRIVATE_TARGETS` 会去重并要求每个目标仍是 active 成员。迁移 `20260712140000_stage_asset_import_identity` 会为既有素材回填 `kind:sha256` 的 `importKey`，并以数据库唯一约束锁定 `roomId + importKey`。导入时同一 identity 的并发 loser 捕获 P2002 后回读 winner；文件位置同样由 hash 确定，因此不会留下竞争副本。ACL 与上传者完全相同才复用，冲突立即拒绝。文件先写入同目录临时文件、fsync、收紧为 0640 后原子 rename；非并发数据库失败会删除刚写入的文件。

delivery 所有 `/api/stage-assets/delivery/` 入口会在应用 morgan access log 前按 `originalUrl`/`url` 去 query 后匹配并完全跳过，因而主站错误路径与素材子域反代均不记录 bearer query。拒绝请求只产生结构化安全日志：状态码与 assetId 的短 SHA-256 摘要；绝不记录 query、签名、过期时间或用户标识。

`stage-wusoan-gray-seed.ts` 是不可泛化的 WUSOAN 工具，拒绝其他 `--room`。KP 只需为 active OWNER_KP/ASSISTANT_KP（或房主）而不绑定角色卡；seed 使用现有 `TEMPORARY` actorKind 创建 `director:<kpUserId>` 的 KP 导演 actor，`characterId` 保持空、名称取 KP 昵称、默认后台/KP_ONLY。它不是伪造 Character，也不影响 KP 以 `canManageStage` 控制场景。PL 必须是绑定本人角色卡的 active PLAYER，且仅 PL 创建 `PortraitPack`/`PortraitVariant`/`PLAYER_CHARACTER` actor。脚本仍校验背景、两张立绘、BGM 的 room/kind/visibility/uploader；snapshot 继续按冻结契约投射 `portraitAssetId`。同名 theme 的素材引用相同则 no-op，变更背景/BGM 时事务内受控更新 theme、版本和 snapshot，并在结果中记录 `themeAction`。`--apply` 与 `--enable-room-stage` 保持分离，enable 在事务内再次执行完整校验。
