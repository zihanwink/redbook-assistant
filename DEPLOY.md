# 小红书选题助手 - 部署指南（Railway + Vercel + MongoDB Atlas）

## 架构说明

```
用户浏览器 → Vercel（前端静态文件）→ Railway（后端 API + ffmpeg）→ MongoDB Atlas（数据库）
```

- **Vercel**：托管 `app.html` 和 `admin.html`，全球 CDN 加速
- **Railway**：运行 Node.js 后端，支持 ffmpeg 视频处理
- **MongoDB Atlas**：免费云数据库（512MB），数据持久化

---

## 第一步：创建 MongoDB Atlas 数据库（免费）

1. 访问 https://www.mongodb.com/cloud/atlas/register
2. 用 GitHub 或邮箱注册
3. 创建免费集群：
   - 选择 **M0 Free** 计划
   - 选择离你最近的区域（如 AWS / Tokyo 或 Singapore）
   - 集群名称：`redbook-cluster`
4. 配置数据库访问：
   - **Database Access** → **Add New Database User**
   - 用户名：`redbook_admin`
   - 密码：生成一个强密码（**记下来！**）
   - 角色：**Read and write to any database**
5. 配置网络访问：
   - **Network Access** → **Add IP Address**
   - 选择 **Allow Access from Anywhere**（`0.0.0.0/0`）
6. 获取连接字符串：
   - **Database** → **Connect** → **Drivers**
   - 选择 **Node.js** 驱动
   - 复制连接字符串，格式类似：
     ```
     mongodb+srv://redbook_admin:<password>@redbook-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - 把 `<password>` 替换成你刚才设置的密码

---

## 第二步：推送代码到 GitHub

在本地终端执行：

```powershell
cd d:\trae_projects\redbook
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/redbook-assistant.git
git push -u origin main
```

**注意**：`.gitignore` 已配置，`.env` 和 `node_modules` 不会被提交。

---

## 第三步：部署后端到 Railway

1. 访问 https://railway.app，用 GitHub 账号登录
2. 点击 **New Project** → **Deploy from GitHub repo**
3. 选择你的 `redbook-assistant` 仓库
4. Railway 会自动检测 `nixpacks.toml` 并安装 ffmpeg + Node.js
5. 等待构建完成（约 2-3 分钟）
6. 添加环境变量：
   - 点击项目 → **Variables**
   - 添加以下变量：
     ```
     NODE_ENV = production
     JWT_SECRET = 随便一个随机字符串（如 my-secret-2024-xyz）
     ADMIN_SECRET = redbook-admin-key
     MONGODB_URI = mongodb+srv://redbook_admin:你的密码@redbook-cluster.xxxxx.mongodb.net/redbook_assistant?retryWrites=true&w=majority
     FRONTEND_URL = *
     API_PUBLIC_URL = https://你的后端域名（封面代理用，前后端分离时必填）
     ```
7. Railway 会自动重新部署
8. 获取后端 URL：
   - 点击 **Settings** → **Domains**
   - 复制生成的 URL，如 `https://redbook-assistant.up.railway.app`

---

## 第四步：修改前端 API 地址

打开 `app.html`，找到这一行（约第 977 行）：

```javascript
const API_BASE = (window.location.protocol === 'file:')
  ? 'http://localhost:3000/api'
  : (window.__API_BASE__ || '/api');
```

改为：

```javascript
const API_BASE = 'https://redbook-assistant.up.railway.app/api';
```

把 URL 替换成你在 Railway 获得的实际地址。

同样修改 `admin.html` 中的 API 地址（如果有的话）。

---

## 第五步：部署前端到 Vercel

1. 访问 https://vercel.com，用 GitHub 账号登录
2. 点击 **Add New...** → **Project**
3. 导入你的 `redbook-assistant` 仓库
4. 配置：
   - **Framework Preset**: `Other`
   - **Build Command**: 留空
   - **Output Directory**: 留空
   - **Install Command**: 留空
5. 点击 **Deploy**
6. Vercel 会直接托管所有静态文件（包括 `app.html`）
7. 部署完成后，Vercel 会给你一个 URL，如 `https://redbook-assistant.vercel.app`

---

## 第六步：测试

1. 访问 Vercel 分配的 URL（如 `https://redbook-assistant.vercel.app/app.html`）
2. 注册一个测试账号
3. 测试各功能：
   - 登录/注册
   - 爆款分析（粘贴小红书链接）
   - AI 生成选题
   - 收藏/创作计划
   - 视频笔记分析（会调用 ffmpeg）

---

## 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NODE_ENV` | 运行环境 | `production` |
| `JWT_SECRET` | JWT 签名密钥（务必随机） | `my-secret-2024-xyz` |
| `ADMIN_SECRET` | 管理后台密钥 | `redbook-admin-key` |
| `MONGODB_URI` | MongoDB 连接字符串 | `mongodb+srv://...` |
| `FRONTEND_URL` | 前端地址（CORS） | `*` 或 `https://xxx.vercel.app` |
| `API_PUBLIC_URL` | 后端公网地址（封面图片代理） | `https://xxx.vercel.app` 或 Railway 域名 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key（可选，用户也可在前端配置） | `sk-...` |

---

## 注意事项

### 数据存储
- MongoDB Atlas 免费版有 512MB 存储限制
- 对于当前应用足够使用（数千用户 + 数万选题）
- 如果不够用，可以升级到 M10 计划（约 $57/月）

### 爆款分析双模型
- **DeepSeek**（用户在前端配置 Key）：负责结构化文本分析
- **智谱视觉模型**（用户在前端配置 Key）：默认 `glm-4.6v`，可选 `glm-5v-turbo`（视频更强）
- 旧版 `glm-4v` 已弃用，请勿使用

### 视频分析（ffmpeg）
- Railway 通过 `nixpacks.toml` 自动安装 ffmpeg
- 视频下载、关键帧提取、音频转写都可以正常工作
- Vercel 免费版跳过 ffmpeg（超时限制），公网视频仅用封面图做视觉分析
- 如果视频处理失败，会降级为文本分析

### 域名和 HTTPS
- Railway 和 Vercel 都自动提供 HTTPS
- Railway 免费版域名：`*.up.railway.app`
- Vercel 免费版域名：`*.vercel.app`
- 自定义域名需要付费计划

### 休眠策略
- Railway 免费版没有休眠限制（与 Render 不同）
- Vercel 静态文件永远在线
- 适合长期运营

### 安全提醒
- **不要**把 `.env` 文件提交到 GitHub
- `JWT_SECRET` 一定要用随机字符串
- MongoDB 密码要足够复杂
- 生产环境已启用 CORS 限制

---

## 本地测试

在部署前，可以先本地测试 MongoDB 模式：

```powershell
cd d:\trae_projects\redbook
npm install
$env:MONGODB_URI="mongodb+srv://你的连接字符串"
$env:NODE_ENV="production"
node server.js
```

然后浏览器访问 `http://localhost:3000/app.html`

---

## 常见问题

### Q: Railway 构建失败？
A: 检查 `nixpacks.toml` 是否正确，查看构建日志。确保 `package.json` 中的 `start` 脚本是 `node server.js`。

### Q: MongoDB 连接失败？
A: 检查 `MONGODB_URI` 是否正确，密码是否包含特殊字符（需要 URL 编码）。确认 Network Access 已添加 `0.0.0.0/0`。

### Q: 前端请求后端报 CORS 错误？
A: 确保 Railway 的 `FRONTEND_URL` 环境变量设置为 Vercel 的域名（或 `*`）。

### Q: 视频分析不工作？
A: 查看 Railway 日志，确认 ffmpeg 是否安装成功。测试命令：`ffmpeg -version`。

### Q: 数据丢失？
A: MongoDB Atlas 是持久化存储，不会丢失。如果用的是 JSON 文件模式，Railway 重启会清空数据。

---

## 升级建议

如果用户量增长，可以考虑：

1. **数据库升级**：MongoDB Atlas M10 计划（$57/月，2GB 存储）
2. **后端升级**：Railway Pro 计划（$20/月，更多资源）
3. **CDN 加速**：Vercel Pro 计划（$20/月，全球加速）
4. **对象存储**：AWS S3 或 Cloudflare R2（存储视频临时文件）
5. **缓存层**：Redis（缓存热门选题和分析结果）

---

## 部署检查清单

- [ ] MongoDB Atlas 集群已创建
- [ ] 数据库用户已创建（用户名 + 密码）
- [ ] Network Access 已配置（`0.0.0.0/0`）
- [ ] 连接字符串已复制并测试
- [ ] 代码已推送到 GitHub
- [ ] Railway 项目已创建
- [ ] Railway 环境变量已配置（5 个）
- [ ] Railway 部署成功，获得后端 URL
- [ ] `app.html` 的 `API_BASE` 已修改
- [ ] Vercel 项目已创建
- [ ] Vercel 部署成功，获得前端 URL
- [ ] 前端功能测试通过
- [ ] 视频分析功能测试通过

---

## 技术支持

遇到问题可以：
1. 查看 Railway 日志（项目 → Logs）
2. 查看 Vercel 日志（项目 → Functions）
3. 检查 MongoDB Atlas 监控（Clusters → Metrics）
4. 浏览器 F12 查看控制台错误
