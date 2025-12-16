function t(key, substitutions) {
  try {
    const msg = chrome?.i18n?.getMessage?.(key, substitutions);
    return msg || "";
  } catch {
    return "";
  }
}

function getLang() {
  try {
    return String(chrome.i18n.getUILanguage() || "");
  } catch {
    return "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const lang = getLang();
  const isZh = lang.toLowerCase().startsWith("zh");

  // Title / header
  const title = t("optionsTitle") || (isZh ? "UiToAi - 使用说明" : "UiToAi - Usage");
  document.title = title;

  const sub = t("optionsSubtitle") || (isZh ? "使用说明" : "Usage Guide");
  const subtitleEl = document.getElementById("options-subtitle");
  if (subtitleEl) subtitleEl.textContent = sub;

  const troubleshootingEl = document.getElementById("options-troubleshooting");
  if (troubleshootingEl) troubleshootingEl.textContent = t("optionsTroubleshooting") || (isZh ? "排障" : "Troubleshooting");

  // Sections: show one language block
  const en = document.getElementById("section-en");
  const zh = document.getElementById("section-zh");
  if (en) en.style.display = isZh ? "none" : "block";
  if (zh) zh.style.display = isZh ? "block" : "none";

  const tsEn = document.getElementById("troubleshooting-en");
  const tsZh = document.getElementById("troubleshooting-zh");
  if (tsEn) tsEn.style.display = isZh ? "none" : "block";
  if (tsZh) tsZh.style.display = isZh ? "block" : "none";

  // Footer
  const footer = document.getElementById("options-footer");
  if (footer) footer.textContent = t("optionsFooter") || (isZh ? "UiToAi 本地运行，不上传云端。" : "UiToAi runs locally. No cloud sync.");

  document.documentElement.lang = isZh ? "zh-CN" : "en";
});
