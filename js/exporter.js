/* ==========================================================
   이미지 내보내기 — 카드를 원본 해상도(가로 1080px) 이미지로 저장
   - PNG 한 장 / ZIP / 내 컴퓨터 폴더에 바로 저장 (크롬 · 엣지)
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
      return await window.html2canvas(el, { scale: 1, width: w, height: h, backgroundColor: "#ffffff", useCORS: true, logging: false });
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

  /** 보관함 썸네일용 작은 JPEG dataURL */
  async function thumbDataUrl(state) {
    const canvas = await renderCanvas(0, state);
    const t = document.createElement("canvas");
    t.width = 216; t.height = Math.round(216 * canvas.height / canvas.width);
    t.getContext("2d").drawImage(canvas, 0, 0, t.width, t.height);
    return t.toDataURL("image/jpeg", 0.8);
  }

  async function allBlobs(state, format, onProgress) {
    const out = [];
    for (let i = 0; i < state.cards.length; i++) {
      if (onProgress) onProgress(i, state.cards.length);
      out.push(await cardBlob(i, state, format));
    }
    return out;
  }

  /** [파일명, 내용] 목록 — 분리 모드면 캡션.txt + 첫댓글_해시태그.txt */
  function captionFiles(state) {
    if (!state.caption) return [];
    if (!state.splitTags) return [["캡션.txt", state.caption]];
    const { body, tags } = window.Generator.splitCaption(state.caption);
    const out = [["캡션.txt", body]];
    if (tags) out.push(["첫댓글_해시태그.txt", tags]);
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
    captionFiles(state).forEach(([name, text]) => zip.file(name, text));
    const out = await zip.generateAsync({ type: "blob" });
    downloadBlob(out, `${slug(state.topic)}_카드뉴스.zip`);
  }

  /* ---------- 내 컴퓨터 폴더에 바로 저장 (File System Access API) ---------- */
  const folderSupported = () => typeof window.showDirectoryPicker === "function";

  async function getFolder() {
    try { return (await window.Store.kv.get("folder")) || null; } catch (e) { return null; }
  }

  /** 버튼 클릭 안에서 호출 (권한 요청에 사용자 동작이 필요) */
  async function pickFolder() {
    const handle = await window.showDirectoryPicker({ id: "cardnews-save", mode: "readwrite", startIn: "desktop" });
    await window.Store.kv.set("folder", handle);
    return handle;
  }

  async function ensurePermission(handle) {
    const opts = { mode: "readwrite" };
    if ((await handle.queryPermission(opts)) === "granted") return true;
    return (await handle.requestPermission(opts)) === "granted";
  }

  async function writeFile(dir, name, data) {
    const fh = await dir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(data);
    await w.close();
  }

  /**
   * 연결된 폴더 안에 「날짜_주제」 폴더를 만들고 카드 PNG + 캡션.txt 저장
   * @returns {Promise<string>} "연결폴더/만든폴더" 표시용 경로
   */
  async function projectDir(state) {
    let root = await getFolder();
    if (!root) root = await pickFolder();
    if (!(await ensurePermission(root))) throw new Error("폴더에 저장할 권한이 없어요. 다시 폴더를 연결해 주세요.");
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const folderName = `${date}_${slug(state.topic)}`;
    return { dir: await root.getDirectoryHandle(folderName, { create: true }), where: `${root.name}/${folderName}` };
  }

  async function saveToFolder(state, onProgress) {
    const { dir, where } = await projectDir(state);
    const blobs = await allBlobs(state, "png", onProgress);
    for (let i = 0; i < blobs.length; i++) await writeFile(dir, fileName(state, i, "png"), blobs[i]);
    for (const [name, text] of captionFiles(state)) await writeFile(dir, name, new Blob([text], { type: "text/plain;charset=utf-8" }));
    return where;
  }

  /** 릴스 영상 같은 추가 파일을 같은 작품 폴더에 저장 */
  async function saveExtraToFolder(state, name, blob) {
    const { dir, where } = await projectDir(state);
    await writeFile(dir, name, blob);
    return `${where}/${name}`;
  }

  window.Exporter = {
    cardBlob, allBlobs, fileName, downloadBlob, downloadCurrent, downloadZip, slug, thumbDataUrl,
    folderSupported, getFolder, pickFolder, saveToFolder, saveExtraToFolder, cardCanvas: renderCanvas,
  };
})();
