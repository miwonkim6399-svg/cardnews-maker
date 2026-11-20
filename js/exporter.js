/* ==========================================================
   이미지 내보내기 — 카드를 원본 해상도(가로 1080px) 이미지로 저장
   ========================================================== */
(function () {
  function slug(s) {
    const base = String(s || "").replace(/[\\/:*?"<>|\s]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    return (base || "cardnews").slice(0, 40);
  }

  async function renderCanvas(index, state) {
    if (typeof window.html2canvas !== "function") throw new Error("이미지 변환 모듈을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.");
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const stage = document.getElementById("renderStage");
    const el = window.Render.buildCard(state.cards[index], index, state);
    stage.replaceChildren(el);
    window.Render.fitCard(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    try {
      return await window.html2canvas(el, {
        scale: 1,
        width: w,
        height: h,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
    } finally {
      stage.replaceChildren();
    }
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 생성 실패"))), type, quality);
    });
  }

  /** @param {"png"|"jpeg"} format */
  async function cardBlob(index, state, format) {
    const canvas = await renderCanvas(index, state);
    return format === "jpeg" ? canvasToBlob(canvas, "image/jpeg", 0.95) : canvasToBlob(canvas, "image/png");
  }

  async function allBlobs(state, format, onProgress) {
    const out = [];
    for (let i = 0; i < state.cards.length; i++) {
      if (onProgress) onProgress(i, state.cards.length);
      out.push(await cardBlob(i, state, format));
    }
    return out;
  }

  function fileName(state, index, ext) {
    return `${slug(state.topic)}_${String(index + 1).padStart(2, "0")}.${ext}`;
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function downloadCurrent(state) {
    const i = state.active;
    downloadBlob(await cardBlob(i, state, "png"), fileName(state, i, "png"));
  }

  async function downloadZip(state, onProgress) {
    if (typeof window.JSZip !== "function") throw new Error("압축 모듈을 불러오지 못했어요.");
    const zip = new window.JSZip();
    const blobs = await allBlobs(state, "png", onProgress);
    blobs.forEach((b, i) => zip.file(fileName(state, i, "png"), b));
    if (state.caption) zip.file("caption.txt", state.caption);
    const out = await zip.generateAsync({ type: "blob" });
    downloadBlob(out, `${slug(state.topic)}_카드뉴스.zip`);
  }

  window.Exporter = { cardBlob, allBlobs, fileName, downloadBlob, downloadCurrent, downloadZip, slug };
})();
