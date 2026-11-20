/* ==========================================================
   인스타그램 올리기
   1) 모바일: 시스템 공유창 → Instagram (여러 장 = 캐러셀), 캡션 자동 복사
   2) PC: 이미지 저장 + 캡션 복사 + instagram.com 열기
   3) 자동 게시: Instagram Graph API (비즈니스/크리에이터 계정)
      카드 JPEG → imgbb(공개 URL) → 캐러셀 컨테이너 → 게시
   ========================================================== */
(function () {
  /* ---------- 클립보드 ---------- */
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* 아래 대체 방법 사용 */ }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  /* ---------- 공유 (모바일) ---------- */
  function isTouchDevice() {
    return window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  }

  async function prepareFiles(state, onProgress) {
    const blobs = await window.Exporter.allBlobs(state, "jpeg", onProgress);
    return blobs.map((b, i) => new File([b], window.Exporter.fileName(state, i, "jpg"), { type: "image/jpeg" }));
  }

  function canShareFiles(files) {
    try {
      return !!(navigator.canShare && navigator.share && navigator.canShare({ files }));
    } catch (e) {
      return false;
    }
  }

  /** 사용자 탭 직후 호출해야 함 (브라우저 정책) */
  async function shareFiles(files, caption) {
    if (caption) copyText(caption); // await 하지 않음: 공유창 호출 권한(사용자 제스처)을 유지하기 위해
    await navigator.share({ files });
  }

  /* ---------- Graph API 자동 게시 ---------- */
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1]);
      r.onerror = () => reject(new Error("이미지 변환 실패"));
      r.readAsDataURL(blob);
    });
  }

  async function uploadImgbb(blob, key, name) {
    const fd = new FormData();
    fd.append("image", await blobToBase64(blob));
    fd.append("name", name);
    const res = await fetch("https://api.imgbb.com/1/upload?key=" + encodeURIComponent(key), { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.data || !json.data.url) {
      const msg = (json.error && json.error.message) || res.status;
      throw new Error("imgbb 업로드 실패: " + msg);
    }
    return json.data.url;
  }

  function graphBase(settings) {
    const ver = (settings.graphVersion || "v22.0").trim().replace(/^\/?/, "");
    const host = /^IG/.test(settings.igToken.trim()) ? "https://graph.instagram.com" : "https://graph.facebook.com";
    return `${host}/${ver}`;
  }

  async function graphPost(base, path, params) {
    const res = await fetch(`${base}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) throw new Error((json.error && json.error.message) || `Graph API 오류 (${res.status})`);
    return json;
  }

  async function graphGet(base, path, params) {
    const res = await fetch(`${base}/${path}?${new URLSearchParams(params).toString()}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) throw new Error((json.error && json.error.message) || `Graph API 오류 (${res.status})`);
    return json;
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitFinished(base, id, token, log) {
    for (let i = 0; i < 30; i++) {
      const s = await graphGet(base, id, { fields: "status_code", access_token: token });
      if (s.status_code === "FINISHED") return;
      if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error("Instagram이 미디어 처리에 실패했어요 (" + s.status_code + ")");
      if (i === 3) log("Instagram에서 이미지를 처리하는 중… 잠시만요");
      await wait(2500);
    }
    throw new Error("처리 시간이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.");
  }

  function validateForApi(state, settings) {
    const missing = [];
    if (!settings.igToken.trim()) missing.push("액세스 토큰");
    if (!settings.igUserId.trim()) missing.push("Instagram 비즈니스 계정 ID");
    if (!settings.imgbbKey.trim()) missing.push("imgbb API 키");
    if (missing.length) return "설정에서 " + missing.join(", ") + "을(를) 입력해 주세요.";
    if (state.ratio === "9:16") return "9:16은 피드 게시물에 사용할 수 없어요. 1:1 또는 4:5로 바꿔 주세요.";
    if (state.cards.length < 2 || state.cards.length > 10) return "캐러셀은 2~10장까지 게시할 수 있어요.";
    return "";
  }

  /**
   * @param {(msg:string, kind?:"ok"|"err")=>void} log
   * @returns {Promise<string|null>} 게시물 링크
   */
  async function publishViaApi(state, settings, log) {
    const base = graphBase(settings);
    const token = settings.igToken.trim();
    const igId = settings.igUserId.trim();

    log(`카드 ${state.cards.length}장을 JPEG로 변환하는 중…`);
    const blobs = await window.Exporter.allBlobs(state, "jpeg");
    log("이미지 변환 완료", "ok");

    const urls = [];
    for (let i = 0; i < blobs.length; i++) {
      log(`이미지 업로드 ${i + 1}/${blobs.length}`);
      urls.push(await uploadImgbb(blobs[i], settings.imgbbKey.trim(), window.Exporter.fileName(state, i, "jpg").replace(/\.jpg$/, "")));
    }
    log("이미지 업로드 완료", "ok");

    const children = [];
    for (let i = 0; i < urls.length; i++) {
      log(`캐러셀 항목 등록 ${i + 1}/${urls.length}`);
      const r = await graphPost(base, `${igId}/media`, { image_url: urls[i], is_carousel_item: "true", access_token: token });
      children.push(r.id);
    }
    for (const id of children) await waitFinished(base, id, token, log);
    log("캐러셀 항목 등록 완료", "ok");

    log("게시물 묶음 생성 중…");
    const carousel = await graphPost(base, `${igId}/media`, {
      media_type: "CAROUSEL",
      children: children.join(","),
      caption: state.caption || "",
      access_token: token,
    });
    await waitFinished(base, carousel.id, token, log);

    log("게시 중…");
    const pub = await graphPost(base, `${igId}/media_publish`, { creation_id: carousel.id, access_token: token });
    let link = null;
    try {
      const info = await graphGet(base, pub.id, { fields: "permalink", access_token: token });
      link = info.permalink || null;
    } catch (e) { /* 링크 조회 실패는 무시 */ }
    log("게시 완료! 🎉", "ok");
    return link;
  }

  window.Insta = { copyText, isTouchDevice, prepareFiles, canShareFiles, shareFiles, validateForApi, publishViaApi };
})();
