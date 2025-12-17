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
   hud.textContent = `${tag}${id}${cls}  ${Math.round(rect.width)}×${Math.round(rect.height)}  (Click to capture, Esc to cancel)`;
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
