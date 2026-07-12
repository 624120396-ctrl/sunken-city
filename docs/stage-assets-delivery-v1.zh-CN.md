# 私有舞台素材投递 V1 与单房间灰度准备

## 边界

本方案复用 `coc-server`：`stage-assets.coc.city` 只反代 `/delivery/:assetId` 到同一服务的 `/api/stage-assets/delivery/:assetId`，不增加常驻进程，也不公开目录或 `storageKey`。

`STAGE_ASSET_DELIVERY_SECRET` 仅由服务器执行 `scripts/release/configure-stage-assets-delivery.sh` 时生成，写入 `/opt/coc-platform-data/env/server.env`（0600）；严禁提交、打印或复制到 release 包。

## 部署顺序（本提交不执行）

1. 先将发布包 prepare 到独立 release；全局 `ROOM_STAGE_ENABLED` 保持未设置/false。
2. 在服务器执行 `configure-stage-assets-delivery.sh`，检查 `/opt/coc-platform-data/stage-assets` 为 0750 且 `server.env` 为 0600。
3. 将 `ops/stage-assets/stage-assets.coc.city.nginx.conf` 安装为独立 Nginx site，获取该域名证书，`nginx -t` 后 reload。该 host 除 `/delivery/` 外均返回 404，access log 关闭以避免记录带签名的 query。
4. 以 `apps/server/scripts/stage-assets-import.ts` 受控导入背景、立绘和 BGM；导入命令只在目标服务器运行，并传入真实 room/user id，不把测试密码写入命令、日志或文档。
5. 由独立审计检查签名 URL（200/206、过期 403、篡改 403、目录穿越不可达）和 Nginx 仅暴露 delivery。
6. 审计通过后，才允许受控数据操作：为 `WUSOAN` seed StageAsset、StageThemePack、主舞台 scene；最后单独批准 `stageEnabled=true`。本轮不得写生产库，也不得开启全局开关。

## 素材与回滚

持久素材根：`/opt/coc-platform-data/stage-assets/<internal-room-id>/<kind>/<uuid>.<ext>`。数据库只保存相对 `storageKey`；delivery 从不返回它。

若灰度失败：先把 WUSOAN `stageEnabled` 设回 false，并移除 Nginx site/环境变量（保留素材与数据库记录以便审计）；全局 `ROOM_STAGE_ENABLED` 不触碰。
