// ============================================================
// UiToAi - Service Worker (Entry)
// 说明：按职责拆分为多个模块，保持每个文件 < 500 行。
// ============================================================

import { MSG } from "./messages.js";
import {
  addRunSample,
  createProject,
  deleteProject,
  deleteRun,
  getProject,
  getProjectByHost,
  getRun,
  listProjects,
  listRunsByProject,
  startRun,
  stopRun,
  updateRunSpec
} from "./db.js";

import { exportRunToFiles } from "./exporter.js";
import { showExportSuccess, showExportError, setupNotificationHandlers } from "./notifications.js";

function truncateString(s, maxLen) {
  const str = String(s ?? "");
  if (!maxLen || str.length <= maxLen) return str;
  return str.slice(0, Math.max(0, maxLen - 3)) + "...";
}

function stripTextFromHtml(html, maxLen) {
  const src = truncateString(html, maxLen);
  try {
    return src.replace(/>([^<]{1,2000})</g, "><");
  } catch {
    return src;
  }
}

function deepTruncate(value, maxLen, budget) {
  const b = budget && typeof budget === "object" ? budget : { remaining: 8000 };
  if (b.remaining <= 0) return null;
  b.remaining--;

  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") {
    return t === "string" ? truncateString(value, maxLen) : value;
  }

  if (Array.isArray(value)) {
    const out = [];
    for (let i = 0; i < value.length; i++) {
      if (b.remaining <= 0) break;
      out.push(deepTruncate(value[i], maxLen, b));
    }
    return out;
  }

  if (t === "object") {
    const out = {};
    const entries = Object.entries(value);
    for (let i = 0; i < entries.length; i++) {
      if (b.remaining <= 0) break;
      const [k, v] = entries[i];
      out[k] = deepTruncate(v, maxLen, b);
    }
    return out;
  }

  return null;
}

function sanitizeAndTruncateSample(sample, settings) {
  const s = settings && typeof settings === "object" ? settings : {};
  const truncateLength = Number.isFinite(s.truncateLength) ? s.truncateLength : 2000;
  const sanitize = Boolean(s.sanitize);

  const cloned = deepTruncate(sample, truncateLength, { remaining: 12000 }) || {};

  if (sanitize) {
    if (cloned?.selection && typeof cloned.selection === "object") {
      cloned.selection.textPreview = "";
    }

    if (cloned?.snippets && typeof cloned.snippets === "object") {
      if (typeof cloned.snippets.outerHTML === "string") {
        cloned.snippets.outerHTML = stripTextFromHtml(cloned.snippets.outerHTML, Math.min(12000, truncateLength));
      }
      if (typeof cloned.snippets.tailwindGuessOuterHTML === "string") {
        cloned.snippets.tailwindGuessOuterHTML = stripTextFromHtml(cloned.snippets.tailwindGuessOuterHTML, Math.min(12000, truncateLength));
      }

      const bundle = cloned.snippets.bundle;
      if (bundle && typeof bundle === "object" && Array.isArray(bundle.files)) {
        for (const f of bundle.files) {
          if (!f || typeof f !== "object") continue;
          const mime = String(f.mime || "").toLowerCase();
          if (mime.includes("text/html") && typeof f.content === "string") {
            f.content = stripTextFromHtml(f.content, Math.min(12000, truncateLength));
          }
        }
      }
    }
  }

  return cloned;
}

// ---------------------- 初始化 ----------------------
// 设置通知处理器
setupNotificationHandlers();

// ---------------------- 消息处理 ----------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (!message || typeof message.type !== "string") {
      sendResponse({ ok: false, error: "invalid_message" });
      return;
    }

    const { type } = message;

    // === Project ===
    if (type === MSG.PROJECT_LIST) {
      const list = await listProjects();
      sendResponse({ ok: true, list });
      return;
    }

    if (type === MSG.PROJECT_CREATE) {
      const { host, notes } = message;
      if (!host) {
        sendResponse({ ok: false, error: "host_required" });
        return;
      }
      // 检查是否已存在
      const existing = await getProjectByHost(host);
      if (existing) {
        sendResponse({ ok: true, project: existing, existed: true });
        return;
      }
      const project = await createProject(host, notes || "");
      sendResponse({ ok: true, project, existed: false });
      return;
    }

    if (type === MSG.PROJECT_DELETE) {
      const { id } = message;
      if (!id) {
        sendResponse({ ok: false, error: "id_required" });
        return;
      }
      await deleteProject(id);
      sendResponse({ ok: true });
      return;
    }

    // === Run ===
    if (type === MSG.RUN_LIST) {
      const { projectId } = message;
      if (!projectId) {
        sendResponse({ ok: false, error: "projectId_required" });
        return;
      }
      const list = await listRunsByProject(projectId);
      sendResponse({ ok: true, list });
      return;
    }

    if (type === MSG.RUN_GET) {
      const { id } = message;
      if (!id) {
        sendResponse({ ok: false, error: "id_required" });
        return;
      }
      const run = await getRun(id);
      sendResponse({ ok: true, run });
      return;
    }

    if (type === MSG.RUN_START) {
      const { projectId, url, title, settings } = message;
      if (!projectId || !url) {
        sendResponse({ ok: false, error: "projectId_and_url_required" });
        return;
      }
      const run = await startRun(projectId, url, title || "", settings);
      sendResponse({ ok: true, run });
      return;
    }

    if (type === MSG.RUN_STOP) {
      const { id } = message;
      if (!id) {
        sendResponse({ ok: false, error: "id_required" });
        return;
      }
      const run = await stopRun(id);
      sendResponse({ ok: true, run });
      return;
    }

    if (type === MSG.RUN_UPDATE_SPEC) {
      const { id, spec } = message;
      if (!id || !spec) {
        sendResponse({ ok: false, error: "id_and_spec_required" });
        return;
      }
      const run = await updateRunSpec(id, spec);
      sendResponse({ ok: true, run });
      return;
    }

    if (type === MSG.RUN_ADD_SAMPLE) {
      const { id, sample } = message;
      if (!id || !sample) {
        sendResponse({ ok: false, error: "id_and_sample_required" });
        return;
      }
      const run = await addRunSample(id, sample);
      sendResponse({ ok: true, run });
      return;
    }

    if (type === MSG.RUN_DELETE) {
      const { id } = message;
      if (!id) {
        sendResponse({ ok: false, error: "id_required" });
        return;
      }
      await deleteRun(id);
      sendResponse({ ok: true });
      return;
    }

    // === Export（T1.5 多文件导出） ===
    if (type === MSG.EXPORT_RUN) {
      const { id } = message;
      if (!id) {
        sendResponse({ ok: false, error: "id_required" });
        return;
      }
      const run = await getRun(id);
      if (!run) {
        sendResponse({ ok: false, error: "run_not_found" });
        return;
      }
      const project = await getProject(run.projectId);
      const result = await exportRunToFiles(run, project);

      // 显示导出结果通知
      if (result.ok) {
        await showExportSuccess(result);
        console.log(`[UiToAi SW] 导出成功: ${result.folder} (${result.filesCount} 个文件, ${result.duration}ms)`);
      } else {
        await showExportError(result);
        console.error(`[UiToAi SW] 导出失败: ${result.error}`);
      }

      sendResponse(result);
      return;
    }

    // === Error Reporting ===
    if (type === MSG.ERROR_REPORT) {
      console.error('[UiToAi SW] 收到错误报告:', message.error);
      // 这里可以添加错误日志存储或发送到分析服务
      sendResponse({ ok: true });
      return;
    }

    // === Legacy compatibility: SUI_CAPTURE_ADD ===
    if (type === MSG.CAPTURE_ADD) {
      try {
        console.log('[UiToAi SW] 收到 CAPTURE_ADD 消息:', message);

        // 获取当前 active tab 来确定 project
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url) {
          sendResponse({ ok: false, error: "no_active_tab" });
          return;
        }

        const url = new URL(tab.url);
        const host = url.host;

        // 获取或创建 project
        let project = await getProjectByHost(host);
        if (!project) {
          project = await createProject(host, "Auto-created");
        }

        // 获取当前运行中的 run，如果没有则创建一个
        const runs = await listRunsByProject(project.id);
        let currentRun = runs.find((run) => !run.endedAt);

        if (!currentRun) {
          currentRun = await startRun(project.id, tab.url, tab.title || "", null);
        }

        // 添加样本到当前 run
        const sample = {
          id: message.payload?.id || crypto.randomUUID(),
          capturedAt: new Date().toISOString(),
          page: message.payload?.page || {},
          selection: message.payload?.selection || {},
          snippets: message.payload?.snippets || {}
        };

        const safeSample = sanitizeAndTruncateSample(sample, currentRun.settings);

        await addRunSample(currentRun.id, safeSample);

        console.log('[UiToAi SW] CAPTURE_ADD 处理成功');
        sendResponse({ ok: true, sampleId: safeSample.id });

      } catch (err) {
        console.error('[UiToAi SW] CAPTURE_ADD 处理失败:', err);
        sendResponse({ ok: false, error: err?.message || "capture_add_failed" });
      }
      return;
    }

    // === 转发给 Content Script 的消息 ===
    if (type === MSG.UI_SHOW || type === MSG.PICK_ELEMENT || type === MSG.CAPTURE_SNAPSHOT) {
      // 这些消息由 popup 发起，需要转发到当前 tab 的 content script
      // popup 自己会直接 sendMessage 到 tab，这里不处理
      sendResponse({ ok: false, error: "should_send_to_tab_directly" });
      return;
    }

    sendResponse({ ok: false, error: "unknown_type", type });
  })().catch((err) => {
    sendResponse({ ok: false, error: String(err?.message || err) });
  });

  return true;
});

// 导出常量供其他模块使用（如果后续改成 ES Module）
// export { MSG, createDefaultRunSettings, createEmptySpec, createEmptySamples };
