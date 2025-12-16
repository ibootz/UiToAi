// ============================================================
// UiToAi - Content Script
// 全新插件：页面侧数据采集与交互
// ============================================================

// ---------------------- 消息类型（与 service_worker 保持一致） ----------------------
const MSG = {
  CAPTURE_SNAPSHOT: "SUI2_CAPTURE_SNAPSHOT",
  PICK_ELEMENT: "SUI2_PICK_ELEMENT",
  UI_SHOW: "SUI2_UI_SHOW",
  RUN_UPDATE_SPEC: "SUI2_RUN_UPDATE_SPEC",
  RUN_ADD_SAMPLE: "SUI2_RUN_ADD_SAMPLE"
};

function t(key, substitutions) {
  try {
    const msg = chrome?.i18n?.getMessage?.(key, substitutions);
    return msg || "";
  } catch {
    return "";
  }
}

// ---------------------- UI 常量 ----------------------
const SUI_ROOT_ID = "__sui2_root";
const SUI_HL_ID = "__sui2_highlight";
const SUI_HUD_ID = "__sui2_hud";

let pickerActive = false;
let lastHoverEl = null;

function isInOwnUi(el) {
  if (!(el instanceof Element)) return false;
  return Boolean(el.closest(`#${SUI_ROOT_ID}`));
}

function ensureUi() {
  if (document.getElementById(SUI_ROOT_ID)) return;

  const root = document.createElement("div");
  root.id = SUI_ROOT_ID;
  root.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:16px",
    "z-index:2147483647",
    "font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial",
    "color:#0f172a"
  ].join(";");

  const panel = document.createElement("div");
  panel.style.cssText = [
    "display:flex",
    "gap:8px",
    "align-items:center",
    "padding:10px",
    "border-radius:12px",
    "background:rgba(255,255,255,0.95)",
    "box-shadow:0 12px 30px rgba(0,0,0,0.20)",
    "border:1px solid rgba(15,23,42,0.12)"
  ].join(";");

  const title = document.createElement("div");
  title.textContent = t("hudTitle") || "UiToAi";
  title.style.cssText = "font-weight:700;font-size:12px;letter-spacing:0.02em;margin-right:6px";

  const pickBtn = document.createElement("button");
  pickBtn.type = "button";
  pickBtn.textContent = t("hudPick") || "Pick element";
  pickBtn.style.cssText = buttonCss();
  pickBtn.addEventListener("click", () => activatePicker());

  const pageBtn = document.createElement("button");
  pageBtn.type = "button";
  pageBtn.textContent = t("hudPage") || "Pick page";
  pageBtn.style.cssText = buttonCss();
  pageBtn.addEventListener("click", () => capturePage());

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = t("hudExit") || "Exit";
  closeBtn.style.cssText = buttonCss(true);
  closeBtn.addEventListener("click", () => {
    stopPicker();
    root.remove();
    const hl = document.getElementById(SUI_HL_ID);
    if (hl) hl.remove();
  });

  panel.appendChild(title);
  panel.appendChild(pickBtn);
  panel.appendChild(pageBtn);
  panel.appendChild(closeBtn);
  root.appendChild(panel);
  document.documentElement.appendChild(root);
}

function buttonCss(secondary = false) {
  const base = [
    "appearance:none",
    "border-radius:10px",
    "border:1px solid rgba(15,23,42,0.12)",
    "padding:8px 10px",
    "font-size:12px",
    "line-height:12px",
    "cursor:pointer",
    "user-select:none",
    "transition:transform 0.06s ease"
  ];
  if (secondary) {
    base.push("background:#f1f5f9");
    base.push("color:#0f172a");
  } else {
    base.push("background:#111827");
    base.push("color:white");
  }
  return base.join(";");
}

function ensureHighlight() {
  let hl = document.getElementById(SUI_HL_ID);
  if (hl) return hl;

  hl = document.createElement("div");
  hl.id = SUI_HL_ID;
  hl.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "width:0",
    "height:0",
    "border:2px solid rgba(99,102,241,0.95)",
    "background:rgba(99,102,241,0.10)",
    "box-shadow:0 0 0 1px rgba(255,255,255,0.60) inset",
    "z-index:2147483646",
    "pointer-events:none",
    "border-radius:6px"
  ].join(";");
  document.documentElement.appendChild(hl);
  return hl;
}

 function ensureHud() {
   let hud = document.getElementById(SUI_HUD_ID);
   if (hud) return hud;

   hud = document.createElement("div");
   hud.id = SUI_HUD_ID;
   hud.style.cssText = [
     "position:fixed",
     "left:16px",
     "bottom:16px",
     "z-index:2147483647",
     "padding:10px 12px",
     "border-radius:12px",
     "background:rgba(2,6,23,0.92)",
     "color:white",
     "font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial",
     "font-size:12px",
     "box-shadow:0 12px 30px rgba(0,0,0,0.20)",
     "max-width:45vw",
     "pointer-events:none",
     "white-space:nowrap",
     "overflow:hidden",
     "text-overflow:ellipsis"
   ].join(";");
   document.documentElement.appendChild(hud);
   return hud;
 }

function showToast(text) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = [
    "position:fixed",
    "left:50%",
    "top:16px",
    "transform:translateX(-50%)",
    "z-index:2147483647",
    "padding:10px 12px",
    "border-radius:12px",
    "background:rgba(2,6,23,0.90)",
    "color:white",
    "font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial",
    "font-size:12px",
    "box-shadow:0 12px 30px rgba(0,0,0,0.20)"
  ].join(";");
  document.documentElement.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function activatePicker() {
  ensureUi();
  if (pickerActive) return;

  pickerActive = true;
  ensureHighlight();
  showToast("Pick an element (Esc to cancel)");

  window.addEventListener("mousemove", onMove, true);
  window.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKeydown, true);
}

function stopPicker() {
  pickerActive = false;
  lastHoverEl = null;
  window.removeEventListener("mousemove", onMove, true);
  window.removeEventListener("click", onClick, true);
  window.removeEventListener("keydown", onKeydown, true);

  const hl = document.getElementById(SUI_HL_ID);
  if (hl) {
    hl.style.width = "0";
    hl.style.height = "0";
  }

   const hud = document.getElementById(SUI_HUD_ID);
   if (hud) hud.remove();
}

function onKeydown(e) {
  if (e.key === "Escape") {
    stopPicker();
    showToast("Cancelled");
  }

   if (e.key === "Enter" && pickerActive && lastHoverEl) {
     e.preventDefault();
     e.stopPropagation();
     const el = lastHoverEl;
     stopPicker();
     captureElement(el).catch((err) => {
       showToast(`Capture failed: ${String(err?.message || err)}`);
     });
   }
}

function onMove(e) {
  if (!pickerActive) return;

  const target = e.target;
  if (!(target instanceof Element)) return;
  if (isInOwnUi(target)) return;

  lastHoverEl = target;
  const rect = target.getBoundingClientRect();
  const hl = ensureHighlight();
  hl.style.left = `${Math.max(0, rect.left)}px`;
  hl.style.top = `${Math.max(0, rect.top)}px`;
  hl.style.width = `${Math.max(0, rect.width)}px`;
  hl.style.height = `${Math.max(0, rect.height)}px`;

   const hud = ensureHud();
   const tag = target.tagName.toLowerCase();
   const id = target.id ? `#${target.id}` : "";
   const cls = target.classList.length ? `.${Array.from(target.classList).slice(0, 2).join(".")}` : "";
   hud.textContent = `${tag}${id}${cls}  ${Math.round(rect.width)}×${Math.round(rect.height)}  (Click or Enter to capture, Esc to cancel)`;
}

function onClick(e) {
  if (!pickerActive) return;

  const target = e.target;
  if (!(target instanceof Element)) return;
  if (isInOwnUi(target)) return;

  e.preventDefault();
  e.stopPropagation();

  stopPicker();
  captureElement(target).catch((err) => {
    showToast(`Capture failed: ${String(err?.message || err)}`);
  });
}

function safeTextPreview(el) {
  const raw = (el.textContent || "").trim().replace(/\s+/g, " ");
  return raw.length > 80 ? `${raw.slice(0, 77)}...` : raw;
}

function cssSnapshot(el) {
  const cs = getComputedStyle(el);
  const keys = [
    "display",
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "zIndex",
    "flexDirection",
    "flexWrap",
    "justifyContent",
    "alignItems",
    "alignContent",
    "gap",
    "rowGap",
    "columnGap",
    "width",
    "minWidth",
    "maxWidth",
    "height",
    "minHeight",
    "maxHeight",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "borderRadius",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius",
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
    "backgroundImage",
    "backgroundSize",
    "backgroundPosition",
    "backgroundRepeat",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "textDecorationLine",
    "whiteSpace",
    "overflow",
    "overflowX",
    "overflowY"
  ];
  const out = {};
  for (const k of keys) out[k] = cs[k];
  return out;
}

function pxToTwStep(px) {
  if (!Number.isFinite(px)) return null;
  const map = [
    { px: 0, tw: "0" },
    { px: 2, tw: "0.5" },
    { px: 4, tw: "1" },
    { px: 6, tw: "1.5" },
    { px: 8, tw: "2" },
    { px: 10, tw: "2.5" },
    { px: 12, tw: "3" },
    { px: 14, tw: "3.5" },
    { px: 16, tw: "4" },
    { px: 20, tw: "5" },
    { px: 24, tw: "6" },
    { px: 32, tw: "8" },
    { px: 40, tw: "10" },
    { px: 48, tw: "12" },
    { px: 64, tw: "16" }
  ];
  let best = map[0];
  let bestDist = Infinity;
  for (const m of map) {
    const dist = Math.abs(m.px - px);
    if (dist < bestDist) {
      best = m;
      bestDist = dist;
    }
  }
  if (bestDist <= 2) return best.tw;
  return null;
}

function parsePx(v) {
  const n = Number.parseFloat(String(v).replace("px", ""));
  return Number.isFinite(n) ? n : null;
}

function isTransparentColor(v) {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return true;
  if (s === "transparent") return true;
  if (s === "rgba(0, 0, 0, 0)") return true;
  if (s === "rgba(0,0,0,0)") return true;
  return false;
}

function toTwArbitraryValue(raw) {
  return String(raw)
    .trim()
    .replace(/\s+/g, "_")
    .replace(/%/g, "%")
    .replace(/\//g, "\\/");
}

function pushArbitraryPx(classes, prefix, rawPx) {
  const px = parsePx(rawPx);
  if (px === null) return;
  const tw = pxToTwStep(px);
  if (tw) {
    classes.push(`${prefix}-${tw}`);
    return;
  }
  classes.push(`${prefix}-[${px}px]`);
}

function pushArbitrary(classes, twPrefix, rawValue) {
  if (!rawValue) return;
  classes.push(`${twPrefix}-[${toTwArbitraryValue(rawValue)}]`);
}

function pushTextColor(classes, rawColor) {
  if (!rawColor) return;
  classes.push(`text-[color:${toTwArbitraryValue(rawColor)}]`);
}

function pushTextSize(classes, rawSize) {
  if (!rawSize) return;
  classes.push(`text-[length:${toTwArbitraryValue(rawSize)}]`);
}

function pushBorderColor(classes, rawColor) {
  if (!rawColor) return;
  classes.push(`border-[color:${toTwArbitraryValue(rawColor)}]`);
}

function buildTailwindClasses(style) {
  const classes = [];

  if (style.display === "flex") classes.push("flex");
  if (style.display === "inline-flex") classes.push("inline-flex");
  if (style.display === "grid") classes.push("grid");
  if (style.display === "inline-grid") classes.push("inline-grid");

  if (style.justifyContent === "center") classes.push("justify-center");
  if (style.justifyContent === "space-between") classes.push("justify-between");
  if (style.justifyContent === "flex-start") classes.push("justify-start");
  if (style.justifyContent === "flex-end") classes.push("justify-end");
  if (style.justifyContent === "space-around") classes.push("justify-around");
  if (style.justifyContent === "space-evenly") classes.push("justify-evenly");

  if (style.alignItems === "center") classes.push("items-center");
  if (style.alignItems === "flex-start") classes.push("items-start");
  if (style.alignItems === "flex-end") classes.push("items-end");
  if (style.alignItems === "stretch") classes.push("items-stretch");

  if (style.flexDirection === "column") classes.push("flex-col");
  if (style.flexDirection === "column-reverse") classes.push("flex-col-reverse");
  if (style.flexDirection === "row-reverse") classes.push("flex-row-reverse");
  if (style.flexWrap === "wrap") classes.push("flex-wrap");
  if (style.flexWrap === "nowrap") classes.push("flex-nowrap");

  pushArbitraryPx(classes, "gap", style.gap);
  pushArbitraryPx(classes, "gap-x", style.columnGap);
  pushArbitraryPx(classes, "gap-y", style.rowGap);

  const pT = parsePx(style.paddingTop);
  const pR = parsePx(style.paddingRight);
  const pB = parsePx(style.paddingBottom);
  const pL = parsePx(style.paddingLeft);
  if (pT !== null && pR !== null && pB !== null && pL !== null && pT === pR && pT === pB && pT === pL) {
    pushArbitraryPx(classes, "p", `${pT}px`);
  } else {
    pushArbitraryPx(classes, "pt", style.paddingTop);
    pushArbitraryPx(classes, "pr", style.paddingRight);
    pushArbitraryPx(classes, "pb", style.paddingBottom);
    pushArbitraryPx(classes, "pl", style.paddingLeft);
  }

  const mT = parsePx(style.marginTop);
  const mR = parsePx(style.marginRight);
  const mB = parsePx(style.marginBottom);
  const mL = parsePx(style.marginLeft);
  if (mT !== null && mR !== null && mB !== null && mL !== null && mT === mR && mT === mB && mT === mL) {
    pushArbitraryPx(classes, "m", `${mT}px`);
  } else {
    pushArbitraryPx(classes, "mt", style.marginTop);
    pushArbitraryPx(classes, "mr", style.marginRight);
    pushArbitraryPx(classes, "mb", style.marginBottom);
    pushArbitraryPx(classes, "ml", style.marginLeft);
  }

  const rPx = parsePx(style.borderRadius);
  if (rPx !== null) {
    if (rPx >= 16) classes.push("rounded-2xl");
    else if (rPx >= 12) classes.push("rounded-xl");
    else if (rPx >= 8) classes.push("rounded-lg");
    else if (rPx >= 6) classes.push("rounded-md");
    else if (rPx >= 4) classes.push("rounded");
    else if (rPx > 0) classes.push(`rounded-[${rPx}px]`);
  }

  if (!isTransparentColor(style.color)) pushTextColor(classes, style.color);
  if (!isTransparentColor(style.backgroundColor)) pushArbitrary(classes, "bg", style.backgroundColor);

  if (style.opacity && style.opacity !== "1") pushArbitrary(classes, "opacity", style.opacity);

  if (style.textAlign === "center") classes.push("text-center");
  if (style.textAlign === "right") classes.push("text-right");
  if (style.textAlign === "left") classes.push("text-left");
  if (style.textAlign === "justify") classes.push("text-justify");

  if (style.fontSize) pushTextSize(classes, style.fontSize);
  if (style.lineHeight) pushArbitrary(classes, "leading", style.lineHeight);
  if (style.letterSpacing && style.letterSpacing !== "normal") pushArbitrary(classes, "tracking", style.letterSpacing);

  if (style.fontWeight) {
    const w = Number.parseInt(style.fontWeight, 10);
    if (Number.isFinite(w)) {
      if (w === 700) classes.push("font-bold");
      else if (w === 600) classes.push("font-semibold");
      else if (w === 500) classes.push("font-medium");
      else if (w === 400) classes.push("font-normal");
      else pushArbitrary(classes, "font", String(w));
    }
  }

  if (style.whiteSpace === "nowrap") classes.push("whitespace-nowrap");
  if (style.whiteSpace === "pre") classes.push("whitespace-pre");
  if (style.whiteSpace === "pre-wrap") classes.push("whitespace-pre-wrap");

  if (style.overflow === "hidden" || style.overflowX === "hidden" || style.overflowY === "hidden") classes.push("overflow-hidden");
  if (style.overflow === "auto" || style.overflowX === "auto" || style.overflowY === "auto") classes.push("overflow-auto");

  if (style.boxShadow && style.boxShadow !== "none") {
    const v = toTwArbitraryValue(style.boxShadow);
    classes.push(`shadow-[${v}]`);
  }

  const bt = parsePx(style.borderTopWidth);
  const br = parsePx(style.borderRightWidth);
  const bb = parsePx(style.borderBottomWidth);
  const bl = parsePx(style.borderLeftWidth);
  if ((bt && bt > 0) || (br && br > 0) || (bb && bb > 0) || (bl && bl > 0)) {
    classes.push("border");
    if (!isTransparentColor(style.borderTopColor)) pushBorderColor(classes, style.borderTopColor);
    if (style.borderTopStyle === "dashed") classes.push("border-dashed");
    if (style.borderTopStyle === "dotted") classes.push("border-dotted");
  }

  if (style.position === "relative") classes.push("relative");
  if (style.position === "absolute") classes.push("absolute");
  if (style.position === "fixed") classes.push("fixed");
  if (style.position === "sticky") classes.push("sticky");

  const wPx = parsePx(style.width);
  if (wPx !== null) pushArbitraryPx(classes, "w", style.width);
  else if (style.width && style.width !== "auto") pushArbitrary(classes, "w", style.width);

  const hPx = parsePx(style.height);
  if (hPx !== null) pushArbitraryPx(classes, "h", style.height);
  else if (style.height && style.height !== "auto") pushArbitrary(classes, "h", style.height);

  const minWPx = parsePx(style.minWidth);
  if (minWPx !== null) pushArbitraryPx(classes, "min-w", style.minWidth);
  const maxWPx = parsePx(style.maxWidth);
  if (maxWPx !== null) pushArbitraryPx(classes, "max-w", style.maxWidth);
  const minHPx = parsePx(style.minHeight);
  if (minHPx !== null) pushArbitraryPx(classes, "min-h", style.minHeight);
  const maxHPx = parsePx(style.maxHeight);
  if (maxHPx !== null) pushArbitraryPx(classes, "max-h", style.maxHeight);

  if (style.position === "absolute" || style.position === "fixed" || style.position === "sticky") {
    if (parsePx(style.top) !== null) pushArbitraryPx(classes, "top", style.top);
    if (parsePx(style.right) !== null) pushArbitraryPx(classes, "right", style.right);
    if (parsePx(style.bottom) !== null) pushArbitraryPx(classes, "bottom", style.bottom);
    if (parsePx(style.left) !== null) pushArbitraryPx(classes, "left", style.left);
  }
  if (style.zIndex && style.zIndex !== "auto") pushArbitrary(classes, "z", style.zIndex);

  return classes;
}

function extractGoogleFontLinks() {
  const urls = [];
  const links = document.querySelectorAll('link[rel="stylesheet"]');
  for (const l of links) {
    const href = l.getAttribute("href") || "";
    if (href.includes("fonts.googleapis.com")) urls.push(href);
  }
  return Array.from(new Set(urls));
}

function sanitizeForExport(root) {
  if (!(root instanceof Element)) return;

  root.querySelectorAll("script").forEach((n) => n.remove());

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let visited = 0;
  while (walker.currentNode) {
    const el = walker.currentNode;
    if (el instanceof Element) {
      if (el.tagName === "IFRAME") {
        const src = el.getAttribute("src") || "";
        const ph = document.createElement("div");
        ph.setAttribute("data-sui-iframe", "true");
        ph.style.cssText = "border:1px solid rgba(148,163,184,0.6);padding:8px;border-radius:8px;background:rgba(15,23,42,0.06);";
        ph.textContent = src ? `Embedded iframe omitted: ${src}` : "Embedded iframe omitted";
        el.replaceWith(ph);
      } else {
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          const value = String(attr.value || "");
          if (name.startsWith("on")) {
            el.removeAttribute(attr.name);
            continue;
          }
          if ((name === "href" || name === "src") && value.trim().toLowerCase().startsWith("javascript:")) {
            el.removeAttribute(attr.name);
          }
        }
      }
    }

    visited++;
    if (visited > 5000) break;
    if (!walker.nextNode()) break;
  }
}

function cloneWithTailwind(originalRoot) {
  const clonedRoot = originalRoot.cloneNode(true);
  if (!(clonedRoot instanceof Element)) return { clonedRoot, stats: { nodes: 0, truncated: false } };

  const srcWalker = document.createTreeWalker(originalRoot, NodeFilter.SHOW_ELEMENT);
  const dstWalker = document.createTreeWalker(clonedRoot, NodeFilter.SHOW_ELEMENT);

  let nodes = 0;
  let truncated = false;

  while (true) {
    const srcNode = srcWalker.currentNode;
    const dstNode = dstWalker.currentNode;

    if (srcNode instanceof Element && dstNode instanceof Element) {
      const style = cssSnapshot(srcNode);
      const tw = buildTailwindClasses(style);
      const prev = dstNode.getAttribute("class") || "";
      const combined = `${prev} ${tw.join(" ")}`.trim();
      if (combined) dstNode.setAttribute("class", combined);
      dstNode.removeAttribute("style");
      nodes++;
      if (nodes > 1800) {
        truncated = true;
        break;
      }
    }

    const a = srcWalker.nextNode();
    const b = dstWalker.nextNode();
    if (!a || !b) break;
  }

  sanitizeForExport(clonedRoot);

  return { clonedRoot, stats: { nodes, truncated } };
}

function computeCssSelector(el) {
  const parts = [];
  let cur = el;
  for (let i = 0; i < 5 && cur && cur.nodeType === Node.ELEMENT_NODE; i++) {
    const tag = cur.tagName.toLowerCase();
    if (cur.id) {
      parts.unshift(`${tag}#${CSS.escape(cur.id)}`);
      break;
    }

    const cls = Array.from(cur.classList).slice(0, 2).map((c) => `.${CSS.escape(c)}`).join("");
    const parent = cur.parentElement;
    if (!parent) {
      parts.unshift(tag + cls);
      break;
    }

    const siblings = Array.from(parent.children).filter((x) => x.tagName === cur.tagName);
    if (siblings.length > 1) {
      const idx = siblings.indexOf(cur) + 1;
      parts.unshift(`${tag}${cls}:nth-of-type(${idx})`);
    } else {
      parts.unshift(tag + cls);
    }

    cur = parent;
  }
  return parts.join(" > ");
}

async function captureElement(el) {
  const pageFonts = extractGoogleFontLinks();
  const { clonedRoot, stats } = cloneWithTailwind(el);
  const rootStyle = cssSnapshot(el);
  const rootTw = buildTailwindClasses(rootStyle);
  const clonedOuter = clonedRoot instanceof Element ? clonedRoot.outerHTML : el.outerHTML;

  const bundle = {
    schema: 1,
    producer: "UiToAi",
    createdAt: new Date().toISOString(),
    page: {
      url: location.href,
      title: document.title
    },
    selection: {
      selector: computeCssSelector(el),
      tagName: el.tagName.toLowerCase(),
      textPreview: safeTextPreview(el)
    },
    files: [
      { path: "snippet/original.html", mime: "text/html", content: el.outerHTML },
      { path: "snippet/tailwind.html", mime: "text/html", content: clonedOuter },
      {
        path: "preview/preview.html",
        mime: "text/html",
        content: `<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n  <script src=\"https://cdn.tailwindcss.com\"></script>\n  ${pageFonts.map((u) => `<link rel=\"stylesheet\" href=\"${u}\" />`).join("\n  ")}\n</head>\n<body class=\"p-6 bg-slate-950 text-slate-100\">\n${clonedOuter}\n</body>\n</html>`
      },
      {
        path: "react/Component.jsx",
        mime: "text/plain",
        content: `export default function CapturedComponent(){\n  return (\n    <div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(clonedOuter)} }} />\n  );\n}\n`
      }
    ],
    stats
  };

  const payload = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    page: {
      url: location.href,
      title: document.title
    },
    selection: {
      selector: computeCssSelector(el),
      tagName: el.tagName.toLowerCase(),
      textPreview: safeTextPreview(el)
    },
    snippets: {
      outerHTML: el.outerHTML,
      tailwindGuessOuterHTML: clonedOuter,
      tailwindGuessClasses: rootTw,
      computedStyle: rootStyle,
      googleFonts: pageFonts,
      bundle
    }
  };

  const res = await chrome.runtime.sendMessage({ type: "SUI_CAPTURE_ADD", payload });
  if (!res?.ok) throw new Error(res?.error || "store_failed");

  showToast(t("toastSaved") || "Saved to UiToAi popup");
}

async function capturePage() {
  const pageFonts = extractGoogleFontLinks();
  const payload = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    page: {
      url: location.href,
      title: document.title
    },
    selection: {
      selector: "document.documentElement",
      tagName: "html",
      textPreview: "(full page)"
    },
    snippets: {
      outerHTML: document.documentElement.outerHTML,
      tailwindGuessOuterHTML: document.documentElement.outerHTML,
      tailwindGuessClasses: [],
      computedStyle: null,
      googleFonts: pageFonts,
      bundle: {
        schema: 1,
        producer: "UiToAi",
        createdAt: new Date().toISOString(),
        page: {
          url: location.href,
          title: document.title
        },
        selection: {
          selector: "document.documentElement",
          tagName: "html",
          textPreview: "(full page)"
        },
        files: [
          { path: "page/page.html", mime: "text/html", content: document.documentElement.outerHTML },
          {
            path: "preview/preview.html",
            mime: "text/html",
            content: `<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n  <script src=\"https://cdn.tailwindcss.com\"></script>\n  ${pageFonts.map((u) => `<link rel=\"stylesheet\" href=\"${u}\" />`).join("\n  ")}\n</head>\n<body class=\"bg-white\">\n${document.documentElement.outerHTML}\n</body>\n</html>`
          }
        ]
      }
    }
  };

  const res = await chrome.runtime.sendMessage({ type: "SUI_CAPTURE_ADD", payload });
  if (!res?.ok) throw new Error(res?.error || "store_failed");

  showToast("Page captured");
}

// ---------------------- Spec 采集（T1.3 核心） ----------------------
function createEmptySpec(target) {
  return {
    version: 1,
    target: target || { host: "", url: "", title: "", capturedAt: "" },
    designTokens: {
      colors: { top: [], semanticHints: {}, sources: {} },
      typography: { fontFamiliesTop: [], scale: {}, letterSpacingHints: [] },
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
      animations: { namesTop: [], durationTop: [] },
      keyframes: { namesTop: [], extractedCount: 0, blockedCount: 0 },
      reducedMotionHints: {}
    },
    a11ySpec: {
      focusRingRules: [],
      ariaUsageStats: { roleTop: [], ariaAttrTop: [] },
      headingOutlineStats: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 }
    },
    engineeringFingerprint: {
      frameworkHints: { nextjs: false, react: false, vue: false, svelte: false, angular: false, unknown: true },
      cssArchitectureHints: { cssVariablesUsageScore: 0, utilityClassDensityScore: 0, styleTagCount: 0 }
    }
  };
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

function extractBreakpoints() {
  const candidates = new Set();
  let mediaRulesCount = 0;
  let blockedCount = 0;

  for (const sheet of document.styleSheets) {
    const rules = safeGetCssRules(sheet);
    if (rules === null) {
      blockedCount++;
      continue;
    }
    for (const rule of rules) {
      if (rule.type === CSSRule.MEDIA_RULE) {
        mediaRulesCount++;
        const text = rule.conditionText || rule.media?.mediaText || "";
        const matches = text.match(/\b(min|max)-width:\s*(\d+)(px|em|rem)?/gi) || [];
        for (const m of matches) {
          const numMatch = m.match(/(\d+)/);
          if (numMatch) candidates.add(Number(numMatch[1]));
        }
      }
    }
  }

  return {
    candidates: Array.from(candidates).sort((a, b) => a - b),
    sources: { mediaRulesCount, blockedCount }
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

function extractCssArchitectureHints() {
  let cssVariablesUsageScore = 0;
  let utilityClassDensityScore = 0;
  const styleTagCount = document.querySelectorAll("style").length;

  const rootStyle = getComputedStyle(document.documentElement);
  const bodyStyle = getComputedStyle(document.body);
  const varPattern = /^--/;
  for (let i = 0; i < rootStyle.length; i++) {
    if (varPattern.test(rootStyle[i])) cssVariablesUsageScore++;
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

  return { cssVariablesUsageScore, utilityClassDensityScore, styleTagCount };
}

function extractDesignTokensSample() {
  const colors = [];
  const fontFamilies = [];
  const fontSizes = [];
  const lineHeights = [];
  const spacings = [];
  const radii = [];
  const shadows = [];
  const zIndices = [];

  const sampleEls = document.querySelectorAll("*");
  const limit = Math.min(sampleEls.length, 200);

  for (let i = 0; i < limit; i++) {
    const el = sampleEls[i];
    if (isInOwnUi(el)) continue;
    try {
      const cs = getComputedStyle(el);
      if (cs.color && cs.color !== "rgba(0, 0, 0, 0)") colors.push(cs.color);
      if (cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)") colors.push(cs.backgroundColor);
      if (cs.fontFamily) fontFamilies.push(cs.fontFamily.split(",")[0].trim().replace(/['"]/g, ""));
      if (cs.fontSize) fontSizes.push(cs.fontSize);
      if (cs.lineHeight && cs.lineHeight !== "normal") lineHeights.push(cs.lineHeight);
      if (cs.paddingTop && cs.paddingTop !== "0px") spacings.push(cs.paddingTop);
      if (cs.marginTop && cs.marginTop !== "0px") spacings.push(cs.marginTop);
      if (cs.gap && cs.gap !== "normal" && cs.gap !== "0px") spacings.push(cs.gap);
      if (cs.borderRadius && cs.borderRadius !== "0px") radii.push(cs.borderRadius);
      if (cs.boxShadow && cs.boxShadow !== "none") shadows.push(cs.boxShadow);
      if (cs.zIndex && cs.zIndex !== "auto") zIndices.push(cs.zIndex);
    } catch {}
  }

  return {
    colors: { top: topN(colors, 15), semanticHints: {}, sources: {} },
    typography: { fontFamiliesTop: topN(fontFamilies, 10), scale: {}, letterSpacingHints: [] },
    spacing: { distribution: topN(spacings, 15), scaleHints: [] },
    radius: { distribution: topN(radii, 10), scaleHints: [] },
    shadow: { distribution: topN(shadows, 10), scaleHints: [] },
    zIndex: { distribution: topN(zIndices, 10), scaleHints: [] }
  };
}

function extractMotionSpec() {
  const durations = [];
  const easings = [];
  const animationNames = [];
  let extractedCount = 0;
  let blockedCount = 0;

  const sampleEls = document.querySelectorAll("*");
  const limit = Math.min(sampleEls.length, 200);
  for (let i = 0; i < limit; i++) {
    const el = sampleEls[i];
    if (isInOwnUi(el)) continue;
    try {
      const cs = getComputedStyle(el);
      if (cs.transitionDuration && cs.transitionDuration !== "0s") durations.push(cs.transitionDuration);
      if (cs.transitionTimingFunction) easings.push(cs.transitionTimingFunction);
      if (cs.animationName && cs.animationName !== "none") animationNames.push(cs.animationName);
      if (cs.animationDuration && cs.animationDuration !== "0s") durations.push(cs.animationDuration);
    } catch {}
  }

  const keyframeNames = new Set();
  for (const sheet of document.styleSheets) {
    const rules = safeGetCssRules(sheet);
    if (rules === null) {
      blockedCount++;
      continue;
    }
    for (const rule of rules) {
      if (rule.type === CSSRule.KEYFRAMES_RULE) {
        keyframeNames.add(rule.name);
        extractedCount++;
      }
    }
  }

  return {
    transitions: { durationTop: topN(durations, 10), easingTop: topN(easings, 10) },
    animations: { namesTop: topN(animationNames, 10), durationTop: [] },
    keyframes: { namesTop: Array.from(keyframeNames).slice(0, 20), extractedCount, blockedCount },
    reducedMotionHints: {}
  };
}

function captureSnapshot() {
  const now = new Date().toISOString();
  const host = location.host;
  const url = location.href;
  const title = document.title;

  const spec = createEmptySpec({ host, url, title, capturedAt: now });

  spec.designTokens = extractDesignTokensSample();
  spec.layoutRules.breakpoints = extractBreakpoints();
  spec.a11ySpec.headingOutlineStats = extractHeadingStats();
  spec.a11ySpec.ariaUsageStats = extractAriaStats();
  spec.engineeringFingerprint.frameworkHints = extractFrameworkHints();
  spec.engineeringFingerprint.cssArchitectureHints = extractCssArchitectureHints();
  spec.motionSpec = extractMotionSpec();

  return spec;
}

// ---------------------- 消息处理（v2） ----------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === MSG.UI_SHOW) {
    ensureUi();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === MSG.PICK_ELEMENT) {
    ensureUi();
    activatePicker();
    sendResponse({ ok: true });
    return;
  }

  if (message.type === MSG.CAPTURE_SNAPSHOT) {
    try {
      const spec = captureSnapshot();
      sendResponse({ ok: true, spec });
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
    return;
  }

  sendResponse({ ok: false, error: "unknown_type" });
});
