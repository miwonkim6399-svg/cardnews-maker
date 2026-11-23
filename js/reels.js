/* ==========================================================
   릴스용 슬라이드 영상 만들기 (1080 x 1920, 30fps)
   - 카드를 차례로 보여 주며 부드럽게 겹쳐 넘김 + 살짝 확대(켄 번즈)
   - 브라우저 MediaRecorder 로 녹화 → MP4 (지원 안 되면 WebM)
   - 배경 음악은 인스타그램 릴스 편집 화면에서 넣는 것을 권장 (저작권 안전)
   ========================================================== */
(function () {
  const W = 1080, H = 1920, FPS = 30, FADE = 0.6;

  function pickMime() {
    const list = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
    if (typeof MediaRecorder === "undefined") return "";
    return list.find((m) => MediaRecorder.isTypeSupported(m)) || "";
  }
  const supported = () => typeof MediaRecorder !== "undefined" && !!HTMLCanvasElement.prototype.captureStream && !!pickMime();
  const isMp4 = () => pickMime().startsWith("video/mp4");

  /** 카드 한 장을 9:16 프레임용 이미지로 미리 준비 (흐린 배경 + 가운데 카드) */
  function makeFrame(cardCanvas, accent) {
    const f = document.createElement("canvas");
    f.width = W; f.height = H;
    const g = f.getContext("2d");
    // 배경: 카드를 크게 흐리게 깔고 살짝 어둡게
    g.fillStyle = accent || "#3f5a4a";
    g.fillRect(0, 0, W, H);
    if ("filter" in g) {
      g.filter = "blur(48px) saturate(1.1)";
      const s = Math.max(W / cardCanvas.width, H / cardCanvas.height) * 1.15;
      const bw = cardCanvas.width * s, bh = cardCanvas.height * s;
      g.drawImage(cardCanvas, (W - bw) / 2, (H - bh) / 2, bw, bh);
      g.filter = "none";
    }
    g.fillStyle = "rgba(0,0,0,.28)";
    g.fillRect(0, 0, W, H);
    return f;
  }

  /**
   * @param {object} state  카드뉴스 상태
   * @param {{seconds?:number, onProgress?:(msg:string)=>void}} opts
   * @returns {Promise<{blob:Blob, ext:string}>}
   */
  async function makeReel(state, opts) {
    const seconds = (opts && opts.seconds) || 3;
    const progress = (opts && opts.onProgress) || (() => {});
    if (!supported()) throw new Error("이 브라우저는 영상 만들기를 지원하지 않아요. PC의 크롬 · 엣지에서 해 주세요.");

    // 1) 카드 이미지 준비
    const cards = [], frames = [];
    for (let i = 0; i < state.cards.length; i++) {
      progress(`카드 준비 중… ${i + 1}/${state.cards.length}`);
      const c = await window.Exporter.cardCanvas(i, state);
      cards.push(c);
      frames.push(makeFrame(c, state.cards[i].accent || state.accent));
    }

    // 2) 녹화용 캔버스
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const g = out.getContext("2d");
    const mime = pickMime();
    const stream = out.captureStream(FPS);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise((resolve) => (rec.onstop = resolve));

    const n = cards.length;
    const total = n * seconds;
    const cardW = 1000;

    function drawSlide(i, t, alpha) {
      // t: 0~1 (이 슬라이드 안에서의 진행), 살짝 확대 1.00 → 1.04
      const c = cards[i];
      const zoom = 1 + 0.04 * t;
      const w = cardW * zoom, h = (c.height / c.width) * cardW * zoom;
      g.globalAlpha = alpha;
      g.drawImage(frames[i], 0, 0);
      g.save();
      g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 50; g.shadowOffsetY = 18;
      g.drawImage(c, (W - w) / 2, (H - h) / 2, w, h);
      g.restore();
      // 아래쪽 진행 점
      const dotY = (H + h) / 2 + 70;
      if (dotY < H - 60) {
        for (let k = 0; k < n; k++) {
          g.fillStyle = k === i ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.4)";
          g.beginPath(); g.arc(W / 2 + (k - (n - 1) / 2) * 30, dotY, k === i ? 7 : 5, 0, Math.PI * 2); g.fill();
        }
      }
      g.globalAlpha = 1;
    }

    function render(sec) {
      const i = Math.min(n - 1, Math.floor(sec / seconds));
      const local = (sec - i * seconds) / seconds;
      drawSlide(i, local, 1);
      // 다음 장으로 겹쳐 넘기기
      const toNext = (i + 1) * seconds - sec;
      if (i < n - 1 && toNext < FADE) drawSlide(i + 1, 0, 1 - toNext / FADE);
    }

    // 3) 실시간으로 그리면서 녹화
    render(0);
    rec.start(250);
    const start = performance.now();
    await new Promise((resolve) => {
      function tick() {
        const sec = (performance.now() - start) / 1000;
        if (sec >= total) { render(total - 0.001); resolve(); return; }
        render(sec);
        progress(`영상 녹화 중… ${Math.min(100, Math.round((sec / total) * 100))}% (창을 그대로 띄워 두세요)`);
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
    await new Promise((r) => setTimeout(r, 300));
    rec.stop();
    await done;
    stream.getTracks().forEach((t) => t.stop());
    const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
    return { blob: new Blob(chunks, { type: mime.split(";")[0] }), ext };
  }

  window.Reels = { makeReel, supported, isMp4 };
})();
