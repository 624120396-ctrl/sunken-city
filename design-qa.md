# 房间系统视觉重构 QA 记录

日期：2026-07-06

参考图：

- `C:\Users\29102\Downloads\5daLPh6gj7Ky26LkCO7-_.png`
- `C:\WINDOWS\TEMP\codex-clipboard-c109d59d-a9ac-41ff-a6ae-3f5b1e229558.png`

本轮目标：把房间详情页桌面端继续向参考图靠拢，落实顶部 logo、统一房间号、左右栏对齐与开关、浅色舞台、深色工具台、可折叠场景卡片和重新生成的高质量材质。

V6.1 精修目标：修正左栏、右栏、底部输入区的层级问题。左栏应为自上而下渐隐的半透明参与者册；右栏应为整体材质背景加磨砂玻璃分区；角色与观众列表应使用金色细线分隔；底部输入条、工具条和聊天记录区应清晰分离。

V6.2/V6.3 可见区精修目标：删除中间舞台外层大包裹卡片；底部输入区压缩为单层命令栏；房间页背景透出全站 `AppBackground`；顶部左侧直接使用官方 `logo-gold.png`；当前场景左侧标记替换为真实金箔素材 `room-scene-sigil-skull-key.png`；左侧栏降低磨砂度并加强自上而下透明渐隐；右侧顶部工具按钮统一为同一套深色金边按钮。

V6.5 字体与材质精修目标：中文统一进入思源宋体系优先级，标题/姓名使用更高字重，正文使用常规字重；英文、数字和短标签使用更有仪式感的衬线字体栈；左侧栏和右侧栏外缘必须与顶部栏左右边缘对齐；右侧栏内部卡片统一为低磨砂玻璃，右侧工具按钮保持透明材质，不再使用纹理贴图。

V6.6 精修目标：继续向参考图方向收敛，避免黑色透明卡片和廉价大面积纹理；房间页本体不再单独铺背景，明确透出全站背景；左栏强化纸面纹理但降低磨砂，底部渐隐更自然；右栏保持“深色材质大背景 + 低磨砂小区域”，按钮只保留透明金边状态；当前场景卡片进一步缩小，聊天区和底部输入区保持清晰分割。

## 已验证通过

- 左上角已使用项目 logo 素材，不再是纯文字圆章。
- 房间名、阶段、场景状态、房间号统一放在顶部栏；左侧栏不再显示房间号。
- 桌面端主结构为三栏：左侧参与者册、中间浅色舞台、右侧深色工具台。
- 左右两侧栏与顶部栏下沿统一对齐，且左右栏均可收起与恢复。
- 当前场景卡片已缩小，并支持收起为摘要条。
- 背景改用沉没之城全站默认背景图 `/bg-sunken.png`，与 `AppBackground` 默认项 `bg-sunken` 保持一致。
- 新增并接入 V6 材质：浅色档案纸、深色工具台玄武岩、血红金边按钮、水下废墟场景图。
- 聊天区域保持浅色纸面，可读性优先，不再使用大面积黑色透明卡片。
- 左侧栏已改为自上而下渐隐透明效果，底部透出全站背景。
- 参与者卡片高度降低，属性信息改为更紧凑的横向排布。
- 右侧栏保留整体深色材质大背景，内部改为磨砂玻璃分区。
- 右侧“角色与观众”列表不再是一张张独立小卡，而是整块列表内以金色细线分隔。
- 底部聊天记录区、发送输入条、快捷技能条已拆成可见的独立层级。
- V6.2 后中间舞台底层大容器已移除，`.room-stage-surface-v3` 背景为透明，场景、聊天、底部命令栏各自独立。
- V6.2 后底部命令栏高度约 64px，输入、发送、快捷检定在桌面端同一横向层级内完成。
- V6.2 后房间页不再单独铺背景图，透出全站统一 `AppBackground`。
- V6.2 后当前场景左侧竖向装饰已替换为 `2 (23).png` 对应的真实金箔骷髅钥匙素材。
- V6.3 后左侧参与者栏底部透明度增强，能看到全站背景图，磨砂感降低。
- V6.3 后未连接状态的发送按钮改为更克制的血红金边禁用态，避免脏粉色块。
- V6.5 后房间页字体栈已统一：中文优先 `Source Han Serif SC` / `Noto Serif SC` / 宋体 fallback，英文与数字优先 `Cinzel` / `Cormorant Garamond` / `EB Garamond` / Georgia fallback。
- V6.5 后左右栏已与顶部栏左右边缘对齐：顶部栏左边 `x=21`，左栏左边 `x=21`；顶部栏右边 `1899`，右栏右边 `1899`。
- V6.5 后右侧栏分区卡片为低磨砂玻璃：`backdrop-filter: blur(2px) saturate(1.03)`。
- V6.5 后右侧工具按钮为透明材质；普通和激活态均无纹理贴图，激活态 `backgroundImage: none`。
- V6.5 后左侧参与者卡片数值改为两列排布，给在线状态预留空间，避免 HP/MP/SAN 与在线标记挤压。
- V6.6 后房间页 `.room-visual-rebuild` 明确为透明背景，避免覆盖全站统一 `AppBackground`。
- V6.6 后三栏桌面网格重新收敛为左栏 14.8rem、右栏 22.8rem，并保留左右折叠宽度，侧栏外缘继续贴齐顶部栏。
- V6.6 后当前场景卡片保持交接前的可读展开态，不再过度压缩；折叠态约 3.1rem。
- V6.6 后聊天记录区使用浅纸面底和更高对比正文，底部输入区与快捷检定仍是独立层级。
- V6.6 后右侧工具按钮普通/激活/悬浮状态继续强制 `background-image: none`，只保留透明玻璃与金边反馈。
- V6.6 纠偏后左侧栏恢复自上而下渐变透明，底部明显透出全站背景。
- V6.6 纠偏后测试样例恢复当前用户角色绑定，底部快捷投骰条重新出现。
- V6.6.1 后顶部栏改用新抠图中文 LOGO 素材 `logo-sunken-gothic-cutout.png`，并移除英文名显示。
- V6.6.1 后当前场景卡片左侧残留 CSS 金线已移除，右侧调整/收起按钮改为规整的小图标按钮。
- V6.6.1 后发送按钮移除上下白色透明条状伪影，按钮本体改为克制的血红平面材质。
- V6.6.1 后右侧栏材质纹理增强，内部卡片磨砂和阴影降低，整体更平面。
- V6.6.2 后当前场景卡片左侧恢复金色骷髅头装饰素材，但裁掉长箭头竖线，只显示骷髅徽记。
- V6.6.2 后当前场景卡右侧只保留一个圆形收起按钮，不再同时显示“调整场景”和收起两枚按钮。
- V6.6.2 后顶部外框改为圆角弧线，移除顶部栏和右侧工具台中的小型说明文字。
- V6.6.2 后发送按钮改为普通按钮实现，移除 MagneticButton 内部光效层，彻底消除上下白色透明条状伪影。
- 本轮未触碰后台/admin、Socket、骰点核心逻辑、战斗后端、私聊后端、生命周期写回。

## 截图验证

验证视口：1920 x 1080

展开状态截图：

- `C:\WINDOWS\TEMP\sunken-room-v6-visual-qa-data.png`

折叠状态截图：

- `C:\WINDOWS\TEMP\sunken-room-v6-collapse-qa.png`

V6.1 精修截图：

- `C:\WINDOWS\TEMP\sunken-room-v6-1-visual-audit.png`

V6.2 结构精修截图：

- `C:\WINDOWS\TEMP\sunken-room-v6-2-visual-audit.png`

V6.3 可见区精修截图：

- `C:\WINDOWS\TEMP\sunken-room-v6-3-visual-audit.png`

V6.5 字体与透明按钮精修截图：

- `C:\WINDOWS\TEMP\sunken-room-v6-5-3-visual-audit.png`

展开状态测量：

- 顶部栏：1878 x 84
- 左侧成员册：237 x 931
- 中央舞台：1225 x 931
- 右侧工具台：365 x 931
- 当前场景卡片：1200 x 191
- 左侧成员数：6/6
- 右侧角色与观众：6 人

折叠状态测量：

- 左侧收起栏：50 x 931
- 右侧恢复栏：50 x 931
- 场景摘要条：1702 x 54

V6.3 展开状态测量：

- 顶部栏：1878 x 84
- 左侧成员册：237 x 929
- 中央舞台区域：1219 x 929
- 当前场景卡片：1219 x 177
- 底部命令栏：1219 x 64
- 中央舞台外层背景：none

V6.5 展开状态测量：

- 顶部栏：x=21，right=1899，1878 x 84
- 左侧成员册：x=21，237 x 929
- 右侧工具台：right=1899，365 x 929
- 右侧卡片磨砂：blur(2px) saturate(1.03)
- 右侧激活按钮：backgroundImage=none，backgroundColor=rgba(255, 237, 171, 0.075)

V6.6 本轮说明：

- 本轮按用户要求执行深度测试，并生成新的 Playwright 桌面截图。
- 本轮改动集中在 `apps/web/src/styles/room-visual-rebuild.css` 的末尾 V6.6 覆盖层，避免扩大到业务逻辑。
- UI 合约脚本同步到组件拆分后的结构：`RoomPage.tsx` 引入 `RoomChatTranscript`，`room-message-list` 由 `RoomChatTranscript.tsx` 承载。

V6.6 截图：

- `C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-deep-test.png`
- `C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-deep-test-metrics.json`

V6.6 展开状态测量：

- 顶部栏：x=21，right=1899，1878 x 82
- 左侧成员册：x=21，237 x 932
- 中央舞台：1251 x 932
- 右侧工具台：right=1899，365 x 932
- 当前场景卡片：1251 x 184
- 聊天记录区：1251 x 668
- 底部命令栏：1251 x 61
- 快捷投骰条：376 x 47
- 房间页本体背景：none
- 右侧卡片磨砂：blur(0.8px) saturate(1.01)
- 右侧普通/激活按钮：backgroundImage=none

## 验证命令

```powershell
pnpm --filter @sunken-city/web typecheck
pnpm --filter @sunken-city/web lint
pnpm --filter @sunken-city/web build
pnpm --filter @sunken-city/web check:ui-system
```

截图 QA 使用本地 Playwright 夹具，仅模拟前端数据结构，不改变后端。

## Final Result

passed

## 剩余视觉风险

- 当前已进入可继续精修的基线，但和参考图相比，头像、细边框角花、按钮微动效和真实聊天消息密度仍可继续抛光。
- 真实房间数据如果缺少头像，成员卡片会显示默认图标；后续可补统一头像占位素材。
- 移动端房间页尚未按这张参考图做完整二次重构，本轮优先桌面端。

## V6.6.3 视觉修正记录

- 恢复当前场景卡片左侧金色骷髅头长竖线装饰，保留右侧单一圆形收起按钮。
- 顶部房间名下方改为单行显示房间号，不再显示阶段说明小字。
- 发送按钮重写为独立平面按钮，脱离旧 `button[type="submit"]` 材质叠加；局部截图确认上下白色透明条状伪影已消失。
- 左侧参与者卡片的 HP/MP/SAN 改为紧凑数值格，数字去除空格并使用等宽数字排版。

V6.6.3 轻量核查：

- `pnpm --filter @sunken-city/web typecheck`：通过。
- 本地 Playwright mock 截图：通过，无页面错误和控制台错误。
- 最新截图：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-deep-test.png`
- 发送按钮局部：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-send-crop.png`
- 左侧卡片局部：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-members-crop.png`
- 场景装饰局部：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-scene-ornament-crop.png`

## V6.6.4 顶部栏修正记录

- 顶部四幕进度条已隐藏，顶部栏中心区域不再显示幕次节点和虚线。
- 新生成顶部专用材质：`apps/web/public/ui-textures/room-v6-topbar-ritual.png` / `.webp`。
- 顶部栏背景改为深绿石材 + 低对比釉面层 + 极细金边，避免复用右侧栏材质导致的网格感。
- 顶部标题区和右侧操作按钮重新按两列布局，保留房间名、房间号、角色/观众/离开/关闭。

V6.6.4 轻量核查：

- `pnpm --filter @sunken-city/web typecheck`：通过。
- 本地 Playwright mock 截图：通过，无页面错误和控制台错误。
- 最新截图：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-deep-test.png`
- 顶部栏局部：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-topbar-crop.png`

## V6.6.5 / V6.6.6 操作区修正记录

- 顶部右侧角色、观众、离开、关闭按钮已平面化：去除凸起渐变和内阴影，只保留低对比暗底与金色描边。
- 底部快捷投骰改为分页式交互：桌面端每页 2 个技能，左右箭头切换，下方页码点显示当前页。
- 快捷投骰按钮放宽文字空间，避免“图书馆使用”等常用技能被截断。
- 左侧参与者卡片数值字体改为更清晰的 UI 数字字体，并略微提高字号、对比度。

V6.6.6 轻量核查：

- `pnpm --filter @sunken-city/web typecheck`：通过。
- 本地 Playwright mock 截图：通过，无页面错误和控制台错误。
- 最新截图：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-deep-test.png`
- 顶部按钮局部：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-top-actions-flat-crop.png`
- 快捷投骰局部：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-quick-roll-pager-crop.png`
- 左侧数值局部：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-member-stats-readable-crop.png`

## V6.6.7 消息区修正记录

- 消息间距收紧，消息列表从大块卡片感改为更接近参考图的连续记录流。
- 每条消息改为左侧头像、中间正文、右侧操作/骰点结果的三列结构。
- “归档”按钮从正文下方移到右侧操作区，并缩短文案、降低视觉权重。
- 骰点结果改为右侧结果卡，显示骰型、点数、成功状态。
- 系统提示保持单行，超长内容会在单行内省略，不再另起一行。

V6.6.7 轻量核查：

- `pnpm --filter @sunken-city/web typecheck`：通过。
- 有消息版本地 Playwright mock 截图：通过，无页面错误和控制台错误。
- 有消息版完整截图：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-messages-preview.png`
- 有消息版聊天局部：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-messages-preview-chat-crop.png`

## V6.6.8 归档入口修正记录

- 移除每条消息右侧常驻“归档”按钮，避免聊天记录区域被重复按钮占据。
- 新增统一“归档选择”入口，显示在聊天区右上方。
- 进入归档模式后才显示每条消息的选择框，可全选、退出选择、归档所选。
- 支持右键可归档消息：右键会进入归档选择并切换该消息选中状态。
- 骰点结果仍保留右侧结果卡，默认态不显示归档按钮。

V6.6.8 轻量核查：

- `pnpm --filter @sunken-city/web typecheck`：通过。
- 有消息版本地 Playwright mock 截图：通过，无页面错误和控制台错误。
- 有消息版聊天局部：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-messages-preview-chat-crop.png`

## V6.6.10 聊天材质修正记录

- 中间聊天区纸张材质加强，背景不再被大面积浅色层抹平。
- 消息卡片去除渐变，改为纸纹材质叠加平面底色。
- KP 消息、骰点消息、空状态、系统提示和归档工具条统一使用更明显的纸纹材质。
- 消息卡片阴影进一步降低，减少立体浮起感，保留细边框和可读性。

V6.6.10 轻量核查：

- `pnpm --filter @sunken-city/web typecheck`：通过。
- 有消息版本地 Playwright mock 截图：通过，无页面错误和控制台错误。
- 有消息版聊天局部：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-messages-preview-chat-crop.png`

## V6.6.11 白色大理石羊皮纸材质记录

- 新生成白色大理石 + 羊皮纸混合材质：`apps/web/public/ui-textures/room-v6-marble-parchment.png` / `.webp`。
- 房间页纸纹变量已从旧羊皮纸切换为新材质。
- 聊天区、消息卡片、骰点结果、系统提示和归档工具条底色同步调白，减少旧黄纸感。

V6.6.11 轻量核查：

- `pnpm --filter @sunken-city/web typecheck`：通过。
- 有消息版本地 Playwright mock 截图：通过，无页面错误和控制台错误。
- 新材质预览：`C:\Users\29102\Documents\沉没之城\apps\web\public\ui-textures\room-v6-marble-parchment.png`
- 有消息版聊天局部：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-messages-preview-chat-crop.png`

## V6.6.12 做旧羊皮纸材质记录

- 按参考图重新生成做旧羊皮纸材质：`apps/web/public/ui-textures/room-v6-aged-parchment.png` / `.webp`。
- 房间页纸纹变量已从白色大理石羊皮纸切换为做旧羊皮纸。
- 聊天区和消息卡片恢复暖白旧纸底色，去除大理石细脉络。
- 四角和边缘增加低强度旧污层，避免明显脏块或重复条纹。

## V6.6.13 做旧材质稳定记录

- 旧纸纹最终改为无网格、低对比、暖白羊皮纸版本：`apps/web/public/ui-textures/room-v6-aged-parchment-soft.png` / `.webp`。
- CSS 指向新文件名，避免浏览器继续缓存旧材质。
- 移除会产生块状感的污渍背景层，四角和边缘旧污改为轻微内阴影。

V6.6.13 轻量核查：

- `pnpm --filter @sunken-city/web typecheck`：通过。
- 有消息版本地 Playwright mock 截图：通过，无页面错误和控制台错误。
- 有消息版聊天局部：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-messages-preview-chat-crop.png`

## V6.6.14 偏白旧纸材质记录

- 旧纸纹理素材整体提亮并降低饱和度，生成：`apps/web/public/ui-textures/room-v6-aged-parchment-white.png` / `.webp`。
- 房间页纸纹变量已切到偏白版素材。
- 聊天区、消息卡片、骰点结果和系统提示底色同步提白，边缘旧污强度略微降低。

V6.6.14 轻量核查：

- `pnpm --filter @sunken-city/web typecheck`：通过。
- 有消息版本地 Playwright mock 截图：通过，无页面错误和控制台错误。
- 偏白旧纸素材预览：`C:\Users\29102\Documents\沉没之城\apps\web\public\ui-textures\room-v6-aged-parchment-white.png`
- 有消息版聊天局部：`C:\Users\29102\Documents\沉没之城\test-artifacts\sunken-room-v6-6-messages-preview-chat-crop.png`
