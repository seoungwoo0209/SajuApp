/* tests.js */
(function(){
  function assert(name, cond){
    if(!cond) throw new Error("ASSERT FAIL: " + name);
    console.log("PASS:", name);
  }

  // tests rely on functions defined in script.js after load
  window.runTests = function(){
    console.log("=== runTests() 시작 ===");

    // 1) 자시 경계 테스트(시지)
    assert("hourBranch 22:59 -> 亥", window.__saju.hourBranchFromTime("22:59") === "亥");
    assert("hourBranch 23:00 -> 子", window.__saju.hourBranchFromTime("23:00") === "子");
    assert("hourBranch 00:59 -> 子", window.__saju.hourBranchFromTime("00:59") === "子");
    assert("hourBranch 01:00 -> 丑", window.__saju.hourBranchFromTime("01:00") === "丑");

    // 2) 절기 샘플 연도 범위 체크
    const jie = window.__saju.getJieqiDateTime;
    const d1 = jie(2025,"LICHUN"); // should exist in sample
    assert("jieqi sample available 2025 LICHUN", d1 instanceof Date && !isNaN(d1.getTime()));

    // 3) 절기 경계(입춘 직전/직후): ">=면 새 구간"
    const justBefore = new Date(d1.getTime() - 60*1000);
    const justAfter  = new Date(d1.getTime() + 60*1000);
    const yBefore = window.__saju.getYearGanjiByLichun(2025, justBefore);
    const yAfter  = window.__saju.getYearGanjiByLichun(2025, justAfter);
    assert("lichun boundary changes year ganji or stays logically consistent", yBefore.ganji !== yAfter.ganji || yBefore.branch !== yAfter.branch || yBefore.stem !== yAfter.stem);

    // 4) 이벤트 계산 검증: 충 pair
    const ev1 = window.__saju.calcBranchEvents(["子","卯","酉","辰"], "午"); // 子-午 충
    assert("event chung >=1", ev1.chung >= 1);

    // 5) 합 pair
    const ev2 = window.__saju.calcBranchEvents(["子","卯","酉","辰"], "丑"); // 子-丑 합
    assert("event hap >=1", ev2.hap >= 1);

    // 6) 형 그룹(寅巳申)
    const ev3 = window.__saju.calcBranchEvents(["寅","巳","卯","辰"], "申");
    assert("event hyeong group strong (+2)", ev3.hyeong >= 2);

    // 7) 삼합(亥卯未) with period 未
    const ev4 = window.__saju.calcBranchEvents(["亥","卯","子","辰"], "未");
    assert("event samhahp >=1", ev4.samhahp >= 1);

    // 8) CrashCombo 조건 발생
    const comboCrash = window.__saju.detectCombos(
      {chung:2,hyeong:1,pa:1,hae:0,hap:0,samhahp:0,banghap:0},
      {love:40,money:40,career:40,health:40,total:40,grade:"D"},
      0, 4,
      "risk"
    );
    assert("CrashCombo detected", comboCrash.primary === "CrashCombo");

    // 9) BreakthroughCombo 조건 발생
    const comboBreak = window.__saju.detectCombos(
      {chung:0,hyeong:0,pa:0,hae:0,hap:1,samhahp:1,banghap:0},
      {love:78,money:80,career:82,health:70,total:80,grade:"A"},
      2, 0,
      "opportunity"
    );
    assert("BreakthroughCombo detected", comboBreak.primary === "BreakthroughCombo");

    // 10) Transition 블렌딩 완화성: 전환 첫해(0년차)에서 blendedDaeun이 prev 영향을 받는지
    const prev = {love:40,money:40,career:40,health:40};
    const curr = {love:80,money:80,career:80,health:80};
    const blended0 = window.__saju.blendDaeunIfTransition(prev,curr,0);
    assert("transition k=0 alpha applied", blended0.love < curr.love && blended0.love > prev.love);

    // 11) 절기근사모드: 샘플 밖 연도 요청 시
    const jOut = window.__saju.getJieqiDateTime(1999,"LICHUN");
    assert("jieqi outside sample still returns date (approx)", jOut instanceof Date);

    console.log("=== runTests() 끝 (전체 PASS) ===");
  };
})();
