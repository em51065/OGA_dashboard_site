// A real native DOM surface. It does not create a browsing context or an iframe.
const realWindow = window;
const realDocument = document;

function scopeSelector(selector) {
  return selector.replace(/(?<![-\w])html(?![-\w])|:root/g, "[data-sus-html]").replace(/(?<![-\w])body(?![-\w])/g, "[data-sus-body]").replace(/(?<![-\w])head(?![-\w])/g, "[data-sus-head]");
}

function scopeCss(css) {
  return css.replace(/\bhtml\b|:root/g, "[data-sus-html]")
    .replace(/\bbody\b/g, "[data-sus-body]")
    .replace(/@media\s+([^{}]+)\{/g, (all, condition) => {
      if (/(?:min|max)-width/.test(condition) && !/hover|pointer|print|orientation/.test(condition)) {
        return `@container sus-view ${condition.replace(/screen\s+and\s+/g, "")} {`;
      }
      return all;
    })
    .replace(/(-?\d*\.?\d+)vw\b/g, "$1cqw")
    .replace(/(-?\d*\.?\d+)vh\b/g, "calc($1 * var(--sus-vh))")
    .replace(/(-?\d*\.?\d+)rem\b/g, "calc($1 * var(--sus-rem))");
}

export function createSurface(host, { html, css, url, parent = null, history = false }) {
  const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
  shadow.innerHTML = "";
  const reset = realDocument.createElement("style");
  reset.textContent = ":host{all:initial;display:block;min-width:0;width:100%;color-scheme:light} [data-sus-viewport]{container:sus-view / inline-size} [data-sus-html]{display:block;min-width:0} [data-sus-head]{display:none} [data-sus-body]{display:block} [hidden]{display:none!important}";
  shadow.append(reset);
  // Browsing-context viewports use integral CSS pixels; preserve that measurement without an iframe.
  const viewport = realDocument.createElement("div");
  viewport.dataset.susViewport = "";
  viewport.style.width = `${host.clientWidth}px`;
  viewport.style.setProperty("--sus-rem", realWindow.getComputedStyle(host).fontSize);
  viewport.style.setProperty("--sus-vh", `${(parent ? host.clientHeight : realWindow.innerHeight) / 100}px`);
  if (parent) viewport.style.position = "relative";
  const root = realDocument.createElement("div");
  root.dataset.susHtml = "";
  const head = realDocument.createElement("div");
  head.dataset.susHead = "";
  const body = realDocument.createElement("div");
  body.dataset.susBody = "";
  body.innerHTML = html;
  root.append(head, body);
  viewport.append(root);
  shadow.append(viewport);
  const cleanups = [], timers = new Set(), rafs = new Set(), observers = new Set();
  const events = new EventTarget();
  const localEventTypes = new Set(["message", "resize", "popstate", "blur"]);
  let disposed = false;
  let location = new URL(url, realWindow.location.href);
  const locals = {};
  const styleText = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
  function createElement(tag, options) {
    const node = realDocument.createElement(tag, options);
    if (tag.toLowerCase() === "style") {
      Object.defineProperty(node, "textContent", {
        get: () => styleText.get.call(node),
        set: (value) => styleText.set.call(node, scopeCss(value)),
      });
    }
    return node;
  }
  const doc = new Proxy(realDocument, {
    get(target, key) {
      const overrides = {
        documentElement: root, body, head, defaultView: win, location,
        activeElement: root.contains(shadow.activeElement) ? shadow.activeElement : null, readyState: "complete",
        getElementById: (id) => viewport.querySelector("#" + CSS.escape(id)),
        querySelector: (selector) => viewport.querySelector(scopeSelector(selector)),
        querySelectorAll: (selector) => viewport.querySelectorAll(scopeSelector(selector)),
        getElementsByClassName: (name) => viewport.querySelectorAll("." + CSS.escape(name)),
        getElementsByTagName: (tag) => tag === "head" ? [head] : tag === "body" ? [body] : viewport.querySelectorAll(tag),
        createElement,
        addEventListener: (...args) => { if (!disposed) { viewport.addEventListener(...args); cleanups.push(() => viewport.removeEventListener(...args)); } },
        removeEventListener: (...args) => viewport.removeEventListener(...args),
      };
      if (key in overrides) return overrides[key];
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const timeout = (fn, delay, ...args) => {
    if (disposed) return 0;
    const id = realWindow.setTimeout(() => { timers.delete(id); if (!disposed) fn(...args); }, delay);
    timers.add(id);
    return id;
  };
  const raf = (fn) => {
    if (disposed) return 0;
    const id = realWindow.requestAnimationFrame((time) => { rafs.delete(id); if (!disposed) fn(time); });
    rafs.add(id);
    return id;
  };
  function listen(type, listener, options) {
    if (disposed) return;
    const target = localEventTypes.has(type) ? events : realWindow;
    target.addEventListener(type, listener, options);
    cleanups.push(() => target.removeEventListener(type, listener, options));
  }
  function matchMedia(query) {
    if (!/(min|max)-width/.test(query)) {
      const media = realWindow.matchMedia(query);
      return { get matches() { return media.matches; }, media: query,
        addEventListener: (type, fn) => { media.addEventListener(type, fn); cleanups.push(() => media.removeEventListener(type, fn)); },
        addListener: (fn) => { media.addListener(fn); cleanups.push(() => media.removeListener(fn)); },
      };
    }
    const media = new EventTarget();
    media.media = query;
    const calculate = () => [...query.matchAll(/(min|max)-width\s*:\s*([\d.]+)px/g)].every((m) => m[1] === "min" ? host.clientWidth >= Number(m[2]) : host.clientWidth <= Number(m[2]));
    media.matches = calculate();
    media.addListener = (fn) => media.addEventListener("change", fn);
    media.removeListener = (fn) => media.removeEventListener("change", fn);
    const check = () => { const next = calculate(); if (next !== media.matches) { media.matches = next; media.dispatchEvent(new Event("change")); } };
    events.addEventListener("resize", check);
    cleanups.push(() => events.removeEventListener("resize", check));
    return media;
  }
  const win = new Proxy(realWindow, {
    get(target, key) {
      if (key in locals) return locals[key];
      const overrides = {
        document: doc, window: win, self: win, parent: parent || (realWindow.parent === realWindow ? win : realWindow.parent),
        top: parent || win, location, innerWidth: host.clientWidth, innerHeight: parent ? host.clientHeight : realWindow.innerHeight,
        scrollY: 0, scrollX: 0, matchMedia, setTimeout: timeout, clearTimeout: (id) => { timers.delete(id); realWindow.clearTimeout(id); },
        requestAnimationFrame: raf, cancelAnimationFrame: (id) => { rafs.delete(id); realWindow.cancelAnimationFrame(id); },
        addEventListener: listen,
        removeEventListener: (type, fn, options) => (localEventTypes.has(type) ? events : realWindow).removeEventListener(type, fn, options),
        postMessage: (data) => timeout(() => events.dispatchEvent(new MessageEvent("message", {data, origin: realWindow.location.origin})), 0),
        history: {
          pushState: (state, _, value) => updateHistory("pushState", state, value),
          replaceState: (state, _, value) => updateHistory("replaceState", state, value),
        },
      };
      if (key in overrides) return overrides[key];
      const value = Reflect.get(target, key, target);
      return typeof value === "function" && !/^[A-Z]/.test(String(key)) ? value.bind(target) : value;
    },
    set(_target, key, value) { locals[key] = value; return true; },
  });
  function updateHistory(method, state, value) {
    location = new URL(value, location);
    if (history) realWindow.history[method](state, "", location);
  }
  // Leaving the former frame blurred its window; a native shadow root needs this bridge.
  const blur = () => events.dispatchEvent(new Event("blur"));
  const focusOut = (event) => {
    if (!viewport.contains(event.relatedTarget)) blur();
  };
  viewport.addEventListener("focusout", focusOut);
  realWindow.addEventListener("blur", blur);
  cleanups.push(() => viewport.removeEventListener("focusout", focusOut));
  cleanups.push(() => realWindow.removeEventListener("blur", blur));
  if (!parent && realWindow.parent !== realWindow) {
    const receive = (event) => {
      if (event.source === realWindow.parent) events.dispatchEvent(new MessageEvent("message", {
        data: event.data, origin: event.origin, source: event.source,
      }));
    };
    realWindow.addEventListener("message", receive);
    cleanups.push(() => realWindow.removeEventListener("message", receive));
  }
  if (history) {
    const pop = (event) => {
      location = new URL(realWindow.location.href);
      events.dispatchEvent(new PopStateEvent("popstate", {state: event.state}));
    };
    realWindow.addEventListener("popstate", pop);
    cleanups.push(() => realWindow.removeEventListener("popstate", pop));
  }
  function trackedObserver(Base) {
    return class extends Base {
      constructor(fn) { super((...args) => { if (!disposed) fn(...args); }); observers.add(this); }
      observe(...args) { if (!disposed) { observers.add(this); return super.observe(...args); } }
      disconnect() { super.disconnect(); observers.delete(this); }
    };
  }
  const ScopeResizeObserver = trackedObserver(ResizeObserver);
  const ScopeMutationObserver = trackedObserver(MutationObserver);
  let oldWidth = -1, oldHeight = -1;
  const syncViewport = () => {
    const width = host.clientWidth;
    const height = parent ? host.clientHeight : realWindow.innerHeight;
    if (parent) {
      // Lay out on the same pixel origin used by the former child browsing context.
      const rect = host.getBoundingClientRect();
      viewport.style.left = `${Math.round(rect.left) - rect.left}px`;
      viewport.style.top = `${Math.round(rect.top) - rect.top}px`;
    }
    if (width !== oldWidth || height !== oldHeight) {
      oldWidth = width; oldHeight = height;
      viewport.style.width = `${width}px`;
      viewport.style.setProperty("--sus-vh", `${height / 100}px`);
      events.dispatchEvent(new Event("resize"));
    }
  };
  const resize = new ScopeResizeObserver(syncViewport);
  resize.observe(host);
  if (!parent) {
    realWindow.addEventListener("resize", syncViewport);
    cleanups.push(() => realWindow.removeEventListener("resize", syncViewport));
  }
  if (!parent) {
    // Preserve the original document's scroll extent, including clipped fractional overflow.
    const extent = new ScopeResizeObserver(() => {
      viewport.style.minHeight = `${Math.max(root.scrollHeight, body.scrollHeight)}px`;
    });
    extent.observe(body);
  }
  const style = createElement("style");
  style.textContent = css;
  head.append(style);
  const scope = { document: doc, window: win, ResizeObserver: ScopeResizeObserver, MutationObserver: ScopeMutationObserver,
    setTimeout: timeout, clearTimeout: win.clearTimeout, requestAnimationFrame: raf, cancelAnimationFrame: win.cancelAnimationFrame };
  return { ...scope, shadow, body, head, scope, dispose() {
    disposed = true;
    cleanups.forEach((fn) => fn());
    timers.forEach((id) => realWindow.clearTimeout(id));
    rafs.forEach((id) => realWindow.cancelAnimationFrame(id));
    [...observers].forEach((observer) => observer.disconnect());
    for (const node of viewport.querySelectorAll(".js-plotly-plot")) scope.Plotly?.purge(node);
    if (viewport.parentNode === shadow) shadow.replaceChildren();
  }};
}
