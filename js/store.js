/* ==========================================================
   상태 관리 + 브라우저 자동 저장
   - 작업 중인 카드뉴스 · 내 보관함 · 저장 폴더 연결: IndexedDB (사진이 들어가도 넉넉함)
   - API 키 같은 설정: localStorage
   ========================================================== */
(function () {
  const OLD_PROJECT_KEY = "cardnews:project:v1";
  const SETTINGS_KEY = "cardnews:settings:v1";
  const DEFAULT_ACCOUNT = "@buccaneerscholar";

  const TONES = [
    { id: "friendly", name: "친근한" },
    { id: "pro", name: "전문적인" },
    { id: "emotional", name: "감성적인" },
    { id: "concise", name: "간결한" },
    { id: "fun", name: "유머러스한" },
  ];

  /* 디자인: elegant = 고상한 신규 디자인 */
  const DESIGNS = [
    { id: "classic", name: "클래식", desc: "아이보리 · 금빛 괘선" },
    { id: "garden", name: "가든", desc: "세이지 · 아치 프레임" },
    { id: "linen", name: "린넨", desc: "스티치 테두리" },
    { id: "journal", name: "트래블 저널", desc: "엽서 · 우표" },
    { id: "book", name: "북 노트", desc: "책 페이지 · 인용" },
    { id: "estate", name: "프라퍼티", desc: "네이비 · 리포트" },
    { id: "photo", name: "포토", desc: "사진 전면 배경" },
    { id: "edit", name: "에디토리얼", desc: "매거진 세리프" },
    { id: "soft", name: "소프트모던", desc: "파스텔 시트" },
    { id: "bold", name: "볼드탑", desc: "강렬한 제목" },
  ];

  const RATIOS = {
    "1:1": { w: 1080, h: 1080, cls: "r-11" },
    "4:5": { w: 1080, h: 1350, cls: "r-45" },
    "3:4": { w: 1080, h: 1440, cls: "r-34" },
    "9:16": { w: 1080, h: 1920, cls: "r-916" },
  };

  /* 고상한 팔레트 */
  const ACCENTS = [
    { c: "#3f5a4a", n: "포레스트" },
    { c: "#7d8f69", n: "세이지" },
    { c: "#b8933f", n: "앤틱 골드" },
    { c: "#b0665a", n: "테라코타" },
    { c: "#b9868a", n: "더스티 로즈" },
    { c: "#7b2e3a", n: "버건디" },
    { c: "#2e3f5c", n: "네이비" },
    { c: "#3d6b7d", n: "딥 틸" },
    { c: "#8e7fa8", n: "라벤더" },
    { c: "#ff5a36", n: "코랄 (선명)" },
    { c: "#2f6bff", n: "블루 (선명)" },
  ];

  const FONTS = [
    { id: "", name: "디자인 기본" },
    { id: "serif", name: "명조 (Noto Serif)", css: '"Noto Serif KR", serif' },
    { id: "batang", name: "고운바탕", css: '"Gowun Batang", serif' },
    { id: "myeongjo", name: "나눔명조", css: '"Nanum Myeongjo", serif' },
    { id: "sans", name: "고딕 (Pretendard)", css: '"Pretendard Variable", Pretendard, sans-serif' },
    { id: "dodum", name: "고운돋움", css: '"Gowun Dodum", sans-serif' },
    { id: "hand", name: "손글씨 (나눔펜)", css: '"Nanum Pen Script", cursive' },
  ];

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function defaultProject() {
    return {
      id: uid(),
      topic: "",
      category: "general",
      tone: "friendly",
      count: 7,
      mode: "template",
      design: "classic",
      ratio: "4:5",
      account: DEFAULT_ACCOUNT,
      accent: "#3f5a4a",
      titleFont: "",
      align: "auto",       // auto = 디자인 기본 정렬
      avatar: "",          // 프로필(로고) 이미지 dataURL
      imageDim: 35,        // 배경 사진 어둡게 (%)
      cards: [],
      caption: "",
      active: 0,
      updatedAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  function defaultSettings() {
    return { apiKey: "", igToken: "", igUserId: "", imgbbKey: "", graphVersion: "v22.0" };
  }

  /* ---------- 작은 IndexedDB 키-값 저장소 ---------- */
  const kv = (() => {
    let dbp = null;
    function db() {
      if (!dbp) {
        dbp = new Promise((resolve, reject) => {
          if (!("indexedDB" in window)) return reject(new Error("no idb"));
          const req = indexedDB.open("cardnews-maker", 1);
          req.onupgradeneeded = () => req.result.createObjectStore("kv");
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }
      return dbp;
    }
    function tx(mode, fn) {
      return db().then((d) => new Promise((resolve, reject) => {
        const t = d.transaction("kv", mode);
        const r = fn(t.objectStore("kv"));
        t.oncomplete = () => resolve(r && r.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }));
    }
    return {
      get: (k) => tx("readonly", (s) => s.get(k)),
      set: (k, v) => tx("readwrite", (s) => s.put(v, k)),
      del: (k) => tx("readwrite", (s) => s.delete(k)),
    };
  })();

  function safeLocal(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  function normalize(p) {
    const base = defaultProject();
    const merged = Object.assign(base, p || {});
    if (!RATIOS[merged.ratio]) merged.ratio = "4:5";
    if (!DESIGNS.some((d) => d.id === merged.design)) merged.design = "classic";
    if (!Array.isArray(merged.cards)) merged.cards = [];
    merged.cards = merged.cards.map((c) => Object.assign({ label: "", title: "", body: "", accent: "", image: "" }, c));
    merged.active = Math.min(Math.max(0, merged.active | 0), Math.max(0, merged.cards.length - 1));
    if (!merged.account || merged.account === "@my_account") merged.account = DEFAULT_ACCOUNT;
    return merged;
  }

  function loadSettings() {
    const raw = safeLocal(() => localStorage.getItem(SETTINGS_KEY), null);
    const base = defaultSettings();
    if (!raw) return base;
    try { return Object.assign(base, JSON.parse(raw)); } catch (e) { return base; }
  }

  const listeners = new Set();
  let saveTimer = null;
  let useLocalFallback = false;

  /* ---------- 되돌리기 / 다시하기 ---------- */
  const history = { past: [], future: [], last: null, timer: null };
  function snapshot() {
    return JSON.stringify(Store.state);
  }

  const Store = {
    TONES, DESIGNS, RATIOS, ACCENTS, FONTS, DEFAULT_ACCOUNT,
    state: defaultProject(),
    settings: loadSettings(),
    library: [],            // [{id, topic, category, design, updatedAt, thumb}]
    defaultProject,
    normalize,
    kv,
    uid,

    async init() {
      let p = null;
      try {
        p = await kv.get("current");
        Store.library = (await kv.get("library-index")) || [];
      } catch (e) {
        useLocalFallback = true;
      }
      if (!p) {
        const old = safeLocal(() => localStorage.getItem(OLD_PROJECT_KEY), null);
        if (old) { try { p = JSON.parse(old); } catch (e) { p = null; } }
      }
      Store.state = normalize(p);
      history.last = snapshot();
      return Store.state;
    },

    onSaveStatus(fn) { listeners.add(fn); },

    /** 변경 후 호출 — 0.5초 뒤 저장, 되돌리기 기록 */
    save(opts) {
      listeners.forEach((fn) => fn("saving"));
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        Store.state.updatedAt = new Date().toISOString();
        let ok = true;
        try {
          if (useLocalFallback) localStorage.setItem(OLD_PROJECT_KEY, JSON.stringify(Store.state));
          else await kv.set("current", Store.state);
        } catch (e) { ok = false; }
        listeners.forEach((fn) => fn(ok ? "saved" : "error", Store.state.updatedAt));
      }, 500);
      if (!(opts && opts.noHistory)) {
        clearTimeout(history.timer);
        history.timer = setTimeout(() => {
          const now = snapshot();
          if (now === history.last) return;
          history.past.push(history.last);
          if (history.past.length > 40) history.past.shift();
          history.future = [];
          history.last = now;
        }, 600);
      }
    },

    canUndo: () => history.past.length > 0,
    canRedo: () => history.future.length > 0,
    undo() {
      if (!history.past.length) return false;
      clearTimeout(history.timer);
      history.future.push(snapshot());
      history.last = history.past.pop();
      Store.state = normalize(JSON.parse(history.last));
      Store.save({ noHistory: true });
      return true;
    },
    redo() {
      if (!history.future.length) return false;
      clearTimeout(history.timer);
      history.past.push(snapshot());
      history.last = history.future.pop();
      Store.state = normalize(JSON.parse(history.last));
      Store.save({ noHistory: true });
      return true;
    },
    resetHistory() {
      history.past = []; history.future = []; history.last = snapshot();
    },

    /* ---------- 내 보관함 ---------- */
    async saveToLibrary(thumb) {
      const s = Store.state;
      await kv.set("project:" + s.id, JSON.parse(JSON.stringify(s)));
      const entry = {
        id: s.id, topic: s.topic || "제목 없음", category: s.category, design: s.design,
        count: s.cards.length, updatedAt: new Date().toISOString(), thumb: thumb || "",
      };
      Store.library = [entry].concat(Store.library.filter((x) => x.id !== s.id));
      await kv.set("library-index", Store.library);
    },
    async openFromLibrary(id) {
      const p = await kv.get("project:" + id);
      if (!p) throw new Error("보관함에서 찾을 수 없어요.");
      Store.state = normalize(p);
      Store.resetHistory();
      Store.save({ noHistory: true });
    },
    async duplicateInLibrary(id) {
      const p = await kv.get("project:" + id);
      if (!p) return;
      const copy = normalize(Object.assign({}, p, { id: uid(), topic: (p.topic || "제목 없음") + " (복사본)" }));
      await kv.set("project:" + copy.id, copy);
      const src = Store.library.find((x) => x.id === id) || {};
      Store.library = [Object.assign({}, src, { id: copy.id, topic: copy.topic, updatedAt: new Date().toISOString() })].concat(Store.library);
      await kv.set("library-index", Store.library);
    },
    async deleteFromLibrary(id) {
      await kv.del("project:" + id);
      Store.library = Store.library.filter((x) => x.id !== id);
      await kv.set("library-index", Store.library);
    },

    saveSettings(next) {
      Store.settings = Object.assign(defaultSettings(), next);
      safeLocal(() => localStorage.setItem(SETTINGS_KEY, JSON.stringify(Store.settings)));
    },
    clearSettings() {
      Store.settings = defaultSettings();
      safeLocal(() => localStorage.removeItem(SETTINGS_KEY));
    },

    /** 새로 만들기: 브랜드 설정(계정 · 프로필 · 색 · 글꼴)은 유지 */
    reset() {
      const s = Store.state;
      const keep = { account: s.account, accent: s.accent, design: s.design, ratio: s.ratio, avatar: s.avatar, titleFont: s.titleFont, align: s.align, category: s.category, tone: s.tone };
      Store.state = Object.assign(defaultProject(), keep);
      Store.resetHistory();
      Store.save({ noHistory: true });
    },
  };

  window.Store = Store;
})();
