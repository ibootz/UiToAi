# UiToAi（全新逻辑）改造 Tasks

> 目标：从目标网站提取“复刻所需关键规则数据”，并导出为 **多文件文件夹结构** 供 Cursor/Windsurf 使用。

## 0. 里程碑划分
- Milestone 1：新 Schema + 新存储 + 新 UI 闭环（Start/Stop Run + Snapshot + Export）
- Milestone 2：Tokens/Layout/Motion/A11y/EngFingerprint 提取质量提升 + 降级策略完善
- Milestone 3：ComponentCatalog（CSS rule 线索）增强 + 样本/预览优化 + 稳定性/体积控制

---

## Milestone 1（闭环优先）
### T1.1 定义新消息协议与数据结构（Schema v1） ✅ 已完成
- 范围：确定 Project/Run/Spec/Samples 数据结构；确定消息 type 列表与 payload
- 产物：
  - `docs/ENGINEERING_PLAN.md`（已完成）
  - 在代码里形成常量枚举（建议：service_worker 内集中定义）
- DoD：开发时所有消息 type 固定且可 grep；Spec 结构能被稳定导出
- **完成内容**：
  - `background/service_worker.js`：定义 MSG 常量枚举（15 种消息类型）
  - Schema v1 结构注释（Project/Run/Spec/Samples 完整字段）
  - 默认值工厂函数（createDefaultRunSettings/createEmptySpec/createEmptySamples）
  - IndexedDB 配置（DB_NAME/STORE_PROJECTS/STORE_RUNS）

### T1.2 Service Worker：新 IndexedDB（projects/runs） ✅ 已完成
- 文件：`background/service_worker.js`
- 工作项：
  - 新 DB 名称与版本（与旧 DB 无关）
  - Store：`projects`（keyPath id），`runs`（keyPath id，index: projectId、startedAt）
  - API：create/list/select project；start/stop run；write run artifacts
- DoD：能在 popup 触发创建 project、开启/停止 run，并能持久化到 DB
- **完成内容**：
  - Project CRUD：listProjects/getProject/getProjectByHost/createProject/deleteProject
  - Run CRUD：listRunsByProject/getRun/startRun/stopRun/saveRun/updateRunSpec/addRunSample/deleteRun
  - 消息处理：PROJECT_LIST/CREATE/DELETE、RUN_LIST/GET/START/STOP/UPDATE_SPEC/ADD_SAMPLE/DELETE

### T1.3 Content Script：Run Snapshot 的最小可用采集（只要能出 spec） ✅ 已完成
- 文件：`content/content_script.js`
- 工作项：
  - 实现 `SUI2_CAPTURE_RUN_SNAPSHOT`：返回最小 spec（哪怕字段为空也要结构完整）
  - 采样策略：只抓“统计”，不抓整页 HTML
  - 降级策略：遍历 `document.styleSheets` 读取 `cssRules` 时 try/catch
- DoD：对任意普通网站可执行 snapshot，不因跨域 CSS 崩溃
- **完成内容**：
  - MSG 常量定义（与 service_worker 一致）
  - captureSnapshot()：返回完整 Spec 结构
  - extractDesignTokensSample()：颜色/字体/间距/圆角/阴影/zIndex topN 统计
  - extractBreakpoints()：从 @media 规则解析断点候选（含 blockedCount 降级）
  - extractHeadingStats()：h1-h6 数量统计
  - extractAriaStats()：role/aria-* 属性 topN
  - extractFrameworkHints()：Next.js/React/Vue/Svelte/Angular 检测
  - extractCssArchitectureHints()：CSS 变量使用度/utility class 密度/style 标签数
  - extractMotionSpec()：transition/animation tokens + keyframes 引用
  - safeGetCssRules()：跨域 stylesheet 访问降级

### T1.4 Popup：Project/Run 视角 UI（最小闭环） ✅ 已完成
- 文件：`popup/popup.html`、`popup/popup.js`、`popup/popup.css`
- 工作项：
  - Project：显示当前 host；按钮 Create/Select（最简可先自动按 host 创建）
  - Run：Start/Stop；Snapshot；Pick element（可先占位）
  - Export：按钮可触发 SW 导出
- DoD：无需复杂 UI，能完成 start→snapshot→export→stop 的完整流程
- **完成内容**：
  - popup.html：重写为 Project/Run/Export/Preview 四个区块
  - popup.css：重写样式，深色 header + 状态指示
  - popup.js：完整重写
    - initProject()：自动按当前 tab host 创建/获取 project
    - startRun/stopRun：Run 生命周期管理
    - captureSnapshot：调用 content script 采集 spec 并存储
    - pickElement：激活元素选择模式
    - exportForAI：导出 spec.json（T1.5 会增强为多文件）
    - UI 状态联动：按钮启用/禁用、状态文字、预览摘要

### T1.5 导出器：多文件文件夹结构下载 ✅ 已完成
- 文件：`background/service_worker.js`（导出组装），`popup/popup.js`（触发）
- 结构：`UiToAi-export-{host}-{timestamp}/ai/spec.json`、`ai/prompt.md`、`samples/elements.json`
- DoD：一次导出会触发多次 downloads 下载到同一文件夹（saveAs=false），不弹多次保存对话框（必要时仅第 1 个 saveAs=true）
- **完成内容**：
  - service_worker.js 新增：
    - sanitizeFilename()：文件名清理
    - generatePromptMd()：生成 AI 提示文档（含 colors/fonts/breakpoints/frameworks/transitions）
    - downloadFile()：下载单个文件到指定文件夹
    - exportRunToFiles()：组装多文件导出（spec.json + prompt.md + elements.json）
    - EXPORT_RUN 消息处理
  - popup.js：exportForAI() 调用 EXPORT_RUN 消息
  - 导出结构：
    - `UiToAi-export-{host}-{timestamp}/ai/spec.json`（第一个，saveAs=true）
    - `UiToAi-export-{host}-{timestamp}/ai/prompt.md`
    - `UiToAi-export-{host}-{timestamp}/samples/elements.json`

---

## Milestone 2（采集质量提升）
### T2.1 DesignTokens：CSS Variables + computed 聚合统计 ✅ 已完成
- 文件：`content/content_script.js`
- 工作项：
  - CSS variables：可访问 stylesheet 的 `:root` / `html` / `body` 变量摘要 + computed variables topN
  - computed 采样：抽样 N 个可见元素，聚合 colors/typography/spacing/radius/shadow/zIndex 分布
  - 输出：topN 值 + scaleHints（例如 4/8pt 网格概率）
- DoD：在 2-3 个站点导出结果能看到“稳定的 topN 字体/颜色/圆角/阴影/间距”

### T2.2 LayoutRules：断点/容器/栅格线索 ✅ 已完成
- 文件：`content/content_script.js`
- 工作项：
  - @media 解析：抽取 min/max-width 候选断点集合（同源可取；跨域统计 blockedCount）
  - container/gutter：检测常见 container max-width、左右 padding 分布
  - gridHints：grid-template-columns、gap 分布
- DoD：能输出 breakpoints candidates；container maxWidth topN

### T2.3 MotionSpec：transition/animation tokens + keyframes 引用 ✅ 已完成
- 文件：`content/content_script.js`
- 工作项：
  - computed 采样：transition-duration/timing-function、animation-duration 等 topN
  - stylesheet 扫描：@keyframes 名称集合；可访问则抽取部分文本摘要（长度上限）
- DoD：导出中能看到 duration/easing 的分布；keyframes namesTop

### T2.4 A11ySpec：focus ring 与语义结构统计 ✅ 已完成
- 文件：`content/content_script.js`
- 工作项：
  - CSS 规则扫描：:focus / :focus-visible 相关规则 selector + declarationsSummary
  - DOM 统计：role/aria-* 属性 topN；heading (h1-h6) 统计
- DoD：spec 中 focusRingRules 与 ariaUsageStats 非空（多数站点）

### T2.5 EngineeringFingerprint：框架与 CSS 架构线索 ✅ 已完成
- 文件：`content/content_script.js`
- 工作项：
  - generator meta、脚本特征、全局变量线索
  - CSS 变量使用强度、utility class 密度、style tag 数量
- DoD：spec 中 fingerprint 字段可用于指导 AI 选技术栈/样式组织方式

---

## Milestone 3（组件状态线索与样本完善）
### T3.1 ComponentCatalog：组件识别与样本采集 ✅ 已完成
- 文件：`content/content_script.js`
- 工作项：
  - 组件分类：button/link/input/select/textarea/modal/nav/list/table 等
  - 样本：每类组件保留少量样本（selector、bbox、outerHTML(可脱敏)、computed 摘要）
- DoD：导出 elements.json 能按组件类型分组，且样本数量受控

> 完成内容：
> - Snapshot 采集中新增 componentCatalog 自动采样与分组（按 type + perTypeLimit/totalLimit 控制）
> - `samples/elements.json` 导出结构增强：同时包含 componentCatalog 分组样本与 picked elements

### T3.2 CSS State Rules：:hover/:focus/:active/:disabled 规则线索 ✅ 已完成
- 文件：`content/content_script.js`
- 工作项：
  - stylesheet 扫描包含 pseudo 的 selector
  - declarationsSummary（只保留关键属性白名单，长度上限）
  - occurrences 统计（出现次数/命中候选）
- DoD：stateRules 在组件丰富的网站可明显增多，且体积可控

> 完成内容：
> - Snapshot 阶段新增 stateRules 扫描与去重合并（记录 pseudos/occurrences/declarationsSummary + stats/sources）

### T3.3 Export Prompt：将 spec 自动编译成可用 prompt.md ✅ 已完成
- 文件：`background/service_worker.js`
- 工作项：
  - prompt 模板：生成顺序、约束、验收点
  - 自动填充：breakpoints、typography scale、colors、motion tokens、focus ring
- DoD：复制 prompt 直接用于 Cursor/Windsurf 能产出“更贴近原站”的 UI

> 完成内容：
> - prompt.md 增强为“目标/步骤/约束/验收点 + 关键值摘要”，覆盖 tokens/layout/motion/a11y/stateRules/componentCatalog

### T3.4 体积控制与去噪策略 ✅ 已完成
- 文件：`content/content_script.js`、`background/service_worker.js`、`popup/popup.js`
- 工作项：
  - 采样上限（元素数量、规则数量、字符串长度）
  - topN（颜色/字体/阴影/间距/断点/keyframes）
  - 去噪开关：过滤透明色/默认字体/无意义阴影
- DoD：导出目录在常见站点保持在可接受大小（建议 < 2-5MB）

> 完成内容：
> - Popup 增加采集设置：denoise/maxElements/maxRules/truncateLength
> - Tokens 提取增加 denoise 过滤：默认字体/无意义阴影/默认黑白色/zIndex=0
> - Legacy Pick Element 入库增加深度字符串截断与（可选）脱敏，避免单样本撑爆导出体积

---

## 手工验收用例（建议）
- 站点 A（营销页，动效多）：检查 motion tokens、断点、配色是否合理
- 站点 B（Web App，组件多）：检查 componentCatalog 与 stateRules
- 站点 C（文档/博客，排版多）：检查 typography scale 与 heading outline

