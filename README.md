# Nature+ 智能图鉴

面向科普学习的野生动物个人图鉴 Web 应用。支持 AI 生成物种图鉴、云端收藏、文献上传与智能问答、学习检测与题库管理。

技术栈：**Next.js 15** · **React 19** · **TypeScript** · **Tailwind CSS** · **Neon PostgreSQL** · **Drizzle ORM**

---

## 功能概览

| 模块 | 路径 | 说明 |
|------|------|------|
| 欢迎页 | `/` | 游客进入或注册登录 |
| 图鉴主页 | `/main` | 搜索动物、AI 生成图鉴预览 |
| 我的图鉴 | `/my-field-guide` | 收藏、阅读、管理配图与学习检测 |
| 我的题库 | `/my-question-bank` | 保存学习检测中的题目 |
| 知识专题 | `/topics` | 上传文献、在线阅读、供助手引用 |
| 智能助手 | `/ask` | 基于文献摘录 + 可选通识补充的问答 |
| 账号设置 | `/account` | 昵称、密码、快捷入口 |
| 使用说明 | `/guide` | 各板块功能与用法 |

**账号能力**

- 邮箱 + 密码注册 / 登录（会话 Cookie，数据存 Neon）
- 登录后：图鉴、题库、文献元数据同步云端；首次登录自动导入浏览器本地旧数据
- 未登录：仍可使用「游客身份继续」，图鉴等暂存本机浏览器

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 环境变量

复制示例并按需填写（**勿提交** `.env.local`）：

```bash
# Windows PowerShell 可手动新建 .env.local，内容参考 .env.example
```

**必填（账号与云端数据）**

```env
DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require
```

在 [Neon](https://console.neon.tech) 创建项目 → **Connection details** → 复制连接串。  
**不要**开启 Neon Auth，本项目使用自建邮箱登录。

**必填（AI 图鉴 / 助手 / 学习检测）**

任选一种 OpenAI 兼容服务：

```env
OPENAI_API_KEY=你的密钥
OPENAI_BASE_URL=https://ollama.com/v1    # 或官方 OpenAI / 本地 Ollama 等
OPENAI_CHAT_MODEL=gpt-4o-mini            # 须为服务端实际存在的模型名
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

也支持 `OLLAMA_API_KEY` / `OLLAMA_BASE_URL` 作为回退读取。

**推荐（探索动物配图）**

```env
UNSPLASH_ACCESS_KEY=你的_Unsplash_Access_Key
```

未配置时配图可能缺失，不影响正文生成。

完整可选变量见 [`.env.example`](./.env.example)。

### 3. 初始化数据库

```bash
npm run db:push
```

会在 Neon 中创建用户、会话、图鉴、题库、文献元数据等表。

### 4. 启动开发服务

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。

若遇 Next 缓存异常，可使用：

```bash
npm run dev:clean
```

### 5. 生产构建

```bash
npm run build
npm run start
```

---

## 使用说明

### 探索动物 · 生成图鉴

1. 进入 **图鉴主页**（`/main`）
2. 输入动物中文名或常用名（如「东北虎」「穿山甲」）
3. 点击 **AI 生成预览** — 等待进度提示完成（通常 30 秒～1 分钟）
4. 若输入为统称（如「猴子」），会弹出物种选择；也可选「类群概览」
5. 预览满意后点击 **加入我的图鉴**（登录后写入云端）
6. 配图为自动匹配，可能有误；可在预览中「移除此图」，或在图鉴详情页上传本机照片

### 我的图鉴

- 列表：`/my-field-guide`
- 详情：查看分类、习性、结构、趣闻等 Markdown 正文
- **物种配图**：上传、删除、设封面（用户上传图为 data URL，体积较大时注意浏览器配额）
- **学习检测**：AI 出题 → 作答 → 评分 → 可将题目存入「我的题库」
- **智能助手补充**：在 `/ask` 回答中，可将整理后的内容并入对应图鉴条目

### 知识专题 · 文献

1. 进入 `/topics`（**上传须先登录**）
2. 支持 `.txt`、`.md`、`.pdf`、`.doc`、`.docx`（单文件 ≤ 10MB）
3. 上传后可 **阅读**；勾选「在智能助手中引用此文」后，提问时会检索该文献片段

### 智能助手

1. 进入 `/ask`，输入问题（1～800 字）
2. 默认 **混合模式**（`RAG_HYBRID` 未关闭时）：优先引用你上传的文献；不足时可标注「通识补充」
3. 回答中可展开引用来源；若填写了图鉴条目关键词，可将答案整理并入图鉴

### 账号

- 注册：`/auth/register`
- 登录：`/auth/login` · 顶栏昵称 → `/account`
- 退出：账号设置页或顶栏

---

## 项目结构

```
wildlifelearning/
├── src/
│   ├── app/                      # Next.js App Router 页面与 API
│   │   ├── page.tsx              # 欢迎页
│   │   ├── main/                 # 图鉴主页（探索动物）
│   │   ├── my-field-guide/       # 我的图鉴列表 / 详情 / 学习检测
│   │   ├── my-question-bank/     # 我的题库
│   │   ├── topics/               # 知识专题、文献阅读
│   │   ├── ask/                  # 智能助手
│   │   ├── account/              # 账号设置
│   │   ├── auth/                 # 登录 / 注册
│   │   └── api/                  # 后端接口
│   │       ├── explore-species/  # AI 图鉴生成
│   │       ├── ask/              # 智能问答 RAG
│   │       ├── literature/       # 文献上传 / 读取 / 删除
│   │       ├── field-guide/      # 学习检测出题 / 评分 / 助手补充
│   │       ├── auth/             # 注册、登录、会话、资料
│   │       └── user/             # 云端图鉴、题库、文献、本地数据迁移
│   ├── components/               # UI 组件
│   │   ├── explore/              # 探索动物、生成进度、物种消歧
│   │   ├── field-guide/          # 图鉴详情、配图、学习检测 UI
│   │   ├── topics/               # 文献专题 Hub
│   │   ├── ask/                  # 问答面板与回答弹窗
│   │   └── auth/                 # 登录表单、顶栏账号、数据迁移
│   └── lib/                      # 业务逻辑
│       ├── db/                   # Drizzle schema、Neon 连接
│       ├── auth/                 # 密码、会话
│       ├── user-data/            # 云端图鉴 / 题库 / 文献服务端
│       ├── rag/                  # 检索、向量、关键词打分
│       ├── literature/           # 文献解析、分块、磁盘存储
│       ├── species-*.ts          # 百科锚定、配图、消歧、校验
│       ├── personal-field-guide.ts
│       ├── question-bank.ts
│       └── user-literature.ts    # 客户端数据访问（云端优先，游客走 localStorage）
├── data/
│   ├── rag.json                  # 内置 RAG 向量库（npm run embed 生成）
│   ├── user-literature/          # 旧版全局文献（迁移后逐步废弃）
│   └── users/{userId}/literature/ # 按用户隔离的文献正文
├── drizzle/                      # drizzle-kit 迁移输出
├── scripts/
│   ├── embed-content.ts          # 重建内置 RAG
│   └── clean-next.mjs            # 清理 .next 缓存
├── drizzle.config.ts
├── .env.example
└── package.json
```

---

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式 |
| `npm run dev:clean` | 清缓存后启动 dev |
| `npm run build` | 生产构建 |
| `npm run start` | 运行生产包 |
| `npm run lint` | ESLint |
| `npm run db:push` | 同步数据库表结构到 Neon |
| `npm run db:studio` | Drizzle Studio 浏览数据库 |
| `npm run embed` | 从内置 Markdown 重建 `data/rag.json` |

---

## 数据存储说明

| 数据 | 存储位置 |
|------|----------|
| 用户、会话 | Neon PostgreSQL |
| 云端图鉴 / 题库 / 文献目录 | Neon PostgreSQL |
| 文献正文与分块 | 服务器文件 `data/users/{userId}/literature/` |
| 内置知识 RAG | `data/rag.json` |
| 游客图鉴 / 题库 / 文献目录 | 浏览器 `localStorage`（登录后可自动迁移） |

---

## 环境变量补充

| 变量 | 说明 |
|------|------|
| `RAG_HYBRID` | 设为 `false` 关闭通识补充，仅引用文献摘录 |
| `SPECIES_IMAGE_SOURCE` | `auto` / `unsplash_only` / `wiki_only` / `none` |
| `SPECIES_GALLERY_MAX` | 配图张数上限（默认 4） |
| `EXPLORE_SPECIES_STRICT_DETAIL` | 开启更严格的图鉴篇幅校验 |
| `EXPLORE_SPECIES_RELAX_DETAIL` | 跳过图鉴篇幅校验（不推荐） |
| `SPECIES_ANCHOR_SOURCE` | 物种锚定来源（默认百科优先，见代码） |
| `UNSPLASH_DEBUG` | 配图调试日志 |

详见 [`.env.example`](./.env.example)。

---

## API 接口列表

以下为站内 **Route Handler** 接口（Next.js App Router）。默认前缀：`/api`。除特别说明外，请求与响应均为 **JSON**，`Content-Type: application/json`。

### 通用约定

| 项 | 说明 |
|----|------|
| **认证** | 需登录的接口依赖 HttpOnly Cookie `wl_session`（注册/登录成功后自动设置）。前端请求请加 `credentials: "same-origin"` |
| **错误** | 多数接口失败时返回 `{ "error": "说明文字" }`，并附带对应 HTTP 状态码 |
| **限流** | 探索图鉴、问答、学习检测等 AI 接口按 **客户端 IP** 滑动窗口限流（超限 `429`） |
| **CORS** | 面向同源 Web 使用，未单独配置跨域开放 API |

---

### 认证 · `/api/auth`

| 方法 | 路径 | 登录 | 说明 |
|------|------|:----:|------|
| `POST` | `/api/auth/register` | 否 | 注册。Body：`{ email, password, displayName? }`。密码 ≥ 8 位。成功 `{ ok, user }` 并写会话 |
| `POST` | `/api/auth/login` | 否 | 登录。Body：`{ email, password }`。成功 `{ ok, user }` |
| `POST` | `/api/auth/logout` | 否 | 登出，清除服务端会话与 Cookie |
| `GET` | `/api/auth/session` | 否 | 当前会话。`{ user: { id, email, displayName } \| null }` |
| `GET` | `/api/auth/profile` | 是 | 同 session，返回已登录用户资料 |
| `PATCH` | `/api/auth/profile` | 是 | 更新资料。Body：`{ displayName?, currentPassword?, newPassword? }` |
---

### 探索图鉴 · `/api/explore-species`

| 方法 | 路径 | 登录 | 说明 |
|------|------|:----:|------|
| `POST` | `/api/explore-species` | 否 | AI 生成图鉴或物种消歧（耗时较长，建议 60s+ 超时） |

**请求 Body**

```json
{
  "query": "动物名称",
  "mode": "disambiguate",
  "skipDisambiguation": false,
  "genericOverview": false,
  "imageFallbackQuery": "统称名（可选）"
}
```

| 字段 | 说明 |
|------|------|
| `query` | 必填，1～80 字动物名 |
| `mode` | `"disambiguate"`：仅判断是否为统称并返回选项；省略或其它值为生成图鉴 |
| `skipDisambiguation` | `true` 时跳过统称弹窗，直接生成 |
| `genericOverview` | `true` 时生成类群概览（非单种） |
| `imageFallbackQuery` | 消歧选具体种后，配图失败时用此统称名兜底搜图 |

**成功响应示例**

- 需要消歧：`{ "status": "choose_species", "disambiguation": { ... }, "originalQuery": "..." }`
- 无需消歧（disambiguate 模式）：`{ "status": "specific", "query": "..." }`
- 生成完成：`{ "status": "species", "species": { ...ExploreSpeciesPayload, imageUrl?, imageUrls?, imageProvider? } }`

`species` 主要字段：`slug`, `name`, `scientificName`, `taxon`, `habitat`, `diet`, `conservation`, `summary`, `bodyMarkdown`, `bodyStructureMarkdown`, `habitsMarkdown`, `funFactsMarkdown`, `reportSearchQuery`, `quiz?`。

---

### 用户云端数据 · `/api/user`

均需登录。

#### 图鉴 · `/api/user/field-guides`

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/user/field-guides` | 列表。`{ entries: FieldGuideSavedEntry[] }` |
| `POST` | `/api/user/field-guides` | 新增。Body：`{ species, id?, savedAt? }` → `{ entry }` |
| `GET` | `/api/user/field-guides/:id` | 单条。`{ entry }` |
| `PATCH` | `/api/user/field-guides/:id` | 更新物种 JSON。Body：`{ species }` → `{ entry }` |
| `DELETE` | `/api/user/field-guides/:id` | 删除。`{ ok: true }` |

`FieldGuideSavedEntry`：`{ id, savedAt, species }`，其中 `species` 为图鉴完整对象。

#### 题库 · `/api/user/question-bank`

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/user/question-bank` | 列表。`{ sets: QuestionBankSet[] }` |
| `POST` | `/api/user/question-bank` | 新增题组。Body：`{ set }` |
| `DELETE` | `/api/user/question-bank/:id` | 删除题组。`{ ok: true }` |

#### 文献目录 · `/api/user/literature`

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/user/literature` | 当前用户文献元数据列表。`{ list: LiteratureMeta[] }` |
| `PATCH` | `/api/user/literature` | 切换助手引用。Body：`{ id, enabledForAsk: boolean }` → `{ list }` |

#### 本地数据迁移 · `/api/user/migrate-local`

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/user/migrate-local` | 将浏览器旧数据导入云端。Body：`{ fieldGuides?, questionSets?, literatureMetas? }` → `{ ok, imported: { fieldGuides, questionSets, literature } }` |

---

### 文献 · `/api/literature`

| 方法 | 路径 | 登录 | 说明 |
|------|------|:----:|------|
| `POST` | `/api/literature/upload` | **是** | 上传文献。`multipart/form-data`，字段 `file`；或 JSON `{ fileName, text }`。支持 txt/md/pdf/doc/docx，≤ 10MB |
| `GET` | `/api/literature/:id` | **是** | 读取正文。`{ id, title, fileName, uploadedAt, body }` |
| `DELETE` | `/api/literature/:id` | **是** | 删除文献文件与元数据。`{ ok: true }` |

上传成功示例：`{ id, title, fileName, uploadedAt }`（元数据同时写入用户文献表）。

---

### 智能助手 · `/api/ask`

| 方法 | 路径 | 登录 | 说明 |
|------|------|:----:|------|
| `POST` | `/api/ask` | 否 | RAG 问答。Body：`{ question, literatureIds? }`，问题 1～800 字 |

**响应**

```json
{
  "answer": "Markdown 回答正文",
  "citations": [{ "id", "excerpt", "sourceTitle", "sourcePath" }],
  "mode": "rag | rag-hybrid | general-only | keyword-only | empty | error-fallback"
}
```

- 已登录：`literatureIds` 仅保留**当前用户已启用**的文献 ID  
- 未登录：仅匹配旧版全局文献文件（若有）  
- 检索范围：`data/rag.json` 内置块 + 用户文献分块  

---

### 学习检测 · `/api/field-guide`

| 方法 | 路径 | 登录 | 说明 |
|------|------|:----:|------|
| `POST` | `/api/field-guide/generate-assessment` | 否 | 根据图鉴出题。Body：`{ species: ExploreSpeciesPayload }` → `{ paper }` |
| `POST` | `/api/field-guide/grade-assessment` | 否 | 开放题 AI 评分。Body：`{ speciesName?, items: [{ id, question, referenceAnswer, rubric, userAnswer, maxPoints }] }` → `{ grades: [...] }` |
| `POST` | `/api/field-guide/supplement-from-ask` | 否 | 将问答整理为并入图鉴的方案。Body：`{ species, question, answer }` → `{ plan }` |

`paper` 含 `title`, `speciesName`, `questions[]`, `gradingStandard`（含 `summary` 与分档 `tiers`）。  
`plan` 字段：`targetField`, `subsectionTitle`, `mergedContent`, `categoryLabel`（由客户端写入图鉴）。

---

### 接口与页面对照

| 页面功能 | 主要接口 |
|----------|----------|
| 探索动物 / 消歧 | `POST /api/explore-species` |
| 加入我的图鉴 | `POST /api/user/field-guides` |
| 图鉴详情编辑配图 | `PATCH /api/user/field-guides/:id` |
| 知识专题上传 | `POST /api/literature/upload` |
| 文献阅读 | `GET /api/literature/:id` |
| 智能助手 | `POST /api/ask` |
| 学习检测 | `generate-assessment` → 本地判分 → `grade-assessment`（开放题） |
| 助手并入图鉴 | `supplement-from-ask` + `PATCH /api/user/field-guides/:id` |
| 注册 / 登录 | `POST /api/auth/register` · `POST /api/auth/login` |

---

## 部署提示（公网）

1. 在 Neon 创建 PostgreSQL，配置 `DATABASE_URL`
2. 部署前或 CI 中执行 `npm run db:push`
3. 配置 LLM 与 Unsplash 等环境变量
4. **每次拉代码后必须完整重建**，不要只 `git pull` 后重启进程：
   ```bash
   git pull
   npm install
   npm run db:push          # 如有 schema 变更
   pm2 stop wildlifelearning   # 或先停掉旧进程
   npm run build:clean      # 删 .next 再 build，避免 chunk 不一致
   pm2 start wildlifelearning  # 或 npm run start
   ```
   本地一次性验证可用 `npm run start:prod`（clean + build + start）。
5. 确保 `data/users/` 目录可写（文献文件持久化）；无状态多实例部署需改为对象存储（当前为单机文件方案）

---

## 免责声明

本应用生成的图鉴、问答与学习检测内容均为 **AI 辅助草稿**，仅供科普学习参考，**不能替代**专业文献、鉴定机构或现场观察。配图可能不准确；冷门物种信息可能简略或滞后。使用前请阅读站内 [免责声明](/disclaimer) 与 [隐私说明](/privacy)。

---

## 本地开发常见问题

**`npm run db:push` 报缺少连接 URL**  
确认 `.env.local` 中有 `DATABASE_URL`，且 `drizzle.config.ts` 会加载该文件。

**更新代码后出现 `Cannot find module './638.js'` 等 MODULE_NOT_FOUND**  
这是 Next.js 的 **构建缓存与运行进程不同步**，不是业务代码写错。

| 场景 | 原因 | 做法 |
|------|------|------|
| 本地 `npm run dev` | 热更新（HMR）在 Windows 上偶发失效，旧进程仍引用已删除的 webpack chunk | `Ctrl+C` 停掉后执行 `npm run dev:clean`；仍频繁出现可试 `npm run dev:turbo` |
| 服务器 `next start` / PM2 | `git pull` 后未删 `.next` 就 build，或 build 完未重启进程 | `pm2 stop` → `npm run build:clean` → `pm2 start`（顺序不能省） |

**`/topics` 或上传后 500（非 chunk 编号错误）**  
执行 `npm run dev:clean` 后重试；文献解析依赖 `pdf-parse` 等包，已在 `next.config.ts` 中设为 `serverExternalPackages`。

**图鉴生成很慢**  
属正常现象（锚定资料 + 大模型长文 + 配图检索）。界面会显示模糊进度提示。

**登录后看不到以前的图鉴**  
重新登录触发一次本地数据迁移；或确认当时是否以游客身份仅保存在本机。

---

## 许可

本项目为私有学习用途（`private`）。外部素材（Unsplash、用户上传等）请遵循各自许可与版权要求。
