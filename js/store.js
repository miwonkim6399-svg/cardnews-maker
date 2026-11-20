/* ==========================================================
   상태 관리 + 브라우저 자동 저장 (localStorage)
   ========================================================== */
(function () {
  const PROJECT_KEY = "cardnews:project:v1";
  const SETTINGS_KEY = "cardnews:settings:v1";

  const TONES = [
    { id: "friendly", name: "친근한" },
    { id: "pro", name: "전문적인" },
    { id: "fun", name: "유머러스한" },
    { id: "emotional", name: "감성적인" },
    { id: "concise", name: "간결한" },
  ];

  const DESIGNS = [
    { id: "bold", name: "볼드탑" },
    { id: "edit", name: "에디토리얼" },
    { id: "soft", name: "소프트모던" },
  ];

  const RATIOS = {
    "1:1": { w: 1080, h: 1080, cls: "r-11" },
    "4:5": { w: 1080, h: 1350, cls: "r-45" },
    "3:4": { w: 1080, h: 1440, cls: "r-34" },
    "9:16": { w: 1080, h: 1920, cls: "r-916" },
  };

  const ACCENTS = ["#ff5a36", "#ffcc00", "#2f6bff", "#12b886", "#7c4dff", "#ff4f9a", "#111111"];

  function defaultProject() {
    return {
      topic: "",
      tone: "friendly",
      count: 7,
      mode: "template",
      design: "bold",
      ratio: "4:5",
      account: "@my_account",
      accent: "#ff5a36",
      cards: [],
      caption: "",
      active: 0,
      updatedAt: null,
    };
  }

  function defaultSettings() {
    return { apiKey: "", igToken: "", igUserId: "", imgbbKey: "", graphVersion: "v22.0" };
  }

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* 무시 */ }
  }

  function loadProject() {
    const raw = safeGet(PROJECT_KEY);
    const base = defaultProject();
    if (!raw) return base;
    try {
      const saved = JSON.parse(raw);
      const merged = Object.assign(base, saved);
      if (!RATIOS[merged.ratio]) merged.ratio = "4:5";
      if (!Array.isArray(merged.cards)) merged.cards = [];
      merged.active = Math.min(Math.max(0, merged.active | 0), Math.max(0, merged.cards.length - 1));
      return merged;
    } catch (e) {
      return base;
    }
  }

  function loadSettings() {
    const raw = safeGet(SETTINGS_KEY);
    const base = defaultSettings();
    if (!raw) return base;
    try { return Object.assign(base, JSON.parse(raw)); } catch (e) { return base; }
  }

  const listeners = new Set();
  let saveTimer = null;

  const Store = {
    TONES, DESIGNS, RATIOS, ACCENTS,
    state: loadProject(),
    settings: loadSettings(),
    defaultProject,

    onSaveStatus(fn) { listeners.add(fn); },

    /** 변경 후 호출 — 0.5초 뒤 저장 */
    save() {
      listeners.forEach((fn) => fn("saving"));
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        Store.state.updatedAt = new Date().toISOString();
        const ok = safeSet(PROJECT_KEY, JSON.stringify(Store.state));
        listeners.forEach((fn) => fn(ok ? "saved" : "error", Store.state.updatedAt));
      }, 500);
    },

    saveSettings(next) {
      Store.settings = Object.assign(defaultSettings(), next);
      safeSet(SETTINGS_KEY, JSON.stringify(Store.settings));
    },

    clearSettings() {
      Store.settings = defaultSettings();
      safeRemove(SETTINGS_KEY);
    },

    reset() {
      const keep = { account: Store.state.account, accent: Store.state.accent, design: Store.state.design, ratio: Store.state.ratio };
      Store.state = Object.assign(defaultProject(), keep);
      Store.save();
    },
  };

  window.Store = Store;
})();
