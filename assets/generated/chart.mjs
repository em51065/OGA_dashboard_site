export function mount(scope, loadChart) {
const {document, window, fetch, Plotly, ResizeObserver, MutationObserver, setTimeout, clearTimeout, requestAnimationFrame, cancelAnimationFrame} = scope;
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

let GA_DATA = null;
let selectedYear = null;
let selectedCategory = null;
let selectedLocation = null;
let selectedMonth = null;
let timeGrain = "year";
let visibleTrendCategories = new Set();
let meanLineVisible = true;
let overviewMode = "bar";
let overviewModeTouched = false;
let savingViewMode = "location";
let savingViewModeTouched = false;
let customMonthRange = null;
let customReplacementYearRange = null;
let replacementRangeMetric = "saving";
let focusedCampus = null;
let campusPickedThisOpen = false;
let replacementMetricPopoverPinned = false;
let replacementMetricPopoverCloseTimer = null;
let draftMonthRange = null;
let lastValidMonthRange = null;
let monthPopoverPinned = false;
let monthPopoverCloseTimer = null;
let monthRangeSelectActive = false;
let monthRangeSelectGuardTimer = null;
const fmt = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 });
const pctFmt = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 1 });
const yearSelect = document.getElementById("yearSelect");
const categorySelect = document.getElementById("categorySelect");
const categoryControl = document.getElementById("categoryControl");
const categoryLabel = document.getElementById("categoryLabel");
const categoryChips = document.getElementById("categoryChips");
const locationSelect = document.getElementById("locationSelect");
const locationControl = document.getElementById("locationControl");
const locationLabel = document.getElementById("locationLabel");
const locationScope = document.getElementById("locationScope");
const campusDock = document.getElementById("campusDock");
const campusDockTrigger = document.getElementById("campusDockTrigger");
const campusDockCurrent = document.getElementById("campusDockCurrent");
const campusDockPanel = document.getElementById("campusDockPanel");
const campusDockOptions = document.getElementById("campusDockOptions");
const trendChart = document.getElementById("trendChart");
const trendToggles = document.getElementById("trendToggles");
const qualityFormula = document.getElementById("qualityFormula");
const qualityHead = document.getElementById("qualityHead");
const qualityModeSwitch = document.getElementById("qualityModeSwitch");
const overviewModeSwitch = document.getElementById("overviewModeSwitch");
const overviewTitle = document.getElementById("overviewTitle");
const overviewNote = document.getElementById("overviewNote");
const overviewFootNote = document.getElementById("overviewFootNote");
const chartSubtitle = document.getElementById("chartSubtitle");
const chartSubtitleExtra = document.getElementById("chartSubtitleExtra");
const yearMonthsTop = document.getElementById("yearMonthsTop");
let coverageWrap = yearMonthsTop ? yearMonthsTop.closest(".ga-coverage-wrap") : null;
let yearRangeTop = null;
let replacementMetricTop = null;
let replacementMetricPopover = null;
const OVERVIEW_BAR_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="2" width="14" height="3" rx="0.5"></rect><rect x="1" y="6.5" width="10" height="3" rx="0.5"></rect><rect x="1" y="11" width="7" height="3" rx="0.5"></rect></svg>';
const OVERVIEW_PIE_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.2A6.8 6.8 0 1 0 14.8 8H8V1.2z"></path><path d="M9.2 1.35A6.8 6.8 0 0 1 14.65 6.8H9.2V1.35z"></path></svg>';
const ECOCO_YEAR_SUBTITLE = "用年度排名呈現ECOCO的歷史位置；";
const MONTH_GRAIN_SUBTITLE = "用該年各月比較呈現結果；";
const MONTH_GRAIN_SUBTITLE_EXTRA = "右側為逐月趨勢，點選資料點可同步左側排名。";
const ECOCO_MONTH_MIN_YEAR = 2025;
const defaultChartSubtitle = chartSubtitle ? chartSubtitle.textContent : "";
const defaultChartSubtitleExtra = chartSubtitleExtra ? chartSubtitleExtra.textContent : "";
const defaultChartSubtitleExtraVisible = Boolean(chartSubtitleExtra && !chartSubtitleExtra.hidden);
const monthPopover = document.getElementById("monthPopover");
const monthStartSelect = document.getElementById("monthStartSelect");
const monthEndSelect = document.getElementById("monthEndSelect");
const monthApplyBtn = document.getElementById("monthApplyBtn");
const monthResetBtn = document.getElementById("monthResetBtn");
const timeGrainSwitch = document.getElementById("timeGrainSwitch");
const monthStartField = document.getElementById("monthStartField");
const monthEndField = document.getElementById("monthEndField");
const monthRangeFields = document.getElementById("monthRangeFields");
const monthRangeActions = document.getElementById("monthRangeActions");
const monthPickGrid = document.getElementById("monthPickGrid");
const friendlySummary = document.getElementById("friendlySummary");
const friendlySummaryCount = document.getElementById("friendlySummaryCount");
const friendlyMapCard = document.getElementById("friendlyMapCard");
const friendlyMapShell = document.getElementById("friendlyMapShell");
const friendlyMarkers = document.getElementById("friendlyMarkers");
const friendlyCampusControl = document.getElementById("friendlyCampusControl");
const friendlyCampusSelect = document.getElementById("friendlyCampusSelect");
const friendlyMapLegend = document.getElementById("friendlyMapLegend");
const friendlyMapCredit = document.getElementById("friendlyMapCredit");
const friendlyTip = document.getElementById("friendlyTip");
const friendlyTipTitle = document.getElementById("friendlyTipTitle");
const friendlyTipMeta = document.getElementById("friendlyTipMeta");
const friendlyCampusPanel = document.getElementById("friendlyCampusPanel");
const friendlyCampusPanelTitle = document.getElementById("friendlyCampusPanelTitle");
const friendlyCampusPanelBody = document.getElementById("friendlyCampusPanelBody");
const friendlyCampusPanelMeta = document.getElementById("friendlyCampusPanelMeta");
const friendlyCampusPanelHeadMeta = document.getElementById("friendlyCampusPanelHeadMeta");
const friendlyCampusPanelToggle = document.getElementById("friendlyCampusPanelToggle");
const friendlyMapEl = document.getElementById("friendlyMap");
const friendlyBasemap = document.getElementById("friendlyBasemap");
const friendlyPickPanel = document.getElementById("friendlyPickPanel");
const friendlyPickSelected = document.getElementById("friendlyPickSelected");
const friendlyPickLast = document.getElementById("friendlyPickLast");
const friendlyPickList = document.getElementById("friendlyPickList");
const friendlyPickSaveBtn = document.getElementById("friendlyPickSaveBtn");
const friendlyPickSaveStatus = document.getElementById("friendlyPickSaveStatus");
const friendlyPickCopyBtn = document.getElementById("friendlyPickCopyBtn");
const friendlyPickClearPreviewBtn = document.getElementById("friendlyPickClearPreviewBtn");
const friendlyPickClearListBtn = document.getElementById("friendlyPickClearListBtn");
const friendlyPickClearSelectBtn = document.getElementById("friendlyPickClearSelectBtn");
let friendlySelectedCampus = null;
let friendlySelectedItemId = null;
let friendlyCampusPanelDismissed = false;
let friendlyCampusPanelCollapsed = true;
let friendlyCampusPanelPinned = false;
let friendlyMapShellBound = false;
let friendlyCampusKeysBound = false;
let friendlyCampusSelectBound = false;
let friendlyPickModeBound = false;
const friendlyPickRecords = [];
const friendlyPickPreviewById = new Map();
let friendlyPickMarkEl = null;
let friendlyPickDragState = null;
const FRIENDLY_PICK_DRAG_THRESHOLD_PX = 5;
const FRIENDLY_PICK_EXPORT_FILENAME = "friendly_spaces_pick_export.json";
const FRIENDLY_PICK_EXPORT_RELPATH = "__FRIENDLY_PICK_EXPORT_RELPATH__";
const FRIENDLY_BASEMAP_DISPLAY_SRC = scope.assetUrl("assets/campus-base-display.webp");
const FRIENDLY_BASEMAP_FULL_SRC = scope.assetUrl("assets/campus-base.png");
let friendlyBasemapReadyPromise = null;
let friendlyBasemapPaintToken = 0;
const yearControlLabel = document.querySelector("#yearControl label[for='yearSelect']");
const yearControl = document.getElementById("yearControl");
const metricSwitch = document.getElementById("metricSwitch");

function isPortalChart() {
  return new URLSearchParams(window.location.search).get("portal") === "1";
}

let portalLayoutCompactOverride = null;

function applyPortalLayoutCompact(compact) {
  if (!isPortalChart()) return;
  const next = Boolean(compact);
  if (portalLayoutCompactOverride === next) return;
  portalLayoutCompactOverride = next;
  document.documentElement.classList.toggle("is-layout-compact", portalLayoutCompactOverride);
  schedulePlotResize();
  if (typeof GA_DATA !== "undefined" && GA_DATA && GA_DATA.chartId) {
    try {
      updateAll();
    } catch (_error) {
      /* chart may still be initializing */
    }
  }
}

function resolveLayoutCompact() {
  const mediaCompact = window.matchMedia("(max-width: 760px)").matches;
  if (isPortalChart() && portalLayoutCompactOverride !== null) {
    // Portal embed: CSS @media follows iframe width — never run desktop Plotly in compact CSS.
    return portalLayoutCompactOverride || mediaCompact;
  }
  return mediaCompact;
}

function isCompactViewport() {
  return resolveLayoutCompact();
}

window.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "oga:layout-compact") {
    applyPortalLayoutCompact(event.data.compact);
  }
});

let plotResizeTimer = null;
const lastPlotSizes = { trend: { w: 0, h: 0 }, overview: { w: 0, h: 0 } };
let lastTrendMeanLegend = { y: null, unit: "", yref: "y" };

function schedulePlotResize() {
  if (plotResizeTimer !== null) window.clearTimeout(plotResizeTimer);
  plotResizeTimer = window.setTimeout(() => {
    plotResizeTimer = null;
    try {
      [
        ["trend", document.getElementById("trendChart")],
        ["overview", document.getElementById("overviewChart")],
      ].forEach(([key, node]) => {
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        if (width <= 0 || height <= 0) return;
        const prev = lastPlotSizes[key] || { w: 0, h: 0 };
        if (Math.abs(width - prev.w) < 2 && Math.abs(height - prev.h) < 2) return;
        lastPlotSizes[key] = { w: width, h: height };
        Plotly.Plots.resize(node);
      });
    } catch (_error) {
      /* plot may not be ready */
    }
    if (lastTrendMeanLegend.y != null) {
      syncTrendMeanLegend(lastTrendMeanLegend);
    }
    schedulePortalLayoutNotify();
  }, 160);
}

function withPlotInteractionLock(layout, chartId) {
  const next = Object.assign({}, layout || {});
  // Overview bars: lock pan/zoom on every viewport so drag never rescales bar length.
  // Trend: keep compact-only lock (desktop trend may still pan).
  if (chartId !== "overviewChart" && !isCompactViewport()) return next;
  next.dragmode = false;
  next.xaxis = Object.assign({}, next.xaxis || {}, { fixedrange: true });
  next.yaxis = Object.assign({}, next.yaxis || {}, { fixedrange: true });
  if (next.xaxis2) next.xaxis2 = Object.assign({}, next.xaxis2, { fixedrange: true });
  if (next.yaxis2) next.yaxis2 = Object.assign({}, next.yaxis2, { fixedrange: true });
  return next;
}

function withCompactTrendTitle(layout) {
  const next = Object.assign({}, layout || {});
  // Replacement titles live in HTML (ga-quality-head); do not reserve Plotly title top margin.
  if (!isCompactViewport() || isReplacementChart()) return next;
  const tallTitle = compactTrendNeedsTallTitle(next);
  if (next.title && typeof next.title === "object") {
    next.title = Object.assign({}, next.title, {
      // pad.t clears CJK tops; small pad.b + lower minTop reclaim title→plot dead space.
      y: 0.985,
      yanchor: "top",
      pad: { t: 12, b: tallTitle ? 6 : 3 },
      font: Object.assign({}, next.title.font || {}, { size: 18, color: "#101827" }),
    });
  }
  // Prefer title clearance over empty band under the subtitle (never restore 124 for short titles).
  const minTop = tallTitle ? 118 : 92;
  if (next.margin) {
    next.margin = Object.assign({}, next.margin, {
      t: Math.max(Number(next.margin.t) || 0, minTop),
    });
  } else {
    next.margin = trendPlotMargins("year");
  }
  return next;
}

function plotlyConfig(extra) {
  return Object.assign(
    { displayModeBar: false, responsive: true, scrollZoom: false },
    extra || {}
  );
}

(function patchPlotlyMobileGestures() {
  if (!window.Plotly || typeof Plotly.react !== "function") return;
  const originalReact = Plotly.react.bind(Plotly);
  Plotly.react = function patchedReact(gd, data, layout, config) {
    const id = typeof gd === "string" ? gd : (gd && gd.id);
    let nextLayout = withPlotInteractionLock(layout, id);
    if (id === "trendChart") nextLayout = withCompactTrendTitle(nextLayout);
    const result = originalReact(gd, data, nextLayout, plotlyConfig(config));
    schedulePortalLayoutNotify();
    return result;
  };
})();

function overviewHBarOptions(maxValue, displayValues) {
  const peak = Math.max(...displayValues, maxValue, 1);
  if (isCompactViewport()) {
    return {
      margin: { l: 56, r: 8, t: 4, b: 4 },
      textposition: "inside",
      textfont: { color: "#ffffff", size: 11 },
      range: [0, peak * 1.04],
      barWidth: 0.46,
      tickfontSize: 11,
      yPad: 0.55,
    };
  }
  return {
    margin: { l: 64, r: 102, t: 12, b: 12 },
    textposition: "outside",
    textfont: { color: "#253047", size: 12 },
    range: [0, peak * 1.22],
    barWidth: 0.58,
    tickfontSize: 12,
    yPad: 0.72,
  };
}

function compactTrendSup(text) {
  const raw = String(text || "");
  // Keep desktop wording on compact; shrink type so one line fits without clipping.
  if (!isCompactViewport()) return raw;
  return `<span style="font-size:10px">${raw}</span>`;
}

function compactTrendNeedsTallTitle(layout) {
  // Dual-metric water/electricity subtitles are long; keep the taller Plotly title band.
  if (typeof usesDualMetricTrend === "function" && usesDualMetricTrend()) return true;
  const title = layout && layout.title;
  const text = title && typeof title === "object" ? title.text : title;
  return /亮線|淡線|對照/.test(String(text || ""));
}

function compactTrendTitleTop(kind = "year") {
  const tall = compactTrendNeedsTallTitle();
  if (tall) {
    if (kind === "empty") return 112;
    if (kind === "month") return 118;
    return 124;
  }
  // Short single-metric titles: reclaim title→plot air for CJK/subtitle clearance.
  if (kind === "empty") return 86;
  if (kind === "month") return 92;
  return 94;
}

function trendPlotMargins(kind = "year") {
  const dual = typeof usesDualMetricTrend === "function" && usesDualMetricTrend();
  // meanBand: desktop keeps tuned band; compact gets more room for a higher left pill.
  const meanBand = isCompactViewport() ? 74 : 50;
  if (!isCompactViewport()) {
    if (kind === "empty") return { l: 64, r: dual ? 64 : 28, t: 78 + meanBand, b: 62 };
    if (kind === "month") return { l: 64, r: 72, t: 78 + meanBand, b: 62 };
    return { l: 64, r: dual ? 68 : 28, t: 128 + meanBand, b: 78 };
  }
  // Compact top margin sized to title length (see compactTrendTitleTop).
  const t = compactTrendTitleTop(kind);
  if (dual) {
    if (kind === "empty") return { l: 36, r: 36, t: t + meanBand, b: 48 };
    if (kind === "month") return { l: 36, r: 36, t: t + meanBand, b: 52 };
    return { l: 36, r: 36, t: t + meanBand, b: 52 };
  }
  // Single-axis compact: no y-unit title, so a slightly tighter left gutter is enough for ticks.
  if (kind === "empty") return { l: 36, r: 14, t: t + meanBand, b: 48 };
  if (kind === "month") return { l: 36, r: 14, t: t + meanBand, b: 52 };
  return { l: 36, r: 14, t: t + meanBand, b: 52 };
}

function trendXAxisLayout(tickvals, ticktext) {
  const vals = (tickvals || []).map(Number).filter((v) => Number.isFinite(v));
  const axis = {
    title: "",
    tickmode: "array",
    tickvals,
    ticktext: ticktext != null ? ticktext : tickvals,
    showgrid: false,
    zeroline: false,
  };
  // Compact: shrink category end-padding so the first/last points sit nearer the y-axis / right edge.
  if (isCompactViewport() && vals.length) {
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = vals.length <= 2 ? 0.28 : 0.42;
    axis.range = [lo - pad, hi + pad];
  }
  return axis;
}

function trendYAxisLayout({ maxY = null, unit = "" } = {}) {
  const compact = isCompactViewport();
  const axis = {
    // Compact: hide unit title (card title / legend already carry the unit) to avoid crowding ticks.
    title: compact ? "" : (unit || activeUnit()),
    rangemode: "tozero",
    gridcolor: "#e8eef6",
    zeroline: false,
    automargin: false,
    tickfont: { size: compact ? 10 : 12 },
  };
  if (maxY != null && Number.isFinite(maxY)) axis.range = [0, maxY * 1.22];
  return axis;
}

function dualMetricYAxisLayout(left, right, leftColor, rightColor, dualRanges) {
  const compact = isCompactViewport();
  const tickSize = compact ? 10 : 11;
  return {
    yaxis: {
      // Compact: hide unit titles — legend toggles already show 用水量／水費 (or 用電量／電費).
      title: compact ? "" : activeUnit(left),
      rangemode: "tozero",
      range: dualRanges.left,
      gridcolor: "#e8eef6",
      zeroline: false,
      // Compact: fixed margins expand the plot; automargin would re-inflate side gaps.
      automargin: !compact,
      titlefont: { color: leftColor, size: 12 },
      tickfont: { color: leftColor, size: tickSize },
    },
    yaxis2: {
      title: compact ? "" : activeUnit(right),
      rangemode: "tozero",
      range: dualRanges.right,
      overlaying: "y",
      side: "right",
      showgrid: false,
      zeroline: false,
      automargin: !compact,
      titlefont: { color: hexToRgba(rightColor, 0.72), size: 12 },
      tickfont: { color: hexToRgba(rightColor, 0.72), size: tickSize },
    },
  };
}

const MEAN_LINE_COLOR = "#94a3b8";

function meanLineTrace({ x, y, yref = "y" }) {
  const yaxis = yref === "y2" ? "y2" : "y";
  return {
    type: "scatter",
    mode: "lines",
    name: "均值",
    x: [x[0], x[x.length - 1]],
    y: [y, y],
    yaxis,
    line: { color: MEAN_LINE_COLOR, width: 1.8, dash: "dash" },
    hoverinfo: "skip",
    showlegend: false,
  };
}

function withMeanLegendTraces(traces, { x, y, yref = "y" }) {
  if (!meanLineVisible || y == null || !Number.isFinite(y) || y <= 0) return traces;
  return [...traces, meanLineTrace({ x, y, yref })];
}

function trendMeanLegendLabel(y, unit) {
  return `均值 ${fmt.format(y)}${unit ? " " + unit : ""}`;
}

function hideTrendMeanLegend() {
  const btn = document.getElementById("trendMeanLegend");
  if (btn) btn.hidden = true;
  lastTrendMeanLegend = { y: null, unit: "", yref: "y" };
}

function syncTrendMeanLegend({ y, unit, yref = "y" }) {
  const btn = document.getElementById("trendMeanLegend");
  const labelEl = document.getElementById("trendMeanLegendText");
  const row = document.getElementById("trendMeanRow");
  if (!btn || !labelEl || !row) return;
  if (isReplacementChart() || y == null || !Number.isFinite(y) || y <= 0) {
    hideTrendMeanLegend();
    return;
  }
  lastTrendMeanLegend = { y, unit: unit || "", yref };
  labelEl.textContent = trendMeanLegendLabel(y, unit);
  btn.hidden = false;
  btn.setAttribute("aria-pressed", String(meanLineVisible));
  btn.classList.toggle("active", meanLineVisible);

  const chartEl = document.getElementById("trendChart");
  if (!chartEl) return;
  const _layout = chartEl._fullLayout;
  const _size = _layout && _layout._size;
  if (!_size) return;

  const compact = isCompactViewport();
  btn.classList.toggle("ga-mean-anchor-left", compact);

  const pillH = btn.offsetHeight || 24;
  const chartTop = chartEl.offsetTop;
  // Compact: park higher in the title band; desktop keeps the tuned right-edge gap.
  const gap = compact ? 74 : 62;
  const topPx = Math.max(4, chartTop + _size.t - pillH - gap);
  row.style.top = `${topPx}px`;
  btn.style.color = MEAN_LINE_COLOR;

  const card = row.parentElement;
  const cardWidth = (card && card.clientWidth) || chartEl.clientWidth;

  if (compact) {
    // Mobile: sit near the card/chart left edge (deep in the y-tick margin); grows right.
    const anchorLeft = Math.max(2, chartEl.offsetLeft + 2);
    btn.style.left = `${anchorLeft}px`;
  } else {
    // Desktop: right-anchor into the right margin; text grows left.
    const plotRight = chartEl.offsetLeft + _size.l + _size.w;
    const sizeR = Number(_size.r) || 0;
    const rightNudge = Math.min(36, Math.max(0, sizeR - 2));
    const anchorRight = Math.min(plotRight + rightNudge, cardWidth - 2);
    btn.style.left = `${anchorRight}px`;
  }
}

function afterTrendMeanLegend({ y, unit, yref = "y" }) {
  syncTrendMeanLegend({ y, unit, yref });
}

/** Focus callout: when the point is at the rightmost x, grow left so it clears the mean pill. */
function focusPointAnnotation({ x, y, text, yref = "y", xValues = [] }) {
  const xs = (xValues || []).map(Number).filter((v) => Number.isFinite(v));
  const xv = Number(x);
  const maxX = xs.length ? Math.max(...xs) : xv;
  const atRight = Number.isFinite(xv) && Number.isFinite(maxX) && xv >= maxX - 1e-9;
  return {
    x,
    y,
    xref: "x",
    yref,
    text,
    showarrow: true,
    arrowhead: 2,
    arrowcolor: "#cbd5e1",
    ax: atRight ? -36 : 0,
    ay: atRight ? -48 : -54,
    xanchor: atRight ? "right" : "center",
    yanchor: "bottom",
    bgcolor: "rgba(255,255,255,0.94)",
    bordercolor: "#d9e1ec",
    borderpad: 6,
    font: { size: 12, color: "#101827" },
  };
}

function bindMeanLegendToggle() {
  const btn = document.getElementById("trendMeanLegend");
  if (!btn || btn._gaMeanLegendBound) return;
  btn._gaMeanLegendBound = true;
  btn.addEventListener("click", () => {
    meanLineVisible = !meanLineVisible;
    btn.setAttribute("aria-pressed", String(meanLineVisible));
    btn.classList.toggle("active", meanLineVisible);
    updateAll();
  });
}

function isEcocoChart() {
  return GA_DATA.chartType === "ecoco";
}

function supportsMonthGrain() {
  return isEcocoChart() || GA_DATA.supportsMonthGrain === true;
}

function usesCategoryChips() {
  return isEcocoChart() || GA_DATA.usesCategoryChips === true;
}

function usesMetricSwitch() {
  return GA_DATA.usesMetricSwitch === true;
}

function usesDualMetricTrend() {
  return GA_DATA.dualMetricTrend === true && Array.isArray(GA_DATA.categories) && GA_DATA.categories.length === 2;
}

/** Fixed left/right axis slots from category order — switching metrics only changes emphasis, not geometry. */
function dualMetricAxisCategories() {
  const categories = GA_DATA.categories || [];
  if (categories.length < 2) return null;
  return { left: categories[0], right: categories[1] };
}

/** Asymmetric Y ranges on fixed left/right axes — avoids dual-axis visual overlap when series are nearly proportional. */
function dualMetricAxisRanges(maxLeft, maxRight) {
  return {
    left: [0, Math.max(Number(maxLeft) || 0, 1) * 1.12],
    right: [0, Math.max(Number(maxRight) || 0, 1) * 1.45],
  };
}

function secondaryMetricCategory(primary = selectedCategory) {
  return (GA_DATA.categories || []).find((category) => category !== primary) || null;
}

function isMonthGrain() {
  return supportsMonthGrain() && timeGrain === "month";
}

function monthGrainMinYear() {
  if (isEcocoChart()) return ECOCO_MONTH_MIN_YEAR;
  const raw = GA_DATA.monthGrainMinYear;
  if (raw == null || raw === "") return null;
  const configured = Number(raw);
  return Number.isFinite(configured) ? configured : null;
}

function updateLocationScopeMeta() {
  if (!locationScope) return;
  const locations = GA_DATA.locations || [];
  const singleLocation = locations.length === 1;
  if (!singleLocation) {
    locationScope.hidden = true;
    locationScope.textContent = "";
    return;
  }
  const location = selectedLocation || GA_DATA.defaultLocation || locations[0];
  locationScope.hidden = false;
  locationScope.textContent = location;
}

function updateChartSubtitle() {
  if (!chartSubtitle || !supportsMonthGrain()) return;
  if (isMonthGrain()) {
    chartSubtitle.textContent = MONTH_GRAIN_SUBTITLE;
    if (chartSubtitleExtra) {
      chartSubtitleExtra.textContent = MONTH_GRAIN_SUBTITLE_EXTRA;
      chartSubtitleExtra.hidden = false;
    }
    return;
  }
  if (chartSubtitleExtra) {
    chartSubtitleExtra.textContent = defaultChartSubtitleExtra;
    chartSubtitleExtra.hidden = !defaultChartSubtitleExtraVisible;
  }
  if (isEcocoChart()) {
    chartSubtitle.textContent = ECOCO_YEAR_SUBTITLE;
    return;
  }
  chartSubtitle.textContent = defaultChartSubtitle;
}

function updateYearControlLabel() {
  if (!yearControlLabel) return;
  yearControlLabel.textContent = supportsMonthGrain() ? "選擇時間" : "選擇年份";
}

function syncGrainBodyClass() {
  document.body.classList.toggle("ga-month-grain", isMonthGrain());
  document.body.classList.toggle("ga-has-metric-switch", usesMetricSwitch());
  document.body.classList.toggle("ga-has-category-chips", usesCategoryChips() || isFriendlySpacesChart());
  document.body.classList.toggle("ga-ecoco-chart", isEcocoChart());
  document.body.classList.toggle("ga-friendly-spaces-chart", isFriendlySpacesChart());
}

function setOverviewModeButtons(kind) {
  if (!overviewModeSwitch) return;
  const modeButtons = overviewModeSwitch.querySelectorAll("button");
  overviewModeSwitch.classList.toggle("ga-overview-icon-switch", kind === "icons");
  if (kind === "location") {
    const locationName = locationAxisName();
    if (isStreetlightChart()) {
      if (modeButtons[0]) {
        modeButtons[0].textContent = locationName;
        modeButtons[0].dataset.overviewMode = "location";
        modeButtons[0].removeAttribute("title");
        modeButtons[0].setAttribute("aria-label", locationName);
      }
      if (modeButtons[1]) {
        modeButtons[1].textContent = "年度";
        modeButtons[1].dataset.overviewMode = "bar";
        modeButtons[1].removeAttribute("title");
        modeButtons[1].setAttribute("aria-label", "年度");
      }
    } else {
      if (modeButtons[0]) {
        modeButtons[0].textContent = "年度";
        modeButtons[0].dataset.overviewMode = "bar";
        modeButtons[0].removeAttribute("title");
        modeButtons[0].setAttribute("aria-label", "年度");
      }
      if (modeButtons[1]) {
        modeButtons[1].textContent = locationName;
        modeButtons[1].dataset.overviewMode = "location";
        modeButtons[1].removeAttribute("title");
        modeButtons[1].setAttribute("aria-label", locationName);
      }
    }
    modeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.overviewMode === overviewMode);
    });
    return;
  }
  if (modeButtons[0]) {
    modeButtons[0].innerHTML = OVERVIEW_BAR_ICON;
    modeButtons[0].dataset.overviewMode = "bar";
    modeButtons[0].title = "長條";
    modeButtons[0].setAttribute("aria-label", "長條");
  }
  if (modeButtons[1]) {
    modeButtons[1].innerHTML = OVERVIEW_PIE_ICON;
    modeButtons[1].dataset.overviewMode = "pie";
    modeButtons[1].title = "圓餅";
    modeButtons[1].setAttribute("aria-label", "圓餅");
  }
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.overviewMode === overviewMode);
  });
}

function isSolarChart() {
  return GA_DATA.chartType === "solar";
}

function isStreetlightChart() {
  return GA_DATA.chartType === "streetlight";
}

function isReplacementChart() {
  return GA_DATA.chartType === "streetlight" || GA_DATA.chartType === "led_replacement";
}

function isFriendlySpacesChart() {
  return GA_DATA.chartType === "friendly_spaces";
}

function usesMonthCoverage() {
  return !GA_DATA.disableMonthRange && !isReplacementChart();
}

function usesYearRange() {
  return isReplacementChart();
}

function hasLocationOverviewMode() {
  return isSolarChart() || isStreetlightChart();
}

function locationModeTarget() {
  return isStreetlightChart() ? selectedLocation : selectedCategory;
}

function aggregateLocationKey() {
  return isStreetlightChart() ? GA_DATA.defaultLocation : GA_DATA.defaultCategory;
}

function locationAxisName() {
  return isStreetlightChart() ? "校區" : "地點";
}

function usesLocationRanking() {
  return overviewMode === "location" &&
    hasLocationOverviewMode() &&
    locationModeTarget() &&
    locationModeTarget() !== aggregateLocationKey();
}

function hasCategoryControl() {
  return Array.isArray(GA_DATA.categories) && GA_DATA.categories.length > 0;
}

function hasTrendToggles() {
  // Keep location-line toggles even in 地點 overview mode — right side stays a year trend.
  return isEcocoChart() || isSolarChart();
}

function categoryDisplayName(category) {
  if (isEcocoChart() && category === "ECOCO") return "全部";
  return category;
}

function isParentCategory(category) {
  if (isEcocoChart() && category === "ECOCO") return true;
  if (isSolarChart() && category === (GA_DATA.defaultCategory || "全地點")) return true;
  return false;
}

function showAggregatePieMode() {
  // Pie share is useful for ECOCO's many material subtypes; solar keeps 年度|地點 bars instead.
  return isEcocoChart() && selectedCategory === "ECOCO";
}

function aggregatePieTitleLabel() {
  return "類別佔比";
}

function syncOverviewModeControls() {
  if (!overviewModeSwitch) return;
  if (showAggregatePieMode()) {
    setOverviewModeButtons("icons");
    if (overviewMode === "location") overviewMode = "bar";
  } else if (hasLocationOverviewMode()) {
    if (isStreetlightChart() && !overviewModeTouched) overviewMode = "location";
    setOverviewModeButtons("location");
    if (overviewMode === "pie") overviewMode = "bar";
  } else {
    setOverviewModeButtons("icons");
    if (overviewMode === "location" || overviewMode === "pie") overviewMode = "bar";
  }
}

function activeMeta(category = selectedCategory) {
  return (GA_DATA.categoryMeta && GA_DATA.categoryMeta[category]) || {
    unit: GA_DATA.unit,
    valueNoun: GA_DATA.valueNoun,
    agg: "sum",
  };
}

function activeUnit(category = selectedCategory) {
  return activeMeta(category).unit || GA_DATA.unit;
}

function activeValueNoun(category = selectedCategory) {
  return activeMeta(category).valueNoun || GA_DATA.valueNoun;
}

function activeFormulaLines(category = selectedCategory) {
  return activeMeta(category).formulaLines || [];
}

function activeFormulaHtml(category = selectedCategory) {
  return activeMeta(category).formulaHtml || "";
}

function activeTrendSubtitle(category = selectedCategory, fallback = "") {
  return activeMeta(category).trendSubtitle || fallback;
}

function boldTitle(text) {
  return `<b>${text}</b>`;
}

function currentSeries(category = selectedCategory) {
  if (GA_DATA.locationSeries) {
    const location = selectedLocation || GA_DATA.defaultLocation;
    return (GA_DATA.locationSeries[location] && GA_DATA.locationSeries[location][category]) || { defaultYear: null, records: [], monthly: [] };
  }
  if (!hasCategoryControl()) return GA_DATA;
  return GA_DATA.series[category] || GA_DATA.series[GA_DATA.defaultCategory];
}

function recordForYear(year, category = selectedCategory) {
  const series = currentSeries(category);
  if (!series.records || !series.records.length) return null;
  return series.records.find((item) => String(item.year) === String(year)) || series.records[series.records.length - 1];
}

function mixColor(a, b, t) {
  const rgb = a.map((value, idx) => Math.round(value + (b[idx] - value) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function colorForPosition(position) {
  const p = Math.max(0, Math.min(100, Number(position))) / 100;
  const mid = [184, 199, 217];
  if (p < 0.5) return mixColor([37, 99, 235], mid, p / 0.5);
  return mixColor(mid, [212, 63, 85], (p - 0.5) / 0.5);
}

function visibleBarValues(values) {
  const maxValue = Math.max(...values.map((value) => Math.abs(Number(value) || 0)), 1);
  const minVisible = maxValue * 0.018;
  return values.map((value) => {
    const numeric = Number(value) || 0;
    if (numeric === 0) return 0;
    return Math.max(numeric, minVisible);
  });
}

function formatMonths(months) {
  const list = [...new Set((months || []).map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
  if (!list.length) return "無資料";
  if (list.length === 1) return `${list[0]}月`;
  const isConsecutive = list.every((month, idx) => idx === 0 || month === list[idx - 1] + 1);
  if (isConsecutive) return `${list[0]}-${list[list.length - 1]}月`;
  return `${list.join("、")}月`;
}

function monthsInRange(months, startMonth, endMonth) {
  return [...new Set((months || []).map(Number).filter((month) => month >= startMonth && month <= endMonth))]
    .sort((a, b) => a - b);
}

function monthsBetween(startMonth, endMonth) {
  const start = Number(startMonth);
  const end = Number(endMonth);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return [];
  const months = [];
  for (let month = start; month <= end; month += 1) months.push(month);
  return months;
}

function monthsAvailableForYear(year = selectedYear, category = selectedCategory) {
  const record = recordForYear(year, category);
  return [...new Set((record ? record.monthsList : []) || [])]
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}

function clampMonthRangeToAvailable(range, months) {
  const list = [...new Set((months || []).map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
  if (!list.length) return range ? { start: Number(range.start), end: Number(range.end) } : { start: 1, end: 12 };
  if (!range) return { start: list[0], end: list[list.length - 1] };
  const overlap = list.filter((month) => month >= Number(range.start) && month <= Number(range.end));
  if (!overlap.length) return { start: list[0], end: list[list.length - 1] };
  return { start: overlap[0], end: overlap[overlap.length - 1] };
}

function reconcileCustomMonthRangeForYear(year = selectedYear, category = selectedCategory) {
  if (!usesMonthCoverage() || isMonthGrain()) return;
  const months = monthsAvailableForYear(year, category);
  if (!months.length) return;
  if (customMonthRange) {
    const clamped = clampMonthRangeToAvailable(customMonthRange, months);
    customMonthRange = { start: clamped.start, end: clamped.end };
    draftMonthRange = { start: clamped.start, end: clamped.end };
    lastValidMonthRange = { start: clamped.start, end: clamped.end };
    return;
  }
  // No applied custom: popover draft must follow this year's default window
  // (e.g. 2026 → 1–5, then switch to 2025 → draft becomes 1–12, not leftover 1–5).
  const yearDefault = defaultRangeForRecord(recordForYear(year, category));
  draftMonthRange = { start: yearDefault.start, end: yearDefault.end };
  lastValidMonthRange = { start: yearDefault.start, end: yearDefault.end };
}

function aggregateRows(rows, category = selectedCategory) {
  const meta = activeMeta(category);
  if (meta.agg === "ratio") {
    const numerator = rows.reduce((sum, item) => sum + Number(item.numerator || 0), 0);
    const denominator = rows.reduce((sum, item) => sum + Number(item.denominator || 0), 0);
    return denominator > 0 ? numerator / denominator : 0;
  }
  return rows.reduce((sum, item) => sum + Number(item.value || 0), 0);
}

function valuesForYearRange(year, startMonth, endMonth, category = selectedCategory) {
  const series = currentSeries(category);
  const rows = series.monthly
    .filter((item) =>
      Number(item.year) === Number(year) &&
      Number(item.month) >= Number(startMonth) &&
      Number(item.month) <= Number(endMonth)
    )
    .sort((a, b) => a.month - b.month);
  return {
    value: aggregateRows(rows, category),
    months: rows.map((item) => Number(item.month)),
  };
}

function hasLocationData(row) {
  return row && row.hasData !== false && Number.isFinite(Number(row.value));
}

function defaultRangeForRecord(record) {
  if (!record) return { start: 1, end: 12 };
  const months = [...new Set((record.monthsList || []).map(Number).filter(Number.isFinite))]
    .sort((a, b) => a - b);
  if (months.length) {
    return {
      start: months[0],
      end: months[months.length - 1],
    };
  }
  return {
    start: 1,
    end: record.hasDecember ? 12 : Number(record.maxMonth || 12),
  };
}

function activeMonthRangeForYear(year, category = selectedCategory) {
  const record = recordForYear(year, category);
  if (!usesMonthCoverage()) return { start: 1, end: 12, isCustom: false };
  if (customMonthRange) return { ...customMonthRange, isCustom: true };
  return { ...defaultRangeForRecord(record), isCustom: false };
}

function averageRank(value, values) {
  const less = values.filter((item) => item < value - 1e-9).length;
  const equal = values.filter((item) => Math.abs(item - value) <= 1e-9).length;
  return less + 1 + (equal - 1) / 2;
}

function monthlyRowsForYear(year, category = selectedCategory) {
  const series = currentSeries(category);
  return ((series && series.monthly) || [])
    .filter((item) => Number(item.year) === Number(year))
    .map((item) => ({
      year: Number(item.year),
      month: Number(item.month),
      value: Number(item.value) || 0,
      label: `${Number(item.month)}月`,
      monthsList: [Number(item.month)],
      comparisonMonths: [Number(item.month)],
    }))
    .sort((a, b) => a.month - b.month);
}

function ensureSelectedMonth(year = selectedYear, category = selectedCategory) {
  const rows = monthlyRowsForYear(year, category);
  if (!rows.length) {
    selectedMonth = null;
    return null;
  }
  if (!rows.some((row) => Number(row.month) === Number(selectedMonth))) {
    selectedMonth = rows[rows.length - 1].month;
  }
  return selectedMonth;
}

function comparisonForMonthsInYear(year, category = selectedCategory) {
  ensureSelectedMonth(year, category);
  let rows = monthlyRowsForYear(year, category);
  if (!rows.length) {
    return {
      selected: null,
      selectedRecord: null,
      selectedDisplayMonths: [],
      startMonth: 1,
      cutoffMonth: 12,
      shortBasisLabel: "無資料",
      rows: [],
      values: [],
      mean: 0,
      category,
      grain: "month",
    };
  }
  const values = rows.map((row) => row.value);
  rows = rows.map((row) => {
    const rank = averageRank(row.value, values);
    const higher = values.filter((item) => item > row.value + 1e-9).length;
    const lower = values.filter((item) => item < row.value - 1e-9).length;
    return {
      ...row,
      rank,
      pr: rows.length === 1 ? 100 : 1 + (rank - 1) * 99 / (rows.length - 1),
      rankHigh: higher + 1,
      relativePosition: rows.length === 1 ? 100 : (lower / (rows.length - 1)) * 100,
    };
  });
  const selected = rows.find((row) => Number(row.month) === Number(selectedMonth)) || rows[rows.length - 1];
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    selected,
    selectedRecord: selected,
    selectedDisplayMonths: selected ? [selected.month] : [],
    startMonth: selected ? selected.month : 1,
    cutoffMonth: selected ? selected.month : 12,
    shortBasisLabel: selected ? `${selected.month}月` : "無資料",
    rows,
    values,
    mean,
    category,
    grain: "month",
  };
}

function comparisonForYear(year, category = selectedCategory) {
  const series = currentSeries(category);
  const selectedRecord = recordForYear(year, category);
  if (!selectedRecord) {
    return {
      selected: null,
      selectedRecord: null,
      selectedDisplayMonths: [],
      startMonth: 1,
      cutoffMonth: 12,
      shortBasisLabel: "無資料",
      rows: [],
      values: [],
      mean: 0,
      category,
    };
  }
  const range = activeMonthRangeForYear(year, category);
  const cutoffMonth = range.end;
  if (!usesMonthCoverage()) {
    let rows = series.records.map((record) => ({
      ...record,
      comparisonMonths: record.monthsList || [],
    })).filter((row) => row.comparisonMonths.length);
    const values = rows.map((row) => row.value);
    rows = rows.map((row) => {
      const rank = averageRank(row.value, values);
      const higher = values.filter((item) => item > row.value + 1e-9).length;
      const lower = values.filter((item) => item < row.value - 1e-9).length;
      return {
        ...row,
        rank,
        pr: rows.length === 1 ? 100 : 1 + (rank - 1) * 99 / (rows.length - 1),
        rankHigh: higher + 1,
        relativePosition: rows.length === 1 ? 100 : (lower / (rows.length - 1)) * 100,
      };
    });
    const selected = rows.find((row) => String(row.year) === String(year)) || rows[rows.length - 1];
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return {
      selected,
      selectedRecord,
      selectedDisplayMonths: selectedRecord.monthsList || [],
      startMonth: 1,
      cutoffMonth: 12,
      shortBasisLabel: "年度資料",
      rows,
      values,
      mean,
      category,
    };
  }
  // Badge shows this year's overlapping months under the applied / default window
  // (e.g. custom 1–12 on 2026 → 1–5), matching what the picker can offer.
  const selectedDisplayMonths = range.isCustom
    ? monthsInRange(selectedRecord.monthsList, range.start, range.end)
    : selectedRecord.monthsList;
  const effectiveMonths = selectedDisplayMonths;
  const isFullYearRange = !range.isCustom && range.start === 1 && range.end === 12;
  const shortBasisLabel = isFullYearRange
    ? "全年累積"
    : `${formatMonths(effectiveMonths.length ? effectiveMonths : monthsBetween(range.start, range.end))}累積`;
  let rows = series.records.map((record) => {
    const part = valuesForYearRange(record.year, range.start, range.end, category);
    return { ...record, value: part.value, comparisonMonths: part.months };
  }).filter((row) => {
    if (!row.comparisonMonths.length) return false;
    if (range.start === range.end) return row.comparisonMonths.includes(range.start);
    return row.comparisonMonths.includes(range.start) && row.comparisonMonths.includes(range.end);
  });

  if (!rows.length) {
    return {
      selected: null,
      selectedRecord,
      selectedDisplayMonths,
      startMonth: range.start,
      cutoffMonth,
      shortBasisLabel,
      rows: [],
      values: [],
      mean: 0,
      category,
    };
  }

  const values = rows.map((row) => row.value);
  rows = rows.map((row) => {
    const rank = averageRank(row.value, values);
    const pr = rows.length === 1 ? 100 : 1 + (rank - 1) * 99 / (rows.length - 1);
    const higher = values.filter((item) => item > row.value + 1e-9).length;
    const lower = values.filter((item) => item < row.value - 1e-9).length;
    const rankHigh = higher + 1;
    const relativePosition = rows.length === 1 ? 100 : (lower / (rows.length - 1)) * 100;
    return { ...row, rank, pr, rankHigh, relativePosition };
  });

  // Never fall back to another year: missing endpoints under the applied interval → no rank for this year.
  const selected = rows.find((row) => String(row.year) === String(year)) || null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { selected, selectedRecord, selectedDisplayMonths, startMonth: range.start, cutoffMonth, shortBasisLabel, rows, values, mean, category };
}

function locationRowsForSelectedYear() {
  const baseComparison = comparisonForYear(selectedYear, selectedCategory);
  if (isSolarChart()) {
    return (GA_DATA.rawCategories || []).map((location) => {
      const part = valuesForYearRange(selectedYear, baseComparison.startMonth, baseComparison.cutoffMonth, location);
      return {
        location,
        value: part.months.length ? part.value : null,
        comparisonMonths: part.months,
        hasData: part.months.length > 0,
      };
    });
  }
  if (isStreetlightChart() && GA_DATA.locationSeries) {
    return (GA_DATA.locations || [])
      .filter((location) => location !== GA_DATA.defaultLocation)
      .map((location) => {
        const series = GA_DATA.locationSeries[location] && GA_DATA.locationSeries[location][selectedCategory];
        const record = series && series.records
          ? series.records.find((item) => String(item.year) === String(selectedYear))
          : null;
        return record
          ? { location, value: Number(record.value || 0), comparisonMonths: record.monthsList || [], hasData: true }
          : { location, value: null, comparisonMonths: [], hasData: false };
      })
      .filter(Boolean);
  }
  return [];
}

function locationRankingComparison() {
  const baseComparison = comparisonForYear(selectedYear, selectedCategory);
  let rows = locationRowsForSelectedYear().filter(hasLocationData);
  if (!rows.length) return { ...baseComparison, selected: null, rows: [], values: [], mean: 0, rankingMode: "location" };
  const values = rows.map((row) => row.value);
  rows = rows.map((row) => {
    const rank = averageRank(row.value, values);
    const higher = values.filter((item) => item > row.value + 1e-9).length;
    const lower = values.filter((item) => item < row.value - 1e-9).length;
    return {
      ...row,
      year: selectedYear,
      rank,
      pr: rows.length === 1 ? 100 : 1 + (rank - 1) * 99 / (rows.length - 1),
      rankHigh: higher + 1,
      relativePosition: rows.length === 1 ? 100 : (lower / (rows.length - 1)) * 100,
    };
  });
  const selected = rows.find((row) => row.location === locationModeTarget()) || rows[0];
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    ...baseComparison,
    selected,
    selectedRecord: baseComparison.selectedRecord,
    selectedDisplayMonths: selected ? selected.comparisonMonths : baseComparison.selectedDisplayMonths,
    shortBasisLabel: "地點排名",
    rows,
    values,
    mean,
    category: selectedCategory,
    rankingMode: "location",
  };
}

function activeRankingComparison() {
  if (isMonthGrain()) return comparisonForMonthsInYear(selectedYear, selectedCategory);
  return usesLocationRanking() ? locationRankingComparison() : comparisonForYear(selectedYear);
}

function renderCoverageBadge(text) {
  if (!yearMonthsTop) return;
  yearMonthsTop.hidden = false;
  yearMonthsTop.classList.remove("ga-formula");
  yearMonthsTop.disabled = false;
  yearMonthsTop.removeAttribute("aria-disabled");
  yearMonthsTop.replaceChildren();
  yearMonthsTop.appendChild(document.createTextNode(text));
  const caret = document.createElement("span");
  caret.className = "ga-coverage-caret";
  caret.setAttribute("aria-hidden", "true");
  caret.textContent = "▾";
  yearMonthsTop.appendChild(caret);
}

function renderReplacementCoverageBadge(rangeMetrics) {
  if (!isReplacementChart()) return;
  setupReplacementDualBadge();
  syncReplacementDualBadgeLayout();
  const rangeEl = document.getElementById("replacementRangeLabel");
  const metricEl = document.getElementById("replacementMetricLabel");
  const campusEl = ensureReplacementScopeLabel();
  if (isStreetlightChart()) {
    if (rangeEl) rangeEl.textContent = rangeMetrics.rangeLabel;
    if (campusEl) {
      campusEl.hidden = false;
      campusEl.textContent = streetlightFocusScopeLabel();
    }
  } else {
    if (rangeEl) rangeEl.textContent = rangeMetrics.rangeLabel;
    if (campusEl) {
      campusEl.hidden = false;
      campusEl.textContent = "累積汰換";
    }
  }
  if (metricEl) metricEl.textContent = replacementRangeMetricDisplay(rangeMetrics).text;
  renderReplacementMetricOptions();
}

function streetlightFocusScopeLabel() {
  const loc = streetlightFocusLocation();
  if (loc === (GA_DATA.defaultLocation || "全校區")) return "全校汰換";
  const short = streetlightCampusShortLabel(loc);
  return `${short}校區汰換`;
}

function syncReplacementDualBadgeLayout() {
  const shell = coverageWrap && coverageWrap.querySelector(".ga-replacement-dual-badge");
  if (!shell) return;
  const left = document.getElementById("yearRangeTop");
  if (left) {
    const caret = left.querySelector(".ga-coverage-caret");
    const range = left.querySelector(".ga-coverage-range");
    // Desired order: "2025-2026 年▾" (caret after year, both menus right-aligned).
    if (caret && range) left.append(range, caret);
  }
}

function ensureReplacementScopeLabel() {
  if (!coverageWrap) return null;
  let el = document.getElementById("replacementScopeLabel");
  const shell = coverageWrap.querySelector(".ga-replacement-dual-badge");
  if (!shell) return el;
  if (el) {
    const rightBtn = shell.querySelector("#replacementMetricTop");
    if (rightBtn && el.nextElementSibling !== rightBtn) shell.insertBefore(el, rightBtn);
    return el;
  }
  const rightBtn = shell.querySelector("#replacementMetricTop");
  el = document.createElement("span");
  el.className = "ga-coverage-campus";
  el.id = "replacementScopeLabel";
  el.setAttribute("aria-hidden", "true");
  if (rightBtn) shell.insertBefore(el, rightBtn);
  else shell.appendChild(el);
  return el;
}

function replacementRangeMetricDisplay(metrics) {
  const compact = isCompactViewport();
  if (replacementRangeMetric === "qty") {
    return {
      text: compact
        ? `總計 ${fmt.format(metrics.cumulativeQty)} 盞`
        : `總計汰換 ${fmt.format(metrics.cumulativeQty)} 盞`,
    };
  }
  if (replacementRangeMetric === "avg") {
    if (!(metrics.cumulativeQty > 0) || metrics.avgSavingPerLamp == null) {
      return { text: compact ? "平均 --" : "平均每次節省 --" };
    }
    return {
      text: compact
        ? `平均 ${fmt.format(metrics.avgSavingPerLamp)} 瓦`
        : `平均每次節省 ${fmt.format(metrics.avgSavingPerLamp)} 瓦`,
    };
  }
  return {
    text: compact
      ? `總計 ${fmt.format(metrics.cumulativeSaving)} 瓦`
      : `總計節省 ${fmt.format(metrics.cumulativeSaving)} 瓦`,
  };
}

function renderReplacementMetricOptions() {
  const container = document.getElementById("replacementMetricOptions");
  if (!container) return;
  const options = [
    { key: "saving", label: "節省瓦數" },
    { key: "qty", label: "汰換數量" },
    { key: "avg", label: "平均節省" },
  ];
  container.replaceChildren();
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.classList.toggle("active", replacementRangeMetric === option.key);
    button.addEventListener("click", () => {
      replacementRangeMetric = option.key;
      closeReplacementMetricPopover();
      updateAll();
    });
    container.appendChild(button);
  });
}

function setupReplacementDualBadge() {
  if (!isReplacementChart() || !coverageWrap) return;
  yearRangeTop = document.getElementById("yearRangeTop");
  replacementMetricTop = document.getElementById("replacementMetricTop");
  replacementMetricPopover = document.getElementById("replacementMetricPopover");
  if (yearRangeTop && replacementMetricTop) return;

  const shell = document.createElement("div");
  shell.className = "ga-coverage ga-replacement-dual-badge";
  shell.setAttribute("role", "group");
  shell.setAttribute("aria-label", "年度範圍與區間指標");

  const leftBtn = document.createElement("button");
  leftBtn.type = "button";
  leftBtn.className = "ga-coverage-zone ga-coverage-zone-left";
  leftBtn.id = "yearRangeTop";
  leftBtn.setAttribute("aria-expanded", "false");
  leftBtn.setAttribute("aria-haspopup", "dialog");
  const leftCaret = document.createElement("span");
  leftCaret.className = "ga-coverage-caret";
  leftCaret.setAttribute("aria-hidden", "true");
  leftCaret.textContent = "▾";
  const rangeSpan = document.createElement("span");
  rangeSpan.className = "ga-coverage-range";
  rangeSpan.id = "replacementRangeLabel";
  leftBtn.append(rangeSpan, leftCaret);

  const campusSpan = document.createElement("span");
  campusSpan.className = "ga-coverage-campus";
  campusSpan.id = "replacementScopeLabel";
  campusSpan.setAttribute("aria-hidden", "true");
  campusSpan.hidden = true;

  const rightBtn = document.createElement("button");
  rightBtn.type = "button";
  rightBtn.className = "ga-coverage-zone ga-coverage-zone-right";
  rightBtn.id = "replacementMetricTop";
  rightBtn.setAttribute("aria-expanded", "false");
  rightBtn.setAttribute("aria-haspopup", "dialog");
  const metricSpan = document.createElement("span");
  metricSpan.className = "ga-coverage-saving";
  metricSpan.id = "replacementMetricLabel";
  const rightCaret = document.createElement("span");
  rightCaret.className = "ga-coverage-caret";
  rightCaret.setAttribute("aria-hidden", "true");
  rightCaret.textContent = "▾";
  rightBtn.append(metricSpan, rightCaret);

  shell.append(leftBtn, campusSpan, rightBtn);

  if (yearMonthsTop && yearMonthsTop.parentElement === coverageWrap) {
    yearMonthsTop.replaceWith(shell);
  } else if (!coverageWrap.querySelector(".ga-replacement-dual-badge")) {
    coverageWrap.prepend(shell);
  }

  if (!document.getElementById("replacementMetricPopover")) {
    const popover = document.createElement("div");
    popover.className = "ga-metric-popover";
    popover.id = "replacementMetricPopover";
    popover.hidden = true;
    popover.innerHTML = [
      '<div class="ga-month-title">選擇指標</div>',
      '<div class="ga-metric-options" id="replacementMetricOptions"></div>',
    ].join("");
    coverageWrap.appendChild(popover);
  }

  yearRangeTop = document.getElementById("yearRangeTop");
  replacementMetricTop = document.getElementById("replacementMetricTop");
  replacementMetricPopover = document.getElementById("replacementMetricPopover");
  bindReplacementDualBadgeEvents();
}

function bindReplacementDualBadgeEvents() {
  if (!yearRangeTop || yearRangeTop.dataset.bound === "1") return;
  yearRangeTop.dataset.bound = "1";
  yearRangeTop.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!canOpenMonthPopover()) return;
    if (monthPopoverPinned) {
      closeMonthPopover();
      return;
    }
    openMonthPopover({ pin: true });
  });
  yearRangeTop.addEventListener("mouseenter", () => {
    if (!prefersMonthPopoverHover() || !canOpenMonthPopover()) return;
    openMonthPopover({ pin: false });
  });
  yearRangeTop.addEventListener("mouseleave", () => {
    if (!prefersMonthPopoverHover()) return;
    scheduleCloseMonthPopover();
  });
  if (replacementMetricTop) {
    replacementMetricTop.addEventListener("click", (event) => {
      event.stopPropagation();
      if (replacementMetricPopoverPinned) {
        closeReplacementMetricPopover();
        return;
      }
      openReplacementMetricPopover({ pin: true });
    });
    replacementMetricTop.addEventListener("mouseenter", () => {
      if (!prefersMonthPopoverHover()) return;
      openReplacementMetricPopover({ pin: false });
    });
    replacementMetricTop.addEventListener("mouseleave", () => {
      if (!prefersMonthPopoverHover()) return;
      scheduleCloseReplacementMetricPopover();
    });
  }
  if (replacementMetricPopover) {
    replacementMetricPopover.addEventListener("click", (event) => event.stopPropagation());
    replacementMetricPopover.addEventListener("mouseenter", () => {
      clearMonthPopoverCloseTimer();
      clearReplacementMetricPopoverCloseTimer();
    });
    replacementMetricPopover.addEventListener("mouseleave", () => {
      if (!prefersMonthPopoverHover()) return;
      scheduleCloseReplacementMetricPopover();
    });
  }
}

function placeReplacementCoverageControl() {
  if (!isReplacementChart() || !coverageWrap) return;
  const anchor = document.getElementById("coverageAnchor");
  if (!anchor) return;
  if (coverageWrap.parentElement !== anchor) anchor.appendChild(coverageWrap);
  anchor.hidden = false;
  setupReplacementDualBadge();
}

function renderFormulaBadgeFor(category = selectedCategory) {
  if (!yearMonthsTop) return;
  const lines = activeFormulaLines(category);
  const html = activeFormulaHtml(category);
  if (!html && !lines.length) {
    yearMonthsTop.hidden = true;
    yearMonthsTop.classList.remove("ga-formula");
    yearMonthsTop.disabled = true;
    yearMonthsTop.setAttribute("aria-disabled", "true");
    yearMonthsTop.setAttribute("aria-expanded", "false");
    yearMonthsTop.innerHTML = "";
    if (monthPopover) monthPopover.hidden = true;
    return;
  }
  yearMonthsTop.hidden = false;
  yearMonthsTop.classList.add("ga-formula");
  yearMonthsTop.disabled = true;
  yearMonthsTop.setAttribute("aria-disabled", "true");
  yearMonthsTop.setAttribute("aria-expanded", "false");
  if (monthPopover) monthPopover.hidden = true;
  yearMonthsTop.innerHTML = [
    html || lines.map((line) => `<span class="ga-formula-line">${line}</span>`).join(""),
  ].join("");
}


function renderFormulaBadge() {
  renderFormulaBadgeFor(selectedCategory);
}


function streetlightFocusLocation() {
  if (!isStreetlightChart()) return selectedLocation || GA_DATA.defaultLocation || "全校區";
  return focusedCampus || GA_DATA.defaultLocation || "全校區";
}

function streetlightRowLocationKey(row) {
  if (!row) return GA_DATA.defaultLocation || "全校區";
  if (row.location === "全校" || row.location === (GA_DATA.defaultLocation || "全校區")) {
    return GA_DATA.defaultLocation || "全校區";
  }
  return row.location;
}

function isStreetlightFocusRow(row) {
  return streetlightRowLocationKey(row) === streetlightFocusLocation();
}

function selectStreetlightCampusFocus(locationKey, { fromDock = false } = {}) {
  if (!isStreetlightChart() || !locationKey) return;
  const next = String(locationKey);
  if (fromDock) campusPickedThisOpen = true;
  if (focusedCampus !== next) {
    focusedCampus = next;
    updateAll();
  } else {
    syncCampusDockUi();
  }
  // Touch / coarse pointer: close immediately (no stable :hover).
  // Fine pointer: keep panel while hovered; close on mouseleave via campusPickedThisOpen.
  if (fromDock && !prefersMonthPopoverHover()) {
    forceCloseCampusDockUi();
    return;
  }
  closeCampusDockPin();
  blurCampusDockFocus();
}

function blurCampusDockFocus() {
  const active = document.activeElement;
  if (active && campusDock && campusDock.contains(active) && typeof active.blur === "function") {
    active.blur();
  }
}

function setCampusDockClosing(on) {
  if (!campusDock) return;
  campusDock.classList.toggle("is-closing", Boolean(on));
}

function closeCampusDockPin() {
  if (!campusDock) return;
  campusDock.classList.remove("is-open");
  if (campusDockTrigger) campusDockTrigger.setAttribute("aria-expanded", "false");
}

/** Unpin + defeat :hover/:focus-within so mutex / Esc / outside always hide the panel. */
function forceCloseCampusDockUi() {
  if (!campusDock) return;
  campusPickedThisOpen = false;
  closeCampusDockPin();
  blurCampusDockFocus();
  setCampusDockClosing(true);
}

function syncCampusDockUi() {
  if (!campusDock) return;
  if (!isStreetlightChart()) {
    campusDock.hidden = true;
    closeCampusDockPin();
    setCampusDockClosing(false);
    return;
  }
  campusDock.hidden = false;
  const defaultLoc = GA_DATA.defaultLocation || "全校區";
  const focus = streetlightFocusLocation();
  if (campusDockCurrent) {
    campusDockCurrent.textContent = streetlightCampusShortLabel(
      focus === defaultLoc ? "全校" : focus
    );
  }
  if (!campusDockOptions) return;
  campusDockOptions.querySelectorAll("[data-campus]").forEach((button) => {
    const key = streetlightRowLocationKey({ location: button.dataset.campus });
    button.classList.toggle("is-active", key === focus);
    button.setAttribute("aria-selected", key === focus ? "true" : "false");
  });
}

function renderCampusDockOptions() {
  if (!campusDockOptions || !isStreetlightChart()) return;
  const defaultLoc = GA_DATA.defaultLocation || "全校區";
  const locations = Array.isArray(GA_DATA.locations) ? GA_DATA.locations : [];
  const ordered = [
    defaultLoc,
    ...locations.filter((location) => location && location !== defaultLoc),
  ];
  campusDockOptions.innerHTML = ordered.map((location) => {
    const label = streetlightCampusShortLabel(location === defaultLoc ? "全校" : location);
    const safe = String(location).replace(/"/g, "&quot;");
    return `<button type="button" role="option" class="ga-campus-dock-choice" data-campus="${safe}">${escapeText(label)}</button>`;
  }).join("");
  syncCampusDockUi();
}

function initCampusDock() {
  if (!campusDock || !campusDockTrigger || !campusDockPanel || !campusDockOptions) return;
  if (!isStreetlightChart()) {
    campusDock.hidden = true;
    return;
  }
  renderCampusDockOptions();
  campusDock.addEventListener("pointerenter", () => {
    setCampusDockClosing(false);
  });
  campusDock.addEventListener("mouseleave", () => {
    if (campusPickedThisOpen || campusDock.classList.contains("is-closing")) {
      campusPickedThisOpen = false;
      closeCampusDockPin();
      blurCampusDockFocus();
      setCampusDockClosing(true);
      return;
    }
    if (campusDock.classList.contains("is-open")) return;
    blurCampusDockFocus();
  });
  campusDockTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = !campusDock.classList.contains("is-open");
    closeMonthPopover();
    closeReplacementMetricPopover();
    if (willOpen) {
      campusPickedThisOpen = false;
      setCampusDockClosing(false);
      campusDock.classList.add("is-open");
      campusDockTrigger.setAttribute("aria-expanded", "true");
    } else {
      closeCampusDockPin();
    }
  });
  campusDockOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-campus]");
    if (!button) return;
    event.stopPropagation();
    selectStreetlightCampusFocus(button.dataset.campus, { fromDock: true });
  });
  campusDock.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}

function streetlightSeriesAt(location, category) {
  const loc = location || streetlightFocusLocation();
  return (GA_DATA.locationSeries && GA_DATA.locationSeries[loc] && GA_DATA.locationSeries[loc][category])
    || { records: [] };
}

function streetlightMetricAt(location, category, year = selectedYear) {
  const row = (streetlightSeriesAt(location, category).records || [])
    .find((item) => String(item.year) === String(year));
  return row ? Number(row.value || 0) : 0;
}

function streetlightFocusYearMetrics(year = selectedYear) {
  const loc = streetlightFocusLocation();
  const annualQty = streetlightMetricAt(loc, "年度汰換數量", year);
  const nonLedQty = streetlightMetricAt(loc, "非LED原舊燈具汰換量", year);
  return {
    annualSaving: streetlightMetricAt(loc, "累積節省瓦數", year),
    annualQty,
    avgSaving: streetlightMetricAt(loc, "平均節省瓦數", year),
    nonLedQty,
  };
}

function sumStreetlightMetricAt(location, category, start, end) {
  return (streetlightSeriesAt(location, category).records || []).reduce((total, row) => {
    const year = Number(row.year);
    if (year >= Number(start) && year <= Number(end)) return total + Number(row.value || 0);
    return total;
  }, 0);
}

function streetlightFocusRangeMetrics() {
  const range = activeReplacementYearRange();
  const loc = streetlightFocusLocation();
  const annualSaving = sumStreetlightMetricAt(loc, "累積節省瓦數", range.start, range.end);
  const cumulativeQty = sumStreetlightMetricAt(loc, "年度汰換數量", range.start, range.end);
  const dataYears = new Set((streetlightSeriesAt(loc, "累積節省瓦數").records || [])
    .map((row) => Number(row.year))
    .filter((year) => Number.isFinite(year) && year >= Number(range.start) && year <= Number(range.end)));
  const yearCount = Math.max(1, dataYears.size);
  return {
    range,
    rangeLabel: formatYearRange(range),
    annualSaving,
    averageSaving: annualSaving / yearCount,
    cumulativeSaving: annualSaving,
    cumulativeQty,
    avgSavingPerLamp: cumulativeQty > 0 ? annualSaving / cumulativeQty : null,
  };
}

function bindStreetlightCampusBarClicks(chartId, rows) {
  const chart = document.getElementById(chartId);
  if (!chart || !rows || !rows.length) return;
  chart.removeAllListeners?.("plotly_click");
  chart.style.cursor = "pointer";
  chart.on("plotly_click", (event) => {
    const point = event.points && event.points[0];
    if (!point) return;
    const idx = Number(point.pointIndex);
    const row = rows[idx];
    if (!row) return;
    selectStreetlightCampusFocus(streetlightRowLocationKey(row));
  });
}

function streetlightFocusChromeColor() {
  // Warm amber outline: selection chrome only — not a third data fill color.
  return "#e8a838";
}

function streetlightFocusLabelColor() {
  // Keep red for selected row numbers (same accent as 全校 / KPI emphasis).
  return "#b83248";
}

function streetlightSelectedBarAccent(yVals, selectedIdx, barWidth = 0.58) {
  if (!(selectedIdx >= 0) || !yVals.length) return [];
  const y0 = yVals[selectedIdx];
  const half = Math.max(0.22, Number(barWidth) / 2 + 0.02);
  return [{
    type: "line",
    xref: "paper",
    x0: 0,
    x1: 0,
    yref: "y",
    y0: y0 - half,
    y1: y0 + half,
    line: { color: streetlightFocusChromeColor(), width: 3 },
  }];
}

function streetlightBarIsHot(row, isYearSelected) {
  // Data encoding: 全校 stays red; year rows keep selected-year red; campus focus does not recolor.
  if (row && row.location != null) return row.location === "全校";
  return Boolean(isYearSelected);
}

function replacementRecords(category = selectedCategory) {
  return [...(currentSeries(category).records || [])]
    .filter((row) => Number.isFinite(Number(row.value)))
    .sort((a, b) => Number(a.year) - Number(b.year));
}

function replacementIsRatio(category = selectedCategory) {
  return activeMeta(category).agg === "ratio";
}

function replacementCumulativeRows(category = selectedCategory) {
  const rows = replacementRecords(category);
  let cumulative = 0;
  return rows.map((row) => {
    const value = Number(row.value || 0);
    if (replacementIsRatio(category)) {
      return { ...row, cumulative: value };
    }
    cumulative += value;
    return { ...row, cumulative };
  });
}

function setTextIfExists(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function setSmallMetric(elementId, value, unit) {
  const node = document.getElementById(elementId);
  if (node) node.textContent = `${fmt.format(value)} ${unit}`;
}

function replacementMetricValue(category, year = selectedYear) {
  const row = replacementRecords(category).find((item) => String(item.year) === String(year));
  return row ? Number(row.value || 0) : 0;
}

function replacementMetricCumulative(category, year = selectedYear) {
  let total = 0;
  replacementRecords(category).forEach((row) => {
    if (Number(row.year) <= Number(year)) total += Number(row.value || 0);
  });
  return total;
}

function replacementYears() {
  const years = new Set();
  (GA_DATA.categories || []).forEach((category) => replacementRecords(category).forEach((row) => years.add(Number(row.year))));
  return [...years].filter(Number.isFinite).sort((a, b) => a - b);
}

function availableReplacementRangeYears() {
  // Year range is independent of the highlight year (selectedYear).
  return replacementYears();
}

function defaultReplacementYearRange() {
  const years = availableReplacementRangeYears();
  if (!years.length) return { start: Number(selectedYear), end: Number(selectedYear), isCustom: false };
  return { start: years[0], end: years[years.length - 1], isCustom: false };
}

function activeReplacementYearRange() {
  const years = availableReplacementRangeYears();
  if (!years.length) return defaultReplacementYearRange();
  if (!customReplacementYearRange) return defaultReplacementYearRange();
  const startCandidates = years.filter((year) => year <= customReplacementYearRange.end);
  const start = startCandidates.includes(Number(customReplacementYearRange.start)) ? Number(customReplacementYearRange.start) : startCandidates[0];
  const endCandidates = years.filter((year) => year >= start);
  const end = endCandidates.includes(Number(customReplacementYearRange.end)) ? Number(customReplacementYearRange.end) : endCandidates[endCandidates.length - 1];
  return { start, end, isCustom: true };
}

function formatYearRange(range) {
  if (!range || range.start === range.end) return `${range ? range.end : selectedYear} 年`;
  return `${range.start}-${range.end} 年`;
}

function sumReplacementMetric(category, start, end) {
  return replacementRecords(category).reduce((total, row) => {
    const year = Number(row.year);
    if (year >= Number(start) && year <= Number(end)) return total + Number(row.value || 0);
    return total;
  }, 0);
}

function replacementRangeMetrics() {
  const range = activeReplacementYearRange();
  const annualSaving = sumReplacementMetric("累積節省瓦數", range.start, range.end);
  const cumulativeQty = sumReplacementMetric("年度汰換數量", range.start, range.end);
  const dataYears = new Set(replacementRecords("累積節省瓦數")
    .map((row) => Number(row.year))
    .filter((year) => Number.isFinite(year) && year >= Number(range.start) && year <= Number(range.end)));
  const yearCount = Math.max(1, dataYears.size);
  return {
    range,
    rangeLabel: formatYearRange(range),
    annualSaving,
    averageSaving: annualSaving / yearCount,
    cumulativeSaving: annualSaving,
    cumulativeQty,
    avgSavingPerLamp: cumulativeQty > 0 ? annualSaving / cumulativeQty : null,
  };
}

function replacementStructureRows() {
  return replacementYears().map((year) => {
    const qty = replacementMetricValue("年度汰換數量", year);
    const nonLed = replacementMetricValue("非LED原舊燈具汰換量", year);
    return { year, qty, nonLed, ledOld: Math.max(qty - nonLed, 0), nonLedShare: qty > 0 ? nonLed / qty * 100 : 0 };
  }).filter((row) => row.qty > 0 || row.nonLed > 0);
}

function replacementMetrics(year = selectedYear) {
  const annualQty = replacementMetricValue("年度汰換數量", year);
  const nonLedQty = replacementMetricValue("非LED原舊燈具汰換量", year);
  return {
    annualSaving: replacementMetricValue("累積節省瓦數", year),
    cumulativeSaving: replacementMetricCumulative("累積節省瓦數", year),
    annualQty,
    cumulativeQty: replacementMetricCumulative("年度汰換數量", year),
    avgSaving: replacementMetricValue("平均節省瓦數", year),
    improveRate: replacementMetricValue("節能改善率", year),
    nonLedQty,
    ledOldQty: Math.max(annualQty - nonLedQty, 0),
    nonLedShare: annualQty > 0 ? nonLedQty / annualQty * 100 : 0,
  };
}

function renderReplacementDom() {
  const rangeMetrics = isStreetlightChart()
    ? streetlightFocusRangeMetrics()
    : replacementRangeMetrics();
  const rankNumberEl = document.getElementById("rankNumber");
  const meanDiffEl = document.getElementById("meanDiff");
  const yearMetrics = isStreetlightChart()
    ? streetlightFocusYearMetrics(selectedYear)
    : replacementMetrics(selectedYear);
  const accent = "#d43f55";
  renderReplacementCoverageBadge(rangeMetrics);
  syncCampusDockUi();

  setTextIfExists("rankTitle", "節省瓦數");
  setTextIfExists("rankNumber", fmt.format(yearMetrics.annualSaving));
  if (isStreetlightChart()) {
    const focusLabel = streetlightCampusShortLabel(
      streetlightFocusLocation() === (GA_DATA.defaultLocation || "全校區")
        ? "全校"
        : streetlightFocusLocation()
    );
    setTextIfExists(
      "rankTotal",
      isCompactViewport()
        ? `瓦｜${selectedYear}｜${focusLabel}`
        : `瓦｜${selectedYear} 年｜${focusLabel}`,
    );
  } else {
    setTextIfExists(
      "rankTotal",
      isCompactViewport() ? `瓦｜${selectedYear}` : `瓦｜${selectedYear} 年`,
    );
  }
  if (rankNumberEl) rankNumberEl.style.color = accent;
  setTextIfExists("valueMiniLabel", "汰換數量");
  setSmallMetric("yearValue", yearMetrics.annualQty, "盞");
  setTextIfExists("secondaryMiniLabel", "平均每次節省");
  if (!(yearMetrics.annualQty > 0)) setTextIfExists("meanDiff", "--");
  else setSmallMetric("meanDiff", yearMetrics.avgSaving, "瓦");
  if (meanDiffEl) meanDiffEl.style.color = "";
}

function emptyReplacementLayout(message) {
  return {
    margin: { l: 64, r: 86, t: 18, b: 42 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#ffffff",
    annotations: [{ text: message, x: 0.5, y: 0.5, xref: "paper", yref: "paper", showarrow: false, font: { size: 13, color: "#64748b" } }],
    xaxis: { visible: false },
    yaxis: { visible: false },
    showlegend: false,
  };
}

function renderReplacementOverview() {
  if (isStreetlightChart()) {
    syncOverviewModeControls();
    if (overviewModeSwitch) {
      overviewModeSwitch.hidden = false;
      overviewModeSwitch.querySelectorAll("button").forEach((button) => {
        button.classList.toggle("active", button.dataset.overviewMode === overviewMode);
      });
    }
    if (overviewMode === "location") {
      renderReplacementLocationOverview();
      return;
    }
    renderReplacementStructureOverview();
    return;
  }
  if (overviewModeSwitch) overviewModeSwitch.hidden = true;
  renderReplacementStructureOverview();
}

function renderReplacementStructureOverview() {
  const rows = replacementStructureRows();
  if (overviewTitle) overviewTitle.textContent = "汰換量";
  if (overviewNote) overviewNote.hidden = true;
  if (overviewFootNote) overviewFootNote.hidden = true;
  if (!rows.length) {
    Plotly.react("overviewChart", [], emptyReplacementLayout("目前沒有汰換量資料"), { displayModeBar: false, responsive: true });
    return;
  }

  const selectedRows = rows.filter((row) => String(row.year) === String(selectedYear));
  const otherRows = rows.filter((row) => String(row.year) !== String(selectedYear)).sort((a, b) => Number(b.year) - Number(a.year));
  const sorted = [...selectedRows, ...otherRows];
  paintReplacementQtyShareBars({
    sorted,
    labels: sorted.map((row) => `${row.year} 年`),
    isSelected: (row) => String(row.year) === String(selectedYear),
    hoverLeft: (row) => `${row.year} 年`,
  });
}

function streetlightCampusShortLabel(location) {
  const raw = String(location || "");
  if (raw === "全校" || raw === (GA_DATA.defaultLocation || "全校區")) return "全校";
  return raw.replace(/校區$/, "");
}

function streetlightCampusBarYs(rows, mode = "qty") {
  // Lift 全校 slightly and add a small gap before campus ranking rows.
  // Compact: tighter step so the plot feels denser (less empty vertical air).
  // Desktop qty (left): roomier step; saving (right): original denser spacing.
  const hasTotalLead = Boolean(rows[0] && rows[0].location === "全校");
  const compact = isCompactViewport();
  const desktopRoomy = mode !== "saving";
  const step = compact ? 0.74 : (desktopRoomy ? 1.12 : 0.86);
  const leadGap = compact ? 0.18 : (desktopRoomy ? 0.30 : 0.28);
  const firstY = hasTotalLead ? (compact ? -0.2 : -0.28) : -0.1;
  return rows.map((_, idx) => {
    if (idx === 0) return firstY;
    return hasTotalLead ? idx * step + leadGap : idx * step;
  });
}

function streetlightCampusBarLeftMargin(labels) {
  const maxLabelChars = Math.max(...labels.map((label) => String(label).length), 2);
  // Tight fit for short campus names / "YYYY 年" — reclaim width for right-side labels.
  return Math.min(62, Math.max(40, maxLabelChars * 8 + 16));
}

function replacementCompactChartHeight(rowCount) {
  const n = Math.max(1, Number(rowCount) || 1);
  return Math.max(200, Math.min(300, 20 + n * 26));
}

function sizeReplacementCompactChart(elementId, rowCount) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (!isCompactViewport() || !isReplacementChart()) {
    el.style.removeProperty("height");
    return;
  }
  el.style.setProperty("height", `${replacementCompactChartHeight(rowCount)}px`, "important");
}

function replacementDualColumnLayout(labels, mode = "qty") {
  // Count right-aligns into a reserved mid band; share left-aligns after a clear gutter
  // and ends before the plot edge so "非LED占比" neither clips nor collides with 盞/瓦.
  // Compact: longer bars + columns shifted right; top band clear of title/chips.
  if (isCompactViewport()) {
    const leftMargin = Math.min(48, streetlightCampusBarLeftMargin(labels));
    if (mode === "saving") {
      return {
        leftMargin,
        rightMargin: 40,
        barDomainEnd: 0.54,
        countPaperX: 0.76,
        sharePaperX: 0.90,
        countAnchor: "right",
        shareAnchor: "left",
        tickStandoff: 4,
        headerFontSize: 9,
        valueFontSize: 10,
        valueFontSizeFocus: 10.5,
        tickFontSize: 11,
        barWidth: 0.5,
        topMargin: 10,
        bottomMargin: 8,
        yDomainEnd: 0.88,
        yPadTop: 0.28,
        yPadBottom: 0.62,
        headerPaperY: 0.92,
        countHeader: "總節省瓦數",
        shareHeader: "非LED占比",
        qtyCountHeader: "總汰換量",
        savingCountHeader: "總節省瓦數",
      };
    }
    return {
      leftMargin,
      rightMargin: 36,
      barDomainEnd: 0.56,
      countPaperX: 0.78,
      sharePaperX: 0.90,
      countAnchor: "right",
      shareAnchor: "left",
      tickStandoff: 4,
      headerFontSize: 9,
      valueFontSize: 11,
      valueFontSizeFocus: 11.5,
      tickFontSize: 11,
      barWidth: 0.5,
      topMargin: 10,
      bottomMargin: 8,
      yDomainEnd: 0.88,
      yPadTop: 0.28,
      yPadBottom: 0.62,
      headerPaperY: 0.92,
      countHeader: "總汰換量",
      shareHeader: "非LED占比",
      qtyCountHeader: "總汰換量",
      savingCountHeader: "總節省瓦數",
    };
  }
  return {
    leftMargin: streetlightCampusBarLeftMargin(labels),
    rightMargin: 12,
    barDomainEnd: 0.58,
    countPaperX: mode === "saving" ? 0.76 : 0.79,
    sharePaperX: mode === "saving" ? 0.815 : 0.845,
    countAnchor: "right",
    shareAnchor: "left",
    tickStandoff: 6,
    headerFontSize: 11,
    valueFontSize: 12,
    valueFontSizeFocus: 12.5,
    tickFontSize: 12,
    barWidth: mode === "saving" ? 0.58 : 0.92,
    topMargin: 16,
    bottomMargin: mode === "saving" ? 14 : 8,
    yDomainEnd: 0.885,
    // qty (left overview): taller plot + thicker bars; saving (right): pre-tweak spacing.
    yPadTop: mode === "saving" ? 0.46 : 0.08,
    yPadBottom: mode === "saving" ? 0.74 : 0.78,
    headerPaperY: 0.925,
    countHeader: "總汰換量",
    shareHeader: "非LED占比",
    qtyCountHeader: "總汰換量",
    savingCountHeader: "總節省瓦數",
  };
}

function paintReplacementQtyShareBars({ sorted, labels, isSelected, hoverLeft, enableCampusClick = false }) {
  const rowHasData = (row) => row.hasData !== false;
  const isTotalRow = (row) => row.location === "全校";
  const y = streetlightCampusBarYs(sorted, "qty");
  const selectedIdx = sorted.findIndex((row) => isSelected(row));
  const totals = sorted.map((row) => (rowHasData(row) ? Math.max(0, Number(row.qty || 0)) : 0));
  // Scale by campus rows only so 全校 does not dominate the length axis.
  const maxQty = Math.max(
    ...sorted.map((row, idx) => (isTotalRow(row) ? 0 : totals[idx])),
    1,
  );
  const shares = sorted.map((row) => (
    rowHasData(row) ? Math.max(0, Math.min(100, Number(row.nonLedShare || 0))) : 0
  ));
  const displayTotals = sorted.map((row, idx) => {
    if (!rowHasData(row)) return 0;
    // 全校: fixed full-width track; campuses: qty-proportional bars.
    if (isTotalRow(row)) return maxQty;
    const total = totals[idx];
    return total > 0 ? Math.max(total, maxQty * 0.035) : 0;
  });
  const displayNonLed = sorted.map((row, idx) => {
    if (!rowHasData(row)) return 0;
    const share = shares[idx];
    const total = displayTotals[idx];
    if (share <= 0 || total <= 0) return 0;
    const rawWidth = total * share / 100;
    const minStripe = maxQty * 0.014;
    return Math.min(total, Math.max(rawWidth, minStripe));
  });
  const layout = replacementDualColumnLayout(labels, "qty");
  const useFocusChrome = Boolean(enableCampusClick);
  const focusColor = streetlightFocusChromeColor();
  const labelColor = streetlightFocusLabelColor();
  sizeReplacementCompactChart("overviewChart", sorted.length);
  const countAnnotations = sorted.map((row, idx) => {
    const focused = isSelected(row);
    return {
      text: rowHasData(row) ? `${fmt.format(row.qty)} 盞` : "",
      x: layout.countPaperX,
      y: y[idx],
      xref: "paper",
      yref: "y",
      showarrow: false,
      xanchor: layout.countAnchor,
      yanchor: "middle",
      cliponaxis: false,
      font: {
        size: focused ? layout.valueFontSizeFocus : layout.valueFontSize,
        color: focused ? labelColor : "#253047",
      },
    };
  });
  const shareAnnotations = sorted.map((row, idx) => {
    const focused = isSelected(row);
    return {
      text: rowHasData(row) ? `${pctFmt.format(shares[idx])}%` : "",
      x: layout.sharePaperX,
    y: y[idx],
      xref: "paper",
    yref: "y",
    showarrow: false,
      xanchor: layout.shareAnchor,
    yanchor: "middle",
      cliponaxis: false,
      font: {
        size: focused ? layout.valueFontSizeFocus : layout.valueFontSize,
        color: focused ? labelColor : "#253047",
      },
    };
  });
  const columnHeaders = [
    {
      text: layout.qtyCountHeader,
      x: layout.countPaperX,
      y: layout.headerPaperY,
      xref: "paper",
      yref: "paper",
      showarrow: false,
      xanchor: layout.countAnchor,
      yanchor: "bottom",
      cliponaxis: false,
      font: { size: layout.headerFontSize, color: "#64748b" },
    },
    {
      text: layout.shareHeader,
      x: layout.sharePaperX,
      y: layout.headerPaperY,
      xref: "paper",
      yref: "paper",
      showarrow: false,
      xanchor: layout.shareAnchor,
      yanchor: "bottom",
      cliponaxis: false,
      font: { size: layout.headerFontSize, color: "#64748b" },
    },
  ];

  Plotly.react("overviewChart", [
    {
      type: "bar",
      orientation: "h",
      name: "年度總汰換量",
      x: displayTotals,
      y,
      width: sorted.map(() => layout.barWidth),
      marker: {
        color: sorted.map((row) => (rowHasData(row) ? "#e8eef6" : "rgba(0,0,0,0)")),
        line: {
          color: sorted.map((row) => (
            rowHasData(row)
              ? (useFocusChrome && isSelected(row) ? focusColor : "#ffffff")
              : "rgba(0,0,0,0)"
          )),
          width: sorted.map((row) => (useFocusChrome && isSelected(row) ? 2 : 1)),
        },
      },
      customdata: sorted.map((row) => [hoverLeft(row), row.qty, row.nonLed, row.ledOld, row.nonLedShare]),
      hovertemplate: sorted.map((row) => (
        rowHasData(row)
          ? (isCompactViewport()
            ? "%{customdata[0]}<br>汰換：%{customdata[1]:,.0f} 盞<br>非LED：%{customdata[2]:,.0f}<br>占比：%{customdata[4]:.1f}%<extra></extra>"
            : "%{customdata[0]}<br>總汰換量：%{customdata[1]:,.2f} 盞<br>非LED原燈具：%{customdata[2]:,.2f}<br>LED原燈具：%{customdata[3]:,.2f}<br>非LED占比：%{customdata[4]:.1f}%<extra></extra>")
          : "%{customdata[0]}<extra></extra>"
      )),
    },
    {
      type: "bar",
      orientation: "h",
      name: "非LED原燈具占比",
      x: displayNonLed,
      y,
      width: sorted.map(() => layout.barWidth),
      marker: {
        color: sorted.map((row) => (
          rowHasData(row) ? (streetlightBarIsHot(row, isSelected(row)) ? "#d43f55" : "#8fa1bb") : "rgba(0,0,0,0)"
        )),
        line: {
          color: sorted.map((row) => (
            rowHasData(row)
              ? (useFocusChrome && isSelected(row) ? focusColor : "#ffffff")
              : "rgba(0,0,0,0)"
          )),
          width: sorted.map((row) => (useFocusChrome && isSelected(row) ? 2 : 1)),
        },
      },
      hoverinfo: "skip",
    },
  ], {
    barmode: "overlay",
    margin: { l: layout.leftMargin, r: layout.rightMargin, t: layout.topMargin, b: layout.bottomMargin },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#ffffff",
    hovermode: "closest",
    hoverlabel: {
      align: "left",
      bgcolor: "rgba(255,255,255,0.96)",
      bordercolor: "#cbd5e1",
      font: { size: isCompactViewport() ? 11 : 12, color: "#101827" },
    },
    xaxis: {
      range: [0, maxQty * 1.04],
      domain: [0, layout.barDomainEnd],
      visible: false,
      fixedrange: true,
    },
    yaxis: {
      tickmode: "array",
      tickvals: y,
      ticktext: labels,
      range: [Math.max(...y) + layout.yPadTop, -layout.yPadBottom],
      domain: [0, layout.yDomainEnd],
      automargin: false,
      ticklabelstandoff: layout.tickStandoff,
      tickfont: { size: layout.tickFontSize, color: "#253047" },
      showgrid: false,
      zeroline: false,
      fixedrange: true,
    },
    shapes: useFocusChrome ? streetlightSelectedBarAccent(y, selectedIdx, layout.barWidth) : [],
    showlegend: false,
    annotations: [...columnHeaders, ...shareAnnotations, ...countAnnotations],
  }, { displayModeBar: false, responsive: true });
  const overview = document.getElementById("overviewChart");
  overview?.removeAllListeners?.("plotly_click");
  sizeReplacementCompactChart("overviewChart", sorted.length);
  if (enableCampusClick) bindStreetlightCampusBarClicks("overviewChart", sorted);
  // Flex-filled desktop height settles after layout; resize so bars expand into the leftover band.
  schedulePlotResize();
  window.requestAnimationFrame(() => {
    schedulePlotResize();
    try {
      if (overview) Plotly.Plots.resize(overview);
    } catch (_error) {
      /* plot may not be ready */
    }
  });
}

function streetlightLocationStructureRows() {
  const byLocation = GA_DATA.savingsAttributionByLocation || {};
  const defaultLoc = GA_DATA.defaultLocation;
  const buildRow = (location, order, displayLocation) => {
    const yearRow = (byLocation[location] || []).find((row) => String(row.year) === String(selectedYear));
    const qty = Number(yearRow?.qty || 0);
    const nonLed = Number(yearRow?.nonLedQty || 0);
    const nonLedShare = Number(yearRow?.nonLedShare || 0);
    const hasData = Boolean(yearRow) && (qty > 0 || nonLed > 0);
    return {
      location: displayLocation || location,
      order,
      hasData,
      qty: hasData ? qty : 0,
      nonLed: hasData ? nonLed : 0,
      ledOld: hasData ? Math.max(qty - nonLed, 0) : 0,
      nonLedShare: hasData && qty > 0 ? nonLedShare : 0,
    };
  };
  const campusRows = (GA_DATA.locations || [])
    .filter((location) => location && location !== defaultLoc)
    .map((location, order) => buildRow(location, order));
  const withData = campusRows.filter((row) => row.hasData).sort((a, b) => b.qty - a.qty);
  const withoutData = campusRows.filter((row) => !row.hasData).sort((a, b) => a.order - b.order);
  return [buildRow(defaultLoc, -1, "全校"), ...withData, ...withoutData];
}

function renderReplacementLocationOverview() {
  if (overviewNote) overviewNote.hidden = true;
  if (overviewFootNote) overviewFootNote.hidden = true;
  if (overviewTitle) overviewTitle.textContent = "汰換量";
  const rows = streetlightLocationStructureRows();
  if (!rows.length) {
    Plotly.react("overviewChart", [], emptyReplacementLayout("目前沒有校區資料"), { displayModeBar: false, responsive: true });
    return;
  }
  paintReplacementQtyShareBars({
    sorted: rows,
    labels: rows.map((row) => streetlightCampusShortLabel(row.location)),
    isSelected: (row) => isStreetlightFocusRow(row),
    hoverLeft: (row) => streetlightCampusShortLabel(row.location),
    enableCampusClick: true,
  });
}

function renderReplacementTrend() {
  clearTrendInteractions();
  if (trendToggles) trendToggles.hidden = true;
  if (isStreetlightChart()) {
    syncQualityModeControls();
    if (savingViewMode === "year") {
      renderYearSavingOverview();
      return;
    }
    renderStreetlightCampusSavingOverview();
    return;
  }
  if (qualityModeSwitch) qualityModeSwitch.hidden = true;
  renderYearSavingOverview();
}

function streetlightCampusSavingRows() {
  const byLocation = GA_DATA.savingsAttributionByLocation || {};
  const defaultLoc = GA_DATA.defaultLocation;
  const buildRow = (location, order, displayLocation) => {
    const yearRow = (byLocation[location] || []).find((row) => String(row.year) === String(selectedYear));
    const saving = Number(yearRow?.saving || 0);
    const nonLedSaving = Number(yearRow?.nonLedSaving || 0);
    const ledOriginSaving = Number(yearRow?.ledOriginSaving || 0);
    const nonLedSavingShare = Number(yearRow?.nonLedSavingShare || 0);
    const hasData = Boolean(yearRow) && saving > 0;
  return {
      location: displayLocation || location,
      order,
      hasData,
      saving: hasData ? saving : 0,
      nonLedSaving: hasData ? nonLedSaving : 0,
      ledOriginSaving: hasData ? ledOriginSaving : 0,
      nonLedSavingShare: hasData ? nonLedSavingShare : 0,
    };
  };
  const campusRows = (GA_DATA.locations || [])
    .filter((location) => location && location !== defaultLoc)
    .map((location, order) => buildRow(location, order));
  const withData = campusRows.filter((row) => row.hasData).sort((a, b) => b.saving - a.saving);
  const withoutData = campusRows.filter((row) => !row.hasData).sort((a, b) => a.order - b.order);
  return [buildRow(defaultLoc, -1, "全校"), ...withData, ...withoutData];
}

function yearSavingAttributionSource() {
  if (isStreetlightChart()) {
    const byLocation = GA_DATA.savingsAttributionByLocation || {};
    const key = GA_DATA.defaultLocation || "全校區";
    return byLocation[key] || byLocation["全校區"] || [];
  }
  return GA_DATA.savingsAttribution || [];
}

function yearSavingRows() {
  const rows = yearSavingAttributionSource()
    .map((row) => {
      const year = Number(row.year);
      const saving = Number(row.saving || 0);
      const nonLedSaving = Number(row.nonLedSaving || 0);
      const ledOriginSaving = Number(row.ledOriginSaving || 0);
      const nonLedSavingShare = Number(row.nonLedSavingShare || 0);
      const hasData = Number.isFinite(year) && saving > 0;
  return {
        year,
        hasData,
        saving: hasData ? saving : 0,
        nonLedSaving: hasData ? nonLedSaving : 0,
        ledOriginSaving: hasData ? ledOriginSaving : 0,
        nonLedSavingShare: hasData ? nonLedSavingShare : 0,
      };
    })
    .filter((row) => row.hasData);
  const selectedRows = rows.filter((row) => String(row.year) === String(selectedYear));
  const otherRows = rows
    .filter((row) => String(row.year) !== String(selectedYear))
    .sort((a, b) => Number(b.year) - Number(a.year));
  return [...selectedRows, ...otherRows];
}

function syncQualityModeControls() {
  if (!qualityModeSwitch) return;
  if (!isStreetlightChart()) {
    qualityModeSwitch.hidden = true;
    return;
  }
  if (!savingViewModeTouched) savingViewMode = "location";
  qualityModeSwitch.hidden = false;
  qualityModeSwitch.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.qualityMode === savingViewMode);
  });
}

function paintReplacementSavingShareBars({ sorted, labels, isSelected, hoverLeft, enableCampusClick = false }) {
  const rowHasData = (row) => row.hasData !== false;
  const isTotalRow = (row) => row.location === "全校";
  const y = streetlightCampusBarYs(sorted, "saving");
  const selectedIdx = sorted.findIndex((row) => isSelected(row));
  const totals = sorted.map((row) => (rowHasData(row) ? Math.max(0, Number(row.saving || 0)) : 0));
  const maxSaving = Math.max(
    ...sorted.map((row, idx) => (isTotalRow(row) ? 0 : totals[idx])),
    1,
  );
  const shares = sorted.map((row) => (
    rowHasData(row) ? Math.max(0, Math.min(100, Number(row.nonLedSavingShare || 0))) : 0
  ));
  const displayTotals = sorted.map((row, idx) => {
    if (!rowHasData(row)) return 0;
    if (isTotalRow(row)) return maxSaving;
    const total = totals[idx];
    return total > 0 ? Math.max(total, maxSaving * 0.035) : 0;
  });
  const displayNonLed = sorted.map((row, idx) => {
    if (!rowHasData(row)) return 0;
    const share = shares[idx];
    const total = displayTotals[idx];
    if (share <= 0 || total <= 0) return 0;
    const rawWidth = total * share / 100;
    const minStripe = maxSaving * 0.014;
    return Math.min(total, Math.max(rawWidth, minStripe));
  });
  const layout = replacementDualColumnLayout(labels, "saving");
  const useFocusChrome = Boolean(enableCampusClick);
  const focusColor = streetlightFocusChromeColor();
  const labelColor = streetlightFocusLabelColor();
  sizeReplacementCompactChart("trendChart", sorted.length);
  const countAnnotations = sorted.map((row, idx) => ({
    text: rowHasData(row) ? `${fmt.format(row.saving)} 瓦` : "",
    x: layout.countPaperX,
    y: y[idx],
    xref: "paper",
      yref: "y",
      showarrow: false,
    xanchor: layout.countAnchor,
    yanchor: "middle",
    cliponaxis: false,
    font: {
      size: isSelected(row) ? layout.valueFontSizeFocus : layout.valueFontSize,
      color: isSelected(row) ? labelColor : "#253047",
    },
  }));
  const shareAnnotations = sorted.map((row, idx) => ({
    text: rowHasData(row) ? `${pctFmt.format(shares[idx])}%` : "",
    x: layout.sharePaperX,
        y: y[idx],
    xref: "paper",
        yref: "y",
        showarrow: false,
    xanchor: layout.shareAnchor,
        yanchor: "middle",
    cliponaxis: false,
    font: {
      size: isSelected(row) ? layout.valueFontSizeFocus : layout.valueFontSize,
      color: isSelected(row) ? labelColor : "#253047",
    },
  }));
  const columnHeaders = [
    {
      text: layout.savingCountHeader,
      x: layout.countPaperX,
      y: layout.headerPaperY,
      xref: "paper",
      yref: "paper",
        showarrow: false,
      xanchor: layout.countAnchor,
      yanchor: "bottom",
      cliponaxis: false,
      font: { size: layout.headerFontSize, color: "#64748b" },
    },
    {
      text: layout.shareHeader,
      x: layout.sharePaperX,
      y: layout.headerPaperY,
      xref: "paper",
      yref: "paper",
      showarrow: false,
      xanchor: layout.shareAnchor,
      yanchor: "bottom",
      cliponaxis: false,
      font: { size: layout.headerFontSize, color: "#64748b" },
    },
  ];

  Plotly.react("trendChart", [
    {
      type: "bar",
      orientation: "h",
      name: "總節省瓦數",
      x: displayTotals,
      y,
      width: sorted.map(() => layout.barWidth),
      marker: {
        color: sorted.map((row) => (rowHasData(row) ? "#e8eef6" : "rgba(0,0,0,0)")),
        line: {
          color: sorted.map((row) => (
            rowHasData(row)
              ? (useFocusChrome && isSelected(row) ? focusColor : "#ffffff")
              : "rgba(0,0,0,0)"
          )),
          width: sorted.map((row) => (useFocusChrome && isSelected(row) ? 2 : 1)),
        },
      },
      customdata: sorted.map((row) => [
        hoverLeft(row),
        row.saving,
        row.nonLedSaving,
        row.ledOriginSaving,
        row.nonLedSavingShare,
      ]),
      hovertemplate: sorted.map((row) => (
        rowHasData(row)
          ? (isCompactViewport()
            ? "%{customdata[0]}<br>省瓦：%{customdata[1]:,.0f}<br>非LED：%{customdata[2]:,.0f}<br>占比：%{customdata[4]:.1f}%<extra></extra>"
            : "%{customdata[0]}<br>總節省瓦數：%{customdata[1]:,.0f} 瓦<br>非LED來源：%{customdata[2]:,.0f} 瓦<br>其他來源：%{customdata[3]:,.0f} 瓦<br>非LED占比：%{customdata[4]:.1f}%<extra></extra>")
          : "%{customdata[0]}<extra></extra>"
      )),
    },
    {
      type: "bar",
      orientation: "h",
      name: "非LED來源省瓦",
      x: displayNonLed,
      y,
      width: sorted.map(() => layout.barWidth),
      marker: {
        color: sorted.map((row) => (
          rowHasData(row) ? (streetlightBarIsHot(row, isSelected(row)) ? "#d43f55" : "#8fa1bb") : "rgba(0,0,0,0)"
        )),
        line: {
          color: sorted.map((row) => (
            rowHasData(row)
              ? (useFocusChrome && isSelected(row) ? focusColor : "#ffffff")
              : "rgba(0,0,0,0)"
          )),
          width: sorted.map((row) => (useFocusChrome && isSelected(row) ? 2 : 1)),
        },
      },
      hoverinfo: "skip",
    },
  ], {
    barmode: "overlay",
    margin: { l: layout.leftMargin, r: layout.rightMargin, t: layout.topMargin, b: layout.bottomMargin },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#ffffff",
    hovermode: "closest",
    hoverlabel: {
      align: "left",
      bgcolor: "rgba(255,255,255,0.96)",
      bordercolor: "#cbd5e1",
      font: { size: isCompactViewport() ? 11 : 12, color: "#101827" },
    },
    xaxis: {
      range: [0, maxSaving * 1.04],
      domain: [0, layout.barDomainEnd],
      visible: false,
      fixedrange: true,
    },
    yaxis: {
      tickmode: "array",
      tickvals: y,
      ticktext: labels,
      range: [Math.max(...y) + layout.yPadTop, -layout.yPadBottom],
      domain: [0, layout.yDomainEnd],
      automargin: false,
      ticklabelstandoff: layout.tickStandoff,
      tickfont: { size: layout.tickFontSize, color: "#253047" },
      showgrid: false,
      zeroline: false,
      fixedrange: true,
    },
    shapes: useFocusChrome ? streetlightSelectedBarAccent(y, selectedIdx, layout.barWidth) : [],
    showlegend: false,
    annotations: [...columnHeaders, ...shareAnnotations, ...countAnnotations],
  }, { displayModeBar: false, responsive: true });
  const trend = document.getElementById("trendChart");
  trend?.removeAllListeners?.("plotly_click");
  sizeReplacementCompactChart("trendChart", sorted.length);
  if (trend) Plotly.Plots.resize(trend);
  if (enableCampusClick) bindStreetlightCampusBarClicks("trendChart", sorted);
}

function renderStreetlightCampusSavingOverview() {
  if (qualityHead) {
    qualityHead.hidden = false;
    const title = qualityHead.querySelector("h2");
    if (title) title.textContent = "各校區節省瓦數";
  }
  if (qualityFormula) {
    qualityFormula.hidden = true;
    qualityFormula.innerHTML = "";
  }
  const rows = streetlightCampusSavingRows();
  if (!rows.length) {
    Plotly.react("trendChart", [], {
      margin: { l: 86, r: 12, t: 16, b: 18 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#ffffff",
      xaxis: { visible: false },
      yaxis: { visible: false },
      annotations: [{
        text: "目前沒有校區省瓦資料",
        x: 0.5,
        y: 0.5,
        xref: "paper",
        yref: "paper",
        showarrow: false,
        font: { size: 14, color: "#64748b" },
      }],
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
    return;
  }
  paintReplacementSavingShareBars({
    sorted: rows,
    labels: rows.map((row) => streetlightCampusShortLabel(row.location)),
    isSelected: (row) => isStreetlightFocusRow(row),
    hoverLeft: (row) => streetlightCampusShortLabel(row.location),
    enableCampusClick: true,
  });
}

function renderYearSavingOverview() {
  if (qualityHead) {
    qualityHead.hidden = false;
    const title = qualityHead.querySelector("h2");
    if (title) title.textContent = "歷年節省瓦數";
  }
  if (qualityFormula) {
    qualityFormula.hidden = true;
    qualityFormula.innerHTML = "";
  }
  const rows = yearSavingRows();
  if (!rows.length) {
    Plotly.react("trendChart", [], {
      margin: { l: 86, r: 12, t: 16, b: 18 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#ffffff",
      xaxis: { visible: false },
      yaxis: { visible: false },
      annotations: [{
        text: "目前沒有歷年省瓦資料",
        x: 0.5,
        y: 0.5,
        xref: "paper",
        yref: "paper",
        showarrow: false,
        font: { size: 14, color: "#64748b" },
      }],
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
    return;
  }
  paintReplacementSavingShareBars({
    sorted: rows,
    labels: rows.map((row) => `${row.year} 年`),
    isSelected: (row) => String(row.year) === String(selectedYear),
    hoverLeft: (row) => `${row.year} 年`,
  });
}

function friendlyThemeAccent() {
  return GA_DATA.themeAccent || "#8b5a96";
}

function friendlyCategoryEntries() {
  return Array.isArray(GA_DATA.categories) ? GA_DATA.categories : [];
}

function friendlyStyleForCategory(categoryId) {
  const entry = friendlyCategoryEntries().find((item) => (item.id || item) === categoryId);
  if (entry && typeof entry === "object") {
    return {
      color: entry.color || friendlyThemeAccent(),
      icon: entry.icon || "",
      label: entry.label || categoryId,
    };
  }
  return { color: friendlyThemeAccent(), icon: "", label: categoryId };
}

const FRIENDLY_ICON_SVG = {
  pad: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 2.5c1.8 0 3.2 1.3 3.2 3v5c0 1.7-1.4 3-3.2 3s-3.2-1.3-3.2-3v-5c0-1.7 1.4-3 3.2-3zm-4.8 3.2c-.9.5-1.4 1.3-1.4 2.3s.5 1.8 1.4 2.3l1.5.8V5.9l-1.5.8zm9.6 0l-1.5-.8v4.7l1.5.8c.9-.5 1.4-1.3 1.4-2.3s-.5-1.8-1.4-2.3z"/></svg>',
  bottle: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.2 1.2h3.6v1.8H9.2v1.1h2.1l.5 1.2v7.2c0 1-.8 1.8-1.8 1.8H6c-1 0-1.8-.8-1.8-1.8V5.3l.5-1.2h2.1V3H6.2V1.2zm1.6 5.2c-.5 0-.9.4-.9.9v2.2c0 .5.4.9.9.9s.9-.4.9-.9V7.3c0-.5-.4-.9-.9-.9z"/></svg>',
  parking: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M5 2.2h4.2c2.1 0 3.6 1.3 3.6 3.4S11.3 9 9.2 9H7.2v4.8H5V2.2zm2.2 2.1v2.6h1.8c.9 0 1.5-.5 1.5-1.3s-.6-1.3-1.5-1.3H7.2z"/></svg>',
};

function applyFriendlySymbol(el, { color, icon, planned = false } = {}) {
  if (!el) return;
  delete el.dataset.shape;
  el.innerHTML = "";
  if (icon === "toilet") {
    el.dataset.icon = "toilet";
    const glyph = document.createElement("span");
    glyph.className = "ga-friendly-symbol-mask";
    glyph.setAttribute("aria-hidden", "true");
    el.appendChild(glyph);
  } else if (icon && FRIENDLY_ICON_SVG[icon]) {
    el.dataset.icon = icon;
    el.innerHTML = FRIENDLY_ICON_SVG[icon];
  } else {
    delete el.dataset.icon;
  }
  const tone = color || "#64748b";
  if (planned || el.classList.contains("is-planned")) {
    el.style.background = "transparent";
    el.style.borderColor = tone;
    el.style.color = tone;
  } else {
    el.style.background = tone;
    el.style.color = "#fff";
  }
}

function friendlyItemsForCategory(category = selectedCategory) {
  return (GA_DATA.items || []).filter((item) => category === "all" || item.category === category);
}

function friendlyActiveItems(category = selectedCategory) {
  return friendlyItemsForCategory(category).filter((item) => item.status === "active");
}

function friendlyPlannedItems(category = selectedCategory) {
  return friendlyItemsForCategory(category).filter((item) => item.status === "planned");
}

function friendlyVisibleItems(category = selectedCategory) {
  return friendlyItemsForCategory(category).slice().sort((a, b) => {
    const statusCmp = String(a.status).localeCompare(String(b.status));
    if (statusCmp !== 0) return statusCmp;
    const campusCmp = String(a.campus).localeCompare(String(b.campus), "zh-Hant");
    if (campusCmp !== 0) return campusCmp;
    return String(a.location).localeCompare(String(b.location), "zh-Hant");
  });
}

function friendlyItemById(itemId) {
  return (GA_DATA.items || []).find((item) => item.id === itemId) || null;
}

function friendlyCoordKey(item) {
  if (!item) return "_unbound";
  return `${item.category}|${item.campus}|${item.location}`;
}

function isFriendlyPickMode() {
  try {
    return new URLSearchParams(window.location.search).get("pick") === "1";
  } catch (_) {
    return false;
  }
}

function friendlyMapPctFromEvent(event) {
  if (!friendlyMapEl) return null;
  const rect = friendlyMapEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const mapX = Number((((event.clientX - rect.left) / rect.width) * 100).toFixed(2));
  const mapY = Number((((event.clientY - rect.top) / rect.height) * 100).toFixed(2));
  return { mapX, mapY };
}

function ensureFriendlyPickMark() {
  if (!friendlyMapEl) return null;
  if (friendlyPickMarkEl && friendlyPickMarkEl.isConnected) return friendlyPickMarkEl;
  friendlyPickMarkEl = document.createElement("div");
  friendlyPickMarkEl.className = "ga-friendly-pick-mark";
  friendlyPickMarkEl.setAttribute("aria-hidden", "true");
  friendlyMapEl.appendChild(friendlyPickMarkEl);
  return friendlyPickMarkEl;
}

function updateFriendlyPickMark(mapX, mapY) {
  const mark = ensureFriendlyPickMark();
  if (!mark) return;
  mark.style.left = `${mapX}%`;
  mark.style.top = `${mapY}%`;
  mark.hidden = false;
}

function friendlyPickExportText() {
  const rows = friendlyPickRecords.filter((row) => row.key && row.key.includes("|"));
  if (!rows.length) return "";
  return rows.map((row) => `${row.key}: ${row.mapX}, ${row.mapY}`).join("\n");
}

function friendlyPickExportPayload() {
  const points = {};
  friendlyPickRecords.forEach((row) => {
    if (!row.key || !row.key.includes("|") || row.key.startsWith("_")) return;
    points[row.key] = { mapX: row.mapX, mapY: row.mapY };
  });
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    sourceUrl: String(window.location.href || ""),
    points,
  };
}

function setFriendlyPickSaveStatus(message, isError) {
  if (!friendlyPickSaveStatus) return;
  friendlyPickSaveStatus.hidden = !message;
  friendlyPickSaveStatus.textContent = message || "";
  friendlyPickSaveStatus.style.color = isError ? "#b91c1c" : "#166534";
}

async function saveFriendlyPickExport() {
  const payload = friendlyPickExportPayload();
  const keys = Object.keys(payload.points);
  if (!keys.length) {
    setFriendlyPickSaveStatus("列表為空：請先拖曳至少一顆綠釘。", true);
    return;
  }
  const jsonText = `${JSON.stringify(payload, null, 2)}\n`;
  const blob = new Blob([jsonText], { type: "application/json" });
  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: FRIENDLY_PICK_EXPORT_FILENAME,
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      setFriendlyPickSaveStatus(
        `已儲存 ${keys.length} 點。請確認檔案為 ${FRIENDLY_PICK_EXPORT_RELPATH}，然後請 Agent「讀取 pick export 並寫入」。`,
        false
      );
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") {
      setFriendlyPickSaveStatus("已取消儲存。", true);
      return;
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = FRIENDLY_PICK_EXPORT_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setFriendlyPickSaveStatus(
    `已下載 ${FRIENDLY_PICK_EXPORT_FILENAME}（${keys.length} 點）。請移到／覆寫專案內 ${FRIENDLY_PICK_EXPORT_RELPATH}，再請 Agent 讀取寫入。`,
    false
  );
}

function renderFriendlyPickPanel() {
  if (!isFriendlyPickMode() || !friendlyPickPanel) return;
  document.body.classList.add("is-pick-mode");
  friendlyPickPanel.hidden = false;
  const selected = friendlyItemById(friendlySelectedItemId);
  if (friendlyPickSelected) {
    friendlyPickSelected.textContent = selected
      ? friendlyCoordKey(selected)
      : "未選中（請拖曳綠釘）";
  }
  if (friendlyPickList) {
    friendlyPickList.innerHTML = "";
    friendlyPickRecords.forEach((row, index) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = `${row.key}: ${row.mapX}, ${row.mapY}`;
      const del = document.createElement("button");
      del.type = "button";
      del.textContent = "刪";
      del.addEventListener("click", (event) => {
        event.stopPropagation();
        friendlyPickRecords.splice(index, 1);
        renderFriendlyPickPanel();
      });
      li.appendChild(span);
      li.appendChild(del);
      friendlyPickList.appendChild(li);
    });
  }
}

function clearFriendlyPickPreview() {
  friendlyPickPreviewById.forEach((coords, itemId) => {
    const item = friendlyItemById(itemId);
    if (!item || !coords) return;
    if (Number.isFinite(coords.originalMapX)) item.mapX = coords.originalMapX;
    if (Number.isFinite(coords.originalMapY)) item.mapY = coords.originalMapY;
  });
  friendlyPickPreviewById.clear();
  renderFriendlySpacesMap();
  renderFriendlyPickPanel();
}

function recordFriendlyPickForItem(item, mapX, mapY) {
  if (!item || !item.category || !item.campus || !item.location) return;
  const key = friendlyCoordKey(item);
  if (!key.includes("|")) return;
  const existingIdx = friendlyPickRecords.findIndex((row) => row.key === key);
  const row = { key, mapX, mapY, itemId: item.id || null };
  if (existingIdx >= 0) friendlyPickRecords[existingIdx] = row;
  else friendlyPickRecords.push(row);
  if (friendlyPickLast) friendlyPickLast.textContent = `${mapX}, ${mapY}`;
  updateFriendlyPickMark(mapX, mapY);
  const prev = friendlyPickPreviewById.get(item.id);
  const originalMapX = prev && Number.isFinite(prev.originalMapX)
    ? prev.originalMapX
    : Number(item.mapX);
  const originalMapY = prev && Number.isFinite(prev.originalMapY)
    ? prev.originalMapY
    : Number(item.mapY);
  friendlyPickPreviewById.set(item.id, {
    mapX,
    mapY,
    originalMapX,
    originalMapY,
  });
  item.mapX = mapX;
  item.mapY = mapY;
  friendlySelectedItemId = item.id;
  updateFriendlyTip(item);
  renderFriendlyPickPanel();
}

function bindFriendlyMarkerPickDrag(btn, item) {
  if (!isFriendlyPickMode() || !btn || !item) return;
  btn.addEventListener("pointerdown", (event) => {
    if (!isFriendlyPickMode()) return;
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    friendlySelectedItemId = item.id;
    renderFriendlyPickPanel();
    updateFriendlyTip(item);
    friendlyPickDragState = {
      itemId: item.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      btn,
    };
    try { btn.setPointerCapture(event.pointerId); } catch (_) {}
  });
}

function onFriendlyPickPointerMove(event) {
  const state = friendlyPickDragState;
  if (!state || state.pointerId !== event.pointerId) return;
  const dx = event.clientX - state.startX;
  const dy = event.clientY - state.startY;
  if (!state.dragging) {
    if ((dx * dx + dy * dy) < (FRIENDLY_PICK_DRAG_THRESHOLD_PX * FRIENDLY_PICK_DRAG_THRESHOLD_PX)) return;
    state.dragging = true;
    if (state.btn) state.btn.classList.add("is-dragging");
  }
  const pct = friendlyMapPctFromEvent(event);
  if (!pct || !state.btn) return;
  state.btn.style.left = `${pct.mapX}%`;
  state.btn.style.top = `${pct.mapY}%`;
  updateFriendlyPickMark(pct.mapX, pct.mapY);
  if (friendlyTip && !friendlyTip.hidden) {
    friendlyTip.style.left = `${pct.mapX}%`;
    friendlyTip.style.top = `${pct.mapY}%`;
  }
  state.lastMapX = pct.mapX;
  state.lastMapY = pct.mapY;
}

function onFriendlyPickPointerUp(event) {
  const state = friendlyPickDragState;
  if (!state || state.pointerId !== event.pointerId) return;
  friendlyPickDragState = null;
  if (state.btn) {
    state.btn.classList.remove("is-dragging");
    try { state.btn.releasePointerCapture(event.pointerId); } catch (_) {}
  }
  const item = friendlyItemById(state.itemId);
  if (!item) return;
  if (state.dragging && Number.isFinite(state.lastMapX) && Number.isFinite(state.lastMapY)) {
    recordFriendlyPickForItem(item, state.lastMapX, state.lastMapY);
    renderFriendlySpacesMap();
    return;
  }
  /* Short press: select this pin (do not toggle off if already selected in pointerdown). */
  friendlySelectedItemId = item.id;
  updateFriendlyTip(item);
  renderFriendlySpacesMap();
  renderFriendlyPickPanel();
}

function bindFriendlyPickModeOnce() {
  if (friendlyPickModeBound || !isFriendlyPickMode()) return;
  friendlyPickModeBound = true;
  document.body.classList.add("is-pick-mode");
  if (friendlyPickPanel) friendlyPickPanel.hidden = false;
  renderFriendlyPickPanel();
  document.addEventListener("pointermove", onFriendlyPickPointerMove);
  document.addEventListener("pointerup", onFriendlyPickPointerUp);
  document.addEventListener("pointercancel", onFriendlyPickPointerUp);
  if (friendlyMapEl) {
    friendlyMapEl.addEventListener("click", (event) => {
      if (!isFriendlyPickMode()) return;
      if (event.target.closest(".ga-friendly-marker")) return;
      if (event.target.closest(".ga-friendly-map-legend")) return;
      if (event.target.closest(".ga-friendly-pick-panel")) return;
      /* Blank map: no unbound records. Optional red-mark preview only. */
      const pct = friendlyMapPctFromEvent(event);
      if (!pct) return;
      event.stopPropagation();
      updateFriendlyPickMark(pct.mapX, pct.mapY);
      if (friendlyPickLast) friendlyPickLast.textContent = `${pct.mapX}, ${pct.mapY}（未綁定，不進列表）`;
    });
  }
  if (friendlyPickSaveBtn) {
    friendlyPickSaveBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await saveFriendlyPickExport();
    });
  }
  if (friendlyPickCopyBtn) {
    friendlyPickCopyBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      const text = friendlyPickExportText();
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        friendlyPickCopyBtn.textContent = "已複製";
        window.setTimeout(() => { friendlyPickCopyBtn.textContent = "複製全部"; }, 1200);
      } catch (_) {
        window.prompt("複製以下文字：", text);
      }
    });
  }
  if (friendlyPickClearPreviewBtn) {
    friendlyPickClearPreviewBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      clearFriendlyPickPreview();
    });
  }
  if (friendlyPickClearListBtn) {
    friendlyPickClearListBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      friendlyPickRecords.length = 0;
      if (friendlyPickLast) friendlyPickLast.textContent = "—";
      if (friendlyPickMarkEl) friendlyPickMarkEl.hidden = true;
      setFriendlyPickSaveStatus("", false);
      renderFriendlyPickPanel();
    });
  }
  if (friendlyPickClearSelectBtn) {
    friendlyPickClearSelectBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      friendlySelectedItemId = null;
      updateFriendlyTip(null);
      renderFriendlySpacesMap();
      renderFriendlyPickPanel();
    });
  }
}

function friendlyCampusZoneEntries() {
  return Array.isArray(GA_DATA.campusZones) ? GA_DATA.campusZones : [];
}

function friendlyCampusZoneById(campusId) {
  return friendlyCampusZoneEntries().find((zone) => zone.id === campusId) || null;
}

function syncFriendlyCampusSelect() {
  if (!friendlyCampusSelect) return;
  const next = friendlySelectedCampus || "";
  if (friendlyCampusSelect.value !== next) friendlyCampusSelect.value = next;
}

function populateFriendlyCampusSelect() {
  if (!friendlyCampusSelect || !friendlyCampusControl) return;
  const campuses = Array.isArray(GA_DATA.campuses) && GA_DATA.campuses.length
    ? GA_DATA.campuses
    : friendlyCampusZoneEntries().map((zone) => zone.id);
  friendlyCampusSelect.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = "全部校區";
  friendlyCampusSelect.appendChild(allOpt);
  campuses.forEach((campus) => {
    const id = String(campus || "").trim();
    if (!id) return;
    const opt = document.createElement("option");
    opt.value = id;
    const zone = friendlyCampusZoneById(id);
    opt.textContent = (zone && zone.label) || `${id}校區`;
    friendlyCampusSelect.appendChild(opt);
  });
  syncFriendlyCampusSelect();
}

function bindFriendlyCampusSelectOnce() {
  if (friendlyCampusSelectBound || !friendlyCampusSelect) return;
  friendlyCampusSelectBound = true;
  friendlyCampusSelect.addEventListener("change", () => {
    const value = String(friendlyCampusSelect.value || "").trim();
    if (!value) {
      clearFriendlyCampusSelection();
      return;
    }
    if (value && value === friendlySelectedCampus && friendlyCampusPanelDismissed) {
      friendlyCampusPanelDismissed = false;
      renderFriendlySpacesMap();
      return;
    }
    selectFriendlyCampus(value);
  });
}

function clearFriendlyCampusSelection() {
  friendlyCampusPanelDismissed = false;
  friendlySelectedCampus = null;
  friendlySelectedItemId = null;
  updateFriendlyTip(null);
  syncFriendlyCampusSelect();
  renderFriendlySpaces();
}

function selectFriendlyCampus(campusId) {
  if (!campusId) {
    clearFriendlyCampusSelection();
    return;
  }
  friendlyCampusPanelDismissed = false;
  friendlySelectedCampus = campusId;
  friendlySelectedItemId = null;
  updateFriendlyTip(null);
  syncFriendlyCampusSelect();
  renderFriendlySpaces();
}

function dismissFriendlyCampusPanel() {
  friendlyCampusPanelDismissed = true;
  friendlyCampusPanelCollapsed = true;
  friendlyCampusPanelPinned = false;
  friendlySelectedItemId = null;
  updateFriendlyTip(null);
  renderFriendlyCampusPanel();
  renderFriendlySpacesMap();
}

function pinFriendlyCampusPanel() {
  friendlyCampusPanelDismissed = false;
  friendlyCampusPanelPinned = true;
  friendlyCampusPanelCollapsed = false;
  if (friendlyCampusPanel) friendlyCampusPanel.classList.add("is-pinned");
  renderFriendlyCampusPanel();
}

function unpinFriendlyCampusPanel() {
  friendlyCampusPanelPinned = false;
  friendlyCampusPanelCollapsed = true;
  if (friendlyCampusPanel) friendlyCampusPanel.classList.remove("is-pinned");
  renderFriendlyCampusPanel();
}

/** Head click: pin open, or unpin+collapse if already pinned. */
function toggleFriendlyCampusPanelCollapsed() {
  if (friendlyCampusPanelDismissed || !friendlyCampusPanelPinned) {
    pinFriendlyCampusPanel();
    return;
  }
  unpinFriendlyCampusPanel();
}

function prefersFriendlyCampusPanelHover() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function openFriendlyCampusPanelFromHover() {
  if (friendlyCampusPanelDismissed) friendlyCampusPanelDismissed = false;
  if (!friendlyCampusPanelCollapsed) return;
  friendlyCampusPanelCollapsed = false;
  renderFriendlyCampusPanel();
}

function closeFriendlyCampusPanelFromHover() {
  if (friendlyCampusPanelPinned) return;
  if (friendlyCampusPanelCollapsed) return;
  friendlyCampusPanelCollapsed = true;
  renderFriendlyCampusPanel();
}

function bindFriendlyMapShellOnce() {
  if (friendlyMapShellBound || !friendlyMapShell) return;
  friendlyMapShellBound = true;
  friendlyMapShell.addEventListener("click", (event) => {
    if (event.target.closest(".ga-friendly-marker")) return;
    if (event.target.closest(".ga-friendly-map-legend")) return;
    if (event.target.closest(".ga-friendly-campus-panel")) return;
    if (event.target.closest(".ga-friendly-pick-panel")) return;
    /* Pick mode: blank-map clicks are handled by #friendlyMap; do not clear selection. */
    if (isFriendlyPickMode()) return;
    if (!friendlySelectedItemId && !friendlySelectedCampus) return;
    if (friendlySelectedItemId && !friendlySelectedCampus) {
      friendlySelectedItemId = null;
      updateFriendlyTip(null);
      renderFriendlySpacesMap();
      return;
    }
    /* Keep campus filter when clicking map blank; only clear pin tip selection. */
    if (friendlySelectedItemId) {
      friendlySelectedItemId = null;
      updateFriendlyTip(null);
      renderFriendlySpacesMap();
    }
  });
  const panelHead = friendlyCampusPanel && friendlyCampusPanel.querySelector(".ga-friendly-campus-panel-head");
  if (panelHead) {
    panelHead.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFriendlyCampusPanelCollapsed();
    });
  }
  if (friendlyCampusPanel) {
    friendlyCampusPanel.addEventListener("pointerenter", () => {
      if (!prefersFriendlyCampusPanelHover()) return;
      openFriendlyCampusPanelFromHover();
    });
    friendlyCampusPanel.addEventListener("pointerleave", () => {
      if (!prefersFriendlyCampusPanelHover()) return;
      closeFriendlyCampusPanelFromHover();
    });
  }
}

function bindFriendlyCampusKeysOnce() {
  if (friendlyCampusKeysBound) return;
  friendlyCampusKeysBound = true;
  document.addEventListener("click", (event) => {
    if (!isFriendlySpacesChart()) return;
    if (!friendlyCampusPanelPinned) return;
    if (event.target.closest("#friendlyCampusPanel")) return;
    unpinFriendlyCampusPanel();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isFriendlySpacesChart()) return;
    if (isFriendlyPickMode() && friendlySelectedItemId) {
      friendlySelectedItemId = null;
      updateFriendlyTip(null);
      renderFriendlySpacesMap();
      renderFriendlyPickPanel();
      return;
    }
    const isCollapsed = friendlyCampusPanelCollapsed || friendlyCampusPanelDismissed;
    if (isCollapsed && !friendlySelectedItemId && !friendlyCampusPanelPinned) return;
    if (isCollapsed && friendlySelectedItemId) {
      friendlySelectedItemId = null;
      updateFriendlyTip(null);
      renderFriendlySpacesMap();
      return;
    }
    dismissFriendlyCampusPanel();
  });
}

function updateFriendlyTip(item) {
  if (!friendlyTip || !friendlyTipTitle || !friendlyTipMeta) return;
  if (!item) {
    friendlyTip.hidden = true;
    friendlyTipTitle.textContent = "";
    friendlyTipMeta.textContent = "";
    return;
  }
  const qtyText = item.status === "planned"
    ? (item.quantity > 0 ? `${fmt.format(item.quantity)} 處 · 規劃中` : "規劃中")
    : `${fmt.format(item.quantity)} 處`;
  friendlyTipTitle.textContent = item.location;
  friendlyTipMeta.textContent = [item.campus, item.categoryLabel, qtyText].filter(Boolean).join(" · ");
  const preview = friendlyPickPreviewById.get(item.id);
  const tipX = preview ? preview.mapX : item.mapX;
  const tipY = preview ? preview.mapY : item.mapY;
  friendlyTip.style.left = `${Number(tipX) || 50}%`;
  friendlyTip.style.top = `${Number(tipY) || 50}%`;
  friendlyTip.hidden = false;
}

function selectFriendlyItem(itemId) {
  friendlySelectedItemId = friendlySelectedItemId === itemId ? null : itemId;
  if (friendlySelectedItemId) {
    updateFriendlyTip(friendlyItemById(friendlySelectedItemId));
  } else {
    updateFriendlyTip(null);
  }
  renderFriendlySpacesMap();
  if (isFriendlyPickMode()) renderFriendlyPickPanel();
}

function renderFriendlyCategoryChips() {
  if (!categoryChips || !isFriendlySpacesChart()) {
    if (categoryChips) categoryChips.hidden = true;
    return;
  }
  categoryChips.hidden = false;
  categoryChips.setAttribute("aria-label", "選擇設施類型");
  categoryChips.innerHTML = "";
  friendlyCategoryEntries().forEach((entry) => {
    const category = entry.id || entry;
    const label = entry.label || entry;
    const style = friendlyStyleForCategory(category);
    const active = category === selectedCategory;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `ga-category-chip${active ? " is-active" : ""}`;
    btn.dataset.category = category;
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", active ? "true" : "false");
    btn.textContent = label;
    if (active) {
      btn.style.background = style.color;
      btn.style.color = "#fff";
      btn.style.borderColor = "transparent";
      btn.style.boxShadow = `0 4px 10px ${hexToRgba(style.color, 0.22)}`;
    }
    btn.addEventListener("click", () => {
      if (category === selectedCategory) return;
      friendlySelectedItemId = null;
      selectCategoryFocus(category);
    });
    categoryChips.appendChild(btn);
  });
  categoryChips.scrollLeft = 0;
}

function updateFriendlySummary() {
  if (friendlySummary) friendlySummary.hidden = true;
}

function renderFriendlyCampusPanel() {
  if (!friendlyCampusPanel || !friendlyCampusPanelBody || !friendlyCampusPanelTitle) return;
  const isCollapsed = friendlyCampusPanelCollapsed || friendlyCampusPanelDismissed;
  const zone = friendlySelectedCampus ? friendlyCampusZoneById(friendlySelectedCampus) : null;
  const campusLabel = friendlySelectedCampus
    ? ((zone && zone.label) || `${friendlySelectedCampus}校區`)
    : "全部校區";
  friendlyCampusPanel.hidden = false;
  friendlyCampusPanel.classList.toggle("is-collapsed", isCollapsed);
  friendlyCampusPanel.classList.toggle("is-pinned", friendlyCampusPanelPinned && !isCollapsed);
  friendlyCampusPanelTitle.textContent = campusLabel;
  if (friendlyCampusPanelToggle) {
    friendlyCampusPanelToggle.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
    friendlyCampusPanelToggle.setAttribute(
      "aria-label",
      isCollapsed ? "展開校區資訊" : "收合校區資訊"
    );
  }

  const typeEntries = friendlyCategoryEntries().filter((entry) => (entry.id || entry) !== "all");
  const campusItems = friendlySelectedCampus
    ? (GA_DATA.items || []).filter((item) => item.campus === friendlySelectedCampus)
    : (GA_DATA.items || []);
  let rows = typeEntries.map((entry) => {
    const id = entry.id;
    const active = campusItems.filter((item) => item.category === id && item.status === "active").length;
    const planned = campusItems.filter((item) => item.category === id && item.status === "planned").length;
    return { id, label: entry.label || id, active, planned, style: friendlyStyleForCategory(id) };
  });
  if (selectedCategory && selectedCategory !== "all") {
    rows = [
      ...rows.filter((row) => row.id === selectedCategory),
      ...rows.filter((row) => row.id !== selectedCategory),
    ];
  }

  friendlyCampusPanelBody.innerHTML = "";
  rows.forEach((row) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ga-friendly-campus-panel-row" + (row.id === selectedCategory ? " is-focus" : "");
    const swatch = document.createElement("span");
    swatch.className = "ga-friendly-legend-swatch";
    applyFriendlySymbol(swatch, { color: row.style.color, icon: row.style.icon });
    const label = document.createElement("span");
    label.className = "ga-friendly-campus-panel-label";
    label.textContent = row.label;
    const count = document.createElement("span");
    count.className = "ga-friendly-campus-panel-count";
    count.textContent = `${row.active} 處`;
    btn.appendChild(swatch);
    btn.appendChild(label);
    btn.appendChild(count);
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (row.id === selectedCategory) return;
      friendlySelectedItemId = null;
      selectCategoryFocus(row.id);
    });
    friendlyCampusPanelBody.appendChild(btn);
  });

  const scopedItems = (selectedCategory && selectedCategory !== "all")
    ? campusItems.filter((item) => item.category === selectedCategory)
    : campusItems;
  const activeTotal = scopedItems.filter((item) => item.status === "active").length;
  const plannedTotal = scopedItems.filter((item) => item.status === "planned").length;
  const fillCampusMeta = (el) => {
    if (!el) return;
    el.textContent = "";
    const active = document.createElement("span");
    active.className = "is-active";
    active.textContent = `已啟用 ${activeTotal} 處`;
    el.appendChild(active);
    if (plannedTotal) {
      const sep = document.createElement("span");
      sep.className = "is-sep";
      sep.textContent = " · ";
      const planned = document.createElement("span");
      planned.className = "is-planned";
      planned.textContent = `規劃中 ${plannedTotal} 處`;
      el.appendChild(sep);
      el.appendChild(planned);
    }
  };
  fillCampusMeta(friendlyCampusPanelMeta);
  fillCampusMeta(friendlyCampusPanelHeadMeta);
}

function renderFriendlyMapLegend() {
  if (!friendlyMapLegend) return;
  const allEntries = friendlyCategoryEntries().filter((entry) => (entry.id || entry) !== "all");
  const entries = selectedCategory === "all"
    ? allEntries
    : allEntries.filter((entry) => (entry.id || entry) === selectedCategory);
  const campusItems = friendlySelectedCampus
    ? (GA_DATA.items || []).filter((item) => item.campus === friendlySelectedCampus)
    : (GA_DATA.items || []);
  const campusLabel = friendlySelectedCampus
    ? ((friendlyCampusZoneById(friendlySelectedCampus) || {}).label || `${friendlySelectedCampus}校區`)
    : "全部校區";
  const scopedItems = selectedCategory === "all"
    ? campusItems
    : campusItems.filter((item) => item.category === selectedCategory);
  const plannedTotal = scopedItems.filter((item) => item.status === "planned").length;
  const campusPlannedTotal = campusItems.filter((item) => item.status === "planned").length;
  friendlyMapLegend.innerHTML = "";
  const title = document.createElement("h3");
  title.textContent = campusLabel;
  friendlyMapLegend.appendChild(title);
  entries.forEach((entry) => {
    const style = friendlyStyleForCategory(entry.id);
    const row = document.createElement("div");
    row.className = "ga-friendly-legend-row";
    const swatch = document.createElement("span");
    swatch.className = "ga-friendly-legend-swatch";
    applyFriendlySymbol(swatch, { color: style.color, icon: style.icon });
    const label = document.createElement("span");
    label.className = "ga-friendly-legend-label";
    label.textContent = entry.label || entry.id;
    const count = document.createElement("span");
    count.className = "ga-friendly-legend-count";
    count.textContent = String(
      campusItems.filter((item) => item.category === entry.id && item.status === "active").length
    );
    row.appendChild(swatch);
    row.appendChild(label);
    row.appendChild(count);
    friendlyMapLegend.appendChild(row);
  });
  if (plannedTotal > 0) {
    const plannedRow = document.createElement("div");
    plannedRow.className = "ga-friendly-legend-row";
    const plannedSwatch = document.createElement("span");
    plannedSwatch.className = "ga-friendly-legend-swatch is-planned";
    applyFriendlySymbol(plannedSwatch, { color: "#64748b", planned: true });
    const plannedLabel = document.createElement("span");
    plannedLabel.className = "ga-friendly-legend-label";
    plannedLabel.textContent = "規劃中";
    const plannedCount = document.createElement("span");
    plannedCount.className = "ga-friendly-legend-count";
    plannedCount.textContent = String(plannedTotal);
    plannedRow.appendChild(plannedSwatch);
    plannedRow.appendChild(plannedLabel);
    plannedRow.appendChild(plannedCount);
    friendlyMapLegend.appendChild(plannedRow);
  }
  const targetRows = allEntries.length + (campusPlannedTotal > 0 ? 1 : 0);
  let rowCount = entries.length + (plannedTotal > 0 ? 1 : 0);
  while (rowCount < targetRows) {
    const spacer = document.createElement("div");
    spacer.className = "ga-friendly-legend-row is-spacer";
    spacer.setAttribute("aria-hidden", "true");
    const swatch = document.createElement("span");
    swatch.className = "ga-friendly-legend-swatch";
    spacer.appendChild(swatch);
    friendlyMapLegend.appendChild(spacer);
    rowCount += 1;
  }
}

function friendlyBasemapFileForMode() {
  return isFriendlyPickMode() ? FRIENDLY_BASEMAP_FULL_SRC : FRIENDLY_BASEMAP_DISPLAY_SRC;
}

function syncFriendlyBasemapSrc() {
  if (!friendlyBasemap) return false;
  const next = friendlyBasemapFileForMode();
  const current = friendlyBasemap.getAttribute("src") || "";
  const nextName = next.split("/").pop();
  if (current === next || current.endsWith(nextName)) return false;
  friendlyBasemapReadyPromise = null;
  friendlyBasemap.setAttribute("src", next);
  return true;
}

function whenFriendlyBasemapReady() {
  if (!friendlyBasemap) return Promise.resolve();
  if (friendlyBasemap.complete && friendlyBasemap.naturalWidth > 0) {
    return Promise.resolve();
  }
  if (!friendlyBasemapReadyPromise) {
    friendlyBasemapReadyPromise = new Promise((resolve) => {
      const done = () => {
        friendlyBasemap.removeEventListener("load", done);
        friendlyBasemap.removeEventListener("error", done);
        resolve();
      };
      friendlyBasemap.addEventListener("load", done);
      friendlyBasemap.addEventListener("error", done);
    }).finally(() => {
      friendlyBasemapReadyPromise = null;
    });
  }
  return friendlyBasemapReadyPromise;
}

function paintFriendlySpaceMarkers(items) {
  if (!friendlyMarkers) return;
  friendlyMarkers.innerHTML = "";
  items.forEach((item) => {
    const style = friendlyStyleForCategory(item.category);
    const planned = item.status === "planned";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ga-friendly-marker" + (planned ? " is-planned" : "");
    if (item.id && item.id === friendlySelectedItemId) btn.classList.add("is-selected");
    if (friendlySelectedCampus && item.campus !== friendlySelectedCampus) btn.classList.add("is-dimmed");
    btn.dataset.itemId = item.id || "";
    btn.title = `${item.categoryLabel || ""} · ${item.campus} · ${item.location}`;
    btn.setAttribute("aria-label", btn.title);
    const preview = friendlyPickPreviewById.get(item.id);
    const mapX = preview ? preview.mapX : item.mapX;
    const mapY = preview ? preview.mapY : item.mapY;
    btn.style.left = `${Number(mapX) || 50}%`;
    btn.style.top = `${Number(mapY) || 50}%`;
    applyFriendlySymbol(btn, { color: style.color, icon: style.icon, planned });
    if (isFriendlyPickMode()) {
      bindFriendlyMarkerPickDrag(btn, item);
    } else {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        selectFriendlyItem(item.id);
      });
    }
    btn.addEventListener("mouseenter", () => {
      if (friendlySelectedItemId) return;
      if (friendlyPickDragState) return;
      updateFriendlyTip(item);
    });
    btn.addEventListener("mouseleave", () => {
      if (friendlySelectedItemId) return;
      if (friendlyPickDragState) return;
      updateFriendlyTip(null);
    });
    friendlyMarkers.appendChild(btn);
  });
  updateFriendlyTip(friendlyItemById(friendlySelectedItemId));
  if (isFriendlyPickMode()) renderFriendlyPickPanel();
}

function renderFriendlySpacesMap() {
  if (!friendlyMapCard || !friendlyMarkers) return;
  bindFriendlyMapShellOnce();
  bindFriendlyCampusKeysOnce();
  bindFriendlyPickModeOnce();
  friendlyMapCard.hidden = false;
  if (friendlyMapCredit) {
    friendlyMapCredit.textContent = GA_DATA.basemapCredit || "國立成功大學校園平面圖";
  }
  renderFriendlyMapLegend();
  renderFriendlyCampusPanel();
  syncFriendlyBasemapSrc();
  const items = friendlyVisibleItems();
  const token = ++friendlyBasemapPaintToken;
  const basemapPending = Boolean(
    friendlyBasemap && !(friendlyBasemap.complete && friendlyBasemap.naturalWidth > 0)
  );
  if (basemapPending) {
    friendlyMarkers.innerHTML = "";
    friendlyMarkers.classList.add("is-awaiting-basemap");
    if (friendlyMapEl) friendlyMapEl.classList.add("is-basemap-loading");
  }
  whenFriendlyBasemapReady().then(() => {
    if (token !== friendlyBasemapPaintToken) return;
    friendlyMarkers.classList.remove("is-awaiting-basemap");
    if (friendlyMapEl) friendlyMapEl.classList.remove("is-basemap-loading");
    paintFriendlySpaceMarkers(items);
    schedulePortalLayoutNotify();
  });
}

function paintFriendlySpacesCampusBars() {
  renderFriendlySpacesMap();
}

function renderFriendlySpaces() {
  renderFriendlyCategoryChips();
  updateFriendlySummary();
  syncFriendlyCampusSelect();
  renderFriendlySpacesMap();
}

function initFriendlySpacesSelect() {
  selectedCategory = GA_DATA.defaultCategory || "all";
  friendlySelectedCampus = null;
  friendlySelectedItemId = null;
  friendlyCampusPanelDismissed = false;
  friendlyCampusPanelCollapsed = true;
  visibleTrendCategories = new Set([selectedCategory]);
  syncFriendlyBasemapSrc();
  if (locationControl) locationControl.hidden = true;
  if (categoryControl) categoryControl.hidden = true;
  if (metricSwitch) metricSwitch.hidden = true;
  if (yearControl) yearControl.hidden = true;
  if (timeGrainSwitch) timeGrainSwitch.hidden = true;
  if (qualityHead) qualityHead.hidden = true;
  if (friendlySummary) friendlySummary.hidden = true;
  if (friendlyMapCard) friendlyMapCard.hidden = false;
  if (friendlyCampusControl) friendlyCampusControl.hidden = false;
  populateFriendlyCampusSelect();
  bindFriendlyCampusSelectOnce();
  renderFriendlyCategoryChips();
}

function updateDom() {
  if (isFriendlySpacesChart()) {
    renderFriendlySpaces();
    return;
  }
  if (isReplacementChart()) {
    renderReplacementDom();
    return;
  }
  const comparison = activeRankingComparison();
  const row = comparison.selected;
  const rankingUnit = usesLocationRanking() ? locationAxisName() : (isMonthGrain() ? "月" : "年");
  setTextIfExists("rankTitle", usesLocationRanking()
    ? `${locationAxisName()}排名-${activeValueNoun()}`
    : isMonthGrain()
      ? `月份排名-${activeValueNoun()}`
    : `歷史排名-${activeValueNoun()}`);
  if (!row) {
    setTextIfExists("rankNumber", "--");
    setTextIfExists("rankTotal", `/ 共 ${comparison.rows.length} ${rankingUnit}`);
    setTextIfExists("valueMiniLabel", activeValueNoun());
    setTextIfExists("yearValue", "--");
    if (isMonthGrain()) renderCoverageBadge("選擇月份 無資料");
    else if (usesMonthCoverage()) {
      // Keep applied custom interval visible even when this year has no overlap.
      const customLabel = comparison.selectedDisplayMonths && comparison.selectedDisplayMonths.length
        ? formatMonths(comparison.selectedDisplayMonths)
        : (customMonthRange ? formatMonths(monthsBetween(customMonthRange.start, customMonthRange.end)) : "無資料");
      renderCoverageBadge(`比較區間 ${customLabel}`);
    } else renderFormulaBadge();
    setTextIfExists("meanDiff", "--");
    const rankFillEmpty = document.getElementById("rankFill");
    if (rankFillEmpty) rankFillEmpty.style.width = "0%";
    const rankPinEmpty = document.getElementById("rankPin");
    if (rankPinEmpty) rankPinEmpty.style.left = "0%";
    setTextIfExists("rankHint", "目前篩選條件沒有可比較資料。");
    return;
  }
  const position = Math.round(row.relativePosition);
  const width = Math.max(5, Math.min(100, row.relativePosition));
  const diffPct = comparison.mean === 0 ? 0 : ((row.value - comparison.mean) / comparison.mean) * 100;
  const direction = diffPct >= 0 ? "高於" : "低於";
  const selectedColor = colorForPosition(row.relativePosition);

  setTextIfExists("rankNumber", row.rankHigh);
  const rankNumberEl = document.getElementById("rankNumber");
  if (rankNumberEl) rankNumberEl.style.color = selectedColor;
  setTextIfExists("rankTotal", `/ 共 ${comparison.rows.length} ${rankingUnit}`);
  setTextIfExists("valueMiniLabel", activeValueNoun());
  setMiniValue(row.value, activeUnit());
  if (isMonthGrain()) renderCoverageBadge(`選擇月份 ${formatMonths(comparison.selectedDisplayMonths)}`);
  else if (usesMonthCoverage()) renderCoverageBadge(`比較區間 ${formatMonths(comparison.selectedDisplayMonths)}`);
  else renderFormulaBadge();
  setTextIfExists("meanDiff", `${direction} ${pctFmt.format(Math.abs(diffPct))}%`);
  const meanDiffEl = document.getElementById("meanDiff");
  if (meanDiffEl) meanDiffEl.style.color = selectedColor;
  const rankFill = document.getElementById("rankFill");
  if (rankFill) rankFill.style.width = `${width}%`;
  if (rankFill) rankFill.style.backgroundSize = `${10000 / Math.max(width, 0.001)}% 100%`;
  const rankPin = document.getElementById("rankPin");
  if (rankPin) rankPin.style.left = `${Math.min(100, Math.max(0, width))}%`;
  setTextIfExists("rankHint",
    isMonthGrain()
      ? `${selectedYear}年${row.month}月｜${fmt.format(row.value)} ${activeUnit()}｜第 ${row.rankHigh} / 共 ${comparison.rows.length} 月`
      : `${fmt.format(row.value)} ${activeUnit()}｜第 ${row.rankHigh} / 共 ${comparison.rows.length} ${rankingUnit}`);
}

function setMiniValue(value, unit) {
  const container = document.getElementById("yearValue");
  if (!container) return;
  container.innerHTML = "";
  const number = document.createElement("span");
  number.className = "ga-value-number";
  number.textContent = fmt.format(value);
  const unitEl = document.createElement("span");
  unitEl.className = "ga-value-unit";
  unitEl.textContent = unit;
  container.appendChild(number);
  container.appendChild(unitEl);
  requestAnimationFrame(() => fitMiniValueUnit(container, unitEl));
}

function fitMiniValueUnit(container, unitEl) {
  unitEl.style.fontSize = "";
  let size = parseFloat(getComputedStyle(unitEl).fontSize);
  while (container.scrollWidth > container.clientWidth && size > 9) {
    size -= 1;
    unitEl.style.fontSize = `${size}px`;
  }
}

const CATEGORY_COLORS = ["#d43f55", "#2563eb", "#0f766e", "#b45309", "#7c3aed", "#0891b2", "#ca8a04"];
const CATEGORY_COLOR_MAP = {
  "ECOCO": "#d43f55",
  "寶特瓶": "#2563eb",
  "鋁罐": "#0f766e",
  "PP杯": "#b45309",
  "電池": "#7c3aed",
  "牛奶瓶": "#0891b2",
  "機台數": "#ca8a04",
  "用水量": "#2563eb",
  "用電量": "#0f766e",
  "水費": "#b45309",
  "電費": "#b45309",
  "每度成本": "#0f766e",
};

function parseHexRgb(hex) {
  const raw = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16)];
}

function colorDistance(hexA, hexB) {
  const a = parseHexRgb(hexA);
  const b = parseHexRgb(hexB);
  if (!a || !b) return 999;
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}

function avoidMeanLineColorConflict(color) {
  return colorDistance(color, MEAN_LINE_COLOR) < 72 ? "#ca8a04" : color;
}

function categoryColor(category) {
  const base = CATEGORY_COLOR_MAP[category]
    || (() => {
  const list = hasCategoryControl() ? GA_DATA.categories : [GA_DATA.metric];
  const idx = Math.max(0, list.indexOf(category));
  return CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
    })();
  return avoidMeanLineColorConflict(base);
}

function hexToRgba(hex, alpha) {
  const raw = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return `rgba(31, 75, 153, ${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function selectCategoryFocus(category) {
  if (isFriendlySpacesChart()) {
    selectedCategory = category;
    friendlySelectedItemId = null;
    renderFriendlyCategoryChips();
    updateAll();
    return;
  }
  selectedCategory = category;
  // Dual-metric: top switch sets which line stays bright; secondary resets to dim.
  visibleTrendCategories = new Set([selectedCategory]);
  // Streetlight keeps campus/year overview choice; other charts return to year bars.
  if (!isStreetlightChart()) overviewMode = "bar";
  // Keep applied comparison interval across metric/category switches (water, electricity, ECOCO).
  if (categorySelect && !categorySelect.hidden) categorySelect.value = selectedCategory;
  renderCategoryChips();
  renderMetricSwitch();
  populateYearSelect();
  if (isMonthGrain()) ensureSelectedMonth();
  else reconcileCustomMonthRangeForYear(selectedYear);
  updateAll();
}

function selectYearFocus(year) {
  const next = String(year);
  if (!next || next === "undefined" || next === "null") return;
  if (!Number.isFinite(Number(next))) return;
  if (String(selectedYear) === next) return;
  if (yearSelect && yearSelect.options.length) {
    const allowed = [...yearSelect.options].some((opt) => String(opt.value) === next);
    if (!allowed) return;
  }
  selectedYear = next;
  if (yearSelect) yearSelect.value = selectedYear;
  if (isMonthGrain()) {
    selectedMonth = null;
    ensureSelectedMonth();
  } else {
    reconcileCustomMonthRangeForYear(selectedYear);
  }
  updateAll();
}

function renderMetricSwitch() {
  if (!metricSwitch || !usesMetricSwitch() || !hasCategoryControl()) {
    if (metricSwitch) metricSwitch.hidden = true;
    return;
  }
  metricSwitch.hidden = false;
  metricSwitch.innerHTML = "";
  (GA_DATA.categories || []).forEach((category) => {
    const color = categoryColor(category);
    const active = category === selectedCategory;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.metric = category;
    button.textContent = categoryDisplayName(category);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    if (active) {
      button.style.background = color;
      button.style.color = "#ffffff";
      button.style.boxShadow = `0 4px 12px ${hexToRgba(color, 0.28)}`;
    } else {
      button.style.background = "transparent";
      button.style.color = color;
      button.style.boxShadow = "";
    }
    button.addEventListener("click", () => {
      if (category === selectedCategory) return;
      selectCategoryFocus(category);
    });
    metricSwitch.appendChild(button);
  });
}

function bindAggregatePieCategoryClick() {
  const overview = document.getElementById("overviewChart");
  if (!overview) return;
  overview.removeAllListeners?.("plotly_click");
  overview.style.cursor = "pointer";
  overview.on("plotly_click", (event) => {
    const point = event.points && event.points[0];
    if (!point) return;
    const category = String(point.label || "");
    if (!category || !(GA_DATA.rawCategories || []).includes(category)) return;
    if (category === selectedCategory) return;
    selectCategoryFocus(category);
  });
}

function renderCategoryChips() {
  if (!categoryChips || !usesCategoryChips() || !hasCategoryControl()) {
    if (categoryChips) categoryChips.hidden = true;
    return;
  }
  categoryChips.hidden = false;
  categoryChips.setAttribute("aria-label", GA_DATA.categoryLabel || "選擇類別");
  categoryChips.innerHTML = "";
  GA_DATA.categories.forEach((category) => {
    const active = category === selectedCategory;
    const color = categoryColor(category);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ga-category-chip";
    if (isParentCategory(category)) btn.classList.add("is-parent");
    if (active) btn.classList.add("is-active");
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", active ? "true" : "false");
    btn.dataset.category = category;
    btn.textContent = categoryDisplayName(category);
    if (active) {
      btn.style.background = color;
      btn.style.color = "#fff";
      btn.style.borderColor = "transparent";
      btn.style.boxShadow = `0 6px 16px ${hexToRgba(color, 0.28)}`;
    } else {
      btn.style.background = "";
      btn.style.color = "";
      btn.style.borderColor = "";
      btn.style.boxShadow = "";
      btn.style.opacity = "";
    }
    btn.addEventListener("click", () => {
      if (category === selectedCategory) return;
      selectCategoryFocus(category);
    });
    categoryChips.appendChild(btn);
  });
  notifyPortalLayoutNow();
}

function trendLineLegendIcon() {
  return '<svg class="ga-trend-line-icon" viewBox="0 0 26 12" aria-hidden="true"><line x1="1.5" y1="6" x2="24.5" y2="6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"></line><circle cx="13" cy="6" r="3.1" fill="#ffffff" stroke="currentColor" stroke-width="2"></circle></svg>';
}

function renderTrendToggles() {
  if (usesDualMetricTrend()) {
    if (!trendToggles) return;
    visibleTrendCategories.add(selectedCategory);
    trendToggles.hidden = false;
    trendToggles.innerHTML = "";
    (GA_DATA.categories || []).forEach((category) => {
      const bright = visibleTrendCategories.has(category);
      const locked = category === selectedCategory;
      const color = categoryColor(category);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `ga-icon-toggle${bright ? " active" : ""}`;
      btn.style.color = color;
      btn.title = locked ? "目前指標（維持亮線）" : (bright ? "切換為淡線" : "切換為亮線");
      btn.innerHTML = `${trendLineLegendIcon()}<span>${escapeText(categoryDisplayName(category))}</span>`;
      btn.addEventListener("click", () => {
        if (category === selectedCategory) return;
        if (visibleTrendCategories.has(category)) {
          visibleTrendCategories.delete(category);
        } else {
          visibleTrendCategories.add(category);
        }
        visibleTrendCategories.add(selectedCategory);
        renderTrendToggles();
        renderTrend();
      });
      trendToggles.appendChild(btn);
    });
    notifyPortalLayoutNow();
    return;
  }
  if (!hasTrendToggles()) {
    trendToggles.hidden = true;
    return;
  }
  trendToggles.hidden = false;
  trendToggles.innerHTML = "";
  GA_DATA.categories.forEach((category) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `ga-icon-toggle${visibleTrendCategories.has(category) ? " active" : ""}`;
    btn.style.color = categoryColor(category);
    btn.innerHTML = `${trendLineLegendIcon()}<span>${escapeText(categoryDisplayName(category))}</span>`;
    btn.addEventListener("click", () => {
      if (visibleTrendCategories.has(category)) {
        visibleTrendCategories.delete(category);
      } else {
        visibleTrendCategories.add(category);
      }
      if (visibleTrendCategories.size === 0) visibleTrendCategories.add(selectedCategory);
      renderTrendToggles();
      renderTrend();
    });
    trendToggles.appendChild(btn);
  });
  notifyPortalLayoutNow();
}

function trendHoverTemplate({ year, month = null, months = [], category, value }) {
  // Each trace supplies named fields; never interpret annual/monthly array positions.
  const valueName = activeValueNoun(category);
  const unit = activeUnit(category);
  const period = month == null
    ? `${year} 年｜${months.length ? `${formatMonths(months)}累計` : "年度資料"}`
    : `${year} 年 ${month} 月`;
  const valid = value != null && value !== "" && Number.isFinite(Number(value));
  const lines = [period, `${valueName}：${valid ? `${fmt.format(Number(value))} ${unit}` : "無資料"}`];
  const label = categoryDisplayName(category);
  if (hasCategoryControl() && label && label !== valueName && label !== unit) {
    lines.push(`${isSolarChart() ? "地點" : "類別"}：${label}`);
  }
  if (GA_DATA.locationSeries && (selectedLocation || GA_DATA.defaultLocation)) {
    lines.push(`地點：${selectedLocation || GA_DATA.defaultLocation}`);
  }
  // Plotly parses HTML and template tokens; data labels must remain plain text.
  return lines.map((line) => String(line).replace(/[&<>"'%]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "%": "&#37;",
  }[char]))).join("<br>") + "<extra></extra>";
}

function bindTrendClick() {
  if (!trendChart || !trendChart.on) return;
  if (trendChart.removeAllListeners) {
    trendChart.removeAllListeners("plotly_click");
    trendChart.removeAllListeners("plotly_hover");
    trendChart.removeAllListeners("plotly_unhover");
  }
  trendChart.on("plotly_click", (event) => {
    const point = event.points && event.points[0];
    if (!point || !Number.isFinite(Number(point.x))) return;
    if (isMonthGrain()) {
      selectedMonth = Number(point.x);
      updateAll();
    } else {
      selectYearFocus(point.x);
    }
  });
}

function clearTrendInteractions() {
  if (trendChart && trendChart._fullLayout) Plotly.Fx.unhover(trendChart);
  hideTrendMeanLegend();
  if (trendChart && trendChart.removeAllListeners) {
    trendChart.removeAllListeners("plotly_click");
    trendChart.removeAllListeners("plotly_hover");
    trendChart.removeAllListeners("plotly_unhover");
  }
}

function bindYearOverviewClick() {
  const overview = document.getElementById("overviewChart");
  if (!overview) return;
  overview.removeAllListeners?.("plotly_click");
  overview.style.cursor = "pointer";
  overview.on("plotly_click", (event) => {
    const point = event.points && event.points[0];
    if (!point) return;
    const year = point.customdata && point.customdata.length
      ? point.customdata[point.customdata.length - 1]
      : point.y;
    selectYearFocus(year);
  });
}

function renderDualMetricMonthTrend() {
  ensureSelectedMonth();
  const axes = dualMetricAxisCategories();
  const primary = selectedCategory;
  const secondary = secondaryMetricCategory(primary);
  if (!axes || !secondary) {
    return false;
  }
  const { left, right } = axes;
  const leftRows = monthlyRowsForYear(selectedYear, left);
  const rightRows = monthlyRowsForYear(selectedYear, right);
  const primaryRows = primary === left ? leftRows : rightRows;
  const monthSet = new Set([
    ...leftRows.map((row) => row.month),
    ...rightRows.map((row) => row.month),
  ]);
  const months = [...monthSet].sort((a, b) => a - b);
  if (!months.length || !primaryRows.length) {
    hideTrendMeanLegend();
    Plotly.react("trendChart", [], {
      title: {
        text: `${boldTitle(`逐月趨勢-${activeValueNoun(primary)}`)}<br><sup>${compactTrendSup(`${selectedYear}年逐月｜目前沒有資料`)}</sup>`,
        x: 0, xanchor: "left", y: 0.974, yanchor: "top", pad: { t: 3, b: 0 }, font: { size: 19, color: "#101827" },
      },
      margin: trendPlotMargins("empty"),
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#ffffff",
      xaxis: { visible: false },
      yaxis: { visible: false },
      annotations: [{ text: "目前沒有可繪製的月趨勢資料", x: 0.5, y: 0.5, xref: "paper", yref: "paper", showarrow: false, font: { size: 14, color: "#64748b" } }],
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
    return true;
  }
  const leftByMonth = new Map(leftRows.map((row) => [row.month, row.value]));
  const rightByMonth = new Map(rightRows.map((row) => [row.month, row.value]));
  const leftColor = categoryColor(left);
  const rightColor = categoryColor(right);
  const focus = primaryRows.find((row) => Number(row.month) === Number(selectedMonth));
  const leftMean = Number(comparisonForMonthsInYear(selectedYear, left).mean) || 0;
  const rightMean = Number(comparisonForMonthsInYear(selectedYear, right).mean) || 0;
  const mean = primary === left ? leftMean : rightMean;
  const leftValues = months.map((month) => leftByMonth.get(month) ?? null);
  const rightValues = months.map((month) => rightByMonth.get(month) ?? null);
  const maxLeft = Math.max(...leftValues.filter((value) => value != null), leftMean, 1);
  const maxRight = Math.max(...rightValues.filter((value) => value != null), rightMean, 1);
  const minMonth = months[0];
  const maxMonth = months[months.length - 1];
  const primaryYref = primary === left ? "y" : "y2";
  const makeTrace = (category, values, yaxis) => {
    const color = categoryColor(category);
    const bright = visibleTrendCategories.has(category) || category === primary;
    const focusPoint = category === primary;
    return {
      type: "scatter",
      mode: "lines+markers",
      name: categoryDisplayName(category),
      x: months,
      y: values,
      yaxis,
      line: { color: bright ? color : hexToRgba(color, 0.26), width: 3.4 },
      marker: {
        color: months.map((month) => (focusPoint && Number(month) === Number(selectedMonth) ? color : "#ffffff")),
        size: months.map((month) => (focusPoint && Number(month) === Number(selectedMonth) ? 13 : 8)),
        line: { color: bright ? color : hexToRgba(color, 0.32), width: 2 },
      },
      hovertemplate: months.map((month, index) => trendHoverTemplate({
        year: selectedYear, month, category, value: values[index],
      })),
    };
  };
  const leftTrace = makeTrace(left, leftValues, "y");
  const rightTrace = makeTrace(right, rightValues, "y2");
  const baseTraces = primary === left ? [rightTrace, leftTrace] : [leftTrace, rightTrace];
  const traces = withMeanLegendTraces(baseTraces, { x: months, y: mean, yref: primaryYref });
  const annotations = [];
  if (focus) {
    annotations.push(focusPointAnnotation({
      x: focus.month,
      y: focus.value,
      yref: primaryYref,
      text: `${fmt.format(focus.value)} ${activeUnit(primary)}`,
      xValues: months,
    }));
  }
  const dualRanges = dualMetricAxisRanges(maxLeft, maxRight);
  const dualAxes = dualMetricYAxisLayout(left, right, leftColor, rightColor, dualRanges);
  Plotly.react("trendChart", traces, {
    title: {
      text: `${boldTitle(`逐月趨勢-${activeValueNoun(primary)}`)}<br><sup>${compactTrendSup(`${selectedYear} 年各月數據｜點選資料點切換月份`)}</sup>`,
      x: 0, xanchor: "left", y: 0.974, yanchor: "top", pad: { t: 3, b: 0 }, font: { size: 19, color: "#101827" },
    },
    margin: trendPlotMargins("month"),
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#ffffff",
    xaxis: trendXAxisLayout(months, months.map((month) => `${month}月`)),
    ...dualAxes,
    showlegend: false,
    shapes: focus ? [{
      type: "line",
      x0: focus.month,
      x1: focus.month,
      y0: 0,
      y1: 1,
      xref: "x",
      yref: "paper",
      line: { color: "#d43f55", width: 2, dash: "dot" },
    }] : [],
    annotations,
  }, { displayModeBar: false, responsive: true }).then(() => {
    bindTrendClick();
    afterTrendMeanLegend({ y: mean, unit: activeUnit(primary), yref: primaryYref });
  });
  return true;
}

function renderDualMetricYearTrend() {
  const axes = dualMetricAxisCategories();
  const primary = selectedCategory;
  const secondary = secondaryMetricCategory(primary);
  if (!axes || !secondary) return false;
  const { left, right } = axes;
  const leftComparison = comparisonForYear(selectedYear, left);
  const rightComparison = comparisonForYear(selectedYear, right);
  const primaryComparison = primary === left ? leftComparison : rightComparison;
  const years = [...new Set([
    ...leftComparison.rows.map((row) => row.year),
    ...rightComparison.rows.map((row) => row.year),
  ])].sort((a, b) => a - b);
  const selected = primaryComparison.selected;
  if (!years.length || !selected || !primaryComparison.rows.length) {
    Plotly.react("trendChart", [], {
      title: {
        text: `${boldTitle(`歷史趨勢-${activeValueNoun(primary)}`)}<br><sup>${compactTrendSup(activeTrendSubtitle(primary, "目前篩選條件沒有資料"))}</sup>`,
        x: 0, xanchor: "left", y: 0.974, yanchor: "top", pad: { t: 3, b: 0 }, font: { size: 19, color: "#101827" },
      },
      margin: trendPlotMargins("empty"),
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#ffffff",
      xaxis: { visible: false },
      yaxis: { visible: false },
      annotations: [{ text: "目前沒有可繪製的趨勢資料", x: 0.5, y: 0.5, xref: "paper", yref: "paper", showarrow: false, font: { size: 14, color: "#64748b" } }],
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
    return true;
  }
  const leftByYear = new Map(leftComparison.rows.map((row) => [row.year, row]));
  const rightByYear = new Map(rightComparison.rows.map((row) => [row.year, row]));
  const leftColor = categoryColor(left);
  const rightColor = categoryColor(right);
  const leftValues = years.map((year) => (leftByYear.get(year) ? leftByYear.get(year).value : null));
  const rightValues = years.map((year) => (rightByYear.get(year) ? rightByYear.get(year).value : null));
  const leftMean = Number(leftComparison.mean) || 0;
  const rightMean = Number(rightComparison.mean) || 0;
  const mean = primary === left ? leftMean : rightMean;
  const maxLeft = Math.max(...leftValues.filter((value) => value != null), leftMean, 1);
  const maxRight = Math.max(...rightValues.filter((value) => value != null), rightMean, 1);
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const primaryByYear = primary === left ? leftByYear : rightByYear;
  const focus = primaryByYear.get(Number(selectedYear)) || selected;
  const primaryYref = primary === left ? "y" : "y2";
  const makeTrace = (category, values, byYear, yaxis) => {
    const color = categoryColor(category);
    const bright = visibleTrendCategories.has(category) || category === primary;
    const focusPoint = category === primary;
    return {
      type: "scatter",
      mode: "lines+markers",
      name: categoryDisplayName(category),
      x: years,
      y: values,
      yaxis,
      line: { color: bright ? color : hexToRgba(color, 0.26), width: 3.4 },
    marker: {
        color: years.map((year) => (focusPoint && String(year) === String(selectedYear) ? color : "#ffffff")),
        size: years.map((year) => (focusPoint && String(year) === String(selectedYear) ? 13 : 8)),
        line: { color: bright ? color : hexToRgba(color, 0.32), width: 2 },
      },
      hovertemplate: years.map((year) => {
        const row = byYear.get(year);
        return trendHoverTemplate({ year, category, value: row?.value, months: row?.comparisonMonths || [] });
      }),
    };
  };
  const leftTrace = makeTrace(left, leftValues, leftByYear, "y");
  const rightTrace = makeTrace(right, rightValues, rightByYear, "y2");
  const baseTraces = primary === left ? [rightTrace, leftTrace] : [leftTrace, rightTrace];
  const traces = withMeanLegendTraces(baseTraces, { x: years, y: mean, yref: primaryYref });
  const annotations = [];
  if (focus) {
    annotations.push(focusPointAnnotation({
      x: focus.year,
      y: focus.value,
      yref: primaryYref,
      text: `${fmt.format(focus.value)} ${activeUnit(primary)}`,
      xValues: years,
    }));
  }
  const dualRanges = dualMetricAxisRanges(maxLeft, maxRight);
  const dualAxes = dualMetricYAxisLayout(left, right, leftColor, rightColor, dualRanges);
  Plotly.react("trendChart", traces, {
    title: {
      text: `${boldTitle(`歷史趨勢-${activeValueNoun(primary)}`)}<br><sup>${compactTrendSup(`各年${primaryComparison.shortBasisLabel}｜點選資料點切換年份`)}</sup>`,
      x: 0, xanchor: "left", y: 0.974, yanchor: "top", pad: { t: 3, b: 0 }, font: { size: 19, color: "#101827" },
    },
    margin: trendPlotMargins("year"),
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#ffffff",
    xaxis: trendXAxisLayout(years),
    ...dualAxes,
    showlegend: false,
    shapes: [{
      type: "line",
      x0: selected.year,
      x1: selected.year,
      y0: 0,
      y1: 1,
      xref: "x",
      yref: "paper",
      line: { color: "#d43f55", width: 2, dash: "dot" },
    }],
    annotations,
  }, { displayModeBar: false, responsive: true }).then(() => {
    bindTrendClick();
    afterTrendMeanLegend({ y: mean, unit: activeUnit(primary), yref: primaryYref });
  });
  return true;
}

function renderMonthTrend() {
  if (usesDualMetricTrend() && renderDualMetricMonthTrend()) return;
  ensureSelectedMonth();
  const activeCategories = hasTrendToggles() ? [...visibleTrendCategories] : [selectedCategory];
  const monthSet = new Set();
  const traces = activeCategories.map((category) => {
    const rows = monthlyRowsForYear(selectedYear, category);
    rows.forEach((row) => monthSet.add(row.month));
    if (!rows.length) return null;
    const color = hasTrendToggles() ? categoryColor(category) : "#1f3b57";
    return {
      type: "scatter",
      mode: "lines+markers",
      name: categoryDisplayName(category),
      x: rows.map((row) => row.month),
      y: rows.map((row) => row.value),
      line: { color, width: category === selectedCategory ? 3.4 : 2.4 },
      marker: {
        color: rows.map((row) => Number(row.month) === Number(selectedMonth) ? color : "#ffffff"),
        size: rows.map((row) => Number(row.month) === Number(selectedMonth) ? 13 : 8),
        line: { color, width: 2 },
      },
      hovertemplate: rows.map((row) => trendHoverTemplate({
        year: selectedYear, month: row.month, category, value: row.value,
      })),
    };
  }).filter(Boolean);
  const months = [...monthSet].sort((a, b) => a - b);
  if (!traces.length || !months.length) {
    hideTrendMeanLegend();
    Plotly.react("trendChart", [], {
      title: {
        text: `${boldTitle(`逐月趨勢-${activeValueNoun()}`)}<br><sup>${compactTrendSup(`${selectedYear}年逐月｜目前沒有資料`)}</sup>`,
        x: 0, xanchor: "left", y: 0.974, yanchor: "top", pad: { t: 3, b: 0 }, font: { size: 19, color: "#101827" },
      },
      margin: trendPlotMargins("empty"),
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#ffffff",
      xaxis: { visible: false },
      yaxis: { visible: false },
      annotations: [{ text: "目前沒有可繪製的月趨勢資料", x: 0.5, y: 0.5, xref: "paper", yref: "paper", showarrow: false, font: { size: 14, color: "#64748b" } }],
    showlegend: false,
  }, { displayModeBar: false, responsive: true });
    return;
  }
  const focusRows = monthlyRowsForYear(selectedYear, selectedCategory);
  const focus = focusRows.find((row) => Number(row.month) === Number(selectedMonth));
  const monthComparison = comparisonForMonthsInYear(selectedYear, selectedCategory);
  const mean = Number(monthComparison.mean) || 0;
  const minMonth = Math.min(...months);
  const maxMonth = Math.max(...months);
  const maxY = Math.max(...traces.flatMap((trace) => trace.y), mean, 1);
  const allTraces = withMeanLegendTraces(traces, { x: months, y: mean });
  const annotations = [];
  if (focus) {
    annotations.push(focusPointAnnotation({
      x: focus.month,
      y: focus.value,
      text: `${fmt.format(focus.value)} ${activeUnit()}`,
      xValues: months,
    }));
  }
  Plotly.react("trendChart", allTraces, {
    title: {
      text: `${boldTitle(`逐月趨勢-${activeValueNoun()}`)}<br><sup>${compactTrendSup(`${selectedYear} 年各月數據｜點選資料點切換月份`)}</sup>`,
      x: 0, xanchor: "left", y: 0.974, yanchor: "top", pad: { t: 3, b: 0 }, font: { size: 19, color: "#101827" },
    },
    margin: trendPlotMargins("month"),
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#ffffff",
    xaxis: trendXAxisLayout(months, months.map((month) => `${month}月`)),
    yaxis: trendYAxisLayout({ maxY, unit: activeUnit() }),
    showlegend: false,
    shapes: focus ? [{
      type: "line",
      x0: focus.month,
      x1: focus.month,
      y0: 0,
      y1: 1,
      xref: "x",
      yref: "paper",
      line: { color: "#d43f55", width: 2, dash: "dot" },
    }] : [],
    annotations,
  }, { displayModeBar: false, responsive: true }).then(() => {
    bindTrendClick();
    afterTrendMeanLegend({ y: mean, unit: activeUnit() });
  });
}

function renderTrend() {
  if (isFriendlySpacesChart()) return;
  if (qualityFormula) qualityFormula.hidden = true;
  if (isReplacementChart()) {
    renderReplacementTrend();
    return;
  }
  clearTrendInteractions();
  // Location mode only remaps the left overview/ranking; keep the right-side year trend line
  // so history for the focused site (or 全地點) stays visible instead of duplicating location bars.
  if (isMonthGrain()) {
    renderMonthTrend();
    return;
  }
  if (usesDualMetricTrend() && renderDualMetricYearTrend()) return;
  const baseComparison = comparisonForYear(selectedYear, selectedCategory);
  const activeCategories = hasTrendToggles() ? [...visibleTrendCategories] : [selectedCategory];
  const comparisonByCategory = new Map();
  const traces = activeCategories.map((category) => {
    const comparison = comparisonForYear(selectedYear, category);
    comparisonByCategory.set(category, comparison);
    if (!comparison.rows.length) return null;
    const years = comparison.rows.map((item) => item.year);
    const values = comparison.rows.map((item) => item.value);
    const color = hasTrendToggles() ? categoryColor(category) : "#1f3b57";
    return {
      type: "scatter",
      mode: "lines+markers",
      name: category || GA_DATA.metric,
      x: years,
      y: values,
      line: { color, width: category === selectedCategory ? 3.4 : 2.4 },
      marker: {
        color: comparison.rows.map((item) => String(item.year) === String(selectedYear) ? color : "#ffffff"),
        size: comparison.rows.map((item) => String(item.year) === String(selectedYear) ? 13 : 8),
        line: { color, width: 2 },
      },
      hovertemplate: comparison.rows.map((item) => trendHoverTemplate({
        year: item.year, months: item.comparisonMonths, category, value: item.value,
      })),
    };
  }).filter(Boolean);
  const years = baseComparison.rows.map((item) => item.year);
  const selected = baseComparison.selected;
  if (!traces.length || !years.length || !selected) {
    hideTrendMeanLegend();
    Plotly.react("trendChart", [], {
      title: {
        text: `${boldTitle(`歷史趨勢-${activeValueNoun()}`)}<br><sup>${compactTrendSup(activeTrendSubtitle(selectedCategory, "目前篩選條件沒有資料"))}</sup>`,
        x: 0,
        xanchor: "left",
        y: 0.974,
        yanchor: "top",
        pad: { t: 3, b: 0 },
        font: { size: 19, color: "#101827" },
      },
      margin: trendPlotMargins("empty"),
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#ffffff",
      xaxis: { visible: false },
      yaxis: { visible: false },
      annotations: [{
        text: "目前沒有可繪製的趨勢資料",
        x: 0.5,
        y: 0.5,
        xref: "paper",
        yref: "paper",
        showarrow: false,
        font: { size: 14, color: "#64748b" },
      }],
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
    return;
  }

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const focusCategory = activeCategories.includes(selectedCategory) ? selectedCategory : activeCategories[0];
  const focusComparison = comparisonByCategory.get(focusCategory) || baseComparison;
  const focusRow = focusComparison.rows.find((item) => String(item.year) === String(selectedYear)) || selected;
  const allTraces = withMeanLegendTraces(traces, { x: years, y: focusComparison.mean });
  const annotations = [];
  if (focusRow) {
    annotations.push(focusPointAnnotation({
      x: focusRow.year,
      y: focusRow.value,
      text: `${fmt.format(focusRow.value)} ${activeUnit(focusCategory)}`,
      xValues: years,
    }));
  }

  Plotly.react("trendChart", allTraces, {
    title: {
      text: `${boldTitle(`歷史趨勢-${activeValueNoun()}`)}<br><sup>${compactTrendSup(activeTrendSubtitle(selectedCategory, `各年${baseComparison.shortBasisLabel}｜點選資料點切換年份`))}</sup>`,
      x: 0,
      xanchor: "left",
      y: 0.974,
      yanchor: "top",
      pad: { t: isCompactViewport() ? 0 : 3, b: isCompactViewport() ? 6 : 0 },
      font: { size: isCompactViewport() ? 16 : 19, color: "#101827" },
    },
    shapes: [{
        type: "line",
        x0: selected.year,
        x1: selected.year,
        y0: 0,
        y1: 1,
        xref: "x",
        yref: "paper",
        line: { color: "#d43f55", width: 2, dash: "dot" },
    }],
    annotations,
    margin: trendPlotMargins("year"),
    autosize: true,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#ffffff",
    xaxis: trendXAxisLayout(years),
    yaxis: {
      ...trendYAxisLayout({ unit: activeUnit(focusCategory) }),
    },
    showlegend: false,
  }, { displayModeBar: false, responsive: true }).then(() => {
    bindTrendClick();
    schedulePlotResize();
    afterTrendMeanLegend({ y: focusComparison.mean, unit: activeUnit(focusCategory) });
  });
}

function renderLocationOverview(comparison) {
  const rows = locationRowsForSelectedYear().map((row) => ({
    label: row.location,
    value: row.value,
    months: row.comparisonMonths || [],
    hasData: row.hasData,
  }));
  const axisName = locationAxisName();
  const dataRows = rows.filter(hasLocationData);
  if (!rows.length || !dataRows.length) {
    if (overviewTitle) overviewTitle.textContent = `${axisName}總覽｜${selectedYear || "--"} 年`;
    Plotly.react("overviewChart", [], {
      margin: { l: 64, r: 86, t: 18, b: 42 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#ffffff",
      annotations: [{
        text: `目前沒有可比較的${axisName}資料`,
        x: 0.5,
        y: 0.5,
        xref: "paper",
        yref: "paper",
        showarrow: false,
        font: { size: 13, color: "#64748b" },
      }],
      xaxis: { visible: false },
      yaxis: { visible: false },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
    return;
  }

  const maxValue = Math.max(...dataRows.map((row) => row.value), 1);
  const ranked = rows.map((row) => {
    if (!hasLocationData(row)) return { ...row, relativePosition: null };
    const lower = dataRows.filter((item) => item.value < row.value - 1e-9).length;
    const relativePosition = dataRows.length === 1 ? 100 : (lower / (dataRows.length - 1)) * 100;
    return { ...row, relativePosition };
  });
  const target = locationModeTarget();
  const aggregate = aggregateLocationKey();
  const sorted = target === aggregate
    ? [...ranked].sort((a, b) => b.value - a.value)
    : [
        ...ranked.filter((row) => row.label === target),
        ...ranked.filter((row) => row.label !== target).sort((a, b) => b.value - a.value),
      ];
  const yPositions = sorted.map((_, idx) => idx === 0 ? 0 : idx + 0.42);
  const actualValues = sorted.map((row) => hasLocationData(row) ? row.value : 0);
  const displayValues = visibleBarValues(actualValues);
  const barOpts = overviewHBarOptions(maxValue, displayValues);
  if (overviewTitle) overviewTitle.textContent = usesLocationRanking()
    ? `${axisName}排名`
    : `${axisName}總覽｜${selectedYear} 年${usesMonthCoverage() ? ` ${comparison.shortBasisLabel}` : ""}`;

  Plotly.react("overviewChart", [{
    type: "bar",
    orientation: "h",
    x: displayValues,
    y: yPositions,
    width: sorted.map(() => barOpts.barWidth),
    text: sorted.map((row) => hasLocationData(row) ? `${fmt.format(row.value)} ${activeUnit()}` : ""),
    textposition: barOpts.textposition,
    textfont: barOpts.textfont,
    cliponaxis: false,
    marker: { color: sorted.map((row) => hasLocationData(row) ? colorForPosition(Math.round(row.relativePosition)) : "rgba(148,163,184,0)"), line: { color: "#ffffff", width: 1 } },
    customdata: sorted.map((row) => [row.label, formatMonths(row.months), hasLocationData(row) ? row.value : null]),
    hovertemplate: usesMonthCoverage()
      ? "%{customdata[0]}<br>" + activeValueNoun() + "：%{customdata[2]:,.2f} " + activeUnit() +
        "<br>資料涵蓋：%{customdata[1]}<extra></extra>"
      : "%{customdata[0]}<br>" + activeValueNoun() + "：%{customdata[2]:,.2f} " + activeUnit() + "<extra></extra>",
  }], {
    margin: { ...barOpts.margin, l: isCompactViewport() ? 64 : 86, r: isCompactViewport() ? 8 : 86 },
    autosize: true,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#ffffff",
    xaxis: {
      title: isCompactViewport() ? "" : activeUnit(),
      showticklabels: !isCompactViewport(),
      gridcolor: "#edf2f7",
      zeroline: false,
      range: barOpts.range,
    },
    yaxis: {
      title: "",
      tickmode: "array",
      tickvals: yPositions,
      ticktext: sorted.map((row) => row.label),
      range: [Math.max(...yPositions) + barOpts.yPad, -0.56],
      automargin: true,
      showgrid: false,
      zeroline: false,
    },
    showlegend: false,
  }, { displayModeBar: false, responsive: true }).then(schedulePlotResize);
}

function renderMonthOverview() {
  const comparison = comparisonForMonthsInYear(selectedYear, selectedCategory);
  syncOverviewModeControls();
  const showPieMode = showAggregatePieMode();
  const overview = document.getElementById("overviewChart");
  if (overview) overview.style.cursor = "";
  overviewModeSwitch.hidden = !showPieMode;
  overviewModeSwitch.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.overviewMode === overviewMode);
  });
  if (!showPieMode) overviewMode = "bar";

  if (showPieMode && overviewMode === "pie") {
    const month = Number(selectedMonth);
    const totals = new Map();
    (GA_DATA.categoryMonthly || [])
      .filter((item) => Number(item.year) === Number(selectedYear) && Number(item.month) === month)
      .forEach((item) => totals.set(item.category, (totals.get(item.category) || 0) + Number(item.value || 0)));
    const rows = (GA_DATA.rawCategories || [])
      .map((category) => ({ category, value: totals.get(category) || 0 }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    if (overviewTitle) overviewTitle.textContent = `${aggregatePieTitleLabel()}｜${selectedYear}年${month}月`;
    Plotly.react("overviewChart", [{
      type: "pie",
      labels: rows.map((row) => row.category),
      values: rows.map((row) => row.value),
      hole: 0.42,
      sort: false,
      automargin: true,
      domain: { x: [0.05, 0.95], y: [0.03, 0.84] },
      marker: { colors: rows.map((row) => categoryColor(row.category)), line: { color: "#ffffff", width: 2 } },
      textinfo: "label+percent",
      textposition: "outside",
      textfont: { size: 11 },
      hovertemplate: "%{label}<br>" + activeValueNoun() + "：%{value:,.2f} " + activeUnit() + "<br>佔比：%{percent}<extra></extra>",
    }], {
      annotations: [{ text: `${fmt.format(total)}<br>${activeUnit()}`, x: 0.5, y: 0.435, showarrow: false, font: { size: 14, color: "#101827" } }],
      margin: { l: 28, r: 28, t: 38, b: 18 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#ffffff",
    showlegend: false,
  }, { displayModeBar: false, responsive: true });
    bindAggregatePieCategoryClick();
    return;
  }

  if (!comparison.rows.length) {
    if (overviewTitle) overviewTitle.textContent = "月份總覽｜無資料";
    Plotly.react("overviewChart", [], {
      margin: { l: 64, r: 86, t: 18, b: 42 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#ffffff",
      annotations: [{ text: "目前沒有可比較的月份資料", x: 0.5, y: 0.5, xref: "paper", yref: "paper", showarrow: false, font: { size: 13, color: "#64748b" } }],
      xaxis: { visible: false },
      yaxis: { visible: false },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
    return;
  }

  const selectedBars = comparison.rows.filter((item) => Number(item.month) === Number(selectedMonth));
  const otherBars = comparison.rows
    .filter((item) => Number(item.month) !== Number(selectedMonth))
    .sort((a, b) => Number(b.month) - Number(a.month));
  const bars = [...selectedBars, ...otherBars];
  const values = bars.map((item) => item.value);
  const displayValues = visibleBarValues(values);
  // Match year mode: lift the selected month slightly with a small gap before the rest.
  const yPositions = bars.map((_, idx) => (idx === 0 ? 0 : idx * 1.08 + 0.42));
  const maxValue = Math.max(...values, 1);
  const colors = bars.map((item) => colorForPosition(Math.round(item.relativePosition)));
  const barOpts = overviewHBarOptions(maxValue, displayValues);
  if (overviewTitle) overviewTitle.textContent = `月份總覽｜${selectedYear}年`;

  Plotly.react("overviewChart", [{
    type: "bar",
    orientation: "h",
    x: displayValues,
    y: yPositions,
    width: bars.map(() => (isCompactViewport() ? 0.62 : 0.84)),
    text: bars.map((item) => `${fmt.format(item.value)} ${activeUnit()}`),
    textposition: barOpts.textposition,
    textfont: barOpts.textfont,
    cliponaxis: false,
    marker: { color: colors, line: { color: "#ffffff", width: 1 } },
    customdata: bars.map((item) => [item.month, formatMonths(item.comparisonMonths)]),
    hovertemplate: "%{customdata[0]}月<br>" + activeValueNoun() + "：%{x:,.2f} " + activeUnit() + "<extra></extra>",
  }], {
    margin: { ...barOpts.margin, l: isCompactViewport() ? 44 : 52 },
    autosize: true,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#ffffff",
    xaxis: { title: "", showticklabels: false, gridcolor: "#edf2f7", zeroline: false, range: barOpts.range },
    yaxis: {
      tickmode: "array",
      tickvals: yPositions,
      ticktext: bars.map((item) => `${item.month}月`),
      tickfont: { size: barOpts.tickfontSize, color: "#334155" },
      range: [Math.max(...yPositions) + 0.58, -0.42],
      showgrid: false,
      zeroline: false,
    },
    showlegend: false,
  }, { displayModeBar: false, responsive: true }).then(schedulePlotResize);

  if (!overview) return;
  overview.removeAllListeners?.("plotly_click");
  overview.style.cursor = "pointer";
  overview.on("plotly_click", (event) => {
    const point = event.points && event.points[0];
    if (!point || !point.customdata) return;
    const month = Number(point.customdata[0]);
    if (!Number.isFinite(month)) return;
    selectedMonth = month;
    updateAll();
  });
}

function renderOverview() {
  if (isFriendlySpacesChart()) return;
  if (isReplacementChart()) {
    renderReplacementOverview();
    return;
  }
  if (isMonthGrain()) {
    renderMonthOverview();
    return;
  }
  const comparison = comparisonForYear(selectedYear, selectedCategory);
  syncOverviewModeControls();
  const showPieMode = showAggregatePieMode();
  const showLocationMode = hasLocationOverviewMode() && !showPieMode;
  const overview = document.getElementById("overviewChart");
  if (overview) overview.style.cursor = "";
  overviewModeSwitch.hidden = !(showPieMode || showLocationMode);
  overviewModeSwitch.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.overviewMode === overviewMode);
  });
  if (!(showPieMode || showLocationMode)) overviewMode = "bar";
  if (showLocationMode && overviewMode === "location") {
    renderLocationOverview(comparison);
    return;
  }
  if (showPieMode && overviewMode === "pie") {
    const totals = new Map();
    (GA_DATA.categoryMonthly || [])
      .filter((item) =>
        Number(item.year) === Number(selectedYear) &&
        Number(item.month) >= Number(comparison.startMonth) &&
        Number(item.month) <= Number(comparison.cutoffMonth)
      )
      .forEach((item) => totals.set(item.category, (totals.get(item.category) || 0) + Number(item.value || 0)));
    const rows = (GA_DATA.rawCategories || [])
      .map((category) => ({ category, value: totals.get(category) || 0 }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    if (overviewTitle) {
      overviewTitle.textContent = usesMonthCoverage()
        ? `${aggregatePieTitleLabel()}｜${comparison.shortBasisLabel}`
        : aggregatePieTitleLabel();
    }
    Plotly.react("overviewChart", [{
      type: "pie",
      labels: rows.map((row) => row.category),
      values: rows.map((row) => row.value),
      hole: 0.42,
      sort: false,
      automargin: true,
      domain: { x: [0.05, 0.95], y: [0.03, 0.84] },
      marker: { colors: rows.map((row) => categoryColor(row.category)), line: { color: "#ffffff", width: 2 } },
      textinfo: "label+percent",
      textposition: "outside",
      textfont: { size: 11 },
      hovertemplate: "%{label}<br>" + activeValueNoun() + "：%{value:,.2f} " + activeUnit() + "<br>佔比：%{percent}<extra></extra>",
    }], {
      annotations: [{
        text: `${fmt.format(total)}<br>${activeUnit()}`,
        x: 0.5,
        y: 0.435,
        showarrow: false,
        font: { size: 14, color: "#101827" },
      }],
      margin: { l: 28, r: 28, t: 38, b: 18 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#ffffff",
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
    bindAggregatePieCategoryClick();
    return;
  }
  if (!comparison.rows.length) {
    if (overviewTitle) overviewTitle.textContent = "年度總覽｜無資料";
    Plotly.react("overviewChart", [], {
      margin: { l: 64, r: 86, t: 18, b: 42 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "#ffffff",
      annotations: [{
        text: "目前沒有可比較的年度資料",
        x: 0.5,
        y: 0.5,
        xref: "paper",
        yref: "paper",
        showarrow: false,
        font: { size: 13, color: "#64748b" },
      }],
      xaxis: { visible: false },
      yaxis: { visible: false },
      showlegend: false,
    }, { displayModeBar: false, responsive: true });
    return;
  }
  const selectedBars = comparison.rows.filter((item) => String(item.year) === String(selectedYear));
  const otherBars = comparison.rows
    .filter((item) => String(item.year) !== String(selectedYear))
    .sort((a, b) => b.year - a.year);
  const bars = [...selectedBars, ...otherBars];
  const labels = bars.map((item) => `${item.year} 年`);
  const values = bars.map((item) => item.value);
  const displayValues = visibleBarValues(values);
  const yPositions = bars.map((_, idx) => idx === 0 ? 0 : idx + 0.42);
  const maxValue = Math.max(...values, 1);
  const colors = bars.map((item) => colorForPosition(Math.round(item.relativePosition)));
  const barOpts = overviewHBarOptions(maxValue, displayValues);
  if (overviewTitle) overviewTitle.textContent = usesMonthCoverage()
    ? `年度總覽｜${comparison.shortBasisLabel}`
    : "年度總覽";

  Plotly.react("overviewChart", [{
    type: "bar",
    orientation: "h",
    x: displayValues,
    y: yPositions,
    width: bars.map(() => barOpts.barWidth),
    text: bars.map((item) => `${fmt.format(item.value)} ${activeUnit()}`),
    textposition: barOpts.textposition,
    textfont: barOpts.textfont,
    cliponaxis: false,
    marker: { color: colors, line: { color: "#ffffff", width: 1 } },
    customdata: bars.map((item) => [
      item.rankHigh,
      comparison.rows.length,
      formatMonths(item.comparisonMonths),
      comparison.shortBasisLabel,
      `${item.year} 年`,
      item.value,
      item.year,
    ]),
    hovertemplate: usesMonthCoverage()
      ? "%{customdata[4]}<br>" + activeValueNoun() + "：%{customdata[5]:,.2f} " + activeUnit() +
        "<br>第 %{customdata[0]} / 共 %{customdata[1]} 年" +
        "<br>資料涵蓋：%{customdata[2]}" +
        "<br>比較基準：%{customdata[3]}<extra></extra>"
      : "%{customdata[4]}<br>" + activeValueNoun() + "：%{customdata[5]:,.2f} " + activeUnit() +
        "<br>第 %{customdata[0]} / 共 %{customdata[1]} 年<extra></extra>",
  }], {
    margin: barOpts.margin,
    autosize: true,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "#ffffff",
    xaxis: {
      title: "",
      showticklabels: false,
      gridcolor: "#edf2f7",
      zeroline: false,
      range: barOpts.range,
    },
    yaxis: {
      title: "",
      tickmode: "array",
      tickvals: yPositions,
      ticktext: labels,
      tickfont: { size: barOpts.tickfontSize, color: "#334155" },
      range: [Math.max(...yPositions) + barOpts.yPad, -0.56],
      automargin: true,
      showgrid: false,
      zeroline: false,
    },
    showlegend: false,
  }, { displayModeBar: false, responsive: true }).then(schedulePlotResize);
  bindYearOverviewClick();
}

function availableMonthsForSelection() {
  // Year-mode comparison interval + month grain: only months with data for the selected year.
  return monthsAvailableForYear(selectedYear, selectedCategory);
}

function fillMonthSelect(select, values, selectedValue, suffix = "月") {
  select.innerHTML = "";
  values.forEach((value) => {
    const opt = document.createElement("option");
    opt.value = String(value);
    opt.textContent = `${value}${suffix}`;
    select.appendChild(opt);
  });
  select.value = String(selectedValue);
}

function setMonthPopoverMode(mode) {
  const isPick = mode === "pick";
  if (monthPopover) monthPopover.classList.toggle("is-month-pick", isPick);
  if (monthRangeFields) monthRangeFields.hidden = isPick;
  if (monthRangeActions) monthRangeActions.hidden = isPick;
  if (monthPickGrid) monthPickGrid.hidden = !isPick;
}

function renderMonthPickGrid(availableMonths) {
  if (!monthPickGrid) return;
  const available = new Set((availableMonths || []).map(Number));
  const current = Number(selectedMonth);
  monthPickGrid.innerHTML = "";
  for (let month = 1; month <= 12; month += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${month}月`;
    button.dataset.month = String(month);
    const enabled = available.has(month);
    button.disabled = !enabled;
    button.classList.toggle("active", enabled && month === current);
    button.setAttribute("aria-pressed", enabled && month === current ? "true" : "false");
    if (enabled) {
      button.addEventListener("click", () => {
        selectedMonth = month;
        closeMonthPopover();
        updateAll();
      });
    }
    monthPickGrid.appendChild(button);
  }
}

function syncMonthRangeControls() {
  const title = monthPopover ? monthPopover.querySelector(".ga-month-title") : null;
  const labels = monthPopover ? monthPopover.querySelectorAll(".ga-month-fields label") : [];
  if (usesYearRange()) {
    setMonthPopoverMode("range");
    const years = availableReplacementRangeYears();
    if (!years.length) return;
    if (title) title.textContent = "選擇年度範圍";
    if (labels[0] && labels[0].childNodes[0]) labels[0].childNodes[0].nodeValue = "起年 ";
    if (labels[1] && labels[1].childNodes[0]) labels[1].childNodes[0].nodeValue = "迄年 ";
    if (monthEndField) monthEndField.hidden = false;
    if (monthStartField) monthStartField.style.gridColumn = "";
    const fallback = activeReplacementYearRange();
    const start = years.includes(Number(fallback.start)) ? Number(fallback.start) : years[0];
    const end = years.includes(Number(fallback.end)) && Number(fallback.end) >= start
      ? Number(fallback.end)
      : years.filter((year) => year >= start).slice(-1)[0] || start;
    fillMonthSelect(monthStartSelect, years, start, "");
    fillMonthSelect(monthEndSelect, [...years].reverse(), end, "");
    lastValidMonthRange = { start, end };
    return;
  }
  if (isMonthGrain()) {
    ensureSelectedMonth();
    const months = availableMonthsForSelection();
    if (title) title.textContent = "選擇月份";
    setMonthPopoverMode("pick");
    renderMonthPickGrid(months);
    return;
  }
  if (!usesMonthCoverage()) return;
  setMonthPopoverMode("range");
  if (title) title.textContent = "選擇比較區間";
  if (labels[0] && labels[0].childNodes[0]) labels[0].childNodes[0].nodeValue = "起月 ";
  if (labels[1] && labels[1].childNodes[0]) labels[1].childNodes[0].nodeValue = "迄月 ";
  if (monthEndField) monthEndField.hidden = false;
  if (monthStartField) monthStartField.style.gridColumn = "";
  const months = availableMonthsForSelection();
  if (!months.length) return;
  const yearDefault = defaultRangeForRecord(recordForYear(selectedYear, selectedCategory));
  // Applied custom: draft wins for in-progress edits. No custom: draft should already
  // match year default after year switch; fall back to yearDefault if draft missing.
  const fallbackSource = customMonthRange
    ? (draftMonthRange || customMonthRange || lastValidMonthRange || yearDefault)
    : (draftMonthRange || lastValidMonthRange || yearDefault);
  const clamped = clampMonthRangeToAvailable(
    { start: fallbackSource.start, end: fallbackSource.end },
    months
  );
  let start = clamped.start;
  let end = clamped.end;
  if (start > end) {
    start = months.filter((month) => month <= end).slice(-1)[0] || end;
  }
  fillMonthSelect(monthStartSelect, months, start);
  fillMonthSelect(monthEndSelect, months, end);
  lastValidMonthRange = { start, end };
  draftMonthRange = { start, end };
}

function beginMonthRangeSelectGuard() {
  monthRangeSelectActive = true;
  if (monthPopoverCloseTimer) {
    clearTimeout(monthPopoverCloseTimer);
    monthPopoverCloseTimer = null;
  }
  if (monthRangeSelectGuardTimer) {
    clearTimeout(monthRangeSelectGuardTimer);
    monthRangeSelectGuardTimer = null;
  }
}

function endMonthRangeSelectGuard() {
  if (monthRangeSelectGuardTimer) clearTimeout(monthRangeSelectGuardTimer);
  monthRangeSelectGuardTimer = setTimeout(() => {
    monthRangeSelectGuardTimer = null;
    monthRangeSelectActive = false;
    if (
      prefersMonthPopoverHover() &&
      !monthPopoverPinned &&
      coverageWrap &&
      !coverageWrap.matches(":hover")
    ) {
      scheduleCloseMonthPopover();
    }
  }, 280);
}

function captureDraftMonthRange() {
  if (isMonthGrain()) return;
  const start = Number(monthStartSelect && monthStartSelect.value);
  const end = Number(monthEndSelect && monthEndSelect.value);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return;
  draftMonthRange = { start, end };
  lastValidMonthRange = { start, end };
  beginMonthRangeSelectGuard();
}

function commitMonthRangeSelection(which) {
  if (isMonthGrain()) return;
  const values = usesYearRange() ? availableReplacementRangeYears() : availableMonthsForSelection();
  if (!values.length) return;
  const start = Number(monthStartSelect.value);
  const end = Number(monthEndSelect.value);
  const previous = lastValidMonthRange || draftMonthRange || { start: values[0], end: values[values.length - 1] };
  if (which === "start" && start > end) {
    const revert = values.includes(Number(previous.start)) && Number(previous.start) <= end
      ? Number(previous.start)
      : (values.filter((value) => value <= end).slice(-1)[0] || end);
    monthStartSelect.value = String(revert);
    beginMonthRangeSelectGuard();
    return;
  }
  if (which === "end" && end < start) {
    const revert = values.includes(Number(previous.end)) && Number(previous.end) >= start
      ? Number(previous.end)
      : (values.filter((value) => value >= start)[0] || start);
    monthEndSelect.value = String(revert);
    beginMonthRangeSelectGuard();
    return;
  }
  captureDraftMonthRange();
}

function resetMonthRange() {
  customMonthRange = null;
  draftMonthRange = null;
  lastValidMonthRange = null;
  customReplacementYearRange = null;
  closeMonthPopover();
}

function coveragePopoverTrigger() {
  return isReplacementChart() ? yearRangeTop : yearMonthsTop;
}

function canOpenMonthPopover() {
  const trigger = coveragePopoverTrigger();
  if (!trigger || trigger.hidden || trigger.disabled) return false;
  if (yearMonthsTop && yearMonthsTop.classList.contains("ga-formula")) return false;
  return usesMonthCoverage() || usesYearRange() || isMonthGrain();
}

function prefersMonthPopoverHover() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function clearMonthPopoverCloseTimer() {
  if (monthPopoverCloseTimer) {
    clearTimeout(monthPopoverCloseTimer);
    monthPopoverCloseTimer = null;
  }
}

function syncReplacementCoverageOpenState() {
  if (!coverageWrap || !isReplacementChart()) return;
  const monthOpen = Boolean(monthPopover && !monthPopover.hidden && monthPopoverPinned);
  const metricOpen = Boolean(replacementMetricPopover && !replacementMetricPopover.hidden && replacementMetricPopoverPinned);
  coverageWrap.classList.toggle("is-open", monthOpen || metricOpen);
}

function closeMonthPopover() {
  clearMonthPopoverCloseTimer();
  if (monthRangeSelectGuardTimer) {
    clearTimeout(monthRangeSelectGuardTimer);
    monthRangeSelectGuardTimer = null;
  }
  monthRangeSelectActive = false;
  monthPopoverPinned = false;
  if (monthPopover) monthPopover.hidden = true;
  const trigger = coveragePopoverTrigger();
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  if (isReplacementChart()) syncReplacementCoverageOpenState();
  else if (coverageWrap) coverageWrap.classList.remove("is-open");
}

function openMonthPopover({ pin = false } = {}) {
  if (!canOpenMonthPopover()) return;
  forceCloseCampusDockUi();
  const alreadyOpen = monthPopover && !monthPopover.hidden;
  clearMonthPopoverCloseTimer();
  // Native <select> + hover reopen: never resync while already open or mid-edit.
  if (!alreadyOpen) {
  syncMonthRangeControls();
  }
  if (pin) monthPopoverPinned = true;
  if (monthPopover) monthPopover.hidden = false;
  const trigger = coveragePopoverTrigger();
  if (trigger) trigger.setAttribute("aria-expanded", "true");
  if (isReplacementChart()) syncReplacementCoverageOpenState();
  else if (coverageWrap) coverageWrap.classList.toggle("is-open", monthPopoverPinned);
}

function clearReplacementMetricPopoverCloseTimer() {
  if (replacementMetricPopoverCloseTimer) {
    clearTimeout(replacementMetricPopoverCloseTimer);
    replacementMetricPopoverCloseTimer = null;
  }
}

function closeReplacementMetricPopover() {
  clearReplacementMetricPopoverCloseTimer();
  replacementMetricPopoverPinned = false;
  if (replacementMetricPopover) replacementMetricPopover.hidden = true;
  if (replacementMetricTop) replacementMetricTop.setAttribute("aria-expanded", "false");
  syncReplacementCoverageOpenState();
}

function openReplacementMetricPopover({ pin = false } = {}) {
  if (!isReplacementChart() || !replacementMetricPopover || !replacementMetricTop) return;
  forceCloseCampusDockUi();
  clearReplacementMetricPopoverCloseTimer();
  renderReplacementMetricOptions();
  if (pin) replacementMetricPopoverPinned = true;
  replacementMetricPopover.hidden = false;
  replacementMetricTop.setAttribute("aria-expanded", "true");
  syncReplacementCoverageOpenState();
}

function scheduleCloseReplacementMetricPopover() {
  if (replacementMetricPopoverPinned) return;
  if (replacementMetricPopover && replacementMetricPopover.contains(document.activeElement)) return;
  if (coverageWrap && coverageWrap.matches(":hover")) return;
  clearReplacementMetricPopoverCloseTimer();
  replacementMetricPopoverCloseTimer = setTimeout(() => {
    replacementMetricPopoverCloseTimer = null;
    if (replacementMetricPopoverPinned) return;
    if (replacementMetricPopover && replacementMetricPopover.contains(document.activeElement)) return;
    if (coverageWrap && coverageWrap.matches(":hover")) return;
    closeReplacementMetricPopover();
  }, 240);
}

function scheduleCloseMonthPopover() {
  if (monthPopoverPinned || monthRangeSelectActive) return;
  if (monthPopover && monthPopover.contains(document.activeElement)) return;
  if (coverageWrap && coverageWrap.matches(":hover")) return;
  clearMonthPopoverCloseTimer();
  monthPopoverCloseTimer = setTimeout(() => {
    monthPopoverCloseTimer = null;
    if (monthPopoverPinned || monthRangeSelectActive) return;
    if (monthPopover && monthPopover.contains(document.activeElement)) return;
    if (coverageWrap && coverageWrap.matches(":hover")) return;
  closeMonthPopover();
  }, 240);
}

function updateAll() {
  updateChartSubtitle();
  if (isFriendlySpacesChart()) {
    syncGrainBodyClass();
    renderFriendlySpaces();
    return;
  }
  updateLocationScopeMeta();
  updateYearControlLabel();
  syncGrainBodyClass();
  updateDom();
  // Avoid resyncing open range controls — that overwrote in-progress start/end picks.
  renderTrendToggles();
  renderTrend();
  renderOverview();
  schedulePortalLayoutNotify();
}

let portalLayoutNotifyTimer = null;

function notifyPortalLayoutNow() {
  if (new URLSearchParams(window.location.search).get("portal") !== "1") return;
  try {
    window.parent.postMessage({ type: "oga:chart-layout" }, "*");
  } catch (_error) {
    /* ignore cross-origin */
  }
}

function schedulePortalLayoutNotify() {
  if (new URLSearchParams(window.location.search).get("portal") !== "1") return;
  if (portalLayoutNotifyTimer !== null) window.clearTimeout(portalLayoutNotifyTimer);
  portalLayoutNotifyTimer = window.setTimeout(() => {
    portalLayoutNotifyTimer = null;
    notifyPortalLayoutNow();
  }, 180);
}

function notifyPortalReady() {
  if (new URLSearchParams(window.location.search).get("portal") !== "1") return;
  try {
    window.parent.postMessage({ type: "oga:chart-ready" }, "*");
  } catch (_error) {
    /* ignore cross-origin */
  }
  schedulePortalLayoutNotify();
}

function populateYearSelect() {
  const series = currentSeries();
  yearSelect.innerHTML = "";
  if (!series.records || !series.records.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "無可用年份";
    yearSelect.appendChild(opt);
    selectedYear = "";
    yearSelect.value = "";
    return;
  }
  let records = [...series.records].sort((a, b) => b.year - a.year);
  if (isMonthGrain()) {
    const minYear = monthGrainMinYear();
    if (minYear != null) {
      records = records.filter((row) => Number(row.year) >= minYear);
    }
    records = records.filter((row) => monthlyRowsForYear(row.year).length > 0);
  }
  if (!records.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "無可用年份";
    yearSelect.appendChild(opt);
    selectedYear = "";
    yearSelect.value = "";
    return;
  }
  records.forEach((row) => {
    const opt = document.createElement("option");
    opt.value = String(row.year);
    opt.textContent = `${row.year} 年`;
    yearSelect.appendChild(opt);
  });
  const preferred = String(selectedYear || GA_DATA.defaultYear || series.defaultYear);
  selectedYear = records.some((row) => String(row.year) === preferred)
    ? preferred
    : String(records[0].year);
  yearSelect.value = selectedYear;
}

function initSelect() {
  if (isFriendlySpacesChart()) {
    initFriendlySpacesSelect();
    return;
  }
  if (GA_DATA.locations && GA_DATA.locations.length) {
    selectedLocation = GA_DATA.defaultLocation || GA_DATA.locations[0];
    const singleLocation = GA_DATA.locations.length <= 1;
    const hideLocationControl = singleLocation || isStreetlightChart();
    if (hideLocationControl) {
      locationControl.hidden = true;
      if (locationSelect) {
        locationSelect.hidden = true;
        locationSelect.disabled = true;
        locationSelect.innerHTML = "";
      }
      if (isStreetlightChart()) {
        selectedLocation = GA_DATA.defaultLocation || "全校區";
      }
    } else {
    locationControl.hidden = false;
      if (locationLabel) {
        locationLabel.textContent = GA_DATA.locationLabel || "選擇地點";
        locationLabel.setAttribute("for", "locationSelect");
      }
      locationSelect.hidden = false;
      locationSelect.disabled = false;
    locationSelect.innerHTML = "";
    GA_DATA.locations.forEach((location) => {
      const opt = document.createElement("option");
      opt.value = location;
      opt.textContent = location;
      locationSelect.appendChild(opt);
    });
    locationSelect.value = selectedLocation;
    locationSelect.addEventListener("change", (event) => {
      selectedLocation = event.target.value;
      resetMonthRange();
      populateYearSelect();
      updateAll();
    });
    }
    updateLocationScopeMeta();
  } else {
    locationControl.hidden = true;
    if (locationScope) {
      locationScope.hidden = true;
      locationScope.textContent = "";
    }
  }

  if (hasCategoryControl()) {
    categoryControl.hidden = false;
    selectedCategory = GA_DATA.defaultCategory;
    visibleTrendCategories = new Set([selectedCategory]);

    if (usesMetricSwitch()) {
      categoryControl.hidden = true;
      if (categorySelect) categorySelect.hidden = true;
      if (categoryChips) categoryChips.hidden = true;
      selectedCategory = GA_DATA.defaultCategory || GA_DATA.categories[0];
      visibleTrendCategories = new Set([selectedCategory]);
      renderMetricSwitch();
    } else if (usesCategoryChips()) {
      categoryControl.hidden = true;
      if (categorySelect) categorySelect.hidden = true;
      if (metricSwitch) metricSwitch.hidden = true;
      selectedCategory = GA_DATA.defaultCategory || GA_DATA.categories[0];
      visibleTrendCategories = new Set([selectedCategory]);
      renderCategoryChips();
    } else {
      categoryControl.classList.remove("ga-control-chips");
      if (metricSwitch) metricSwitch.hidden = true;
      if (categoryLabel) {
        categoryLabel.textContent = GA_DATA.categoryLabel || "選擇類別";
        categoryLabel.setAttribute("for", "categorySelect");
      }
      if (categorySelect) {
        categorySelect.hidden = false;
    categorySelect.innerHTML = "";
    GA_DATA.categories.forEach((category) => {
      const opt = document.createElement("option");
      opt.value = category;
          opt.textContent = categoryDisplayName(category);
      categorySelect.appendChild(opt);
    });
    categorySelect.value = selectedCategory;
    categorySelect.addEventListener("change", (event) => {
          selectCategoryFocus(event.target.value);
        });
      }
      if (categoryChips) categoryChips.hidden = true;
    }

    if (isReplacementChart()) categoryControl.hidden = true;
    overviewModeSwitch.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        overviewModeTouched = true;
        overviewMode = button.dataset.overviewMode;
        updateAll();
      });
    });
  } else {
    categoryControl.hidden = true;
    selectedCategory = GA_DATA.metric;
    visibleTrendCategories = new Set([selectedCategory]);
  }
  if (hasLocationOverviewMode() && !(GA_DATA.categories && GA_DATA.categories.length)) {
    overviewModeSwitch.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        overviewModeTouched = true;
        overviewMode = button.dataset.overviewMode;
        updateAll();
      });
    });
  }
  if (hasCategoryControl() || hasLocationOverviewMode()) {
    if (isStreetlightChart() && !overviewModeTouched) overviewMode = "location";
    syncOverviewModeControls();
  } else {
    setOverviewModeButtons("icons");
  }
  if (qualityModeSwitch) {
    qualityModeSwitch.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        if (!isStreetlightChart()) return;
        savingViewModeTouched = true;
        savingViewMode = button.dataset.qualityMode === "year" ? "year" : "location";
        updateAll();
      });
    });
  }
  if (isStreetlightChart() && !savingViewModeTouched) savingViewMode = "location";
  if (supportsMonthGrain() && timeGrainSwitch) {
    timeGrainSwitch.hidden = false;
    timeGrainSwitch.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.timeGrain === timeGrain);
      button.addEventListener("click", () => {
        const next = button.dataset.timeGrain === "month" ? "month" : "year";
        if (next === timeGrain) return;
        timeGrain = next;
        timeGrainSwitch.querySelectorAll("button").forEach((item) => {
          item.classList.toggle("active", item.dataset.timeGrain === timeGrain);
        });
        closeMonthPopover();
  populateYearSelect();
        if (isMonthGrain()) ensureSelectedMonth();
    updateAll();
  });
    });
  } else if (timeGrainSwitch) {
    timeGrainSwitch.hidden = true;
  }
  updateYearControlLabel();
  populateYearSelect();
  yearSelect.addEventListener("change", (event) => {
    selectYearFocus(event.target.value);
  });
  if (yearMonthsTop && !isReplacementChart()) {
  yearMonthsTop.addEventListener("click", (event) => {
    event.stopPropagation();
      if (!canOpenMonthPopover()) return;
      if (monthPopoverPinned) {
        closeMonthPopover();
        return;
      }
      openMonthPopover({ pin: true });
    });
  }
  if (coverageWrap) {
    coverageWrap.addEventListener("mouseenter", () => {
      if (!prefersMonthPopoverHover() || !canOpenMonthPopover()) return;
      if (isReplacementChart()) return;
      openMonthPopover({ pin: false });
    });
    coverageWrap.addEventListener("mouseleave", () => {
      if (!prefersMonthPopoverHover()) return;
      scheduleCloseMonthPopover();
      scheduleCloseReplacementMetricPopover();
    });
  }
  monthPopover.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  monthPopover.addEventListener("mouseenter", () => {
    clearMonthPopoverCloseTimer();
  });
  monthPopover.addEventListener("mouseleave", () => {
    if (!prefersMonthPopoverHover()) return;
    scheduleCloseMonthPopover();
  });
  const bindRangeSelectGuard = (select) => {
    if (!select) return;
    select.addEventListener("mousedown", () => beginMonthRangeSelectGuard());
    select.addEventListener("focus", () => beginMonthRangeSelectGuard());
    select.addEventListener("blur", () => endMonthRangeSelectGuard());
  };
  bindRangeSelectGuard(monthStartSelect);
  bindRangeSelectGuard(monthEndSelect);
  monthStartSelect.addEventListener("change", () => {
    if (isMonthGrain()) return;
    commitMonthRangeSelection("start");
  });
  monthEndSelect.addEventListener("change", () => {
    if (isMonthGrain()) return;
    commitMonthRangeSelection("end");
  });
  monthApplyBtn.addEventListener("click", () => {
    const start = Number(monthStartSelect.value);
    const end = Number(monthEndSelect.value);
    if (isMonthGrain()) {
      selectedMonth = start;
      closeMonthPopover();
      updateAll();
      return;
    }
    if (start > end) {
      commitMonthRangeSelection("start");
      return;
    }
    if (usesYearRange()) {
      customReplacementYearRange = { start, end };
      draftMonthRange = { start, end };
      lastValidMonthRange = { start, end };
    } else {
      customMonthRange = { start, end };
      draftMonthRange = { start, end };
      lastValidMonthRange = { start, end };
    }
    closeMonthPopover();
    updateAll();
  });
  monthResetBtn.addEventListener("click", () => {
    if (isMonthGrain()) {
      selectedMonth = null;
      ensureSelectedMonth();
      closeMonthPopover();
      updateAll();
      return;
    }
    resetMonthRange();
    updateAll();
  });
  document.addEventListener("click", (event) => {
    closeMonthPopover();
    closeReplacementMetricPopover();
    if (!event.target.closest("#campusDock")) forceCloseCampusDockUi();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMonthPopover();
      closeReplacementMetricPopover();
      forceCloseCampusDockUi();
    }
  });
  // Embed host clicks never reach this document; close pinned menus on blur / parent signal.
  window.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (monthRangeSelectActive) return;
      if (monthPopover && monthPopover.contains(document.activeElement)) return;
      if (replacementMetricPopover && replacementMetricPopover.contains(document.activeElement)) return;
      if (campusDock && campusDock.contains(document.activeElement)) return;
      closeMonthPopover();
      closeReplacementMetricPopover();
      forceCloseCampusDockUi();
    }, 0);
  });
  window.addEventListener("message", (event) => {
    if (!event.data || event.data.type !== "oga:close-popovers") return;
    closeMonthPopover();
    closeReplacementMetricPopover();
    forceCloseCampusDockUi();
  });
}

function showError(error) {
  document.getElementById("gaWidget").innerHTML = `<div class="ga-error">資料載入失敗：${escapeText(error.message)}</div>`;
}

fetch(`./data.json?t=${Date.now()}`)
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((data) => {
    GA_DATA = data;
    document.body.classList.toggle("ga-replacement-chart", isReplacementChart());
    document.body.classList.toggle("ga-ecoco-chart", isEcocoChart());
    document.body.classList.toggle("ga-friendly-spaces-chart", isFriendlySpacesChart());
    document.body.classList.toggle("ga-has-category-chips", usesCategoryChips() || isFriendlySpacesChart());
    if (isStreetlightChart()) {
      overviewMode = "location";
      overviewModeTouched = false;
      savingViewMode = "location";
      savingViewModeTouched = false;
      focusedCampus = GA_DATA.defaultLocation || "全校區";
    }
    placeReplacementCoverageControl();
    initSelect();
    initCampusDock();
    bindMeanLegendToggle();
    updateAll();
    notifyPortalReady();
  })
  .catch(showError);

window.addEventListener("resize", () => {
  schedulePlotResize();
});

if (typeof ResizeObserver === "function") {
  const plotResizeObserver = new ResizeObserver(() => schedulePlotResize());
  ["trendChart", "overviewChart"].forEach((id) => {
    const node = document.getElementById(id);
    if (node) plotResizeObserver.observe(node);
  });
}

}
