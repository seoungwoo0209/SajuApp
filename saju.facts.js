/* =========================================================
   사주 카페 - saju.facts.js (표현용/사실 데이터 계층)
   역할: 천간지지/지장간 원본 정보만 제공 (가중치 없음)
   ========================================================= */

/* ---------------------------
   0) 상수/매핑
----------------------------*/
const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

const WUXING_STEM = {
  "甲":"wood","乙":"wood","丙":"fire","丁":"fire","戊":"earth","己":"earth","庚":"metal","辛":"metal","壬":"water","癸":"water"
};
const WUXING_BRANCH = {
  "子":"water","丑":"earth","寅":"wood","卯":"wood","辰":"earth","巳":"fire","午":"fire","未":"earth","申":"metal","酉":"metal","戌":"earth","亥":"water"
};
const WUXING_LABEL = { wood:"목", fire:"화", earth:"토", metal:"금", water:"수" };

// 지장간 (본기/중기/여기 구분)
const HIDDEN_STEMS_BRANCH = {
  "子":["癸"],
  "丑":["己","癸","辛"],
  "寅":["甲","丙","戊"],
  "卯":["乙"],
  "辰":["戊","乙","癸"],
  "巳":["丙","庚","戊"],
  "午":["丁","己"],
  "未":["己","丁","乙"],
  "申":["庚","壬","戊"],
  "酉":["辛"],
  "戌":["戊","辛","丁"],
  "亥":["壬","甲"]
};

const CHUNG_PAIRS = [["子","午"],["丑","未"],["寅","申"],["卯","酉"],["辰","戌"],["巳","亥"]];
const HAP_L6_PAIRS = [["子","丑"],["寅","亥"],["卯","戌"],["辰","酉"],["巳","申"],["午","未"]];
const PA_PAIRS = [["子","酉"],["丑","辰"],["寅","亥"],["卯","午"],["巳","申"],["未","戌"]];
const HAE_PAIRS = [["子","未"],["丑","午"],["寅","巳"],["卯","辰"],["申","亥"],["酉","戌"]];
const HYEONG_GROUPS = [["寅","巳","申"],["丑","未","戌"],["子","卯"]];
const SELF_HYEONG = ["辰","午","酉","亥"];

/* ---------------------------
   1) 기본 함수들
----------------------------*/

function mod(n, m) { return ((n % m) + m) % m; }

function isYangStem(stem) {
  return ["甲","丙","戊","庚","壬"].includes(stem);
}

function isYangBranch(branch) {
  return ["子","寅","辰","午","申","戌"].includes(branch);
}

// 오행 생극
function elementGenerates(from, to) {
  const map = {"wood":"fire","fire":"earth","earth":"metal","metal":"water","water":"wood"};
  return map[from] === to;
}

function elementControls(from, to) {
  const map = {"wood":"earth","earth":"water","water":"fire","fire":"metal","metal":"wood"};
  return map[from] === to;
}

/* ---------------------------
   2) 지장간
----------------------------*/

function getHiddenStems(branch) {
  return HIDDEN_STEMS_BRANCH[branch] || [];
}

/* ---------------------------
   3) 십신 계산 (일간 기준)
----------------------------*/

function getTenGod(dayStem, otherStem){
  const dayElement = WUXING_STEM[dayStem];
  const otherElement = WUXING_STEM[otherStem];
  const dayYang = isYangStem(dayStem);
  const otherYang = isYangStem(otherStem);
  const sameYinYang = (dayYang === otherYang);

  if(dayElement === otherElement){
    return sameYinYang ? "比肩" : "劫財";
  }
  
  if(elementGenerates(dayElement, otherElement)){
    return sameYinYang ? "食神" : "傷官";
  }
  
  if(elementControls(dayElement, otherElement)){
    return sameYinYang ? "偏財" : "正財";
  }
  
  if(elementControls(otherElement, dayElement)){
    return sameYinYang ? "偏官" : "正官";
  }
  
  if(elementGenerates(otherElement, dayElement)){
    return sameYinYang ? "偏印" : "正印";
  }
  
  return "-";
}

/* ---------------------------
   4) 합/충/형/파/해 판정
----------------------------*/

function getRelations(branchA, branchB) {
  const relations = [];
  
  // 충
  if(CHUNG_PAIRS.some(p => (p[0]===branchA && p[1]===branchB) || (p[0]===branchB && p[1]===branchA))) {
    relations.push("충");
  }
  
  // 합
  if(HAP_L6_PAIRS.some(p => (p[0]===branchA && p[1]===branchB) || (p[0]===branchB && p[1]===branchA))) {
    relations.push("합");
  }
  
  // 형
  for(const group of HYEONG_GROUPS) {
    if(group.includes(branchA) && group.includes(branchB)) {
      relations.push("형");
      break;
    }
  }
  
  // 파
  if(PA_PAIRS.some(p => (p[0]===branchA && p[1]===branchB) || (p[0]===branchB && p[1]===branchA))) {
    relations.push("파");
  }
  
  // 해
  if(HAE_PAIRS.some(p => (p[0]===branchA && p[1]===branchB) || (p[0]===branchB && p[1]===branchA))) {
    relations.push("해");
  }
  
  return relations;
}

/* ---------------------------
   5) 60갑자 변환
----------------------------*/

function ganjiToIndex(stem, branch) {
  const si = STEMS.indexOf(stem);
  const bi = BRANCHES.indexOf(branch);
  if(si===-1 || bi===-1) return -1;
  for(let i=0; i<60; i++){
    if(mod(i,10)===si && mod(i,12)===bi) return i;
  }
  return -1;
}

function indexToGanji(idx) {
  const i = mod(idx, 60);
  const stem = STEMS[mod(i,10)];
  const branch = BRANCHES[mod(i,12)];
  return {stem, branch, ganji: stem+branch, index: i};
}

function stemBranchToGanji(stem, branch) {
  return {stem, branch, ganji: stem+branch};
}

/* ---------------------------
   Export (브라우저용)
----------------------------*/
// 브라우저 전역 객체로 노출
if(typeof window !== 'undefined') {
  window.SajuFacts = {
    STEMS,
    BRANCHES,
    WUXING_STEM,
    WUXING_BRANCH,
    WUXING_LABEL,
    HIDDEN_STEMS_BRANCH,
    CHUNG_PAIRS,
    HAP_L6_PAIRS,
    getHiddenStems,
    getTenGod,
    getRelations,
    elementGenerates,
    elementControls,
    isYangStem,
    isYangBranch,
    ganjiToIndex,
    indexToGanji,
    stemBranchToGanji,
    mod
  };
}
