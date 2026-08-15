# 留言墙设计

## 目标

将当前 `/live2d` 人偶展示页改造成留言墙。访客可以提交昵称、留言和便签颜色；留言先进入待审核状态，站长审核通过后才公开展示。留言数据由 Cloudflare D1 保存，GitHub 继续只负责代码和博客内容的版本管理。

## 范围

包含：

- 保留 `/live2d` 地址，页面内容改为留言墙，避免旧链接失效。
- 首页头像卡片继续链接到 `/live2d`。
- 复用照片墙的随机定位、漂浮动画、拖拽和响应式布局思路，改为渲染文字便签。
- 公开留言表单：昵称、留言内容、便签颜色。
- 留言状态：`pending`、`approved`、`deleted`。
- 站长管理：查看待审核留言、通过留言、删除留言。
- 使用现有私钥流程获取 GitHub Installation Token，并用仓库访问权限保护管理接口。
- 添加 Cloudflare D1 绑定和初始化迁移。

不包含：

- 图片、头像、Markdown、富文本或外链。
- 访客编辑或删除自己的留言。
- GitHub Issue、Pull Request 或 GitHub 文件作为留言存储。
- 复杂的账号系统、验证码和邮件通知。

## 方案

### 页面与组件

- `src/app/live2d/page.tsx`：改为留言墙页面，负责加载公开留言、打开提交表单和显示管理入口。
- `src/app/live2d/components/guestbook-wall.tsx`：负责便签墙布局、稳定位置、拖拽和便签展示。
- `src/app/live2d/components/guestbook-form.tsx`：负责昵称、内容、颜色输入和提交状态。
- `src/app/live2d/components/guestbook-admin.tsx`：仅在管理员认证后显示，负责待审核列表和审核动作。
- `src/app/live2d/services/guestbook-api.ts`：封装浏览器端对留言 API 的请求。
- 首页 `hi-card.tsx` 保留原有卡片外观，只确保链接目标仍为 `/live2d`。

照片墙的图片组件不直接复用，因为它依赖图片 URL、图片缩放和图片删除语义；留言墙复用其布局和交互思路，避免把图片专用逻辑混入文字便签。

### API

新增 `/api/guestbook` 路由：

- `GET /api/guestbook`：返回 `approved` 留言，公开访问。
- `POST /api/guestbook`：校验公开表单并创建 `pending` 留言，不要求登录。
- `GET /api/guestbook?admin=1`：要求有效的 GitHub Installation Token，返回待审核和已发布留言。
- `PATCH /api/guestbook/:id`：要求有效的 GitHub Installation Token，将留言设为 `approved` 或 `deleted`。

管理员请求携带浏览器现有认证流程产生的 Installation Token。API 通过 GitHub 仓库访问检查令牌有效性；私钥不会发送到 API，也不会写入仓库或 D1。

### 数据库

使用 D1 绑定 `GUESTBOOK_DB`，迁移文件创建 `guestbook_notes` 表：

```sql
id TEXT PRIMARY KEY
nickname TEXT NOT NULL
content TEXT NOT NULL
color TEXT NOT NULL
status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'deleted'))
created_at TEXT NOT NULL
approved_at TEXT
```

索引覆盖 `status` 和 `created_at`，公开查询只读取 `approved`，管理查询按时间倒序返回 `pending` 和 `approved`。

### 提交流程

1. 访客在便签表单填写昵称、留言和颜色。
2. 浏览器调用 `POST /api/guestbook`。
3. API 去除首尾空白，限制昵称和留言长度，拒绝空内容，并执行简单重复提交限制。
4. D1 保存为 `pending`。
5. 页面提示“留言已提交，等待审核”，不直接加入公开墙。

### 审核流程

1. 站长在留言墙点击管理入口。
2. 页面沿用照片墙的 `.pem` 导入和 Installation Token 缓存流程。
3. 管理端读取待审核留言。
4. 站长点击“通过”或“删除”。
5. API 更新状态；通过时记录 `approved_at`，页面刷新列表。

## 安全与限制

- API 永远不接收或保存 GitHub 私钥。
- 管理接口必须携带有效的 GitHub Installation Token，并验证其对配置仓库的访问权限。
- 公开接口只允许纯文本，限制昵称和留言最大长度。
- 服务端拒绝空内容、未知颜色和非法状态转换。
- 使用 Cloudflare 请求信息加 D1 时间窗口做基础的重复提交限制；具体阈值保持为常量，便于后续调整。
- 前端显示留言时使用 React 文本节点，不使用 `dangerouslySetInnerHTML`。

## 错误处理

- D1 不可用或 API 失败时显示明确的失败提示，保留表单内容，允许重试。
- 管理令牌过期时清除现有认证缓存，提示重新导入私钥。
- 公开读取失败时显示空墙提示和重试按钮，不影响首页其他功能。
- 迁移未完成时 API 返回可识别的服务配置错误，避免静默丢失留言。

## 验收标准

- 访问 `/live2d` 能看到便签墙，不再加载 Live2D CDN 或模型。
- 未登录访客可以提交合法留言；提交后留言状态为 `pending`，不会立即公开。
- 公开接口只能返回 `approved` 留言。
- 导入现有 `.pem` 后，站长能查看、通过和删除待审核留言。
- 便签在桌面端有随机稳定位置、轻微旋转和拖拽效果；移动端可读、可滚动且不溢出。
- 无效输入和重复快速提交会被拒绝，并给出提示。
- `pnpm run build:cf` 成功，构建产物不再包含 Live2D 页面运行时依赖。
- 迁移文件、`wrangler.toml` 绑定和 API 类型检查通过。

## 后续配置

代码完成后，需要在 Cloudflare 中创建 D1 数据库并将其绑定为 `GUESTBOOK_DB`，然后执行项目提供的迁移命令。绑定完成后，GitHub 推送会触发 Worker 自动部署。

