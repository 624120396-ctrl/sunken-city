# 房间实时语音频道 V1 Phase 0/1 交接

更新时间：2026-07-10  
范围：设计/网络/契约预研与本地服务端令牌、前端语音骨架。未进行生产部署。

## 结论

V1 采用 LiveKit 承载 WebRTC 真人语音，一个《沉没之城》房间对应一个 LiveKit room。应用服务端只负责根据真实房间成员身份、`myRole`、`myCapabilities`、`myBinding`、`lifecycle` 派生出的权限签发短期令牌；LiveKit/coturn 的地址、密钥、端口与运行方式全部通过环境变量和基础设施配置解耦，密钥不入库。

当前已经完成本地 Phase 0/1 骨架：服务端语音状态与令牌接口、可测试的授权契约、桌面工具台入口、移动端工具抽屉入口、明确文字回退。正式上线仍必须等待“生产发布基线与可回滚发布通道”专项交接，不得绕过。

## 架构

- 语音房间：`sunken-room-<roomId>`，由服务端统一生成，前端不自行拼权限。
- 服务端接口：
  - `GET /api/rooms/:roomId/voice/status`：返回语音配置状态、可加入/可管理能力、观察者是否可发言。
  - `GET /api/rooms/:roomId/voice/token`：仅在 LiveKit 配置完整时签发短期 JWT。
- 前端入口：
  - 桌面端：嵌入已定版房间右侧工具台，不重构房间 UI。
  - 移动端：放在工具抽屉顶部，避免挤占 PL 聊天输入区、骰点和常用检定。
- V1 目标：4-8 人常见房间，配置层预留 10 人上限，不承诺大型频道。

## 鉴权与令牌

- 加入语音要求 `myCapabilities.canViewPublicContent`。
- KP 与玩家是否可开麦由 `canSendPublicMessage` 与房间角色共同决定。
- KP 管理能力只映射必要的 LiveKit room 级能力：`roomAdmin = myCapabilities.canUseKPTools`。
- OBSERVER 默认可听不可发言；是否可发言只由 `ROOM_VOICE_OBSERVER_CAN_SPEAK=true` 打开，不在前端猜测。
- 令牌只允许麦克风音频发布：`canPublishSources = ['microphone']`，禁用 data publish。
- 默认 TTL 为 900 秒，最大限制 3600 秒。
- 令牌 metadata 仅包含房间、角色、成员 id 与 voiceVersion，不包含密钥。

参考依据：LiveKit 官方说明将 access token 作为 JWT，承载 identity、room 和能力；grant 支持 `roomJoin`、`canPublish`、`canSubscribe`、`canPublishSources` 等字段：[Tokens and grants](https://docs.livekit.io/frontends/reference/tokens-grants/)。服务端 JS SDK 官方方案使用 `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` 签发 token：[Server SDK JS](https://docs.livekit.io/reference/server-sdk-js/)。

## 配置

应用环境变量：

```env
LIVEKIT_URL=wss://livekit.example.com
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_TOKEN_TTL_SECONDS=900
ROOM_VOICE_MAX_PARTICIPANTS=10
ROOM_VOICE_OBSERVER_CAN_SPEAK=false
```

缺少 `LIVEKIT_URL`、`LIVEKIT_API_KEY`、`LIVEKIT_API_SECRET` 时，状态接口返回 `MISSING_CONFIG`，令牌接口返回 `VOICE_NOT_CONFIGURED`；响应只暴露缺失键名，不暴露 secret。

## 网络与端口

LiveKit 自托管官方端口基线：

- API/WebSocket：`7880`
- ICE over TCP：`7881`
- ICE over UDP：`50000-60000/udp`
- TURN/UDP：`3478/udp`
- TURN/TLS：`5349/tcp`

官方 VM 部署说明还要求生产前处理 DNS、TLS、`80/443` 与防火墙策略：[LiveKit VM deployment](https://docs.livekit.io/transport/self-hosting/vm/)、[ports and firewall](https://docs.livekit.io/transport/self-hosting/ports-firewall/)。

coturn 独立部署时，官方镜像默认涉及 `3478`、`5349` 和 relay port range，并建议按网络模式正确暴露中继端口：[coturn Docker image](https://hub.docker.com/r/coturn/coturn)。

## 隐私与不做范围

本专项只做真人实时语音：

- 不录音、不录像、不回放。
- 不做 STT、TTS、AI 语音、自动转写/总结。
- 不做声纹、变声、跨房间语音大厅。
- 不改官方规则、结团成长、后台/admin。

前端错误回退必须明确提示继续使用文字聊天和骰点，语音故障不得阻断房间核心聊天、骰点、暗骰保护、生命周期和结算写回。

## 成本预估

V1 以 4-8 人房间为目标，带宽和 CPU 成本主要取决于是否启用 SFU 转发、TURN 中继比例和弱网/跨网用户比例。上线前建议按 10 人峰值进行压测预算，但产品承诺仍按 4-8 人常见房间表达。若大量用户走 TURN 中继，带宽费用会明显高于直连/普通 SFU 转发，需要在发布基线专项中确认机型、带宽上限、UDP 可达性和监控告警。

## 本地验证

已完成的窄验证：

- 服务端授权契约测试：配置缺失不泄密、KP/玩家只发麦克风、OBSERVER 默认只听、participant identity 稳定。
- 前端语音面板测试：配置不可用文字回退、发言成员摘要、重连/断开状态文案。

待发布基线专项交接后再做：

- 生产 LiveKit/coturn 实例与域名 TLS。
- 防火墙端口、UDP/TCP 可达性和 TURN relay 验证。
- 真实浏览器双端通话验证。
- 可回滚发布通道与监控告警确认。

## 部署前置条件

1. 发布基线专项确认可回滚通道、目标服务器、DNS/TLS 与防火墙变更窗口。
2. LiveKit API key/secret 写入生产环境变量，不提交到仓库。
3. 确认 `LIVEKIT_URL` 为浏览器可访问的 `wss://` 地址。
4. 确认 coturn/LiveKit 端口策略，尤其是 UDP relay 范围。
5. 确认 OBSERVER 是否允许发言；默认保持 `ROOM_VOICE_OBSERVER_CAN_SPEAK=false`。
6. 上线前只做语音专项验证，不扩大到全站深度测试。
