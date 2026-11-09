let pinnedVersion = new URL(import.meta.url).searchParams.get("v");
let resources;
function versionedUrl(path, version) {
  const url = new URL(path, import.meta.url);
  url.searchParams.set("v", version);
  return url.href;
}
async function json(url, signal) {
  const response = await fetch(url, { signal, credentials: "same-origin", cache: "no-cache" });
  if (!response.ok) throw new Error(`資料尚未就緒（HTTP ${response.status}）`);
  return response.json();
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
async function loadResources() {
  const manifestUrl = pinnedVersion
    ? versionedUrl("./generated/version.json", pinnedVersion)
    : new URL("./generated/version.json", import.meta.url).href;
  const manifest = await json(manifestUrl);
  if (!manifest || manifest.schema_version !== 1 || !/^[a-f0-9]{64}$/.test(manifest.version)
      || (pinnedVersion && manifest.version !== pinnedVersion)) {
    throw new Error("永續程式版本已更新或不完整，請重新整理頁面。");
  }
  pinnedVersion = manifest.version;
  const assetUrl = (path) => versionedUrl(path, pinnedVersion);
  // The entry URL's version does not propagate into child imports automatically.
  const [templates, catalog, chart, explorer, navigation, plotly, lucide, surface] = await Promise.all([
    json(assetUrl("./generated/templates.json")), json(assetUrl("./generated/catalog.json")),
    import(assetUrl("./generated/chart.mjs")), import(assetUrl("./generated/explorer.mjs")),
    import(assetUrl("./generated/nav-config.mjs")), import(assetUrl("./generated/plotly.mjs")),
    import(assetUrl("./generated/lucide.mjs")), import(assetUrl("./surface.mjs")),
  ]);
  return { version: pinnedVersion, assetUrl, templates, catalog, chart, explorer, navigation, plotly, lucide, surface };
}
function chartHtml(template, chart, assetUrl) {
  const replacements = {
    __CHART_TITLE__: chart.title,
    __CHART_SUBTITLE__: chart.subtitle,
    __CHART_SUBTITLE_EXTRA__: chart.subtitle_extra || "",
    __CHART_SUBTITLE_EXTRA_HIDDEN__: chart.subtitle_extra ? "" : "hidden",
    __VALUE_NOUN__: chart.value_noun,
  };
  let html = template.replace(/__[A-Z_]+__/g, (token) => escapeHtml(replacements[token] ?? token));
  if (["led_replacement", "streetlight"].includes(chart.type)) html = html.replace(`歷史排名-${chart.value_noun}`, "節省瓦數");
  return html.replaceAll('src="./campus-base-display.webp"', `src="${assetUrl("./assets/campus-base-display.webp")}"`);
}

export async function mountDashboard(host, options = {}) {
  host.sustainabilityDispose?.();
  const controller = new AbortController();
  let outer, child, sequence = 0, disposed = false;
  host.setAttribute("aria-busy", "true");
  delete host.dataset.error;
  delete host.dataset.mounted;
  delete host.dataset.assetVersion;
  const dispose = () => { disposed = true; sequence++; controller.abort(); child?.dispose(); outer?.dispose(); };
  host.sustainabilityDispose = dispose;
  try {
    // Do not download chart engines when the surrounding page only shows ranking tabs.
    resources ||= loadResources()
      .catch((error) => { resources = undefined; throw error; });
    const {version, assetUrl, templates, catalog, chart: {mount: mountChart}, explorer: {mount: mountExplorer},
      navigation: {mount: mountNavigation}, plotly: {createVendor: createPlotly}, lucide: {createVendor: createLucide},
      surface: {createSurface}} = await resources;
    const payloads = options.payloads || await json(options.dataUrl || host.dataset.source, controller.signal);
    if (disposed) return dispose;
    const byId = Object.fromEntries(catalog.map((chart) => [chart.id, chart]));
    if (Object.keys(byId).some((id) => !payloads[id])) throw new Error("12 個圖表資料不完整，請確認同批次匯入驗證。 ");
    const url = new URL(options.url || location.href);
    const embedded = options.embedded || host.dataset.embedded === "true";
    if (embedded) { url.searchParams.set("embed", "1"); url.searchParams.set("layout", "content"); }
    async function loadChart(id, chartHost = outer.document.getElementById("chartFrame"), standalone = false) {
      const generation = ++sequence;
      child?.dispose();
      const chartUrl = new URL(url);
      if (!standalone) chartUrl.search = "?portal=1";
      child = createSurface(chartHost, { html: chartHtml(templates.chart, byId[id], assetUrl), css: templates.chartCss.replaceAll("./inclusive-restroom.png", assetUrl("./assets/inclusive-restroom.png")),
        url: chartUrl, parent: standalone ? null : outer.window });
      chartHost.sustainabilitySurface = child;
      child.scope.assetUrl = assetUrl;
      child.scope.Plotly = createPlotly(child.document, child.window);
      child.window.Plotly = child.scope.Plotly;
      const react = child.scope.Plotly.react.bind(child.scope.Plotly);
      const current = child;
      child.scope.Plotly.react = (node, ...args) => {
        if (disposed || generation !== sequence) return Promise.resolve();
        return react(typeof node === "string" ? current.document.getElementById(node) : node, ...args);
      };
      child.scope.fetch = async () => {
        if (disposed || generation !== sequence) throw new DOMException("Disposed", "AbortError");
        return new Response(JSON.stringify(payloads[id]), {headers: {"Content-Type": "application/json"}});
      };
      // Assets referenced dynamically by the retained map renderer are scoped to the component.
      const imageObserver = new child.scope.MutationObserver(() => {
        for (const image of current.shadow.querySelectorAll('img[src="./inclusive-restroom.png"], img[src="inclusive-restroom.png"]')) {
          image.src = assetUrl("./assets/inclusive-restroom.png");
        }
      });
      imageObserver.observe(child.body, {childList: true, subtree: true});
      mountChart(child.scope);
      chartHost.dataset.chart = id;
      chartHost.dispatchEvent(new Event("load"));
    }
    if (options.standalone || host.dataset.standalone === "true") {
      const id = host.dataset.chartId || url.searchParams.get("chart") || "ecoco";
      if (!byId[id]) throw new Error("未知圖表");
      await loadChart(id, host, true);
    } else {
      outer = createSurface(host, { html: templates.explorer, css: templates.explorerCss, url,
        history: !embedded });
      outer.window.lucide = createLucide(outer.document, outer.window);
      outer.scope.fullUrl = options.fullUrl || host.dataset.fullUrl || "";
      outer.scope.chartHref = (id) => {
        const pattern = options.chartUrlTemplate || host.dataset.chartUrlTemplate;
        return pattern ? pattern.replace("__chart__", encodeURIComponent(id)) : new URL(`../charts/${encodeURIComponent(id)}/`, import.meta.url).href;
      };
      mountNavigation(outer.scope);
      outer.scope.fetch = async (path) => {
        const match = /charts\/([^/]+)\//.exec(path);
        return new Response(JSON.stringify(payloads[match?.[1]] || {}));
      };
      mountExplorer(outer.scope, (id) => loadChart(id).catch((error) => {
        const loading = outer.document.getElementById("loadingState");
        loading.hidden = false;
        loading.textContent = `資料載入失敗：${error.message}`;
      }));
    }
    host.dataset.mounted = "true";
    host.dataset.assetVersion = version;
    host.setAttribute("aria-busy", "false");
  } catch (error) {
    if (disposed) return dispose;
    child?.dispose(); outer?.dispose();
    const message = document.createElement("p");
    message.setAttribute("role", "alert");
    message.textContent = `永續資料尚未就緒：${error.message}`;
    (host.shadowRoot || host).replaceChildren(message);
    host.setAttribute("aria-busy", "false");
    host.dataset.error = "true";
    console.error(error);
  }
  return dispose;
}

for (const host of document.querySelectorAll("[data-sustainability-dashboard]")) {
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); mountDashboard(host); }
  });
  observer.observe(host);
  window.addEventListener("pagehide", (event) => {
    // A persisted page is frozen, not destroyed; retain its chart and filter state for Back.
    if (event.persisted) return;
    observer.disconnect();
    host.sustainabilityDispose?.();
  });
}
