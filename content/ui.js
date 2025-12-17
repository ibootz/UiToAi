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
