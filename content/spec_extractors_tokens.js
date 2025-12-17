function extractBreakpoints(settings) {
  const s = normalizeRunSettings(settings);
  const candidates = new Set();
  let mediaRulesCount = 0;
  let blockedCount = 0;

  for (const sheet of document.styleSheets) {
    const rules = safeGetCssRules(sheet);
    if (rules === null) {
      blockedCount++;
      continue;
    }
    const budget = { remaining: s.maxRules };
    walkCssRules(rules, budget, (rule) => {
      if (rule.type === CSSRule.MEDIA_RULE) {
        mediaRulesCount++;
        const text = rule.conditionText || rule.media?.mediaText || "";
        const matches = text.match(/\b(min|max)-width:\s*(\d+)(px|em|rem)?/gi) || [];
        for (const m of matches) {
          const numMatch = m.match(/(\d+)/);
          if (numMatch) candidates.add(Number(numMatch[1]));
        }
      }
    });
  }

  return {
    candidates: Array.from(candidates).sort((a, b) => a - b),
    sources: { mediaRulesCount, blockedCount }
  };
}

function extractCssVariablesSummary(settings) {
  const s = normalizeRunSettings(settings);
  const computedVars = [];
  const declaredVars = [];
  let scannedRulesCount = 0;
  let blockedCount = 0;

  try {
    const rootStyle = getComputedStyle(document.documentElement);
    for (let i = 0; i < rootStyle.length; i++) {
      const prop = rootStyle[i];
      if (typeof prop === "string" && prop.startsWith("--")) {
        computedVars.push(prop);
      }
    }
  } catch {}

  for (const sheet of document.styleSheets) {
    const rules = safeGetCssRules(sheet);
    if (rules === null) {
      blockedCount++;
      continue;
    }
    const budget = { remaining: s.maxRules };
    walkCssRules(rules, budget, (rule) => {
      scannedRulesCount++;
      if (rule.type !== CSSRule.STYLE_RULE) return;
      const sel = String(rule.selectorText || "");
      if (!sel) return;
      if (!/(^|\s)(:root|html|body)(\s|$|,)/.test(sel)) return;
      const style = rule.style;
      if (!style) return;
      for (let i = 0; i < style.length; i++) {
        const name = style[i];
        if (typeof name === "string" && name.startsWith("--")) {
          declaredVars.push(name);
        }
      }
    });
  }

  return {
    computedTop: topN(computedVars, 30),
    declaredTop: topN(declaredVars, 30),
    sources: { scannedRulesCount, blockedCount }
  };
}

function extractHeadingStats() {
  return {
    h1: document.querySelectorAll("h1").length,
    h2: document.querySelectorAll("h2").length,
    h3: document.querySelectorAll("h3").length,
    h4: document.querySelectorAll("h4").length,
    h5: document.querySelectorAll("h5").length,
    h6: document.querySelectorAll("h6").length
  };
}

function extractAriaStats() {
  const roles = [];
  const ariaAttrs = [];
  document.querySelectorAll("[role]").forEach((el) => {
    roles.push(el.getAttribute("role"));
  });
  document.querySelectorAll("*").forEach((el) => {
    for (const attr of el.attributes) {
      if (attr.name.startsWith("aria-")) {
        ariaAttrs.push(attr.name);
      }
    }
  });
  return {
    roleTop: topN(roles, 10),
    ariaAttrTop: topN(ariaAttrs, 10)
  };
}

function extractFrameworkHints() {
  const hints = { nextjs: false, react: false, vue: false, svelte: false, angular: false, unknown: true };
  if (document.getElementById("__next") || document.querySelector("[data-nextjs-scroll-focus-boundary]")) {
    hints.nextjs = true;
    hints.unknown = false;
  }
  if (document.querySelector("[data-reactroot]") || document.getElementById("root")?.hasAttribute("data-reactroot")) {
    hints.react = true;
    hints.unknown = false;
  }
  if (document.querySelector("[data-v-]") || window.__VUE__) {
    hints.vue = true;
    hints.unknown = false;
  }
  if (document.querySelector("[class*='svelte-']")) {
    hints.svelte = true;
    hints.unknown = false;
  }
  if (document.querySelector("[ng-version]") || document.querySelector("[_ngcontent-]")) {
    hints.angular = true;
    hints.unknown = false;
  }
  return hints;
}

function extractCssArchitectureHints(settings) {
  const s = normalizeRunSettings(settings);
  let cssVariablesUsageScore = 0;
  let utilityClassDensityScore = 0;
  const styleTagCount = document.querySelectorAll("style").length;

  let styleSheetsCount = 0;
  let styleSheetsBlockedCount = 0;

  const rootStyle = getComputedStyle(document.documentElement);
  const varPattern = /^--/;
  for (let i = 0; i < rootStyle.length; i++) {
    if (varPattern.test(rootStyle[i])) cssVariablesUsageScore++;
  }

  styleSheetsCount = document.styleSheets?.length || 0;
  for (const sheet of document.styleSheets) {
    if (safeGetCssRules(sheet) === null) styleSheetsBlockedCount++;
  }

  const sampleEls = document.querySelectorAll("div, span, button, a, p");
  let totalClasses = 0;
  let utilityLikeClasses = 0;
  const utilityPattern = /^(flex|grid|p-|m-|w-|h-|text-|bg-|border-|rounded-|shadow-|gap-|items-|justify-)/;
  for (let i = 0; i < Math.min(sampleEls.length, 100); i++) {
    const el = sampleEls[i];
    for (const cls of el.classList) {
      totalClasses++;
      if (utilityPattern.test(cls)) utilityLikeClasses++;
    }
  }
  if (totalClasses > 0) {
    utilityClassDensityScore = Math.round((utilityLikeClasses / totalClasses) * 100);
  }

  return { cssVariablesUsageScore, utilityClassDensityScore, styleTagCount, styleSheetsCount, styleSheetsBlockedCount, settings: s };
}

function isDefaultFontFamilyName(name) {
  const s = String(name || "").trim().toLowerCase();
  if (!s) return true;
  const defaults = new Set([
    "system-ui",
    "ui-sans-serif",
    "ui-serif",
    "ui-monospace",
    "-apple-system",
    "blinkmacsystemfont",
    "segoe ui",
    "roboto",
    "helvetica",
    "helvetica neue",
    "arial",
    "sans-serif",
    "serif",
    "monospace"
  ]);
  return defaults.has(s);
}

function isNoisyDefaultColor(v) {
  const s = String(v || "").trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return true;
  const noisy = new Set([
    "rgb(0,0,0)",
    "rgba(0,0,0,1)",
    "#000",
    "#000000",
    "rgb(255,255,255)",
    "rgba(255,255,255,1)",
    "#fff",
    "#ffffff"
  ]);
  return noisy.has(s);
}

function isMeaninglessShadow(v) {
  const s = String(v || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return true;
  if (s === "none") return true;
  if (/(^| )0px 0px 0px( 0px)?( |$)/.test(s) && /(rgba\(0, ?0, ?0, ?0\)|rgba\(0,0,0,0\))/.test(s)) return true;
  if (/(^| )0 0 0( 0)?( |$)/.test(s) && /(rgba\(0, ?0, ?0, ?0\)|rgba\(0,0,0,0\))/.test(s)) return true;
  return false;
}

function extractDesignTokensSample(settings) {
  const s = normalizeRunSettings(settings);
  const colors = [];
  const fontFamilies = [];
  const fontSizes = [];
  const lineHeights = [];
  const letterSpacings = [];
  const spacings = [];
  const spacingsPx = [];
  const radii = [];
  const radiiPx = [];
  const shadows = [];
  const zIndices = [];

  const sampleEls = sampleVisibleElements(Math.min(300, Math.max(80, s.maxElements * 4)));
  for (const el of sampleEls) {
    try {
      const cs = getComputedStyle(el);
      if (cs.color && !isTransparentColor(cs.color) && (!s.denoise || !isNoisyDefaultColor(cs.color))) colors.push(cs.color);
      if (cs.backgroundColor && !isTransparentColor(cs.backgroundColor) && (!s.denoise || !isNoisyDefaultColor(cs.backgroundColor))) colors.push(cs.backgroundColor);
      if (cs.borderTopColor && !isTransparentColor(cs.borderTopColor) && (!s.denoise || !isNoisyDefaultColor(cs.borderTopColor))) colors.push(cs.borderTopColor);

      if (cs.fontFamily) {
        const primary = cs.fontFamily.split(",")[0].trim().replace(/['"]/g, "");
        if (!s.denoise || !isDefaultFontFamilyName(primary)) fontFamilies.push(primary);
      }
      if (cs.fontSize) fontSizes.push(cs.fontSize);
      if (cs.lineHeight && cs.lineHeight !== "normal") lineHeights.push(cs.lineHeight);
      if (cs.letterSpacing && cs.letterSpacing !== "normal") letterSpacings.push(cs.letterSpacing);

      const spacingCandidates = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft, cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft, cs.gap, cs.rowGap, cs.columnGap];
      for (const v of spacingCandidates) {
        if (!v || v === "0px" || v === "normal") continue;
        spacings.push(v);
        const px = parsePx(v);
        if (px !== null) spacingsPx.push(px);
      }

      const r = cs.borderRadius;
      if (r && r !== "0px") {
        radii.push(r);
        const px = parsePx(r);
        if (px !== null) radiiPx.push(px);
      }
      if (cs.boxShadow && cs.boxShadow !== "none" && (!s.denoise || !isMeaninglessShadow(cs.boxShadow))) shadows.push(cs.boxShadow);
      if (cs.zIndex && cs.zIndex !== "auto" && (!s.denoise || cs.zIndex !== "0")) zIndices.push(cs.zIndex);
    } catch {}
  }

  const cssVars = extractCssVariablesSummary(s);
  const spacingHints = gridScaleHintsFromPxValues(spacingsPx);
  const radiusHints = gridScaleHintsFromPxValues(radiiPx);

  return {
    colors: { top: topN(colors, 15), semanticHints: {}, sources: { cssVariables: cssVars } },
    typography: {
      fontFamiliesTop: topN(fontFamilies, 10),
      scale: { fontSizeTop: topN(fontSizes, 12), lineHeightTop: topN(lineHeights, 10) },
      letterSpacingHints: topN(letterSpacings, 8)
    },
    spacing: { distribution: topN(spacings, 15), scaleHints: spacingHints },
    radius: { distribution: topN(radii, 10), scaleHints: radiusHints },
    shadow: { distribution: topN(shadows, 10), scaleHints: [] },
    zIndex: { distribution: topN(zIndices, 10), scaleHints: [] }
  };
}

function extractLayoutContainersAndGridHints(settings) {
  const s = normalizeRunSettings(settings);
  const maxWidthValues = [];
  const gutterValues = [];
  const gridTemplates = [];
  const gridGaps = [];

  const sampleEls = sampleVisibleElements(Math.min(500, Math.max(120, s.maxElements * 8)));
  for (const el of sampleEls) {
    try {
      const cs = getComputedStyle(el);

      const maxW = cs.maxWidth;
      const maxWPx = parsePx(maxW);
      const ml = cs.marginLeft;
      const mr = cs.marginRight;
      const centered = (ml === "auto" && mr === "auto") || (String(ml).includes("auto") && String(mr).includes("auto"));
      if (centered && maxWPx !== null && maxWPx >= 320) {
        maxWidthValues.push(`${Math.round(maxWPx)}px`);
        const pl = parsePx(cs.paddingLeft);
        const pr = parsePx(cs.paddingRight);
        if (pl !== null && pr !== null && (pl > 0 || pr > 0)) {
          gutterValues.push(`${Math.round((pl + pr) / 2)}px`);
        }
      }

      if (cs.display === "grid" || cs.display === "inline-grid") {
        if (cs.gridTemplateColumns && cs.gridTemplateColumns !== "none") {
          gridTemplates.push(truncateString(cs.gridTemplateColumns, 120));
        }
        const gap = cs.gap && cs.gap !== "normal" ? cs.gap : "";
        const colGap = cs.columnGap && cs.columnGap !== "normal" ? cs.columnGap : "";
        const rowGap = cs.rowGap && cs.rowGap !== "normal" ? cs.rowGap : "";
        const g = gap || (colGap && rowGap ? `${rowGap} ${colGap}` : colGap || rowGap);
        if (g && g !== "0px") gridGaps.push(g);
      }
    } catch {}
  }

  return {
    containers: { maxWidthTop: topN(maxWidthValues, 10), gutterTop: topN(gutterValues, 10) },
    gridHints: { templatesTop: topN(gridTemplates, 10), gapTop: topN(gridGaps, 10) }
  };
}

function extractEngineeringFingerprintExtra() {
  const generator = document.querySelector('meta[name="generator"]')?.getAttribute("content") || "";
  const scripts = Array.from(document.scripts || []);
  const srcs = scripts.map((s) => s.src || "").filter(Boolean);
  const hints = {
    generator: truncateString(generator, 120),
    scriptSrcHintsTop: topN(
      srcs
        .map((u) => {
          try {
            const url = new URL(u, location.href);
            return truncateString(url.pathname, 80);
          } catch {
            return truncateString(u, 80);
          }
        })
        .filter(Boolean),
      10
    ),
    globals: {
      __NEXT_DATA__: Boolean(window.__NEXT_DATA__),
      __NUXT__: Boolean(window.__NUXT__),
      __APOLLO_STATE__: Boolean(window.__APOLLO_STATE__),
      __REACT_DEVTOOLS_GLOBAL_HOOK__: Boolean(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)
    }
  };
  return hints;
}
