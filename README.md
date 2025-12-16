# UiToAi - UI 设计规范提取器

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?logo=google-chrome)](https://chrome.google.com/webstore)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

一个强大的 Chrome 扩展，用于从任何网站提取 UI 设计规范，帮助 AI 编程工具（如 Cursor、Windsurf）更精准地复刻界面设计。

## ✨ 核心功能

### 🎨 设计规范提取
- **设计令牌 (Design Tokens)**：颜色、字体、间距、圆角、阴影等视觉规范
- **布局规则 (Layout Rules)**：响应式断点、容器宽度、栅格系统
- **动效规范 (Motion Spec)**：过渡动画、关键帧、时长和缓动函数
- **可访问性 (A11y Spec)**：焦点环、ARIA 使用、标题结构
- **组件状态 (Component States)**：hover、focus、active、disabled 等状态规则

### 🏗️ 工程指纹识别
- 框架检测：Next.js、React、Vue、Svelte、Angular
- CSS 架构分析：CSS 变量使用度、工具类密度
- 构建工具特征识别

### 📁 AI 友好导出
导出结构化的多文件文件夹，专为 AI 编程工具优化：
```
UiToAi-export-{host}-{timestamp}/
├── ai/
│   ├── spec.json      # 完整的设计规范数据
│   ├── prompt.md      # AI 优化的提示词
│   └── tokens.css     # CSS 变量文件
├── samples/
│   └── elements.json  # 元素样本数据
└── previews/          # 元素预览文件（可选）
```

## 🚀 快速开始

### 安装方式

#### 方式一：开发者模式安装（推荐）
1. 克隆或下载本项目
2. 打开 Chrome，进入 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

#### 方式二：从 Chrome Web Store 安装
> 即将上架，敬请期待

### 基本使用

1. **打开目标网站**
   - 访问你想要分析 UI 设计的任何网站

2. **启动扩展**
   - 点击浏览器工具栏中的 UiToAi 图标
   - 扩展会自动为当前域名创建项目

3. **开始采集**
   - 点击"Start Run"按钮开始采集会话
   - 点击"Snapshot"捕获当前页面的设计规范

4. **选择样本元素**（可选）
   - 点击"Pick Element"
   - 在页面上点击感兴趣的关键元素
   - 采集元素的具体样式和 HTML 结构

5. **导出数据**
   - 点击"Export for AI"
   - 选择保存位置
   - 获得 AI 友好的设计规范文件

6. **在 AI 工具中使用**
   - 复制生成的 `prompt.md` 内容
   - 粘贴到 Cursor、Windsurf 或其他 AI 编程工具
   - 获得接近原站的设计实现

## 💡 使用场景

### 1. 网站重构
快速提取旧网站的设计规范，用于重构项目：
```markdown
# 示例提示词
基于以下设计规范重构我的网站：
- 配色：主色调 #3B82F6，辅助色 #10B981
- 字体：Inter 字体族，字号比例 1.25
- 断点：768px, 1024px, 1280px
```

### 2. 设计系统构建
从现有网站提取设计规范，构建设计系统：
- 色彩系统提取和使用
- 字体层级和间距规范
- 组件库设计原则

### 3. 原型开发
快速创建与目标网站风格一致的原型：
- 保持一致的视觉风格
- 响应用户的交互习惯
- 符合品牌识别规范

### 4. 学习借鉴
分析优秀网站的设计实现：
- 学习设计决策和最佳实践
- 理解响应式布局策略
- 掌握动效设计原则

## 🛠️ 高级功能

### 配置选项
在扩展选项页面可以调整：
- **脱敏开关**：移除敏感信息
- **采样数量**：控制元素样本数量
- **去噪级别**：过滤无用的样式数据
- **导出格式**：选择导出的文件格式

### 项目管理
- **多项目支持**：为不同域名创建独立项目
- **历史记录**：查看和管理历史采集记录
- **批量导出**：一次导出多个采集会话

### 数据分析
- **设计趋势分析**：识别设计模式和趋势
- **一致性检查**：发现设计不一致的地方
- **可访问性评估**：基础的可访问性检查

## 📊 数据隐私

### 本地存储
- 所有数据都存储在本地浏览器中
- 不会上传任何数据到云端服务器
- 用户完全控制自己的数据

### 脱敏选项
- 可选择性移除文本内容
- 可选择性移除图片引用
- 可选择性移除敏感属性

### 数据最小化
- 只存储设计相关的统计数据
- 不保存完整的页面 HTML
- 样本数量严格控制

## 🔧 技术架构

### 核心组件
- **Content Script**：页面数据采集引擎
- **Service Worker**：数据管理和导出中心
- **Popup UI**：用户交互界面

### 技术栈
- Chrome Extension Manifest V3
- ES6+ 模块化开发
- IndexedDB 本地存储
- 现代前端技术栈

### 数据模型
```javascript
// 项目结构
{
  "project": {
    "id": "uuid",
    "host": "example.com",
    "name": "Example Website",
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "run": {
    "id": "uuid",
    "projectId": "uuid",
    "startedAt": "2025-01-01T00:00:00Z",
    "spec": { /* 设计规范数据 */ },
    "samples": { /* 元素样本数据 */ }
  }
}
```

## 🤝 贡献指南

### 开发环境设置
1. 克隆项目：`git clone https://github.com/your-username/uitoai.git`
2. 安装依赖：`npm install`（如果有的话）
3. 加载扩展到 Chrome 开发者模式

### 代码规范
- 遵循 ES6+ 语法标准
- 文件大小不超过 500 行
- 充分的注释和文档
- 模块化和可测试的代码

### 提交流程
1. Fork 项目
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

## 🐛 问题反馈

### 常见问题

**Q: 扩展无法在某些网站上工作？**
A: 某些网站可能有严格的安全策略，这是正常现象。扩展会优雅降级，提供基础功能。

**Q: 导出的文件很大？**
A: 可以在选项中调整采样数量和去噪级别，控制文件大小。

**Q: 如何提高采集质量？**
A:
- 确保页面完全加载后再进行采集
- 选择关键页面进行深度采集
- 使用 Pick Element 功能选择代表性元素

### 反馈渠道
- GitHub Issues：[提交问题](https://github.com/your-username/uitoai/issues)
- 邮箱反馈：uitoai@example.com
- 用户社区：[讨论区](https://github.com/your-username/uitoai/discussions)

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户！

### 特别感谢
- Chrome Extension 文档和示例
- 开源社区的设计系统研究
- AI 编程工具的启发和支持

## 🗺️ 路线图

### v1.1（计划中）
- [ ] 更多框架支持（Solid.js、Qwik 等）
- [ ] 设计规范比较功能
- [ ] 批量网站分析

### v1.2（计划中）
- [ ] 云端同步选项
- [ ] 团队协作功能
- [ ] 设计规范版本管理

### v2.0（长期规划）
- [ ] 实时设计规范监控
- [ ] 自动化设计测试
- [ ] AI 设计建议生成

---

**让 AI 更懂设计，让设计更容易实现** 🎨✨

[⭐ 给我们一个 Star](https://github.com/your-username/uitoai) | [🐛 报告问题](https://github.com/your-username/uitoai/issues) | [💡 功能建议](https://github.com/your-username/uitoai/discussions)