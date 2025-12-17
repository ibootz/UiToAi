function t(key, substitutions) {
  try {
    const msg = chrome?.i18n?.getMessage?.(key, substitutions);
    return msg || "";
  } catch {
    return "";
  }
}

function getLang() {
  try {
    return String(chrome.i18n.getUILanguage() || "");
  } catch {
    return "";
  }
}

function applyI18nToElement(elementId, fallback) {
  const element = document.getElementById(elementId);
  if (element) {
    const text = t(elementId) || fallback;
    if (text) {
      element.textContent = text;
    }
  }
}

function applyI18nToPre(elementId, fallback) {
  const element = document.getElementById(elementId);
  if (element) {
    const text = t(elementId) || fallback;
    if (text) {
      element.textContent = text;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const lang = getLang();
  const isZh = lang.toLowerCase().startsWith("zh");

  // Set HTML lang attribute
  document.documentElement.lang = isZh ? "zh-CN" : "en";

  // Title / header
  const title = t("optionsTitle") || (isZh ? "UiToAi - 使用指南" : "UiToAi - Usage Guide");
  document.title = title;

  const pageTitleEl = document.getElementById("page-title");
  if (pageTitleEl) pageTitleEl.textContent = title;

  applyI18nToElement("options-subtitle", isZh ? "使用指南" : "Usage Guide");

  // Feature descriptions
  applyI18nToElement("feature-title", isZh ? "UiToAi 的核心功能" : "What UiToAi Can Do");
  applyI18nToElement("feature-intro", isZh ? "UiToAi 是一个强大的 Chrome 扩展，用于从任何网站提取 UI 设计规范，帮助 AI 编程工具更精准地复刻设计。" : "UiToAi is a powerful Chrome extension that extracts UI design specifications from any website, helping AI coding tools replicate designs more accurately.");

  // Snapshot feature
  applyI18nToElement("feature-snapshot-title", isZh ? "📊 采集快照（设计系统分析）" : "📊 Capture Snapshot (Design System Analysis)");
  applyI18nToElement("feature-snapshot-desc", isZh ? "从整个页面提取完整的设计规范数据" : "Extract comprehensive design specifications from the entire page");
  applyI18nToPre("feature-snapshot-items", isZh ? "• **设计令牌**：颜色、字体、间距、圆角、阴影、z-index\n• **布局规则**：响应式断点、容器宽度、栅格系统\n• **动效规范**：过渡动画、关键帧、时长和缓动函数\n• **可访问性**：标题结构、ARIA 使用统计\n• **工程指纹**：框架检测（React/Vue/Angular）、CSS 架构模式" : "• **Design Tokens**: Colors, typography, spacing, border-radius, shadows, z-index\n• **Layout Rules**: Responsive breakpoints, container widths, grid systems\n• **Motion Specs**: Transition animations, keyframes, duration and easing functions\n• **Accessibility**: Heading structure, ARIA usage statistics\n• **Engineering Fingerprint**: Framework detection (React/Vue/Angular), CSS architecture patterns");
  applyI18nToElement("feature-snapshot-use", isZh ? "适用场景：设计系统分析、样式指南创建、完整设计文档" : "Best for: Design system analysis, style guide creation, comprehensive design documentation");

  // Element feature
  applyI18nToElement("feature-element-title", isZh ? "🎯 选择元素（组件级分析）" : "🎯 Pick Element (Component-Level Analysis)");
  applyI18nToElement("feature-element-desc", isZh ? "选择特定的 UI 组件进行详细的代码提取" : "Select specific UI components for detailed code extraction");
  applyI18nToPre("feature-element-items", isZh ? "• **HTML 结构**：完整的组件 HTML 代码\n• **计算样式**：元素的实际 CSS 属性值\n• **Tailwind 转换**：智能生成对应的 Tailwind 类名\n• **元素尺寸**：位置、大小等几何信息\n• **文本预览**：元素的文本内容" : "• **HTML Structure**: Complete component HTML code\n• **Computed Styles**: Actual CSS property values\n• **Tailwind Conversion**: Intelligent generation of corresponding Tailwind classes\n• **Element Dimensions**: Position, size and geometric information\n• **Text Preview**: Element's text content");
  applyI18nToElement("feature-element-use", isZh ? "适用场景：组件实现、代码参考、特定 UI 元素复刻" : "Best for: Component implementation, code reference, specific UI element replication");

  // Page feature
  applyI18nToElement("feature-page-title", isZh ? "📄 选择页面（完整页面采集）" : "📄 Pick Page (Full Page Capture)");
  applyI18nToElement("feature-page-desc", isZh ? "采集完整的页面结构和基础信息" : "Capture complete page structure and base information");
  applyI18nToPre("feature-page-items", isZh ? "• **完整 HTML**：页面的完整源代码\n• **页面信息**：URL、标题和元数据\n• **Google 字体**：字体链接和导入\n• **页面概览**：全面的页面级数据" : "• **Complete HTML**: Full page source code\n• **Page Information**: URL, title and metadata\n• **Google Fonts**: Font links and imports\n• **Page Overview**: Comprehensive page-level data");
  applyI18nToElement("feature-page-use", isZh ? "适用场景：页面迁移、完整重构、全页面参考" : "Best for: Page migration, complete reconstruction, full-page reference");

  // Workflows
  applyI18nToElement("workflow-title", isZh ? "🚀 推荐工作流程" : "🚀 Recommended Workflows");
  applyI18nToElement("workflow-design", isZh ? "设计系统分析" : "For Design System Analysis");
  applyI18nToElement("workflow-design-steps", isZh ? "开始运行 → 采集快照 → 导出给 AI → 获得完整设计规范" : "Start Run → Capture Snapshot → Export for AI → Get complete design specifications");
  applyI18nToElement("workflow-component", isZh ? "组件实现" : "For Component Implementation");
  applyI18nToElement("workflow-component-steps", isZh ? "开始运行 → 选择元素 → 挑选关键组件 → 导出给 AI → 获得组件代码" : "Start Run → Pick Element → Select key components → Export for AI → Get component code");
  applyI18nToElement("workflow-page", isZh ? "页面重构" : "For Page Reconstruction");
  applyI18nToElement("workflow-page-steps", isZh ? "开始运行 → 选择元素 → 选择页面 → 导出给 AI → 获得完整页面代码" : "Start Run → Pick Element → Pick page → Export for AI → Get complete page code");

  // Export structure
  applyI18nToElement("data-title", isZh ? "📁 导出结构" : "📁 Export Structure");
  applyI18nToElement("data-description", isZh ? "所有数据都以 AI 友好的文件夹结构导出到您的下载目录" : "All data is exported to an AI-friendly folder structure in your Downloads folder");

  // Privacy
  applyI18nToElement("privacy-title", isZh ? "🔒 隐私与安全" : "🔒 Privacy & Security");
  applyI18nToPre("privacy-local", isZh ? "• **100% 本地处理**：所有数据都在本地处理，不上传云端\n• **无数据收集**：我们不收集或存储您的任何数据\n• **可选脱敏**：导出前移除敏感文本内容\n• **样本控制**：限制采集的数据量" : "• **100% Local Processing**: All data is processed locally, no cloud uploads\n• **No Data Collection**: We don't collect or store any of your data\n• **Optional Sanitization**: Remove sensitive text content before export\n• **Sample Control**: Limit the amount of data collected");

  // Tips
  applyI18nToElement("tips-title", isZh ? "💡 专业技巧" : "💡 Pro Tips");
  applyI18nToElement("tips1", isZh ? "最佳实践：先用采集快照获得设计上下文，再用选择元素获取具体组件" : "Best Practice: Start with Capture Snapshot for design context, then use Pick Element for specific components");
  applyI18nToElement("tips2", isZh ? "多页面采集：采集不同页面以构建完整的设计系统" : "Multiple Pages: Capture different pages to build comprehensive design systems");
  applyI18nToElement("tips3", isZh ? "质量保证：等待页面完全加载后再采集，获得最佳效果" : "Quality: Wait for pages to fully load before capturing for best results");
  applyI18nToElement("tips4", isZh ? "AI 优化：导出的数据专门为 Cursor、Windsurf 等 AI 编程工具优化" : "AI Ready: Exported data is optimized for Cursor, Windsurf, and other AI coding tools");

  // Troubleshooting
  applyI18nToElement("options-troubleshooting", isZh ? "Troubleshooting / 排障" : "Troubleshooting / 排障");

  // Footer
  applyI18nToElement("options-footer", isZh ? "UiToAi 本地运行，不上传云端。" : "UiToAi runs locally. No cloud sync.");
});
