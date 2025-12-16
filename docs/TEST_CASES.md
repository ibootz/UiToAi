# UiToAi 测试用例（完整）

> 目标：覆盖 Project/Run/Snapshot/Export 全流程、权限/兼容性/异常场景，方便你后续把问题按用例编号反馈给我定位。

## 0. 约定
- **用例编号格式**：`TC-{模块}-{序号}`，例如 `TC-EXPORT-003`
- **记录字段（建议你贴给我时包含）**
  - `用例编号`
  - `浏览器与版本`（Chrome/Edge）
  - `操作系统`（Windows）
  - `目标网址`
  - `实际结果（含报错截图/console log）`
  - `期望结果`

## 1. 测试环境与准备
### 1.1 环境
- 浏览器：
  - Edge Stable（你当前环境）
  - Chrome Stable（建议回归）
- 扩展：加载项目目录（当前为 `super-ui/`）为“开发者模式”未打包扩展（扩展显示名称为 `UiToAi`）

### 1.2 必要权限
- manifest 权限应包含：`activeTab`、`storage`、`downloads`，host_permissions：`<all_urls>`

### 1.3 观测手段（调试必备）
- **Popup DevTools**：右键 Popup → Inspect
- **Service Worker 日志**：扩展管理页 → Service worker → Inspect
- **页面 Console**：用于观察 content script 的错误

### 1.4 测试站点建议（覆盖类型）
- **Site-A（营销页）**：动效/断点丰富
- **Site-B（Web App）**：组件多、交互多
- **Site-C（文档页）**：排版多
- **Site-D（限制页）**：Chrome Web Store、edge://、chrome:// 等（用于验证失败提示）

---

## 2. Project 模块
### TC-PROJECT-001 自动创建 Project（按 host）
- 前置：打开任意 https 网站页面
- 步骤：点击扩展图标打开 Popup
- 期望：
  - Project 区域显示当前 `host`
  - 不出现 error 状态

### TC-PROJECT-002 同 host 复用 Project
- 前置：同一 host 已打开过并创建 Project
- 步骤：刷新页面→打开 Popup
- 期望：
  - 不创建重复 Project（后台 existed=true）
  - Project 仍为同 host

### TC-PROJECT-003 不可解析 URL 的降级
- 前置：打开无效 URL 或特殊页面（尽可能模拟）
- 步骤：打开 Popup
- 期望：
  - 状态区显示可理解错误（如 Invalid URL / Cannot access current tab）
  - 不崩溃

---

## 3. Run 模块
### TC-RUN-001 Start Run 成功
- 前置：Project 已初始化
- 步骤：点击 `Start Run`
- 期望：
  - Run 状态变为 Active
  - `Start Run` 按钮 disabled
  - `Stop Run`、`Capture Snapshot`、`Pick Element`、`Export for AI` enabled

### TC-RUN-002 Stop Run 成功
- 前置：Run Active
- 步骤：点击 `Stop Run`
- 期望：
  - Run 状态变为 Completed
  - `Capture Snapshot`、`Pick Element` disabled
  - `Export for AI` 仍可用

### TC-RUN-003 Popup 关闭后恢复 Active Run
- 前置：Run Active
- 步骤：关闭 Popup → 再次打开 Popup
- 期望：
  - 自动识别未结束的 Run 为 currentRun
  - Run 状态显示 Active

### TC-RUN-004 同 Project 多次 Run
- 前置：已有 Completed Run
- 步骤：点击 `Start Run` 新建 Run
- 期望：
  - 新 run 成为 active
  - 旧 run 保留且可导出（后续扩展 run 列表时验证）

---

## 4. Snapshot（采集）模块
### TC-SNAPSHOT-001 Capture Snapshot 成功（普通网站）
- 前置：Run Active
- 步骤：点击 `Capture Snapshot`
- 期望：
  - 状态显示 Snapshot captured
  - Preview JSON 中：
    - `designTokens.colorsCount > 0`（多数站点）
    - `layoutRules.breakpointsCount >= 0`
    - `motionSpec.keyframesCount >= 0`

### TC-SNAPSHOT-002 跨域 CSS 不崩溃
- 前置：选择一个有大量外链 CSS 的网站
- 步骤：点击 `Capture Snapshot`
- 期望：
  - 不因 `SecurityError` 崩溃
  - `layoutRules.breakpoints.sources.blockedCount` 可能大于 0（合理）

### TC-SNAPSHOT-003 大页面性能（采样上限）
- 前置：选择 DOM 很多的网站
- 步骤：点击 `Capture Snapshot`
- 期望：
  - 能在可接受时间内完成（建议 < 5s）
  - Popup 不冻结（允许短暂卡顿，但不应崩溃）

### TC-SNAPSHOT-004 特殊页面禁用 content script
- 前置：打开 `chrome://extensions` 或 `edge://extensions`
- 步骤：打开 Popup → Start Run → Capture Snapshot
- 期望：
  - 提示 Content script not available（或同等错误）
  - Popup 不崩溃

---

## 5. Pick Element（元素选择）模块
> 当前版本 Pick Element 仅激活选择模式；后续你反馈交互问题我再逐步完善采样写入。

### TC-PICK-001 激活 Pick 模式
- 前置：Run Active
- 步骤：点击 `Pick Element`
- 期望：
  - Popup 状态提示 Pick mode activated
  - 页面出现高亮/提示（若已有 UI overlay）

### TC-PICK-002 选择自身 UI 不应被采样
- 前置：Pick 模式开启且页面出现插件 UI
- 步骤：鼠标移动到插件 UI 上
- 期望：
  - 不高亮自身 UI
  - 不产生 sample

### TC-PICK-003 ESC 退出 Pick（如果支持）
- 前置：Pick 模式开启
- 步骤：按 ESC
- 期望：
  - Pick 模式退出
  - 高亮消失

---

## 6. Export（导出）模块
### TC-EXPORT-001 Export for AI 成功（多文件）
- 前置：Run Active 或 Completed；已采集 Snapshot
- 步骤：点击 `Export for AI`
- 期望：
  - 浏览器弹出一次保存对话框（仅第 1 个文件）
  - 下载目录出现文件夹：`UiToAi-export-{host}-{timestamp}/`
  - 文件存在：
    - `ai/spec.json`
    - `ai/prompt.md`
    - `samples/elements.json`

### TC-EXPORT-002 连续导出两次
- 前置：同一个 run
- 步骤：连续点击 `Export for AI` 两次
- 期望：
  - 生成两个不同 timestamp 的导出文件夹
  - 不报错/不出现 createObjectURL 类错误

### TC-EXPORT-003 未采集 Snapshot 也能导出（空 spec）
- 前置：Run Active，但不点击 Snapshot
- 步骤：直接 Export
- 期望：
  - 可导出
  - `spec.json` 为结构完整但数据较少

### TC-EXPORT-004 大文件导出（边界）
- 前置：手动让 spec 变大（或多次 Snapshot）
- 步骤：Export
- 期望：
  - 不出现下载失败
  - 若浏览器限制 data URL 长度，需记录错误并反馈（后续可改用 offscreen/document 或分块写入）

### TC-EXPORT-005 下载权限/策略被禁用
- 前置：浏览器策略禁用 downloads（如果公司环境）
- 步骤：Export
- 期望：
  - 清晰错误提示

---

## 7. 数据一致性与存储（IndexedDB）
### TC-DB-001 重启浏览器后 Project/Run 仍存在
- 前置：创建 Project + Run 并 snapshot
- 步骤：完全关闭浏览器 → 重新打开 → 打开同 host 页面 → 打开 Popup
- 期望：
  - Project 仍存在
  - 最近 run 可恢复/可导出

### TC-DB-002 多 host 隔离
- 前置：两个不同网站分别创建 Project
- 步骤：分别打开 Popup
- 期望：
  - Project 不串
  - Run 不串

---

## 8. UI/交互体验
### TC-UI-001 按钮启用/禁用正确
- 前置：无 run / active run / completed run 三种状态
- 步骤：分别观察按钮状态
- 期望：
  - 与状态逻辑一致，不出现“Active 但 Start 可点”等错误

### TC-UI-002 状态区错误提示可理解
- 步骤：触发任意失败（例如特殊页面无法注入 content script）
- 期望：
  - status 显示具体原因

---

## 9. 回归清单（每次修复后必跑）
- `TC-PROJECT-001`
- `TC-RUN-001` / `TC-RUN-002`
- `TC-SNAPSHOT-001` / `TC-SNAPSHOT-002`
- `TC-EXPORT-001`

---

## 10. 已知风险点（你反馈时建议优先贴日志）
- **Service Worker 环境 API 差异**（比如 URL.createObjectURL 不可用）
- **批量下载被浏览器拦截**（需要间隔、或用户允许多文件下载）
- **跨域 stylesheet 的 cssRules 读取 SecurityError**（已做降级，但仍需观测）
- **data URL 长度限制**（spec 大时可能触发，需采样/截断或更换导出实现）
