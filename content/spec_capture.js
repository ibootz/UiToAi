function captureSnapshot(settings) {
  const s = normalizeRunSettings(settings);
  const now = new Date().toISOString();
  const host = location.host;
  const url = location.href;
  const title = document.title;

  const spec = createEmptySpec({ host, url, title, capturedAt: now });

  spec.designTokens = extractDesignTokensSample(s);
  spec.layoutRules.breakpoints = extractBreakpoints(s);
  const layoutMore = extractLayoutContainersAndGridHints(s);
  spec.layoutRules.containers = layoutMore.containers;
  spec.layoutRules.gridHints = layoutMore.gridHints;
  spec.a11ySpec.headingOutlineStats = extractHeadingStats();
  spec.a11ySpec.ariaUsageStats = extractAriaStats();
  spec.engineeringFingerprint.frameworkHints = extractFrameworkHints();
  spec.engineeringFingerprint.cssArchitectureHints = extractCssArchitectureHints(s);
  spec.engineeringFingerprint.extra = extractEngineeringFingerprintExtra();
  spec.motionSpec = extractMotionSpec(s);

  try {
    const catalog = extractComponentCatalog(s);
    spec.componentCatalog.components = catalog.components || [];
    spec.componentCatalog.componentsSources = catalog.sources || spec.componentCatalog.componentsSources;
  } catch {}

  try {
    const state = extractStateRules(s);
    spec.componentCatalog.stateRules = state.list || [];
    spec.componentCatalog.stateRulesSources = state.sources || spec.componentCatalog.stateRulesSources;
    spec.componentCatalog.stateRulesStats = state.stats || spec.componentCatalog.stateRulesStats;
  } catch {}

  const focus = extractFocusRingRules(s);
  spec.a11ySpec.focusRingRules = focus.list;
  spec.a11ySpec.focusRingRulesSources = focus.sources;
  spec.a11ySpec.focusRingRulesStats =
    focus.stats ||
    {
      matchedRulesCount: 0,
      listCount: Array.isArray(focus.list) ? focus.list.length : 0,
      pseudoOccurrences: { focus: 0, focusVisible: 0, focusWithin: 0 },
      selectorOccurrencesTotal: 0
    };

  return spec;
}
