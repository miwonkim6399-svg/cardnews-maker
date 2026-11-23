/* ==========================================================
   아름다운 부의 정원 카드뉴스메이커 — 메인 (화면 동작 연결)
   ========================================================== */
(function () {
  const S = window.Store;
  const CATS = window.Categories;
  const $ = (sel) => document.querySelector(sel);
  const st = () => S.state;
  const MAX_CARDS = 10;
  const MIN_CARDS = 2;

  const el = {
    catGrid: $("#catGrid"), ideaChips: $("#ideaChips"),
    topic: $("#inTopic"), toneChips: $("#toneChips"), countSeg: $("#countSeg"), modeSeg: $("#modeSeg"), modeHint: $("#modeHint"),
    btnGenerate: $("#btnGenerate"), designGrid: $("#designGrid"), ratioSeg: $("#ratioSeg"),
    account: $("#inAccount"), inAvatar: $("#inAvatar"), avatarPreview: $("#avatarPreview"), btnAvatarClear: $("#btnAvatarClear"),
    swatches: $("#accentSwatches"), accentName: $("#accentName"), selFont: $("#selFont"), alignSeg: $("#alignSeg"),
    viewport: $("#viewport"), mainHolder: $("#mainHolder"), thumbs: $("#thumbs"), dots: $("#dots"), stageMeta: $("#stageMeta"),
    btnPrev: $("#btnPrev"), btnNext: $("#btnNext"), btnDlCurrent: $("#btnDlCurrent"), btnUndo: $("#btnUndo"), btnRedo: $("#btnRedo"), btnIgPreview: $("#btnIgPreview"),
    editIndex: $("#editIndex"), edLabel: $("#edLabel"), edTitle: $("#edTitle"), edBody: $("#edBody"),
    inCardImage: $("#inCardImage"), btnImageClear: $("#btnImageClear"), btnImageAll: $("#btnImageAll"), inDim: $("#inDim"), dimOut: $("#dimOut"),
    edAccentOn: $("#edAccentOn"), edAccent: $("#edAccent"),
    btnMoveLeft: $("#btnMoveLeft"), btnMoveRight: $("#btnMoveRight"), btnDupCard: $("#btnDupCard"), btnAddCard: $("#btnAddCard"), btnDelCard: $("#btnDelCard"),
    caption: $("#edCaption"), captionCount: $("#captionCount"), btnCaptionGen: $("#btnCaptionGen"), btnCopyCaption: $("#btnCopyCaption"),
    btnSaveFolder: $("#btnSaveFolder"), folderHint: $("#folderHint"), btnZip: $("#btnZip"), btnShare: $("#btnShare"), shareHint: $("#shareHint"),
    btnSaveLibrary: $("#btnSaveLibrary"), btnApiPublish: $("#btnApiPublish"), publishLog: $("#publishLog"),
    saveStatus: $("#saveStatus"), btnNew: $("#btnNew"), btnSettings: $("#btnSettings"), btnOpenSettings2: $("#btnOpenSettings2"), btnLibrary: $("#btnLibrary"),
    settingsModal: $("#settingsModal"), shareModal: $("#shareModal"), sharePreview: $("#sharePreview"), shareHowto: $("#shareHowto"), btnShareGo: $("#btnShareGo"),
    libraryModal: $("#libraryModal"), libraryGrid: $("#libraryGrid"),
    igModal: $("#igModal"), igTabs: $("#igTabs"), igPost: $("#igPost"), igGrid: $("#igGrid"), igHolder: $("#igHolder"), igAvatar: $("#igAvatar"), igName: $("#igName"), igCaption: $("#igCaption"), igDots: $("#igDots"),
    toast: $("#toast"),
  };

  /* ---------- 공통 ---------- */
  let toastTimer = null;
  function toast(msg, isErr) {
    el.toast.textContent = msg;
    el.toast.classList.toggle("err", !!isErr);
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), isErr ? 4500 : 2400);
  }
  function setBusy(btn, busy, label) {
    btn.disabled = busy;
    btn.classList.toggle("loading", busy);
    const lab = btn.querySelector(".btn-label");
    if (label) (lab || btn).textContent = label;
  }
  function bindRadio(container, getValue, onPick) {
    container.addEventListener("click", (e) => {
      const b = e.target.closest("[data-v]");
      if (b && container.contains(b)) onPick(b.dataset.v);
    });
    return function sync() {
      const v = String(getValue());
      container.querySelectorAll("[data-v]").forEach((b) => { b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(b.dataset.v === v)); });
    };
  }
  const isTyping = () => { const a = document.activeElement; return a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT"); };
  const escapeHtml = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const curCard = () => st().cards[st().active];

  /** 이미지 파일 → 크기 줄인 JPEG dataURL */
  function fileToDataUrl(file, maxSide, quality) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error("사진 파일을 골라 주세요."));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("사진을 읽지 못했어요.")); };
      img.src = url;
    });
  }

  /* ---------- 저장 상태 ---------- */
  S.onSaveStatus((status, at) => {
    const txt = el.saveStatus.querySelector(".txt");
    el.saveStatus.classList.remove("saving", "saved");
    if (status === "saving") { el.saveStatus.classList.add("saving"); txt.textContent = "저장 중…"; }
    else if (status === "saved") {
      el.saveStatus.classList.add("saved");
      const d = new Date(at);
      txt.textContent = `자동 저장됨 · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } else txt.textContent = "저장 실패";
    syncUndo();
  });
  function changed() { S.save(); setTimeout(syncUndo, 700); }
  function syncUndo() { el.btnUndo.disabled = !S.canUndo(); el.btnRedo.disabled = !S.canRedo(); }

  /* ==========================================================
     미리보기
     ========================================================== */
  function viewState() {
    if (st().cards.length) return st();
    return Object.assign({}, st(), {
      cards: [{ label: "WELCOME", title: "관심사와 주제를 고르고\n*카드뉴스 만들기*를\n눌러 주세요", body: "고상한 디자인으로 자동 완성돼요.", accent: "", image: "" }],
      active: 0,
    });
  }

  function renderMain() {
    const vs = viewState();
    const mobile = window.innerWidth < 820;
    const boxW = Math.max(160, el.viewport.clientWidth - (mobile ? 0 : 112));
    const boxH = mobile ? Math.round(window.innerHeight * 0.62) : Math.max(260, el.viewport.clientHeight);
    window.Render.renderInto(el.mainHolder, vs.cards[vs.active], vs.active, vs, boxW, boxH);
    const total = st().cards.length;
    el.btnPrev.disabled = st().active <= 0;
    el.btnNext.disabled = st().active >= total - 1;
    const d = S.DESIGNS.find((x) => x.id === st().design);
    el.stageMeta.textContent = total ? `카드 ${st().active + 1} / ${total} · ${d ? d.name : ""} · ${st().ratio}` : "미리보기";
  }

  function renderThumbs() {
    const s = st();
    el.thumbs.replaceChildren();
    s.cards.forEach((card, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "thumb"; b.dataset.i = i;
      b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(i === s.active)); b.setAttribute("aria-label", `카드 ${i + 1}`);
      const holder = document.createElement("div"); holder.className = "card-holder";
      const num = document.createElement("span"); num.className = "tnum"; num.textContent = i + 1;
      b.append(holder, num);
      el.thumbs.appendChild(b);
      window.Render.renderInto(holder, card, i, s, 104, 116);
    });
  }
  function renderThumb(i) {
    const h = el.thumbs.querySelector(`.thumb[data-i="${i}"] .card-holder`);
    if (h) window.Render.renderInto(h, st().cards[i], i, st(), 104, 116);
  }
  function syncThumbSelection() {
    el.thumbs.querySelectorAll(".thumb").forEach((t) => {
      const on = Number(t.dataset.i) === st().active;
      t.setAttribute("aria-selected", String(on));
      if (on) t.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }
  function renderDots() {
    el.dots.replaceChildren(...st().cards.map((_, i) => { const d = document.createElement("span"); if (i === st().active) d.className = "on"; return d; }));
  }

  /* ---------- 만들기 패널 ---------- */
  function renderCategories() {
    el.catGrid.innerHTML = Object.entries(CATS).map(([id, c]) =>
      `<button type="button" class="cat" data-v="${id}" role="radio" aria-checked="${st().category === id}"><span class="ci">${c.icon}</span>${c.name}</button>`).join("");
    renderIdeas();
  }
  function renderIdeas() {
    const c = CATS[st().category] || CATS.general;
    el.ideaChips.innerHTML = c.ideas.map((x) => `<button type="button" class="idea">${escapeHtml(x)}</button>`).join("");
    el.topic.placeholder = "예) " + c.ideas[0];
  }

  function renderDesignGrid() {
    el.designGrid.replaceChildren();
    const sample = { label: "NOTE", title: "아름다운\n*카드뉴스*", body: "고상한 디자인", accent: "", image: "" };
    S.DESIGNS.forEach((d) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "design-opt"; b.dataset.v = d.id; b.title = `${d.name} — ${d.desc}`;
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", String(st().design === d.id));
      b.innerHTML = `<div class="dthumb"><div class="card-holder"></div></div><span class="dname">${d.name}</span>`;
      el.designGrid.appendChild(b);
    });
    el.designGrid.querySelectorAll(".design-opt").forEach((b) => {
      const w = b.querySelector(".dthumb").clientWidth || 60;
      const fake = Object.assign({}, st(), { design: b.dataset.v, ratio: "4:5", titleFont: "", align: "auto", cards: [sample, sample, sample] });
      window.Render.renderInto(b.querySelector(".card-holder"), sample, 1, fake, w, w * 1.25);
    });
  }

  function renderSwatches() {
    const current = (st().accent || "").toLowerCase();
    el.swatches.innerHTML = S.ACCENTS.map((a) =>
      `<button type="button" class="sw" data-v="${a.c}" style="background:${a.c}" role="radio" aria-label="${a.n}" title="${a.n}" aria-checked="${current === a.c}"></button>`).join("");
    const known = S.ACCENTS.find((a) => a.c === current);
    const custom = document.createElement("label");
    custom.className = "sw sw-custom"; custom.title = "직접 고르기";
    custom.setAttribute("aria-checked", String(!known));
    if (!known) custom.style.background = current;
    custom.innerHTML = `<input type="color" value="${current || "#3f5a4a"}" aria-label="대표 색 직접 고르기">`;
    el.swatches.appendChild(custom);
    el.accentName.textContent = known ? known.n : "직접 고른 색";
  }

  function renderBrand() {
    el.account.value = st().account;
    el.avatarPreview.style.backgroundImage = st().avatar ? `url('${st().avatar}')` : "";
    el.avatarPreview.classList.toggle("has", !!st().avatar);
    el.btnAvatarClear.hidden = !st().avatar;
    el.selFont.value = st().titleFont || "";
    syncAlign();
    renderSwatches();
  }

  /* ---------- 편집 패널 ---------- */
  function renderEditor() {
    const s = st();
    const has = s.cards.length > 0;
    const card = has ? curCard() : null;
    [el.edLabel, el.edTitle, el.edBody, el.edAccentOn, el.edAccent, el.inCardImage, el.btnImageClear, el.btnImageAll, el.inDim].forEach((x) => (x.disabled = !has));
    el.editIndex.textContent = has ? `${s.active + 1} / ${s.cards.length}` : "";
    el.edLabel.value = card ? card.label : "";
    el.edTitle.value = card ? card.title : "";
    el.edBody.value = card ? card.body : "";
    el.edAccentOn.checked = !!(card && card.accent);
    el.edAccent.value = (card && card.accent) || s.accent || "#3f5a4a";
    el.btnImageClear.disabled = !(card && card.image);
    el.btnImageAll.disabled = !(card && card.image) || s.active === 0;
    el.inDim.value = s.imageDim;
    el.dimOut.textContent = s.imageDim + "%";
    el.btnMoveLeft.disabled = !has || s.active <= 0;
    el.btnMoveRight.disabled = !has || s.active >= s.cards.length - 1;
    el.btnAddCard.disabled = el.btnDupCard.disabled = !has || s.cards.length >= MAX_CARDS;
    el.btnDelCard.disabled = !has || s.cards.length <= MIN_CARDS;
  }

  function renderCaptionMeta() {
    const v = el.caption.value;
    const tags = (v.match(/#[^\s#]+/g) || []).length;
    el.captionCount.textContent = `${v.length.toLocaleString()} / 2,200자 · 해시태그 ${tags}개`;
    el.captionCount.style.color = v.length > 2200 || tags > 30 ? "var(--danger)" : "";
  }

  function renderModeHint() {
    if (st().mode === "ai") {
      el.modeHint.innerHTML = window.AI.hasKey()
        ? "Claude AI가 주제에 맞는 실제 내용으로 작성해요. (10~40초)"
        : 'AI 작성은 ⚙ 설정에 Anthropic API 키가 필요해요. <a href="#" id="lnkSettings">키 입력하기</a>';
      const lnk = $("#lnkSettings");
      if (lnk) lnk.addEventListener("click", (e) => { e.preventDefault(); openSettings(); });
    } else {
      el.modeHint.textContent = "관심사에 맞춘 문구로 바로 만들어요. 만든 뒤 자유롭게 고쳐 쓰세요.";
    }
  }

  async function renderFolderHint() {
    if (!window.Exporter.folderSupported()) {
      el.folderHint.textContent = "이 브라우저는 폴더 바로 저장을 지원하지 않아요. ZIP으로 받아 원하는 폴더에 풀어 주세요. (PC 크롬 · 엣지에서 가능)";
      return;
    }
    const h = await window.Exporter.getFolder();
    el.folderHint.innerHTML = h
      ? `저장 폴더: <b>${escapeHtml(h.name)}</b> · 작품마다 「날짜_주제」 폴더가 생겨요. <a href="#" id="lnkFolder">폴더 바꾸기</a>`
      : "처음 한 번 저장할 폴더를 고르면 다음부터 그 폴더에 바로 저장돼요. (예: 인스타그램_업로드)";
    const lnk = $("#lnkFolder");
    if (lnk) lnk.addEventListener("click", async (e) => {
      e.preventDefault();
      try { await window.Exporter.pickFolder(); renderFolderHint(); toast("저장 폴더를 바꿨어요."); } catch (err) { if (err.name !== "AbortError") toast(err.message, true); }
    });
  }

  let syncTone, syncCount, syncMode, syncRatio, syncAlign;
  function renderControls() {
    el.topic.value = st().topic;
    syncTone(); syncCount(); syncMode(); syncRatio();
    renderCategories();
    renderModeHint();
    renderBrand();
    renderDesignGrid();
  }
  function renderCards() {
    renderMain(); renderThumbs(); renderDots(); renderEditor();
  }
  function renderAll() {
    renderCards();
    el.caption.value = st().caption;
    renderCaptionMeta();
    syncUndo();
  }
  function refreshLook() { renderMain(); renderThumbs(); }

  function goTo(i) {
    const s = st();
    if (!s.cards.length) return;
    s.active = Math.max(0, Math.min(s.cards.length - 1, i));
    renderMain(); renderDots(); renderEditor(); syncThumbSelection();
    S.save({ noHistory: true });
  }

  /* ==========================================================
     만들기
     ========================================================== */
  function applyCategory(id, silent) {
    const c = CATS[id];
    if (!c) return;
    st().category = id;
    if (!silent) {
      st().design = c.design;
      st().accent = c.accent;
      st().cards.forEach((x) => (x.accent = ""));
    }
    renderCategories(); renderSwatches(); renderDesignGrid(); refreshLook();
    changed();
    if (!silent) toast(`「${c.name}」에 어울리는 디자인과 색을 골라 두었어요.`);
  }

  async function generate() {
    const s = st();
    s.topic = el.topic.value.trim();
    if (!s.topic) { toast("주제를 입력하거나 추천 주제를 눌러 주세요.", true); el.topic.focus(); return; }
    if (s.mode === "ai" && !window.AI.hasKey()) { toast("AI 작성은 API 키가 필요해요.", true); openSettings(); return; }
    setBusy(el.btnGenerate, true, s.mode === "ai" ? "AI가 작성하는 중…" : "만드는 중…");
    try {
      const args = { topic: s.topic, tone: s.tone, count: s.count, category: s.category };
      const result = s.mode === "ai" ? await window.AI.generate(args) : window.Generator.generate(args);
      s.cards = result.cards;
      s.active = 0;
      s.id = S.uid();
      s.caption = result.caption || window.Generator.caption(s);
      changed();
      renderAll();
      toast(`카드뉴스 ${s.cards.length}장이 완성됐어요!`);
      if (window.innerWidth < 820) window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast(err.message || "만드는 중 오류가 발생했어요.", true);
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
      el.caption.value = s.caption; renderCaptionMeta(); changed();
      toast("캡션을 새로 작성했어요.");
    } catch (err) { toast(err.message, true); }
    finally { el.btnCaptionGen.disabled = false; el.btnCaptionGen.textContent = "다시 작성"; }
  }

  /* ==========================================================
     설정
     ========================================================== */
  function openSettings() {
    const x = S.settings;
    $("#setApiKey").value = x.apiKey; $("#setIgToken").value = x.igToken; $("#setIgUser").value = x.igUserId;
    $("#setImgbb").value = x.imgbbKey; $("#setGraphVer").value = x.graphVersion;
    el.settingsModal.showModal();
  }
  el.settingsModal.addEventListener("close", () => {
    if (el.settingsModal.returnValue !== "save") return;
    S.saveSettings({
      apiKey: $("#setApiKey").value.trim(), igToken: $("#setIgToken").value.trim(), igUserId: $("#setIgUser").value.trim(),
      imgbbKey: $("#setImgbb").value.trim(), graphVersion: $("#setGraphVer").value.trim() || "v22.0",
    });
    renderModeHint(); toast("설정을 저장했어요.");
  });
  $("#btnClearKeys").addEventListener("click", () => {
    if (!confirm("저장된 API 키와 토큰을 모두 지울까요?")) return;
    S.clearSettings();
    ["#setApiKey", "#setIgToken", "#setIgUser", "#setImgbb"].forEach((id) => ($(id).value = ""));
    $("#setGraphVer").value = "v22.0"; renderModeHint(); toast("키를 모두 지웠어요.");
  });

  /* ==========================================================
     내 보관함
     ========================================================== */
  function fmtDate(iso) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  function renderLibrary() {
    if (!S.library.length) {
      el.libraryGrid.innerHTML = '<div class="lib-empty">아직 보관한 작품이 없어요.<br>「저장 · 올리기」에서 <b>이 작품을 보관함에 저장</b>을 눌러 보세요.</div>';
      return;
    }
    el.libraryGrid.innerHTML = S.library.map((x) => {
      const c = CATS[x.category];
      return `<div class="lib-item" data-id="${x.id}">
        ${x.thumb ? `<img src="${x.thumb}" alt="">` : '<div class="lib-ph">❦</div>'}
        <div class="lib-meta"><b>${escapeHtml(x.topic)}</b><span>${c ? c.name + " · " : ""}${x.count}장 · ${fmtDate(x.updatedAt)}</span></div>
        <div class="lib-actions"><button class="open" data-act="open">열기</button><button data-act="dup">복사</button><button data-act="del">삭제</button></div>
      </div>`;
    }).join("");
  }
  el.libraryGrid.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const id = b.closest(".lib-item").dataset.id;
    try {
      if (b.dataset.act === "open") {
        await S.openFromLibrary(id);
        el.libraryModal.close(); renderControls(); renderAll(); toast("보관함에서 불러왔어요.");
      } else if (b.dataset.act === "dup") {
        await S.duplicateInLibrary(id); renderLibrary(); toast("복사본을 만들었어요.");
      } else if (b.dataset.act === "del") {
        if (!confirm("보관함에서 이 작품을 삭제할까요? 되돌릴 수 없어요.")) return;
        await S.deleteFromLibrary(id); renderLibrary(); toast("보관함에서 삭제했어요.");
      }
    } catch (err) { toast(err.message, true); }
  });
  async function saveToLibrary() {
    if (!st().cards.length) return toast("먼저 카드뉴스를 만들어 주세요.", true);
    el.btnSaveLibrary.disabled = true;
    try {
      const thumb = await window.Exporter.thumbDataUrl(st()).catch(() => "");
      await S.saveToLibrary(thumb);
      toast("📚 보관함에 저장했어요.");
    } catch (err) { toast("보관함 저장에 실패했어요: " + err.message, true); }
    finally { el.btnSaveLibrary.disabled = false; }
  }

  /* ==========================================================
     인스타그램 미리보기
     ========================================================== */
  let igIndex = 0;
  function renderIgPost() {
    const s = st();
    if (!s.cards.length) return;
    const w = Math.min(420, el.igModal.clientWidth - 46);
    const ratio = S.RATIOS[s.ratio];
    window.Render.renderInto(el.igHolder, s.cards[igIndex], igIndex, s, w, w * ratio.h / ratio.w);
    el.igDots.innerHTML = s.cards.map((_, i) => `<i class="${i === igIndex ? "on" : ""}"></i>`).join("");
    $("#igPrev").hidden = igIndex === 0;
    $("#igNext").hidden = igIndex === s.cards.length - 1;
  }
  function renderIgGrid() {
    const s = st();
    const cells = [];
    const w = Math.floor((Math.min(420, el.igModal.clientWidth - 46)) / 3);
    el.igGrid.replaceChildren();
    const first = document.createElement("div"); first.className = "cell";
    const h = document.createElement("div"); h.className = "card-holder"; first.appendChild(h);
    el.igGrid.appendChild(first);
    window.Render.renderInto(h, s.cards[0], 0, s, w, w * 4 / 3);
    S.library.filter((x) => x.id !== s.id && x.thumb).slice(0, 8).forEach((x) => {
      const c = document.createElement("div"); c.className = "cell";
      c.innerHTML = `<img src="${x.thumb}" alt="" style="width:100%;height:100%;object-fit:cover">`;
      cells.push(c);
    });
    while (cells.length < 8) { const c = document.createElement("div"); c.className = "cell ph"; cells.push(c); }
    el.igGrid.append(...cells);
  }
  function openIgPreview() {
    const s = st();
    if (!s.cards.length) return toast("먼저 카드뉴스를 만들어 주세요.", true);
    igIndex = s.active;
    el.igName.textContent = (s.account || "").replace(/^@/, "") || "my_account";
    el.igAvatar.style.backgroundImage = s.avatar ? `url('${s.avatar}')` : "";
    const cap = escapeHtml(s.caption || "").replace(/(#[^\s#]+)/g, '<span class="tag">$1</span>');
    el.igCaption.innerHTML = `<b>${escapeHtml(el.igName.textContent)}</b> ${cap}`;
    el.igModal.showModal();
    syncIgTab("post");
  }
  function syncIgTab(v) {
    el.igTabs.querySelectorAll("[data-v]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.v === v)));
    el.igPost.hidden = v !== "post"; el.igGrid.hidden = v !== "grid";
    if (v === "post") renderIgPost(); else renderIgGrid();
  }

  /* ==========================================================
     저장 / 공유 / 게시
     ========================================================== */
  async function saveFolder() {
    const s = st();
    if (!s.cards.length) return toast("먼저 카드뉴스를 만들어 주세요.", true);
    if (!window.Exporter.folderSupported()) {
      toast("이 브라우저는 폴더 바로 저장이 안 돼서 ZIP으로 받을게요.");
      return downloadZip();
    }
    setBusy(el.btnSaveFolder, true, "저장 중…");
    try {
      const where = await window.Exporter.saveToFolder(s, (i, n) => setBusy(el.btnSaveFolder, true, `저장 중… ${i + 1}/${n}`));
      toast(`📁 ${where} 에 저장했어요!`);
      renderFolderHint();
    } catch (err) {
      if (err.name !== "AbortError") toast(err.message || "폴더 저장에 실패했어요.", true);
    } finally {
      setBusy(el.btnSaveFolder, false, "📁 내 폴더에 저장");
    }
  }

  async function downloadZip() {
    if (!st().cards.length) return toast("먼저 카드뉴스를 만들어 주세요.", true);
    setBusy(el.btnZip, true, "이미지 만드는 중…");
    try {
      await window.Exporter.downloadZip(st(), (i, n) => (el.btnZip.textContent = `이미지 만드는 중… ${i + 1}/${n}`));
      toast("ZIP 파일로 받았어요 (캡션 포함).");
    } catch (err) { toast(err.message, true); }
    finally { setBusy(el.btnZip, false, "전체 카드 ZIP으로 받기"); }
  }

  let preparedFiles = null, previewUrls = [];
  async function startShare() {
    const s = st();
    if (!s.cards.length) return toast("먼저 카드뉴스를 만들어 주세요.", true);
    setBusy(el.btnShare, true, "이미지 준비 중…");
    try {
      preparedFiles = await window.Insta.prepareFiles(s, (i, n) => setBusy(el.btnShare, true, `이미지 준비 중… ${i + 1}/${n}`));
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
      previewUrls = preparedFiles.map((f) => URL.createObjectURL(f));
      el.sharePreview.replaceChildren(...previewUrls.map((u, i) => { const img = new Image(); img.src = u; img.alt = `카드 ${i + 1}`; return img; }));
      const mobileShare = window.Insta.isTouchDevice() && window.Insta.canShareFiles(preparedFiles);
      el.shareModal.dataset.mode = mobileShare ? "mobile" : "desktop";
      const acc = escapeHtml(s.account || "@buccaneerscholar");
      const steps = mobileShare
        ? [`인스타그램 앱이 <b>${acc}</b> 계정인지 먼저 확인하세요.`, "아래 <b>Instagram으로 공유</b>를 누르면 캡션이 자동 복사돼요.", "공유창에서 <b>Instagram → 피드</b>를 고르세요.", "문구 칸을 길게 눌러 <b>붙여넣기</b> → 공유!"]
        : [`instagram.com 이 <b>${acc}</b> 계정으로 로그인되어 있는지 확인하세요.`, "아래 버튼을 누르면 카드 이미지가 저장되고 캡션이 복사돼요.", `왼쪽 <b>만들기(+)</b> → 저장된 이미지 ${preparedFiles.length}장을 <b>한 번에 선택</b> (파일명 순서 = 카드 순서).`, "다음 화면 <b>문구 칸</b>에 <b>Ctrl+V</b> 로 캡션을 붙여넣고 공유!"];
      el.shareHowto.innerHTML = steps.map((x) => `<li>${x}</li>`).join("");
      el.btnShareGo.textContent = mobileShare ? "Instagram으로 공유" : "이미지 저장 + Instagram 열기";
      el.shareModal.showModal();
    } catch (err) { toast(err.message || "이미지 준비에 실패했어요.", true); }
    finally { setBusy(el.btnShare, false, "내 인스타그램에 올리기"); }
  }
  el.btnShareGo.addEventListener("click", async () => {
    if (!preparedFiles) return;
    const caption = st().caption;
    if (el.shareModal.dataset.mode === "mobile") {
      try {
        await window.Insta.shareFiles(preparedFiles, caption);
        el.shareModal.close(); toast("공유창을 열었어요. 문구 칸에 붙여넣기 하세요!");
      } catch (err) {
        if (err && err.name === "AbortError") return;
        toast("공유를 열지 못했어요. 이미지를 저장해서 올려 주세요.", true);
        preparedFiles.forEach((f, i) => setTimeout(() => window.Exporter.downloadBlob(f, f.name), i * 250));
      }
    } else {
      window.open("https://www.instagram.com/", "_blank", "noopener");
      preparedFiles.forEach((f, i) => setTimeout(() => window.Exporter.downloadBlob(f, f.name), i * 300));
      const ok = await window.Insta.copyText(caption);
      toast(ok ? "이미지 저장 + 캡션 복사 완료! 문구 칸에 Ctrl+V 하세요." : "이미지를 저장했어요. 캡션은 직접 복사해 주세요.");
      el.shareModal.close();
    }
  });

  async function apiPublish() {
    const s = st();
    if (!s.cards.length) return toast("먼저 카드뉴스를 만들어 주세요.", true);
    const problem = window.Insta.validateForApi(s, S.settings);
    if (problem) { toast(problem, true); if (problem.startsWith("설정")) openSettings(); return; }
    if (s.ratio === "3:4" && !confirm("3:4 비율은 Instagram API에서 거부될 수 있어요 (권장: 4:5, 1:1). 그래도 진행할까요?")) return;
    if (!confirm(`연결된 Instagram 계정에 카드 ${s.cards.length}장 + 캡션을 바로 게시할까요?\n\n· 게시용 이미지가 imgbb에 공개 URL로 업로드됩니다.\n· 게시 후에는 Instagram에서만 삭제할 수 있어요.`)) return;
    el.publishLog.hidden = false; el.publishLog.replaceChildren();
    const log = (msg, kind) => { const li = document.createElement("li"); li.textContent = msg; if (kind) li.className = kind; el.publishLog.appendChild(li); };
    setBusy(el.btnApiPublish, true, "게시 중…");
    try {
      const link = await window.Insta.publishViaApi(s, S.settings, log);
      toast("Instagram에 게시했어요! 🎉");
      if (link) { const li = document.createElement("li"); li.className = "ok"; li.innerHTML = `<a href="${encodeURI(link)}" target="_blank" rel="noopener">게시물 보기 ↗</a>`; el.publishLog.appendChild(li); }
    } catch (err) { log("실패: " + (err.message || err), "err"); toast("게시에 실패했어요. 아래 기록을 확인하세요.", true); }
    finally { setBusy(el.btnApiPublish, false, "API로 바로 게시"); }
  }

  /* ==========================================================
     카드 조작
     ========================================================== */
  function moveCard(dir) {
    const s = st(); const i = s.active, j = i + dir;
    if (j < 0 || j >= s.cards.length) return;
    [s.cards[i], s.cards[j]] = [s.cards[j], s.cards[i]];
    s.active = j; changed(); renderCards();
  }
  function setGlobalAccent(color, keepSwatches) {
    st().accent = color.toLowerCase();
    st().cards.forEach((c) => (c.accent = ""));
    changed();
    if (!keepSwatches) renderSwatches();
    renderDesignGrid(); refreshLook(); renderEditor();
  }

  /* ==========================================================
     이벤트 연결
     ========================================================== */
  function bind() {
    el.toneChips.innerHTML = S.TONES.map((t) => `<button type="button" class="chip" data-v="${t.id}">${t.name}</button>`).join("");
    el.selFont.innerHTML = S.FONTS.map((f) => `<option value="${f.id}">${f.name}</option>`).join("");
    syncTone = bindRadio(el.toneChips, () => st().tone, (v) => { st().tone = v; syncTone(); changed(); });
    syncCount = bindRadio(el.countSeg, () => st().count, (v) => { st().count = Number(v); syncCount(); changed(); });
    syncMode = bindRadio(el.modeSeg, () => st().mode, (v) => { st().mode = v; syncMode(); renderModeHint(); changed(); });
    syncRatio = bindRadio(el.ratioSeg, () => st().ratio, (v) => { st().ratio = v; syncRatio(); changed(); refreshLook(); });
    syncAlign = bindRadio(el.alignSeg, () => st().align || "auto", (v) => { st().align = v; syncAlign(); changed(); refreshLook(); });

    el.catGrid.addEventListener("click", (e) => { const b = e.target.closest(".cat"); if (b) applyCategory(b.dataset.v); });
    el.ideaChips.addEventListener("click", (e) => {
      const b = e.target.closest(".idea");
      if (!b) return;
      el.topic.value = b.textContent; st().topic = b.textContent; changed();
      el.topic.focus();
      toast("주제를 넣었어요. 「카드뉴스 만들기」를 눌러 보세요.");
    });
    el.designGrid.addEventListener("click", (e) => {
      const b = e.target.closest(".design-opt");
      if (!b) return;
      st().design = b.dataset.v;
      el.designGrid.querySelectorAll(".design-opt").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
      changed(); refreshLook();
    });
    el.swatches.addEventListener("click", (e) => { const b = e.target.closest("button.sw"); if (b) setGlobalAccent(b.dataset.v); });
    el.swatches.addEventListener("input", (e) => {
      if (!e.target.matches('input[type="color"]')) return;
      e.target.parentElement.style.background = e.target.value;
      setGlobalAccent(e.target.value, true);
    });
    el.swatches.addEventListener("change", (e) => { if (e.target.matches('input[type="color"]')) renderSwatches(); });
    el.selFont.addEventListener("change", () => { st().titleFont = el.selFont.value; changed(); refreshLook(); });

    el.topic.addEventListener("input", () => { st().topic = el.topic.value; changed(); });
    el.topic.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); generate(); } });
    el.account.addEventListener("input", () => { st().account = el.account.value; changed(); refreshLook(); });
    el.inAvatar.addEventListener("change", async () => {
      try { st().avatar = await fileToDataUrl(el.inAvatar.files[0], 240, 0.85); changed(); renderBrand(); refreshLook(); toast("프로필 사진을 넣었어요."); }
      catch (err) { toast(err.message, true); }
      el.inAvatar.value = "";
    });
    el.btnAvatarClear.addEventListener("click", () => { st().avatar = ""; changed(); renderBrand(); refreshLook(); });
    el.btnGenerate.addEventListener("click", generate);

    // 미리보기 이동
    el.btnPrev.addEventListener("click", () => goTo(st().active - 1));
    el.btnNext.addEventListener("click", () => goTo(st().active + 1));
    el.thumbs.addEventListener("click", (e) => { const t = e.target.closest(".thumb"); if (t) goTo(Number(t.dataset.i)); });
    document.addEventListener("keydown", (e) => {
      if (document.querySelector("dialog[open]")) return;
      if ((e.ctrlKey || e.metaKey) && !isTyping() && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
      if ((e.ctrlKey || e.metaKey) && !isTyping() && e.key.toLowerCase() === "y") { e.preventDefault(); doRedo(); return; }
      if (isTyping()) return;
      if (e.key === "ArrowLeft") goTo(st().active - 1);
      if (e.key === "ArrowRight") goTo(st().active + 1);
    });
    let tx = null, ty = null;
    el.viewport.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    el.viewport.addEventListener("touchend", (e) => {
      if (tx === null) return;
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) goTo(st().active + (dx < 0 ? 1 : -1));
      tx = null;
    });
    el.btnUndo.addEventListener("click", doUndo);
    el.btnRedo.addEventListener("click", doRedo);
    el.btnIgPreview.addEventListener("click", openIgPreview);
    el.igTabs.addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (b) syncIgTab(b.dataset.v); });
    $("#igPrev").addEventListener("click", () => { igIndex = Math.max(0, igIndex - 1); renderIgPost(); });
    $("#igNext").addEventListener("click", () => { igIndex = Math.min(st().cards.length - 1, igIndex + 1); renderIgPost(); });

    // 카드 편집
    const editField = (key, input) => input.addEventListener("input", () => {
      const c = curCard(); if (!c) return;
      c[key] = input.value; changed(); renderMain(); renderThumb(st().active);
    });
    editField("label", el.edLabel); editField("title", el.edTitle); editField("body", el.edBody);
    el.edAccentOn.addEventListener("change", () => { const c = curCard(); if (!c) return; c.accent = el.edAccentOn.checked ? el.edAccent.value : ""; changed(); renderMain(); renderThumb(st().active); });
    el.edAccent.addEventListener("input", () => { const c = curCard(); if (!c) return; c.accent = el.edAccent.value; el.edAccentOn.checked = true; changed(); renderMain(); renderThumb(st().active); });
    el.inCardImage.addEventListener("change", async () => {
      const c = curCard(); if (!c) return;
      try { c.image = await fileToDataUrl(el.inCardImage.files[0], 1400, 0.84); changed(); renderMain(); renderThumb(st().active); renderEditor(); toast("배경 사진을 넣었어요. 「사진 어둡게」로 글씨를 또렷하게 할 수 있어요."); }
      catch (err) { toast(err.message, true); }
      el.inCardImage.value = "";
    });
    el.btnImageClear.addEventListener("click", () => { const c = curCard(); if (!c) return; c.image = ""; changed(); renderMain(); renderThumb(st().active); renderEditor(); });
    el.btnImageAll.addEventListener("click", () => { const c = curCard(); if (!c || !c.image) return; st().cards[0].image = c.image; changed(); renderThumb(0); toast("표지에도 같은 사진을 넣었어요."); });
    el.inDim.addEventListener("input", () => { st().imageDim = Number(el.inDim.value); el.dimOut.textContent = el.inDim.value + "%"; changed(); renderMain(); });
    el.inDim.addEventListener("change", () => renderThumbs());
    el.btnMoveLeft.addEventListener("click", () => moveCard(-1));
    el.btnMoveRight.addEventListener("click", () => moveCard(1));
    el.btnDupCard.addEventListener("click", () => {
      const s = st(); if (s.cards.length >= MAX_CARDS) return toast(`카드는 최대 ${MAX_CARDS}장까지예요.`, true);
      s.cards.splice(s.active + 1, 0, Object.assign({}, curCard())); s.active += 1; changed(); renderCards(); toast("카드를 복제했어요.");
    });
    el.btnAddCard.addEventListener("click", () => {
      const s = st(); if (s.cards.length >= MAX_CARDS) return toast(`카드는 최대 ${MAX_CARDS}장까지예요.`, true);
      s.cards.splice(s.active + 1, 0, window.Generator.blankCard()); s.active += 1; changed(); renderCards(); el.edTitle.focus();
    });
    el.btnDelCard.addEventListener("click", () => {
      const s = st(); if (s.cards.length <= MIN_CARDS) return;
      s.cards.splice(s.active, 1); s.active = Math.min(s.active, s.cards.length - 1); changed(); renderCards();
      toast("카드를 삭제했어요. ↶ 되돌리기로 복구할 수 있어요.");
    });

    // 캡션
    el.caption.addEventListener("input", () => { st().caption = el.caption.value; renderCaptionMeta(); changed(); });
    el.btnCaptionGen.addEventListener("click", regenerateCaption);
    el.btnCopyCaption.addEventListener("click", async () => {
      if (!el.caption.value.trim()) return toast("복사할 캡션이 없어요.", true);
      const ok = await window.Insta.copyText(el.caption.value);
      toast(ok ? "캡션을 복사했어요! 인스타그램 문구 칸에 붙여넣기 하세요." : "복사에 실패했어요. 직접 선택해서 복사해 주세요.", !ok);
    });

    // 저장 / 공유
    el.btnDlCurrent.addEventListener("click", async () => {
      if (!st().cards.length) return;
      setBusy(el.btnDlCurrent, true, "저장 중…");
      try { await window.Exporter.downloadCurrent(st()); toast("PNG로 저장했어요."); }
      catch (err) { toast(err.message, true); }
      finally { setBusy(el.btnDlCurrent, false, "이 카드 PNG"); }
    });
    el.btnSaveFolder.addEventListener("click", saveFolder);
    el.btnZip.addEventListener("click", downloadZip);
    el.btnShare.addEventListener("click", startShare);
    el.btnApiPublish.addEventListener("click", apiPublish);
    el.btnSaveLibrary.addEventListener("click", saveToLibrary);
    if (!window.Insta.isTouchDevice()) el.shareHint.textContent = "PC: 이미지 저장 + 캡션 복사 후 instagram.com 이 열려요. 휴대폰에서 이 사이트를 열면 인스타그램 앱으로 바로 공유돼요.";

    // 상단
    el.btnSettings.addEventListener("click", openSettings);
    el.btnOpenSettings2.addEventListener("click", openSettings);
    el.btnLibrary.addEventListener("click", () => { renderLibrary(); el.libraryModal.showModal(); });
    el.btnNew.addEventListener("click", () => {
      if (st().cards.length && !confirm("지금 작업을 비우고 새로 만들까요?\n(브랜드 설정은 유지돼요. 지금 작업을 남기려면 먼저 보관함에 저장하세요.)")) return;
      S.reset(); renderControls(); renderAll(); setTab("create"); el.topic.focus();
    });
    document.querySelectorAll("dialog").forEach((d) => d.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]") || e.target === d) d.close();
    }));

    // 모바일 탭
    document.querySelector(".tabbar").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });

    // 반응형
    let raf = 0;
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(renderMain); };
    if ("ResizeObserver" in window) {
      new ResizeObserver(onResize).observe(el.viewport);
      let lastW = 0, graf = 0;
      new ResizeObserver((ents) => {
        const w = Math.round(ents[0].contentRect.width);
        if (!w || w === lastW) return;
        lastW = w; cancelAnimationFrame(graf); graf = requestAnimationFrame(renderDesignGrid);
      }).observe(el.designGrid);
    }
    window.addEventListener("resize", onResize);
  }

  function doUndo() { if (S.undo()) { renderControls(); renderAll(); toast("되돌렸어요."); } }
  function doRedo() { if (S.redo()) { renderControls(); renderAll(); toast("다시 적용했어요."); } }

  function setTab(tab) {
    document.body.dataset.tab = tab;
    document.querySelectorAll(".tabbar [data-tab]").forEach((b) => b.setAttribute("aria-current", String(b.dataset.tab === tab)));
    if (tab === "design") requestAnimationFrame(renderDesignGrid);
  }

  async function init() {
    bind();
    await S.init();
    // 첫 방문: 예시 카드뉴스
    if (!st().cards.length && !st().updatedAt) {
      st().category = "plants"; st().design = "garden"; st().accent = CATS.plants.accent;
      st().topic = "몬스테라 잘 키우는 법";
      const r = window.Generator.generate({ topic: st().topic, tone: st().tone, count: st().count, category: st().category });
      st().cards = r.cards;
      st().caption = window.Generator.caption(st());
      S.resetHistory();
      S.save({ noHistory: true });
    }
    setTab(document.body.dataset.tab || "create");
    renderControls();
    renderAll();
    renderFolderHint();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { renderMain(); renderThumbs(); renderDesignGrid(); });
  }

  init();
})();
