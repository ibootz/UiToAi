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
      const spec = captureSnapshot(message.settings);
      sendResponse({ ok: true, spec });
    } catch (err) {
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
    return;
  }

  sendResponse({ ok: false, error: "unknown_type" });
});
