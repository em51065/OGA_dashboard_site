(function () {
  "use strict";

  const selector = "iframe[data-oga-autoheight]";

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
})();
