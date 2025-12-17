function classifyComponentType(el) {
  if (!(el instanceof Element)) return null;

  const tag = el.tagName.toLowerCase();
  const role = String(el.getAttribute("role") || "").toLowerCase();
  const typeAttr = tag === "input" ? String(el.getAttribute("type") || "text").toLowerCase() : "";

  if (role === "button") return "button";
  if (role === "link") return "link";
  if (role === "textbox") return "input";
  if (role === "searchbox") return "input";
  if (role === "combobox") return "select";
  if (role === "checkbox") return "checkbox";
  if (role === "radio") return "radio";
  if (role === "navigation") return "nav";
  if (role === "dialog" || role === "alertdialog") return "modal";
  if (role === "tablist") return "tabs";
  if (role === "tab") return "tab";
  if (role === "menu" || role === "menubar") return "menu";
  if (role === "menuitem" || role === "menuitemcheckbox" || role === "menuitemradio") return "menuitem";

  if (tag === "button") return "button";
  if (tag === "a") return "link";
  if (tag === "select") return "select";
  if (tag === "textarea") return "textarea";
  if (tag === "nav") return "nav";
  if (tag === "ul" || tag === "ol") return "list";
  if (tag === "table") return "table";
  if (tag === "dialog") return "modal";

  if (tag === "input") {
    if (["button", "submit", "reset", "image"].includes(typeAttr)) return "button";
    if (typeAttr === "checkbox") return "checkbox";
    if (typeAttr === "radio") return "radio";
    if (typeAttr === "range") return "range";
    return "input";
  }

  if (tag === "header") return "header";
  if (tag === "footer") return "footer";
  if (tag === "aside") return "aside";

  const cls = String(el.className || "").toLowerCase();
  if (/(^|\s)(modal|dialog|drawer|sheet)(\s|$)/.test(cls)) return "modal";
  if (/(^|\s)(navbar|topbar|header)(\s|$)/.test(cls)) return "nav";
  if (/(^|\s)(tabs|tablist)(\s|$)/.test(cls)) return "tabs";
  if (/(^|\s)(menu|dropdown)(\s|$)/.test(cls)) return "menu";

  return null;
}

function summarizeComponentComputedStyle(el, maxLen) {
  if (!(el instanceof Element)) return null;

  const keys = [
    "display",
    "position",
    "boxSizing",
    "width",
    "height",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "borderRadius",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderTopStyle",
    "borderRightStyle",
    "borderBottomStyle",
    "borderLeftStyle",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "outlineStyle",
    "outlineWidth",
    "outlineColor",
    "boxShadow",
    "opacity",
    "color",
    "backgroundColor",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "textDecorationLine",
    "cursor"
  ];

  try {
    const cs = getComputedStyle(el);
    const out = {};
    for (const k of keys) {
      const v = cs[k];
      if (v === undefined || v === null) continue;
      const vv = String(v).trim();
      if (!vv) continue;
      out[k] = truncateString(vv, Math.min(160, Math.max(60, Math.floor((maxLen || 800) / 5))));
    }
    return out;
  } catch {
    return null;
  }
}

function stripTextNodes(root, budgetNodes) {
  if (!(root instanceof Element)) return;
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let visited = 0;
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n && typeof n.nodeValue === "string") {
        n.nodeValue = "";
      }
      visited++;
      if (budgetNodes && visited >= budgetNodes) break;
    }
  } catch {}
}

function stripValueLikeAttributes(root, budgetNodes) {
  if (!(root instanceof Element)) return;
  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    let visited = 0;
    while (walker.nextNode()) {
      const el = walker.currentNode;
      if (el instanceof Element) {
        if (el.hasAttribute("value")) el.removeAttribute("value");
        if (el.hasAttribute("data-value")) el.removeAttribute("data-value");
        if (el.hasAttribute("aria-valuetext")) el.removeAttribute("aria-valuetext");
      }
      visited++;
      if (budgetNodes && visited >= budgetNodes) break;
    }
  } catch {}
}

function cloneAndSanitizeOuterHTML(el, settings) {
  const s = normalizeRunSettings(settings);
  if (!(el instanceof Element)) return "";

  const clone = el.cloneNode(true);
  if (!(clone instanceof Element)) return "";

  if (typeof sanitizeForExport === "function") {
    try {
      sanitizeForExport(clone);
    } catch {}
  }

  if (s.sanitize) {
    stripTextNodes(clone, 1500);
    stripValueLikeAttributes(clone, 1500);
  }

  const html = clone.outerHTML || "";
  const limit = Math.min(8000, Math.max(1200, s.truncateLength || 2000));
  return truncateString(html, limit);
}

function buildBbox(el) {
  if (!(el instanceof Element)) return null;
  try {
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      width: Math.round(r.width),
      height: Math.round(r.height)
    };
  } catch {
    return null;
  }
}

function extractComponentCatalog(settings) {
  const s = normalizeRunSettings(settings);
  const byType = new Map();

  const totalLimit = Math.max(10, Math.min(120, s.maxElements));
  const perTypeLimit = Math.max(3, Math.min(8, Math.floor(totalLimit / 10) + 3));

  const sampleEls = sampleVisibleElements(Math.min(1200, Math.max(200, s.maxElements * 20)));
  let totalAdded = 0;

  for (const el of sampleEls) {
    if (totalAdded >= totalLimit) break;
    const type = classifyComponentType(el);
    if (!type) continue;

    const list = byType.get(type) || [];
    if (list.length >= perTypeLimit) continue;

    const selector = typeof computeCssSelector === "function" ? computeCssSelector(el) : "";
    const tagName = el.tagName.toLowerCase();
    const bbox = buildBbox(el);
    const outerHTML = cloneAndSanitizeOuterHTML(el, s);
    const textPreview = s.sanitize ? "" : (typeof safeTextPreview === "function" ? safeTextPreview(el) : "");
    const computedStyleSummary = summarizeComponentComputedStyle(el, Math.min(1600, s.truncateLength));

    list.push({ selector, tagName, bbox, outerHTML, textPreview, computedStyleSummary });
    byType.set(type, list);
    totalAdded++;
  }

  const typeOrder = [
    "button",
    "link",
    "input",
    "select",
    "textarea",
    "checkbox",
    "radio",
    "range",
    "tabs",
    "tab",
    "menu",
    "menuitem",
    "nav",
    "modal",
    "list",
    "table",
    "header",
    "footer",
    "aside"
  ];

  const components = Array.from(byType.entries())
    .sort((a, b) => {
      const ia = typeOrder.indexOf(a[0]);
      const ib = typeOrder.indexOf(b[0]);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    })
    .map(([type, samples]) => ({ type, samples, samplesCount: samples.length }));

  return {
    components,
    sources: {
      sampledElementsCount: sampleEls.length,
      totalSamples: totalAdded,
      perTypeLimit,
      totalLimit
    }
  };
}

function summarizeStateRuleDeclarations(style, truncateLength) {
  if (!style) return "";

  const keys = [
    "color",
    "background",
    "backgroundColor",
    "border",
    "borderColor",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "boxShadow",
    "outline",
    "outlineColor",
    "outlineOffset",
    "opacity",
    "transform",
    "filter",
    "textDecoration",
    "textDecorationLine",
    "textDecorationColor",
    "cursor",
    "transition",
    "transitionProperty",
    "transitionDuration",
    "transitionTimingFunction"
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

function classifyStateSelector(selectorText) {
  const out = {
    pseudos: [],
    occurrences: 0,
    occurrencesByPseudo: { hover: 0, active: 0, focus: 0, focusVisible: 0, disabled: 0 }
  };

  const sel = String(selectorText || "");
  if (!sel) return out;

  const re = /:(hover|active|focus-visible|focus|disabled)\b/g;
  const set = new Set();
  let m;
  while ((m = re.exec(sel))) {
    out.occurrences++;
    const p = m[1];
    if (p === "hover") out.occurrencesByPseudo.hover++;
    else if (p === "active") out.occurrencesByPseudo.active++;
    else if (p === "focus") out.occurrencesByPseudo.focus++;
    else if (p === "focus-visible") out.occurrencesByPseudo.focusVisible++;
    else if (p === "disabled") out.occurrencesByPseudo.disabled++;
    set.add(p);
  }

  const order = { "hover": 0, "active": 1, "focus-visible": 2, "focus": 3, "disabled": 4 };
  out.pseudos = Array.from(set).sort((a, b) => (order[a] ?? 99) - (order[b] ?? 99));

  return out;
}

function extractStateRules(settings) {
  const s = normalizeRunSettings(settings);
  const rulesOut = [];
  let blockedCount = 0;
  let scannedRulesCount = 0;
  let matchedRulesCount = 0;
  const pseudoOccurrences = { hover: 0, active: 0, focus: 0, focusVisible: 0, disabled: 0 };
  let selectorOccurrencesTotal = 0;

  const limit = Math.min(140, Math.max(30, Math.floor(s.maxRules / 2)));

  for (const sheet of document.styleSheets) {
    const rules = safeGetCssRules(sheet);
    if (rules === null) {
      blockedCount++;
      continue;
    }

    const budget = { remaining: s.maxRules };
    walkCssRules(rules, budget, (rule) => {
      scannedRulesCount++;
      if (rulesOut.length >= limit) return;
      if (rule.type !== CSSRule.STYLE_RULE) return;
      const selector = String(rule.selectorText || "");
      if (!selector) return;

      const cls = classifyStateSelector(selector);
      if (cls.occurrences <= 0) return;

      const summary = summarizeStateRuleDeclarations(rule.style, Math.min(700, s.truncateLength));
      if (!summary) return;

      matchedRulesCount++;
      pseudoOccurrences.hover += cls.occurrencesByPseudo.hover;
      pseudoOccurrences.active += cls.occurrencesByPseudo.active;
      pseudoOccurrences.focus += cls.occurrencesByPseudo.focus;
      pseudoOccurrences.focusVisible += cls.occurrencesByPseudo.focusVisible;
      pseudoOccurrences.disabled += cls.occurrencesByPseudo.disabled;
      selectorOccurrencesTotal += cls.occurrences;

      rulesOut.push({
        selector: truncateString(selector, 220),
        pseudos: cls.pseudos,
        occurrences: cls.occurrences,
        declarationsSummary: summary
      });
    });

    if (rulesOut.length >= limit) break;
  }

  const map = new Map();
  for (const r of rulesOut) {
    const key = r.selector;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...r });
      continue;
    }

    const pseudos = new Set([...(prev.pseudos || []), ...(r.pseudos || [])]);
    const order = { "hover": 0, "active": 1, "focus-visible": 2, "focus": 3, "disabled": 4 };
    prev.pseudos = Array.from(pseudos).sort((a, b) => (order[a] ?? 99) - (order[b] ?? 99));
    prev.occurrences = Number(prev.occurrences || 0) + Number(r.occurrences || 0);
  }

  const deduped = [];
  for (const r of map.values()) {
    deduped.push(r);
    if (deduped.length >= limit) break;
  }

  return {
    list: deduped,
    sources: { scannedRulesCount, blockedCount },
    stats: {
      matchedRulesCount,
      listCount: deduped.length,
      pseudoOccurrences,
      selectorOccurrencesTotal
    }
  };
}
