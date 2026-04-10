# 沉没之城 API 参考文档

**版本**: v1.4.5  
**生成日期**: 2026-04-10  
**Base URL**: `https://coc.city/api`

本文档汇总了 v1.4.5 当前全部 API，按业务模块整理。

## 目录

- [管理后台](#module-admin)
- [AI](#module-ai)
- [公告](#module-announcements)
- [认证与用户](#module-auth)
- [角色](#module-characters)
- [战斗](#module-combat)
- [倒计时](#module-countdown)
- [骰子](#module-dice)
- [梦境](#module-dreaming)
- [钓鱼](#module-fishing)
- [论坛](#module-forum)
- [好友](#module-friends)
- [通知](#module-notifications)
- [私信](#module-private-message)
- [等级与称号](#module-rank-title)
- [遗物](#module-relics)
- [报告](#module-reports)
- [房间](#module-rooms)
- [商城](#module-shop)
- [上传](#module-uploads)
- [更新记录](#changelog)

<a id="module-admin"></a>
## 管理后台

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/dashboard` | Admin | 获取管理仪表盘数据 |
| GET | `/users` | Admin | 获取用户列表 |
| PATCH | `/users/:id/admin` | Admin | 设置用户管理员权限 |
| PATCH | `/users/:id/currency` | Admin | 调整用户货币 |
| DELETE | `/users/:id` | Admin | 删除用户 |
| GET | `/characters` | Admin | 获取角色列表 |
| GET | `/characters/:id` | Admin | 获取角色详情 |
| PATCH | `/characters/:id` | Admin | 更新角色信息 |
| DELETE | `/characters/:id` | Admin | 删除角色 |
| GET | `/rooms` | Admin | 获取房间列表 |
| POST | `/rooms/:id/close` | Admin | 关闭房间 |
| GET | `/settings` | Admin | 获取系统设置 |
| PUT | `/settings` | Admin | 设置系统设置 |
| POST | `/notifications/broadcast` | Admin | 发送全站广播通知 |

<a id="module-ai"></a>
## AI

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/ai/generate-image` | - | 生成 AI 图片 |
| POST | `/rooms/:id/narrate` | - | 生成房间旁白 |
| POST | `/rooms/:id/npc-reply` | - | 生成 NPC 回复 |
| POST | `/rooms/:id/summarize` | - | 生成房间总结 |
| POST | `/characters/:id/portrait/preview` | - | 预览角色立绘 |
| POST | `/characters/:id/portrait/confirm` | - | 确认角色立绘 |
| GET | `/characters/:id/portrait/quota` | - | 获取角色立绘配额 |

<a id="module-announcements"></a>
## 公告

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/announcements` | Admin | 获取公告列表 |
| POST | `/announcements` | Admin | 创建公告 |
| PATCH | `/announcements/:id` | Admin | 更新公告 |
| DELETE | `/announcements/:id` | Admin | 删除公告 |
| GET | `/announcements` | - | 获取公告列表 |
| GET | `/announcements/:id` | - | 获取公告详情 |

<a id="module-auth"></a>
## 认证与用户

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/register` | - | 注册账号 |
| POST | `/login` | - | 用户登录 |
| GET | `/me` | - | 获取当前用户信息 |
| PATCH | `/me` | - | 更新当前用户信息 |
| POST | `/me/password` | - | 修改当前用户密码 |
| PUT | `/me/displayed-character` | - | 设置当前展示角色 |
| POST | `/daily-checkin` | - | 执行每日签到 |
| GET | `/users/search` | - | 搜索用户 |

<a id="module-characters"></a>
## 角色

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/occupations` | - | 获取职业列表 |
| POST | `/generate/attributes/roll` | - | 生成掷骰属性 |
| POST | `/generate/attributes/pointbuy` | - | 生成购点属性 |
| POST | `/generate/age-adjustment` | - | 计算年龄修正 |
| POST | `/generate/skill-points` | - | 计算技能点 |
| POST | `/generate/preview` | - | 生成角色预览 |
| GET | `/characters` | - | 获取角色列表 |
| GET | `/characters/:id` | - | 获取角色详情 |
| POST | `/characters` | - | 创建角色 |
| POST | `/characters/:id/growth` | - | 执行角色成长 |
| PATCH | `/characters/:id/quick-skills` | - | 更新快捷技能 |
| PATCH | `/characters/:id/avatar` | - | 更新角色头像 |
| PATCH | `/characters/:id` | - | 更新角色信息 |
| DELETE | `/characters/:id` | - | 删除角色 |

<a id="module-combat"></a>
## 战斗

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/rooms/:roomId/combat` | - | 获取战斗状态 |
| POST | `/rooms/:roomId/combat/start` | - | 开始战斗 |
| POST | `/rooms/:roomId/combat/attack` | - | 提交攻击动作 |
| POST | `/rooms/:roomId/combat/next-turn` | - | 推进至下一回合 |
| POST | `/rooms/:roomId/combat/end` | - | 结束战斗 |
| POST | `/rooms/:roomId/combat/heal` | - | 提交治疗动作 |

<a id="module-countdown"></a>
## 倒计时

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/rooms/:roomId/countdowns` | - | 获取房间倒计时列表 |
| POST | `/rooms/:roomId/countdowns` | - | 创建房间倒计时 |
| POST | `/rooms/:roomId/countdowns/:countdownId/stop` | - | 停止房间倒计时 |

<a id="module-dice"></a>
## 骰子

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/rooms/:roomId` | - | 获取房间骰点记录 |
| GET | `/characters/:characterId` | - | 获取角色骰点记录 |

<a id="module-dreaming"></a>
## 梦境

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/dream-cards` | Admin | 获取梦境卡牌列表 |
| PATCH | `/dream-cards/:id` | Admin | 更新梦境卡牌 |
| GET | `/dream/daily` | - | 获取每日梦境 |
| POST | `/dream/draw` | - | 抽取梦境卡牌 |
| POST | `/dream/select` | - | 选择梦境结果 |
| POST | `/dream/reveal` | - | 揭示梦境内容 |
| POST | `/dream/deep-reveal` | - | 执行深度揭示 |
| GET | `/dream/collection` | - | 获取梦境收藏 |
| GET | `/dream/history` | - | 获取梦境历史 |

<a id="module-fishing"></a>
## 钓鱼

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/fishing/status` | - | 获取钓鱼状态 |
| POST | `/fishing/cast` | - | 执行抛竿 |
| POST | `/fishing/reel` | - | 执行收线 |
| POST | `/fishing/sell` | - | 出售钓鱼收获 |
| GET | `/fishing/collection` | - | 获取鱼类收藏 |
| GET | `/fishing/logs` | - | 获取钓鱼日志 |

<a id="module-forum"></a>
## 论坛

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/forum/boards` | - | 获取论坛版块列表 |
| GET | `/forum/boards/:key/moderators` | - | 获取版块版主列表 |
| PATCH | `/forum/boards/:key` | - | 更新论坛版块 |
| POST | `/forum/boards/:key/moderators` | - | 添加版块版主 |
| DELETE | `/forum/boards/:key/moderators/:userId` | - | 移除版块版主 |
| GET | `/forum/users/me/moderated-boards` | - | 获取我管理的版块 |
| GET | `/forum/boards/:key/posts` | - | 获取版块帖子列表 |
| POST | `/forum/posts` | - | 创建帖子 |
| GET | `/forum/posts/:id` | - | 获取帖子详情 |
| POST | `/forum/posts/:id/replies` | - | 创建帖子回复 |
| POST | `/forum/posts/:id/like` | - | 点赞帖子 |
| POST | `/forum/posts/:id/best-reply` | - | 设置最佳回复 |
| PATCH | `/forum/posts/:id` | - | 更新帖子 |
| POST | `/forum/posts/:id/essence` | - | 设置帖子精华状态 |
| POST | `/forum/posts/:id/pin` | - | 设置帖子置顶状态 |
| DELETE | `/forum/posts/:id` | - | 删除帖子 |
| PATCH | `/forum/replies/:id` | - | 更新回复 |
| DELETE | `/forum/replies/:id` | - | 删除回复 |
| GET | `/forum/users/:id/stats` | - | 获取用户论坛统计 |

<a id="module-friends"></a>
## 好友

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/friends/requests` | - | 发送好友申请 |
| GET | `/friends/requests` | - | 获取好友申请列表 |
| PATCH | `/friends/requests/:id` | - | 处理好友申请 |
| DELETE | `/friends/requests/:id` | - | 撤销好友申请 |
| GET | `/friends` | - | 获取好友列表 |
| GET | `/friends/check/:userId` | - | 检查好友关系 |
| DELETE | `/friends/:userId` | - | 删除好友 |
| POST | `/friends/invite-room` | - | 发送房间邀请 |

<a id="module-notifications"></a>
## 通知

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/notifications` | - | 获取通知列表 |
| PATCH | `/notifications/:id/read` | - | 标记通知已读 |
| PATCH | `/notifications/read-all` | - | 标记全部通知已读 |
| DELETE | `/notifications/:id` | - | 删除通知 |

<a id="module-private-message"></a>
## 私信

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/rooms/:roomId/private-messages` | - | 获取房间私信列表 |
| POST | `/rooms/:roomId/private-messages` | - | 发送房间私信 |
| GET | `/rooms/:roomId/private-messages/unread` | - | 获取房间私信未读数 |

<a id="module-rank-title"></a>
## 等级与称号

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/ranks` | Admin | 获取等级列表 |
| POST | `/ranks` | Admin | 创建等级 |
| PUT | `/ranks/:id` | Admin | 更新等级 |
| DELETE | `/ranks/:id` | Admin | 删除等级 |
| GET | `/titles` | Admin | 获取称号列表 |
| POST | `/titles` | Admin | 创建称号 |
| PUT | `/titles/:id` | Admin | 更新称号 |
| DELETE | `/titles/:id` | Admin | 删除称号 |
| GET | `/users/:userId/titles` | Admin | 获取用户称号列表 |
| POST | `/users/:userId/titles` | Admin | 授予用户称号 |
| DELETE | `/users/:userId/titles/:titleKey` | Admin | 移除用户称号 |
| PUT | `/users/:userId/displayed-title` | Admin | 设置用户展示称号 |
| POST | `/users/:userId/exp/adjust` | Admin | 调整用户经验值 |
| GET | `/users/:userId/rank-history` | Admin | 获取用户等级历史 |
| GET | `/users/me/rank-title` | - | 获取当前用户等级称号信息 |
| GET | `/ranks` | - | 获取等级列表 |
| GET | `/titles` | - | 获取称号列表 |
| GET | `/users/me/titles` | - | 获取当前用户称号列表 |
| PUT | `/users/me/displayed-title` | - | 设置当前用户展示称号 |

<a id="module-relics"></a>
## 遗物

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/relics` | Admin | 获取遗物列表 |
| DELETE | `/relics/:id` | Admin | 删除遗物 |
| POST | `/relics/grant` | Admin | 发放遗物 |
| GET | `/relics/trades` | Admin | 获取遗物交易记录 |
| POST | `/relics/trades/:tradeId/cancel` | Admin | 取消遗物交易 |
| POST | `/relics/overrides/:key` | Admin | 设置遗物覆盖配置 |
| GET | `/relics/overrides` | Admin | 获取遗物覆盖配置 |
| GET | `/relics/registry` | - | 获取遗物图鉴 |
| GET | `/relics/character/:characterId` | - | 获取角色遗物列表 |
| GET | `/relics/unbound` | - | 获取未绑定遗物列表 |
| POST | `/relics/bind` | - | 绑定遗物 |
| POST | `/relics/room/:roomMemberId/carry` | - | 设置成员携带遗物 |
| GET | `/relics/room/:roomMemberId/carry` | - | 获取成员携带遗物 |
| POST | `/relics/room/:roomMemberId/validate` | - | 校验成员遗物配置 |
| GET | `/relics/market/listings` | - | 获取遗物交易挂单列表 |
| POST | `/relics/market/listings` | - | 创建遗物交易挂单 |
| DELETE | `/relics/market/listings/:tradeId` | - | 删除遗物交易挂单 |
| POST | `/relics/market/listings/:tradeId/buy` | - | 购买遗物挂单 |

<a id="module-reports"></a>
## 报告

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/rooms/:roomId/report` | - | 获取房间报告 |
| PATCH | `/rooms/:roomId/report` | - | 更新房间报告 |
| GET | `/rooms/:roomId/report/export` | - | 导出房间报告 |
| POST | `/rooms/:roomId/report/relics` | - | 生成报告遗物信息 |

<a id="module-rooms"></a>
## 房间

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/rooms` | - | 获取房间列表 |
| GET | `/rooms/:roomId` | - | 获取房间详情 |
| POST | `/rooms` | - | 创建房间 |
| POST | `/rooms/:roomId/join` | - | 加入房间 |
| POST | `/rooms/:roomId/leave` | - | 离开房间 |
| POST | `/rooms/:roomId/close` | - | 关闭房间 |
| GET | `/rooms/:roomId/applications` | - | 获取房间申请列表 |
| POST | `/rooms/:roomId/applications/:memberId/review` | - | 审核房间申请 |
| POST | `/rooms/:roomId/start` | - | 开始房间流程 |
| PATCH | `/rooms/:roomId/atmosphere` | - | 更新房间氛围 |
| PATCH | `/rooms/:roomId/members/:memberId/status` | - | 更新成员状态 |
| GET | `/rooms/:roomId/stats` | - | 获取房间统计 |
| GET | `/rooms/:roomId/clues` | - | 获取房间线索列表 |
| POST | `/rooms/:roomId/clues` | - | 创建房间线索 |
| PATCH | `/rooms/:roomId/clues/:clueId` | - | 更新房间线索 |
| DELETE | `/rooms/:roomId/clues/:clueId` | - | 删除房间线索 |
| GET | `/rooms/:roomId/npcs` | - | 获取房间 NPC 列表 |
| POST | `/rooms/:roomId/npcs` | - | 创建房间 NPC |
| PATCH | `/rooms/:roomId/npcs/:npcId` | - | 更新房间 NPC |
| DELETE | `/rooms/:roomId/npcs/:npcId` | - | 删除房间 NPC |

<a id="module-shop"></a>
## 商城

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/shop/items` | Admin | 获取商城商品列表 |
| POST | `/shop/items` | Admin | 创建商城商品 |
| PUT | `/shop/items/:id` | Admin | 更新商城商品 |
| DELETE | `/shop/items/:id` | Admin | 删除商城商品 |
| POST | `/users/:userId/currency/adjust` | Admin | 调整用户货币余额 |
| POST | `/items/grant` | Admin | 发放商城物品 |
| GET | `/shop/items` | - | 获取商城商品列表 |
| POST | `/shop/items/:key/purchase` | - | 购买商城商品 |
| GET | `/shop/inventory` | - | 获取商城背包 |
| POST | `/shop/equip` | - | 执行物品装备 |
| POST | `/shop/open-lootbox` | - | 开启战利品箱 |

<a id="module-uploads"></a>
## 上传

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/uploads` | - | 上传资源 |
| GET | `/uploads` | - | 获取上传资源列表 |
| DELETE | `/uploads/:id` | - | 删除上传资源 |

<a id="changelog"></a>
## 更新记录

- `v1.4.5` — 汇总当前全部 API
