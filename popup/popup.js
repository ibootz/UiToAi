// ============================================================
// UiToAi - Popup
// Project/Run 视角管理
// ============================================================

// ---------------------- 消息类型 ----------------------
const MSG = {
  PROJECT_LIST: "SUI2_PROJECT_LIST",
  PROJECT_CREATE: "SUI2_PROJECT_CREATE",
  PROJECT_DELETE: "SUI2_PROJECT_DELETE",
  RUN_START: "SUI2_RUN_START",
  RUN_STOP: "SUI2_RUN_STOP",
  RUN_GET: "SUI2_RUN_GET",
  RUN_LIST: "SUI2_RUN_LIST",
  RUN_DELETE: "SUI2_RUN_DELETE",
  RUN_UPDATE_SPEC: "SUI2_RUN_UPDATE_SPEC",
  RUN_ADD_SAMPLE: "SUI2_RUN_ADD_SAMPLE",
  EXPORT_RUN: "SUI2_EXPORT_RUN",
  CAPTURE_SNAPSHOT: "SUI2_CAPTURE_SNAPSHOT",
  PICK_ELEMENT: "SUI2_PICK_ELEMENT",
  UI_SHOW: "SUI2_UI_SHOW"
};

// ---------------------- 状态 ----------------------
let currentProject = null;
let currentRun = null;

// ---------------------- 工具函数 ----------------------
function $(id) {
  return document.getElementById(id);
}

function t(key, substitutions) {
  try {
    const msg = chrome?.i18n?.getMessage?.(key, substitutions);
    return msg || "";
  } catch {
    return "";
  }
}

function applyI18nToDom() {
  const nodes = document.querySelectorAll("[data-i18n]");
  for (const el of nodes) {
    const key = el.getAttribute("data-i18n");
    if (!key) continue;
    const msg = t(key);
    if (msg) el.textContent = msg;
  }

  const title = t("actionTitle");
  if (title) document.title = title;

  const rootLang = (() => {
    try {
      return String(chrome.i18n.getUILanguage() || "");
    } catch {
      return "";
    }
  })();
  document.documentElement.lang = rootLang.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

function formatTime(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  } catch {
    return iso;
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function getHostFromUrl(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

async function sendToTab(type, payload = {}) {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error("no_active_tab");

  try {
    return await chrome.tabs.sendMessage(tab.id, { type, ...payload });
  } catch (err) {
    throw new Error(t("errContentScriptMissing") || "Content script not available on this page.");
  }
}

function setStatus(text, type = "") {
  const el = $("status");
  el.textContent = text;
  el.className = "status" + (type ? ` ${type}` : "");
}

// ---------------------- UI 更新函数 ----------------------
function updateProjectInfo() {
  const el = $("project-info");
  if (currentProject) {
    el.textContent = currentProject.host;
  } else {
    el.textContent = t("projectNoProject") || "No project (open a webpage first)";
  }
}

function updateRunStatus() {
  const el = $("run-status");
  const btnStart = $("btn-start");
  const btnStop = $("btn-stop");
  const btnSnapshot = $("btn-snapshot");
  const btnPick = $("btn-pick");
  const btnExport = $("btn-export");

  if (currentRun && !currentRun.endedAt) {
    const started = formatTime(currentRun.startedAt);
    el.textContent = t("runActiveStarted", [started]) || `Active: started ${started}`;
    el.className = "run-status active";
    btnStart.disabled = true;
    btnStop.disabled = false;
    btnSnapshot.disabled = false;
    btnPick.disabled = false;
    btnExport.disabled = false;
  } else if (currentRun) {
    const s1 = formatTime(currentRun.startedAt);
    const s2 = formatTime(currentRun.endedAt);
    el.textContent = t("runCompleted", [s1, s2]) || `Completed: ${s1} - ${s2}`;
    el.className = "run-status";
    btnStart.disabled = false;
    btnStop.disabled = true;
    btnSnapshot.disabled = true;
    btnPick.disabled = true;
    btnExport.disabled = false;
  } else {
    el.textContent = t("runNoActive") || "No active run";
    el.className = "run-status";
    btnStart.disabled = !currentProject;
    btnStop.disabled = true;
    btnSnapshot.disabled = true;
    btnPick.disabled = true;
    btnExport.disabled = true;
  }
}

function updatePreview() {
  const el = $("preview");
  if (currentRun?.spec) {
    const summary = {
      target: currentRun.spec.target,
      designTokens: {
        colorsCount: currentRun.spec.designTokens?.colors?.top?.length || 0,
        fontFamiliesCount: currentRun.spec.designTokens?.typography?.fontFamiliesTop?.length || 0
      },
      layoutRules: {
        breakpointsCount: currentRun.spec.layoutRules?.breakpoints?.candidates?.length || 0
      },
      motionSpec: {
        transitionsCount: currentRun.spec.motionSpec?.transitions?.durationTop?.length || 0,
        keyframesCount: currentRun.spec.motionSpec?.keyframes?.namesTop?.length || 0
      },
      a11ySpec: currentRun.spec.a11ySpec?.headingOutlineStats || {},
      engineeringFingerprint: currentRun.spec.engineeringFingerprint || {},
      samplesCount: currentRun.samples?.elements?.length || 0
    };
    el.textContent = JSON.stringify(summary, null, 2);
  } else {
    el.textContent = t("previewEmpty") || "No spec data yet. Click 'Capture Snapshot' to extract.";
  }
}

// ---------------------- 核心操作 ----------------------
async function initProject() {
  const tab = await getActiveTab();
  if (!tab?.url) {
    setStatus(t("errCannotAccessTab") || "Cannot access current tab", "error");
    return;
  }

  const host = getHostFromUrl(tab.url);
  if (!host) {
    setStatus(t("errInvalidUrl") || "Invalid URL", "error");
    return;
  }

  const res = await chrome.runtime.sendMessage({ type: MSG.PROJECT_CREATE, host });
  if (!res?.ok) {
    setStatus(res?.error || t("errCreateProjectFailed") || "Failed to create project", "error");
    return;
  }

  currentProject = res.project;
  updateProjectInfo();

  // 检查是否有未结束的 run
  const runsRes = await chrome.runtime.sendMessage({ type: MSG.RUN_LIST, projectId: currentProject.id });
  if (runsRes?.ok && runsRes.list?.length > 0) {
    const activeRun = runsRes.list.find((r) => !r.endedAt);
    if (activeRun) {
      currentRun = activeRun;
    } else {
      currentRun = runsRes.list[0]; // 最近的 run
    }
  }

  updateRunStatus();
  updatePreview();
}

async function startRun() {
  if (!currentProject) {
    setStatus(t("errNoProject") || "No project", "error");
    return;
  }

  const tab = await getActiveTab();
  const res = await chrome.runtime.sendMessage({
    type: MSG.RUN_START,
    projectId: currentProject.id,
    url: tab?.url || "",
    title: tab?.title || "",
    settings: { sanitize: $("opt-sanitize").checked }
  });

  if (!res?.ok) {
    setStatus(res?.error || t("errStartRunFailed") || "Failed to start run", "error");
    return;
  }

  currentRun = res.run;
  updateRunStatus();
  updatePreview();
  setStatus(t("statusRunStarted") || "Run started", "success");
}

async function stopRun() {
  if (!currentRun) return;

  const res = await chrome.runtime.sendMessage({ type: MSG.RUN_STOP, id: currentRun.id });
  if (!res?.ok) {
    setStatus(res?.error || t("errStopRunFailed") || "Failed to stop run", "error");
    return;
  }

  currentRun = res.run;
  updateRunStatus();
  setStatus(t("statusRunStopped") || "Run stopped", "success");
}

async function captureSnapshot() {
  if (!currentRun || currentRun.endedAt) {
    setStatus(t("errNoActiveRun") || "No active run", "error");
    return;
  }

  setStatus(t("statusCapturing") || "Capturing...");

  try {
    const res = await sendToTab(MSG.CAPTURE_SNAPSHOT);
    if (!res?.ok) {
      setStatus(res?.error || t("errCaptureFailed") || "Capture failed", "error");
      return;
    }

    // 更新 run 的 spec
    const updateRes = await chrome.runtime.sendMessage({
      type: MSG.RUN_UPDATE_SPEC,
      id: currentRun.id,
      spec: res.spec
    });

    if (!updateRes?.ok) {
      setStatus(updateRes?.error || t("errSaveSpecFailed") || "Failed to save spec", "error");
      return;
    }

    currentRun = updateRes.run;
    updatePreview();
    setStatus(t("statusSnapshotCaptured") || "Snapshot captured", "success");
  } catch (err) {
    setStatus(String(err?.message || err), "error");
  }
}

async function pickElement() {
  if (!currentRun || currentRun.endedAt) {
    setStatus(t("errNoActiveRun") || "No active run", "error");
    return;
  }

  try {
    await sendToTab(MSG.PICK_ELEMENT);
    setStatus(t("statusPickModeActivated") || "Pick mode activated");
  } catch (err) {
    setStatus(String(err?.message || err), "error");
  }
}

// ---------------------- 导出（T1.5 多文件导出） ----------------------
async function exportForAI() {
  if (!currentRun) {
    setStatus(t("errNoRunToExport") || "No run to export", "error");
    return;
  }

  setStatus(t("statusExporting") || "Exporting files...");

  try {
    const res = await chrome.runtime.sendMessage({
      type: MSG.EXPORT_RUN,
      id: currentRun.id
    });

    if (!res?.ok) {
      setStatus(res?.error || t("errExportFailed") || "Export failed", "error");
      return;
    }

    const msg = t("statusExported", [String(res.filesCount), String(res.folder)]) ||
      `Exported ${res.filesCount} files to ${res.folder}`;
    setStatus(msg, "success");
  } catch (err) {
    setStatus(String(err?.message || err), "error");
  }
}

// ---------------------- 初始化 ----------------------
document.addEventListener("DOMContentLoaded", () => {
  applyI18nToDom();

  $("btn-start").addEventListener("click", startRun);
  $("btn-stop").addEventListener("click", stopRun);
  $("btn-snapshot").addEventListener("click", captureSnapshot);
  $("btn-pick").addEventListener("click", pickElement);
  $("btn-export").addEventListener("click", exportForAI);

  initProject().catch((e) => setStatus(String(e?.message || e), "error"));
});
