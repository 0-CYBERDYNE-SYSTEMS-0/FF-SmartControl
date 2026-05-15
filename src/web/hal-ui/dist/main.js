"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/web/hal-ui/tokens.css
  var init_tokens = __esm({
    "src/web/hal-ui/tokens.css"() {
    }
  });

  // src/web/hal-ui/reset.css
  var init_reset = __esm({
    "src/web/hal-ui/reset.css"() {
    }
  });

  // src/web/hal-ui/themes.css
  var init_themes = __esm({
    "src/web/hal-ui/themes.css"() {
    }
  });

  // src/web/hal-ui/store.ts
  var store_exports = {};
  __export(store_exports, {
    applyTheme: () => applyTheme,
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
    themeDefinitions: () => themeDefinitions,
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
  function formatTimeValue(date2, format) {
    if (format === "12h") {
      return date2.toLocaleTimeString("en-US", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    return date2.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  function formatDateTimeValue(date2, format) {
    if (format === "12h") {
      return date2.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    }
    return date2.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  }
  function applyTheme(theme) {
    const root = document.documentElement;
    root.dataset.theme = theme;
    const def = themeDefinitions[theme];
    root.style.setProperty("--accent", def.accent);
    root.style.setProperty("--accent-bright", def.accentBright);
    root.style.setProperty("--bg-primary", def.bgPrimary);
    root.style.setProperty("--bg-secondary", def.bgSecondary);
    root.style.setProperty("--bg-tertiary", def.bgTertiary);
    root.style.setProperty("--text-primary", def.textPrimary);
    root.style.setProperty("--text-secondary", def.textSecondary);
    root.style.setProperty("--text-tertiary", def.textTertiary);
    root.style.setProperty("--border", def.border);
    root.style.setProperty("--border-subtle", def.borderSubtle);
    root.style.setProperty("--success", def.success);
    root.style.setProperty("--warning", def.warning);
    root.style.setProperty("--danger", def.danger);
    root.style.setProperty("--glow", def.glow);
  }
  var listeners, state, themeDefinitions;
  var init_store = __esm({
    "src/web/hal-ui/store.ts"() {
      "use strict";
      listeners = /* @__PURE__ */ new Set();
      state = {
        theme: "emerald",
        layout: "operator",
        activeView: "dashboard",
        unitSystem: "imperial",
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
        autoMode: true,
        automationMode: "AUTONOMOUS",
        automationModeColor: { bg: "#F85149", text: "#F0F6FC", label: "AUTO" },
        pendingDecisions: [],
        safetyState: "NORMAL",
        safetyActiveRulesCount: 0,
        safetyWarningDevicesCount: 0,
        safetyDeniedLast24h: 0
      };
      themeDefinitions = {
        emerald: {
          label: "Emerald",
          accent: "#238636",
          accentBright: "#3FB950",
          bgPrimary: "#07110C",
          bgSecondary: "#0E1A14",
          bgTertiary: "#14251B",
          textPrimary: "#E8FFF2",
          textSecondary: "#8FA89B",
          textTertiary: "#4A6356",
          border: "#254332",
          borderSubtle: "#182B20",
          success: "#3FB950",
          warning: "#D29922",
          danger: "#F85149",
          glow: "rgba(63,185,80,0.12)"
        },
        amber: {
          label: "Amber",
          accent: "#D29922",
          accentBright: "#E3B341",
          bgPrimary: "#120D05",
          bgSecondary: "#1D160A",
          bgTertiary: "#2A210F",
          textPrimary: "#FFF5D6",
          textSecondary: "#B8A67A",
          textTertiary: "#6B5D3E",
          border: "#4A3714",
          borderSubtle: "#33250E",
          success: "#7EB84A",
          warning: "#E3B341",
          danger: "#E06C5C",
          glow: "rgba(227,179,65,0.12)"
        },
        blue: {
          label: "Blue",
          accent: "#388BFD",
          accentBright: "#58A6FF",
          bgPrimary: "#07101E",
          bgSecondary: "#0D1627",
          bgTertiary: "#13213A",
          textPrimary: "#E0F0FF",
          textSecondary: "#7A9EC7",
          textTertiary: "#4A6385",
          border: "#263D63",
          borderSubtle: "#172A47",
          success: "#4FD17A",
          warning: "#D29922",
          danger: "#F85149",
          glow: "rgba(88,166,255,0.12)"
        },
        rose: {
          label: "Rose",
          accent: "#F85149",
          accentBright: "#FF7B72",
          bgPrimary: "#1A0A0A",
          bgSecondary: "#271212",
          bgTertiary: "#361A1A",
          textPrimary: "#FFE8E8",
          textSecondary: "#C78F8F",
          textTertiary: "#7A5555",
          border: "#5C2A2A",
          borderSubtle: "#3D1A1A",
          success: "#7EB84A",
          warning: "#E3B341",
          danger: "#FF7B72",
          glow: "rgba(255,123,114,0.12)"
        },
        violet: {
          label: "Violet",
          accent: "#A371F7",
          accentBright: "#C084FC",
          bgPrimary: "#0F0A1A",
          bgSecondary: "#18122B",
          bgTertiary: "#231A3D",
          textPrimary: "#F0E8FF",
          textSecondary: "#A08EC7",
          textTertiary: "#6B5D85",
          border: "#3D2A63",
          borderSubtle: "#2A1A47",
          success: "#7EB84A",
          warning: "#D29922",
          danger: "#F85149",
          glow: "rgba(192,132,252,0.12)"
        },
        cyan: {
          label: "Cyan",
          accent: "#22B8CF",
          accentBright: "#4FD1E0",
          bgPrimary: "#051015",
          bgSecondary: "#0A1A22",
          bgTertiary: "#0F2530",
          textPrimary: "#E0F7FF",
          textSecondary: "#7AB8C7",
          textTertiary: "#4A7585",
          border: "#1A3D4D",
          borderSubtle: "#102A36",
          success: "#4FD17A",
          warning: "#D29922",
          danger: "#F85149",
          glow: "rgba(79,209,224,0.12)"
        },
        orange: {
          label: "Orange",
          accent: "#E07B16",
          accentBright: "#F6A94C",
          bgPrimary: "#140E05",
          bgSecondary: "#1F170A",
          bgTertiary: "#2E2110",
          textPrimary: "#FFF0D6",
          textSecondary: "#C7A87A",
          textTertiary: "#7A6B4A",
          border: "#4D3514",
          borderSubtle: "#36250E",
          success: "#7EB84A",
          warning: "#F6A94C",
          danger: "#F85149",
          glow: "rgba(246,169,76,0.12)"
        },
        slate: {
          label: "Slate",
          accent: "#6C7278",
          accentBright: "#8B949E",
          bgPrimary: "#0A0C0F",
          bgSecondary: "#111318",
          bgTertiary: "#181B22",
          textPrimary: "#E8EAED",
          textSecondary: "#8B949E",
          textTertiary: "#555B63",
          border: "#2E333B",
          borderSubtle: "#1E2228",
          success: "#7EB84A",
          warning: "#D29922",
          danger: "#F85149",
          glow: "rgba(139,148,158,0.12)"
        }
      };
    }
  });

  // src/web/hal-ui/components/Sidebar.ts
  function renderSidebar(activeView, collapsed) {
    const items = navItems.map(
      (item) => `
    <button
      class="sidebar-item ${item.id === activeView ? "active" : ""}"
      data-view="${item.id}"
      title="${item.label}"
    >
      <span class="sidebar-icon">${item.icon}</span>
      <span class="sidebar-label">${item.label}</span>
    </button>
  `
    ).join("");
    return `
    <aside class="sidebar ${collapsed ? "collapsed" : ""}" id="hal-sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <img class="sidebar-logo-img" src="./ff_logo_svg.svg" alt="FF_SmartControl logo" />
          <span class="sidebar-brand sidebar-brand-long">FF_SmartControl</span>
          <span class="sidebar-brand sidebar-brand-short">FF_SmartControl</span>
        </div>
        <button class="sidebar-toggle" id="sidebar-toggle" title="Toggle sidebar">
          ${chevronIcon()}
        </button>
      </div>
      <nav class="sidebar-nav" aria-label="Main navigation">
        ${items}
      </nav>
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
      if (window.innerWidth > 1279) return;
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
  function safetyIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`;
  }
  function systemIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
  }
  function terminalIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;
  }
  function calibrationIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
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
.sidebar-logo-img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  flex-shrink: 0;
}
.sidebar-brand {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  transition: opacity var(--transition-fast);
}
.sidebar-brand-short {
  display: none;
}
.sidebar.collapsed .sidebar-brand {
  opacity: 0;
  width: 0;
}
@media (max-width: 1560px) {
  .sidebar:not(.collapsed) .sidebar-brand-long {
    display: none;
  }
  .sidebar:not(.collapsed) .sidebar-brand-short {
    display: inline;
  }
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
@media (max-width: 1279px) {
  .sidebar {
    width: min(86vw, 280px);
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 220;
    transform: translateX(-100%);
    transition: transform var(--transition-base);
    box-shadow: var(--shadow-card-lg);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .sidebar.collapsed {
    width: min(86vw, 280px);
  }
  .sidebar.collapsed .sidebar-brand,
  .sidebar.collapsed .sidebar-label,
  .sidebar.collapsed .sidebar-mode-label {
    display: block;
    opacity: 1;
    width: auto;
  }
  .sidebar:not(.collapsed) .sidebar-brand-long {
    display: inline;
  }
  .sidebar:not(.collapsed) .sidebar-brand-short {
    display: none;
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
  var navItems;
  var init_Sidebar = __esm({
    "src/web/hal-ui/components/Sidebar.ts"() {
      "use strict";
      init_store();
      navItems = [
        { id: "dashboard", label: "Overview", icon: overviewIcon() },
        { id: "devices", label: "Devices", icon: devicesIcon() },
        { id: "sensors", label: "Sensors", icon: sensorsIcon() },
        { id: "calibration", label: "Calibration", icon: calibrationIcon() },
        { id: "decisions", label: "Decisions", icon: decisionsIcon() },
        { id: "cameras", label: "Cameras", icon: camerasIcon() },
        { id: "safety", label: "Safety", icon: safetyIcon() },
        { id: "system", label: "System", icon: systemIcon() },
        { id: "terminal", label: "Terminal", icon: terminalIcon() }
      ];
    }
  });

  // src/web/hal-ui/api.ts
  async function halGet(path, params) {
    let url = BASE + path;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += "?" + qs;
    }
    const res = await fetch(url);
    if (res.status === 401) {
      redirectToLogin();
    }
    if (!res.ok)
      throw new Error(`HAL API ${url} failed: ${res.status} ${res.statusText}`);
    return res.json();
  }
  async function halPost(path, body) {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : void 0
    });
    if (res.status === 401) {
      redirectToLogin();
    }
    if (!res.ok)
      throw new Error(`HAL API ${path} failed: ${res.status} ${res.statusText}`);
    return res.json();
  }
  async function halPut(path, body) {
    const res = await fetch(BASE + path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : void 0
    });
    if (res.status === 401) {
      redirectToLogin();
    }
    if (!res.ok)
      throw new Error(`HAL API ${path} failed: ${res.status} ${res.statusText}`);
    return res.json();
  }
  async function settingsGet(path) {
    const res = await fetch(SETTINGS_BASE + path);
    if (res.status === 401) {
      redirectToLogin();
    }
    if (!res.ok)
      throw new Error(
        `Settings API ${path} failed: ${res.status} ${res.statusText}`
      );
    return res.json();
  }
  function redirectToLogin() {
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/login") return;
    window.location.href = "/login";
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
      lastSeen: device.lastSeen || device.last_seen || void 0,
      zone: device.zone ?? void 0,
      calibration_offset: device.calibration_offset,
      controlled_device_description: device.controlled_device_description ?? void 0
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
          const normalizedReading = normalizeSensorReading(
            reading
          );
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
    let sensorSnapshot;
    if (decision.sensor_snapshot) {
      if (typeof decision.sensor_snapshot === "string") {
        try {
          sensorSnapshot = JSON.parse(decision.sensor_snapshot);
        } catch {
          sensorSnapshot = void 0;
        }
      } else if (typeof decision.sensor_snapshot === "object") {
        sensorSnapshot = decision.sensor_snapshot;
      }
    }
    return {
      id: decision.id || "unknown",
      timestamp: decision.timestamp || decision.decided_at || decision.completed_at || (/* @__PURE__ */ new Date()).toISOString(),
      trigger: decision.trigger || decision.device_id || "HAL",
      decision: decision.decision || "No decision text",
      confidence: Math.max(0, Math.min(1, Number(decision.confidence ?? 0))),
      status,
      outcome,
      // Extended fields
      reasoning: decision.reasoning ?? void 0,
      deviceId: decision.device_id ?? void 0,
      sensorSnapshot,
      triggeredBy: decision.triggered_by ?? void 0,
      pendingStatus: decision.pending_status ?? void 0,
      model: decision.model ?? void 0,
      completedAt: decision.completed_at ?? void 0
    };
  }
  function normalizeState(state2) {
    return {
      devices: (state2.devices || []).map(normalizeDevice),
      sensorSnapshots: normalizeSensorSnapshots(state2.sensorSnapshots),
      recentDecisions: (state2.recentDecisions || []).map(normalizeDecision)
    };
  }
  var BASE, SETTINGS_BASE, halApi;
  var init_api = __esm({
    "src/web/hal-ui/api.ts"() {
      "use strict";
      BASE = "/api/hal";
      SETTINGS_BASE = "/api/settings";
      halApi = {
        // GET /api/hal/state
        async getState() {
          return normalizeState(await halGet("/state"));
        },
        openStateStream(onState, onError) {
          if (typeof EventSource === "undefined") return null;
          const source = new EventSource(`${BASE}/stream`);
          source.addEventListener("state", (event) => {
            const parsed = JSON.parse(event.data);
            const state2 = "state" in parsed ? normalizeState(parsed.state) : normalizeState(parsed);
            const streamEvent = "state" in parsed ? { ...parsed, state: state2 } : { emittedAt: (/* @__PURE__ */ new Date()).toISOString(), state: state2 };
            onState(state2, streamEvent);
          });
          source.onerror = (error) => onError?.(error);
          return source;
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
        // GET /api/hal/sensors/latest — returns all sensor metrics (not just temperature/humidity)
        async getSensorsLatest() {
          const readings = await halGet("/sensors/latest");
          return readings.map((reading) => {
            const result = {
              device: normalizeDevice(reading.device)
            };
            for (const [metric, r] of Object.entries(reading)) {
              if (metric !== "device" && r) {
                result[metric] = normalizeSensorReading(r);
              }
            }
            return result;
          });
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
          const decisions = await halGet("/decisions", {
            limit: String(limit)
          });
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
        },
        // ══════════════════════════════════════════════════════════════════════════════
        // E-Stop API
        // ══════════════════════════════════════════════════════════════════════════════
        // GET /api/hal/estop/status
        async getEstopStatus() {
          return halGet("/estop/status");
        },
        // POST /api/hal/estop — activate emergency stop
        async activateEstop(reason, reasonText) {
          return halPost("/estop", { reason: reason || "operator", reasonText });
        },
        // POST /api/hal/estop/clear — clear emergency stop (requires auth)
        async clearEstop(operatorId) {
          return halPost("/estop/clear", { operatorId });
        },
        // GET /api/hal/estop/safe-states
        async getEstopSafeStates() {
          return halGet("/estop/safe-states");
        },
        // PUT /api/hal/estop/safe-states/:deviceId
        async setEstopSafeState(deviceId, safeState, safeValue) {
          return halPut(`/estop/safe-states/${deviceId}`, { safeState, safeValue });
        },
        // GET /api/hal/farm-loop/status
        async getFarmLoopStatus() {
          return halGet("/farm-loop/status");
        },
        // ══════════════════════════════════════════════════════════════════════════════
        // Safety Rules API
        // ══════════════════════════════════════════════════════════════════════════════
        // GET /api/hal/safety/rules — list all safety rules
        async getSafetyRules() {
          return halGet("/safety/rules");
        },
        // GET /api/hal/safety/rules/:id — get a specific rule
        async getSafetyRule(id) {
          return halGet(`/safety/rules/${id}`);
        },
        // POST /api/hal/safety/rules — create a new rule
        async createSafetyRule(rule) {
          return halPost("/safety/rules", rule);
        },
        // PUT /api/hal/safety/rules/:id — update a rule
        async updateSafetyRule(id, updates) {
          return halPut(`/safety/rules/${id}`, updates);
        },
        // DELETE /api/hal/safety/rules/:id — delete a rule
        async deleteSafetyRule(id) {
          const res = await fetch(BASE + `/safety/rules/${id}`, {
            method: "DELETE"
          });
          if (!res.ok) throw new Error(`Failed to delete rule: ${res.status}`);
          return { ok: true };
        },
        // GET /api/hal/safety/audit — get recent audit log entries
        async getSafetyAudit(params) {
          return halGet("/safety/audit", params);
        },
        // GET /api/hal/safety/state — get current safety state
        async getSafetyState() {
          return halGet("/safety/state");
        },
        // GET /api/hal/safety/summary — get safety dashboard summary
        async getSafetySummary() {
          return halGet("/safety/summary");
        },
        // ══════════════════════════════════════════════════════════════════════════════
        // Threshold API (VAL-AUTO-010, VAL-AUTO-011, VAL-AUTO-012)
        // ══════════════════════════════════════════════════════════════════════════════
        // GET /api/hal/thresholds — list all thresholds
        async getThresholds(params) {
          return halGet("/thresholds", params);
        },
        // GET /api/hal/thresholds/:id — get a specific threshold
        async getThreshold(id) {
          return halGet(`/thresholds/${id}`);
        },
        // POST /api/hal/thresholds — create a new threshold
        async createThreshold(data) {
          return halPost("/thresholds", data);
        },
        // PUT /api/hal/thresholds/:id — update a threshold
        async updateThreshold(id, updates) {
          return halPut(`/thresholds/${id}`, updates);
        },
        // DELETE /api/hal/thresholds/:id — delete a threshold
        async deleteThreshold(id) {
          const res = await fetch(BASE + `/thresholds/${id}`, {
            method: "DELETE"
          });
          if (!res.ok) throw new Error(`Failed to delete threshold: ${res.status}`);
          return { ok: true };
        },
        // ══════════════════════════════════════════════════════════════════════════════
        // Discovery API (VAL-DISC-001 to VAL-DISC-052)
        // ══════════════════════════════════════════════════════════════════════════════
        // GET /api/hal/discovery/gpio/status — check pigpiod availability (VAL-DISC-010)
        async getGpioStatus() {
          return halGet("/discovery/gpio/status");
        },
        // GET /api/hal/discovery/gpio/pins — get BCM pin status (VAL-DISC-011)
        async getGpioPins() {
          return halGet("/discovery/gpio/pins");
        },
        // POST /api/hal/discovery/gpio/register — register a GPIO device (VAL-DISC-012)
        async registerGpioDevice(data) {
          return halPost("/discovery/gpio/register", data);
        },
        // GET /api/hal/discovery/mqtt/devices — MQTT auto-discovery (VAL-DISC-020, VAL-DISC-021)
        async getMqttDevices() {
          return halGet("/discovery/mqtt/devices");
        },
        // POST /api/hal/discovery/mqtt/register — register MQTT device (VAL-DISC-022)
        async registerMqttDevice(data) {
          return halPost("/discovery/mqtt/register", data);
        },
        // GET /api/hal/discovery/http/scan — scan subnet for HTTP devices (VAL-DISC-003, VAL-DISC-005)
        async scanHttpDevices(params) {
          return halGet("/discovery/http/scan", params);
        },
        // POST /api/hal/discovery/http/register — register HTTP device (VAL-DISC-007)
        async registerHttpDevice(data) {
          return halPost("/discovery/http/register", data);
        },
        // GET /api/hal/discovery/serial/ports — enumerate serial ports (VAL-DISC-030)
        async getSerialPorts() {
          return halGet("/discovery/serial/ports");
        },
        // POST /api/hal/discovery/serial/probe — probe a serial port (VAL-DISC-031, VAL-DISC-032)
        async probeSerialPort(port) {
          return halPost("/discovery/serial/probe", { port });
        },
        // POST /api/hal/discovery/serial/register — register serial device (VAL-DISC-032)
        async registerSerialDevice(data) {
          return halPost("/discovery/serial/register", data);
        },
        // POST /api/hal/discovery/manual — manually add device (VAL-DISC-040)
        async manualAddDevice(data) {
          return halPost("/discovery/manual", data);
        },
        // PUT /api/hal/devices/:id — update device label, zone, and/or description (VAL-DISC-050, VAL-DISC-052, VAL-DISC-070)
        async updateDevice(id, data) {
          return halPut(`/devices/${id}`, data);
        },
        // PUT /api/hal/devices/:id/calibration — update calibration offset (VAL-DISC-060, VAL-DISC-061)
        async updateDeviceCalibration(id, offset) {
          return halPut(`/devices/${id}/calibration`, { offset });
        },
        // DELETE /api/hal/devices/:id — remove device
        async removeDevice(id) {
          const res = await fetch(BASE + `/devices/${id}`, { method: "DELETE" });
          if (!res.ok) throw new Error(`Failed to remove device: ${res.status}`);
          return { ok: true };
        },
        // GET /api/hal/zones — list all zones (VAL-DISC-050, VAL-DISC-051)
        async getZones() {
          return halGet("/zones");
        },
        // PUT /api/hal/zones/:id — rename a zone
        async renameZone(oldName, newName) {
          const encodedId = oldName ? encodeURIComponent(oldName) : "_none";
          return halPut(`/zones/${encodedId}`, { name: newName });
        },
        // ══════════════════════════════════════════════════════════════════════════════
        // Automation Mode API (VAL-AUTO-001 to VAL-AUTO-003)
        // ══════════════════════════════════════════════════════════════════════════════
        // GET /api/hal/automation/mode — get current automation mode
        async getAutomationMode() {
          return halGet("/automation/mode");
        },
        // PUT /api/hal/automation/mode — set automation mode
        async setAutomationMode(mode, operatorId) {
          return halPut("/automation/mode", { mode, operatorId });
        },
        // GET /api/hal/automation/pending — get all pending decisions
        async getAutomationPending() {
          return halGet("/automation/pending");
        },
        // POST /api/hal/automation/veto — veto a pending decision
        async vetoDecision(decisionId, operatorId) {
          return halPost("/automation/veto", { decisionId, operatorId });
        },
        // POST /api/hal/automation/approve — approve a pending decision
        async approveDecision(decisionId, operatorId) {
          return halPost("/automation/approve", { decisionId, operatorId });
        },
        // POST /api/hal/automation/trigger — manually trigger a decision cycle
        async triggerDecisionCycle() {
          return halPost("/automation/trigger");
        },
        // ══════════════════════════════════════════════════════════════════════════════
        // LLM Settings API
        // ══════════════════════════════════════════════════════════════════════════════
        // GET /api/settings/llm — get saved LLM provider settings
        async getLlmSettings() {
          return settingsGet("/llm");
        },
        // ══════════════════════════════════════════════════════════════════════════════
        // Backup API (VAL-SVC-033)
        // ══════════════════════════════════════════════════════════════════════════════
        // POST /api/hal/backup — trigger a manual backup
        async triggerBackup() {
          return halPost("/backup");
        },
        // ══════════════════════════════════════════════════════════════════════════════
        // License API (VAL-LIC-001 through VAL-LIC-016)
        // ══════════════════════════════════════════════════════════════════════════════
        // GET /api/license/status — get current license status
        async getLicenseStatus() {
          const res = await fetch("/api/license/status");
          if (!res.ok) throw new Error(`License status failed: ${res.status}`);
          return res.json();
        },
        // GET /api/license/hardware-id — get hardware ID for this device
        async getHardwareId() {
          const res = await fetch("/api/license/hardware-id");
          if (!res.ok) throw new Error(`Hardware ID failed: ${res.status}`);
          return res.json();
        },
        // POST /api/license/activate — activate a license key
        async activateLicense(licenseKey) {
          const res = await fetch("/api/license/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ licenseKey })
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `License activation failed: ${res.status}`);
          }
          return data;
        },
        // POST /api/license/deactivate — deactivate license
        async deactivateLicense() {
          const res = await fetch("/api/license/deactivate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
          });
          if (!res.ok) throw new Error(`License deactivation failed: ${res.status}`);
          return res.json();
        },
        // GET /api/license/feature-gates — get feature gates based on license
        async getFeatureGates() {
          const res = await fetch("/api/license/feature-gates");
          if (!res.ok) throw new Error(`Feature gates failed: ${res.status}`);
          return res.json();
        }
      };
    }
  });

  // src/web/hal-ui/components/Header.ts
  function renderHeader(theme) {
    const themes = Object.entries(themeDefinitions);
    const dots = themes.map(
      ([key, def]) => `
    <button
      class="theme-dot ${key === theme ? "active" : ""}"
      data-theme="${key}"
      aria-label="${def.label}"
      title="${def.label}"
      style="--dot-color:${def.accent}"
    ></button>
  `
    ).join("");
    const currentDef = themeDefinitions[theme];
    const store = getStore();
    const currentLayout = store.layout;
    const layoutButtons = ["calm", "operator", "diagnostic"].map((l) => {
      const labels = {
        calm: "CALM",
        operator: "OPERATOR",
        diagnostic: "DIAG"
      };
      return `
      <button
        class="layout-btn ${l === currentLayout ? "active" : ""}"
        data-layout="${l}"
        aria-label="${labels[l]} mode"
        title="${labels[l]} mode"
      >${labels[l]}</button>
    `;
    }).join("");
    return `
    <header class="hal-header">
      <div class="hal-header-left">
        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="hal-header-brand" title="FF_SmartControl">
          <img class="hal-header-brand-logo" src="./ff_logo_svg.svg" alt="FF_SmartControl logo" />
          <span class="hal-header-brand-text hal-header-brand-text-long">FF_SmartControl</span>
          <span class="hal-header-brand-text hal-header-brand-text-short">FF_SmartControl</span>
        </div>
        <span class="hal-header-view-label" id="header-view-label">${getViewLabel()}</span>
      </div>
      <div class="hal-header-center">
        <div class="layout-selector" id="layout-selector" role="group" aria-label="Dashboard layout">
          ${layoutButtons}
        </div>
        <div class="safety-state-indicator" id="safety-state-indicator" title="Safety State">
          <span class="safety-state-dot"></span>
          <span class="safety-state-label" id="safety-state-label">NORMAL</span>
        </div>
        <button class="theme-picker-trigger" id="theme-picker-trigger" aria-label="Theme" style="--dot-color:${currentDef.accent}">
          <span class="theme-picker-trigger-dot"></span>
        </button>
        <div class="theme-picker-popover" id="theme-picker-popover">
          <div class="theme-picker-grid">${dots}</div>
        </div>
        <div class="auto-mode-selector" id="auto-mode-selector">
          <button class="auto-mode-btn" id="auto-mode-btn" aria-label="Automation mode" title="Automation mode">
            <span class="auto-mode-badge" id="auto-mode-badge" style="background:${store.automationModeColor.bg};color:${store.automationModeColor.text}">${store.automationModeColor.label}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="auto-mode-popover" id="auto-mode-popover">
            <div class="auto-mode-header">Automation Mode</div>
            <div class="auto-mode-list">
              <button class="auto-mode-option" data-mode="OBSERVE_ONLY">
                <span class="auto-mode-dot" style="background:#238636"></span>
                <span class="auto-mode-name">OBSERVE</span>
                <span class="auto-mode-desc">No actions, LLM sees data</span>
              </button>
              <button class="auto-mode-option" data-mode="SUGGEST">
                <span class="auto-mode-dot" style="background:#388BFD"></span>
                <span class="auto-mode-name">SUGGEST</span>
                <span class="auto-mode-desc">Recommendations, no execution</span>
              </button>
              <button class="auto-mode-option" data-mode="ASSISTED_CONTROL">
                <span class="auto-mode-dot" style="background:#D29922"></span>
                <span class="auto-mode-name">ASSISTED</span>
                <span class="auto-mode-desc">30s veto window</span>
              </button>
              <button class="auto-mode-option" data-mode="AUTONOMOUS">
                <span class="auto-mode-dot" style="background:#F85149"></span>
                <span class="auto-mode-name">AUTO</span>
                <span class="auto-mode-desc">Executes immediately</span>
              </button>
            </div>
            <div class="auto-mode-divider"></div>
            <button class="auto-mode-trigger" id="auto-mode-trigger-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Run Decision Now
            </button>
          </div>
        </div>
      </div>
      <div class="hal-header-right">
        <button class="settings-btn" id="settings-btn" aria-label="Settings" title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <button class="estop-btn" id="estop-btn" aria-label="Emergency Stop" title="Emergency Stop">
          <span class="estop-btn-inner">ESTOP</span>
        </button>
        <span class="hal-clock text-mono" id="hal-clock">--:--:--</span>
      </div>
    </header>
    <div class="estop-banner" id="estop-banner" style="display:none;">
      <span class="estop-banner-icon">\u26A0</span>
      <span class="estop-banner-text">EMERGENCY STOP ACTIVE</span>
      <span class="estop-banner-time" id="estop-banner-time"></span>
    </div>
  `;
  }
  function getViewLabel() {
    const labels = {
      dashboard: "Overview",
      devices: "Devices",
      sensors: "Sensors",
      decisions: "Decisions",
      cameras: "Cameras",
      safety: "Safety",
      system: "System",
      terminal: "Terminal",
      calibration: "Calibration",
      settings: "Settings"
    };
    return labels[location.hash.slice(1) || "dashboard"] || "Overview";
  }
  function initHeader(theme, onThemeChange, onEstopChange, onLayoutChange, onSettingsClick, onModeChange, onManualTrigger) {
    injectHeaderStyles();
    injectAutoModeStyles();
    startClock();
    setupThemeButtons(onThemeChange);
    setupEstopButton(onEstopChange);
    setupLayoutButtons(onLayoutChange);
    setupSettingsButton(onSettingsClick);
    setupAutoModeSelector(onModeChange, onManualTrigger);
    refreshEstopStatus();
  }
  function refreshEstopStatus() {
    if (estopRefreshInterval) clearInterval(estopRefreshInterval);
    estopRefreshInterval = setInterval(async () => {
      try {
        const status = await halApi.getEstopStatus();
        updateEstopUI(status.estop.active, status.estop.activatedAt);
      } catch {
      }
      try {
        const safetyState = await halApi.getSafetyState();
        updateSafetyStateIndicator(safetyState.safetyState);
      } catch {
      }
    }, 5e3);
    halApi.getEstopStatus().then((status) => {
      updateEstopUI(status.estop.active, status.estop.activatedAt);
    }).catch(() => {
    });
    halApi.getSafetyState().then((safetyState) => {
      updateSafetyStateIndicator(safetyState.safetyState);
    }).catch(() => {
    });
  }
  function updateSafetyStateIndicator(state2) {
    const indicator = document.getElementById("safety-state-indicator");
    const label = document.getElementById("safety-state-label");
    if (!indicator || !label) return;
    indicator.classList.remove("normal", "warning", "emergency");
    switch (state2) {
      case "NORMAL":
        indicator.classList.add("normal");
        label.textContent = "NORMAL";
        break;
      case "WARNING":
        indicator.classList.add("warning");
        label.textContent = "WARNING";
        break;
      case "EMERGENCY_STOP_ACTIVE":
        indicator.classList.add("emergency");
        label.textContent = "E-STOP";
        break;
      default:
        label.textContent = state2;
    }
  }
  function updateEstopUI(active, activatedAt) {
    const banner = document.getElementById("estop-banner");
    const btn = document.getElementById("estop-btn");
    const bannerTime = document.getElementById("estop-banner-time");
    if (active) {
      btn?.classList.add("active");
      if (banner) {
        banner.style.display = "flex";
        if (activatedAt && bannerTime) {
          const date2 = new Date(activatedAt);
          bannerTime.textContent = ` since ${date2.toLocaleTimeString("en-US", { hour12: false })}`;
        }
      }
    } else {
      btn?.classList.remove("active");
      if (banner) banner.style.display = "none";
    }
  }
  async function setupEstopButton(onEstopChange) {
    const btn = document.getElementById("estop-btn");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      try {
        const status = await halApi.getEstopStatus();
        if (status.estop.active) {
          const operatorId = prompt("Enter operator ID to clear E-Stop:");
          if (!operatorId) return;
          try {
            await halApi.clearEstop(operatorId);
            updateEstopUI(false, null);
            onEstopChange?.(false);
          } catch (err) {
            alert(`Failed to clear E-Stop: ${err.message}`);
          }
        } else {
          if (!confirm(
            "Activate EMERGENCY STOP? This will suspend all autonomous control and set all devices to safe states."
          ))
            return;
          try {
            const result = await halApi.activateEstop("operator");
            if (result.success) {
              updateEstopUI(true, (/* @__PURE__ */ new Date()).toISOString());
              onEstopChange?.(true);
              if (result.failures.length > 0) {
                alert(
                  `E-Stop activated with warnings:
${result.failures.join("\n")}`
                );
              }
            }
          } catch (err) {
            alert(`Failed to activate E-Stop: ${err.message}`);
          }
        }
      } catch (err) {
        alert(`E-Stop error: ${err.message}`);
      }
    });
  }
  function setupThemeButtons(onThemeChange) {
    function activateTheme(key) {
      document.querySelectorAll(".theme-dot").forEach((dot) => {
        dot.classList.toggle("active", dot.dataset.theme === key);
      });
      const themeTrigger2 = document.getElementById("theme-picker-trigger");
      themeTrigger2?.style.setProperty(
        "--dot-color",
        themeDefinitions[key].accent
      );
      onThemeChange(key);
    }
    document.querySelectorAll(".theme-dot").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.theme;
        activateTheme(key);
        document.getElementById("theme-picker-popover")?.classList.remove("open");
      });
    });
    const themeTrigger = document.getElementById("theme-picker-trigger");
    const themePopover = document.getElementById("theme-picker-popover");
    themeTrigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      themePopover?.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!themePopover?.contains(e.target) && e.target !== themeTrigger) {
        themePopover?.classList.remove("open");
      }
    });
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    mobileMenuBtn?.addEventListener("click", () => {
      const sidebar = document.getElementById("hal-sidebar");
      sidebar?.classList.toggle("open");
    });
  }
  function setupLayoutButtons(onLayoutChange) {
    document.querySelectorAll(".layout-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const layout = btn.dataset.layout;
        document.querySelectorAll(".layout-btn").forEach((b) => {
          b.classList.toggle("active", b.dataset.layout === layout);
        });
        onLayoutChange?.(layout);
      });
    });
  }
  function setupSettingsButton(onSettingsClick) {
    const btn = document.getElementById("settings-btn");
    btn?.addEventListener("click", () => {
      onSettingsClick?.();
    });
  }
  function setupAutoModeSelector(onModeChange, onManualTrigger) {
    const selector = document.getElementById("auto-mode-selector");
    const btn = document.getElementById("auto-mode-btn");
    const popover = document.getElementById("auto-mode-popover");
    const triggerBtn = document.getElementById("auto-mode-trigger-btn");
    if (!selector || !btn || !popover) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      popover.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!selector.contains(e.target)) {
        popover.classList.remove("open");
      }
    });
    popover.querySelectorAll(".auto-mode-option").forEach((option) => {
      option.addEventListener("click", async () => {
        const mode = option.dataset.mode;
        if (!mode) return;
        try {
          await halApi.setAutomationMode(mode);
          const badge = document.getElementById("auto-mode-badge");
          const modeColors = {
            OBSERVE_ONLY: { bg: "#238636", text: "#F0F6FC", label: "OBSERVE" },
            SUGGEST: { bg: "#388BFD", text: "#F0F6FC", label: "SUGGEST" },
            ASSISTED_CONTROL: {
              bg: "#D29922",
              text: "#0D1117",
              label: "ASSISTED"
            },
            AUTONOMOUS: { bg: "#F85149", text: "#F0F6FC", label: "AUTO" }
          };
          const colors = modeColors[mode] || modeColors["AUTONOMOUS"];
          if (badge) {
            badge.style.background = colors.bg;
            badge.style.color = colors.text;
            badge.textContent = colors.label;
          }
          popover.classList.remove("open");
          onModeChange?.(mode);
        } catch (err) {
          alert(`Failed to set automation mode: ${err.message}`);
        }
      });
    });
    triggerBtn?.addEventListener("click", async () => {
      try {
        await halApi.triggerDecisionCycle();
        popover.classList.remove("open");
        onManualTrigger?.();
      } catch (err) {
        alert(`Failed to trigger decision: ${err.message}`);
      }
    });
  }
  function startClock() {
    function tick() {
      const el = document.getElementById("hal-clock");
      if (el) {
        el.textContent = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
          hour12: false
        });
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
  min-width: 0;
  flex-shrink: 1;
}
.hal-header-brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 2px 8px 2px 2px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-tertiary) 82%, transparent);
}
.hal-header-brand-logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}
.hal-header-brand-text {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  white-space: nowrap;
}
.hal-header-brand-text-short {
  display: none;
}
.hal-header-view-label {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hal-header-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  position: relative;
  gap: var(--space-4);
}

/* Safety State Indicator */
.safety-state-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--bg-tertiary) 82%, transparent);
  border: 1px solid var(--border);
  cursor: default;
  transition: all var(--transition-fast);
}
.safety-state-indicator.normal {
  border-color: var(--success);
  background: color-mix(in srgb, var(--success) 15%, transparent);
}
.safety-state-indicator.warning {
  border-color: var(--warning);
  background: color-mix(in srgb, var(--warning) 15%, transparent);
}
.safety-state-indicator.emergency {
  border-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  animation: safety-pulse 2s ease-in-out infinite;
}
.safety-state-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  flex-shrink: 0;
}
.safety-state-indicator.normal .safety-state-dot {
  background: var(--success);
}
.safety-state-indicator.warning .safety-state-dot {
  background: var(--warning);
}
.safety-state-indicator.emergency .safety-state-dot {
  background: var(--danger);
  animation: safety-dot-pulse 1s ease-in-out infinite;
}
.safety-state-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}
.safety-state-indicator.normal .safety-state-label {
  color: var(--success);
}
.safety-state-indicator.warning .safety-state-label {
  color: var(--warning);
}
.safety-state-indicator.emergency .safety-state-label {
  color: var(--danger);
}
@keyframes safety-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
@keyframes safety-dot-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

/* Desktop theme dots */
.theme-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--dot-color);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.theme-dot:hover {
  transform: scale(1.15);
}
.theme-dot.active {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--dot-color);
}

/* Single trigger theme picker */
.theme-picker-trigger {
  display: inline-flex;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--bg-tertiary);
  cursor: pointer;
  padding: 0;
  align-items: center;
  justify-content: center;
}
.theme-picker-trigger-dot {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--dot-color);
}
.theme-picker-popover {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  box-shadow: var(--shadow-card-lg);
  z-index: 110;
  min-width: 200px;
}
.theme-picker-popover.open {
  display: block;
}
.theme-picker-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}
.theme-picker-grid .theme-dot {
  width: 32px;
  height: 32px;
  justify-self: center;
}

/* Layout Selector */
.layout-selector {
  display: inline-flex;
  align-items: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 2px;
  gap: 2px;
}
.layout-btn {
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}
.layout-btn:hover {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--bg-secondary) 60%, transparent);
}
.layout-btn.active {
  background: var(--accent);
  color: var(--on-primary);
}

/* Settings Button */
.settings-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.settings-btn:hover {
  color: var(--text-primary);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-tertiary));
}

.hal-header-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}
.hal-clock {
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* E-Stop Button */
.estop-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: var(--radius-sm);
  border: 2px solid var(--danger);
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  position: relative;
}
.estop-btn:hover {
  background: color-mix(in srgb, var(--danger) 30%, transparent);
  transform: scale(1.05);
}
.estop-btn:active {
  transform: scale(0.95);
}
.estop-btn.active {
  background: var(--danger);
  animation: estop-pulse 1s ease-in-out infinite;
}
.estop-btn-inner {
  font-size: 9px;
  font-weight: 800;
  color: var(--danger);
  letter-spacing: 0.02em;
  line-height: 1;
}
.estop-btn.active .estop-btn-inner {
  color: var(--on-primary);
}
@keyframes estop-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(248, 81, 73, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(248, 81, 73, 0); }
}

/* E-Stop Banner */
.estop-banner {
  background: var(--danger);
  color: var(--on-primary);
  padding: var(--space-2) var(--page-padding);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.estop-banner-icon {
  font-size: 16px;
}
.estop-banner-text {
  color: var(--on-primary);
}
.estop-banner-time {
  font-size: 11px;
  font-weight: 400;
  opacity: 0.8;
  text-transform: none;
  letter-spacing: 0;
}

@media (max-width: 1560px) {
  .hal-header-brand-text-long {
    display: none;
  }
  .hal-header-brand-text-short {
    display: inline;
  }
}
@media (max-width: 1279px) {
  .hal-header-brand {
    padding-right: 2px;
  }
  .hal-header-brand-text {
    display: none;
  }
  .layout-btn {
    padding: 4px 8px;
    font-size: 10px;
  }
}
@media (max-width: 767px) {
  .hal-header { padding: 0 var(--space-3); }
  .hal-clock { font-size: 11px; }
  .layout-selector {
    display: none;
  }
}
@media (max-width: 480px) {
  .hal-header-view-label {
    max-width: 90px;
  }
  .hal-header-right {
    gap: var(--space-2);
  }
}
`;
    document.head.appendChild(style);
  }
  function injectAutoModeStyles() {
    if (document.getElementById("hal-auto-mode-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-auto-mode-styles";
    style.textContent = `
/* Automation Mode Selector */
.auto-mode-selector {
  position: relative;
}
.auto-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--text-secondary);
}
.auto-mode-btn:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-tertiary));
}
.auto-mode-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.auto-mode-popover {
  display: none;
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-2);
  box-shadow: var(--shadow-card-lg);
  z-index: 120;
  min-width: 220px;
}
.auto-mode-popover.open {
  display: block;
}
.auto-mode-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 4px 8px 8px;
}
.auto-mode-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.auto-mode-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background var(--transition-fast);
}
.auto-mode-option:hover {
  background: var(--bg-tertiary);
}
.auto-mode-option.selected {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
}
.auto-mode-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.auto-mode-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  min-width: 56px;
}
.auto-mode-desc {
  font-size: 11px;
  color: var(--text-secondary);
  flex: 1;
}
.auto-mode-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: var(--space-2) 0;
}
.auto-mode-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  padding: 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.auto-mode-trigger:hover {
  background: color-mix(in srgb, var(--accent) 20%, var(--bg-tertiary));
  border-color: var(--accent);
}
@media (max-width: 1023px) {
  .auto-mode-selector {
    display: none;
  }
}
`;
    document.head.appendChild(style);
  }
  var estopRefreshInterval;
  var init_Header = __esm({
    "src/web/hal-ui/components/Header.ts"() {
      "use strict";
      init_store();
      init_api();
      estopRefreshInterval = null;
    }
  });

  // src/web/hal-ui/components/Card.ts
  function injectCardStyles() {
    if (document.getElementById("hal-card-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-card-styles";
    style.textContent = `
.hal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
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
  var init_Card = __esm({
    "src/web/hal-ui/components/Card.ts"() {
      "use strict";
    }
  });

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
  var init_Toggle = __esm({
    "src/web/hal-ui/components/Toggle.ts"() {
      "use strict";
    }
  });

  // src/web/hal-ui/components/Modal.ts
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
  var activeModal;
  var init_Modal = __esm({
    "src/web/hal-ui/components/Modal.ts"() {
      "use strict";
      activeModal = null;
    }
  });

  // src/web/hal-ui/components/Toast.ts
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
  var MAX_VISIBLE, toasts, borderColors;
  var init_Toast = __esm({
    "src/web/hal-ui/components/Toast.ts"() {
      "use strict";
      MAX_VISIBLE = 3;
      toasts = [];
      borderColors = {
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)"
      };
    }
  });

  // src/web/hal-ui/components/SystemStatus.ts
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
  var init_SystemStatus = __esm({
    "src/web/hal-ui/components/SystemStatus.ts"() {
      "use strict";
      init_store();
    }
  });

  // src/web/hal-ui/components/LatestDecision.ts
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
  var init_LatestDecision = __esm({
    "src/web/hal-ui/components/LatestDecision.ts"() {
      "use strict";
      init_store();
    }
  });

  // src/web/hal-ui/components/ChartKit.ts
  function escapeHtml3(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }
  function hslToHex(h, s, l) {
    const toRgb = (p2, q2, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
      if (t < 1 / 2) return q2;
      if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
      return p2;
    };
    const sNorm = s / 100;
    const lNorm = l / 100;
    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    const r = toRgb(p, q, h / 360 + 1 / 3);
    const g = toRgb(p, q, h / 360);
    const b = toRgb(p, q, h / 360 - 1 / 3);
    const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  function generateDeviceShades(baseColor, count) {
    if (count <= 1) return [baseColor];
    const hsl = hexToHsl(baseColor);
    const lightnessShifts = [-10, -5, 5, 10, -15, 15];
    const saturationShifts = [0, 0, 0, 0, 0, 0, -10, 10, -15, 15, -20, 20];
    return Array.from({ length: count }, (_, i) => {
      const lShift = lightnessShifts[i % lightnessShifts.length] ?? 0;
      const sShift = saturationShifts[i] ?? saturationShifts[saturationShifts.length - 1];
      const l = Math.max(15, Math.min(95, hsl.l + lShift));
      const s = Math.max(20, Math.min(100, hsl.s + sShift));
      return hslToHex(hsl.h, s, l);
    });
  }
  function monotoneCubicPath(pts) {
    if (pts.length < 2) return "";
    if (pts.length === 2) {
      return `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} L${pts[1].x.toFixed(1)},${pts[1].y.toFixed(1)}`;
    }
    const n = pts.length;
    const dx = [];
    const dy = [];
    for (let i = 0; i < n - 1; i++) {
      dx.push(pts[i + 1].x - pts[i].x);
      dy.push(pts[i + 1].y - pts[i].y);
    }
    const sec = [];
    for (let i = 0; i < n - 1; i++) sec.push(dy[i] / dx[i]);
    const m = new Array(n);
    m[0] = sec[0];
    m[n - 1] = sec[n - 2];
    for (let i = 1; i < n - 1; i++) {
      m[i] = sec[i - 1] * sec[i] <= 0 ? 0 : (sec[i - 1] + sec[i]) / 2;
    }
    for (let i = 0; i < n - 1; i++) {
      if (Math.abs(sec[i]) < 1e-10) {
        m[i] = 0;
        m[i + 1] = 0;
        continue;
      }
      const alpha = m[i] / sec[i];
      const beta = m[i + 1] / sec[i];
      const tau = alpha * alpha + beta * beta;
      if (tau > 9) {
        const t = 3 / Math.sqrt(tau);
        m[i] = t * alpha * sec[i];
        m[i + 1] = t * beta * sec[i];
      }
    }
    const parts = [`M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`];
    for (let i = 0; i < n - 1; i++) {
      const x1 = pts[i].x + dx[i] / 3;
      const y1 = pts[i].y + m[i] * dx[i] / 3;
      const x2 = pts[i + 1].x - dx[i] / 3;
      const y2 = pts[i + 1].y - m[i + 1] * dx[i] / 3;
      parts.push(
        `C${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`
      );
    }
    return parts.join(" ");
  }
  function renderDecisionBarTrend(points, containerId, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container || points.length === 0) {
      if (container)
        container.innerHTML = '<div class="chart-empty">No decision data</div>';
      return;
    }
    const W = opts.width ?? (container.clientWidth || 600);
    const H = opts.height ?? 180;
    const pad = { t: 20, r: 16, b: 40, l: 40 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;
    const maxVal = Math.max(
      ...points.flatMap((p) => [p.success, p.failure, p.pending]),
      1
    );
    const groupW = chartW / points.length;
    const barW = groupW * 0.22;
    const gap = groupW * 0.04;
    const colors = { success: "#6DFF9A", failure: "#FF5C6C", pending: "#FFC857" };
    const bars = points.map((p, i) => {
      const gx = pad.l + i * groupW + groupW / 2;
      const vals = [
        { key: "success", v: p.success },
        { key: "failure", v: p.failure },
        { key: "pending", v: p.pending }
      ];
      return vals.map((item, j) => {
        const bh = item.v / maxVal * chartH;
        const x = gx - barW * 1.5 - gap + j * (barW + gap);
        const y = pad.t + chartH - bh;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${colors[item.key]}" opacity="0.85" rx="2"/>` + (item.v > 0 ? `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" fill="${colors[item.key]}" font-size="9" font-family="var(--font-mono)">${item.v}</text>` : "");
      }).join("");
    }).join("");
    const ySteps = 5;
    const gridLines = Array.from({ length: ySteps + 1 }, (_, i) => {
      const y = pad.t + i / ySteps * chartH;
      const v = Math.round(maxVal * (1 - i / ySteps));
      return `<line x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}" stroke="color-mix(in srgb, var(--text-tertiary) 20%, var(--border))" stroke-dasharray="2 3"/><text x="${pad.l - 6}" y="${y + 3}" text-anchor="end" fill="var(--text-tertiary)" font-size="9" font-family="var(--font-mono)">${v}</text>`;
    }).join("");
    const xLabels = points.map((p, i) => {
      const x = pad.l + i * groupW + groupW / 2;
      return `<text x="${x.toFixed(1)}" y="${H - 10}" text-anchor="middle" fill="var(--text-tertiary)" font-size="9" font-family="var(--font-mono)">${escapeHtml3(p.label)}</text>`;
    }).join("");
    const legend = `
    <div class="dbt-legend">
      <span class="dbt-legend-item"><span class="dbt-legend-dot" style="background:${colors.success}"></span>Success</span>
      <span class="dbt-legend-item"><span class="dbt-legend-dot" style="background:${colors.failure}"></span>Failure</span>
      <span class="dbt-legend-item"><span class="dbt-legend-dot" style="background:${colors.pending}"></span>Pending</span>
    </div>
  `;
    container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="viz-svg" preserveAspectRatio="xMidYMid meet">
      ${gridLines}${bars}${xLabels}
    </svg>
    ${legend}
  `;
  }
  function renderTinyAreaChart(data, color, containerId) {
    const container = document.getElementById(containerId);
    if (!container || data.length < 2) return;
    const w = 200, h = 40;
    const pad = { t: 2, r: 2, b: 2, l: 2 };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = Math.max(1e-3, max - min);
    const step = (w - pad.l - pad.r) / (data.length - 1);
    const points = data.map((v, i) => {
      const x = pad.l + i * step;
      const y = pad.t + (max - v) / span * (h - pad.t - pad.b);
      return { x, y };
    });
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L${points[points.length - 1].x.toFixed(1)},${h - pad.b} L${points[0].x.toFixed(1)},${h - pad.b} Z`;
    container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" class="tiny-chart-svg">
      <path d="${area}" fill="color-mix(in srgb, ${color} 20%, transparent)" stroke="none"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>
  `;
  }
  function renderSparkline(data, color, width = 80, height = 24) {
    if (data.length < 2) return '<span class="text-xs text-secondary">--</span>';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = Math.max(1e-3, max - min);
    const pad = 2;
    const step = (width - pad * 2) / (data.length - 1);
    const points = data.map((v, i) => {
      const x = pad + i * step;
      const y = pad + (max - v) / span * (height - pad * 2);
      return { x, y };
    });
    const smoothPath = monotoneCubicPath(points);
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline-svg">
    <path d="${smoothPath}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
  }
  function renderHeatmap(cells, containerId, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container || cells.length === 0) return;
    const W = opts.width ?? (container.clientWidth || 600);
    const H = opts.height ?? 100;
    const colorRange = opts.colorRange ?? [
      "#0a1a12",
      "#1a4030",
      "#4aB070",
      "#F59E0B"
    ];
    const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const cellW = (W - 40) / 24;
    const cellH = (H - 30) / 7;
    const allValues = cells.map((c) => c.value);
    const vMin = Math.min(...allValues);
    const vMax = Math.max(...allValues);
    const vSpan = Math.max(1e-3, vMax - vMin);
    const colorFor = (v) => {
      const t = (v - vMin) / vSpan;
      const idx = Math.min(
        colorRange.length - 1,
        Math.floor(t * colorRange.length)
      );
      return colorRange[idx];
    };
    const rects = cells.map((c) => {
      const col = c.hour;
      const row = dows.indexOf(c.dow);
      if (row < 0) return "";
      const x = 30 + col * cellW;
      const y = 20 + row * cellH;
      return `<rect x="${x}" y="${y}" width="${cellW - 1}" height="${cellH - 1}" fill="${colorFor(c.value)}" rx="1"/>`;
    }).join("");
    const hourLabels = hours.filter((h) => h % 4 === 0).map((h) => {
      const x = 30 + h * cellW + cellW / 2;
      return `<text x="${x}" y="${H - 4}" text-anchor="middle" fill="#9CB8AA" font-size="8">${h}</text>`;
    }).join("");
    const dayLabels = dows.map((d, i) => {
      const y = 20 + i * cellH + cellH / 2 + 3;
      return `<text x="26" y="${y}" text-anchor="end" fill="#9CB8AA" font-size="8">${d}</text>`;
    }).join("");
    container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="viz-svg">${rects}${hourLabels}${dayLabels}</svg>`;
  }
  function injectChartKitStyles() {
    if (document.getElementById("hal-chartkit-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-chartkit-styles";
    style.textContent = `
/* \u2500\u2500 ChartKit base \u2500\u2500 */
.ck-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.ck-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.ck-subtitle {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 3px;
}
.ck-device {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 3px;
}
.ck-kpi {
  text-align: right;
}
.ck-kpi-val {
  font-size: 26px;
  font-weight: 700;
  font-family: var(--font-mono);
  line-height: 1;
}
.ck-kpi-delta {
  font-size: 11px;
  color: var(--success);
  margin-top: 3px;
}
.ck-chart {
  width: 100%;
  min-height: 0;
  flex: 1;
}
.ck-chart svg {
  display: block;
  width: 100%;
  height: 100%;
}
.ck-stats {
  border-top: 1px solid var(--border);
  margin-top: 14px;
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ck-stat-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ck-stat-label {
  font-size: 13px;
  font-weight: 600;
}
.ck-stat-current {
  font-size: 15px;
  font-weight: 700;
  font-family: var(--font-mono);
}
.ck-stat-row {
  display: flex;
  gap: 40px;
}
.ck-stat-item label {
  display: block;
  font-size: 10px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}
.ck-stat-item strong {
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--text-primary);
}
.ck-foot {
  font-size: 10px;
  color: var(--text-secondary);
  border-top: 1px solid var(--border-subtle);
  margin-top: 12px;
  padding-top: 10px;
}

/* \u2500\u2500 SVG chart elements \u2500\u2500 */
.hero-svg {
  display: block;
  width: 100%;
  min-height: 0;
  flex: 1;
}
.og-chart {
  display: block;
  width: 100%;
  min-height: 0;
  flex: 1;
}
.viz-svg {
  display: block;
  width: 100%;
  min-height: 0;
  flex: 1;
}
.chart-grid {
  stroke: color-mix(in srgb, var(--text-tertiary) 30%, var(--border));
  stroke-width: 1;
  stroke-dasharray: 2 3;
}
.chart-label {
  fill: var(--text-secondary);
  font-size: 12px;
  font-family: var(--font-mono);
  font-weight: 600;
}
.sparkline-svg {
  display: inline-block;
  vertical-align: middle;
}
.chart-empty {
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 13px;
}

/* \u2500\u2500 Dashboard Hero Card (ref code 1 style) \u2500\u2500 */
.dhc-card {
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-primary) 55%);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  color: var(--text-primary);
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.dhc-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-3);
}
.dhc-title {
  font-weight: 700;
  font-size: 13px;
}
.dhc-subtitle {
  color: var(--text-secondary);
  font-size: 11px;
  margin-top: 2px;
}
.dhc-kpi {
  text-align: right;
}
.dhc-kpi-val {
  font-weight: 800;
  font-size: 22px;
  font-family: var(--font-mono);
  line-height: 1;
}
.dhc-kpi-delta {
  color: var(--success);
  font-size: 10px;
  margin-top: 2px;
}
.dhc-overview-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.dhc-overview-toggles {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.dhc-overview-toggle {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--toggle-color) 30%, var(--border));
  background: color-mix(in srgb, var(--toggle-color) 8%, var(--bg-secondary));
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.dhc-overview-toggle.active {
  background: color-mix(in srgb, var(--toggle-color) 20%, var(--bg-secondary));
  border-color: color-mix(in srgb, var(--toggle-color) 60%, var(--border));
  color: var(--text-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--toggle-color) 15%, transparent);
}
.dhc-overview-toggle:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.dhc-zone-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  grid-auto-rows: minmax(200px, auto);
  align-items: stretch;
  gap: var(--space-2);
}
.dhc-overview-health {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 6px 12px;
  margin-bottom: var(--space-2);
  background: color-mix(in srgb, var(--bg-tertiary) 85%, transparent);
}
.dhc-overview-health.good {
  border-color: color-mix(in srgb, var(--success) 55%, var(--border));
}
.dhc-overview-health.watch {
  border-color: color-mix(in srgb, var(--warning) 55%, var(--border));
}
.dhc-overview-health.alert {
  border-color: color-mix(in srgb, var(--danger) 55%, var(--border));
}
.dhc-overview-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
}
.dhc-overview-message {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
  font-family: var(--font-mono);
}
.dhc-zone-toggles {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  flex-wrap: wrap;
}
.dhc-zone-toggle {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.dhc-zone-toggle.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
}
.dhc-toggles {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.dhc-toggle {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--toggle-color) 30%, var(--border));
  background: color-mix(in srgb, var(--toggle-color) 8%, var(--bg-secondary));
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.dhc-toggle.active {
  background: color-mix(in srgb, var(--toggle-color) 20%, var(--bg-secondary));
  border-color: color-mix(in srgb, var(--toggle-color) 60%, var(--border));
  color: var(--text-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--toggle-color) 15%, transparent);
}
.dhc-chart {
  width: 100%;
  min-height: 0;
  flex: 1;
}
.dhc-chart svg {
  display: block;
  width: 100%;
  height: 100%;
}
.dhc-grid {
  stroke: color-mix(in srgb, var(--text-tertiary) 16%, var(--border));
}
.dhc-stats {
  border-top: 1px solid var(--border);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.dhc-stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dhc-stats-metric {
  font-weight: 700;
  font-size: 13px;
}
.dhc-stats-current {
  font-weight: 800;
  font-size: 14px;
  font-family: var(--font-mono);
}
.dhc-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  font-size: 11px;
}
.dhc-stats-grid strong {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
}
.dhc-muted {
  color: var(--text-secondary);
  font-size: 10px;
}
.dhc-foot {
  font-size: 10px;
  color: var(--text-secondary);
  border-top: 1px solid var(--border-subtle);
  margin-top: var(--space-3);
  padding-top: var(--space-2);
}

/* \u2500\u2500 Decision bar trend legend \u2500\u2500 */
.dbt-legend {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  margin-top: var(--space-2);
  flex-wrap: wrap;
}
.dbt-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-secondary);
}
.dbt-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* \u2500\u2500 Viz card headers \u2500\u2500 */
.viz-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
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
`;
    document.head.appendChild(style);
  }
  var init_ChartKit = __esm({
    "src/web/hal-ui/components/ChartKit.ts"() {
      "use strict";
      init_store();
    }
  });

  // src/web/hal-ui/components/HeroChart.ts
  function resolveZoneName(deviceId, deviceName) {
    if (deviceId.startsWith("tent_a_")) return "Tent A";
    if (deviceId.startsWith("tent_b_")) return "Tent B";
    if (/tent\s*a/i.test(deviceName)) return "Tent A";
    if (/tent\s*b/i.test(deviceName)) return "Tent B";
    return "Unzoned";
  }
  async function loadHeroChartData() {
    const store = (await Promise.resolve().then(() => (init_store(), store_exports))).getStore();
    const sensors = store.devices.filter((d) => d.type === "sensor");
    const to = (/* @__PURE__ */ new Date()).toISOString();
    const from = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
    const layers = [];
    const [decisions] = await Promise.all([
      halApi.getDecisions(50).catch(() => []),
      ...sensors.flatMap(
        (s) => HERO_METRIC_KEYS.map(async (m) => {
          try {
            const data = await halApi.getSensorHistory(s.id, m, from, to);
            if (data.length > 0) {
              const cfg = metricConfig[m];
              layers.push({
                deviceId: s.id,
                deviceName: s.name,
                zoneName: resolveZoneName(s.id, s.name),
                metric: m,
                color: cfg?.color || "#888",
                data
              });
            }
          } catch {
          }
        })
      )
    ]);
    return { layers, decisions };
  }
  function injectHeroChartStyles() {
    injectChartKitStyles();
    if (document.getElementById("hal-hero-chart-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-hero-chart-styles";
    style.textContent = `
.hero-chart-wrap {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
}
.hero-chart {
  width: 100%;
  min-height: 260px;
}
.chart-empty {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 12px;
}
`;
    document.head.appendChild(style);
  }
  var HERO_METRIC_KEYS, metricConfig;
  var init_HeroChart = __esm({
    "src/web/hal-ui/components/HeroChart.ts"() {
      "use strict";
      init_api();
      init_ChartKit();
      HERO_METRIC_KEYS = [
        "temperature",
        "humidity",
        "co2",
        "light",
        "soil_moisture",
        "water_level",
        "ph",
        "weight"
      ];
      metricConfig = {
        temperature: {
          label: "Temperature",
          color: "#F59E0B",
          unit: "\xB0C",
          minAxis: 10,
          maxAxis: 40
        },
        humidity: {
          label: "Humidity",
          color: "#38BDF8",
          unit: "%",
          minAxis: 0,
          maxAxis: 100
        },
        soil_moisture: {
          label: "Soil Moisture",
          color: "#EF4444",
          unit: "%",
          minAxis: 0,
          maxAxis: 100
        },
        water_level: {
          label: "Water Level",
          color: "#2563EB",
          unit: "%",
          minAxis: 0,
          maxAxis: 100
        },
        ph: { label: "pH", color: "#A855F7", unit: "", minAxis: 0, maxAxis: 14 },
        co2: {
          label: "CO\u2082",
          color: "#22C55E",
          unit: "ppm",
          minAxis: 0,
          maxAxis: 2e3
        },
        light: {
          label: "Light",
          color: "#FACC15",
          unit: "lux",
          minAxis: 0,
          maxAxis: 1e5
        },
        weight: {
          label: "Weight",
          color: "#94A3B8",
          unit: "kg",
          minAxis: 0,
          maxAxis: 100
        },
        vpd: { label: "VPD", color: "#A855F7", unit: "kPa", minAxis: 0, maxAxis: 3 }
      };
    }
  });

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
      const hasData = kpi.sparklineData.length > 0 || kpi.value !== 0;
      const displayValue = hasData ? `${kpi.value.toFixed(kpi.precision)}<span class="kpi-unit">${kpi.unit}</span>` : '<span class="kpi-no-data">No data</span>';
      const displayColor = hasData ? statusColor : "var(--text-tertiary)";
      return `
      <div class="kpi-card" style="--kpi-accent: ${statusColor}">
        <div class="kpi-header">
          <span class="kpi-label">${kpi.label}</span>
          <span class="kpi-trend" style="color: ${displayColor}">${trendIcon}</span>
        </div>
        <div class="kpi-value-row">
          <span class="kpi-value text-mono" style="color: ${displayColor}">
            ${displayValue}
          </span>
        </div>
        ${hasData ? compHtml : ""}
        <div class="kpi-sparkline">
          ${hasData ? renderSparkline(kpi.sparklineData, statusColor) : '<div class="kpi-sparkline-empty"></div>'}
        </div>
      </div>
    `;
    }).join("");
    return `<div class="kpi-strip">${cards}</div>`;
  }
  async function buildKpiData() {
    const store = getStore();
    const sensors = store.devices.filter((d) => d.type === "sensor");
    const relays = store.devices.filter(
      (d) => d.type === "relay" || d.type === "smart_plug"
    );
    const activeRelays = relays.filter((d) => d.state === "on");
    const onlineDevices = store.devices.filter((d) => d.online).length;
    const [tempHistory, humHistory, co2History, soilHistory, lightHistory] = await Promise.all([
      fetchMetricSparkline(sensors, "temperature", 12),
      fetchMetricSparkline(sensors, "humidity", 12),
      fetchMetricSparkline(sensors, "co2", 12),
      fetchMetricSparkline(sensors, "soil_moisture", 12),
      fetchMetricSparkline(sensors, "light", 12)
    ]);
    const [tempPrev, humPrev, co2Prev, soilPrev, lightPrev] = await Promise.all([
      fetchMetricSparklinePrev(sensors, "temperature", 12),
      fetchMetricSparklinePrev(sensors, "humidity", 12),
      fetchMetricSparklinePrev(sensors, "co2", 12),
      fetchMetricSparklinePrev(sensors, "soil_moisture", 12),
      fetchMetricSparklinePrev(sensors, "light", 12)
    ]);
    const kpis = [];
    kpis.push({
      label: "Power Now",
      value: activeRelays.length,
      unit: "ON",
      precision: 0,
      status: activeRelays.length > 0 ? "good" : "warning",
      sparklineData: [],
      sparklineColor: "var(--accent)"
    });
    let tempSum = 0, tempCount = 0;
    for (const s of sensors) {
      const snap = store.sensors[s.id];
      if (snap?.temperature?.value != null) {
        const converted = formatSensorValue(
          snap.temperature.value,
          "temperature",
          store.unitSystem
        );
        tempSum += converted.value;
        tempCount++;
      }
    }
    const avgTemp = tempCount > 0 ? tempSum / tempCount : 0;
    const tempComp = computeComparison(tempHistory, tempPrev);
    const hasTemp = tempCount > 0;
    kpis.push({
      label: "Temperature",
      value: hasTemp ? avgTemp : 0,
      unit: formatSensorValue(0, "temperature", store.unitSystem).unit,
      precision: 1,
      status: hasTemp ? avgTemp >= 18 && avgTemp <= 28 ? "good" : avgTemp >= 15 && avgTemp <= 32 ? "warning" : "critical" : "good",
      sparklineData: tempHistory.length > 1 ? tempHistory : hasTemp ? [] : [],
      sparklineColor: hasTemp ? "#F59E0B" : "var(--text-tertiary)",
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
    const hasHum = humCount > 0;
    kpis.push({
      label: "Humidity",
      value: hasHum ? avgHum : 0,
      unit: "%",
      precision: 0,
      status: hasHum ? avgHum >= 40 && avgHum <= 70 ? "good" : avgHum >= 30 && avgHum <= 80 ? "warning" : "critical" : "good",
      sparklineData: humHistory.length > 1 ? humHistory : hasHum ? [] : [],
      sparklineColor: hasHum ? "#38BDF8" : "var(--text-tertiary)",
      comparison: humComp
    });
    let soilSum = 0, soilCount = 0;
    for (const s of sensors) {
      const snap = store.sensors[s.id];
      if (snap?.soil_moisture?.value != null) {
        soilSum += snap.soil_moisture.value;
        soilCount++;
      }
    }
    const avgSoil = soilCount > 0 ? soilSum / soilCount : 0;
    const soilComp = computeComparison(soilHistory, soilPrev);
    const hasSoil = soilCount > 0;
    kpis.push({
      label: "Soil Moisture",
      value: hasSoil ? avgSoil : 0,
      unit: "%",
      precision: 0,
      status: hasSoil ? avgSoil >= 30 && avgSoil <= 70 ? "good" : avgSoil >= 20 && avgSoil <= 80 ? "warning" : "critical" : "good",
      sparklineData: soilHistory.length > 1 ? soilHistory : hasSoil ? [] : [],
      sparklineColor: hasSoil ? "#EF4444" : "var(--text-tertiary)",
      comparison: soilComp
    });
    let lightSum = 0, lightCount = 0;
    for (const s of sensors) {
      const snap = store.sensors[s.id];
      if (snap?.light?.value != null) {
        lightSum += snap.light.value;
        lightCount++;
      }
    }
    const avgLight = lightCount > 0 ? lightSum / lightCount : 0;
    const lightComp = computeComparison(lightHistory, lightPrev);
    const hasLight = lightCount > 0;
    kpis.push({
      label: "Light",
      value: hasLight ? avgLight : 0,
      unit: "lux",
      precision: 0,
      status: hasLight ? avgLight >= 1e4 && avgLight <= 5e4 ? "good" : avgLight >= 5e3 && avgLight <= 7e4 ? "warning" : "critical" : "good",
      sparklineData: lightHistory.length > 1 ? lightHistory : hasLight ? [] : [],
      sparklineColor: hasLight ? "#FACC15" : "var(--text-tertiary)",
      comparison: lightComp
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
    const hasCo2 = co2Count > 0;
    kpis.push({
      label: "CO\u2082",
      value: hasCo2 ? avgCo2 : 0,
      unit: "ppm",
      precision: 0,
      status: hasCo2 ? avgCo2 < 1e3 ? "good" : avgCo2 < 1500 ? "warning" : "critical" : "good",
      sparklineData: co2History.length > 1 ? co2History : hasCo2 ? [] : [],
      sparklineColor: hasCo2 ? "#22C55E" : "var(--text-tertiary)",
      comparison: co2Comp
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
          return Array.from(
            { length: Math.min(buckets, data.length) },
            (_, i) => data[Math.min(i * step, data.length - 1)].value
          );
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
          return Array.from(
            { length: Math.min(buckets, data.length) },
            (_, i) => data[Math.min(i * step, data.length - 1)].value
          );
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
  function injectKpiStyles() {
    if (document.getElementById("hal-kpi-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-kpi-styles";
    style.textContent = `
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  grid-auto-rows: minmax(80px, auto);
  align-items: stretch;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}
.kpi-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  border-left: 3px solid var(--kpi-accent);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-1);
  min-height: 80px;
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
  font-size: clamp(22px, 4vw, 28px);
  font-weight: 600;
  line-height: 1;
  overflow-wrap: anywhere;
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
  overflow-wrap: anywhere;
}
.kpi-comparison.up {
  color: var(--success);
}
.kpi-comparison.down {
  color: var(--danger);
}
.kpi-no-data {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-tertiary);
}
.kpi-sparkline-empty {
  height: 28px;
}
@media (max-width: 767px) {
  .kpi-strip { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
}
`;
    document.head.appendChild(style);
  }
  var init_KpiStrip = __esm({
    "src/web/hal-ui/components/KpiStrip.ts"() {
      "use strict";
      init_store();
      init_api();
      init_HeroChart();
      init_HeroChart();
    }
  });

  // src/web/hal-ui/components/EnvironmentCharts.ts
  function escapeHtml4(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml4(s);
  }
  function metricMeta(key) {
    return METRIC_META[key] ?? {
      key,
      label: key,
      shortLabel: key,
      color: "#94A3B8",
      unit: "",
      minAxis: 0,
      maxAxis: 100
    };
  }
  function isDrawableValue(value) {
    return Number.isFinite(value) && value !== 0;
  }
  function cleanData(data) {
    return data.filter((point) => Number.isFinite(point.t) && isDrawableValue(point.v)).sort((a, b) => a.t - b.t);
  }
  function formatMetricValue(metric, value) {
    const precision = metric.key === "co2" || Math.abs(value) >= 100 ? 0 : 1;
    return `${value.toFixed(precision)}${metric.unit}`;
  }
  function normalizeValue(metric, value) {
    const meta = metricMeta(metric.key);
    const span = Math.max(1, meta.maxAxis - meta.minAxis);
    return Math.max(0, Math.min(1, (value - meta.minAxis) / span));
  }
  function monotonePath(points) {
    if (points.length < 2) return "";
    if (points.length === 2) {
      return `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} L${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`;
    }
    let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const midX = (current.x + next.x) / 2;
      path += ` C${midX.toFixed(1)},${current.y.toFixed(1)} ${midX.toFixed(1)},${next.y.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`;
    }
    return path;
  }
  function aggregateZones(zones2) {
    const metricKeys = Array.from(
      new Set(zones2.flatMap((zone) => zone.metrics.map((metric) => metric.key)))
    );
    const metrics2 = metricKeys.map((key) => {
      const meta = metricMeta(key);
      const buckets = /* @__PURE__ */ new Map();
      for (const zone of zones2) {
        const metric = zone.metrics.find((candidate) => candidate.key === key);
        if (!metric) continue;
        for (const point of cleanData(metric.data)) {
          const bucket = buckets.get(point.t) ?? { sum: 0, count: 0 };
          bucket.sum += point.v;
          bucket.count++;
          buckets.set(point.t, bucket);
        }
      }
      return {
        key,
        label: meta.label,
        color: meta.color,
        unit: meta.unit,
        data: Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]).map(([t, bucket]) => ({
          t,
          v: bucket.count > 0 ? bucket.sum / bucket.count : 0
        })).filter((point) => isDrawableValue(point.v))
      };
    });
    return { zoneName: "All Zones", metrics: metrics2 };
  }
  function getActiveMetrics(zone, activeKeys) {
    return DEFAULT_OVERVIEW_METRICS.map(
      (key) => zone.metrics.find((metric) => metric.key === key)
    ).filter((metric) => Boolean(metric)).filter((metric) => activeKeys.has(metric.key)).map((metric) => ({ ...metric, data: cleanData(metric.data) })).filter((metric) => metric.data.length > 0);
  }
  function latestValue(metric) {
    const data = cleanData(metric.data);
    return data.length > 0 ? data[data.length - 1].v : null;
  }
  function renderPrecisionSvg(metrics2) {
    const width = 920;
    const height = 300;
    const pad = { l: 42, r: 32, t: 24, b: 34 };
    const chartW = width - pad.l - pad.r;
    const chartH = height - pad.t - pad.b;
    const allTimes = metrics2.flatMap(
      (metric) => metric.data.map((point) => point.t)
    );
    const minT = Math.min(...allTimes);
    const maxT = Math.max(...allTimes);
    const tSpan = Math.max(1, maxT - minT);
    const x = (t) => pad.l + (t - minT) / tSpan * chartW;
    const y = (norm) => pad.t + (1 - norm) * chartH;
    const grid = [0, 0.25, 0.5, 0.75, 1].map((step) => {
      const gy = pad.t + step * chartH;
      return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}" class="env-grid"/>`;
    }).join("");
    const labels = [minT, minT + tSpan / 2, maxT].map((t, index) => {
      const label = new Date(t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      return `<text class="env-axis-label" x="${x(t).toFixed(1)}" y="${height - 8}" text-anchor="${index === 0 ? "start" : index === 2 ? "end" : "middle"}">${escapeHtml4(label)}</text>`;
    }).join("");
    const defs = metrics2.map(
      (metric) => `
      <linearGradient id="env-precision-${metric.key}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${metric.color}" stop-opacity="0.26"/>
        <stop offset="100%" stop-color="${metric.color}" stop-opacity="0.02"/>
      </linearGradient>
    `
    ).join("");
    const shapes = metrics2.map((metric) => {
      const points = metric.data.map((point) => ({
        x: x(point.t),
        y: y(normalizeValue(metric, point.v))
      }));
      const line = monotonePath(points);
      if (!line) return "";
      const first = points[0];
      const last = points[points.length - 1];
      const area = `${line} L${last.x.toFixed(1)},${(height - pad.b).toFixed(1)} L${first.x.toFixed(1)},${(height - pad.b).toFixed(1)} Z`;
      return `
        <path d="${area}" fill="url(#env-precision-${metric.key})"/>
        <path d="${line}" fill="none" stroke="${metric.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4" fill="${metric.color}" stroke="var(--bg-primary)" stroke-width="1.5"/>
      `;
    }).join("");
    return `
    <svg class="env-precision-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Environmental precision chart">
      <defs>${defs}</defs>
      ${grid}
      ${shapes}
      ${labels}
    </svg>
  `;
  }
  function renderRadialGaugeSvg(metrics2) {
    const width = 260;
    const height = 230;
    const cx = width / 2;
    const cy = 122;
    const start = -Math.PI * 0.72;
    const end = Math.PI * 0.72;
    const rings = metrics2.map((metric, index) => {
      const value = latestValue(metric);
      if (value == null) return "";
      const progress = normalizeValue(metric, value);
      const radius = 86 - index * 18;
      const bg = describeArc(cx, cy, radius, start, end);
      const fg = describeArc(
        cx,
        cy,
        radius,
        start,
        start + (end - start) * progress
      );
      return `
        <path d="${bg}" fill="none" stroke="var(--border)" stroke-width="10" stroke-linecap="round"/>
        <path d="${fg}" fill="none" stroke="${metric.color}" stroke-width="10" stroke-linecap="round"/>
      `;
    }).join("");
    const legend = metrics2.map((metric, index) => {
      const value = latestValue(metric);
      return `
        <div class="env-gauge-row">
          <span class="env-gauge-dot" style="background:${metric.color}"></span>
          <span>${escapeHtml4(metricMeta(metric.key).shortLabel)}</span>
          <strong style="color:${metric.color}">${value == null ? "No data" : escapeHtml4(formatMetricValue(metric, value))}</strong>
        </div>
      `;
    }).join("");
    return `
    <div class="env-radial">
      <svg class="env-radial-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Environmental radial gauge">
        ${rings}
        <text x="${cx}" y="${cy - 3}" text-anchor="middle" class="env-gauge-main">LIVE</text>
        <text x="${cx}" y="${cy + 17}" text-anchor="middle" class="env-gauge-sub">active metrics</text>
      </svg>
      <div class="env-gauge-legend">${legend}</div>
    </div>
  `;
  }
  function renderFarmTelemetrySvg(metrics2, zoneName) {
    const width = 920;
    const height = 238;
    const pad = { l: 50, r: 46, t: 26, b: 34 };
    const chartW = width - pad.l - pad.r;
    const chartH = height - pad.t - pad.b;
    const allTimes = metrics2.flatMap(
      (metric) => metric.data.map((point) => point.t)
    );
    const minT = Math.min(...allTimes);
    const maxT = Math.max(...allTimes);
    const tSpan = Math.max(1, maxT - minT);
    const x = (t) => pad.l + (t - minT) / tSpan * chartW;
    const y = (metric, value, lane) => {
      const laneHeight = chartH / Math.max(1, metrics2.length);
      const laneTop = pad.t + lane * laneHeight;
      const laneMid = laneTop + laneHeight / 2;
      return laneMid + (0.5 - normalizeValue(metric, value)) * laneHeight * 0.62;
    };
    const defs = metrics2.map(
      (metric) => `
      <linearGradient id="env-field-grad-${metric.key}" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%" stop-color="${metric.color}" stop-opacity="0.1"/>
        <stop offset="52%" stop-color="${metric.color}" stop-opacity="0.44"/>
        <stop offset="100%" stop-color="${metric.color}" stop-opacity="0.1"/>
      </linearGradient>
      <filter id="env-field-glow-${metric.key}" x="-40%" y="-80%" width="180%" height="260%">
        <feGaussianBlur stdDeviation="5" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `
    ).join("");
    const canopy = Array.from({ length: 9 }, (_, index) => {
      const x1 = pad.l + index * (chartW / 8);
      const x2 = pad.l + (index + 0.5) * (chartW / 8);
      const top = 42 + index % 2 * 10;
      return `<path d="M${x1.toFixed(1)} ${height - pad.b} Q${x2.toFixed(1)} ${top} ${(x1 + chartW / 8).toFixed(1)} ${height - pad.b}" class="env-field-arch"/>`;
    }).join("");
    const lanes = metrics2.map((metric, index) => {
      const laneHeight = chartH / Math.max(1, metrics2.length);
      const y1 = pad.t + index * laneHeight + laneHeight / 2;
      return `
        <line x1="${pad.l}" x2="${width - pad.r}" y1="${y1.toFixed(1)}" y2="${y1.toFixed(1)}" class="env-field-lane"/>
        <text x="${pad.l + 8}" y="${(y1 - 9).toFixed(1)}" class="env-field-label" fill="${metric.color}">${escapeHtml4(metricMeta(metric.key).shortLabel)}</text>
      `;
    }).join("");
    const ribbons = metrics2.map((metric, index) => {
      const points = metric.data.map((point) => ({
        x: x(point.t),
        y: y(metric, point.v, index)
      }));
      const line = monotonePath(points);
      if (!line) return "";
      const last = points[points.length - 1];
      const value = latestValue(metric);
      return `
        <path d="${line}" class="env-field-ribbon-shadow" stroke="${metric.color}"/>
        <path d="${line}" class="env-field-ribbon" stroke="url(#env-field-grad-${metric.key})" filter="url(#env-field-glow-${metric.key})"/>
        <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="5.5" fill="${metric.color}" stroke="var(--bg-secondary)" stroke-width="2"/>
        <text x="${(last.x - 8).toFixed(1)}" y="${(last.y - 12).toFixed(1)}" text-anchor="end" class="env-field-value" fill="${metric.color}">${value == null ? "" : escapeHtml4(formatMetricValue(metric, value))}</text>
      `;
    }).join("");
    const tickLabels = [minT, minT + tSpan / 2, maxT].map((t, index) => {
      const label = new Date(t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      return `<text class="env-field-time" x="${x(t).toFixed(1)}" y="${height - 10}" text-anchor="${index === 0 ? "start" : index === 2 ? "end" : "middle"}">${escapeHtml4(label)}</text>`;
    }).join("");
    return `
    <svg class="env-field-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Farm telemetry field for ${escapeAttr(zoneName)}">
      <defs>${defs}</defs>
      <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="18" class="env-field-bg"/>
      <path d="M42 ${height - 38} C180 ${height - 96} 295 ${height - 3} 430 ${height - 52} S718 ${height - 112} 878 ${height - 44}" class="env-field-bed"/>
      ${canopy}
      ${lanes}
      ${ribbons}
      <text x="${pad.l}" y="23" class="env-field-title">${escapeHtml4(zoneName)}</text>
      <text x="${width - pad.r}" y="23" text-anchor="end" class="env-field-caption">live environmental ribbons</text>
      ${tickLabels}
    </svg>
  `;
  }
  function describeArc(cx, cy, radius, start, end) {
    const startPoint = {
      x: cx + Math.cos(start) * radius,
      y: cy + Math.sin(start) * radius
    };
    const endPoint = {
      x: cx + Math.cos(end) * radius,
      y: cy + Math.sin(end) * radius
    };
    const large = Math.abs(end - start) > Math.PI ? 1 : 0;
    const sweep = end > start ? 1 : 0;
    return `M${startPoint.x.toFixed(1)},${startPoint.y.toFixed(1)} A${radius},${radius} 0 ${large} ${sweep} ${endPoint.x.toFixed(1)},${endPoint.y.toFixed(1)}`;
  }
  function renderMetricSummary(metrics2) {
    const rows = metrics2.map((metric) => {
      const values = metric.data.map((point) => point.v);
      if (values.length === 0) {
        return `
          <tr>
            <td><span class="env-table-dot" style="background:${metric.color}"></span>${escapeHtml4(metric.label)}</td>
            <td colspan="4" class="env-muted-cell">No data</td>
          </tr>
        `;
      }
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      const current = values[values.length - 1];
      return `
        <tr>
          <td><span class="env-table-dot" style="background:${metric.color}"></span>${escapeHtml4(metric.label)}</td>
          <td>${escapeHtml4(formatMetricValue(metric, current))}</td>
          <td>${escapeHtml4(formatMetricValue(metric, min))}</td>
          <td>${escapeHtml4(formatMetricValue(metric, avg))}</td>
          <td>${escapeHtml4(formatMetricValue(metric, max))}</td>
        </tr>
      `;
    }).join("");
    return `
    <table class="env-metric-table">
      <thead><tr><th>Metric</th><th>Now</th><th>Min</th><th>Avg</th><th>Max</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  }
  function renderZoneTable(zones2, activeZone) {
    const rows = zones2.map((zone) => {
      const values = DEFAULT_OVERVIEW_METRICS.map((key) => {
        const metric = zone.metrics.find((candidate) => candidate.key === key);
        const value = metric ? latestValue(metric) : null;
        return { key, metric, value };
      });
      const onlineMetrics = values.filter(
        (value) => value.value != null
      ).length;
      const state2 = onlineMetrics === values.length ? "Good" : onlineMetrics > 0 ? "Partial" : "No data";
      const cells = values.map(({ key, metric, value }) => {
        const meta = metricMeta(key);
        const display = metric && value != null ? formatMetricValue(metric, value) : "No data";
        return `<td style="color:${metric?.color ?? meta.color}">${escapeHtml4(display)}</td>`;
      }).join("");
      return `
        <tr class="${activeZone === zone.zoneName ? "active" : ""}" data-zone="${escapeAttr(zone.zoneName)}">
          <td>${escapeHtml4(zone.zoneName)}</td>
          ${cells}
          <td><span class="env-zone-state ${state2.toLowerCase().replace(/\s+/g, "-")}">${state2}</span></td>
        </tr>
      `;
    }).join("");
    return `
    <div class="env-zone-table-wrap">
      <div class="env-zone-table-head">
        <span>Zones</span>
        <button class="env-zone-reset ${activeZone ? "" : "active"}" data-zone="__all__">All Zones</button>
      </div>
      <table class="env-zone-table">
        <thead><tr><th>Zone</th><th>Temp</th><th>RH</th><th>CO\u2082</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  }
  function renderOverviewEnvironmentHero(zones2, containerId, opts) {
    const container = document.getElementById(containerId);
    if (!container) return;
    injectEnvironmentChartStyles();
    if (zones2.length === 0) {
      container.innerHTML = '<div class="chart-empty">No sensor data</div>';
      return;
    }
    const activeZoneName = opts.activeZone || "";
    const selectedZone = zones2.find((zone) => zone.zoneName === activeZoneName) ?? aggregateZones(zones2);
    const availableKeys = new Set(
      zones2.flatMap((zone) => zone.metrics).filter((metric) => cleanData(metric.data).length > 0).map((metric) => metric.key)
    );
    const activeKeys = new Set(
      DEFAULT_OVERVIEW_METRICS.filter(
        (key) => opts.activeKeys.has(key) && availableKeys.has(key)
      )
    );
    if (activeKeys.size === 0) {
      const fallback = DEFAULT_OVERVIEW_METRICS.find(
        (key) => availableKeys.has(key)
      );
      if (fallback) activeKeys.add(fallback);
    }
    const activeMetrics = getActiveMetrics(selectedZone, activeKeys);
    if (activeMetrics.length === 0) {
      container.innerHTML = '<div class="chart-empty">No data for selected zone</div>';
      return;
    }
    const toggleHtml = DEFAULT_OVERVIEW_METRICS.map((key) => {
      const meta = metricMeta(key);
      const enabled = availableKeys.has(key);
      const active = activeKeys.has(key);
      return `<button class="env-toggle ${active ? "active" : ""}" ${enabled ? "" : "disabled"} data-metric="${key}" style="--toggle-color:${meta.color}">${escapeHtml4(meta.label)}</button>`;
    }).join("");
    container.innerHTML = `
    <section class="env-overview-card">
      <div class="env-overview-head">
        <div>
          <div class="env-title">Environmental Overview</div>
          <div class="env-subtitle">${escapeHtml4(selectedZone.zoneName)} \xB7 SVG telemetry field plus precision traces</div>
        </div>
        <div class="env-toggles">${toggleHtml}</div>
      </div>
      <div class="env-field-panel">
        ${renderFarmTelemetrySvg(activeMetrics, selectedZone.zoneName)}
      </div>
      <div class="env-overview-grid">
        <div class="env-chart-panel">
          ${renderPrecisionSvg(activeMetrics)}
          ${renderMetricSummary(activeMetrics)}
        </div>
        <aside class="env-gauge-panel">
          ${renderRadialGaugeSvg(activeMetrics)}
        </aside>
      </div>
      ${renderZoneTable(zones2, activeZoneName)}
    </section>
  `;
    if (opts.onMetricToggle) {
      container.querySelectorAll(".env-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.dataset.metric;
          if (key) opts.onMetricToggle?.(key);
        });
      });
    }
    if (opts.onZoneSelect) {
      container.querySelectorAll("[data-zone]").forEach((el) => {
        el.addEventListener("click", () => {
          const zone = el.dataset.zone;
          opts.onZoneSelect?.(zone === "__all__" ? "" : zone || "");
        });
      });
    }
  }
  function renderHorizonBandsSvg(metrics2) {
    const width = 920;
    const rowHeight = 48;
    const height = Math.max(150, metrics2.length * rowHeight + 28);
    const pad = { l: 74, r: 18, t: 16, b: 18 };
    const chartW = width - pad.l - pad.r;
    const allTimes = metrics2.flatMap(
      (metric) => metric.data.map((point) => point.t)
    );
    const minT = Math.min(...allTimes);
    const maxT = Math.max(...allTimes);
    const tSpan = Math.max(1, maxT - minT);
    const x = (t) => pad.l + (t - minT) / tSpan * chartW;
    const rows = metrics2.map((metric, metricIndex) => {
      const yBase = pad.t + metricIndex * rowHeight;
      const values = cleanData(metric.data);
      const cellW = Math.max(2, chartW / Math.max(1, values.length) - 1);
      const cells = values.map((point) => {
        const n = normalizeValue(metric, point.v);
        const barH = Math.max(3, n * (rowHeight - 17));
        const y = yBase + rowHeight - 8 - barH;
        return `<rect x="${x(point.t).toFixed(1)}" y="${y.toFixed(1)}" width="${cellW.toFixed(1)}" height="${barH.toFixed(1)}" rx="1.5" fill="${metric.color}" opacity="${(0.2 + n * 0.72).toFixed(2)}"/>`;
      }).join("");
      const latest = latestValue(metric);
      return `
        <g>
          <text x="8" y="${(yBase + 24).toFixed(1)}" class="env-axis-label">${escapeHtml4(metricMeta(metric.key).shortLabel)}</text>
          ${cells}
          <line x1="${pad.l}" x2="${width - pad.r}" y1="${(yBase + rowHeight - 6).toFixed(1)}" y2="${(yBase + rowHeight - 6).toFixed(1)}" class="env-grid"/>
          <text x="${width - pad.r}" y="${(yBase + 24).toFixed(1)}" class="env-axis-label" text-anchor="end">${latest == null ? "No data" : escapeHtml4(formatMetricValue(metric, latest))}</text>
        </g>
      `;
    }).join("");
    return `
    <svg class="env-horizon-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Environmental horizon bands">
      ${rows}
    </svg>
  `;
  }
  function renderStackedAreaSvg(metrics2) {
    const width = 920;
    const height = 285;
    const pad = { l: 34, r: 22, t: 22, b: 30 };
    const chartW = width - pad.l - pad.r;
    const chartH = height - pad.t - pad.b;
    const times = Array.from(
      new Set(metrics2.flatMap((metric) => metric.data.map((point) => point.t)))
    ).sort((a, b) => a - b);
    const minT = times[0] ?? 0;
    const maxT = times[times.length - 1] ?? minT + 1;
    const tSpan = Math.max(1, maxT - minT);
    const x = (t) => pad.l + (t - minT) / tSpan * chartW;
    const normalizedSeries = metrics2.map((metric) => {
      const exact = new Map(metric.data.map((point) => [point.t, point.v]));
      let carry = metric.data[0]?.v ?? 0;
      return {
        metric,
        values: times.map((t) => {
          const found = exact.get(t);
          if (typeof found === "number") carry = found;
          return normalizeValue(metric, carry) * 100;
        })
      };
    });
    const stacks = times.map((t, index) => {
      let total = 0;
      const segments = normalizedSeries.map((series) => {
        const y0 = total;
        total += series.values[index] ?? 0;
        return { metric: series.metric, y0, y1: total };
      });
      return { t, index, total, segments };
    });
    const maxTotal = Math.max(1, ...stacks.map((stack) => stack.total));
    const y = (value) => pad.t + (1 - value / maxTotal) * chartH;
    const grid = [0, 0.25, 0.5, 0.75, 1].map((step) => {
      const gy = pad.t + step * chartH;
      return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}" class="env-grid"/>`;
    }).join("");
    const defs = normalizedSeries.map(
      (series, index) => `
      <linearGradient id="env-stack-${series.metric.key}-${index}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${series.metric.color}" stop-opacity="0.66"/>
        <stop offset="100%" stop-color="${series.metric.color}" stop-opacity="0.12"/>
      </linearGradient>
    `
    ).join("");
    const layers = normalizedSeries.map((series, layerIndex) => {
      const top = stacks.map((stack) => {
        const segment = stack.segments[layerIndex];
        return { x: x(stack.t), y: y(segment?.y1 ?? 0) };
      });
      const bottom = stacks.map((stack) => {
        const segment = stack.segments[layerIndex];
        return { x: x(stack.t), y: y(segment?.y0 ?? 0) };
      });
      const topLine = top.map(
        (point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`
      ).join(" ");
      const bottomLine = bottom.slice().reverse().map((point) => `L${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
      const edge = monotonePath(top);
      return `
        <path d="${topLine} ${bottomLine} Z" fill="url(#env-stack-${series.metric.key}-${layerIndex})"/>
        <path d="${edge}" fill="none" stroke="${series.metric.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      `;
    }).join("");
    const labels = [minT, minT + tSpan / 2, maxT].map((t, index) => {
      const label = new Date(t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      return `<text class="env-axis-label" x="${x(t).toFixed(1)}" y="${height - 8}" text-anchor="${index === 0 ? "start" : index === 2 ? "end" : "middle"}">${escapeHtml4(label)}</text>`;
    }).join("");
    return `
    <svg class="env-stack-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Stacked environmental pressure chart">
      <defs>${defs}</defs>
      ${grid}
      ${layers}
      ${labels}
    </svg>
  `;
  }
  function renderBulletRangeBars(metrics2) {
    const rows = metrics2.map((metric) => {
      const meta = metricMeta(metric.key);
      const current = latestValue(metric);
      const targetMin = meta.targetMin ?? meta.minAxis;
      const targetMax = meta.targetMax ?? meta.maxAxis;
      const currentPct = current == null ? 0 : normalizeValue(metric, current) * 100;
      const targetStart = normalizeValue(metric, targetMin) * 100;
      const targetWidth = Math.max(
        2,
        normalizeValue(metric, targetMax) * 100 - targetStart
      );
      return `
        <div class="env-bullet-row">
          <div>
            <div class="env-bullet-label">${escapeHtml4(meta.label)}</div>
            <div class="env-bullet-target">${escapeHtml4(formatMetricValue(metric, targetMin))} - ${escapeHtml4(formatMetricValue(metric, targetMax))}</div>
          </div>
          <div class="env-bullet-track">
            <span class="env-bullet-target-band" style="left:${targetStart.toFixed(1)}%;width:${targetWidth.toFixed(1)}%;background:${metric.color}"></span>
            <span class="env-bullet-value" style="width:${currentPct.toFixed(1)}%;background:${metric.color}"></span>
          </div>
          <strong style="color:${metric.color}">${current == null ? "No data" : escapeHtml4(formatMetricValue(metric, current))}</strong>
        </div>
      `;
    }).join("");
    return `<div class="env-bullet-list">${rows}</div>`;
  }
  function renderSensorEnvironmentHero(metrics2, containerId, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    injectEnvironmentChartStyles();
    const drawableMetrics = metrics2.map((metric) => ({ ...metric, data: cleanData(metric.data) })).filter((metric) => metric.data.length > 0);
    if (drawableMetrics.length === 0) {
      container.innerHTML = '<div class="chart-empty">No data for selection</div>';
      return;
    }
    const title = drawableMetrics.map(
      (metric) => `<span style="color:${metric.color}">${escapeHtml4(metric.label)}</span>`
    ).join(' <span style="color:var(--text-secondary)">+</span> ');
    container.innerHTML = `
    <section class="env-sensor-stack">
      <div class="env-sensor-panel">
        <div class="env-sensor-panel-head">
          <div>
            <div class="env-title">${title}</div>
            <div class="env-subtitle">${escapeHtml4(opts.subtitle ?? "Selected sensor history")}</div>
          </div>
          <span class="env-panel-kicker">Multi-line focus</span>
        </div>
        ${renderPrecisionSvg(drawableMetrics)}
        ${renderMetricSummary(drawableMetrics)}
      </div>
      <div class="env-sensor-panel">
        <div class="env-sensor-panel-head">
          <div>
            <div class="env-title">Horizon Bands</div>
            <div class="env-subtitle">Dense scan of the same selected metrics</div>
          </div>
          <span class="env-panel-kicker">Normalized</span>
        </div>
        ${renderHorizonBandsSvg(drawableMetrics)}
      </div>
    </section>
  `;
  }
  function renderSystemEnvironmentHero(metrics2, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    injectEnvironmentChartStyles();
    const drawableMetrics = metrics2.map((metric) => ({ ...metric, data: cleanData(metric.data) })).filter((metric) => metric.data.length > 0);
    if (drawableMetrics.length === 0) {
      container.innerHTML = '<div class="chart-empty">No sensor data</div>';
      return;
    }
    container.innerHTML = `
    <section class="env-system-stack">
      <div class="env-sensor-panel">
        <div class="env-sensor-panel-head">
          <div>
            <div class="env-title">Environmental Pressure</div>
            <div class="env-subtitle">Stacked normalized history for active system metrics</div>
          </div>
          <span class="env-panel-kicker">Stacked area</span>
        </div>
        ${renderStackedAreaSvg(drawableMetrics)}
      </div>
      <div class="env-sensor-panel">
        <div class="env-sensor-panel-head">
          <div>
            <div class="env-title">Grow Targets</div>
            <div class="env-subtitle">Display defaults only; not safety policy</div>
          </div>
          <span class="env-panel-kicker">Bullet ranges</span>
        </div>
        ${renderBulletRangeBars(drawableMetrics)}
      </div>
    </section>
  `;
  }
  function renderSafetyDenialCalendarHeatmap(denials, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    injectEnvironmentChartStyles();
    const width = 920;
    const height = 190;
    const pad = { l: 54, r: 16, t: 22, b: 24 };
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const cellGap = 3;
    const cellW = (width - pad.l - pad.r - 23 * cellGap) / 24;
    const cellH = (height - pad.t - pad.b - 6 * cellGap) / 7;
    const counts = /* @__PURE__ */ new Map();
    for (const denial of denials) {
      const date2 = new Date(denial.createdAt);
      if (Number.isNaN(date2.getTime())) continue;
      const key = `${date2.getDay()}:${date2.getHours()}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    const cells = days.flatMap(
      (day, dayIndex) => Array.from({ length: 24 }, (_, hour) => {
        const value = counts.get(`${dayIndex}:${hour}`) ?? 0;
        const opacity = value === 0 ? 0.12 : 0.25 + value / max * 0.7;
        const color = value === 0 ? "var(--bg-tertiary)" : value >= max ? "var(--danger)" : value > max / 2 ? "var(--warning)" : "var(--accent-bright)";
        return `<rect x="${(pad.l + hour * (cellW + cellGap)).toFixed(1)}" y="${(pad.t + dayIndex * (cellH + cellGap)).toFixed(1)}" width="${cellW.toFixed(1)}" height="${cellH.toFixed(1)}" rx="2" fill="${color}" opacity="${opacity.toFixed(2)}"><title>${day} ${hour}:00 \xB7 ${value} denied</title></rect>`;
      })
    ).join("");
    const dayLabels = days.map(
      (day, index) => `<text class="env-axis-label" x="8" y="${(pad.t + index * (cellH + cellGap) + cellH * 0.68).toFixed(1)}">${day}</text>`
    ).join("");
    const hourLabels = [0, 6, 12, 18, 23].map(
      (hour) => `<text class="env-axis-label" x="${(pad.l + hour * (cellW + cellGap)).toFixed(1)}" y="${height - 7}" text-anchor="middle">${hour}</text>`
    ).join("");
    container.innerHTML = `
    <div class="env-safety-card">
      <div class="env-sensor-panel-head">
        <div>
          <div class="env-title">Denied Action Calendar</div>
          <div class="env-subtitle">Denied safety actions by day and hour</div>
        </div>
        <span class="env-panel-kicker">${denials.length} events</span>
      </div>
      <svg class="env-safety-heatmap-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Safety denial calendar heatmap">
        ${cells}
        ${dayLabels}
        ${hourLabels}
      </svg>
    </div>
  `;
  }
  function renderSafetyThresholdBulletBars(thresholds, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    injectEnvironmentChartStyles();
    const active = thresholds.filter((threshold) => threshold.enabled);
    if (active.length === 0) {
      container.innerHTML = `
      <div class="env-safety-card">
        <div class="chart-empty">No enabled thresholds</div>
      </div>
    `;
      return;
    }
    const rows = active.map((threshold) => {
      const span = Math.max(1, threshold.axisMax - threshold.axisMin);
      const pct = (value) => value == null ? 0 : Math.max(
        0,
        Math.min(100, (value - threshold.axisMin) / span * 100)
      );
      const minPct = pct(threshold.minValue);
      const maxPct = threshold.maxValue == null ? 100 : Math.max(minPct + 2, pct(threshold.maxValue));
      const currentPct = pct(threshold.currentValue);
      const current = threshold.currentValue;
      const lowBreach = current != null && threshold.minValue != null && current < threshold.minValue;
      const highBreach = current != null && threshold.maxValue != null && current > threshold.maxValue;
      const state2 = current == null ? "No data" : lowBreach || highBreach ? "Out" : "In";
      return `
        <div class="env-bullet-row env-threshold-row" data-threshold-id="${escapeAttr(threshold.id)}">
          <div>
            <div class="env-bullet-label">${escapeHtml4(threshold.label)}</div>
            <div class="env-bullet-target">${escapeHtml4(threshold.scope)}</div>
          </div>
          <div class="env-bullet-track">
            <span class="env-bullet-target-band" style="left:${minPct.toFixed(1)}%;width:${(maxPct - minPct).toFixed(1)}%;background:${threshold.color}"></span>
            <span class="env-bullet-value" style="width:${currentPct.toFixed(1)}%;background:${threshold.color}"></span>
          </div>
          <strong style="color:${threshold.color}">${current == null ? "No data" : `${current.toFixed(Math.abs(current) >= 100 ? 0 : 1)}${escapeHtml4(threshold.unit)}`}</strong>
          <span class="env-zone-state ${state2 === "Out" ? "partial" : state2 === "No data" ? "no-data" : ""}">${state2}</span>
        </div>
      `;
    }).join("");
    container.innerHTML = `
    <div class="env-safety-card">
      <div class="env-sensor-panel-head">
        <div>
          <div class="env-title">Threshold Range Bars</div>
          <div class="env-subtitle">Current readings against enabled safety thresholds</div>
        </div>
        <span class="env-panel-kicker">${active.length} thresholds</span>
      </div>
      <div class="env-bullet-list">${rows}</div>
    </div>
  `;
  }
  function deviceTypeColor(type) {
    switch (type) {
      case "sensor":
        return "#F59E0B";
      case "relay":
        return "#22C55E";
      case "camera":
        return "#38BDF8";
      case "smart_plug":
        return "#A855F7";
      default:
        return "#6C7278";
    }
  }
  function runForceSimulation(nodes, edges, width, height) {
    const ITERATIONS = 120;
    const REPULSION = 8e3;
    const ATTRACTION = 0.06;
    const IDEAL_EDGE = 120;
    const DAMPING = 0.82;
    const PAD = 48;
    const simNodes = nodes.map((n) => ({
      ...n,
      x: PAD + Math.random() * (width - PAD * 2),
      y: PAD + Math.random() * (height - PAD * 2),
      vx: 0,
      vy: 0
    }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));
    for (let iter = 0; iter < ITERATIONS; iter++) {
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist2 = Math.max(1, dx * dx + dy * dy);
          const dist = Math.sqrt(dist2);
          const force = REPULSION / dist2;
          const fx = dx / dist * force;
          const fy = dy / dist * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
      for (const edge of edges) {
        const a = nodeById.get(edge.source);
        const b = nodeById.get(edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(Math.max(1, dx * dx + dy * dy));
        const force = (dist - IDEAL_EDGE) * ATTRACTION;
        const fx = dx / Math.max(1, dist) * force;
        const fy = dy / Math.max(1, dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
      const cool = DAMPING + (1 - DAMPING) * (iter / ITERATIONS);
      for (const n of simNodes) {
        n.vx *= cool;
        n.vy *= cool;
        n.x = Math.max(PAD, Math.min(width - PAD, n.x + n.vx));
        n.y = Math.max(PAD, Math.min(height - PAD, n.y + n.vy));
      }
    }
    return simNodes.map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      online: n.online,
      zone: n.zone || "Unzoned",
      x: n.x,
      y: n.y,
      color: deviceTypeColor(n.type)
    }));
  }
  function renderDeviceForceGraphSvg(nodes, edges, containerId, onNodeClick) {
    const container = document.getElementById(containerId);
    if (!container) return;
    injectEnvironmentChartStyles();
    if (nodes.length === 0) {
      container.innerHTML = `<div class="env-force-empty">No devices to visualize</div>`;
      return;
    }
    const width = 920;
    const height = Math.min(560, 80 + nodes.length * 52);
    const PAD = 48;
    const simNodes = runForceSimulation(nodes, edges, width, height);
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));
    const edgeSegments = [];
    for (const edge of edges) {
      const s = nodeById.get(edge.source);
      const t = nodeById.get(edge.target);
      if (!s || !t) continue;
      edgeSegments.push({
        x1: s.x,
        y1: s.y,
        x2: t.x,
        y2: t.y,
        kind: edge.kind
      });
    }
    const zones2 = [...new Set(simNodes.map((n) => n.zone))].sort();
    const edgeLines = edgeSegments.map((e) => {
      const dash = e.kind === "zone" ? "4 6" : "none";
      const opacity = e.kind === "zone" ? 0.22 : 0.45;
      return `<line x1="${e.x1.toFixed(1)}" y1="${e.y1.toFixed(1)}" x2="${e.x2.toFixed(1)}" y2="${e.y2.toFixed(1)}" stroke="var(--text-tertiary)" stroke-width="1.2" stroke-dasharray="${dash}" opacity="${opacity}"/>`;
    }).join("");
    const R = 22;
    const nodeCircles = simNodes.map((n) => {
      const alpha = n.online ? 1 : 0.35;
      const stroke = n.online ? n.color : "var(--border)";
      const fill = n.online ? `color-mix(in srgb, ${n.color} 28%, transparent)` : "var(--bg-tertiary)";
      return `
        <circle
          cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${R}"
          fill="${fill}" stroke="${stroke}" stroke-width="2"
          opacity="${alpha}" class="force-node"
          data-node-id="${escapeAttr(n.id)}"
          data-label="${escapeAttr(n.label)}"
          data-type="${escapeAttr(n.type)}"
          data-online="${n.online}"
          data-zone="${escapeAttr(n.zone)}"
        />
        <text
          x="${n.x.toFixed(1)}" y="${(n.y + R + 12).toFixed(1)}"
          text-anchor="middle" class="env-force-label"
          opacity="${n.online ? 0.88 : 0.38}"
        >${escapeHtml4(n.label.length > 14 ? n.label.slice(0, 13) + "\u2026" : n.label)}</text>
      `;
    }).join("");
    const typeLegend = ["sensor", "relay", "camera", "smart_plug"].filter((t) => nodes.some((n) => n.type === t)).map(
      (t) => `<span class="env-force-legend-item"><span class="env-force-legend-dot" style="background:${deviceTypeColor(t)}"></span>${escapeHtml4(t)}</span>`
    ).join("");
    const zoneLegend = zones2.slice(0, 5).map((z) => `<span class="env-force-legend-item">${escapeHtml4(z)}</span>`).join("");
    container.innerHTML = `
    <div class="env-force-card">
      <div class="env-sensor-panel-head">
        <div>
          <div class="env-title">Device Topology</div>
          <div class="env-subtitle">${nodes.length} devices \xB7 ${edgeSegments.length} connections \xB7 spring-electrical layout</div>
        </div>
        <div class="env-force-legend">
          <span class="env-force-legend-item">\u25CF Online</span>
          <span class="env-force-legend-item env-force-legend-offline">\u25CB Offline</span>
          <span class="env-force-legend-item" style="color:var(--text-tertiary);font-size:9px">\u2014 zone</span>
          <span class="env-force-legend-item" style="color:var(--text-tertiary);font-size:9px">\u2500 dependency</span>
          ${typeLegend}
          ${zoneLegend ? `<span class="env-force-sep">|</span>${zoneLegend}` : ""}
        </div>
      </div>
      <div class="env-force-wrap">
        <svg class="env-force-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Device topology force graph">
          <defs>
            <filter id="force-glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          ${edgeLines}
          ${nodeCircles}
        </svg>
        <div class="env-force-tooltip" id="force-tooltip"></div>
      </div>
    </div>
  `;
    const tooltip = document.getElementById("force-tooltip");
    container.querySelectorAll(".force-node").forEach((circle) => {
      circle.addEventListener("pointerenter", (e) => {
        if (!tooltip) return;
        const id = circle.dataset.nodeId || "";
        const label = circle.dataset.label || "";
        const type = circle.dataset.type || "";
        const online = circle.dataset.online === "true";
        const zone = circle.dataset.zone || "";
        tooltip.innerHTML = `
        <div class="env-force-tip-name">${escapeHtml4(label)}</div>
        <div class="env-force-tip-row"><span>Type</span><strong>${escapeHtml4(type)}</strong></div>
        <div class="env-force-tip-row"><span>Status</span><strong style="color:${online ? "var(--success)" : "var(--danger)"}">${online ? "Online" : "Offline"}</strong></div>
        ${zone ? `<div class="env-force-tip-row"><span>Zone</span><strong>${escapeHtml4(zone)}</strong></div>` : ""}
      `;
        const rect = e.target.closest("svg").getBoundingClientRect();
        const cx = parseFloat(circle.getAttribute("cx"));
        const cy = parseFloat(circle.getAttribute("cy"));
        const svgEl = circle.closest("svg");
        const vb = svgEl.viewBox.baseVal;
        const scaleX = rect.width / vb.width;
        const scaleY = rect.height / vb.height;
        tooltip.style.left = `${cx * scaleX + rect.left - container.getBoundingClientRect().left + 12}px`;
        tooltip.style.top = `${cy * scaleY + rect.top - container.getBoundingClientRect().top - 10}px`;
        tooltip.style.display = "block";
      });
      circle.addEventListener("pointerleave", () => {
        if (tooltip) tooltip.style.display = "none";
      });
      circle.addEventListener("click", () => {
        const id = circle.dataset.nodeId;
        if (id) onNodeClick?.(id);
      });
      circle.style.cursor = "pointer";
    });
  }
  function renderCalibrationBeeswarmSvg(points, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    injectEnvironmentChartStyles();
    const grouped = /* @__PURE__ */ new Map();
    for (const p of points) {
      const list = grouped.get(p.metric) ?? [];
      list.push(p);
      grouped.set(p.metric, list);
    }
    if (grouped.size === 0) {
      container.innerHTML = `<div class="env-force-empty">No calibration data</div>`;
      return;
    }
    const METRIC_LABELS2 = {
      temperature: "Temperature",
      humidity: "Humidity",
      co2: "CO\u2082",
      soil_moisture: "Soil Moisture",
      light: "Light",
      water_level: "Water Level",
      ph: "pH",
      weight: "Weight"
    };
    const METRIC_COLORS = {
      temperature: "#F59E0B",
      humidity: "#38BDF8",
      co2: "#22C55E",
      soil_moisture: "#EF4444",
      light: "#FACC15",
      water_level: "#2563EB",
      ph: "#A855F7",
      weight: "#94A3B8"
    };
    const ROW_H = 52;
    const PAD = { l: 120, r: 24, t: 24, b: 16 };
    const width = 920;
    const metrics2 = Array.from(grouped.keys());
    const height = PAD.t + metrics2.length * ROW_H + PAD.b;
    const allOffsets = points.map((p) => p.offset);
    const minOff = Math.min(...allOffsets);
    const maxOff = Math.max(...allOffsets);
    const span = Math.max(1, maxOff - minOff);
    const xMap = (v) => PAD.l + (v - minOff) / span * (width - PAD.l - PAD.r);
    const rows = metrics2.map((metric, rowIndex) => {
      const pts = grouped.get(metric) ?? [];
      const yBase = PAD.t + rowIndex * ROW_H;
      const color = METRIC_COLORS[metric] ?? "#94A3B8";
      const label = METRIC_LABELS2[metric] ?? metric;
      const sorted = pts.slice().sort((a, b) => a.offset - b.offset);
      const stackMap = /* @__PURE__ */ new Map();
      let stack = 0;
      for (const pt of sorted) {
        stackMap.set(`${pt.deviceId}:${pt.metric}`, stack % 5);
        stack++;
      }
      const STACK_GAP = 8;
      const CENTER_Y = yBase + ROW_H / 2;
      const R = 7;
      const zeroX = xMap(0);
      const zeroLine = `
      <line x1="${zeroX.toFixed(1)}" y1="${(yBase + 4).toFixed(1)}" x2="${zeroX.toFixed(1)}" y2="${(yBase + ROW_H - 4).toFixed(1)}"
        stroke="var(--border)" stroke-width="1" stroke-dasharray="3 4" opacity="0.6"/>
    `;
      const tickCount = Math.max(2, Math.min(5, Math.ceil(span / 0.5)));
      const tickStep = span / (tickCount - 1);
      const ticks = Array.from({ length: tickCount }, (_, i) => {
        const v = minOff + i * tickStep;
        const tx = xMap(v);
        return `<text x="${tx.toFixed(1)}" y="${(yBase + ROW_H - 3).toFixed(1)}" text-anchor="middle" class="env-axis-label">${v >= 0 ? "+" : ""}${v.toFixed(1)}</text>`;
      }).join("");
      const metricLabel = `
      <text x="${PAD.l - 10}" y="${(yBase + ROW_H / 2 + 4).toFixed(1)}"
        text-anchor="end" class="env-force-label" fill="${color}" opacity="0.9">${escapeHtml4(label)}</text>
    `;
      const dots = pts.map((pt) => {
        const x = xMap(pt.offset);
        const stackIdx = stackMap.get(`${pt.deviceId}:${pt.metric}`) ?? 0;
        const y = CENTER_Y + (stackIdx - 2) * STACK_GAP;
        const dotColor = pt.offset > 1e-3 ? "var(--warning)" : pt.offset < -1e-3 ? "var(--info)" : "var(--border)";
        const title = `${escapeHtml4(pt.deviceName)}
offset = ${pt.offset > 0 ? "+" : ""}${pt.offset.toFixed(3)}${pt.unit}`;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R}" fill="${dotColor}" opacity="0.85" stroke="${color}" stroke-width="1.5"><title>${title}</title></circle>`;
      }).join("");
      return { metric, color, yBase, zeroLine, ticks, metricLabel, dots };
    });
    const svgContent = rows.map((r) => `${r.zeroLine}${r.ticks}${r.metricLabel}${r.dots}`).join("");
    container.innerHTML = `
    <div class="env-force-card">
      <div class="env-sensor-panel-head">
        <div>
          <div class="env-title">Calibration Offset Distribution</div>
          <div class="env-subtitle">${points.length} sensors across ${metrics2.length} metrics \xB7 jittered by device</div>
        </div>
        <div class="env-force-legend">
          <span class="env-force-legend-item"><span class="env-force-legend-dot" style="background:var(--warning)"></span>Positive offset</span>
          <span class="env-force-legend-item"><span class="env-force-legend-dot" style="background:var(--info)"></span>Negative offset</span>
          <span class="env-force-legend-item"><span class="env-force-legend-dot" style="background:var(--border)"></span>Zero offset</span>
          <span class="env-force-legend-item" style="color:var(--text-tertiary)">| Dashed line = zero</span>
        </div>
      </div>
      <svg class="env-force-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Calibration offset beeswarm distribution">
        ${svgContent}
      </svg>
    </div>
  `;
  }
  function injectEnvironmentChartStyles() {
    if (document.getElementById("hal-environment-charts-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-environment-charts-styles";
    style.textContent = `
.env-overview-card {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--accent-bright) 10%, transparent), transparent 34%),
    radial-gradient(circle at 86% 10%, rgba(56,139,253,0.18), transparent 26%),
    var(--bg-secondary);
  border: 1px solid color-mix(in srgb, var(--accent-bright) 24%, var(--border));
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-card-lg);
}
.env-overview-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent 74%);
}
.env-overview-card > * {
  position: relative;
  z-index: 1;
}
.env-sensor-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.env-sensor-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
}
.env-safety-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
  min-width: 0;
}
.env-sensor-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.env-panel-kicker {
  flex-shrink: 0;
  color: var(--accent-bright);
  border: 1px solid color-mix(in srgb, var(--accent-bright) 30%, var(--border));
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--accent-bright) 8%, var(--bg-tertiary));
  font-size: 10px;
  font-weight: 800;
  padding: 5px 9px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.env-overview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.env-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--text-primary);
}
.env-subtitle {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-secondary);
}
.env-toggles {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.env-toggle,
.env-zone-reset {
  min-height: 30px;
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--toggle-color, var(--accent)) 34%, var(--border));
  background: color-mix(in srgb, var(--toggle-color, var(--accent)) 7%, var(--bg-tertiary));
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  padding: 0 10px;
}
.env-toggle.active,
.env-zone-reset.active {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--toggle-color, var(--accent)) 18%, var(--bg-secondary));
  border-color: color-mix(in srgb, var(--toggle-color, var(--accent)) 60%, var(--border));
}
.env-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.env-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: var(--space-4);
  align-items: stretch;
}
.env-field-panel {
  min-width: 0;
  margin-bottom: var(--space-4);
}
.env-field-svg {
  display: block;
  width: 100%;
  height: auto;
}
.env-field-bg {
  fill: color-mix(in srgb, var(--bg-primary) 72%, var(--accent) 8%);
  stroke: color-mix(in srgb, var(--accent-bright) 28%, var(--border));
  stroke-width: 1;
}
.env-field-arch {
  fill: none;
  stroke: rgba(240,246,252,0.07);
  stroke-width: 1.2;
}
.env-field-bed {
  fill: none;
  stroke: rgba(63,185,80,0.18);
  stroke-width: 22;
  stroke-linecap: round;
}
.env-field-lane {
  stroke: rgba(240,246,252,0.08);
  stroke-dasharray: 1 8;
  stroke-linecap: round;
}
.env-field-label,
.env-field-title,
.env-field-caption,
.env-field-time,
.env-field-value {
  font-family: var(--font-mono);
}
.env-field-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.env-field-title {
  fill: var(--text-primary);
  font-size: 13px;
  font-weight: 800;
}
.env-field-caption,
.env-field-time {
  fill: var(--text-secondary);
  font-size: 10px;
  letter-spacing: 0.04em;
}
.env-field-value {
  font-size: 11px;
  font-weight: 800;
}
.env-field-ribbon-shadow {
  fill: none;
  stroke-width: 12;
  stroke-opacity: 0.09;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.env-field-ribbon {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.env-chart-panel,
.env-gauge-panel {
  min-width: 0;
}
.env-precision-svg,
.env-radial-svg,
.env-horizon-svg,
.env-stack-svg {
  display: block;
  width: 100%;
  height: auto;
}
.env-safety-heatmap-svg {
  display: block;
  width: 100%;
  height: auto;
}
.env-grid {
  stroke: color-mix(in srgb, var(--text-tertiary) 28%, var(--border));
  stroke-width: 1;
  stroke-dasharray: 2 4;
}
.env-axis-label {
  fill: var(--text-tertiary);
  font-size: 10px;
  font-family: var(--font-mono);
}
.env-metric-table,
.env-zone-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.env-metric-table {
  margin-top: var(--space-2);
}
.env-metric-table th,
.env-zone-table th {
  text-align: left;
  color: var(--text-tertiary);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: var(--space-2);
  border-bottom: 1px solid var(--border);
}
.env-metric-table td,
.env-zone-table td {
  padding: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
}
.env-zone-table tbody tr {
  cursor: pointer;
}
.env-zone-table tbody tr:hover td,
.env-zone-table tbody tr.active td {
  background: var(--bg-tertiary);
}
.env-table-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-right: 7px;
}
.env-muted-cell {
  color: var(--text-secondary) !important;
}
.env-radial {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  height: 100%;
}
.env-gauge-main {
  fill: var(--text-primary);
  font-size: 23px;
  font-weight: 800;
  font-family: var(--font-mono);
}
.env-gauge-sub {
  fill: var(--text-secondary);
  font-size: 10px;
  font-family: var(--font-mono);
}
.env-gauge-legend {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.env-gauge-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 7px;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
}
.env-gauge-row strong {
  font-family: var(--font-mono);
  font-size: 12px;
}
.env-gauge-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
.env-zone-table-wrap {
  margin-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
  padding-top: var(--space-3);
}
.env-zone-table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.env-zone-state {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 7px;
  border-radius: var(--radius-pill);
  font-size: 10px;
  font-weight: 800;
  color: var(--success);
  background: color-mix(in srgb, var(--success) 9%, var(--bg-tertiary));
  border: 1px solid color-mix(in srgb, var(--success) 30%, var(--border));
}
.env-zone-state.partial {
  color: var(--warning);
  background: color-mix(in srgb, var(--warning) 9%, var(--bg-tertiary));
  border-color: color-mix(in srgb, var(--warning) 30%, var(--border));
}
.env-zone-state.no-data {
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  border-color: var(--border);
}
.env-system-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.env-bullet-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.env-bullet-row {
  display: grid;
  grid-template-columns: minmax(110px, 150px) 1fr auto;
  align-items: center;
  gap: var(--space-3);
}
.env-threshold-row {
  grid-template-columns: minmax(130px, 190px) 1fr minmax(72px, auto) auto;
}
.env-bullet-label {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
}
.env-bullet-target {
  color: var(--text-secondary);
  font-size: 10px;
  margin-top: 2px;
}
.env-bullet-track {
  position: relative;
  height: 18px;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
}
.env-bullet-target-band {
  position: absolute;
  top: 0;
  bottom: 0;
  opacity: 0.22;
}
.env-bullet-value {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 0;
  border-radius: var(--radius-sm);
}
.env-bullet-row strong {
  min-width: 64px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 12px;
}
.env-force-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
}
.env-force-wrap {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-subtle);
}
.env-force-svg {
  display: block;
  width: 100%;
  height: auto;
  max-height: 560px;
}
.env-force-label {
  fill: var(--text-secondary);
  font-size: 10px;
  font-family: var(--font-mono);
  pointer-events: none;
}
.force-node {
  transition: opacity 0.15s;
}
.force-node:hover {
  opacity: 1 !important;
}
.env-force-tooltip {
  display: none;
  position: absolute;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-size: 11px;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  min-width: 140px;
}
.env-force-tip-name {
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
  font-size: 12px;
}
.env-force-tip-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-secondary);
  margin-top: 2px;
}
.env-force-tip-row strong {
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
}
.env-force-legend {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  align-items: center;
}
.env-force-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--text-secondary);
}
.env-force-legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.env-force-legend-offline {
  opacity: 0.5;
}
.env-force-sep {
  color: var(--border);
  margin: 0 2px;
}
.env-force-empty {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
}
@media (max-width: 920px) {
  .env-overview-grid {
    grid-template-columns: 1fr;
  }
  .env-gauge-panel {
    max-width: 360px;
  }
}
@media (max-width: 640px) {
  .env-overview-card {
    padding: var(--space-3);
  }
  .env-zone-table-wrap {
    overflow-x: auto;
  }
  .env-zone-table {
    min-width: 520px;
  }
  .env-bullet-row {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }
  .env-threshold-row {
    grid-template-columns: 1fr;
  }
  .env-bullet-row strong {
    text-align: left;
  }
}
`;
    document.head.appendChild(style);
  }
  var METRIC_META, DEFAULT_OVERVIEW_METRICS;
  var init_EnvironmentCharts = __esm({
    "src/web/hal-ui/components/EnvironmentCharts.ts"() {
      "use strict";
      METRIC_META = {
        temperature: {
          key: "temperature",
          label: "Temperature",
          shortLabel: "Temp",
          color: "#F59E0B",
          unit: "\xB0C",
          minAxis: 10,
          maxAxis: 40,
          targetMin: 20,
          targetMax: 28
        },
        humidity: {
          key: "humidity",
          label: "Humidity",
          shortLabel: "RH",
          color: "#38BDF8",
          unit: "%",
          minAxis: 0,
          maxAxis: 100,
          targetMin: 45,
          targetMax: 65
        },
        co2: {
          key: "co2",
          label: "CO\u2082",
          shortLabel: "CO\u2082",
          color: "#22C55E",
          unit: "ppm",
          minAxis: 400,
          maxAxis: 1600,
          targetMin: 700,
          targetMax: 1200
        },
        soil_moisture: {
          key: "soil_moisture",
          label: "Soil Moisture",
          shortLabel: "Soil",
          color: "#EF4444",
          unit: "%",
          minAxis: 0,
          maxAxis: 100
        },
        light: {
          key: "light",
          label: "Light",
          shortLabel: "Light",
          color: "#FACC15",
          unit: "lux",
          minAxis: 0,
          maxAxis: 1e5
        },
        water_level: {
          key: "water_level",
          label: "Water Level",
          shortLabel: "Water",
          color: "#2563EB",
          unit: "%",
          minAxis: 0,
          maxAxis: 100
        },
        ph: {
          key: "ph",
          label: "pH",
          shortLabel: "pH",
          color: "#A855F7",
          unit: "",
          minAxis: 0,
          maxAxis: 14
        },
        weight: {
          key: "weight",
          label: "Weight",
          shortLabel: "Weight",
          color: "#94A3B8",
          unit: "kg",
          minAxis: 0,
          maxAxis: 100
        }
      };
      DEFAULT_OVERVIEW_METRICS = [
        "temperature",
        "humidity",
        "co2"
      ];
    }
  });

  // src/web/hal-ui/components/OperatorPanels.ts
  async function renderOperatorPanels() {
    const store = getStore();
    const sensors = store.devices.filter((d) => d.type === "sensor");
    const relays = store.devices.filter(
      (d) => d.type === "relay" || d.type === "smart_plug"
    );
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
    const grid = relays.map(
      (r) => `
    <div class="op-device-cell ${r.online ? "online" : "offline"}" data-device-id="${r.id}">
      <div class="op-device-icon">${r.type === "relay" ? "RLY" : "PLG"}</div>
      <div class="op-device-info">
        <span class="op-device-name">${escapeHtml5(r.name)}</span>
        <span class="op-device-protocol text-xs text-secondary">${r.protocol}</span>
      </div>
      <div class="op-device-toggle ${r.state === "on" ? "on" : ""}" data-device-id="${r.id}">
        <div class="op-toggle-thumb"></div>
      </div>
    </div>
  `
    ).join("");
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
    const recent = decisions.filter(
      (d) => now - new Date(d.timestamp).getTime() < oneHour
    );
    const successCount = recent.filter((d) => d.status === "success").length;
    const successRate = recent.length > 0 ? successCount / recent.length * 100 : 0;
    const buckets = [];
    for (let h = 5; h >= 0; h--) {
      const start = now - (h + 1) * oneHour;
      const end = now - h * oneHour;
      buckets.push(
        decisions.filter((d) => {
          const t = new Date(d.timestamp).getTime();
          return t >= start && t < end;
        }).length
      );
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
        alerts.push({
          level: "critical",
          text: `${s.name} offline`,
          time: "now"
        });
      }
    }
    const failed = decisions.filter(
      (d) => d.status === "failure" && now - new Date(d.timestamp).getTime() < 36e5
    );
    for (const d of failed.slice(0, 3)) {
      alerts.push({
        level: "warning",
        text: d.decision.slice(0, 40),
        time: formatRelTime(d.timestamp)
      });
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
        ${alerts.slice(0, 5).map(
      (a) => `
          <div class="op-alert ${a.level}">
            <span class="op-alert-dot"></span>
            <span class="op-alert-text">${escapeHtml5(a.text)}</span>
            <span class="op-alert-time text-xs text-secondary">${a.time}</span>
          </div>
        `
    ).join("")}
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
            <span class="op-camera-name">${escapeHtml5(cam.name)}</span>
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
  function escapeHtml5(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function injectOperatorPanelStyles() {
    if (document.getElementById("hal-op-panel-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-op-panel-styles";
    style.textContent = `
.operator-panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  grid-auto-rows: minmax(200px, auto);
  align-items: stretch;
  gap: var(--space-4);
  margin-top: var(--space-4);
}
.op-panel {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  min-height: 200px;
  min-width: 0;
}
.op-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
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
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  grid-auto-rows: minmax(80px, auto);
  align-items: stretch;
  gap: var(--space-1);
}
.op-device-cell {
  display: flex;
  align-items: stretch;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--slate);
  min-height: 80px;
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
  overflow-wrap: anywhere;
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
  overflow-wrap: anywhere;
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

@media (max-width: 767px) {
  .op-panel {
    min-height: 120px;
  }
  .op-device-grid {
    grid-template-columns: 1fr;
  }
}
`;
    document.head.appendChild(style);
  }
  var init_OperatorPanels = __esm({
    "src/web/hal-ui/components/OperatorPanels.ts"() {
      "use strict";
      init_store();
      init_HeroChart();
    }
  });

  // src/web/hal-ui/components/Terminal.ts
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
    const lines = entries.map(
      (e) => `
    <div class="terminal-line ${e.level}">
      <span class="terminal-time text-mono">${formatTime2(e.timestamp)}</span>
      <span class="terminal-source">${escapeHtml6(e.source)}</span>
      <span class="terminal-msg">${escapeHtml6(e.message)}</span>
    </div>
  `
    ).join("");
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
    entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return entries;
  }
  function formatTime2(iso) {
    try {
      return new Date(iso).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return "--:--:--";
    }
  }
  function escapeHtml6(s) {
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
  var init_Terminal = __esm({
    "src/web/hal-ui/components/Terminal.ts"() {
      "use strict";
      init_store();
    }
  });

  // src/web/hal-ui/views/Dashboard.ts
  async function renderDashboard(container) {
    const store = getStore();
    const layout = store.layout;
    injectSystemStatusStyles();
    injectLatestDecisionStyles();
    injectKpiStyles();
    injectHeroChartStyles();
    injectChartKitStyles();
    if (layout === "calm") {
      await renderCalmDashboard(container);
    } else if (layout === "operator") {
      await renderOperatorDashboard(container);
    } else {
      await renderDiagnosticDashboard(container);
    }
  }
  async function refreshDashboardLiveData() {
    const store = getStore();
    if (store.layout === "operator") {
      const kpiStrip = document.querySelector(".kpi-strip");
      if (kpiStrip) {
        kpiStrip.outerHTML = renderKpiStrip(await buildKpiData());
      }
      const operatorPanels = document.querySelector(".operator-panels");
      if (operatorPanels) {
        operatorPanels.outerHTML = await renderOperatorPanels();
        attachOperatorPanelHandlers();
      }
    }
    const statusPanel = document.querySelector(".sys-status-panel");
    if (statusPanel) {
      statusPanel.outerHTML = renderSystemStatus();
    }
    const latestDecision = document.querySelector(".latest-decision");
    if (latestDecision) {
      latestDecision.outerHTML = renderLatestDecision();
    }
    await loadDashboardHeroCard();
  }
  async function renderCalmDashboard(container) {
    const store = getStore();
    container.innerHTML = `
    <div class="dash-layout calm-layout">
      <div class="dash-main">
        ${renderOverviewBrandChip()}
        <div class="calm-hero">
          <div class="calm-status-row">
            ${renderCalmKpi("Temperature", getLatestTemp(), "\xB0C", "#F59E0B")}
            ${renderCalmKpi("Humidity", getLatestHum(), "%", "#38BDF8")}
            ${renderCalmKpi("Devices", store.devices.filter((d) => d.online).length, `/${store.devices.length}`, "var(--accent)")}
          </div>
        </div>

        <div id="dash-hero-card">
          <div class="chart-empty">Loading\u2026</div>
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
        ${renderSparklineSidebar()}
      </div>
    </div>
  `;
    injectDashboardStyles();
    await loadDashboardHeroCard();
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
    if (devices.length === 0)
      return '<p class="text-secondary text-sm">No active devices</p>';
    return devices.slice(0, 6).map(
      (d) => `
    <div class="calm-device-item ${d.online ? "online" : "offline"}">
      <span class="calm-device-dot"></span>
      <span class="calm-device-name">${escapeHtml7(d.name)}</span>
      <span class="calm-device-type text-xs text-secondary">${d.type}</span>
    </div>
  `
    ).join("");
  }
  function sortZonesDeterministically(zones2) {
    return zones2.slice().sort((a, b) => {
      if (a === "Unzoned") return 1;
      if (b === "Unzoned") return -1;
      return a.localeCompare(b, void 0, {
        numeric: true,
        sensitivity: "base"
      });
    });
  }
  function aggregateZoneOverviewCards(layers, zones2, unitSystem) {
    const zoneMetricBuckets = /* @__PURE__ */ new Map();
    for (const zone of zones2) {
      zoneMetricBuckets.set(
        zone,
        /* @__PURE__ */ new Map([
          ["temperature", /* @__PURE__ */ new Map()],
          ["humidity", /* @__PURE__ */ new Map()],
          ["co2", /* @__PURE__ */ new Map()]
        ])
      );
    }
    for (const layer of layers) {
      if (!zoneMetricBuckets.has(layer.zoneName)) continue;
      if (!OVERVIEW_METRIC_KEYS.includes(layer.metric))
        continue;
      const metricKey = layer.metric;
      const metricBuckets = zoneMetricBuckets.get(layer.zoneName).get(metricKey);
      for (const reading of layer.data) {
        const timestampMs = new Date(reading.timestamp).getTime();
        if (!Number.isFinite(timestampMs)) continue;
        const bucketTs = Math.floor(timestampMs / 6e4) * 6e4;
        const converted = formatSensorValue(
          reading.value,
          metricKey,
          unitSystem
        ).value;
        const current = metricBuckets.get(bucketTs) ?? { sum: 0, count: 0 };
        current.sum += converted;
        current.count += 1;
        metricBuckets.set(bucketTs, current);
      }
    }
    return zones2.map((zoneName) => {
      const zoneBuckets = zoneMetricBuckets.get(zoneName);
      const metrics2 = OVERVIEW_METRIC_KEYS.map((key) => {
        const cfg = DASH_METRIC_META[key];
        const dynamicUnit = formatSensorValue(0, key, unitSystem).unit;
        const entries = Array.from((zoneBuckets?.get(key) ?? /* @__PURE__ */ new Map()).entries()).sort((a, b) => a[0] - b[0]).map(([t, aggregate]) => ({
          t,
          v: aggregate.count > 0 ? aggregate.sum / aggregate.count : 0
        }));
        return {
          key,
          label: cfg.label,
          color: cfg.color,
          unit: key === "temperature" ? `\xB0${dynamicUnit}` : cfg.unit,
          data: entries
        };
      });
      return { zoneName, metrics: metrics2 };
    });
  }
  async function renderOperatorDashboard(container) {
    const store = getStore();
    container.innerHTML = `
    <div class="dash-layout">
      <div class="dash-main">
        ${renderOverviewBrandChip()}
        ${renderKpiStrip(await buildKpiData())}

        <div id="dash-hero-card">
          <div class="chart-empty">Loading sensor data\u2026</div>
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
    await loadDashboardHeroCard();
  }
  async function loadDashboardHeroCard() {
    const container = document.getElementById("dash-hero-card");
    if (!container) return;
    const sequence = ++dashLoadSequence;
    try {
      const { layers } = await loadHeroChartData();
      if (sequence !== dashLoadSequence) return;
      const store = getStore();
      const zones2 = sortZonesDeterministically([
        ...new Set(layers.map((l) => l.zoneName).filter(Boolean))
      ]);
      if (zones2.length === 0) {
        const inferredZones = /* @__PURE__ */ new Set();
        for (const device of store.devices.filter((d) => d.type === "sensor")) {
          if (device.id.startsWith("tent_a_")) inferredZones.add("Tent A");
          if (device.id.startsWith("tent_b_")) inferredZones.add("Tent B");
        }
        if (inferredZones.size > 0) {
          zones2.push(...sortZonesDeterministically(Array.from(inferredZones)));
        }
      }
      const zoneCards = aggregateZoneOverviewCards(
        layers,
        zones2,
        store.unitSystem
      );
      if (dashActiveZone && !zoneCards.some((z) => z.zoneName === dashActiveZone)) {
        dashActiveZone = "";
      }
      const availableMetricKeys = new Set(
        zoneCards.flatMap((zone) => zone.metrics).filter((metric) => metric.data.length > 0).map((metric) => metric.key).filter(
          (key) => OVERVIEW_METRIC_KEYS.includes(key)
        )
      );
      const fallbackMetric = OVERVIEW_METRIC_KEYS.find((key) => availableMetricKeys.has(key)) ?? Array.from(availableMetricKeys)[0];
      for (const key of Array.from(dashActiveMetrics)) {
        if (!availableMetricKeys.has(key)) {
          dashActiveMetrics.delete(key);
        }
      }
      if (dashActiveMetrics.size === 0 && fallbackMetric) {
        dashActiveMetrics.add(fallbackMetric);
      }
      if (sequence !== dashLoadSequence) return;
      renderOverviewEnvironmentHero(zoneCards, "dash-hero-card", {
        activeKeys: new Set(dashActiveMetrics),
        activeZone: dashActiveZone,
        onMetricToggle: (key) => {
          if (!availableMetricKeys.has(key)) return;
          const currentlyActive = Array.from(dashActiveMetrics).filter(
            (metricKey) => availableMetricKeys.has(metricKey)
          );
          if (dashActiveMetrics.has(key)) {
            if (currentlyActive.length <= 1) return;
            dashActiveMetrics.delete(key);
          } else {
            dashActiveMetrics.add(key);
          }
          void loadDashboardHeroCard();
        },
        onZoneSelect: (zoneName) => {
          dashActiveZone = zoneName;
          void loadDashboardHeroCard();
        }
      });
    } catch (err) {
      if (sequence !== dashLoadSequence) return;
      console.error("Dashboard hero card load failed:", err);
      container.innerHTML = '<div class="chart-empty">Failed to load</div>';
    }
  }
  async function renderDiagnosticDashboard(container) {
    const store = getStore();
    container.innerHTML = `
    <div class="dash-layout diag-layout">
      <div class="dash-main">
        ${renderOverviewBrandChip()}
        ${renderKpiStrip(await buildKpiData())}

        <div id="dash-hero-card">
          <div class="chart-empty">Loading sensor data\u2026</div>
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
    await loadDashboardHeroCard();
  }
  function renderOverviewBrandChip() {
    return `
    <div class="dash-brand-chip" title="FF_SmartControl">
      <img class="dash-brand-logo" src="./ff_logo_svg.svg" alt="FF_SmartControl logo" />
      <span class="dash-brand-text dash-brand-text-long">FF_SmartControl</span>
      <span class="dash-brand-text dash-brand-text-short">FF_SmartControl</span>
    </div>
  `;
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
          <span class="text-sm font-semibold">${escapeHtml7(device?.name || deviceId)}</span>
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
  function renderSparklineSidebar() {
    const store = getStore();
    const sensors = store.devices.filter((d) => d.type === "sensor");
    const metrics2 = ["temperature", "humidity", "co2"];
    const metricColors = {
      temperature: "#F59E0B",
      humidity: "#38BDF8",
      co2: "#22C55E"
    };
    const sparklines = metrics2.map((m) => {
      const values = [];
      for (const s of sensors) {
        const snap = store.sensors[s.id];
        if (snap?.[m]?.value != null) values.push(snap[m].value);
      }
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const trend = Array.from(
        { length: 20 },
        (_, i) => avg + Math.sin(i * 0.5) * (avg * 0.1)
      );
      const spark = renderSparkline(trend, metricColors[m] || "#888", 120, 28);
      const label = m.charAt(0).toUpperCase() + m.slice(1);
      return `
      <div class="sparkline-row">
        <span class="sparkline-label" style="color:${metricColors[m]}">${label}</span>
        <span class="sparkline-wrap">${spark}</span>
      </div>`;
    }).join("");
    return `
    <div class="sidebar-sparklines hal-card">
      <div class="sidebar-sparklines-header">Live Trends</div>
      ${sparklines}
    </div>`;
  }
  function renderDiagnosticExtras(store) {
    const sensors = store.devices.filter((d) => d.type === "sensor");
    const relays = store.devices.filter(
      (d) => d.type === "relay" || d.type === "smart_plug"
    );
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
          <span class="text-mono text-xs" style="color:var(--accent)">${store.layout}</span>
        </div>
      </div>
    </div>
  `;
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
  function renderDeviceGrid(devices) {
    if (devices.length === 0) {
      return '<div class="empty-state"><p>No devices registered</p></div>';
    }
    return devices.map(
      (d) => `
    <div class="device-mini-card ${d.online ? "online" : "offline"}" data-device-id="${d.id}">
      <div class="device-mini-icon">${deviceIcon(d.type)}</div>
      <div class="device-mini-info">
        <div class="device-mini-name">${escapeHtml7(d.name)}</div>
        <div class="device-mini-meta text-xs text-secondary">${d.protocol} \xB7 ${d.online ? "online" : "offline"}</div>
      </div>
      ${d.type === "relay" || d.type === "smart_plug" ? `
        <div class="device-mini-state ${d.state === "on" ? "on" : ""}">
          ${d.state === "on" ? "ON" : "OFF"}
        </div>
      ` : ""}
    </div>
  `
    ).join("");
  }
  function renderRecentDecisions(decisions) {
    if (decisions.length === 0) {
      return '<div class="empty-state"><p>No decisions yet</p></div>';
    }
    return decisions.map(
      (d) => `
    <div class="decision-row ${d.status || "pending"}">
      <div class="decision-time text-mono text-xs text-secondary">${formatTime3(d.timestamp)}</div>
      <div class="decision-trigger text-sm">${escapeHtml7(d.trigger)}</div>
      <div class="decision-text text-sm font-semibold">${escapeHtml7(d.decision)}</div>
      <div class="decision-footer">
        <span class="decision-status ${d.status || "pending"}">${d.status || "pending"}</span>
        <span class="decision-confidence text-mono text-xs" style="color:${confidenceColor2(d.confidence)}">${(d.confidence * 100).toFixed(0)}%</span>
      </div>
    </div>
  `
    ).join("");
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
  function escapeHtml7(s) {
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
  grid-template-columns: minmax(0, 1fr) minmax(220px, 260px);
  align-items: stretch;
  gap: var(--space-3);
  min-height: 0;
}
.dash-main { 
  min-width: 0; 
  display: flex;
  flex-direction: column;
}
.dash-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}
.dash-brand-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 var(--space-3);
  padding: 3px 8px 3px 3px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-secondary) 88%, transparent);
  max-width: fit-content;
}
.dash-brand-logo {
  width: 16px;
  height: 16px;
  object-fit: contain;
  flex-shrink: 0;
}
.dash-brand-text {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary);
  white-space: nowrap;
  line-height: 1;
}
.dash-brand-text-short {
  display: none;
}

/* \u2500\u2500 CALM mode \u2500\u2500 */
.calm-layout { grid-template-columns: minmax(0, 1fr) minmax(200px, 240px); }
.calm-hero { margin-bottom: var(--space-3); }
.calm-status-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}
.calm-kpi {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  text-align: center;
  border-left: 3px solid var(--kpi-color);
}
.calm-kpi-value {
  display: block;
  font-size: 28px;
  font-weight: 600;
  color: var(--kpi-color);
  line-height: 1;
}
.calm-kpi-value small {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-left: 2px;
}
.calm-kpi-label {
  display: block;
  font-size: 10px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: var(--space-1);
}
.calm-chart { margin-bottom: var(--space-3); }
.calm-devices { margin-bottom: var(--space-3); }
.calm-device-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.calm-device-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.calm-device-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}
.calm-device-item.offline .calm-device-dot {
  background: var(--danger);
}
.calm-device-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
}
.calm-sidebar { gap: var(--space-2); }

/* \u2500\u2500 OPERATOR mode \u2500\u2500 */
.dash-hero-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  flex-wrap: wrap;
}
.dash-live-bar {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  align-items: center;
}
.live-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
}
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--live-color);
  box-shadow: 0 0 4px var(--live-color);
}
.live-label {
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-size: 9px;
}
.live-val {
  color: var(--live-color);
  font-size: 12px;
  font-weight: 600;
}
.dash-bottom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  grid-auto-rows: minmax(140px, auto);
  align-items: stretch;
  gap: var(--space-3);
  margin-top: var(--space-3);
}
.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  grid-auto-rows: minmax(80px, auto);
  align-items: stretch;
  gap: var(--space-1);
}
.device-mini-card {
  display: flex;
  align-items: stretch;
  gap: var(--space-2);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
  border-left: 2px solid var(--slate);
  min-height: 80px;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}
.device-mini-card:hover { border-color: var(--accent); }
.device-mini-card.online { border-left-color: var(--accent); }
.device-mini-card.offline { border-left-color: var(--danger); }
.device-mini-icon { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border)); border-radius: var(--radius-sm); padding: 2px 4px; }
.device-mini-name { font-size: 11px; font-weight: 500; }
.device-mini-meta { margin-top: 1px; font-size: 10px; }
.device-mini-state {
  margin-left: auto;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
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
  padding: var(--space-1) var(--space-2);
  margin-bottom: var(--space-1);
  border-left: 2px solid var(--slate);
}
.decision-row.success { border-left-color: var(--success); }
.decision-row.failure { border-left-color: var(--danger); }
.decision-row.pending { border-left-color: var(--warning); }
.decision-time { margin-bottom: 1px; font-size: 10px; }
.decision-trigger { color: var(--text-secondary); margin-bottom: 1px; font-size: 11px; }
.decision-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-1);
  padding-top: var(--space-1);
  border-top: 1px solid var(--border-subtle);
}
.decision-status {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 4px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}
.decision-status.success { background: color-mix(in srgb, var(--success) 20%, transparent); color: var(--success); }
.decision-status.failure { background: color-mix(in srgb, var(--danger) 20%, transparent); color: var(--danger); }
.decision-status.pending { background: color-mix(in srgb, var(--warning) 20%, transparent); color: var(--warning); }
.section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 var(--space-2);
}

/* \u2500\u2500 DIAGNOSTIC mode \u2500\u2500 */
.diag-layout { grid-template-columns: minmax(0, 1fr) minmax(220px, 260px); }
.diag-raw-data { margin: var(--space-3) 0; }
.diag-snapshot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  grid-auto-rows: minmax(80px, auto);
  align-items: stretch;
  gap: var(--space-2);
}
.diag-snapshot {
  padding: var(--space-2);
}
.diag-snapshot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-1);
  padding-bottom: var(--space-1);
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
  padding: var(--space-3);
}
.diag-extras-header {
  margin-bottom: var(--space-2);
}
.diag-extras-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.diag-extras-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.diag-extras-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.diag-extras-row:last-child { border-bottom: none; }

/* \u2500\u2500 Sparkline sidebar \u2500\u2500 */
.sidebar-sparklines { padding: var(--space-2); }
.sidebar-sparklines-header {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid var(--border-subtle);
}
.sparkline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--border-subtle);
}
.sparkline-row:last-child { border-bottom: none; }
.sparkline-label {
  font-size: 10px;
  font-weight: 600;
  min-width: 50px;
}
.sparkline-wrap {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

/* \u2500\u2500 Responsive \u2500\u2500 */
@media (max-width: 1279px) {
  .dash-layout, .calm-layout, .diag-layout { grid-template-columns: 1fr; }
  .dash-sidebar { flex-direction: row; flex-wrap: wrap; }
  .dash-sidebar > * { flex: 1 1 240px; min-width: 0; }
  .calm-status-row { grid-template-columns: repeat(3, 1fr); }
  .dash-brand-text-long { display: none; }
  .dash-brand-text-short { display: inline; }
}
@media (max-width: 767px) {
  .dash-hero-header { flex-direction: column; align-items: flex-start; }
  .dash-live-bar { gap: var(--space-2); }
  .calm-status-row { grid-template-columns: 1fr; }
  .dash-brand-chip { padding-right: 4px; }
  .dash-brand-text { display: none; }
  .dash-sidebar {
    flex-direction: column;
  }
  .dash-sidebar > * {
    flex: 1 1 auto;
  }
}
`;
    document.head.appendChild(style);
  }
  var dashActiveMetrics, dashActiveZone, dashLoadSequence, OVERVIEW_METRIC_KEYS, DASH_METRIC_META;
  var init_Dashboard = __esm({
    "src/web/hal-ui/views/Dashboard.ts"() {
      "use strict";
      init_store();
      init_SystemStatus();
      init_LatestDecision();
      init_KpiStrip();
      init_HeroChart();
      init_ChartKit();
      init_EnvironmentCharts();
      init_OperatorPanels();
      init_Terminal();
      dashActiveMetrics = /* @__PURE__ */ new Set(["temperature", "humidity", "co2"]);
      dashActiveZone = "";
      dashLoadSequence = 0;
      OVERVIEW_METRIC_KEYS = ["temperature", "humidity", "co2"];
      DASH_METRIC_META = {
        temperature: { label: "Temperature", color: "#F59E0B", unit: "\xB0C" },
        humidity: { label: "Humidity", color: "#38BDF8", unit: "%" },
        co2: { label: "CO\u2082", color: "#22C55E", unit: "ppm" },
        light: { label: "Light", color: "#FACC15", unit: "lux" },
        soil_moisture: { label: "Soil Moisture", color: "#EF4444", unit: "%" },
        water_level: { label: "Water Level", color: "#2563EB", unit: "%" },
        ph: { label: "pH", color: "#A855F7", unit: "" },
        weight: { label: "Weight", color: "#94A3B8", unit: "kg" }
      };
    }
  });

  // src/web/hal-ui/views/DiscoveryWizard.ts
  async function openDiscoveryWizard() {
    currentStep = 1;
    selectedProtocol = null;
    discoveredDevices = [];
    selectedDevices = [];
    isScanning = false;
    scanAbortController = null;
    scanTimeout = null;
    try {
      zones = await halApi.getZones();
    } catch {
      zones = [];
    }
    for (const p of PROTOCOLS) {
      if (p.id === "gpio") {
        try {
          const status = await halApi.getGpioStatus();
          p.available = status.available;
          if (!status.available) {
            p.unavailableReason = "pigpiod not running";
          }
        } catch {
          p.available = false;
          p.unavailableReason = "Unable to check GPIO";
        }
      }
    }
    renderWizard();
  }
  function closeWizard() {
    if (scanAbortController) {
      scanAbortController.abort();
      scanAbortController = null;
    }
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      scanTimeout = null;
    }
    if (wizardOverlay) {
      wizardOverlay.remove();
      wizardOverlay = null;
    }
    isScanning = false;
  }
  function renderWizard() {
    injectWizardStyles();
    closeWizard();
    wizardOverlay = document.createElement("div");
    wizardOverlay.id = "discovery-wizard-overlay";
    wizardOverlay.className = "dw-overlay";
    document.body.appendChild(wizardOverlay);
    const title = getStepTitle();
    const content = getStepContent();
    const actions = getStepActions();
    wizardOverlay.innerHTML = `
    <div class="dw-panel">
      <div class="dw-header">
        <div class="dw-header-title">
          <span class="dw-icon">${getStepIcon()}</span>
          <span>${title}</span>
        </div>
        <button class="dw-close" id="dw-close-btn" aria-label="Close">\xD7</button>
      </div>
      <div class="dw-progress">
        ${renderProgress()}
      </div>
      <div class="dw-body" id="dw-body">
        ${content}
      </div>
      <div class="dw-actions" id="dw-actions">
        ${actions}
      </div>
    </div>
  `;
    attachWizardHandlers();
  }
  function renderProgress() {
    const steps = [1, 2, 3, 4, 5];
    return steps.map((s) => {
      const active = s === currentStep;
      const done = s < currentStep;
      const cls = done ? "done" : active ? "active" : "";
      return `<div class="dw-step-dot ${cls}" data-step="${s}">
        <div class="dw-step-num">${done ? "\u2713" : s}</div>
      </div>`;
    }).join('<div class="dw-step-line"></div>');
  }
  function getStepTitle() {
    switch (currentStep) {
      case 1:
        return "Add Device";
      case 2:
        return selectedProtocol?.id === "serial" ? "Scanning Serial Ports\u2026" : "Scanning Network\u2026";
      case 3:
        return "Select Devices";
      case 4:
        return "Configure Devices";
      case 5:
        return "Confirm Setup";
    }
  }
  function getStepIcon() {
    switch (currentStep) {
      case 1:
        return "\u{1F50D}";
      case 2:
        return "\u23F3";
      case 3:
        return "\u2611\uFE0F";
      case 4:
        return "\u2699\uFE0F";
      case 5:
        return "\u2705";
    }
  }
  function getStepContent() {
    switch (currentStep) {
      case 1:
        return renderStep1_ProtocolSelect();
      case 2:
        return renderStep2_Scan();
      case 3:
        return renderStep3_DeviceList();
      case 4:
        return renderStep4_Assign();
      case 5:
        return renderStep5_Confirm();
    }
  }
  function getStepActions() {
    switch (currentStep) {
      case 1:
        return `<button class="dw-btn-secondary" id="dw-manual-btn">Add Manually</button>
              <button class="dw-btn-primary" id="dw-next-btn" disabled>Next</button>`;
      case 2:
        return `<button class="dw-btn-secondary" id="dw-cancel-scan-btn">Cancel</button>`;
      case 3:
        return `<button class="dw-btn-secondary" id="dw-back-btn">Back</button>
              <button class="dw-btn-primary" id="dw-next-btn" disabled>Next</button>`;
      case 4:
        return `<button class="dw-btn-secondary" id="dw-back-btn">Back</button>
              <button class="dw-btn-primary" id="dw-next-btn" disabled>Review</button>`;
      case 5:
        return `<button class="dw-btn-secondary" id="dw-back-btn">Back</button>
              <button class="dw-btn-primary dw-btn-success" id="dw-confirm-btn">Add Devices</button>`;
    }
  }
  function renderStep1_ProtocolSelect() {
    const protocolCards = PROTOCOLS.map((p) => {
      const disabled = p.available === false;
      return `
      <div class="dw-protocol-card ${selectedProtocol?.id === p.id ? "selected" : ""} ${disabled ? "disabled" : ""}"
           data-protocol="${p.id}" ${disabled ? 'aria-disabled="true"' : ""}>
        <div class="dw-protocol-icon">${p.icon}</div>
        <div class="dw-protocol-info">
          <div class="dw-protocol-label">${p.label}</div>
          <div class="dw-protocol-desc">${p.description}</div>
          ${disabled ? `<div class="dw-protocol-unavailable">${p.unavailableReason || "Unavailable"}</div>` : ""}
        </div>
      </div>
    `;
    }).join("");
    return `
    <div class="dw-step-content">
      <p class="dw-step-desc">Choose how you want to discover your devices.</p>
      <div class="dw-protocol-grid" id="dw-protocol-grid">
        ${protocolCards}
      </div>
    </div>
  `;
  }
  function renderStep2_Scan() {
    if (isScanning) {
      return `
      <div class="dw-step-content dw-scan-active">
        <div class="dw-scan-spinner">
          <div class="dw-spinner-ring"></div>
        </div>
        <p class="dw-scan-status" id="dw-scan-status">
          Scanning for ${selectedProtocol?.label} devices\u2026
        </p>
        <p class="dw-scan-substatus" id="dw-scan-substatus">
          This may take up to 30 seconds
        </p>
      </div>
    `;
    }
    if (discoveredDevices.length === 0) {
      return `
      <div class="dw-step-content dw-empty-state">
        <div class="dw-empty-icon">\u{1F4E1}</div>
        <p class="dw-empty-title">No devices found</p>
        <p class="dw-empty-desc">
          Check that your devices are powered on and connected, then try again.
        </p>
        <div class="dw-empty-actions">
          <button class="dw-btn-primary" id="dw-retry-scan-btn">Retry</button>
          <button class="dw-btn-secondary" id="dw-empty-add-manual-btn">Add Manually</button>
        </div>
      </div>
    `;
    }
    return "";
  }
  function startScan() {
    isScanning = true;
    currentStep = 2;
    renderWizard();
    scanAbortController = new AbortController();
    scanTimeout = setTimeout(() => {
      scanAbortController?.abort();
    }, 3e4);
    performScan().finally(() => {
      isScanning = false;
      if (scanTimeout) {
        clearTimeout(scanTimeout);
        scanTimeout = null;
      }
    });
  }
  async function performScan() {
    if (!selectedProtocol) return;
    const protocol = selectedProtocol.id;
    const statusEl = document.getElementById("dw-scan-status");
    const substatusEl = document.getElementById("dw-scan-substatus");
    try {
      if (protocol === "gpio") {
        updateScanStatus("Checking GPIO pins\u2026", "");
        const { pins } = await halApi.getGpioPins();
        const available = pins.filter((p) => p.state === "available");
        discoveredDevices = available.map((p) => ({
          host: String(p.bcm),
          protocol: "gpio",
          type: "relay",
          label: `GPIO ${p.bcm}`,
          online: true
        }));
      } else if (protocol === "mqtt") {
        updateScanStatus(
          "Subscribing to MQTT topics\u2026",
          "Listening for homeassistant/+/+ and tele/+/SENSOR"
        );
        const result = await halApi.getMqttDevices();
        discoveredDevices = result.devices;
      } else if (protocol === "http_tasmota") {
        updateScanStatus(
          "Scanning network for Tasmota devices\u2026",
          "Pinging subnet\u2026"
        );
        const result = await halApi.scanHttpDevices({ protocol: "tasmota" });
        discoveredDevices = result.devices;
      } else if (protocol === "http_shelly") {
        updateScanStatus(
          "Scanning network for Shelly devices\u2026",
          "Pinging subnet\u2026"
        );
        const result = await halApi.scanHttpDevices({ protocol: "shelly" });
        discoveredDevices = result.devices;
      } else if (protocol === "serial") {
        updateScanStatus("Enumerating serial ports\u2026", "");
        const { ports } = await halApi.getSerialPorts();
        const probed = [];
        for (const port of ports) {
          try {
            const probe = await halApi.probeSerialPort(port.path);
            if (probe.detected) {
              probed.push({
                host: port.path,
                port: port.path,
                protocol: "serial",
                type: "sensor",
                label: probe.label || port.path,
                online: true
              });
            }
          } catch {
          }
        }
        discoveredDevices = probed;
      }
    } catch (err) {
      console.error("Scan error:", err);
      discoveredDevices = [];
    }
    if (discoveredDevices.length === 0) {
      renderWizard();
    } else {
      currentStep = 3;
      renderWizard();
    }
  }
  function updateScanStatus(status, substatus) {
    const statusEl = document.getElementById("dw-scan-status");
    const substatusEl = document.getElementById("dw-scan-substatus");
    if (statusEl) statusEl.textContent = status;
    if (substatusEl) substatusEl.textContent = substatus;
  }
  function renderStep3_DeviceList() {
    const deviceRows = discoveredDevices.map(
      (d, i) => `
    <div class="dw-device-row ${d.selected ? "selected" : ""}" data-index="${i}">
      <label class="dw-device-checkbox">
        <input type="checkbox" ${d.selected ? "checked" : ""} data-device-index="${i}">
        <span class="dw-device-checkmark"></span>
      </label>
      <div class="dw-device-info">
        <div class="dw-device-name">${escapeHtml8(d.label)}</div>
        <div class="dw-device-meta">
          ${d.host} \xB7 ${d.protocol} \xB7 ${d.type}
        </div>
      </div>
      <div class="dw-device-status ${d.online ? "online" : "offline"}">
        ${d.online ? "Online" : "Offline"}
      </div>
    </div>
  `
    ).join("");
    return `
    <div class="dw-step-content">
      <p class="dw-step-desc">
        ${discoveredDevices.length} device${discoveredDevices.length !== 1 ? "s" : ""} found.
        Select the devices you want to add.
      </p>
      <div class="dw-device-list">
        ${deviceRows}
      </div>
      ${discoveredDevices.length === 0 ? `
        <div class="dw-empty-state">
          <div class="dw-empty-icon">\u{1F4E1}</div>
          <p class="dw-empty-title">No devices found</p>
          <p class="dw-empty-desc">Check that your devices are powered on and connected.</p>
        </div>
      ` : ""}
    </div>
  `;
  }
  function renderStep4_Assign() {
    const zoneOptions = zones.map(
      (z) => `<option value="${escapeHtml8(z.name)}">${escapeHtml8(z.name)} (${z.deviceCount})</option>`
    ).join("");
    const roleOptions = `
    <option value="sensor">Sensor</option>
    <option value="relay">Relay</option>
    <option value="camera">Camera</option>
    <option value="smart_plug">Smart Plug</option>
  `;
    const deviceRows = selectedDevices.map(
      (d, i) => `
    <div class="dw-assign-row">
      <div class="dw-assign-device-info">
        <div class="dw-assign-device-name">${escapeHtml8(d.label)}</div>
        <div class="dw-assign-device-meta">${d.protocol} \xB7 ${d.type}</div>
      </div>
      <div class="dw-assign-form">
        <input class="dw-input" type="text"
          id="dw-name-${i}"
          value="${escapeHtml8(d.label || "")}"
          placeholder="Device name (1-64 chars)"
          maxlength="64" data-index="${i}" data-field="name">
        <select class="dw-select" id="dw-zone-${i}" data-index="${i}" data-field="zone">
          <option value="">No Zone</option>
          ${zoneOptions}
        </select>
        <select class="dw-select" id="dw-role-${i}" data-index="${i}" data-field="role">
          ${roleOptions}
        </select>
      </div>
    </div>
  `
    ).join("");
    return `
    <div class="dw-step-content">
      <p class="dw-step-desc">
        Configure ${selectedDevices.length} device${selectedDevices.length !== 1 ? "s" : ""}.
        Set a name, assign a zone, and choose the device role.
      </p>
      <div class="dw-assign-list">
        ${deviceRows}
      </div>
    </div>
  `;
  }
  function renderStep5_Confirm() {
    const rows = selectedDevices.map(
      (d) => `
    <div class="dw-confirm-row">
      <div class="dw-confirm-name">${escapeHtml8(d.label || d.name || d.host)}</div>
      <div class="dw-confirm-meta">
        ${d.zone ? `<span class="dw-zone-tag">${escapeHtml8(d.zone)}</span>` : ""}
        <span class="dw-protocol-badge">${d.protocol}</span>
        <span class="dw-role-badge">${d.role || d.type}</span>
      </div>
    </div>
  `
    ).join("");
    return `
    <div class="dw-step-content">
      <p class="dw-step-desc">
        Ready to add ${selectedDevices.length} device${selectedDevices.length !== 1 ? "s" : ""} to your farm.
        Review the details below and click "Add Devices" to complete setup.
      </p>
      <div class="dw-confirm-list">
        ${rows}
      </div>
    </div>
  `;
  }
  function attachWizardHandlers() {
    const overlay = document.getElementById("discovery-wizard-overlay");
    if (!overlay) return;
    overlay.querySelector("#dw-close-btn")?.addEventListener("click", closeWizard);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeWizard();
    });
    if (currentStep === 1) {
      attachStep1Handlers();
    } else if (currentStep === 2) {
      attachStep2Handlers();
    } else if (currentStep === 3) {
      attachStep3Handlers();
    } else if (currentStep === 4) {
      attachStep4Handlers();
    } else if (currentStep === 5) {
      attachStep5Handlers();
    }
  }
  function attachStep1Handlers() {
    const overlay = document.getElementById("discovery-wizard-overlay");
    if (!overlay) return;
    overlay.querySelectorAll(".dw-protocol-card:not(.disabled)").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.protocol;
        selectedProtocol = PROTOCOLS.find((p) => p.id === id) || null;
        const nextBtn = document.getElementById(
          "dw-next-btn"
        );
        if (nextBtn) nextBtn.disabled = !selectedProtocol;
        overlay.querySelectorAll(".dw-protocol-card").forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
      });
    });
    overlay.querySelector("#dw-next-btn")?.addEventListener("click", () => {
      if (!selectedProtocol) return;
      startScan();
    });
    overlay.querySelector("#dw-manual-btn")?.addEventListener("click", () => {
      openManualAdd();
    });
  }
  function attachStep2Handlers() {
    const overlay = document.getElementById("discovery-wizard-overlay");
    if (!overlay) return;
    overlay.querySelector("#dw-cancel-scan-btn")?.addEventListener("click", () => {
      scanAbortController?.abort();
      isScanning = false;
      currentStep = 1;
      renderWizard();
    });
    overlay.querySelector("#dw-retry-scan-btn")?.addEventListener("click", () => {
      startScan();
    });
    overlay.querySelector("#dw-empty-add-manual-btn")?.addEventListener("click", () => {
      openManualAdd();
    });
  }
  function attachStep3Handlers() {
    const overlay = document.getElementById("discovery-wizard-overlay");
    if (!overlay) return;
    overlay.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        const idx = parseInt(cb.dataset.deviceIndex || "0");
        discoveredDevices[idx].selected = cb.checked;
        updateSelectedDevices();
        updateNextButtonState();
        const row = overlay.querySelector(`[data-index="${idx}"]`);
        if (row)
          row.classList.toggle("selected", cb.checked);
      });
    });
    overlay.querySelector("#dw-back-btn")?.addEventListener("click", () => {
      currentStep = 1;
      renderWizard();
    });
    overlay.querySelector("#dw-next-btn")?.addEventListener("click", () => {
      if (selectedDevices.length === 0) return;
      currentStep = 4;
      renderWizard();
    });
    updateNextButtonState();
  }
  function attachStep4Handlers() {
    const overlay = document.getElementById("discovery-wizard-overlay");
    if (!overlay) return;
    overlay.querySelectorAll(".dw-input, .dw-select").forEach((el) => {
      el.addEventListener("input", () => {
        const idx = parseInt(el.dataset.index || "0");
        const field = el.dataset.field;
        const val = el.value;
        if (selectedDevices[idx]) {
          selectedDevices[idx][field] = val;
        }
        updateNextButtonState();
      });
    });
    overlay.querySelector("#dw-back-btn")?.addEventListener("click", () => {
      currentStep = 3;
      renderWizard();
    });
    overlay.querySelector("#dw-next-btn")?.addEventListener("click", () => {
      currentStep = 5;
      renderWizard();
    });
    updateNextButtonState();
  }
  function attachStep5Handlers() {
    const overlay = document.getElementById("discovery-wizard-overlay");
    if (!overlay) return;
    overlay.querySelector("#dw-back-btn")?.addEventListener("click", () => {
      currentStep = 4;
      renderWizard();
    });
    overlay.querySelector("#dw-confirm-btn")?.addEventListener("click", async () => {
      await confirmRegistration();
    });
  }
  function updateSelectedDevices() {
    selectedDevices = discoveredDevices.filter((d) => d.selected);
  }
  function updateNextButtonState() {
    const overlay = document.getElementById("discovery-wizard-overlay");
    if (!overlay) return;
    const nextBtn = overlay.querySelector(
      "#dw-next-btn"
    );
    if (!nextBtn) return;
    if (currentStep === 3) {
      nextBtn.disabled = selectedDevices.length === 0;
    } else if (currentStep === 4) {
      const namesValid = selectedDevices.every((d) => {
        const name = d.label || d.name || "";
        return name.length >= 1 && name.length <= 64;
      });
      nextBtn.disabled = !namesValid;
    }
  }
  async function confirmRegistration() {
    const overlay = document.getElementById("discovery-wizard-overlay");
    const confirmBtn = overlay?.querySelector(
      "#dw-confirm-btn"
    );
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Adding\u2026";
    }
    const added = [];
    const errors = [];
    for (const device of selectedDevices) {
      try {
        const name = device.label || device.name || device.host;
        const protocol = device.protocol;
        const type = device.role || device.type;
        const zone = device.zone;
        let dev;
        if (protocol === "gpio") {
          dev = await halApi.registerGpioDevice({
            bcmPin: parseInt(device.host),
            label: name,
            zone: zone || void 0
          });
        } else if (protocol === "mqtt") {
          dev = await halApi.registerMqttDevice({
            topic: device.host,
            label: name,
            type,
            zone: zone || void 0
          });
        } else if (protocol === "http_tasmota" || protocol === "http_shelly") {
          dev = await halApi.registerHttpDevice({
            host: device.host,
            protocol: protocol === "http_tasmota" ? "tasmota" : "shelly",
            type,
            label: name,
            zone: zone || void 0
          });
        } else if (protocol === "serial") {
          dev = await halApi.registerSerialDevice({
            port: device.host,
            type,
            label: name,
            zone: zone || void 0
          });
        } else {
          dev = await halApi.manualAddDevice({
            host: device.host,
            protocol,
            type,
            label: name,
            zone: zone || void 0
          });
        }
        added.push(dev);
      } catch (err) {
        errors.push(`${device.label}: ${err.message}`);
      }
    }
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Add Devices";
    }
    if (added.length > 0) {
      showToast(
        `${added.length} device${added.length !== 1 ? "s" : ""} added successfully`,
        "success"
      );
      const { refreshHALData: refreshHALData2 } = await Promise.resolve().then(() => (init_main(), main_exports));
      refreshHALData2();
      closeWizard();
    } else if (errors.length > 0) {
      showToast(`Failed to add devices: ${errors.join("; ")}`, "danger");
    }
  }
  function openManualAdd() {
    const overlay = document.getElementById("discovery-wizard-overlay");
    if (!overlay) return;
    const panel = overlay.querySelector(".dw-panel");
    if (!panel) return;
    const bodyEl = document.getElementById("dw-body");
    const actionsEl = document.getElementById("dw-actions");
    if (bodyEl) {
      bodyEl.innerHTML = renderManualAddForm();
    }
    if (actionsEl) {
      actionsEl.innerHTML = `
      <button class="dw-btn-secondary" id="dw-cancel-manual-btn">Cancel</button>
      <button class="dw-btn-primary" id="dw-save-manual-btn" disabled>Add Device</button>
    `;
    }
    attachManualAddHandlers();
  }
  function renderManualAddForm() {
    const zoneOptions = zones.map(
      (z) => `<option value="${escapeHtml8(z.name)}">${escapeHtml8(z.name)}</option>`
    ).join("");
    return `
    <div class="dw-step-content">
      <p class="dw-step-desc">
        Enter your device details manually. FF_SmartControl will verify connectivity before saving.
      </p>
      <div class="dw-manual-form">
        <div class="dw-form-group">
          <label class="dw-label">Host / IP Address *</label>
          <input class="dw-input" type="text" id="ma-host" placeholder="192.168.1.100" required>
        </div>
        <div class="dw-form-group">
          <label class="dw-label">Protocol *</label>
          <select class="dw-select" id="ma-protocol">
            <option value="tasmota">HTTP / Tasmota</option>
            <option value="shelly">HTTP / Shelly</option>
            <option value="mqtt">MQTT</option>
            <option value="gpio">GPIO</option>
            <option value="serial">Serial</option>
          </select>
        </div>
        <div class="dw-form-group">
          <label class="dw-label">Device Type</label>
          <select class="dw-select" id="ma-type">
            <option value="sensor">Sensor</option>
            <option value="relay">Relay</option>
            <option value="camera">Camera</option>
            <option value="smart_plug">Smart Plug</option>
          </select>
        </div>
        <div class="dw-form-group">
          <label class="dw-label">Device Name</label>
          <input class="dw-input" type="text" id="ma-name" placeholder="My Sensor" maxlength="64">
        </div>
        <div class="dw-form-group">
          <label class="dw-label">Zone</label>
          <select class="dw-select" id="ma-zone">
            <option value="">No Zone</option>
            ${zoneOptions}
          </select>
        </div>
        <div class="dw-form-validation" id="ma-validation"></div>
      </div>
    </div>
  `;
  }
  function attachManualAddHandlers() {
    const overlay = document.getElementById("discovery-wizard-overlay");
    if (!overlay) return;
    overlay.querySelector("#dw-cancel-manual-btn")?.addEventListener("click", () => {
      currentStep = 1;
      selectedProtocol = null;
      renderWizard();
    });
    const hostInput = overlay.querySelector(
      "#ma-host"
    );
    const protocolSelect = overlay.querySelector(
      "#ma-protocol"
    );
    const saveBtn = overlay.querySelector(
      "#dw-save-manual-btn"
    );
    function validateManualForm() {
      if (saveBtn) saveBtn.disabled = !hostInput?.value.trim();
    }
    hostInput?.addEventListener("input", validateManualForm);
    protocolSelect?.addEventListener("change", validateManualForm);
    saveBtn?.addEventListener("click", async () => {
      if (!hostInput?.value.trim()) return;
      const validationEl = document.getElementById("ma-validation");
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Checking\u2026";
      }
      if (validationEl) validationEl.textContent = "Checking connectivity\u2026";
      try {
        const dev = await halApi.manualAddDevice({
          host: hostInput.value.trim(),
          protocol: protocolSelect?.value || "tasmota",
          type: overlay.querySelector("#ma-type")?.value || "sensor",
          label: overlay.querySelector("#ma-name")?.value || void 0,
          zone: overlay.querySelector("#ma-zone")?.value || void 0
        });
        showToast(`Device "${dev.name}" added successfully`, "success");
        const { refreshHALData: refreshHALData2 } = await Promise.resolve().then(() => (init_main(), main_exports));
        refreshHALData2();
        closeWizard();
      } catch (err) {
        if (validationEl)
          validationEl.innerHTML = `<span class="dw-validation-error">${escapeHtml8(err.message)}</span>`;
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Add Device";
        }
      }
    });
  }
  function injectWizardStyles() {
    if (document.getElementById("dw-styles")) return;
    const style = document.createElement("style");
    style.id = "dw-styles";
    style.textContent = `
.dw-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  animation: dw-fade-in 150ms ease;
}
.dw-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: dw-slide-up 150ms ease;
}
.dw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.dw-header-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.dw-icon { font-size: 20px; }
.dw-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.dw-close:hover { color: var(--text-primary); }
.dw-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3) var(--space-4);
  gap: 0;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.dw-step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 2px solid var(--border);
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  transition: all 200ms ease;
}
.dw-step-dot.active {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}
.dw-step-dot.done {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg-primary);
}
.dw-step-line {
  flex: 1;
  height: 2px;
  background: var(--border);
  min-width: 20px;
}
.dw-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}
.dw-step-content { }
.dw-step-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: var(--space-4);
}
.dw-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  padding: var(--space-4);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.dw-btn-primary {
  background: var(--accent);
  color: var(--text-primary);
  border: none;
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-4);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 150ms;
}
.dw-btn-primary:hover:not(:disabled) { opacity: 0.85; }
.dw-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.dw-btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-4);
  font-size: 14px;
  cursor: pointer;
}
.dw-btn-secondary:hover { border-color: var(--accent); color: var(--text-primary); }
.dw-btn-success {
  background: var(--success);
}
.dw-protocol-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.dw-protocol-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 150ms, background 150ms;
}
.dw-protocol-card:hover:not(.disabled) { border-color: var(--accent); }
.dw-protocol-card.selected { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
.dw-protocol-card.disabled { opacity: 0.5; cursor: not-allowed; }
.dw-protocol-icon { font-size: 24px; flex-shrink: 0; }
.dw-protocol-label { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.dw-protocol-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.dw-protocol-unavailable { font-size: 11px; color: var(--warning); margin-top: 4px; }
.dw-scan-active { text-align: center; padding: var(--space-6) 0; }
.dw-scan-spinner { margin-bottom: var(--space-4); }
.dw-spinner-ring {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: dw-spin 0.8s linear infinite;
  margin: 0 auto;
}
@keyframes dw-spin { to { transform: rotate(360deg); } }
.dw-scan-status { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.dw-scan-substatus { font-size: 12px; color: var(--text-secondary); margin-top: var(--space-1); }
.dw-empty-state { text-align: center; padding: var(--space-6) 0; }
.dw-empty-icon { font-size: 48px; margin-bottom: var(--space-3); }
.dw-empty-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: var(--space-2); }
.dw-empty-desc { font-size: 14px; color: var(--text-secondary); margin-bottom: var(--space-4); }
.dw-empty-actions { display: flex; gap: var(--space-2); justify-content: center; flex-wrap: wrap; }
.dw-device-list { display: flex; flex-direction: column; gap: var(--space-2); }
.dw-device-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 150ms;
}
.dw-device-row:hover { border-color: var(--accent); }
.dw-device-row.selected { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
.dw-device-checkbox { display: flex; align-items: center; }
.dw-device-checkbox input { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
.dw-device-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.dw-device-meta { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.dw-device-status { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-pill); }
.dw-device-status.online { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
.dw-device-status.offline { background: color-mix(in srgb, var(--danger) 15%, transparent); color: var(--danger); }
.dw-assign-list { display: flex; flex-direction: column; gap: var(--space-3); }
.dw-assign-row {
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.dw-assign-device-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.dw-assign-device-meta { font-size: 12px; color: var(--text-secondary); margin-bottom: var(--space-2); }
.dw-assign-form { display: flex; flex-direction: column; gap: var(--space-2); }
.dw-input {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-3);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.dw-input:focus { border-color: var(--accent); }
.dw-select {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-3);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
}
.dw-select:focus { border-color: var(--accent); }
.dw-confirm-list { display: flex; flex-direction: column; gap: var(--space-2); }
.dw-confirm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.dw-confirm-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.dw-confirm-meta { display: flex; align-items: center; gap: var(--space-2); margin-top: 4px; }
.dw-zone-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  border-radius: var(--radius-pill);
  border: 1px solid var(--accent);
}
.dw-protocol-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.dw-role-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
}
.dw-manual-form { display: flex; flex-direction: column; gap: var(--space-3); }
.dw-form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.dw-label { font-size: 12px; font-weight: 500; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
.dw-form-validation { font-size: 13px; min-height: 20px; }
.dw-validation-error { color: var(--danger); }
@keyframes dw-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes dw-slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;
    document.head.appendChild(style);
  }
  function escapeHtml8(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var PROTOCOLS, currentStep, selectedProtocol, discoveredDevices, selectedDevices, zones, isScanning, scanAbortController, scanTimeout, wizardOverlay;
  var init_DiscoveryWizard = __esm({
    "src/web/hal-ui/views/DiscoveryWizard.ts"() {
      "use strict";
      init_api();
      init_Toast();
      PROTOCOLS = [
        {
          id: "gpio",
          label: "GPIO",
          description: "Raspberry Pi GPIO pins via pigpiod",
          icon: "\u{1F7E2}"
        },
        {
          id: "mqtt",
          label: "MQTT",
          description: "HomeAssistant or Tasmota MQTT discovery",
          icon: "\u{1F4E1}"
        },
        {
          id: "http_tasmota",
          label: "HTTP / Tasmota",
          description: "Tasmota HTTP devices on your network",
          icon: "\u{1F310}"
        },
        {
          id: "http_shelly",
          label: "HTTP / Shelly",
          description: "Shelly smart plugs on your network",
          icon: "\u{1F50C}"
        },
        {
          id: "serial",
          label: "Serial",
          description: "USB serial sensors (BME280, DS18B20, Atlas EZO)",
          icon: "\u{1F517}"
        }
      ];
      currentStep = 1;
      selectedProtocol = null;
      discoveredDevices = [];
      selectedDevices = [];
      zones = [];
      isScanning = false;
      scanAbortController = null;
      scanTimeout = null;
      wizardOverlay = null;
    }
  });

  // src/web/hal-ui/views/Devices.ts
  var Devices_exports = {};
  __export(Devices_exports, {
    renderDevices: () => renderDevices
  });
  async function renderDevices(container) {
    const store = getStore();
    injectDevicesStyles();
    injectChartKitStyles();
    let zones2 = [];
    try {
      const allZones = await halApi.getZones();
      zones2 = allZones.filter((z) => z.id && z.id !== "_none");
    } catch {
    }
    const zoneOptions = zones2.map(
      (z) => `<option value="${escapeHtml9(z.name)}">${escapeHtml9(z.name)}</option>`
    ).join("");
    container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Devices</h1>
        <p class="page-subtitle">Manage farm hardware</p>
      </div>
      <div class="page-header-right">
        <button class="hal-btn-secondary" id="dw-graph-toggle-btn">
          <span>Graph</span>
        </button>
        <button class="hal-btn-primary" id="dw-add-device-btn">
          <span>+ Add Device</span>
        </button>
      </div>
    </div>

    <div class="devices-toolbar mb-4">
      <input class="hal-input" id="device-filter" type="text" placeholder="Filter devices..." />
      <select class="hal-input" id="device-type-filter">
        <option value="">All types</option>
        <option value="relay">Relays</option>
        <option value="sensor">Sensors</option>
        <option value="camera">Cameras</option>
      </select>
      <select class="hal-input" id="device-zone-filter">
        <option value="">All zones</option>
        ${zoneOptions}
      </select>
      <select class="hal-input" id="device-status-filter">
        <option value="">All status</option>
        <option value="online">Online</option>
        <option value="offline">Offline</option>
      </select>
    </div>

    <div id="devices-graph-container" style="display:none" class="mb-4"></div>
    <div id="devices-grid" class="grid-3">
      ${renderDeviceCards(store.devices)}
    </div>
  `;
    attachDevicesHandlers();
    renderDeviceCharts(store.devices);
  }
  function renderDeviceCharts(devices) {
    const sensors = devices.filter((d) => d.type === "sensor");
    if (sensors.length === 0) return;
    const store = getStore();
    const tempSensors = [];
    const humSensors = [];
    for (const s of sensors) {
      const snap = store.sensors[s.id];
      if (snap?.temperature?.value != null) tempSensors.push(s);
      else if (snap?.humidity?.value != null) humSensors.push(s);
    }
    const tempShades = generateDeviceShades("#F59E0B", tempSensors.length);
    const humShades = generateDeviceShades("#38BDF8", humSensors.length);
    for (const s of sensors) {
      const chartId = `dev-chart-${s.id}`;
      const container = document.getElementById(chartId);
      if (!container) continue;
      const snap = store.sensors[s.id];
      if (!snap) continue;
      const values = [];
      if (snap.temperature?.value != null) values.push(snap.temperature.value);
      if (snap.humidity?.value != null) values.push(snap.humidity.value);
      if (values.length === 0) {
        container.innerHTML = '<span class="text-xs text-secondary">No data</span>';
        continue;
      }
      const base = values[0];
      const trend = Array.from(
        { length: 15 },
        (_, i) => base + Math.sin(i * 0.8) * (base * 0.05)
      );
      let color;
      if (snap.temperature?.value != null) {
        const idx = tempSensors.indexOf(s);
        color = idx >= 0 ? tempShades[idx] : "#F59E0B";
      } else {
        const idx = humSensors.indexOf(s);
        color = idx >= 0 ? humShades[idx] : "#38BDF8";
      }
      renderTinyAreaChart(trend, color, chartId);
    }
  }
  function renderDeviceCards(devices) {
    if (devices.length === 0) {
      return `<div class="empty-state col-span-3"><p class="empty-state-title">No devices registered</p><p class="empty-state-desc">Devices will appear here once discovered.</p></div>`;
    }
    return devices.map((d) => {
      const state2 = d.online ? "online" : "offline";
      const chartId = `dev-chart-${d.id}`;
      const zone = d.zone;
      const safeState = d.safe_state;
      const description = d.controlled_device_description;
      return `
      <div class="device-card hal-card" data-device-id="${d.id}" style="border-left: 3px solid ${state2 === "online" ? "var(--accent)" : "var(--danger)"}">
        <div class="device-card-header">
          <div class="device-card-icon">${deviceIcon2(d.type)}</div>
          <div class="device-card-title" id="dev-name-${d.id}">${escapeHtml9(d.name)}</div>
          <span class="hal-badge hal-badge-slate">${d.protocol}</span>
          <button class="device-rename-btn" data-device-id="${d.id}" title="Rename device">\u270F\uFE0F</button>
        </div>
        <div class="device-card-meta">
          <span class="text-xs text-secondary">${d.type} \xB7 ${state2}</span>
          ${zone ? `<span class="device-zone-tag">${escapeHtml9(zone)}</span>` : ""}
          ${d.lastSeen ? `<span class="text-xs text-mono text-secondary">${formatRelativeTime(d.lastSeen)}</span>` : ""}
        </div>
        ${description ? `<div class="device-description text-xs text-secondary">${escapeHtml9(description)}</div>` : ""}
        ${d.type === "sensor" ? `<div class="device-chart-wrap" id="${chartId}"></div>` : ""}
        ${d.type === "relay" ? `
          <div class="device-card-relay-info">
            <span class="text-xs text-secondary">Safe state:</span>
            <span class="relay-safe-state text-xs" data-device-id="${d.id}">${safeState || "off"}</span>
          </div>
          <div class="device-card-control">
            <span class="text-xs text-secondary">Power</span>
            <div id="toggle-${d.id}" class="device-toggle" ${!d.online ? 'data-offline="true" title="Offline - cannot toggle"' : ""}></div>
          </div>
        ` : ""}
      </div>
    `;
    }).join("");
  }
  function attachDevicesHandlers() {
    const filterInput = document.getElementById(
      "device-filter"
    );
    const typeSelect = document.getElementById(
      "device-type-filter"
    );
    const zoneSelect = document.getElementById(
      "device-zone-filter"
    );
    const statusSelect = document.getElementById(
      "device-status-filter"
    );
    document.getElementById("dw-add-device-btn")?.addEventListener("click", () => {
      openDiscoveryWizard();
    });
    let graphVisible = false;
    const graphBtn = document.getElementById("dw-graph-toggle-btn");
    const graphContainer = document.getElementById("devices-graph-container");
    const gridContainer = document.getElementById("devices-grid");
    graphBtn?.addEventListener("click", () => {
      graphVisible = !graphVisible;
      if (graphVisible) {
        graphBtn.classList.add("active");
        graphContainer.style.display = "";
        gridContainer.style.display = "none";
        renderForceGraph();
      } else {
        graphBtn.classList.remove("active");
        graphContainer.style.display = "none";
        gridContainer.style.display = "";
      }
    });
    function renderForceGraph() {
      if (!graphContainer) return;
      const store = getStore();
      const nodes = store.devices.map((d) => ({
        id: d.id,
        label: d.name,
        type: d.type,
        online: d.online,
        zone: d.zone
      }));
      const edges = [];
      const zoneGroups = /* @__PURE__ */ new Map();
      for (const d of store.devices) {
        const z = d.zone || "";
        const list = zoneGroups.get(z) ?? [];
        list.push(d.id);
        zoneGroups.set(z, list);
      }
      for (const [, ids] of zoneGroups) {
        for (let i = 0; i < ids.length - 1; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            edges.push({ source: ids[i], target: ids[j], kind: "zone" });
          }
        }
      }
      renderDeviceForceGraphSvg(nodes, edges, "devices-graph-container", (nodeId) => {
        gridContainer.style.display = "";
        graphBtn.classList.remove("active");
        graphContainer.style.display = "none";
        graphVisible = false;
        const card = document.querySelector(
          `.device-card[data-device-id="${CSS.escape(nodeId)}"]`
        );
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.style.outline = `2px solid var(--accent)`;
          setTimeout(() => {
            card.style.outline = "";
          }, 2e3);
        }
      });
    }
    function applyFilter() {
      const q = filterInput?.value.toLowerCase() || "";
      const type = typeSelect?.value || "";
      const zone = zoneSelect?.value || "";
      const status = statusSelect?.value || "";
      const store = getStore();
      const filtered = store.devices.filter((d) => {
        const matchQ = !q || d.name.toLowerCase().includes(q) || d.protocol.toLowerCase().includes(q);
        const matchType = !type || d.type === type;
        const matchZone = !zone || d.zone === zone;
        const matchStatus = !status || (status === "online" ? d.online : !d.online);
        return matchQ && matchType && matchZone && matchStatus;
      });
      const grid = document.getElementById("devices-grid");
      if (grid) grid.innerHTML = renderDeviceCards(filtered);
      attachToggleHandlers();
      attachRenameHandlers();
      renderDeviceCharts(filtered);
    }
    filterInput?.addEventListener("input", applyFilter);
    typeSelect?.addEventListener("change", applyFilter);
    zoneSelect?.addEventListener("change", applyFilter);
    statusSelect?.addEventListener("change", applyFilter);
    attachToggleHandlers();
    attachRenameHandlers();
  }
  function attachToggleHandlers() {
    const store = getStore();
    const relays = store.devices.filter((d) => d.type === "relay");
    relays.forEach((relay) => {
      const el = document.getElementById(`toggle-${relay.id}`);
      if (!el) return;
      if (!relay.online) {
        el.setAttribute("title", "Offline - cannot toggle");
        el.style.opacity = "0.5";
        el.style.cursor = "not-allowed";
        return;
      }
      const isOn = relay.state === "on";
      const toggle = createToggle(`toggle-${relay.id}`, isOn, async (on) => {
        const currentDevice = store.devices.find((d) => d.id === relay.id);
        if (!currentDevice?.online) {
          showToast(`Cannot toggle ${relay.name}: device is offline`, "danger");
          setToggleState(toggle, !on);
          return;
        }
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
  function attachRenameHandlers() {
    document.querySelectorAll(".device-rename-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const deviceId = btn.dataset.deviceId;
        if (!deviceId) return;
        startInlineRename(deviceId);
      });
    });
  }
  async function startInlineRename(deviceId) {
    const store = getStore();
    const device = store.devices.find((d) => d.id === deviceId);
    if (!device) return;
    const nameEl = document.getElementById(`dev-name-${deviceId}`);
    if (!nameEl) return;
    const currentName = device.name;
    let zones2 = [];
    try {
      const allZones = await halApi.getZones();
      zones2 = allZones.filter((z) => z.id && z.id !== "_none");
    } catch {
    }
    const zoneOptions = zones2.map((z) => {
      const selected = device.zone === z.name ? "selected" : "";
      return `<option value="${escapeHtml9(z.name)}" ${selected}>${escapeHtml9(z.name)}</option>`;
    }).join("");
    const currentZone = device.zone || "";
    nameEl.innerHTML = `
    <div class="inline-rename-form">
      <input class="dw-input inline-rename-input" type="text" id="rename-input-${deviceId}"
        value="${escapeHtml9(currentName)}" maxlength="64" placeholder="Device name">
      <select class="dw-select inline-rename-zone" id="rename-zone-${deviceId}">
        <option value="">No Zone</option>
        ${zoneOptions}
      </select>
      <button class="inline-rename-save" id="rename-save-${deviceId}">Save</button>
      <button class="inline-rename-cancel" id="rename-cancel-${deviceId}">Cancel</button>
    </div>
  `;
    const inputEl = document.getElementById(
      `rename-input-${deviceId}`
    );
    inputEl?.focus();
    inputEl?.select();
    document.getElementById(`rename-save-${deviceId}`)?.addEventListener("click", async () => {
      const newName = inputEl?.value.trim() || currentName;
      const newZone = document.getElementById(
        `rename-zone-${deviceId}`
      )?.value || "";
      try {
        await halApi.updateDevice(deviceId, {
          label: newName,
          zone: newZone || void 0
        });
        showToast(`Device renamed to "${newName}"`, "success");
        const { refreshHALData: refreshHALData2 } = await Promise.resolve().then(() => (init_main(), main_exports));
        refreshHALData2();
        const container = document.getElementById("view-container");
        if (container) {
          const { renderDevices: renderDevices2 } = await Promise.resolve().then(() => (init_Devices(), Devices_exports));
          renderDevices2(container);
        }
      } catch (err) {
        showToast(`Rename failed: ${err.message}`, "danger");
      }
    });
    document.getElementById(`rename-cancel-${deviceId}`)?.addEventListener("click", () => {
      nameEl.textContent = currentName;
    });
    inputEl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        document.getElementById(`rename-save-${deviceId}`)?.dispatchEvent(new Event("click"));
      } else if (e.key === "Escape") {
        nameEl.textContent = currentName;
      }
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
  function escapeHtml9(s) {
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
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}
.page-header-left { flex: 1; }
.page-header-right { display: flex; gap: var(--space-2); flex-shrink: 0; }
.hal-btn-primary {
  background: var(--accent);
  color: var(--text-primary);
  border: none;
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-4);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 150ms;
}
.hal-btn-primary:hover { opacity: 0.85; }
.hal-btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-4);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 150ms;
}
.hal-btn-secondary:hover { border-color: var(--accent); color: var(--text-primary); }
.hal-btn-secondary.active { background: var(--accent); color: var(--text-primary); border-color: var(--accent); }
.devices-toolbar {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
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
.device-card-title { flex: 1; font-size: 14px; font-weight: 600; min-width: 0; }
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
  flex-wrap: wrap;
  gap: var(--space-1);
}
.device-description {
  margin-bottom: var(--space-2);
  padding: var(--space-1) var(--space-2);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border-radius: var(--radius-sm);
  border-left: 2px solid var(--accent);
  color: var(--text-secondary);
}
.device-card-relay-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  padding: var(--space-1) var(--space-2);
  background: color-mix(in srgb, var(--warning, #D29922) 10%, transparent);
  border-radius: var(--radius-sm);
}
.relay-safe-state {
  font-weight: 600;
  color: var(--warning, #D29922);
  text-transform: uppercase;
}
.device-zone-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: var(--radius-pill);
}
.device-rename-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  opacity: 0.5;
  transition: opacity 150ms;
  flex-shrink: 0;
}
.device-rename-btn:hover { opacity: 1; }
.device-card-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-2);
  border-top: 1px solid var(--border);
}
.col-span-3 { grid-column: 1 / -1; }
.device-chart-wrap {
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-subtle);
  min-height: 40px;
}
.tiny-chart-svg {
  display: block;
  width: 100%;
  height: 40px;
}
.inline-rename-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  width: 100%;
}
.inline-rename-input,
.inline-rename-zone {
  background: var(--bg-primary);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  height: 30px;
  padding: 0 var(--space-2);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.inline-rename-save,
.inline-rename-cancel {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 26px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-primary);
}
.inline-rename-save:hover { border-color: var(--accent); color: var(--accent); }
.inline-rename-cancel:hover { border-color: var(--danger); color: var(--danger); }
`;
    document.head.appendChild(style);
  }
  var init_Devices = __esm({
    "src/web/hal-ui/views/Devices.ts"() {
      "use strict";
      init_store();
      init_api();
      init_Toggle();
      init_Toast();
      init_DiscoveryWizard();
      init_ChartKit();
      init_EnvironmentCharts();
    }
  });

  // src/web/hal-ui/views/Sensors.ts
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
            ${sensors.map((s) => `<option value="${s.id}" ${viewState.deviceId === s.id ? "selected" : ""}>${escapeHtml10(s.name)}</option>`).join("")}
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

      <div class="zone-bar" id="zone-bar"></div>

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
              <span class="pill-label">${escapeHtml10(m.shortLabel)}</span>
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

    <!-- Metric Strips - hidden, using hero chart only -->
    <div class="horizon-strips-section collapsible-section" id="strips-section" style="display:none">
      <div class="collapsible-header" data-target="strips-content">
        <h2 class="section-title">Metric Strips</h2>
        <button class="collapsible-toggle" aria-expanded="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      <div class="collapsible-content" id="strips-content">
        <div class="horizon-strips-grid" id="horizon-strips"></div>
      </div>
    </div>

    <div class="viz-grid" id="viz-grid" style="display:none"></div>

    <div class="sensor-detail-drawer collapsible-section collapsed" id="detail-drawer-section" style="max-height:0;overflow:hidden">
      <div class="collapsible-header" data-target="detail-drawer">
        <div class="detail-header" style="margin:0">
          <h3 class="section-title">Readings</h3>
          <span class="text-xs text-secondary" id="detail-count">--</span>
        </div>
        <button class="collapsible-toggle" aria-expanded="false">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
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
  async function refreshSensorsLiveData() {
    const store = getStore();
    const sensors = store.devices.filter((d) => d.type === "sensor");
    await loadData(sensors, { showLoading: false });
  }
  function attachHandlers(sensors) {
    const deviceSelect = document.getElementById(
      "sensor-device-select"
    );
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
        if (!viewState.availableMetrics.has(metric)) return;
        if (viewState.activeMetrics.has(metric)) {
          const activeAvailable = Array.from(viewState.activeMetrics).filter(
            (key) => viewState.availableMetrics.has(key)
          );
          if (activeAvailable.length <= 1) return;
          viewState.activeMetrics.delete(metric);
        } else {
          viewState.activeMetrics.add(metric);
        }
        syncMetricPills();
        void loadData(sensors);
      });
    });
    document.querySelectorAll(".collapsible-header").forEach((header) => {
      header.addEventListener("click", () => {
        const section = header.closest(".collapsible-section");
        if (!section) return;
        const isCollapsed = section.classList.toggle("collapsed");
        const btn = header.querySelector(".collapsible-toggle");
        if (btn)
          btn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      });
    });
  }
  async function loadData(sensors, opts = {}) {
    const sequence = ++loadSequence;
    const selectedDevices2 = viewState.deviceId === "all" ? sensors : sensors.filter((s) => s.id === viewState.deviceId);
    const { from, to } = getRangeBounds(viewState.range);
    viewState.availableMetrics = getAvailableMetrics(selectedDevices2);
    reconcileActiveMetrics();
    syncMetricPills();
    const activeMetricConfigs = metrics.filter(
      (m) => viewState.activeMetrics.has(m.key)
    );
    const heroChart = document.getElementById("hero-chart");
    if (heroChart && opts.showLoading !== false)
      heroChart.innerHTML = '<div class="chart-empty">Loading...</div>';
    try {
      const layers = [];
      const [decisions] = await Promise.all([
        halApi.getDecisions(50).catch(() => []),
        ...selectedDevices2.flatMap(
          (device) => activeMetricConfigs.map(async (metric) => {
            const data = await halApi.getSensorHistory(
              device.id,
              metric.key,
              from,
              to
            );
            if (data.length > 0) {
              layers.push({
                deviceId: device.id,
                deviceName: device.name,
                zoneName: resolveZoneName2(
                  device.id,
                  device.name,
                  device.zone
                ),
                metric,
                data
              });
            }
          })
        )
      ]);
      if (sequence !== loadSequence) return;
      const zones2 = [...new Set(layers.map((l) => l.zoneName).filter(Boolean))];
      renderZoneToggles(zones2);
      viewState.availableMetrics = getAvailableMetrics(selectedDevices2);
      reconcileActiveMetrics();
      syncMetricPills();
      const zoneLayers = viewState.activeZone ? layers.filter((l) => l.zoneName === viewState.activeZone) : layers;
      viewState.decisions = decisions;
      renderHeroChart2(zoneLayers, decisions);
      renderDetailTable(zoneLayers);
      updatePillValues(zoneLayers);
    } catch (err) {
      console.error("Sensor load failed:", err);
      if (heroChart)
        heroChart.innerHTML = '<div class="chart-empty">Failed to load</div>';
    }
  }
  function renderZoneToggles(zones2) {
    const container = document.getElementById("zone-bar");
    if (!container) return;
    const sortedZones = zones2.slice().sort((a, b) => {
      if (a === "Unzoned") return 1;
      if (b === "Unzoned") return -1;
      return a.localeCompare(b, void 0, {
        numeric: true,
        sensitivity: "base"
      });
    });
    if (sortedZones.length > 0) {
      if (!viewState.zoneSelectionInitialized) {
        viewState.activeZone = "";
        viewState.zoneSelectionInitialized = true;
      } else if (viewState.activeZone && !sortedZones.includes(viewState.activeZone)) {
        viewState.activeZone = "";
      }
    } else {
      viewState.activeZone = "";
      viewState.zoneSelectionInitialized = false;
    }
    if (zones2.length <= 1) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML = [
      `<button class="zone-pill ${viewState.activeZone ? "" : "active"}" data-zone="__all__">All Zones</button>`,
      ...sortedZones.map((z) => {
        const isActive = z === viewState.activeZone;
        return `<button class="zone-pill ${isActive ? "active" : ""}" data-zone="${escapeAttr2(z)}">${escapeHtml10(z)}</button>`;
      })
    ].join("");
    container.querySelectorAll(".zone-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const zone = btn.dataset.zone;
        if (zone) {
          viewState.activeZone = zone === "__all__" ? "" : zone;
          viewState.zoneSelectionInitialized = true;
          container.querySelectorAll(".zone-pill").forEach((pill) => {
            const pillZone = pill.dataset.zone || "";
            const normalized = pillZone === "__all__" ? "" : pillZone;
            pill.classList.toggle("active", normalized === viewState.activeZone);
          });
          const store = getStore();
          const sensors = store.devices.filter((d) => d.type === "sensor");
          void loadData(sensors);
        }
      });
    });
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
  function getAvailableMetrics(selectedDevices2) {
    const store = getStore();
    const available = /* @__PURE__ */ new Set();
    const zoneDevices = viewState.activeZone ? selectedDevices2.filter(
      (device) => resolveZoneName2(device.id, device.name, device.zone) === viewState.activeZone
    ) : selectedDevices2;
    for (const device of zoneDevices) {
      const snapshot = store.sensors[device.id];
      if (!snapshot) continue;
      for (const metric of metrics) {
        const reading = snapshot[metric.key];
        if (reading && typeof reading.value === "number" && Number.isFinite(reading.value)) {
          available.add(metric.key);
        }
      }
    }
    return available;
  }
  function resolveZoneName2(deviceId, deviceName, zone) {
    if (zone && zone.trim()) return zone.trim();
    if (deviceId.startsWith("tent_a_")) return "Tent A";
    if (deviceId.startsWith("tent_b_")) return "Tent B";
    if (/tent\s*a/i.test(deviceName)) return "Tent A";
    if (/tent\s*b/i.test(deviceName)) return "Tent B";
    return "Unzoned";
  }
  function reconcileActiveMetrics() {
    for (const metricKey of Array.from(viewState.activeMetrics)) {
      if (!viewState.availableMetrics.has(metricKey)) {
        viewState.activeMetrics.delete(metricKey);
      }
    }
    if (viewState.activeMetrics.size > 0) return;
    const fallback = ["temperature", "humidity", "co2"].find(
      (key) => viewState.availableMetrics.has(key)
    ) ?? Array.from(viewState.availableMetrics)[0];
    if (fallback) viewState.activeMetrics.add(fallback);
  }
  function syncMetricPills() {
    document.querySelectorAll(".metric-pill").forEach((pill) => {
      const key = pill.dataset.metric;
      const available = viewState.availableMetrics.has(key);
      pill.style.display = available ? "" : "none";
      pill.classList.toggle(
        "active",
        available && viewState.activeMetrics.has(key)
      );
      pill.setAttribute(
        "aria-pressed",
        available && viewState.activeMetrics.has(key) ? "true" : "false"
      );
    });
  }
  function escapeAttr2(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function renderHeroChart2(layers, _decisions = []) {
    const container = document.getElementById("hero-chart");
    const legend = document.getElementById("hero-legend");
    if (!container) return;
    if (layers.length === 0) {
      container.textContent = "";
      const empty = document.createElement("div");
      empty.className = "chart-empty";
      empty.textContent = "No data for selection";
      container.appendChild(empty);
      if (legend) legend.textContent = "";
      return;
    }
    const store = getStore();
    const metricGroups = /* @__PURE__ */ new Map();
    for (const layer of layers) {
      const list = metricGroups.get(layer.metric.key) || [];
      list.push(layer);
      metricGroups.set(layer.metric.key, list);
    }
    const bucketMap = /* @__PURE__ */ new Map();
    const series = Array.from(metricGroups.entries()).map(
      ([metricKey, metricLayers]) => {
        const metric = metricLayers[0].metric;
        const firstReading = metricLayers.flatMap((layer) => layer.data)[0];
        const converted = firstReading ? formatSensorValue(firstReading.value, metric.key, store.unitSystem) : null;
        return {
          key: metricKey,
          label: metric.label,
          color: metric.color,
          unit: converted?.unit || metric.fallbackUnit
        };
      }
    );
    for (const [metricKey, metricLayers] of metricGroups) {
      for (const l of metricLayers) {
        for (const d of l.data) {
          const t = new Date(d.timestamp).getTime();
          if (!Number.isFinite(t)) continue;
          const bucket = Math.floor(t / 6e4) * 6e4;
          const converted = formatSensorValue(
            d.value,
            metricKey,
            store.unitSystem
          ).value;
          const bucketValues = bucketMap.get(bucket) || {};
          const current = bucketValues[metricKey] || { sum: 0, count: 0 };
          current.sum += converted;
          current.count += 1;
          bucketValues[metricKey] = current;
          bucketMap.set(bucket, bucketValues);
        }
      }
    }
    const bucketEntries = Array.from(bucketMap.entries()).sort(
      (a, b) => a[0] - b[0]
    );
    const chartMetrics = series.map((metric) => ({
      ...metric,
      data: bucketEntries.map(([timestamp, values]) => {
        const aggregate = values[metric.key];
        return aggregate && aggregate.count > 0 ? { t: timestamp, v: aggregate.sum / aggregate.count } : null;
      }).filter((point) => point !== null)
    }));
    const deviceName = viewState.deviceId === "all" ? "All Sensors" : layers[0]?.deviceName;
    const zoneName = viewState.activeZone || "All Zones";
    const subtitle = `${deviceName || "Sensors"} \xB7 ${zoneName} \xB7 ${viewState.range}`;
    try {
      renderSensorEnvironmentHero(chartMetrics, "hero-chart", { subtitle });
    } catch (err) {
      const heroContainer = document.getElementById("hero-chart");
      if (heroContainer)
        heroContainer.innerHTML = `<div class="chart-empty">Chart error</div>`;
      console.error("Environment chart render failed:", err);
    }
    if (legend) legend.innerHTML = "";
  }
  function renderDetailTable(layers) {
    const tbody = document.getElementById("detail-body");
    const count = document.getElementById("detail-count");
    if (!tbody) return;
    const store = getStore();
    const rows = layers.flatMap(
      (layer) => layer.data.slice(-15).map((reading) => {
        const converted = formatSensorValue(
          reading.value,
          layer.metric.key,
          store.unitSystem
        );
        return {
          time: reading.timestamp,
          device: layer.deviceName,
          metric: layer.metric.label,
          value: formatValue(
            converted.value,
            converted.unit || layer.metric.fallbackUnit
          ),
          color: layer.metric.color
        };
      })
    ).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    if (count) count.textContent = `${rows.length} readings`;
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No data</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(
      (r) => `
    <tr style="--metric-color:${r.color}">
      <td class="text-mono text-xs">${formatDateTimeValue(new Date(r.time), store.timeFormat)}</td>
      <td>${escapeHtml10(r.device)}</td>
      <td><span class="history-dot"></span>${escapeHtml10(r.metric)}</td>
      <td class="text-mono metric-value">${r.value}</td>
    </tr>
  `
    ).join("");
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
      el.textContent = formatValue(
        converted.value,
        converted.unit || m.fallbackUnit
      );
    });
  }
  function formatValue(value, unit) {
    const precision = Math.abs(value) >= 100 ? 0 : value % 1 === 0 ? 0 : 1;
    return `${value.toFixed(precision)}${unit}`;
  }
  function escapeHtml10(s) {
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
  min-width: 0;
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
.zone-bar {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: var(--space-2);
}
.zone-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all var(--transition-fast);
  user-select: none;
}
.zone-pill.active {
  background: var(--accent);
  border-color: var(--accent);
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
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  position: relative;
}
.hero-chart {
  width: 100%;
  min-height: 380px;
  position: relative;
  overflow: visible;
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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  grid-auto-rows: minmax(140px, auto);
  align-items: stretch;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
.viz-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-2);
  min-height: 140px;
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
  min-height: 0;
  flex: 1;
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
  overflow-x: auto;
  overflow-y: hidden;
}
.hal-table {
  width: 100%;
  min-width: 560px;
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-auto-rows: minmax(140px, auto);
  align-items: stretch;
  gap: var(--space-3);
  margin-top: var(--space-3);
}
.horizon-strip {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  overflow: hidden;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
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
  flex: 1;
  min-height: 40px;
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
  min-width: 560px;
  border-collapse: collapse;
  font-size: 11px;
}
.qm-table-wrap {
  overflow-x: auto;
  overflow-y: hidden;
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

/* \u2500\u2500 Collapsible sections \u2500\u2500 */
.collapsible-section {
  margin-top: var(--space-4);
}
.collapsible-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: var(--space-2) 0;
  user-select: none;
}
.collapsible-header:hover .section-title {
  color: var(--text-primary);
}
.collapsible-toggle {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-fast);
}
.collapsible-toggle svg {
  transition: transform var(--transition-fast);
}
.collapsible-section.collapsed .collapsible-toggle svg {
  transform: rotate(-90deg);
}
.collapsible-content {
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.3s ease;
  max-height: 2000px;
  opacity: 1;
}
.collapsible-section.collapsed .collapsible-content {
  max-height: 0;
  opacity: 0;
}

/* \u2500\u2500 Hero chart sizing \u2500\u2500 */
#hero-chart {
  width: 100%;
  position: relative;
}
#hero-chart .ck-chart,
#hero-chart .hal-chart-card {
  width: 100%;
}
#hero-chart .hero-svg {
  width: 100%;
  height: auto;
  display: block;
}
#hero-chart .chart-empty {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}
#hero-chart .stack-chart,
#hero-chart .lake-chart-inner {
  width: 100%;
}

@media (max-width: 1023px) {
  .viz-grid { grid-template-columns: repeat(2, 1fr); }
  .viz-card.wide { grid-column: span 2; }
  .horizon-strips-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .sensors-hero-header { flex-direction: column; align-items: flex-start; }
  .sensors-hero-controls {
    width: 100%;
  }
  .hal-input {
    width: 100%;
  }
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
  var metrics, viewState, loadSequence;
  var init_Sensors = __esm({
    "src/web/hal-ui/views/Sensors.ts"() {
      "use strict";
      init_store();
      init_api();
      init_EnvironmentCharts();
      metrics = [
        {
          key: "temperature",
          label: "Temperature",
          shortLabel: "Temp",
          fallbackUnit: "\xB0C",
          color: "#F59E0B",
          description: "Air / probe temperature",
          minAxis: 10,
          maxAxis: 40
        },
        {
          key: "humidity",
          label: "Humidity",
          shortLabel: "RH",
          fallbackUnit: "%",
          color: "#38BDF8",
          description: "Relative humidity",
          minAxis: 0,
          maxAxis: 100
        },
        {
          key: "soil_moisture",
          label: "Soil Moisture",
          shortLabel: "Soil",
          fallbackUnit: "%",
          color: "#EF4444",
          description: "Volumetric water content",
          minAxis: 0,
          maxAxis: 100
        },
        {
          key: "co2",
          label: "CO\u2082",
          shortLabel: "CO\u2082",
          fallbackUnit: "ppm",
          color: "#22C55E",
          description: "Carbon dioxide",
          minAxis: 0,
          maxAxis: 2e3
        },
        {
          key: "light",
          label: "Light",
          shortLabel: "Light",
          fallbackUnit: "lux",
          color: "#FACC15",
          description: "PAR / illuminance",
          minAxis: 0,
          maxAxis: 1e5
        },
        {
          key: "water_level",
          label: "Water Level",
          shortLabel: "Water",
          fallbackUnit: "%",
          color: "#2563EB",
          description: "Reservoir level",
          minAxis: 0,
          maxAxis: 100
        },
        {
          key: "ph",
          label: "pH",
          shortLabel: "pH",
          fallbackUnit: "",
          color: "#A855F7",
          description: "Acidity / alkalinity",
          minAxis: 0,
          maxAxis: 14
        },
        {
          key: "weight",
          label: "Weight",
          shortLabel: "Weight",
          fallbackUnit: "kg",
          color: "#94A3B8",
          description: "Load cell",
          minAxis: 0,
          maxAxis: 100
        }
      ];
      viewState = {
        deviceId: "all",
        range: "24H",
        activeMetrics: /* @__PURE__ */ new Set(["temperature", "humidity", "co2"]),
        availableMetrics: /* @__PURE__ */ new Set(["temperature", "humidity", "co2"]),
        activeZone: "",
        // Empty = All Zones by default
        zoneSelectionInitialized: false,
        decisions: []
      };
      loadSequence = 0;
    }
  });

  // src/web/hal-ui/views/System.ts
  function getRangeBounds2(range) {
    const now = /* @__PURE__ */ new Date();
    const ms = {
      "1H": 60 * 60 * 1e3,
      "6H": 6 * 60 * 60 * 1e3,
      "24H": 24 * 60 * 60 * 1e3,
      "7D": 7 * 24 * 60 * 60 * 1e3,
      "30D": 30 * 24 * 60 * 60 * 1e3
    };
    return {
      from: new Date(now.getTime() - ms[range]).toISOString(),
      to: now.toISOString()
    };
  }
  async function renderSystemView(container) {
    const store = getStore();
    const sensors = store.devices.filter((d) => d.type === "sensor");
    injectSystemStyles();
    const root = document.createElement("div");
    root.className = "system-view";
    const header = document.createElement("div");
    header.className = "sensors-hero-header";
    header.innerHTML = `
    <div class="sensors-hero-title">
      <h1 class="page-title">System</h1>
      <p class="page-subtitle">System overview</p>
    </div>
    <div class="sensors-hero-controls">
      <div class="time-range-group" role="group">
        ${["1H", "6H", "24H", "7D", "30D"].map(
      (r) => `<button class="hal-range-btn ${r === systemViewRange ? "active" : ""}" data-range="${r}">${r}</button>`
    ).join("")}
      </div>
      <button class="hal-range-btn" id="sys-unit-toggle">${store.unitSystem === "metric" ? "\xB0C" : "\xB0F"}</button>
    </div>
  `;
    root.appendChild(header);
    const metricBar = document.createElement("div");
    metricBar.className = "metric-bar";
    metricBar.id = "sys-metric-bar";
    for (const m of systemMetrics) {
      const pill = document.createElement("div");
      pill.className = "sys-metric-pill";
      pill.style.setProperty("--metric-color", m.color);
      pill.innerHTML = `<span class="pill-dot"></span><span class="pill-label">${m.shortLabel}</span><span class="pill-value text-mono" id="sys-pill-${m.key}">--</span>`;
      metricBar.appendChild(pill);
    }
    root.appendChild(metricBar);
    const chartWrap = document.createElement("div");
    chartWrap.className = "hero-chart-wrap";
    const chartEl = document.createElement("div");
    chartEl.id = "system-hero-chart";
    chartEl.className = "hero-chart";
    chartEl.innerHTML = '<div class="chart-empty">Loading...</div>';
    chartWrap.appendChild(chartEl);
    root.appendChild(chartWrap);
    const drawer = document.createElement("div");
    drawer.className = "sensor-detail-drawer";
    drawer.style.marginTop = "var(--space-4)";
    const drawerTitle = document.createElement("h3");
    drawerTitle.className = "section-title";
    drawerTitle.textContent = "Device Status";
    drawer.appendChild(drawerTitle);
    const grid = document.createElement("div");
    grid.id = "device-status-grid";
    grid.className = "device-mini-grid";
    for (const s of sensors) {
      const card = document.createElement("div");
      card.className = `device-mini-card ${s.online ? "online" : "offline"}`;
      const name = document.createElement("div");
      name.className = "device-mini-name";
      name.textContent = s.name;
      const meta = document.createElement("div");
      meta.className = "device-mini-meta text-xs text-secondary";
      meta.textContent = s.protocol;
      card.appendChild(name);
      card.appendChild(meta);
      grid.appendChild(card);
    }
    drawer.appendChild(grid);
    root.appendChild(drawer);
    container.innerHTML = "";
    container.appendChild(root);
    root.querySelectorAll(".hal-range-btn[data-range]").forEach((btn) => {
      btn.addEventListener("click", () => {
        systemViewRange = btn.dataset.range;
        root.querySelectorAll(".hal-range-btn[data-range]").forEach((b) => {
          b.classList.toggle("active", b === btn);
        });
        void loadSystemData();
      });
    });
    const unitToggle = document.getElementById("sys-unit-toggle");
    unitToggle?.addEventListener("click", () => {
      const s = getStore();
      setStore({ unitSystem: s.unitSystem === "metric" ? "imperial" : "metric" });
      unitToggle.textContent = getStore().unitSystem === "metric" ? "\xB0C" : "\xB0F";
      void loadSystemData();
    });
    await loadSystemData();
  }
  function setChartState(el, msg) {
    if (!el) return;
    const div = document.createElement("div");
    div.className = "chart-empty";
    div.textContent = msg;
    el.replaceChildren(div);
  }
  async function loadSystemData() {
    const store = getStore();
    const sensors = store.devices.filter((d) => d.type === "sensor");
    const { from, to } = getRangeBounds2(systemViewRange);
    const heroChart = document.getElementById("system-hero-chart");
    setChartState(heroChart, "Loading...");
    try {
      const metricBuckets = /* @__PURE__ */ new Map();
      const metricLatestTs = /* @__PURE__ */ new Map();
      const metricLatestVal = /* @__PURE__ */ new Map();
      for (const m of systemMetrics) {
        metricBuckets.set(m.key, /* @__PURE__ */ new Map());
      }
      await Promise.all(
        sensors.flatMap(
          (device) => systemMetrics.map(async (metric) => {
            const data = await halApi.getSensorHistory(
              device.id,
              metric.key,
              from,
              to
            );
            if (data.length === 0) return;
            const latest = data[data.length - 1];
            const prevTs = metricLatestTs.get(metric.key) ?? "";
            if (latest.timestamp > prevTs) {
              metricLatestTs.set(metric.key, latest.timestamp);
              const cv = formatSensorValue(
                latest.value,
                metric.key,
                store.unitSystem
              );
              metricLatestVal.set(metric.key, cv.value);
              const pill = document.getElementById(`sys-pill-${metric.key}`);
              if (pill)
                pill.textContent = `${cv.value.toFixed(1)}${cv.unit || metric.fallbackUnit}`;
            }
            const buckets = metricBuckets.get(metric.key);
            for (const d of data) {
              const t = new Date(d.timestamp).getTime();
              if (!Number.isFinite(t)) continue;
              const bucket = Math.floor(t / 6e4) * 6e4;
              const val = formatSensorValue(
                d.value,
                metric.key,
                store.unitSystem
              ).value;
              const acc = buckets.get(bucket) ?? { sum: 0, count: 0 };
              acc.sum += val;
              acc.count += 1;
              buckets.set(bucket, acc);
            }
          })
        )
      );
      const chartMetrics = systemMetrics.filter((m) => metricLatestVal.has(m.key)).map((m) => {
        const minCv = formatSensorValue(m.minAxis, m.key, store.unitSystem);
        return {
          key: m.key,
          label: m.label,
          unit: minCv.unit || m.fallbackUnit,
          color: m.color,
          data: Array.from(metricBuckets.get(m.key).entries()).sort((a, b) => a[0] - b[0]).map(([t, acc]) => ({
            t,
            v: acc.count > 0 ? acc.sum / acc.count : 0
          }))
        };
      });
      if (chartMetrics.length === 0) {
        setChartState(heroChart, "No sensor data");
        return;
      }
      renderSystemEnvironmentHero(chartMetrics, "system-hero-chart");
    } catch (err) {
      console.error("System view load failed:", err);
      setChartState(heroChart, "Failed to load");
    }
  }
  function injectSystemStyles() {
    if (document.getElementById("hal-system-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-system-styles";
    style.textContent = `
    .system-view {
      padding: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .sys-metric-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      border-radius: var(--radius-pill);
      border: 1px solid color-mix(in srgb, var(--metric-color) 30%, var(--border));
      background: color-mix(in srgb, var(--metric-color) 8%, var(--bg-secondary));
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      user-select: none;
    }
    .device-mini-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: var(--space-2);
      margin-top: var(--space-3);
    }
    .device-mini-card {
      padding: var(--space-2) var(--space-3);
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
      border: 1px solid var(--border);
      border-left: 3px solid var(--border);
    }
    .device-mini-card.online { border-left-color: var(--accent); }
    .device-mini-card.offline { border-left-color: var(--danger); }
    .device-mini-name { font-size: 12px; font-weight: 500; }
    .device-mini-meta { font-size: 10px; margin-top: 2px; }
    #system-hero-chart {
      width: 100%;
    }
  `;
    document.head.appendChild(style);
  }
  var systemMetrics, systemViewRange;
  var init_System = __esm({
    "src/web/hal-ui/views/System.ts"() {
      "use strict";
      init_store();
      init_api();
      init_EnvironmentCharts();
      systemMetrics = [
        {
          key: "temperature",
          label: "Temperature",
          shortLabel: "Temp",
          fallbackUnit: "\xB0C",
          color: "#F59E0B",
          minAxis: 10,
          maxAxis: 40
        },
        {
          key: "humidity",
          label: "Humidity",
          shortLabel: "RH",
          fallbackUnit: "%",
          color: "#38BDF8",
          minAxis: 0,
          maxAxis: 100
        },
        {
          key: "co2",
          label: "CO\u2082",
          shortLabel: "CO\u2082",
          fallbackUnit: "ppm",
          color: "#22C55E",
          minAxis: 0,
          maxAxis: 2e3
        }
      ];
      systemViewRange = "24H";
    }
  });

  // src/web/hal-ui/views/Decisions.ts
  async function renderDecisions(container) {
    const store = getStore();
    const pendingDecisions = store.pendingDecisions || [];
    const filtered = statusFilter === "all" ? store.decisions : store.decisions.filter((d) => (d.status || "pending") === statusFilter);
    container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Decisions</h1>
      <p class="page-subtitle">HAL autonomous decision log</p>
    </div>

    ${renderPendingDecisionsSection(pendingDecisions)}

    <div class="decisions-chart-section mb-4">
      <div class="hal-card" style="padding: var(--space-3)">
        <div class="section-title mb-3">Decision Activity Heatmap</div>
        <div id="decisions-heatmap" style="min-height: 100px;"></div>
      </div>
    </div>

    <div class="decisions-chart-section mb-4">
      <div class="hal-card" style="padding: var(--space-3)">
        <div class="section-title mb-3">Decision Trend (24h)</div>
        <div id="decisions-bar-trend" style="min-height: 180px;"></div>
      </div>
    </div>

    <div class="decisions-toolbar mb-4">
      <div class="filter-group" role="group" aria-label="Filter by status">
        ${["all", "success", "failure", "pending"].map(
      (s) => `
          <button class="filter-btn ${s === statusFilter ? "active" : ""}" data-filter="${s}">
            ${s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        `
    ).join("")}
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
    injectChartKitStyles();
    attachDecisionHandlers();
    attachFilterHandlers();
    attachPendingHandlers();
    renderDecisionsHeatmap(store.decisions);
    renderDecisionsBarTrend(store.decisions);
    startPendingCountdown();
  }
  function renderPendingDecisionsSection(pending) {
    if (pending.length === 0) {
      return "";
    }
    const items = pending.filter((p) => p.decision && !p.executed).map((p) => {
      const remaining = p.remainingSeconds ?? 0;
      const isAssisted = p.mode === "ASSISTED_CONTROL";
      const modeColor = {
        SUGGEST: "#388BFD",
        ASSISTED_CONTROL: "#D29922"
      };
      const color = modeColor[p.mode] || "#388BFD";
      const countdown = isAssisted ? `<span class="pending-countdown" data-deadline="${p.veto_deadline || ""}">${remaining}s</span>` : "";
      const decisionText = p.decision?.reasoning || p.decision?.decision || "No description";
      const confidence = p.decision?.confidence ? `${(p.decision.confidence * 100).toFixed(0)}%` : "--";
      return `
    <div class="pending-decision-item" data-decision-id="${p.decision_id}">
      <div class="pending-decision-left">
        <span class="pending-mode-badge" style="background:${color}">${p.mode === "ASSISTED_CONTROL" ? "ASSISTED" : "SUGGEST"}</span>
        ${countdown}
      </div>
      <div class="pending-decision-middle">
        <span class="pending-decision-text">${escapeHtml11(decisionText)}</span>
        <span class="pending-decision-confidence text-mono text-xs">${confidence}</span>
      </div>
      <div class="pending-decision-right">
        <button class="pending-btn approve-btn" data-decision-id="${p.decision_id}">Approve</button>
        <button class="pending-btn veto-btn" data-decision-id="${p.decision_id}">Veto</button>
      </div>
    </div>
  `;
    }).join("");
    return `
    <div class="pending-decisions-section mb-4" id="pending-decisions-section">
      <div class="hal-card" style="padding: var(--space-3)">
        <div class="section-title mb-3">Pending Decisions <span class="pending-count-badge">${pending.length}</span></div>
        <div class="pending-decisions-list">
          ${items || '<p class="text-sm text-secondary">No pending decisions.</p>'}
        </div>
      </div>
    </div>
  `;
  }
  function renderDecisionsHeatmap(decisions) {
    if (decisions.length < 3) return;
    const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = /* @__PURE__ */ new Map();
    for (const d of decisions) {
      const dt = new Date(d.timestamp);
      const dow = dows[dt.getDay()];
      const hour = dt.getHours();
      const key = `${dow}:${hour}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const cells = [];
    for (const dow of dows) {
      for (let h = 0; h < 24; h++) {
        const val = counts.get(`${dow}:${h}`) || 0;
        cells.push({ dow, hour: h, value: val });
      }
    }
    setTimeout(
      () => renderHeatmap(cells, "decisions-heatmap", {
        colorRange: ["#0a1a12", "#1a4030", "#4aB070", "#F59E0B", "#FF5C6C"]
      }),
      0
    );
  }
  function renderDecisionsBarTrend(decisions) {
    if (decisions.length < 2) return;
    const now = Date.now();
    const buckets = /* @__PURE__ */ new Map();
    for (let h = 23; h >= 0; h--) {
      const t = now - h * 36e5;
      const hourKey = new Date(t).getHours();
      buckets.set(hourKey, { success: 0, failure: 0, pending: 0 });
    }
    for (const d of decisions) {
      const t = new Date(d.timestamp).getTime();
      if (now - t > 24 * 36e5) continue;
      const hourKey = new Date(d.timestamp).getHours();
      const bucket = buckets.get(hourKey);
      if (!bucket) continue;
      const status = d.status || "pending";
      if (status === "success") bucket.success++;
      else if (status === "failure") bucket.failure++;
      else bucket.pending++;
    }
    const points = [];
    for (let h = 23; h >= 0; h--) {
      const t = now - h * 36e5;
      const hourKey = new Date(t).getHours();
      const bucket = buckets.get(hourKey);
      const label = `${hourKey.toString().padStart(2, "0")}:00`;
      points.push({
        label,
        success: bucket?.success ?? 0,
        failure: bucket?.failure ?? 0,
        pending: bucket?.pending ?? 0
      });
    }
    setTimeout(
      () => renderDecisionBarTrend(points, "decisions-bar-trend", { height: 180 }),
      0
    );
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
    return decisions.map(
      (d) => `
    <div class="decision-item" data-id="${d.id}">
      <div class="decision-summary">
        <div class="decision-left">
          <span class="decision-status-dot ${d.status || "pending"}"></span>
          <span class="decision-time text-mono text-xs text-secondary">${formatTime4(d.timestamp)}</span>
        </div>
        <div class="decision-middle">
          <span class="decision-trigger-text text-sm">${escapeHtml11(d.trigger)}</span>
        </div>
        <div class="decision-right">
          <span class="decision-confidence text-mono text-xs" style="color:${confidenceColor3(d.confidence)}">${(d.confidence * 100).toFixed(0)}%</span>
          <button class="decision-expand-btn" aria-label="Toggle metadata">${expandedDecisionIds.has(d.id) ? "v" : ">"}</button>
        </div>
      </div>
      <div class="decision-detail" ${expandedDecisionIds.has(d.id) ? "" : "hidden"}>
        <div class="decision-detail-row">
          <span class="decision-detail-label">Decision</span>
          <span class="decision-detail-value font-semibold">${escapeHtml11(d.decision)}</span>
        </div>
        ${d.outcome ? `
        <div class="decision-detail-row">
          <span class="decision-detail-label">Outcome</span>
          <span class="decision-detail-value">${escapeHtml11(d.outcome)}</span>
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
  `
    ).join("");
  }
  function attachDecisionHandlers() {
    document.querySelectorAll(".decision-item").forEach((item) => {
      const summary = item.querySelector(".decision-summary");
      const detail = item.querySelector(".decision-detail");
      const expandBtn = item.querySelector(
        ".decision-expand-btn"
      );
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
  function attachPendingHandlers() {
    document.querySelectorAll(".pending-btn.approve-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const decisionId = btn.dataset.decisionId;
        if (!decisionId) return;
        try {
          await halApi.approveDecision(decisionId);
          const { refreshHALData: refreshHALData2 } = await Promise.resolve().then(() => (init_main(), main_exports));
          await refreshHALData2();
          const container = document.getElementById("view-container");
          if (container) await renderDecisions(container);
        } catch (err) {
          alert(`Failed to approve: ${err.message}`);
        }
      });
    });
    document.querySelectorAll(".pending-btn.veto-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const decisionId = btn.dataset.decisionId;
        if (!decisionId) return;
        try {
          await halApi.vetoDecision(decisionId);
          const { refreshHALData: refreshHALData2 } = await Promise.resolve().then(() => (init_main(), main_exports));
          await refreshHALData2();
          const container = document.getElementById("view-container");
          if (container) await renderDecisions(container);
        } catch (err) {
          alert(`Failed to veto: ${err.message}`);
        }
      });
    });
  }
  function startPendingCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    function tick() {
      document.querySelectorAll(".pending-countdown").forEach((el) => {
        const deadline = el.dataset.deadline;
        if (!deadline) return;
        const remaining = Math.max(
          0,
          Math.ceil((new Date(deadline).getTime() - Date.now()) / 1e3)
        );
        el.textContent = `${remaining}s`;
        if (remaining <= 0) {
          el.textContent = "0s";
          el.classList.add("expired");
        }
      });
    }
    tick();
    countdownInterval = setInterval(tick, 1e3);
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
  function escapeHtml11(s) {
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

@media (max-width: 767px) {
  .decisions-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
  .decision-summary {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .decision-left {
    min-width: 0;
  }
  .decision-right {
    margin-left: auto;
  }
  .decision-detail-row {
    flex-direction: column;
    gap: var(--space-1);
  }
  .decision-detail-label {
    min-width: 0;
  }
}

/* Pending Decisions Section */
.pending-decisions-section .section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.pending-count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--radius-pill);
  background: var(--accent);
  color: var(--on-primary);
  font-size: 11px;
  font-weight: 700;
}
.pending-decisions-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.pending-decision-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
}
.pending-decision-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
.pending-mode-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-primary);
}
.pending-countdown {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--warning);
  min-width: 32px;
}
.pending-countdown.expired {
  color: var(--danger);
}
.pending-decision-middle {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.pending-decision-text {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pending-decision-confidence {
  color: var(--text-secondary);
}
.pending-decision-right {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}
.pending-btn {
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border);
  transition: all var(--transition-fast);
}
.pending-btn.approve-btn {
  background: color-mix(in srgb, var(--success) 20%, transparent);
  color: var(--success);
  border-color: var(--success);
}
.pending-btn.approve-btn:hover {
  background: color-mix(in srgb, var(--success) 35%, transparent);
}
.pending-btn.veto-btn {
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  color: var(--danger);
  border-color: var(--danger);
}
.pending-btn.veto-btn:hover {
  background: color-mix(in srgb, var(--danger) 30%, transparent);
}
`;
    document.head.appendChild(style);
  }
  var expandedDecisionIds, statusFilter, countdownInterval;
  var init_Decisions = __esm({
    "src/web/hal-ui/views/Decisions.ts"() {
      "use strict";
      init_store();
      init_api();
      init_ChartKit();
      expandedDecisionIds = /* @__PURE__ */ new Set();
      statusFilter = "all";
      countdownInterval = null;
    }
  });

  // src/web/hal-ui/views/Cameras.ts
  function isDemoCamera(camera) {
    return !camera.online || !DEMO_IMAGES[camera.id];
  }
  function getLastCaptureTime(cameraId) {
    return sessionStorage.getItem(`camera_capture_${cameraId}`);
  }
  function setLastCaptureTime(cameraId, timestamp) {
    sessionStorage.setItem(`camera_capture_${cameraId}`, timestamp);
  }
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
        const cameraId = el.dataset.cameraId;
        const lastCapture = cameraId ? getLastCaptureTime(cameraId) : null;
        if (lastCapture) {
          const date2 = new Date(lastCapture);
          el.textContent = date2.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit"
          });
        } else {
          el.textContent = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit"
          });
        }
      });
    }, 3e4);
  }
  function renderCameraGrid(cameras) {
    if (cameras.length === 0) {
      return `
      <div class="empty-state col-span-2">
        <p class="empty-state-title">No cameras registered</p>
        <p class="empty-state-desc">Cameras will appear here once discovered.</p>
        <div class="demo-mode-indicator">
          <span class="demo-badge">DEMO MODE</span>
          <span class="demo-text">Configure cameras in Devices view</span>
        </div>
      </div>
    `;
    }
    return cameras.map((c) => {
      const demoImg = DEMO_IMAGES[c.id];
      const isDemo = isDemoCamera(c);
      const lastCapture = getLastCaptureTime(c.id);
      const displayTime = lastCapture ? new Date(lastCapture).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit"
      }) : (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit"
      });
      return `
    <div class="camera-card hal-card ${c.online ? "" : "camera-offline"}" data-camera-id="${c.id}">
      <div class="camera-thumbnail" id="thumb-${c.id}">
        ${demoImg && c.online ? `<img src="${demoImg}" alt="${escapeHtml12(c.name)}" class="camera-img" />` : `
        <div class="camera-placeholder">
          <span class="camera-icon">CAM</span>
          <span class="text-secondary text-sm">${c.online ? "No preview" : "Offline"}</span>
        </div>`}
        <div class="camera-overlay">
          ${isDemo ? `<span class="camera-demo-badge">DEMO</span>` : `<span class="camera-live-badge">LIVE</span>`}
          <span class="camera-time text-mono text-xs" data-camera-id="${c.id}">${displayTime}</span>
        </div>
      </div>
      <div class="camera-info">
        <div class="camera-name">${escapeHtml12(c.name)}</div>
        <div class="camera-meta text-xs text-secondary">
          ${c.protocol}
          ${c.online ? '<span class="camera-status-online">\xB7 online</span>' : '<span class="camera-status-offline">\xB7 offline</span>'}
          ${isDemo ? '<span class="camera-demo-label">\xB7 demo</span>' : ""}
        </div>
      </div>
      <button class="hal-btn hal-btn-secondary camera-capture-btn" data-camera-id="${c.id}" ${c.online ? "" : "disabled"}>
        ${c.online ? "Capture" : "Offline"}
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
        if (!camera || !camera.online) return;
        btn.textContent = "Capturing...";
        btn.disabled = true;
        try {
          const result = await halApi.captureCamera(cameraId);
          const captureTime = (/* @__PURE__ */ new Date()).toISOString();
          setLastCaptureTime(cameraId, captureTime);
          const timeEl = document.querySelector(
            `.camera-time[data-camera-id="${cameraId}"]`
          );
          if (timeEl) {
            const date2 = new Date(captureTime);
            timeEl.textContent = date2.toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit"
            });
          }
          showToast(`Capture saved: ${result.path}`, "success");
          openModal(
            `${camera.name} \u2014 Capture`,
            `
            <div class="capture-result">
              <p class="text-sm text-secondary mb-4">Capture complete</p>
              <div class="capture-meta">
                <div class="capture-meta-row">
                  <span class="text-secondary text-xs">Path</span>
                  <span class="text-mono text-xs">${escapeHtml12(result.path)}</span>
                </div>
                <div class="capture-meta-row">
                  <span class="text-secondary text-xs">Size</span>
                  <span class="text-mono text-xs">${(result.size_bytes / 1024).toFixed(1)} KB</span>
                </div>
                <div class="capture-meta-row">
                  <span class="text-secondary text-xs">Captured</span>
                  <span class="text-mono text-xs">${date.toLocaleTimeString("en-US", { hour12: false })}</span>
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
  function escapeHtml12(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function injectCamerasStyles() {
    if (document.getElementById("hal-cameras-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-cameras-styles";
    style.textContent = `
.camera-card { padding: 0; overflow: hidden; position: relative; border-left: 3px solid var(--accent); }
.camera-card.camera-offline { border-left-color: var(--danger); }
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
  background: var(--success);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}
.camera-demo-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #fff;
  background: var(--warning);
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
.camera-status-online { color: var(--success); }
.camera-status-offline { color: var(--danger); }
.camera-demo-label { color: var(--warning); }
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

/* Demo mode indicator for empty state */
.demo-mode-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  border: 1px dashed var(--warning);
  border-radius: var(--radius-md);
}
.demo-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--on-primary);
  background: var(--warning);
  padding: 4px 12px;
  border-radius: var(--radius-pill);
}
.demo-text {
  font-size: 12px;
  color: var(--text-secondary);
}
`;
    document.head.appendChild(style);
  }
  var DEMO_IMAGES, refreshInterval;
  var init_Cameras = __esm({
    "src/web/hal-ui/views/Cameras.ts"() {
      "use strict";
      init_store();
      init_api();
      init_Modal();
      init_Toast();
      DEMO_IMAGES = {
        tent_cam_a: "/hal-ui/assets/cam1.jpg",
        tent_cam_b: "/hal-ui/assets/cam2.jpg"
      };
      refreshInterval = null;
    }
  });

  // src/web/hal-ui/views/Terminal.ts
  async function renderTerminalView(container) {
    injectTerminalStyles();
    const store = getStore();
    const entries = buildLogEntries(store.decisions);
    container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Terminal</h1>
      <p class="page-subtitle">System log and diagnostics</p>
    </div>
    ${renderTerminal(entries)}
  `;
  }
  var init_Terminal2 = __esm({
    "src/web/hal-ui/views/Terminal.ts"() {
      "use strict";
      init_store();
      init_Terminal();
    }
  });

  // src/web/hal-ui/api-provisioning.ts
  async function provGet(path) {
    const url = BASE2 + path;
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(
        `Provisioning API ${url} failed: ${res.status} ${res.statusText}`
      );
    return res.json();
  }
  async function provPost(path, body) {
    const res = await fetch(BASE2 + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : void 0
    });
    if (!res.ok)
      throw new Error(
        `Provisioning API ${path} failed: ${res.status} ${res.statusText}`
      );
    return res.json();
  }
  async function provPut(path, body) {
    const res = await fetch(BASE2 + path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : void 0
    });
    if (!res.ok)
      throw new Error(
        `Provisioning API ${path} failed: ${res.status} ${res.statusText}`
      );
    return res.json();
  }
  var BASE2, provisioningApi;
  var init_api_provisioning = __esm({
    "src/web/hal-ui/api-provisioning.ts"() {
      "use strict";
      BASE2 = "/api/provisioning";
      provisioningApi = {
        // GET /api/provisioning/status
        async getStatus() {
          return provGet("/status");
        },
        // POST /api/provisioning/begin
        async begin() {
          return provPost("/begin");
        },
        // PUT /api/provisioning/wizard-step — updates wizardStep in ProvisioningManager state
        async updateWizardStep(step, data) {
          return provPut("/wizard-step", {
            step,
            ...data
          });
        },
        // GET /api/provisioning/wizard-session
        async getWizardSession() {
          try {
            return await provGet("/wizard-session");
          } catch {
            return null;
          }
        },
        // POST /api/provisioning/complete
        async complete(data) {
          return provPost("/complete", data);
        },
        // POST /api/provisioning/reset
        async reset() {
          return provPost("/reset");
        },
        // GET /api/provisioning/network
        async getNetworkInfo() {
          return provGet("/network");
        }
      };
    }
  });

  // (disabled):crypto
  var require_crypto = __commonJS({
    "(disabled):crypto"() {
    }
  });

  // node_modules/bcryptjs/index.js
  function randomBytes(len) {
    try {
      return crypto.getRandomValues(new Uint8Array(len));
    } catch {
    }
    try {
      return import_crypto.default.randomBytes(len);
    } catch {
    }
    if (!randomFallback) {
      throw Error(
        "Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative"
      );
    }
    return randomFallback(len);
  }
  function setRandomFallback(random) {
    randomFallback = random;
  }
  function genSaltSync(rounds, seed_length) {
    rounds = rounds || GENSALT_DEFAULT_LOG2_ROUNDS;
    if (typeof rounds !== "number")
      throw Error(
        "Illegal arguments: " + typeof rounds + ", " + typeof seed_length
      );
    if (rounds < 4) rounds = 4;
    else if (rounds > 31) rounds = 31;
    var salt = [];
    salt.push("$2b$");
    if (rounds < 10) salt.push("0");
    salt.push(rounds.toString());
    salt.push("$");
    salt.push(base64_encode(randomBytes(BCRYPT_SALT_LEN), BCRYPT_SALT_LEN));
    return salt.join("");
  }
  function genSalt(rounds, seed_length, callback) {
    if (typeof seed_length === "function")
      callback = seed_length, seed_length = void 0;
    if (typeof rounds === "function") callback = rounds, rounds = void 0;
    if (typeof rounds === "undefined") rounds = GENSALT_DEFAULT_LOG2_ROUNDS;
    else if (typeof rounds !== "number")
      throw Error("illegal arguments: " + typeof rounds);
    function _async(callback2) {
      nextTick(function() {
        try {
          callback2(null, genSaltSync(rounds));
        } catch (err) {
          callback2(err);
        }
      });
    }
    if (callback) {
      if (typeof callback !== "function")
        throw Error("Illegal callback: " + typeof callback);
      _async(callback);
    } else
      return new Promise(function(resolve, reject) {
        _async(function(err, res) {
          if (err) {
            reject(err);
            return;
          }
          resolve(res);
        });
      });
  }
  function hashSync(password, salt) {
    if (typeof salt === "undefined") salt = GENSALT_DEFAULT_LOG2_ROUNDS;
    if (typeof salt === "number") salt = genSaltSync(salt);
    if (typeof password !== "string" || typeof salt !== "string")
      throw Error("Illegal arguments: " + typeof password + ", " + typeof salt);
    return _hash(password, salt);
  }
  function hash(password, salt, callback, progressCallback) {
    function _async(callback2) {
      if (typeof password === "string" && typeof salt === "number")
        genSalt(salt, function(err, salt2) {
          _hash(password, salt2, callback2, progressCallback);
        });
      else if (typeof password === "string" && typeof salt === "string")
        _hash(password, salt, callback2, progressCallback);
      else
        nextTick(
          callback2.bind(
            this,
            Error("Illegal arguments: " + typeof password + ", " + typeof salt)
          )
        );
    }
    if (callback) {
      if (typeof callback !== "function")
        throw Error("Illegal callback: " + typeof callback);
      _async(callback);
    } else
      return new Promise(function(resolve, reject) {
        _async(function(err, res) {
          if (err) {
            reject(err);
            return;
          }
          resolve(res);
        });
      });
  }
  function safeStringCompare(known, unknown) {
    var diff = known.length ^ unknown.length;
    for (var i = 0; i < known.length; ++i) {
      diff |= known.charCodeAt(i) ^ unknown.charCodeAt(i);
    }
    return diff === 0;
  }
  function compareSync(password, hash2) {
    if (typeof password !== "string" || typeof hash2 !== "string")
      throw Error("Illegal arguments: " + typeof password + ", " + typeof hash2);
    if (hash2.length !== 60) return false;
    return safeStringCompare(
      hashSync(password, hash2.substring(0, hash2.length - 31)),
      hash2
    );
  }
  function compare(password, hashValue, callback, progressCallback) {
    function _async(callback2) {
      if (typeof password !== "string" || typeof hashValue !== "string") {
        nextTick(
          callback2.bind(
            this,
            Error(
              "Illegal arguments: " + typeof password + ", " + typeof hashValue
            )
          )
        );
        return;
      }
      if (hashValue.length !== 60) {
        nextTick(callback2.bind(this, null, false));
        return;
      }
      hash(
        password,
        hashValue.substring(0, 29),
        function(err, comp) {
          if (err) callback2(err);
          else callback2(null, safeStringCompare(comp, hashValue));
        },
        progressCallback
      );
    }
    if (callback) {
      if (typeof callback !== "function")
        throw Error("Illegal callback: " + typeof callback);
      _async(callback);
    } else
      return new Promise(function(resolve, reject) {
        _async(function(err, res) {
          if (err) {
            reject(err);
            return;
          }
          resolve(res);
        });
      });
  }
  function getRounds(hash2) {
    if (typeof hash2 !== "string")
      throw Error("Illegal arguments: " + typeof hash2);
    return parseInt(hash2.split("$")[2], 10);
  }
  function getSalt(hash2) {
    if (typeof hash2 !== "string")
      throw Error("Illegal arguments: " + typeof hash2);
    if (hash2.length !== 60)
      throw Error("Illegal hash length: " + hash2.length + " != 60");
    return hash2.substring(0, 29);
  }
  function truncates(password) {
    if (typeof password !== "string")
      throw Error("Illegal arguments: " + typeof password);
    return utf8Length(password) > 72;
  }
  function utf8Length(string) {
    var len = 0, c = 0;
    for (var i = 0; i < string.length; ++i) {
      c = string.charCodeAt(i);
      if (c < 128) len += 1;
      else if (c < 2048) len += 2;
      else if ((c & 64512) === 55296 && (string.charCodeAt(i + 1) & 64512) === 56320) {
        ++i;
        len += 4;
      } else len += 3;
    }
    return len;
  }
  function utf8Array(string) {
    var offset = 0, c1, c2;
    var buffer = new Array(utf8Length(string));
    for (var i = 0, k = string.length; i < k; ++i) {
      c1 = string.charCodeAt(i);
      if (c1 < 128) {
        buffer[offset++] = c1;
      } else if (c1 < 2048) {
        buffer[offset++] = c1 >> 6 | 192;
        buffer[offset++] = c1 & 63 | 128;
      } else if ((c1 & 64512) === 55296 && ((c2 = string.charCodeAt(i + 1)) & 64512) === 56320) {
        c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
        ++i;
        buffer[offset++] = c1 >> 18 | 240;
        buffer[offset++] = c1 >> 12 & 63 | 128;
        buffer[offset++] = c1 >> 6 & 63 | 128;
        buffer[offset++] = c1 & 63 | 128;
      } else {
        buffer[offset++] = c1 >> 12 | 224;
        buffer[offset++] = c1 >> 6 & 63 | 128;
        buffer[offset++] = c1 & 63 | 128;
      }
    }
    return buffer;
  }
  function base64_encode(b, len) {
    var off = 0, rs = [], c1, c2;
    if (len <= 0 || len > b.length) throw Error("Illegal len: " + len);
    while (off < len) {
      c1 = b[off++] & 255;
      rs.push(BASE64_CODE[c1 >> 2 & 63]);
      c1 = (c1 & 3) << 4;
      if (off >= len) {
        rs.push(BASE64_CODE[c1 & 63]);
        break;
      }
      c2 = b[off++] & 255;
      c1 |= c2 >> 4 & 15;
      rs.push(BASE64_CODE[c1 & 63]);
      c1 = (c2 & 15) << 2;
      if (off >= len) {
        rs.push(BASE64_CODE[c1 & 63]);
        break;
      }
      c2 = b[off++] & 255;
      c1 |= c2 >> 6 & 3;
      rs.push(BASE64_CODE[c1 & 63]);
      rs.push(BASE64_CODE[c2 & 63]);
    }
    return rs.join("");
  }
  function base64_decode(s, len) {
    var off = 0, slen = s.length, olen = 0, rs = [], c1, c2, c3, c4, o, code;
    if (len <= 0) throw Error("Illegal len: " + len);
    while (off < slen - 1 && olen < len) {
      code = s.charCodeAt(off++);
      c1 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
      code = s.charCodeAt(off++);
      c2 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
      if (c1 == -1 || c2 == -1) break;
      o = c1 << 2 >>> 0;
      o |= (c2 & 48) >> 4;
      rs.push(String.fromCharCode(o));
      if (++olen >= len || off >= slen) break;
      code = s.charCodeAt(off++);
      c3 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
      if (c3 == -1) break;
      o = (c2 & 15) << 4 >>> 0;
      o |= (c3 & 60) >> 2;
      rs.push(String.fromCharCode(o));
      if (++olen >= len || off >= slen) break;
      code = s.charCodeAt(off++);
      c4 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
      o = (c3 & 3) << 6 >>> 0;
      o |= c4;
      rs.push(String.fromCharCode(o));
      ++olen;
    }
    var res = [];
    for (off = 0; off < olen; off++) res.push(rs[off].charCodeAt(0));
    return res;
  }
  function _encipher(lr, off, P, S) {
    var n, l = lr[off], r = lr[off + 1];
    l ^= P[0];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[1];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[2];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[3];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[4];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[5];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[6];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[7];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[8];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[9];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[10];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[11];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[12];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[13];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[14];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[15];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[16];
    lr[off] = r ^ P[BLOWFISH_NUM_ROUNDS + 1];
    lr[off + 1] = l;
    return lr;
  }
  function _streamtoword(data, offp) {
    for (var i = 0, word = 0; i < 4; ++i)
      word = word << 8 | data[offp] & 255, offp = (offp + 1) % data.length;
    return { key: word, offp };
  }
  function _key(key, P, S) {
    var offset = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
    for (var i = 0; i < plen; i++)
      sw = _streamtoword(key, offset), offset = sw.offp, P[i] = P[i] ^ sw.key;
    for (i = 0; i < plen; i += 2)
      lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
    for (i = 0; i < slen; i += 2)
      lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
  }
  function _ekskey(data, key, P, S) {
    var offp = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
    for (var i = 0; i < plen; i++)
      sw = _streamtoword(key, offp), offp = sw.offp, P[i] = P[i] ^ sw.key;
    offp = 0;
    for (i = 0; i < plen; i += 2)
      sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
    for (i = 0; i < slen; i += 2)
      sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
  }
  function _crypt(b, salt, rounds, callback, progressCallback) {
    var cdata = C_ORIG.slice(), clen = cdata.length, err;
    if (rounds < 4 || rounds > 31) {
      err = Error("Illegal number of rounds (4-31): " + rounds);
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    if (salt.length !== BCRYPT_SALT_LEN) {
      err = Error(
        "Illegal salt length: " + salt.length + " != " + BCRYPT_SALT_LEN
      );
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    rounds = 1 << rounds >>> 0;
    var P, S, i = 0, j;
    if (typeof Int32Array === "function") {
      P = new Int32Array(P_ORIG);
      S = new Int32Array(S_ORIG);
    } else {
      P = P_ORIG.slice();
      S = S_ORIG.slice();
    }
    _ekskey(salt, b, P, S);
    function next() {
      if (progressCallback) progressCallback(i / rounds);
      if (i < rounds) {
        var start = Date.now();
        for (; i < rounds; ) {
          i = i + 1;
          _key(b, P, S);
          _key(salt, P, S);
          if (Date.now() - start > MAX_EXECUTION_TIME) break;
        }
      } else {
        for (i = 0; i < 64; i++)
          for (j = 0; j < clen >> 1; j++) _encipher(cdata, j << 1, P, S);
        var ret = [];
        for (i = 0; i < clen; i++)
          ret.push((cdata[i] >> 24 & 255) >>> 0), ret.push((cdata[i] >> 16 & 255) >>> 0), ret.push((cdata[i] >> 8 & 255) >>> 0), ret.push((cdata[i] & 255) >>> 0);
        if (callback) {
          callback(null, ret);
          return;
        } else return ret;
      }
      if (callback) nextTick(next);
    }
    if (typeof callback !== "undefined") {
      next();
    } else {
      var res;
      while (true) if (typeof (res = next()) !== "undefined") return res || [];
    }
  }
  function _hash(password, salt, callback, progressCallback) {
    var err;
    if (typeof password !== "string" || typeof salt !== "string") {
      err = Error("Invalid string / salt: Not a string");
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    var minor, offset;
    if (salt.charAt(0) !== "$" || salt.charAt(1) !== "2") {
      err = Error("Invalid salt version: " + salt.substring(0, 2));
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    if (salt.charAt(2) === "$") minor = String.fromCharCode(0), offset = 3;
    else {
      minor = salt.charAt(2);
      if (minor !== "a" && minor !== "b" && minor !== "y" || salt.charAt(3) !== "$") {
        err = Error("Invalid salt revision: " + salt.substring(2, 4));
        if (callback) {
          nextTick(callback.bind(this, err));
          return;
        } else throw err;
      }
      offset = 4;
    }
    if (salt.charAt(offset + 2) > "$") {
      err = Error("Missing salt rounds");
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    var r1 = parseInt(salt.substring(offset, offset + 1), 10) * 10, r2 = parseInt(salt.substring(offset + 1, offset + 2), 10), rounds = r1 + r2, real_salt = salt.substring(offset + 3, offset + 25);
    password += minor >= "a" ? "\0" : "";
    var passwordb = utf8Array(password), saltb = base64_decode(real_salt, BCRYPT_SALT_LEN);
    function finish(bytes) {
      var res = [];
      res.push("$2");
      if (minor >= "a") res.push(minor);
      res.push("$");
      if (rounds < 10) res.push("0");
      res.push(rounds.toString());
      res.push("$");
      res.push(base64_encode(saltb, saltb.length));
      res.push(base64_encode(bytes, C_ORIG.length * 4 - 1));
      return res.join("");
    }
    if (typeof callback == "undefined")
      return finish(_crypt(passwordb, saltb, rounds));
    else {
      _crypt(
        passwordb,
        saltb,
        rounds,
        function(err2, bytes) {
          if (err2) callback(err2, null);
          else callback(null, finish(bytes));
        },
        progressCallback
      );
    }
  }
  function encodeBase64(bytes, length) {
    return base64_encode(bytes, length);
  }
  function decodeBase64(string, length) {
    return base64_decode(string, length);
  }
  var import_crypto, randomFallback, nextTick, BASE64_CODE, BASE64_INDEX, BCRYPT_SALT_LEN, GENSALT_DEFAULT_LOG2_ROUNDS, BLOWFISH_NUM_ROUNDS, MAX_EXECUTION_TIME, P_ORIG, S_ORIG, C_ORIG, bcryptjs_default;
  var init_bcryptjs = __esm({
    "node_modules/bcryptjs/index.js"() {
      import_crypto = __toESM(require_crypto(), 1);
      randomFallback = null;
      nextTick = typeof setImmediate === "function" ? setImmediate : typeof scheduler === "object" && typeof scheduler.postTask === "function" ? scheduler.postTask.bind(scheduler) : setTimeout;
      BASE64_CODE = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
      BASE64_INDEX = [
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        0,
        1,
        54,
        55,
        56,
        57,
        58,
        59,
        60,
        61,
        62,
        63,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        -1,
        -1,
        -1,
        -1,
        -1,
        -1,
        28,
        29,
        30,
        31,
        32,
        33,
        34,
        35,
        36,
        37,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        46,
        47,
        48,
        49,
        50,
        51,
        52,
        53,
        -1,
        -1,
        -1,
        -1,
        -1
      ];
      BCRYPT_SALT_LEN = 16;
      GENSALT_DEFAULT_LOG2_ROUNDS = 10;
      BLOWFISH_NUM_ROUNDS = 16;
      MAX_EXECUTION_TIME = 100;
      P_ORIG = [
        608135816,
        2242054355,
        320440878,
        57701188,
        2752067618,
        698298832,
        137296536,
        3964562569,
        1160258022,
        953160567,
        3193202383,
        887688300,
        3232508343,
        3380367581,
        1065670069,
        3041331479,
        2450970073,
        2306472731
      ];
      S_ORIG = [
        3509652390,
        2564797868,
        805139163,
        3491422135,
        3101798381,
        1780907670,
        3128725573,
        4046225305,
        614570311,
        3012652279,
        134345442,
        2240740374,
        1667834072,
        1901547113,
        2757295779,
        4103290238,
        227898511,
        1921955416,
        1904987480,
        2182433518,
        2069144605,
        3260701109,
        2620446009,
        720527379,
        3318853667,
        677414384,
        3393288472,
        3101374703,
        2390351024,
        1614419982,
        1822297739,
        2954791486,
        3608508353,
        3174124327,
        2024746970,
        1432378464,
        3864339955,
        2857741204,
        1464375394,
        1676153920,
        1439316330,
        715854006,
        3033291828,
        289532110,
        2706671279,
        2087905683,
        3018724369,
        1668267050,
        732546397,
        1947742710,
        3462151702,
        2609353502,
        2950085171,
        1814351708,
        2050118529,
        680887927,
        999245976,
        1800124847,
        3300911131,
        1713906067,
        1641548236,
        4213287313,
        1216130144,
        1575780402,
        4018429277,
        3917837745,
        3693486850,
        3949271944,
        596196993,
        3549867205,
        258830323,
        2213823033,
        772490370,
        2760122372,
        1774776394,
        2652871518,
        566650946,
        4142492826,
        1728879713,
        2882767088,
        1783734482,
        3629395816,
        2517608232,
        2874225571,
        1861159788,
        326777828,
        3124490320,
        2130389656,
        2716951837,
        967770486,
        1724537150,
        2185432712,
        2364442137,
        1164943284,
        2105845187,
        998989502,
        3765401048,
        2244026483,
        1075463327,
        1455516326,
        1322494562,
        910128902,
        469688178,
        1117454909,
        936433444,
        3490320968,
        3675253459,
        1240580251,
        122909385,
        2157517691,
        634681816,
        4142456567,
        3825094682,
        3061402683,
        2540495037,
        79693498,
        3249098678,
        1084186820,
        1583128258,
        426386531,
        1761308591,
        1047286709,
        322548459,
        995290223,
        1845252383,
        2603652396,
        3431023940,
        2942221577,
        3202600964,
        3727903485,
        1712269319,
        422464435,
        3234572375,
        1170764815,
        3523960633,
        3117677531,
        1434042557,
        442511882,
        3600875718,
        1076654713,
        1738483198,
        4213154764,
        2393238008,
        3677496056,
        1014306527,
        4251020053,
        793779912,
        2902807211,
        842905082,
        4246964064,
        1395751752,
        1040244610,
        2656851899,
        3396308128,
        445077038,
        3742853595,
        3577915638,
        679411651,
        2892444358,
        2354009459,
        1767581616,
        3150600392,
        3791627101,
        3102740896,
        284835224,
        4246832056,
        1258075500,
        768725851,
        2589189241,
        3069724005,
        3532540348,
        1274779536,
        3789419226,
        2764799539,
        1660621633,
        3471099624,
        4011903706,
        913787905,
        3497959166,
        737222580,
        2514213453,
        2928710040,
        3937242737,
        1804850592,
        3499020752,
        2949064160,
        2386320175,
        2390070455,
        2415321851,
        4061277028,
        2290661394,
        2416832540,
        1336762016,
        1754252060,
        3520065937,
        3014181293,
        791618072,
        3188594551,
        3933548030,
        2332172193,
        3852520463,
        3043980520,
        413987798,
        3465142937,
        3030929376,
        4245938359,
        2093235073,
        3534596313,
        375366246,
        2157278981,
        2479649556,
        555357303,
        3870105701,
        2008414854,
        3344188149,
        4221384143,
        3956125452,
        2067696032,
        3594591187,
        2921233993,
        2428461,
        544322398,
        577241275,
        1471733935,
        610547355,
        4027169054,
        1432588573,
        1507829418,
        2025931657,
        3646575487,
        545086370,
        48609733,
        2200306550,
        1653985193,
        298326376,
        1316178497,
        3007786442,
        2064951626,
        458293330,
        2589141269,
        3591329599,
        3164325604,
        727753846,
        2179363840,
        146436021,
        1461446943,
        4069977195,
        705550613,
        3059967265,
        3887724982,
        4281599278,
        3313849956,
        1404054877,
        2845806497,
        146425753,
        1854211946,
        1266315497,
        3048417604,
        3681880366,
        3289982499,
        290971e4,
        1235738493,
        2632868024,
        2414719590,
        3970600049,
        1771706367,
        1449415276,
        3266420449,
        422970021,
        1963543593,
        2690192192,
        3826793022,
        1062508698,
        1531092325,
        1804592342,
        2583117782,
        2714934279,
        4024971509,
        1294809318,
        4028980673,
        1289560198,
        2221992742,
        1669523910,
        35572830,
        157838143,
        1052438473,
        1016535060,
        1802137761,
        1753167236,
        1386275462,
        3080475397,
        2857371447,
        1040679964,
        2145300060,
        2390574316,
        1461121720,
        2956646967,
        4031777805,
        4028374788,
        33600511,
        2920084762,
        1018524850,
        629373528,
        3691585981,
        3515945977,
        2091462646,
        2486323059,
        586499841,
        988145025,
        935516892,
        3367335476,
        2599673255,
        2839830854,
        265290510,
        3972581182,
        2759138881,
        3795373465,
        1005194799,
        847297441,
        406762289,
        1314163512,
        1332590856,
        1866599683,
        4127851711,
        750260880,
        613907577,
        1450815602,
        3165620655,
        3734664991,
        3650291728,
        3012275730,
        3704569646,
        1427272223,
        778793252,
        1343938022,
        2676280711,
        2052605720,
        1946737175,
        3164576444,
        3914038668,
        3967478842,
        3682934266,
        1661551462,
        3294938066,
        4011595847,
        840292616,
        3712170807,
        616741398,
        312560963,
        711312465,
        1351876610,
        322626781,
        1910503582,
        271666773,
        2175563734,
        1594956187,
        70604529,
        3617834859,
        1007753275,
        1495573769,
        4069517037,
        2549218298,
        2663038764,
        504708206,
        2263041392,
        3941167025,
        2249088522,
        1514023603,
        1998579484,
        1312622330,
        694541497,
        2582060303,
        2151582166,
        1382467621,
        776784248,
        2618340202,
        3323268794,
        2497899128,
        2784771155,
        503983604,
        4076293799,
        907881277,
        423175695,
        432175456,
        1378068232,
        4145222326,
        3954048622,
        3938656102,
        3820766613,
        2793130115,
        2977904593,
        26017576,
        3274890735,
        3194772133,
        1700274565,
        1756076034,
        4006520079,
        3677328699,
        720338349,
        1533947780,
        354530856,
        688349552,
        3973924725,
        1637815568,
        332179504,
        3949051286,
        53804574,
        2852348879,
        3044236432,
        1282449977,
        3583942155,
        3416972820,
        4006381244,
        1617046695,
        2628476075,
        3002303598,
        1686838959,
        431878346,
        2686675385,
        1700445008,
        1080580658,
        1009431731,
        832498133,
        3223435511,
        2605976345,
        2271191193,
        2516031870,
        1648197032,
        4164389018,
        2548247927,
        300782431,
        375919233,
        238389289,
        3353747414,
        2531188641,
        2019080857,
        1475708069,
        455242339,
        2609103871,
        448939670,
        3451063019,
        1395535956,
        2413381860,
        1841049896,
        1491858159,
        885456874,
        4264095073,
        4001119347,
        1565136089,
        3898914787,
        1108368660,
        540939232,
        1173283510,
        2745871338,
        3681308437,
        4207628240,
        3343053890,
        4016749493,
        1699691293,
        1103962373,
        3625875870,
        2256883143,
        3830138730,
        1031889488,
        3479347698,
        1535977030,
        4236805024,
        3251091107,
        2132092099,
        1774941330,
        1199868427,
        1452454533,
        157007616,
        2904115357,
        342012276,
        595725824,
        1480756522,
        206960106,
        497939518,
        591360097,
        863170706,
        2375253569,
        3596610801,
        1814182875,
        2094937945,
        3421402208,
        1082520231,
        3463918190,
        2785509508,
        435703966,
        3908032597,
        1641649973,
        2842273706,
        3305899714,
        1510255612,
        2148256476,
        2655287854,
        3276092548,
        4258621189,
        236887753,
        3681803219,
        274041037,
        1734335097,
        3815195456,
        3317970021,
        1899903192,
        1026095262,
        4050517792,
        356393447,
        2410691914,
        3873677099,
        3682840055,
        3913112168,
        2491498743,
        4132185628,
        2489919796,
        1091903735,
        1979897079,
        3170134830,
        3567386728,
        3557303409,
        857797738,
        1136121015,
        1342202287,
        507115054,
        2535736646,
        337727348,
        3213592640,
        1301675037,
        2528481711,
        1895095763,
        1721773893,
        3216771564,
        62756741,
        2142006736,
        835421444,
        2531993523,
        1442658625,
        3659876326,
        2882144922,
        676362277,
        1392781812,
        170690266,
        3921047035,
        1759253602,
        3611846912,
        1745797284,
        664899054,
        1329594018,
        3901205900,
        3045908486,
        2062866102,
        2865634940,
        3543621612,
        3464012697,
        1080764994,
        553557557,
        3656615353,
        3996768171,
        991055499,
        499776247,
        1265440854,
        648242737,
        3940784050,
        980351604,
        3713745714,
        1749149687,
        3396870395,
        4211799374,
        3640570775,
        1161844396,
        3125318951,
        1431517754,
        545492359,
        4268468663,
        3499529547,
        1437099964,
        2702547544,
        3433638243,
        2581715763,
        2787789398,
        1060185593,
        1593081372,
        2418618748,
        4260947970,
        69676912,
        2159744348,
        86519011,
        2512459080,
        3838209314,
        1220612927,
        3339683548,
        133810670,
        1090789135,
        1078426020,
        1569222167,
        845107691,
        3583754449,
        4072456591,
        1091646820,
        628848692,
        1613405280,
        3757631651,
        526609435,
        236106946,
        48312990,
        2942717905,
        3402727701,
        1797494240,
        859738849,
        992217954,
        4005476642,
        2243076622,
        3870952857,
        3732016268,
        765654824,
        3490871365,
        2511836413,
        1685915746,
        3888969200,
        1414112111,
        2273134842,
        3281911079,
        4080962846,
        172450625,
        2569994100,
        980381355,
        4109958455,
        2819808352,
        2716589560,
        2568741196,
        3681446669,
        3329971472,
        1835478071,
        660984891,
        3704678404,
        4045999559,
        3422617507,
        3040415634,
        1762651403,
        1719377915,
        3470491036,
        2693910283,
        3642056355,
        3138596744,
        1364962596,
        2073328063,
        1983633131,
        926494387,
        3423689081,
        2150032023,
        4096667949,
        1749200295,
        3328846651,
        309677260,
        2016342300,
        1779581495,
        3079819751,
        111262694,
        1274766160,
        443224088,
        298511866,
        1025883608,
        3806446537,
        1145181785,
        168956806,
        3641502830,
        3584813610,
        1689216846,
        3666258015,
        3200248200,
        1692713982,
        2646376535,
        4042768518,
        1618508792,
        1610833997,
        3523052358,
        4130873264,
        2001055236,
        3610705100,
        2202168115,
        4028541809,
        2961195399,
        1006657119,
        2006996926,
        3186142756,
        1430667929,
        3210227297,
        1314452623,
        4074634658,
        4101304120,
        2273951170,
        1399257539,
        3367210612,
        3027628629,
        1190975929,
        2062231137,
        2333990788,
        2221543033,
        2438960610,
        1181637006,
        548689776,
        2362791313,
        3372408396,
        3104550113,
        3145860560,
        296247880,
        1970579870,
        3078560182,
        3769228297,
        1714227617,
        3291629107,
        3898220290,
        166772364,
        1251581989,
        493813264,
        448347421,
        195405023,
        2709975567,
        677966185,
        3703036547,
        1463355134,
        2715995803,
        1338867538,
        1343315457,
        2802222074,
        2684532164,
        233230375,
        2599980071,
        2000651841,
        3277868038,
        1638401717,
        4028070440,
        3237316320,
        6314154,
        819756386,
        300326615,
        590932579,
        1405279636,
        3267499572,
        3150704214,
        2428286686,
        3959192993,
        3461946742,
        1862657033,
        1266418056,
        963775037,
        2089974820,
        2263052895,
        1917689273,
        448879540,
        3550394620,
        3981727096,
        150775221,
        3627908307,
        1303187396,
        508620638,
        2975983352,
        2726630617,
        1817252668,
        1876281319,
        1457606340,
        908771278,
        3720792119,
        3617206836,
        2455994898,
        1729034894,
        1080033504,
        976866871,
        3556439503,
        2881648439,
        1522871579,
        1555064734,
        1336096578,
        3548522304,
        2579274686,
        3574697629,
        3205460757,
        3593280638,
        3338716283,
        3079412587,
        564236357,
        2993598910,
        1781952180,
        1464380207,
        3163844217,
        3332601554,
        1699332808,
        1393555694,
        1183702653,
        3581086237,
        1288719814,
        691649499,
        2847557200,
        2895455976,
        3193889540,
        2717570544,
        1781354906,
        1676643554,
        2592534050,
        3230253752,
        1126444790,
        2770207658,
        2633158820,
        2210423226,
        2615765581,
        2414155088,
        3127139286,
        673620729,
        2805611233,
        1269405062,
        4015350505,
        3341807571,
        4149409754,
        1057255273,
        2012875353,
        2162469141,
        2276492801,
        2601117357,
        993977747,
        3918593370,
        2654263191,
        753973209,
        36408145,
        2530585658,
        25011837,
        3520020182,
        2088578344,
        530523599,
        2918365339,
        1524020338,
        1518925132,
        3760827505,
        3759777254,
        1202760957,
        3985898139,
        3906192525,
        674977740,
        4174734889,
        2031300136,
        2019492241,
        3983892565,
        4153806404,
        3822280332,
        352677332,
        2297720250,
        60907813,
        90501309,
        3286998549,
        1016092578,
        2535922412,
        2839152426,
        457141659,
        509813237,
        4120667899,
        652014361,
        1966332200,
        2975202805,
        55981186,
        2327461051,
        676427537,
        3255491064,
        2882294119,
        3433927263,
        1307055953,
        942726286,
        933058658,
        2468411793,
        3933900994,
        4215176142,
        1361170020,
        2001714738,
        2830558078,
        3274259782,
        1222529897,
        1679025792,
        2729314320,
        3714953764,
        1770335741,
        151462246,
        3013232138,
        1682292957,
        1483529935,
        471910574,
        1539241949,
        458788160,
        3436315007,
        1807016891,
        3718408830,
        978976581,
        1043663428,
        3165965781,
        1927990952,
        4200891579,
        2372276910,
        3208408903,
        3533431907,
        1412390302,
        2931980059,
        4132332400,
        1947078029,
        3881505623,
        4168226417,
        2941484381,
        1077988104,
        1320477388,
        886195818,
        18198404,
        3786409e3,
        2509781533,
        112762804,
        3463356488,
        1866414978,
        891333506,
        18488651,
        661792760,
        1628790961,
        3885187036,
        3141171499,
        876946877,
        2693282273,
        1372485963,
        791857591,
        2686433993,
        3759982718,
        3167212022,
        3472953795,
        2716379847,
        445679433,
        3561995674,
        3504004811,
        3574258232,
        54117162,
        3331405415,
        2381918588,
        3769707343,
        4154350007,
        1140177722,
        4074052095,
        668550556,
        3214352940,
        367459370,
        261225585,
        2610173221,
        4209349473,
        3468074219,
        3265815641,
        314222801,
        3066103646,
        3808782860,
        282218597,
        3406013506,
        3773591054,
        379116347,
        1285071038,
        846784868,
        2669647154,
        3771962079,
        3550491691,
        2305946142,
        453669953,
        1268987020,
        3317592352,
        3279303384,
        3744833421,
        2610507566,
        3859509063,
        266596637,
        3847019092,
        517658769,
        3462560207,
        3443424879,
        370717030,
        4247526661,
        2224018117,
        4143653529,
        4112773975,
        2788324899,
        2477274417,
        1456262402,
        2901442914,
        1517677493,
        1846949527,
        2295493580,
        3734397586,
        2176403920,
        1280348187,
        1908823572,
        3871786941,
        846861322,
        1172426758,
        3287448474,
        3383383037,
        1655181056,
        3139813346,
        901632758,
        1897031941,
        2986607138,
        3066810236,
        3447102507,
        1393639104,
        373351379,
        950779232,
        625454576,
        3124240540,
        4148612726,
        2007998917,
        544563296,
        2244738638,
        2330496472,
        2058025392,
        1291430526,
        424198748,
        50039436,
        29584100,
        3605783033,
        2429876329,
        2791104160,
        1057563949,
        3255363231,
        3075367218,
        3463963227,
        1469046755,
        985887462
      ];
      C_ORIG = [
        1332899944,
        1700884034,
        1701343084,
        1684370003,
        1668446532,
        1869963892
      ];
      bcryptjs_default = {
        setRandomFallback,
        genSaltSync,
        genSalt,
        hashSync,
        hash,
        compareSync,
        compare,
        getRounds,
        getSalt,
        truncates,
        encodeBase64,
        decodeBase64
      };
    }
  });

  // src/web/hal-ui/views/SetupWizard.ts
  async function renderSetupWizard(container) {
    injectWizardStyles2();
    let status;
    try {
      status = await provisioningApi.getStatus();
    } catch {
      container.innerHTML = renderError(
        "Could not connect to FF_SmartControl. Please refresh."
      );
      return;
    }
    if (!status.isUnprovisioned && status.state === "completed") {
      window.location.hash = "#dashboard";
      window.location.reload();
      return;
    }
    try {
      const session = await provisioningApi.getWizardSession();
      if (session) {
        wizardData = {
          ...DEFAULT_DATA,
          farmName: session.farmName || "My Farm",
          timezone: session.timezone || wizardData.timezone,
          wifiConfigured: session.wifiConfigured ?? false,
          llmProvider: session.llmProvider || "ollama",
          llmEndpoint: session.llmEndpoint || "http://localhost:11434",
          telegramEnabled: session.telegramEnabled,
          adminPasswordHash: session.adminPasswordHash || ""
        };
      }
    } catch {
    }
    hasEthernet = status.hasNetworkConnectivity;
    if (status.state === "unprovisioned") {
      try {
        await provisioningApi.begin();
      } catch {
      }
    }
    if (status.wizardStep && status.wizardStep >= 1 && status.wizardStep <= 6) {
      currentStep2 = status.wizardStep;
    }
    render(container);
  }
  function render(container) {
    const effectiveSteps = hasEthernet ? [1, 2, 3, 5, 6] : TOTAL_STEPS;
    const currentIndex = effectiveSteps.indexOf(currentStep2);
    container.innerHTML = `
    <div class="wizard-page">
      <div class="wizard-card">
        <div class="wizard-header">
          <div class="wizard-logo">
            <img src="./ff_logo_svg.svg" alt="FF_SmartControl" />
          </div>
          <h1 class="wizard-title">Welcome to FF_SmartControl</h1>
          <p class="wizard-subtitle">Let's set up your farm controller in a few steps</p>
        </div>

        <div class="wizard-progress">
          <div class="wizard-progress-steps">
            ${effectiveSteps.map((step, idx) => renderProgressStep(step, idx, currentIndex, effectiveSteps)).join("")}
          </div>
          <div class="wizard-progress-bar">
            <div class="wizard-progress-fill" style="width: ${currentIndex / (effectiveSteps.length - 1) * 100}%"></div>
          </div>
        </div>

        <div class="wizard-body" id="wizard-body">
          ${renderStepBody(currentStep2)}
        </div>

        <div class="wizard-footer">
          ${currentIndex > 0 ? '<button class="wizard-btn wizard-btn-back" id="wizard-back">Back</button>' : "<div></div>"}
          <button class="wizard-btn wizard-btn-next" id="wizard-next" ${isSubmitting ? "disabled" : ""}>
            ${isSubmitting ? "Saving..." : currentIndex === effectiveSteps.length - 1 ? "Complete Setup" : "Next"}
          </button>
        </div>

        ${currentStep2 !== 1 ? '<button class="wizard-skip-label" id="wizard-back-to-start">\u2190 Start over</button>' : ""}
      </div>
    </div>
  `;
    attachWizardEvents(container, effectiveSteps, currentIndex);
  }
  function renderProgressStep(step, idx, currentIdx, effectiveSteps) {
    const isComplete = idx < currentIdx;
    const isCurrent = idx === currentIdx;
    const label = hasEthernet && step === 4 ? "WiFi (skip)" : STEP_LABELS[step];
    return `
    <div class="progress-step ${isComplete ? "complete" : ""} ${isCurrent ? "current" : ""}">
      <div class="progress-step-dot">${isComplete ? "\u2713" : idx + 1}</div>
      <div class="progress-step-label">${label}</div>
    </div>
  `;
  }
  function renderStepBody(step) {
    switch (step) {
      case 1:
        return renderPasswordStep();
      case 2:
        return renderFarmNameStep();
      case 3:
        return renderTimezoneStep();
      case 4:
        return renderWifiStep();
      case 5:
        return renderLlmStep();
      case 6:
        return renderTelegramStep();
      default:
        return "";
    }
  }
  function renderPasswordStep() {
    return `
    <div class="wizard-step-content">
      <h2 class="step-title">Create Admin Password</h2>
      <p class="step-desc">This password protects your FF_SmartControl settings. Keep it safe \u2014 it cannot be recovered.</p>

      <div class="form-group">
        <label class="form-label" for="password">Admin Password</label>
        <div class="input-wrapper">
          <input
            type="password"
            id="password"
            class="form-input"
            placeholder="Minimum 8 characters"
            value="${escapeHtml13(wizardData.adminPassword)}"
            minlength="8"
            autocomplete="new-password"
          />
          <button type="button" class="input-toggle" id="toggle-password" aria-label="Show password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="form-hint" id="password-hint"></div>
      </div>

      <div class="form-group">
        <label class="form-label" for="password-confirm">Confirm Password</label>
        <div class="input-wrapper">
          <input
            type="password"
            id="password-confirm"
            class="form-input"
            placeholder="Repeat password"
            minlength="8"
            autocomplete="new-password"
          />
          <button type="button" class="input-toggle" id="toggle-password-confirm" aria-label="Show password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="form-hint" id="password-confirm-hint"></div>
      </div>

      <div class="form-group">
        <div class="password-strength" id="password-strength">
          <div class="strength-bars">
            <div class="strength-bar" data-index="0"></div>
            <div class="strength-bar" data-index="1"></div>
            <div class="strength-bar" data-index="2"></div>
            <div class="strength-bar" data-index="3"></div>
          </div>
          <span class="strength-label" id="strength-label">Enter a password</span>
        </div>
      </div>
    </div>
  `;
  }
  function renderFarmNameStep() {
    return `
    <div class="wizard-step-content">
      <h2 class="step-title">Name Your Farm</h2>
      <p class="step-desc">Give your farm a name. This appears in the dashboard header and notifications.</p>

      <div class="form-group">
        <label class="form-label" for="farm-name">Farm Name</label>
        <input
          type="text"
          id="farm-name"
          class="form-input"
          placeholder="My Farm"
          value="${escapeHtml13(wizardData.farmName)}"
          maxlength="64"
          autocomplete="off"
        />
        <div class="form-hint">Maximum 64 characters. Leave blank for "My Farm".</div>
      </div>
    </div>
  `;
  }
  function renderTimezoneStep() {
    const currentTz = wizardData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currentRegion = currentTz.split("/")[0] || "";
    const regionGroups = {};
    for (const tz of COMMON_TIMEZONES) {
      const region = tz.value.split("/")[0];
      if (!regionGroups[region]) regionGroups[region] = [];
      regionGroups[region].push(tz);
    }
    const regionOptions = Object.keys(regionGroups).sort().map(
      (region) => `
      <optgroup label="${region}">
        ${regionGroups[region].map(
        (tz) => `
          <option value="${tz.value}" ${tz.value === currentTz ? "selected" : ""}>
            ${tz.label}
          </option>
        `
      ).join("")}
      </optgroup>
    `
    ).join("");
    return `
    <div class="wizard-step-content">
      <h2 class="step-title">Set Your Timezone</h2>
      <p class="step-desc">FF_SmartControl uses this timezone for scheduling and decision logs.</p>

      <div class="form-group">
        <label class="form-label" for="timezone">Timezone</label>
        <select id="timezone" class="form-select">
          ${regionOptions}
        </select>
        <div class="form-hint">Detected: <strong id="detected-timezone">${escapeHtml13(currentTz)}</strong></div>
      </div>
    </div>
  `;
  }
  function renderWifiStep() {
    return `
    <div class="wizard-step-content">
      <h2 class="step-title">WiFi Connection</h2>
      <p class="step-desc">Connect FF_SmartControl to your network. Ethernet is recommended if available.</p>

      <div class="form-group">
        <label class="form-label" for="wifi-ssid">Network (SSID)</label>
        <input
          type="text"
          id="wifi-ssid"
          class="form-input"
          placeholder="Enter network name or select below"
          value="${escapeHtml13(wizardData.wifiSsid)}"
          maxlength="32"
          autocomplete="off"
          list="wifi-networks-list"
        />
        <datalist id="wifi-networks-list">
          ${wifiNetworks.map((n) => `<option value="${escapeHtml13(n.ssid)}">`).join("")}
        </datalist>
      </div>

      <div class="form-group">
        <label class="form-label" for="wifi-password">Password</label>
        <div class="input-wrapper">
          <input
            type="password"
            id="wifi-password"
            class="form-input"
            placeholder="Network password"
            autocomplete="off"
          />
          <button type="button" class="input-toggle" id="toggle-wifi-password" aria-label="Show password">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>

      <div class="wifi-status" id="wifi-status"></div>
    </div>
  `;
  }
  function renderLlmStep() {
    const selectedProvider = LLM_PROVIDERS.find((p) => p.id === wizardData.llmProvider) || LLM_PROVIDERS[0];
    const showApiKey = selectedProvider && "supportsApiKey" in selectedProvider && selectedProvider.supportsApiKey;
    const showEndpoint = selectedProvider && "defaultEndpoint" in selectedProvider;
    const showModel = selectedProvider && "supportsModel" in selectedProvider && selectedProvider.supportsModel;
    return `
    <div class="wizard-step-content">
      <h2 class="step-title">AI Provider</h2>
      <p class="step-desc">Choose how FF_SmartControl connects to its AI brain. Local options run entirely on your network.</p>

      <div class="form-group">
        <label class="form-label">Provider</label>
        <div class="provider-grid">
          ${LLM_PROVIDERS.map(
      (p) => `
            <button type="button" class="provider-card ${p.id === wizardData.llmProvider ? "selected" : ""}" data-provider="${p.id}">
              <div class="provider-name">${p.name}</div>
            </button>
          `
    ).join("")}
        </div>
      </div>

      ${showEndpoint ? `
      <div class="form-group">
        <label class="form-label" for="llm-endpoint">Endpoint URL</label>
        <input
          type="url"
          id="llm-endpoint"
          class="form-input"
          placeholder="http://localhost:11434"
          value="${escapeHtml13(wizardData.llmEndpoint)}"
        />
        <div class="form-hint">${wizardData.llmProvider === "ollama" ? "Ollama must be running on your device." : "LM Studio server address."}</div>
      </div>
      ` : ""}

      ${showApiKey ? `
      <div class="form-group">
        <label class="form-label" for="llm-api-key">API Key</label>
        <div class="input-wrapper">
          <input
            type="password"
            id="llm-api-key"
            class="form-input"
            placeholder="sk-..."
            value="${escapeHtml13(wizardData.llmApiKey)}"
            autocomplete="off"
          />
          <button type="button" class="input-toggle" id="toggle-api-key" aria-label="Show API key">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="form-hint">Your API key is stored securely in .env and never sent to our servers.</div>
      </div>
      ` : ""}

      ${showModel ? `
      <div class="form-group">
        <label class="form-label" for="llm-model">Model</label>
        <input
          type="text"
          id="llm-model"
          class="form-input"
          placeholder="${wizardData.llmProvider === "ollama" ? "llama3.2, mistral, etc." : "e.g., llama3.2"}"
          value="${escapeHtml13(wizardData.llmModel)}"
          autocomplete="off"
        />
        <div class="form-hint">Must match an installed model in your Ollama/LM Studio.</div>
      </div>
      ` : ""}
    </div>
  `;
  }
  function renderTelegramStep() {
    return `
    <div class="wizard-step-content">
      <h2 class="step-title">Telegram <span class="badge-optional">Optional</span></h2>
      <p class="step-desc">Connect Telegram to receive alerts and control FF_SmartControl from your phone.</p>

      <div class="form-group">
        <div class="toggle-row">
          <div>
            <div class="toggle-label">Enable Telegram</div>
            <div class="toggle-desc">Receive notifications and commands via Telegram bot</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="telegram-enabled" ${wizardData.telegramEnabled ? "checked" : ""}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="form-group telegram-fields ${wizardData.telegramEnabled ? "" : "hidden"}">
        <label class="form-label" for="telegram-token">Bot Token</label>
        <div class="input-wrapper">
          <input
            type="password"
            id="telegram-token"
            class="form-input"
            placeholder="123456789:ABCdefGHI..."
            value="${escapeHtml13(wizardData.telegramBotToken)}"
            autocomplete="off"
          />
          <button type="button" class="input-toggle" id="toggle-telegram-token" aria-label="Show token">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="form-hint">Create a bot via <strong>@BotFather</strong> in Telegram to get your token.</div>
      </div>

      <div class="skip-note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Telegram can be configured later in Settings.
      </div>
    </div>
  `;
  }
  function renderError(message) {
    return `
    <div class="wizard-page">
      <div class="wizard-card wizard-error">
        <div class="error-icon">\u26A0</div>
        <h2>Setup Error</h2>
        <p>${escapeHtml13(message)}</p>
        <button class="wizard-btn wizard-btn-next" onclick="location.reload()">Refresh</button>
      </div>
    </div>
  `;
  }
  function attachWizardEvents(container, effectiveSteps, currentIndex) {
    setupPasswordToggle("toggle-password", "password");
    setupPasswordToggle("toggle-password-confirm", "password-confirm");
    setupPasswordToggle("toggle-wifi-password", "wifi-password");
    setupPasswordToggle("toggle-api-key", "llm-api-key");
    setupPasswordToggle("toggle-telegram-token", "telegram-token");
    const passwordInput = document.getElementById("password");
    const passwordConfirm = document.getElementById(
      "password-confirm"
    );
    if (passwordInput) {
      passwordInput.addEventListener(
        "input",
        () => updatePasswordStrength(passwordInput.value)
      );
      passwordInput.addEventListener("blur", () => validatePasswordStep());
    }
    if (passwordConfirm) {
      passwordConfirm.addEventListener("blur", () => validatePasswordStep());
    }
    document.querySelectorAll(".provider-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const provider = btn.dataset.provider;
        wizardData.llmProvider = provider;
        const p = LLM_PROVIDERS.find((x) => x.id === provider);
        if (p && "defaultEndpoint" in p && p.defaultEndpoint) {
          wizardData.llmEndpoint = p.defaultEndpoint;
        }
        const body = document.getElementById("wizard-body");
        if (body) body.innerHTML = renderLlmStep();
        attachWizardEvents(container, effectiveSteps, currentIndex);
      });
    });
    const telegramToggle = document.getElementById(
      "telegram-enabled"
    );
    const telegramFields = document.querySelector(".telegram-fields");
    if (telegramToggle && telegramFields) {
      telegramToggle.addEventListener("change", () => {
        wizardData.telegramEnabled = telegramToggle.checked;
        telegramFields.classList.toggle("hidden", !telegramToggle.checked);
      });
    }
    const backBtn = document.getElementById("wizard-back");
    backBtn?.addEventListener("click", async () => {
      if (currentIndex > 0) {
        await saveCurrentStep(currentStep2, effectiveSteps[currentIndex]);
        currentStep2 = effectiveSteps[currentIndex - 1];
        wizardData = loadStepData(currentStep2);
        render(container);
      }
    });
    const backToStart = document.getElementById("wizard-back-to-start");
    backToStart?.addEventListener("click", async () => {
      currentStep2 = effectiveSteps[0];
      wizardData = { ...DEFAULT_DATA };
      await provisioningApi.updateWizardStep(1, {});
      render(container);
    });
    const nextBtn = document.getElementById("wizard-next");
    nextBtn?.addEventListener("click", async () => {
      if (!validateCurrentStep(currentStep2)) return;
      isSubmitting = true;
      render(container);
      try {
        await saveCurrentStep(currentIndex, currentStep2);
        if (currentIndex < effectiveSteps.length - 1) {
          currentStep2 = effectiveSteps[currentIndex + 1];
          wizardData = loadStepData(currentStep2);
          render(container);
        } else {
          await completeWizard(container);
        }
      } catch (err) {
        showStepError(currentStep2, err.message || "An error occurred");
        render(container);
      } finally {
        isSubmitting = false;
      }
    });
  }
  async function saveCurrentStep(currentIndex, step) {
    switch (step) {
      case 1: {
        const pwd = document.getElementById("password")?.value || "";
        wizardData.adminPassword = pwd;
        if (pwd && !wizardData.adminPasswordHash) {
          wizardData.adminPasswordHash = await bcryptjs_default.hash(pwd, 10);
        }
        break;
      }
      case 2: {
        wizardData.farmName = document.getElementById("farm-name")?.value || "My Farm";
        break;
      }
      case 3: {
        wizardData.timezone = document.getElementById("timezone")?.value || wizardData.timezone;
        break;
      }
      case 4: {
        wizardData.wifiSsid = document.getElementById("wifi-ssid")?.value || "";
        wizardData.wifiPassword = document.getElementById("wifi-password")?.value || "";
        wizardData.wifiConfigured = !!wizardData.wifiSsid;
        break;
      }
      case 5: {
        wizardData.llmEndpoint = document.getElementById("llm-endpoint")?.value || wizardData.llmEndpoint;
        wizardData.llmApiKey = document.getElementById("llm-api-key")?.value || "";
        wizardData.llmModel = document.getElementById("llm-model")?.value || "";
        break;
      }
      case 6: {
        wizardData.telegramBotToken = document.getElementById("telegram-token")?.value || "";
        break;
      }
    }
    await provisioningApi.updateWizardStep(step, {
      farmName: wizardData.farmName,
      timezone: wizardData.timezone,
      wifiConfigured: wizardData.wifiConfigured,
      llmProvider: wizardData.llmProvider
    });
  }
  function loadStepData(step) {
    return wizardData;
  }
  function validateCurrentStep(step) {
    switch (step) {
      case 1:
        return validatePasswordStep();
      case 2:
        return true;
      // farm name always valid
      case 3:
        return true;
      // timezone always valid
      case 4:
        return true;
      // wifi optional
      case 5:
        return validateLlmStep();
      case 6:
        return true;
      // telegram optional
      default:
        return true;
    }
  }
  function validatePasswordStep() {
    const pwd = document.getElementById("password")?.value || "";
    const pwdConfirm = document.getElementById("password-confirm")?.value || "";
    const hint = document.getElementById("password-hint");
    const confirmHint = document.getElementById("password-confirm-hint");
    if (!pwd) {
      hint.textContent = "Admin password is required.";
      hint.className = "form-hint text-danger";
      return false;
    }
    if (pwd.length < 8) {
      hint.textContent = "Password must be at least 8 characters.";
      hint.className = "form-hint text-danger";
      return false;
    }
    if (pwdConfirm && pwd !== pwdConfirm) {
      hint.textContent = "";
      confirmHint.textContent = "Passwords do not match.";
      confirmHint.className = "form-hint text-danger";
      return false;
    }
    if (hint) {
      hint.textContent = "";
      hint.className = "form-hint";
    }
    if (confirmHint) {
      confirmHint.textContent = "";
      confirmHint.className = "form-hint";
    }
    return true;
  }
  function validateLlmStep() {
    const provider = wizardData.llmProvider;
    const selectedProvider = LLM_PROVIDERS.find((p) => p.id === provider);
    if (selectedProvider && "supportsApiKey" in selectedProvider && selectedProvider.supportsApiKey) {
      const apiKey = document.getElementById("llm-api-key")?.value || "";
      if (!apiKey) {
        showStepError(5, "API key is required for cloud providers.");
        return false;
      }
    }
    return true;
  }
  function showStepError(step, message) {
    const body = document.getElementById("wizard-body");
    if (body) {
      body.innerHTML = `
      <div class="wizard-step-content">
        <div class="step-error">${escapeHtml13(message)}</div>
      </div>
    `;
    }
  }
  async function completeWizard(container) {
    wizardData.farmName = document.getElementById("farm-name")?.value || "My Farm";
    wizardData.timezone = document.getElementById("timezone")?.value || wizardData.timezone;
    wizardData.wifiSsid = document.getElementById("wifi-ssid")?.value || "";
    wizardData.wifiPassword = document.getElementById("wifi-password")?.value || "";
    wizardData.llmEndpoint = document.getElementById("llm-endpoint")?.value || wizardData.llmEndpoint;
    wizardData.llmApiKey = document.getElementById("llm-api-key")?.value || "";
    wizardData.llmModel = document.getElementById("llm-model")?.value || "";
    wizardData.telegramBotToken = document.getElementById("telegram-token")?.value || "";
    if (!wizardData.adminPasswordHash) {
      const pwd = document.getElementById("password")?.value;
      if (pwd) wizardData.adminPasswordHash = await bcryptjs_default.hash(pwd, 10);
    }
    const completeData = {
      farmName: wizardData.farmName || "My Farm",
      adminPasswordHash: wizardData.adminPasswordHash,
      timezone: wizardData.timezone,
      wifiSsid: wizardData.wifiSsid || void 0,
      wifiPassword: wizardData.wifiPassword || void 0,
      wifiConfigured: wizardData.wifiConfigured,
      llmProvider: wizardData.llmProvider,
      llmEndpoint: wizardData.llmEndpoint,
      llmApiKey: wizardData.llmApiKey,
      llmModel: wizardData.llmModel,
      telegramEnabled: wizardData.telegramEnabled,
      telegramBotToken: wizardData.telegramBotToken
    };
    try {
      await provisioningApi.complete(completeData);
      sessionStorage.setItem("operatorId", "admin");
      window.location.hash = "#dashboard";
      window.location.reload();
    } catch (err) {
      showStepError(
        6,
        err.message || "Setup could not be saved \u2014 please try again."
      );
    }
  }
  function updatePasswordStrength(pwd) {
    const bars = document.querySelectorAll(".strength-bar");
    const label = document.getElementById("strength-label");
    if (!bars.length || !label) return;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
    const labels = ["Too weak", "Weak", "Fair", "Strong"];
    const colors = ["#F85149", "#F85149", "#D29922", "#2EA043"];
    bars.forEach((bar, i) => {
      bar.style.background = i < score ? colors[Math.min(score - 1, 3)] : "var(--border)";
    });
    label.textContent = pwd.length === 0 ? "Enter a password" : labels[Math.min(score - 1, 3)] || "Too weak";
    label.style.color = pwd.length === 0 ? "var(--text-secondary)" : colors[Math.min(score - 1, 3)];
  }
  function setupPasswordToggle(btnId, inputId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;
    btn.addEventListener("click", () => {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password"
      );
    });
  }
  function escapeHtml13(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function injectWizardStyles2() {
    if (document.getElementById("wizard-styles")) return;
    const style = document.createElement("style");
    style.id = "wizard-styles";
    style.textContent = `
/* ===== Wizard Page Layout ===== */
.wizard-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--bg-primary);
}

.wizard-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 520px;
  padding: var(--space-8);
  box-shadow: var(--shadow-card-lg);
}

.wizard-card.wizard-error {
  text-align: center;
}

.error-icon {
  font-size: 48px;
  margin-bottom: var(--space-4);
}

/* ===== Header ===== */
.wizard-header {
  text-align: center;
  margin-bottom: var(--space-6);
}

.wizard-logo {
  margin-bottom: var(--space-4);
}

.wizard-logo img {
  width: 56px;
  height: 56px;
}

.wizard-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
}

.wizard-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

/* ===== Progress ===== */
.wizard-progress {
  margin-bottom: var(--space-6);
}

.wizard-progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  position: relative;
}

.wizard-progress-steps::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 20px;
  right: 20px;
  height: 1px;
  background: var(--border);
  z-index: 0;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
  z-index: 1;
}

.progress-step-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-tertiary);
  transition: all var(--transition-base);
}

.progress-step.current .progress-step-dot {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.progress-step.complete .progress-step-dot {
  background: var(--success);
  border-color: var(--success);
  color: white;
}

.progress-step-label {
  font-size: 10px;
  color: var(--text-tertiary);
  white-space: nowrap;
  text-align: center;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-step.current .progress-step-label,
.progress-step.complete .progress-step-label {
  color: var(--text-secondary);
}

.wizard-progress-bar {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.wizard-progress-fill {
  height: 100%;
  background: var(--accent);
  transition: width var(--transition-base);
}

/* ===== Step Body ===== */
.wizard-body {
  min-height: 280px;
}

.wizard-step-content {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.step-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 var(--space-6);
  line-height: 1.5;
}

.step-error {
  background: color-mix(in srgb, var(--danger) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger) 40%, transparent);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  color: var(--danger);
  font-size: 14px;
  margin-bottom: var(--space-4);
}

/* ===== Form Elements ===== */
.form-group {
  margin-bottom: var(--space-5);
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.form-input {
  width: 100%;
  height: 40px;
  padding: 0 var(--space-3);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
}

.form-input::placeholder {
  color: var(--text-tertiary);
}

.form-select {
  width: 100%;
  height: 40px;
  padding: 0 var(--space-3);
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: var(--accent);
}

.form-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: var(--space-1);
}

.form-hint.text-danger {
  color: var(--danger);
}

.input-wrapper {
  position: relative;
}

.input-wrapper .form-input {
  padding-right: 40px;
}

.input-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast);
}

.input-toggle:hover {
  color: var(--text-secondary);
}

/* ===== Password Strength ===== */
.password-strength {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.strength-bars {
  display: flex;
  gap: 4px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  transition: background var(--transition-base);
}

.strength-label {
  font-size: 12px;
  color: var(--text-tertiary);
  transition: color var(--transition-base);
}

/* ===== Provider Grid ===== */
.provider-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

.provider-card {
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-fast);
}

.provider-card:hover {
  border-color: var(--text-tertiary);
}

.provider-card.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-tertiary));
}

.provider-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

/* ===== Toggle ===== */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.toggle-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.toggle-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all var(--transition-base);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  transition: transform var(--transition-base);
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--accent);
  border-color: var(--accent);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* ===== Telegram ===== */
.badge-optional {
  font-size: 11px;
  font-weight: 500;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
}

.skip-note {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: var(--space-4);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.hidden {
  display: none !important;
}

/* ===== WiFi Status ===== */
.wifi-status {
  font-size: 13px;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  margin-top: var(--space-2);
}

.wifi-status.info {
  background: color-mix(in srgb, var(--info) 10%, transparent);
  color: var(--info);
}

.wifi-status.error {
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  color: var(--danger);
}

.wifi-status.success {
  background: color-mix(in srgb, var(--success) 10%, transparent);
  color: var(--success);
}

/* ===== Footer ===== */
.wizard-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}

.wizard-btn {
  height: 40px;
  padding: 0 var(--space-6);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
}

.wizard-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wizard-btn-back {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.wizard-btn-back:hover:not(:disabled) {
  background: var(--border);
  color: var(--text-primary);
}

.wizard-btn-next {
  background: var(--accent);
  color: white;
}

.wizard-btn-next:hover:not(:disabled) {
  background: var(--accent-bright, var(--accent));
}

.wizard-skip-label {
  display: block;
  margin: var(--space-4) auto 0;
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 12px;
  cursor: pointer;
  padding: var(--space-2);
}

.wizard-skip-label:hover {
  color: var(--text-secondary);
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .wizard-card {
    padding: var(--space-5);
    border-radius: var(--radius-md);
  }

  .wizard-progress-steps {
    gap: 0;
  }

  .progress-step-label {
    display: none;
  }

  .provider-grid {
    grid-template-columns: 1fr;
  }

  .wizard-footer {
    gap: var(--space-3);
  }

  .wizard-btn-back {
    padding: 0 var(--space-4);
  }

  .wizard-btn-next {
    flex: 1;
  }
}
`;
    document.head.appendChild(style);
  }
  var DEFAULT_DATA, STEP_LABELS, TOTAL_STEPS, currentStep2, wizardData, hasEthernet, isSubmitting, COMMON_TIMEZONES, wifiNetworks, LLM_PROVIDERS;
  var init_SetupWizard = __esm({
    "src/web/hal-ui/views/SetupWizard.ts"() {
      "use strict";
      init_api_provisioning();
      init_bcryptjs();
      DEFAULT_DATA = {
        adminPassword: "",
        adminPasswordHash: "",
        farmName: "My Farm",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        wifiSsid: "",
        wifiPassword: "",
        wifiConfigured: false,
        llmProvider: "ollama",
        llmEndpoint: "http://localhost:11434",
        llmApiKey: "",
        llmModel: "",
        telegramEnabled: false,
        telegramBotToken: ""
      };
      STEP_LABELS = {
        1: "Admin Password",
        2: "Farm Name",
        3: "Timezone",
        4: "WiFi",
        5: "LLM Provider",
        6: "Telegram"
      };
      TOTAL_STEPS = [1, 2, 3, 4, 5, 6];
      currentStep2 = 1;
      wizardData = { ...DEFAULT_DATA };
      hasEthernet = false;
      isSubmitting = false;
      COMMON_TIMEZONES = [
        { value: "America/New_York", label: "US Eastern (New York)" },
        { value: "America/Chicago", label: "US Central (Chicago)" },
        { value: "America/Denver", label: "US Mountain (Denver)" },
        { value: "America/Los_Angeles", label: "US Pacific (Los Angeles)" },
        { value: "America/Phoenix", label: "US Arizona (Phoenix)" },
        { value: "America/Anchorage", label: "US Alaska (Anchorage)" },
        { value: "Pacific/Honolulu", label: "US Hawaii (Honolulu)" },
        { value: "Europe/London", label: "UK (London)" },
        { value: "Europe/Paris", label: "France (Paris)" },
        { value: "Europe/Berlin", label: "Germany (Berlin)" },
        { value: "Europe/Amsterdam", label: "Netherlands (Amsterdam)" },
        { value: "Europe/Stockholm", label: "Sweden (Stockholm)" },
        { value: "Europe/Madrid", label: "Spain (Madrid)" },
        { value: "Europe/Rome", label: "Italy (Rome)" },
        { value: "Asia/Dubai", label: "UAE (Dubai)" },
        { value: "Asia/Kolkata", label: "India (Kolkata)" },
        { value: "Asia/Singapore", label: "Singapore" },
        { value: "Asia/Shanghai", label: "China (Shanghai)" },
        { value: "Asia/Tokyo", label: "Japan (Tokyo)" },
        { value: "Australia/Sydney", label: "Australia (Sydney)" },
        { value: "Australia/Perth", label: "Australia (Perth)" },
        { value: "Pacific/Auckland", label: "New Zealand (Auckland)" }
      ];
      wifiNetworks = [];
      LLM_PROVIDERS = [
        {
          id: "ollama",
          name: "Ollama (Local)",
          defaultEndpoint: "http://localhost:11434",
          supportsModel: true
        },
        { id: "openai", name: "OpenAI", supportsApiKey: true },
        { id: "anthropic", name: "Anthropic", supportsApiKey: true },
        { id: "zai", name: "ZAI", supportsApiKey: true },
        { id: "minimax", name: "MiniMax", supportsApiKey: true },
        {
          id: "lmstudio",
          name: "LM Studio (Local)",
          defaultEndpoint: "http://localhost:1234",
          supportsModel: true
        }
      ];
    }
  });

  // src/web/hal-ui/views/Safety.ts
  async function renderSafety(container) {
    injectModalStyles();
    injectSafetyStyles();
    container.innerHTML = `
    <div class="safety-view">
      <div class="safety-header">
        <h1 class="view-title">Safety</h1>
        <div class="safety-actions">
          <button class="btn btn-primary" id="add-rule-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Rule
          </button>
        </div>
      </div>

      <div class="safety-summary-cards" id="safety-summary">
        <div class="safety-summary-card loading">Loading...</div>
      </div>

      <div class="safety-viz-grid mb-4">
        <div id="safety-denial-heatmap">
          <div class="safety-summary-card loading">Loading denials...</div>
        </div>
        <div id="safety-threshold-bars">
          <div class="safety-summary-card loading">Loading thresholds...</div>
        </div>
      </div>

      <!-- Tab bar for Safety Rules vs Thresholds -->
      <div class="safety-tabs" id="safety-tabs">
        <button class="safety-tab active" data-tab="rules">Safety Rules</button>
        <button class="safety-tab" data-tab="thresholds">Thresholds</button>
      </div>

      <div id="safety-rules-panel">
        <div class="safety-rules-section">
          <div class="safety-section-header">
            <h2>Safety Rules</h2>
            <div class="safety-filter">
              <select id="rule-device-filter" class="form-select">
                <option value="">All Devices</option>
              </select>
            </div>
          </div>
          <div class="safety-rules-list" id="safety-rules-list">
            <div class="safety-rules-loading">Loading rules...</div>
          </div>
        </div>

        <div class="safety-recent-denials">
          <div class="safety-section-header">
            <h2>Recent Denials (24h)</h2>
          </div>
          <div class="safety-denials-list" id="safety-denials-list">
            <div class="safety-denials-loading">Loading...</div>
          </div>
        </div>
      </div>

      <div id="safety-thresholds-panel" style="display:none;">
        <div class="safety-thresholds-section">
          <div class="safety-section-header">
            <h2>Sensor Thresholds</h2>
            <button class="btn btn-primary" id="add-threshold-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Threshold
            </button>
          </div>
          <div class="safety-thresholds-list" id="safety-thresholds-list">
            <div class="safety-thresholds-loading">Loading thresholds...</div>
          </div>
        </div>
      </div>
    </div>
  `;
    setupSafetyEventListeners();
    setupThresholdTabListeners();
    await loadSafetySummary();
    await loadSafetyRules();
    await loadRecentDenials();
    await loadSafetyVisualizations();
    await loadDevicesForFilter();
    await loadThresholds();
  }
  function setupThresholdTabListeners() {
    document.querySelectorAll(".safety-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.dataset.tab;
        document.querySelectorAll(".safety-tab").forEach((t) => {
          t.classList.toggle("active", t === tab);
        });
        const rulesPanel = document.getElementById("safety-rules-panel");
        const thresholdsPanel = document.getElementById(
          "safety-thresholds-panel"
        );
        if (tabName === "rules") {
          if (rulesPanel) rulesPanel.style.display = "";
          if (thresholdsPanel) thresholdsPanel.style.display = "none";
        } else {
          if (rulesPanel) rulesPanel.style.display = "none";
          if (thresholdsPanel) thresholdsPanel.style.display = "";
          loadThresholds();
        }
      });
    });
    const addThresholdBtn = document.getElementById("add-threshold-btn");
    addThresholdBtn?.addEventListener("click", () => {
      showAddThresholdModal();
    });
  }
  async function loadSafetySummary() {
    try {
      const summary = await halApi.getSafetySummary();
      const summaryEl = document.getElementById("safety-summary");
      if (!summaryEl) return;
      summaryEl.innerHTML = `
      <div class="safety-summary-card ${summary.estopActive ? "danger" : summary.farmLoopSafetyMode ? "warning" : "normal"}">
        <div class="summary-card-icon">
          ${summary.estopActive ? "\u{1F6A8}" : summary.farmLoopSafetyMode ? "\u26A0\uFE0F" : "\u2705"}
        </div>
        <div class="summary-card-content">
          <div class="summary-card-label">Safety State</div>
          <div class="summary-card-value">${summary.estopActive ? "EMERGENCY STOP" : summary.farmLoopSafetyMode ? "WARNING" : "NORMAL"}</div>
          ${summary.estopActive && summary.estopActivatedAt ? `<div class="summary-card-meta">since ${new Date(summary.estopActivatedAt).toLocaleTimeString()}</div>` : ""}
        </div>
      </div>

      <div class="safety-summary-card">
        <div class="summary-card-icon">\u{1F4CB}</div>
        <div class="summary-card-content">
          <div class="summary-card-label">Active Rules</div>
          <div class="summary-card-value">${summary.activeRulesCount}</div>
        </div>
      </div>

      <div class="safety-summary-card ${summary.deniedLast24h > 0 ? "warning" : ""}">
        <div class="summary-card-icon">\u{1F6AB}</div>
        <div class="summary-card-content">
          <div class="summary-card-label">Denied (24h)</div>
          <div class="summary-card-value">${summary.deniedLast24h}</div>
        </div>
      </div>

      <div class="safety-summary-card">
        <div class="summary-card-icon">\u{1F517}</div>
        <div class="summary-card-content">
          <div class="summary-card-label">Monitored Devices</div>
          <div class="summary-card-value">${summary.rulesPerDevice.length}</div>
        </div>
      </div>
    `;
    } catch (err) {
      console.error("Failed to load safety summary:", err);
    }
  }
  async function loadSafetyRules() {
    try {
      const rules = await halApi.getSafetyRules();
      const listEl = document.getElementById("safety-rules-list");
      if (!listEl) return;
      if (rules.length === 0) {
        listEl.innerHTML = `
        <div class="safety-empty">
          <p>No safety rules configured.</p>
          <p>Click "Add Rule" to create your first safety rule.</p>
        </div>
      `;
        return;
      }
      listEl.innerHTML = rules.map((rule) => renderRuleCard(rule)).join("");
      listEl.querySelectorAll(".rule-edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const ruleId = btn.dataset.ruleId;
          editRule(ruleId);
        });
      });
      listEl.querySelectorAll(".rule-delete-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const ruleId = btn.dataset.ruleId;
          const ruleDeviceId = btn.dataset.deviceId;
          confirmDeleteRule(ruleId, ruleDeviceId);
        });
      });
      listEl.querySelectorAll(".rule-toggle-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const ruleId = btn.dataset.ruleId;
          const rule = rules.find((r) => r.id === ruleId);
          if (rule) {
            await toggleRule(rule);
          }
        });
      });
    } catch (err) {
      console.error("Failed to load safety rules:", err);
    }
  }
  async function loadRecentDenials() {
    try {
      const audit = await halApi.getSafetyAudit({ limit: 10, result: "DENIED" });
      const listEl = document.getElementById("safety-denials-list");
      if (!listEl) return;
      if (audit.length === 0) {
        listEl.innerHTML = `
        <div class="safety-empty">
          <p>No denied actions in the last 24 hours.</p>
        </div>
      `;
        return;
      }
      listEl.innerHTML = audit.map(
        (entry) => `
      <div class="denial-item">
        <div class="denial-header">
          <span class="denial-device">${entry.deviceId || "Unknown Device"}</span>
          <span class="denial-action">${entry.proposedAction}</span>
          <span class="denial-time">${formatRelativeTime2(entry.createdAt)}</span>
        </div>
        <div class="denial-reason">${entry.deniedReason || "No reason provided"}</div>
        <div class="denial-meta">
          Triggered by: ${entry.triggeredBy}
        </div>
      </div>
    `
      ).join("");
    } catch (err) {
      console.error("Failed to load recent denials:", err);
    }
  }
  async function loadSafetyVisualizations() {
    const heatmapEl = document.getElementById("safety-denial-heatmap");
    const barsEl = document.getElementById("safety-threshold-bars");
    try {
      const [audit, thresholds] = await Promise.all([
        halApi.getSafetyAudit({ limit: 250, result: "DENIED" }),
        halApi.getThresholds()
      ]);
      renderSafetyDenialCalendarHeatmap(audit, "safety-denial-heatmap");
      renderSafetyThresholdBulletBars(
        buildSafetyThresholdBars(thresholds),
        "safety-threshold-bars"
      );
    } catch (err) {
      console.error("Failed to load safety visualizations:", err);
      if (heatmapEl)
        heatmapEl.innerHTML = '<div class="safety-summary-card loading">Failed to load denials.</div>';
      if (barsEl)
        barsEl.innerHTML = '<div class="safety-summary-card loading">Failed to load thresholds.</div>';
    }
  }
  function buildSafetyThresholdBars(thresholds) {
    const store = getStore();
    return thresholds.map((threshold) => {
      const metric = threshold.metric;
      const meta = getSafetyMetricMeta(metric);
      const scope = resolveThresholdScope(threshold);
      const currentValue = resolveThresholdCurrentValue(threshold, metric);
      return {
        id: threshold.id,
        label: METRIC_LABELS[metric] || metric,
        scope,
        metric,
        color: meta.color,
        unit: METRIC_UNITS[metric] || "",
        currentValue,
        minValue: threshold.minValue,
        maxValue: threshold.maxValue,
        axisMin: meta.axisMin,
        axisMax: meta.axisMax,
        enabled: threshold.enabled
      };
    });
  }
  function resolveThresholdScope(threshold) {
    const store = getStore();
    if (threshold.deviceId) {
      const device = store.devices.find((d) => d.id === threshold.deviceId);
      return device?.name || threshold.deviceId;
    }
    if (threshold.zone) return `Zone: ${threshold.zone}`;
    return "All Devices";
  }
  function resolveThresholdCurrentValue(threshold, metric) {
    const store = getStore();
    const sensors = store.devices.filter((device) => {
      if (device.type !== "sensor") return false;
      if (threshold.deviceId) return device.id === threshold.deviceId;
      if (threshold.zone) return device.zone === threshold.zone;
      return true;
    });
    const values = sensors.map((sensor) => {
      const snapshot = store.sensors[sensor.id];
      const value = snapshot?.[metric]?.value;
      return typeof value === "number" && Number.isFinite(value) && value !== 0 ? value : null;
    }).filter((value) => value != null);
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  function getSafetyMetricMeta(metric) {
    switch (metric) {
      case "temperature":
        return { color: "#F59E0B", axisMin: 10, axisMax: 40 };
      case "humidity":
        return { color: "#38BDF8", axisMin: 0, axisMax: 100 };
      case "co2":
        return { color: "#22C55E", axisMin: 400, axisMax: 1600 };
      case "soil_moisture":
        return { color: "#EF4444", axisMin: 0, axisMax: 100 };
      case "light":
        return { color: "#FACC15", axisMin: 0, axisMax: 1e5 };
      default:
        return { color: "#94A3B8", axisMin: 0, axisMax: 100 };
    }
  }
  async function loadDevicesForFilter() {
    const store = getStore();
    const selectEl = document.getElementById(
      "rule-device-filter"
    );
    if (!selectEl) return;
    const devices = store.devices.filter(
      (d) => d.type === "relay" || d.type === "smart_plug"
    );
    const options = devices.map((d) => `<option value="${d.id}">${escapeHtml14(d.name)}</option>`).join("");
    selectEl.innerHTML = `<option value="">All Devices</option>${options}`;
    selectEl.addEventListener("change", () => {
    });
  }
  function renderRuleCard(rule) {
    const store = getStore();
    const device = store.devices.find((d) => d.id === rule.deviceId);
    const deviceName = device?.name || rule.deviceId;
    const ruleLabel = RULE_TYPE_LABELS[rule.ruleType] || rule.ruleType;
    const ruleDesc = RULE_TYPE_DESCRIPTIONS[rule.ruleType] || "";
    let configDisplay = "";
    switch (rule.ruleType) {
      case "max_on_duration":
        configDisplay = `${rule.ruleConfig.maxSeconds}s max on`;
        break;
      case "min_off_duration":
        configDisplay = `${rule.ruleConfig.minSeconds}s min off`;
        break;
      case "max_activations_per_hour":
        configDisplay = `${rule.ruleConfig.maxPerHour} max/hour`;
        break;
      case "allowed_schedule_windows":
        const windows = rule.ruleConfig.windows;
        configDisplay = windows.map((w) => `${w.startHour}:00-${w.endHour}:00`).join(", ");
        break;
      case "dependency":
        const dep = rule.ruleConfig;
        configDisplay = `When ${dep.triggerDeviceId} ${dep.operator} ${dep.value}`;
        break;
      default:
        configDisplay = JSON.stringify(rule.ruleConfig);
    }
    return `
    <div class="rule-card ${rule.enabled ? "" : "disabled"}" data-device-id="${rule.deviceId}">
      <div class="rule-header">
        <div class="rule-device">${escapeHtml14(deviceName)}</div>
        <div class="rule-type-badge">${ruleLabel}</div>
      </div>
      <div class="rule-config">${escapeHtml14(configDisplay)}</div>
      <div class="rule-meta">
        Priority: ${rule.priority} \xB7 Updated ${formatRelativeTime2(rule.updatedAt)}
      </div>
      <div class="rule-actions">
        <button class="btn btn-sm rule-toggle-btn ${rule.enabled ? "btn-warning" : "btn-success"}" data-rule-id="${rule.id}">
          ${rule.enabled ? "Disable" : "Enable"}
        </button>
        <button class="btn btn-sm btn-secondary rule-edit-btn" data-rule-id="${rule.id}">Edit</button>
        <button class="btn btn-sm btn-danger rule-delete-btn" data-rule-id="${rule.id}" data-device-id="${rule.deviceId}">Delete</button>
      </div>
    </div>
  `;
  }
  function setupSafetyEventListeners() {
    const addBtn = document.getElementById("add-rule-btn");
    addBtn?.addEventListener("click", () => {
      showAddRuleModal();
    });
    const filterSelect = document.getElementById(
      "rule-device-filter"
    );
    if (filterSelect) {
      filterSelect.addEventListener("change", () => {
        filterRules(filterSelect.value);
      });
    }
  }
  function filterRules(deviceId) {
    const cards = document.querySelectorAll(".rule-card");
    cards.forEach((card) => {
      const cardDeviceId = card.dataset.deviceId;
      if (!deviceId || cardDeviceId === deviceId) {
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    });
  }
  async function toggleRule(ruleId) {
    try {
      const rules = await halApi.getSafetyRules();
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) return;
      await halApi.updateSafetyRule(ruleId, { enabled: !rule.enabled });
      showToast(`Rule ${rule.enabled ? "disabled" : "enabled"}`, "success");
      await loadSafetyRules();
      await loadSafetySummary();
    } catch (err) {
      showToast(`Failed to toggle rule: ${err.message}`, "error");
    }
  }
  function confirmDeleteRule(ruleId, deviceId) {
    const store = getStore();
    const device = store.devices.find((d) => d.id === deviceId);
    const deviceName = device?.name || deviceId;
    openModal(
      "Delete Safety Rule",
      `<p>Are you sure you want to delete this safety rule for <strong>${escapeHtml14(deviceName)}</strong>?</p>
     <p class="text-danger">This action cannot be undone. The device will no longer be protected by this rule.</p>`,
      `<button class="btn btn-secondary" onclick="window.__closeModal && window.__closeModal()">Cancel</button>
     <button class="btn btn-danger" id="confirm-delete-rule-btn">Delete Rule</button>`
    );
    const confirmBtn = document.getElementById("confirm-delete-rule-btn");
    confirmBtn?.addEventListener("click", async () => {
      closeModal();
      try {
        await halApi.deleteSafetyRule(ruleId);
        showToast("Rule deleted", "success");
        await loadSafetyRules();
        await loadSafetySummary();
      } catch (err) {
        showToast(`Failed to delete rule: ${err.message}`, "error");
      }
    });
    window.__closeModal = closeModal;
  }
  function showAddRuleModal() {
    const store = getStore();
    const devices = store.devices.filter(
      (d) => d.type === "relay" || d.type === "smart_plug"
    );
    const deviceOptions = devices.map((d) => `<option value="${d.id}">${escapeHtml14(d.name)}</option>`).join("");
    const ruleTypeOptions = Object.entries(RULE_TYPE_LABELS).map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
    openModal(
      "Add Safety Rule",
      `
    <form id="add-rule-form" class="add-rule-form">
      <div class="form-group">
        <label for="rule-device">Device</label>
        <select id="rule-device" class="form-select" required>
          <option value="">Select a device...</option>
          ${deviceOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="rule-type">Rule Type</label>
        <select id="rule-type" class="form-select" required>
          <option value="">Select rule type...</option>
          ${ruleTypeOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="rule-priority">Priority (higher = more restrictive)</label>
        <input type="number" id="rule-priority" class="form-input" value="0" min="0" max="100">
      </div>

      <div id="rule-config-fields">
        <p class="text-secondary text-sm">Select a rule type to configure.</p>
      </div>
    </form>
    `,
      `<button class="btn btn-secondary" onclick="window.__closeModal && window.__closeModal()">Cancel</button>
     <button class="btn btn-primary" id="save-rule-btn">Save Rule</button>`
    );
    window.__closeModal = closeModal;
    const ruleTypeSelect = document.getElementById(
      "rule-type"
    );
    ruleTypeSelect?.addEventListener("change", () => {
      showConfigFieldsForRuleType(ruleTypeSelect.value);
    });
    const saveBtn = document.getElementById("save-rule-btn");
    saveBtn?.addEventListener("click", () => saveNewRule());
  }
  function showConfigFieldsForRuleType(ruleType) {
    const container = document.getElementById("rule-config-fields");
    if (!container) return;
    let fieldsHtml = "";
    switch (ruleType) {
      case "max_on_duration":
        fieldsHtml = `
        <div class="form-group">
          <label for="config-max-seconds">Maximum On Duration (seconds)</label>
          <input type="number" id="config-max-seconds" class="form-input" value="300" min="1" required>
        </div>
      `;
        break;
      case "min_off_duration":
        fieldsHtml = `
        <div class="form-group">
          <label for="config-min-seconds">Minimum Off Duration (seconds)</label>
          <input type="number" id="config-min-seconds" class="form-input" value="60" min="1" required>
        </div>
      `;
        break;
      case "max_activations_per_hour":
        fieldsHtml = `
        <div class="form-group">
          <label for="config-max-per-hour">Maximum Activations Per Hour</label>
          <input type="number" id="config-max-per-hour" class="form-input" value="10" min="1" required>
        </div>
      `;
        break;
      case "allowed_schedule_windows":
        fieldsHtml = `
        <div class="form-group">
          <label>Schedule Windows</label>
          <div id="schedule-windows-list">
            <div class="schedule-window-row">
              <input type="number" class="form-input schedule-start" placeholder="Start hour (0-23)" min="0" max="23" value="6">
              <span>to</span>
              <input type="number" class="form-input schedule-end" placeholder="End hour (0-23)" min="0" max="23" value="22">
              <button type="button" class="btn btn-sm btn-danger remove-window-btn">\xD7</button>
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-secondary" id="add-window-btn">+ Add Window</button>
        </div>
      `;
        break;
      case "dependency":
        const store = getStore();
        const sensorDevices = store.devices.filter((d) => d.type === "sensor");
        const sensorOptions = sensorDevices.map((d) => `<option value="${d.id}">${escapeHtml14(d.name)}</option>`).join("");
        fieldsHtml = `
        <div class="form-group">
          <label for="config-trigger-device">When this sensor...</label>
          <select id="config-trigger-device" class="form-select" required>
            <option value="">Select sensor...</option>
            ${sensorOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="config-operator">Condition</label>
          <select id="config-operator" class="form-select" required>
            <option value="gt">is greater than</option>
            <option value="gte">is greater than or equal to</option>
            <option value="lt">is less than</option>
            <option value="lte">is less than or equal to</option>
            <option value="eq">equals</option>
            <option value="neq">does not equal</option>
          </select>
        </div>
        <div class="form-group">
          <label for="config-threshold">Threshold Value</label>
          <input type="number" id="config-threshold" class="form-input" value="30" required>
        </div>
        <div class="form-group">
          <label for="config-action-required">Required Device State</label>
          <select id="config-action-required" class="form-select" required>
            <option value="on">Must stay ON</option>
            <option value="off">Must stay OFF</option>
            <option value="any">Any state allowed</option>
          </select>
        </div>
      `;
        break;
      default:
        fieldsHtml = `<p class="text-secondary text-sm">Select a rule type to configure.</p>`;
    }
    container.innerHTML = fieldsHtml;
    if (ruleType === "allowed_schedule_windows") {
      const addWindowBtn = document.getElementById("add-window-btn");
      addWindowBtn?.addEventListener("click", () => {
        const list = document.getElementById("schedule-windows-list");
        if (list) {
          const newRow = document.createElement("div");
          newRow.className = "schedule-window-row";
          newRow.innerHTML = `
          <input type="number" class="form-input schedule-start" placeholder="Start hour (0-23)" min="0" max="23" value="0">
          <span>to</span>
          <input type="number" class="form-input schedule-end" placeholder="End hour (0-23)" min="0" max="23" value="0">
          <button type="button" class="btn btn-sm btn-danger remove-window-btn">\xD7</button>
        `;
          list.appendChild(newRow);
          newRow.querySelector(".remove-window-btn")?.addEventListener("click", () => newRow.remove());
        }
      });
      container.querySelectorAll(".remove-window-btn").forEach((btn) => {
        btn.addEventListener(
          "click",
          () => btn.parentElement?.remove()
        );
      });
    }
  }
  async function saveNewRule() {
    const deviceSelect = document.getElementById(
      "rule-device"
    );
    const ruleTypeSelect = document.getElementById(
      "rule-type"
    );
    const priorityInput = document.getElementById(
      "rule-priority"
    );
    const deviceId = deviceSelect?.value;
    const ruleType = ruleTypeSelect?.value;
    const priority = parseInt(priorityInput?.value || "0", 10);
    if (!deviceId || !ruleType) {
      showToast("Please select a device and rule type", "error");
      return;
    }
    let ruleConfig = {};
    switch (ruleType) {
      case "max_on_duration": {
        const maxSecondsInput = document.getElementById(
          "config-max-seconds"
        );
        ruleConfig = {
          maxSeconds: parseInt(maxSecondsInput?.value || "300", 10)
        };
        break;
      }
      case "min_off_duration": {
        const minSecondsInput = document.getElementById(
          "config-min-seconds"
        );
        ruleConfig = { minSeconds: parseInt(minSecondsInput?.value || "60", 10) };
        break;
      }
      case "max_activations_per_hour": {
        const maxPerHourInput = document.getElementById(
          "config-max-per-hour"
        );
        ruleConfig = { maxPerHour: parseInt(maxPerHourInput?.value || "10", 10) };
        break;
      }
      case "allowed_schedule_windows": {
        const windows = [];
        document.querySelectorAll(".schedule-window-row").forEach((row) => {
          const startInput = row.querySelector(
            ".schedule-start"
          );
          const endInput = row.querySelector(".schedule-end");
          if (startInput?.value && endInput?.value) {
            windows.push({
              startHour: parseInt(startInput.value, 10),
              endHour: parseInt(endInput.value, 10)
            });
          }
        });
        ruleConfig = { windows };
        break;
      }
      case "dependency": {
        const triggerDeviceSelect = document.getElementById(
          "config-trigger-device"
        );
        const operatorSelect = document.getElementById(
          "config-operator"
        );
        const thresholdInput = document.getElementById(
          "config-threshold"
        );
        const actionRequiredSelect = document.getElementById(
          "config-action-required"
        );
        ruleConfig = {
          triggerDeviceId: triggerDeviceSelect?.value,
          operator: operatorSelect?.value,
          value: parseFloat(thresholdInput?.value || "30"),
          actionRequired: actionRequiredSelect?.value
        };
        break;
      }
      default:
        showToast("Unknown rule type", "error");
        return;
    }
    try {
      await halApi.createSafetyRule({ deviceId, ruleType, ruleConfig, priority });
      closeModal();
      showToast("Rule created successfully", "success");
      await loadSafetyRules();
      await loadSafetySummary();
    } catch (err) {
      showToast(`Failed to create rule: ${err.message}`, "error");
    }
  }
  async function editRule(ruleId) {
    try {
      const rule = await halApi.getSafetyRule(ruleId);
      showEditRuleModal(rule);
    } catch (err) {
      showToast(`Failed to load rule: ${err.message}`, "error");
    }
  }
  function showEditRuleModal(rule) {
    const store = getStore();
    const devices = store.devices.filter(
      (d) => d.type === "relay" || d.type === "smart_plug"
    );
    const device = devices.find((d) => d.id === rule.deviceId);
    const deviceName = device?.name || rule.deviceId;
    const ruleLabel = RULE_TYPE_LABELS[rule.ruleType] || rule.ruleType;
    openModal(
      `Edit Safety Rule: ${escapeHtml14(deviceName)}`,
      `
    <form id="edit-rule-form" class="add-rule-form">
      <div class="form-group">
        <label>Device</label>
        <div class="form-static">${escapeHtml14(deviceName)}</div>
      </div>

      <div class="form-group">
        <label>Rule Type</label>
        <div class="form-static">${ruleLabel}</div>
      </div>

      <div class="form-group">
        <label for="edit-rule-priority">Priority (higher = more restrictive)</label>
        <input type="number" id="edit-rule-priority" class="form-input" value="${rule.priority}" min="0" max="100">
      </div>

      <div class="form-group">
        <label for="edit-rule-enabled">Enabled</label>
        <select id="edit-rule-enabled" class="form-select">
          <option value="true" ${rule.enabled ? "selected" : ""}>Yes</option>
          <option value="false" ${!rule.enabled ? "selected" : ""}>No</option>
        </select>
      </div>

      <div id="edit-rule-config-fields">
        ${buildConfigFieldsForRuleType(rule.ruleType, rule.ruleConfig)}
      </div>
    </form>
    `,
      `<button class="btn btn-secondary" onclick="window.__closeModal && window.__closeModal()">Cancel</button>
     <button class="btn btn-primary" id="update-rule-btn">Save Changes</button>`
    );
    window.__closeModal = closeModal;
    const ruleTypeSelect = document.getElementById(
      "edit-rule-type"
    );
    ruleTypeSelect?.addEventListener("change", () => {
      showConfigFieldsForRuleType(ruleTypeSelect.value);
    });
    const updateBtn = document.getElementById("update-rule-btn");
    updateBtn?.addEventListener("click", () => saveEditedRule(rule.id));
  }
  function buildConfigFieldsForRuleType(ruleType, ruleConfig) {
    switch (ruleType) {
      case "max_on_duration":
        return `
        <div class="form-group">
          <label for="config-max-seconds">Maximum On Duration (seconds)</label>
          <input type="number" id="config-max-seconds" class="form-input" value="${ruleConfig.maxSeconds || 300}" min="1" required>
        </div>
      `;
      case "min_off_duration":
        return `
        <div class="form-group">
          <label for="config-min-seconds">Minimum Off Duration (seconds)</label>
          <input type="number" id="config-min-seconds" class="form-input" value="${ruleConfig.minSeconds || 60}" min="1" required>
        </div>
      `;
      case "max_activations_per_hour":
        return `
        <div class="form-group">
          <label for="config-max-per-hour">Maximum Activations Per Hour</label>
          <input type="number" id="config-max-per-hour" class="form-input" value="${ruleConfig.maxPerHour || 10}" min="1" required>
        </div>
      `;
      case "allowed_schedule_windows": {
        const windows = ruleConfig.windows || [];
        const windowRows = windows.map(
          (w, i) => `
        <div class="schedule-window-row">
          <input type="number" class="form-input schedule-start" placeholder="Start hour (0-23)" min="0" max="23" value="${w.startHour}">
          <span>to</span>
          <input type="number" class="form-input schedule-end" placeholder="End hour (0-23)" min="0" max="23" value="${w.endHour}">
          <button type="button" class="btn btn-sm btn-danger remove-window-btn">\xD7</button>
        </div>
      `
        ).join("");
        return `
        <div class="form-group">
          <label>Schedule Windows</label>
          <div id="schedule-windows-list">
            ${windowRows}
            ${windows.length === 0 ? `
            <div class="schedule-window-row">
              <input type="number" class="form-input schedule-start" placeholder="Start hour (0-23)" min="0" max="23" value="6">
              <span>to</span>
              <input type="number" class="form-input schedule-end" placeholder="End hour (0-23)" min="0" max="23" value="22">
              <button type="button" class="btn btn-sm btn-danger remove-window-btn">\xD7</button>
            </div>
            ` : ""}
          </div>
          <button type="button" class="btn btn-sm btn-secondary" id="add-window-btn">+ Add Window</button>
        </div>
      `;
      }
      case "dependency": {
        const store = getStore();
        const sensorDevices = store.devices.filter((d) => d.type === "sensor");
        const sensorOptions = sensorDevices.map(
          (d) => `<option value="${d.id}" ${d.id === ruleConfig.triggerDeviceId ? "selected" : ""}>${escapeHtml14(d.name)}</option>`
        ).join("");
        return `
        <div class="form-group">
          <label for="config-trigger-device">When this sensor...</label>
          <select id="config-trigger-device" class="form-select" required>
            <option value="">Select sensor...</option>
            ${sensorOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="config-operator">Condition</label>
          <select id="config-operator" class="form-select" required>
            <option value="gt" ${ruleConfig.operator === "gt" ? "selected" : ""}>is greater than</option>
            <option value="gte" ${ruleConfig.operator === "gte" ? "selected" : ""}>is greater than or equal to</option>
            <option value="lt" ${ruleConfig.operator === "lt" ? "selected" : ""}>is less than</option>
            <option value="lte" ${ruleConfig.operator === "lte" ? "selected" : ""}>is less than or equal to</option>
            <option value="eq" ${ruleConfig.operator === "eq" ? "selected" : ""}>equals</option>
            <option value="neq" ${ruleConfig.operator === "neq" ? "selected" : ""}>does not equal</option>
          </select>
        </div>
        <div class="form-group">
          <label for="config-threshold">Threshold Value</label>
          <input type="number" id="config-threshold" class="form-input" value="${ruleConfig.value ?? 30}" required>
        </div>
        <div class="form-group">
          <label for="config-action-required">Required Device State</label>
          <select id="config-action-required" class="form-select" required>
            <option value="on" ${ruleConfig.actionRequired === "on" ? "selected" : ""}>Must stay ON</option>
            <option value="off" ${ruleConfig.actionRequired === "off" ? "selected" : ""}>Must stay OFF</option>
            <option value="any" ${ruleConfig.actionRequired === "any" ? "selected" : ""}>Any state allowed</option>
          </select>
        </div>
      `;
      }
      default:
        return `<p class="text-secondary text-sm">Unknown rule type: ${escapeHtml14(ruleType)}</p>`;
    }
  }
  async function saveEditedRule(ruleId) {
    const priorityInput = document.getElementById(
      "edit-rule-priority"
    );
    const enabledSelect = document.getElementById(
      "edit-rule-enabled"
    );
    const priority = parseInt(priorityInput?.value || "0", 10);
    const enabled = enabledSelect?.value === "true";
    let ruleType = "";
    let ruleConfig = {};
    try {
      const existingRule = await halApi.getSafetyRule(ruleId);
      ruleType = existingRule.ruleType;
      ruleConfig = { ...existingRule.ruleConfig };
    } catch (err) {
      showToast(`Failed to load rule: ${err.message}`, "error");
      return;
    }
    switch (ruleType) {
      case "max_on_duration": {
        const maxSecondsInput = document.getElementById(
          "config-max-seconds"
        );
        ruleConfig = {
          maxSeconds: parseInt(maxSecondsInput?.value || "300", 10)
        };
        break;
      }
      case "min_off_duration": {
        const minSecondsInput = document.getElementById(
          "config-min-seconds"
        );
        ruleConfig = { minSeconds: parseInt(minSecondsInput?.value || "60", 10) };
        break;
      }
      case "max_activations_per_hour": {
        const maxPerHourInput = document.getElementById(
          "config-max-per-hour"
        );
        ruleConfig = { maxPerHour: parseInt(maxPerHourInput?.value || "10", 10) };
        break;
      }
      case "allowed_schedule_windows": {
        const windows = [];
        document.querySelectorAll(".schedule-window-row").forEach((row) => {
          const startInput = row.querySelector(
            ".schedule-start"
          );
          const endInput = row.querySelector(".schedule-end");
          if (startInput?.value && endInput?.value) {
            windows.push({
              startHour: parseInt(startInput.value, 10),
              endHour: parseInt(endInput.value, 10)
            });
          }
        });
        ruleConfig = { windows };
        break;
      }
      case "dependency": {
        const triggerDeviceSelect = document.getElementById(
          "config-trigger-device"
        );
        const operatorSelect = document.getElementById(
          "config-operator"
        );
        const thresholdInput = document.getElementById(
          "config-threshold"
        );
        const actionRequiredSelect = document.getElementById(
          "config-action-required"
        );
        ruleConfig = {
          triggerDeviceId: triggerDeviceSelect?.value,
          operator: operatorSelect?.value,
          value: parseFloat(thresholdInput?.value || "30"),
          actionRequired: actionRequiredSelect?.value
        };
        break;
      }
      default:
        showToast("Unknown rule type", "error");
        return;
    }
    try {
      await halApi.updateSafetyRule(ruleId, { ruleConfig, enabled, priority });
      closeModal();
      showToast("Rule updated successfully", "success");
      await loadSafetyRules();
      await loadSafetySummary();
    } catch (err) {
      showToast(`Failed to update rule: ${err.message}`, "error");
    }
  }
  async function loadThresholds() {
    try {
      const thresholds = await halApi.getThresholds();
      const listEl = document.getElementById("safety-thresholds-list");
      if (!listEl) return;
      if (thresholds.length === 0) {
        listEl.innerHTML = `
        <div class="safety-empty">
          <p>No thresholds configured.</p>
          <p>Click "Add Threshold" to set min/max bounds for sensor metrics.</p>
        </div>
      `;
        return;
      }
      listEl.innerHTML = thresholds.map((t) => renderThresholdCard(t)).join("");
      listEl.querySelectorAll(".threshold-edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const thresholdId = btn.dataset.thresholdId;
          editThreshold(thresholdId);
        });
      });
      listEl.querySelectorAll(".threshold-delete-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const thresholdId = btn.dataset.thresholdId;
          const metric = btn.dataset.metric;
          confirmDeleteThreshold(thresholdId, metric);
        });
      });
      listEl.querySelectorAll(".threshold-toggle-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const thresholdId = btn.dataset.thresholdId;
          const threshold = thresholds.find((t) => t.id === thresholdId);
          if (threshold) {
            await toggleThreshold(threshold);
          }
        });
      });
    } catch (err) {
      console.error("Failed to load thresholds:", err);
      const listEl = document.getElementById("safety-thresholds-list");
      if (listEl) {
        listEl.innerHTML = `<div class="safety-empty text-danger">Failed to load thresholds.</div>`;
      }
    }
  }
  function renderThresholdCard(threshold) {
    const store = getStore();
    let deviceName = "All Devices";
    if (threshold.deviceId) {
      const device = store.devices.find((d) => d.id === threshold.deviceId);
      deviceName = device?.name || threshold.deviceId;
    } else if (threshold.zone) {
      deviceName = `Zone: ${threshold.zone}`;
    }
    const metricLabel = METRIC_LABELS[threshold.metric] || threshold.metric;
    const unit = METRIC_UNITS[threshold.metric] || "";
    const minDisplay = threshold.minValue !== null ? `${threshold.minValue}${unit}` : "\u2014";
    const maxDisplay = threshold.maxValue !== null ? `${threshold.maxValue}${unit}` : "\u2014";
    return `
    <div class="threshold-card ${threshold.enabled ? "" : "disabled"}" data-threshold-id="${threshold.id}">
      <div class="threshold-header">
        <div class="threshold-device">${escapeHtml14(deviceName)}</div>
        <div class="threshold-metric-badge">${metricLabel}</div>
      </div>
      <div class="threshold-bounds">
        <div class="threshold-bound">
          <span class="threshold-bound-label">MIN</span>
          <span class="threshold-bound-value">${minDisplay}</span>
        </div>
        <div class="threshold-bound-divider">\u2014</div>
        <div class="threshold-bound">
          <span class="threshold-bound-label">MAX</span>
          <span class="threshold-bound-value">${maxDisplay}</span>
        </div>
      </div>
      <div class="threshold-meta">
        Updated ${formatRelativeTime2(threshold.updatedAt)}
      </div>
      <div class="threshold-actions">
        <button class="btn btn-sm threshold-toggle-btn ${threshold.enabled ? "btn-warning" : "btn-success"}" data-threshold-id="${threshold.id}">
          ${threshold.enabled ? "Disable" : "Enable"}
        </button>
        <button class="btn btn-sm btn-secondary threshold-edit-btn" data-threshold-id="${threshold.id}">Edit</button>
        <button class="btn btn-sm btn-danger threshold-delete-btn" data-threshold-id="${threshold.id}" data-metric="${threshold.metric}">Delete</button>
      </div>
    </div>
  `;
  }
  async function toggleThreshold(threshold) {
    try {
      await halApi.updateThreshold(threshold.id, { enabled: !threshold.enabled });
      showToast(
        `Threshold ${threshold.enabled ? "disabled" : "enabled"}`,
        "success"
      );
      await loadThresholds();
      await loadSafetyVisualizations();
    } catch (err) {
      showToast(`Failed to toggle threshold: ${err.message}`, "error");
    }
  }
  function confirmDeleteThreshold(thresholdId, metric) {
    const metricLabel = METRIC_LABELS[metric] || metric;
    openModal(
      "Delete Threshold",
      `<p>Are you sure you want to delete this <strong>${metricLabel}</strong> threshold?</p>
     <p class="text-danger">This action cannot be undone.</p>`,
      `<button class="btn btn-secondary" onclick="window.__closeModal && window.__closeModal()">Cancel</button>
     <button class="btn btn-danger" id="confirm-delete-threshold-btn">Delete Threshold</button>`
    );
    window.__closeModal = closeModal;
    const confirmBtn = document.getElementById("confirm-delete-threshold-btn");
    confirmBtn?.addEventListener("click", async () => {
      closeModal();
      try {
        await halApi.deleteThreshold(thresholdId);
        showToast("Threshold deleted", "success");
        await loadThresholds();
        await loadSafetyVisualizations();
      } catch (err) {
        showToast(`Failed to delete threshold: ${err.message}`, "error");
      }
    });
  }
  function showAddThresholdModal() {
    const store = getStore();
    const sensorDevices = store.devices.filter((d) => d.type === "sensor");
    const zones2 = [
      ...new Set(store.devices.map((d) => d.zone).filter(Boolean))
    ];
    const deviceOptions = `<option value="">All Devices (global)</option>` + sensorDevices.map(
      (d) => `<option value="${d.id}">${escapeHtml14(d.name || d.id)}</option>`
    ).join("");
    const zoneOptions = zones2.length > 0 ? `<option value="">All Zones</option>` + zones2.map(
      (z) => `<option value="${escapeHtml14(z)}">${escapeHtml14(z)}</option>`
    ).join("") : "";
    const metricOptions = Object.entries(METRIC_LABELS).map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
    openModal(
      "Add Threshold",
      `
    <form id="add-threshold-form" class="add-rule-form">
      <div class="form-group">
        <label for="threshold-scope">Applies To</label>
        <select id="threshold-scope" class="form-select">
          <option value="global">All Devices (Global)</option>
          <option value="device">Specific Device</option>
          ${zoneOptions ? `<option value="zone">Specific Zone</option>` : ""}
        </select>
      </div>

      <div class="form-group" id="threshold-device-group" style="display:none;">
        <label for="threshold-device">Device</label>
        <select id="threshold-device" class="form-select">
          <option value="">Select device...</option>
          ${deviceOptions}
        </select>
      </div>

      <div class="form-group" id="threshold-zone-group" style="display:none;">
        <label for="threshold-zone">Zone</label>
        <select id="threshold-zone" class="form-select">
          <option value="">Select zone...</option>
          ${zoneOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="threshold-metric">Metric</label>
        <select id="threshold-metric" class="form-select" required>
          <option value="">Select metric...</option>
          ${metricOptions}
        </select>
      </div>

      <div class="threshold-bounds-form">
        <div class="form-group">
          <label for="threshold-min">Min Value</label>
          <input type="number" id="threshold-min" class="form-input" placeholder="No minimum" step="any">
        </div>
        <div class="form-group">
          <label for="threshold-max">Max Value</label>
          <input type="number" id="threshold-max" class="form-input" placeholder="No maximum" step="any">
        </div>
      </div>
    </form>
    `,
      `<button class="btn btn-secondary" onclick="window.__closeModal && window.__closeModal()">Cancel</button>
     <button class="btn btn-primary" id="save-threshold-btn">Save Threshold</button>`
    );
    window.__closeModal = closeModal;
    const scopeSelect = document.getElementById(
      "threshold-scope"
    );
    scopeSelect?.addEventListener("change", () => {
      const deviceGroup = document.getElementById("threshold-device-group");
      const zoneGroup = document.getElementById("threshold-zone-group");
      const scope = scopeSelect.value;
      if (deviceGroup)
        deviceGroup.style.display = scope === "device" ? "" : "none";
      if (zoneGroup) zoneGroup.style.display = scope === "zone" ? "" : "none";
    });
    const saveBtn = document.getElementById("save-threshold-btn");
    saveBtn?.addEventListener("click", () => saveThreshold());
  }
  async function saveThreshold() {
    const scopeSelect = document.getElementById(
      "threshold-scope"
    );
    const deviceSelect = document.getElementById(
      "threshold-device"
    );
    const zoneSelect = document.getElementById(
      "threshold-zone"
    );
    const metricSelect = document.getElementById(
      "threshold-metric"
    );
    const minInput = document.getElementById("threshold-min");
    const maxInput = document.getElementById("threshold-max");
    const scope = scopeSelect?.value || "global";
    const deviceId = scope === "device" ? deviceSelect?.value || void 0 : void 0;
    const zone = scope === "zone" ? zoneSelect?.value || void 0 : void 0;
    const metric = metricSelect?.value;
    const minValue = minInput?.value ? parseFloat(minInput.value) : void 0;
    const maxValue = maxInput?.value ? parseFloat(maxInput.value) : void 0;
    if (!metric) {
      showToast("Please select a metric", "error");
      return;
    }
    if (minValue === void 0 && maxValue === void 0) {
      showToast("Please enter at least a minimum or maximum value", "error");
      return;
    }
    try {
      await halApi.createThreshold({
        deviceId: deviceId || void 0,
        zone: zone || void 0,
        metric,
        minValue: minValue ?? null,
        maxValue: maxValue ?? null,
        enabled: true
      });
      closeModal();
      showToast("Threshold created successfully", "success");
      await loadThresholds();
      await loadSafetyVisualizations();
    } catch (err) {
      showToast(`Failed to create threshold: ${err.message}`, "error");
    }
  }
  async function editThreshold(thresholdId) {
    try {
      const threshold = await halApi.getThreshold(thresholdId);
      showEditThresholdModal(threshold);
    } catch (err) {
      showToast(`Failed to load threshold: ${err.message}`, "error");
    }
  }
  function showEditThresholdModal(threshold) {
    const store = getStore();
    const sensorDevices = store.devices.filter((d) => d.type === "sensor");
    const zones2 = [
      ...new Set(store.devices.map((d) => d.zone).filter(Boolean))
    ];
    let scope = "global";
    if (threshold.deviceId) scope = "device";
    else if (threshold.zone) scope = "zone";
    const deviceOptions = `<option value="">All Devices (global)</option>` + sensorDevices.map(
      (d) => `<option value="${d.id}" ${d.id === threshold.deviceId ? "selected" : ""}>${escapeHtml14(d.name || d.id)}</option>`
    ).join("");
    const zoneOptions = zones2.length > 0 ? `<option value="">All Zones</option>` + zones2.map(
      (z) => `<option value="${escapeHtml14(z)}" ${z === threshold.zone ? "selected" : ""}>${escapeHtml14(z)}</option>`
    ).join("") : "";
    const metricOptions = Object.entries(METRIC_LABELS).map(
      ([key, label]) => `<option value="${key}" ${key === threshold.metric ? "selected" : ""}>${label}</option>`
    ).join("");
    const unit = METRIC_UNITS[threshold.metric] || "";
    openModal(
      "Edit Threshold",
      `
    <form id="edit-threshold-form" class="add-rule-form">
      <div class="form-group">
        <label for="threshold-scope">Applies To</label>
        <select id="threshold-scope" class="form-select">
          <option value="global" ${scope === "global" ? "selected" : ""}>All Devices (Global)</option>
          <option value="device" ${scope === "device" ? "selected" : ""}>Specific Device</option>
          ${zoneOptions ? `<option value="zone" ${scope === "zone" ? "selected" : ""}>Specific Zone</option>` : ""}
        </select>
      </div>

      <div class="form-group" id="threshold-device-group" style="display:${scope === "device" ? "" : "none"};">
        <label for="threshold-device">Device</label>
        <select id="threshold-device" class="form-select">
          ${deviceOptions}
        </select>
      </div>

      <div class="form-group" id="threshold-zone-group" style="display:${scope === "zone" ? "" : "none"};">
        <label for="threshold-zone">Zone</label>
        <select id="threshold-zone" class="form-select">
          ${zoneOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="threshold-metric">Metric</label>
        <select id="threshold-metric" class="form-select" required>
          ${metricOptions}
        </select>
      </div>

      <div class="threshold-bounds-form">
        <div class="form-group">
          <label for="threshold-min">Min Value (${unit})</label>
          <input type="number" id="threshold-min" class="form-input" value="${threshold.minValue ?? ""}" placeholder="No minimum" step="any">
        </div>
        <div class="form-group">
          <label for="threshold-max">Max Value (${unit})</label>
          <input type="number" id="threshold-max" class="form-input" value="${threshold.maxValue ?? ""}" placeholder="No maximum" step="any">
        </div>
      </div>

      <div class="form-group">
        <label for="threshold-enabled">Enabled</label>
        <select id="threshold-enabled" class="form-select">
          <option value="true" ${threshold.enabled ? "selected" : ""}>Yes</option>
          <option value="false" ${!threshold.enabled ? "selected" : ""}>No</option>
        </select>
      </div>
    </form>
    `,
      `<button class="btn btn-secondary" onclick="window.__closeModal && window.__closeModal()">Cancel</button>
     <button class="btn btn-primary" id="update-threshold-btn">Save Changes</button>`
    );
    window.__closeModal = closeModal;
    const scopeSelect = document.getElementById(
      "threshold-scope"
    );
    scopeSelect?.addEventListener("change", () => {
      const deviceGroup = document.getElementById("threshold-device-group");
      const zoneGroup = document.getElementById("threshold-zone-group");
      const s = scopeSelect.value;
      if (deviceGroup) deviceGroup.style.display = s === "device" ? "" : "none";
      if (zoneGroup) zoneGroup.style.display = s === "zone" ? "" : "none";
    });
    const updateBtn = document.getElementById("update-threshold-btn");
    updateBtn?.addEventListener("click", () => saveEditedThreshold(threshold.id));
  }
  async function saveEditedThreshold(thresholdId) {
    const scopeSelect = document.getElementById(
      "threshold-scope"
    );
    const deviceSelect = document.getElementById(
      "threshold-device"
    );
    const zoneSelect = document.getElementById(
      "threshold-zone"
    );
    const metricSelect = document.getElementById(
      "threshold-metric"
    );
    const minInput = document.getElementById("threshold-min");
    const maxInput = document.getElementById("threshold-max");
    const enabledSelect = document.getElementById(
      "threshold-enabled"
    );
    const scope = scopeSelect?.value || "global";
    const deviceId = scope === "device" ? deviceSelect?.value || void 0 : void 0;
    const zone = scope === "zone" ? zoneSelect?.value || void 0 : void 0;
    const metric = metricSelect?.value;
    const minValue = minInput?.value ? parseFloat(minInput.value) : void 0;
    const maxValue = maxInput?.value ? parseFloat(maxInput.value) : void 0;
    const enabled = enabledSelect?.value === "true";
    if (!metric) {
      showToast("Please select a metric", "error");
      return;
    }
    if (minValue === void 0 && maxValue === void 0) {
      showToast("Please enter at least a minimum or maximum value", "error");
      return;
    }
    try {
      await halApi.updateThreshold(thresholdId, {
        deviceId: deviceId || null,
        zone: zone || null,
        metric,
        minValue: minValue ?? null,
        maxValue: maxValue ?? null,
        enabled
      });
      closeModal();
      showToast("Threshold updated successfully", "success");
      await loadThresholds();
      await loadSafetyVisualizations();
    } catch (err) {
      showToast(`Failed to update threshold: ${err.message}`, "error");
    }
  }
  function formatRelativeTime2(isoString) {
    try {
      const date2 = new Date(isoString);
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - date2.getTime();
      const diffMins = Math.floor(diffMs / 6e4);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date2.toLocaleDateString();
    } catch {
      return isoString;
    }
  }
  function escapeHtml14(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function injectSafetyStyles() {
    if (document.getElementById("hal-safety-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-safety-styles";
    style.textContent = `
.safety-view {
  padding: var(--page-padding);
  max-width: 1200px;
  margin: 0 auto;
}
.safety-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}
.safety-actions {
  display: flex;
  gap: var(--space-3);
}
.safety-summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.safety-viz-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: var(--space-4);
  align-items: stretch;
}
.safety-summary-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border-left: 3px solid var(--accent);
}
.safety-summary-card.normal {
  border-left-color: var(--success);
}
.safety-summary-card.warning {
  border-left-color: var(--warning);
}
.safety-summary-card.danger {
  border-left-color: var(--danger);
}
.safety-summary-card.loading {
  justify-content: center;
  color: var(--text-secondary);
}
.summary-card-icon {
  font-size: 24px;
}
.summary-card-content {
  flex: 1;
}
.summary-card-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.summary-card-value {
  font-size: 20px;
  font-weight: 600;
  font-family: var(--font-mono);
}
.summary-card-meta {
  font-size: 11px;
  color: var(--text-tertiary);
}
@media (max-width: 960px) {
  .safety-viz-grid {
    grid-template-columns: 1fr;
  }
}
.safety-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}
.safety-section-header h2 {
  font-size: 16px;
  font-weight: 600;
}
.safety-rules-section {
  margin-bottom: var(--space-6);
}
.safety-rules-list {
  display: grid;
  gap: var(--space-3);
}
.safety-rules-loading,
.safety-denials-loading {
  text-align: center;
  padding: var(--space-6);
  color: var(--text-secondary);
}
.safety-empty {
  text-align: center;
  padding: var(--space-6);
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.rule-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  border-left: 3px solid var(--accent);
}
.rule-card.disabled {
  opacity: 0.5;
  border-left-color: var(--text-tertiary);
}
.rule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}
.rule-device {
  font-weight: 600;
  font-size: 14px;
}
.rule-type-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.rule-config {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
.rule-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-3);
}
.rule-actions {
  display: flex;
  gap: var(--space-2);
}
.denial-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  border-left: 3px solid var(--danger);
}
.denial-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}
.denial-device {
  font-weight: 600;
  font-size: 13px;
}
.denial-action {
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}
.denial-time {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: auto;
}
.denial-reason {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
.denial-meta {
  font-size: 11px;
  color: var(--text-tertiary);
}
/* Form styles */
.add-rule-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.form-group label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}
.form-select,
.form-input {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  color: var(--text-primary);
  font-size: 14px;
  min-height: 36px;
}
.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: var(--accent);
}
.schedule-window-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.schedule-window-row .form-input {
  width: 100px;
}
.text-danger {
  color: var(--danger);
}
.text-secondary {
  color: var(--text-secondary);
}
.text-sm {
  font-size: 12px;
}
/* Safety tabs */
.safety-tabs {
  display: flex;
  gap: 0;
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--border);
}
.safety-tab {
  padding: var(--space-3) var(--space-5);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-bottom: -1px;
}
.safety-tab:hover {
  color: var(--text-primary);
}
.safety-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
/* Threshold cards */
.threshold-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  border-left: 3px solid var(--accent);
  margin-bottom: var(--space-3);
}
.threshold-card.disabled {
  opacity: 0.5;
  border-left-color: var(--text-tertiary);
}
.threshold-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.threshold-device {
  font-weight: 600;
  font-size: 14px;
}
.threshold-metric-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.threshold-bounds {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}
.threshold-bound {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}
.threshold-bound-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
}
.threshold-bound-value {
  font-size: 20px;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--accent);
}
.threshold-bound-divider {
  font-size: 18px;
  color: var(--text-tertiary);
  padding-top: 12px;
}
.threshold-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-3);
}
.threshold-actions {
  display: flex;
  gap: var(--space-2);
}
.threshold-bounds-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
`;
    document.head.appendChild(style);
  }
  var RULE_TYPE_LABELS, RULE_TYPE_DESCRIPTIONS, METRIC_LABELS, METRIC_UNITS;
  var init_Safety = __esm({
    "src/web/hal-ui/views/Safety.ts"() {
      "use strict";
      init_store();
      init_api();
      init_Modal();
      init_Toast();
      init_EnvironmentCharts();
      RULE_TYPE_LABELS = {
        max_on_duration: "Max On Duration",
        min_off_duration: "Min Off Duration",
        max_activations_per_hour: "Max Activations/Hour",
        allowed_schedule_windows: "Schedule Windows",
        dependency: "Dependency Rule"
      };
      RULE_TYPE_DESCRIPTIONS = {
        max_on_duration: "Device cannot be on longer than N seconds",
        min_off_duration: "Device must be off for at least N seconds before turning on",
        max_activations_per_hour: "Device cannot be turned on more than N times per hour",
        allowed_schedule_windows: "Device can only be turned on during specific time windows",
        dependency: "Device state depends on another device/sensor condition"
      };
      METRIC_LABELS = {
        temperature: "Temperature (\xB0C)",
        humidity: "Humidity (%)",
        soil_moisture: "Soil Moisture (%)",
        co2: "CO\u2082 (ppm)",
        light: "Light (lux)"
      };
      METRIC_UNITS = {
        temperature: "\xB0C",
        humidity: "%",
        soil_moisture: "%",
        co2: "ppm",
        light: "lux"
      };
    }
  });

  // src/web/hal-ui/views/Calibration.ts
  async function renderCalibration(container) {
    const store = getStore();
    injectCalibrationStyles();
    injectChartKitStyles();
    const sensors = store.devices.filter((d) => d.type === "sensor");
    if (sensors.length === 0) {
      container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Calibration</h1>
          <p class="page-subtitle">Adjust sensor readings with offset</p>
        </div>
      </div>
      <div class="cal-empty-state">
        <div class="cal-empty-icon">\u2699\uFE0F</div>
        <p class="cal-empty-title">No sensors registered</p>
        <p class="cal-empty-desc">Add sensors from the Devices view to calibrate their readings.</p>
      </div>
    `;
      return;
    }
    const allMetricDefs = [
      { metric: "temperature", unit: "\xB0C" },
      { metric: "humidity", unit: "%" },
      { metric: "co2", unit: "ppm" },
      { metric: "soil_moisture", unit: "%" },
      { metric: "light", unit: "lux" },
      { metric: "water_level", unit: "%" },
      { metric: "ph", unit: "" },
      { metric: "weight", unit: "kg" }
    ];
    const calibrationData = sensors.flatMap((sensor) => {
      const snap = store.sensors[sensor.id] ?? {};
      const calibrationOffset = sensor.calibration_offset ?? 0;
      return allMetricDefs.map(({ metric, unit }) => {
        const snapMetric = snap?.[metric];
        if (!snapMetric || snapMetric.value == null) return null;
        const calibratedValue = snapMetric.value;
        const rawValue = calibratedValue - calibrationOffset;
        return {
          device: sensor,
          rawValue,
          calibratedValue,
          offset: calibrationOffset,
          metric,
          unit
        };
      }).filter((e) => e !== null);
    });
    container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Calibration</h1>
        <p class="page-subtitle">Adjust sensor readings with offset \xB7 calibrated = raw + offset</p>
      </div>
    </div>

    <div class="cal-info-banner">
      <span class="cal-info-icon">\u2139\uFE0F</span>
      <span>Enter a reference value from a calibrated instrument. The offset is calculated as <strong>reference \u2212 raw</strong> and applied to all readings.</span>
    </div>

    <div class="cal-grid" id="cal-grid">
      ${calibrationData.map((cd) => renderCalibrationCard(cd)).join("")}
    </div>

    <div class="cal-distribution-section" id="cal-distribution">
      <div class="cal-section-header">
        <div>
          <h2 class="cal-section-title">Distribution</h2>
          <p class="cal-section-desc">Calibration offset distribution across all sensors \u2014 hover dots for device details</p>
        </div>
        <button class="hal-btn-secondary" id="cal-distribution-toggle">
          <span>Show</span>
        </button>
      </div>
      <div id="cal-beeswarm-container" style="display:none"></div>
    </div>
  `;
    attachCalibrationHandlers(calibrationData);
  }
  function renderCalibrationCard(cd) {
    const { device, rawValue, calibratedValue, offset, metric, unit } = cd;
    const metricLabel = metric.charAt(0).toUpperCase() + metric.slice(1).replace("_", " ");
    const formattedRaw = formatValue2(rawValue, unit);
    const formattedCalibrated = formatValue2(calibratedValue, unit);
    const formattedOffset = offset !== 0 ? formatValue2(offset, unit) : "0";
    const inputId = `ref-${device.id}-${metric}`;
    return `
    <div class="cal-card" data-device-id="${device.id}" data-metric="${metric}">
      <div class="cal-card-header">
        <div class="cal-device-icon">${getDeviceIcon(device)}</div>
        <div class="cal-device-info">
          <div class="cal-device-name">${escapeHtml15(device.name)}</div>
          <div class="cal-device-meta">
            <span class="hal-badge hal-badge-slate">${escapeHtml15(metricLabel)}</span>
            <span class="hal-badge hal-badge-slate">${device.protocol}</span>
            ${device.zone ? `<span class="cal-zone-tag">${escapeHtml15(device.zone)}</span>` : ""}
          </div>
        </div>
        <div class="cal-status ${offset !== 0 ? "calibrated" : ""}">
          ${offset !== 0 ? `<span class="cal-badge-active">Calibrated</span>` : `<span class="cal-badge-default">Default</span>`}
        </div>
      </div>

      <div class="cal-readings">
        <div class="cal-reading-block">
          <div class="cal-reading-label">Raw Reading</div>
          <div class="cal-reading-value cal-raw">${formattedRaw}</div>
        </div>
        <div class="cal-reading-arrow">\u2192</div>
        <div class="cal-reading-block">
          <div class="cal-reading-label">Calibrated</div>
          <div class="cal-reading-value cal-calibrated">${formattedCalibrated}</div>
        </div>
      </div>

      <div class="cal-current-offset">
        <span class="cal-offset-label">Current offset:</span>
        <span class="cal-offset-value ${offset !== 0 ? "has-offset" : ""}">${formattedOffset}</span>
      </div>

      <div class="cal-form">
        <div class="cal-form-row">
          <label class="cal-form-label" for="${inputId}">Reference Value</label>
          <div class="cal-input-group">
            <input
              class="cal-input"
              type="number"
              id="${inputId}"
              placeholder="Enter reference value"
              step="any"
            />
            <span class="cal-input-unit">${unit}</span>
          </div>
        </div>
        <div class="cal-form-actions">
          <button
            class="hal-btn-primary cal-apply-btn"
            data-device-id="${device.id}"
            data-metric="${metric}"
            data-unit="${unit}"
            data-raw-value="${rawValue}"
          >
            Apply Offset
          </button>
          <button
            class="hal-btn-secondary cal-reset-btn"
            data-device-id="${device.id}"
            data-metric="${metric}"
            ${offset === 0 ? "disabled" : ""}
          >
            Reset to Zero
          </button>
        </div>
      </div>
    </div>
  `;
  }
  function attachCalibrationHandlers(calibrationData) {
    document.querySelectorAll(".cal-apply-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const el = btn;
        const deviceId = el.dataset.deviceId;
        const metric = el.dataset.metric;
        const unit = el.dataset.unit;
        const rawValue = parseFloat(el.dataset.rawValue);
        const inputEl = document.getElementById(
          `ref-${deviceId}-${metric}`
        );
        const refValue = parseFloat(inputEl.value);
        if (isNaN(refValue)) {
          showToast("Please enter a valid reference value", "warning");
          return;
        }
        const offset = refValue - rawValue;
        try {
          await halApi.updateDeviceCalibration(deviceId, offset);
          showToast(
            `Calibration applied: offset = ${formatValue2(offset, unit)}`,
            "success"
          );
          const { refreshHALData: refreshHALData2 } = await Promise.resolve().then(() => (init_main(), main_exports));
          refreshHALData2();
          const container = document.getElementById("view-container");
          if (container) {
            renderCalibration(container);
          }
        } catch (err) {
          showToast(`Failed: ${err.message}`, "danger");
        }
      });
    });
    document.querySelectorAll(".cal-reset-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const el = btn;
        const deviceId = el.dataset.deviceId;
        const metric = el.dataset.metric;
        const metricLabel = metric.charAt(0).toUpperCase() + metric.slice(1).replace("_", " ");
        if (!confirm(`Reset calibration offset for ${metricLabel} on this sensor?`)) {
          return;
        }
        try {
          await halApi.updateDeviceCalibration(deviceId, 0);
          showToast("Calibration reset to zero", "success");
          const { refreshHALData: refreshHALData2 } = await Promise.resolve().then(() => (init_main(), main_exports));
          refreshHALData2();
          const container = document.getElementById("view-container");
          if (container) {
            renderCalibration(container);
          }
        } catch (err) {
          showToast(`Failed: ${err.message}`, "danger");
        }
      });
    });
    let distributionVisible = false;
    const distToggle = document.getElementById("cal-distribution-toggle");
    const beeswarmContainer = document.getElementById("cal-beeswarm-container");
    distToggle?.addEventListener("click", () => {
      distributionVisible = !distributionVisible;
      if (distributionVisible) {
        distToggle.classList.add("active");
        distToggle.querySelector("span").textContent = "Hide";
        beeswarmContainer.style.display = "";
        renderBeeswarm(calibrationData);
      } else {
        distToggle.classList.remove("active");
        distToggle.querySelector("span").textContent = "Show";
        beeswarmContainer.style.display = "none";
      }
    });
  }
  function renderBeeswarm(calibrationData) {
    const beeswarmContainer = document.getElementById("cal-beeswarm-container");
    if (!beeswarmContainer) return;
    const points = calibrationData.map((cd) => ({
      deviceId: cd.device.id,
      deviceName: cd.device.name,
      metric: cd.metric,
      offset: cd.offset,
      unit: cd.unit
    }));
    renderCalibrationBeeswarmSvg(points, "cal-beeswarm-container");
  }
  function getDeviceIcon(device) {
    switch (device.type) {
      case "sensor":
        return "\u{1F321}\uFE0F";
      case "relay":
        return "\u{1F50C}";
      case "camera":
        return "\u{1F4F7}";
      default:
        return "\u{1F4DF}";
    }
  }
  function formatValue2(value, unit) {
    const precision = Math.abs(value) >= 100 ? 0 : value % 1 === 0 ? 0 : 2;
    return `${value.toFixed(precision)}${unit}`;
  }
  function escapeHtml15(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function injectCalibrationStyles() {
    if (document.getElementById("hal-calibration-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-calibration-styles";
    style.textContent = `
.cal-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
}
.cal-empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}
.cal-empty-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}
.cal-empty-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  max-width: 400px;
}

.cal-info-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: color-mix(in srgb, var(--accent) 10%, var(--bg-secondary));
  border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
  border-radius: var(--radius-md);
  margin-bottom: 24px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.cal-info-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}
.cal-info-banner strong {
  color: var(--text-primary);
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.cal-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cal-card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.cal-device-icon {
  font-size: 28px;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.cal-device-info {
  flex: 1;
  min-width: 0;
}

.cal-device-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cal-device-meta {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.cal-zone-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.cal-status {
  flex-shrink: 0;
}

.cal-badge-active {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--accent) 20%, var(--bg-tertiary));
  color: var(--accent-bright);
  border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border));
}

.cal-badge-default {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.cal-readings {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.cal-reading-block {
  text-align: center;
  flex: 1;
}

.cal-reading-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}

.cal-reading-value {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 600;
}

.cal-raw {
  color: var(--text-secondary);
}

.cal-calibrated {
  color: var(--accent-bright);
}

.cal-reading-arrow {
  font-size: 20px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.cal-current-offset {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.cal-offset-label {
  color: var(--text-secondary);
}

.cal-offset-value {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-tertiary);
}

.cal-offset-value.has-offset {
  color: var(--accent-bright);
}

.cal-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
  border-top: 1px solid var(--border-subtle);
}

.cal-form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cal-form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.cal-input-group {
  display: flex;
  align-items: center;
  gap: 0;
}

.cal-input {
  flex: 1;
  height: 36px;
  padding: 0 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 14px;
  outline: none;
  min-width: 0;
}

.cal-input:focus {
  border-color: var(--accent);
}

.cal-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cal-input-unit {
  height: 36px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-left: none;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.cal-form-actions {
  display: flex;
  gap: 8px;
}

.cal-apply-btn,
.cal-reset-btn {
  flex: 1;
  height: 36px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all var(--transition-fast);
}

.cal-apply-btn {
  background: var(--accent);
  color: var(--on-accent);
}

.cal-apply-btn:hover:not(:disabled) {
  filter: brightness(1.1);
}

.cal-apply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cal-reset-btn {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.cal-reset-btn:hover:not(:disabled) {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.cal-reset-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cal-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin: var(--space-6) 0 var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}
.cal-section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.cal-section-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}
.cal-distribution-section {
  margin-top: var(--space-4);
}
.hal-btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  height: 36px;
  padding: 0 var(--space-4);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms;
}
.hal-btn-secondary:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}
.hal-btn-secondary.active {
  background: var(--accent);
  color: var(--text-primary);
  border-color: var(--accent);
}
@media (max-width: 768px) {
  .cal-grid {
    grid-template-columns: 1fr;
  }
  .cal-readings {
    flex-direction: column;
    gap: 8px;
  }
  .cal-reading-arrow {
    transform: rotate(90deg);
  }
}
`;
    document.head.appendChild(style);
  }
  var init_Calibration = __esm({
    "src/web/hal-ui/views/Calibration.ts"() {
      "use strict";
      init_store();
      init_api();
      init_Toast();
      init_ChartKit();
      init_EnvironmentCharts();
    }
  });

  // src/web/hal-ui/views/Settings.ts
  async function renderSettings(container) {
    injectSettingsStyles();
    container.innerHTML = renderLoadingState();
    try {
      const llmSettings = await halApi.getLlmSettings();
      settingsData.llmProvider = llmSettings.llmProvider || "ollama";
      settingsData.llmEndpoint = llmSettings.llmEndpoint || "http://localhost:11434";
      settingsData.llmApiKey = llmSettings.llmApiKey || "";
      settingsData.llmModel = llmSettings.llmModel || "";
    } catch {
    }
    try {
      const status = await provisioningApi.getStatus();
      settingsData.farmName = status.farmName || "My Farm";
      settingsData.timezone = status.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!settingsData.llmProvider || settingsData.llmProvider === "ollama") {
        settingsData.llmProvider = status.llmProvider || "ollama";
      }
    } catch {
    }
    try {
      const networkRes = await fetch(
        "http://127.0.0.1:3392/api/settings/network"
      );
      if (networkRes.ok) {
        const net = await networkRes.json();
        networkData.accessMode = net.accessMode || "localhost";
        networkData.httpsEnabled = net.httpsEnabled || false;
        networkData.lanWithoutHttps = net.lanWithoutHttps || false;
      }
    } catch {
    }
    container.innerHTML = renderSettingsPage();
    attachSettingsEvents();
  }
  function renderLoadingState() {
    return `
    <div class="settings-view">
      <div class="settings-loading">Loading settings...</div>
    </div>
  `;
  }
  function renderSettingsPage() {
    const selectedProvider = LLM_PROVIDERS2.find((p) => p.id === settingsData.llmProvider) || LLM_PROVIDERS2[0];
    const showApiKey = "supportsApiKey" in selectedProvider && selectedProvider.supportsApiKey;
    const showEndpoint = "defaultEndpoint" in selectedProvider;
    const regionGroups = {};
    for (const tz of COMMON_TIMEZONES2) {
      const region = tz.split("/")[0];
      if (!regionGroups[region]) regionGroups[region] = [];
      regionGroups[region].push(tz);
    }
    const currentTz = settingsData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    return `
    <div class="settings-view">
      <div class="settings-header">
        <h1 class="view-title">Settings</h1>
      </div>

      <div class="settings-sections">
        <!-- Farm Info Section -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            Farm Info
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <label class="settings-label" for="farm-name">Farm Name</label>
              <input
                type="text"
                id="farm-name"
                class="form-input"
                value="${escapeHtml16(settingsData.farmName)}"
                maxlength="64"
                placeholder="My Farm"
              />
              <p class="settings-hint">This appears in the dashboard header and notifications.</p>
            </div>
          </div>
        </section>

        <!-- Timezone Section -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Timezone
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <label class="settings-label" for="timezone">Timezone</label>
              <select id="timezone" class="form-select">
                ${Object.entries(regionGroups).map(
      ([region, tzs]) => `
                  <optgroup label="${region}">
                    ${tzs.map(
        (tz) => `
                      <option value="${tz}" ${tz === currentTz ? "selected" : ""}>${tz}</option>
                    `
      ).join("")}
                  </optgroup>
                `
    ).join("")}
              </select>
              <p class="settings-hint">Used for scheduling and decision logs.</p>
            </div>
          </div>
        </section>

        <!-- LLM Provider Section -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/><path d="M12 8v4l3 3"/></svg>
            AI / LLM Provider
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <label class="settings-label">Provider</label>
              <div class="provider-grid">
                ${LLM_PROVIDERS2.map(
      (p) => `
                  <button type="button" class="provider-card ${p.id === settingsData.llmProvider ? "selected" : ""}" data-provider="${p.id}">
                    <div class="provider-name">${p.name}</div>
                  </button>
                `
    ).join("")}
              </div>
            </div>

            ${showEndpoint ? `
            <div class="settings-field">
              <label class="settings-label" for="llm-endpoint">Endpoint</label>
              <input
                type="text"
                id="llm-endpoint"
                class="form-input"
                value="${escapeHtml16(settingsData.llmEndpoint)}"
                placeholder="http://localhost:11434"
              />
              <p class="settings-hint">${settingsData.llmProvider === "ollama" ? "Ollama server address." : "LM Studio server address."}</p>
            </div>
            ` : ""}

            ${showApiKey ? `
            <div class="settings-field">
              <label class="settings-label" for="llm-api-key">API Key</label>
              <input
                type="password"
                id="llm-api-key"
                class="form-input"
                value="${escapeHtml16(settingsData.llmApiKey)}"
                placeholder="sk-..."
                autocomplete="off"
              />
            </div>
            ` : ""}

            <div class="settings-field">
              <label class="settings-label" for="llm-model">Model</label>
              <input
                type="text"
                id="llm-model"
                class="form-input"
                value="${escapeHtml16(settingsData.llmModel)}"
                placeholder="${settingsData.llmProvider === "ollama" ? "llama3.2, mistral, etc." : "e.g., llama3.2"}"
                autocomplete="off"
              />
              <p class="settings-hint">${"supportsModel" in selectedProvider && selectedProvider.supportsModel ? "Must match an installed model in your Ollama/LM Studio." : "Model identifier for the provider."}</p>
            </div>
          </div>
        </section>

        <!-- Update Section -->
        <!-- Update Section (VAL-UPDT-001 through VAL-UPDT-012, VAL-VERS-001, VAL-VERS-002, VAL-VERS-003) -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Updates
            <span id="update-badge" class="badge badge-green" style="display:none; margin-left:8px;">Update Available</span>
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <div class="settings-row">
                <div>
                  <p class="settings-label">Current Version</p>
                  <p class="settings-value mono-md" id="current-version">Loading...</p>
                </div>
                <button class="btn btn-secondary" id="check-updates-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  Check for Updates
                </button>
              </div>
            </div>

            <!-- Update available section -->
            <div class="settings-field" id="update-available-section" style="display:none;">
              <div class="update-info-card">
                <div class="update-info-header">
                  <div>
                    <p class="settings-label">Available Version</p>
                    <p class="settings-value mono-md" id="available-version">-</p>
                  </div>
                  <span class="badge badge-green" id="update-version-badge"></span>
                </div>
                <div class="settings-field" style="margin-top:12px;">
                  <button class="btn btn-primary" id="install-update-btn" style="width:100%;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Install Update
                  </button>
                </div>
                <details class="changelog-details">
                  <summary class="changelog-summary">What's New</summary>
                  <div class="changelog-content" id="changelog-content"></div>
                </details>
              </div>
            </div>

            <!-- Offline status -->
            <div class="settings-field" id="update-offline-section" style="display:none;">
              <div class="update-offline-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                <span>Offline \u2014 updates available when connected</span>
              </div>
            </div>

            <!-- No update available -->
            <div class="settings-field" id="update-no-available-section" style="display:none;">
              <p class="settings-hint" id="update-no-available-text">You are running the latest version.</p>
            </div>

            <!-- Update status message -->
            <div class="settings-field" id="update-last-checked" style="display:none;">
              <p class="settings-hint">Last checked: <span id="last-checked-time">-</span></p>
            </div>

            <!-- Rollback section (VAL-UPDT-011) -->
            <div class="settings-field" id="rollback-section" style="display:none; margin-top:16px;">
              <hr class="settings-divider"/>
              <p class="settings-label" style="margin-top:12px;">Previous Version</p>
              <p class="settings-hint">A previous version snapshot is available. You can rollback if the current version is not working correctly.</p>
              <button class="btn btn-secondary" id="rollback-btn" style="margin-top:8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Rollback to Previous Version
              </button>
            </div>

            <!-- Update history link -->
            <div class="settings-field" style="margin-top:12px;">
              <button class="btn btn-ghost" id="show-update-history-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                View Update History
              </button>
            </div>
          </div>
        </section>

        <!-- Backup Section -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Backup & Restore
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <p class="settings-label">Configuration Backup</p>
              <p class="settings-hint">Download a backup of your FF_SmartControl configuration and settings.</p>
              <div class="settings-actions">
                <button class="btn btn-secondary" id="backup-now-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Backup Now
                </button>
                <button class="btn btn-secondary" id="restore-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Restore
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- License Section -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            License
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <p class="settings-label">License Status</p>
              <p class="settings-value" id="license-status">
                <span class="badge badge-slate">Loading...</span>
              </p>
            </div>
            <div class="settings-field">
              <p class="settings-label">Features</p>
              <ul class="settings-feature-list" id="license-features">
                <li>Local AI control</li>
                <li>Sensor monitoring</li>
                <li>Device automation</li>
              </ul>
            </div>
            <div id="license-section-actions"></div>
          </div>
        </section>

        <!-- Network Section (VAL-SEC-050, VAL-SEC-051, VAL-SEC-052, VAL-SEC-053) -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Network Access
          </h2>
          <div class="settings-card">
            ${networkData.lanWithoutHttps ? `
            <div class="settings-warning-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Warning: FF_SmartControl is accessible over HTTP on your local network. Enable HTTPS for secure remote access.</span>
            </div>
            ` : ""}
            <div class="settings-field">
              <p class="settings-label">Access Mode</p>
              <div class="access-mode-grid">
                <button type="button" class="access-mode-card ${networkData.accessMode === "localhost" ? "selected" : ""}" data-access-mode="localhost">
                  <div class="access-mode-icon">\u{1F512}</div>
                  <div class="access-mode-name">Local Only</div>
                  <div class="access-mode-desc">Only accessible from this device (127.0.0.1)</div>
                </button>
                <button type="button" class="access-mode-card ${networkData.accessMode === "lan" ? "selected" : ""}" data-access-mode="lan">
                  <div class="access-mode-icon">\u{1F310}</div>
                  <div class="access-mode-name">Local Network</div>
                  <div class="access-mode-desc">Accessible from devices on your LAN (0.0.0.0)</div>
                </button>
                <button type="button" class="access-mode-card ${networkData.accessMode === "remote" ? "selected" : ""}" data-access-mode="remote" ${!networkData.httpsEnabled ? 'disabled title="HTTPS required for remote access"' : ""}>
                  <div class="access-mode-icon">\u{1F30D}</div>
                  <div class="access-mode-name">Remote Access</div>
                  <div class="access-mode-desc">Accessible from anywhere (requires HTTPS)</div>
                </button>
              </div>
            </div>
            <div class="settings-field">
              <p class="settings-label">HTTPS Status</p>
              <p class="settings-value">
                ${networkData.httpsEnabled ? '<span class="badge badge-green">Enabled</span>' : '<span class="badge badge-slate">Disabled</span>'}
                ${!networkData.httpsEnabled && networkData.accessMode === "remote" ? '<span class="settings-hint-error"> \u2014 HTTPS is required for remote access</span>' : ""}
              </p>
              <p class="settings-hint">HTTPS is required for remote (WAN) access. Local network access works with or without HTTPS.</p>
            </div>
          </div>
        </section>

        <!-- Factory Reset Section -->
        <section class="settings-section">
          <h2 class="settings-section-title factory-reset-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            Factory Reset
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <p class="settings-label">Reset FF_SmartControl</p>
              <p class="settings-hint">Completely reset FF_SmartControl to first-boot state. All data will be permanently deleted including sensor history, device configuration, automation rules, and admin password.</p>
              <div class="settings-actions">
                <button class="btn btn-danger" id="factory-reset-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  Factory Reset
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Help & Documentation Section (VAL-DOC-009, VAL-DOC-010) -->
        <section class="settings-section">
          <h2 class="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Help & Documentation
          </h2>
          <div class="settings-card">
            <div class="settings-field">
              <p class="settings-hint">Access operator guides for setup, hardware, safety, and troubleshooting. All guides work offline \u2014 they are bundled with FF_SmartControl.</p>
            </div>
            <div class="docs-links-grid">
              <a href="/docs/QUICKSTART.md" target="_blank" rel="noopener" class="doc-link-card">
                <div class="doc-link-icon">\u{1F680}</div>
                <div class="doc-link-content">
                  <div class="doc-link-title">Quick Start Guide</div>
                  <div class="doc-link-desc">Flash \u2192 boot \u2192 wizard \u2192 dashboard in 15 minutes</div>
                </div>
                <svg class="doc-link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
              <a href="/docs/HARDWARE.md" target="_blank" rel="noopener" class="doc-link-card">
                <div class="doc-link-icon">\u{1F50C}</div>
                <div class="doc-link-content">
                  <div class="doc-link-title">Hardware Guide</div>
                  <div class="doc-link-desc">Wiring diagrams, GPIO pinouts, electrical safety</div>
                </div>
                <svg class="doc-link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
              <a href="/docs/SAFETY.md" target="_blank" rel="noopener" class="doc-link-card">
                <div class="doc-link-icon">\u26A0\uFE0F</div>
                <div class="doc-link-content">
                  <div class="doc-link-title">Safety Guide</div>
                  <div class="doc-link-desc">Electrical disclaimers, fire hazards, grounding, IP rating</div>
                </div>
                <svg class="doc-link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
              <a href="/docs/DASHBOARD.md" target="_blank" rel="noopener" class="doc-link-card">
                <div class="doc-link-icon">\u{1F4CA}</div>
                <div class="doc-link-content">
                  <div class="doc-link-title">Dashboard Guide</div>
                  <div class="doc-link-desc">All views, controls, chart interpretation, mode switching</div>
                </div>
                <svg class="doc-link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
              <a href="/docs/AUTOMATION.md" target="_blank" rel="noopener" class="doc-link-card">
                <div class="doc-link-icon">\u{1F916}</div>
                <div class="doc-link-content">
                  <div class="doc-link-title">Automation Guide</div>
                  <div class="doc-link-desc">Autonomous control, four modes, thresholds, safety policies</div>
                </div>
                <svg class="doc-link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
              <a href="/docs/TROUBLESHOOTING.md" target="_blank" rel="noopener" class="doc-link-card">
                <div class="doc-link-icon">\u{1F527}</div>
                <div class="doc-link-content">
                  <div class="doc-link-title">Troubleshooting Guide</div>
                  <div class="doc-link-desc">Common issues with fix steps for each</div>
                </div>
                <svg class="doc-link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
              <a href="/docs/BACKUP_RESTORE.md" target="_blank" rel="noopener" class="doc-link-card">
                <div class="doc-link-icon">\u{1F4BE}</div>
                <div class="doc-link-content">
                  <div class="doc-link-title">Backup &amp; Restore Guide</div>
                  <div class="doc-link-desc">Manual/auto backup, storage location, restore steps</div>
                </div>
                <svg class="doc-link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
              <a href="/docs/FACTORY_RESET.md" target="_blank" rel="noopener" class="doc-link-card">
                <div class="doc-link-icon">\u{1F5C4}\uFE0F</div>
                <div class="doc-link-content">
                  <div class="doc-link-title">Factory Reset Guide</div>
                  <div class="doc-link-desc">How to reset, what is erased, confirmation required</div>
                </div>
                <svg class="doc-link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>
        </section>

      </div>

      <!-- Save Button -->
      <div class="settings-footer">
        <button class="btn btn-primary" id="save-settings-btn" ${isSaving ? "disabled" : ""}>
          ${isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <!-- Version Footer (VAL-VERS-001) -->
      <div class="settings-version-footer" id="settings-version-footer">
        <span class="settings-version-text" id="settings-version-text">FF_SmartControl v1.0.0</span>
      </div>
    </div>
  `;
  }
  function attachSettingsEvents() {
    document.querySelectorAll(".provider-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const provider = btn.dataset.provider;
        settingsData.llmProvider = provider;
        const p = LLM_PROVIDERS2.find((x) => x.id === provider);
        if (p && "defaultEndpoint" in p && p.defaultEndpoint) {
          settingsData.llmEndpoint = p.defaultEndpoint;
        }
        document.querySelectorAll(".provider-card").forEach((b) => {
          b.classList.toggle("selected", b.dataset.provider === provider);
        });
        const endpointField = document.getElementById(
          "llm-endpoint"
        );
        if (endpointField) {
          endpointField.value = settingsData.llmEndpoint;
        }
      });
    });
    document.querySelectorAll(".access-mode-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.accessMode;
        if (!mode) return;
        if (mode === "remote" && !networkData.httpsEnabled) {
          showToast(
            "Enable HTTPS first to allow remote access",
            "warning",
            3e3
          );
          return;
        }
        networkData.accessMode = mode;
        document.querySelectorAll(".access-mode-card").forEach((b) => {
          b.classList.toggle("selected", b.dataset.accessMode === mode);
        });
      });
    });
    const saveBtn = document.getElementById("save-settings-btn");
    saveBtn?.addEventListener("click", async () => {
      if (isSaving) return;
      isSaving = true;
      saveBtn.textContent = "Saving...";
      saveBtn.setAttribute("disabled", "");
      try {
        settingsData.farmName = document.getElementById("farm-name")?.value || "My Farm";
        settingsData.timezone = document.getElementById("timezone")?.value || settingsData.timezone;
        settingsData.llmEndpoint = document.getElementById("llm-endpoint")?.value || settingsData.llmEndpoint;
        settingsData.llmApiKey = document.getElementById("llm-api-key")?.value || "";
        settingsData.llmModel = document.getElementById("llm-model")?.value || "";
        await provisioningApi.updateWizardStep(2, {
          farmName: settingsData.farmName,
          timezone: settingsData.timezone,
          llmProvider: settingsData.llmProvider
        });
        const settingsRes = await fetch(
          "http://127.0.0.1:3392/api/settings/llm",
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              llmProvider: settingsData.llmProvider,
              llmEndpoint: settingsData.llmEndpoint,
              llmApiKey: settingsData.llmApiKey,
              llmModel: settingsData.llmModel
            })
          }
        );
        if (!settingsRes.ok) {
          throw new Error("Failed to save LLM settings");
        }
        showToast("Settings saved", "success", 2e3);
      } catch (err) {
        showToast(
          "Failed to save settings: " + (err.message || "Unknown error"),
          "danger",
          3e3
        );
      } finally {
        isSaving = false;
        saveBtn.textContent = "Save Settings";
        saveBtn.removeAttribute("disabled");
      }
    });
    const checkUpdatesBtn = document.getElementById("check-updates-btn");
    checkUpdatesBtn?.addEventListener("click", async () => {
      checkUpdatesBtn.setAttribute("disabled", "");
      checkUpdatesBtn.textContent = "Checking...";
      try {
        const response = await fetch("http://127.0.0.1:3392/api/update/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
        const data = await response.json();
        document.getElementById("update-available-section").style.display = "none";
        document.getElementById("update-offline-section").style.display = "none";
        document.getElementById("update-no-available-section").style.display = "none";
        document.getElementById("update-badge").style.display = "none";
        document.getElementById("rollback-section").style.display = "none";
        document.getElementById("update-last-checked").style.display = "none";
        const lastCheckedEl = document.getElementById("last-checked-time");
        if (lastCheckedEl && data.lastChecked) {
          const date2 = new Date(data.lastChecked);
          lastCheckedEl.textContent = date2.toLocaleString();
          document.getElementById("update-last-checked").style.display = "block";
        }
        if (data.status === "offline") {
          document.getElementById("update-offline-section").style.display = "block";
          const installBtn = document.getElementById(
            "install-update-btn"
          );
          if (installBtn) installBtn.disabled = true;
        } else if (data.status === "available" || data.status === "prerelease") {
          document.getElementById("update-available-section").style.display = "block";
          document.getElementById("update-badge").style.display = "inline";
          const availableVersionEl = document.getElementById("available-version");
          if (availableVersionEl)
            availableVersionEl.textContent = data.availableVersion || "-";
          const changelogEl = document.getElementById("changelog-content");
          if (changelogEl && data.changelog) {
            changelogEl.innerHTML = formatChangelog(data.changelog);
          }
          const badgeEl = document.getElementById("update-version-badge");
          if (badgeEl) {
            badgeEl.textContent = data.status === "prerelease" ? "Beta" : "New";
          }
          const installBtn = document.getElementById(
            "install-update-btn"
          );
          if (installBtn) {
            installBtn.disabled = false;
            installBtn.dataset.version = data.availableVersion || "";
            installBtn.dataset.changelog = data.changelog || "";
          }
        } else if (data.status === "none") {
          document.getElementById("update-no-available-section").style.display = "block";
          const noUpdateText = document.getElementById(
            "update-no-available-text"
          );
          if (noUpdateText)
            noUpdateText.textContent = "You are running the latest version.";
        } else if (data.status === "error") {
          document.getElementById("update-no-available-section").style.display = "block";
          const noUpdateText = document.getElementById(
            "update-no-available-text"
          );
          if (noUpdateText)
            noUpdateText.textContent = data.errorMessage || "Failed to check for updates.";
        }
        if (data.canRollback) {
          document.getElementById("rollback-section").style.display = "block";
        }
        const currentVersionEl = document.getElementById("current-version");
        if (currentVersionEl)
          currentVersionEl.textContent = data.currentVersion || "Unknown";
      } catch (err) {
        showToast(
          "Failed to check for updates: " + (err.message || "Unknown error"),
          "danger",
          3e3
        );
      } finally {
        checkUpdatesBtn.textContent = "Check for Updates";
        checkUpdatesBtn.removeAttribute("disabled");
      }
    });
    const installUpdateBtn = document.getElementById("install-update-btn");
    installUpdateBtn?.addEventListener("click", async () => {
      const version = installUpdateBtn.dataset.version;
      const changelog = installUpdateBtn.dataset.changelog || "";
      if (!confirm(
        `Install FF_SmartControl v${version}?

A backup will be created automatically before the update.

The service will restart after the update.`
      )) {
        return;
      }
      showUpdateProgressModal(version || "unknown");
      try {
        const response = await fetch("http://127.0.0.1:3392/api/update/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            release: {
              version,
              changelog,
              downloadUrl: `https://updates.farmpal.io/releases/v${version}/farmpal.tar.gz`,
              checksum: "mock_checksum_for_testing",
              checksumUrl: `https://updates.farmpal.io/releases/v${version}/SHA256SUMS`,
              releaseDate: (/* @__PURE__ */ new Date()).toISOString()
            }
          })
        });
        const result = await response.json();
        if (result.success) {
          updateProgressModal("Restarting...", 100);
          showToast(
            `FF_SmartControl v${version} installed successfully!`,
            "success",
            5e3
          );
          setTimeout(() => {
            closeUpdateProgressModal();
            window.location.reload();
          }, 3e3);
        } else {
          updateProgressModal(
            "Update failed: " + (result.error || "Unknown error"),
            -1
          );
          showToast(
            "Update failed: " + (result.error || "Unknown error"),
            "danger",
            5e3
          );
        }
      } catch (err) {
        updateProgressModal(
          "Update failed: " + (err.message || "Unknown error"),
          -1
        );
        showToast(
          "Update failed: " + (err.message || "Unknown error"),
          "danger",
          5e3
        );
      }
    });
    const rollbackBtn = document.getElementById("rollback-btn");
    rollbackBtn?.addEventListener("click", async () => {
      if (!confirm(
        "Rollback to the previous version?\n\nThe current version will be replaced and FF_SmartControl will restart."
      )) {
        return;
      }
      rollbackBtn.setAttribute("disabled", "");
      try {
        const response = await fetch(
          "http://127.0.0.1:3392/api/update/rollback",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          }
        );
        const result = await response.json();
        if (result.success) {
          showToast("Rollback initiated. Restarting...", "success", 3e3);
          setTimeout(() => {
            window.location.reload();
          }, 2e3);
        } else {
          showToast(
            "Rollback failed: " + (result.error || "Unknown error"),
            "danger",
            5e3
          );
          rollbackBtn.removeAttribute("disabled");
        }
      } catch (err) {
        showToast(
          "Rollback failed: " + (err.message || "Unknown error"),
          "danger",
          5e3
        );
        rollbackBtn.removeAttribute("disabled");
      }
    });
    const showHistoryBtn = document.getElementById("show-update-history-btn");
    showHistoryBtn?.addEventListener("click", async () => {
      try {
        const response = await fetch("http://127.0.0.1:3392/api/update/history");
        const data = await response.json();
        showUpdateHistoryModal(data.history || []);
      } catch (err) {
        showToast("Failed to load update history", "danger", 3e3);
      }
    });
    loadUpdateStatus();
    const backupBtn = document.getElementById("backup-now-btn");
    backupBtn?.addEventListener("click", async () => {
      backupBtn.setAttribute("disabled", "");
      const originalText = backupBtn.innerHTML;
      backupBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"/></svg> Backing up...';
      try {
        const result = await halApi.triggerBackup();
        if (result.ok) {
          showToast(`Backup created: ${result.archive}`, "success", 4e3);
        } else {
          showToast("Backup failed", "danger", 3e3);
        }
      } catch (err) {
        showToast(
          "Backup failed: " + (err.message || "Unknown error"),
          "danger",
          3e3
        );
      } finally {
        backupBtn.innerHTML = originalText;
        backupBtn.removeAttribute("disabled");
      }
    });
    const restoreBtn = document.getElementById("restore-btn");
    restoreBtn?.addEventListener("click", async () => {
      showToast("Restore feature coming soon", "info", 2e3);
    });
    const factoryResetBtn = document.getElementById("factory-reset-btn");
    factoryResetBtn?.addEventListener("click", () => {
      showFactoryResetConfirmDialog();
    });
    loadVersionInfo();
    loadLicenseInfo();
  }
  async function loadVersionInfo() {
    const versionEl = document.getElementById("current-version");
    const versionFooterEl = document.getElementById("settings-version-text");
    try {
      const response = await fetch("http://127.0.0.1:3392/api/update/status");
      const data = await response.json();
      const version = data.currentVersion || "Unknown";
      if (versionEl) {
        versionEl.textContent = version;
      }
      if (versionFooterEl) {
        versionFooterEl.textContent = `FF_SmartControl v${version}`;
      }
    } catch {
      if (versionEl) {
        versionEl.textContent = "Unknown";
      }
      if (versionFooterEl) {
        versionFooterEl.textContent = "FF_SmartControl vUnknown";
      }
    }
  }
  async function loadLicenseInfo() {
    const statusEl = document.getElementById("license-status");
    const featuresEl = document.getElementById("license-features");
    const licenseSection = document.getElementById("license-section-actions");
    if (!statusEl) return;
    try {
      const status = await halApi.getLicenseStatus();
      const gates = await halApi.getFeatureGates();
      let badgeHtml = "";
      let badgeClass = "badge-slate";
      let featuresHtml = "";
      let bannerHtml = "";
      switch (status.status) {
        case "LICENSED":
          badgeClass = "badge-green";
          badgeHtml = `<span class="badge ${badgeClass}">LICENSED</span>`;
          if (status.expiresAt) {
            const expiryDate = new Date(status.expiresAt).toLocaleDateString();
            badgeHtml += ` <span style="color: var(--text-secondary); font-size: 13px;">Expires ${expiryDate}</span>`;
          }
          featuresHtml = `
          <li>\u2713 Local AI control</li>
          <li>\u2713 Sensor monitoring</li>
          <li>\u2713 Device automation</li>
          <li>\u2713 Cloud features</li>
          <li>\u2713 Remote access</li>
        `;
          break;
        case "TRIAL":
          badgeClass = "badge-blue";
          const daysLeft = status.daysRemaining ?? 0;
          badgeHtml = `<span class="badge ${badgeClass}">TRIAL \u2014 ${daysLeft} day${daysLeft === 1 ? "" : "s"}</span>`;
          featuresHtml = `
          <li>\u2713 Local AI control</li>
          <li>\u2713 Sensor monitoring</li>
          <li>\u2713 Device automation</li>
          <li>\u2713 Cloud features (${daysLeft} days left)</li>
          <li>\u2713 Remote access (${daysLeft} days left)</li>
        `;
          break;
        case "EXPIRED":
          badgeClass = "badge-red";
          badgeHtml = `<span class="badge badge-red">EXPIRED</span>`;
          if (status.expiresAt) {
            const expiryDate = new Date(status.expiresAt).toLocaleDateString();
            badgeHtml += ` <span style="color: var(--text-secondary); font-size: 13px;">Expired ${expiryDate}</span>`;
          }
          bannerHtml = `
          <div class="license-expired-banner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>License Expired</strong>
              <p>Your license has expired. Cloud and remote features are disabled. Activate a license to restore full functionality.</p>
            </div>
          </div>
        `;
          featuresHtml = `
          <li style="color: var(--text-secondary);">\u2717 Cloud features (license expired)</li>
          <li style="color: var(--text-secondary);">\u2717 Remote access (license expired)</li>
          <li>\u2713 Local AI control</li>
          <li>\u2713 Sensor monitoring</li>
          <li>\u2713 Device automation</li>
        `;
          break;
        case "UNLICENSED":
        default:
          badgeClass = "badge-slate";
          badgeHtml = `<span class="badge ${badgeClass}">UNLICENSED</span>`;
          featuresHtml = `
          <li style="color: var(--text-secondary);">\u2717 Cloud features</li>
          <li style="color: var(--text-secondary);">\u2717 Remote access</li>
          <li>\u2713 Local AI control</li>
          <li>\u2713 Sensor monitoring</li>
          <li>\u2713 Device automation</li>
        `;
          break;
      }
      if (status.isOffline && status.offlineExpiresAt) {
        const offlineExpiryDate = new Date(
          status.offlineExpiresAt
        ).toLocaleString();
        bannerHtml += `
        <div class="license-offline-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
          <span>Offline mode \u2014 license cache expires ${offlineExpiryDate}</span>
        </div>
      `;
      }
      statusEl.innerHTML = badgeHtml;
      if (featuresEl) {
        featuresEl.innerHTML = featuresHtml;
      }
      if (bannerHtml && featuresEl) {
        featuresEl.insertAdjacentHTML("beforebegin", bannerHtml);
      }
      if (licenseSection) {
        if (status.status === "UNLICENSED" || status.status === "EXPIRED") {
          licenseSection.innerHTML = `
          <button class="btn btn-primary" id="activate-license-btn" style="margin-top: var(--space-3);">
            Activate License
          </button>
        `;
          document.getElementById("activate-license-btn")?.addEventListener("click", showLicenseActivationDialog);
        } else if (status.status === "LICENSED" || status.status === "TRIAL") {
          licenseSection.innerHTML = `
          <button class="btn btn-danger" id="deactivate-license-btn" style="margin-top: var(--space-3);">
            Deactivate License
          </button>
        `;
          document.getElementById("deactivate-license-btn")?.addEventListener("click", showLicenseDeactivationDialog);
        }
      }
    } catch (err) {
      statusEl.innerHTML = '<span class="badge badge-slate">UNLICENSED</span>';
      if (featuresEl) {
        featuresEl.innerHTML = `
        <li style="color: var(--text-secondary);">\u2717 Cloud features</li>
        <li style="color: var(--text-secondary);">\u2717 Remote access</li>
        <li>\u2713 Local AI control</li>
        <li>\u2713 Sensor monitoring</li>
        <li>\u2713 Device automation</li>
      `;
      }
    }
  }
  async function showLicenseActivationDialog() {
    let hardwareId = "Loading...";
    let hardwareIdDisplay = "";
    try {
      const hwInfo = await halApi.getHardwareId();
      hardwareId = hwInfo.hardwareIdDisplay;
      hardwareIdDisplay = hwInfo.hardwareId;
    } catch {
      hardwareId = "Unknown";
      hardwareIdDisplay = "unknown";
    }
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
    <div class="modal-panel license-modal">
      <div class="modal-header">
        <h3 class="modal-title">Activate License</h3>
      </div>
      <div class="modal-body">
        <div class="license-hardware-id">
          <p class="settings-label">Hardware ID</p>
          <p class="license-hw-id-display">${hardwareId}</p>
          <p class="settings-hint">This is your device's unique identifier. License is bound to this hardware.</p>
        </div>
        <div class="settings-field" style="margin-top: var(--space-4);">
          <label class="settings-label" for="license-key-input">License Key</label>
          <input
            type="text"
            id="license-key-input"
            class="form-input"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            maxlength="19"
            autocomplete="off"
            spellcheck="false"
          />
          <p class="settings-hint" id="license-error" style="color: var(--color-danger, #F85149); display: none;"></p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="license-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="license-activate-btn" disabled>Activate</button>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    const inputEl = document.getElementById(
      "license-key-input"
    );
    const activateBtn = document.getElementById(
      "license-activate-btn"
    );
    const cancelBtn = document.getElementById(
      "license-cancel-btn"
    );
    const errorEl = document.getElementById(
      "license-error"
    );
    inputEl?.addEventListener("input", () => {
      let value = inputEl.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (value.length > 16) value = value.slice(0, 16);
      const parts = [];
      for (let i = 0; i < value.length; i += 4) {
        parts.push(value.slice(i, i + 4));
      }
      inputEl.value = parts.join("-");
      if (activateBtn) {
        activateBtn.disabled = !/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(
          inputEl.value
        );
      }
    });
    cancelBtn?.addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
    activateBtn?.addEventListener("click", async () => {
      const key = inputEl.value.trim();
      if (!key) return;
      activateBtn.setAttribute("disabled", "");
      activateBtn.textContent = "Activating...";
      errorEl.style.display = "none";
      try {
        const result = await halApi.activateLicense(key);
        if (result.error) {
          errorEl.textContent = result.error;
          errorEl.style.display = "block";
          activateBtn.removeAttribute("disabled");
          activateBtn.textContent = "Activate";
        } else {
          document.body.removeChild(overlay);
          showToast("License activated successfully!", "success", 3e3);
          loadLicenseInfo();
        }
      } catch (err) {
        errorEl.textContent = err.message || "Activation failed. Please try again.";
        errorEl.style.display = "block";
        activateBtn.removeAttribute("disabled");
        activateBtn.textContent = "Activate";
      }
    });
    inputEl?.focus();
  }
  async function showLicenseDeactivationDialog() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
    <div class="modal-panel license-modal">
      <div class="modal-header">
        <h3 class="modal-title">Deactivate License</h3>
      </div>
      <div class="modal-body">
        <p style="color: var(--text-primary); margin: 0 0 var(--space-3) 0;">
          Are you sure you want to deactivate your license? This will:
        </p>
        <ul style="color: var(--text-secondary); margin: 0 0 var(--space-3) 0; padding-left: var(--space-5);">
          <li>Remove the license from this device</li>
          <li>Disable cloud and remote features</li>
          <li>Required to activate on a different device</li>
        </ul>
        <p style="color: var(--text-secondary); font-size: 13px;">
          Your license key can be reused to activate on another device.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="license-cancel-btn">Cancel</button>
        <button class="btn btn-danger" id="license-deactivate-btn">Deactivate</button>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    const deactivateBtn = document.getElementById(
      "license-deactivate-btn"
    );
    const cancelBtn = document.getElementById(
      "license-cancel-btn"
    );
    cancelBtn?.addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
    deactivateBtn?.addEventListener("click", async () => {
      deactivateBtn.setAttribute("disabled", "");
      deactivateBtn.textContent = "Deactivating...";
      try {
        await halApi.deactivateLicense();
        document.body.removeChild(overlay);
        showToast("License deactivated", "success", 3e3);
        loadLicenseInfo();
      } catch (err) {
        showToast(
          "Deactivation failed: " + (err.message || "Unknown error"),
          "danger",
          4e3
        );
        deactivateBtn.removeAttribute("disabled");
        deactivateBtn.textContent = "Deactivate";
      }
    });
  }
  function showFactoryResetConfirmDialog() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
    <div class="modal-panel factory-reset-modal">
      <div class="modal-header">
        <h3 class="modal-title">\u26A0\uFE0F Factory Reset</h3>
      </div>
      <div class="modal-body">
        <p class="reset-warning">This will <strong>permanently delete</strong> all FF_SmartControl data:</p>
        <ul class="reset-list">
          <li>All sensor readings and history</li>
          <li>All device registrations and configuration</li>
          <li>All automation and safety rules</li>
          <li>Your admin password and sessions</li>
          <li>Your .env configuration</li>
        </ul>
        <p class="reset-irreversible">This action <strong>cannot be undone</strong>.</p>
        <div class="reset-confirm-field">
          <label for="reset-confirm-input">Type <strong>FACTORY RESET</strong> to confirm:</label>
          <input type="text" id="reset-confirm-input" class="form-input" placeholder="FACTORY RESET" autocomplete="off">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="reset-cancel-btn">Cancel</button>
        <button class="btn btn-danger" id="reset-confirm-btn" disabled>Reset FF_SmartControl</button>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);
    const confirmInput = document.getElementById(
      "reset-confirm-input"
    );
    const confirmBtn = document.getElementById(
      "reset-confirm-btn"
    );
    const cancelBtn = document.getElementById(
      "reset-cancel-btn"
    );
    confirmInput?.addEventListener("input", () => {
      if (confirmBtn) {
        confirmBtn.disabled = confirmInput.value.trim().toUpperCase() !== "FACTORY RESET";
      }
    });
    cancelBtn?.addEventListener("click", () => {
      document.body.removeChild(overlay);
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
    confirmBtn?.addEventListener("click", async () => {
      if (confirmInput.value.trim().toUpperCase() !== "FACTORY RESET") {
        return;
      }
      confirmBtn.setAttribute("disabled", "");
      confirmBtn.textContent = "Resetting...";
      try {
        const operatorId = sessionStorage.getItem("operatorId") || "admin";
        const response = await fetch(
          "http://127.0.0.1:3392/api/admin/factory-reset",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operatorId })
          }
        );
        if (response.ok) {
          showToast("Factory reset initiated. Restarting...", "success", 3e3);
          document.body.removeChild(overlay);
          setTimeout(() => {
            window.location.href = "/";
          }, 2e3);
        } else {
          const data = await response.json();
          showToast(
            "Reset failed: " + (data.error || "Unknown error"),
            "danger",
            4e3
          );
          confirmBtn.removeAttribute("disabled");
          confirmBtn.textContent = "Reset FF_SmartControl";
        }
      } catch (err) {
        showToast(
          "Reset failed: " + (err.message || "Network error"),
          "danger",
          4e3
        );
        confirmBtn.removeAttribute("disabled");
        confirmBtn.textContent = "Reset FF_SmartControl";
      }
    });
    confirmInput?.focus();
  }
  function escapeHtml16(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function injectSettingsStyles() {
    if (document.getElementById("settings-view-styles")) return;
    const style = document.createElement("style");
    style.id = "settings-view-styles";
    style.textContent = `
.settings-view {
  padding: var(--page-padding);
  max-width: 720px;
  margin: 0 auto;
}
.settings-header {
  margin-bottom: var(--space-lg);
}
.settings-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}
.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.settings-section-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.settings-section-title svg {
  color: var(--accent);
}
.settings-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.settings-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.settings-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.settings-value {
  font-size: 14px;
  color: var(--text-secondary);
}
.settings-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0;
}
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}
.settings-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-2);
}
.settings-footer {
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
}

/* Version Footer (VAL-VERS-001) */
.settings-version-footer {
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: center;
}
.settings-version-text {
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: monospace;
}
.settings-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl);
  color: var(--text-secondary);
}
.settings-feature-list {
  margin: 0;
  padding-left: var(--space-5);
  color: var(--text-secondary);
  font-size: 13px;
}
.settings-feature-list li {
  margin-bottom: var(--space-1);
}

/* Provider grid (same as SetupWizard) */
.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-3);
}
.provider-card {
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}
.provider-card:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-tertiary));
}
.provider-card.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, var(--bg-tertiary));
  box-shadow: 0 0 0 1px var(--accent);
}
.provider-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Danger button */
.btn-danger {
  background: var(--color-danger, #F85149);
  color: #fff;
  border: none;
}
.btn-danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-danger, #F85149) 85%, white);
}
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Factory reset section */
.factory-reset-title svg {
  color: var(--color-danger, #F85149);
}

/* Factory reset modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  max-width: 480px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
}
.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.modal-body {
  padding: var(--space-4);
}
.modal-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--border);
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}
.reset-warning {
  color: var(--text-primary);
  margin: 0 0 var(--space-3) 0;
}
.reset-warning strong {
  color: var(--color-danger, #F85149);
}
.reset-list {
  margin: 0 0 var(--space-3) 0;
  padding-left: var(--space-5);
  color: var(--text-secondary);
  font-size: 13px;
}
.reset-list li {
  margin-bottom: var(--space-1);
}
.reset-irreversible {
  color: var(--color-danger, #F85149);
  font-weight: 600;
  margin: 0 0 var(--space-4) 0;
}
.reset-confirm-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.reset-confirm-field label {
  font-size: 13px;
  color: var(--text-secondary);
}
.reset-confirm-field strong {
  color: var(--text-primary);
  font-family: monospace;
}

/* Network access mode grid */
.access-mode-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
@media (max-width: 640px) {
  .access-mode-grid {
    grid-template-columns: 1fr;
  }
}
.access-mode-card {
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}
.access-mode-card:hover:not(:disabled) {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-tertiary));
}
.access-mode-card.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, var(--bg-tertiary));
  box-shadow: 0 0 0 1px var(--accent);
}
.access-mode-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.access-mode-icon {
  font-size: 24px;
  margin-bottom: var(--space-2);
}
.access-mode-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}
.access-mode-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.3;
}
.settings-warning-banner {
  background: color-mix(in srgb, var(--color-warning, #D29922) 15%, var(--bg-secondary));
  border: 1px solid var(--color-warning, #D29922);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--color-warning, #D29922);
  font-size: 13px;
}
.settings-warning-banner svg {
  flex-shrink: 0;
  margin-top: 2px;
}
.settings-warning-banner span {
  flex: 1;
}

/* License banners */
.license-expired-banner {
  background: color-mix(in srgb, var(--color-danger, #F85149) 15%, var(--bg-secondary));
  border: 1px solid var(--color-danger, #F85149);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  color: var(--text-primary);
  font-size: 14px;
}
.license-expired-banner svg {
  flex-shrink: 0;
  color: var(--color-danger, #F85149);
  margin-top: 2px;
}
.license-expired-banner strong {
  display: block;
  color: var(--color-danger, #F85149);
  font-size: 15px;
  margin-bottom: var(--space-1);
}
.license-expired-banner p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.license-offline-banner {
  background: color-mix(in srgb, var(--color-info, #388BFD) 15%, var(--bg-secondary));
  border: 1px solid var(--color-info, #388BFD);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: 13px;
}
.license-offline-banner svg {
  flex-shrink: 0;
  color: var(--color-info, #388BFD);
}

.settings-hint-error {
  color: var(--color-danger, #F85149);
  font-size: 12px;
}
.badge-green {
  background: var(--color-success, #2EA043);
  color: #fff;
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
}
.badge-blue {
  background: var(--color-info, #388BFD);
  color: #fff;
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
}
.badge-amber {
  background: var(--color-warning, #D29922);
  color: #fff;
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
}
.badge-red {
  background: var(--color-danger, #F85149);
  color: #fff;
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
}

/* Update system styles (VAL-UPDT-001 through VAL-UPDT-012) */
.update-info-card {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-top: var(--space-2);
}
.update-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.update-offline-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13px;
}
.update-offline-banner svg {
  flex-shrink: 0;
  color: var(--text-tertiary);
}
.changelog-details {
  margin-top: var(--space-3);
}
.changelog-summary {
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 13px;
  user-select: none;
  padding: var(--space-2) 0;
}
.changelog-summary:hover {
  color: var(--text-primary);
}
.changelog-content {
  padding: var(--space-3);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  margin-top: var(--space-2);
}
.changelog-content h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--space-2) 0;
}
.changelog-content h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: var(--space-3) 0 var(--space-1) 0;
}
.changelog-content li {
  margin-left: var(--space-4);
  margin-bottom: var(--space-1);
}
.settings-divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: var(--space-4) 0;
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
.btn-ghost:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* License modal */
.license-hardware-id {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  margin-bottom: var(--space-3);
}
.license-hw-id-display {
  font-family: monospace;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: var(--space-1) 0;
  letter-spacing: 0.05em;
}

/* Help & Documentation links (VAL-DOC-009, VAL-DOC-010, VAL-DOC-011) */
.docs-links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-2);
}
.doc-link-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.doc-link-card:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-tertiary));
}
.doc-link-card:hover .doc-link-arrow {
  color: var(--accent);
  transform: translate(2px, -2px);
}
.doc-link-icon {
  font-size: 24px;
  flex-shrink: 0;
  width: 32px;
  text-align: center;
}
.doc-link-content {
  flex: 1;
  min-width: 0;
}
.doc-link-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.doc-link-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.3;
}
.doc-link-arrow {
  flex-shrink: 0;
  color: var(--text-tertiary);
  transition: all var(--transition-fast);
}
`;
    document.head.appendChild(style);
  }
  async function loadUpdateStatus() {
    try {
      const response = await fetch("http://127.0.0.1:3392/api/update/status");
      const data = await response.json();
      const currentVersionEl = document.getElementById("current-version");
      if (currentVersionEl)
        currentVersionEl.textContent = data.currentVersion || "Unknown";
      document.getElementById("update-available-section").style.display = "none";
      document.getElementById("update-offline-section").style.display = "none";
      document.getElementById("update-no-available-section").style.display = "none";
      document.getElementById("update-badge").style.display = "none";
      document.getElementById("rollback-section").style.display = "none";
      if (data.status === "offline") {
        document.getElementById("update-offline-section").style.display = "block";
        const installBtn = document.getElementById(
          "install-update-btn"
        );
        if (installBtn) installBtn.disabled = true;
      } else if (data.status === "available" || data.status === "prerelease") {
        document.getElementById("update-available-section").style.display = "block";
        document.getElementById("update-badge").style.display = "inline";
        const availableVersionEl = document.getElementById("available-version");
        if (availableVersionEl)
          availableVersionEl.textContent = data.availableVersion || "-";
        const changelogEl = document.getElementById("changelog-content");
        if (changelogEl && data.changelog) {
          changelogEl.innerHTML = formatChangelog(data.changelog);
        }
        const badgeEl = document.getElementById("update-version-badge");
        if (badgeEl)
          badgeEl.textContent = data.status === "prerelease" ? "Beta" : "New";
        const installBtn = document.getElementById(
          "install-update-btn"
        );
        if (installBtn) {
          installBtn.disabled = false;
          installBtn.dataset.version = data.availableVersion || "";
          installBtn.dataset.changelog = data.changelog || "";
        }
      } else if (data.status === "none") {
        document.getElementById("update-no-available-section").style.display = "block";
      }
      if (data.canRollback) {
        document.getElementById("rollback-section").style.display = "block";
      }
      if (data.lastChecked) {
        const lastCheckedEl = document.getElementById("last-checked-time");
        if (lastCheckedEl) {
          const date2 = new Date(data.lastChecked);
          lastCheckedEl.textContent = date2.toLocaleString();
          document.getElementById("update-last-checked").style.display = "block";
        }
      }
    } catch {
    }
  }
  function formatChangelog(changelog) {
    if (!changelog) return "";
    return changelog.replace(/^# (.*$)/gim, "<h3>$1</h3>").replace(/^## (.*$)/gim, "<h4>$1</h4>").replace(/^- (.*$)/gim, "<li>$1</li>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>").replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>");
  }
  function showUpdateProgressModal(version) {
    closeUpdateProgressModal();
    const modal = document.createElement("div");
    modal.id = "update-progress-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
    <div class="modal-panel" style="max-width:420px;">
      <div class="modal-header">
        <h2>Installing FF_SmartControl v${escapeHtml16(version)}</h2>
      </div>
      <div class="modal-body">
        <div class="update-progress-steps">
          <div class="progress-step" id="step-backup">
            <div class="step-icon pending">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <span class="step-label">Backing up...</span>
          </div>
          <div class="progress-step" id="step-download">
            <div class="step-icon pending">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <span class="step-label">Downloading...</span>
          </div>
          <div class="progress-step" id="step-verify">
            <div class="step-icon pending">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <span class="step-label">Verifying...</span>
          </div>
          <div class="progress-step" id="step-install">
            <div class="step-icon pending">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <span class="step-label">Installing...</span>
          </div>
          <div class="progress-step" id="step-restart">
            <div class="step-icon pending">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <span class="step-label">Restarting...</span>
          </div>
          <div class="progress-step" id="step-health">
            <div class="step-icon pending">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <span class="step-label">Health check...</span>
          </div>
        </div>
        <div class="progress-bar-container" id="progress-bar-container">
          <div class="progress-bar" id="update-progress-bar" style="width:0%"></div>
        </div>
        <p class="progress-message" id="progress-message">Preparing update...</p>
      </div>
    </div>
  `;
    document.body.appendChild(modal);
    const style = document.createElement("style");
    style.textContent = `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .modal-panel {
      background: var(--bg-secondary, #161B22);
      border-radius: 12px;
      border: 1px solid var(--border, #30363D);
      padding: 24px;
      width: 90%;
      max-width: 480px;
    }
    .modal-header h2 {
      margin: 0 0 20px 0;
      font-size: 18px;
      color: var(--text-primary, #F0F6FC);
    }
    .update-progress-steps {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }
    .progress-step {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .step-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .step-icon.pending svg {
      color: var(--text-tertiary, #484F58);
    }
    .step-icon.active svg {
      color: var(--accent, #388BFD);
      animation: pulse 1s infinite;
    }
    .step-icon.complete svg {
      color: var(--color-success, #2EA043);
    }
    .step-icon.failed svg {
      color: var(--color-danger, #F85149);
    }
    .step-label {
      color: var(--text-secondary, #8B949E);
      font-size: 14px;
    }
    .step-label.active {
      color: var(--text-primary, #F0F6FC);
    }
    .step-label.complete {
      color: var(--color-success, #2EA043);
    }
    .step-label.failed {
      color: var(--color-danger, #F85149);
    }
    .progress-bar-container {
      height: 6px;
      background: var(--bg-tertiary, #21262D);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .progress-bar {
      height: 100%;
      background: var(--accent, #388BFD);
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    .progress-message {
      text-align: center;
      color: var(--text-secondary, #8B949E);
      font-size: 13px;
      margin: 0;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
    document.head.appendChild(style);
  }
  function updateProgressModal(message, percent) {
    const messageEl = document.getElementById("progress-message");
    if (messageEl) messageEl.textContent = message;
    const barEl = document.getElementById("update-progress-bar");
    if (barEl) barEl.style.width = percent >= 0 ? `${percent}%` : "0%";
    const steps = [
      "backup",
      "download",
      "verify",
      "install",
      "restart",
      "health"
    ];
    const stepPercent = percent >= 0 ? percent : 0;
    const completedSteps = Math.floor(stepPercent / (100 / steps.length));
    steps.forEach((step, index) => {
      const stepEl = document.getElementById(`step-${step}`);
      if (!stepEl) return;
      const iconEl = stepEl.querySelector(".step-icon");
      const labelEl = stepEl.querySelector(".step-label");
      if (index < completedSteps) {
        iconEl.className = "step-icon complete";
        iconEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        labelEl.className = "step-label complete";
      } else if (index === completedSteps) {
        iconEl.className = "step-icon active";
        iconEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
        labelEl.className = "step-label active";
      } else {
        iconEl.className = "step-icon pending";
        iconEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
        labelEl.className = "step-label";
      }
    });
    if (percent < 0) {
      steps.forEach((step, index) => {
        if (index >= completedSteps) {
          const stepEl = document.getElementById(`step-${step}`);
          if (!stepEl) return;
          const iconEl = stepEl.querySelector(".step-icon");
          const labelEl = stepEl.querySelector(".step-label");
          iconEl.className = "step-icon failed";
          iconEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
          labelEl.className = "step-label failed";
        }
      });
    }
  }
  function closeUpdateProgressModal() {
    const modal = document.getElementById("update-progress-modal");
    if (modal) modal.remove();
  }
  function showUpdateHistoryModal(history2) {
    const existingModal = document.getElementById("update-history-modal");
    if (existingModal) existingModal.remove();
    const historyRows = history2.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-tertiary);">No update history yet</td></tr>' : history2.map(
      (entry) => `
        <tr>
          <td class="mono">v${escapeHtml16(entry.fromVersion)} \u2192 v${escapeHtml16(entry.toVersion)}</td>
          <td><span class="badge ${entry.status === "success" ? "badge-green" : entry.status === "rolled_back" ? "badge-amber" : "badge-red"}">${entry.status}</span></td>
          <td>${escapeHtml16(entry.triggeredBy)}</td>
          <td>${new Date(entry.startedAt).toLocaleDateString()}</td>
        </tr>
      `
    ).join("");
    const modal = document.createElement("div");
    modal.id = "update-history-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
    <div class="modal-panel" style="max-width:600px;">
      <div class="modal-header">
        <h2>Update History</h2>
        <button class="modal-close" id="close-history-modal" style="background:none;border:none;color:var(--text-primary);cursor:pointer;font-size:20px;padding:4px;">&times;</button>
      </div>
      <div class="modal-body" style="max-height:400px;overflow-y:auto;">
        <table class="settings-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid var(--border);">
              <th style="text-align:left;padding:8px;">Version</th>
              <th style="text-align:left;padding:8px;">Status</th>
              <th style="text-align:left;padding:8px;">Type</th>
              <th style="text-align:left;padding:8px;">Date</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
    document.body.appendChild(modal);
    document.getElementById("close-history-modal")?.addEventListener("click", () => {
      modal.remove();
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  }
  var LLM_PROVIDERS2, COMMON_TIMEZONES2, settingsData, networkData, isSaving;
  var init_Settings = __esm({
    "src/web/hal-ui/views/Settings.ts"() {
      "use strict";
      init_api_provisioning();
      init_api();
      init_Toast();
      LLM_PROVIDERS2 = [
        {
          id: "ollama",
          name: "Ollama (Local)",
          defaultEndpoint: "http://localhost:11434",
          supportsModel: true
        },
        { id: "openai", name: "OpenAI", supportsApiKey: true },
        { id: "anthropic", name: "Anthropic", supportsApiKey: true },
        { id: "zai", name: "ZAI", supportsApiKey: true },
        { id: "minimax", name: "MiniMax", supportsApiKey: true },
        {
          id: "lmstudio",
          name: "LM Studio (Local)",
          defaultEndpoint: "http://localhost:1234",
          supportsModel: true
        }
      ];
      COMMON_TIMEZONES2 = [
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Anchorage",
        "Pacific/Honolulu",
        "America/Toronto",
        "America/Vancouver",
        "America/Mexico_City",
        "America/Bogota",
        "America/Lima",
        "America/Sao_Paulo",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Europe/Rome",
        "Europe/Madrid",
        "Europe/Amsterdam",
        "Europe/Stockholm",
        "Europe/Moscow",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Asia/Hong_Kong",
        "Asia/Singapore",
        "Asia/Seoul",
        "Asia/Mumbai",
        "Asia/Dubai",
        "Australia/Sydney",
        "Australia/Melbourne",
        "Australia/Perth",
        "Pacific/Auckland",
        "Pacific/Fiji"
      ];
      settingsData = {
        farmName: "My Farm",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        llmProvider: "ollama",
        llmEndpoint: "http://localhost:11434",
        llmApiKey: "",
        llmModel: ""
      };
      networkData = {
        accessMode: "localhost",
        httpsEnabled: false,
        lanWithoutHttps: false
      };
      isSaving = false;
    }
  });

  // src/web/hal-ui/main.ts
  var main_exports = {};
  __export(main_exports, {
    refreshHALData: () => refreshHALData
  });
  async function checkNetworkWarning() {
    try {
      const response = await fetch("http://127.0.0.1:3392/api/settings/network");
      if (response.ok) {
        const data = await response.json();
        if (data.lanWithoutHttps) {
          const banner = document.getElementById("lan-warning-banner");
          if (banner) {
            banner.innerHTML = `
            <div class="lan-warning-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Warning: FF_SmartControl is accessible over HTTP on your local network. Enable HTTPS for secure remote access.</span>
              <a href="#settings" class="lan-warning-link">Configure</a>
            </div>
          `;
            injectLanWarningStyles();
          }
        }
      }
    } catch {
    }
  }
  function injectLanWarningStyles() {
    if (document.getElementById("lan-warning-styles")) return;
    const style = document.createElement("style");
    style.id = "lan-warning-styles";
    style.textContent = `
    .lan-warning-banner {
      background: color-mix(in srgb, var(--color-warning, #D29922) 15%, var(--bg-primary));
      border-bottom: 1px solid var(--color-warning, #D29922);
      color: var(--color-warning, #D29922);
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
    }
    .lan-warning-banner svg {
      flex-shrink: 0;
    }
    .lan-warning-banner span {
      flex: 1;
    }
    .lan-warning-link {
      color: var(--color-warning, #D29922);
      text-decoration: underline;
      font-weight: 600;
      white-space: nowrap;
    }
    .lan-warning-link:hover {
      opacity: 0.8;
    }
  `;
    document.head.appendChild(style);
  }
  async function init() {
    const app = document.getElementById("app");
    if (!app) throw new Error("#app element not found");
    injectCardStyles();
    injectToggleStyles();
    injectModalStyles();
    let isUnprovisioned = false;
    try {
      const status = await provisioningApi.getStatus();
      isUnprovisioned = status.isUnprovisioned;
    } catch {
      isUnprovisioned = false;
    }
    if (isUnprovisioned) {
      app.innerHTML = '<div id="view-container"></div>';
      const container = document.getElementById("view-container");
      if (container) {
        await renderSetupWizard(container);
      }
      return;
    }
    const authenticated = await ensureAuthenticated(app);
    if (!authenticated) return;
    const initialView = getInitialView();
    setStore({ activeView: initialView });
    const store = getStore();
    applyTheme(store.theme);
    if (!location.hash) {
      history.replaceState(null, "", `#${initialView}`);
    }
    app.innerHTML = `
    <div class="app-layout" id="app-layout">
      ${renderSidebar(initialView, store.sidebarCollapsed)}
      <div class="app-main">
        <div id="lan-warning-banner"></div>
        <div id="hal-header"></div>
        <main class="main-content" id="view-container"></main>
      </div>
    </div>
  `;
    checkNetworkWarning();
    const headerEl = document.getElementById("hal-header");
    headerEl.innerHTML = renderHeader(store.theme);
    initHeader(
      store.theme,
      handleThemeChange,
      void 0,
      handleLayoutChange,
      handleSettingsClick,
      handleModeChange,
      handleManualTrigger
    );
    initSidebar(handleViewChange);
    window.addEventListener("hashchange", handleHashChange);
    await refreshHALData({ scheduleRender: false });
    await render2();
    startLiveDataStream();
    startPolling();
    startUptimeCounter();
  }
  async function ensureAuthenticated(app) {
    try {
      const response = await fetch("/api/auth/session", {
        credentials: "same-origin"
      });
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) return true;
      }
    } catch {
    }
    renderLogin(app);
    return false;
  }
  function renderLogin(app) {
    injectLoginStyles();
    app.innerHTML = `
    <main class="login-shell">
      <section class="login-panel" aria-labelledby="login-title">
        <div class="login-brand">
          <img src="./ff_logo_svg.svg" alt="FF_SmartControl" />
          <span>FF_SmartControl HAL</span>
        </div>
        <h1 id="login-title">Operator Sign In</h1>
        <form id="hal-login-form" class="login-form">
          <label>
            <span>Username</span>
            <input name="username" value="admin" autocomplete="username" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" autocomplete="current-password" required autofocus />
          </label>
          <button type="submit">Sign In</button>
          <p id="login-error" class="login-error" role="alert"></p>
        </form>
      </section>
    </main>
  `;
    const form = document.getElementById("hal-login-form");
    const errorEl = document.getElementById("login-error");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.textContent = "";
      const data = new FormData(form);
      const submit = form.querySelector(
        'button[type="submit"]'
      );
      if (submit) submit.disabled = true;
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: String(data.get("username") || ""),
            password: String(data.get("password") || "")
          })
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Sign in failed");
        }
        history.replaceState(null, "", "#dashboard");
        await init();
      } catch (err) {
        errorEl.textContent = err.message || "Sign in failed";
        if (submit) submit.disabled = false;
      }
    });
  }
  function injectLoginStyles() {
    if (document.getElementById("hal-login-styles")) return;
    const style = document.createElement("style");
    style.id = "hal-login-styles";
    style.textContent = `
    .login-shell {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        linear-gradient(135deg, rgba(35,134,54,0.18), transparent 38%),
        radial-gradient(circle at 82% 18%, rgba(56,139,253,0.18), transparent 28%),
        var(--bg-primary);
    }
    .login-panel {
      width: min(100%, 380px);
      border: 1px solid color-mix(in srgb, var(--accent-bright) 28%, var(--border));
      border-radius: var(--radius-lg);
      background: var(--bg-secondary);
      box-shadow: var(--shadow-card-lg);
      padding: 24px;
    }
    .login-brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .login-brand img {
      width: 26px;
      height: 26px;
    }
    .login-panel h1 {
      margin: 18px 0 20px;
      color: var(--text-primary);
      font-size: 24px;
      line-height: 1.1;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .login-form label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 700;
    }
    .login-form input {
      height: 40px;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      color: var(--text-primary);
      padding: 0 12px;
      font: inherit;
    }
    .login-form input:focus {
      outline: 2px solid color-mix(in srgb, var(--accent-bright) 50%, transparent);
      border-color: var(--accent-bright);
    }
    .login-form button {
      height: 40px;
      border: 1px solid var(--accent);
      border-radius: var(--radius-md);
      background: var(--accent);
      color: var(--on-accent);
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
    }
    .login-form button:disabled {
      cursor: wait;
      opacity: 0.7;
    }
    .login-error {
      min-height: 18px;
      color: var(--danger);
      font-size: 12px;
      margin: 0;
    }
  `;
    document.head.appendChild(style);
  }
  function handleThemeChange(theme) {
    setStore({ theme });
    applyTheme(theme);
    showToast(`Theme: ${theme}`, "info", 2e3);
  }
  function handleLayoutChange(layout) {
    setStore({ layout });
    showToast(`Layout: ${layout.toUpperCase()}`, "info", 2e3);
    render2();
  }
  function handleModeChange(mode) {
    showToast(`Automation mode: ${mode}`, "info", 2e3);
    refreshHALData();
  }
  function handleManualTrigger() {
    showToast("Decision cycle triggered manually", "info", 2e3);
    setTimeout(() => refreshHALData(), 1e3);
  }
  function handleSettingsClick() {
    const newHash = "#settings";
    if (location.hash !== newHash) {
      history.replaceState(null, "", newHash);
    }
    updateHeaderViewLabel("settings");
    setStore({ activeView: "settings" });
    render2();
  }
  async function handleViewChange(viewId) {
    const newHash = `#${viewId}`;
    if (location.hash !== newHash) {
      history.replaceState(null, "", newHash);
    }
    document.querySelectorAll(".sidebar-item").forEach((item) => {
      item.classList.toggle("active", item.getAttribute("data-view") === viewId);
    });
    updateHeaderViewLabel(viewId);
    setStore({ activeView: viewId });
    await render2();
  }
  function updateHeaderViewLabel(viewId) {
    const labels = {
      dashboard: "Overview",
      devices: "Devices",
      sensors: "Sensors",
      decisions: "Decisions",
      cameras: "Cameras",
      safety: "Safety",
      system: "System",
      terminal: "Terminal",
      calibration: "Calibration",
      settings: "Settings"
    };
    const labelEl = document.getElementById("header-view-label");
    if (labelEl) {
      labelEl.textContent = labels[viewId] || "Overview";
    }
  }
  function handleHashChange() {
    const hash2 = location.hash.slice(1) || "dashboard";
    const validViews = [
      "dashboard",
      "devices",
      "sensors",
      "decisions",
      "cameras",
      "safety",
      "system",
      "terminal",
      "calibration",
      "settings"
    ];
    const viewId = validViews.includes(hash2) ? hash2 : "dashboard";
    document.querySelectorAll(".sidebar-item").forEach((item) => {
      item.classList.toggle("active", item.getAttribute("data-view") === viewId);
    });
    updateHeaderViewLabel(viewId);
    setStore({ activeView: viewId });
    render2();
  }
  function getInitialView() {
    const hash2 = location.hash.slice(1) || "dashboard";
    const validViews = [
      "dashboard",
      "devices",
      "sensors",
      "decisions",
      "cameras",
      "safety",
      "system",
      "terminal",
      "calibration",
      "settings"
    ];
    return validViews.includes(hash2) ? hash2 : "dashboard";
  }
  function escapeHtml17(value) {
    return value.replace(
      /[&<>"']/g,
      (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[ch] || ch
    );
  }
  async function render2() {
    if (renderInProgress) {
      renderAgainRequested = true;
      return;
    }
    const store = getStore();
    const container = document.getElementById("view-container");
    if (!container) return;
    const renderer = views[store.activeView];
    if (renderer) {
      renderInProgress = true;
      try {
        await renderer(container);
      } catch (err) {
        console.error(`Failed to render ${store.activeView}:`, err);
        container.innerHTML = `
        <div class="hal-card" style="padding:16px">
          <div class="text-sm font-semibold">View failed to load</div>
          <div class="text-xs text-secondary">${escapeHtml17(err?.message || "Unknown render error")}</div>
        </div>
      `;
      } finally {
        renderInProgress = false;
        if (renderAgainRequested) {
          renderAgainRequested = false;
          void render2();
        }
      }
    }
  }
  async function refreshHALData(opts = {}) {
    try {
      const [halState, modeData, pendingData] = await Promise.all([
        halApi.getState(),
        halApi.getAutomationMode().catch(() => ({
          mode: "AUTONOMOUS",
          color: { bg: "#F85149", text: "#F0F6FC", label: "AUTO" }
        })),
        halApi.getAutomationPending().catch(() => [])
      ]);
      applyHalState(
        halState,
        {
          automationMode: modeData.mode,
          automationModeColor: modeData.color,
          pendingDecisions: pendingData
        },
        opts.scheduleRender ?? true
      );
    } catch (err) {
      console.error("HAL data refresh failed:", err);
    }
  }
  async function refreshAutomationData() {
    try {
      const [modeData, pendingData] = await Promise.all([
        halApi.getAutomationMode().catch(() => ({
          mode: getStore().automationMode,
          color: getStore().automationModeColor
        })),
        halApi.getAutomationPending().catch(() => getStore().pendingDecisions)
      ]);
      setStore({
        automationMode: modeData.mode,
        automationModeColor: modeData.color,
        pendingDecisions: pendingData
      });
      scheduleLiveRender();
    } catch (err) {
      console.error("HAL automation refresh failed:", err);
    }
  }
  function applyHalState(halState, extra = {}, scheduleRender = true) {
    setStore({
      devices: halState.devices,
      sensors: halState.sensorSnapshots,
      cameras: halState.devices.filter((device) => device.type === "camera"),
      decisions: halState.recentDecisions,
      decisionsToday: countTodayDecisions(halState.recentDecisions),
      ...extra
    });
    if (scheduleRender) scheduleLiveRender();
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
  function startLiveDataStream() {
    liveStateStream?.close();
    liveStateStream = halApi.openStateStream(
      (halState) => {
        liveStreamActive = true;
        applyHalState(halState);
      },
      () => {
        liveStreamActive = false;
      }
    );
  }
  function startPolling() {
    pollInterval = setInterval(() => {
      if (liveStreamActive) {
        void refreshAutomationData();
      } else {
        void refreshHALData();
        if (!liveStateStream || liveStateStream.readyState === EventSource.CLOSED) {
          startLiveDataStream();
        }
      }
    }, 1e4);
  }
  function scheduleLiveRender() {
    const activeView = getStore().activeView;
    if (activeView === "settings" || activeView === "terminal") return;
    if (liveRenderQueued) return;
    const now = Date.now();
    const delay = Math.max(0, 3e3 - (now - lastLiveRenderAt));
    liveRenderQueued = true;
    window.setTimeout(() => {
      liveRenderQueued = false;
      lastLiveRenderAt = Date.now();
      void runLiveRefresh();
    }, delay);
  }
  async function runLiveRefresh() {
    if (liveRefreshInProgress) {
      liveRefreshAgainRequested = true;
      return;
    }
    liveRefreshInProgress = true;
    try {
      await refreshLiveView();
    } finally {
      liveRefreshInProgress = false;
      if (liveRefreshAgainRequested) {
        liveRefreshAgainRequested = false;
        void runLiveRefresh();
      }
    }
  }
  async function refreshLiveView() {
    switch (getStore().activeView) {
      case "dashboard":
        await refreshDashboardLiveData();
        break;
      case "sensors":
        await refreshSensorsLiveData();
        break;
      default:
        break;
    }
  }
  function startUptimeCounter() {
    setInterval(() => {
      const uptime = Math.floor((Date.now() - pageLoadTime) / 1e3);
      setStore({ uptime });
      const uptimeEl = document.querySelector(
        "[data-dashboard-uptime]"
      );
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
  var views, pageLoadTime, pollInterval, liveStateStream, liveStreamActive, liveRenderQueued, lastLiveRenderAt, renderInProgress, renderAgainRequested, liveRefreshInProgress, liveRefreshAgainRequested;
  var init_main = __esm({
    "src/web/hal-ui/main.ts"() {
      init_tokens();
      init_reset();
      init_themes();
      init_Sidebar();
      init_Header();
      init_Card();
      init_Toggle();
      init_Modal();
      init_Toast();
      init_Dashboard();
      init_Devices();
      init_Sensors();
      init_System();
      init_Decisions();
      init_Cameras();
      init_Terminal2();
      init_SetupWizard();
      init_Safety();
      init_Calibration();
      init_Settings();
      init_api();
      init_api_provisioning();
      init_store();
      views = {
        dashboard: renderDashboard,
        devices: renderDevices,
        sensors: renderSensors,
        decisions: renderDecisions,
        cameras: renderCameras,
        safety: renderSafety,
        system: renderSystemView,
        terminal: renderTerminalView,
        calibration: renderCalibration,
        settings: renderSettings
      };
      pageLoadTime = Date.now();
      pollInterval = null;
      liveStateStream = null;
      liveStreamActive = false;
      liveRenderQueued = false;
      lastLiveRenderAt = 0;
      renderInProgress = false;
      renderAgainRequested = false;
      liveRefreshInProgress = false;
      liveRefreshAgainRequested = false;
      document.addEventListener("DOMContentLoaded", init);
    }
  });
  init_main();
})();
//# sourceMappingURL=main.js.map
