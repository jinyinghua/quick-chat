# Quick Chat - 智能聊天助手

一个支持OpenAI和Google Gemini的AI聊天应用，具备PWA功能、离线支持和用户身份验证。

## ✨ 特性

- 🤖 **双AI支持**：同时支持OpenAI GPT和Google Gemini
- 🔐 **用户认证**：基于Supabase的安全身份验证系统
- 💾 **数据同步**：聊天记录和配置自动保存到云端
- 📱 **PWA支持**：可安装到桌面，支持离线使用
- 🎨 **现代界面**：类似ChatGPT的简洁设计
- 🌙 **主题切换**：支持深色和浅色主题
- 📱 **响应式设计**：完美适配桌面和移动设备
- ⚡ **快速启动**：PWA缓存机制，实现秒开应用
- 🔄 **离线队列**：网络恢复时自动同步离线数据

## 🏗️ 技术架构

- **前端**：原生HTML/CSS/JavaScript
- **后端**：Supabase (PostgreSQL + 实时API + 认证)
- **PWA**：Service Worker + Web App Manifest
- **AI集成**：OpenAI API + Google Gemini API
- **缓存**：浏览器Cache API + LocalStorage
- **部署**：静态文件托管 (Netlify, Vercel, GitHub Pages)

## 🚀 快速开始

### 1. 环境准备

确保您的环境具备：
- 现代浏览器 (Chrome 90+, Firefox 88+, Safari 14+)
- Node.js 16+ (可选，用于本地开发服务器)
- Supabase账户
- OpenAI API密钥
- Google Gemini API密钥

### 2. 克隆项目

```bash
git clone https://github.com/jinyinghua/quick-chat.git
cd ai-chat
```

### 3. 配置Supabase

1. 在 [Supabase](https://supabase.com) 创建新项目
2. 按照 `supabase-setup.md` 指导配置数据库
3. 复制您的项目URL和API密钥

### 4. 更新配置

编辑 `config.js` 文件：

```javascript
this.supabaseConfig = {
    url: 'YOUR_SUPABASE_PROJECT_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

### 5. 获取AI API密钥

- **OpenAI**: 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
- **Google Gemini**: 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)

### 6. 运行应用

#### 本地开发
```bash
# 使用简单HTTP服务器
python -m http.server 8000
# 或
npx serve .
# 或
npx http-server
```

#### 生产部署
将所有文件上传到静态托管服务：
- [Netlify](https://netlify.com)
- [Vercel](https://vercel.com)
- [GitHub Pages](https://pages.github.com)

### 7. 首次使用

1. 在设置中配置您的AI API密钥
2. 创建新对话开始聊天
3. 可选择安装为PWA应用到桌面

## 📖 使用指南

### 基本操作

1. **注册/登录**：使用邮箱注册账户
2. **配置API**：在设置中输入OpenAI或Gemini API密钥
3. **开始对话**：点击"新对话"开始聊天
4. **切换AI**：在聊天界面顶部选择AI提供商
5. **管理对话**：在左侧边栏查看历史对话

### 快捷键

- `Ctrl/Cmd + N`：新对话
- `Ctrl/Cmd + ,`：打开设置
- `Enter`：发送消息
- `Shift + Enter`：换行

### PWA功能

1. **安装**：浏览器提示时点击"安装"或手动安装
2. **离线使用**：断网时仍可查看历史聊天
3. **桌面启动**：像原生应用一样启动
4. **后台同步**：网络恢复时自动同步数据

## 🔧 配置说明

### AI配置

在设置中可以配置：
- **OpenAI**: API Key, 模型选择 (GPT-3.5/GPT-4), 温度参数
- **Gemini**: API Key, 模型选择, 温度参数

### 应用设置

- **主题**: 深色/浅色模式
- **自动保存**: 聊天记录自动保存
- **打字动画**: 显示AI思考动画

## 🏗️ 开发指南

### 项目结构

```
/
├── index.html          # 主页面
├── style.css           # 样式文件
├── script.js           # 主要逻辑
├── config.js           # 配置管理
├── auth.js             # 身份验证
├── chat.js             # 聊天功能
├── cache-utils.js      # 缓存管理
├── manifest.json       # PWA清单
├── sw.js              # Service Worker
├── offline.html       # 离线页面
├── supabase-setup.md  # 数据库设置
└── README.md          # 项目说明
```

### 核心模块

1. **AuthManager** (`auth.js`): 用户认证和会话管理
2. **ChatManager** (`chat.js`): 聊天功能和对话管理
3. **ConfigManager** (`config.js`): 配置和API密钥管理
4. **CacheManager** (`cache-utils.js`): PWA缓存和离线支持
5. **AIManager** (`config.js`): AI API调用管理

### 添加新的AI服务商

1. 在 `ConfigManager` 中添加新配置
2. 在 `AIManager` 中实现API调用方法
3. 更新设置界面
4. 更新AI提供商选择器

### 自定义主题

修改 `style.css` 中的CSS变量：

```css
:root {
    --bg-primary: #1a1a1a;      /* 主背景色 */
    --accent-primary: #10a37f;  /* 主色调 */
    --text-primary: #ffffff;    /* 主文字色 */
}
```

## 🔒 安全考虑

- API密钥存储在用户本地，非服务器端
- Supabase行级安全策略保护用户数据
- 所有敏感操作需要用户认证
- 建议在生产环境中使用环境变量

## 📱 PWA特性

### 缓存策略

- **静态资源**: 永久缓存 (HTML, CSS, JS)
- **API响应**: 智能缓存，支持离线访问
- **聊天记录**: 本地存储，支持离线查看
- **用户配置**: 缓存优化，快速加载

### 离线功能

- 查看历史聊天记录
- 访问应用设置
- 离线队列保存待发送消息
- 网络恢复时自动同步

## 🌐 部署指南

### Netlify部署

1. 连接GitHub仓库到Netlify
2. 设置构建设置：
   - Build command: (留空)
   - Publish directory: /
3. 添加环境变量：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. 部署完成

### Vercel部署

1. 导入GitHub仓库到Vercel
2. 构建设置：
   - Framework Preset: Other
   - Build Command: (留空)
   - Output Directory: /
3. 添加环境变量
4. 部署完成

### GitHub Pages部署

1. 将代码推送到GitHub仓库
2. 在仓库设置中启用GitHub Pages
3. 选择源分支 (main)
4. 访问 `https://username.github.io/repository-name`

### 🚀 Cloudflare Pages 部署指南

#### 第二步：连接Cloudflare Pages
1. 访问 [pages.cloudflare.com](https://pages.cloudflare.com)
2. 使用您的Cloudflare账户登录（或先注册免费账户）
3. 点击 "Create a project"
4. 选择 "Connect to Git"

#### 第三步：配置部署
1. **连接仓库**：
   - 选择您的GitHub仓库（需要先授权GitHub访问权限）
   - 选择仓库中的 `/chat` 目录或整个仓库

2. **构建设置**：
   - **Project name**: `ai-chat` (或您喜欢的名称)
   - **Production branch**: `main`
   - **Build command**: `(留空)`
   - **Build output directory**: `/`
   - **Root directory**: `/` (如果您部署整个仓库)

3. **环境变量**（可选）：
   - 如果您希望使用环境变量而不是修改文件，可以添加：
     - `VITE_SUPABASE_URL`: 您的Supabase项目URL
     - `VITE_SUPABASE_ANON_KEY`: 您的Supabase匿名密钥

#### 第四步：部署设置
1. **Functions** 目录设置：`/` (留空，因为我们不需要Serverless Functions)
2. **Headers 文件**：`/` (留空)
3. **重定向规则**：`/` (留空)

#### 第五步：部署完成
1. 点击 "Save and Deploy"
2. Cloudflare将开始部署过程（通常需要2-3分钟）
3. 部署完成后，您将获得一个URL，例如：`https://ai-chat.pages.dev`

#### 第六步：后置配置
部署完成后您需要：
1. **更新 config.js** 中的Supabase配置：
   ```javascript
   this.supabaseConfig = {
       url: 'https://xxxxx.supabase.co',
       anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   };
   ```

2. **配置Supabase数据库**：
   - 按照 `supabase-setup.md` 文件中的SQL脚本执行
   - 创建必要的表和RLS策略

3. **获取AI API密钥**并配置到应用设置中



## 🐛 故障排除

### 常见问题

1. **Supabase连接失败**
   - 检查URL和API密钥是否正确
   - 确认数据库表已正确创建
   - 验证行级安全策略

2. **API调用失败**
   - 确认API密钥有效且有足够余额
   - 检查网络连接
   - 验证API密钥权限

3. **PWA安装失败**
   - 使用HTTPS协议访问
   - 确认manifest.json配置正确
   - 检查Service Worker注册

4. **离线功能异常**
   - 清除浏览器缓存
   - 重新安装Service Worker
   - 检查浏览器PWA支持

### 调试技巧

- 打开浏览器开发者工具查看控制台
- 在Network面板监控API请求
- 在Application面板检查缓存状态
- 使用Supabase Dashboard查看数据库日志

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🤝 贡献

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📞 支持

如有问题，请：
1. 查看本文档的故障排除部分
2. 搜索现有的 [GitHub Issues](https://github.com/your-username/ai-chat/issues)
3. 创建新的 Issue 描述问题

## 🔄 更新日志

### v1.0.0 (2025-01-02)
- ✨ 初始版本发布
- 🤖 支持OpenAI和Gemini双AI
- 🔐 完整的用户认证系统
- 📱 PWA支持和离线功能
- 🎨 现代化聊天界面
- 💾 数据云端同步

---

**Quick Chat** - 让AI对话更简单 🚀
