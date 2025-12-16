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
      sendResponse(result);
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
