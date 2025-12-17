function extractGoogleFontLinks() {
  const urls = [];
  const links = document.querySelectorAll('link[rel="stylesheet"]');
  for (const l of links) {
    const href = l.getAttribute("href") || "";
    if (href.includes("fonts.googleapis.com")) urls.push(href);
  }
  return Array.from(new Set(urls));
}

function sanitizeForExport(root) {
  if (!(root instanceof Element)) return;

  root.querySelectorAll("script").forEach((n) => n.remove());

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let visited = 0;
  while (walker.currentNode) {
    const el = walker.currentNode;
    if (el instanceof Element) {
      if (el.tagName === "IFRAME") {
        const src = el.getAttribute("src") || "";
        const ph = document.createElement("div");
        ph.setAttribute("data-sui-iframe", "true");
        ph.style.cssText = "border:1px solid rgba(148,163,184,0.6);padding:8px;border-radius:8px;background:rgba(15,23,42,0.06);";
        ph.textContent = src ? `Embedded iframe omitted: ${src}` : "Embedded iframe omitted";
        el.replaceWith(ph);
      } else {
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          const value = String(attr.value || "");
          if (name.startsWith("on")) {
            el.removeAttribute(attr.name);
            continue;
          }
          if ((name === "href" || name === "src") && value.trim().toLowerCase().startsWith("javascript:")) {
            el.removeAttribute(attr.name);
          }
        }
      }
    }

    visited++;
    if (visited > 5000) break;
    if (!walker.nextNode()) break;
  }
}

function cloneWithTailwind(originalRoot) {
  const clonedRoot = originalRoot.cloneNode(true);
  if (!(clonedRoot instanceof Element)) return { clonedRoot, stats: { nodes: 0, truncated: false } };

  const srcWalker = document.createTreeWalker(originalRoot, NodeFilter.SHOW_ELEMENT);
  const dstWalker = document.createTreeWalker(clonedRoot, NodeFilter.SHOW_ELEMENT);

  let nodes = 0;
  let truncated = false;

  while (true) {
    const srcNode = srcWalker.currentNode;
    const dstNode = dstWalker.currentNode;

    if (srcNode instanceof Element && dstNode instanceof Element) {
      const style = cssSnapshot(srcNode);
      const tw = buildTailwindClasses(style);
      const prev = dstNode.getAttribute("class") || "";
      const combined = `${prev} ${tw.join(" ")}`.trim();
      if (combined) dstNode.setAttribute("class", combined);
      dstNode.removeAttribute("style");
      nodes++;
      if (nodes > 1800) {
        truncated = true;
        break;
      }
    }

    const a = srcWalker.nextNode();
    const b = dstWalker.nextNode();
    if (!a || !b) break;
  }

  sanitizeForExport(clonedRoot);

  return { clonedRoot, stats: { nodes, truncated } };
}

function computeCssSelector(el) {
  const parts = [];
  let cur = el;
  for (let i = 0; i < 5 && cur && cur.nodeType === Node.ELEMENT_NODE; i++) {
    const tag = cur.tagName.toLowerCase();
    if (cur.id) {
      parts.unshift(`${tag}#${CSS.escape(cur.id)}`);
      break;
    }

    const cls = Array.from(cur.classList).slice(0, 2).map((c) => `.${CSS.escape(c)}`).join("");
    const parent = cur.parentElement;
    if (!parent) {
      parts.unshift(tag + cls);
      break;
    }

    const siblings = Array.from(parent.children).filter((x) => x.tagName === cur.tagName);
    if (siblings.length > 1) {
      const idx = siblings.indexOf(cur) + 1;
      parts.unshift(`${tag}${cls}:nth-of-type(${idx})`);
    } else {
      parts.unshift(tag + cls);
    }

    cur = parent;
  }
  return parts.join(" > ");
}

function safeTextPreview(el) {
  const raw = (el.textContent || "").trim().replace(/\s+/g, " ");
  return raw.length > 80 ? `${raw.slice(0, 77)}...` : raw;
}
