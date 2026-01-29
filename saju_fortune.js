/* =========================================================
   사주 총운 해석 엔진 v2 (saju_fortune.js)
   - 월령+지장간 통근 기반 명리 엔진
   - 신강/신약 → needs → 대운 점수
   ========================================================= */

console.log("🔥🔥🔥 saju_fortune.js v2 로드 시작!");

/* ---------------------------
   0) 데이터 정의
----------------------------*/

// 지장간 비율
const HIDDEN_STEMS_RATIO = {
  "子": [{ stem: "癸", ratio: 1.0 }],
  "丑": [{ stem: "己", ratio: 0.6 }, { stem: "癸", ratio: 0.25 }, { stem: "辛", ratio: 0.15 }],
  "寅": [{ stem: "甲", ratio: 0.6 }, { stem: "丙", ratio: 0.25 }, { stem: "戊", ratio: 0.15 }],
  "卯": [{ stem: "乙", ratio: 1.0 }],
  "辰": [{ stem: "戊", ratio: 0.6 }, { stem: "乙", ratio: 0.25 }, { stem: "癸", ratio: 0.15 }],
  "巳": [{ stem: "丙", ratio: 0.6 }, { stem: "戊", ratio: 0.25 }, { stem: "庚", ratio: 0.15 }],
  "午": [{ stem: "丁", ratio: 0.7 }, { stem: "己", ratio: 0.3 }],
  "未": [{ stem: "己", ratio: 0.6 }, { stem: "丁", ratio: 0.25 }, { stem: "乙", ratio: 0.15 }],
  "申": [{ stem: "庚", ratio: 0.6 }, { stem: "壬", ratio: 0.25 }, { stem: "戊", ratio: 0.15 }],
  "酉": [{ stem: "辛", ratio: 1.0 }],
  "戌": [{ stem: "戊", ratio: 0.6 }, { stem: "辛", ratio: 0.25 }, { stem: "丁", ratio: 0.15 }],
  "亥": [{ stem: "壬", ratio: 0.7 }, { stem: "甲", ratio: 0.3 }]
};

// 계절 매핑
const SEASON_MAP = {
  "寅": "spring", "卯": "spring", "辰": "spring",
  "巳": "summer", "午": "summer", "未": "summer",
  "申": "autumn", "酉": "autumn", "戌": "autumn",
  "亥": "winter", "子": "winter", "丑": "winter"
};

const SEASON_ELEMENT = {
  "spring": "wood",
  "summer": "fire",
  "autumn": "metal",
  "winter": "water"
};

/* ---------------------------
   1) 신강/신약 계산
----------------------------*/

// 1-1) 월령 득령 점수
function calculateSeasonScore(monthBranch, dayElement) {
  const season = SEASON_MAP[monthBranch];
  const seasonElement = SEASON_ELEMENT[season];
  
  if (seasonElement === dayElement) return 18;
  if (WUXING_GENERATES[seasonElement] === dayElement) return 10;
  if (WUXING_GENERATES[dayElement] === seasonElement) return -8;
  if (WUXING_CONTROLS[seasonElement] === dayElement) return -14;
  if (WUXING_CONTROLS[dayElement] === seasonElement) return -6;
  
  return 0;
}

// 1-2) 통근 점수
function calculateRootScore(fourPillars, dayElement) {
  const branches = [
    { branch: fourPillars.year.branch, weight: 0.8 },
    { branch: fourPillars.month.branch, weight: 1.6 },
    { branch: fourPillars.day.branch, weight: 1.3 },
    { branch: fourPillars.hour.branch, weight: 1.0 }
  ];
  
  let totalScore = 0;
  
  branches.forEach(({ branch, weight }) => {
    const hiddenStems = HIDDEN_STEMS_RATIO[branch];
    if (!hiddenStems) return;
    
    hiddenStems.forEach(({ stem, ratio }) => {
      const stemElement = WUXING_STEM[stem];
      
      if (stemElement === dayElement) {
        totalScore += ratio * 14 * weight;
      } else if (WUXING_GENERATES[stemElement] === dayElement) {
        totalScore += ratio * 10 * weight;
      } else if (WUXING_GENERATES[dayElement] === stemElement) {
        totalScore -= ratio * 6 * weight;
      } else if (WUXING_CONTROLS[stemElement] === dayElement) {
        totalScore -= ratio * 9 * weight;
      } else if (WUXING_CONTROLS[dayElement] === stemElement) {
        totalScore -= ratio * 5 * weight;
      }
    });
  });
  
  return totalScore;
}

// 1-3) 천간 보정
function calculateStemAssistScore(fourPillars, dayElement) {
  const stems = [
    fourPillars.year.stem,
    fourPillars.month.stem,
    fourPillars.hour.stem
  ];
  
  let score = 0;
  
  stems.forEach(stem => {
    const stemElement = WUXING_STEM[stem];
    
    if (stemElement === dayElement) score += 4;
    else if (WUXING_GENERATES[stemElement] === dayElement) score += 3;
    else if (WUXING_GENERATES[dayElement] === stemElement) score -= 2;
    else if (WUXING_CONTROLS[stemElement] === dayElement) score -= 3;
    else if (WUXING_CONTROLS[dayElement] === stemElement) score -= 1;
  });
  
  return score;
}

// 1-4) 최종 신강도 계산
function calculateDayMasterStrength(fourPillars) {
  const dayStem = fourPillars.day.stem;
  const dayElement = WUXING_STEM[dayStem];
  const monthBranch = fourPillars.month.branch;
  
  const seasonScore = calculateSeasonScore(monthBranch, dayElement);
  const rootScore = calculateRootScore(fourPillars, dayElement);
  const stemAssistScore = calculateStemAssistScore(fourPillars, dayElement);
  
  const dmStrength = 50 + seasonScore + rootScore + stemAssistScore;
  
  let strengthBand;
  if (dmStrength >= 65) strengthBand = "strong";
  else if (dmStrength >= 55) strengthBand = "balanced-strong";
  else if (dmStrength >= 45) strengthBand = "balanced-weak";
  else strengthBand = "weak";
  
  console.log(`📊 신강도 계산:`, {
    dayElement,
    seasonScore,
    rootScore: rootScore.toFixed(1),
    stemAssistScore,
    dmStrength: dmStrength.toFixed(1),
    strengthBand
  });
  
  return {
    dmElement: dayElement,
    dmStrength,
    strengthBand,
    breakdown: { seasonScore, rootScore, stemAssistScore }
  };
}

// 1-5) 용신/희신 판별
function determineNeeds(strengthInfo, monthBranch) {
  const { dmStrength, dmElement } = strengthInfo;
  const season = SEASON_MAP[monthBranch];
  
  let primary = [];
  let climate = [];
  
  // 신강/신약 기반
  if (dmStrength <= 44) {
    primary.push(dmElement);
    for (const [elem, generates] of Object.entries(WUXING_GENERATES)) {
      if (generates === dmElement) {
        primary.push(elem);
        break;
      }
    }
  } else if (dmStrength >= 65) {
    primary.push(WUXING_GENERATES[dmElement]);
    primary.push(WUXING_CONTROLS[dmElement]);
  } else {
    primary.push(dmElement);
  }
  
  // 계절 기반
  if (season === "winter") climate.push("fire");
  else if (season === "summer") climate.push("water");
  else if (season === "spring") climate.push("metal");
  else if (season === "autumn") climate.push("water");
  
  return { primary, climate };
}

/* ---------------------------
   2) 대운 점수 계산
----------------------------*/
function getDaeunGrade(decade, fourPillars, natalBranches) {
  console.log(`\n📊 ${decade.stem}${decade.branch} 대운 분석`);
  
  // 원국 신강도 계산
  const strengthInfo = calculateDayMasterStrength(fourPillars);
  const needs = determineNeeds(strengthInfo, fourPillars.month.branch);
  
  console.log(`🎯 Needs:`, needs);
  
  // 기본 점수 (원국 반영)
  const baseScore = 50 + (strengthInfo.dmStrength - 50) * 0.2;
  
  const decadeStemElement = WUXING_STEM[decade.stem];
  const decadeBranchElement = WUXING_BRANCH[decade.branch];
  
  // === 1. Primary Needs 충족도 ===
  let primaryScore = 0;
  const primaryNotes = [];
  
  if (needs.primary.includes(decadeStemElement)) {
    primaryScore += 15;
    primaryNotes.push(`천간 ${decade.stem}(${decadeStemElement}) primary 충족 +15`);
  }
  if (needs.primary.includes(decadeBranchElement)) {
    primaryScore += 20;
    primaryNotes.push(`지지 ${decade.branch}(${decadeBranchElement}) primary 충족 +20`);
  }
  
  // Primary needs 반대 체크 (기신)
  const primaryOpposite = [];
  if (strengthInfo.dmStrength <= 44) {
    // 신약인데 식상/재성/관성 오면 감점
    const badElements = [
      WUXING_GENERATES[strengthInfo.dmElement], // 식상
      WUXING_CONTROLS[strengthInfo.dmElement],   // 재성
    ];
    const controlsMe = Object.keys(WUXING_CONTROLS).find(
      k => WUXING_CONTROLS[k] === strengthInfo.dmElement
    ); // 관성
    if (controlsMe) badElements.push(controlsMe);
    
    if (badElements.includes(decadeStemElement)) {
      primaryScore -= 10;
      primaryNotes.push(`천간 ${decade.stem}(${decadeStemElement}) 신약에 부담 -10`);
    }
    if (badElements.includes(decadeBranchElement)) {
      primaryScore -= 12;
      primaryNotes.push(`지지 ${decade.branch}(${decadeBranchElement}) 신약에 부담 -12`);
    }
  } else if (strengthInfo.dmStrength >= 65) {
    // 신강인데 비겁/인성 과다면 감점
    const badElements = [strengthInfo.dmElement];
    const generatesMe = Object.keys(WUXING_GENERATES).find(
      k => WUXING_GENERATES[k] === strengthInfo.dmElement
    );
    if (generatesMe) badElements.push(generatesMe);
    
    if (badElements.includes(decadeStemElement)) {
      primaryScore -= 8;
      primaryNotes.push(`천간 ${decade.stem}(${decadeStemElement}) 신강에 과다 -8`);
    }
    if (badElements.includes(decadeBranchElement)) {
      primaryScore -= 10;
      primaryNotes.push(`지지 ${decade.branch}(${decadeBranchElement}) 신강에 과다 -10`);
    }
  }
  
  // === 2. Climate Needs 충족도 ===
  let climateScore = 0;
  const climateNotes = [];
  
  if (needs.climate.includes(decadeStemElement)) {
    climateScore += 10;
    climateNotes.push(`천간 ${decade.stem}(${decadeStemElement}) 계절 조절 +10`);
  }
  if (needs.climate.includes(decadeBranchElement)) {
    climateScore += 15;
    climateNotes.push(`지지 ${decade.branch}(${decadeBranchElement}) 계절 조절 +15`);
  }
  
  // === 3. 지지 관계 (충/합) ===
  const branchRelation = checkBranchRelation(decade.branch, natalBranches);
  
  // === 최종 점수 계산 ===
  let totalScore = baseScore + primaryScore + climateScore + branchRelation.score;
  
  // 점수 범위 제한 (50~95)
  totalScore = Math.max(50, Math.min(95, totalScore));
  
  // === 등급 산출 ===
  let grade;
  if (totalScore >= 88) grade = "S";
  else if (totalScore >= 75) grade = "A";
  else if (totalScore >= 65) grade = "B";
  else if (totalScore >= 55) grade = "C";
  else if (totalScore >= 45) grade = "D";
  else grade = "F";
  
  // === 상세 로그 출력 ===
  console.log(`🎯 ${decade.stem}${decade.branch} 최종: ${totalScore.toFixed(0)}점 (${grade}등급)`);
  console.log(`\n[점수 breakdown]`);
  console.log(`  원국 기반: ${baseScore.toFixed(1)}점`);
  console.log(`    - 신강도: ${strengthInfo.dmStrength.toFixed(1)}`);
  console.log(`    - 구간: ${strengthInfo.strengthBand}`);
  console.log(`  Primary needs: ${primaryScore > 0 ? '+' : ''}${primaryScore}점`);
  primaryNotes.forEach(note => console.log(`    - ${note}`));
  console.log(`  Climate needs: ${climateScore > 0 ? '+' : ''}${climateScore}점`);
  climateNotes.forEach(note => console.log(`    - ${note}`));
  console.log(`  지지 관계: ${branchRelation.score > 0 ? '+' : ''}${branchRelation.score}점`);
  branchRelation.reasons.forEach(reason => console.log(`    - ${reason}`));
  
  // === breakdown 객체 반환 ===
  const breakdown = {
    baseScore: parseFloat(baseScore.toFixed(1)),
    primaryScore,
    primaryNotes,
    climateScore,
    climateNotes,
    relationScore: branchRelation.score,
    relationNotes: branchRelation.reasons,
    strengthInfo: {
      dmElement: strengthInfo.dmElement,
      dmStrength: parseFloat(strengthInfo.dmStrength.toFixed(1)),
      strengthBand: strengthInfo.strengthBand,
      seasonScore: strengthInfo.breakdown.seasonScore,
      rootScore: parseFloat(strengthInfo.breakdown.rootScore.toFixed(1)),
      stemAssistScore: strengthInfo.breakdown.stemAssistScore
    },
    needs: needs
  };
  
  return { 
    grade, 
    score: Math.round(totalScore),
    breakdown
  };
}

function checkBranchRelation(decadeBranch, natalBranches) {
  let score = 0;
  const reasons = [];
  
  // 충(沖) - 월지/일지에 따라 가중치 차등
  const chungPairs = [["子","午"],["丑","未"],["寅","申"],["卯","酉"],["辰","戌"],["巳","亥"]];
  for (const [a, b] of chungPairs) {
    // 월지 충 (가장 중요)
    if (natalBranches[1] === a && decadeBranch === b) {
      score -= 15;
      reasons.push(`월지 충(${a}↔${b}) -15`);
    } else if (natalBranches[1] === b && decadeBranch === a) {
      score -= 15;
      reasons.push(`월지 충(${b}↔${a}) -15`);
    }
    // 일지 충
    else if (natalBranches[2] === a && decadeBranch === b) {
      score -= 12;
      reasons.push(`일지 충(${a}↔${b}) -12`);
    } else if (natalBranches[2] === b && decadeBranch === a) {
      score -= 12;
      reasons.push(`일지 충(${b}↔${a}) -12`);
    }
    // 년지/시지 충
    else if (natalBranches.includes(a) && decadeBranch === b) {
      score -= 8;
      reasons.push(`충(${a}↔${b}) -8`);
    } else if (natalBranches.includes(b) && decadeBranch === a) {
      score -= 8;
      reasons.push(`충(${b}↔${a}) -8`);
    }
  }
  
  // 육합(六合) - 조화
  const hapPairs = [["子","丑"],["寅","亥"],["卯","戌"],["辰","酉"],["巳","申"],["午","未"]];
  for (const [a, b] of hapPairs) {
    if ((natalBranches.includes(a) && decadeBranch === b) ||
        (natalBranches.includes(b) && decadeBranch === a)) {
      score += 8;
      reasons.push(`육합(${a}+${b}) +8`);
      break;
    }
  }
  
  // 삼합(三合) - 강력한 조화
  const samhapGroups = [
    {name: "申子辰 수국", branches: ["申","子","辰"]},
    {name: "亥卯未 목국", branches: ["亥","卯","未"]},
    {name: "寅午戌 화국", branches: ["寅","午","戌"]},
    {name: "巳酉丑 금국", branches: ["巳","酉","丑"]}
  ];
  
  for (const group of samhapGroups) {
    if (group.branches.includes(decadeBranch)) {
      const matchCount = natalBranches.filter(b => group.branches.includes(b)).length;
      if (matchCount >= 2) {
        score += 15;
        reasons.push(`삼합 완성(${group.name}) +15`);
      } else if (matchCount === 1) {
        score += 6;
        reasons.push(`삼합 반합(${group.name}) +6`);
      }
    }
  }
  
  if (reasons.length > 0) {
    console.log(`  지지 관계:`, reasons.join(', '));
  }
  
  return { score, reasons };
}

function getDaeunSummary(grade) {
  const summaries = {
    "S": "매우 좋은 대운 - 큰 성과와 도약의 시기",
    "A": "좋은 대운 - 성장과 발전의 시기",
    "B": "평범한 대운 - 안정과 유지의 시기",
    "C": "주의가 필요한 대운 - 신중한 대응 필요",
    "D": "어려운 대운 - 방어적 운영 필요",
    "F": "매우 어려운 대운 - 회복과 재정비 필요"
  };
  return summaries[grade] || "";
}

/* ---------------------------
   3) 렌더링
----------------------------*/
function renderFortuneAnalysis() {
  console.log("🔥 renderFortuneAnalysis 시작");
  
  if (!window.SajuResult) {
    console.log("⚠️ SajuResult not ready");
    return;
  }
  
  const result = window.SajuResult;
  const daeunListEl = document.getElementById("daeunList");
  
  if (!daeunListEl) {
    console.log("❌ daeunList 없음");
    return;
  }
  
  const cards = daeunListEl.querySelectorAll(".daeun-card");
  console.log(`📦 카드 ${cards.length}개`);
  
  result.daeunTimeline.decades.forEach((decade, idx) => {
    if (idx >= cards.length) return;
    
    const card = cards[idx];
    const result_calc = getDaeunGrade(decade, result.fourPillars, result.natalBranches);
    const { grade, score } = result_calc;
    
    const header = card.querySelector(".daeun-header");
    if (header) {
      const existingScore = header.querySelector(".daeun-score");
      if (existingScore) existingScore.remove();
      
      const scoreEl = document.createElement("div");
      scoreEl.className = `daeun-score grade-${grade}`;
      scoreEl.innerHTML = `<div class="grade-letter">${grade}</div><div class="grade-number">${score}점</div>`;
      header.appendChild(scoreEl);
      
      console.log(`✅ ${decade.stem}${decade.branch}: ${score}점 (${grade})`);
    }
    
    const info = card.querySelector(".daeun-info");
    if (info) {
      const existingSummary = info.querySelector(".daeun-summary");
      if (existingSummary) existingSummary.remove();
      
      const summary = document.createElement("div");
      summary.className = "daeun-summary";
      summary.textContent = getDaeunSummary(grade);
      info.appendChild(summary);
    }
  });
  
  console.log("✅ renderFortuneAnalysis 완료");
}

window.renderFortuneAnalysis = renderFortuneAnalysis;
console.log("✅ renderFortuneAnalysis 함수 등록:", typeof window.renderFortuneAnalysis);
