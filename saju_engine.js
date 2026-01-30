/* =========================================================
   사주 엔진 (saju_engine.js)
   - 격(格) 판정
   - 용/희/기/한 분류
   - 신강/신약 계산
   - 점수 엔진
   ========================================================= */

console.log("🔥 saju_engine.js 로드");

// SajuData에서 필요한 것들 가져오기
function getWuxingStem() { return window.SajuData.window.SajuData.WUXING_STEM; }
function getWuxingBranch() { return window.SajuData.window.SajuData.WUXING_BRANCH; }
function getWuxingGenerates() { return window.SajuData.window.SajuData.WUXING_GENERATES; }
function getWuxingControls() { return window.SajuData.window.SajuData.WUXING_CONTROLS; }
function getHiddenStemsRatio() { return window.SajuData.window.SajuData.HIDDEN_STEMS_RATIO; }
function getSeasonMap() { return window.SajuData.window.SajuData.SEASON_MAP; }
function getSeasonElement() { return window.SajuData.window.SajuData.SEASON_ELEMENT; }
function getGeokPreference() { return window.SajuData.window.SajuData.GEOK_PREFERENCE; }
function getProfiles() { return window.SajuData.window.SajuData.PROFILES; }
function getEarthlyCombinations() { return window.SajuData.EARTHLY_SIX_COMBINATIONS; }
function getEarthlyThreeCombinations() { return window.SajuData.EARTHLY_THREE_COMBINATIONS; }
function getEarthlyClashes() { return window.SajuData.window.SajuData.EARTHLY_CLASHES; }

/* =========================================================
   PART 1: 십신 판정
   ========================================================= */

/**
 * 일간 기준 대상 천간의 십신 판정
 * @param {string} dayStem - 일간 (甲,乙,...)
 * @param {string} targetStem - 대상 천간
 * @returns {string} 십신 ("比肩", "劫財", ...)
 */
function getShishen(dayStem, targetStem) {
  const dayElement = window.SajuData.WUXING_STEM[dayStem];
  const targetElement = window.SajuData.WUXING_STEM[targetStem];
  
  if (!dayElement || !targetElement) return null;
  
  // 음양 판정
  const yangStems = ["甲", "丙", "戊", "庚", "壬"];
  const dayYang = yangStems.includes(dayStem);
  const targetYang = yangStems.includes(targetStem);
  const samePolarity = (dayYang === targetYang);
  
  // 오행 관계
  if (dayElement === targetElement) {
    return samePolarity ? "比肩" : "劫財";
  }
  
  if (window.SajuData.WUXING_GENERATES[dayElement] === targetElement) {
    return samePolarity ? "食神" : "傷官";
  }
  
  if (window.SajuData.WUXING_CONTROLS[dayElement] === targetElement) {
    return samePolarity ? "偏財" : "正財";
  }
  
  if (window.SajuData.WUXING_CONTROLS[targetElement] === dayElement) {
    return samePolarity ? "偏官" : "正官";
  }
  
  if (window.SajuData.WUXING_GENERATES[targetElement] === dayElement) {
    return samePolarity ? "偏印" : "正印";
  }
  
  return null;
}

/* =========================================================
   PART 2: 오행/십신 벡터 계산
   ========================================================= */

/**
 * 사주(또는 운 합성 후)의 오행/십신 벡터 계산
 * @param {object} pillars - {year, month, day, hour}
 * @returns {object} { elements, tenGods }
 */
function calculateVectors(pillars) {
  const dayStem = pillars.day.stem;
  
  // 오행 벡터
  const elements = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0
  };
  
  // 십신 벡터
  const tenGods = {
    "比肩": 0, "劫財": 0,
    "食神": 0, "傷官": 0,
    "偏財": 0, "正財": 0,
    "偏官": 0, "正官": 0,
    "偏印": 0, "正印": 0
  };
  
  // 천간 (년/월/시, 일간 제외)
  const stems = [
    pillars.year.stem,
    pillars.month.stem,
    pillars.hour.stem
  ];
  
  stems.forEach(stem => {
    const element = window.SajuData.WUXING_STEM[stem];
    if (element) elements[element] += 1.0;
    
    const shishen = getShishen(dayStem, stem);
    if (shishen) tenGods[shishen] += 1.0;
  });
  
  // 지지 (지장간 가중치 포함)
  const branches = [
    pillars.year.branch,
    pillars.month.branch,
    pillars.day.branch,
    pillars.hour.branch
  ];
  
  branches.forEach(branch => {
    const hiddenStems = window.SajuData.HIDDEN_STEMS_RATIO[branch];
    if (!hiddenStems) return;
    
    hiddenStems.forEach(({ stem, ratio }) => {
      const element = window.SajuData.WUXING_STEM[stem];
      if (element) elements[element] += ratio;
      
      const shishen = getShishen(dayStem, stem);
      if (shishen) tenGods[shishen] += ratio;
    });
  });
  
  return { elements, tenGods };
}

/* =========================================================
   PART 3: 신강/신약 계산
   ========================================================= */

/**
 * 월령 득령 점수
 */
function calculateSeasonScore(monthBranch, dayElement) {
  // 방어코드: SEASON_MAP 존재 확인
  if (!window.SajuData || !window.SajuData.SEASON_MAP) {
    console.warn("⚠️ SEASON_MAP이 정의되지 않음");
    return 0;
  }
  
  const season = window.SajuData.SEASON_MAP[monthBranch];
  
  // 방어코드: 월지 키 확인
  if (!season) {
    console.warn(`⚠️ 월지 "${monthBranch}"에 해당하는 계절이 없음`);
    return 0;
  }
  
  const seasonElement = window.SajuData.SEASON_ELEMENT[season];
  
  // 방어코드: 계절 오행 확인
  if (!seasonElement) {
    console.warn(`⚠️ 계절 "${season}"에 해당하는 오행이 없음`);
    return 0;
  }
  
  if (seasonElement === dayElement) return 18;
  if (window.SajuData.WUXING_GENERATES[seasonElement] === dayElement) return 10;
  if (window.SajuData.WUXING_GENERATES[dayElement] === seasonElement) return -8;
  if (window.SajuData.WUXING_CONTROLS[seasonElement] === dayElement) return -14;
  if (window.SajuData.WUXING_CONTROLS[dayElement] === seasonElement) return -6;
  
  return 0;
}

/**
 * 통근 점수 (지장간)
 */
function calculateRootScore(pillars, dayElement) {
  // 방어코드
  if (!window.SajuData || !window.SajuData.HIDDEN_STEMS_RATIO) {
    console.warn("⚠️ HIDDEN_STEMS_RATIO가 정의되지 않음");
    return 0;
  }
  
  const branches = [
    { branch: pillars.year.branch, weight: 0.8 },
    { branch: pillars.month.branch, weight: 1.6 },
    { branch: pillars.day.branch, weight: 1.3 },
    { branch: pillars.hour.branch, weight: 1.0 }
  ];
  
  let totalScore = 0;
  
  branches.forEach(({ branch, weight }) => {
    const hiddenStems = window.SajuData.HIDDEN_STEMS_RATIO[branch];
    if (!hiddenStems) {
      console.warn(`⚠️ 지지 "${branch}"의 지장간 정보 없음`);
      return;
    }
    
    hiddenStems.forEach(({ stem, ratio }) => {
      const stemElement = window.SajuData.WUXING_STEM[stem];
      
      if (!stemElement) {
        console.warn(`⚠️ 천간 "${stem}"의 오행 정보 없음`);
        return;
      }
      
      if (stemElement === dayElement) {
        totalScore += ratio * 14 * weight;
      } else if (window.SajuData.WUXING_GENERATES[stemElement] === dayElement) {
        totalScore += ratio * 10 * weight;
      } else if (window.SajuData.WUXING_GENERATES[dayElement] === stemElement) {
        totalScore -= ratio * 6 * weight;
      } else if (window.SajuData.WUXING_CONTROLS[stemElement] === dayElement) {
        totalScore -= ratio * 9 * weight;
      } else if (window.SajuData.WUXING_CONTROLS[dayElement] === stemElement) {
        totalScore -= ratio * 5 * weight;
      }
    });
  });
  
  return totalScore;
}

/**
 * 천간 보정 점수
 */
function calculateStemAssistScore(pillars, dayElement) {
  const stems = [
    pillars.year.stem,
    pillars.month.stem,
    pillars.hour.stem
  ];
  
  let score = 0;
  
  stems.forEach(stem => {
    const stemElement = window.SajuData.WUXING_STEM[stem];
    
    if (stemElement === dayElement) score += 4;
    else if (window.SajuData.WUXING_GENERATES[stemElement] === dayElement) score += 3;
    else if (window.SajuData.WUXING_GENERATES[dayElement] === stemElement) score -= 2;
    else if (window.SajuData.WUXING_CONTROLS[stemElement] === dayElement) score -= 3;
    else if (window.SajuData.WUXING_CONTROLS[dayElement] === stemElement) score -= 1;
  });
  
  return score;
}

/**
 * 신강도 계산
 * @returns {object} { score, label, breakdown }
 */
function calculateStrength(pillars) {
  const dayStem = pillars.day.stem;
  const dayElement = window.SajuData.WUXING_STEM[dayStem];
  const monthBranch = pillars.month.branch;
  
  const seasonScore = calculateSeasonScore(monthBranch, dayElement);
  const rootScore = calculateRootScore(pillars, dayElement);
  const stemAssistScore = calculateStemAssistScore(pillars, dayElement);
  
  const total = 50 + seasonScore + rootScore + stemAssistScore;
  
  let label;
  if (total >= 66) label = "신강";
  else if (total >= 36) label = "중화";
  else label = "신약";
  
  return {
    score: total,
    label,
    breakdown: {
      season: seasonScore,
      root: rootScore,
      stem: stemAssistScore
    }
  };
}

/* =========================================================
   PART 4: 격(格) 판정
   ========================================================= */

/**
 * 격 판정
 * @param {object} pillars
 * @param {object} vectors - {elements, tenGods}
 * @returns {object} { main, sub, purity, broken, notes }
 */
function determineGeok(pillars, vectors) {
  const monthBranch = pillars.month.branch;
  const dayStem = pillars.day.stem;
  
  // Step 1: 월지 주기운 (가중치 최대)
  const hiddenStems = window.SajuData.HIDDEN_STEMS_RATIO[monthBranch];
  if (!hiddenStems || hiddenStems.length === 0) {
    return {
      main: "혼합격",
      sub: null,
      purity: 0.3,
      broken: false,
      notes: ["월지 정보 없음"]
    };
  }
  
  const mainHidden = hiddenStems[0]; // 가중치 최대
  const monthMainStem = mainHidden.stem;
  
  // Step 2: 월지 주기운의 십신
  const monthShishen = getShishen(dayStem, monthMainStem);
  
  if (!monthShishen) {
    return {
      main: "혼합격",
      sub: null,
      purity: 0.3,
      broken: false,
      notes: ["십신 판정 실패"]
    };
  }
  
  const geokName = monthShishen + "격";
  let purity = 0.5; // 기본
  const notes = [];
  
  notes.push(`월지 ${monthBranch} 주기운: ${monthMainStem}`);
  notes.push(`월령 십신: ${monthShishen}`);
  
  // Step 3: 투간 체크 (천간에 월령 십신 있으면 purity 상승)
  const allStems = [
    pillars.year.stem,
    pillars.month.stem,
    pillars.hour.stem
  ];
  
  const hasTransparent = allStems.some(stem => {
    const ss = getShishen(dayStem, stem);
    return ss === monthShishen;
  });
  
  if (hasTransparent) {
    purity += 0.2;
    notes.push("투간 있음 (+0.2)");
  }
  
  // Step 4: 십신 개수로 순도 보정
  const count = vectors.tenGods[monthShishen] || 0;
  if (count >= 2.0) {
    purity += 0.15;
    notes.push(`${monthShishen} 충분 (+0.15)`);
  } else if (count < 1.0) {
    purity -= 0.1;
    notes.push(`${monthShishen} 부족 (-0.1)`);
  }
  
  // Step 5: 파격 판정 (월지 충)
  let broken = false;
  const branches = [
    pillars.year.branch,
    pillars.day.branch,
    pillars.hour.branch
  ];
  
  for (const clashPair of window.SajuData.EARTHLY_CLASHES) {
    if (clashPair.includes(monthBranch)) {
      const opposit = clashPair.find(b => b !== monthBranch);
      if (branches.includes(opposit)) {
        broken = true;
        purity -= 0.25;
        notes.push(`월지 충(${monthBranch}↔${opposit}) 파격!`);
        break;
      }
    }
  }
  
  purity = Math.max(0.1, Math.min(1.0, purity));
  
  return {
    main: geokName,
    sub: null,
    purity,
    broken,
    notes
  };
}

/* =========================================================
   PART 5: 용/희/기/한 분류
   ========================================================= */

/**
 * 용희기한 분류 (2단계 방식)
 * @param {object} state - { pillars, vectors, strength, geok }
 * @returns {object} { yong, hee, gi, han }
 */
function classifyYongHeeGiHan(state) {
  const { vectors, strength, geok } = state;
  const dayStem = state.pillars.day.stem;
  const dayElement = window.SajuData.WUXING_STEM[dayStem];
  
  // Step 1: 격 기반 후보 (prefer/avoid)
  const geokPref = window.SajuData.GEOK_PREFERENCE[geok.main] || window.SajuData.GEOK_PREFERENCE["혼합격"];
  const preferList = geokPref.prefer || [];
  const avoidList = geokPref.avoid || [];
  
  // Step 2: 신강/신약 기반 후보
  let strengthPrefer = [];
  let strengthAvoid = [];
  
  if (strength.score <= 35) {
    // 신약: 비겁/인성 선호
    strengthPrefer.push("比肩", "劫財");
    const inseongElement = Object.keys(window.SajuData.WUXING_GENERATES).find(
      e => window.SajuData.WUXING_GENERATES[e] === dayElement
    );
    if (inseongElement) {
      Object.keys(window.SajuData.WUXING_STEM).forEach(stem => {
        if (window.SajuData.WUXING_STEM[stem] === inseongElement) {
          const ss = getShishen(dayStem, stem);
          if (ss && !strengthPrefer.includes(ss)) strengthPrefer.push(ss);
        }
      });
    }
    strengthAvoid.push("食神", "傷官", "偏財", "正財", "偏官", "正官");
  } else if (strength.score >= 66) {
    // 신강: 식상/재성/관성 선호
    strengthPrefer.push("食神", "傷官", "偏財", "正財", "偏官", "正官");
    strengthAvoid.push("比肩", "劫財", "偏印", "正印");
  } else {
    // 중화: 격 우선
    strengthPrefer = [...preferList];
  }
  
  // Step 3: 목표함수로 최종 분류
  const allTenGods = [
    "比肩", "劫財", "食神", "傷官", "偏財", "正財", "偏官", "正官", "偏印", "正印"
  ];
  
  const scores = {};
  
  allTenGods.forEach(tg => {
    let score = 0;
    
    // 격 선호
    if (preferList.includes(tg)) score += 10;
    if (geokPref.support && geokPref.support.includes(tg)) score += 5;
    if (avoidList.includes(tg)) score -= 10;
    
    // 신강약 선호
    if (strengthPrefer.includes(tg)) score += 8;
    if (strengthAvoid.includes(tg)) score -= 8;
    
    // 현재 개수 (과다 페널티)
    const count = vectors.tenGods[tg] || 0;
    if (count > 2.5) score -= 5; // 과다
    if (count < 0.5) score += 3;  // 부족
    
    scores[tg] = score;
  });
  
  // 정렬
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  
  // 분류
  const yong = { tenGods: [sorted[0][0]], elements: [] };
  const hee = { tenGods: [sorted[1][0], sorted[2][0]], elements: [] };
  const gi = { tenGods: [], elements: [] };
  const han = { tenGods: [], elements: [] };
  
  sorted.forEach(([tg, score]) => {
    if (score < -5 && !gi.tenGods.includes(tg)) {
      gi.tenGods.push(tg);
    } else if (!yong.tenGods.includes(tg) && !hee.tenGods.includes(tg) && !gi.tenGods.includes(tg)) {
      han.tenGods.push(tg);
    }
  });
  
  // 오행도 매핑
  yong.tenGods.forEach(tg => {
    Object.keys(window.SajuData.WUXING_STEM).forEach(stem => {
      const ss = getShishen(dayStem, stem);
      if (ss === tg) {
        const elem = window.SajuData.WUXING_STEM[stem];
        if (!yong.elements.includes(elem)) yong.elements.push(elem);
      }
    });
  });
  
  // hee, gi도 동일 방식
  hee.tenGods.forEach(tg => {
    Object.keys(window.SajuData.WUXING_STEM).forEach(stem => {
      const ss = getShishen(dayStem, stem);
      if (ss === tg) {
        const elem = window.SajuData.WUXING_STEM[stem];
        if (!hee.elements.includes(elem)) hee.elements.push(elem);
      }
    });
  });
  
  gi.tenGods.forEach(tg => {
    Object.keys(window.SajuData.WUXING_STEM).forEach(stem => {
      const ss = getShishen(dayStem, stem);
      if (ss === tg) {
        const elem = window.SajuData.WUXING_STEM[stem];
        if (!gi.elements.includes(elem)) gi.elements.push(elem);
      }
    });
  });
  
  return { yong, hee, gi, han };
}

/* =========================================================
   PART 6: 합충형파해 판정
   ========================================================= */

/**
 * 합충 판정
 */
function detectInteractions(pillars) {
  const interactions = {
    합: [],
    충: [],
    형: [],
    criticalHits: []
  };
  
  const stems = [
    pillars.year.stem,
    pillars.month.stem,
    pillars.day.stem,
    pillars.hour.stem
  ];
  
  const branches = [
    pillars.year.branch,
    pillars.month.branch,
    pillars.day.branch,
    pillars.hour.branch
  ];
  
  // 천간오합
  for (const [a, b] of HEAVENLY_COMBINATIONS) {
    if (stems.includes(a) && stems.includes(b)) {
      interactions.합.push({ type: "천간오합", stems: [a, b] });
    }
  }
  
  // 지지 육합
  for (const [a, b] of EARTHLY_SIX_COMBINATIONS) {
    if (branches.includes(a) && branches.includes(b)) {
      interactions.합.push({ type: "육합", branches: [a, b] });
    }
  }
  
  // 지지 삼합
  for (const group of EARTHLY_THREE_COMBINATIONS) {
    const matchCount = branches.filter(b => group.branches.includes(b)).length;
    if (matchCount >= 2) {
      interactions.합.push({ 
        type: matchCount === 3 ? "삼합완성" : "삼합반합", 
        branches: group.branches,
        element: group.element
      });
    }
  }
  
  // 지지 충
  for (const [a, b] of window.SajuData.EARTHLY_CLASHES) {
    if (branches.includes(a) && branches.includes(b)) {
      const critical = (pillars.month.branch === a || pillars.month.branch === b) ||
                      (pillars.day.branch === a || pillars.day.branch === b);
      interactions.충.push({ branches: [a, b], critical });
      if (critical) {
        interactions.criticalHits.push(`월지/일지 충: ${a}↔${b}`);
      }
    }
  }
  
  return interactions;
}

/* =========================================================
   PART 7: 한신 활성화
   ========================================================= */

/**
 * 한신 활성화도 계산
 */
function calculateHanActivation(han, interactions, vectors) {
  let activation = 0.1; // 기본
  
  // TODO: 식상생재, 관인상생 체인 판정
  // 일단 기본만
  
  return activation;
}

/* =========================================================
   PART 8: 점수 엔진
   ========================================================= */

/**
 * 오행 균형 점수 (0~20)
 */
function scoreBalance(vectors) {
  const total = Object.values(vectors.elements).reduce((a, b) => a + b, 0);
  if (total === 0) return 10;
  
  let deviation = 0;
  Object.values(vectors.elements).forEach(count => {
    const ratio = count / total;
    deviation += Math.abs(ratio - 0.2);
  });
  
  const maxDeviation = 1.2;
  const normalized = Math.max(0, 1 - deviation / maxDeviation);
  
  return normalized * 20;
}

/**
 * 신강약 적정 점수 (0~10)
 */
function scoreStrength(strength) {
  const s = strength.score;
  
  // 목표: 45~60 사이
  if (s >= 45 && s <= 60) {
    return 10;
  } else if (s < 45) {
    return Math.max(0, 10 - (45 - s) * 0.3);
  } else {
    return Math.max(0, 10 - (s - 60) * 0.2);
  }
}

/**
 * 격 유지 점수 (0~12)
 */
function scoreGeokIntegrity(geok, vectors) {
  let score = geok.purity * 10; // 순도 기반
  
  if (geok.broken) score -= 5;
  
  return Math.max(0, Math.min(12, score));
}

/**
 * 용희기한 점수 (0~18)
 */
function scoreYongHeeGiHan(gods, vectors) {
  let score = 0;
  
  // 용신 충족
  gods.yong.tenGods.forEach(tg => {
    const count = vectors.tenGods[tg] || 0;
    score += Math.min(count * 4, 8);
  });
  
  // 희신 충족
  gods.hee.tenGods.forEach(tg => {
    const count = vectors.tenGods[tg] || 0;
    score += Math.min(count * 2, 4);
  });
  
  // 기신 페널티
  gods.gi.tenGods.forEach(tg => {
    const count = vectors.tenGods[tg] || 0;
    if (count > 1.5) score -= count * 2;
  });
  
  return Math.max(0, Math.min(18, score));
}

/**
 * 합충 점수 (-15~+15)
 */
function scoreInteractions(interactions, gods) {
  let score = 0;
  
  // 합: 기본 가점
  score += interactions.합.length * 2;
  
  // 충: 페널티 (critical이면 더 큼)
  interactions.충.forEach(c => {
    score -= c.critical ? 10 : 5;
  });
  
  // 형: 페널티
  score -= interactions.형.length * 3;
  
  return Math.max(-15, Math.min(15, score));
}

/**
 * 프로파일 점수 (0~20)
 */
function scoreProfile(vectors, interactions, profileName) {
  const profile = window.SajuData.PROFILES[profileName] || window.SajuData.PROFILES.overall;
  let score = 0;
  
  // 십신 가중
  Object.entries(profile.tenGods).forEach(([tg, weight]) => {
    const count = vectors.tenGods[tg] || 0;
    score += count * weight * 0.5;
  });
  
  // 합충 가중
  score += interactions.합.length * (profile.interactions.합 || 0);
  score += interactions.충.length * (profile.interactions.충 || 0);
  
  return Math.max(0, Math.min(20, score));
}

/**
 * 총점 계산
 */
function computeTotalScore(state, profileName = "overall") {
  const balanceScore = scoreBalance(state.vectors);
  const strengthScore = scoreStrength(state.strength);
  const geokScore = scoreGeokIntegrity(state.geok, state.vectors);
  const yhghScore = scoreYongHeeGiHan(state.gods, state.vectors);
  const interactionScore = scoreInteractions(state.interactions, state.gods);
  const profileScore = scoreProfile(state.vectors, state.interactions, profileName);
  
  const total = 50 + balanceScore + strengthScore + geokScore + yhghScore + interactionScore + profileScore;
  
  const clamped = Math.max(0, Math.min(100, Math.round(total)));
  
  return {
    total: clamped,
    breakdown: {
      balance: Math.round(balanceScore),
      strength: Math.round(strengthScore),
      geok: Math.round(geokScore),
      yhgh: Math.round(yhghScore),
      interaction: Math.round(interactionScore),
      profile: Math.round(profileScore)
    }
  };
}

/* =========================================================
   PART 9: 상태 빌드 (통합)
   ========================================================= */

/**
 * 사주로부터 완전한 상태 객체 생성
 */
function buildState(pillars) {
  const vectors = calculateVectors(pillars);
  const strength = calculateStrength(pillars);
  const geok = determineGeok(pillars, vectors);
  const gods = classifyYongHeeGiHan({ pillars, vectors, strength, geok });
  const interactions = detectInteractions(pillars);
  
  return {
    pillars,
    vectors,
    strength,
    geok,
    gods,
    interactions
  };
}

/* =========================================================
   Export
   ========================================================= */
window.SajuEngine = {
  getShishen,
  calculateVectors,
  calculateStrength,
  determineGeok,
  classifyYongHeeGiHan,
  detectInteractions,
  computeTotalScore,
  buildState
};

console.log("✅ SajuEngine 로드 완료");
