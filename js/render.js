/* ==========================================================
   카드 렌더링 — 카드 데이터를 1080px 원본 크기의 DOM 으로 그립니다.
   미리보기/썸네일/이미지 내보내기가 모두 같은 함수를 씁니다.
   ========================================================== */
(function () {
  /* ---------- 색 유틸 ---------- */
  function hexToRgb(hex) {
    let h = String(hex || "").replace("#", "").trim();
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    if (Number.isNaN(n) || h.length !== 6) return { r: 63, g: 90, b: 74 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex({ r, g, b }) {
    return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  }
  function mix(hex, withHex, amount) {
    const a = hexToRgb(hex), b = hexToRgb(withHex);
    return rgbToHex({ r: a.r + (b.r - a.r) * amount, g: a.g + (b.g - a.g) * amount, b: a.b + (b.b - a.b) * amount });
  }
  function onColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 165 ? "#111111" : "#ffffff";
  }

  /* ---------- 텍스트 ---------- */
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  /** *강조* → <span class="hl">강조</span> */
  function richText(s) {
    return escapeHtml(s).replace(/\*([^*\n][^*]*?)\*/g, '<span class="hl">$1</span>');
  }
  const pad2 = (n) => String(n).padStart(2, "0");
  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

  function cardType(index, total) {
    if (index === 0) return "cover";
    if (index === total - 1 && total > 2) return "outro";
    return "content";
  }

  /** 디자인별 장식 글자 */
  function decoText(design, type, index) {
    if (design === "bold" && type === "content") return pad2(index);
    if (design === "journal") return "AIR MAIL";
    if (design === "book" && type === "content") return "“";
    if (design === "classic") return "❦";
    return "";
  }

  function numText(design, index) {
    if (design === "edit") return `No. ${pad2(index)}`;
    if (design === "classic" || design === "book") return ROMAN[index] || pad2(index);
    if (design === "journal") return `DAY ${pad2(index)}`;
    return pad2(index);
  }

  function swipeText(design, index, total) {
    if (index === total - 1) return design === "edit" || design === "book" || design === "classic" ? "Fin." : "♡ 저장";
    if (index === 0) return "밀어서 보기 →";
    return "→";
  }

  /**
   * 카드 DOM 생성
   * @returns {HTMLElement} 1080 x H 크기의 .card 요소
   */
  function buildCard(card, index, state) {
    const total = state.cards.length;
    const type = cardType(index, total);
    const ratio = window.Store.RATIOS[state.ratio] || window.Store.RATIOS["4:5"];
    const accent = (card.accent || state.accent || "#3f5a4a").toLowerCase();
    const font = (window.Store.FONTS || []).find((f) => f.id === state.titleFont);
    const hasImg = !!card.image;

    const el = document.createElement("div");
    el.className = [
      "card", `d-${state.design}`, `t-${type}`, ratio.cls,
      hasImg ? "has-img" : "",
      font && font.css ? `has-font font-${font.id}` : "",
      state.align === "center" ? "al-center" : state.align === "left" ? "al-left" : "",
    ].filter(Boolean).join(" ");
    el.style.width = ratio.w + "px";
    el.style.height = ratio.h + "px";
    el.style.setProperty("--accent", accent);
    el.style.setProperty("--on-accent", onColor(accent));
    el.style.setProperty("--tint1", mix(accent, "#ffffff", 0.9));
    el.style.setProperty("--tint2", mix(accent, "#ffffff", 0.76));
    el.style.setProperty("--tint3", mix(accent, "#ffffff", 0.52));
    el.style.setProperty("--shade", mix(accent, "#000000", 0.35));
    // 마지막 장 강조 상자: 이 카드만 색이 다르면 표지(전체) 색으로 맞춰 조화롭게
    const base = (state.accent || "#3f5a4a").toLowerCase();
    const hlBg = card.accent && card.accent.toLowerCase() !== base ? base : "#111111";
    el.style.setProperty("--outro-hl-bg", hlBg);
    el.style.setProperty("--outro-hl-fg", onColor(hlBg));
    el.style.setProperty("--dim",String((state.imageDim == null ? 35 : state.imageDim) / 100));
    if (font && font.css) el.style.setProperty("--title-font", font.css);

    const isContent = type === "content";
    const account = String(state.account || "").trim();
    const bg = hasImg ? `<div class="c-bg" style="background-image:url('${card.image}')"></div><div class="c-dim"></div>` : "";
    const avatarStyle = state.avatar ? ` style="background-image:url('${state.avatar}')"` : "";
    const series = state.series && String(state.series.name || "").trim();
    const seriesBadge = series && type === "cover"
      ? `<div class="c-series"><span>${escapeHtml(series)}</span><b>No. ${pad2(Math.max(1, state.series.no | 0))}</b></div>` : "";
    const sticker = card.sticker
      ? `<span class="c-sticker pos-${card.stickerPos || "tr"} sz-${card.stickerSize || "md"}">${escapeHtml(card.sticker)}</span>` : "";

    el.innerHTML =
      bg +
      `<div class="c-deco"><span class="dk1"></span><span class="dk2">${decoText(state.design, type, index)}</span><span class="dk3"></span></div>` +
      `<div class="c-top"><span class="c-label">${escapeHtml(card.label)}</span><span class="c-page">${pad2(index + 1)} / ${pad2(total)}</span></div>` +
      `<div class="c-main">` +
      seriesBadge +
      (isContent ? `<div class="c-num">${numText(state.design, index)}</div>` : "") +
      `<h2 class="c-title">${richText(card.title)}</h2>` +
      (card.body ? `<div class="c-rule"></div>` : "") +
      `<p class="c-body">${richText(card.body)}</p>` +
      `</div>` +
      `<div class="c-foot"><span class="c-acc"><span class="c-avatar${state.avatar ? " has-photo" : ""}"${avatarStyle}></span><span class="c-account">${escapeHtml(account)}</span></span><span class="c-swipe">${swipeText(state.design, index, total)}</span></div>` +
      sticker;
    return el;
  }

  /** 본문 영역이 넘치면 글자 크기를 단계적으로 줄입니다 (DOM에 붙은 뒤 호출) */
  function fitCard(el) {
    const main = el.querySelector(".c-main");
    if (!main) return;
    let fs = 1;
    el.style.setProperty("--fs", "1");
    // 아래/가운데 정렬이면 위쪽으로 넘친 부분이 scrollHeight 에 잡히지 않으므로 측정 동안 위 정렬로 바꿉니다
    const prevJustify = main.style.justifyContent;
    main.style.justifyContent = "flex-start";
    let guard = 0;
    while (main.scrollHeight > main.clientHeight + 1 && fs > 0.5 && guard < 20) {
      fs = Math.round((fs - 0.05) * 100) / 100;
      el.style.setProperty("--fs", String(fs));
      guard++;
    }
    main.style.justifyContent = prevJustify;
  }

  /**
   * holder 안에 축소된 카드 렌더링
   * @param {HTMLElement} holder .card-holder
   * @param {number} boxW 최대 가로(px)  @param {number} boxH 최대 세로(px)
   */
  function renderInto(holder, card, index, state, boxW, boxH) {
    const ratio = window.Store.RATIOS[state.ratio] || window.Store.RATIOS["4:5"];
    const scale = Math.max(0.02, Math.min(boxW / ratio.w, boxH / ratio.h));
    holder.style.width = Math.round(ratio.w * scale) + "px";
    holder.style.height = Math.round(ratio.h * scale) + "px";
    const el = buildCard(card, index, state);
    el.style.transform = `scale(${scale})`;
    holder.replaceChildren(el);
    fitCard(el);
    return el;
  }

  window.Render = { buildCard, fitCard, renderInto, richText, mix, onColor, cardType };
})();
