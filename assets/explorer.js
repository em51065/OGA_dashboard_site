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
const mobileThemeNav = document.getElementById("mobileThemeNav");
const mobileThemePrev = document.getElementById("mobileThemePrev");
const mobileThemeNext = document.getElementById("mobileThemeNext");
const mobileThemeStatus = document.getElementById("mobileThemeStatus");
const mobileThemeViewport = document.getElementById("mobileThemeViewport");
const mobileEmbedTip = document.getElementById("mobileEmbedTip");
const mobileNarrowMq = window.matchMedia("(max-width: 760px)");

const NAV_THEME_CHARTS = [
  ["ecoco", "general-recycle", "resource-recycle", "food-waste-recycle"],
  ["rainwater-reuse", "water-use", "electricity-use", "solar-energy"],
  ["led-replacement", "streetlight-replacement"],
];

let currentChart = "ecoco";
let mobileThemeIndex = 0;
let childResizeObserver = null;
let childMutationObserver = null;
let childDecorateTimer = null;
let childWindow = null;
let measureFrameId = null;
let chartReadyFallbackTimer = null;
let lastFrameHeight = 0;
let lastOuterHeight = 0;
/* Match current Wix HTML component on ossd.ncku.edu.tw (comp-mqylfndk). */
const EMBED_HOST_MAX_HEIGHT = 1159;
const EMBED_CHART_MAX_DESKTOP = 920;
/* Align with oga-embed.js MAX_HEIGHT so mobile embed can grow with stacked charts. */
const EMBED_HOST_MAX_HEIGHT_COMPACT = 2400;
const EMBED_CHART_MAX_COMPACT = 2200;

function isEmbeddedMode() {
  return document.documentElement.classList.contains("is-embedded");
}

function isCompactEmbed() {
  return isEmbeddedMode() && mobileNarrowMq.matches;
}

function shouldUseMobileFriendlyOpen() {
  const narrowViewport = mobileNarrowMq.matches;
  const narrowScreen = Math.min(window.screen.width || 0, window.screen.height || 0) <= 760;
  if (isEmbeddedMode() && narrowScreen) return true;
  return narrowViewport;
}

function syncStandaloneLink() {
  if (!standaloneLink) return;
  const mobileFriendly = shouldUseMobileFriendlyOpen();
  const title = CHARTS[currentChart]?.title || currentChart;
  if (mobileFriendly) {
    standaloneLink.href = `?chart=${encodeURIComponent(currentChart)}`;
    standaloneLink.setAttribute("aria-label", `開啟手機友善版完整儀表板（目前：${title}）`);
  } else {
    standaloneLink.href = `../charts/${currentChart}/`;
    standaloneLink.setAttribute("aria-label", `在新視窗開啟${title}`);
  }
  // Already on full (non-embed) mobile dashboard — link is redundant.
  standaloneLink.hidden = Boolean(mobileFriendly && !isEmbeddedMode());
  if (mobileEmbedTip) {
    mobileEmbedTip.hidden = !(isEmbeddedMode() && mobileFriendly && !standaloneLink.hidden);
  }
}

function themeIndexForChart(chartId) {
  const index = NAV_THEME_CHARTS.findIndex((charts) => charts.includes(chartId));
  return index >= 0 ? index : 0;
}

function closeMobileThemeMenus() {
  if (!mobileThemeNav) return;
  mobileThemeNav.querySelectorAll(".oga-mobile-theme-card").forEach((card) => {
    card.setAttribute("aria-expanded", "false");
  });
  mobileThemeNav.querySelectorAll(".oga-mobile-theme-choices").forEach((menu) => {
    menu.hidden = true;
  });
}

function setMobileThemeIndex(nextIndex, { syncChart = false } = {}) {
  if (!mobileThemeNav) return;
  const total = NAV_THEME_CHARTS.length;
  mobileThemeIndex = ((nextIndex % total) + total) % total;
  mobileThemeNav.querySelectorAll(".oga-mobile-theme-panel").forEach((panel) => {
    const active = Number(panel.dataset.themeIndex) === mobileThemeIndex;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
  mobileThemeNav.querySelectorAll("[data-theme-dot]").forEach((dot) => {
    const active = Number(dot.dataset.themeDot) === mobileThemeIndex;
    dot.classList.toggle("is-active", active);
    if (active) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
  });
  if (mobileThemeStatus) mobileThemeStatus.textContent = `${mobileThemeIndex + 1} / ${total}`;
  closeMobileThemeMenus();
  if (syncChart) {
    const charts = NAV_THEME_CHARTS[mobileThemeIndex] || [];
    if (charts.length && !charts.includes(currentChart)) switchChart(charts[0]);
  }
  updateMobileThemeCurrentLabels();
}

function updateMobileThemeCurrentLabels() {
  if (!mobileThemeNav) return;
  mobileThemeNav.querySelectorAll(".oga-mobile-theme-panel").forEach((panel) => {
    const index = Number(panel.dataset.themeIndex);
    const label = panel.querySelector("[data-theme-current]");
    if (!label) return;
    const charts = NAV_THEME_CHARTS[index] || [];
    if (charts.includes(currentChart)) {
      label.textContent = `目前：${CHARTS[currentChart].title}`;
      label.hidden = false;
    } else {
      label.textContent = "";
      label.hidden = true;
    }
  });
  mobileThemeNav.querySelectorAll(".oga-mobile-theme-choice").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.chart === currentChart);
  });
}

function bindMobileThemeNav() {
  if (!mobileThemeNav) return;
  if (mobileThemePrev) {
    mobileThemePrev.addEventListener("click", () => setMobileThemeIndex(mobileThemeIndex - 1));
  }
  if (mobileThemeNext) {
    mobileThemeNext.addEventListener("click", () => setMobileThemeIndex(mobileThemeIndex + 1));
  }
  mobileThemeNav.querySelectorAll("[data-theme-dot]").forEach((dot) => {
    dot.addEventListener("click", () => setMobileThemeIndex(Number(dot.dataset.themeDot)));
  });
  mobileThemeNav.querySelectorAll(".oga-mobile-theme-card").forEach((card) => {
    card.addEventListener("click", () => {
      const panel = card.closest(".oga-mobile-theme-panel");
      const menu = panel?.querySelector(".oga-mobile-theme-choices");
      if (!menu) return;
      const willOpen = menu.hidden;
      closeMobileThemeMenus();
      menu.hidden = !willOpen;
      card.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  });
  mobileThemeNav.querySelectorAll(".oga-mobile-theme-choice").forEach((button) => {
    button.addEventListener("click", () => {
      switchChart(button.dataset.chart);
      closeMobileThemeMenus();
    });
  });

  let touchStartX = 0;
  let touchStartY = 0;
  if (mobileThemeViewport) {
    mobileThemeViewport.addEventListener("touchstart", (event) => {
      const touch = event.changedTouches[0];
      touchStartX = touch?.clientX || 0;
      touchStartY = touch?.clientY || 0;
    }, { passive: true });
    mobileThemeViewport.addEventListener("touchend", (event) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
      setMobileThemeIndex(mobileThemeIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }
}

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
  const portal = document.getElementById("ogaPortal");
  if (!portal) return 560;
  // Measure content box only — never html/body scrollHeight (tracks iframe viewport).
  const HEIGHT_PAD = 4;
  const MAX_CONTENT_HEIGHT = isEmbeddedMode()
    ? (isCompactEmbed() ? EMBED_HOST_MAX_HEIGHT_COMPACT : EMBED_HOST_MAX_HEIGHT)
    : 2400;
  const foot = portal.querySelector(".oga-footnote");
  const portalTop = portal.getBoundingClientRect().top;
  const contentBottom = foot
    ? foot.getBoundingClientRect().bottom
    : portal.getBoundingClientRect().bottom;
  const fromEdges = Math.ceil(contentBottom - portalTop + (window.scrollY || 0));
  const height = Math.max(
    560,
    Math.ceil(portal.scrollHeight || 0),
    fromEdges
  ) + HEIGHT_PAD;
  return Math.min(MAX_CONTENT_HEIGHT, height);
}

function reportOuterHeight() {
  if (window.parent === window) return;
  window.requestAnimationFrame(() => {
    const height = measurePortalHeight();
    if (Math.abs(height - lastOuterHeight) < 3) return;
    lastOuterHeight = height;
    // Only oga:resize to parent. Broadcasting resize/setHeight to window.top
    // can make Wix HTML components keep growing and leave a huge empty tail.
    try {
      window.parent.postMessage({ type: "oga:resize", height }, "*");
    } catch (_error) {
      /* ignore */
    }
  });
}

// Parent pages may load `oga-embed.js` with `async`, potentially missing the first
// `oga:resize` message. Support a request/response handshake to re-measure.
window.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "oga:request-resize") {
    scheduleFrameMeasure();
    reportOuterHeight();
    window.setTimeout(reportOuterHeight, 120);
    window.setTimeout(reportOuterHeight, 600);
    return;
  }
  if (event.data.type === "oga:chart-ready") {
    revealChartFrame();
  }
});

function clearChartReadyFallback() {
  if (chartReadyFallbackTimer !== null) {
    window.clearTimeout(chartReadyFallbackTimer);
    chartReadyFallbackTimer = null;
  }
}

function revealChartFrame() {
  clearChartReadyFallback();
  stage.setAttribute("aria-busy", "false");
  loading.hidden = true;
  reportOuterHeight();
}

function scheduleChartReadyFallback() {
  clearChartReadyFallback();
  chartReadyFallbackTimer = window.setTimeout(() => {
    chartReadyFallbackTimer = null;
    revealChartFrame();
  }, 3000);
}

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
    const CHILD_HEIGHT_PAD = 2;
    let height = Math.max(
      360,
      Math.ceil(rootRect.height + Math.max(0, rootRect.top) + 2),
      Math.ceil(root.scrollHeight || 0),
      Math.ceil(root.offsetHeight || 0)
    ) + CHILD_HEIGHT_PAD;
    if (isEmbeddedMode()) {
      // Desktop embed: leave room for explorer chrome inside ~1159px Wix host.
      // Compact embed: allow full stacked chart height so the host page can scroll.
      const embedChartMax = isCompactEmbed() ? EMBED_CHART_MAX_COMPACT : EMBED_CHART_MAX_DESKTOP;
      height = Math.min(embedChartMax, height);
    }
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

function closeChildChartPopovers() {
  try {
    frame.contentWindow?.postMessage({ type: "oga:close-popovers" }, "*");
  } catch (_error) {
    /* iframe may be cross-origin or unloading */
  }
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
  if (text.includes("成果追蹤")) return "DATA SUMMARY";
  if (text.includes("\u6210\u679c\u7e3d\u89bd")) return "CUMULATIVE IMPACT";
  if (text.includes("\u7d2f\u7a4d\u7bc0\u7701\u74e6\u6578")) return "CUMULATIVE IMPACT";
  if (text.includes("歷年節省瓦數") || text.includes("年度節省瓦數") || text.includes("歷年全校節省瓦數")) return "YEARLY SAVINGS";
  if (text.includes("各校區節省瓦數") || text.includes("校區節省瓦數") || text.includes("省瓦歸因") || text.includes("省瓦來源")) return "CAMPUS SAVINGS";
  if (text.includes("\u6c70\u63db\u91cf") || text.includes("\u5e74\u5ea6\u63a8\u9032") || text.includes("\u975eLED\u6c70\u63db") || text.includes("\u6c70\u63db\u6578\u7e3d\u89bd")) return "REPLACEMENT VOLUME";
  if (text.includes("\u6539\u5584\u54c1\u8cea") || text.includes("\u6c70\u63db\u54c1\u8cea") || text.includes("\u6c70\u63db\u6548\u76ca\u7e3d\u89bd")) return "REPLACEMENT EFFICIENCY";
  if (text.includes("節省瓦數") || text.includes("節能效益")) return "DATA SUMMARY";
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
        margin: 0 0 7px;
        color: #7a8798;
        font-size: 9px;
        font-weight: 950;
        letter-spacing: 0.13em;
        line-height: 1.15;
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
      .ga-chart-card { padding-top: 30px !important; }
      .ga-chart-card::before {
        position: absolute;
        top: 12px;
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
      ${isEmbeddedMode() ? `
      /* Fit inside fixed Wix host (~1159px) without nested scroll. */
      .ga-widget { padding: 12px !important; }
      .ga-head { margin-bottom: 8px !important; gap: 10px !important; }
      .ga-head-copy { padding-bottom: 8px !important; align-self: flex-start !important; margin-top: 10px !important; }
      .ga-pr-card { padding: 12px !important; }
      .ga-chart-card { padding: 8px 12px 4px !important; padding-top: 22px !important; }
      .ga-chart-card::before { top: 10px !important; }
      #trendChart { height: 520px !important; margin-top: 0 !important; }
      .ga-replacement-chart #trendChart { height: 420px !important; }
      #overviewChart { height: 220px !important; }
      .ga-toggle-bar { padding-bottom: 4px !important; }
      .ga-pr-score { margin: 6px 0 8px !important; }
      ` : ""}
      @media (max-width: 760px) {
        body.ga-has-category-chips .ga-sub,
        body.ga-has-category-chips .ga-sub-extra,
        .ga-sub,
        .ga-sub-extra {
          white-space: normal !important;
          overflow: visible !important;
        }
        .oga-block-kicker {
          margin-bottom: 7px !important;
        }
        .ga-chart-card {
          padding-top: 30px !important;
          overflow: visible !important;
        }
        .ga-chart-card::before {
          top: 12px !important;
          left: 12px !important;
        }
        #overviewChart { height: 200px !important; width: 100% !important; max-width: 100% !important; }
        #trendChart { height: 340px !important; width: 100% !important; max-width: 100% !important; }
        .ga-replacement-chart #overviewChart { height: 240px !important; }
        .ga-replacement-chart #trendChart { height: 340px !important; }
        .ga-toggle-bar { flex-wrap: wrap !important; gap: 8px !important; }
        .ga-icon-toggle { min-height: 40px !important; padding: 8px 12px !important; font-size: 13px !important; }
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
  syncStandaloneLink();
  const nextTheme = themeIndexForChart(currentChart);
  if (nextTheme !== mobileThemeIndex) setMobileThemeIndex(nextTheme);
  else updateMobileThemeCurrentLabels();
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
  clearChartReadyFallback();
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
    if (mobileThemeNav && !event.target.closest(".oga-mobile-theme-nav")) {
      closeMobileThemeMenus();
    }
  });
  // Clicks on explorer chrome (outside the chart iframe) never reach the child document.
  document.addEventListener("pointerdown", (event) => {
    if (event.target === frame || frame.contains(event.target)) return;
    closeChildChartPopovers();
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePinnedNavFromOutside();
      closeChildChartPopovers();
      closeMobileThemeMenus();
    }
  });

  mobileSelect.addEventListener("change", (event) => switchChart(event.target.value));

  bindMobileThemeNav();
  setMobileThemeIndex(themeIndexForChart(currentChart));
  const syncOpenMode = () => {
    syncStandaloneLink();
    if (!isEmbeddedMode()) return;
    // Crossing the compact breakpoint changes height caps — force a fresh measure.
    lastFrameHeight = 0;
    lastOuterHeight = 0;
    scheduleFrameMeasure();
    reportOuterHeight();
  };
  if (typeof mobileNarrowMq.addEventListener === "function") {
    mobileNarrowMq.addEventListener("change", syncOpenMode);
  } else if (typeof mobileNarrowMq.addListener === "function") {
    mobileNarrowMq.addListener(syncOpenMode);
  }
  window.addEventListener("resize", syncOpenMode);

  frame.addEventListener("load", () => {
    prepareChildFrame();
    scheduleChartReadyFallback();
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
