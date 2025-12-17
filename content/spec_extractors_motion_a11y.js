function extractMotionSpec(settings) {
  const s = normalizeRunSettings(settings);
  const transitionDurations = [];
  const transitionEasings = [];
  const animationNames = [];
  const animationDurations = [];
  const animationEasings = [];
  let extractedCount = 0;
  let blockedCount = 0;
  let reducedMotionMediaCount = 0;

  const sampleEls = sampleVisibleElements(Math.min(300, Math.max(80, s.maxElements * 4)));
  for (const el of sampleEls) {
    try {
      const cs = getComputedStyle(el);

      if (cs.transitionDuration && cs.transitionDuration !== "0s") {
        cs.transitionDuration.split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => transitionDurations.push(x));
      }
      if (cs.transitionTimingFunction) {
        cs.transitionTimingFunction.split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => transitionEasings.push(x));
      }

      if (cs.animationName && cs.animationName !== "none") {
        cs.animationName.split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => animationNames.push(x));
      }
      if (cs.animationDuration && cs.animationDuration !== "0s") {
        cs.animationDuration.split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => animationDurations.push(x));
      }
      if (cs.animationTimingFunction) {
        cs.animationTimingFunction.split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => animationEasings.push(x));
      }
    } catch {}
  }

  const keyframeNames = new Set();
  const keyframesSamples = [];
  for (const sheet of document.styleSheets) {
    const rules = safeGetCssRules(sheet);
    if (rules === null) {
      blockedCount++;
      continue;
    }
    const budget = { remaining: s.maxRules };
    walkCssRules(rules, budget, (rule) => {
      if (rule.type === CSSRule.MEDIA_RULE) {
        const text = rule.conditionText || rule.media?.mediaText || "";
        if (String(text).includes("prefers-reduced-motion")) reducedMotionMediaCount++;
      }
      if (rule.type === CSSRule.KEYFRAMES_RULE) {
        if (rule.name) keyframeNames.add(rule.name);
        extractedCount++;
        if (keyframesSamples.length < 5) {
          keyframesSamples.push({
            name: rule.name || "(anonymous)",
            text: truncateString(rule.cssText || "", Math.min(1200, s.truncateLength))
          });
        }
      }
    });
  }

  return {
    transitions: { durationTop: topN(transitionDurations, 10), easingTop: topN(transitionEasings, 10) },
    animations: { namesTop: topN(animationNames, 10), durationTop: topN(animationDurations, 10), easingTop: topN(animationEasings, 10) },
    keyframes: {
      namesTop: Array.from(keyframeNames).slice(0, 20),
      extractedCount,
      blockedCount,
      samples: keyframesSamples
    },
    reducedMotionHints: { mediaRulesCount: reducedMotionMediaCount }
  };
}

function summarizeFocusRuleDeclarations(style, truncateLength) {
  if (!style) return "";
  const keys = [
    "outline",
    "outlineStyle",
    "outlineWidth",
    "outlineColor",
    "boxShadow",
    "border",
    "borderColor",
    "borderWidth",
    "borderStyle",
    "borderRadius"
  ];
  const parts = [];
  for (const k of keys) {
    try {
      const v = style.getPropertyValue ? style.getPropertyValue(k) : style[k];
      if (!v) continue;
      const vv = String(v).trim();
      if (!vv) continue;
      parts.push(`${k}:${vv}`);
    } catch {}
  }
  return truncateString(parts.join("; "), truncateLength);
}

function extractFocusRingRules(settings) {
  const s = normalizeRunSettings(settings);
  const rulesOut = [];
  let blockedCount = 0;
  let scannedRulesCount = 0;

  for (const sheet of document.styleSheets) {
    const rules = safeGetCssRules(sheet);
    if (rules === null) {
      blockedCount++;
      continue;
    }
    const budget = { remaining: s.maxRules };
    walkCssRules(rules, budget, (rule) => {
      scannedRulesCount++;
      if (rulesOut.length >= Math.min(100, s.maxRules)) return;
      if (rule.type !== CSSRule.STYLE_RULE) return;
      const selector = String(rule.selectorText || "");
      if (!selector) return;
      if (!selector.includes(":focus")) return;
      const summary = summarizeFocusRuleDeclarations(rule.style, Math.min(600, s.truncateLength));
      if (!summary) return;
      rulesOut.push({ selector: truncateString(selector, 200), declarationsSummary: summary });
    });
  }

  const seen = new Set();
  const deduped = [];
  for (const r of rulesOut) {
    const key = r.selector;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
    if (deduped.length >= 60) break;
  }

  return { list: deduped, sources: { scannedRulesCount, blockedCount } };
}
