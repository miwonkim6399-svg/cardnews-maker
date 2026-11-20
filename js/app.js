/* ==========================================================
   카드뉴스 메이커 — 메인 (UI 연결)
   ========================================================== */
(function () {
  const S = window.Store;
  const $ = (sel) => document.querySelector(sel);
  const st = () => S.state;
  const MAX_CARDS = 10;
  const MIN_CARDS = 2;
  const SAMPLE_TOPIC = "직장인 아침 루틴 만드는 법";

  /* ---------- DOM ---------- */
  const el = {
    topic: $("#inTopic"), toneChips: $("#toneChips"), countSeg: $("#countSeg"), modeSeg: $("#modeSeg"), modeHint: $("#modeHint"),
    btnGenerate: $("#btnGenerate"), designGrid: $("#designGrid"), ratioSeg: $("#ratioSeg"), account: $("#inAccount"), swatches: $("#accentSwatches"),
    viewport: $("#viewport"), mainHolder: $("#mainHolder"), thumbs: $("#thumbs"), dots: $("#dots"), stageMeta: $("#stageMeta"),
    btnPrev: $("#btnPrev"), btnNext: $("#btnNext"), btnDlCurrent: $("#btnDlCurrent"),
    editIndex: $("#editIndex"), edLabel: $("#edLabel"), edTitle: $("#edTitle"), edBody: $("#edBody"),
    edAccentOn: $("#edAccentOn"), edAccent: $("#edAccent"), btnAccentAll: $("#btnAccentAll"),
    btnMoveLeft: $("#btnMoveLeft"), btnMoveRight: $("#btnMoveRight"), btnAddCard: $("#btnAddCard"), btnDelCard: $("#btnDelCard"),
    caption: $("#edCaption"), captionCount: $("#captionCount"), btnCaptionGen: $("#btnCaptionGen"), btnCopyCaption: $("#btnCopyCaption"),
    btnZip: $("#btnZip"), btnShare: $("#btnShare"), shareHint: $("#shareHint"), btnApiPublish: $("#btnApiPublish"), publishLog: $("#publishLog"),
    saveStatus: $("#saveStatus"), btnNew: $("#btnNew"), btnSettings: $("#btnSettings"), btnOpenSettings2: $("#btnOpenSettings2"),
    settingsModal: $("#settingsModal"), shareModal: $("#shareModal"), sharePreview: $("#sharePreview"), shareHowto: $("#shareHowto"), btnShareGo: $("#btnShareGo"),
    toast: $("#toast"),
  };

  /* ---------- 공통 ---------- */
  let toastTimer = null;
  function toast(msg, isErr) {
    el.toast.textContent = msg;
    el.toast.classList.toggle("err", !!isErr);
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), isErr ? 4200 : 2200);
  }

  function setBusy(btn, busy, label) {
    btn.disabled = busy;
    btn.classList.toggle("loading", busy);
    const lab = btn.querySelector(".btn-label");
    if (lab && label) lab.textContent = label;
    else if (!lab && label) btn.textContent = label;
  }

  function bindRadio(container, getValue, onPick) {
    container.addEventListener("click", (e) => {
      const b = e.target.closest("[data-v]");
      if (!b || !container.contains(b)) return;
      onPick(b.dataset.v);
    });
    container.querySelectorAll("[data-v]").forEach((b) => b.setAttribute("role", "radio"));
    return function sync() {
      const v = String(getValue());
      container.querySelectorAll("[data-v]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.v === v)));
    };
  }

  function isTyping() {
    const a = document.activeElement;
    return a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
  }

  /* ---------- 저장 상태 표시 ---------- */
  S.onSaveStatus((status, at) => {
    const txt = el.saveStatus.querySelector(".txt");
    el.saveStatus.classList.remove("saving", "saved");
    if (status === "saving") { el.saveStatus.classList.add("saving"); txt.textContent = "저장 중…"; }
    else if (status === "saved") {
      el.saveStatus.classList.add("saved");
      const d = new Date(at);
      txt.textContent = `자동 저장됨 · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } else txt.textContent = "저장 실패 (저장 공간 부족)";
  });

  /* ==========================================================
     미리보기 렌더링
     ========================================================== */
  function viewState() {
    if (st().cards.length) return st();
    return Object.assign({}, st(), {
      cards: [{ label: "START", title: "주제를 입력하고\n*카드뉴스 만들기*를\n눌러 주세요", body: "말투와 카드 수를 고르면 자동으로 완성돼요.", accent: "" }],
      active: 0,
    });
  }

  function renderMain() {
    const vs = viewState();
    const vp = el.viewport;
    const mobile = window.innerWidth < 820;
    const navSpace = mobile ? 0 : 112;
    const boxW = Math.max(160, vp.clientWidth - navSpace);
    const boxH = mobile ? Math.round(window.innerHeight * 0.62) : Math.max(260, vp.clientHeight);
    window.Render.renderInto(el.mainHolder, vs.cards[vs.active], vs.active, vs, boxW, boxH);
    const total = st().cards.length;
    el.btnPrev.disabled = st().active <= 0;
    el.btnNext.disabled = st().active >= total - 1;
    el.stageMeta.textContent = total ? `카드 ${st().active + 1} / ${total} · ${S.DESIGNS.find((d) => d.id === st().design).name} · ${st().ratio}` : "미리보기";
    el.btnDlCurrent.disabled = !total;
  }

  function renderThumbs() {
    const s = st();
    el.thumbs.replaceChildren();
    s.cards.forEach((card, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "thumb";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(i === s.active));
      b.setAttribute("aria-label", `카드 ${i + 1}`);
      b.dataset.i = i;
      const holder = document.createElement("div");
      holder.className = "card-holder";
      b.appendChild(holder);
      const num = document.createElement("span");
      num.className = "tnum";
      num.textContent = i + 1;
      b.appendChild(num);
      el.thumbs.appendChild(b);
      window.Render.renderInto(holder, card, i, s, 104, 116);
    });
  }

  function renderThumb(i) {
    const b = el.thumbs.querySelector(`.thumb[data-i="${i}"] .card-holder`);
    if (b) window.Render.renderInto(b, st().cards[i], i, st(), 104, 116);
  }

  function syncThumbSelection() {
    el.thumbs.querySelectorAll(".thumb").forEach((t) => {
      const on = Number(t.dataset.i) === st().active;
      t.setAttribute("aria-selected", String(on));
      if (on) t.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }

  function renderDots() {
    el.dots.replaceChildren();
    st().cards.forEach((_, i) => {
      const d = document.createElement("span");
      if (i === st().active) d.className = "on";
      el.dots.appendChild(d);
    });
  }

  function renderDesignGrid() {
    el.designGrid.replaceChildren();
    const sample = { label: "SAMPLE", title: "카드뉴스\n*디자인*", body: "미리보기", accent: "" };
    S.DESIGNS.forEach((d) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "design-opt";
      b.dataset.v = d.id;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(st().design === d.id));
      b.innerHTML = `<div class="dthumb"><div class="card-holder"></div></div><span class="dname">${d.name}</span>`;
      el.designGrid.appendChild(b);
    });
    // 모든 버튼이 배치된 뒤 실제 너비를 재서 그립니다
    el.designGrid.querySelectorAll(".design-opt").forEach((b) => {
      const w = b.querySelector(".dthumb").clientWidth || 90;
      const fake = Object.assign({}, st(), { design: b.dataset.v, ratio: "4:5", cards: [sample, sample, sample] });
      window.Render.renderInto(b.querySelector(".card-holder"), sample, 0, fake, w, w * 1.25);
    });
  }

  function renderSwatches() {
    el.swatches.replaceChildren();
    const current = (st().accent || "").toLowerCase();
    S.ACCENTS.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sw";
      b.style.background = c;
      b.dataset.v = c;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-label", "강조색 " + c);
      b.setAttribute("aria-checked", String(current === c));
      el.swatches.appendChild(b);
    });
    const custom = document.createElement("label");
    custom.className = "sw sw-custom";
    custom.title = "직접 고르기";
    const isCustom = !S.ACCENTS.includes(current);
    custom.setAttribute("aria-checked", String(isCustom));
    if (isCustom) custom.style.background = current;
    custom.innerHTML = `<input type="color" value="${current || "#ff5a36"}" aria-label="강조색 직접 고르기">`;
    el.swatches.appendChild(custom);
  }

  /* ---------- 편집 패널 ---------- */
  function renderEditor() {
    const s = st();
    const has = s.cards.length > 0;
    const card = has ? s.cards[s.active] : null;
    [el.edLabel, el.edTitle, el.edBody, el.edAccentOn, el.edAccent, el.btnAccentAll].forEach((x) => (x.disabled = !has));
    el.editIndex.textContent = has ? `${s.active + 1} / ${s.cards.length}` : "";
    el.edLabel.value = card ? card.label : "";
    el.edTitle.value = card ? card.title : "";
    el.edBody.value = card ? card.body : "";
    el.edAccentOn.checked = !!(card && card.accent);
    el.edAccent.value = (card && card.accent) || s.accent || "#ff5a36";
    el.btnMoveLeft.disabled = !has || s.active <= 0;
    el.btnMoveRight.disabled = !has || s.active >= s.cards.length - 1;
    el.btnAddCard.disabled = !has || s.cards.length >= MAX_CARDS;
    el.btnDelCard.disabled = !has || s.cards.length <= MIN_CARDS;
  }

  function renderCaptionMeta() {
    const v = el.caption.value;
    const tags = (v.match(/#[^\s#]+/g) || []).length;
    el.captionCount.textContent = `${v.length.toLocaleString()} / 2,200자 · 해시태그 ${tags}개`;
    el.captionCount.style.color = v.length > 2200 || tags > 30 ? "var(--danger)" : "";
  }

  function renderModeHint() {
    const s = st();
    if (s.mode === "ai") {
      el.modeHint.innerHTML = window.AI.hasKey()
        ? "Claude AI가 주제에 맞는 실제 내용으로 직접 작성해요. (10~40초 소요)"
        : '설정(<b>⚙</b>)에서 Anthropic API 키를 넣으면 사용할 수 있어요. <a href="#" id="lnkSettings">키 입력하기</a>';
      const lnk = $("#lnkSettings");
      if (lnk) lnk.addEventListener("click", (e) => { e.preventDefault(); openSettings(); });
    } else {
      el.modeHint.textContent = "API 키 없이 바로 만들어요. 생성 후 문구를 자유롭게 고쳐 쓰세요.";
    }
  }

  let syncTone, syncCount, syncMode, syncRatio;

  function renderControls() {
    el.topic.value = st().topic;
    el.account.value = st().account;
    syncTone(); syncCount(); syncMode(); syncRatio();
    renderModeHint();
    renderSwatches();
    renderDesignGrid();
  }

  function renderAll() {
    renderMain();
    renderThumbs();
    renderDots();
    renderEditor();
    el.caption.value = st().caption;
    renderCaptionMeta();
  }

  function goTo(i) {
    const s = st();
    if (!s.cards.length) return;
    s.active = Math.max(0, Math.min(s.cards.length - 1, i));
    renderMain();
    renderDots();
    renderEditor();
    syncThumbSelection();
    S.save();
  }

  /* ==========================================================
     생성
     ========================================================== */
  async function generate() {
    const s = st();
    s.topic = el.topic.value.trim();
    if (!s.topic) {
      toast("주제를 입력해 주세요.", true);
      el.topic.focus();
      return;
    }
    if (s.mode === "ai" && !window.AI.hasKey()) {
      toast("AI 작성은 API 키가 필요해요. 설정에서 입력해 주세요.", true);
      openSettings();
      return;
    }
    setBusy(el.btnGenerate, true, s.mode === "ai" ? "AI가 작성하는 중…" : "만드는 중…");
    try {
      let result;
      if (s.mode === "ai") {
        result = await window.AI.generate({ topic: s.topic, tone: s.tone, count: s.count });
      } else {
        result = window.Generator.generate({ topic: s.topic, tone: s.tone, count: s.count });
      }
      s.cards = result.cards;
      s.active = 0;
      s.caption = result.caption || window.Generator.caption(s);
      S.save();
      renderAll();
      toast(`카드뉴스 ${s.cards.length}장이 완성됐어요!`);
      if (window.innerWidth < 820) window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast(err.message || "생성 중 오류가 발생했어요.", true);
    } finally {
      setBusy(el.btnGenerate, false, "카드뉴스 만들기");
    }
  }

  async function regenerateCaption() {
    const s = st();
    if (!s.cards.length) return toast("먼저 카드뉴스를 만들어 주세요.", true);
    const useAi = s.mode === "ai" && window.AI.hasKey();
    el.btnCaptionGen.disabled = true;
    el.btnCaptionGen.textContent = useAi ? "AI 작성 중…" : "작성 중…";
    try {
      s.caption = useAi ? await window.AI.writeCaption(s) : window.Generator.caption(s);
      el.caption.value = s.caption;
      renderCaptionMeta();
      S.save();
      toast("캡션을 새로 작성했어요.");
    } catch (err) {
      toast(err.message, true);
    } finally {
      el.btnCaptionGen.disabled = false;
      el.btnCaptionGen.textContent = "다시 작성";
    }
  }

  /* ==========================================================
     설정
     ========================================================== */
  function openSettings() {
    const x = S.settings;
    $("#setApiKey").value = x.apiKey;
    $("#setIgToken").value = x.igToken;
    $("#setIgUser").value = x.igUserId;
    $("#setImgbb").value = x.imgbbKey;
    $("#setGraphVer").value = x.graphVersion;
    el.settingsModal.showModal();
  }

  el.settingsModal.addEventListener("close", () => {
    if (el.settingsModal.returnValue !== "save") return;
    S.saveSettings({
      apiKey: $("#setApiKey").value.trim(),
      igToken: $("#setIgToken").value.trim(),
      igUserId: $("#setIgUser").value.trim(),
      imgbbKey: $("#setImgbb").value.trim(),
      graphVersion: $("#setGraphVer").value.trim() || "v22.0",
    });
    renderModeHint();
    toast("설정을 저장했어요.");
  });
  $("#btnClearKeys").addEventListener("click", () => {
    if (!confirm("저장된 API 키와 토큰을 모두 지울까요?")) return;
    S.clearSettings();
    ["#setApiKey", "#setIgToken", "#setIgUser", "#setImgbb"].forEach((id) => ($(id).value = ""));
    $("#setGraphVer").value = "v22.0";
    renderModeHint();
    toast("키를 모두 지웠어요.");
  });

  /* ==========================================================
     공유 / 게시
     ========================================================== */
  let preparedFiles = null;
  let previewUrls = [];

  async function startShare() {
    const s = st();
    if (!s.cards.length) return toast("먼저 카드뉴스를 만들어 주세요.", true);
    setBusy(el.btnShare, true, "이미지 준비 중…");
    try {
      preparedFiles = await window.Insta.prepareFiles(s, (i, n) => {
        el.btnShare.querySelector(".btn-label").textContent = `이미지 준비 중… ${i + 1}/${n}`;
      });
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
      previewUrls = preparedFiles.map((f) => URL.createObjectURL(f));
      el.sharePreview.replaceChildren(...previewUrls.map((u, i) => {
        const img = new Image();
        img.src = u;
        img.alt = `카드 ${i + 1}`;
        return img;
      }));
      const mobileShare = window.Insta.isTouchDevice() && window.Insta.canShareFiles(preparedFiles);
      el.shareModal.dataset.mode = mobileShare ? "mobile" : "desktop";
      const steps = mobileShare
        ? ["아래 <b>Instagram으로 공유</b>를 누르면 캡션이 자동 복사돼요.", "공유창에서 <b>Instagram</b> → <b>피드</b>를 선택하세요.", `카드 ${preparedFiles.length}장이 순서대로 들어가 있어요. 다음을 눌러 진행하세요.`, "문구 입력란을 길게 눌러 <b>붙여넣기</b> → 공유!"]
        : ["아래 버튼을 누르면 카드 이미지가 저장되고 캡션이 복사돼요.", "새 탭에서 열리는 instagram.com 에 로그인 → 왼쪽 <b>만들기(+)</b>.", `저장된 이미지 ${preparedFiles.length}장을 <b>한 번에 선택</b>해서 끌어다 놓으세요 (파일명 순서 = 카드 순서).`, "문구 입력란에 <b>Ctrl+V</b> 로 캡션을 붙여넣고 공유!"];
      el.shareHowto.innerHTML = steps.map((x) => `<li>${x}</li>`).join("");
      el.btnShareGo.textContent = mobileShare ? "Instagram으로 공유" : "이미지 저장 + Instagram 열기";
      el.shareModal.showModal();
    } catch (err) {
      toast(err.message || "이미지 준비에 실패했어요.", true);
    } finally {
      setBusy(el.btnShare, false, "내 인스타그램에 올리기");
    }
  }

  el.btnShareGo.addEventListener("click", async () => {
    if (!preparedFiles) return;
    const caption = st().caption;
    if (el.shareModal.dataset.mode === "mobile") {
      try {
        await window.Insta.shareFiles(preparedFiles, caption);
        el.shareModal.close();
        toast("공유창을 열었어요. 캡션은 붙여넣기 하세요!");
      } catch (err) {
        if (err && err.name === "AbortError") return; // 사용자가 취소
        toast("공유를 열지 못했어요. 이미지를 저장해서 올려 주세요.", true);
        preparedFiles.forEach((f, i) => setTimeout(() => window.Exporter.downloadBlob(f, f.name), i * 250));
      }
    } else {
      window.open("https://www.instagram.com/", "_blank", "noopener");
      preparedFiles.forEach((f, i) => setTimeout(() => window.Exporter.downloadBlob(f, f.name), i * 300));
      const ok = await window.Insta.copyText(caption);
      toast(ok ? "이미지 저장 + 캡션 복사 완료! 인스타그램 탭에서 올려 주세요." : "이미지를 저장했어요. 캡션은 직접 복사해 주세요.");
      el.shareModal.close();
    }
  });
  el.shareModal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]") || e.target === el.shareModal) el.shareModal.close();
  });

  async function apiPublish() {
    const s = st();
    if (!s.cards.length) return toast("먼저 카드뉴스를 만들어 주세요.", true);
    const problem = window.Insta.validateForApi(s, S.settings);
    if (problem) {
      toast(problem, true);
      if (problem.startsWith("설정")) openSettings();
      return;
    }
    if (s.ratio === "3:4" && !confirm("3:4 비율은 Instagram API에서 거부될 수 있어요 (권장: 4:5, 1:1). 그래도 진행할까요?")) return;
    if (!confirm(`지금 연결된 Instagram 계정에 카드 ${s.cards.length}장 + 캡션을 바로 게시할까요?\n\n· 게시용 이미지가 imgbb에 공개 URL로 업로드됩니다.\n· 게시 후에는 Instagram 앱에서만 삭제할 수 있어요.`)) return;

    el.publishLog.hidden = false;
    el.publishLog.replaceChildren();
    const log = (msg, kind) => {
      const li = document.createElement("li");
      li.textContent = msg;
      if (kind) li.className = kind;
      el.publishLog.appendChild(li);
    };
    setBusy(el.btnApiPublish, true, "게시 중…");
    try {
      const link = await window.Insta.publishViaApi(s, S.settings, log);
      toast("Instagram에 게시했어요! 🎉");
      if (link) {
        const li = document.createElement("li");
        li.className = "ok";
        li.innerHTML = `<a href="${link}" target="_blank" rel="noopener">게시물 보기 ↗</a>`;
        el.publishLog.appendChild(li);
      }
    } catch (err) {
      log("실패: " + (err.message || err), "err");
      toast("게시에 실패했어요. 아래 로그를 확인하세요.", true);
    } finally {
      setBusy(el.btnApiPublish, false, "API로 바로 게시");
    }
  }

  /* ==========================================================
     이벤트 바인딩
     ========================================================== */
  function init() {
    // 말투 칩
    el.toneChips.innerHTML = S.TONES.map((t) => `<button type="button" class="chip" data-v="${t.id}">${t.name}</button>`).join("");
    syncTone = bindRadio(el.toneChips, () => st().tone, (v) => { st().tone = v; syncTone(); S.save(); });
    syncCount = bindRadio(el.countSeg, () => st().count, (v) => { st().count = Number(v); syncCount(); S.save(); });
    syncMode = bindRadio(el.modeSeg, () => st().mode, (v) => { st().mode = v; syncMode(); renderModeHint(); S.save(); });
    syncRatio = bindRadio(el.ratioSeg, () => st().ratio, (v) => {
      st().ratio = v; syncRatio(); S.save(); renderMain(); renderThumbs();
    });

    el.designGrid.addEventListener("click", (e) => {
      const b = e.target.closest(".design-opt");
      if (!b) return;
      st().design = b.dataset.v;
      el.designGrid.querySelectorAll(".design-opt").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      S.save(); renderMain(); renderThumbs();
    });

    el.swatches.addEventListener("click", (e) => {
      const b = e.target.closest("button.sw");
      if (!b) return;
      setGlobalAccent(b.dataset.v);
    });
    // 색상 선택기를 드래그하는 동안에는 스와치를 다시 그리지 않음 (선택창이 닫히지 않도록)
    el.swatches.addEventListener("input", (e) => {
      if (!e.target.matches('input[type="color"]')) return;
      e.target.parentElement.style.background = e.target.value;
      setGlobalAccent(e.target.value, true, true);
    });
    el.swatches.addEventListener("change", (e) => {
      if (e.target.matches('input[type="color"]')) renderSwatches();
    });

    el.topic.addEventListener("input", () => { st().topic = el.topic.value; S.save(); });
    el.topic.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); generate(); }
    });
    el.account.addEventListener("input", () => {
      st().account = el.account.value; S.save(); renderMain(); renderThumbs();
    });
    el.btnGenerate.addEventListener("click", generate);

    // 미리보기 이동
    el.btnPrev.addEventListener("click", () => goTo(st().active - 1));
    el.btnNext.addEventListener("click", () => goTo(st().active + 1));
    el.thumbs.addEventListener("click", (e) => {
      const t = e.target.closest(".thumb");
      if (t) goTo(Number(t.dataset.i));
    });
    document.addEventListener("keydown", (e) => {
      if (isTyping() || document.querySelector("dialog[open]")) return;
      if (e.key === "ArrowLeft") goTo(st().active - 1);
      if (e.key === "ArrowRight") goTo(st().active + 1);
    });
    let touchX = null, touchY = null;
    el.viewport.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
    el.viewport.addEventListener("touchend", (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      const dy = e.changedTouches[0].clientY - touchY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) goTo(st().active + (dx < 0 ? 1 : -1));
      touchX = null;
    });

    // 카드 편집
    const editField = (key, input) => input.addEventListener("input", () => {
      const c = st().cards[st().active];
      if (!c) return;
      c[key] = input.value;
      S.save(); renderMain(); renderThumb(st().active);
    });
    editField("label", el.edLabel);
    editField("title", el.edTitle);
    editField("body", el.edBody);
    el.edAccentOn.addEventListener("change", () => {
      const c = st().cards[st().active];
      if (!c) return;
      c.accent = el.edAccentOn.checked ? el.edAccent.value : "";
      S.save(); renderMain(); renderThumb(st().active);
    });
    el.edAccent.addEventListener("input", () => {
      const c = st().cards[st().active];
      if (!c) return;
      c.accent = el.edAccent.value;
      el.edAccentOn.checked = true;
      S.save(); renderMain(); renderThumb(st().active);
    });
    el.btnAccentAll.addEventListener("click", () => setGlobalAccent(el.edAccent.value, true));

    el.btnMoveLeft.addEventListener("click", () => moveCard(-1));
    el.btnMoveRight.addEventListener("click", () => moveCard(1));
    el.btnAddCard.addEventListener("click", () => {
      const s = st();
      if (s.cards.length >= MAX_CARDS) return toast(`카드는 최대 ${MAX_CARDS}장까지 만들 수 있어요.`, true);
      s.cards.splice(s.active + 1, 0, window.Generator.blankCard());
      s.active += 1;
      S.save(); renderAll();
      el.edTitle.focus();
    });
    el.btnDelCard.addEventListener("click", () => {
      const s = st();
      if (s.cards.length <= MIN_CARDS) return;
      if (!confirm(`${s.active + 1}번 카드를 삭제할까요?`)) return;
      s.cards.splice(s.active, 1);
      s.active = Math.min(s.active, s.cards.length - 1);
      S.save(); renderAll();
    });

    // 캡션
    el.caption.addEventListener("input", () => { st().caption = el.caption.value; renderCaptionMeta(); S.save(); });
    el.btnCaptionGen.addEventListener("click", regenerateCaption);
    el.btnCopyCaption.addEventListener("click", async () => {
      if (!el.caption.value.trim()) return toast("복사할 캡션이 없어요.", true);
      const ok = await window.Insta.copyText(el.caption.value);
      toast(ok ? "캡션을 복사했어요! 인스타그램에 붙여넣기 하세요." : "복사에 실패했어요. 직접 선택해서 복사해 주세요.", !ok);
    });

    // 저장 / 공유
    el.btnDlCurrent.addEventListener("click", async () => {
      setBusy(el.btnDlCurrent, true, "저장 중…");
      try { await window.Exporter.downloadCurrent(st()); toast("PNG로 저장했어요."); }
      catch (err) { toast(err.message, true); }
      finally { setBusy(el.btnDlCurrent, false, "이 카드 PNG"); }
    });
    el.btnZip.addEventListener("click", async () => {
      if (!st().cards.length) return toast("먼저 카드뉴스를 만들어 주세요.", true);
      setBusy(el.btnZip, true, "이미지 만드는 중…");
      try {
        await window.Exporter.downloadZip(st(), (i, n) => (el.btnZip.textContent = `이미지 만드는 중… ${i + 1}/${n}`));
        toast("ZIP 파일로 저장했어요 (캡션 포함).");
      } catch (err) { toast(err.message, true); }
      finally { setBusy(el.btnZip, false, "전체 카드 저장 (ZIP)"); }
    });
    el.btnShare.addEventListener("click", startShare);
    el.btnApiPublish.addEventListener("click", apiPublish);
    if (!window.Insta.isTouchDevice()) {
      el.shareHint.textContent = "PC: 카드 이미지 저장 + 캡션 복사 후 instagram.com 이 열려요. 휴대폰에서 이 사이트를 열면 Instagram 앱으로 바로 공유할 수 있어요.";
    }

    // 상단
    el.btnSettings.addEventListener("click", openSettings);
    el.btnOpenSettings2.addEventListener("click", openSettings);
    el.btnNew.addEventListener("click", () => {
      if (st().cards.length && !confirm("지금 작업을 지우고 새로 만들까요?\n(디자인 · 계정명 · 강조색 설정은 유지됩니다)")) return;
      S.reset();
      renderControls();
      renderAll();
      setTab("create");
      el.topic.focus();
    });

    // 모바일 탭
    document.querySelector(".tabbar").addEventListener("click", (e) => {
      const b = e.target.closest("[data-tab]");
      if (b) setTab(b.dataset.tab);
    });

    // 반응형: 미리보기 크기 재계산
    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => renderMain());
    };
    if ("ResizeObserver" in window) {
      new ResizeObserver(onResize).observe(el.viewport);
      let lastGridW = 0, gridRaf = 0;
      new ResizeObserver((entries) => {
        const w = Math.round(entries[0].contentRect.width);
        if (!w || w === lastGridW) return;
        lastGridW = w;
        cancelAnimationFrame(gridRaf);
        gridRaf = requestAnimationFrame(renderDesignGrid);
      }).observe(el.designGrid);
    }
    window.addEventListener("resize", onResize);

    // 첫 방문: 예시 카드뉴스로 시작
    if (!st().cards.length && !st().updatedAt) {
      st().topic = SAMPLE_TOPIC;
      const r = window.Generator.generate({ topic: SAMPLE_TOPIC, tone: st().tone, count: st().count });
      r.cards[r.cards.length - 1].accent = "#2f6bff"; // 예시: 주황 표지와 짝을 이루는 파란 마지막 장
      st().cards = r.cards;
      st().caption = window.Generator.caption(st());
      S.save();
    }

    setTab(document.body.dataset.tab || "create");
    renderControls();
    renderAll();

    // 웹폰트 로딩이 끝나면 글자 크기 맞춤을 다시 계산
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { renderMain(); renderThumbs(); renderDesignGrid(); });
    }
  }

  function setTab(tab) {
    document.body.dataset.tab = tab;
    document.querySelectorAll(".tabbar [data-tab]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.tab === tab)));
  }

  function setGlobalAccent(color, clearCards, keepSwatches) {
    const s = st();
    s.accent = color.toLowerCase();
    if (clearCards) s.cards.forEach((c) => (c.accent = ""));
    S.save();
    if (!keepSwatches) renderSwatches();
    renderDesignGrid();
    renderMain();
    renderThumbs();
    renderEditor();
  }

  function moveCard(dir) {
    const s = st();
    const i = s.active, j = i + dir;
    if (j < 0 || j >= s.cards.length) return;
    [s.cards[i], s.cards[j]] = [s.cards[j], s.cards[i]];
    s.active = j;
    S.save(); renderAll();
  }

  init();
})();
