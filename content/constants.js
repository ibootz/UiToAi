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

const SUI_ROOT_ID = "__sui2_root";
const SUI_HL_ID = "__sui2_highlight";
const SUI_HUD_ID = "__sui2_hud";

let pickerActive = false;
let lastHoverEl = null;

function isInOwnUi(el) {
  if (!(el instanceof Element)) return false;
  return Boolean(el.closest(`#${SUI_ROOT_ID}`));
}
