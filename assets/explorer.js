"use strict";

const CHARTS = {
  ecoco: { title: "ECOCO", theme: "減廢與循環" },
  "general-recycle": { title: "一般回收", theme: "減廢與循環" },
  "resource-recycle": { title: "資源回收", theme: "減廢與循環" },
  "food-waste-recycle": { title: "廚餘回收", theme: "減廢與循環" },
  "rainwater-reuse": { title: "中軸雨水回收", theme: "水資源" },
  "water-use": { title: "用水量", theme: "能源與水資源" },
  "electricity-use": { title: "用電量", theme: "能源與水資源" },
  "solar-energy": { title: "太陽能", theme: "再生能源" },
  "led-replacement": { title: "LED燈具汰換", theme: "節能汰換" },
  "streetlight-replacement": { title: "路燈汰換", theme: "節能汰換" },
};

const frame = document.getElementById("chartFrame");
const stage = document.getElementById("chartStage");
const loading = document.getElementById("loadingState");
const activeTitle = document.getElementById("activeChartTitle");
const mobileSelect = document.getElementById("mobileChartSelect");
const standaloneLink = document.getElementById("standaloneLink");
const sourceInfo = document.getElementById("sourceInfo");

let currentChart = "ecoco";
let childResizeObserver = null;
let childMutationObserver = null;
let childDecorateTimer = null;
let childWindow = null;
let measureFrameId = null;
let lastFrameHeight = 0;

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

function reportOuterHeight() {
  if (window.parent === window) return;
  window.requestAnimationFrame(() => {
    window.parent.postMessage({
      type: "oga:resize",
      height: Math.ceil(document.documentElement.scrollHeight),
    }, "*");
  });
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
    const rect = root.getBoundingClientRect();
    const height = Math.max(360, Math.ceil(rect.height + Math.max(0, rect.top) + 3));
    if (Math.abs(height - lastFrameHeight) < 2) return;
    lastFrameHeight = height;
    frame.style.height = `${height}px`;
    reportOuterHeight();
  } catch (_error) {
    frame.style.height = "1200px";
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
  if (childWindow) childWindow.removeEventListener("resize", scheduleFrameMeasure);
  childWindow = null;
}


function closeNavGroups() {
  document.querySelectorAll(".oga-nav-group.is-open").forEach((group) => {
    group.classList.remove("is-open");
  });
  updateGroupExpandedState();
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
  if (text.includes("\u5e74\u5ea6\u63a8\u9032") || text.includes("\u975eLED\u6c70\u63db") || text.includes("\u6c70\u63db\u6578\u7e3d\u89bd") || text.includes("\u6c70\u63db\u91cf\u7e3d\u89bd")) return "REPLACEMENT MIX";
  if (text.includes("\u6539\u5584\u54c1\u8cea") || text.includes("\u6c70\u63db\u54c1\u8cea\u6bd4\u8f03") || text.includes("\u6c70\u63db\u6548\u76ca\u7e3d\u89bd")) return "REPLACEMENT EFFICIENCY";
  if (text.includes("歷史排名")) return "HISTORICAL RANKING";
  if (text.includes("歷史趨勢")) return "HISTORICAL TREND";
  if (text.includes("年度總覽")) return "ANNUAL OVERVIEW";
  if (text.includes("地點總覽") || text.includes("校區總覽")) return "LOCATION VIEW";
  if (text.includes("類別佔比")) return "CATEGORY SHARE";
  if (text.includes("地點排名") || text.includes("校區排名")) return "LOCATION RANKING";
  return "DATA VIEW";
}

function decorateBlockTitles(doc) {
  doc.querySelectorAll(".ga-card-title h2, .ga-overview-head h3").forEach((heading) => {
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
        content: "${["led-replacement", "streetlight-replacement"].includes(currentChart) ? "REPLACEMENT EFFICIENCY" : "HISTORICAL TREND"}";
        pointer-events: none;
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

  scheduleFrameMeasure();
  window.setTimeout(scheduleFrameMeasure, 120);
  window.setTimeout(scheduleFrameMeasure, 500);
  window.setTimeout(scheduleFrameMeasure, 1400);
  doc.fonts?.ready.then(scheduleFrameMeasure).catch(() => {});
}

async function updateSourceInfo(chartId) {
  if (!sourceInfo) return;
  try {
    const response = await fetch(`../charts/${chartId}/data.json?t=${Date.now()}`);
    if (!response.ok) throw new Error(String(response.status));
    const payload = await response.json();
    if (chartId !== currentChart) return;
    sourceInfo.textContent = `來源：${payload.sourceFile || "總務處彙整資料"} · ${payload.sheet || CHARTS[chartId].title}`;
  } catch (_error) {
    sourceInfo.textContent = `來源：總務處彙整資料 · ${CHARTS[chartId].title}`;
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
  const sameChart = chartId === currentChart && frame.src !== "about:blank";
  currentChart = chartId;
  renderNavigation();
  updateUrl(historyMode);
  closeNavGroups();
  if (sameChart) return;

  detachChildObservers();
  lastFrameHeight = 0;
  stage.setAttribute("aria-busy", "true");
  loading.hidden = false;
  frame.title = `${CHARTS[chartId].title}互動圖表`;
  frame.src = `../charts/${chartId}/?portal=1&t=${Date.now()}`;
  updateSourceInfo(chartId);
  reportOuterHeight();
}

function bindEvents() {
  document.querySelectorAll(".oga-nav-group-trigger").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const group = trigger.closest(".oga-nav-group");
      const shouldOpen = group && !group.classList.contains("is-open");
      closeNavGroups();
      if (group && shouldOpen) group.classList.add("is-open");
      updateGroupExpandedState();
    });
  });

  document.querySelectorAll("[data-chart]").forEach((button) => {
    button.addEventListener("click", () => switchChart(button.dataset.chart));
    button.addEventListener("mouseenter", () => {
      const chartId = button.dataset.chart;
      fetch(`../charts/${chartId}/data.json`, { cache: "force-cache" }).catch(() => {});
    }, { once: true });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".oga-nav-group")) closeNavGroups();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNavGroups();
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
