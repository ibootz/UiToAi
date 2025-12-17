function createEmptySpec(target) {
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
      focusRingRulesStats: {
        matchedRulesCount: 0,
        listCount: 0,
        pseudoOccurrences: { focus: 0, focusVisible: 0, focusWithin: 0 },
        selectorOccurrencesTotal: 0
      },
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
        settings: normalizeRunSettings(null)
      },
      extra: { generator: "", scriptSrcHintsTop: [], globals: {} }
    }
  };
}

function normalizeRunSettings(settings) {
  const s = settings && typeof settings === "object" ? settings : {};
  const maxElements = Number.isFinite(s.maxElements) ? s.maxElements : 50;
  const maxRules = Number.isFinite(s.maxRules) ? s.maxRules : 200;
  const truncateLength = Number.isFinite(s.truncateLength) ? s.truncateLength : 2000;
  return {
    sanitize: Boolean(s.sanitize),
    maxElements: Math.max(1, Math.min(500, maxElements)),
    maxRules: Math.max(50, Math.min(5000, maxRules)),
    truncateLength: Math.max(200, Math.min(20000, truncateLength))
  };
}

function truncateString(s, maxLen) {
  const str = String(s ?? "");
  if (!maxLen || str.length <= maxLen) return str;
  return str.slice(0, Math.max(0, maxLen - 3)) + "...";
}

function topN(arr, n = 10) {
  const counts = {};
  for (const v of arr) {
    if (v !== undefined && v !== null && v !== "") {
      counts[v] = (counts[v] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }));
}

function safeGetCssRules(sheet) {
  try {
    return sheet.cssRules || [];
  } catch {
    return null;
  }
}

function walkCssRules(rules, budget, onRule) {
  if (!rules) return;
  for (const rule of rules) {
    if (budget.remaining <= 0) return;
    budget.remaining--;
    try {
      onRule(rule);
    } catch {}

    const childRules = rule && rule.cssRules;
    if (childRules && childRules.length) {
      walkCssRules(childRules, budget, onRule);
      if (budget.remaining <= 0) return;
    }
  }
}

function sampleVisibleElements(maxCount) {
  const out = [];
  const all = document.querySelectorAll("*");
  const total = all.length;
  if (total === 0) return out;

  const step = Math.max(1, Math.floor(total / Math.max(1, maxCount)));
  for (let i = 0; i < total && out.length < maxCount; i += step) {
    const el = all[i];
    if (!(el instanceof Element)) continue;
    if (isInOwnUi(el)) continue;
    try {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      out.push(el);
    } catch {}
  }
  return out;
}

function gridScaleHintsFromPxValues(pxValues) {
  const values = pxValues.filter((n) => Number.isFinite(n) && n > 0);
  if (values.length === 0) return [];
  const units = [4, 8];
  return units.map((unit) => {
    let hit = 0;
    for (const v of values) {
      const r = v % unit;
      const dist = Math.min(r, unit - r);
      if (dist <= 0.5) hit++;
    }
    const ratio = hit / values.length;
    return { unitPx: unit, ratio: Number(ratio.toFixed(3)), samples: values.length };
  });
}
