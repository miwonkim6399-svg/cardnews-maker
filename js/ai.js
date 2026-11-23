/* ==========================================================
   Claude AI 작성 (선택)
   - 설정에 Anthropic API 키를 넣으면 주제에 맞는 실제 내용으로 카드를 작성합니다.
   - 공식 TypeScript/JavaScript SDK(@anthropic-ai/sdk)를 브라우저에서 불러와 사용합니다.
   - 키는 사용자의 브라우저에만 저장되고 api.anthropic.com 으로만 전송됩니다.
   ========================================================== */
(function () {
  const SDK_URL = "https://esm.sh/@anthropic-ai/sdk@1.4.0";
  const MODEL = "claude-opus-5-5";

  const TONE_GUIDE = {
    friendly: "친근한 해요체. 다정하고 쉬운 표현, 이모지는 가끔만.",
    pro: "전문적인 합니다체. 신뢰감 있고 정확한 표현, 이모지 사용하지 않음.",
    fun: "유머러스한 반말. 밈·인터넷 말투와 이모지를 적절히 섞어 재치 있게.",
    emotional: "감성적인 해요체. 따뜻하고 위로가 되는 문장, 여운이 남게.",
    concise: "간결한 개조식. 명사형 종결, 짧은 줄 단위, 군더더기 없이.",
  };

  const CARD_SCHEMA = {
    type: "object",
    properties: {
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            title: { type: "string" },
            body: { type: "string" },
          },
          required: ["label", "title", "body"],
          additionalProperties: false,
        },
      },
      caption: { type: "string" },
      hashtags: { type: "array", items: { type: "string" } },
    },
    required: ["cards", "caption", "hashtags"],
    additionalProperties: false,
  };

  const CAPTION_SCHEMA = {
    type: "object",
    properties: {
      caption: { type: "string" },
      hashtags: { type: "array", items: { type: "string" } },
    },
    required: ["caption", "hashtags"],
    additionalProperties: false,
  };

  const SYSTEM = [
    "당신은 한국어 인스타그램 카드뉴스 전문 에디터입니다.",
    "피드에서 스크롤을 멈추게 하는 표지, 한 장에 한 가지 메시지, 저장하고 싶어지는 실용적인 내용을 씁니다.",
    "사실이 불확실한 수치나 통계는 지어내지 말고, 일반적으로 검증된 정보와 실천 팁 위주로 작성합니다.",
  ].join("\n");

  let sdkPromise = null;
  function loadSdk() {
    if (!sdkPromise) {
      sdkPromise = import(SDK_URL).then((m) => m.default || m.Anthropic).catch((e) => {
        sdkPromise = null;
        throw new Error("AI 모듈을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.");
      });
    }
    return sdkPromise;
  }

  async function callClaude(prompt, schema, maxTokens) {
    const apiKey = (window.Store.settings.apiKey || "").trim();
    if (!apiKey) throw new Error("설정에서 Anthropic API 키를 먼저 입력해 주세요.");
    const Anthropic = await loadSdk();
    // 사용자가 자기 키를 자기 브라우저에서 쓰는 구조이므로 브라우저 호출을 명시적으로 허용합니다.
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

    let response;
    try {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: maxTokens || 16000,
        system: SYSTEM,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default", // 안전 분류기가 거절하면 서버가 적절한 모델로 자동 재시도
        output_config: {
          effort: "medium",
          format: { type: "json_schema", schema },
        },
        messages: [{ role: "user", content: prompt }],
      });
    } catch (err) {
      throw new Error(friendlyError(Anthropic, err));
    }

    if (response.stop_reason === "refusal") {
      throw new Error("이 주제로는 AI가 작성을 거절했어요. 주제를 바꾸거나 기본 템플릿을 사용해 주세요.");
    }
    if (response.stop_reason === "max_tokens") {
      throw new Error("응답이 너무 길어 중간에 끊겼어요. 다시 시도해 주세요.");
    }
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error("AI 응답을 해석하지 못했어요. 다시 시도해 주세요.");
    }
  }

  function friendlyError(Anthropic, err) {
    if (Anthropic.AuthenticationError && err instanceof Anthropic.AuthenticationError) return "API 키가 올바르지 않아요. 설정에서 키를 확인해 주세요.";
    if (Anthropic.PermissionDeniedError && err instanceof Anthropic.PermissionDeniedError) return "이 API 키로는 해당 모델을 사용할 권한이 없어요.";
    if (Anthropic.RateLimitError && err instanceof Anthropic.RateLimitError) return "요청이 많아 잠시 제한되었어요. 잠시 후 다시 시도해 주세요.";
    if (Anthropic.BadRequestError && err instanceof Anthropic.BadRequestError) return "요청 형식 오류: " + (err.message || "");
    if (Anthropic.APIConnectionError && err instanceof Anthropic.APIConnectionError) return "Anthropic 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.";
    if (Anthropic.APIError && err instanceof Anthropic.APIError) return `AI 서버 오류(${err.status || "?"}): 잠시 후 다시 시도해 주세요.`;
    return (err && err.message) || "알 수 없는 오류가 발생했어요.";
  }

  function normalizeTags(tags) {
    return (tags || [])
      .map((t) => "#" + String(t).replace(/^#+/, "").replace(/\s+/g, ""))
      .filter((t) => t.length > 1)
      .slice(0, 15);
  }

  async function generate({ topic, tone, count, category }) {
    const contentCount = count - 2;
    const cat = window.Categories && window.Categories[category];
    const prompt = [
      `주제: ${topic}`,
      cat && category !== "general" ? `분야: ${cat.name} (이 분야를 좋아하는 40~60대 독자에게 고상하고 신뢰감 있게)` : "",
      `말투: ${TONE_GUIDE[tone] || TONE_GUIDE.friendly}`,
      `카드 수: 정확히 ${count}장 (1장 표지 + ${contentCount}장 본문 + 1장 마무리)`,
      "",
      "작성 규칙:",
      "- cards 배열 길이는 반드시 " + count + "개.",
      "- 1번 카드(표지): 호기심을 자극하는 제목, body는 한두 줄 부제.",
      "- 본문 카드: 한 장에 핵심 메시지 하나. 순서대로 읽으면 흐름이 이어지게.",
      "- 마지막 카드: 핵심 요약 한 줄 + 저장·팔로우 유도.",
      "- label: 영문 대문자 또는 짧은 한글 2~10자 (예: WHY, TIP, STEP 1, 체크).",
      "- title: 공백 포함 24자 이내, 필요하면 \\n 으로 2줄. 가장 중요한 단어 하나를 *별표*로 감싸 강조.",
      "- body: 공백 포함 90자 이내, 2~3문장 또는 3줄 이하의 목록(줄바꿈 \\n).",
      "- caption: 인스타그램 게시글 캡션. 첫 줄 훅, 핵심 요약 3~5줄, 저장·공유 유도 문장. 해시태그는 넣지 말 것.",
      "- hashtags: 주제 관련 한국어 해시태그 10~15개 (# 없이 단어만).",
    ].filter((line) => line !== null).join("\n");

    const data = await callClaude(prompt, CARD_SCHEMA, 16000);
    let cards = (data.cards || []).map((c) => ({
      label: String(c.label || "").trim(),
      title: String(c.title || "").replace(/\\n/g, "\n").trim(),
      body: String(c.body || "").replace(/\\n/g, "\n").trim(),
      accent: "",
      image: "",
    }));
    if (cards.length > count) cards = cards.slice(0, count);
    while (cards.length < count) cards.splice(cards.length - 1, 0, window.Generator.blankCard());
    const tags = normalizeTags((data.hashtags || []).concat(cat && cat.tags ? cat.tags.slice(0, 4) : []));
    const caption = [String(data.caption || "").trim(), [...new Set(tags)].slice(0, 15).join(" ")].filter(Boolean).join("\n\n");
    return { cards, caption };
  }

  async function writeCaption(state) {
    const outline = state.cards
      .map((c, i) => `${i + 1}. [${c.label}] ${window.Generator.plain(c.title)} — ${window.Generator.plain(c.body)}`)
      .join("\n");
    const prompt = [
      `주제: ${state.topic || "(카드 내용 참고)"}`,
      `말투: ${TONE_GUIDE[state.tone] || TONE_GUIDE.friendly}`,
      "아래 카드뉴스에 어울리는 인스타그램 캡션을 써 주세요.",
      "첫 줄은 훅, 이어서 핵심 요약 3~5줄(이모지 불릿 가능), 마지막에 저장·공유·팔로우 유도. 해시태그는 caption에 넣지 말고 hashtags에 10~15개.",
      "",
      outline,
    ].join("\n");
    const data = await callClaude(prompt, CAPTION_SCHEMA, 4000);
    return [String(data.caption || "").trim(), normalizeTags(data.hashtags).join(" ")].filter(Boolean).join("\n\n");
  }

  window.AI = { generate, writeCaption, hasKey: () => !!(window.Store.settings.apiKey || "").trim() };
})();
