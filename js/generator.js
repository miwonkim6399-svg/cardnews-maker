/* ==========================================================
   기본 템플릿 생성기 (API 키 없이도 동작)
   - 주제 · 말투 · 카드 수로 카드 문구와 캡션을 만들어 줍니다.
   - *단어* 는 카드에서 강조색으로 표시됩니다.
   ========================================================== */
(function () {
  /* ---------- 한국어 조사 자동 선택 ---------- */
  function hasBatchim(word) {
    const s = String(word || "").trim();
    if (!s) return false;
    const ch = s[s.length - 1];
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 > 0;
    if (/[013678]/.test(ch)) return true;          // 영, 일, 삼, 육, 칠, 팔
    if (/[lmnrLMNR]/.test(ch)) return true;        // 영어 받침 소리 근사
    return false;
  }
  function isRieul(word) {
    const s = String(word || "").trim();
    const code = s.charCodeAt(s.length - 1);
    return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8;
  }
  function josa(word, type) {
    const b = hasBatchim(word);
    switch (type) {
      case "은": return word + (b ? "은" : "는");
      case "이": return word + (b ? "이" : "가");
      case "을": return word + (b ? "을" : "를");
      case "과": return word + (b ? "과" : "와");
      case "으로": return word + (b && !isRieul(word) ? "으로" : "로");
      default: return word;
    }
  }

  function fill(str, vars) {
    return str
      .replace(/\{t\}\{(은|이|을|과|으로)\}/g, (_, j) => josa(vars.t, j))
      .replace(/\{t\}/g, vars.t)
      .replace(/\{n\}/g, String(vars.n));
  }

  /* ---------- 말투별 문구 ---------- */
  const T = {
    friendly: {
      cover: {
        label: "꼭 알아두세요",
        titles: ["{t},\n*이것만* 알면 충분해요", "{t}\n*제대로* 시작하는 법", "아직 모르셨나요?\n*{t}* 핵심 정리"],
        body: "{n}장으로 쉽고 빠르게 정리했어요.\n끝까지 넘겨 보세요 👉",
      },
      why: ["WHY", "*왜* 중요할까요?", "{t}{은} 작은 차이가 큰 결과를 만들어요. 알고 시작하면 시간도, 시행착오도 확 줄일 수 있어요."],
      basics: ["BASIC", "먼저 *기본*부터\n짚어볼게요", "어렵게 생각하지 않아도 돼요. 핵심 개념 하나만 이해하면 나머지는 자연스럽게 따라와요."],
      mistake: ["MISTAKE", "많이들 하는\n*실수* 하나", "처음부터 완벽하게 하려는 욕심이 가장 큰 함정이에요. 작게 시작해서 조금씩 늘려 가는 게 훨씬 오래가요."],
      steps: ["HOW TO", "이렇게 *3단계*로\n해 보세요", "① 목표를 한 문장으로 정하기\n② 오늘 할 수 있는 것부터 하기\n③ 일주일 뒤 돌아보고 조정하기"],
      tip: ["TIP", "바로 써먹는\n*꿀팁*", "{t}{을} 일상 루틴에 붙여 보세요. 이미 하고 있는 습관 바로 뒤에 두면 잊지 않고 이어갈 수 있어요."],
      tip2: ["TIP", "꾸준함을 만드는\n*작은 장치*", "기록을 남기면 동기부여가 확실히 달라져요. 체크 표시 하나라도 쌓이면 계속하고 싶어지거든요."],
      checklist: ["CHECK", "오늘의\n*체크리스트*", "□ 목표를 정했나요?\n□ 첫 행동을 해봤나요?\n□ 기록을 남겼나요?"],
      outro: ["SAVE", "도움이 됐다면\n*저장*해 두세요!", "{t}, 필요할 때 다시 꺼내 보세요.\n팔로우하면 더 많은 꿀팁을 받아볼 수 있어요 💛"],
      caption: {
        hook: "📌 {t}, 이것만 알면 충분해요!",
        intro: "많은 분들이 궁금해하셨던 {t}, {n}장으로 쉽게 정리했어요.",
        bullet: "✔️",
        cta: "저장해 두고 필요할 때 꺼내 보세요 💛\n도움이 됐다면 좋아요 · 팔로우 부탁드려요!",
      },
    },
    pro: {
      cover: {
        label: "INSIGHT",
        titles: ["{t}\n*핵심 가이드*", "알아두면 차이가 나는\n*{t}*", "{t},\n*원리*부터 이해하기"],
        body: "꼭 필요한 내용만 {n}장에 담았습니다.",
      },
      why: ["WHY", "*왜* 중요한가", "{t}{은} 성과를 좌우하는 기본기입니다. 원리를 이해하면 상황이 달라져도 일관된 결과를 낼 수 있습니다."],
      basics: ["BASIC", "핵심 *개념* 정리", "본질은 단순합니다. 목표, 방법, 점검의 세 요소를 명확히 하는 데서 모든 것이 시작됩니다."],
      mistake: ["MISTAKE", "흔히 범하는\n*오류*", "충분한 이해 없이 방법부터 따라 하는 것입니다. 맥락을 먼저 파악해야 시행착오를 줄일 수 있습니다."],
      steps: ["PROCESS", "실행 *프로세스*", "1. 현재 상태 진단\n2. 구체적인 목표 설정\n3. 실행과 주기적 점검"],
      tip: ["TIP", "*실무* 적용 팁", "측정 가능한 지표를 하나 정하십시오. 수치로 확인할 수 있어야 개선 방향도 분명해집니다."],
      tip2: ["STRATEGY", "지속 가능한\n*운영* 전략", "한 번에 많은 변화를 시도하기보다 작은 개선을 반복하는 것이 장기적으로 더 큰 성과를 냅니다."],
      checklist: ["CHECK", "점검 *체크리스트*", "□ 목표가 구체적인가\n□ 실행 계획이 있는가\n□ 성과를 측정하고 있는가"],
      outro: ["SUMMARY", "핵심은\n*꾸준한 실행*입니다", "유익하셨다면 저장해 두고 필요할 때 다시 확인하세요.\n팔로우하시면 더 많은 인사이트를 전해 드립니다."],
      caption: {
        hook: "📊 {t} 핵심 가이드",
        intro: "{t}에 대해 꼭 알아야 할 내용을 {n}장으로 정리했습니다.",
        bullet: "▪️",
        cta: "저장해 두고 필요할 때 참고하세요.\n더 많은 인사이트는 팔로우로 받아보실 수 있습니다.",
      },
    },
    fun: {
      cover: {
        label: "꿀팁 주의 🚨",
        titles: ["{t}?\n*이거* 모르면 손해 🤯", "{t}\n*찐*으로 정리해 줌", "나만 몰랐던\n*{t}* 꿀팁 😎"],
        body: "딱 {n}장만 넘기면 끝!\n스크롤 멈추지 마 👉",
      },
      why: ["WHY", "근데 이거\n*왜* 중요함? 🤔", "{t}{은} 알고 하면 개꿀, 모르고 하면 고생길이야. 진짜 차원이 달라짐 ㄹㅇ"],
      basics: ["BASIC", "일단 *기본*부터\n알고 가자 📚", "어렵지 않아! 핵심 하나만 잡으면 나머지는 그냥 술술 풀림 ✨"],
      mistake: ["MISTAKE", "다들 여기서\n*삐끗*함 🙈", "처음부터 완벽하게 하려다 3일 만에 포기… 익숙하지? 작게 시작하는 게 국룰임"],
      steps: ["HOW TO", "따라만 해\n*3단계* 🔥", "1️⃣ 목표 딱 하나 정하기\n2️⃣ 오늘 바로 해보기\n3️⃣ 일주일 뒤 셀프 칭찬하기"],
      tip: ["TIP", "이건 진짜\n*꿀팁* 🍯", "이미 하는 습관 뒤에 붙여 봐. 양치하고 바로! 이런 식으로 하면 까먹을 일 없음 👍"],
      tip2: ["TIP", "작심삼일\n*탈출법* 💪", "기록이 답이야. 체크 하나씩 쌓이는 맛에 계속하게 됨. 이거 은근 중독임 ㅋㅋ"],
      checklist: ["CHECK", "오늘의\n*체크리스트* ✅", "□ 목표 정함?\n□ 일단 해봄?\n□ 기록 남김?"],
      outro: ["SAVE", "유익했으면\n*저장* 필수 📌", "친구한테도 공유해 줘!\n팔로우하면 이런 꿀팁 계속 떠먹여 줄게 🥄"],
      caption: {
        hook: "🤯 {t}, 이거 모르면 진짜 손해임",
        intro: "{t} 꿀팁 {n}장으로 싹 정리해 옴 ㅋㅋ",
        bullet: "👉",
        cta: "저장 안 하면 나중에 후회함 📌\n친구 태그해서 같이 보자 👀",
      },
    },
    emotional: {
      cover: {
        label: "오늘의 이야기",
        titles: ["{t},\n*천천히* 시작해도 괜찮아요", "오늘의 나를 위한\n*{t}*", "{t}{이}\n*마음*을 바꾸는 순간"],
        body: "{n}장의 이야기에\n잠시 머물러 보세요.",
      },
      why: ["WHY", "우리에게\n*필요한* 이유", "{t}{은} 결국 나를 아끼는 방법이에요. 작은 변화가 하루의 온도를 바꿔 놓으니까요."],
      basics: ["BEGIN", "시작은\n*가볍게*", "거창하지 않아도 괜찮아요. 지금 할 수 있는 만큼, 그 정도면 충분해요."],
      mistake: ["BREATHE", "너무 *애쓰지*\n않아도 돼요", "잘하려는 마음이 때로는 나를 지치게 해요. 오늘은 조금 느슨해도 괜찮아요."],
      steps: ["STEP", "작은 걸음\n*세 가지*", "하나, 나에게 맞는 속도 찾기\n둘, 오늘의 한 걸음 내딛기\n셋, 그런 나를 칭찬해 주기"],
      tip: ["DAILY", "일상에\n*스며들게*", "특별한 시간을 따로 내기보다 매일의 순간에 살짝 얹어 보세요. 어느새 익숙해져 있을 거예요."],
      tip2: ["RECORD", "기록은\n*나를 기억하는* 일", "짧은 한 줄이라도 남겨 보세요. 쌓인 기록이 언젠가 나에게 힘이 되어 줄 거예요."],
      checklist: ["QUESTION", "오늘, 나에게\n*묻는 질문*", "□ 나는 오늘 어땠나요?\n□ 작은 한 걸음을 내디뎠나요?\n□ 스스로를 다독여 주었나요?"],
      outro: ["WITH YOU", "당신의 하루를\n*응원*해요", "마음에 닿았다면 저장해 두고\n필요한 날 다시 꺼내 보세요."],
      caption: {
        hook: "🌿 {t}, 천천히 시작해도 괜찮아요",
        intro: "오늘은 {t}에 대한 이야기를 {n}장에 담아 보았어요.",
        bullet: "·",
        cta: "마음에 닿았다면 저장해 두고 필요한 날 꺼내 보세요.\n오늘도 당신의 하루를 응원해요 🤍",
      },
    },
    concise: {
      cover: {
        label: "1분 요약",
        titles: ["{t}\n*핵심 요약*", "1분 정리\n*{t}*", "{t}\n*한눈에* 보기"],
        body: "필요한 것만, {n}장 요약.",
      },
      why: ["WHY", "*왜?*", "시간 절약.\n시행착오 감소.\n결과의 차이."],
      basics: ["BASIC", "*기본* 개념", "목표 → 방법 → 점검.\n이 세 가지가 전부."],
      mistake: ["MISTAKE", "흔한 *실수*", "완벽주의로 시작.\n→ 작게 시작할 것."],
      steps: ["HOW TO", "실행 *3단계*", "1. 목표 정하기\n2. 바로 실행\n3. 주 1회 점검"],
      tip: ["TIP", "실전 *팁*", "기존 습관에 연결.\n잊지 않고 지속 가능."],
      tip2: ["TIP", "지속 *비결*", "매일 기록.\n작은 성취를 눈으로 확인."],
      checklist: ["CHECK", "*체크리스트*", "□ 목표 설정\n□ 첫 실행\n□ 기록 시작"],
      outro: ["SAVE", "*저장*하고\n다시 보기", "유용했다면 저장 · 공유.\n팔로우로 더 많은 요약 받기."],
      caption: {
        hook: "⚡ {t} 1분 요약",
        intro: "{t} 핵심만 {n}장에.",
        bullet: "-",
        cta: "저장 · 공유 · 팔로우",
      },
    },
  };

  const ANGLES_BY_CONTENT = {
    3: ["why", "steps", "tip"],
    5: ["why", "basics", "mistake", "steps", "tip"],
    7: ["why", "basics", "mistake", "steps", "tip", "tip2", "checklist"],
  };
  const ANGLE_POOL = ["why", "basics", "mistake", "steps", "tip", "tip2", "checklist"];

  function anglesFor(contentCount) {
    if (ANGLES_BY_CONTENT[contentCount]) return ANGLES_BY_CONTENT[contentCount];
    const out = [];
    for (let i = 0; i < contentCount; i++) out.push(ANGLE_POOL[i % ANGLE_POOL.length]);
    return out;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  const CAT_PICK = { 3: [0, 2, 5], 5: [0, 1, 2, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };

  function generateCategory(cat, t, n, vars) {
    const cards = [];
    const blank = (x) => ({ label: x[0], title: fill(x[1], vars), body: fill(x[2], vars), accent: "", image: "" });
    cards.push({ label: cat.cover.label, title: fill(pick(cat.cover.titles), vars), body: fill(cat.cover.body, vars), accent: "", image: "" });
    const contentCount = n - 2;
    const idx = CAT_PICK[contentCount] || Array.from({ length: contentCount }, (_, i) => i % cat.angles.length);
    idx.forEach((i) => cards.push(blank(cat.angles[i])));
    cards.push(blank(cat.outro));
    return { cards };
  }

  function generate({ topic, tone, count, category }) {
    const t = (topic || "").trim() || "나만의 주제";
    const tpl = T[tone] || T.friendly;
    const n = count || 7;
    const vars = { t, n };
    const cat = window.Categories && window.Categories[category];
    if (cat && cat.angles) return generateCategory(cat, t, n, vars);
    const cards = [];

    cards.push({
      label: tpl.cover.label,
      title: fill(pick(tpl.cover.titles), vars),
      body: fill(tpl.cover.body, vars),
      accent: "",
    });
    anglesFor(n - 2).forEach((angle) => {
      const [label, title, body] = tpl[angle];
      cards.push({ label, title: fill(title, vars), body: fill(body, vars), accent: "" });
    });
    const [ol, ot, ob] = tpl.outro;
    cards.push({ label: ol, title: fill(ot, vars), body: fill(ob, vars), accent: "" });

    return { cards };
  }

  /* ---------- 캡션 ---------- */
  const STOP_WORDS = ["방법", "하는법", "이것", "모든", "정말", "진짜"];
  const GENERIC_TAGS = ["카드뉴스", "정보공유", "꿀팁", "인스타카드뉴스", "저장필수", "알아두면좋은정보"];

  function hashtags(topic, extra) {
    const tags = [];
    const add = (w) => {
      const tag = String(w || "").replace(/[^0-9A-Za-z가-힣_]/g, "");
      if (tag.length >= 2 && tag.length <= 24 && !tags.includes(tag)) tags.push(tag);
    };
    const t = (topic || "").trim();
    // 명사로 보이는 단어만 남김: '만드는', '내리기' 같은 동사형과 '법', '방법'은 제외
    const words = t.split(/[\s,·/|]+/)
      .map((w) => w.replace(/[^0-9A-Za-z가-힣]/g, "").replace(/(을|를|의|에서|에|으로|와|과|도)$/, ""))
      .filter((w) => w.length >= 2 && !/(는|은|하기|하게|하는|기|게|법)$/.test(w) && !STOP_WORDS.includes(w));
    const compact = t.replace(/\s+/g, "");
    if (compact.length <= 10 && words.length === t.split(/\s+/).length) add(compact);
    for (let i = 0; i < words.length - 1; i++) add(words[i] + words[i + 1]); // 예: 아침+루틴 → #아침루틴
    words.forEach(add);
    (extra || []).forEach(add);
    GENERIC_TAGS.forEach(add);
    return tags.slice(0, 15).map((x) => "#" + x);
  }

  function plain(s) {
    return String(s || "").replace(/\*/g, "").replace(/\s*\n\s*/g, " ").trim();
  }

  function caption(state) {
    const tpl = (T[state.tone] || T.friendly).caption;
    const t = (state.topic || "").trim() || plain(state.cards[0] && state.cards[0].title) || "오늘의 주제";
    const vars = { t, n: state.cards.length };
    const middle = state.cards.slice(1, -1);
    const bullets = middle
      .map((c) => plain(c.title))
      .filter(Boolean)
      .map((x) => `${tpl.bullet} ${x}`)
      .join("\n");
    const cat = window.Categories && window.Categories[state.category];
    const hook = cat && cat.hook ? cat.hook : tpl.hook;
    const parts = [fill(hook, vars), fill(tpl.intro, vars)];
    if (bullets) parts.push(bullets);
    parts.push(tpl.cta);
    parts.push(hashtags(state.topic, cat ? cat.tags : []).join(" "));
    return parts.join("\n\n");
  }

  function blankCard() {
    return { label: "POINT", title: "새 카드 *제목*", body: "본문 내용을 입력하세요.", accent: "", image: "" };
  }

  window.Generator = { generate, caption, hashtags, blankCard, josa, plain };
})();
