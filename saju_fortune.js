/* =========================================================
   사주 총운 해석 엔진 (saju_fortune.js)
   - window.SajuResult에서 계산된 데이터를 읽음
   - 일간/오행/대운 기반 총운 해석 제공
   - Gemini 정교화: 용신/십신/천간관계/신강신약 모두 반영
   ========================================================= */

/* ---------------------------
   0-1) 필요한 상수 (saju_core.js에서 가져옴)
----------------------------*/
const WUXING_STEM = {
  "甲":"wood","乙":"wood","丙":"fire","丁":"fire","戊":"earth","己":"earth","庚":"metal","辛":"metal","壬":"water","癸":"water"
};
const WUXING_BRANCH = {
  "子":"water","丑":"earth","寅":"wood","卯":"wood","辰":"earth","巳":"fire","午":"fire","未":"earth","申":"metal","酉":"metal","戌":"earth","亥":"water"
};
const WUXING_GENERATES = {
  wood: "fire",
  fire: "earth", 
  earth: "metal",
  metal: "water",
  water: "wood"
};
const WUXING_CONTROLS = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire"
};

// getShishen 함수 (saju_core.js에 있지만 여기서도 필요)
function getShishen(dayStem, targetStem) {
  const dayWuxing = WUXING_STEM[dayStem];
  const dayYinyang = (["甲","丙","戊","庚","壬"].includes(dayStem)) ? "yang" : "yin";
  const targetWuxing = WUXING_STEM[targetStem];
  const targetYinyang = (["甲","丙","戊","庚","壬"].includes(targetStem)) ? "yang" : "yin";
  
  if (!dayWuxing || !targetWuxing) return null;
  const sameYinyang = (dayYinyang === targetYinyang);
  
  if (dayWuxing === targetWuxing) return sameYinyang ? "比肩" : "劫財";
  if (WUXING_GENERATES[dayWuxing] === targetWuxing) return sameYinyang ? "食神" : "傷官";
  if (WUXING_CONTROLS[dayWuxing] === targetWuxing) return sameYinyang ? "偏財" : "正財";
  if (WUXING_CONTROLS[targetWuxing] === dayWuxing) return sameYinyang ? "偏官" : "正官";
  if (WUXING_GENERATES[targetWuxing] === dayWuxing) return sameYinyang ? "偏印" : "正印";
  
  return null;
}

/* ---------------------------
   0-2) 문구 템플릿 (대운 총운용)
----------------------------*/
const FORTUNE_TEMPLATES = {
  "meta": {
    "lang": "ko",
    "version": "1.4",
    "notes": "대운 중심 총운 해석"
  },
  
  "dayMasterFortune": {
    "甲": {
      "title": "갑목(甲木) 일간",
      "trait": "곧게 뻗어 나가는 큰 나무의 기운",
      "strength": "추진력, 리더십, 정직함",
      "weakness": "융통성 부족, 고집",
      "advice": "유연함을 갖추면 더 큰 성장이 가능합니다."
    },
    "乙": {
      "title": "을목(乙木) 일간",
      "trait": "섬세하고 유연한 풀과 덩굴의 기운",
      "strength": "적응력, 협상력, 섬세함",
      "weakness": "우유부단, 의존성",
      "advice": "중심을 잡고 주도적으로 나아가는 연습이 필요합니다."
    },
    "丙": {
      "title": "병화(丙火) 일간",
      "trait": "밝고 뜨거운 태양의 기운",
      "strength": "열정, 외향성, 영향력",
      "weakness": "성급함, 감정 기복",
      "advice": "차분함을 유지하면 지속적인 성과를 낼 수 있습니다."
    },
    "丁": {
      "title": "정화(丁火) 일간",
      "trait": "따뜻하고 섬세한 촛불의 기운",
      "strength": "통찰력, 예술성, 배려심",
      "weakness": "예민함, 소심함",
      "advice": "자신감을 키우고 담대하게 표현하는 것이 중요합니다."
    },
    "戊": {
      "title": "무토(戊土) 일간",
      "trait": "든든하고 포용력 있는 산의 기운",
      "strength": "안정감, 신뢰감, 포용력",
      "weakness": "느림, 변화 회피",
      "advice": "때로는 과감한 변화와 도전이 필요합니다."
    },
    "己": {
      "title": "기토(己土) 일간",
      "trait": "비옥하고 생산적인 밭의 기운",
      "strength": "실용성, 계획성, 포용력",
      "weakness": "걱정 과다, 소극적",
      "advice": "자신의 가치를 믿고 적극적으로 나서는 것이 중요합니다."
    },
    "庚": {
      "title": "경금(庚金) 일간",
      "trait": "강하고 날카로운 쇠의 기운",
      "strength": "결단력, 추진력, 정의감",
      "weakness": "냉정함, 융통성 부족",
      "advice": "따뜻함과 배려를 더하면 더 큰 리더가 될 수 있습니다."
    },
    "辛": {
      "title": "신금(辛金) 일간",
      "trait": "세련되고 정교한 보석의 기운",
      "strength": "섬세함, 분석력, 완벽주의",
      "weakness": "자존심, 비판적 성향",
      "advice": "불완전함을 받아들이고 과정을 즐기는 여유가 필요합니다."
    },
    "壬": {
      "title": "임수(壬水) 일간",
      "trait": "넓고 깊은 바다의 기운",
      "strength": "포용력, 유연성, 지혜",
      "weakness": "우유부단, 산만함",
      "advice": "목표를 명확히 하고 집중력을 키우는 것이 중요합니다."
    },
    "癸": {
      "title": "계수(癸水) 일간",
      "trait": "맑고 섬세한 이슬과 샘물의 기운",
      "strength": "직관력, 섬세함, 순수함",
      "weakness": "소극적, 의존적",
      "advice": "자신의 의견을 당당히 펼치는 용기가 필요합니다."
    }
  },
  
  "wuxingBalance": {
    "balanced": {
      "summary": "오행 균형이 잘 잡혀 있습니다",
      "detail": "전반적으로 안정적인 운세를 가지고 있으며, 큰 기복 없이 꾸준한 발전이 가능합니다."
    },
    "wood_excess": {
      "summary": "목(木) 기운이 강합니다",
      "detail": "추진력과 성장 욕구가 강하지만, 때로는 고집과 융통성 부족으로 어려움을 겪을 수 있습니다."
    },
    "fire_excess": {
      "summary": "화(火) 기운이 강합니다",
      "detail": "열정과 창의력이 뛰어나지만, 성급함과 감정 기복으로 인한 소진에 주의가 필요합니다."
    },
    "earth_excess": {
      "summary": "토(土) 기운이 강합니다",
      "detail": "안정감과 포용력이 있지만, 변화에 대한 저항과 느린 속도가 때로는 기회 상실로 이어질 수 있습니다."
    },
    "metal_excess": {
      "summary": "금(金) 기운이 강합니다",
      "detail": "결단력과 추진력이 강하지만, 냉정함과 융통성 부족으로 인간관계에서 어려움을 겪을 수 있습니다."
    },
    "water_excess": {
      "summary": "수(水) 기운이 강합니다",
      "detail": "유연성과 적응력이 뛰어나지만, 우유부단함과 일관성 부족이 문제가 될 수 있습니다."
    },
    "wood_lack": {
      "summary": "목(木) 기운이 부족합니다",
      "detail": "추진력과 성장 동력이 약할 수 있으니, 적극적인 도전과 새로운 시도가 필요합니다."
    },
    "fire_lack": {
      "summary": "화(火) 기운이 부족합니다",
      "detail": "열정과 표현력이 약할 수 있으니, 적극적인 자기표현과 소통이 중요합니다."
    },
    "earth_lack": {
      "summary": "토(土) 기운이 부족합니다",
      "detail": "안정감이 부족할 수 있으니, 기반을 다지고 신뢰를 쌓는 것이 중요합니다."
    },
    "metal_lack": {
      "summary": "금(金) 기운이 부족합니다",
      "detail": "결단력이 약할 수 있으니, 명확한 기준을 세우고 과감하게 결정하는 연습이 필요합니다."
    },
    "water_lack": {
      "summary": "수(水) 기운이 부족합니다",
      "detail": "유연성과 적응력이 부족할 수 있으니, 변화를 받아들이고 다양한 관점을 수용하는 것이 중요합니다."
    }
  },
  
  "daeunGrade": {
    "S": {
      "summary": "매우 좋은 대운",
      "keywords": ["도약", "성공", "확장", "기회"],
      "advice": "큰 흐름이 들어오는 시기입니다. 준비된 계획을 과감하게 실행하세요."
    },
    "A": {
      "summary": "좋은 대운",
      "keywords": ["성장", "발전", "안정", "성과"],
      "advice": "꾸준히 노력하면 좋은 결과를 얻을 수 있습니다."
    },
    "B": {
      "summary": "평범한 대운",
      "keywords": ["유지", "관리", "준비", "기반"],
      "advice": "큰 변화보다는 기존 것을 다지는 시기입니다."
    },
    "C": {
      "summary": "주의가 필요한 대운",
      "keywords": ["변동", "조정", "선택", "신중"],
      "advice": "변화가 많을 수 있으니 신중하게 대응하세요."
    },
    "D": {
      "summary": "어려운 대운",
      "keywords": ["정리", "회복", "재정비", "방어"],
      "advice": "무리한 확장보다는 지키는 운영이 필요합니다."
    },
    "F": {
      "summary": "매우 어려운 대운",
      "keywords": ["리스크", "손실", "고난", "시련"],
      "advice": "큰 결정을 미루고 회복과 재정비에 집중하세요."
    }
  }
};

/* ---------------------------
   1) 유틸리티 함수
----------------------------*/
function calculateWuxingBalance(counts){
  const total = Object.values(counts).reduce((a,b) => a+b, 0);
  const avg = total / 5;
  
  const results = [];
  
  for(const [wx, count] of Object.entries(counts)){
    const ratio = count / avg;
    
    if(ratio >= 1.6){
      results.push(`${wx}_excess`);
    }else if(ratio <= 0.5){
      results.push(`${wx}_lack`);
    }
  }
  
  if(results.length === 0){
    return ["balanced"];
  }
  
  return results;
}

function getDaeunGrade(decade, fourPillars, natalBranches, natalSurface){
  // Gemini 제안 기준: 용신, 십신, 천간관계, 신강/신약 모두 반영
  let score = 50; // 기본 점수
  const dayStem = fourPillars.day.stem;
  
  // === 1. 용신(用神) 판별 및 가점 (+25점) ===
  // 사주 오행 분석으로 용신 오행 결정
  const yongshin = determineYongshin(natalSurface, fourPillars);
  const decadeStemWuxing = WUXING_STEM[decade.stem];
  const decadeBranchWuxing = WUXING_BRANCH[decade.branch];
  
  if (decadeStemWuxing === yongshin || decadeBranchWuxing === yongshin) {
    score += 25;
    console.log(`✅ 용신 대운 +25: ${decade.ganji} (용신: ${yongshin})`);
  }
  
  // === 2. 십신(十神) 성격 반영 ===
  const stemShishen = getShishen(dayStem, decade.stem);
  const shishenScore = getShishenScore(stemShishen);
  score += shishenScore.score;
  console.log(`십신 (${stemShishen}): ${shishenScore.score > 0 ? '+' : ''}${shishenScore.score} - ${shishenScore.reason}`);
  
  // === 3. 천간 관계 (천간 합/극) ===
  const stemRelation = checkStemRelation(decade.stem, [
    fourPillars.year.stem,
    fourPillars.month.stem,
    fourPillars.day.stem,
    fourPillars.hour.stem
  ]);
  score += stemRelation.score;
  if (stemRelation.score !== 0) {
    console.log(`천간 관계: ${stemRelation.score > 0 ? '+' : ''}${stemRelation.score} - ${stemRelation.reason}`);
  }
  
  // === 4. 지지 관계 (충/합/삼합/형/파/해) ===
  const branchRelation = checkBranchRelation(decade.branch, natalBranches);
  score += branchRelation.score;
  if (branchRelation.reasons.length > 0) {
    branchRelation.reasons.forEach(r => console.log(`지지 관계: ${r}`));
  }
  
  // === 5. 신강/신약 보정 ===
  const gang약Correction = getGangyakCorrection(natalSurface, stemShishen);
  score += gang약Correction.score;
  if (gang약Correction.score !== 0) {
    console.log(`신강/신약 보정: ${gang약Correction.score > 0 ? '+' : ''}${gang약Correction.score} - ${gang약Correction.reason}`);
  }
  
  // === 등급 산출 ===
  let grade;
  if (score >= 90) grade = "S";
  else if (score >= 75) grade = "A";
  else if (score >= 60) grade = "B";
  else if (score >= 45) grade = "C";
  else if (score >= 30) grade = "D";
  else grade = "F";
  
  console.log(`\n🎯 ${decade.ganji} 대운 최종 점수: ${score}점 (${grade}등급)\n`);
  
  return grade;
}

// === 용신 판별 함수 ===
function determineYongshin(surface, fourPillars) {
  // 오행 균형 기반 용신 판별
  const counts = { ...surface };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const avg = total / 5;
  
  // 가장 약한 오행 찾기 (부족한 오행이 용신)
  let weakest = null;
  let minRatio = 999;
  
  for (const [wx, count] of Object.entries(counts)) {
    const ratio = count / avg;
    if (ratio < minRatio) {
      minRatio = ratio;
      weakest = wx;
    }
  }
  
  // 일간 오행도 고려 (일간이 약하면 일간을 생하는 오행이 용신)
  const dayStemWuxing = WUXING_STEM[fourPillars.day.stem];
  const dayStemCount = counts[dayStemWuxing];
  
  if (dayStemCount <= 2) {
    // 신약: 일간을 생하는 오행(인성)이 용신
    const supportElement = Object.keys(WUXING_GENERATES).find(
      k => WUXING_GENERATES[k] === dayStemWuxing
    );
    return supportElement || weakest;
  }
  
  // 신강: 일간을 극하거나 설기하는 오행이 용신
  return weakest;
}

// === 십신 점수 함수 ===
function getShishenScore(shishen) {
  const scores = {
    "比肩": { score: 0, reason: "동료운, 평범" },
    "劫財": { score: -5, reason: "경쟁/손재 주의" },
    "食神": { score: +15, reason: "창의력, 재능 발휘" },
    "傷官": { score: +5, reason: "표현력 증가, 감정 기복 주의" },
    "偏財": { score: +12, reason: "재물운, 사업 기회" },
    "正財": { score: +18, reason: "안정적 수입, 재물 증가" },
    "偏官": { score: -8, reason: "압박감, 스트레스, 구설수" },
    "正官": { score: +10, reason: "명예, 승진, 사회적 인정" },
    "偏印": { score: -3, reason: "변동, 불안정" },
    "正印": { score: +12, reason: "학습, 지원, 안정" }
  };
  
  return scores[shishen] || { score: 0, reason: "해당없음" };
}

// === 천간 관계 체크 ===
function checkStemRelation(decadeStem, natalStems) {
  let score = 0;
  let reason = "";
  
  // 천간 오합 체크
  const hapPairs = [
    ["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"]
  ];
  
  for (const [a, b] of hapPairs) {
    if ((decadeStem === a && natalStems.includes(b)) ||
        (decadeStem === b && natalStems.includes(a))) {
      score += 8;
      reason = "천간 합(오합) +8";
      break;
    }
  }
  
  // 천간 극 체크 (대운 천간이 일간을 극하면 감점)
  const dayStem = natalStems[2]; // 일간
  const decadeWuxing = WUXING_STEM[decadeStem];
  const dayWuxing = WUXING_STEM[dayStem];
  
  if (WUXING_CONTROLS[decadeWuxing] === dayWuxing) {
    score -= 10;
    reason = reason ? reason + " / 천간 극 -10" : "천간이 일간 극 -10";
  }
  
  return { score, reason };
}

// === 지지 관계 체크 (기존 로직 개선) ===
function checkBranchRelation(decadeBranch, natalBranches) {
  let score = 0;
  const reasons = [];
  
  // 충(沖) - 강한 감점
  const chungPairs = [["子","午"],["丑","未"],["寅","申"],["卯","酉"],["辰","戌"],["巳","亥"]];
  for (const [a, b] of chungPairs) {
    if (natalBranches.includes(a) && decadeBranch === b) {
      score -= 20;
      reasons.push(`충(${a}↔${b}) -20`);
    }
    if (natalBranches.includes(b) && decadeBranch === a) {
      score -= 20;
      reasons.push(`충(${b}↔${a}) -20`);
    }
  }
  
  // 육합(六合)
  const hapPairs = [["子","丑"],["寅","亥"],["卯","戌"],["辰","酉"],["巳","申"],["午","未"]];
  for (const [a, b] of hapPairs) {
    if (natalBranches.includes(a) && decadeBranch === b) {
      score += 15;
      reasons.push(`육합(${a}+${b}) +15`);
    }
    if (natalBranches.includes(b) && decadeBranch === a) {
      score += 15;
      reasons.push(`육합(${b}+${a}) +15`);
    }
  }
  
  // 삼합(三合)
  const samhapGroups = [
    ["申","子","辰"], ["亥","卯","未"], ["寅","午","戌"], ["巳","酉","丑"]
  ];
  
  for (const group of samhapGroups) {
    if (group.includes(decadeBranch)) {
      const matchCount = natalBranches.filter(b => group.includes(b)).length;
      if (matchCount >= 2) {
        score += 25;
        reasons.push(`삼합 완성(${group.join(',')}) +25`);
      } else if (matchCount === 1) {
        score += 10;
        reasons.push(`삼합 반합(${group.join(',')}) +10`);
      }
    }
  }
  
  // 형(刑)
  const hyeongGroups = [["寅","巳","申"], ["丑","未","戌"], ["子","卯"]];
  for (const group of hyeongGroups) {
    if (group.includes(decadeBranch)) {
      const matchCount = natalBranches.filter(b => group.includes(b)).length;
      if (matchCount >= 1) {
        score -= 12;
        reasons.push(`형(${group.join(',')}) -12`);
      }
    }
  }
  
  return { score, reasons };
}

// === 신강/신약 보정 ===
function getGangyakCorrection(surface, stemShishen) {
  const dayStemElement = Object.keys(surface)[0]; // 간단한 추정
  const total = Object.values(surface).reduce((a, b) => a + b, 0);
  
  // 비겁+인성 개수로 신강/신약 판단
  const supportCount = surface.wood + surface.earth; // 임시
  const ratio = supportCount / total;
  
  if (ratio > 0.5) {
    // 신강: 식상/재성운이 좋음
    if (["食神", "傷官", "偏財", "正財"].includes(stemShishen)) {
      return { score: +8, reason: "신강+설기운 조화" };
    }
    if (["比肩", "劫財", "偏印", "正印"].includes(stemShishen)) {
      return { score: -5, reason: "신강+비인운 과함" };
    }
  } else {
    // 신약: 비겁/인성운이 좋음
    if (["比肩", "劫財", "偏印", "正印"].includes(stemShishen)) {
      return { score: +8, reason: "신약+도움운 조화" };
    }
    if (["食神", "傷官", "偏財", "正財"].includes(stemShishen)) {
      return { score: -5, reason: "신약+설기운 부담" };
    }
  }
  
  return { score: 0, reason: "" };
}

function getDaeunSummary(grade, decade){
  const template = FORTUNE_TEMPLATES.daeunGrade[grade];
  if(!template) return "대운 분석 중...";
  
  return `${template.summary} - ${template.advice}`;
}

/* ---------------------------
   2) 메인 총운 렌더링 함수
----------------------------*/
function renderFortuneAnalysis(){
  // window.SajuResult가 없으면 대기
  if(!window.SajuResult){
    console.log("SajuResult not ready yet...");
    return;
  }
  
  const result = window.SajuResult;
  
  // 대운 리스트에 총운 정보 추가
  const daeunListEl = document.getElementById("daeunList");
  if(!daeunListEl) return;
  
  // 기존 대운 카드들을 업데이트
  const cards = daeunListEl.querySelectorAll(".daeun-card");
  
  result.daeunTimeline.decades.forEach((decade, idx) => {
    if(idx >= cards.length) return;
    
    const card = cards[idx];
    
    // 등급 계산 (Gemini 정교화 로직)
    console.log(`\n📊 ${decade.ganji} 대운 분석 시작...`);
    const grade = getDaeunGrade(decade, result.fourPillars, result.natalBranches, result.natalSurface);
    
    // 점수 표시 추가
    const header = card.querySelector(".daeun-header");
    if(header && !header.querySelector(".daeun-score")){
      const scoreEl = document.createElement("div");
      scoreEl.className = `daeun-score grade-${grade}`;
      scoreEl.textContent = grade;
      header.appendChild(scoreEl);
    }
    
    // 총운 요약 추가
    const info = card.querySelector(".daeun-info");
    if(info && !info.querySelector(".daeun-summary")){
      const summary = document.createElement("div");
      summary.className = "daeun-summary";
      summary.textContent = getDaeunSummary(grade, decade);
      info.appendChild(summary);
    }
  });
  
  // 전역 배지에 일간 정보 추가
  const globalBadges = document.getElementById("globalBadges");
  if(globalBadges && result.fourPillars){
    const dayMaster = result.fourPillars.day.stem;
    const dmInfo = FORTUNE_TEMPLATES.dayMasterFortune[dayMaster];
    
    if(dmInfo && !globalBadges.querySelector(".badge-daymaster")){
      const badge = document.createElement("div");
      badge.className = "badge badge-daymaster";
      badge.textContent = dmInfo.title;
      badge.title = dmInfo.trait;
      globalBadges.appendChild(badge);
    }
    
    // 오행 균형 분석
    const balanceTypes = calculateWuxingBalance(result.surface);
    
    balanceTypes.forEach(type => {
      const balanceInfo = FORTUNE_TEMPLATES.wuxingBalance[type];
      if(balanceInfo && !globalBadges.querySelector(`.badge-balance-${type}`)){
        const badge = document.createElement("div");
        badge.className = `badge warn badge-balance-${type}`;
        badge.textContent = balanceInfo.summary;
        badge.title = balanceInfo.detail;
        globalBadges.appendChild(badge);
      }
    });
  }
}

/* ---------------------------
   3) 초기화 및 감시
----------------------------*/
// SajuResult가 준비되면 자동으로 실행
let checkInterval = setInterval(() => {
  if(window.SajuResult){
    renderFortuneAnalysis();
    clearInterval(checkInterval);
  }
}, 100);

// SajuResult 변경 감지를 위한 Proxy (선택적)
if(typeof Proxy !== 'undefined'){
  let originalSajuResult = null;
  
  Object.defineProperty(window, 'SajuResult', {
    get: function() {
      return originalSajuResult;
    },
    set: function(value) {
      originalSajuResult = value;
      // SajuResult가 설정되면 총운 분석 실행
      setTimeout(() => renderFortuneAnalysis(), 50);
    },
    configurable: true
  });
}

// DOM 로드 시에도 한 번 체크
document.addEventListener("DOMContentLoaded", ()=>{
  setTimeout(() => {
    if(window.SajuResult){
      renderFortuneAnalysis();
    }
  }, 500);
});

console.log("✓ saju_fortune.js loaded - waiting for SajuResult...");
