"use strict";

const frame = document.getElementById("chartFrame");
const stage = document.getElementById("chartStage");
const loading = document.getElementById("loadingState");
const activeTitle = document.getElementById("activeChartTitle");
const standaloneLink = document.getElementById("standaloneLink");
const sourceInfo = document.getElementById("sourceInfo");
const navDismiss = document.getElementById("navDismiss");
const openNudge = document.getElementById("openNudge");
const openNudgeLabel = document.getElementById("openNudgeLabel");
const chartStageBar = document.getElementById("chartStageBar");

const OPEN_NUDGE_DESKTOP = "另開視窗最佳瀏覽請點擊 →";
const OPEN_NUDGE_MOBILE = "使用手機瀏覽請點擊 →";

function compactMaxWidthPx() {
  const width = Number(window.OGA_NAV?.COMPACT_MAX_WIDTH);
  return Number.isFinite(width) && width > 0 ? width : 760;
}

function compactMinWidthPx() {
  return compactMaxWidthPx() + 1;
}

const mobileNarrowMq = window.matchMedia(`(max-width: ${compactMaxWidthPx()}px)`);

function layoutCompactMode() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("layoutMode");
  if (fromUrl === "overflow" || fromUrl === "breakpoint") return fromUrl;
  return "overflow";
}

/** Legacy 760 breakpoint — shadow probe compares this to overflow production rules. */
function viewportBreakpointCompact() {
  return mobileNarrowMq.matches;
}

/** Nav row overflow only (shadow / debug). */
function resolveLayoutCompactOverflow() {
  const overflow = measureDesktopNavWouldCompact();
  if (overflow) return overflow.wouldCompact;
  return viewportBreakpointCompact();
}

/** Explorer-only compact signal (nav overflow or 760 breakpoint rollback). */
function resolveExplorerCompactSignal() {
  if (layoutCompactMode() === "breakpoint") {
    return viewportBreakpointCompact();
  }
  return resolveLayoutCompactOverflow();
}

/** Production: any compact signal → full-page compact (nav, chart iframe, or ≤760). */
function resolveLayoutCompact() {
  const doc = frame?.contentDocument;
  return resolveExplorerCompactSignal() || resolveChartIframeCompact(doc);
}

function isLayoutCompact() {
  return document.documentElement.classList.contains("is-layout-compact");
}

function syncChartLayoutCompact(compact) {
  const next = Boolean(compact);
  if (lastChartLayoutCompactSent === next) return;
  lastChartLayoutCompactSent = next;
  try {
    frame?.contentWindow?.postMessage(
      { type: "oga:layout-compact", compact: next },
      "*"
    );
  } catch (_error) {
    /* iframe may be unloading */
  }
}

/** Chart iframe ≤760 (CSS compact). Estimates from portal when chart not ready. */
function resolveChartIframeCompact(doc) {
  if (doc?.documentElement) {
    const width = doc.documentElement.clientWidth || doc.body?.clientWidth || 0;
    if (width > 0) return width <= compactMaxWidthPx();
  }
  const portal = document.getElementById("ogaPortal");
  const portalW = portal?.clientWidth ?? document.documentElement.clientWidth ?? 0;
  if (portalW > 0) {
    const embedPad = isEmbeddedMode() ? 18 : 24;
    return portalW - embedPad <= compactMaxWidthPx();
  }
  return false;
}

function syncLayoutCompactClass() {
  const compact = resolveLayoutCompact();
  document.documentElement.classList.toggle("is-layout-compact", compact);
  syncChartLayoutCompact(compact);
}

let mobileSelect;
let mobileThemeNav;
let mobileThemePrev;
let mobileThemeNext;
let mobileThemeStatus;
let mobileThemeViewport;

let CHARTS = {};
let NAV_THEME_CHARTS = [];

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
/* Compact embed: full stacked chart height so the host page can scroll. */
const EMBED_HOST_MAX_HEIGHT_COMPACT = 2400;
const EMBED_CHART_MAX_COMPACT = 2200;

function isEmbeddedMode() {
  return document.documentElement.classList.contains("is-embedded");
}

function isCompactEmbed() {
  return isEmbeddedMode() && isLayoutCompact();
}

function isFriendlySpacesChart() {
  return currentChart === "friendly-spaces";
}

function isReplacementChartId(chartId = currentChart) {
  return chartId === "led-replacement" || chartId === "streetlight-replacement";
}

const REPLACEMENT_EMBED_MEASURE_EPS = 8;
let lastChartLayoutCompactSent = null;

function measureEmbedChromeBands() {
  const portal = document.getElementById("ogaPortal");
  const wrap = frame?.parentElement;
  const foot = portal?.querySelector(".oga-footnote");
  if (!portal || !wrap || !foot) {
    return { aboveFrame: 240, footnote: 32 };
  }
  const aboveFrame = Math.max(
    0,
    Math.ceil(wrap.getBoundingClientRect().top - portal.getBoundingClientRect().top)
  );
  const footnote = Math.ceil(foot.getBoundingClientRect().height) + 1;
  return { aboveFrame, footnote };
}

function embedDesktopChartMaxHeight() {
  const { aboveFrame, footnote } = measureEmbedChromeBands();
  return Math.max(360, EMBED_HOST_MAX_HEIGHT - aboveFrame - footnote);
}

/** Desktop embed chart cap — host remainder, or full measure when content exceeds Wix host. */
function isChartPortalCompactLayout(doc) {
  if (!doc?.documentElement) return false;
  if (doc.documentElement.classList.contains("is-layout-compact")) return true;
  const width = doc.documentElement.clientWidth || doc.body?.clientWidth || 0;
  return width > 0 && width <= compactMaxWidthPx();
}

function embedChartHeightCap(measuredHeight, doc) {
  if (!isEmbeddedMode()) return measuredHeight;
  if (isCompactEmbed()) return EMBED_CHART_MAX_COMPACT;

  const hostBudget = embedDesktopChartMaxHeight();
  const chartMobile = isChartPortalCompactLayout(doc);
  // Fixed host cannot grow: keep friendly-spaces inside budget (map shrinks instead).
  if (isFriendlySpacesChart() && !chartMobile) {
    return hostBudget;
  }
  if (chartMobile || measuredHeight > hostBudget + 2) {
    return EMBED_CHART_MAX_COMPACT;
  }
  return hostBudget;
}

function measureChartWidgetHeight(doc, root) {
  const rootRect = root.getBoundingClientRect();
  const rootTop = rootRect.top;
  // Widget descendants only — doc scrollHeight tracks iframe viewport and inflates height.
  let extent = Math.max(root.scrollHeight || 0, root.offsetHeight || 0);

  const bumpBottom = (node) => {
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.height <= 0 && rect.width <= 0) return;
    extent = Math.max(extent, rect.bottom - rootTop);
  };

  root.querySelectorAll(
    ".ga-pr-card, .ga-chart-card, .ga-toggle-bar, .ga-category-chips, .ga-overview-wrap, #trendChart, #overviewChart, .ga-friendly-map-card, .ga-icon-toggle, .ga-category-chip"
  ).forEach(bumpBottom);

  const trendToggles = doc.getElementById("trendToggles");
  if (trendToggles && !trendToggles.hidden) {
    bumpBottom(trendToggles);
    trendToggles.querySelectorAll(".ga-icon-toggle").forEach(bumpBottom);
  }

  bumpBottom(root.lastElementChild);

  try {
    const style = doc.defaultView.getComputedStyle(root);
    extent += Math.ceil(
      parseFloat(style.paddingBottom || 0) + parseFloat(style.marginBottom || 0)
    );
  } catch (_error) {
    /* ignore */
  }

  const mobileChart = isChartPortalCompactLayout(doc);
  /* Keep pad small: excess iframe height shows as empty band above the footnote. */
  const pad = isEmbeddedMode() ? (mobileChart ? 4 : 2) : 2;
  return Math.max(360, Math.ceil(extent) + pad);
}

const FRIENDLY_SPACES_EMBED_MAP_OVERHEAD_FALLBACK = 168;
const FRIENDLY_EMBED_MAP_SAFETY_PX = 24;
const FRIENDLY_EMBED_COLLAPSED_PANEL_FALLBACK = 48;

function friendlySpacesEmbedMapMaxHeight(doc, chartMaxHeight) {
  const fallback = Math.max(
    240,
    chartMaxHeight - FRIENDLY_SPACES_EMBED_MAP_OVERHEAD_FALLBACK - FRIENDLY_EMBED_MAP_SAFETY_PX
  );
  if (!doc) return fallback;

  const widget = doc.getElementById("gaWidget");
  const head = doc.querySelector("body.ga-friendly-spaces-chart .ga-head");
  const mapShell = doc.getElementById("friendlyMapShell");
  if (!widget) return fallback;

  let overhead = 16;
  try {
    const widgetStyle = doc.defaultView?.getComputedStyle(widget);
    if (widgetStyle) {
      overhead += Math.ceil(
        parseFloat(widgetStyle.paddingTop || 0) + parseFloat(widgetStyle.paddingBottom || 0)
      );
    }
  } catch (_error) {
    /* ignore */
  }
  if (head) overhead += Math.ceil(head.getBoundingClientRect().height);
  if (mapShell) {
    const mapCard = doc.getElementById("friendlyMapCard");
    if (mapCard) {
      const headBottom = head?.getBoundingClientRect().bottom ?? widget.getBoundingClientRect().top;
      const cardGap = Math.max(0, Math.ceil(mapCard.getBoundingClientRect().top - headBottom));
      overhead += cardGap + 8;
    }
  } else {
    overhead += 24;
  }

  // Collapsed campus panel sits in document flow above the map; expanded overlays.
  // Always reserve the collapsed strip so open→close cannot overflow the fixed host.
  const campusPanel = doc.getElementById("friendlyCampusPanel");
  if (campusPanel && !campusPanel.hidden) {
    if (campusPanel.classList.contains("is-collapsed")) {
      overhead += Math.ceil(campusPanel.getBoundingClientRect().height);
    } else {
      const panelHead = campusPanel.querySelector(".ga-friendly-campus-panel-head");
      overhead += Math.max(
        FRIENDLY_EMBED_COLLAPSED_PANEL_FALLBACK,
        Math.ceil(panelHead?.getBoundingClientRect().height || 0) + 12
      );
    }
  }

  return Math.max(240, Math.floor(chartMaxHeight - overhead - FRIENDLY_EMBED_MAP_SAFETY_PX));
}

function applyFriendlySpacesEmbedSizing(doc) {
  if (!doc?.documentElement) return;
  if (!isEmbeddedMode() || isCompactEmbed() || !isFriendlySpacesChart()) {
    doc.documentElement.style.removeProperty("--oga-embed-map-max-h");
    return;
  }
  // Host HTML component is fixed (~1159) and cannot grow — shrink map uniformly
  // (aspect-ratio + %-pins) so collapsed chrome + map fits without nested scroll.
  const chartMax = embedDesktopChartMaxHeight();
  const mapMax = friendlySpacesEmbedMapMaxHeight(doc, chartMax);
  doc.documentElement.style.setProperty("--oga-embed-map-max-h", `${mapMax}px`);
}

function shouldUseMobileFriendlyOpen() {
  const narrowViewport = isLayoutCompact();
  const narrowScreen = Math.min(window.screen.width || 0, window.screen.height || 0) <= compactMaxWidthPx();
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
  const showOpenNudge = !standaloneLink.hidden;
  if (openNudgeLabel) {
    openNudgeLabel.textContent = mobileFriendly ? OPEN_NUDGE_MOBILE : OPEN_NUDGE_DESKTOP;
  }
  if (openNudge) openNudge.hidden = !showOpenNudge;
  if (chartStageBar) chartStageBar.classList.toggle("oga-stage-bar--nudge", showOpenNudge);
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
      if (button.disabled || button.classList.contains("is-soon") || button.getAttribute("aria-disabled") === "true") return;
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

function getNavConfig() {
  return window.OGA_NAV || { CUSTOM_ICONS: {}, NAV_THEMES: [] };
}

function renderNavIcon(icon, { customIcons }) {
  if (!icon) return "";
  if (icon.type === "custom") {
    const svg = customIcons[icon.key] || "";
    const className = icon.className ? ` ${icon.className}` : "";
    return `<span class="oga-custom-icon${className}" aria-hidden="true">${svg}</span>`;
  }
  return `<i data-lucide="${icon.name}" aria-hidden="true"></i>`;
}

function renderDesktopNav(themes, customIcons) {
  const root = document.getElementById("desktopChartNav");
  if (!root) return;
  root.innerHTML = themes.map((theme) => {
    const triggerIcon = renderNavIcon(theme.icon, { customIcons });
    const choices = theme.charts.map((chart) => {
      const iconHtml = renderNavIcon(chart.icon, { customIcons });
      if (chart.soon) {
        return `<button type="button" class="oga-nav-choice is-soon" disabled aria-disabled="true" role="menuitem">${iconHtml}<span>${chart.label}</span><span class="oga-nav-soon">規劃中</span></button>`;
      }
      return `<button type="button" class="oga-nav-choice" data-chart="${chart.id}" role="menuitem">${iconHtml}<span>${chart.label}</span></button>`;
    }).join("");
    return `<div class="oga-nav-group" data-group="${theme.id}">
        <button type="button" class="oga-nav-group-trigger" aria-haspopup="true" aria-expanded="false">
          ${triggerIcon}
          <span><small>${theme.eyebrow}</small>${theme.title}</span>
          <i data-lucide="chevron-down" aria-hidden="true"></i>
        </button>
        <div class="oga-nav-menu" role="menu">${choices}</div>
      </div>`;
  }).join("");
}

function renderMobileNav(themes) {
  const root = document.getElementById("mobileThemeNav");
  if (!root) return;
  const panels = themes.map((theme, index) => {
    const triggerIcon = theme.icon.type === "custom"
      ? renderNavIcon(theme.icon, { customIcons: getNavConfig().CUSTOM_ICONS })
      : `<i data-lucide="${theme.icon.name}" aria-hidden="true"></i>`;
    const choices = theme.charts.map((chart) => {
      if (chart.soon) {
        return `<button type="button" class="oga-mobile-theme-choice is-soon" disabled aria-disabled="true">${chart.label} <span class="oga-nav-soon">規劃中</span></button>`;
      }
      return `<button type="button" class="oga-mobile-theme-choice" data-chart="${chart.id}">${chart.label}</button>`;
    }).join("");
    const activeClass = index === 0 ? " is-active" : "";
    const hiddenAttr = index === 0 ? "" : " hidden";
    return `<div class="oga-mobile-theme-panel${activeClass}" data-theme-index="${index}" data-group="${theme.id}"${hiddenAttr}>
          <button type="button" class="oga-mobile-theme-card" aria-expanded="false" aria-controls="mobileThemeChoices${index}">
            ${triggerIcon}
            <span class="oga-mobile-theme-copy">
              <small>${theme.eyebrow}</small>
              <strong>${theme.title}</strong>
              <em class="oga-mobile-theme-current" data-theme-current></em>
            </span>
            <i data-lucide="chevron-down" aria-hidden="true"></i>
          </button>
          <div class="oga-mobile-theme-choices" id="mobileThemeChoices${index}" hidden>${choices}</div>
        </div>`;
  }).join("");
  const dots = themes.map((theme, index) => {
    const activeClass = index === 0 ? " class=\"is-active\"" : "";
    const currentAttr = index === 0 ? " aria-current=\"true\"" : "";
    return `<button type="button"${activeClass} data-theme-dot="${index}" aria-label="${theme.dotLabel}"${currentAttr}></button>`;
  }).join("");
  root.innerHTML = `<div class="oga-mobile-theme-toolbar">
        <button type="button" class="oga-mobile-theme-arrow" id="mobileThemePrev" aria-label="上一個主題">
          <i data-lucide="chevron-left" aria-hidden="true"></i>
        </button>
        <p class="oga-mobile-theme-status" id="mobileThemeStatus" aria-live="polite">1 / ${themes.length}</p>
        <button type="button" class="oga-mobile-theme-arrow" id="mobileThemeNext" aria-label="下一個主題">
          <i data-lucide="chevron-right" aria-hidden="true"></i>
        </button>
      </div>
      <div class="oga-mobile-theme-viewport" id="mobileThemeViewport">${panels}</div>
      <div class="oga-mobile-theme-dots" id="mobileThemeDots" role="tablist" aria-label="主題位置">${dots}</div>`;
}

function renderMobileSelect(themes) {
  const select = document.getElementById("mobileChartSelect");
  if (!select) return;
  select.innerHTML = themes.map((theme) => {
    const options = theme.charts
      .filter((chart) => chart.id && !chart.soon)
      .map((chart) => `<option value="${chart.id}">${chart.label}</option>`)
      .join("");
    return `<optgroup label="${theme.title}">${options}</optgroup>`;
  }).join("");
}

function renderNav() {
  const { CUSTOM_ICONS, NAV_THEMES } = getNavConfig();
  renderDesktopNav(NAV_THEMES, CUSTOM_ICONS);
  renderMobileNav(NAV_THEMES);
  renderMobileSelect(NAV_THEMES);
}

function cacheNavDomRefs() {
  mobileSelect = document.getElementById("mobileChartSelect");
  mobileThemeNav = document.getElementById("mobileThemeNav");
  mobileThemePrev = document.getElementById("mobileThemePrev");
  mobileThemeNext = document.getElementById("mobileThemeNext");
  mobileThemeStatus = document.getElementById("mobileThemeStatus");
  mobileThemeViewport = document.getElementById("mobileThemeViewport");
}

function deriveChartsFromNavConfig() {
  const { NAV_THEMES } = getNavConfig();
  CHARTS = {};
  NAV_THEME_CHARTS = NAV_THEMES.map((theme) => {
    const activeIds = [];
    theme.charts.forEach((chart) => {
      if (chart.id && !chart.soon) {
        CHARTS[chart.id] = { title: chart.label };
        activeIds.push(chart.id);
      }
    });
    return activeIds;
  });
}

function parseInitialChart() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("chart");
  if (params.get("embed") === "1") document.documentElement.classList.add("is-embedded");
  return requested;
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
  const HEIGHT_PAD = 1;
  const foot = portal.querySelector(".oga-footnote");
  const portalTop = portal.getBoundingClientRect().top;
  const contentBottom = foot
    ? foot.getBoundingClientRect().bottom
    : portal.getBoundingClientRect().bottom;
  const fromEdges = Math.ceil(contentBottom - portalTop + (window.scrollY || 0));
  const height = Math.max(560, fromEdges) + HEIGHT_PAD;
  let maxCap = 2400;
  if (isEmbeddedMode()) {
    maxCap = isCompactEmbed() ? EMBED_HOST_MAX_HEIGHT_COMPACT : EMBED_HOST_MAX_HEIGHT;
    /* Report honest height when desktop embed exceeds fixed Wix host — parent can scroll.
       Friendly-spaces stays capped: host embed code cannot grow the HTML component. */
    if (!isCompactEmbed() && height > EMBED_HOST_MAX_HEIGHT && !isFriendlySpacesChart()) {
      maxCap = EMBED_HOST_MAX_HEIGHT_COMPACT;
    }
  }
  return Math.min(maxCap, height);
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

function schedulePortalRemeasure() {
  scheduleFrameMeasure();
  window.setTimeout(scheduleFrameMeasure, 120);
  window.setTimeout(scheduleFrameMeasure, 400);
  window.setTimeout(scheduleFrameMeasure, 900);
  window.setTimeout(scheduleFrameMeasure, 1600);
  window.setTimeout(scheduleFrameMeasure, 2500);
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
    schedulePortalRemeasure();
    return;
  }
  if (event.data.type === "oga:chart-layout") {
    schedulePortalRemeasure();
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
    syncLayoutCompactClass();
    applyFriendlySpacesEmbedSizing(doc);
    const root = doc.getElementById("gaWidget") || doc.body?.firstElementChild || doc.body;
    if (!root) return;
    let height = measureChartWidgetHeight(doc, root);
    if (isEmbeddedMode()) {
      const hostBudget = embedDesktopChartMaxHeight();
      // If collapsed chrome still overflows, tighten map max once more (uniform scale; pins stay %-based).
      if (
        isFriendlySpacesChart() &&
        !isCompactEmbed() &&
        !isChartPortalCompactLayout(doc) &&
        height > hostBudget + 2
      ) {
        const currentMax = Number.parseFloat(
          doc.documentElement.style.getPropertyValue("--oga-embed-map-max-h")
        );
        if (Number.isFinite(currentMax) && currentMax > 240) {
          const nextMax = Math.max(240, Math.floor(currentMax - (height - hostBudget) - 8));
          doc.documentElement.style.setProperty("--oga-embed-map-max-h", `${nextMax}px`);
          height = measureChartWidgetHeight(doc, root);
        }
      }
      let cap = embedChartHeightCap(height, doc);
      // Break clip feedback: trust widget scrollHeight when iframe is pinned at host budget.
      if (!isCompactEmbed() && !isFriendlySpacesChart() && cap === hostBudget) {
        const scrollEstimate = Math.max(
          height,
          Math.ceil(root.scrollHeight || 0) + 16
        );
        if (scrollEstimate > hostBudget + 8) {
          height = scrollEstimate;
          cap = embedChartHeightCap(height, doc);
        }
      }
      height = Math.min(cap, height);
    }
    const measureEpsilon = isEmbeddedMode() && isReplacementChartId() ? REPLACEMENT_EMBED_MEASURE_EPS : 4;
    if (Math.abs(height - lastFrameHeight) < measureEpsilon) {
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
      @media (min-width: ${compactMinWidthPx()}px) {
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
        /* Friendly-spaces head row lives in chart.css (standalone + embed share one source). */
        body.ga-friendly-spaces-chart.ga-has-category-chips .ga-head-copy {
          min-width: 0 !important;
          max-width: 13.5rem !important;
          flex: 0 1 auto !important;
        }
        body.ga-friendly-spaces-chart.ga-has-category-chips .ga-sub {
          white-space: normal !important;
        }
        body.ga-friendly-spaces-chart .ga-category-chips,
        body.ga-friendly-spaces-chart.ga-has-category-chips .ga-category-chips {
          justify-content: flex-end !important;
          flex: 1 1 auto !important;
          min-width: 0 !important;
          overflow-x: hidden !important;
          padding: 2px 4px 4px !important;
          scroll-padding-inline: 0 !important;
          gap: 5px !important;
        }
        body.ga-friendly-spaces-chart .ga-category-chip {
          padding: 6px 9px !important;
          flex: 0 0 auto !important;
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
      .ga-widget { padding: 12px 12px 2px !important; }
      body.ga-friendly-spaces-chart .ga-widget { padding-bottom: 0 !important; }
      .ga-head { margin-bottom: 8px !important; gap: 10px !important; }
      .ga-head-copy { padding-bottom: 8px !important; align-self: flex-start !important; margin-top: 10px !important; }
      .ga-pr-card { padding: 12px !important; }
      body.ga-friendly-spaces-chart .ga-pr-card { padding: 0 !important; }
      /* Friendly-spaces embed: size map from remaining iframe height, not viewport vh. */
      body.ga-friendly-spaces-chart .ga-friendly-map-shell {
        display: flex !important;
        justify-content: center !important;
        align-items: flex-start !important;
        height: auto !important;
        overflow: visible !important;
      }
      body.ga-friendly-spaces-chart .ga-friendly-map {
        width: min(100%, calc(var(--oga-embed-map-max-h, 720px) * 7128 / 8192)) !important;
        max-width: 100% !important;
        max-height: var(--oga-embed-map-max-h, 720px) !important;
        height: auto !important;
        aspect-ratio: 7128 / 8192 !important;
        flex: 0 0 auto !important;
      }
      .ga-chart-card { padding: 8px 12px 4px !important; padding-top: 22px !important; }
      .ga-chart-card::before { top: 10px !important; }
      #trendChart { height: 520px !important; margin-top: 0 !important; }
      #overviewChart { height: 220px !important; }
      /* Replacement embed: fixed bands — disable desktop flex fill (iframe measure loop). */
      body.ga-replacement-chart .ga-pr-card {
        display: block !important;
        align-self: auto !important;
      }
      body.ga-replacement-chart .ga-overview-wrap {
        flex: 0 0 auto !important;
        display: block !important;
        min-height: 0 !important;
      }
      body.ga-replacement-chart #overviewChart {
        flex: 0 0 auto !important;
        width: 100% !important;
        height: 260px !important;
        min-height: 260px !important;
        max-height: 260px !important;
      }
      body.ga-replacement-chart #trendChart {
        flex: 0 0 auto !important;
        height: 500px !important;
        min-height: 500px !important;
        max-height: 500px !important;
      }
      .ga-toggle-bar { padding-bottom: 4px !important; }
      .ga-pr-score { margin: 6px 0 8px !important; }
      ` : ""}
      @media (max-width: ${compactMaxWidthPx()}px) {
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
        .ga-replacement-chart .oga-block-kicker {
          margin-bottom: 2px !important;
        }
        .ga-chart-card {
          padding-top: 30px !important;
          overflow: visible !important;
        }
        .ga-replacement-chart .ga-chart-card {
          padding-top: 12px !important;
        }
        .ga-chart-card::before {
          top: 12px !important;
          left: 12px !important;
        }
        .ga-replacement-chart .ga-chart-card::before {
          display: none !important;
        }
        #overviewChart { height: 200px !important; width: 100% !important; max-width: 100% !important; }
        #trendChart { height: 340px !important; width: 100% !important; max-width: 100% !important; }
        .ga-replacement-chart #overviewChart,
        .ga-replacement-chart #trendChart {
          min-height: 200px !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .ga-toggle-bar { flex-wrap: wrap !important; gap: 8px !important; }
        .ga-icon-toggle { min-height: 40px !important; padding: 9px 12px !important; font-size: 13px !important; line-height: 1.35 !important; overflow: visible !important; }
        .ga-icon-toggle span { line-height: 1.35 !important; overflow: visible !important; }
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

  applyFriendlySpacesEmbedSizing(doc);
  syncLayoutCompactClass();
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
  lastChartLayoutCompactSent = null;
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
    button.addEventListener("click", () => {
      if (button.disabled || button.classList.contains("is-soon") || button.getAttribute("aria-disabled") === "true") return;
      switchChart(button.dataset.chart);
    });
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

  if (mobileSelect) {
    mobileSelect.addEventListener("change", (event) => switchChart(event.target.value));
  }

  bindMobileThemeNav();
  setMobileThemeIndex(themeIndexForChart(currentChart));
  const syncLayoutMode = () => {
    syncLayoutCompactClass();
    syncStandaloneLink();
    if (!isEmbeddedMode()) return;
    // Crossing the compact breakpoint changes height caps — force a fresh measure.
    lastFrameHeight = 0;
    lastOuterHeight = 0;
    try {
      applyFriendlySpacesEmbedSizing(frame.contentDocument);
    } catch (_error) {
      /* iframe may be unloading */
    }
    schedulePortalRemeasure();
    reportOuterHeight();
  };
  if (typeof mobileNarrowMq.addEventListener === "function") {
    mobileNarrowMq.addEventListener("change", syncLayoutMode);
  } else if (typeof mobileNarrowMq.addListener === "function") {
    mobileNarrowMq.addListener(syncLayoutMode);
  }
  window.addEventListener("resize", syncLayoutMode);

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

  if (layoutCompactMode() === "overflow" && typeof ResizeObserver === "function") {
    const portal = document.getElementById("ogaPortal");
    const nav = document.getElementById("desktopChartNav");
    const layoutObserver = new ResizeObserver(() => syncLayoutMode());
    if (portal) layoutObserver.observe(portal);
    if (nav) layoutObserver.observe(nav);
  }
}

function initExplorer() {
  renderNav();
  cacheNavDomRefs();
  deriveChartsFromNavConfig();
  const requested = parseInitialChart();
  if (requested && CHARTS[requested]) {
    currentChart = requested;
  } else {
    currentChart = NAV_THEME_CHARTS[0]?.[0] || "ecoco";
  }
  bindEvents();
  renderIcons();
  switchChart(currentChart, "replace");
  syncLayoutCompactClass();
  startLayoutShadowObserver();
}

const layoutShadowState = {
  lastMismatchKey: "",
  observer: null,
};

function isLayoutShadowProbeEnabled() {
  const params = new URLSearchParams(window.location.search);
  return params.get("layoutShadowProbe") === "1";
}

function isLayoutShadowEnabled() {
  if (isLayoutShadowProbeEnabled()) return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get("layoutShadow") === "1") return true;
  try {
    return window.localStorage?.getItem("oga:layoutShadow") === "1";
  } catch (_error) {
    return false;
  }
}

function measureDesktopNavTriggerOverflow(nav) {
  const triggers = nav.querySelectorAll(".oga-nav-group-trigger");
  if (!triggers.length) return null;

  let wouldCompact = false;
  let reportScroll = 0;
  let reportClient = 0;
  triggers.forEach((trigger) => {
    const scroll = trigger.scrollWidth;
    const client = trigger.clientWidth;
    if (scroll > client + 1) wouldCompact = true;
    trigger.querySelectorAll("span, small").forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 1) wouldCompact = true;
    });
    if (scroll >= reportScroll) {
      reportScroll = scroll;
      reportClient = client;
    }
  });

  return {
    wouldCompact,
    navScrollWidth: reportScroll,
    navClientWidth: reportClient,
  };
}

/** Sum natural theme-card widths (flex released) vs nav row client width. */
function measureDesktopNavRowIntrinsic(nav) {
  const groups = Array.from(nav.querySelectorAll(".oga-nav-group"));
  if (!groups.length) return null;

  const navStyle = window.getComputedStyle(nav);
  const gap = Number.parseFloat(navStyle.columnGap || navStyle.gap) || 0;
  const saved = groups.map((group) => ({
    group,
    flex: group.style.flex,
    minWidth: group.style.minWidth,
    maxWidth: group.style.maxWidth,
    width: group.style.width,
  }));

  let requiredWidth = 0;
  try {
    saved.forEach(({ group }) => {
      group.style.flex = "0 0 auto";
      group.style.minWidth = "max-content";
      group.style.maxWidth = "none";
      group.style.width = "auto";
    });
    groups.forEach((group, index) => {
      requiredWidth += group.getBoundingClientRect().width;
      if (index > 0) requiredWidth += gap;
    });
  } finally {
    saved.forEach(({ group, flex, minWidth, maxWidth, width }) => {
      group.style.flex = flex;
      group.style.minWidth = minWidth;
      group.style.maxWidth = maxWidth;
      group.style.width = width;
    });
  }

  return {
    requiredWidth,
    availableWidth: nav.clientWidth,
    wouldCompact: requiredWidth > nav.clientWidth + 1,
  };
}

/** When compact CSS hides desktop nav, measure off-screen so width can recover on expand. */
function measureDesktopNavWhileHidden(nav, portalWidth) {
  const saved = {
    display: nav.style.display,
    visibility: nav.style.visibility,
    position: nav.style.position,
    left: nav.style.left,
    top: nav.style.top,
    width: nav.style.width,
    maxWidth: nav.style.maxWidth,
    pointerEvents: nav.style.pointerEvents,
  };
  nav.style.display = "flex";
  nav.style.visibility = "hidden";
  nav.style.position = "fixed";
  nav.style.left = "-10000px";
  nav.style.top = "0";
  nav.style.width = `${portalWidth}px`;
  nav.style.maxWidth = `${portalWidth}px`;
  nav.style.pointerEvents = "none";
  try {
    return {
      rowIntrinsic: measureDesktopNavRowIntrinsic(nav),
      triggerOverflow: measureDesktopNavTriggerOverflow(nav),
    };
  } finally {
    nav.style.display = saved.display;
    nav.style.visibility = saved.visibility;
    nav.style.position = saved.position;
    nav.style.left = saved.left;
    nav.style.top = saved.top;
    nav.style.width = saved.width;
    nav.style.maxWidth = saved.maxWidth;
    nav.style.pointerEvents = saved.pointerEvents;
  }
}

function measureDesktopNavWouldCompact() {
  const nav = document.getElementById("desktopChartNav");
  const portal = document.getElementById("ogaPortal");
  if (!nav || !portal) return null;
  if (!nav.querySelector(".oga-nav-group")) return null;

  const portalWidth = portal.clientWidth;
  if (portalWidth <= 0) return null;

  const wasHidden = window.getComputedStyle(nav).display === "none";
  let rowIntrinsic;
  let triggerOverflow;
  if (wasHidden) {
    ({ rowIntrinsic, triggerOverflow } = measureDesktopNavWhileHidden(nav, portalWidth));
  } else {
    rowIntrinsic = measureDesktopNavRowIntrinsic(nav);
    triggerOverflow = measureDesktopNavTriggerOverflow(nav);
  }
  if (!rowIntrinsic && !triggerOverflow) return null;

  const wouldCompact = Boolean(
    rowIntrinsic?.wouldCompact || triggerOverflow?.wouldCompact
  );

  return {
    wouldCompact,
    portalWidth,
    navScrollWidth: rowIntrinsic?.requiredWidth ?? triggerOverflow?.navScrollWidth ?? 0,
    navClientWidth: rowIntrinsic?.availableWidth ?? triggerOverflow?.navClientWidth ?? 0,
    viewportWidth: document.documentElement.clientWidth,
    measuredWhileHidden: wasHidden,
  };
}

function collectLayoutShadowReport() {
  const overflow = measureDesktopNavWouldCompact();
  const navOverflowCompact = resolveLayoutCompactOverflow();
  const chartIframeCompact = resolveChartIframeCompact(frame?.contentDocument);
  const breakpointCompact = viewportBreakpointCompact();
  const productionCompact = resolveLayoutCompact();

  if (!overflow && !navOverflowCompact && !breakpointCompact && !chartIframeCompact) {
    return { ok: false, error: "measure unavailable" };
  }

  const mismatch = breakpointCompact !== productionCompact;

  return {
    ok: true,
    mismatch,
    viewportWidth: overflow?.viewportWidth ?? document.documentElement.clientWidth,
    portalWidth: overflow?.portalWidth ?? document.getElementById("ogaPortal")?.clientWidth ?? 0,
    compactMaxWidth: compactMaxWidthPx(),
    productionCompact: breakpointCompact,
    overflowWouldCompact: productionCompact,
    navOverflowWouldCompact: navOverflowCompact,
    chartIframeWouldCompact: chartIframeCompact,
    adaptiveCompact: productionCompact,
    breakpointCompact,
    productionModeCompact: productionCompact,
    navScrollWidth: overflow?.navScrollWidth ?? 0,
    navClientWidth: overflow?.navClientWidth ?? 0,
    measuredWhileHidden: overflow?.measuredWhileHidden ?? breakpointCompact,
    hint: mismatch
      ? breakpointCompact
        ? "760 insurance says compact; unified production differs"
        : "760 insurance says desktop; unified production differs"
      : null,
  };
}

function runLayoutShadowCheck() {
  if (!isLayoutShadowEnabled()) return;
  const overflow = measureDesktopNavWouldCompact();

  const viewportCompact = viewportBreakpointCompact();
  const overflowCompact = resolveLayoutCompactOverflow();
  if (viewportCompact === overflowCompact) {
    layoutShadowState.lastMismatchKey = "";
    return;
  }

  const key = [
    overflow?.viewportWidth ?? document.documentElement.clientWidth,
    overflow?.portalWidth ?? 0,
    viewportCompact,
    overflowCompact,
  ].join(":");
  if (layoutShadowState.lastMismatchKey === key) return;
  layoutShadowState.lastMismatchKey = key;

  console.warn("[oga:layout-shadow] 760 insurance vs adaptive mismatch", {
    viewportWidth: overflow?.viewportWidth ?? document.documentElement.clientWidth,
    portalWidth: overflow?.portalWidth ?? 0,
    compactMaxWidth: compactMaxWidthPx(),
    breakpointCompact: viewportCompact,
    adaptiveCompact: overflowCompact,
    navScrollWidth: overflow?.navScrollWidth ?? 0,
    navClientWidth: overflow?.navClientWidth ?? 0,
    measuredWhileHidden: overflow?.measuredWhileHidden ?? viewportCompact,
    hint: viewportCompact
      ? "760 insurance says compact; adaptive says desktop"
      : "760 insurance says desktop; adaptive says compact",
  });
}

function startLayoutShadowObserver() {
  if (!isLayoutShadowEnabled()) return;

  console.info(
    "[oga:layout-shadow] enabled — logging mismatches only; layout unchanged. Disable: remove ?layoutShadow=1 or localStorage oga:layoutShadow"
  );

  const portal = document.getElementById("ogaPortal");
  const nav = document.getElementById("desktopChartNav");
  const schedule = () => window.requestAnimationFrame(runLayoutShadowCheck);

  schedule();
  window.addEventListener("resize", schedule);
  if (typeof ResizeObserver === "function") {
    layoutShadowState.observer = new ResizeObserver(schedule);
    if (portal) layoutShadowState.observer.observe(portal);
    if (nav) layoutShadowState.observer.observe(nav);
  }

  window.OGA_LAYOUT_SHADOW = {
    check: runLayoutShadowCheck,
    measure: measureDesktopNavWouldCompact,
    probeReport: collectLayoutShadowReport,
    isEnabled: isLayoutShadowEnabled,
    resolveLayoutCompact,
    resolveLayoutCompactOverflow,
    viewportBreakpointCompact,
    layoutCompactMode,
  };
}

initExplorer();
