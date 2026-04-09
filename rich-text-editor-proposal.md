# 沉没之城富文本编辑器升级方案

## 现状诊断

目前项目所有文本输入均使用原生 `<textarea>`：
- 论坛发帖 (`ForumNewPostPage.tsx`)
- 论坛回帖/编辑 (`ForumPostPage.tsx`)
- 角色卡背景条目 (`CharacterCreateV2Page.tsx` / `CharacterEditPage.tsx`)
- 仅通过 `whitespace-pre-wrap` 保留换行，无任何格式能力

这导致：
1. 玩家无法插入链接、图片、引用、代码块等 RPG/模组常用格式
2. 长帖可读性差（无标题、无列表、无高亮）
3. 运营公告/帖子排版受限，表现力弱

---

## 推荐方案：Tiptap（Headless ProseMirror）

**不选 Draft.js**（已停止维护）、**不选 CKEditor**（太重、风格难以定制）、**不选 Quill**（样式侵入性强、React 集成老）。

**选 Tiptap 的理由：**
- 纯 Headless，UI 完全由我们 Tailwind 定制，能 100% 融入深渊凝视UI
- 基于 ProseMirror，稳定、可扩展、协作友好
- 输出可选 HTML 或 JSON，迁移成本低
- 生态丰富：提及 (@user)、图片上传、任务列表、表格等均可插件化渐进加载

---

## 目标功能（MVP 阶段）

### 1. 工具栏能力
| 图标 | 功能 | 说明 |
|------|------|------|
| **B** | 粗体 | `Ctrl+B` |
| *I* | 斜体 | `Ctrl+I` |
| ~~S~~ | 删除线 | 支持 |
| H2/H3 | 二级/三级标题 | 区分层级，不适合给一级标题（防止和帖子标题冲突） |
| • 列表 | 无序列表 | 跑团记录、物品清单 |
| 1. 列表 | 有序列表 | 步骤说明 |
| " | 引用块 | 经典引用样式，点缀金色左边框|
| `</>` | 行内代码 / 代码块 | 分享规则或宏 |
| 🔗 | 插入链接 | 自动校验 http/https |
| — | 分割线 | 视觉分隔 |
| @ | 提及用户 | 输入 `@` 弹出用户搜索下拉，与现有后端 `parseMentions` 兼容 |
| 🖼️ | 图片上传 | 插入本地上传图片（复用现有上传接口），可选二期 |

### 2. 显示端改造
- 论坛帖子/回复从 `whitespace-pre-wrap` 纯文本渲染，切换为 **安全 HTML 渲染**
- 后端引入 **DOMPurify**（或前端引入 `dompurify`）做内容消毒，防止 XSS
- 兼容旧帖：检测内容是否包含 HTML 标签，无标签时仍然回退到 `white-space: pre-wrap` 渲染

### 3. 组件抽象
新增 `apps/web/src/components/editor/RichTextEditor.tsx`
```typescript
interface RichTextEditorProps {
  value: string;           // HTML
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
  showImage?: boolean;     // 功能开关
  showMention?: boolean;   // 功能开关
}
```

---

## 渐进实施计划

### Phase 1：基建落地（约 2 小时）
1. **安装依赖**
   ```bash
   cd apps/web
   npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-underline @tiptap/extension-placeholder
   # 二期再装 @tiptap/extension-image @tiptap/extension-mention
   ```

2. **创建 `RichTextEditor.tsx`**
   - 定制暗色主题 toolbar（和 `coc-bg-tertiary` / `coc-border` 色调一致）
   - 集成 `StarterKit`（bold, italic, strike, heading, list, blockquote, code, hr）
   - 集成 `Link` + `Underline` + `Placeholder`

3. **建 `HtmlContent.tsx` 安全渲染组件**
   ```tsx
   export function HtmlContent({ html }: { html: string }) {
     const isPlain = !/<[a-z][\s\S]*>/i.test(html);
     if (isPlain) return <div className="whitespace-pre-wrap">{html}</div>;
     const clean = DOMPurify.sanitize(html, {
       ALLOWED_TAGS: ['p','br','strong','em','s','h2','h3','ul','ol','li','blockquote','pre','code','a','hr','img'],
       ALLOWED_ATTR: ['href','target','rel','src','alt','class'],
     });
     return <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: clean }} />;
   }
   ```
   ⚠️ 如果项目不想在前端引入 `dompurify`，可以把消毒放在后端 `forum.routes.ts` 保存时处理。

### Phase 2：论坛接入（约 1.5 小时）
- **替换输入框**
  - `ForumNewPostPage.tsx`：`<textarea>` → `<RichTextEditor />`
  - `ForumPostPage.tsx`：回帖框 + 帖子编辑框同样替换
- **替换展示层**
  - 帖子正文 `<div className="... whitespace-pre-wrap">{post.content}</div>` → `<HtmlContent html={post.content} />`
  - 回复正文同理替换
- **后端适配**（最小改动）
  - `forum.routes.ts` 中 `content.trim()` 保持不变
  - 可选：在保存 `ForumPost` / `ForumReply` 前调用 `DOMPurify.sanitize()` 消毒

### Phase 3：角色卡 & 公告（可选，约 1 小时）
- `CharacterCreateV2Page.tsx` / `CharacterEditPage.tsx` 的背景条目 6 个 `<textarea>` 可选升级，允许玩家在背景故事中使用粗体、引用块增强叙事。
- 后端 `Character.backgroundEntries` 存储结构已经是 JSON 字符串，直接存 HTML 文本即可，无需改数据库。

### Phase 4： mentioning 与图片（可选，约 2 小时）
- **Mention**
  - 安装 `@tiptap/extension-mention`
  - 前端输入 `@` 调 `GET /api/users/search?query=...` 做下拉补全
  - 保存时保留 `@用户名` 文本，后端现有 `parseMentions` 逻辑继续生效
- **图片上传**
  - Toolbar 加插入图片按钮，调用现有 `/api/uploads` 接口
  - 成功后把 `<img src="...">` 插入编辑器

---

## 副作用与兼容性

| 风险 | 应对 |
|------|------|
| 旧帖是纯文本，新帖是 HTML | `HtmlContent` 自动检测，无 HTML 标签时走原 `whitespace-pre-wrap`，零破坏 |
| 长 HTML 导致数据库字段长度不够 | Prisma 默认 `String` 对 SQLite 是 `TEXT`（无长度限制），无需改 Schema |
| XSS 注入 | 后端/前端引入 `isomorphic-dompurify` 消毒，只允许白名单标签 |
| 打包体积增加 | Tiptap 是 tree-shakeable 的，引入 StarterKit + Link 后 gzip 增量约 **30~40KB**，可接受 |

---

## 设计参考

Toolbar 样式草图（完全融入现有 UI）：
```
┌────────────────────────────────────────────┐
│  B  I  S  H2  H3  •  1.  "  </>  —  🔗    │  ← toolbar, bg-coc-bg-secondary
├────────────────────────────────────────────┤
│                                            │
│  在这里写下你的跑团经历...                 │  ← editor, min-h-[200px]
│                                            │
└────────────────────────────────────────────┘
```
- 激活状态的按钮：背景 `bg-coc-accent-red/20`，文字 `text-coc-accent-red`
- 引用块：左边框 `border-l-4 border-coc-accent-gold`，背景微深
- 代码块：字体 `font-mono`，背景 `bg-coc-bg-secondary`

---

## 结论

建议按 **Phase 1 + Phase 2** 作为本次迭代目标，优先把论坛发帖/回帖的富文本能力跑通。这是玩家高频使用、最能直接提升内容质量的场景。角色卡背景和社区公告可以作为后续迭代。

如果你同意，我可以立刻开始写 `RichTextEditor` 组件并在论坛页面替换部署。