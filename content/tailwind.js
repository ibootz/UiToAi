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
