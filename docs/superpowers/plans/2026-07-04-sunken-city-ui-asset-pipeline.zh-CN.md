# 沉没之城 UI 视觉资产规格与入库管线

> **For agentic workers:** This document governs image2-generated visual assets for the Sunken City UI. Use Codex official built-in image2 first. Do not use `cd-image2` unless the user explicitly reverses the current preference. Unless the user explicitly asks, do not run deep tests or full visual regression.

**日期：** 2026-07-04  
**项目：** 沉没之城 / Sunken City  
**适用范围：** 前端 UI/UX 纹理素材、材质素材、局部装饰资产、视觉方向稿  
**主视觉计划：** `docs/superpowers/plans/2026-07-04-sunken-city-luminous-archive-visual-upgrade.zh-CN.md`

---

## 1. 目标

image2 不是自由出图工具，而是沉没之城 UI 设计系统的资产生产环节。

本管线要解决四个问题：

1. 生成的素材必须符合“明亮的深海秘仪档案馆”方向。
2. 生成的素材必须能放进真实 React / CSS UI，而不只是概念图好看。
3. 纹理不能破坏中文正文、按钮、标签、列表和移动端布局的可读性。
4. 进入项目的资产必须可命名、可压缩、可复用、可回滚。

## 2. 约束关系

UI/UX 规格先于 image2。

### 2.1 外部 image2 参考项目吸收原则

本管线已参考以下公开项目的方法，但不依赖它们的安装、CLI 或外部 skill：

- `wuyoscar/GPT-Image2-Skill`：吸收“先定尺寸、质量、用途、参考图，再生成”的流程意识。
- `freestylefly/awesome-gpt-image-2`：吸收“Prompt as Code”的结构化提示词方法。
- `anthropics/claude-cookbooks/prompting_for_frontend_aesthetics.ipynb`：吸收“明确反 AI 味儿、分别约束字体/颜色/动效/背景”的前端审美提示方法。

当前项目仍坚持：

- 优先使用 Codex 官方内置 image2。
- 暂时不使用 `cd-image2`。
- 不安装第三方 image2 skill。
- 不把外部案例风格直接照搬进沉没之城。
- 所有生成都必须服务真实 UI，而不是服务概念图。
- 所有实际提交给 image2 的 prompt 必须使用自然、原生英文；中文只用于本文档中的规格说明、验收说明和沟通说明。

执行顺序固定为：

1. 定义资产规格卡。
2. 根据规格卡写 image2 prompt。
3. 生成 2-4 个候选。
4. 人工筛选。
5. 裁切、压缩、命名。
6. 放入固定目录。
7. 通过 CSS token 或组件 API 引用。
8. 在真实组件预览里轻量验收。

禁止：

- 先生成一张好看的图，再临时决定它放在哪里。
- 页面组件直接写生成图片路径。
- 用强纹理承载正文。
- 用概念图代替真实前端布局。
- 把未筛选的临时输出提交进仓库。

## 3. 资产目录与命名

建议所有已入库 UI 资产放在：

```text
apps/web/public/ui-textures/
```

命名规则：

```text
<material>-<tone>-<usage>.<ext>
```

示例：

```text
archive-paper-light-surface.webp
pale-limestone-balanced-panel.webp
oxidized-copper-dark-edge.webp
sea-mist-balanced-overlay.webp
dark-glazed-stone-dark-tool.webp
antique-gold-thread-accent.webp
```

规则：

- 使用小写英文、连字符。
- 文件名必须表达材质、明暗档位、用途。
- 入库优先 WebP；如后续工具链支持，可补 AVIF。
- 不使用 `final`、`new`、`test`、`draft`、`image1`、`texture2` 等无语义名称。

## 4. 资产规格卡

每次生成前必须先写资产规格卡。规格卡可以写在任务计划里，也可以写在实施记录里。

模板：

```text
资产名称：
用途：
目标 UI 槽位：
尺寸：
是否需要可平铺：
明暗档位：
文字承载：
主色：
对比度：
纹理密度：
禁止元素：
输出格式：
目标体积：
验收页面：
```

示例：

```text
资产名称：明亮档案纸 Surface 纹理
用途：主内容、房间描述、论坛正文、结算档案
目标 UI 槽位：Surface material="archive"
尺寸：1024x1024
是否需要可平铺：是
明暗档位：luminous
文字承载：允许承载 14px-16px 中文正文
主色：象牙白、浅灰绿、极淡旧金
对比度：低
纹理密度：细腻纸纤维，不出现大块污渍
禁止元素：文字、符号、眼睛、触手、人物、强阴影、血红、紫色、黑边
输出格式：WebP
目标体积：小于 300KB
验收页面：首页、故事书、论坛正文、房间描述
```

## 4.1 Prompt as Code 结构

所有沉没之城 image2 提示词统一采用以下结构，避免每次凭感觉写 prompt。实际提交给 image2 的内容必须是英文：

```text
[Purpose]
What this asset is for in the UI.

[Canvas]
Image size, ratio, tileability, output target.

[Material]
The physical or atmospheric material to generate.

[Palette]
Brightness, hue family, accent colors, forbidden color dominance.

[Texture Behavior]
Contrast, detail density, edge behavior, whether it can carry text.

[UI Constraints]
How it will be used inside React / CSS surfaces.

[Negative Constraints]
What must not appear.

[Output Intent]
Production UI texture, not poster art, not concept art.
```

最终 prompt 可以保留为分段英文，也可以合并成一段自然英文，但不得中英混写。写 prompt 前必须先经过这八项。

## 4.2 通用反 AI 味儿约束

每个用于 UI 的 image2 prompt 默认加入以下禁止项：

```text
No black glassmorphism cards, no generic sci-fi UI, no purple gradient, no poster composition, no central logo, no text, no letters, no readable symbols, no characters, no monsters, no tentacles, no eyes, no blood background, no bokeh blobs, no dramatic vignette, no cinematic splash art.
```

原因：

- 沉没之城要避免廉价黑玻璃和模板化 AI UI。
- 素材必须能进入真实页面，不能像海报。
- 克苏鲁氛围通过材质、冷雾和档案感表达，不靠怪物和黑幕表达。

## 4.3 探索档位与终稿档位

生成时按两档执行：

| 档位 | 用途 | 建议 |
| --- | --- | --- |
| 探索档 | 快速找方向 | 每个资产先生成 3 个候选，允许细节稍粗，但必须符合用途 |
| 终稿档 | 入库候选 | 只对入选方向重生成或精修，要求低干扰、无脏点、可压缩 |

不要一开始追求“完美大图”。先找方向，再收敛为可入库资产。

## 5. 标准资产清单

### 5.1 明亮档案纸

**文件建议：** `archive-paper-light-surface.webp`

用途：

- 主内容 Surface。
- 长文。
- 房间描述。
- 论坛正文。
- 结算报告。

image2 prompt 模板：

```text
[Purpose] Bright archive-paper material for Chinese web UI body surfaces, reports, room descriptions, forum reading panels.
[Canvas] Square 1024x1024, seamless or edge-friendly, production texture.
[Material] Luminous aged archive paper, refined paper fibers, faint mineral dust, subtle handmade paper grain.
[Palette] Ivory white, pale warm grey, very soft grey-green, tiny restrained antique-gold fibers.
[Texture Behavior] Low contrast, text-safe for 14px-16px Chinese text, no strong stains, no dark corners, no center object.
[UI Constraints] Should work under a stable light overlay in Surface material="archive"; must feel bright, natural, premium, and readable.
[Negative Constraints] No black glassmorphism cards, no generic sci-fi UI, no purple gradient, no poster composition, no central logo, no text, no letters, no readable symbols, no characters, no monsters, no tentacles, no eyes, no blood background, no bokeh blobs, no dramatic vignette, no cinematic splash art.
[Output Intent] Subtle production UI texture, not an illustration, not a parchment poster.
```

验收：

- 14px 中文正文可读。
- 纹理不出现明显大花纹。
- 明亮但不刺眼。
- 不像廉价旧羊皮纸。

### 5.2 浅色湿石 / 石灰岩

**文件建议：** `pale-limestone-balanced-panel.webp`

用途：

- 普通面板底。
- 页面次级区块。
- 故事书列表背景。
- 无名集市陈列台。

image2 prompt 模板：

```text
[Purpose] Pale wet-limestone material for premium web app panels, secondary blocks, story list surfaces, and relic market display bases.
[Canvas] Square 1024x1024, seamless or edge-friendly, production texture.
[Material] Cool underwater limestone, damp mineral surface, fine stone pores, soft polished wet-stone feel.
[Palette] Pale limestone, ivory grey, soft teal-grey, restrained sea-mineral tint.
[Texture Behavior] Low contrast, gentle mineral detail, no strong cracks, no large stains, readable under UI content.
[UI Constraints] Should support panel boundaries without looking like dirty concrete; useful for Surface material="limestone".
[Negative Constraints] No black glassmorphism cards, no generic sci-fi UI, no purple gradient, no poster composition, no central logo, no text, no letters, no readable symbols, no characters, no monsters, no tentacles, no eyes, no blood background, no bokeh blobs, no dramatic vignette, no cinematic splash art.
[Output Intent] Subtle production UI panel texture, not a wall photo, not a concept-art background.
```

验收：

- 作为列表或面板背景时不抢内容。
- 不能看起来像脏墙。
- 在明亮和深海背景上都有清楚边界。

### 5.3 氧化铜边框

**文件建议：** `oxidized-copper-dark-edge.webp`

用途：

- 左侧导航。
- 右侧 KP 工具台。
- 重要选中态。
- relic / copper Surface 边缘。

image2 prompt 模板：

```text
[Purpose] Oxidized copper and antique brass trim for navigation rails, selected states, important borders, and ritual archive frames.
[Canvas] Wide 2048x512 or square 1024x1024, edge-friendly, suitable for slicing into borders.
[Material] Weathered copper, antique brass, refined green patina, lightly worn metal edge.
[Palette] Oxidized copper green, muted brass, restrained old gold highlights, no neon.
[Texture Behavior] Medium-low contrast, fine directional metal grain, no big ornaments, no dirty mold patches.
[UI Constraints] Should work as a small-area border or header accent, not as a body-text surface; useful for Surface material="copper".
[Negative Constraints] No black glassmorphism cards, no generic sci-fi UI, no purple gradient, no poster composition, no central logo, no text, no letters, no readable symbols, no characters, no monsters, no tentacles, no eyes, no blood background, no bokeh blobs, no dramatic vignette, no cinematic splash art.
[Output Intent] Premium UI edge material, not a logo, not a fantasy ornament poster.
```

验收：

- 适合小面积边框或 header，不适合作为正文底。
- 金色不刺眼。
- 铜绿不能像霉斑。

### 5.4 深海冷雾噪声

**文件建议：** `sea-mist-balanced-overlay.webp`

用途：

- 背景氛围层。
- 大页面底层。
- 非正文承载区域。

image2 prompt 模板：

```text
[Purpose] Deep-sea cold mist overlay for large page backgrounds and atmospheric layers behind UI surfaces.
[Canvas] Landscape 2048x1024, edge-friendly, suitable as a soft CSS background overlay.
[Material] Underwater cold fog, pearlescent sea mist, faint suspended mineral haze.
[Palette] Blue-green fog, desaturated teal, pale sea-glass highlights, no dominant black.
[Texture Behavior] Very low contrast, no focal point, no large bubbles, no visible object, airy not dirty.
[UI Constraints] Must sit behind readable panels; should add depth without becoming a global dark veil.
[Negative Constraints] No black glassmorphism cards, no generic sci-fi UI, no purple gradient, no poster composition, no central logo, no text, no letters, no readable symbols, no characters, no monsters, no tentacles, no eyes, no blood background, no bokeh blobs, no dramatic vignette, no cinematic splash art.
[Output Intent] Subtle production background overlay, not a cinematic underwater scene.
```

验收：

- 不形成全局黑幕。
- 不让背景变脏。
- 只增加空气感。

### 5.5 暗釉石材 / 深海工具区

**文件建议：** `dark-glazed-stone-dark-tool.webp`

用途：

- KP 工具台。
- 右侧栏。
- 弹层。
- 抽屉。

image2 prompt 模板：

```text
[Purpose] Dark glazed-stone material for KP tool panels, right rails, drawers, and modal shells.
[Canvas] Square 1024x1024, seamless or edge-friendly, production texture.
[Material] Dark glazed basalt, wet ceramic stone, deep-sea mineral surface, subtle polished glaze.
[Palette] Deep teal-black, dark basalt grey, muted blue-green highlights, not pure black.
[Texture Behavior] Low contrast, readable for 12px-14px labels under overlay, no strong highlights, no glossy glass effect.
[UI Constraints] Must replace black transparent cards with a tangible dark material; useful for Surface material="basalt".
[Negative Constraints] No black glassmorphism cards, no generic sci-fi UI, no purple gradient, no poster composition, no central logo, no text, no letters, no readable symbols, no characters, no monsters, no tentacles, no eyes, no blood background, no bokeh blobs, no dramatic vignette, no cinematic splash art.
[Output Intent] Production UI tool-surface texture, not horror art, not transparent glass.
```

验收：

- 深但不纯黑。
- 12px-14px 标签仍可读。
- 不像透明黑玻璃。

### 5.6 旧金箔细纹

**文件建议：** `antique-gold-thread-accent.webp`

用途：

- 稀有物。
- 主行动边线。
- 位阶、印记、藏品。
- 小面积点缀。

image2 prompt 模板：

```text
[Purpose] Antique gold-leaf thread accent for rare items, rank marks, seals, relic cards, and small ritual dividers.
[Canvas] Wide 2048x512 or square 1024x1024, edge-friendly, suitable for small accents.
[Material] Fine antique gold leaf threads, worn metallic fibers, archival gilding residue.
[Palette] Restrained old gold, muted brass, faint dark green undertone, no bright yellow dominance.
[Texture Behavior] Fine detail, small-area use only, no large bright patches, no text-carrying surface.
[UI Constraints] Should be used through accent tokens or Surface material="relic"; never as a full page background.
[Negative Constraints] No black glassmorphism cards, no generic sci-fi UI, no purple gradient, no poster composition, no central logo, no text, no letters, no readable symbols, no characters, no monsters, no tentacles, no eyes, no blood background, no bokeh blobs, no dramatic vignette, no cinematic splash art.
[Output Intent] Refined production UI accent texture, not a luxury logo, not ornate wallpaper.
```

验收：

- 只能小面积使用。
- 不承载正文。
- 金色不变成大面积黄色。

## 6. 生成候选与筛选规则

每种材质建议先生成 3 个探索候选。只有用户或 Codex 明确选中方向后，才生成终稿候选。

### 6.1 当前探索方向记录

2026-07-04 探索候选已生成，用户确认以下方向继续：

| 材质 | 选择 | 源文件 | 用途判断 |
| --- | --- | --- | --- |
| 明亮档案纸 | Candidate A | `ig_0b9781f6e2fd799e016a48b6cf8b54819882ee608f369053f0.png` | 最干净，优先作为正文 Surface 的基础方向 |
| 浅色湿石 | Candidate A | `ig_0b9781f6e2fd799e016a48b766ba348198b07554dfccc9ce69.png` | 最像通用面板材质，优先作为 limestone panel 方向 |
| 深海冷雾 | Candidate C | `ig_0b9781f6e2fd799e016a48b8d0f0a8819887fc3cef3554bc33.png` | 深海感与明亮度较平衡，优先作为背景冷雾方向 |
| 氧化铜边框 | Candidate B | `ig_0aa9b75b7cff2d6b016a48bb75bffc819bbf429ff8b2040f0c.png` | 更精致，不太厚重，适合导航和边框 |
| 暗釉石材 | Candidate C | `ig_0aa9b75b7cff2d6b016a48bc0e2d8c819ba7442878e9ba9ab9.png` | 最安静，适合高密度 KP 工具区 |
| 旧金箔细纹 | Candidate A | `ig_0aa9b75b7cff2d6b016a48bc3e9e28819b9b73e7e30f391991.png` | 细腻克制，适合小面积稀有内容和仪式点缀 |

这些选择仍是探索方向，不等于已入库生产资产。入库前必须完成压缩、命名、token 绑定和真实 UI 轻量验收。

### 6.2 当前入库记录

2026-07-04 已将 6 张选中探索方向压缩为 WebP，并放入：

```text
apps/web/public/ui-textures/
```

| 材质 | 入库文件 | 尺寸 | 体积 | CSS token | Surface material |
| --- | --- | --- | --- | --- | --- |
| 明亮档案纸 | `archive-paper-light-surface.webp` | 1024x1024 | 30KB | `--coc-texture-archive-paper` | `archive` |
| 浅色湿石 | `pale-limestone-balanced-panel.webp` | 1024x1024 | 166KB | `--coc-texture-pale-limestone` | `limestone` |
| 深海冷雾 | `sea-mist-balanced-overlay.webp` | 1536x820 | 30KB | `--coc-texture-sea-mist` | 背景 token，暂不绑定 Surface |
| 氧化铜边框 | `oxidized-copper-dark-edge.webp` | 1536x768 | 118KB | `--coc-texture-oxidized-copper` | `copper` |
| 暗釉石材 | `dark-glazed-stone-dark-tool.webp` | 1024x1024 | 67KB | `--coc-texture-dark-glazed-stone` | `basalt` |
| 旧金箔细纹 | `antique-gold-thread-accent.webp` | 1536x1024 | 269KB | `--coc-texture-antique-gold-thread` | `relic` |

当前实现：

- `Surface` 新增可选 `material` 属性。
- 默认值为 `none`，旧页面不受影响。
- `tokens-v2.css` 提供纹理 token。
- `system-v2.css` 通过 `data-material` 定义材质背景。
- 深海冷雾先作为 token 保留，暂不全局套用，避免未经页面验收就改变全站背景。

### 6.3 手工选用金箔装饰资产记录

除 image2 纹理外，本轮故事书样板页还使用了用户本地提供的金箔 / 塔罗装饰 PNG 素材。这类素材不是正文纹理，而是有明确槽位的装饰资产。

来源目录：

```text
Z:\BaiduNetdiskDownload\质感金色魔法线条太阳恒星塔罗牌插图纹理卡片PNG免抠PS设计素材\K1602\K1602\
```

当前入库记录：

| 源文件 | 入库文件 | 当前用途 | 使用规则 |
| --- | --- | --- | --- |
| `PNG2\2 (23).png` | `gold-vertical-sigil.webp` | 故事书 Header 左侧仪式标记 | 放大到可识别，但不能挤压标题 |
| `PNG1\1 (78).png` | `gold-sunburst-arc.webp` | 故事书 Header 中央太阳弧线 | 高度填满容器，左右不强行铺满；默认居中 |
| `PNG1\1 (80).png` | `gold-crescent-index.webp` | “当前索引”统计卡背景 | 应明显可见，但不得盖过数字卡片 |
| `PNG1\1 (32).png` | `gold-empty-state-ritual.webp` | 空状态大面板背景装饰 | 等比缩小、居中显示，让图案更多露出；文字和按钮在上层 |

手工装饰资产规则：

- 必须先复制到 `apps/web/public/ui-textures/`，页面不能引用 `Z:` 本地路径。
- 必须通过 `tokens-v2.css` 登记 token 后使用。
- 不得把多个金箔图案无目的叠满页面。
- 每个装饰素材必须绑定一个 UI 槽位：Header、索引卡、空状态、藏品卡、分隔线等。
- 图片不得被拉伸变形；可使用 `contain`、`auto 100%`、固定比例或受控百分比。
- 大体积 PNG 只允许作为样板阶段临时来源；进入项目时应裁切或压缩为 WebP。
- 主行动按钮配色已确认改为旧金 + 暗血红，不再使用旧金 + 绿色尾色。

当前待处理资产债务：

- Header 和索引卡装饰目前是故事书专用样式，后续应抽象为可复用模式，而不是复制 CSS。

已处理：

- `PNG1\1 (32).png` 已压缩为 `gold-empty-state-ritual.webp`，从约 7MB 降至约 82KB，并通过 `--coc-texture-gold-empty-state` 引用。

候选立刻淘汰条件：

- 有可识别文字、符号、图案或物体。
- 有强中心构图。
- 有明显光斑、圆点、bokeh。
- 有大面积黑边、红色或紫色。
- 对比过强，中文正文压不住。
- 太像海报、插画、游戏 loading 图。
- 平铺后出现明显重复。

可进入处理的条件：

- 低对比。
- 无中心主体。
- 色彩符合对应材质。
- 放大和缩小都不刺眼。
- 可作为 UI 背景或边缘材质。

## 7. 处理与压缩

入库前建议处理：

- 裁切为 1024x1024、1536x1536 或 2048x1024。
- 降低饱和度和局部对比。
- 去掉暗角。
- 转为 WebP。
- 单张纹理目标小于 300KB；大背景目标小于 600KB。

如果后续需要脚本化处理，可新增：

```text
apps/web/scripts/prepare-ui-texture.mjs
```

脚本职责：

- 读取源图。
- 输出固定尺寸 WebP。
- 打印文件大小。
- 不自动提交。

## 8. CSS Token 绑定

页面不直接引用图片路径。纹理必须先进入 token。

建议在 `apps/web/src/styles/tokens-v2.css` 中加入：

```css
:root {
  --coc-texture-archive-paper: url('/ui-textures/archive-paper-light-surface.webp');
  --coc-texture-pale-limestone: url('/ui-textures/pale-limestone-balanced-panel.webp');
  --coc-texture-oxidized-copper: url('/ui-textures/oxidized-copper-dark-edge.webp');
  --coc-texture-sea-mist: url('/ui-textures/sea-mist-balanced-overlay.webp');
  --coc-texture-dark-glazed-stone: url('/ui-textures/dark-glazed-stone-dark-tool.webp');
  --coc-texture-antique-gold-thread: url('/ui-textures/antique-gold-thread-accent.webp');
}
```

建议在 `apps/web/src/styles/system-v2.css` 中通过材质 Surface 使用：

```css
.coc-surface-v2[data-material="archive"] {
  background:
    linear-gradient(rgba(255, 250, 235, 0.94), rgba(255, 250, 235, 0.94)),
    var(--coc-texture-archive-paper);
  color: var(--coc-on-light-primary);
}
```

原则：

- 纹理永远叠加一层稳定底色。
- 正文 Surface 的纹理透明感要低。
- 边缘材质可以更明显，但不得影响正文。

## 9. 组件 API 约束

建议 `Surface` 增加材质维度，而不是把材质塞进 `variant`：

```ts
type SurfaceMaterial =
  | 'none'
  | 'archive'
  | 'limestone'
  | 'basalt'
  | 'copper'
  | 'relic';
```

推荐 API：

```tsx
<Surface variant="solid" material="archive" padding="lg">
  ...
</Surface>
```

原因：

- `variant` 表示层级和用途。
- `material` 表示视觉材质。
- `tone` 表示语义强调。
- 三者分开，避免组合爆炸。

约束：

- `material="archive"` 默认用于长文和主内容。
- `material="basalt"` 默认用于工具区。
- `material="copper"` 默认用于重要容器，不承载长段正文。
- `material="relic"` 默认用于稀有内容和收藏，不作为普通列表默认。
- `variant="glass"` 不应再作为主内容默认。

## 10. 真实 UI 验收槽

每个入库纹理至少用以下槽位检查：

- 14px 中文正文一段。
- 16px 中文正文一段。
- 标签 / badge。
- 按钮默认、hover、disabled。
- 列表行。
- 空状态。
- 移动端 375px 面板。
- 桌面 1440px 页面区块。
- 超宽 2560x1080 页面区块。

推荐先建立一个轻量预览页面或开发用组件：

```text
apps/web/src/pages/dev/UiMaterialPreviewPage.tsx
```

该页面只用于本地视觉验收，不应暴露到正式导航。

如果不建预览页，至少用首页或故事书作为第一落地样板。

## 11. 文档与提交规则

每次资产入库时必须在提交说明或实施记录中说明：

- 使用了哪个资产规格卡。
- 生成了多少候选。
- 最终入库哪几张。
- 哪些页面或组件引用它。
- 为什么它不会破坏可读性。

不提交：

- 临时概念图。
- 未筛选候选图。
- 重复失败图。
- `outputs/`。
- 大体积未压缩 PNG。

## 12. 与现有计划的关系

本文档补充并约束：

- `2026-07-04-sunken-city-luminous-archive-visual-upgrade.zh-CN.md`
- `2026-07-01-sunken-city-ui-readability-redesign.zh-CN.md`
- `2026-07-02-harbor-oracle-game-ui-upgrade.zh-CN.md`

执行优先级：

1. 本文档定义 image2 资产能否进入项目。
2. 明亮档案馆计划定义视觉方向和页面顺序。
3. 可读性计划定义底层可读性和响应式边界。
4. 黑水港 / 溺者之牌计划定义具体游戏化页面行为。

如发生冲突：

- 可读性和权限边界优先于装饰。
- 明亮材质化方向优先于旧黑玻璃方向。
- 用户最新确认的视觉方向优先于早期草案。
