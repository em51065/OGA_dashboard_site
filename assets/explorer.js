"use strict";

const CHARTS = {
  ecoco: { title: "ECOCO" },
  "general-recycle": { title: "一般回收" },
  "resource-recycle": { title: "資源回收" },
  "food-waste-recycle": { title: "廚餘回收" },
  "rainwater-reuse": { title: "中軸雨水回收" },
  "water-use": { title: "用水量" },
  "electricity-use": { title: "用電量" },
  "solar-energy": { title: "太陽能" },
  "led-replacement": { title: "LED燈具汰換" },
  "streetlight-replacement": { title: "路燈汰換" },
};

const frame = document.getElementById("chartFrame");
const stage = document.getElementById("chartStage");
const loading = document.getElementById("loadingState");
const activeTitle = document.getElementById("activeChartTitle");
const mobileSelect = document.getElementById("mobileChartSelect");
const standaloneLink = document.getElementById("standaloneLink");
const sourceInfo = document.getElementById("sourceInfo");
const navDismiss = document.getElementById("navDismiss");

let currentChart = "ecoco";
let childResizeObserver = null;
let childMutationObserver = null;
let childDecorateTimer = null;
let childWindow = null;
let measureFrameId = null;
let lastFrameHeight = 0;
let lastOuterHeight = 0;

function parseInitialChart() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("chart");
  if (requested && CHARTS[requested]) currentChart = requested;
  if (params.get("embed") === "1") document.documentElement.classList.add("is-embedded");
}

function renderIcons() {
  if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
}

function updateUrl(mode = "replace") {
  const params = new URLSearchParams(window.location.search);
  params.set("chart", currentChart);
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  const method = mode === "push" ? "pushState" : "replaceState";
  window.history[method]({ chart: currentChart }, "", nextUrl);
}

function measurePortalHeight() {
  const portal = document.getElementById("ogaPortal") || document.body;
  const portalRect = portal.getBoundingClientRect();
  // Only measure #ogaPortal. Never use html/body scrollHeight: after the host
  // iframe grows, those values track the viewport and create an endless +pad loop.
  const HEIGHT_PAD = 8;
  return Math.max(
    560,
    Math.ceil(portal.scrollHeight || 0),
    Math.ceil(portal.offsetHeight || 0),
    Math.ceil(portalRect.height + Math.max(0, portalRect.top))
  ) + HEIGHT_PAD;
}

function reportOuterHeight() {
  if (window.parent === window) return;
  window.requestAnimationFrame(() => {
    const height = measurePortalHeight();
    if (Math.abs(height - lastOuterHeight) < 3) return;
    lastOuterHeight = height;
    const payloads = [
      { type: "oga:resize", height },
      { type: "resize", height },
      { type: "setHeight", height },
    ];
    const targets = [window.parent];
    try {
      if (window.parent !== window.top) targets.push(window.top);
    } catch (_error) {
      /* ignore */
    }
    targets.forEach((target) => {
      payloads.forEach((payload) => {
        try {
          target.postMessage(payload, "*");
        } catch (_error) {
          /* ignore */
        }
      });
    });
  });
}

// Parent pages may load `oga-embed.js` with `async`, potentially missing the first
// `oga:resize` message. Support a request/response handshake to re-measure.
window.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "oga:request-resize") return;
  scheduleFrameMeasure();
  reportOuterHeight();
  window.setTimeout(reportOuterHeight, 120);
  window.setTimeout(reportOuterHeight, 600);
});

function scheduleFrameMeasure() {
  if (measureFrameId !== null) window.cancelAnimationFrame(measureFrameId);
  measureFrameId = window.requestAnimationFrame(() => {
    measureFrameId = null;
    measureChild();
  });
}

function measureChild() {
  try {
    const doc = frame.contentDocument;
    if (!doc) return;
    const root = doc.getElementById("gaWidget") || doc.body?.firstElementChild || doc.body;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    // Measure only the chart widget. Including body/html scrollHeight creates a
    // feedback loop with the iframe's own min-height and leaves a dead gap above the footnote.
    const CHILD_HEIGHT_PAD = 4;
    const height = Math.max(
      360,
      Math.ceil(rootRect.height + Math.max(0, rootRect.top) + 2),
      Math.ceil(root.scrollHeight || 0),
      Math.ceil(root.offsetHeight || 0)
    ) + CHILD_HEIGHT_PAD;
    if (Math.abs(height - lastFrameHeight) < 2) {
      reportOuterHeight();
      return;
    }
    lastFrameHeight = height;
    frame.style.setProperty("height", `${height}px`, "important");
    frame.style.setProperty("min-height", `${height}px`, "important");
    const wrap = frame.parentElement;
    if (wrap?.classList?.contains("oga-frame-wrap")) {
      wrap.style.setProperty("min-height", `${height}px`, "important");
    }
    reportOuterHeight();
  } catch (_error) {
    frame.style.setProperty("height", "1200px", "important");
    frame.style.setProperty("min-height", "1200px", "important");
    reportOuterHeight();
  }
}

function detachChildObservers() {
  childResizeObserver?.disconnect();
  childResizeObserver = null;
  childMutationObserver?.disconnect();
  childMutationObserver = null;
  if (childDecorateTimer !== null) window.clearTimeout(childDecorateTimer);
  childDecorateTimer = null;
  if (childWindow) {
    childWindow.removeEventListener("resize", scheduleFrameMeasure);
    try {
      childWindow.document?.removeEventListener("pointerdown", closePinnedNavFromOutside, true);
    } catch (_error) {
      /* iframe may already be gone */
    }
  }
  childWindow = null;
}


function closeNavGroups() {
  document.querySelectorAll(".oga-nav-group").forEach((group) => {
    group.classList.remove("is-open");
  });
  updateGroupExpandedState();
  syncNavDismiss();
}

function syncNavDismiss() {
  if (!navDismiss) return;
  const pinned = Boolean(document.querySelector(".oga-nav-group.is-open"));
  navDismiss.hidden = !pinned;
  navDismiss.setAttribute("aria-hidden", pinned ? "false" : "true");
}

function closePinnedNavFromOutside() {
  closeNavGroups();
  blurNavFocus();
}

function blurNavFocus() {
  // Chart picks leave focus on the menu item; :focus-within would keep the menu open after mouseleave.
  const active = document.activeElement;
  if (active && typeof active.blur === "function" && active.closest?.(".oga-nav-group")) {
    active.blur();
  }
}

function updateGroupExpandedState() {
  document.querySelectorAll(".oga-nav-group").forEach((group) => {
    const trigger = group.querySelector(".oga-nav-group-trigger");
    if (trigger) trigger.setAttribute("aria-expanded", group.classList.contains("is-open") ? "true" : "false");
  });
}

function getHeadingPlainText(heading) {
  return Array.from(heading.childNodes)
    .filter((node) => !(node.nodeType === Node.ELEMENT_NODE && node.classList?.contains("oga-block-kicker")))
    .map((node) => node.textContent || "")
    .join("")
    .trim();
}

function resolveBlockKicker(text) {
  if (!text) return "DATA VIEW";
  if (text.includes("\u6210\u679c\u7e3d\u89bd") || text.includes("\u7d2f\u7a4d\u7bc0\u7701\u74e6\u6578")) return "CUMULATIVE IMPACT";
  if (text.includes("歷年節省瓦數") || text.includes("年度節省瓦數") || text.includes("歷年全校節省瓦數")) return "YEARLY SAVINGS";
  if (text.includes("各校區節省瓦數") || text.includes("校區節省瓦數") || text.includes("省瓦歸因") || text.includes("省瓦來源")) return "CAMPUS SAVINGS";
  if (text.includes("\u6c70\u63db\u91cf") || text.includes("\u5e74\u5ea6\u63a8\u9032") || text.includes("\u975eLED\u6c70\u63db") || text.includes("\u6c70\u63db\u6578\u7e3d\u89bd")) return "REPLACEMENT VOLUME";
  if (text.includes("\u6539\u5584\u54c1\u8cea") || text.includes("\u6c70\u63db\u54c1\u8cea") || text.includes("\u6c70\u63db\u6548\u76ca\u7e3d\u89bd")) return "REPLACEMENT EFFICIENCY";
  if (text.includes("月份排名") || text.includes("月度排名") || text.includes("同年月排名")) return "MONTHLY RANKING";
  if (text.includes("歷史排名")) return "HISTORICAL RANKING";
  if (text.includes("逐月趨勢")) return "MONTHLY TREND";
  if (text.includes("歷史趨勢")) return "HISTORICAL TREND";
  if (text.includes("月份總覽")) return "MONTHLY OVERVIEW";
  if (text.includes("年度總覽")) return "ANNUAL OVERVIEW";
  if (text.includes("地點總覽") || text.includes("校區總覽")) return "LOCATION VIEW";
  if (text.includes("類別佔比")) return "CATEGORY SHARE";
  if (text.includes("地點排名") || text.includes("校區排名")) return "LOCATION RANKING";
  return "DATA VIEW";
}

function decorateBlockTitles(doc) {
  doc.querySelectorAll(".ga-card-title h2, .ga-overview-head h3, .ga-quality-head h2").forEach((heading) => {
    const text = getHeadingPlainText(heading);
    const label = resolveBlockKicker(text);
    let kicker = heading.querySelector(":scope > .oga-block-kicker");
    if (!kicker) {
      kicker = doc.createElement("span");
      kicker.className = "oga-block-kicker";
      heading.insertBefore(kicker, heading.firstChild);
    }
    if (kicker.textContent !== label) kicker.textContent = label;
  });
}

function scheduleChildDecoration(doc) {
  if (childDecorateTimer !== null) window.clearTimeout(childDecorateTimer);
  childDecorateTimer = window.setTimeout(() => {
    childDecorateTimer = null;
    decorateBlockTitles(doc);
  }, 80);
}

function prepareChildFrame() {
  detachChildObservers();
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) return;
  frame.setAttribute("scrolling", "no");

  let style = doc.getElementById("oga-portal-embed-style");
  if (!style) {
    style = doc.createElement("style");
    style.id = "oga-portal-embed-style";
    style.textContent = `
      html, body { overflow: hidden !important; background: transparent !important; }
      body { margin: 0 !important; }
      .ga-widget { margin: 0 auto !important; }
      .oga-block-kicker {
        display: block;
        margin: 0 0 4px;
        color: #7a8798;
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.13em;
        line-height: 1.1;
        text-transform: uppercase;
      }
      .ga-card-title h2, .ga-overview-head h3 { letter-spacing: 0 !important; }
      @media (min-width: 761px) {
        .ga-head {
          flex-direction: row !important;
          align-items: flex-end !important;
        }
        body.ga-has-category-chips .ga-head-copy {
          flex: 0 1 auto !important;
          min-width: min(100%, 19rem) !important;
        }
        body.ga-has-category-chips .ga-sub,
        body.ga-has-category-chips .ga-sub-extra {
          white-space: nowrap !important;
        }
        body.ga-has-category-chips .ga-head {
          gap: 12px !important;
        }
        body.ga-has-category-chips .ga-head-tools {
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          align-items: flex-end !important;
          justify-content: flex-end !important;
          max-width: none !important;
          flex: 1 1 auto !important;
          min-width: 0 !important;
          gap: 8px !important;
        }
        body.ga-has-category-chips .ga-category-chips {
          justify-content: flex-end !important;
          max-width: none !important;
          flex: 1 1 auto !important;
          min-width: 0 !important;
          gap: 5px !important;
        }
        body.ga-has-category-chips .ga-category-chip {
          padding: 6px 10px !important;
        }
        body.ga-has-category-chips .ga-controls {
          flex: 0 0 auto !important;
        }
        body.ga-has-category-chips .ga-control {
          min-width: 160px !important;
        }
        .ga-pr-card .ga-card-title {
          position: relative !important;
          display: block !important;
          min-height: 48px !important;
          margin-bottom: 12px !important;
          padding-right: min(340px, 48%) !important;
        }
        .ga-pr-card .ga-card-title h2 {
          margin: 0 !important;
          max-width: 100% !important;
        }
        .ga-pr-card .ga-card-title .ga-coverage-wrap {
          position: absolute !important;
          top: -2px !important;
          right: 0 !important;
          max-width: min(330px, 46%) !important;
        }
      }
      .ga-chart-card { padding-top: 28px !important; }
      .ga-chart-card::before {
        position: absolute;
        top: 15px;
        left: 12px;
        z-index: 2;
        color: #7a8798;
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.13em;
        line-height: 1.1;
        text-transform: uppercase;
        content: "HISTORICAL TREND";
        pointer-events: none;
      }
      body.ga-month-grain .ga-chart-card::before {
        content: "MONTHLY TREND";
      }
      /* Replacement right panels use quality-head kickers instead. */
      body.ga-replacement-chart .ga-chart-card::before {
        content: none !important;
        display: none !important;
      }
      .ga-quality-head h2 {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0;
      }
    `;
    doc.head.appendChild(style);
  }

  decorateBlockTitles(doc);
  childMutationObserver = new MutationObserver(() => scheduleChildDecoration(doc));
  childMutationObserver.observe(doc.body, { childList: true, subtree: true, characterData: true });

  const root = doc.getElementById("gaWidget") || doc.body;
  childResizeObserver = new ResizeObserver(scheduleFrameMeasure);
  childResizeObserver.observe(root);
  childWindow = win;
  childWindow.addEventListener("resize", scheduleFrameMeasure);
  // Clicks inside the chart iframe never bubble to the explorer document.
  doc.addEventListener("pointerdown", closePinnedNavFromOutside, true);

  scheduleFrameMeasure();
  window.setTimeout(scheduleFrameMeasure, 120);
  window.setTimeout(scheduleFrameMeasure, 500);
  window.setTimeout(scheduleFrameMeasure, 1400);
  doc.fonts?.ready.then(scheduleFrameMeasure).catch(() => {});
}

function formatDataVersionDate(value) {
  const raw = String(value || "").trim();
  if (!/^\d{8}$/.test(raw)) return "";
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

async function updateSourceInfo(chartId) {
  if (!sourceInfo) return;
  try {
    const response = await fetch(`../charts/${chartId}/data.json?t=${Date.now()}`);
    if (!response.ok) throw new Error(String(response.status));
    const payload = await response.json();
    if (chartId !== currentChart) return;
    const updated = formatDataVersionDate(payload.dataVersion);
    sourceInfo.textContent = ["資料來源：總務處", updated ? `更新日期 ${updated}` : ""].filter(Boolean).join(" · ");
  } catch (_error) {
    sourceInfo.textContent = "資料來源：總務處";
  }
}

function renderNavigation() {
  document.querySelectorAll("[data-chart]").forEach((button) => {
    const active = button.dataset.chart === currentChart;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  document.querySelectorAll(".oga-nav-group").forEach((group) => {
    group.classList.toggle("is-active", Boolean(group.querySelector(`[data-chart="${currentChart}"]`)));
  });
  updateGroupExpandedState();
  if (mobileSelect) mobileSelect.value = currentChart;
  if (activeTitle) activeTitle.textContent = CHARTS[currentChart].title;
  if (standaloneLink) {
    standaloneLink.href = `../charts/${currentChart}/`;
    standaloneLink.setAttribute("aria-label", `在新視窗開啟${CHARTS[currentChart].title}`);
  }
}

function switchChart(chartId, historyMode = "push") {
  if (!CHARTS[chartId]) return;
  currentChart = chartId;
  renderNavigation();
  updateUrl(historyMode);
  // Chart pick: unpin. Menu stays only while :hover, then closes on mouseleave.
  closeNavGroups();
  blurNavFocus();

  // Always reload so chart-local filters reset (ECOCO → 全部, etc.).
  detachChildObservers();
  lastFrameHeight = 0;
  lastOuterHeight = 0;
  stage.setAttribute("aria-busy", "true");
  loading.hidden = false;
  frame.title = `${CHARTS[chartId].title}互動圖表`;
  frame.src = `../charts/${chartId}/?portal=1&t=${Date.now()}`;
  updateSourceInfo(chartId);
  reportOuterHeight();
}

function bindEvents() {
  document.querySelectorAll(".oga-nav-group").forEach((group) => {
    group.addEventListener("mouseleave", () => {
      // Card click pins with is-open — stay open until outside click.
      // Hover-only / after picking a chart: clear focus so the menu can close.
      if (group.classList.contains("is-open")) return;
      blurNavFocus();
      updateGroupExpandedState();
    });
  });

  document.querySelectorAll(".oga-nav-group-trigger").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const group = trigger.closest(".oga-nav-group");
      const shouldOpen = group && !group.classList.contains("is-open");
      closeNavGroups();
      blurNavFocus();
      if (group && shouldOpen) group.classList.add("is-open");
      updateGroupExpandedState();
      syncNavDismiss();
    });
  });

  document.querySelectorAll("[data-chart]").forEach((button) => {
    button.addEventListener("click", () => switchChart(button.dataset.chart));
    button.addEventListener("mouseenter", () => {
      const chartId = button.dataset.chart;
      fetch(`../charts/${chartId}/data.json`, { cache: "force-cache" }).catch(() => {});
    }, { once: true });
  });

  if (navDismiss) {
    navDismiss.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      closePinnedNavFromOutside();
    });
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".oga-nav-group") && event.target !== navDismiss) {
      closePinnedNavFromOutside();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePinnedNavFromOutside();
    }
  });

  mobileSelect.addEventListener("change", (event) => switchChart(event.target.value));

  frame.addEventListener("load", () => {
    prepareChildFrame();
    stage.setAttribute("aria-busy", "false");
    loading.hidden = true;
    reportOuterHeight();
  });

  window.addEventListener("resize", scheduleFrameMeasure);
  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    switchChart(CHARTS[params.get("chart")] ? params.get("chart") : "ecoco", "replace");
  });
  new ResizeObserver(reportOuterHeight).observe(document.body);
}

parseInitialChart();
bindEvents();
renderIcons();
switchChart(currentChart, "replace");
