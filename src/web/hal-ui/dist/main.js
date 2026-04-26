"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/web/hal-ui/store.ts
  var store_exports = {};
  __export(store_exports, {
    applyModeAccent: () => applyModeAccent,
    convertDistance: () => convertDistance,
    convertTemp: () => convertTemp,
    convertWeight: () => convertWeight,
    distanceUnit: () => distanceUnit,
    formatDateTimeValue: () => formatDateTimeValue,
    formatSensorValue: () => formatSensorValue,
    formatTimeValue: () => formatTimeValue,
    getStore: () => getStore,
    setStore: () => setStore,
    subscribe: () => subscribe,
    tempUnit: () => tempUnit,
    weightUnit: () => weightUnit
  });
  function getStore() {
    return state;
  }
  function setStore(partial) {
    state = { ...state, ...partial };
    listeners.forEach((l) => l());
  }
  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
  function convertTemp(celsius, to) {
    if (to === "imperial") return celsius * 9 / 5 + 32;
    return celsius;
  }
  function tempUnit(system) {
    return system === "imperial" ? "F" : "C";
  }
  function convertWeight(kg, to) {
    if (to === "imperial") return kg * 2.20462;
    return kg;
  }
  function weightUnit(system) {
    return system === "imperial" ? "lb" : "kg";
  }
  function convertDistance(m, to) {
    if (to === "imperial") return m * 3.28084;
    return m;
  }
  function distanceUnit(system) {
    return system === "imperial" ? "ft" : "m";
  }
  function formatSensorValue(value, metric, system) {
    switch (metric) {
      case "temperature":
        return { value: convertTemp(value, system), unit: tempUnit(system) };
      case "weight":
        return { value: convertWeight(value, system), unit: weightUnit(system) };
      default:
        return { value, unit: getMetricUnit(metric) };
    }
  }
  function getMetricUnit(metric) {
    switch (metric) {
      case "humidity":
      case "soil_moisture":
      case "water_level":
        return "%";
      case "co2":
        return "ppm";
      case "light":
        return "lux";
      case "ph":
        return "";
      default:
        return "";
    }
  }
  function formatTimeValue(date, format) {
    if (format === "12h") {
      return date.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
  }
  function formatDateTimeValue(date, format) {
    if (format === "12h") {
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    }
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  }
  function applyModeAccent(mode) {
    const root = document.documentElement;
    root.dataset.mode = mode.toLowerCase();
    const def = modeDefinitions[mode];
    root.style.setProperty("--accent", def.accent);
    root.style.setProperty("--accent-bright", def.accentBright);
    root.style.setProperty("--bg-primary", def.bgPrimary);
    root.style.setProperty("--bg-secondary", def.bgSecondary);
    root.style.setProperty("--bg-tertiary", def.bgTertiary);
    root.style.setProperty("--border", def.border);
    root.style.setProperty("--border-subtle", def.borderSubtle);
  }
  var listeners, state, modeDefinitions;
  var init_store = __esm({
    "src/web/hal-ui/store.ts"() {
      "use strict";
      listeners = /* @__PURE__ */ new Set();
      state = {
        mode: "CALM",
        activeView: "dashboard",
        unitSystem: "metric",
        timeFormat: "24h",
        sidebarCollapsed: false,
        devices: [],
        decisions: [],
        sensors: {},
        cameras: [],
        uptime: 0,
        decisionsToday: 0,
        agentStatus: "active",
        halStatus: "online",
        mqttStatus: "connected",
        dbStatus: "healthy",
        autoMode: true
      };
      modeDefinitions = {
        CALM: {
          accent: "#238636",
          accentBright: "#3FB950",
          bgPrimary: "#07110C",
          bgSecondary: "#0E1A14",
          bgTertiary: "#14251B",
          border: "#254332",
          borderSubtle: "#182B20"
        },
        OPERATOR: {
          accent: "#E0A11B",
          accentBright: "#F6C453",
          bgPrimary: "#120D05",
          bgSecondary: "#1D160A",
          bgTertiary: "#2A210F",
          border: "#4A3714",
          borderSubtle: "#33250E"
        },
        DIAGNOSTIC: {
          accent: "#2F81F7",
          accentBright: "#58A6FF",
          bgPrimary: "#07101E",
          bgSecondary: "#0D1627",
          bgTertiary: "#13213A",
          border: "#263D63",
          borderSubtle: "#172A47"
        }
      };
    }
  });

  // src/web/hal-ui/components/VegaChart.ts
  var VegaChart_exports = {};
  __export(VegaChart_exports, {
    renderVegaAreaCard: () => renderVegaAreaCard,
    renderVegaBarCard: () => renderVegaBarCard,
    renderVegaHeroChart: () => renderVegaHeroChart,
    renderVegaLineCard: () => renderVegaLineCard,
    renderVegaSparkline: () => renderVegaSparkline
  });
  function renderVegaHeroChart(layers, containerId, decisions = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (layers.length === 0) {
      container.innerHTML = '<div class="chart-empty">No sensor data</div>';
      return;
    }
    const store = getStore();
    const values = [];
    for (const layer of layers) {
      for (const reading of layer.data) {
        const converted = formatSensorValue(reading.value, layer.metric, store.unitSystem);
        values.push({
          timestamp: reading.timestamp,
          time: new Date(reading.timestamp).getTime(),
          value: converted.value,
          metric: layer.metric,
          metricLabel: metricConfig[layer.metric]?.label || layer.metric,
          device: layer.deviceName,
          color: layer.color
        });
      }
    }
    const allTimes = values.map((v) => v.time);
    const tMin = Math.min(...allTimes);
    const tMax = Math.max(...allTimes);
    const decisionRules = decisions.filter((d) => {
      const t = new Date(d.timestamp).getTime();
      return t >= tMin && t <= tMax;
    }).map((d) => ({
      timestamp: d.timestamp,
      decision: d.decision.slice(0, 40),
      status: d.status || "pending",
      confidence: d.confidence ?? 0.5
    }));
    const spec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      height: 280,
      background: "transparent",
      padding: { left: 10, right: 10, top: 10, bottom: 10 },
      data: { values },
      layer: [
        // Area fills
        {
          mark: { type: "area", opacity: 0.15, line: false },
          encoding: {
            x: { field: "time", type: "temporal", title: null, axis: { grid: false, labels: false, ticks: false } },
            y: { field: "value", type: "quantitative", title: null, axis: { grid: true, gridColor: "#30363D", gridDash: [2, 3], labelColor: "#484F58", tickColor: "#30363D" } },
            color: { field: "metric", type: "nominal", scale: null, legend: null },
            detail: { field: "device", type: "nominal" }
          },
          transform: [
            { calculate: "datum.color", as: "metricColor" }
          ]
        },
        // Line strokes
        {
          mark: { type: "line", strokeWidth: 2, interpolate: "monotone" },
          encoding: {
            x: { field: "time", type: "temporal", title: null, axis: { grid: false, labelColor: "#484F58", tickColor: "#30363D", format: "%H:%M" } },
            y: { field: "value", type: "quantitative", title: null, axis: { grid: true, gridColor: "#30363D", gridDash: [2, 3], labelColor: "#484F58", tickColor: "#30363D" } },
            color: { field: "metric", type: "nominal", legend: { orient: "bottom", labelColor: "#8B949E", title: null } },
            detail: { field: "device", type: "nominal" }
          }
        },
        // Decision markers
        ...decisionRules.length > 0 ? [{
          data: { values: decisionRules },
          mark: { type: "rule", strokeWidth: 1.5, strokeDash: [4, 3], opacity: 0.5 },
          encoding: {
            x: { field: "timestamp", type: "temporal" },
            color: { field: "status", type: "nominal", scale: { domain: ["success", "failure", "pending"], range: [DECISION_COLORS.success, DECISION_COLORS.failure, DECISION_COLORS.pending] }, legend: null },
            tooltip: [
              { field: "decision", type: "nominal" },
              { field: "status", type: "nominal" },
              { field: "confidence", type: "quantitative", format: ".0%" }
            ]
          }
        }] : []
      ],
      config: {
        view: { stroke: "transparent" },
        axis: { domain: false, domainColor: "#30363D" },
        legend: { labelFont: "Inter, sans-serif", labelFontSize: 11 }
      }
    };
    const colorDomain = [...new Set(values.map((v) => v.metric))];
    const colorRange = colorDomain.map((m) => metricConfig[m]?.color || "#888");
    spec.layer[1].encoding = {
      ...spec.layer[1].encoding,
      color: { field: "metric", type: "nominal", scale: { domain: colorDomain, range: colorRange }, legend: { orient: "bottom", labelColor: "#8B949E", title: null } }
    };
    embedVega(container, spec, containerId);
  }
  function renderVegaAreaCard(data, metricKey, containerId, title) {
    const container = document.getElementById(containerId);
    if (!container || data.length < 2) return;
    const store = getStore();
    const cfg = metricConfig[metricKey] || { label: metricKey, color: "#888", unit: "" };
    const values = data.map((d) => {
      const converted = formatSensorValue(d.value, metricKey, store.unitSystem);
      return { time: new Date(d.timestamp).getTime(), value: converted.value };
    });
    const latest = formatSensorValue(data[data.length - 1].value, metricKey, store.unitSystem);
    const spec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      height: 100,
      background: "transparent",
      padding: 0,
      data: { values },
      mark: { type: "area", line: { color: cfg.color, strokeWidth: 1.5 }, color: cfg.color, opacity: 0.2, interpolate: "monotone" },
      encoding: {
        x: { field: "time", type: "temporal", title: null, axis: null },
        y: { field: "value", type: "quantitative", title: null, axis: null }
      },
      config: { view: { stroke: "transparent" } }
    };
    container.innerHTML = `
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml3(title)}</span>
      <span class="viz-card-value text-mono" style="color:${cfg.color}">${latest.value.toFixed(1)}${latest.unit || cfg.unit}</span>
    </div>
    <div id="${containerId}-chart"></div>
  `;
    const chartEl = document.getElementById(`${containerId}-chart`);
    if (chartEl) embedVega(chartEl, spec, containerId);
  }
  function renderVegaLineCard(data, metricKey, containerId, title) {
    const container = document.getElementById(containerId);
    if (!container || data.length < 2) return;
    const store = getStore();
    const cfg = metricConfig[metricKey] || { label: metricKey, color: "#888", unit: "" };
    const values = data.map((d) => {
      const converted = formatSensorValue(d.value, metricKey, store.unitSystem);
      return { time: new Date(d.timestamp).getTime(), value: converted.value };
    });
    const latest = formatSensorValue(data[data.length - 1].value, metricKey, store.unitSystem);
    const spec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      height: 100,
      background: "transparent",
      padding: 0,
      data: { values },
      mark: { type: "line", color: cfg.color, strokeWidth: 1.5, interpolate: "monotone" },
      encoding: {
        x: { field: "time", type: "temporal", title: null, axis: null },
        y: { field: "value", type: "quantitative", title: null, axis: null }
      },
      config: { view: { stroke: "transparent" } }
    };
    container.innerHTML = `
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml3(title)}</span>
      <span class="viz-card-value text-mono" style="color:${cfg.color}">${latest.value.toFixed(0)}${latest.unit || cfg.unit}</span>
    </div>
    <div id="${containerId}-chart"></div>
  `;
    const chartEl = document.getElementById(`${containerId}-chart`);
    if (chartEl) embedVega(chartEl, spec, containerId);
  }
  function renderVegaBarCard(data, metricKey, containerId, title) {
    const container = document.getElementById(containerId);
    if (!container || data.length < 2) return;
    const store = getStore();
    const cfg = metricConfig[metricKey] || { label: metricKey, color: "#888", unit: "" };
    const values = data.slice(-24).map((d, i) => {
      const converted = formatSensorValue(d.value, metricKey, store.unitSystem);
      return { bucket: i, value: converted.value };
    });
    const latest = formatSensorValue(data[data.length - 1].value, metricKey, store.unitSystem);
    const spec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: "container",
      height: 100,
      background: "transparent",
      padding: 0,
      data: { values },
      mark: { type: "bar", color: cfg.color, opacity: 0.7, cornerRadiusEnd: 2 },
      encoding: {
        x: { field: "bucket", type: "ordinal", title: null, axis: null },
        y: { field: "value", type: "quantitative", title: null, axis: null }
      },
      config: { view: { stroke: "transparent" } }
    };
    container.innerHTML = `
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml3(title)}</span>
      <span class="viz-card-value text-mono" style="color:${cfg.color}">${latest.value.toFixed(0)}${latest.unit || cfg.unit}</span>
    </div>
    <div id="${containerId}-chart"></div>
  `;
    const chartEl = document.getElementById(`${containerId}-chart`);
    if (chartEl) embedVega(chartEl, spec, containerId);
  }
  function renderVegaSparkline(data, color, containerId) {
    const container = document.getElementById(containerId);
    if (!container || data.length < 2) {
      if (container) container.innerHTML = '<span class="text-xs text-secondary">--</span>';
      return;
    }
    const values = data.map((v, i) => ({ x: i, y: v }));
    const spec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      width: 80,
      height: 24,
      background: "transparent",
      padding: 0,
      data: { values },
      mark: { type: "line", color, strokeWidth: 1.5, interpolate: "monotone" },
      encoding: {
        x: { field: "x", type: "quantitative", title: null, axis: null },
        y: { field: "y", type: "quantitative", title: null, axis: null }
      },
      config: { view: { stroke: "transparent" } }
    };
    embedVega(container, spec, containerId);
  }
  function embedVega(el, spec, id) {
    const embedId = `vega-${id}`;
    el.id = embedId;
    if (typeof window.vegaEmbed === "undefined") {
      el.innerHTML = '<div class="chart-empty">Loading chart library...</div>';
      setTimeout(() => embedVega(el, spec, id), 500);
      return;
    }
    const vegaEmbed = window.vegaEmbed;
    void vegaEmbed(`#${embedId}`, spec, {
      actions: false,
      renderer: "svg",
      logLevel: 0
    }).catch((err) => {
      console.error("Vega embed failed:", err);
      el.innerHTML = '<div class="chart-empty">Chart failed to render</div>';
    });
  }
  function escapeHtml3(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  var metricConfig, DECISION_COLORS;
  var init_VegaChart = __esm({
    "src/web/hal-ui/components/VegaChart.ts"() {
      "use strict";
      init_store();
      metricConfig = {
        temperature: { label: "Temperature", color: "#F59E0B", unit: "\xB0C" },
        humidity: { label: "Humidity", color: "#38BDF8", unit: "%" },
        soil_moisture: { label: "Soil Moisture", color: "#EF4444", unit: "%" },
        water_level: { label: "Water Level", color: "#2563EB", unit: "%" },
        ph: { label: "pH", color: "#A855F7", unit: "" },
        co2: { label: "CO\u2082", color: "#22C55E", unit: "ppm" },
        light: { label: "Light", color: "#FACC15", unit: "lux" },
        weight: { label: "Weight", color: "#94A3B8", unit: "kg" },
        vpd: { label: "VPD", color: "#A855F7", unit: "kPa" }
      };
      DECISION_COLORS = {
        success: "#6DFF9A",
        failure: "#FF5C6C",
        pending: "#FFC857"
      };
    }
  });

  // src/web/hal-ui/components/Sidebar.ts
  init_store();
  var navItems = [
    { id: "dashboard", label: "Overview", icon: overviewIcon() },
    { id: "devices", label: "Devices", icon: devicesIcon() },
    { id: "sensors", label: "Sensors", icon: sensorsIcon() },
    { id: "decisions", label: "Decisions", icon: decisionsIcon() },
    { id: "cameras", label: "Cameras", icon: camerasIcon() },
    { id: "system", label: "System", icon: systemIcon() },
    { id: "terminal", label: "Terminal", icon: terminalIcon() }
  ];
  function renderSidebar(mode, activeView, collapsed) {
    const items = navItems.map((item) => `
    <button
      class="sidebar-item ${item.id === activeView ? "active" : ""}"
      data-view="${item.id}"
      title="${item.label}"
    >
      <span class="sidebar-icon">${item.icon}</span>
      <span class="sidebar-label">${item.label}</span>
    </button>
  `).join("");
    return `
    <aside class="sidebar ${collapsed ? "collapsed" : ""}" id="hal-sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2" width="24" height="24" rx="4" fill="var(--accent)" opacity="0.15"/>
            <rect x="6" y="6" width="16" height="16" rx="2" fill="var(--accent)" opacity="0.4"/>
            <rect x="10" y="10" width="8" height="8" rx="1" fill="var(--accent)"/>
          </svg>
          <span class="sidebar-brand">FarmPal</span>
        </div>
        <button class="sidebar-toggle" id="sidebar-toggle" title="Toggle sidebar">
          ${chevronIcon()}
        </button>
      </div>
      <nav class="sidebar-nav" aria-label="Main navigation">
        ${items}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-mode">
          <span class="sidebar-mode-dot" style="background: var(--accent)"></span>
          <span class="sidebar-mode-label">${mode}</span>
        </div>
      </div>
    </aside>
  `;
  }
  function initSidebar(onViewChange) {
    injectSidebarStyles();
    document.querySelectorAll(".sidebar-item").forEach((item) => {
      item.addEventListener("click", () => {
        const viewId = item.dataset.view;
        document.querySelectorAll(".sidebar-item").forEach((i) => i.classList.remove("active"));
        item.classList.add("active");
        const sidebar = document.getElementById("hal-sidebar");
        sidebar?.classList.remove("open");
        onViewChange(viewId);
      });
    });
    const toggle = document.getElementById("sidebar-toggle");
    toggle?.addEventListener("click", () => {
      const sidebar = document.getElementById("hal-sidebar");
      const collapsed = sidebar?.classList.toggle("collapsed");
      setStore({ sidebarCollapsed: !!collapsed });
    });
    document.addEventListener("click", (e) => {
      const sidebar = document.getElementById("hal-sidebar");
      const mobileBtn = document.getElementById("mobile-menu-btn");
      if (!sidebar || !mobileBtn) return;
      if (window.innerWidth > 767) return;
      if (!sidebar.contains(e.target) && !mobileBtn.contains(e.target)) {
        sidebar.classList.remove("open");
      }
    });
  }
  function overviewIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`;
  }
  function devicesIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/><path d="M12 6v6l4 2"/></svg>`;
  }
  function sensorsIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
  }
  function decisionsIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
  }
  function camerasIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
  }
  function systemIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
  }
  function terminalIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;
  }
  function chevronIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
  }
  function injectSidebarStyles() {
    if (document.getElementById("hal-sidebar-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-sidebar-styles";
    style.textContent = `
.sidebar {
  width: 200px;
  background: var(--bg-primary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--transition-base);
  overflow: hidden;
}
.sidebar.collapsed {
  width: 64px;
}
.sidebar-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-3);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow: hidden;
}
.sidebar-brand {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  white-space: nowrap;
  transition: opacity var(--transition-fast);
}
.sidebar.collapsed .sidebar-brand {
  opacity: 0;
  width: 0;
}
.sidebar-toggle {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.sidebar-toggle:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.sidebar.collapsed .sidebar-toggle svg {
  transform: rotate(180deg);
}
.sidebar-nav {
  flex: 1;
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition-fast);
  text-align: left;
  white-space: nowrap;
}
.sidebar-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.sidebar-item.active {
  background: color-mix(in srgb, var(--accent) 12%, var(--bg-tertiary));
  color: var(--accent);
  border-left: 3px solid var(--accent);
  margin-left: -3px;
}
.sidebar-item svg {
  flex-shrink: 0;
}
.sidebar-label {
  transition: opacity var(--transition-fast);
}
.sidebar.collapsed .sidebar-label {
  opacity: 0;
  width: 0;
  display: none;
}
.sidebar.collapsed .sidebar-item {
  justify-content: center;
  padding: 10px;
}
.sidebar-footer {
  padding: var(--space-3);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.sidebar-mode {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  text-transform: uppercase;
}
.sidebar-mode-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sidebar.collapsed .sidebar-mode-label {
  display: none;
}
.sidebar.collapsed .sidebar-mode {
  justify-content: center;
}
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform var(--transition-base);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .sidebar.collapsed {
    width: 200px;
  }
  .sidebar.collapsed .sidebar-brand,
  .sidebar.collapsed .sidebar-label,
  .sidebar.collapsed .sidebar-mode-label {
    display: block;
    opacity: 1;
    width: auto;
  }
  .sidebar.collapsed .sidebar-item {
    justify-content: flex-start;
    padding: 10px var(--space-3);
  }
  .sidebar.collapsed .sidebar-toggle svg {
    transform: none;
  }
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/components/Header.ts
  function renderHeader(mode, onModeChange) {
    return `
    <header class="hal-header">
      <div class="hal-header-left">
        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <span class="hal-header-view-label" id="header-view-label">${getViewLabel()}</span>
      </div>
      <div class="hal-header-center">
        <button class="hal-mode-badge ${mode === "CALM" ? "active" : ""}" data-mode="CALM">CALM</button>
        <button class="hal-mode-badge ${mode === "OPERATOR" ? "active" : ""}" data-mode="OPERATOR">OPERATOR</button>
        <button class="hal-mode-badge ${mode === "DIAGNOSTIC" ? "active" : ""}" data-mode="DIAGNOSTIC">DIAGNOSTIC</button>
      </div>
      <div class="hal-header-right">
        <span class="hal-clock text-mono" id="hal-clock">--:--:--</span>
      </div>
    </header>
  `;
  }
  function getViewLabel() {
    const labels = {
      dashboard: "Overview",
      devices: "Devices",
      sensors: "Sensors",
      decisions: "Decisions",
      cameras: "Cameras"
    };
    return labels[location.hash.slice(1) || "dashboard"] || "Overview";
  }
  function initHeader(mode, onModeChange) {
    injectHeaderStyles();
    startClock();
    setupModeButtons(onModeChange);
  }
  function setupModeButtons(onModeChange) {
    document.querySelectorAll(".hal-mode-badge").forEach((btn) => {
      btn.addEventListener("click", () => {
        const newMode = btn.dataset.mode;
        document.querySelectorAll(".hal-mode-badge").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        onModeChange(newMode);
      });
    });
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    mobileMenuBtn?.addEventListener("click", () => {
      const sidebar = document.getElementById("hal-sidebar");
      sidebar?.classList.toggle("open");
    });
  }
  function startClock() {
    function tick() {
      const el = document.getElementById("hal-clock");
      if (el) {
        el.textContent = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour12: false });
      }
    }
    tick();
    setInterval(tick, 1e3);
  }
  function injectHeaderStyles() {
    if (document.getElementById("hal-header-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-header-styles";
    style.textContent = `
.hal-header {
  height: var(--header-height);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--page-padding);
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
}
.hal-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.hal-header-view-label {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}
.hal-header-center {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.hal-mode-badge {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  padding: 3px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.hal-mode-badge.active,
.hal-mode-badge:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, transparent);
}
.hal-header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.hal-clock {
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/components/Card.ts
  function injectCardStyles() {
    if (document.getElementById("hal-card-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-card-styles";
    style.textContent = `
.hal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.hal-card:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-card-hover);
}
.hal-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.hal-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.hal-card-body {
  color: var(--text-secondary);
  font-size: 14px;
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/components/Toggle.ts
  function injectToggleStyles() {
    if (document.getElementById("hal-toggle-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-toggle-styles";
    style.textContent = `
.hal-toggle {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: var(--radius-pill);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: background var(--transition-base);
  flex-shrink: 0;
  border: none;
  padding: 0;
}
.hal-toggle.active {
  background: var(--accent);
}
.hal-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform var(--transition-base);
  pointer-events: none;
}
.hal-toggle.active .hal-toggle-thumb {
  transform: translateX(18px);
}
.hal-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
`;
    document.head.appendChild(style);
  }
  function createToggle(id, initialState, onChange) {
    const btn = document.createElement("button");
    btn.className = "hal-toggle" + (initialState ? " active" : "");
    btn.id = id;
    btn.setAttribute("role", "switch");
    btn.setAttribute("aria-checked", String(initialState));
    btn.setAttribute("aria-label", "Toggle power state");
    const thumb = document.createElement("span");
    thumb.className = "hal-toggle-thumb";
    btn.appendChild(thumb);
    btn.addEventListener("click", () => {
      const newState = !btn.classList.contains("active");
      btn.classList.toggle("active", newState);
      btn.setAttribute("aria-checked", String(newState));
      onChange(newState);
    });
    return btn;
  }
  function setToggleState(el, on) {
    el.classList.toggle("active", on);
    el.setAttribute("aria-checked", String(on));
  }

  // src/web/hal-ui/components/Modal.ts
  var activeModal = null;
  function openModal(title, bodyContent, actions = "") {
    closeModal();
    const overlay = document.createElement("div");
    overlay.id = "hal-modal-overlay";
    overlay.className = "hal-modal-overlay";
    const panel = document.createElement("div");
    panel.className = "hal-modal-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.innerHTML = `
    <div class="hal-modal-header">
      <h2 class="hal-modal-title">${escapeHtml(title)}</h2>
      <button class="hal-modal-close" aria-label="Close modal">\xD7</button>
    </div>
    <div class="hal-modal-body">${bodyContent}</div>
    ${actions ? `<div class="hal-modal-actions">${actions}</div>` : ""}
  `;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    activeModal = overlay;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
    panel.querySelector(".hal-modal-close")?.addEventListener("click", closeModal);
    document.addEventListener("keydown", handleEscape);
  }
  function closeModal() {
    if (!activeModal) return;
    activeModal.remove();
    activeModal = null;
    document.removeEventListener("keydown", handleEscape);
  }
  function handleEscape(e) {
    if (e.key === "Escape") closeModal();
  }
  function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function injectModalStyles() {
    if (document.getElementById("hal-modal-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-modal-styles";
    style.textContent = `
.hal-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  animation: hal-fade-in 150ms ease;
}
.hal-modal-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  animation: hal-slide-up 150ms ease;
}
.hal-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
}
.hal-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.hal-modal-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.hal-modal-close:hover { color: var(--text-primary); }
.hal-modal-body {
  padding: var(--space-4);
  color: var(--text-secondary);
  font-size: 14px;
}
.hal-modal-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  padding: var(--space-4);
  border-top: 1px solid var(--border);
}
@keyframes hal-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes hal-slide-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/components/Toast.ts
  var MAX_VISIBLE = 3;
  var toasts = [];
  var borderColors = {
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)",
    info: "var(--info)"
  };
  function showToast(message, type = "info", duration = 4e3) {
    const container = getOrCreateContainer();
    const toast = document.createElement("div");
    toast.className = `hal-toast hal-toast-${type}`;
    toast.style.borderLeftColor = borderColors[type];
    toast.textContent = message;
    const closeBtn = document.createElement("button");
    closeBtn.className = "hal-toast-close";
    closeBtn.setAttribute("aria-label", "Dismiss");
    closeBtn.textContent = "\xD7";
    closeBtn.addEventListener("click", () => dismissToast(toast));
    toast.appendChild(closeBtn);
    container.appendChild(toast);
    toasts.push(toast);
    while (toasts.length > MAX_VISIBLE) {
      dismissToast(toasts[0]);
    }
    if (duration > 0) {
      setTimeout(() => dismissToast(toast), duration);
    }
  }
  function dismissToast(toast) {
    toast.classList.add("hal-toast-out");
    setTimeout(() => {
      toast.remove();
      toasts = toasts.filter((t) => t !== toast);
    }, 200);
  }
  function getOrCreateContainer() {
    let container = document.getElementById("hal-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "hal-toast-container";
      injectToastStyles();
      document.body.appendChild(container);
    }
    return container;
  }
  function injectToastStyles() {
    const style = document.createElement("style");
    style.textContent = `
#hal-toast-container {
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
}
.hal-toast {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-left: 4px solid var(--success);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--text-primary);
  font-size: 14px;
  max-width: 320px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  pointer-events: all;
  animation: hal-toast-in 200ms ease forwards;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.hal-toast-out {
  animation: hal-toast-out 200ms ease forwards;
}
.hal-toast-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  flex-shrink: 0;
}
.hal-toast-close:hover { color: var(--text-primary); }
@keyframes hal-toast-in {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes hal-toast-out {
  from { opacity: 1; transform: translateX(0); }
  to   { opacity: 0; transform: translateX(20px); }
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/views/Dashboard.ts
  init_store();

  // src/web/hal-ui/components/SystemStatus.ts
  init_store();
  function renderSystemStatus() {
    const store = getStore();
    return `
    <div class="sys-status-panel hal-card">
      <div class="sys-status-header">
        <span class="sys-status-title">System Status</span>
        <span class="sys-uptime text-mono text-xs text-secondary" data-dashboard-uptime>${formatUptime(store.uptime)}</span>
      </div>
      <div class="sys-status-grid">
        ${renderStatusRow("Agent", store.agentStatus, statusChipClass(store.agentStatus))}
        ${renderStatusRow("HAL Layer", store.halStatus, statusChipClass(store.halStatus))}
        ${renderStatusRow("MQTT Broker", store.mqttStatus, store.mqttStatus === "connected" ? "status-chip--online" : "status-chip--offline")}
        ${renderStatusRow("Database", store.dbStatus, store.dbStatus === "healthy" ? "status-chip--online" : "status-chip--offline")}
        ${renderStatusRow("Auto Mode", store.autoMode ? "ON" : "OFF", store.autoMode ? "status-chip--active" : "status-chip--idle")}
      </div>
    </div>
  `;
  }
  function renderStatusRow(label, value, chipClass) {
    return `
    <div class="sys-status-row">
      <span class="sys-status-label">${label}</span>
      <span class="status-chip ${chipClass}">${value}</span>
    </div>
  `;
  }
  function statusChipClass(status) {
    switch (status) {
      case "active":
      case "online":
      case "healthy":
      case "connected":
        return "status-chip--online";
      case "idle":
      case "degraded":
        return "status-chip--idle";
      case "error":
      case "offline":
      case "disconnected":
        return "status-chip--offline";
      default:
        return "status-chip--idle";
    }
  }
  function formatUptime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${h}h ${m}m`;
  }
  function injectSystemStatusStyles() {
    if (document.getElementById("hal-sys-status-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-sys-status-styles";
    style.textContent = `
.sys-status-panel {
  padding: var(--space-4);
}
.sys-status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.sys-status-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.sys-status-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.sys-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.sys-status-row:last-child {
  border-bottom: none;
}
.sys-status-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.sys-status-row .status-chip {
  font-size: 9px;
  padding: 1px 6px;
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/components/LatestDecision.ts
  init_store();
  function renderLatestDecision() {
    const store = getStore();
    const latest = store.decisions[0];
    if (!latest) {
      return `
      <div class="latest-decision hal-card">
        <div class="latest-decision-header">
          <span class="latest-decision-title">Latest Decision</span>
        </div>
        <div class="latest-decision-empty text-secondary text-sm">No decisions yet</div>
      </div>
    `;
    }
    const statusColor = latest.status === "success" ? "var(--success)" : latest.status === "failure" ? "var(--danger)" : "var(--warning)";
    return `
    <div class="latest-decision hal-card">
      <div class="latest-decision-header">
        <span class="latest-decision-title">Latest Decision</span>
        <span class="latest-decision-time text-mono text-xs text-secondary">${formatTime(latest.timestamp)}</span>
      </div>
      <div class="latest-decision-body">
        <div class="latest-decision-trigger text-sm text-secondary">${escapeHtml2(latest.trigger)}</div>
        <div class="latest-decision-action font-semibold text-sm">${escapeHtml2(latest.decision)}</div>
        <div class="latest-decision-footer">
          <span class="latest-decision-status" style="color: ${statusColor}; background: color-mix(in srgb, ${statusColor} 15%, transparent)"
            >${latest.status || "pending"}</span
          >
          <span class="latest-decision-confidence text-mono text-xs" style="color: ${confidenceColor(latest.confidence)}"
            >${(latest.confidence * 100).toFixed(0)}%</span
          >
        </div>
      </div>
    </div>
  `;
  }
  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    } catch {
      return "--";
    }
  }
  function confidenceColor(conf) {
    if (conf >= 0.8) return "var(--success)";
    if (conf >= 0.5) return "var(--warning)";
    return "var(--danger)";
  }
  function escapeHtml2(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function injectLatestDecisionStyles() {
    if (document.getElementById("hal-latest-decision-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-latest-decision-styles";
    style.textContent = `
.latest-decision {
  padding: var(--space-4);
}
.latest-decision-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.latest-decision-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.latest-decision-empty {
  padding: var(--space-6) 0;
  text-align: center;
}
.latest-decision-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.latest-decision-trigger {
  font-size: 12px;
}
.latest-decision-action {
  color: var(--text-primary);
}
.latest-decision-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-subtle);
}
.latest-decision-status {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/components/KpiStrip.ts
  init_store();

  // src/web/hal-ui/api.ts
  var BASE = "/api/hal";
  async function halGet(path, params) {
    let url = BASE + path;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += "?" + qs;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HAL API ${url} failed: ${res.status} ${res.statusText}`);
    return res.json();
  }
  async function halPost(path, body) {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : void 0
    });
    if (!res.ok) throw new Error(`HAL API ${path} failed: ${res.status} ${res.statusText}`);
    return res.json();
  }
  function normalizeDevice(device) {
    const rawState = device.state ?? device.last_state ?? "unknown";
    const state2 = rawState === "on" || rawState === "off" ? rawState : "unknown";
    return {
      id: device.id || "unknown",
      name: device.name || device.label || device.id || "Unknown device",
      type: device.type || "relay",
      protocol: device.protocol || "unknown",
      host: device.host,
      state: state2,
      online: typeof device.online === "boolean" ? device.online : state2 !== "unknown",
      lastSeen: device.lastSeen || device.last_seen || void 0
    };
  }
  function normalizeSensorReading(reading) {
    if (!reading || typeof reading.value !== "number") return void 0;
    return {
      timestamp: reading.timestamp || reading.read_at || reading.stored_at || (/* @__PURE__ */ new Date()).toISOString(),
      value: reading.value,
      unit: reading.unit
    };
  }
  function normalizeSensorSnapshots(snapshots) {
    const normalized = {};
    for (const [deviceId, snapshot] of Object.entries(snapshots || {})) {
      normalized[deviceId] = {};
      for (const [metric, reading] of Object.entries(snapshot)) {
        if (reading && typeof reading === "object") {
          const normalizedReading = normalizeSensorReading(reading);
          if (normalizedReading) {
            normalized[deviceId][metric] = normalizedReading;
          }
        }
      }
    }
    return normalized;
  }
  function normalizeDecision(decision) {
    const outcome = decision.outcome;
    const status = decision.status || (outcome === "success" || outcome === "failure" ? outcome : "pending");
    return {
      id: decision.id || "unknown",
      timestamp: decision.timestamp || decision.decided_at || decision.completed_at || (/* @__PURE__ */ new Date()).toISOString(),
      trigger: decision.trigger || decision.device_id || "HAL",
      decision: decision.reasoning || decision.decision || "No decision text",
      confidence: Math.max(0, Math.min(1, Number(decision.confidence ?? 0))),
      status,
      outcome
    };
  }
  function normalizeState(state2) {
    return {
      devices: (state2.devices || []).map(normalizeDevice),
      sensorSnapshots: normalizeSensorSnapshots(state2.sensorSnapshots),
      recentDecisions: (state2.recentDecisions || []).map(normalizeDecision)
    };
  }
  var halApi = {
    // GET /api/hal/state
    async getState() {
      return normalizeState(await halGet("/state"));
    },
    // GET /api/hal/devices
    async getDevices() {
      const devices = await halGet("/devices");
      return devices.map(normalizeDevice);
    },
    // POST /api/hal/devices/:id/control
    controlDevice(id, action) {
      return halPost(`/devices/${id}/control`, { action });
    },
    // GET /api/hal/sensors/latest
    async getSensorsLatest() {
      const readings = await halGet("/sensors/latest");
      return readings.map((reading) => ({
        device: normalizeDevice(reading.device),
        temperature: normalizeSensorReading(reading.temperature),
        humidity: normalizeSensorReading(reading.humidity)
      }));
    },
    // GET /api/hal/sensors/history
    async getSensorHistory(device, metric, from, to) {
      const readings = await halGet("/sensors/history", {
        device,
        metric,
        ...from ? { from } : {},
        ...to ? { to } : {}
      });
      return readings.map(normalizeSensorReading).filter((reading) => Boolean(reading));
    },
    // GET /api/hal/decisions
    async getDecisions(limit = 20) {
      const decisions = await halGet("/decisions", { limit: String(limit) });
      return decisions.map(normalizeDecision);
    },
    // GET /api/hal/cameras
    async getCameras() {
      const cameras = await halGet("/cameras");
      return cameras.map(normalizeDevice);
    },
    // POST /api/hal/cameras/:id/capture
    captureCamera(id) {
      return halPost(`/cameras/${id}/capture`);
    }
  };

  // src/web/hal-ui/components/HeroChart.ts
  init_VegaChart();
  var metricConfig2 = {
    temperature: { label: "Temperature", color: "#F59E0B" },
    humidity: { label: "Humidity", color: "#38BDF8" },
    soil_moisture: { label: "Soil Moisture", color: "#EF4444" },
    water_level: { label: "Water Level", color: "#2563EB" },
    ph: { label: "pH", color: "#A855F7" },
    co2: { label: "CO\u2082", color: "#22C55E" },
    light: { label: "Light", color: "#FACC15" },
    weight: { label: "Weight", color: "#94A3B8" },
    vpd: { label: "VPD", color: "#A855F7" }
  };
  async function loadHeroChartData() {
    const store = (await Promise.resolve().then(() => (init_store(), store_exports))).getStore();
    const sensors = store.devices.filter((d) => d.type === "sensor");
    const to = (/* @__PURE__ */ new Date()).toISOString();
    const from = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
    const layers = [];
    const metricKeys = ["temperature", "humidity", "co2", "light"];
    const [decisions] = await Promise.all([
      halApi.getDecisions(50).catch(() => []),
      ...sensors.flatMap(
        (s) => metricKeys.map(async (m) => {
          try {
            const data = await halApi.getSensorHistory(s.id, m, from, to);
            if (data.length > 0) {
              const cfg = metricConfig2[m];
              layers.push({ deviceId: s.id, deviceName: s.name, metric: m, color: cfg?.color || "#888", data });
            }
          } catch {
          }
        })
      )
    ]);
    return { layers, decisions };
  }
  function renderHeroChart(layers, containerId, decisions = []) {
    renderVegaHeroChart(layers, containerId, decisions);
  }
  function renderSparkline(data, color, _width = 80, _height = 24) {
    if (data.length < 2) return '<span class="text-xs text-secondary">--</span>';
    const id = `spark-${Math.random().toString(36).slice(2, 9)}`;
    setTimeout(() => renderVegaSparkline(data, color, id), 0);
    return `<span id="${id}" class="sparkline-svg" style="display:inline-block;width:80px;height:24px;"></span>`;
  }
  function injectHeroChartStyles() {
    if (document.getElementById("hal-hero-chart-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-hero-chart-styles";
    style.textContent = `
.hero-chart-wrap {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  overflow: hidden;
}
.hero-chart {
  width: 100%;
  min-height: 280px;
}
.hero-chart .vega-embed {
  width: 100% !important;
}
.hero-chart .vega-embed svg {
  display: block;
  width: 100%;
  height: auto;
}
.chart-empty {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 13px;
}
.sparkline-svg {
  display: inline-block;
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/components/KpiStrip.ts
  function renderKpiStrip(kpis) {
    injectHeroChartStyles();
    if (kpis.length === 0) {
      return '<div class="kpi-strip-empty">No KPI data available</div>';
    }
    const cards = kpis.map((kpi) => {
      const statusColor = kpi.status === "good" ? "var(--success)" : kpi.status === "warning" ? "var(--warning)" : "var(--danger)";
      const trend = kpi.sparklineData.length >= 2 ? kpi.sparklineData[kpi.sparklineData.length - 1] - kpi.sparklineData[0] : 0;
      const trendIcon = trend > 0 ? "\u2191" : trend < 0 ? "\u2193" : "\u2192";
      const comp = kpi.comparison;
      const compHtml = comp ? `<span class="kpi-comparison ${comp.delta >= 0 ? "up" : "down"}">${comp.delta >= 0 ? "+" : ""}${comp.delta.toFixed(1)}% ${comp.label}</span>` : "";
      return `
      <div class="kpi-card" style="--kpi-accent: ${statusColor}">
        <div class="kpi-header">
          <span class="kpi-label">${kpi.label}</span>
          <span class="kpi-trend" style="color: ${statusColor}">${trendIcon}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value text-mono" style="color: ${statusColor}">
            ${kpi.value.toFixed(kpi.precision)}<span class="kpi-unit">${kpi.unit}</span>
          </span>
        </div>
        ${compHtml}
        <div class="kpi-sparkline">
          ${renderSparkline(kpi.sparklineData, statusColor)}
        </div>
      </div>
    `;
    }).join("");
    return `<div class="kpi-strip">${cards}</div>`;
  }
  async function buildKpiData() {
    const store = getStore();
    const sensors = store.devices.filter((d) => d.type === "sensor");
    const relays = store.devices.filter((d) => d.type === "relay" || d.type === "smart_plug");
    const activeRelays = relays.filter((d) => d.state === "on");
    const onlineDevices = store.devices.filter((d) => d.online).length;
    const [tempHistory, humHistory, co2History] = await Promise.all([
      fetchMetricSparkline(sensors, "temperature", 12),
      fetchMetricSparkline(sensors, "humidity", 12),
      fetchMetricSparkline(sensors, "co2", 12)
    ]);
    const [tempPrev, humPrev, co2Prev] = await Promise.all([
      fetchMetricSparklinePrev(sensors, "temperature", 12),
      fetchMetricSparklinePrev(sensors, "humidity", 12),
      fetchMetricSparklinePrev(sensors, "co2", 12)
    ]);
    const kpis = [];
    kpis.push({
      label: "Power Now",
      value: activeRelays.length,
      unit: "ON",
      precision: 0,
      status: activeRelays.length > 0 ? "good" : "warning",
      sparklineData: generateTrendData(activeRelays.length, 12),
      sparklineColor: "var(--accent)"
    });
    let tempSum = 0, tempCount = 0;
    for (const s of sensors) {
      const snap = store.sensors[s.id];
      if (snap?.temperature?.value != null) {
        const converted = formatSensorValue(snap.temperature.value, "temperature", store.unitSystem);
        tempSum += converted.value;
        tempCount++;
      }
    }
    const avgTemp = tempCount > 0 ? tempSum / tempCount : 0;
    const tempComp = computeComparison(tempHistory, tempPrev);
    kpis.push({
      label: "Temperature",
      value: avgTemp,
      unit: formatSensorValue(0, "temperature", store.unitSystem).unit,
      precision: 1,
      status: avgTemp >= 18 && avgTemp <= 28 ? "good" : avgTemp >= 15 && avgTemp <= 32 ? "warning" : "critical",
      sparklineData: tempHistory.length > 1 ? tempHistory : generateTrendData(avgTemp || 22, 12, 3),
      sparklineColor: "#F59E0B",
      comparison: tempComp
    });
    let humSum = 0, humCount = 0;
    for (const s of sensors) {
      const snap = store.sensors[s.id];
      if (snap?.humidity?.value != null) {
        humSum += snap.humidity.value;
        humCount++;
      }
    }
    const avgHum = humCount > 0 ? humSum / humCount : 0;
    const humComp = computeComparison(humHistory, humPrev);
    kpis.push({
      label: "Humidity",
      value: avgHum,
      unit: "%",
      precision: 0,
      status: avgHum >= 40 && avgHum <= 70 ? "good" : avgHum >= 30 && avgHum <= 80 ? "warning" : "critical",
      sparklineData: humHistory.length > 1 ? humHistory : generateTrendData(avgHum || 60, 12, 10),
      sparklineColor: "#38BDF8",
      comparison: humComp
    });
    let co2Sum = 0, co2Count = 0;
    for (const s of sensors) {
      const snap = store.sensors[s.id];
      if (snap?.co2?.value != null) {
        co2Sum += snap.co2.value;
        co2Count++;
      }
    }
    const avgCo2 = co2Count > 0 ? co2Sum / co2Count : 0;
    const co2Comp = computeComparison(co2History, co2Prev);
    kpis.push({
      label: "CO\u2082",
      value: avgCo2,
      unit: "ppm",
      precision: 0,
      status: avgCo2 < 1e3 ? "good" : avgCo2 < 1500 ? "warning" : "critical",
      sparklineData: co2History.length > 1 ? co2History : generateTrendData(avgCo2 || 800, 12, 200),
      sparklineColor: "#22C55E",
      comparison: co2Comp
    });
    kpis.push({
      label: "Devices",
      value: onlineDevices,
      unit: `/${store.devices.length}`,
      precision: 0,
      status: onlineDevices === store.devices.length ? "good" : onlineDevices > 0 ? "warning" : "critical",
      sparklineData: generateTrendData(onlineDevices || 1, 12),
      sparklineColor: "var(--accent)"
    });
    kpis.push({
      label: "Automations",
      value: store.decisionsToday,
      unit: "today",
      precision: 0,
      status: store.decisionsToday > 0 ? "good" : "warning",
      sparklineData: generateTrendData(store.decisionsToday || 0, 12, 2),
      sparklineColor: "var(--accent)"
    });
    return kpis;
  }
  async function fetchMetricSparkline(sensors, metric, buckets = 12) {
    if (sensors.length === 0) return [];
    const from = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
    const to = (/* @__PURE__ */ new Date()).toISOString();
    try {
      for (const s of sensors) {
        const data = await halApi.getSensorHistory(s.id, metric, from, to);
        if (data.length > 1) {
          const step = Math.max(1, Math.floor(data.length / buckets));
          return Array.from({ length: Math.min(buckets, data.length) }, (_, i) => data[Math.min(i * step, data.length - 1)].value);
        }
      }
    } catch {
    }
    return [];
  }
  async function fetchMetricSparklinePrev(sensors, metric, buckets = 12) {
    if (sensors.length === 0) return [];
    const to = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
    const from = new Date(Date.now() - 48 * 60 * 60 * 1e3).toISOString();
    try {
      for (const s of sensors) {
        const data = await halApi.getSensorHistory(s.id, metric, from, to);
        if (data.length > 1) {
          const step = Math.max(1, Math.floor(data.length / buckets));
          return Array.from({ length: Math.min(buckets, data.length) }, (_, i) => data[Math.min(i * step, data.length - 1)].value);
        }
      }
    } catch {
    }
    return [];
  }
  function computeComparison(current, previous) {
    if (current.length === 0 || previous.length === 0) return void 0;
    const currAvg = current.reduce((a, b) => a + b, 0) / current.length;
    const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    if (prevAvg === 0) return void 0;
    const delta = (currAvg - prevAvg) / Math.abs(prevAvg) * 100;
    return { delta, label: "vs yesterday" };
  }
  function generateTrendData(base, count, variance = 5) {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push(base + (Math.random() - 0.5) * variance * 2);
    }
    return data;
  }
  function injectKpiStyles() {
    if (document.getElementById("hal-kpi-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-kpi-styles";
    style.textContent = `
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}
.kpi-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  border-left: 3px solid var(--kpi-accent);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  transition: border-color var(--transition-fast);
}
.kpi-card:hover {
  border-color: var(--kpi-accent);
}
.kpi-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.kpi-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.kpi-trend {
  font-size: 12px;
  font-weight: 700;
}
.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.kpi-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1;
}
.kpi-unit {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 2px;
}
.kpi-sparkline {
  margin-top: auto;
  opacity: 0.7;
}
.kpi-comparison {
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
  margin-top: -4px;
}
.kpi-comparison.up {
  color: var(--success);
}
.kpi-comparison.down {
  color: var(--danger);
}
@media (max-width: 1200px) {
  .kpi-strip { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 767px) {
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/components/OperatorPanels.ts
  init_store();
  async function renderOperatorPanels() {
    const store = getStore();
    const sensors = store.devices.filter((d) => d.type === "sensor");
    const relays = store.devices.filter((d) => d.type === "relay" || d.type === "smart_plug");
    const cameras = store.devices.filter((d) => d.type === "camera");
    const powerHistory = await fetchPowerHistory(relays);
    return `
    <div class="operator-panels">
      ${renderDeviceGridPanel(relays)}
      ${renderAutomationStatsPanel(store.decisions)}
      ${renderAlertsPanel(store.decisions, sensors)}
      ${renderCameraPanel(cameras)}
      ${renderSystemHealthPanel()}
    </div>
  `;
  }
  function renderDeviceGridPanel(relays) {
    if (relays.length === 0) {
      return `
      <div class="op-panel hal-card">
        <div class="op-panel-header">
          <span class="op-panel-title">Device Grid</span>
          <span class="status-chip status-chip--idle">0 devices</span>
        </div>
        <div class="op-panel-body">
          <p class="text-secondary text-sm">No relay devices registered</p>
        </div>
      </div>
    `;
    }
    const grid = relays.map((r) => `
    <div class="op-device-cell ${r.online ? "online" : "offline"}" data-device-id="${r.id}">
      <div class="op-device-icon">${r.type === "relay" ? "RLY" : "PLG"}</div>
      <div class="op-device-info">
        <span class="op-device-name">${escapeHtml4(r.name)}</span>
        <span class="op-device-protocol text-xs text-secondary">${r.protocol}</span>
      </div>
      <div class="op-device-toggle ${r.state === "on" ? "on" : ""}" data-device-id="${r.id}">
        <div class="op-toggle-thumb"></div>
      </div>
    </div>
  `).join("");
    const onCount = relays.filter((r) => r.state === "on").length;
    return `
    <div class="op-panel hal-card">
      <div class="op-panel-header">
        <span class="op-panel-title">Device Grid</span>
        <span class="status-chip ${onCount > 0 ? "status-chip--active" : "status-chip--idle"}">${onCount} ON</span>
      </div>
      <div class="op-panel-body">
        <div class="op-device-grid">${grid}</div>
      </div>
    </div>
  `;
  }
  function renderAutomationStatsPanel(decisions) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1e3;
    const recent = decisions.filter((d) => now - new Date(d.timestamp).getTime() < oneHour);
    const successCount = recent.filter((d) => d.status === "success").length;
    const successRate = recent.length > 0 ? successCount / recent.length * 100 : 0;
    const buckets = [];
    for (let h = 5; h >= 0; h--) {
      const start = now - (h + 1) * oneHour;
      const end = now - h * oneHour;
      buckets.push(decisions.filter((d) => {
        const t = new Date(d.timestamp).getTime();
        return t >= start && t < end;
      }).length);
    }
    return `
    <div class="op-panel hal-card">
      <div class="op-panel-header">
        <span class="op-panel-title">Automation Stats</span>
        <span class="status-chip status-chip--active">${recent.length}/h</span>
      </div>
      <div class="op-panel-body">
        <div class="op-stat-row">
          <span class="op-stat-label">Success Rate</span>
          <span class="op-stat-value text-mono" style="color:${successRate >= 80 ? "var(--success)" : successRate >= 50 ? "var(--warning)" : "var(--danger)"}">${successRate.toFixed(0)}%</span>
        </div>
        <div class="op-stat-row">
          <span class="op-stat-label">Decisions (1h)</span>
          <span class="op-stat-value text-mono">${recent.length}</span>
        </div>
        <div class="op-stat-sparkline">
          ${renderSparkline(buckets, "var(--accent)", 180, 32)}
        </div>
        <div class="op-stat-xlabels">
          ${["-5h", "-4h", "-3h", "-2h", "-1h", "now"].map((l) => `<span class="op-stat-xlabel">${l}</span>`).join("")}
        </div>
      </div>
    </div>
  `;
  }
  function renderAlertsPanel(decisions, sensors) {
    const now = Date.now();
    const alerts = [];
    for (const s of sensors) {
      if (!s.online) {
        alerts.push({ level: "critical", text: `${s.name} offline`, time: "now" });
      }
    }
    const failed = decisions.filter((d) => d.status === "failure" && now - new Date(d.timestamp).getTime() < 36e5);
    for (const d of failed.slice(0, 3)) {
      alerts.push({ level: "warning", text: d.decision.slice(0, 40), time: formatRelTime(d.timestamp) });
    }
    if (alerts.length === 0) {
      return `
      <div class="op-panel hal-card">
        <div class="op-panel-header">
          <span class="op-panel-title">Alerts</span>
          <span class="status-chip status-chip--online">Clear</span>
        </div>
        <div class="op-panel-body">
          <p class="text-secondary text-sm">No active alerts</p>
        </div>
      </div>
    `;
    }
    const criticalCount = alerts.filter((a) => a.level === "critical").length;
    return `
    <div class="op-panel hal-card">
      <div class="op-panel-header">
        <span class="op-panel-title">Alerts</span>
        ${criticalCount > 0 ? `<span class="status-chip status-chip--offline">${criticalCount} critical</span>` : `<span class="status-chip status-chip--online">Clear</span>`}
      </div>
      <div class="op-panel-body">
        ${alerts.slice(0, 5).map((a) => `
          <div class="op-alert ${a.level}">
            <span class="op-alert-dot"></span>
            <span class="op-alert-text">${escapeHtml4(a.text)}</span>
            <span class="op-alert-time text-xs text-secondary">${a.time}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
  }
  function renderCameraPanel(cameras) {
    if (cameras.length === 0) {
      return `
      <div class="op-panel hal-card">
        <div class="op-panel-header">
          <span class="op-panel-title">Camera Feed</span>
          <span class="status-chip status-chip--idle">None</span>
        </div>
        <div class="op-panel-body">
          <p class="text-secondary text-sm">No cameras registered</p>
        </div>
      </div>
    `;
    }
    const cam = cameras[0];
    return `
    <div class="op-panel hal-card">
      <div class="op-panel-header">
        <span class="op-panel-title">Camera Feed</span>
        <span class="status-chip ${cam.online ? "status-chip--online" : "status-chip--offline"}">${cam.online ? "Live" : "Offline"}</span>
      </div>
      <div class="op-panel-body">
        <div class="op-camera-frame">
          <div class="op-camera-placeholder">
            <span class="op-camera-icon">CAM</span>
            <span class="op-camera-name">${escapeHtml4(cam.name)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  }
  function renderSystemHealthPanel() {
    const cpu = 35 + Math.random() * 20;
    const mem = 42 + Math.random() * 15;
    const disk = 68 + Math.random() * 10;
    return `
    <div class="op-panel hal-card">
      <div class="op-panel-header">
        <span class="op-panel-title">System Health</span>
        <span class="status-chip status-chip--online">Healthy</span>
      </div>
      <div class="op-panel-body">
        ${renderHealthBar("CPU", cpu, "%")}
        ${renderHealthBar("Memory", mem, "%")}
        ${renderHealthBar("Disk", disk, "%")}
      </div>
    </div>
  `;
  }
  function renderHealthBar(label, value, unit) {
    const color = value > 85 ? "var(--danger)" : value > 60 ? "var(--warning)" : "var(--success)";
    return `
    <div class="op-health-row">
      <div class="op-health-labels">
        <span class="op-health-label">${label}</span>
        <span class="op-health-value text-mono" style="color:${color}">${value.toFixed(0)}${unit}</span>
      </div>
      <div class="op-health-track">
        <div class="op-health-fill" style="width:${value}%;background:${color}"></div>
      </div>
    </div>
  `;
  }
  async function fetchPowerHistory(relays) {
    return relays.length > 0 ? [1, 2, 1, 3, 2, 4, 3, 2, 3, 4, 3, 2] : [];
  }
  function formatRelTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 6e4);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  }
  function escapeHtml4(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function injectOperatorPanelStyles() {
    if (document.getElementById("hal-op-panel-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-op-panel-styles";
    style.textContent = `
.operator-panels {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-4);
  margin-top: var(--space-6);
}
.op-panel {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  min-height: 200px;
}
.op-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
}
.op-panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.op-panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* Device Grid */
.op-device-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}
.op-device-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--slate);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}
.op-device-cell.online { border-left-color: var(--accent); }
.op-device-cell.offline { border-left-color: var(--danger); }
.op-device-cell:hover { border-color: var(--accent); }
.op-device-icon {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
  border-radius: var(--radius-sm);
  padding: 2px 4px;
}
.op-device-info {
  flex: 1;
  min-width: 0;
}
.op-device-name {
  display: block;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.op-device-protocol {
  display: block;
  margin-top: 1px;
}
.op-device-toggle {
  width: 36px;
  height: 20px;
  border-radius: var(--radius-pill);
  background: var(--bg-tertiary);
  position: relative;
  cursor: pointer;
  transition: background var(--transition-fast);
  flex-shrink: 0;
}
.op-device-toggle.on {
  background: var(--accent);
}
.op-toggle-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-primary);
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform var(--transition-fast);
}
.op-device-toggle.on .op-toggle-thumb {
  transform: translateX(16px);
}

/* Automation Stats */
.op-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-1) 0;
}
.op-stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.op-stat-value {
  font-size: 14px;
  font-weight: 600;
}
.op-stat-sparkline {
  margin-top: auto;
  padding-top: var(--space-2);
}
.op-stat-xlabels {
  display: flex;
  justify-content: space-between;
}
.op-stat-xlabel {
  font-size: 9px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* Alerts */
.op-alert {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--slate);
}
.op-alert.critical { border-left-color: var(--danger); }
.op-alert.warning { border-left-color: var(--warning); }
.op-alert-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.op-alert.critical .op-alert-dot { background: var(--danger); }
.op-alert.warning .op-alert-dot { background: var(--warning); }
.op-alert-text {
  flex: 1;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.op-alert-time {
  flex-shrink: 0;
}

/* Camera */
.op-camera-frame {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.op-camera-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  color: var(--text-tertiary);
}
.op-camera-icon {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.1em;
}
.op-camera-name {
  font-size: 11px;
}

/* System Health */
.op-health-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.op-health-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.op-health-label {
  font-size: 11px;
  color: var(--text-secondary);
}
.op-health-value {
  font-size: 13px;
  font-weight: 600;
}
.op-health-track {
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-pill);
  overflow: hidden;
}
.op-health-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  transition: width 500ms ease;
}

@media (max-width: 1200px) {
  .operator-panels { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 767px) {
  .operator-panels { grid-template-columns: 1fr; }
  .op-device-grid { grid-template-columns: 1fr; }
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/components/Terminal.ts
  init_store();
  function renderTerminal(entries) {
    if (entries.length === 0) {
      return `
      <div class="terminal-wrap hal-card">
        <div class="terminal-header">
          <span class="terminal-title">System Log</span>
          <span class="status-chip status-chip--idle">Idle</span>
        </div>
        <div class="terminal-body">
          <p class="text-secondary text-sm">No log entries</p>
        </div>
      </div>
    `;
    }
    const lines = entries.map((e) => `
    <div class="terminal-line ${e.level}">
      <span class="terminal-time text-mono">${formatTime2(e.timestamp)}</span>
      <span class="terminal-source">${escapeHtml5(e.source)}</span>
      <span class="terminal-msg">${escapeHtml5(e.message)}</span>
    </div>
  `).join("");
    return `
    <div class="terminal-wrap hal-card">
      <div class="terminal-header">
        <span class="terminal-title">System Log</span>
        <span class="status-chip status-chip--active">${entries.length} entries</span>
      </div>
      <div class="terminal-body" id="terminal-body">
        ${lines}
      </div>
    </div>
  `;
  }
  function buildLogEntries(decisions) {
    const store = getStore();
    const entries = [];
    entries.push({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: store.agentStatus === "active" ? "info" : "warn",
      source: "agent",
      message: `Status: ${store.agentStatus}`
    });
    entries.push({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: store.halStatus === "online" ? "info" : "warn",
      source: "hal",
      message: `Status: ${store.halStatus}`
    });
    entries.push({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: store.mqttStatus === "connected" ? "info" : "error",
      source: "mqtt",
      message: `Broker: ${store.mqttStatus}`
    });
    for (const d of decisions.slice(0, 10)) {
      entries.push({
        timestamp: d.timestamp,
        level: d.status === "success" ? "info" : d.status === "failure" ? "error" : "warn",
        source: "decision",
        message: `${d.decision} [${(d.confidence * 100).toFixed(0)}%]`
      });
    }
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return entries;
  }
  function formatTime2(iso) {
    try {
      return new Date(iso).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "--:--:--";
    }
  }
  function escapeHtml5(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function injectTerminalStyles() {
    if (document.getElementById("hal-terminal-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-terminal-styles";
    style.textContent = `
.terminal-wrap {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.terminal-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.terminal-body {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  padding: var(--space-2) 0;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
}
.terminal-line {
  display: flex;
  gap: var(--space-3);
  padding: 2px var(--space-4);
  border-left: 3px solid transparent;
}
.terminal-line:hover {
  background: var(--bg-tertiary);
}
.terminal-line.info { border-left-color: var(--info); }
.terminal-line.warn { border-left-color: var(--warning); }
.terminal-line.error { border-left-color: var(--danger); }
.terminal-line.debug { border-left-color: var(--slate); }
.terminal-time {
  color: var(--text-tertiary);
  flex-shrink: 0;
  min-width: 64px;
}
.terminal-source {
  color: var(--accent);
  flex-shrink: 0;
  min-width: 72px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.03em;
}
.terminal-msg {
  color: var(--text-primary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/views/Dashboard.ts
  async function renderDashboard(container) {
    const store = getStore();
    const mode = store.mode;
    injectSystemStatusStyles();
    injectLatestDecisionStyles();
    injectKpiStyles();
    injectHeroChartStyles();
    if (mode === "CALM") {
      await renderCalmDashboard(container);
    } else if (mode === "OPERATOR") {
      await renderOperatorDashboard(container);
    } else {
      await renderDiagnosticDashboard(container);
    }
  }
  async function renderCalmDashboard(container) {
    const store = getStore();
    container.innerHTML = `
    <div class="dash-layout calm-layout">
      <div class="dash-main">
        <div class="calm-hero">
          <div class="calm-status-row">
            ${renderCalmKpi("Temperature", getLatestTemp(), "\xB0C", "#F59E0B")}
            ${renderCalmKpi("Humidity", getLatestHum(), "%", "#38BDF8")}
            ${renderCalmKpi("Devices", store.devices.filter((d) => d.online).length, `/${store.devices.length}`, "var(--accent)")}
          </div>
        </div>

        <div class="hero-chart-wrap calm-chart">
          <div class="dash-hero-header">
            <h2 class="section-title">24h Overview</h2>
          </div>
          <div class="hero-chart" id="dash-hero-chart">
            <div class="chart-empty">Loading\u2026</div>
          </div>
        </div>

        <div class="calm-devices">
          <h2 class="section-title mb-4">Active Devices</h2>
          <div class="calm-device-list">
            ${renderCalmDeviceList(store.devices.filter((d) => d.online))}
          </div>
        </div>
      </div>

      <div class="dash-sidebar calm-sidebar">
        ${renderSystemStatus()}
      </div>
    </div>
  `;
    injectDashboardStyles();
    await loadDashboardChart();
  }
  function renderCalmKpi(label, value, unit, color) {
    const val = typeof value === "number" ? value.toFixed(1) : value;
    return `
    <div class="calm-kpi" style="--kpi-color: ${color}">
      <span class="calm-kpi-value text-mono">${val}<small>${unit}</small></span>
      <span class="calm-kpi-label">${label}</span>
    </div>
  `;
  }
  function renderCalmDeviceList(devices) {
    if (devices.length === 0) return '<p class="text-secondary text-sm">No active devices</p>';
    return devices.slice(0, 6).map((d) => `
    <div class="calm-device-item ${d.online ? "online" : "offline"}">
      <span class="calm-device-dot"></span>
      <span class="calm-device-name">${escapeHtml6(d.name)}</span>
      <span class="calm-device-type text-xs text-secondary">${d.type}</span>
    </div>
  `).join("");
  }
  async function renderOperatorDashboard(container) {
    const store = getStore();
    container.innerHTML = `
    <div class="dash-layout">
      <div class="dash-main">
        ${renderKpiStrip(await buildKpiData())}

        <div class="hero-chart-wrap">
          <div class="dash-hero-header">
            <h2 class="section-title">Environment Overview</h2>
            <div class="dash-live-bar" id="dash-live-bar">Loading\u2026</div>
          </div>
          <div class="hero-chart" id="dash-hero-chart">
            <div class="chart-empty">Loading sensor data\u2026</div>
          </div>
        </div>

        ${await renderOperatorPanels()}
      </div>

      <div class="dash-sidebar">
        ${renderSystemStatus()}
        ${renderLatestDecision()}
      </div>
    </div>
  `;
    injectDashboardStyles();
    injectOperatorPanelStyles();
    attachDashboardHandlers();
    attachOperatorPanelHandlers();
    await loadDashboardChart();
  }
  async function renderDiagnosticDashboard(container) {
    const store = getStore();
    container.innerHTML = `
    <div class="dash-layout diag-layout">
      <div class="dash-main">
        ${renderKpiStrip(await buildKpiData())}

        <div class="hero-chart-wrap">
          <div class="dash-hero-header">
            <h2 class="section-title">Environment Overview \u2014 All Metrics</h2>
            <div class="dash-live-bar" id="dash-live-bar">Loading\u2026</div>
          </div>
          <div class="hero-chart" id="dash-hero-chart">
            <div class="chart-empty">Loading sensor data\u2026</div>
          </div>
        </div>

        ${renderTerminal(buildLogEntries(store.decisions))}

        <div class="diag-raw-data">
          <h2 class="section-title mb-4">Raw Sensor Snapshots</h2>
          <div class="diag-snapshot-grid" id="diag-snapshots">
            ${renderRawSnapshots(store.sensors, store.devices)}
          </div>
        </div>

        <div class="dash-bottom-grid">
          <section>
            <h2 class="section-title mb-4">All Devices (${store.devices.length})</h2>
            <div id="dashboard-devices" class="device-grid">
              ${renderDeviceGrid(store.devices)}
            </div>
          </section>
          <section>
            <h2 class="section-title mb-4">All Decisions (${store.decisions.length})</h2>
            <div id="dashboard-decisions">
              ${renderRecentDecisions(store.decisions.slice(0, 10))}
            </div>
          </section>
        </div>
      </div>

      <div class="dash-sidebar">
        ${renderSystemStatus()}
        ${renderLatestDecision()}
        ${renderDiagnosticExtras(store)}
      </div>
    </div>
  `;
    injectDashboardStyles();
    injectTerminalStyles();
    attachDashboardHandlers();
    await loadDashboardChart();
  }
  function renderRawSnapshots(sensors, devices) {
    const entries = Object.entries(sensors);
    if (entries.length === 0) {
      return '<p class="text-secondary text-sm">No sensor snapshots available</p>';
    }
    return entries.map(([deviceId, snap]) => {
      const device = devices.find((d) => d.id === deviceId);
      const temp = snap.temperature;
      const hum = snap.humidity;
      return `
      <div class="diag-snapshot hal-card">
        <div class="diag-snapshot-header">
          <span class="text-sm font-semibold">${escapeHtml6(device?.name || deviceId)}</span>
          <span class="text-xs text-secondary">${device?.protocol || "unknown"}</span>
        </div>
        <div class="diag-snapshot-body">
          ${temp ? `
            <div class="diag-snapshot-row">
              <span class="text-xs text-secondary">temperature</span>
              <span class="text-mono text-xs">${temp.value.toFixed(2)} \xB0C @ ${new Date(temp.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ` : ""}
          ${hum ? `
            <div class="diag-snapshot-row">
              <span class="text-xs text-secondary">humidity</span>
              <span class="text-mono text-xs">${hum.value.toFixed(2)} % @ ${new Date(hum.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ` : ""}
          ${!temp && !hum ? '<span class="text-xs text-secondary">No data</span>' : ""}
        </div>
      </div>
    `;
    }).join("");
  }
  function renderDiagnosticExtras(store) {
    const sensors = store.devices.filter((d) => d.type === "sensor");
    const relays = store.devices.filter((d) => d.type === "relay" || d.type === "smart_plug");
    const cameras = store.devices.filter((d) => d.type === "camera");
    return `
    <div class="diag-extras hal-card">
      <div class="diag-extras-header">
        <span class="diag-extras-title">Diagnostics</span>
      </div>
      <div class="diag-extras-grid">
        <div class="diag-extras-row">
          <span class="text-xs text-secondary">Sensors</span>
          <span class="text-mono text-xs">${sensors.length}</span>
        </div>
        <div class="diag-extras-row">
          <span class="text-xs text-secondary">Relays</span>
          <span class="text-mono text-xs">${relays.length}</span>
        </div>
        <div class="diag-extras-row">
          <span class="text-xs text-secondary">Cameras</span>
          <span class="text-mono text-xs">${cameras.length}</span>
        </div>
        <div class="diag-extras-row">
          <span class="text-xs text-secondary">Decisions</span>
          <span class="text-mono text-xs">${store.decisions.length}</span>
        </div>
        <div class="diag-extras-row">
          <span class="text-xs text-secondary">Uptime</span>
          <span class="text-mono text-xs" data-dashboard-uptime>${formatUptime2(store.uptime)}</span>
        </div>
        <div class="diag-extras-row">
          <span class="text-xs text-secondary">Mode</span>
          <span class="text-mono text-xs" style="color:var(--accent)">${store.mode}</span>
        </div>
      </div>
    </div>
  `;
  }
  async function loadDashboardChart() {
    const hero = document.getElementById("dash-hero-chart");
    const liveBar = document.getElementById("dash-live-bar");
    if (!hero) return;
    try {
      const { layers, decisions } = await loadHeroChartData();
      renderHeroChart(layers, "dash-hero-chart", decisions);
      if (liveBar) liveBar.innerHTML = buildLiveBar(layers);
    } catch (err) {
      console.error("Dashboard chart load failed:", err);
      if (hero) hero.innerHTML = '<div class="chart-empty">Failed to load</div>';
    }
  }
  function buildLiveBar(layers) {
    const store = getStore();
    const latest = {};
    const metricColors = {
      temperature: "#F59E0B",
      humidity: "#38BDF8",
      co2: "#22C55E",
      light: "#FACC15",
      soil_moisture: "#EF4444",
      water_level: "#2563EB",
      ph: "#A855F7",
      weight: "#94A3B8"
    };
    for (const layer of layers) {
      if (!layer.data.length) continue;
      const last = layer.data[layer.data.length - 1];
      const converted = formatSensorValue(last.value, layer.metric, store.unitSystem);
      const unit = converted.unit || getMetricUnit2(layer.metric);
      latest[layer.metric] = { value: converted.value, unit, color: metricColors[layer.metric] };
    }
    const items = Object.entries(latest).map(([metric, info]) => {
      const label = metric.charAt(0).toUpperCase() + metric.slice(1).replace("_", " ");
      const precision = Math.abs(info.value) >= 100 ? 0 : info.value % 1 === 0 ? 0 : 1;
      return `<span class="live-item" style="--live-color:${info.color}"><span class="live-dot"></span><span class="live-label">${label}</span><span class="live-val text-mono">${info.value.toFixed(precision)}${info.unit}</span></span>`;
    });
    return items.join("") || '<span class="text-secondary text-xs">No live data</span>';
  }
  function getLatestTemp() {
    const store = getStore();
    let sum = 0, count = 0;
    for (const s of store.devices.filter((d) => d.type === "sensor")) {
      const snap = store.sensors[s.id];
      if (snap?.temperature?.value != null) {
        sum += snap.temperature.value;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }
  function getLatestHum() {
    const store = getStore();
    let sum = 0, count = 0;
    for (const s of store.devices.filter((d) => d.type === "sensor")) {
      const snap = store.sensors[s.id];
      if (snap?.humidity?.value != null) {
        sum += snap.humidity.value;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }
  function getMetricUnit2(metric) {
    switch (metric) {
      case "humidity":
      case "soil_moisture":
      case "water_level":
        return "%";
      case "co2":
        return "ppm";
      case "light":
        return "lux";
      case "ph":
        return "";
      case "weight":
        return "kg";
      default:
        return "";
    }
  }
  function renderDeviceGrid(devices) {
    if (devices.length === 0) {
      return '<div class="empty-state"><p>No devices registered</p></div>';
    }
    return devices.map((d) => `
    <div class="device-mini-card ${d.online ? "online" : "offline"}" data-device-id="${d.id}">
      <div class="device-mini-icon">${deviceIcon(d.type)}</div>
      <div class="device-mini-info">
        <div class="device-mini-name">${escapeHtml6(d.name)}</div>
        <div class="device-mini-meta text-xs text-secondary">${d.protocol} \xB7 ${d.online ? "online" : "offline"}</div>
      </div>
      ${d.type === "relay" || d.type === "smart_plug" ? `
        <div class="device-mini-state ${d.state === "on" ? "on" : ""}">
          ${d.state === "on" ? "ON" : "OFF"}
        </div>
      ` : ""}
    </div>
  `).join("");
  }
  function renderRecentDecisions(decisions) {
    if (decisions.length === 0) {
      return '<div class="empty-state"><p>No decisions yet</p></div>';
    }
    return decisions.map((d) => `
    <div class="decision-row ${d.status || "pending"}">
      <div class="decision-time text-mono text-xs text-secondary">${formatTime3(d.timestamp)}</div>
      <div class="decision-trigger text-sm">${escapeHtml6(d.trigger)}</div>
      <div class="decision-text text-sm font-semibold">${escapeHtml6(d.decision)}</div>
      <div class="decision-footer">
        <span class="decision-status ${d.status || "pending"}">${d.status || "pending"}</span>
        <span class="decision-confidence text-mono text-xs" style="color:${confidenceColor2(d.confidence)}">${(d.confidence * 100).toFixed(0)}%</span>
      </div>
    </div>
  `).join("");
  }
  function attachDashboardHandlers() {
    document.querySelectorAll(".device-mini-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.deviceId;
        if (id) console.log("Device clicked:", id);
      });
    });
  }
  function attachOperatorPanelHandlers() {
    document.querySelectorAll(".op-device-toggle").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const id = toggle.dataset.deviceId;
        if (id) {
          toggle.classList.toggle("on");
          console.log("Toggle device:", id);
        }
      });
    });
  }
  function formatTime3(iso) {
    try {
      return new Date(iso).toLocaleTimeString("en-US", { hour12: false });
    } catch {
      return "--";
    }
  }
  function formatUptime2(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${h}h ${m}m`;
  }
  function confidenceColor2(conf) {
    if (conf >= 0.8) return "var(--success)";
    if (conf >= 0.5) return "var(--warning)";
    return "var(--danger)";
  }
  function escapeHtml6(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function deviceIcon(type) {
    switch (type) {
      case "sensor":
        return "SNS";
      case "camera":
        return "CAM";
      case "relay":
        return "RLY";
      case "smart_plug":
        return "PLG";
      default:
        return "DEV";
    }
  }
  function injectDashboardStyles() {
    if (document.getElementById("hal-dashboard-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-dashboard-styles";
    style.textContent = `
/* \u2500\u2500 Layout \u2500\u2500 */
.dash-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: var(--space-6);
}
.dash-main { min-width: 0; }
.dash-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* \u2500\u2500 CALM mode \u2500\u2500 */
.calm-layout { grid-template-columns: 1fr 220px; }
.calm-hero { margin-bottom: var(--space-6); }
.calm-status-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}
.calm-kpi {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  text-align: center;
  border-left: 3px solid var(--kpi-color);
}
.calm-kpi-value {
  display: block;
  font-size: 36px;
  font-weight: 600;
  color: var(--kpi-color);
  line-height: 1;
}
.calm-kpi-value small {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 2px;
}
.calm-kpi-label {
  display: block;
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: var(--space-2);
}
.calm-chart { margin-bottom: var(--space-6); }
.calm-devices { margin-bottom: var(--space-6); }
.calm-device-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.calm-device-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.calm-device-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}
.calm-device-item.offline .calm-device-dot {
  background: var(--danger);
}
.calm-device-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}
.calm-sidebar { gap: var(--space-4); }

/* \u2500\u2500 OPERATOR mode \u2500\u2500 */
.dash-hero-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.dash-live-bar {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  align-items: center;
}
.live-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--live-color);
  box-shadow: 0 0 6px var(--live-color);
}
.live-label {
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-size: 10px;
}
.live-val {
  color: var(--live-color);
  font-size: 13px;
  font-weight: 600;
}
.dash-bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
  margin-top: var(--space-6);
}
.device-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}
.device-mini-card {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  border-left: 3px solid var(--slate);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}
.device-mini-card:hover { border-color: var(--accent); }
.device-mini-card.online { border-left-color: var(--accent); }
.device-mini-card.offline { border-left-color: var(--danger); }
.device-mini-icon { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border)); border-radius: var(--radius-sm); padding: 2px 5px; }
.device-mini-name { font-size: 13px; font-weight: 500; }
.device-mini-meta { margin-top: 2px; }
.device-mini-state {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}
.device-mini-state.on {
  background: color-mix(in srgb, var(--success) 20%, transparent);
  color: var(--success);
}
.decision-row {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  margin-bottom: var(--space-2);
  border-left: 3px solid var(--slate);
}
.decision-row.success { border-left-color: var(--success); }
.decision-row.failure { border-left-color: var(--danger); }
.decision-row.pending { border-left-color: var(--warning); }
.decision-time { margin-bottom: 2px; }
.decision-trigger { color: var(--text-secondary); margin-bottom: 2px; }
.decision-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-subtle);
}
.decision-status {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}
.decision-status.success { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
.decision-status.failure { background: color-mix(in srgb, var(--danger) 20%, transparent); color: var(--danger); }
.decision-status.pending { background: color-mix(in srgb, var(--warning) 20%, transparent); color: var(--warning); }
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

/* \u2500\u2500 DIAGNOSTIC mode \u2500\u2500 */
.diag-layout { grid-template-columns: 1fr 280px; }
.diag-raw-data { margin: var(--space-6) 0; }
.diag-snapshot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
.diag-snapshot {
  padding: var(--space-3);
}
.diag-snapshot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
}
.diag-snapshot-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.diag-snapshot-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.diag-extras {
  padding: var(--space-4);
}
.diag-extras-header {
  margin-bottom: var(--space-3);
}
.diag-extras-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.diag-extras-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.diag-extras-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.diag-extras-row:last-child { border-bottom: none; }

/* \u2500\u2500 Responsive \u2500\u2500 */
@media (max-width: 1023px) {
  .dash-layout, .calm-layout, .diag-layout { grid-template-columns: 1fr; }
  .dash-sidebar { flex-direction: row; flex-wrap: wrap; }
  .dash-sidebar > * { flex: 1; min-width: 240px; }
  .calm-status-row { grid-template-columns: repeat(3, 1fr); }
  .diag-snapshot-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 767px) {
  .dash-bottom-grid { grid-template-columns: 1fr; }
  .device-grid { grid-template-columns: 1fr; }
  .dash-hero-header { flex-direction: column; align-items: flex-start; }
  .dash-live-bar { gap: var(--space-2); }
  .calm-status-row { grid-template-columns: 1fr; }
  .diag-snapshot-grid { grid-template-columns: 1fr; }
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/views/Devices.ts
  init_store();
  async function renderDevices(container) {
    const store = getStore();
    injectDevicesStyles();
    container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Devices</h1>
      <p class="page-subtitle">Manage farm hardware</p>
    </div>

    <div class="devices-toolbar mb-4">
      <input class="hal-input" id="device-filter" type="text" placeholder="Filter devices..." />
      <select class="hal-input" id="device-type-filter">
        <option value="">All types</option>
        <option value="relay">Relays</option>
        <option value="sensor">Sensors</option>
        <option value="camera">Cameras</option>
      </select>
      <select class="hal-input" id="device-status-filter">
        <option value="">All status</option>
        <option value="online">Online</option>
        <option value="offline">Offline</option>
      </select>
    </div>

    <div id="devices-grid" class="grid-3">
      ${renderDeviceCards(store.devices)}
    </div>
  `;
    attachDevicesHandlers();
  }
  function renderDeviceCards(devices) {
    if (devices.length === 0) {
      return `<div class="empty-state col-span-3"><p class="empty-state-title">No devices registered</p><p class="empty-state-desc">Devices will appear here once discovered.</p></div>`;
    }
    return devices.map((d) => {
      const state2 = d.online ? "online" : "offline";
      return `
      <div class="device-card hal-card" data-device-id="${d.id}" style="border-left: 3px solid ${state2 === "online" ? "var(--accent)" : "var(--danger)"}">
        <div class="device-card-header">
          <div class="device-card-icon">${deviceIcon2(d.type)}</div>
          <div class="device-card-title">${escapeHtml7(d.name)}</div>
          <span class="hal-badge hal-badge-slate">${d.protocol}</span>
        </div>
        <div class="device-card-meta">
          <span class="text-xs text-secondary">${d.type} \xB7 ${state2}</span>
          ${d.lastSeen ? `<span class="text-xs text-mono text-secondary">${formatRelativeTime(d.lastSeen)}</span>` : ""}
        </div>
        ${d.type === "relay" ? `
          <div class="device-card-control">
            <span class="text-xs text-secondary">Power</span>
            <div id="toggle-${d.id}" class="device-toggle"></div>
          </div>
        ` : ""}
      </div>
    `;
    }).join("");
  }
  function attachDevicesHandlers() {
    const filterInput = document.getElementById("device-filter");
    const typeSelect = document.getElementById("device-type-filter");
    const statusSelect = document.getElementById("device-status-filter");
    function applyFilter() {
      const q = filterInput?.value.toLowerCase() || "";
      const type = typeSelect?.value || "";
      const status = statusSelect?.value || "";
      const store = getStore();
      const filtered = store.devices.filter((d) => {
        const matchQ = !q || d.name.toLowerCase().includes(q) || d.protocol.toLowerCase().includes(q);
        const matchType = !type || d.type === type;
        const matchStatus = !status || (status === "online" ? d.online : !d.online);
        return matchQ && matchType && matchStatus;
      });
      const grid = document.getElementById("devices-grid");
      if (grid) grid.innerHTML = renderDeviceCards(filtered);
      attachToggleHandlers();
    }
    filterInput?.addEventListener("input", applyFilter);
    typeSelect?.addEventListener("change", applyFilter);
    statusSelect?.addEventListener("change", applyFilter);
    attachToggleHandlers();
  }
  function attachToggleHandlers() {
    const store = getStore();
    const relays = store.devices.filter((d) => d.type === "relay");
    relays.forEach((relay) => {
      const el = document.getElementById(`toggle-${relay.id}`);
      if (!el) return;
      const isOn = relay.state === "on";
      const toggle = createToggle(`toggle-${relay.id}`, isOn, async (on) => {
        try {
          await halApi.controlDevice(relay.id, on ? "on" : "off");
          showToast(`${relay.name} turned ${on ? "on" : "off"}`, "success");
        } catch (err) {
          showToast(`Failed: ${err.message}`, "danger");
          setToggleState(toggle, !on);
        }
      });
      el.replaceWith(toggle);
    });
  }
  function formatRelativeTime(iso) {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      if (diff < 6e4) return "just now";
      if (diff < 36e5) return `${Math.floor(diff / 6e4)}m ago`;
      if (diff < 864e5) return `${Math.floor(diff / 36e5)}h ago`;
      return `${Math.floor(diff / 864e5)}d ago`;
    } catch {
      return "--";
    }
  }
  function escapeHtml7(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function deviceIcon2(type) {
    switch (type) {
      case "sensor":
        return "SNS";
      case "camera":
        return "CAM";
      case "relay":
        return "RLY";
      case "smart_plug":
        return "PLG";
      default:
        return "DEV";
    }
  }
  function injectDevicesStyles() {
    if (document.getElementById("hal-devices-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-devices-styles";
    style.textContent = `
.devices-toolbar {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.hal-input {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-3);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition-fast);
}
.hal-input:focus { border-color: var(--accent); }
.hal-input::placeholder { color: var(--text-tertiary); }
.device-card { padding: var(--space-4); }
.device-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.device-card-icon { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border)); border-radius: var(--radius-sm); padding: 3px 6px; }
.device-card-title { flex: 1; font-size: 14px; font-weight: 600; }
.hal-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: var(--radius-pill);
  text-transform: uppercase;
}
.hal-badge-slate {
  background: color-mix(in srgb, var(--slate) 20%, transparent);
  color: var(--slate);
  border: 1px solid var(--slate);
}
.device-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}
.device-card-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-2);
  border-top: 1px solid var(--border);
}
.col-span-3 { grid-column: 1 / -1; }
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/views/Sensors.ts
  init_store();
  var metrics = [
    { key: "temperature", label: "Temperature", shortLabel: "Temp", fallbackUnit: "\xB0C", color: "#F59E0B", description: "Air / probe temperature", minAxis: 10, maxAxis: 40 },
    { key: "humidity", label: "Humidity", shortLabel: "RH", fallbackUnit: "%", color: "#38BDF8", description: "Relative humidity", minAxis: 0, maxAxis: 100 },
    { key: "soil_moisture", label: "Soil Moisture", shortLabel: "Soil", fallbackUnit: "%", color: "#EF4444", description: "Volumetric water content", minAxis: 0, maxAxis: 100 },
    { key: "co2", label: "CO\u2082", shortLabel: "CO\u2082", fallbackUnit: "ppm", color: "#22C55E", description: "Carbon dioxide", minAxis: 0, maxAxis: 2e3 },
    { key: "light", label: "Light", shortLabel: "Light", fallbackUnit: "lux", color: "#FACC15", description: "PAR / illuminance", minAxis: 0, maxAxis: 1e5 },
    { key: "water_level", label: "Water Level", shortLabel: "Water", fallbackUnit: "%", color: "#2563EB", description: "Reservoir level", minAxis: 0, maxAxis: 100 },
    { key: "ph", label: "pH", shortLabel: "pH", fallbackUnit: "", color: "#A855F7", description: "Acidity / alkalinity", minAxis: 0, maxAxis: 14 },
    { key: "weight", label: "Weight", shortLabel: "Weight", fallbackUnit: "kg", color: "#94A3B8", description: "Load cell", minAxis: 0, maxAxis: 100 }
  ];
  var viewState = {
    deviceId: "all",
    range: "24H",
    activeMetrics: /* @__PURE__ */ new Set(["temperature", "humidity", "co2"]),
    decisions: []
  };
  var loadSequence = 0;
  async function renderSensors(container) {
    const store = getStore();
    const sensors = store.devices.filter((d) => d.type === "sensor");
    const validDeviceIds = /* @__PURE__ */ new Set(["all", ...sensors.map((s) => s.id)]);
    if (!validDeviceIds.has(viewState.deviceId)) viewState.deviceId = "all";
    container.innerHTML = `
    <div class="sensors-hero">
      <div class="sensors-hero-header">
        <div class="sensors-hero-title">
          <h1 class="page-title">Sensors</h1>
          <p class="page-subtitle">Environmental telemetry</p>
        </div>
        <div class="sensors-hero-controls">
          <select class="hal-input" id="sensor-device-select">
            <option value="all" ${viewState.deviceId === "all" ? "selected" : ""}>All Devices</option>
            ${sensors.map((s) => `<option value="${s.id}" ${viewState.deviceId === s.id ? "selected" : ""}>${escapeHtml8(s.name)}</option>`).join("")}
          </select>
          <div class="time-range-group" role="group">
            ${["1H", "6H", "24H", "7D", "30D"].map(
      (r) => `<button class="hal-range-btn ${r === viewState.range ? "active" : ""}" data-range="${r}">${r}</button>`
    ).join("")}
          </div>
          <button class="hal-range-btn" id="unit-toggle">${store.unitSystem === "metric" ? "\xB0C" : "\xB0F"}</button>
          <button class="hal-range-btn" id="time-format-toggle">${store.timeFormat === "24h" ? "24H" : "12H"}</button>
        </div>
      </div>

      <div class="metric-bar" id="metric-bar">
        ${metrics.map((m) => {
      const active = viewState.activeMetrics.has(m.key);
      return `
            <button
              class="metric-pill ${active ? "active" : ""}"
              data-metric="${m.key}"
              style="--metric-color:${m.color}"
              aria-pressed="${active ? "true" : "false"}"
            >
              <span class="pill-dot"></span>
              <span class="pill-label">${escapeHtml8(m.shortLabel)}</span>
              <span class="pill-value" id="pill-${m.key}">--</span>
            </button>
          `;
    }).join("")}
      </div>

      <div class="hero-chart-wrap">
        <div id="hero-chart" class="hero-chart">
          <div class="chart-empty">Loading sensor data...</div>
        </div>
        <div class="hero-legend" id="hero-legend"></div>
      </div>
    </div>

    <div class="horizon-strips-section">
      <h2 class="section-title mb-3">Metric Strips</h2>
      <div class="horizon-strips-grid" id="horizon-strips"></div>
    </div>

    <div class="viz-grid" id="viz-grid"></div>

    <div class="sensor-detail-drawer" id="detail-drawer">
      <div class="detail-header">
        <h3 class="section-title">Readings</h3>
        <span class="text-xs text-secondary" id="detail-count">--</span>
      </div>
      <div class="detail-table-wrap">
        <table class="hal-table compact">
          <thead>
            <tr><th>Time</th><th>Device</th><th>Metric</th><th>Value</th></tr>
          </thead>
          <tbody id="detail-body">
            <tr><td colspan="4" class="empty-cell">Select metrics above</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
    injectSensorStyles();
    attachHandlers(sensors);
    await loadData(sensors);
  }
  function attachHandlers(sensors) {
    const deviceSelect = document.getElementById("sensor-device-select");
    deviceSelect?.addEventListener("change", () => {
      viewState.deviceId = deviceSelect.value || "all";
      void loadData(sensors);
    });
    document.querySelectorAll(".hal-range-btn[data-range]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".hal-range-btn[data-range]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        viewState.range = btn.dataset.range || "24H";
        void loadData(sensors);
      });
    });
    const unitToggle = document.getElementById("unit-toggle");
    unitToggle?.addEventListener("click", () => {
      const store = getStore();
      const newSystem = store.unitSystem === "metric" ? "imperial" : "metric";
      setStore({ unitSystem: newSystem });
      unitToggle.textContent = newSystem === "metric" ? "\xB0C" : "\xB0F";
      void loadData(sensors);
    });
    const timeFormatToggle = document.getElementById("time-format-toggle");
    timeFormatToggle?.addEventListener("click", () => {
      const store = getStore();
      const newFormat = store.timeFormat === "24h" ? "12h" : "24h";
      setStore({ timeFormat: newFormat });
      timeFormatToggle.textContent = newFormat === "24h" ? "24H" : "12H";
      void loadData(sensors);
    });
    document.querySelectorAll(".metric-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const metric = btn.dataset.metric;
        if (viewState.activeMetrics.has(metric)) {
          if (viewState.activeMetrics.size > 1) viewState.activeMetrics.delete(metric);
        } else {
          viewState.activeMetrics.add(metric);
        }
        document.querySelectorAll(".metric-pill").forEach((pill) => {
          const key = pill.dataset.metric;
          pill.classList.toggle("active", viewState.activeMetrics.has(key));
          pill.setAttribute("aria-pressed", viewState.activeMetrics.has(key) ? "true" : "false");
        });
        void loadData(sensors);
      });
    });
  }
  async function loadData(sensors) {
    const sequence = ++loadSequence;
    const selectedDevices = viewState.deviceId === "all" ? sensors : sensors.filter((s) => s.id === viewState.deviceId);
    const activeMetricConfigs = metrics.filter((m) => viewState.activeMetrics.has(m.key));
    const { from, to } = getRangeBounds(viewState.range);
    const heroChart = document.getElementById("hero-chart");
    if (heroChart) heroChart.innerHTML = '<div class="chart-empty">Loading...</div>';
    try {
      const layers = [];
      const [decisions] = await Promise.all([
        halApi.getDecisions(50).catch(() => []),
        ...selectedDevices.flatMap(
          (device) => activeMetricConfigs.map(async (metric) => {
            const data = await halApi.getSensorHistory(device.id, metric.key, from, to);
            if (data.length > 0) layers.push({ deviceId: device.id, deviceName: device.name, metric, data });
          })
        )
      ]);
      if (sequence !== loadSequence) return;
      viewState.decisions = decisions;
      renderHeroChart2(layers, decisions);
      renderDetailTable(layers);
      updatePillValues(layers);
      renderHorizonStrips(layers);
      renderVizCards(layers, decisions);
    } catch (err) {
      console.error("Sensor load failed:", err);
      if (heroChart) heroChart.innerHTML = '<div class="chart-empty">Failed to load</div>';
    }
  }
  function getRangeBounds(range) {
    const to = /* @__PURE__ */ new Date();
    const from = /* @__PURE__ */ new Date();
    switch (range) {
      case "1H":
        from.setHours(from.getHours() - 1);
        break;
      case "6H":
        from.setHours(from.getHours() - 6);
        break;
      case "7D":
        from.setDate(from.getDate() - 7);
        break;
      case "30D":
        from.setDate(from.getDate() - 30);
        break;
      default:
        from.setDate(from.getDate() - 1);
        break;
    }
    return { from: from.toISOString(), to: to.toISOString() };
  }
  function renderHeroChart2(layers, decisions = []) {
    const { renderVegaHeroChart: renderVegaHeroChart2 } = window.__vegaCache || {};
    if (typeof renderVegaHeroChart2 === "function") {
      renderVegaHeroChart2(layers, "hero-chart", decisions);
      return;
    }
    void Promise.resolve().then(() => (init_VegaChart(), VegaChart_exports)).then((m) => {
      m.renderVegaHeroChart(
        layers.map((l) => ({ deviceId: l.deviceId, deviceName: l.deviceName, metric: l.metric.key, color: l.metric.color, data: l.data })),
        "hero-chart",
        decisions
      );
    });
  }
  function renderDetailTable(layers) {
    const tbody = document.getElementById("detail-body");
    const count = document.getElementById("detail-count");
    if (!tbody) return;
    const store = getStore();
    const rows = layers.flatMap(
      (layer) => layer.data.slice(-15).map((reading) => {
        const converted = formatSensorValue(reading.value, layer.metric.key, store.unitSystem);
        return {
          time: reading.timestamp,
          device: layer.deviceName,
          metric: layer.metric.label,
          value: formatValue(converted.value, converted.unit || layer.metric.fallbackUnit),
          color: layer.metric.color
        };
      })
    ).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    if (count) count.textContent = `${rows.length} readings`;
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No data</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map((r) => `
    <tr style="--metric-color:${r.color}">
      <td class="text-mono text-xs">${formatDateTimeValue(new Date(r.time), store.timeFormat)}</td>
      <td>${escapeHtml8(r.device)}</td>
      <td><span class="history-dot"></span>${escapeHtml8(r.metric)}</td>
      <td class="text-mono metric-value">${r.value}</td>
    </tr>
  `).join("");
  }
  function updatePillValues(layers) {
    const store = getStore();
    metrics.forEach((m) => {
      const el = document.getElementById(`pill-${m.key}`);
      if (!el) return;
      const layer = layers.find((l) => l.metric.key === m.key);
      if (!layer || layer.data.length === 0) {
        el.textContent = "--";
        return;
      }
      const latest = layer.data[layer.data.length - 1];
      const converted = formatSensorValue(latest.value, m.key, store.unitSystem);
      el.textContent = formatValue(converted.value, converted.unit || m.fallbackUnit);
    });
  }
  function renderHorizonStrips(allLayers) {
    const container = document.getElementById("horizon-strips");
    if (!container) return;
    if (allLayers.length === 0) {
      container.textContent = "";
      return;
    }
    const store = getStore();
    const byMetric = /* @__PURE__ */ new Map();
    for (const layer of allLayers) {
      if (!byMetric.has(layer.metric.key)) byMetric.set(layer.metric.key, layer);
    }
    const strips = Array.from(byMetric.values()).map((layer) => {
      const { data, metric } = layer;
      if (data.length < 2) return "";
      const converted = formatSensorValue(data[data.length - 1].value, metric.key, store.unitSystem);
      const latestLabel = `${converted.value.toFixed(1)}${converted.unit || metric.fallbackUnit}`;
      const values = data.map((d) => formatSensorValue(d.value, metric.key, store.unitSystem).value);
      const vMin = Math.min(...values);
      const vMax = Math.max(...values);
      const vSpan = Math.max(1e-3, vMax - vMin);
      const w = 420, h = 52;
      const step = (w - 4) / Math.max(values.length - 1, 1);
      const pts = values.map((v, i) => {
        const x = 2 + i * step;
        const y = 2 + (vMax - v) / vSpan * (h - 4);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
      const color = metric.color;
      return `<div class="horizon-strip">
      <div class="horizon-strip-header">
        <span class="horizon-strip-label">${escapeHtml8(metric.shortLabel)}</span>
        <span class="horizon-strip-value text-mono" style="color:${color}">${latestLabel}</span>
      </div>
      <svg viewBox="0 0 ${w} ${h}" class="horizon-strip-svg" preserveAspectRatio="none">
        <defs><linearGradient id="hs-grad-${metric.key}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0.02"/></linearGradient></defs>
        <path d="M2,${h - 2} ${pts} ${(2 + (values.length - 1) * step).toFixed(1)},${h - 2} Z" fill="url(#hs-grad-${metric.key})" stroke="none"/>
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
    </div>`;
    }).filter(Boolean);
    container.innerHTML = strips.join("");
  }
  function renderVizCards(allLayers, decisions = []) {
    const grid = document.getElementById("viz-grid");
    if (!grid) return;
    if (allLayers.length === 0) {
      grid.textContent = "";
      return;
    }
    const store = getStore();
    const byMetric = /* @__PURE__ */ new Map();
    for (const layer of allLayers) {
      const list = byMetric.get(layer.metric.key) || [];
      list.push(layer);
      byMetric.set(layer.metric.key, list);
    }
    const cards = [];
    const tempLayers = byMetric.get("temperature");
    if (tempLayers) cards.push(renderAreaCard(tempLayers[0], "Temperature Trend"));
    const humLayers = byMetric.get("humidity");
    if (humLayers) cards.push(renderLineCard(humLayers[0], "Humidity Trend"));
    const co2Layers = byMetric.get("co2");
    if (co2Layers) cards.push(renderBarCard(co2Layers[0], "CO\u2082 Levels"));
    const first = allLayers[0];
    if (first) cards.push(renderGaugeCard(first, "Latest Reading"));
    cards.push(renderQualityMatrix(allLayers, decisions));
    grid.innerHTML = cards.join("");
  }
  function renderAreaCard(layer, title) {
    const { data, metric } = layer;
    const store = getStore();
    const latest = formatSensorValue(data[data.length - 1].value, metric.key, store.unitSystem);
    const unit = latest.unit || metric.fallbackUnit;
    const id = `area-${metric.key}-${Math.random().toString(36).slice(2, 7)}`;
    setTimeout(() => {
      void Promise.resolve().then(() => (init_VegaChart(), VegaChart_exports)).then((m) => {
        m.renderVegaAreaCard(data, metric.key, id, title);
      });
    }, 0);
    return `<div class="viz-card" id="${id}">
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml8(title)}</span>
      <span class="viz-card-value text-mono" style="color:${metric.color}">${latest.value.toFixed(1)}${unit}</span>
    </div>
    <div class="viz-chart-placeholder" style="height:100px;"></div>
  </div>`;
  }
  function renderLineCard(layer, title) {
    const { data, metric } = layer;
    const store = getStore();
    const latest = formatSensorValue(data[data.length - 1].value, metric.key, store.unitSystem);
    const unit = latest.unit || metric.fallbackUnit;
    const id = `line-${metric.key}-${Math.random().toString(36).slice(2, 7)}`;
    setTimeout(() => {
      void Promise.resolve().then(() => (init_VegaChart(), VegaChart_exports)).then((m) => {
        m.renderVegaLineCard(data, metric.key, id, title);
      });
    }, 0);
    return `<div class="viz-card" id="${id}">
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml8(title)}</span>
      <span class="viz-card-value text-mono" style="color:${metric.color}">${latest.value.toFixed(0)}${unit}</span>
    </div>
    <div class="viz-chart-placeholder" style="height:100px;"></div>
  </div>`;
  }
  function renderBarCard(layer, title) {
    const { data, metric } = layer;
    const store = getStore();
    const latest = formatSensorValue(data[data.length - 1].value, metric.key, store.unitSystem);
    const unit = latest.unit || metric.fallbackUnit;
    const id = `bar-${metric.key}-${Math.random().toString(36).slice(2, 7)}`;
    setTimeout(() => {
      void Promise.resolve().then(() => (init_VegaChart(), VegaChart_exports)).then((m) => {
        m.renderVegaBarCard(data, metric.key, id, title);
      });
    }, 0);
    return `<div class="viz-card" id="${id}">
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml8(title)}</span>
      <span class="viz-card-value text-mono" style="color:${metric.color}">${latest.value.toFixed(0)}${unit}</span>
    </div>
    <div class="viz-chart-placeholder" style="height:100px;"></div>
  </div>`;
  }
  function renderGaugeCard(layer, title) {
    const { data, metric } = layer;
    const store = getStore();
    const latest = formatSensorValue(data[data.length - 1].value, metric.key, store.unitSystem);
    const unit = latest.unit || metric.fallbackUnit;
    const pct = Math.max(0, Math.min(1, (latest.value - metric.minAxis) / (metric.maxAxis - metric.minAxis)));
    const r = 42, cx = 80, cy = 56;
    const circ = 2 * Math.PI * r;
    const dash = pct * circ;
    return `
    <div class="viz-card">
      <div class="viz-card-header">
        <span class="viz-card-title">${escapeHtml8(title)}</span>
        <span class="viz-card-value text-mono" style="color:${metric.color}">${latest.value.toFixed(1)}${unit}</span>
      </div>
      <svg viewBox="0 0 160 100" class="viz-svg gauge-svg">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="8"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${metric.color}" stroke-width="8" stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" stroke-dashoffset="0" transform="rotate(-90 ${cx} ${cy})"/>
        <text x="${cx}" y="${cy + 6}" text-anchor="middle" fill="${metric.color}" font-size="18" font-weight="600" font-family="var(--font-mono)">${(pct * 100).toFixed(0)}%</text>
      </svg>
    </div>`;
  }
  function renderQualityMatrix(layers, decisions) {
    const now = Date.now();
    const staleMs = 10 * 60 * 1e3;
    const deviceMap = /* @__PURE__ */ new Map();
    const metricSet = /* @__PURE__ */ new Set();
    for (const l of layers) {
      deviceMap.set(l.deviceId, l.deviceName);
      metricSet.add(l.metric.key);
    }
    const deviceIds = Array.from(deviceMap.keys());
    const metricKeys = Array.from(metricSet);
    if (deviceIds.length === 0) return "";
    const latestMap = /* @__PURE__ */ new Map();
    for (const l of layers) {
      if (l.data.length === 0) continue;
      const last = l.data[l.data.length - 1];
      latestMap.set(`${l.deviceId}:${l.metric.key}`, new Date(last.timestamp).getTime());
    }
    const qualityColor = (ageMs) => {
      if (ageMs === void 0) return "#1A2822";
      if (ageMs < staleMs) return "#6DFF9A";
      if (ageMs < staleMs * 6) return "#FFC857";
      return "#FF5C6C";
    };
    const qualityLabel = (ageMs) => {
      if (ageMs === void 0) return "no data";
      const mins = Math.floor(ageMs / 6e4);
      return mins < 1 ? "just now" : `${mins}m ago`;
    };
    const headerCols = metricKeys.map((k) => {
      const cfg = metrics.find((m) => m.key === k);
      return `<th class="qm-th">${escapeHtml8(cfg?.shortLabel || k)}</th>`;
    }).join("");
    const rows = deviceIds.map((deviceId) => {
      const name = deviceMap.get(deviceId) || deviceId;
      const cells = metricKeys.map((metricKey) => {
        const ts = latestMap.get(`${deviceId}:${metricKey}`);
        const ageMs = ts !== void 0 ? now - ts : void 0;
        const color = qualityColor(ageMs);
        const label = qualityLabel(ageMs);
        return `<td class="qm-cell" title="${escapeHtml8(name)} \xB7 ${metricKey} \xB7 ${label}"><span class="qm-dot" style="background:${color}"></span></td>`;
      }).join("");
      return `<tr><td class="qm-device">${escapeHtml8(name.length > 20 ? name.slice(0, 18) + "\u2026" : name)}</td>${cells}</tr>`;
    }).join("");
    const recentDecisionCount = decisions.filter((d) => now - new Date(d.timestamp).getTime() < 36e5).length;
    return `
    <div class="viz-card wide">
      <div class="viz-card-header">
        <span class="viz-card-title">Sensor Quality</span>
        <span class="viz-card-value text-mono text-secondary">${recentDecisionCount} decisions / 1h</span>
      </div>
      <div class="qm-legend">
        <span class="qm-legend-item"><span class="qm-dot" style="background:#6DFF9A"></span>Fresh</span>
        <span class="qm-legend-item"><span class="qm-dot" style="background:#FFC857"></span>Stale</span>
        <span class="qm-legend-item"><span class="qm-dot" style="background:#FF5C6C"></span>Old</span>
        <span class="qm-legend-item"><span class="qm-dot" style="background:#1A2822"></span>Missing</span>
      </div>
      <table class="qm-table">
        <thead><tr><th class="qm-th-device">Device</th>${headerCols}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }
  function formatValue(value, unit) {
    const precision = Math.abs(value) >= 100 ? 0 : value % 1 === 0 ? 0 : 1;
    return `${value.toFixed(precision)}${unit}`;
  }
  function escapeHtml8(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function injectSensorStyles() {
    if (document.getElementById("hal-sensors-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-sensors-styles";
    style.textContent = `
.sensors-hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.sensors-hero-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.sensors-hero-title .page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}
.sensors-hero-title .page-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 2px 0 0;
}
.sensors-hero-controls {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.hal-input {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 32px;
  padding: 0 var(--space-3);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}
.hal-input:focus { border-color: var(--accent); }
.time-range-group {
  display: flex;
  gap: 2px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px;
}
.hal-range-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.hal-range-btn.active,
.hal-range-btn:hover {
  background: var(--accent);
  color: var(--on-accent);
}
.metric-bar {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding: var(--space-2) 0;
}
.metric-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--metric-color) 25%, var(--border));
  background: color-mix(in srgb, var(--metric-color) 6%, var(--bg-secondary));
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all var(--transition-fast);
  user-select: none;
}
.metric-pill.active {
  background: color-mix(in srgb, var(--metric-color) 18%, var(--bg-secondary));
  border-color: color-mix(in srgb, var(--metric-color) 60%, var(--border));
  color: var(--text-primary);
  box-shadow: 0 0 12px color-mix(in srgb, var(--metric-color) 20%, transparent);
}
.metric-pill:hover {
  border-color: color-mix(in srgb, var(--metric-color) 50%, var(--border));
}
.pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--metric-color);
}
.pill-label {
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.pill-value {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--metric-color);
  margin-left: 2px;
}
.hero-chart-wrap {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  overflow: hidden;
}
.hero-chart {
  width: 100%;
  min-height: 260px;
}
.hero-svg {
  display: block;
  width: 100%;
  height: auto;
}
.chart-grid {
  stroke: color-mix(in srgb, var(--text-tertiary) 30%, var(--border));
  stroke-width: 1;
  stroke-dasharray: 2 3;
}
.chart-label {
  fill: var(--text-tertiary);
  font-size: 10px;
  font-family: var(--font-mono);
}
.chart-empty {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 13px;
}
.hero-legend {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-subtle);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--metric-color);
}
/* Viz cards */
.viz-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-top: var(--space-6);
}
.viz-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.viz-card.wide {
  grid-column: span 2;
}
.viz-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.viz-card-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.viz-card-value {
  font-size: 16px;
  font-weight: 600;
}
.viz-svg {
  display: block;
  width: 100%;
  height: auto;
}
.gauge-svg {
  max-height: 100px;
}
.hm-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 3px;
  height: 40px;
}
.hm-cell {
  border-radius: var(--radius-sm);
  min-height: 8px;
}
.hm-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
}
.sensor-detail-drawer {
  margin-top: var(--space-4);
}
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}
.detail-table-wrap {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.hal-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.hal-table th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  color: var(--text-tertiary);
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  background: var(--bg-tertiary);
}
.hal-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
}
.hal-table tr:last-child td { border-bottom: none; }
.hal-table tr:hover td { background: var(--bg-tertiary); }
.metric-value { color: var(--metric-color); }
.history-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--metric-color);
  margin-right: 6px;
}
.empty-cell {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
}

/* \u2500\u2500 Horizon strips \u2500\u2500 */
.horizon-strips-section {
  margin-top: var(--space-6);
}
.horizon-strips-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  margin-top: var(--space-3);
}
.horizon-strip {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  overflow: hidden;
}
.horizon-strip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.horizon-strip-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}
.horizon-strip-value {
  font-size: 13px;
  font-weight: 600;
}
.horizon-strip-svg {
  display: block;
  width: 100%;
  height: 52px;
}

/* \u2500\u2500 Quality Matrix \u2500\u2500 */
.qm-legend {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  flex-wrap: wrap;
}
.qm-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-secondary);
}
.qm-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.qm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.qm-th, .qm-th-device {
  text-align: left;
  padding: var(--space-1) var(--space-2);
  color: var(--text-tertiary);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.qm-th-device { min-width: 120px; }
.qm-cell {
  padding: var(--space-1) var(--space-2);
  text-align: center;
  border-bottom: 1px solid var(--border-subtle);
}
.qm-device {
  padding: var(--space-1) var(--space-2);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
  font-size: 11px;
  white-space: nowrap;
}
.qm-table tbody tr:last-child td { border-bottom: none; }
.qm-table tbody tr:hover td { background: var(--bg-tertiary); }

@media (max-width: 1023px) {
  .viz-grid { grid-template-columns: repeat(2, 1fr); }
  .viz-card.wide { grid-column: span 2; }
  .horizon-strips-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .sensors-hero-header { flex-direction: column; align-items: flex-start; }
  .hero-chart { min-height: 200px; }
  .metric-bar { gap: var(--space-1); }
  .metric-pill { height: 32px; padding: 0 10px; font-size: 11px; }
  .viz-grid { grid-template-columns: 1fr; }
  .viz-card.wide { grid-column: span 1; }
  .horizon-strips-grid { grid-template-columns: 1fr; }
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/views/Decisions.ts
  init_store();
  var expandedDecisionIds = /* @__PURE__ */ new Set();
  var statusFilter = "all";
  async function renderDecisions(container) {
    const store = getStore();
    const filtered = statusFilter === "all" ? store.decisions : store.decisions.filter((d) => (d.status || "pending") === statusFilter);
    container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Decisions</h1>
      <p class="page-subtitle">HAL autonomous decision log</p>
    </div>

    <div class="decisions-toolbar mb-4">
      <div class="filter-group" role="group" aria-label="Filter by status">
        ${["all", "success", "failure", "pending"].map((s) => `
          <button class="filter-btn ${s === statusFilter ? "active" : ""}" data-filter="${s}">
            ${s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        `).join("")}
      </div>
      <span class="text-xs text-secondary">${filtered.length} decisions</span>
    </div>

    <div class="hal-card" style="padding:0">
      <div id="decisions-list">
        ${renderDecisionList(filtered)}
      </div>
    </div>
  `;
    injectDecisionsStyles();
    attachDecisionHandlers();
    attachFilterHandlers();
  }
  function attachFilterHandlers() {
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        statusFilter = btn.dataset.filter;
        const store = getStore();
        const container = document.getElementById("view-container");
        if (container) renderDecisions(container);
      });
    });
  }
  function renderDecisionList(decisions) {
    if (decisions.length === 0) {
      return `<div class="empty-state" style="padding: var(--space-8)"><p class="empty-state-title">No decisions</p><p class="empty-state-desc">${statusFilter === "all" ? "Decisions will appear here as the HAL makes them." : `No ${statusFilter} decisions found.`}</p></div>`;
    }
    return decisions.map((d) => `
    <div class="decision-item" data-id="${d.id}">
      <div class="decision-summary">
        <div class="decision-left">
          <span class="decision-status-dot ${d.status || "pending"}"></span>
          <span class="decision-time text-mono text-xs text-secondary">${formatTime4(d.timestamp)}</span>
        </div>
        <div class="decision-middle">
          <span class="decision-trigger-text text-sm">${escapeHtml9(d.trigger)}</span>
        </div>
        <div class="decision-right">
          <span class="decision-confidence text-mono text-xs" style="color:${confidenceColor3(d.confidence)}">${(d.confidence * 100).toFixed(0)}%</span>
          <button class="decision-expand-btn" aria-label="Toggle metadata">${expandedDecisionIds.has(d.id) ? "v" : ">"}</button>
        </div>
      </div>
      <div class="decision-detail" ${expandedDecisionIds.has(d.id) ? "" : "hidden"}>
        <div class="decision-detail-row">
          <span class="decision-detail-label">Decision</span>
          <span class="decision-detail-value font-semibold">${escapeHtml9(d.decision)}</span>
        </div>
        ${d.outcome ? `
        <div class="decision-detail-row">
          <span class="decision-detail-label">Outcome</span>
          <span class="decision-detail-value">${escapeHtml9(d.outcome)}</span>
        </div>` : ""}
        <div class="decision-detail-row">
          <span class="decision-detail-label">Confidence</span>
          <span class="decision-detail-value text-mono">${(d.confidence * 100).toFixed(1)}%</span>
        </div>
        <div class="decision-detail-row">
          <span class="decision-detail-label">Timestamp</span>
          <span class="decision-detail-value text-mono">${d.timestamp}</span>
        </div>
      </div>
    </div>
  `).join("");
  }
  function attachDecisionHandlers() {
    document.querySelectorAll(".decision-item").forEach((item) => {
      const summary = item.querySelector(".decision-summary");
      const detail = item.querySelector(".decision-detail");
      const expandBtn = item.querySelector(".decision-expand-btn");
      detail?.addEventListener("click", (event) => event.stopPropagation());
      summary?.addEventListener("click", () => {
        const isOpen = !detail?.hidden;
        const id = item.dataset.id;
        if (isOpen) {
          detail.hidden = true;
          expandBtn.textContent = ">";
          if (id) expandedDecisionIds.delete(id);
        } else {
          detail.hidden = false;
          expandBtn.textContent = "v";
          if (id) expandedDecisionIds.add(id);
        }
      });
    });
  }
  function confidenceColor3(conf) {
    if (conf >= 0.8) return "var(--success)";
    if (conf >= 0.5) return "var(--warning)";
    return "var(--danger)";
  }
  function formatTime4(iso) {
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
    } catch {
      return "--";
    }
  }
  function escapeHtml9(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function injectDecisionsStyles() {
    if (document.getElementById("hal-decisions-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-decisions-styles";
    style.textContent = `
.decision-item {
  border-bottom: 1px solid var(--border);
}
.decision-item:last-child { border-bottom: none; }
.decision-summary {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.decision-summary:hover { background: var(--bg-tertiary); }
.decision-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 140px;
}
.decision-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--slate);
  flex-shrink: 0;
}
.decision-status-dot.success { background: var(--success); }
.decision-status-dot.failure { background: var(--danger); }
.decision-status-dot.pending { background: var(--warning); }
.decision-middle { flex: 1; }
.decision-trigger-text { color: var(--text-primary); }
.decision-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.decision-confidence { font-size: 12px; }
.decision-expand-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 10px;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-fast);
}
.decision-detail {
  padding: 0 var(--space-4) var(--space-4);
  border-top: 1px solid var(--border-subtle);
}
.decision-detail[hidden] { display: none; }
.decision-detail-row {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.decision-detail-row:last-child { border-bottom: none; }
.decision-detail-label {
  min-width: 100px;
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.decision-detail-value { font-size: 14px; color: var(--text-primary); }
.decisions-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.filter-group {
  display: flex;
  gap: 2px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px;
}
.filter-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-transform: capitalize;
}
.filter-btn.active,
.filter-btn:hover {
  background: var(--accent);
  color: var(--on-accent);
}
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/views/Cameras.ts
  init_store();
  var DEMO_IMAGES = {
    tent_cam_a: "/hal-ui/assets/cam1.jpg",
    tent_cam_b: "/hal-ui/assets/cam2.jpg"
  };
  var refreshInterval = null;
  async function renderCameras(container) {
    const store = getStore();
    const cameras = store.devices.filter((d) => d.type === "camera");
    container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Cameras</h1>
      <p class="page-subtitle">Live feeds and captures</p>
    </div>

    <div id="cameras-grid" class="grid-2">
      ${renderCameraGrid(cameras)}
    </div>
  `;
    injectCamerasStyles();
    attachCameraHandlers(cameras);
    startCameraRefresh();
  }
  function startCameraRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
      document.querySelectorAll(".camera-time").forEach((el) => {
        el.textContent = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
      });
    }, 3e4);
  }
  function renderCameraGrid(cameras) {
    if (cameras.length === 0) {
      return `<div class="empty-state col-span-2"><p class="empty-state-title">No cameras registered</p><p class="empty-state-desc">Cameras will appear here once discovered.</p></div>`;
    }
    return cameras.map((c) => {
      const demoImg = DEMO_IMAGES[c.id];
      return `
    <div class="camera-card hal-card" data-camera-id="${c.id}">
      <div class="camera-thumbnail" id="thumb-${c.id}">
        ${demoImg ? `<img src="${demoImg}" alt="${escapeHtml10(c.name)}" class="camera-img" />` : `
        <div class="camera-placeholder">
          <span class="camera-icon">CAM</span>
          <span class="text-secondary text-sm">No preview</span>
        </div>`}
        <div class="camera-overlay">
          <span class="camera-live-badge">LIVE</span>
          <span class="camera-time text-mono text-xs">${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>
      <div class="camera-info">
        <div class="camera-name">${escapeHtml10(c.name)}</div>
        <div class="camera-meta text-xs text-secondary">${c.protocol} \xB7 ${c.online ? "online" : "offline"}</div>
      </div>
      <button class="hal-btn hal-btn-secondary camera-capture-btn" data-camera-id="${c.id}">
        Capture
      </button>
    </div>
  `;
    }).join("");
  }
  function attachCameraHandlers(cameras) {
    document.querySelectorAll(".camera-capture-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const cameraId = btn.dataset.cameraId;
        const camera = cameras.find((c) => c.id === cameraId);
        if (!camera) return;
        btn.textContent = "Capturing...";
        btn.disabled = true;
        try {
          const result = await halApi.captureCamera(cameraId);
          showToast(`Capture saved: ${result.path}`, "success");
          openModal(
            `${camera.name} \u2014 Capture`,
            `
            <div class="capture-result">
              <p class="text-sm text-secondary mb-4">Capture complete</p>
              <div class="capture-meta">
                <div class="capture-meta-row">
                  <span class="text-secondary text-xs">Path</span>
                  <span class="text-mono text-xs">${escapeHtml10(result.path)}</span>
                </div>
                <div class="capture-meta-row">
                  <span class="text-secondary text-xs">Size</span>
                  <span class="text-mono text-xs">${(result.size_bytes / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            </div>
          `,
            `<button class="hal-btn hal-btn-primary" onclick="document.getElementById('hal-modal-overlay')?.click()">Close</button>`
          );
        } catch (err) {
          showToast(`Capture failed: ${err.message}`, "danger");
        } finally {
          btn.textContent = "Capture";
          btn.disabled = false;
        }
      });
    });
  }
  function escapeHtml10(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function injectCamerasStyles() {
    if (document.getElementById("hal-cameras-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-cameras-styles";
    style.textContent = `
.camera-card { padding: 0; overflow: hidden; position: relative; }
.camera-thumbnail {
  height: 200px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}
.camera-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.camera-overlay {
  position: absolute;
  top: 0; left: 0; right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
  pointer-events: none;
}
.camera-live-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #fff;
  background: var(--danger);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}
.camera-time {
  color: rgba(255,255,255,0.9);
}
.camera-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
.camera-icon { font-size: 14px; font-weight: 700; letter-spacing: 0.1em; color: var(--text-tertiary); opacity: 0.6; }
.camera-info {
  padding: var(--space-3) var(--space-4);
}
.camera-name { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.camera-capture-btn {
  width: 100%;
  border-radius: 0;
  border-top: 1px solid var(--border);
  padding: var(--space-2);
  font-size: 13px;
}
.hal-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.hal-btn-primary {
  background: var(--accent);
  color: var(--on-accent);
}
.hal-btn-primary:hover { background: var(--accent-bright); }
.hal-btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}
.hal-btn-secondary:hover { border-color: var(--accent); }
.hal-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.capture-result { }
.capture-meta { display: flex; flex-direction: column; gap: var(--space-2); }
.capture-meta-row { display: flex; justify-content: space-between; align-items: center; }
.col-span-2 { grid-column: 1 / -1; }
`;
    document.head.appendChild(style);
  }

  // src/web/hal-ui/main.ts
  init_store();
  var views = {
    dashboard: renderDashboard,
    devices: renderDevices,
    sensors: renderSensors,
    decisions: renderDecisions,
    cameras: renderCameras,
    system: renderDashboard,
    terminal: renderDashboard
  };
  var pageLoadTime = Date.now();
  async function init() {
    const app = document.getElementById("app");
    if (!app) throw new Error("#app element not found");
    injectCardStyles();
    injectToggleStyles();
    injectModalStyles();
    const store = getStore();
    applyModeAccent(store.mode);
    app.innerHTML = `
    <div class="app-layout" id="app-layout">
      ${renderSidebar(store.mode, store.activeView, store.sidebarCollapsed)}
      <div class="app-main">
        <div id="hal-header"></div>
        <main class="main-content" id="view-container"></main>
      </div>
    </div>
  `;
    const headerEl = document.getElementById("hal-header");
    headerEl.innerHTML = renderHeader(store.mode, handleModeChange);
    initHeader(store.mode, handleModeChange);
    initSidebar(handleViewChange);
    await refreshHALData();
    await render();
    startPolling();
    startUptimeCounter();
  }
  function handleModeChange(mode) {
    setStore({ mode });
    applyModeAccent(mode);
    showToast(`Mode: ${mode}`, "info", 2e3);
    const sidebar = document.getElementById("hal-sidebar");
    if (sidebar) {
      const store = getStore();
      const newSidebar = document.createElement("div");
      newSidebar.innerHTML = renderSidebar(mode, store.activeView, store.sidebarCollapsed);
      sidebar.outerHTML = newSidebar.firstElementChild.outerHTML;
      initSidebar(handleViewChange);
    }
  }
  async function handleViewChange(viewId) {
    setStore({ activeView: viewId });
    await render();
  }
  async function render() {
    const store = getStore();
    const container = document.getElementById("view-container");
    if (!container) return;
    const renderer = views[store.activeView];
    if (renderer) {
      await renderer(container);
    }
  }
  async function refreshHALData() {
    try {
      const state2 = await halApi.getState();
      setStore({
        devices: state2.devices,
        sensors: state2.sensorSnapshots,
        cameras: state2.devices.filter((device) => device.type === "camera"),
        decisions: state2.recentDecisions,
        decisionsToday: countTodayDecisions(state2.recentDecisions)
      });
    } catch (err) {
      console.error("HAL data refresh failed:", err);
    }
  }
  function countTodayDecisions(decisions) {
    const today = (/* @__PURE__ */ new Date()).toDateString();
    return decisions.filter((d) => {
      try {
        return new Date(d.timestamp).toDateString() === today;
      } catch {
        return false;
      }
    }).length;
  }
  var pollInterval = null;
  function startPolling() {
    pollInterval = setInterval(refreshHALData, 1e4);
  }
  function startUptimeCounter() {
    setInterval(() => {
      const uptime = Math.floor((Date.now() - pageLoadTime) / 1e3);
      setStore({ uptime });
      const uptimeEl = document.querySelector("[data-dashboard-uptime]");
      if (uptimeEl) uptimeEl.textContent = formatUptime3(uptime);
    }, 1e3);
  }
  function formatUptime3(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${h}h ${m}m`;
  }
  document.addEventListener("DOMContentLoaded", init);
})();
//# sourceMappingURL=main.js.map
