(function () {
  "use strict";

  const selector = "iframe[data-oga-autoheight]";

  function requestResizeForAllFrames() {
    const frames = [...document.querySelectorAll(selector)];
    frames.forEach((frame) => {
      try {
        // Ask the iframe to report its current height.
        // This avoids race conditions when this script is loaded with `async`.
        frame.contentWindow?.postMessage({ type: "oga:request-resize" }, "*");
      } catch (_error) {
        /* ignore */
      }
    });
  }

  function matchingFrame(event) {
    return [...document.querySelectorAll(selector)].find((frame) => {
      if (event.source !== frame.contentWindow) return false;
      try {
        return event.origin === new URL(frame.src, document.baseURI).origin;
      } catch (_error) {
        return false;
      }
    });
  }

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.type !== "oga:resize") return;
    const frame = matchingFrame(event);
    if (!frame) return;
    const height = Math.max(560, Math.min(3200, Math.ceil(Number(event.data.height) || 0)));
    if (height) frame.style.height = `${height}px`;
  });

  // Initial requests: immediately and shortly after.
  requestResizeForAllFrames();
  window.setTimeout(requestResizeForAllFrames, 500);
})();
