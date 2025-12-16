# UiToAi 智能体开发指南

## 项目概述

UiToAi 是一个Chrome扩展，用于从目标网站提取"复刻所需的关键规则数据"，带入 AI coding（Cursor/Windsurf）以更精准地模仿：
- 布局（layout & responsive）
- 字体与排版（typography）
- 配色与视觉规范（color & visual tokens）
- UI 组件体系与状态线索（component catalog & state rules）
- UX 交互一致性线索（focus/keyboard/a11y rules）
- 动效规范线索（motion tokens, keyframes references）
- 工程实现指纹（framework/CSS architecture fingerprint）

## 架构设计原则

### 1. 模块化架构
- **根目录下的 1.1.0_1** 是一个Chrome扩展的打包文件，只能作为参考，不能直接修改
- **新项目名称：** super-ui
- 基于模块化设计原则，每个模块职责单一、边界清晰

### 2. 代码质量标准
- **文件大小限制：** 避免每个文件超过500行
- **持续重构：** 时刻注意抽象和重构，确保代码的可读性和可维护性
- **注释规范：** 充分添加注释，方便后续维护
- **错误处理：** 实施失败安全设计（Fail-Safe Design）

## 智能体架构模式

### 核心组件架构

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Popup UI      │◄────┤ Service Worker   │◄────┤ Content Script  │
│  (用户交互层)    │     │   (协调层)        │     │  (数据采集层)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
  Project/Run管理           数据存储与导出            页面分析与提取
         │                        │                        │
         └────────────────────────┴────────────────────────┘
                              数据流
```

### 智能体编排模式

#### 1. 顺序编排模式（Sequential Orchestration）
适用于具有清晰线性依赖关系的处理流程：
- Project 创建 → Run 启动 → 数据采集 → 导出文件

#### 2. 交接编排模式（Handoff Orchestration）
不同阶段由专门的"智能体"处理：
- **Content Script Agent** 负责页面数据采集
- **Service Worker Agent** 负责数据持久化和导出
- **Popup Agent** 负责用户交互和状态管理

#### 3. 并发编排模式（Concurrent Orchestration）
多个模块同时处理相同任务：
- 并行采集不同类型的UI数据（tokens、layout、motion等）
- 并行处理多个页面样本

## 模块职责定义

### Content Script（数据采集智能体）
**职责：** 在页面侧完成采集与组装"Run产物"的原材料
- 页面级采集：
  - DesignTokens（CSS variables + computed 聚合统计）
  - LayoutRules（@media 断点/容器/栅格线索）
  - MotionSpec（transition/animation 分布 + keyframes 引用）
  - A11ySpec（focus ring 规则线索、ARIA 使用统计、heading 结构统计）
  - EngineeringFingerprint（框架/CSS 架构线索）
- 元素样本采集：Pick element 获取少量样本
- 降级策略：跨域 stylesheet 读取失败时的优雅降级

### Service Worker（协调智能体）
**职责：** 本地存储与导出组装
- IndexedDB 管理：Projects、Runs 存储
- Run 生命周期：start/stop、写入 spec 与 samples
- 导出组装：多文件结构生成
- 体积控制：采样上限、字符串截断、topN 策略

### Popup（交互智能体）
**职责：** 以 Project/Run 为中心的操作面板
- Project 管理：按 host 创建/选择
- Run 控制：Start/Stop、Snapshot、Pick element
- 导出触发：一键导出文件夹结构
- 配置管理：脱敏开关、去噪级别、采样数量

## 数据流设计

### 消息协议（Message Protocol）
定义15种消息类型，确保模块间通信的标准化：
- PROJECT_* 系列：项目管理消息
- RUN_* 系列：运行控制消息
- CAPTURE_* 系列：数据采集消息

### 数据模型（Schema v1）
- **Project：** 站点维度（通常按 host）
- **Run：** 一次采集会话（时间范围 + 配置 + 产物）
- **Spec：** 运行核心产物（设计规范数据）
- **Samples：** 元素样本数据

## 开发最佳实践

### 1. 工具化思维
将每个功能都视为独立的工具：
- **数据工具：** extractDesignTokens、extractLayoutRules 等
- **行动工具：** captureSnapshot、pickElement 等
- **编排工具：** startRun、exportForAI 等

### 2. 失败安全设计
- 跨域 CSS 访问时 try/catch 保护
- 降级策略：统计 + 引用，不强制访问
- 数据体积控制：采样上限、字符串截断

### 3. 可观察性
- 每个关键操作都有日志记录
- 状态变化实时反映到 UI
- 错误信息友好展示

### 4. 模块化原则
- 单一职责：每个模块只负责一个核心功能
- 低耦合：模块间通过消息通信
- 高内聚：相关功能聚合在同一模块

## 实施里程碑

### Milestone 1：基础闭环
- 新 Schema + 新存储 + 新 UI 闭环
- Start/Stop Run + Snapshot + Export 基础功能

### Milestone 2：质量提升
- 各类数据提取质量提升
- 降级策略完善
- 稳定性增强

### Milestone 3：功能增强
- ComponentCatalog 增强
- 样本/预览优化
- 体积控制优化

## 技术栈选择

### 前端技术
- **Manifest V3：** Chrome 扩展最新标准
- **ES6 Modules：** 模块化开发
- **IndexedDB：** 本地数据存储
- **CSS Grid/Flexbox：** 现代布局

### AI 集成
- **结构化数据导出：** JSON 格式的规范数据
- **AI 友好的提示词：** 自动生成 prompt.md
- **多文件导出：** 便于 AI 工具理解和使用

## 安全与隐私

### 隐私保护
- 本地存储，无云端同步
- 提供脱敏开关
- 只存储样本和统计，不保存完整页面

### 安全考虑
- 跨域访问限制
- CSP 兼容性
- 用户数据保护

## 扩展性设计

### 插件化架构
- 数据提取器可插拔
- 导出格式可扩展
- UI 组件可复用

### 配置驱动
- 采样策略可配置
- 导出格式可定制
- 分析维度可扩展