(function () {
  "use strict";

  const selector = "iframe[data-oga-autoheight]";
  const MAX_HEIGHT = 2400;
  const MIN_HEIGHT = 560;

  function frames() {
    return [...document.querySelectorAll(selector)];
  }

  function notifyHostHeight(height) {
    // Single message type to the direct parent only — avoids Wix growth loops.
    try {
      window.parent.postMessage({ type: "oga:resize", height }, "*");
    } catch (_error) {
      /* ignore */
    }
  }

  function applyHeight(frame, rawHeight) {
    const height = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.ceil(Number(rawHeight) || 0)));
    if (!height) return;
    const prev = Number.parseInt(frame.style.height, 10) || 0;
    if (prev && Math.abs(prev - height) < 3) return;
    frame.style.setProperty("height", `${height}px`, "important");
    frame.style.setProperty("min-height", `${height}px`, "important");
    frame.style.setProperty("max-height", `${MAX_HEIGHT}px`, "important");
    frame.style.setProperty("overflow", "hidden", "important");
    frame.setAttribute("scrolling", "no");
    const wrap = frame.parentElement;
    if (wrap && wrap !== document.body) {
      wrap.style.minHeight = `${height}px`;
      wrap.style.maxHeight = "";
      wrap.style.height = "auto";
      wrap.style.overflow = "visible";
    }
    notifyHostHeight(height);
  }

  function requestResizeForAllFrames() {
    frames().forEach((frame) => {
      try {
        frame.contentWindow?.postMessage({ type: "oga:request-resize" }, "*");
      } catch (_error) {
        /* ignore */
      }
    });
  }

  function matchingFrame(event) {
    return frames().find((frame) => {
      if (event.source !== frame.contentWindow) return false;
      try {
        return event.origin === new URL(frame.src, document.baseURI).origin;
      } catch (_error) {
        return false;
      }
    });
  }

  function bindFrameLoad(frame) {
    if (frame.dataset.ogaResizeBound === "1") return;
    frame.dataset.ogaResizeBound = "1";
    frame.addEventListener("load", () => {
      window.setTimeout(requestResizeForAllFrames, 50);
      window.setTimeout(requestResizeForAllFrames, 400);
      window.setTimeout(requestResizeForAllFrames, 1200);
      window.setTimeout(requestResizeForAllFrames, 2500);
    });
  }

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.type !== "oga:resize") return;
    const frame = matchingFrame(event);
    if (!frame) return;
    applyHeight(frame, event.data.height);
  });

  frames().forEach(bindFrameLoad);
  requestResizeForAllFrames();
  [100, 400, 1000, 2000, 4000, 7000].forEach((ms) => {
    window.setTimeout(requestResizeForAllFrames, ms);
  });
})();
