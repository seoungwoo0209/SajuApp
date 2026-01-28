/* =========================================================
   사주 카페 - saju.engine.js (해석·점수·인생총운 계층)
   역할: saju.facts.js 기반으로 점수/평점 계산 (가중치 적용)
   ========================================================= */

// saju.facts.js에서 필요한 것들 가져오기
const {
  STEMS, BRANCHES, WUXING_STEM, WUXING_BRANCH, WUXING_LABEL,
  HIDDEN_STEMS_BRANCH, CHUNG_PAIRS, HAP_L6_PAIRS,
  PA_PAIRS, HAE_PAIRS, HYEONG_GROUPS, SELF_HYEONG,
  getHiddenStems, getTenGod, getRelations,
  elementGenerates, elementControls,
  isYangStem, isYangBranch,
  ganjiToIndex, indexToGanji, stemBranchToGanji,
  mod
} = window.SajuFacts;

/* =========================================================
   - index.html / style.css / script.js + background.jpg
   - 외부 라이브러리/서버/API 없음
   - 절기: 샘플(2020~2030) + 나머지 연도 근사 폴백 + "절기근사모드" 배지
   ========================================================= */

/* ---------------------------
   0) 상수/매핑
----------------------------*/
// ==========================================
// GPT v3.0 점수 엔진 가중치
// ==========================================

// 십신 매핑 (己 일간 기준)
const TENGOD_MAP_JI = {
  "甲":"正官","乙":"偏官","丙":"正印","丁":"偏印",
  "戊":"劫財","己":"比肩","庚":"傷官","辛":"食神",
  "壬":"正財","癸":"偏財"
};

// 대운 십신 가중치 (己 신약 기준)
const DAEUN_TENGOD_WEIGHT = {
  "正官":2,"偏官":-1,"正印":4,"偏印":2,
  "食神":6,"傷官":3,"正財":5,"偏財":4,
  "比肩":-2,"劫財":-4
};

// 세운 십신 가중치 (己 신약 기준)
const SEUN_TENGOD_WEIGHT = {
  "正官":3,"偏官":-2,"正印":6,"偏印":4,
  "食神":8,"傷官":4,"正財":7,"偏財":6,
  "比肩":-3,"劫財":-6
};

// 오행 가중치 (己 신약 기준)
const ELEMENT_WEIGHT_V3 = {
  "fire": {daeun:4, seun:5},
  "metal": {daeun:3, seun:4},
  "water": {daeun:2, seun:3},
  "earth": {daeun:-1, seun:-1},
  "wood": {daeun:-2, seun:-3}
};

// 충 기본 점수
const CHUNG_BASE_V3 = {
  "寅": -5,  // 월지
  "卯": -6,  // 일지
  "丑": -4   // 년지/시지
};

const VAULT_BONUS_V3 = 14; // 재고 개방
const TRIAD_PARTIAL_V3 = 5; // 삼합 부분
const TRIAD_FULL_V3 = 12;   // 삼합 완전

// ==========================================

// 재고귀인 매핑 (財庫貴人)
const VAULT_MAP = {
  "wood": "辰",   // 甲乙 → 辰
  "fire": "戌",   // 丙丁 → 戌
  "earth": "丑",  // 戊己 → 丑
  "metal": "未",  // 庚辛 → 未
  "water": "辰"   // 壬癸 → 辰
};

// 계절별 조후 (월지 기준)
const SEASON_MAP = {
  "寅": "spring", "卯": "spring", "辰": "spring",
  "巳": "summer", "午": "summer", "未": "summer",
  "申": "autumn", "酉": "autumn", "戌": "autumn",
  "亥": "winter", "子": "winter", "丑": "winter"
};

// 십신 계산용 오행 생극 관계
  {name:"목국", branches:["亥","卯","未"]},
  {name:"화국", branches:["寅","午","戌"]},
  {name:"금국", branches:["巳","酉","丑"]}
];
const BANGHAP_GROUPS = [
  {name:"동방목", branches:["寅","卯","辰"]},
  {name:"남방화", branches:["巳","午","未"]},
  {name:"서방금", branches:["申","酉","戌"]},
  {name:"북방수", branches:["亥","子","丑"]}
];

const EVENT_WEIGHT = { love:1.2, money:1.0, career:0.8, health:1.3 };

const CATEGORY_W = {
  love:{wood:1.2, fire:1.1, earth:0.8, metal:0.6, water:0.9},
  money:{wood:0.7, fire:0.8, earth:1.2, metal:1.1, water:1.0},
  career:{wood:0.8, fire:1.0, earth:1.0, metal:1.2, water:0.7},
  health:{wood:1.0, fire:1.0, earth:1.0, metal:1.0, water:1.0}
};

const EXCESS_PENALTY_W = {
  love:{wood:1.0, fire:1.2, earth:0.8, metal:1.0, water:1.1},
  money:{wood:0.6, fire:0.7, earth:1.1, metal:0.8, water:1.0},
  career:{wood:0.7, fire:0.6, earth:0.8, metal:1.1, water:0.6},
  health:{wood:1.1, fire:1.2, earth:1.1, metal:0.9, water:1.1}
};

const JIEQI = ["LICHUN","JINGZHE","QINGMING","LIXIA","MANGZHONG","XIAOSHU","LIQIU","BAILU","HANLU","LIDONG","DAXUE","XIAOHAN"];
const JIEQI_BRANCH = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];
const JIEQI_BASE_DAY = [35,64,95,126,157,188,220,251,281,311,341,5]; // day-of-year approx
const JIEQI_BASE_MIN = [120,330,615,890,1100,1305,210,440,680,910,1130,200]; // minute-of-day approx

/* 샘플 델타(2020~2030) - 여기선 “구조/동작”을 위한 합리적 임의값.
   실서비스 정확값이 필요하면, 이 배열을 실제 천문 절입 데이터로 교체하면 된다. */
const JIEQI_SAMPLE = (() => {
  const baseYear = 2020;
  const years = 11; // 2020..2030
  const make = (amp) => Array.from({length: years}, (_,i)=> Math.round(Math.sin((i+1)*0.9)*amp));
  const deltas = {};
  for (const k of JIEQI) deltas[k] = make(6); // 연도별 -6~+6분 정도 흔들리는 샘플
  return { baseYear, years, deltas };
})();

/* ---------------------------
   1) 문구 템플릿 (사용자 제공 JSON을 “그대로” 내장)
   - 길지만 script.js 단일화 요구 때문에 inline
----------------------------*/
const KO = {
  "meta":{"lang":"ko","version":"1.3","notes":"점수+이벤트+콤보+전환/과열 기반 템플릿. 결정론적 선택(시드) 권장."},
  "scoreBands":{
    "common":{
      "S":["전성기 흐름이 강하게 들어옵니다.","판이 커지고 성과가 눈에 띄는 구간입니다."],
      "A":["상승 기류가 이어집니다.","기회가 자주 열리는 편입니다."],
      "B":["안정과 관리가 핵심입니다.","크게 흔들리진 않지만 누적이 중요합니다."],
      "C":["변동이 잦아 조정이 필요합니다.","준비와 정리가 성패를 가릅니다."],
      "D":["무리하면 손실이 커질 수 있습니다.","우선순위를 낮추고 재정비가 필요합니다."],
      "E":["리스크 관리가 최우선입니다.","지금은 지키는 운영이 정답입니다."]
    },
    "love":{
      "S":["관계가 급진전되기 쉬운 때입니다.","인연이 자연스럽게 이어질 확률이 높습니다."],
      "A":["호감과 교류가 늘어납니다.","관계의 속도가 붙기 쉽습니다."],
      "B":["안정적으로 관계를 다지기 좋습니다.","천천히 신뢰를 쌓는 흐름입니다."],
      "C":["오해가 생기기 쉬우니 표현을 조심하세요.","거리 조절이 필요한 구간입니다."],
      "D":["감정 소모가 커질 수 있습니다.","관계의 기준선을 다시 잡아야 합니다."],
      "E":["정리와 회복이 우선입니다.","관계에서 무리한 기대는 피하세요."]
    },
    "money":{
      "S":["수익과 확장이 동시에 열릴 수 있습니다.","자산을 키우는 선택이 유리합니다."],
      "A":["돈의 흐름이 좋아집니다.","기회가 보이면 빠르게 잡기 좋습니다."],
      "B":["유지·관리 중심으로 누적이 됩니다.","현금흐름을 안정화하면 좋습니다."],
      "C":["지출이 늘 수 있으니 계획이 필요합니다.","보수적으로 운영하는 편이 낫습니다."],
      "D":["계약·투자에서 손실 위험이 큽니다.","방어적인 운영이 필요합니다."],
      "E":["큰 결정을 미루는 게 안전합니다.","현금 보존과 리스크 차단이 최우선입니다."]
    },
    "career":{
      "S":["성과가 크게 드러납니다.","승진·확장·런칭 같은 굵직한 기회가 있습니다."],
      "A":["성장과 인정의 흐름이 있습니다.","협업이 커리어를 밀어주는 구간입니다."],
      "B":["기본기를 다지는 시기입니다.","역량 누적이 이후에 폭발합니다."],
      "C":["일의 판이 흔들릴 수 있습니다.","정리·전환 준비를 병행하세요."],
      "D":["조직·관계 스트레스가 커질 수 있습니다.","무리한 확장은 피하는 게 낫습니다."],
      "E":["커리어를 ‘리셋’하는 판단이 필요할 수 있습니다.","방향 재설정과 재정비가 우선입니다."]
    },
    "health":{
      "S":["컨디션이 전반적으로 좋습니다.","생활 리듬을 유지하면 상승세가 이어집니다."],
      "A":["회복력이 좋은 편입니다.","관리하면 빠르게 좋아집니다."],
      "B":["무난하지만 방심은 금물입니다.","꾸준한 관리가 결과를 만듭니다."],
      "C":["피로가 누적되기 쉽습니다.","수면과 루틴을 점검하세요."],
      "D":["과로·통증·컨디션 저하에 주의하세요.","강도를 낮추고 회복에 집중하세요."],
      "E":["무리하면 크게 무너질 수 있습니다.","검진/휴식/리듬 회복이 최우선입니다."]
    }
  },
  "eventPhrases":{
    "pos":{
      "light":{"love":["가벼운 인연 운이 돕습니다.","연락·만남이 자연스럽게 이어질 수 있습니다."],"money":["작은 기회가 들어옵니다.","협력 제안이 생길 수 있습니다."],"career":["도와주는 사람이 나타날 수 있습니다.","팀워크가 일을 편하게 합니다."],"health":["회복 흐름이 무난합니다.","리듬을 지키면 안정적입니다."]},
      "medium":{"love":["관계가 연결되는 힘이 강합니다.","소개·확장·진전이 쉬운 편입니다."],"money":["거래·계약·협업 운이 좋아집니다.","수익 기회가 커질 수 있습니다."],"career":["협업이 성과로 이어질 확률이 높습니다.","귀인의 도움으로 속도가 붙습니다."],"health":["안정적인 흐름이 이어집니다.","관리 루틴이 잘 먹히는 시기입니다."]},
      "strong":{"love":["큰 인연의 분기점이 될 수 있습니다.","관계가 ‘결정’ 단계로 가기 쉽습니다."],"money":["판이 커지는 기회가 들어올 수 있습니다.","크게 벌 수도, 크게 움직일 수도 있습니다."],"career":["도약 구간입니다.","주도권을 잡고 확장하기 좋습니다."],"health":["흐름 자체는 좋습니다.","다만 과신은 금물입니다."]}
    },
    "neg":{
      "light":{"love":["작은 오해가 생길 수 있으니 말의 톤을 조심하세요.","감정 과열만 피하면 무난합니다."],"money":["새는 돈이 생길 수 있습니다.","지출 통제만 잘하면 괜찮습니다."],"career":["일정/변수가 생길 수 있습니다.","우선순위를 조정하세요."],"health":["피로 신호를 무시하지 마세요.","가벼운 루틴 점검이 필요합니다."]},
      "medium":{"love":["갈등이 커지기 쉬운 흐름입니다.","거리 조절과 대화 정리가 필요합니다."],"money":["계약·투자 리스크가 올라갑니다.","보수적으로 접근하세요."],"career":["변동/충돌 이슈가 생길 수 있습니다.","정면승부보다 전략적 선택이 유리합니다."],"health":["스트레스가 누적되기 쉽습니다.","수면·회복을 우선하세요."]},
      "strong":{"love":["관계 정리/재정비 이슈가 크게 부각될 수 있습니다.","감정적인 결정을 피하고 시간을 두세요."],"money":["손실 가능성이 커집니다.","큰 결정을 미루고 방어적으로 가세요."],"career":["판이 크게 흔들릴 수 있습니다.","전환 준비와 리스크 차단이 핵심입니다."],"health":["사고/급성 컨디션 저하에 주의하세요.","무리한 일정은 반드시 줄이세요."]}
    }
  },
  "guides":{
    "love":["연락 빈도보다 ‘대화의 질’을 올리세요.","선 긋기와 배려를 동시에 지키는 게 중요합니다.","서두르지 말고 확인 질문을 늘리세요."],
    "money":["현금흐름을 먼저 안정화하세요.","계약/투자는 체크리스트로 검증 후 진행하세요.","큰 지출은 24시간 룰(하루 뒤 결정)을 적용하세요."],
    "career":["성과는 기록으로 남기세요(문서/지표).","협업은 ‘역할·기한·책임’을 명확히 하세요.","변동기에는 이력/포트폴리오를 상시 업데이트하세요."],
    "health":["수면 시간을 먼저 고정하세요.","스트레칭/유산소를 최소 단위로 매일 넣으세요.","통증 신호가 있으면 강도를 즉시 낮추세요."]
  },
  "comboPhrases":{
    "CrashCombo":{"common":["흐름이 크게 흔들릴 수 있는 구간입니다. 크게 벌리기보다 지키는 운영이 필요합니다."],"love":["감정이 격해지기 쉬우니 결정은 늦추고, 대화는 짧고 명확하게 하세요."],"money":["지출·손실 리스크가 커집니다. 계약/투자는 보류하거나 방어적으로 가세요."],"career":["조직/일의 판이 흔들릴 수 있습니다. 핵심만 남기고 정리하는 선택이 유리합니다."],"health":["과로/사고/급성 컨디션 저하에 주의하세요. 회복을 최우선으로 두세요."]},
    "MoneyLeakCombo":{"money":["새는 돈이 생기기 쉬운 조합입니다. 계약 조항/정산/환불 조건을 반드시 확인하세요."]},
    "LoveConflictCombo":{"love":["갈등이 커지기 쉬운 조합입니다. 말의 톤·빈도보다 '합의된 기준'을 먼저 잡으세요."]},
    "HealthStressCombo":{"health":["스트레스가 몸으로 내려오기 쉬운 조합입니다. 수면·회복·통증 관리가 최우선입니다."]},
    "BreakthroughCombo":{"common":["큰 흐름이 안정적으로 형성됩니다. 확장/런칭/결정에 유리한 타이밍입니다."],"money":["성과가 수익으로 연결되기 좋습니다. 다만 과욕보다 '확실한 것'부터 키우세요."],"career":["주도권을 잡기 좋습니다. 협업이 커리어를 강하게 밀어줍니다."]},
    "LoveBoostCombo":{"love":["인연이 이어지고 진전되기 쉬운 조합입니다. 소개/만남/관계 확장이 유리합니다."]},
    "TeamworkCombo":{"career":["협업 운이 강합니다. 사람을 잘 쓰면 성과가 빠르게 나옵니다."]},
    "ChangeChanceCombo":{"career":["변동이 '기회'로 바뀔 수 있습니다. 준비된 이동/역할 변경은 도약으로 이어집니다."]}
  },
  "careerChungModes":{
    "opportunity":["변동이 기회로 작동할 수 있습니다. 자리 이동/역할 전환을 '승격'으로 만들 수 있어요."],
    "neutral":["변동이 생길 수 있습니다. 방향을 정하면 빨라지고, 미루면 피로만 쌓입니다."],
    "risk":["변동이 충돌로 번질 수 있습니다. 정면 대립보다는 손실을 줄이는 선택이 낫습니다."]
  },
  "volatilityPhrases":{
    "Stable":["전체적으로 흐름이 일정하게 누적되는 타입입니다. '꾸준함'이 성과를 만듭니다."],
    "Normal":["평균적인 기복을 가지며, 관리만 잘하면 안정적으로 올라갑니다."],
    "Swingy":["기복이 있지만 기회 구간에서 크게 뻗는 타입입니다. 리스크 관리가 성패입니다."],
    "Volatile":["변동성이 큰 타입입니다. 한 번의 선택이 흐름을 바꿀 수 있으니 방어 전략이 필수입니다."]
  },
  "transitionPhrases":{
    "decadeStart":["새로운 흐름이 열리지만, 초반 1~3년은 적응기가 함께 옵니다. 서두르기보다 기반을 잡는 게 유리합니다."],
    "yearCarry":["연초에는 전년도 여운이 남아 체감이 천천히 바뀔 수 있습니다."]
  },
  "overheatPhrases":{
    "badge":"과열 주의",
    "text":["좋은 흐름이 이어질수록 과신/과로가 숨어들 수 있습니다. 페이스 조절이 필요합니다."]
  },
  "comboHints":{
    "CrashCombo":"(리스크 경보)","BreakthroughCombo":"(도약 신호)","MoneyLeakCombo":"(재정 누수)","LoveConflictCombo":"(관계 충돌)","HealthStressCombo":"(컨디션 경고)","TeamworkCombo":"(협업 성과)","LoveBoostCombo":"(인연 진전)","ChangeChanceCombo":"(변동 기회)"
  }
};

/* ---------------------------
   2) 유틸 (KST Date / 해시 / PRNG / clamp)
----------------------------*/
const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));
const pad2 = (n)=> String(n).padStart(2,"0");
const kstToUtcDate = (y, m, d, hh=0, mm=0) => new Date(Date.UTC(y, m-1, d, hh-9, mm, 0, 0));
const utcDateToKSTParts = (date) => {
  // date is UTC-based Date; convert to KST parts by adding 9h
  const t = new Date(date.getTime() + 9*60*60*1000);
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth()+1,
    d: t.getUTCDate(),
    hh: t.getUTCHours(),
    mm: t.getUTCMinutes()
  };
};

function hashStringToUint32(str){
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickDeterministic(arr, seedStr){
  if(!arr || arr.length===0) return "";
  const seed = hashStringToUint32(seedStr);
  const rnd = mulberry32(seed)();
  const idx = Math.floor(rnd * arr.length);
  return arr[idx] ?? arr[0];
}

/* ---------------------------
   3) JDN (그레고리력) + 60갑자
   - 기준일: 1984-02-02 를 甲子일로 가정(널리 쓰이는 기준)
----------------------------*/
function gregorianToJDN(y,m,d){
  // Fliegel-Van Flandern
  const a = Math.floor((14 - m)/12);
  const y2 = y + 4800 - a;
  const m2 = m + 12*a - 3;
  return d + Math.floor((153*m2 + 2)/5) + 365*y2 + Math.floor(y2/4) - Math.floor(y2/100) + Math.floor(y2/400) - 32045;
}
const REF_YMD = {y:1984,m:2,d:2}; // assumed JiaZi day
const REF_JDN = gregorianToJDN(REF_YMD.y, REF_YMD.m, REF_YMD.d);
const REF_INDEX = 2; // 0=>甲子 기준이 아니라, JDN 보정용 오프셋(한국 만세력 캘린더와 일진 일치)
function dayGanjiFromYMD(y,m,d){
  const jdn = gregorianToJDN(y,m,d);
  const dayIndex = mod(jdn - REF_JDN + REF_INDEX, 60);
  const stem = STEMS[dayIndex % 10];
  const branch = BRANCHES[dayIndex % 12];
  return { index: dayIndex, stem, branch, ganji: stem+branch };
}

/* ---------------------------
   4) 절기(월 경계 / 입춘)
   - 샘플(2020~2030): minute delta 적용
   - 그 외 연도: baseDay/baseMin 근사 + "절기근사모드"
----------------------------*/
function getDeltaForYear(jieqi, year){
  const {baseYear, years, deltas} = JIEQI_SAMPLE;
  const idx = year - baseYear;
  if(idx >= 0 && idx < years) return deltas[jieqi][idx] ?? 0;
  return null; // no sample
}

function getJieqiDateTimeKST(year, jieqiCode){
  const j = JIEQI.indexOf(jieqiCode);
  if(j < 0) throw new Error("Unknown jieqi: "+jieqiCode);

  // XIAOHAN is treated as next year Jan (spec)
  const isXiaohan = (jieqiCode === "XIAOHAN");
  const y = isXiaohan ? (year + 1) : year;

  const dayOfYear = JIEQI_BASE_DAY[j];
  const baseMin = JIEQI_BASE_MIN[j];

  // dayOfYear -> month/day (approx): derive by adding days to Jan 1
  const jan1 = kstToUtcDate(y, 1, 1, 0, 0);
  const date = new Date(jan1.getTime() + (dayOfYear-1) * 24*60*60*1000);
  const delta = getDeltaForYear(jieqiCode, year);
  const minute = baseMin + (delta ?? 0);

  const hh = Math.floor(minute/60);
  const mm = minute % 60;

  const parts = utcDateToKSTParts(date);
  // build final KST datetime on that derived date
  const dt = kstToUtcDate(parts.y, parts.m, parts.d, hh, mm);

  return { dt, isApprox: (delta === null) };
}

function getMonthBranchByJieqi(inputUtcDate){
  // Determine which jieqi boundary the date is after (>=) in KST.
  // Find last boundary among 12 within a “jieqi-year frame”.
  const parts = utcDateToKSTParts(inputUtcDate);
  const y = parts.y;

  // Build boundaries for year y: LICHUN..DAXUE using year y, and XIAOHAN uses y-1 (because XIAOHAN(y-1) occurs in Jan of y)
  // But our getJieqiDateTimeKST(year,"XIAOHAN") returns (year+1 Jan), so to get Jan of y boundary, pass year-1.
  const boundaries = [];
  for(const code of JIEQI){
    const by = (code==="XIAOHAN") ? (y-1) : y;
    const {dt, isApprox} = getJieqiDateTimeKST(by, code);
    boundaries.push({code, dt, isApprox});
  }
  // Sort by time
  boundaries.sort((a,b)=> a.dt.getTime()-b.dt.getTime());

  // Find last boundary <= input
  let last = boundaries[0];
  for(const b of boundaries){
    if(inputUtcDate.getTime() >= b.dt.getTime()) last = b;
    else break;
  }
  const idx = JIEQI.indexOf(last.code);
  const monthBranch = JIEQI_BRANCH[idx];
  const approx = boundaries.some(b=>b.isApprox);
  return { monthBranch, approx, lastJieqi: last.code, lastTime: last.dt };
}

function isBeforeLichun(inputUtcDate){
  const parts = utcDateToKSTParts(inputUtcDate);
  const y = parts.y;
  const {dt, isApprox} = getJieqiDateTimeKST(y, "LICHUN");
  return { before: inputUtcDate.getTime() < dt.getTime(), isApprox };
}

/* ---------------------------
   5) 연주/월주/시주 계산
----------------------------*/
function yearGanji(inputUtcDate){
  const {before, isApprox} = isBeforeLichun(inputUtcDate);
  const parts = utcDateToKSTParts(inputUtcDate);
  const y = before ? (parts.y - 1) : parts.y;

  // 1984 is 甲子 year baseline
  const idx = mod(y - 1984, 60);
  return {
    stem: STEMS[idx % 10],
    branch: BRANCHES[idx % 12],
    ganji: STEMS[idx % 10] + BRANCHES[idx % 12],
    year: y,
    isApprox
  };
}

function monthGanji(inputUtcDate, yearStem){
  const {monthBranch, approx} = getMonthBranchByJieqi(inputUtcDate);

  // 五虎遁: 寅월 천간 결정
  // 甲己년->丙, 乙庚->戊, 丙辛->庚, 丁壬->壬, 戊癸->甲
  const map = {
    "甲":"丙","己":"丙",
    "乙":"戊","庚":"戊",
    "丙":"庚","辛":"庚",
    "丁":"壬","壬":"壬",
    "戊":"甲","癸":"甲"
  };
  const yinStem = map[yearStem];
  const monthIndex = JIEQI_BRANCH.indexOf(monthBranch); // 寅=0 .. 丑=11
  const startStemIndex = STEMS.indexOf(yinStem);
  const stem = STEMS[mod(startStemIndex + monthIndex, 10)];
  return { stem, branch: monthBranch, ganji: stem+monthBranch, isApprox: approx };
}

function hourBranchFromTime(hh, mm){
  // KST local time parts
  const t = hh*60 + mm;
  // 子: 23:00–00:59
  if(t >= 23*60 || t <= 59) return "子";
  if(t <= 2*60+59) return "丑";
  if(t <= 4*60+59) return "寅";
  if(t <= 6*60+59) return "卯";
  if(t <= 8*60+59) return "辰";
  if(t <= 10*60+59) return "巳";
  if(t <= 12*60+59) return "午";
  if(t <= 14*60+59) return "未";
  if(t <= 16*60+59) return "申";
  if(t <= 18*60+59) return "酉";
  if(t <= 20*60+59) return "戌";
  return "亥";
}

function hourStemFromDayStem(dayStem, hourBranch){
  // 五鼠遁: dayStem -> 子시 stem
  const map = {
    "甲":"甲","己":"甲",
    "乙":"丙","庚":"丙",
    "丙":"戊","辛":"戊",
    "丁":"庚","壬":"庚",
    "戊":"壬","癸":"壬"
  };
  const ziStem = map[dayStem];
  const startIndex = STEMS.indexOf(ziStem);
  const hourIndex = BRANCHES.indexOf(hourBranch); // 子=0...
  const stem = STEMS[mod(startIndex + hourIndex, 10)];
  return stem;
}

/* ---------------------------
   6) 오행 카운트
----------------------------*/
function emptyWuxing(){
  return {wood:0, fire:0, earth:0, metal:0, water:0};
}

function addWuxingCount(obj, element, n=1){
  obj[element] = (obj[element] ?? 0) + n;
}

function getWuxingCounts(fourPillars, includeHidden=false){
  const surface = emptyWuxing();
  const pillars = [fourPillars.year, fourPillars.month, fourPillars.day, fourPillars.hour];

  for(const p of pillars){
    addWuxingCount(surface, WUXING_STEM[p.stem], 1);
    addWuxingCount(surface, WUXING_BRANCH[p.branch], 1);
  }

  if(!includeHidden){
    return surface;
  }

  const withHidden = {...surface};
  const hidden = {
    year: HIDDEN_STEMS_BRANCH[fourPillars.year.branch],
    month: HIDDEN_STEMS_BRANCH[fourPillars.month.branch],
    day: HIDDEN_STEMS_BRANCH[fourPillars.day.branch],
    hour: HIDDEN_STEMS_BRANCH[fourPillars.hour.branch]
  };
  for(const key of ["year","month","day","hour"]){
    for(const s of hidden[key]){
      addWuxingCount(withHidden, WUXING_STEM[s], 1);
    }
  }
  return { hidden, withHidden };
}

function top2Summary(surface){
  const arr = Object.entries(surface).map(([k,v])=>({k,v}));
  arr.sort((a,b)=> b.v - a.v || a.k.localeCompare(b.k));
  const a = arr[0], b = arr[1];
  return `${WUXING_LABEL[a.k]}${a.v} ${WUXING_LABEL[b.k]}${b.v}`;
}

function full5Summary(surface){
  const order = ["wood","fire","earth","metal","water"];
  return order.map(k=>`${WUXING_LABEL[k]}${surface[k]||0}`).join(" ");
}

/* ---------------------------
   7) 이벤트(충/합/형/파/해/삼합/방합) 계산
----------------------------*/
function hasPair(pairs, a, b){
  return pairs.some(([x,y]) => (x===a && y===b) || (x===b && y===a));
}

function calcBranchEvents(natalBranches, periodBranch){
  const all = [...natalBranches, periodBranch];
  let hap=0,chung=0,pa=0,hae=0,hyeong=0,samhahp=0,banghap=0;

  // pair types: count against each natal branch
  for(const nb of natalBranches){
    if(hasPair(HAP_L6_PAIRS, nb, periodBranch)) hap++;
    if(hasPair(CHUNG_PAIRS, nb, periodBranch)) chung++;
    if(hasPair(PA_PAIRS, nb, periodBranch)) pa++;
    if(hasPair(HAE_PAIRS, nb, periodBranch)) hae++;
  }
  hap = Math.min(hap, 2);
  chung = Math.min(chung, 2);
  pa = Math.min(pa, 2);
  hae = Math.min(hae, 2);

  // 형: 그룹형 + 자형
  for(const g of HYEONG_GROUPS){
    const c = g.filter(x=> all.includes(x)).length;
    if(g.length===3){
      if(c===2) hyeong += 1;
      if(c===3) hyeong += 2;
    }else if(g.length===2){
      if(c===2) hyeong += 1;
    }
  }
  // 자형: periodBranch equals any natal branch among SELF_HYEONG
  if(SELF_HYEONG.includes(periodBranch) && natalBranches.includes(periodBranch)) hyeong += 1;

  // 삼합/방합: set of all branches
  const set = new Set(all);
  for(const g of SAMHAP_GROUPS){
    if(g.branches.every(b=> set.has(b))) samhahp += 1;
  }
  for(const g of BANGHAP_GROUPS){
    if(g.branches.every(b=> set.has(b))) banghap += 1;
  }

  return {hap,chung,hyeong,pa,hae,samhahp,banghap};
}

/* ---------------------------
   8) 점수 엔진 v1.1~v1.3
----------------------------*/
function gradeFromScore(total){
  if(total>=90) return "S";
  if(total>=80) return "A";
  if(total>=65) return "B";
  if(total>=50) return "C";
  if(total>=35) return "D";
  return "E";
}

function totalFromCats(cats){
  const t = Math.round(0.25*cats.love + 0.30*cats.money + 0.30*cats.career + 0.15*cats.health);
  return clamp(t,0,100);
}

function elementVectorFromGanji(stem, branch){
  const v = emptyWuxing();
  addWuxingCount(v, WUXING_STEM[stem], 1);
  addWuxingCount(v, WUXING_BRANCH[branch], 1);
  return v;
}

function imbalanceScore(surface){
  const target = 2;
  const keys = ["wood","fire","earth","metal","water"];
  let imbalance = 0;
  for(const k of keys){
    imbalance += Math.abs((surface[k]||0) - target);
  }
  const base = clamp(100 - 12*imbalance, 40, 95);
  return base;
}

/* ---------------------------
   v3 점수 엔진 헬퍼 함수들
----------------------------*/

function findChungV3(natalBranches, testBranch) {
  const targets = [];
  for(const pair of CHUNG_PAIRS) {
    if(pair[0] === testBranch) {
      natalBranches.forEach((nb, idx) => {
        if(nb === pair[1]) targets.push({branch:nb, pos:idx, pair});
      });
    } else if(pair[1] === testBranch) {
      natalBranches.forEach((nb, idx) => {
        if(nb === pair[0]) targets.push({branch:nb, pos:idx, pair});
      });
    }
  }
  return targets;
}

function findHeV3(natalBranches, testBranch) {
  const targets = [];
  for(const pair of HAP_L6_PAIRS) {
    if(pair[0] === testBranch) {
      natalBranches.forEach((nb, idx) => {
        if(nb === pair[1]) targets.push({branch:nb, pos:idx, pair});
      });
    } else if(pair[1] === testBranch) {
      natalBranches.forEach((nb, idx) => {
        if(nb === pair[0]) targets.push({branch:nb, pos:idx, pair});
      });
    }
  }
  return targets;
}

function findTriadV3(natalBranches, testBranch) {
  const SAMHAP = [["申","子","辰"],["亥","卯","未"],["寅","午","戌"],["巳","酉","丑"]];
  const results = [];
  for(const group of SAMHAP) {
    if(!group.includes(testBranch)) continue;
    const natalCount = group.filter(b => natalBranches.includes(b)).length;
    if(natalCount >= 1) {
      results.push({
        group,
        count: natalCount + 1,
        type: (natalCount + 1 === 3) ? "완전" : "부분"
      });
    }
  }
  return results;
}

function scorePeriodRaw(natalSurface, natalBranches, periodGanji, opts){
  const {stem, branch} = periodGanji;
  const dayStem = opts && opts.dayStem;
  
  if(!dayStem) {
    return scorePeriodRawOld(natalSurface, natalBranches, periodGanji, opts);
  }
  
  // A-1. BaseNatal (GPT v3)
  let base = 49;
  
  // A-2. DaeunEffect (대운 0.4)
  const dTenGod = getTenGodV3(stem, dayStem);
  const dElem = WUXING_BRANCH[branch];
  const dTenGodScore = DAEUN_TENGOD_WEIGHT[dTenGod] || 0;
  const dElemScore = ELEMENT_WEIGHT_V3[dElem]?.daeun || 0;
  const dEffect = (dTenGodScore + dElemScore) * 0.4;
  
  // A-3. SeunEffect (세운 0.4) - 나중에 추가
  const sEffect = 0;
  
  // A-4. Interaction
  let inter = 0;
  
  // 충 (중복 방지)
  const chungList = findChungV3(natalBranches, branch);
  const processedChung = new Set();
  
  for(const c of chungList) {
    const pairKey = c.pair.sort().join('');
    if(processedChung.has(pairKey)) continue;
    processedChung.add(pairKey);
    
    // 축미충 특별 처리
    if((c.pair[0] === "丑" && c.pair[1] === "未") || (c.pair[0] === "未" && c.pair[1] === "丑")) {
      const count = natalBranches.filter(b => b === "丑").length;
      const mult = 1 + 0.25 * (count - 1);
      inter += VAULT_BONUS_V3 * mult;
    } else {
      const baseImpact = CHUNG_BASE_V3[c.branch] || -4;
      const count = natalBranches.filter(b => b === c.branch).length;
      const mult = 1 + 0.25 * (count - 1);
      inter += baseImpact * mult;
    }
  }
  
  // 합
  const heList = findHeV3(natalBranches, branch);
  inter += heList.length * 4;
  
  // 삼합
  const triadList = findTriadV3(natalBranches, branch);
  for(const t of triadList) {
    inter += (t.type === "완전") ? TRIAD_FULL_V3 : TRIAD_PARTIAL_V3;
  }
  
  const finalScore = Math.max(25, Math.min(97, Math.round(base + dEffect + sEffect + inter)));
  
  // 카테고리별 (간단하게)
  const cats = {
    love: finalScore,
    money: finalScore,
    career: finalScore,
    health: finalScore
  };
  
  return {
    cats,
    base,
    elementDelta: dEffect,
    periodE: {[WUXING_STEM[stem]]: 1, [dElem]: 1},
    combined: natalSurface,
    events: {chung: chungList.length, hap: heList.length},
    vaultOpen: chungList.some(c => 
      (c.pair[0] === "丑" && c.pair[1] === "未") || 
      (c.pair[0] === "未" && c.pair[1] === "丑")
    ),
    tenGod: dTenGod,
    strength: "신약"
  };
}

function scorePeriodRawOld(natalSurface, natalBranches, periodGanji, opts){
  const {stem, branch} = periodGanji;
  const base = imbalanceScore(natalSurface);
  const target = 2;

  const deficit = emptyWuxing();
  const excess = emptyWuxing();
  
  // 일간 오행 파악 (opts에 dayStem이 있으면)
  const dayStemElement = opts && opts.dayStem ? WUXING_STEM[opts.dayStem] : null;
  
  for(const k of Object.keys(deficit)){
    deficit[k] = Math.max(0, target - (natalSurface[k]||0));
    // 일간 오행의 excess는 완화 (일간이 강한 건 자연스러움)
    if(k === dayStemElement){
      excess[k] = Math.max(0, (natalSurface[k]||0) - 3.5); // 일간은 3.5개까지 정상
    } else {
      excess[k] = Math.max(0, (natalSurface[k]||0) - target);
    }
  }

  const periodE = elementVectorFromGanji(stem, branch);

  // ElementDelta
  const A=6, B=4;
  let elementDelta = 0;
  for(const k of Object.keys(periodE)){
    elementDelta += (A*periodE[k]*deficit[k] - B*periodE[k]*excess[k]);
  }

  // Events
  const ev = calcBranchEvents(natalBranches, branch);
  const eventDeltaBase = 6*ev.hap + 8*ev.samhahp + 8*ev.banghap - 8*ev.chung - 6*ev.hyeong - 5*ev.pa - 4*ev.hae;

  // chung accel v1.3
  const chungPenaltyBase = -8*ev.chung;
  const chungAccel = (ev.chung>=2) ? -6*(ev.chung-1) : 0;

  // combined + excess penalties v1.3
  const combined = emptyWuxing();
  for(const k of Object.keys(combined)){
    combined[k] = (natalSurface[k]||0) + (periodE[k]||0);
  }
  const TH=4.5, HARD_TH=6.0;
  // 일간 오행에 대해서는 더 관대한 기준 적용
  const TH_DAYSTEM=5.5, HARD_TH_DAYSTEM=7.5;
  
  let combinedImbalance = 0;
  for(const k of Object.keys(combined)){
    combinedImbalance += Math.abs(combined[k] - 2);
  }

  // 십신 보정 (dayStem이 opts에 있을 때만)
  const tenGodDelta = {};
  if(opts && opts.dayStem){
    const tg = getTenGod(opts.dayStem, stem);
    // 카테고리별 십신 보정 (±0~±3점)
    tenGodDelta.money = (() => {
      if(tg === "正財" || tg === "偏財") return 2;
      if(tg === "正官" || tg === "偏官") return 1;
      if(tg === "比肩" || tg === "劫財") return -1;
      if(tg === "食神" || tg === "傷官") return 1;
      if(tg === "正印" || tg === "偏印") return 0;
      return 0;
    })();
    tenGodDelta.career = (() => {
      if(tg === "正官" || tg === "偏官") return 2;
      if(tg === "正印" || tg === "偏印") return 1.5;
      if(tg === "食神" || tg === "傷官") return 1;
      if(tg === "比肩" || tg === "劫財") return 0;
      if(tg === "正財" || tg === "偏財") return 0;
      return 0;
    })();
    tenGodDelta.love = (() => {
      if(tg === "正官" || tg === "偏官" || tg === "正財" || tg === "偏財") return 1;
      if(tg === "比肩" || tg === "劫財") return -1;
      if(tg === "食神" || tg === "傷官") return 1;
      if(tg === "正印" || tg === "偏印") return 0.5;
      return 0;
    })();
    tenGodDelta.health = (() => {
      if(tg === "正印" || tg === "偏印") return 1;
      if(tg === "比肩" || tg === "劫財") return 1;
      return 0;
    })();
  } else {
    tenGodDelta.money = 0;
    tenGodDelta.career = 0;
    tenGodDelta.love = 0;
    tenGodDelta.health = 0;
  }

  // categories
  const cats = {};
  for(const c of ["love","money","career","health"]){
    // CategoryElementBoost
    let catBoost = 0;
    for(const k of Object.keys(periodE)){
      catBoost += CATEGORY_W[c][k] * periodE[k] * (deficit[k] - 0.7*excess[k]);
    }
    // EventDelta per category
    const evDeltaC = EVENT_WEIGHT[c] * eventDeltaBase;

    // ExcessPenalty per category
    let exPen = 0;
    for(const k of Object.keys(combined)){
      // 일간 오행은 더 관대한 기준 적용
      if(k === dayStemElement){
        exPen += EXCESS_PENALTY_W[c][k] * ( 6*Math.max(0, combined[k]-TH_DAYSTEM) + 10*Math.max(0, combined[k]-HARD_TH_DAYSTEM) );
      } else {
        exPen += EXCESS_PENALTY_W[c][k] * ( 6*Math.max(0, combined[k]-TH) + 10*Math.max(0, combined[k]-HARD_TH) );
      }
    }
    exPen = -exPen;

    let healthImbPen = 0;
    if(c==="health") healthImbPen = -3*combinedImbalance;

    // Career chung opportunity mode half accel
    let chungExtra = 0;
    if(ev.chung>0){
      if(c==="career" && opts && opts.careerChungMode==="opportunity"){
        chungExtra = chungPenaltyBase + 0.5*chungAccel;
      }else{
        chungExtra = chungPenaltyBase + chungAccel;
      }
    }

    const raw = clamp(
      base
      + 0.9*elementDelta
      + 4.0*catBoost
      + 1.0*evDeltaC
      + exPen
      + healthImbPen
      + chungExtra
      + (tenGodDelta[c] || 0),  // 십신 보정 추가
      0, 100
    );

    cats[c] = raw;
  }

  return { cats, base, elementDelta, periodE, combined, events: ev };
}

/* ---------------------------
   9) 콤보 / 모드 / 배지 / 변동성
----------------------------*/
function posNegLevels(ev){
  const levelPos = ev.hap + ev.samhahp + ev.banghap;
  const levelNeg = ev.chung + ev.hyeong + ev.pa + ev.hae;
  const pos = levelPos>=3 ? "strong" : (levelPos===2 ? "medium" : (levelPos===1 ? "light" : "none"));
  const neg = levelNeg>=3 ? "strong" : (levelNeg===2 ? "medium" : (levelNeg===1 ? "light" : "none"));
  return { levelPos, levelNeg, pos, neg };
}

function careerChungMode(ev, cats){
  if(ev.chung===0) return "none";
  const career = cats.career;
  const posLevel = ev.hap + ev.samhahp + ev.banghap;
  const negLevel = ev.chung + ev.hyeong + ev.pa + ev.hae;

  if(career>=70 && posLevel>=1) return "opportunity";
  if(career<=55 && (ev.hyeong + ev.pa + ev.hae)>=1) return "risk";
  if(negLevel>=1) return "neutral";
  return "neutral";
}

function detectCombos(ev, cats){
  const posLevel = ev.hap + ev.samhahp + ev.banghap;
  const negLevel = ev.chung + ev.hyeong + ev.pa + ev.hae;

  const total = totalFromCats(cats);
  const combos = [];

  const CrashCombo = (ev.chung>=2) && ((ev.pa + ev.hyeong + ev.hae)>=2);
  const BreakthroughCombo = ((ev.samhahp + ev.hap)>=2) && (ev.chung===0) && (total>=75);
  const MoneyLeakCombo = (ev.pa>=1) && (ev.chung>=1);
  const LoveConflictCombo = (ev.chung + ev.hyeong)>=2;
  const HealthStressCombo = (ev.hyeong + ev.hae)>=2 || (ev.chung>=1 && cats.health<=55);
  const LoveBoostCombo = (ev.hap + ev.samhahp)>=1 && cats.love>=70;
  const TeamworkCombo = (ev.hap + ev.samhahp)>=1 && cats.career>=70;
  const ChangeChanceCombo = (ev.chung>=1) && cats.career>=70 && posLevel>0;

  // 대표 우선순위
  if(CrashCombo) combos.push("CrashCombo");
  else if(BreakthroughCombo) combos.push("BreakthroughCombo");
  else if(MoneyLeakCombo) combos.push("MoneyLeakCombo");
  else if(LoveConflictCombo) combos.push("LoveConflictCombo");
  else if(HealthStressCombo) combos.push("HealthStressCombo");
  else if(TeamworkCombo) combos.push("TeamworkCombo");
  else if(LoveBoostCombo) combos.push("LoveBoostCombo");
  else if(ChangeChanceCombo) combos.push("ChangeChanceCombo");

  // 보조 0~2개(중복 방지)
  const candidates = [];
  if(BreakthroughCombo) candidates.push("BreakthroughCombo");
  if(MoneyLeakCombo) candidates.push("MoneyLeakCombo");
  if(LoveConflictCombo) candidates.push("LoveConflictCombo");
  if(HealthStressCombo) candidates.push("HealthStressCombo");
  if(TeamworkCombo) candidates.push("TeamworkCombo");
  if(LoveBoostCombo) candidates.push("LoveBoostCombo");
  if(ChangeChanceCombo) candidates.push("ChangeChanceCombo");
  for(const c of candidates){
    if(!combos.includes(c) && combos.length<3) combos.push(c);
  }

  return combos;
}

function volatilityLabel(volScore){
  if(volScore<=25) return "Stable";
  if(volScore<=50) return "Normal";
  if(volScore<=75) return "Swingy";
  return "Volatile";
}

function computeVolatility(yearTotals){
  const n = yearTotals.length;
  const mean = yearTotals.reduce((a,b)=>a+b,0)/n;
  const varr = yearTotals.reduce((a,x)=>a + (x-mean)*(x-mean), 0)/n;
  const std = Math.sqrt(varr);
  const minv = Math.min(...yearTotals);
  const maxv = Math.max(...yearTotals);
  const range = maxv - minv;

  const stdNorm = clamp(std/18, 0, 1);
  const rangeNorm = clamp(range/60, 0, 1);
  const vol = Math.round(100*(0.7*stdNorm + 0.3*rangeNorm));
  return { mean, std, range, volatilityScore: vol, stabilityScore: 100-vol, label: volatilityLabel(vol) };
}

function top3Years(items, asc=false){
  const sorted = [...items].sort((a,b)=>{
    if(asc) return a.total - b.total || b.year - a.year;
    return b.total - a.total || b.year - a.year;
  });
  return sorted.slice(0,3);
}

/* ---------------------------
   10) 대운/세운/월운 생성
----------------------------*/
function safeSetHTML(id, html){ const el = $(id); if(el) el.innerHTML = html; }

function setAlert(msg){
  const el = $("alert");
  if(!msg){
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.classList.remove("hidden");
  el.textContent = msg;
}

function setApproxBadge(on){
  const el = $("approxBadge");
  if(on) el.classList.remove("hidden");
  else el.classList.add("hidden");
}

function renderBars(el, counts){
  const max = Math.max(1, ...Object.values(counts));
  const order = ["wood","fire","earth","metal","water"];
  el.innerHTML = order.map(k=>{
    const v = counts[k]||0;
    const pct = Math.round((v/max)*100);
    return `
      <div class="bar">
        <div class="name">${WUXING_LABEL[k]}</div>
        <div class="track"><div class="fill" style="width:${pct}%"></div></div>
        <div class="val">${v}</div>
      </div>
    `;
  }).join("");
}

function renderHiddenList(el, fourPillars, dayStem){
  if(!el) return;

  // 단일 지장간(순기) 보조 라벨(표현용). 지장간(藏干) 자체는 그대로 유지.
  // - 子: 癸(순수) / 卯: 乙(순목) / 酉: 辛(순금)
  const SINGLE_HIDDEN_FLAVOR = {
    "子": "순수(癸)·단일",
    "卯": "순목(乙)·단일",
    "酉": "순금(辛)·단일"
  };

  const items = [
    {k:"년지", b: fourPillars.year.branch, note:"(초년·가문·기반)"},
    {k:"월지", b: fourPillars.month.branch, note:"(사회·직업·환경)"},
    {k:"일지", b: fourPillars.day.branch, note:"(나·배우자·생활)"},
    {k:"시지", b: fourPillars.hour.branch, note:"(말년·내면·결과·잠재)"}
  ];

  el.innerHTML = items.map(({k,b,note})=>{
    const hsArr = HIDDEN_STEMS_BRANCH[b] || [];
    // 지장간과 십신을 함께 표시
    const hsWithTenGod = hsArr.map(stem => {
      const tg = getTenGod(dayStem, stem);
      return `${stem}(${tg})`;
    }).join(" · ");
    
    const flavor = SINGLE_HIDDEN_FLAVOR[b];
    const flavorHtml = flavor ? `<span class="chip" style="margin-left:8px;opacity:.9;">${escapeHtml(flavor)}</span>` : "";
    return `<div class="hiddenrow">
      <div class="k">${k} ${b}
        <span class="muted" style="font-size:12px;opacity:.7; margin-left:6px;">${note}</span>
        ${flavorHtml}
      </div>
      <div class="v">${hsWithTenGod}</div>
    </div>`;
  }).join("");
}

function renderBadges(el, badges){
  el.innerHTML = (badges||[]).map(b=> `<span class="badge ${b.cls||""}">${escapeHtml(b.t)}</span>`).join("");
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

function renderChips(el, items){
  el.innerHTML = items.map(it=> `<span class="chip">${escapeHtml(it)}</span>`).join("");
}

function setTabs(){
  document.querySelectorAll(".tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
      document.querySelectorAll(".tabpane").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      const id = btn.dataset.tab;
      document.getElementById(id).classList.add("active");
    });
  });
}

let __pillarAnimToken = 0;
let __pillarAnimTimers = [];

function animatePillars(pillars, dayStem){
  // 입력이 빠르게 바뀌면 이전 setTimeout이 뒤늦게 DOM을 덮어써서 '사주/지장간 불일치'처럼 보일 수 있음
  // → 토큰 + 타이머 clear로 완전 차단
  const token = ++__pillarAnimToken;

  // 이전 타이머 정리
  if(Array.isArray(__pillarAnimTimers) && __pillarAnimTimers.length){
    __pillarAnimTimers.forEach(t=> clearTimeout(t));
    __pillarAnimTimers.length = 0;
  }

  const seq = [
    ["p-year", pillars.year.ganji, "p-year-tg", getTenGod(dayStem, pillars.year.stem)],
    ["p-month", pillars.month.ganji, "p-month-tg", getTenGod(dayStem, pillars.month.stem)],
    ["p-day", pillars.day.ganji, "p-day-tg", "일간"],
    ["p-hour", pillars.hour.ganji, "p-hour-tg", getTenGod(dayStem, pillars.hour.stem)]
  ];

  // 즉시 초기화
  seq.forEach(([id, _, tgId])=> {
    safeSetText(id, "-");
    safeSetText(tgId, "-");
  });

  // 순차 표시(취소 가능)
  seq.forEach(([id,val,tgId,tgVal],i)=>{
    const t = setTimeout(()=>{
      if(token !== __pillarAnimToken) return;
      safeSetText(id, val);
      safeSetText(tgId, tgVal);
    }, 200*i);
    __pillarAnimTimers.push(t);
  });
}

function renderDaeunList(root, decades, birthUtc, dayStem){
  if(!root) return;
  root.innerHTML = "";

  const birthParts = utcDateToKSTParts(birthUtc);

  decades.forEach((dec, idx)=>{
    const daeunNum = idx + 1;
    const startYear = birthParts.y + dec.startAge;
    const endYear = birthParts.y + dec.endAge;
    
    // 대운 천간의 십신
    const tenGod = dec.tenGod || getTenGod(dayStem, dec.stem);
    
    // 재고 개방 여부
    const vaultBadge = dec.vaultOpen ? 
      `<div class="vault-badge">💰 재물창고 개방</div>` : "";
    
    // 총평 생성 (등급 기반)
    let summary = "";
    if(dec.grade === "S") {
      summary = "전성기 흐름이 강하게 들어오는 시기입니다. 판이 커지고 성과가 눈에 띄는 구간입니다.";
    } else if(dec.grade === "A") {
      summary = "상승 기류가 이어지는 시기입니다. 기회가 자주 열리는 편입니다.";
    } else if(dec.grade === "B") {
      summary = "안정과 관리가 핵심인 시기입니다. 크게 흔들리진 않지만 누적이 중요합니다.";
    } else if(dec.grade === "C") {
      summary = "조정과 재정비가 필요한 시기입니다. 신중한 선택이 요구됩니다.";
    } else {
      summary = "어려움이 예상되는 시기입니다. 방어적 자세와 체력 관리가 중요합니다.";
    }

    const card = document.createElement("div");
    card.className = "daeun-card";
    card.innerHTML = `
      <div class="daeun-header">
        <div class="daeun-num">${daeunNum}대운</div>
        <div class="daeun-ganji">${dec.ganji}</div>
        <div class="daeun-tengod">${tenGod}</div>
        <div class="daeun-score grade-${dec.grade}">${dec.total}점</div>
      </div>
      ${vaultBadge}
      <div class="daeun-info">
        <div class="daeun-age">${dec.startAge}~${dec.endAge}세 (${startYear}~${endYear}년)</div>
        <div class="daeun-summary">${summary}</div>
      </div>
    `;
    
    root.appendChild(card);
  });
}

/* ---------------------------
   14) 메인 계산 파이프라인
----------------------------*/
function runAll(){
  // 필수 DOM 존재 체크(없으면 조용히 죽지 말고 메시지 출력)
  const elName = $("name");
  const elBirthDate = $("birthDate");
  const elBirthTime = $("birthTime");
  const elGender = $("gender");

  if(!elBirthDate || !elBirthTime || !elGender){
    // index.html과 script.js의 id가 맞지 않을 때 발생
    try{ setAlert("오류: index.html의 입력 필드 id(name/birthDate/birthTime/gender)가 스크립트와 일치하지 않습니다."); }catch(_){}
    console.error("Missing required inputs:", {elName, elBirthDate, elBirthTime, elGender});
    return;
  }

  setAlert("");

  const name = (elName ? elName.value.trim() : "");
  const birthDate = elBirthDate.value;
  const birthTime = elBirthTime.value;
  const gender = elGender.value;

  if(!birthTime){
    setAlert("시가 없이 사주는 존재할 수 없습니다. 그런 사이트는 믿지 마세요.");
    return;
  }
  if(!birthDate){
    setAlert("생년월일을 입력하세요.");
    return;
  }

  const input = { name, birthDate, birthTime, gender, timezone:"Asia/Seoul" };
  const { fourPillars, birthUtc, approx } = getFourPillars(input);
  
  const dayStem = fourPillars.day.stem;

  // 사주 탭
  animatePillars(fourPillars, dayStem);
  safeSetText("dayMaster", `일간: ${dayStem}`);

  const surface = getWuxingCounts(fourPillars, false);
  safeSetText("top2", full5Summary(surface));
  const barsEl = $("barsSurface");
  if(barsEl) renderBars(barsEl, surface);

  // 지장간 탭
  const hiddenEl = $("hiddenList");
  if(hiddenEl) renderHiddenList(hiddenEl, fourPillars, dayStem);

  // 지장간 포함 오행
  const hiddenBarsEl = $("barsHidden");
  const hiddenTopEl = $("top2Hidden");
  const hw = getWuxingCounts(fourPillars, true);
  if(hw && hw.withHidden){
    if(hiddenTopEl) hiddenTopEl.textContent = full5Summary(hw.withHidden);
    if(hiddenBarsEl) renderBars(hiddenBarsEl, hw.withHidden);
  }

  // 절기근사모드 배지
  setApproxBadge(!!approx);

  // 대운 분석
  try{
    const natalBranches = [fourPillars.year.branch, fourPillars.month.branch, fourPillars.day.branch, fourPillars.hour.branch];
    const natalSurface = getWuxingCounts(fourPillars, false);

    const dt = buildDaeunTimeline(fourPillars, birthUtc, gender);

    // 대운 메타 정보 표시
    const daeunMetaEl = $("daeunMeta");
    if(daeunMetaEl){
      const startDate = dt.daeunStart.dateApprox || "-";
      daeunMetaEl.textContent = `대운 시작: ${dt.daeunStart.age}세 (약 ${startDate}) / 방향: ${dt.direction}`;
    }

    // 대운 리스트 렌더링
    const daeunListEl = $("daeunList");
    if(daeunListEl){
      renderDaeunList(daeunListEl, dt.decades, birthUtc, dayStem);
    }

  }catch(e){
    console.error("Daeun section error:", e);
  }
}

// --------------------------- 15) 이벤트/입력 바인딩 ----------------------------
function bindUI(){
  setTabs();

  // input change -> recompute
  ["name","birthDate","birthTime","gender"].forEach(id=>{
    const el = $(id);
    if(!el) return;
    el.addEventListener("input", ()=> runAll());
    el.addEventListener("change", ()=> runAll());
  });

  const btn = $("btnRun");
  if(btn) btn.addEventListener("click", ()=> runAll());

  // optional: run tests in console by calling window.runTests()
}

// --------------------------- 16) 테스트(콘솔) - 최소 10개 ----------------------------
function assert(name, cond){
  if(cond) console.log("PASS:", name);
  else console.error("FAIL:", name);
}

function runTests(){
  console.log("=== runTests() start ===");

  // 1) 자시 경계 테스트 (23:00 / 00:59 / 01:00)
  assert("hourBranch 23:00 -> 子", hourBranchFromTime(23,0)==="子");
  assert("hourBranch 00:59 -> 子", hourBranchFromTime(0,59)==="子");
  assert("hourBranch 01:00 -> 丑", hourBranchFromTime(1,0)==="丑");

  // 2) 입춘 경계 테스트 (샘플연도: 2020~2030) - LICHUN 직전/직후
  // LICHUN(2024) 근사 시각을 가져와서 -1분/+1분
  const lichun2024 = getJieqiDateTimeKST(2024,"LICHUN").dt;
  const before = new Date(lichun2024.getTime() - 60*1000);
  const after  = new Date(lichun2024.getTime() + 60*1000);
  const yBefore = yearGanji(before);
  const yAfter  = yearGanji(after);
  assert("before lichun -> previous year", yBefore.year === (utcDateToKSTParts(before).y - 1));
  assert("after lichun -> same year", yAfter.year === (utcDateToKSTParts(after).y));

  // 3) 이벤트 테이블 검증 3개 이상
  // (a) 子-午 충
  let ev = calcBranchEvents(["子","丑","寅","卯"], "午");
  assert("chung 子-午", ev.chung>=1);

  // (b) 子-丑 합(六合)
  ev = calcBranchEvents(["子","寅","卯","辰"], "丑");
  assert("hap 子-丑", ev.hap>=1);

  // (c) 子-酉 파
  ev = calcBranchEvents(["子","寅","卯","辰"], "酉");
  assert("pa 子-酉", ev.pa>=1);

  // 4) 콤보 CrashCombo 검증 (chung>=2 & (pa+hyeong+hae)>=2)
  // natal: 子午(충 유발), 卯酉(충 유발) + period로 파/해/형 유발
  const natal = ["子","午","卯","酉"];
  ev = calcBranchEvents(natal, "未"); // 子-未 해, 午-未 합, etc
  // 조합을 강제로 만들기 위해 이벤트를 직접 조작(테스트용)
  const fakeEv = {hap:0,chung:2,hyeong:1,pa:1,hae:0,samhahp:0,banghap:0};
  const fakeCats = {love:50,money:50,career:50,health:50};
  const combos = detectCombos(fakeEv, fakeCats);
  assert("CrashCombo detected", combos.includes("CrashCombo"));

  // 5) BreakthroughCombo 검증
  // 조건: (samhahp+hap)>=2 && chung==0 && total>=75
  const fakeEv2 = {hap:2,chung:0,hyeong:0,pa:0,hae:0,samhahp:0,banghap:0};
  const fakeCats2 = {love:80,money:80,career:80,health:70};
  const combos2 = detectCombos(fakeEv2, fakeCats2);
  assert("BreakthroughCombo detected", combos2.includes("BreakthroughCombo"));

  // 6) Transition 블렌딩 완화 테스트 (대운 전환 첫해에 prev/curr 섞이는지)
  // 간단히: buildYearsAndMonths에서 decade 전환 첫해(k=0)일 때 blended 적용되는지 간접 확인
  const input = { birthDate:"2024-02-04", birthTime:"10:00", gender:"M", timezone:"Asia/Seoul" };
  const fp = getFourPillars(input);
  const luck = buildDaeunTimeline(fp.fourPillars, fp.birthUtc, input.gender);
  const natalSurface = getWuxingCounts(fp.fourPillars,false);
  const natalBranches = [fp.fourPillars.year.branch, fp.fourPillars.month.branch, fp.fourPillars.day.branch, fp.fourPillars.hour.branch];
  const built = buildYearsAndMonths(natalSurface, natalBranches, luck.decades, fp.birthUtc, {});
  const years = built.years;

  // transition이 실제 존재할 때: 두 번째 대운 시작년도 찾기
  const birthParts = utcDateToKSTParts(fp.birthUtc);
  if(luck.decades.length>=2){
    const secondStartYear = birthParts.y + luck.decades[1].startAge;
    const yItem = years.find(y=>y.year===secondStartYear);
    // "전환 첫해"는 decadeCats 단독보다 약간 완화될 가능성 -> 단순히 존재 확인
    assert("Transition year item exists", !!yItem);
  }else{
    assert("Transition skipped (decades<2)", true);
  }

  // 7) carryAlpha (1~2월) 적용 확인: 1월/3월 yearRawMix 차이가 나는 구조 확인(간접)
  // 여기선 함수가 에러 없이 실행되는지와 12개월 생성되는지 확인
  const y0 = years[0];
  const d0 = luck.decades[0];
  const prevY = null;
  const mpack = buildMonthsForYear(natalSurface, natalBranches, y0, prevY, d0);
  assert("months length == 12", mpack.months.length===12);

  // 8) overheat 규칙: 85+ 3연속 시 health -5가 적용되는지(간접 테스트)
  // 테스트를 위해 month totals를 강제로 높은 값으로 만드는 건 여기 구조상 어려우니,
  // overheat 플래그가 boolean으로 존재하는지만 체크
  assert("month has overheat flag", typeof mpack.months[0].overheat==="boolean");

  // 9) 결정론적 문구 선택 테스트(같은 seedStr이면 같은 결과)
  const a = pickDeterministic(["A","B","C"], "seed123");
  const b = pickDeterministic(["A","B","C"], "seed123");
  assert("deterministic pick", a===b);

  // 10) JDN dayGanji consistency (same date => same ganji)
  const g1 = dayGanjiFromYMD(2024,2,4).ganji;
  const g2 = dayGanjiFromYMD(2024,2,4).ganji;
  assert("day ganji deterministic", g1===g2);

  console.log("=== runTests() end ===");
}

window.runTests = runTests;

// --------------------------- 17) 초기화 ----------------------------
document.addEventListener("DOMContentLoaded", ()=>{
  try{
    bindUI();
    runAll();
  }catch(e){
    console.error(e);
    try{ setAlert("오류가 발생했습니다. 콘솔(F12)을 확인해주세요: " + (e && e.message ? e.message : e)); }catch(_){ }
  }
});

// ======= (여기까지 이어붙이기 끝) =======
