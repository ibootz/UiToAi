async function captureElement(el) {
  if (!el || !(el instanceof Element)) {
    throw new Error("Invalid element provided");
  }

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

  if (!res?.ok) {
    throw new Error(res?.error || "store_failed");
  }

  showToast(t("toastSaved") || "Saved to UiToAi popup");

  return {
    success: true,
    payload: payload
  };
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
