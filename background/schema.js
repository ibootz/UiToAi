// ============================================================
// UiToAi - Schema (v1)
// ============================================================

// 用于代码参考与类型提示（JS 无类型，仅作为注释）

/*
Project {
  id: string (UUID)
  host: string
  createdAt: string (ISO)
  notes: string
}

Run {
  id: string (UUID)
  projectId: string
  startedAt: string (ISO)
  endedAt: string | null
  url: string
  title: string
  settings: RunSettings
  spec: Spec
  samples: Samples
}

RunSettings {
  sanitize: boolean       // 脱敏开关（默认 false）
  maxElements: number     // 元素采样上限
  maxRules: number        // CSS 规则采样上限
  truncateLength: number  // 字符串截断长度
}

Spec {
  version: 1
  target: { host, url, title, capturedAt }
  designTokens: DesignTokens
  layoutRules: LayoutRules
  componentCatalog: ComponentCatalog
  motionSpec: MotionSpec
  a11ySpec: A11ySpec
  engineeringFingerprint: EngineeringFingerprint
}

Samples {
  elements: [{ selector, tagName, bbox, outerHTML, textPreview, computedStyleSummary }]
}
*/

export function createDefaultRunSettings() {
  return {
    sanitize: false,
    maxElements: 50,
    maxRules: 200,
    truncateLength: 2000
  };
}

export function createEmptySpec(target) {
  return {
    version: 1,
    target: target || { host: "", url: "", title: "", capturedAt: "" },
    designTokens: {
      colors: { top: [], semanticHints: {}, sources: { cssVariables: { computedTop: [], declaredTop: [], sources: { scannedRulesCount: 0, blockedCount: 0 } } } },
      typography: { fontFamiliesTop: [], scale: { fontSizeTop: [], lineHeightTop: [] }, letterSpacingHints: [] },
      spacing: { distribution: [], scaleHints: [] },
      radius: { distribution: [], scaleHints: [] },
      shadow: { distribution: [], scaleHints: [] },
      zIndex: { distribution: [], scaleHints: [] }
    },
    layoutRules: {
      breakpoints: { candidates: [], sources: { mediaRulesCount: 0, blockedCount: 0 } },
      containers: { maxWidthTop: [], gutterTop: [] },
      gridHints: { templatesTop: [], gapTop: [] }
    },
    componentCatalog: {
      components: [],
      stateRules: []
    },
    motionSpec: {
      transitions: { durationTop: [], easingTop: [] },
      animations: { namesTop: [], durationTop: [], easingTop: [] },
      keyframes: { namesTop: [], extractedCount: 0, blockedCount: 0, samples: [] },
      reducedMotionHints: { mediaRulesCount: 0 }
    },
    a11ySpec: {
      focusRingRules: [],
      focusRingRulesSources: { scannedRulesCount: 0, blockedCount: 0 },
      ariaUsageStats: { roleTop: [], ariaAttrTop: [] },
      headingOutlineStats: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 }
    },
    engineeringFingerprint: {
      frameworkHints: { nextjs: false, react: false, vue: false, svelte: false, angular: false, unknown: true },
      cssArchitectureHints: {
        cssVariablesUsageScore: 0,
        utilityClassDensityScore: 0,
        styleTagCount: 0,
        styleSheetsCount: 0,
        styleSheetsBlockedCount: 0,
        settings: createDefaultRunSettings()
      },
      extra: { generator: "", scriptSrcHintsTop: [], globals: {} }
    }
  };
}

export function createEmptySamples() {
  return {
    elements: []
  };
}
