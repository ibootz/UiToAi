# UiToAi（全新逻辑）工程改造计划

## 1. 目标（Goal）
本插件用于从目标网站提取“复刻所需的关键规则数据”，带入 AI coding（Cursor/Windsurf）以更精准地模仿：
- 布局（layout & responsive）
- 字体与排版（typography）
- 配色与视觉规范（color & visual tokens）
- UI 组件体系与状态线索（component catalog & state rules）
- UX 交互一致性线索（focus/keyboard/a11y rules）
- 动效规范线索（motion tokens, keyframes references）
- 工程实现指纹（framework/CSS architecture fingerprint）

## 2. 边界（Non-goals）
- 不做云端同步（local-only）
- 不做“交互录制（录屏/事件回放）”第一版；第一版采用 CSS rule 线索
- 不保存整页 HTML（仅存“样本 + 统计”），避免体积过大与敏感信息
- 不做前向/后向兼容：这是一个全新插件逻辑

## 3. 已确认的产品取舍
- 导出形式：**B 多文件文件夹结构**
- 隐私：默认关闭脱敏，但提供开关
- 存储策略：只存样本 + 统计
- 组件状态：基于 **CSS rule 线索**（:hover/:focus/:active/:disabled...），不强依赖 computed style 强制态

## 4. 新插件架构（模块职责）
### 4.1 Content Script（content/content_script.js）
职责：在页面侧完成采集与组装“Run产物”的原材料。
- 页面级采集：
  - DesignTokens（CSS variables + computed 聚合统计）
  - LayoutRules（@media 断点/容器/栅格线索）
  - MotionSpec（transition/animation 分布 + keyframes 引用）
  - A11ySpec（focus ring 规则线索、ARIA 使用统计、heading 结构统计）
  - EngineeringFingerprint（框架/CSS 架构线索）
- 元素样本采集：Pick element 获取少量样本（selector、outerHTML(可脱敏)、computed 摘要、尺寸）
- 降级策略：跨域 stylesheet 读取 cssRules 失败时必须 try/catch，降级为“统计+引用”

### 4.2 Background Service Worker（background/service_worker.js）
职责：本地存储与导出组装。
- IndexedDB（全新 DB/Store）：Projects、Runs
- Run 生命周期：start/stop、写入 spec 与 samples
- 导出：根据 runId 将产物组装为多文件结构，调用 downloads API 下载
- 体积控制：
  - 采样上限、字符串截断（HTML/CSS/selector 列表）
  - spec 中大字段 topN（比如颜色/字体/keyframes 仅取前 N）

### 4.3 Popup（popup/*）
职责：以 Project/Run 为中心的操作面板。
- Project：按 host 创建/选择
- Run：start/stop、snapshot、pick element
- Export for AI：一键导出文件夹结构
- 选项：脱敏开关、去噪/截断级别、采样数量

## 5. 新数据模型（Schema v1）
### 5.1 逻辑实体
- Project：站点维度（通常按 host）
- Run：一次采集会话（时间范围 + 配置 + 产物）

### 5.2 Spec（Run 的核心产物）字段（建议）
- spec.version: 1
- spec.target:
  - host, url, title, capturedAt
- spec.designTokens:
  - colors: { top: [...], semanticHints: {...}, sources: {...} }
  - typography: { fontFamiliesTop: [...], scale: {...}, letterSpacingHints: [...] }
  - spacing/radius/shadow/zIndex: { distribution: [...], scaleHints: [...] }
- spec.layoutRules:
  - breakpoints: { candidates: [..], sources: { mediaRulesCount, errors } }
  - containers: { maxWidthTop: [...], gutterTop: [...] }
  - gridHints: { templatesTop: [...], gapTop: [...] }
- spec.componentCatalog:
  - components: [{ type, samples: [...], baseStyleHints: {...} }]
  - stateRules: [{ pseudo, selector, declarationsSummary, occurrences }]
- spec.motionSpec:
  - transitions: { durationTop, easingTop }
  - animations: { namesTop, durationTop }
  - keyframes: { namesTop, extractedCount, blockedCount }
  - reducedMotionHints: {...}
- spec.a11ySpec:
  - focusRingRules: [{ selector, declarationsSummary, occurrences }]
  - ariaUsageStats: { roleTop, ariaAttrTop }
  - headingOutlineStats: { h1..h6 counts }
- spec.engineeringFingerprint:
  - frameworkHints: { nextjs, react, vue, svelte, angular, unknown }
  - cssArchitectureHints: { cssVariablesUsageScore, utilityClassDensityScore, styleTagCount }

### 5.3 Samples（仅样本，不保存整页）
- samples.elements: [{ selector, tagName, bbox, outerHTML, textPreview(optional), computedStyleSummary }]
- samples.pages(optional): [{ url, title, landmarkStats, containerStats }]

## 6. 导出给 AI 的目录结构（文件夹结构）
导出目录命名：UiToAi-export-{host}-{timestamp}/
- ai/
  - spec.json
  - prompt.md
  - tokens.css（可选）
- samples/
  - elements.json
- previews/（可选）
  - element-1.html
  - element-2.html

## 7. prompt.md（生成策略建议）
- 强约束：按 spec.tokens/layout/motion/a11y 生成组件库与页面结构
- 生成顺序：先 tokens 与基础样式层 → 再 layout primitives → 再组件 catalog → 最后页面
- 验收点：断点、字号/行高、颜色语义、focus ring、hover/active 反馈、动效时长/easing

## 8. 风险与降级策略
- 跨域 CSS：document.styleSheets 读取 cssRules 常抛 SecurityError
  - 降级：记录“可访问规则数量/不可访问数量”，并从 computed 样本聚合 tokens
- 体积膨胀：outerHTML 与规则摘要可能过大
  - 降级：严格采样上限 + 字符串截断 + topN

