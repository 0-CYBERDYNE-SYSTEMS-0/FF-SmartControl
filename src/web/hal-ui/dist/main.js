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
  function formatTimeValue(date, format) {
    if (format === "12h") {
      return date.toLocaleTimeString("en-US", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
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
          <img class="sidebar-logo-img" src="./ff_logo_svg.svg" alt="FarmFriend_Smart_Control logo" />
          <span class="sidebar-brand sidebar-brand-long">FarmFriend_Smart_Control</span>
          <span class="sidebar-brand sidebar-brand-short">FF_Smart_Control</span>
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
    if (!res.ok)
      throw new Error(`HAL API ${path} failed: ${res.status} ${res.statusText}`);
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
      lastSeen: device.lastSeen || device.last_seen || void 0,
      zone: device.zone ?? void 0,
      calibration_offset: device.calibration_offset
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
  var BASE, halApi;
  var init_api = __esm({
    "src/web/hal-ui/api.ts"() {
      "use strict";
      BASE = "/api/hal";
      halApi = {
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
        // PUT /api/hal/devices/:id — update device label and/or zone (VAL-DISC-050, VAL-DISC-052)
        async updateDevice(id, data) {
          return halPut(`/devices/${id}`, data);
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
    return `
    <header class="hal-header">
      <div class="hal-header-left">
        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="hal-header-brand" title="FarmFriend_Smart_Control">
          <img class="hal-header-brand-logo" src="./ff_logo_svg.svg" alt="FarmFriend_Smart_Control logo" />
          <span class="hal-header-brand-text hal-header-brand-text-long">FarmFriend_Smart_Control</span>
          <span class="hal-header-brand-text hal-header-brand-text-short">FF_Smart_Control</span>
        </div>
        <span class="hal-header-view-label" id="header-view-label">${getViewLabel()}</span>
      </div>
      <div class="hal-header-center">
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
      </div>
      <div class="hal-header-right">
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
      terminal: "Terminal"
    };
    return labels[location.hash.slice(1) || "dashboard"] || "Overview";
  }
  function initHeader(theme, onThemeChange, onEstopChange) {
    injectHeaderStyles();
    startClock();
    setupThemeButtons(onThemeChange);
    setupEstopButton(onEstopChange);
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
          const date = new Date(activatedAt);
          bannerTime.textContent = ` since ${date.toLocaleTimeString("en-US", { hour12: false })}`;
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
}
@media (max-width: 767px) {
  .hal-header { padding: 0 var(--space-3); }
  .hal-clock { font-size: 11px; }
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
  var ChartKit_exports = {};
  __export(ChartKit_exports, {
    generateDeviceShades: () => generateDeviceShades,
    injectChartKitStyles: () => injectChartKitStyles,
    monotoneCubicPath: () => monotoneCubicPath,
    renderAreaCard: () => renderAreaCard,
    renderBarCard: () => renderBarCard,
    renderBoxPlot: () => renderBoxPlot,
    renderBulletChart: () => renderBulletChart,
    renderDashboardHeroCard: () => renderDashboardHeroCard,
    renderDashboardOverviewCards: () => renderDashboardOverviewCards,
    renderDecisionBarTrend: () => renderDecisionBarTrend,
    renderDecisionMarkers: () => renderDecisionMarkers,
    renderDualAxisCard: () => renderDualAxisCard,
    renderHeatmap: () => renderHeatmap,
    renderLineCard: () => renderLineCard,
    renderOriginalAreaChart: () => renderOriginalAreaChart,
    renderSparkline: () => renderSparkline,
    renderStackedAreaChart: () => renderStackedAreaChart,
    renderStepChart: () => renderStepChart,
    renderTinyAreaChart: () => renderTinyAreaChart,
    renderTinyBarChart: () => renderTinyBarChart
  });
  function escapeHtml3(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
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
  function renderDualAxisCard(layers, containerId, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (layers.length === 0) {
      container.innerHTML = '<div class="chart-empty">No data</div>';
      return;
    }
    const width = opts.width ?? 900;
    const height = opts.height ?? 320;
    const pad = { top: 24, right: 36, bottom: 36, left: 36 };
    const allTimes = layers.flatMap((l) => l.data.map((d) => d.t));
    const tMin = Math.min(...allTimes);
    const tMax = Math.max(...allTimes);
    const tSpan = Math.max(1, tMax - tMin);
    const tx = (t) => pad.left + (t - tMin) / tSpan * (width - pad.left - pad.right);
    const layerPaths = layers.map((layer) => {
      const axisMin = layer.minAxis;
      const axisMax = layer.maxAxis;
      const vSpan = Math.max(1, axisMax - axisMin);
      const points = layer.data.map((d) => {
        const x = tx(d.t);
        const y = pad.top + (axisMax - d.v) / vSpan * (height - pad.top - pad.bottom);
        return { x, y, v: d.v };
      });
      const lineFn = opts.smooth ? monotoneCubicPath : straightLinePath;
      const line = lineFn(points.map((p) => ({ x: p.x, y: p.y })));
      const area = line ? `${line} L${points[points.length - 1].x.toFixed(1)},${height - pad.bottom} L${points[0].x.toFixed(1)},${height - pad.bottom} Z` : "";
      return { layer, points, line, area, axisMin, axisMax, vSpan };
    });
    let gridLines = "";
    if (opts.showGrid !== false) {
      gridLines = Array.from({ length: 6 }, (_, i) => {
        const y = pad.top + i / 5 * (height - pad.top - pad.bottom);
        return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="chart-grid"/>`;
      }).join("");
    }
    const timeSteps = 6;
    const timeLabels = Array.from({ length: timeSteps + 1 }, (_, i) => {
      const t = tMin + i / timeSteps * tSpan;
      const x = tx(t);
      const label = new Date(t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      return `<text x="${x.toFixed(1)}" y="${height - 8}" class="chart-label" text-anchor="middle">${label}</text>`;
    }).join("");
    const primary = layerPaths[0];
    const leftAxisLabels = Array.from({ length: 6 }, (_, i) => {
      const y = pad.top + i / 5 * (height - pad.top - pad.bottom);
      const v = primary.axisMax - i / 5 * primary.vSpan;
      const prec = primary.layer.label === "CO\u2082" ? 0 : 1;
      const unit = primary.layer.unit || "";
      return `<text x="${pad.left - 6}" y="${y + 4}" class="chart-label" text-anchor="end">${v.toFixed(prec)}${unit}</text>`;
    }).join("");
    let rightAxisLabels = "";
    if (layerPaths.length > 1) {
      const sec = layerPaths[1];
      rightAxisLabels = Array.from({ length: 6 }, (_, i) => {
        const y = pad.top + i / 5 * (height - pad.top - pad.bottom);
        const v = sec.axisMax - i / 5 * sec.vSpan;
        const unit = sec.layer.unit || "";
        return `<text x="${width - pad.right + 6}" y="${y + 4}" class="chart-label" style="fill:${sec.layer.color}">${v.toFixed(1)}${unit}</text>`;
      }).join("");
    }
    const defs = layerPaths.map(
      (lp, i) => `
    <linearGradient id="ck-grad-${containerId}-${i}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${lp.layer.color}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${lp.layer.color}" stop-opacity="0.02"/>
    </linearGradient>
  `
    ).join("");
    const areas = layerPaths.map(
      (lp, i) => lp.area ? `<path d="${lp.area}" fill="url(#ck-grad-${containerId}-${i})" stroke="none"/>` : ""
    ).join("");
    const lines = layerPaths.map(
      (lp) => lp.line ? `<path d="${lp.line}" fill="none" stroke="${lp.layer.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ""
    ).join("");
    const dots = layerPaths.map((lp) => {
      const last = lp.points[lp.points.length - 1];
      return `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4" fill="${lp.layer.color}" stroke="var(--bg-primary)" stroke-width="2"/>`;
    }).join("");
    const svg = `
    <svg class="hero-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <defs>${defs}</defs>
      ${gridLines}${areas}${lines}${dots}${leftAxisLabels}${rightAxisLabels}${timeLabels}
    </svg>
  `;
    const latestValues = layers.map((l) => {
      const last = l.data[l.data.length - 1];
      const prev = l.data[l.data.length - 2];
      const delta = prev ? (last.v - prev.v) / Math.abs(prev.v) * 100 : 0;
      const values = l.data.map((d) => d.v);
      return {
        ...l,
        current: last.v,
        delta,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length
      };
    });
    const primaryMetric = latestValues[0];
    const kpiVal = `${primaryMetric.current.toFixed(1)}${primaryMetric.unit}`;
    const kpiDelta = `${primaryMetric.delta >= 0 ? "\u2191" : "\u2193"} ${Math.abs(primaryMetric.delta).toFixed(1)}%`;
    let statsHtml = "";
    if (opts.showStats !== false) {
      statsHtml = `<div class="ck-stats">` + latestValues.map(
        (l) => `
        <div class="ck-stat-metric">
          <span class="ck-stat-label" style="color:${l.color}">${escapeHtml3(l.label)}</span>
          <span class="ck-stat-current" style="color:${l.color}">${l.current.toFixed(1)}${l.unit}</span>
        </div>
        <div class="ck-stat-row">
          <div class="ck-stat-item"><label>Min</label><strong>${l.min.toFixed(1)}${l.unit}</strong></div>
          <div class="ck-stat-item"><label>Avg</label><strong>${l.avg.toFixed(1)}${l.unit}</strong></div>
          <div class="ck-stat-item"><label>Max</label><strong>${l.max.toFixed(1)}${l.unit}</strong></div>
        </div>
      `
      ).join("") + `</div>`;
    }
    const titleHtml = opts.title ? `<div class="ck-head">
         <div>
           <div class="ck-title">${escapeHtml3(opts.title)}</div>
           ${opts.subtitle ? `<div class="ck-subtitle">${escapeHtml3(opts.subtitle)}</div>` : ""}
           ${opts.deviceName ? `<div class="ck-device">${escapeHtml3(opts.deviceName)}</div>` : ""}
         </div>
         <div class="ck-kpi">
           <div class="ck-kpi-val" style="color:${primaryMetric.color}">${kpiVal}</div>
           <div class="ck-kpi-delta">${kpiDelta}</div>
         </div>
       </div>` : "";
    const footHtml = `<div class="ck-foot">${layers[0].data.length} readings</div>`;
    container.innerHTML = `${titleHtml}<div class="ck-chart">${svg}</div>${statsHtml}${footHtml}`;
  }
  function renderOverviewZoneCard(zone, activeKeys) {
    const metricsByKey = new Map(
      zone.metrics.map((metric) => [metric.key, metric])
    );
    const activeMetrics = overviewMetricOrder.filter((key) => activeKeys.has(key)).map((key) => metricsByKey.get(key)).filter((metric) => Boolean(metric));
    const chartMetrics = activeMetrics.filter((metric) => metric.data.length > 0);
    const titleHtml = activeMetrics.length > 0 ? activeMetrics.map(
      (metric) => `<span style="color:${metric.color}">${escapeHtml3(metric.label)}</span>`
    ).join(' <span style="color:var(--text-secondary)">+ </span>') : '<span style="color:var(--text-secondary)">No active metrics</span>';
    if (chartMetrics.length === 0) {
      return `
      <article class="dhc-card">
        <div class="dhc-head">
          <div>
            <div class="dhc-title">${titleHtml}</div>
            <div class="dhc-subtitle">${escapeHtml3(zone.zoneName)}</div>
          </div>
          <div class="dhc-kpi">
            <div class="dhc-kpi-val" style="color:var(--text-secondary)">--</div>
            <div class="dhc-kpi-delta">No trend</div>
          </div>
        </div>
        <div class="chart-empty">No data for selected metrics</div>
      </article>
    `;
    }
    const w = 566;
    const h = 210;
    const pad = { l: 48, r: 48, t: 24, b: 36 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const times = Array.from(
      new Set(
        chartMetrics.flatMap((metric) => metric.data.map((point) => point.t))
      )
    ).sort((a, b) => a - b);
    const x = (i, len) => len <= 1 ? pad.l + cw / 2 : pad.l + i / (len - 1) * cw;
    const xForTs = new Map(times.map((t, i) => [t, x(i, times.length)]));
    const gradientPrefix = (zone.zoneName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "zone").slice(0, 40);
    const series = chartMetrics.map((metric) => {
      const exact = new Map(metric.data.map((point) => [point.t, point.v]));
      let carry = metric.data[0]?.v ?? 0;
      const values = times.map((t) => {
        const found = exact.get(t);
        if (typeof found === "number") carry = found;
        return carry;
      });
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = Math.max(1e-4, max - min);
      const y = (v) => pad.t + (max - v) / span * ch;
      const path = values.map(
        (value, idx) => `${idx ? "L" : "M"}${x(idx, times.length)},${y(value)}`
      ).join(" ");
      const areaPath = path ? `${path} L${x(times.length - 1, times.length)},${pad.t + ch} L${x(0, times.length)},${pad.t + ch} Z` : "";
      return { metric, values, min, max, span, y, path, areaPath };
    });
    const primary = series[0];
    const primaryGrid = [
      primary.max,
      primary.min + primary.span / 2,
      primary.min
    ];
    const primaryUnit = activeMetrics[0]?.unit || "";
    const gridLines = primaryGrid.map((value, i) => {
      const y = primary.y(value);
      return `
      <line x1="${pad.l - 4}" x2="${pad.l}" y1="${y}" y2="${y}" stroke="var(--text-tertiary)"/>
      <line x1="${pad.l}" x2="${pad.l + cw}" y1="${y}" y2="${y}" stroke="color-mix(in srgb, var(--text-tertiary) 15%, var(--border))"/>
    `;
    }).join("");
    const defs = series.map(
      (entry) => `
    <linearGradient id="${gradientPrefix}-${entry.metric.key}-grad" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${entry.metric.color}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${entry.metric.color}" stop-opacity="0.01"/>
    </linearGradient>
  `
    ).join("");
    const shade = series.map(
      (entry) => entry.areaPath ? `<path d="${entry.areaPath}" fill="url(#${gradientPrefix}-${entry.metric.key}-grad)" style="mix-blend-mode:screen"/>` : ""
    ).join("");
    const lines = series.map(
      (entry, index) => `<path d="${entry.path}" stroke="${entry.metric.color}" fill="none" stroke-width="${index === 0 ? "2.5" : "2"}"/>`
    ).join("");
    const dots = series.map((entry) => {
      const lastTs = times[times.length - 1];
      const lastVal = entry.values[entry.values.length - 1];
      if (lastTs == null || lastVal == null) return "";
      return `<circle cx="${xForTs.get(lastTs)}" cy="${entry.y(lastVal)}" r="4" fill="${entry.metric.color}"/>`;
    }).join("");
    const svg = `
    <svg class="hero-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      <defs>${defs}</defs>
      ${gridLines}
      ${shade}
      ${lines}
      ${dots}
    </svg>
  `;
    const primaryCurrent = primary.values[primary.values.length - 1] ?? 0;
    const primaryPrev = primary.values[primary.values.length - 2] ?? primaryCurrent;
    const delta = primaryPrev ? (primaryCurrent - primaryPrev) / Math.abs(primaryPrev) * 100 : 0;
    const statsHtml = activeMetrics.map((metric) => {
      if (metric.data.length === 0) {
        return `
        <div class="dhc-stats-row">
          <div class="dhc-stats-metric" style="color:${metric.color}">${escapeHtml3(metric.label)}</div>
          <div class="dhc-stats-current" style="color:var(--text-secondary)">No data</div>
        </div>
      `;
      }
      const values = metric.data.map((point) => point.v);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      const current = values[values.length - 1] ?? 0;
      const precision = metric.key === "co2" ? 0 : 1;
      return `
      <div class="dhc-stats-row">
        <div class="dhc-stats-metric" style="color:${metric.color}">${escapeHtml3(metric.label)}</div>
        <div class="dhc-stats-current">${current.toFixed(precision)}${metric.unit}</div>
      </div>
      <div class="dhc-stats-grid">
        <div><div class="dhc-muted">Min</div><strong>${min.toFixed(precision)}${metric.unit}</strong></div>
        <div><div class="dhc-muted">Avg</div><strong>${avg.toFixed(precision)}${metric.unit}</strong></div>
        <div><div class="dhc-muted">Max</div><strong>${max.toFixed(precision)}${metric.unit}</strong></div>
      </div>
    `;
    }).join("");
    return `
    <article class="dhc-card">
      <div class="dhc-head">
        <div>
          <div class="dhc-title">${titleHtml}</div>
          <div class="dhc-subtitle">${escapeHtml3(zone.zoneName)}</div>
        </div>
        <div class="dhc-kpi">
          <div class="dhc-kpi-val" style="color:${primary.metric.color}">${primaryCurrent.toFixed(primary.metric.key === "co2" ? 0 : 1)}${primary.metric.unit}</div>
          <div class="dhc-kpi-delta">${delta >= 0 ? "\u2191" : "\u2193"} ${Math.abs(delta).toFixed(1)}%</div>
        </div>
      </div>
      <div class="dhc-chart">${svg}</div>
      <div class="dhc-stats">${statsHtml}</div>
      <div class="dhc-foot">${times.length} readings \xB7 zone average</div>
    </article>
  `;
  }
  function renderDashboardOverviewCards(zoneCards, containerId, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (zoneCards.length === 0) {
      container.innerHTML = '<div class="chart-empty">No sensor data</div>';
      return;
    }
    const availableKeys = new Set(
      zoneCards.flatMap((zone) => zone.metrics).filter((metric) => metric.data.length > 0).map((metric) => metric.key)
    );
    const activeFromState = opts.activeKeys ?? new Set(overviewMetricOrder);
    const activeKeys = new Set(
      overviewMetricOrder.filter(
        (key) => activeFromState.has(key) && (availableKeys.has(key) || availableKeys.size === 0)
      )
    );
    if (activeKeys.size === 0) {
      const fallback = overviewMetricOrder.find((key) => availableKeys.has(key)) ?? overviewMetricOrder[0];
      activeKeys.add(fallback);
    }
    const metricMeta = new Map(
      zoneCards.flatMap((zone) => zone.metrics).map((metric) => [metric.key, metric])
    );
    const togglesHtml = overviewMetricOrder.map((key) => {
      const meta = metricMeta.get(key);
      const label = meta?.label ?? key.toUpperCase();
      const color = meta?.color ?? "#94A3B8";
      const active = activeKeys.has(key);
      const disabled = !availableKeys.has(key);
      return `<button class="dhc-overview-toggle ${active ? "active" : ""}" ${disabled ? "disabled" : ""} data-metric="${key}" style="--toggle-color:${color}">${escapeHtml3(label)}</button>`;
    }).join("");
    const cardsHtml = zoneCards.map((zone) => renderOverviewZoneCard(zone, activeKeys)).join("");
    container.innerHTML = `
    <div class="dhc-overview-wrap">
      <div class="dhc-overview-toggles">${togglesHtml}</div>
      <div class="dhc-zone-grid">${cardsHtml}</div>
    </div>
  `;
    if (opts.onToggle) {
      container.querySelectorAll(".dhc-overview-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.dataset.metric;
          if (!key) return;
          opts.onToggle(key);
        });
      });
    }
  }
  function renderDashboardHeroCard(metrics2, containerId, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const metricsWithData = metrics2.filter((m) => m.data.length > 0);
    if (metricsWithData.length === 0) {
      container.innerHTML = '<div class="chart-empty">No data for selected zone</div>';
      return;
    }
    const activeKeys = opts.activeKeys ?? new Set(metrics2.map((m) => m.key));
    const normalizedActiveKeys = new Set(
      Array.from(activeKeys).filter(
        (key) => metricsWithData.some((metric) => metric.key === key)
      )
    );
    if (normalizedActiveKeys.size === 0) {
      const fallbackKey = ["temperature", "humidity", "co2"].find(
        (key) => metricsWithData.some((metric) => metric.key === key)
      ) ?? metricsWithData[0]?.key;
      if (fallbackKey) normalizedActiveKeys.add(fallbackKey);
    }
    const activeMetrics = metricsWithData.filter(
      (m) => normalizedActiveKeys.has(m.key)
    );
    const chartMetrics = activeMetrics.filter((m) => m.data.length > 0);
    if (chartMetrics.length === 0) {
      container.innerHTML = '<div class="chart-empty">No data for selected zone</div>';
      return;
    }
    const store = getStore();
    const w = 566;
    const h = 220;
    const pad = { l: 18, r: 16, t: 20, b: 24 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const times = Array.from(
      new Set(chartMetrics.flatMap((m) => m.data.map((d) => d.t)))
    ).sort((a, b) => a - b);
    if (times.length === 0) {
      container.innerHTML = '<div class="chart-empty">No data for selected zone</div>';
      return;
    }
    const xForIndex = (i, len) => len <= 1 ? pad.l + cw / 2 : pad.l + i / (len - 1) * cw;
    const normalizedSeries = chartMetrics.map((metric) => {
      const cfg = metricConfig[metric.key];
      const rawValues = metric.data.map((d) => d.v);
      let axisMin = cfg?.minAxis ?? Math.min(...rawValues);
      let axisMax = cfg?.maxAxis ?? Math.max(...rawValues);
      if (metric.key === "temperature" && store.unitSystem === "imperial") {
        axisMin = axisMin * 9 / 5 + 32;
        axisMax = axisMax * 9 / 5 + 32;
      }
      const vSpan = Math.max(1, axisMax - axisMin);
      const exact = new Map(
        metric.data.map((d) => [
          d.t,
          Math.max(0, Math.min(100, (d.v - axisMin) / vSpan * 100))
        ])
      );
      const firstNorm = exact.size > 0 ? exact.get(metric.data[0].t) ?? 0 : 0;
      let carry = firstNorm;
      const values = times.map((t) => {
        const found = exact.get(t);
        if (typeof found === "number") carry = found;
        return { t, v: carry };
      });
      return { metric, values };
    });
    const stackedByTime = times.map((t, idx) => {
      let total = 0;
      const segments = normalizedSeries.map((series) => {
        const v = series.values[idx]?.v ?? 0;
        const y1 = total;
        total += v;
        return { metric: series.metric, y0: total, y1 };
      });
      return { t, idx, total, segments };
    });
    const maxTotal = Math.max(1, ...stackedByTime.map((s) => s.total));
    const y = (v) => pad.t + (maxTotal - v) / maxTotal * ch;
    const layerPaths = normalizedSeries.map((series, layerIndex) => {
      const topPts = [];
      const botPts = [];
      for (const s of stackedByTime) {
        const seg = s.segments[layerIndex];
        const px = xForIndex(s.idx, times.length);
        topPts.push({ x: px, y: y(seg?.y0 ?? 0) });
        botPts.push({ x: px, y: y(seg?.y1 ?? 0) });
      }
      const topPath = monotoneCubicPath(topPts);
      const topLine = topPts.map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`
      ).join(" ");
      const botLine = botPts.map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`
      ).join(" ");
      const area = topLine ? `${topLine} L${botPts[botPts.length - 1]?.x.toFixed(1)},${botPts[botPts.length - 1]?.y.toFixed(1)} ${botPts.slice().reverse().map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} Z` : "";
      return { series, area, topPath, topPts };
    });
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((step) => {
      const gy = pad.t + step * ch;
      return `<line x1="${pad.l}" x2="${pad.l + cw}" y1="${gy}" y2="${gy}" class="dhc-grid"/>`;
    }).join("");
    const defs = layerPaths.map(
      (lp, i) => `
    <linearGradient id="dhc-lake-grad-${containerId}-${i}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${lp.series.metric.color}" stop-opacity="0.56"/>
      <stop offset="100%" stop-color="${lp.series.metric.color}" stop-opacity="0.08"/>
    </linearGradient>
  `
    ).join("");
    const areas = layerPaths.map(
      (lp, i) => lp.area ? `<path d="${lp.area}" fill="url(#dhc-lake-grad-${containerId}-${i})" stroke="none"/>` : ""
    ).join("");
    const edges = layerPaths.map(
      (lp) => lp.topPath ? `<path d="${lp.topPath}" fill="none" stroke="${lp.series.metric.color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>` : ""
    ).join("");
    const dots = layerPaths.map((lp) => {
      const last = lp.topPts[lp.topPts.length - 1];
      if (!last) return "";
      return `<circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3.8" fill="${lp.series.metric.color}" stroke="var(--bg-primary)" stroke-width="1.4"/>`;
    }).join("");
    const svg = `
    <svg class="hero-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      <defs>${defs}</defs>
      ${gridLines}
      ${areas}
      ${edges}
      ${dots}
    </svg>
  `;
    const statsHtml = activeMetrics.map((m) => {
      if (m.data.length === 0) {
        return `
        <div class="dhc-stats-row">
          <div class="dhc-stats-metric" style="color:${m.color}">${escapeHtml3(m.label)}</div>
          <div class="dhc-stats-current" style="color:var(--text-secondary)">No data</div>
        </div>
      `;
      }
      const values = m.data.map((d) => d.v);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const current = m.data[m.data.length - 1].v;
      return `
      <div class="dhc-stats-row">
        <div class="dhc-stats-metric" style="color:${m.color}">${escapeHtml3(m.label)}</div>
        <div class="dhc-stats-current">${current.toFixed(1)}${m.unit}</div>
      </div>
      <div class="dhc-stats-grid">
        <div><div class="dhc-muted">Min</div><strong>${min.toFixed(1)}${m.unit}</strong></div>
        <div><div class="dhc-muted">Avg</div><strong>${avg.toFixed(1)}${m.unit}</strong></div>
        <div><div class="dhc-muted">Max</div><strong>${max.toFixed(1)}${m.unit}</strong></div>
      </div>
    `;
    }).join("");
    const primaryMetric = chartMetrics[0];
    const primaryCurrent = primaryMetric.data[primaryMetric.data.length - 1].v;
    const primaryPrev = primaryMetric.data[primaryMetric.data.length - 2]?.v ?? primaryCurrent;
    const delta = primaryPrev ? (primaryCurrent - primaryPrev) / Math.abs(primaryPrev) * 100 : 0;
    const titleColors = activeMetrics.map(
      (m) => `<span style="color:${m.color};opacity:${m.data.length ? 1 : 0.5}">${escapeHtml3(m.label)}</span>`
    ).join(' <span style="color:var(--text-secondary)">+</span> ');
    const zoneToggleHtml = opts.zoneToggles ? `<div class="dhc-zone-toggles">
        <button class="dhc-zone-toggle ${opts.zoneToggles.activeZone ? "" : "active"}" data-zone="__all__">All Zones</button>
        ${opts.zoneToggles.zones.map((z) => {
      const isActive = z === opts.zoneToggles.activeZone;
      return `<button class="dhc-zone-toggle ${isActive ? "active" : ""}" data-zone="${escapeAttr(z)}">${escapeHtml3(z)}</button>`;
    }).join("")}
      </div>` : "";
    const overviewHealthHtml = opts.overviewHealth ? `<div class="dhc-overview-health ${opts.overviewHealth.state}">
        <div class="dhc-overview-label">${escapeHtml3(opts.overviewHealth.zoneLabel)}</div>
        <div class="dhc-overview-message">${escapeHtml3(opts.overviewHealth.message)}</div>
      </div>` : "";
    const seenKeys = /* @__PURE__ */ new Set();
    const toggleMetrics = [];
    for (const metric of metrics2) {
      if (seenKeys.has(metric.key)) continue;
      seenKeys.add(metric.key);
      toggleMetrics.push(metric);
    }
    const toggleHtml = toggleMetrics.map((metric) => {
      const isActive = normalizedActiveKeys.has(metric.key);
      return `<button class="dhc-toggle ${isActive ? "active" : ""}" data-metric="${escapeAttr(metric.key)}" style="--toggle-color:${metric.color}">${escapeHtml3(metric.label)}</button>`;
    }).join("");
    container.innerHTML = `
    <div class="dhc-card">
      <div class="dhc-head">
        <div>
          <div class="dhc-title">${titleColors}</div>
          ${opts.subtitle ? `<div class="dhc-subtitle">${escapeHtml3(opts.subtitle)}</div>` : ""}
        </div>
        <div class="dhc-kpi">
          <div class="dhc-kpi-val" style="color:${primaryMetric.color}">${primaryCurrent.toFixed(1)}${primaryMetric.unit}</div>
          <div class="dhc-kpi-delta">${delta >= 0 ? "\u2191" : "\u2193"} ${Math.abs(delta).toFixed(1)}%</div>
        </div>
      </div>
      ${overviewHealthHtml}
      ${zoneToggleHtml}
      <div class="dhc-toggles">${toggleHtml}</div>
      <div class="dhc-chart">${svg}</div>
      <div class="dhc-stats">${statsHtml}</div>
      <div class="dhc-foot">${times.length} samples \xB7 ${escapeHtml3(opts.subtitle || "")}</div>
    </div>
  `;
    if (opts.zoneToggles) {
      container.querySelectorAll(".dhc-zone-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
          const zone = btn.dataset.zone;
          if (!zone) return;
          opts.zoneToggles.onZoneChange(zone === "__all__" ? "" : zone);
        });
      });
    }
    if (opts.onToggle) {
      container.querySelectorAll(".dhc-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.dataset.metric;
          if (key) opts.onToggle(key);
        });
      });
    }
  }
  function straightLinePath(pts) {
    if (pts.length < 2) return "";
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  }
  function renderOriginalAreaChart(data, containerId, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container || data.length < 2) return;
    const color = opts.color ?? "#6DFF9A";
    const W = opts.width ?? (container.clientWidth || 900);
    const H = opts.height ?? 240;
    const p = { t: 24, r: 24, b: 34, l: 54 };
    const vals = data.map((d) => d.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const x = (i) => p.l + i / (vals.length - 1) * (W - p.l - p.r);
    const y = (v) => p.t + (max - v) / span * (H - p.t - p.b);
    const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const area = `${p.l},${H - p.b} ${pts} ${W - p.r},${H - p.b}`;
    const grids = [0, 0.25, 0.5, 0.75, 1].map((s) => {
      const gy = p.t + s * (H - p.t - p.b);
      const lv = (max - s * span).toFixed(1);
      return `<line x1="${p.l}" y1="${gy}" x2="${W - p.r}" y2="${gy}" class="chart-grid"/><text x="${p.l - 8}" y="${gy + 4}" class="chart-label" text-anchor="end">${lv}</text>`;
    }).join("");
    const lx = x(vals.length - 1).toFixed(1);
    const ly = y(vals[vals.length - 1]).toFixed(1);
    const t0 = new Date(data[0].ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    const t1 = new Date(data[data.length - 1].ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    container.innerHTML = `
    <svg class="og-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      ${grids}
      <polygon points="${area}" fill="color-mix(in srgb, ${color} 16%, transparent)"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${lx}" cy="${ly}" r="4" fill="${color}" stroke="var(--bg-primary)" stroke-width="2"/>
      <text x="${p.l}" y="${H - 10}" class="chart-label">${t0}</text>
      <text x="${W - p.r}" y="${H - 10}" class="chart-label" text-anchor="end">${t1}</text>
      <text x="${W - p.r}" y="22" fill="${color}" font-size="18" font-weight="700" font-family="var(--font-mono)" text-anchor="end">${vals[vals.length - 1].toFixed(2)}</text>
    </svg>
  `;
  }
  function renderStackedAreaChart(layers, containerId, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container || layers.length === 0) {
      if (container)
        container.innerHTML = '<div class="chart-empty">No data</div>';
      return;
    }
    const colorGroups = /* @__PURE__ */ new Map();
    for (const layer of layers) {
      const list = colorGroups.get(layer.color) || [];
      list.push(layer);
      colorGroups.set(layer.color, list);
    }
    const shadedLayers = layers.map((layer) => {
      const group = colorGroups.get(layer.color);
      if (group.length <= 1) return layer;
      const idx = group.indexOf(layer);
      const shades = generateDeviceShades(layer.color, group.length);
      return { ...layer, color: shades[idx] };
    });
    const width = opts.width ?? 900;
    const height = opts.height ?? 320;
    const pad = { top: 24, right: 24, bottom: 40, left: 52 };
    const allTimes = shadedLayers.flatMap((l) => l.data.map((d) => d.t));
    const tMin = Math.min(...allTimes);
    const tMax = Math.max(...allTimes);
    const tSpan = Math.max(1, tMax - tMin);
    const tx = (t) => pad.left + (t - tMin) / tSpan * (width - pad.left - pad.right);
    const timeMap = /* @__PURE__ */ new Map();
    for (const layer of shadedLayers) {
      for (const d of layer.data) {
        if (!timeMap.has(d.t)) timeMap.set(d.t, []);
      }
    }
    const times = Array.from(timeMap.keys()).sort((a, b) => a - b);
    const stacked = times.map((t) => {
      const x = tx(t);
      let y0 = 0;
      const segs = [];
      for (const layer of shadedLayers) {
        const pt = layer.data.find((d) => d.t === t);
        const v = pt?.v ?? 0;
        y0 += v;
        segs.push({ x, y0, y1: y0 - v, v });
      }
      return { t, x, segs, total: y0 };
    });
    const maxTotal = Math.max(...stacked.map((s) => s.total), 1);
    const yScale = (v) => pad.top + (maxTotal - v) / maxTotal * (height - pad.top - pad.bottom);
    const layerPaths = shadedLayers.map((layer, li) => {
      const topPts = [];
      const botPts = [];
      for (const st of stacked) {
        const seg = st.segs[li];
        topPts.push({ x: seg.x, y: yScale(seg.y0) });
        botPts.push({ x: seg.x, y: yScale(seg.y1) });
      }
      const topPath = straightLinePath(topPts);
      const botPath = straightLinePath(botPts);
      const area = topPath && botPath ? `${topPath} L${botPts[botPts.length - 1].x.toFixed(1)},${botPts[botPts.length - 1].y.toFixed(1)} ${botPts.slice().reverse().map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} Z` : "";
      return { layer, area, topPath };
    });
    const gridLines = Array.from({ length: 6 }, (_, i) => {
      const y = pad.top + i / 5 * (height - pad.top - pad.bottom);
      const v = maxTotal * (1 - i / 5);
      return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="chart-grid"/><text x="${pad.left - 8}" y="${y + 4}" class="chart-label" text-anchor="end">${v.toFixed(0)}</text>`;
    }).join("");
    const timeLabels = Array.from({ length: 7 }, (_, i) => {
      const t = tMin + i / 6 * tSpan;
      const x = tx(t);
      const label = new Date(t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
      return `<text x="${x.toFixed(1)}" y="${height - 10}" class="chart-label" text-anchor="middle">${label}</text>`;
    }).join("");
    const defs = layerPaths.map(
      (lp, i) => `
    <linearGradient id="stack-grad-${containerId}-${i}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${lp.layer.color}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${lp.layer.color}" stop-opacity="0.08"/>
    </linearGradient>
  `
    ).join("");
    const areas = layerPaths.map(
      (lp, i) => lp.area ? `<path d="${lp.area}" fill="url(#stack-grad-${containerId}-${i})" stroke="none"/>` : ""
    ).join("");
    const lines = layerPaths.map(
      (lp) => lp.topPath ? `<path d="${lp.topPath}" fill="none" stroke="${lp.layer.color}" stroke-width="1.5" stroke-linejoin="round"/>` : ""
    ).join("");
    const svg = `
    <svg class="hero-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <defs>${defs}</defs>
      ${gridLines}${areas}${lines}${timeLabels}
    </svg>
  `;
    const legendHtml = opts.showLegend !== false ? `<div class="stack-legend">${shadedLayers.map(
      (l) => `
        <span class="legend-item" style="--metric-color:${l.color}">
          <span class="legend-dot"></span>${escapeHtml3(l.label)}
        </span>`
    ).join("")}</div>` : "";
    container.innerHTML = `<div class="stack-chart">${svg}</div>${legendHtml}`;
  }
  function renderAreaCard(data, metricKey, containerId, title) {
    const container = document.getElementById(containerId);
    if (!container || data.length < 2) return;
    const store = getStore();
    const cfg = metricConfig[metricKey] || {
      label: metricKey,
      color: "#888",
      unit: "",
      minAxis: 0,
      maxAxis: 100
    };
    const latest = formatSensorValue(
      data[data.length - 1].value,
      metricKey,
      store.unitSystem
    );
    const unit = latest.unit || cfg.unit;
    const w = 340, h = 120;
    const pad = { t: 8, r: 8, b: 20, l: 32 };
    const times = data.map((d) => new Date(d.timestamp).getTime());
    const tMin = Math.min(...times), tMax = Math.max(...times);
    const tSpan = Math.max(1, tMax - tMin);
    const tx = (t) => pad.l + (t - tMin) / tSpan * (w - pad.l - pad.r);
    let axisMin = cfg.minAxis, axisMax = cfg.maxAxis;
    if (metricKey === "temperature" && store.unitSystem === "imperial") {
      axisMin = axisMin * 9 / 5 + 32;
      axisMax = axisMax * 9 / 5 + 32;
    }
    const vSpan = Math.max(1, axisMax - axisMin);
    const points = data.map((d) => {
      const v = formatSensorValue(d.value, metricKey, store.unitSystem).value;
      return {
        x: tx(new Date(d.timestamp).getTime()),
        y: pad.t + (axisMax - v) / vSpan * (h - pad.t - pad.b)
      };
    });
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L${points[points.length - 1].x.toFixed(1)},${h - pad.b} L${points[0].x.toFixed(1)},${h - pad.b} Z`;
    container.innerHTML = `
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml3(title)}</span>
      <span class="viz-card-value text-mono" style="color:${cfg.color}">${latest.value.toFixed(1)}${unit}</span>
    </div>
    <svg viewBox="0 0 ${w} ${h}" class="viz-svg">
      <defs><linearGradient id="area-grad-${metricKey}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${cfg.color}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${cfg.color}" stop-opacity="0.02"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#area-grad-${metricKey})" stroke="none"/>
      <path d="${line}" fill="none" stroke="${cfg.color}" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>
  `;
  }
  function renderLineCard(data, metricKey, containerId, title) {
    const container = document.getElementById(containerId);
    if (!container || data.length < 2) return;
    const store = getStore();
    const cfg = metricConfig[metricKey] || {
      label: metricKey,
      color: "#888",
      unit: "",
      minAxis: 0,
      maxAxis: 100
    };
    const latest = formatSensorValue(
      data[data.length - 1].value,
      metricKey,
      store.unitSystem
    );
    const unit = latest.unit || cfg.unit;
    const w = 340, h = 120;
    const pad = { t: 8, r: 8, b: 20, l: 32 };
    const times = data.map((d) => new Date(d.timestamp).getTime());
    const tMin = Math.min(...times), tMax = Math.max(...times);
    const tSpan = Math.max(1, tMax - tMin);
    const tx = (t) => pad.l + (t - tMin) / tSpan * (w - pad.l - pad.r);
    const axisMin = cfg.minAxis, axisMax = cfg.maxAxis;
    const vSpan = Math.max(1, axisMax - axisMin);
    const pts = data.map((d) => {
      const v = formatSensorValue(d.value, metricKey, store.unitSystem).value;
      return `${tx(new Date(d.timestamp).getTime()).toFixed(1)},${(pad.t + (axisMax - v) / vSpan * (h - pad.t - pad.b)).toFixed(1)}`;
    }).join(" ");
    container.innerHTML = `
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml3(title)}</span>
      <span class="viz-card-value text-mono" style="color:${cfg.color}">${latest.value.toFixed(0)}${unit}</span>
    </div>
    <svg viewBox="0 0 ${w} ${h}" class="viz-svg">
      <polyline points="${pts}" fill="none" stroke="${cfg.color}" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>
  `;
  }
  function renderBarCard(data, metricKey, containerId, title) {
    const container = document.getElementById(containerId);
    if (!container || data.length < 2) return;
    const store = getStore();
    const cfg = metricConfig[metricKey] || {
      label: metricKey,
      color: "#888",
      unit: "",
      minAxis: 0,
      maxAxis: 100
    };
    const latest = formatSensorValue(
      data[data.length - 1].value,
      metricKey,
      store.unitSystem
    );
    const unit = latest.unit || cfg.unit;
    const w = 340, h = 120;
    const pad = { t: 8, r: 8, b: 20, l: 32 };
    const bars = Math.min(data.length, 24);
    const step = (w - pad.l - pad.r) / bars;
    const barW = step * 0.7;
    const axisMin = cfg.minAxis, axisMax = cfg.maxAxis;
    const vSpan = Math.max(1, axisMax - axisMin);
    const rects = data.slice(-bars).map((d, i) => {
      const v = formatSensorValue(d.value, metricKey, store.unitSystem).value;
      const bh = (v - axisMin) / vSpan * (h - pad.t - pad.b);
      const x = pad.l + i * step + (step - barW) / 2;
      const y = h - pad.b - bh;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${cfg.color}" opacity="0.7" rx="2"/>`;
    }).join("");
    container.innerHTML = `
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml3(title)}</span>
      <span class="viz-card-value text-mono" style="color:${cfg.color}">${latest.value.toFixed(0)}${unit}</span>
    </div>
    <svg viewBox="0 0 ${w} ${h}" class="viz-svg">${rects}</svg>
  `;
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
  function renderTinyBarChart(data, color, containerId) {
    const container = document.getElementById(containerId);
    if (!container || data.length < 2) return;
    const w = 200, h = 40;
    const pad = { t: 2, r: 2, b: 2, l: 2 };
    const bars = Math.min(data.length, 20);
    const step = (w - pad.l - pad.r) / bars;
    const barW = step * 0.7;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = Math.max(1e-3, max - min);
    const rects = data.slice(-bars).map((v, i) => {
      const bh = (v - min) / span * (h - pad.t - pad.b);
      const x = pad.l + i * step + (step - barW) / 2;
      const y = h - pad.b - bh;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${color}" opacity="0.7" rx="1"/>`;
    }).join("");
    container.innerHTML = `<svg viewBox="0 0 ${w} ${h}" class="tiny-chart-svg">${rects}</svg>`;
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
  function renderStepChart(data, containerId, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container || data.length < 2) return;
    const color = opts.color ?? "#FACC15";
    const W = opts.width ?? (container.clientWidth || 340);
    const H = opts.height ?? 100;
    const p = { t: 8, r: 8, b: 20, l: 32 };
    const times = data.map((d) => new Date(d.ts).getTime());
    const tMin = Math.min(...times), tMax = Math.max(...times);
    const tSpan = Math.max(1, tMax - tMin);
    const tx = (t) => p.l + (t - tMin) / tSpan * (W - p.l - p.r);
    let path = "";
    for (let i = 0; i < data.length; i++) {
      const x = tx(new Date(data[i].ts).getTime());
      const y = p.t + (1 - data[i].value) * (H - p.t - p.b);
      if (i === 0) {
        path = `M${x.toFixed(1)},${y.toFixed(1)}`;
      } else {
        const prevX = tx(new Date(data[i - 1].ts).getTime());
        const prevY = p.t + (1 - data[i - 1].value) * (H - p.t - p.b);
        path += ` L${x.toFixed(1)},${prevY.toFixed(1)} L${x.toFixed(1)},${y.toFixed(1)}`;
      }
    }
    container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="viz-svg">
      <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
    </svg>
  `;
  }
  function renderBulletChart(metrics2, containerId) {
    const container = document.getElementById(containerId);
    if (!container || metrics2.length === 0) return;
    const W = container.clientWidth || 340;
    const H = metrics2.length * 40 + 20;
    const trackH = 20;
    const pad = { t: 10, r: 16, b: 10, l: 80 };
    const rows = metrics2.map((m, i) => {
      const y = pad.t + i * 40 + 10;
      const pct = (v) => Math.max(0, Math.min(1, (v - m.min) / (m.max - m.min)));
      const curPct = pct(m.current);
      const tgtPct = pct(m.target);
      const barW = W - pad.l - pad.r;
      return `
      <text x="${pad.l - 8}" y="${y + 14}" text-anchor="end" fill="#9CB8AA" font-size="11" font-family="var(--font-mono)">${escapeHtml3(m.label)}</text>
      <rect x="${pad.l}" y="${y}" width="${barW}" height="${trackH}" fill="#182420" rx="3"/>
      <rect x="${pad.l}" y="${y + 4}" width="${curPct * barW}" height="${trackH - 8}" fill="${m.color}" opacity="0.6" rx="2"/>
      <line x1="${pad.l + tgtPct * barW}" y1="${y - 2}" x2="${pad.l + tgtPct * barW}" y2="${y + trackH + 2}" stroke="#F59E0B" stroke-width="3"/>
      <text x="${pad.l + barW + 8}" y="${y + 14}" fill="#E8FFF2" font-size="11" font-family="var(--font-mono)">${m.current.toFixed(1)}${m.unit}</text>
    `;
    }).join("");
    container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="viz-svg">${rows}</svg>`;
  }
  function renderBoxPlot(days, containerId, opts = {}) {
    const container = document.getElementById(containerId);
    if (!container || days.length === 0) return;
    const color = opts.color ?? "#F59E0B";
    const W = opts.width ?? (container.clientWidth || 600);
    const H = opts.height ?? 180;
    const pad = { t: 20, r: 16, b: 40, l: 40 };
    const allValues = days.flatMap((d) => [d.min, d.max]);
    const vMin = Math.min(...allValues);
    const vMax = Math.max(...allValues);
    const vSpan = Math.max(1e-3, vMax - vMin);
    const barW = (W - pad.l - pad.r) / days.length * 0.6;
    const step = (W - pad.l - pad.r) / days.length;
    const vy = (v) => pad.t + (vMax - v) / vSpan * (H - pad.t - pad.b);
    const elements = days.map((d, i) => {
      const cx = pad.l + i * step + step / 2;
      const yMin = vy(d.max);
      const yMax = vy(d.min);
      const yQ1 = vy(d.q3);
      const yQ3 = vy(d.q1);
      const yMed = vy(d.median);
      return `
      <line x1="${cx}" y1="${yMin}" x2="${cx}" y2="${yMax}" stroke="#9CB8AA" stroke-width="1"/>
      <rect x="${cx - barW / 2}" y="${yQ1}" width="${barW}" height="${yQ3 - yQ1}" fill="${color}" opacity="0.55" rx="2"/>
      <line x1="${cx - barW / 2}" y1="${yMed}" x2="${cx + barW / 2}" y2="${yMed}" stroke="#fff" stroke-width="2"/>
      <text x="${cx}" y="${H - 10}" text-anchor="middle" fill="#9CB8AA" font-size="9" font-family="var(--font-mono)">${escapeHtml3(d.day)}</text>
    `;
    }).join("");
    const grids = [0, 0.25, 0.5, 0.75, 1].map((s) => {
      const y = pad.t + s * (H - pad.t - pad.b);
      const v = (vMax - s * vSpan).toFixed(1);
      return `<line x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}" stroke="#182420" stroke-width="1"/><text x="${pad.l - 6}" y="${y + 3}" text-anchor="end" fill="#9CB8AA" font-size="9" font-family="var(--font-mono)">${v}</text>`;
    }).join("");
    container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="viz-svg">${grids}${elements}</svg>`;
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
  function renderDecisionMarkers(decisions, tMin, tMax, tx, yTop, yBottom) {
    if (!decisions.length) return "";
    return decisions.filter((d) => {
      const t = new Date(d.timestamp).getTime();
      return t >= tMin && t <= tMax;
    }).map((d) => {
      const x = tx(new Date(d.timestamp).getTime()).toFixed(1);
      const color = DECISION_COLORS[d.status || "pending"] ?? DECISION_COLORS.pending;
      const opacity = (0.35 + (d.confidence ?? 0.5) * 0.65).toFixed(2);
      const label = escapeAttr(d.decision.slice(0, 60));
      const conf = ((d.confidence ?? 0) * 100).toFixed(0);
      return `<line x1="${x}" y1="${yTop}" x2="${x}" y2="${yBottom}" stroke="${color}" stroke-width="1.5" stroke-dasharray="4 3" opacity="${opacity}"><title>${label} (${conf}%)</title></line><circle cx="${x}" cy="${yTop + 10}" r="4" fill="${color}" stroke="var(--bg-primary)" stroke-width="1.5" opacity="${opacity}"><title>${label}</title></circle>`;
    }).join("");
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
  var metricConfig, DECISION_COLORS, overviewMetricOrder;
  var init_ChartKit = __esm({
    "src/web/hal-ui/components/ChartKit.ts"() {
      "use strict";
      init_store();
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
      DECISION_COLORS = {
        success: "#6DFF9A",
        failure: "#FF5C6C",
        pending: "#FFC857"
      };
      overviewMetricOrder = ["temperature", "humidity", "co2"];
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
              const cfg = metricConfig2[m];
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
  overflow: hidden;
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
  var HERO_METRIC_KEYS, metricConfig2;
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
      metricConfig2 = {
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
    const relays = store.devices.filter(
      (d) => d.type === "relay" || d.type === "smart_plug"
    );
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
        <span class="op-device-name">${escapeHtml4(r.name)}</span>
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
            <span class="op-alert-text">${escapeHtml4(a.text)}</span>
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
      <span class="terminal-source">${escapeHtml5(e.source)}</span>
      <span class="terminal-msg">${escapeHtml5(e.message)}</span>
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
      <span class="calm-device-name">${escapeHtml6(d.name)}</span>
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
      renderDashboardOverviewCards(zoneCards, "dash-hero-card", {
        activeKeys: new Set(dashActiveMetrics),
        onToggle: (key) => {
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
    <div class="dash-brand-chip" title="FarmFriend_Smart_Control">
      <img class="dash-brand-logo" src="./ff_logo_svg.svg" alt="FarmFriend_Smart_Control logo" />
      <span class="dash-brand-text dash-brand-text-long">FarmFriend_Smart_Control</span>
      <span class="dash-brand-text dash-brand-text-short">FF_Smart_Control</span>
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
        <div class="device-mini-name">${escapeHtml6(d.name)}</div>
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
      <div class="decision-trigger text-sm">${escapeHtml6(d.trigger)}</div>
      <div class="decision-text text-sm font-semibold">${escapeHtml6(d.decision)}</div>
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
  var dashActiveMetrics, dashLoadSequence, OVERVIEW_METRIC_KEYS, DASH_METRIC_META;
  var init_Dashboard = __esm({
    "src/web/hal-ui/views/Dashboard.ts"() {
      "use strict";
      init_store();
      init_SystemStatus();
      init_LatestDecision();
      init_KpiStrip();
      init_HeroChart();
      init_ChartKit();
      init_OperatorPanels();
      init_Terminal();
      dashActiveMetrics = /* @__PURE__ */ new Set(["temperature", "humidity", "co2"]);
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
        <div class="dw-device-name">${escapeHtml7(d.label)}</div>
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
      (z) => `<option value="${escapeHtml7(z.name)}">${escapeHtml7(z.name)} (${z.deviceCount})</option>`
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
        <div class="dw-assign-device-name">${escapeHtml7(d.label)}</div>
        <div class="dw-assign-device-meta">${d.protocol} \xB7 ${d.type}</div>
      </div>
      <div class="dw-assign-form">
        <input class="dw-input" type="text"
          id="dw-name-${i}"
          value="${escapeHtml7(d.label || "")}"
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
      <div class="dw-confirm-name">${escapeHtml7(d.label || d.name || d.host)}</div>
      <div class="dw-confirm-meta">
        ${d.zone ? `<span class="dw-zone-tag">${escapeHtml7(d.zone)}</span>` : ""}
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
      (z) => `<option value="${escapeHtml7(z.name)}">${escapeHtml7(z.name)}</option>`
    ).join("");
    return `
    <div class="dw-step-content">
      <p class="dw-step-desc">
        Enter your device details manually. FarmPal will verify connectivity before saving.
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
          validationEl.innerHTML = `<span class="dw-validation-error">${escapeHtml7(err.message)}</span>`;
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
.dw-empty-desc { font-size: 14px; color: var(--text-secondary); }
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
  function escapeHtml7(s) {
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
      (z) => `<option value="${escapeHtml8(z.name)}">${escapeHtml8(z.name)}</option>`
    ).join("");
    container.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Devices</h1>
        <p class="page-subtitle">Manage farm hardware</p>
      </div>
      <button class="hal-btn-primary" id="dw-add-device-btn">
        <span>+ Add Device</span>
      </button>
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
      return `
      <div class="device-card hal-card" data-device-id="${d.id}" style="border-left: 3px solid ${state2 === "online" ? "var(--accent)" : "var(--danger)"}">
        <div class="device-card-header">
          <div class="device-card-icon">${deviceIcon2(d.type)}</div>
          <div class="device-card-title" id="dev-name-${d.id}">${escapeHtml8(d.name)}</div>
          <span class="hal-badge hal-badge-slate">${d.protocol}</span>
          <button class="device-rename-btn" data-device-id="${d.id}" title="Rename device">\u270F\uFE0F</button>
        </div>
        <div class="device-card-meta">
          <span class="text-xs text-secondary">${d.type} \xB7 ${state2}</span>
          ${zone ? `<span class="device-zone-tag">${escapeHtml8(zone)}</span>` : ""}
          ${d.lastSeen ? `<span class="text-xs text-mono text-secondary">${formatRelativeTime(d.lastSeen)}</span>` : ""}
        </div>
        ${d.type === "sensor" ? `<div class="device-chart-wrap" id="${chartId}"></div>` : ""}
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
      return `<option value="${escapeHtml8(z.name)}" ${selected}>${escapeHtml8(z.name)}</option>`;
    }).join("");
    const currentZone = device.zone || "";
    nameEl.innerHTML = `
    <div class="inline-rename-form">
      <input class="dw-input inline-rename-input" type="text" id="rename-input-${deviceId}"
        value="${escapeHtml8(currentName)}" maxlength="64" placeholder="Device name">
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
  function escapeHtml8(s) {
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
            ${sensors.map((s) => `<option value="${s.id}" ${viewState.deviceId === s.id ? "selected" : ""}>${escapeHtml9(s.name)}</option>`).join("")}
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
              <span class="pill-label">${escapeHtml9(m.shortLabel)}</span>
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
  }
  async function loadData(sensors) {
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
    if (heroChart)
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
      renderHeroChart2(zoneLayers, decisions, sequence);
      renderDetailTable(zoneLayers);
      updatePillValues(zoneLayers);
      renderHorizonStrips(zoneLayers);
      renderVizCards(zoneLayers, decisions);
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
        viewState.activeZone = sortedZones[0];
        viewState.zoneSelectionInitialized = true;
      } else if (viewState.activeZone && !sortedZones.includes(viewState.activeZone)) {
        viewState.activeZone = sortedZones[0];
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
        return `<button class="zone-pill ${isActive ? "active" : ""}" data-zone="${escapeAttr2(z)}">${escapeHtml9(z)}</button>`;
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
  function renderHeroChart2(layers, _decisions = [], expectedSequence) {
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
    const stackedLayers = layers.map((l) => {
      const cfg = l.metric;
      let axisMin = cfg.minAxis;
      let axisMax = cfg.maxAxis;
      if (cfg.key === "temperature" && store.unitSystem === "imperial") {
        axisMin = axisMin * 9 / 5 + 32;
        axisMax = axisMax * 9 / 5 + 32;
      }
      const vSpan = Math.max(1, axisMax - axisMin);
      return {
        label: `${escapeHtml9(l.deviceName)} \u2014 ${cfg.label}`,
        color: cfg.color,
        data: l.data.map((d) => ({
          t: new Date(d.timestamp).getTime(),
          v: (formatSensorValue(d.value, cfg.key, store.unitSystem).value - axisMin) / vSpan * 100
        }))
      };
    });
    void Promise.resolve().then(() => (init_ChartKit(), ChartKit_exports)).then((m) => {
      if (expectedSequence !== void 0 && expectedSequence !== loadSequence)
        return;
      m.renderStackedAreaChart(stackedLayers, "hero-chart", { showLegend: true });
    });
    if (legend) {
      const colorGroups = /* @__PURE__ */ new Map();
      for (const l of layers) {
        const list = colorGroups.get(l.metric.color) || [];
        list.push(l);
        colorGroups.set(l.metric.color, list);
      }
      void Promise.resolve().then(() => (init_ChartKit(), ChartKit_exports)).then((m) => {
        if (expectedSequence !== void 0 && expectedSequence !== loadSequence)
          return;
        const shades = /* @__PURE__ */ new Map();
        for (const [color, group] of colorGroups) {
          if (group.length > 1) {
            shades.set(color, m.generateDeviceShades(color, group.length));
          }
        }
        legend.innerHTML = layers.map((l) => {
          const group = colorGroups.get(l.metric.color);
          const idx = group.indexOf(l);
          const shade = group.length > 1 ? shades.get(l.metric.color)[idx] : l.metric.color;
          return `
          <span class="legend-item" style="--metric-color:${shade}">
            <span class="legend-dot"></span>
            ${escapeHtml9(l.deviceName)} \u2014 ${escapeHtml9(l.metric.label)}
          </span>
        `;
        }).join("");
      });
    }
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
      <td>${escapeHtml9(r.device)}</td>
      <td><span class="history-dot"></span>${escapeHtml9(r.metric)}</td>
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
      const converted = formatSensorValue(
        data[data.length - 1].value,
        metric.key,
        store.unitSystem
      );
      const latestLabel = `${converted.value.toFixed(1)}${converted.unit || metric.fallbackUnit}`;
      const values = data.map(
        (d) => formatSensorValue(d.value, metric.key, store.unitSystem).value
      );
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
        <span class="horizon-strip-label">${escapeHtml9(metric.shortLabel)}</span>
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
    if (tempLayers)
      cards.push(renderAreaCard2(tempLayers[0], "Temperature Trend"));
    const humLayers = byMetric.get("humidity");
    if (humLayers) cards.push(renderLineCard2(humLayers[0], "Humidity Trend"));
    const co2Layers = byMetric.get("co2");
    if (co2Layers) cards.push(renderBarCard2(co2Layers[0], "CO\u2082 Levels"));
    const first = allLayers[0];
    if (first) cards.push(renderGaugeCard(first, "Latest Reading"));
    cards.push(renderQualityMatrix(allLayers, decisions));
    grid.innerHTML = cards.join("");
  }
  function renderAreaCard2(layer, title) {
    const { data, metric } = layer;
    const store = getStore();
    const latest = formatSensorValue(
      data[data.length - 1].value,
      metric.key,
      store.unitSystem
    );
    const unit = latest.unit || metric.fallbackUnit;
    const id = `area-${metric.key}-${Math.random().toString(36).slice(2, 7)}`;
    setTimeout(() => {
      void Promise.resolve().then(() => (init_ChartKit(), ChartKit_exports)).then((m) => {
        m.renderAreaCard(data, metric.key, id, title);
      });
    }, 0);
    return `<div class="viz-card" id="${id}">
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml9(title)}</span>
      <span class="viz-card-value text-mono" style="color:${metric.color}">${latest.value.toFixed(1)}${unit}</span>
    </div>
    <div class="viz-chart-placeholder" style="height:100px;"></div>
  </div>`;
  }
  function renderLineCard2(layer, title) {
    const { data, metric } = layer;
    const store = getStore();
    const latest = formatSensorValue(
      data[data.length - 1].value,
      metric.key,
      store.unitSystem
    );
    const unit = latest.unit || metric.fallbackUnit;
    const id = `line-${metric.key}-${Math.random().toString(36).slice(2, 7)}`;
    setTimeout(() => {
      void Promise.resolve().then(() => (init_ChartKit(), ChartKit_exports)).then((m) => {
        m.renderLineCard(data, metric.key, id, title);
      });
    }, 0);
    return `<div class="viz-card" id="${id}">
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml9(title)}</span>
      <span class="viz-card-value text-mono" style="color:${metric.color}">${latest.value.toFixed(0)}${unit}</span>
    </div>
    <div class="viz-chart-placeholder" style="height:100px;"></div>
  </div>`;
  }
  function renderBarCard2(layer, title) {
    const { data, metric } = layer;
    const store = getStore();
    const latest = formatSensorValue(
      data[data.length - 1].value,
      metric.key,
      store.unitSystem
    );
    const unit = latest.unit || metric.fallbackUnit;
    const id = `bar-${metric.key}-${Math.random().toString(36).slice(2, 7)}`;
    setTimeout(() => {
      void Promise.resolve().then(() => (init_ChartKit(), ChartKit_exports)).then((m) => {
        m.renderBarCard(data, metric.key, id, title);
      });
    }, 0);
    return `<div class="viz-card" id="${id}">
    <div class="viz-card-header">
      <span class="viz-card-title">${escapeHtml9(title)}</span>
      <span class="viz-card-value text-mono" style="color:${metric.color}">${latest.value.toFixed(0)}${unit}</span>
    </div>
    <div class="viz-chart-placeholder" style="height:100px;"></div>
  </div>`;
  }
  function renderGaugeCard(layer, title) {
    const { data, metric } = layer;
    const store = getStore();
    const latest = formatSensorValue(
      data[data.length - 1].value,
      metric.key,
      store.unitSystem
    );
    const unit = latest.unit || metric.fallbackUnit;
    const pct = Math.max(
      0,
      Math.min(
        1,
        (latest.value - metric.minAxis) / (metric.maxAxis - metric.minAxis)
      )
    );
    const r = 42, cx = 80, cy = 56;
    const circ = 2 * Math.PI * r;
    const dash = pct * circ;
    return `
    <div class="viz-card">
      <div class="viz-card-header">
        <span class="viz-card-title">${escapeHtml9(title)}</span>
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
      latestMap.set(
        `${l.deviceId}:${l.metric.key}`,
        new Date(last.timestamp).getTime()
      );
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
      return `<th class="qm-th">${escapeHtml9(cfg?.shortLabel || k)}</th>`;
    }).join("");
    const rows = deviceIds.map((deviceId) => {
      const name = deviceMap.get(deviceId) || deviceId;
      const cells = metricKeys.map((metricKey) => {
        const ts = latestMap.get(`${deviceId}:${metricKey}`);
        const ageMs = ts !== void 0 ? now - ts : void 0;
        const color = qualityColor(ageMs);
        const label = qualityLabel(ageMs);
        return `<td class="qm-cell" title="${escapeHtml9(name)} \xB7 ${metricKey} \xB7 ${label}"><span class="qm-dot" style="background:${color}"></span></td>`;
      }).join("");
      return `<tr><td class="qm-device">${escapeHtml9(name.length > 20 ? name.slice(0, 18) + "\u2026" : name)}</td>${cells}</tr>`;
    }).join("");
    const recentDecisionCount = decisions.filter(
      (d) => now - new Date(d.timestamp).getTime() < 36e5
    ).length;
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
      <div class="qm-table-wrap">
        <table class="qm-table">
          <thead><tr><th class="qm-th-device">Device</th>${headerCols}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  }
  function formatValue(value, unit) {
    const precision = Math.abs(value) >= 100 ? 0 : value % 1 === 0 ? 0 : 1;
    return `${value.toFixed(precision)}${unit}`;
  }
  function escapeHtml9(s) {
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
        zoneSelectionInitialized: false,
        decisions: []
      };
      loadSequence = 0;
    }
  });

  // src/web/hal-ui/views/Decisions.ts
  async function renderDecisions(container) {
    const store = getStore();
    const filtered = statusFilter === "all" ? store.decisions : store.decisions.filter((d) => (d.status || "pending") === statusFilter);
    container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Decisions</h1>
      <p class="page-subtitle">HAL autonomous decision log</p>
    </div>

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
    renderDecisionsHeatmap(store.decisions);
    renderDecisionsBarTrend(store.decisions);
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
          <span class="decision-trigger-text text-sm">${escapeHtml10(d.trigger)}</span>
        </div>
        <div class="decision-right">
          <span class="decision-confidence text-mono text-xs" style="color:${confidenceColor3(d.confidence)}">${(d.confidence * 100).toFixed(0)}%</span>
          <button class="decision-expand-btn" aria-label="Toggle metadata">${expandedDecisionIds.has(d.id) ? "v" : ">"}</button>
        </div>
      </div>
      <div class="decision-detail" ${expandedDecisionIds.has(d.id) ? "" : "hidden"}>
        <div class="decision-detail-row">
          <span class="decision-detail-label">Decision</span>
          <span class="decision-detail-value font-semibold">${escapeHtml10(d.decision)}</span>
        </div>
        ${d.outcome ? `
        <div class="decision-detail-row">
          <span class="decision-detail-label">Outcome</span>
          <span class="decision-detail-value">${escapeHtml10(d.outcome)}</span>
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
  function escapeHtml10(s) {
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
`;
    document.head.appendChild(style);
  }
  var expandedDecisionIds, statusFilter;
  var init_Decisions = __esm({
    "src/web/hal-ui/views/Decisions.ts"() {
      "use strict";
      init_store();
      init_ChartKit();
      expandedDecisionIds = /* @__PURE__ */ new Set();
      statusFilter = "all";
    }
  });

  // src/web/hal-ui/views/Cameras.ts
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
        el.textContent = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit"
        });
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
        ${demoImg ? `<img src="${demoImg}" alt="${escapeHtml11(c.name)}" class="camera-img" />` : `
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
        <div class="camera-name">${escapeHtml11(c.name)}</div>
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
                  <span class="text-mono text-xs">${escapeHtml11(result.path)}</span>
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
  function escapeHtml11(s) {
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
        "Could not connect to FarmPal. Please refresh."
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
            <img src="./ff_logo_svg.svg" alt="FarmPal" />
          </div>
          <h1 class="wizard-title">Welcome to FarmPal</h1>
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
      <p class="step-desc">This password protects your FarmPal settings. Keep it safe \u2014 it cannot be recovered.</p>

      <div class="form-group">
        <label class="form-label" for="password">Admin Password</label>
        <div class="input-wrapper">
          <input
            type="password"
            id="password"
            class="form-input"
            placeholder="Minimum 8 characters"
            value="${escapeHtml12(wizardData.adminPassword)}"
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
          value="${escapeHtml12(wizardData.farmName)}"
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
      <p class="step-desc">FarmPal uses this timezone for scheduling and decision logs.</p>

      <div class="form-group">
        <label class="form-label" for="timezone">Timezone</label>
        <select id="timezone" class="form-select">
          ${regionOptions}
        </select>
        <div class="form-hint">Detected: <strong id="detected-timezone">${escapeHtml12(currentTz)}</strong></div>
      </div>
    </div>
  `;
  }
  function renderWifiStep() {
    return `
    <div class="wizard-step-content">
      <h2 class="step-title">WiFi Connection</h2>
      <p class="step-desc">Connect FarmPal to your network. Ethernet is recommended if available.</p>

      <div class="form-group">
        <label class="form-label" for="wifi-ssid">Network (SSID)</label>
        <input
          type="text"
          id="wifi-ssid"
          class="form-input"
          placeholder="Enter network name or select below"
          value="${escapeHtml12(wizardData.wifiSsid)}"
          maxlength="32"
          autocomplete="off"
          list="wifi-networks-list"
        />
        <datalist id="wifi-networks-list">
          ${wifiNetworks.map((n) => `<option value="${escapeHtml12(n.ssid)}">`).join("")}
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
      <p class="step-desc">Choose how FarmPal connects to its AI brain. Local options run entirely on your network.</p>

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
          value="${escapeHtml12(wizardData.llmEndpoint)}"
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
            value="${escapeHtml12(wizardData.llmApiKey)}"
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
          value="${escapeHtml12(wizardData.llmModel)}"
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
      <p class="step-desc">Connect Telegram to receive alerts and control FarmPal from your phone.</p>

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
            value="${escapeHtml12(wizardData.telegramBotToken)}"
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
        <p>${escapeHtml12(message)}</p>
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
        <div class="step-error">${escapeHtml12(message)}</div>
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
  function escapeHtml12(str) {
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
  `;
    setupSafetyEventListeners();
    await loadSafetySummary();
    await loadSafetyRules();
    await loadRecentDenials();
    await loadDevicesForFilter();
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
  async function loadDevicesForFilter() {
    const store = getStore();
    const selectEl = document.getElementById(
      "rule-device-filter"
    );
    if (!selectEl) return;
    const devices = store.devices.filter(
      (d) => d.type === "relay" || d.type === "smart_plug"
    );
    const options = devices.map((d) => `<option value="${d.id}">${escapeHtml13(d.name)}</option>`).join("");
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
        <div class="rule-device">${escapeHtml13(deviceName)}</div>
        <div class="rule-type-badge">${ruleLabel}</div>
      </div>
      <div class="rule-config">${escapeHtml13(configDisplay)}</div>
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
      `<p>Are you sure you want to delete this safety rule for <strong>${escapeHtml13(deviceName)}</strong>?</p>
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
    const deviceOptions = devices.map((d) => `<option value="${d.id}">${escapeHtml13(d.name)}</option>`).join("");
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
        const sensorOptions = sensorDevices.map((d) => `<option value="${d.id}">${escapeHtml13(d.name)}</option>`).join("");
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
      `Edit Safety Rule: ${escapeHtml13(deviceName)}`,
      `
    <form id="edit-rule-form" class="add-rule-form">
      <div class="form-group">
        <label>Device</label>
        <div class="form-static">${escapeHtml13(deviceName)}</div>
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
          (d) => `<option value="${d.id}" ${d.id === ruleConfig.triggerDeviceId ? "selected" : ""}>${escapeHtml13(d.name)}</option>`
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
        return `<p class="text-secondary text-sm">Unknown rule type: ${escapeHtml13(ruleType)}</p>`;
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
  function formatRelativeTime2(isoString) {
    try {
      const date = new Date(isoString);
      const now = /* @__PURE__ */ new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 6e4);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return isoString;
    }
  }
  function escapeHtml13(text) {
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
`;
    document.head.appendChild(style);
  }
  var RULE_TYPE_LABELS, RULE_TYPE_DESCRIPTIONS;
  var init_Safety = __esm({
    "src/web/hal-ui/views/Safety.ts"() {
      "use strict";
      init_store();
      init_api();
      init_Modal();
      init_Toast();
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
    }
  });

  // src/web/hal-ui/main.ts
  var main_exports = {};
  __export(main_exports, {
    refreshHALData: () => refreshHALData
  });
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
    const store = getStore();
    applyTheme(store.theme);
    app.innerHTML = `
    <div class="app-layout" id="app-layout">
      ${renderSidebar(store.activeView, store.sidebarCollapsed)}
      <div class="app-main">
        <div id="hal-header"></div>
        <main class="main-content" id="view-container"></main>
      </div>
    </div>
  `;
    const headerEl = document.getElementById("hal-header");
    headerEl.innerHTML = renderHeader(store.theme);
    initHeader(store.theme, handleThemeChange);
    initSidebar(handleViewChange);
    await refreshHALData();
    await render2();
    startPolling();
    startUptimeCounter();
  }
  function handleThemeChange(theme) {
    setStore({ theme });
    applyTheme(theme);
    showToast(`Theme: ${theme}`, "info", 2e3);
  }
  async function handleViewChange(viewId) {
    setStore({ activeView: viewId });
    await render2();
  }
  async function render2() {
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
  function startPolling() {
    pollInterval = setInterval(refreshHALData, 1e4);
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
  var views, pageLoadTime, pollInterval;
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
      init_Decisions();
      init_Cameras();
      init_Terminal2();
      init_SetupWizard();
      init_Safety();
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
        system: renderDashboard,
        terminal: renderTerminalView
      };
      pageLoadTime = Date.now();
      pollInterval = null;
      document.addEventListener("DOMContentLoaded", init);
    }
  });
  init_main();
})();
//# sourceMappingURL=main.js.map
