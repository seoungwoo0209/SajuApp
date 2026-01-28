/* =========================================================
   사주 계산 엔진 (saju_core.js)
   - 천간/지지/지장간/십성 계산
   - 절기/대운/시주 계산
   - 결과를 window.SajuResult에 저장
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

// 천간 음양 (양간/음간)
const YINYANG_STEM = {
  "甲":"yang","乙":"yin","丙":"yang","丁":"yin","戊":"yang","己":"yin","庚":"yang","辛":"yin","壬":"yang","癸":"yin"
};

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

const SAMHAP_GROUPS = [
  {name:"수국", branches:["申","子","辰"]},
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

const JIEQI = ["LICHUN","JINGZHE","QINGMING","LIXIA","MANGZHONG","XIAOSHU","LIQIU","BAILU","HANLU","LIDONG","DAXUE","XIAOHAN"];
const JIEQI_BRANCH = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];
const JIEQI_BASE_DAY = [35,64,95,126,157,188,220,251,281,311,341,5];
const JIEQI_BASE_MIN = [120,330,615,890,1100,1305,210,440,680,910,1130,200];

const JIEQI_SAMPLE = (() => {
  const baseYear = 2020;
  const years = 11;
  const make = (amp) => Array.from({length: years}, (_,i)=> Math.round(Math.sin((i+1)*0.9)*amp));
  const deltas = {};
  for (const k of JIEQI) deltas[k] = make(6);
  return { baseYear, years, deltas };
})();

/* ---------------------------
   1) 유틸리티 함수들
----------------------------*/
function $(id){ return document.getElementById(id); }

function safeSetText(id, text){
  const el = $(id);
  if(el) el.textContent = text;
}

function setAlert(msg){
  const el = $("alert");
  if(!el) return;
  if(!msg){
    el.textContent = "";
    el.classList.add("hidden");
  }else{
    el.textContent = msg;
    el.classList.remove("hidden");
  }
}

function setApproxBadge(show){
  const el = $("approxBadge");
  if(!el) return;
  if(show) el.classList.remove("hidden");
  else el.classList.add("hidden");
}

function hashString(str){
  let h = 0;
  for(let i=0; i<str.length; i++){
    h = ((h<<5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pickDeterministic(arr, seedStr){
  if(!arr || arr.length===0) return "";
  const idx = hashString(seedStr) % arr.length;
  return arr[idx];
}

/* ---------------------------
   2) 날짜/시간 변환 (UTC <-> KST)
----------------------------*/
function utcDateToKSTParts(utcDate){
  const kst = new Date(utcDate.getTime() + 9*3600000);
  return {
    y: kst.getUTCFullYear(),
    m: kst.getUTCMonth()+1,
    d: kst.getUTCDate(),
    hour: kst.getUTCHours(),
    minute: kst.getUTCMinutes()
  };
}

function kstToUtcDate(y, m, d, hour=0, minute=0){
  const kstMs = Date.UTC(y, m-1, d, hour, minute, 0, 0);
  const utcMs = kstMs - 9*3600000;
  return new Date(utcMs);
}

/* ---------------------------
   3) 절기 계산
----------------------------*/
function getJieqiDateTimeKST(year, jieqiName){
  const idx = JIEQI.indexOf(jieqiName);
  if(idx<0) return {dt:null, approx:true};
  
  let baseDOY = JIEQI_BASE_DAY[idx];
  let baseMinutes = JIEQI_BASE_MIN[idx];
  
  const yearOffset = year - JIEQI_SAMPLE.baseYear;
  const inRange = (yearOffset>=0 && yearOffset<JIEQI_SAMPLE.years);
  
  if(inRange){
    const delta = JIEQI_SAMPLE.deltas[jieqiName][yearOffset];
    baseMinutes += delta;
  }
  
  const jan1 = new Date(Date.UTC(year,0,1,0,0,0,0));
  const targetMs = jan1.getTime() + (baseDOY-1)*86400000 + baseMinutes*60000;
  const dt = new Date(targetMs);
  
  return {dt, approx: !inRange};
}

function yearGanji(utcDate){
  const kst = utcDateToKSTParts(utcDate);
  const lichun = getJieqiDateTimeKST(kst.y, "LICHUN");
  let yearNum = kst.y;
  if(lichun.dt && utcDate < lichun.dt){
    yearNum -= 1;
  }
  
  const ganIdx = (yearNum - 4) % 10;
  const zhiIdx = (yearNum - 4) % 12;
  
  return {
    year: yearNum,
    stem: STEMS[ganIdx],
    branch: BRANCHES[zhiIdx]
  };
}

function monthGanji(utcDate){
  const kst = utcDateToKSTParts(utcDate);
  
  // 현재 절기 찾기
  let matchJieqi = null;
  let matchIdx = -1;
  
  for(let i=0; i<JIEQI.length; i++){
    const jq = getJieqiDateTimeKST(kst.y, JIEQI[i]);
    if(jq.dt && utcDate >= jq.dt){
      matchJieqi = JIEQI[i];
      matchIdx = i;
    }else{
      break;
    }
  }
  
  if(matchJieqi===null){
    const prevYear = kst.y - 1;
    const xiaohan = getJieqiDateTimeKST(prevYear, "XIAOHAN");
    if(xiaohan.dt && utcDate >= xiaohan.dt){
      matchJieqi = "XIAOHAN";
      matchIdx = 11;
    }
  }
  
  if(matchJieqi===null){
    matchJieqi = "XIAOHAN";
    matchIdx = 11;
  }
  
  const monthBranch = JIEQI_BRANCH[matchIdx];
  const yg = yearGanji(utcDate);
  const yearStem = yg.stem;
  
  // 五虎遁: 寅월 천간 결정
  // 甲己년->丙, 乙庚->戊, 丙辛->庚, 丁壬->壬, 戊癸->甲
  const yinStemMap = {
    "甲":"丙","己":"丙",
    "乙":"戊","庚":"戊",
    "丙":"庚","辛":"庚",
    "丁":"壬","壬":"壬",
    "戊":"甲","癸":"甲"
  };
  const yinStem = yinStemMap[yearStem];
  const monthIndex = JIEQI_BRANCH.indexOf(monthBranch); // 寅=0 .. 丑=11
  const startStemIndex = STEMS.indexOf(yinStem);
  const stemIdx = (startStemIndex + monthIndex) % 10;
  
  return {
    stem: STEMS[stemIdx],
    branch: monthBranch
  };
}

function julianDayNumber(y, m, d){
  const a = Math.floor((14 - m)/12);
  const yAdj = y + 4800 - a;
  const mAdj = m + 12*a - 3;
  return d + Math.floor((153*mAdj+2)/5) + 365*yAdj + Math.floor(yAdj/4) - Math.floor(yAdj/100) + Math.floor(yAdj/400) - 32045;
}

function dayGanjiFromYMD(y, m, d){
  const jdn = julianDayNumber(y, m, d);
  const ganIdx = (jdn + 49) % 10;
  const zhiIdx = (jdn + 1) % 12;
  
  return {
    ganji: STEMS[ganIdx] + BRANCHES[zhiIdx],
    stem: STEMS[ganIdx],
    branch: BRANCHES[zhiIdx]
  };
}

function hourBranchFromTime(hour, minute){
  let adjHour = hour;
  if(hour===23) adjHour = -1;
  const idx = Math.floor((adjHour+1)/2);
  return BRANCHES[idx % 12];
}

function hourGanjiFromDayStem(dayStem, hourBranch){
  const dayStemIdx = STEMS.indexOf(dayStem);
  const hourBranchIdx = BRANCHES.indexOf(hourBranch);
  const hourStemIdx = ((dayStemIdx % 5)*2 + hourBranchIdx) % 10;
  
  return {
    stem: STEMS[hourStemIdx],
    branch: hourBranch
  };
}

/* ---------------------------
   4) 사주팔자 계산
----------------------------*/
function getFourPillars(input){
  const {birthDate, birthTime, timezone} = input;
  const [yyyy, mm, dd] = birthDate.split('-').map(Number);
  const [hh, mi] = birthTime.split(':').map(Number);
  
  const birthUtc = kstToUtcDate(yyyy, mm, dd, hh, mi);
  
  const yg = yearGanji(birthUtc);
  const mg = monthGanji(birthUtc);
  
  const kst = utcDateToKSTParts(birthUtc);
  const dg = dayGanjiFromYMD(kst.y, kst.m, kst.d);
  
  const hourBranch = hourBranchFromTime(kst.hour, kst.minute);
  const hg = hourGanjiFromDayStem(dg.stem, hourBranch);
  
  const fourPillars = {
    year: { stem: yg.stem, branch: yg.branch },
    month: { stem: mg.stem, branch: mg.branch },
    day: { stem: dg.stem, branch: dg.branch },
    hour: { stem: hg.stem, branch: hg.branch }
  };
  
  let approx = false;
  const kstParts = utcDateToKSTParts(birthUtc);
  const lichunCheck = getJieqiDateTimeKST(kstParts.y, "LICHUN");
  if(lichunCheck.approx) approx = true;
  
  for(const jqName of JIEQI){
    const jq = getJieqiDateTimeKST(kstParts.y, jqName);
    if(jq.approx){
      approx = true;
      break;
    }
  }
  
  return { fourPillars, birthUtc, approx };
}

/* ---------------------------
   5) 오행 계산
----------------------------*/
function getWuxingCounts(fourPillars, includeHidden){
  // 표면 8글자 (천간 4개 + 지지 4개)
  const surface = {wood:0, fire:0, earth:0, metal:0, water:0};
  
  // 천간 4개
  for(const pillar of [fourPillars.year, fourPillars.month, fourPillars.day, fourPillars.hour]){
    const wx = WUXING_STEM[pillar.stem];
    if(wx) surface[wx]++;
  }
  
  // 지지 4개
  for(const pillar of [fourPillars.year, fourPillars.month, fourPillars.day, fourPillars.hour]){
    const wx = WUXING_BRANCH[pillar.branch];
    if(wx) surface[wx]++;
  }
  
  if(!includeHidden){
    return surface;
  }
  
  // 지장간 포함 계산: 표면 + 지장간 내 모든 천간
  const withHidden = {...surface};
  
  for(const pillar of [fourPillars.year, fourPillars.month, fourPillars.day, fourPillars.hour]){
    const hiddenStems = HIDDEN_STEMS_BRANCH[pillar.branch];
    if(hiddenStems){
      // 지장간의 모든 천간을 개별적으로 1개씩 카운트
      for(const stem of hiddenStems){
        const wx = WUXING_STEM[stem];
        if(wx) withHidden[wx]++;
      }
    }
  }
  
  return { surface, withHidden };
}

function getYinYangCounts(fourPillars, includeHidden){
  // 표면 천간 4개만
  const surface = {yang:0, yin:0};
  
  for(const pillar of [fourPillars.year, fourPillars.month, fourPillars.day, fourPillars.hour]){
    const yy = YINYANG_STEM[pillar.stem];
    if(yy) surface[yy]++;
  }
  
  if(!includeHidden){
    return surface;
  }
  
  // 지장간 포함: 표면 천간 + 지장간 내 모든 천간
  const withHidden = {...surface};
  
  for(const pillar of [fourPillars.year, fourPillars.month, fourPillars.day, fourPillars.hour]){
    const hiddenStems = HIDDEN_STEMS_BRANCH[pillar.branch];
    if(hiddenStems){
      for(const stem of hiddenStems){
        const yy = YINYANG_STEM[stem];
        if(yy) withHidden[yy]++;
      }
    }
  }
  
  return { surface, withHidden };
}

function full5Summary(counts){
  const arr = ["wood","fire","earth","metal","water"].map(wx => WUXING_LABEL[wx] + counts[wx]);
  return arr.join(" ");
}

/* ---------------------------
   6) 지지 이벤트 계산 (충/합/파/해/형/삼합/방합)
----------------------------*/
function calcBranchEvents(natalBranches, periodBranch){
  const events = {hap:0, chung:0, hyeong:0, pa:0, hae:0, samhahp:0, banghap:0};
  
  for(const nb of natalBranches){
    for(const [a,b] of CHUNG_PAIRS){
      if((nb===a && periodBranch===b)||(nb===b && periodBranch===a)){
        events.chung++;
      }
    }
    for(const [a,b] of HAP_L6_PAIRS){
      if((nb===a && periodBranch===b)||(nb===b && periodBranch===a)){
        events.hap++;
      }
    }
    for(const [a,b] of PA_PAIRS){
      if((nb===a && periodBranch===b)||(nb===b && periodBranch===a)){
        events.pa++;
      }
    }
    for(const [a,b] of HAE_PAIRS){
      if((nb===a && periodBranch===b)||(nb===b && periodBranch===a)){
        events.hae++;
      }
    }
    
    for(const group of HYEONG_GROUPS){
      const hasNatal = group.includes(nb);
      const hasPeriod = group.includes(periodBranch);
      if(hasNatal && hasPeriod && nb!==periodBranch){
        events.hyeong++;
      }
    }
    if(SELF_HYEONG.includes(nb) && nb===periodBranch){
      events.hyeong++;
    }
  }
  
  for(const {branches} of SAMHAP_GROUPS){
    const nCount = natalBranches.filter(x => branches.includes(x)).length;
    const hasPeriod = branches.includes(periodBranch);
    if(hasPeriod && nCount>=1){
      events.samhahp++;
    }
  }
  
  for(const {branches} of BANGHAP_GROUPS){
    const nCount = natalBranches.filter(x => branches.includes(x)).length;
    const hasPeriod = branches.includes(periodBranch);
    if(hasPeriod && nCount>=2){
      events.banghap++;
    }
  }
  
  return events;
}

/* ---------------------------
   7) 대운 계산
----------------------------*/
function buildDaeunTimeline(fourPillars, birthUtc, gender){
  const monthStem = fourPillars.month.stem;
  const yearStem = fourPillars.year.stem;
  const monthBranch = fourPillars.month.branch;
  
  const yearStemIdx = STEMS.indexOf(yearStem);
  const isYangYear = (yearStemIdx % 2 === 0);
  
  let forward = false;
  if((gender==="M" && isYangYear) || (gender==="F" && !isYangYear)){
    forward = true;
  }
  
  const kstBirth = utcDateToKSTParts(birthUtc);
  const birthY = kstBirth.y;
  const birthM = kstBirth.m;
  const birthD = kstBirth.d;
  
  let nextJieqiName = null;
  let jieqiMonth = BRANCHES.indexOf(monthBranch);
  if(forward){
    jieqiMonth = (jieqiMonth + 1) % 12;
    nextJieqiName = JIEQI[jieqiMonth];
  }else{
    jieqiMonth = (jieqiMonth - 1 + 12) % 12;
    nextJieqiName = JIEQI[jieqiMonth];
  }
  
  let nextJieqi = getJieqiDateTimeKST(birthY, nextJieqiName);
  if(!nextJieqi.dt || nextJieqi.dt < birthUtc){
    nextJieqi = getJieqiDateTimeKST(birthY + 1, nextJieqiName);
  }
  
  const daysDiff = Math.floor((nextJieqi.dt - birthUtc) / 86400000);
  const daeunStartAge = Math.floor(daysDiff / 3);
  
  const daeunStartDate = new Date(birthUtc.getTime() + daeunStartAge*365.25*86400000);
  const daeunStartKST = utcDateToKSTParts(daeunStartDate);
  const dateApprox = `${daeunStartKST.y}-${String(daeunStartKST.m).padStart(2,'0')}`;
  
  const monthStemIdx = STEMS.indexOf(monthStem);
  const monthBranchIdx = BRANCHES.indexOf(monthBranch);
  
  const decades = [];
  for(let i=0; i<10; i++){
    let stemIdx, branchIdx;
    if(forward){
      stemIdx = (monthStemIdx + i + 1) % 10;
      branchIdx = (monthBranchIdx + i + 1) % 12;
    }else{
      stemIdx = (monthStemIdx - i - 1 + 10) % 10;
      branchIdx = (monthBranchIdx - i - 1 + 12) % 12;
    }
    
    decades.push({
      index: i,
      startAge: daeunStartAge + i*10,
      endAge: daeunStartAge + i*10 + 9,
      stem: STEMS[stemIdx],
      branch: BRANCHES[branchIdx]
    });
  }
  
  return {
    direction: forward ? "순행" : "역행",
    daeunStart: { age: daeunStartAge, dateApprox },
    decades
  };
}

/* ---------------------------
   8) UI 렌더링 함수들
----------------------------*/
function animatePillars(fourPillars){
  const pillars = [fourPillars.year, fourPillars.month, fourPillars.day, fourPillars.hour];
  const ids = ["p-year","p-month","p-day","p-hour"];
  
  pillars.forEach((p, idx) => {
    const el = $(ids[idx]);
    if(!el) return;
    el.textContent = p.stem + p.branch;
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";
    
    setTimeout(() => {
      el.style.transition = "opacity 0.4s ease, transform 0.4s ease";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, idx * 100);
  });
}

function renderBars(container, counts){
  const max = Math.max(...Object.values(counts), 1);
  container.innerHTML = "";
  
  for(const wx of ["wood","fire","earth","metal","water"]){
    const val = counts[wx];
    const pct = (val / max) * 100;
    
    const bar = document.createElement("div");
    bar.className = "bar";
    
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = WUXING_LABEL[wx];
    
    const track = document.createElement("div");
    track.className = "track";
    
    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.width = "0%";
    
    const valEl = document.createElement("div");
    valEl.className = "val";
    valEl.textContent = val;
    
    track.appendChild(fill);
    bar.appendChild(name);
    bar.appendChild(track);
    bar.appendChild(valEl);
    container.appendChild(bar);
    
    setTimeout(() => {
      fill.style.transition = "width 0.8s ease";
      fill.style.width = pct + "%";
    }, 50);
  }
}

function renderHiddenList(container, fourPillars){
  container.innerHTML = "";
  
  const pillars = [
    {label:"년지", branch: fourPillars.year.branch},
    {label:"월지", branch: fourPillars.month.branch},
    {label:"일지", branch: fourPillars.day.branch},
    {label:"시지", branch: fourPillars.hour.branch}
  ];
  
  for(const p of pillars){
    const hiddenStems = HIDDEN_STEMS_BRANCH[p.branch];
    if(!hiddenStems) continue;
    
    const row = document.createElement("div");
    row.className = "hiddenrow";
    
    const k = document.createElement("div");
    k.className = "k";
    k.textContent = `${p.label} (${p.branch})`;
    
    const v = document.createElement("div");
    v.className = "v";
    v.textContent = hiddenStems.join(", ");
    
    row.appendChild(k);
    row.appendChild(v);
    container.appendChild(row);
  }
}

/* ---------------------------
   9) 대운 렌더링 (간략 버전 - 총운 파일에서 확장)
----------------------------*/
function renderDaeunList(container, decades, birthUtc){
  container.innerHTML = "";
  
  decades.forEach((dec) => {
    const card = document.createElement("div");
    card.className = "daeun-card";
    
    const header = document.createElement("div");
    header.className = "daeun-header";
    
    const num = document.createElement("div");
    num.className = "daeun-num";
    num.textContent = `${dec.index + 1}번째 대운`;
    
    const ganji = document.createElement("div");
    ganji.className = "daeun-ganji";
    ganji.textContent = dec.stem + dec.branch;
    
    header.appendChild(num);
    header.appendChild(ganji);
    
    const info = document.createElement("div");
    info.className = "daeun-info";
    
    const age = document.createElement("div");
    age.className = "daeun-age";
    age.textContent = `${dec.startAge}세 ~ ${dec.endAge}세`;
    
    info.appendChild(age);
    
    card.appendChild(header);
    card.appendChild(info);
    container.appendChild(card);
  });
}

/* ---------------------------
   10) 탭 전환
----------------------------*/
function setTabs(){
  const tabs = document.querySelectorAll(".tab");
  const panes = document.querySelectorAll(".tabpane");
  
  tabs.forEach(tab => {
    tab.addEventListener("click", ()=>{
      const targetId = tab.getAttribute("data-tab");
      
      tabs.forEach(t => t.classList.remove("active"));
      panes.forEach(p => p.classList.remove("active"));
      
      tab.classList.add("active");
      const targetPane = document.getElementById(targetId);
      if(targetPane) targetPane.classList.add("active");
    });
  });
}

/* ---------------------------
   11) 메인 계산 함수
----------------------------*/
function runAll(){
  setAlert("");
  
  const name = $("name") ? $("name").value.trim() : "";
  const birthDate = $("birthDate") ? $("birthDate").value : "";
  const birthTime = $("birthTime") ? $("birthTime").value : "";
  const gender = $("gender") ? $("gender").value : "M";
  
  if(!birthDate || !birthTime){
    setAlert("생년월일과 출생시각을 모두 입력해주세요.");
    return;
  }
  
  const input = {
    name,
    birthDate,
    birthTime,
    gender,
    timezone: "Asia/Seoul"
  };
  
  const { fourPillars, birthUtc, approx } = getFourPillars(input);
  
  // 사주 탭
  animatePillars(fourPillars);
  safeSetText("dayMaster", `일간: ${fourPillars.day.stem}`);
  
  const surface = getWuxingCounts(fourPillars, false);
  safeSetText("top2", full5Summary(surface));
  const barsEl = $("barsSurface");
  if(barsEl) renderBars(barsEl, surface);
  
  // 지장간 탭
  const hiddenEl = $("hiddenList");
  if(hiddenEl) renderHiddenList(hiddenEl, fourPillars);
  
  // 지장간 포함 오행
  const hiddenBarsEl = $("barsHidden");
  const hw = getWuxingCounts(fourPillars, true);
  if(hw && hw.withHidden){
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
      renderDaeunList(daeunListEl, dt.decades, birthUtc);
    }
    
    // 결과를 전역 객체에 저장 (saju_fortune.js에서 사용)
    const yinyang = getYinYangCounts(fourPillars, false);
    const yinyangWithHidden = getYinYangCounts(fourPillars, true);
    
    window.SajuResult = {
      name,
      birthDate,
      birthTime,
      gender,
      fourPillars,
      birthUtc,
      approx,
      surface,
      yinyang: yinyang,
      yinyangWithHidden: yinyangWithHidden.withHidden,
      natalBranches,
      natalSurface,
      daeunTimeline: dt
    };
    
  }catch(e){
    console.error("Daeun section error:", e);
  }
}

/* ---------------------------
   12) 이벤트 바인딩
----------------------------*/
function bindUI(){
  setTabs();
  
  ["name","birthDate","birthTime","gender"].forEach(id=>{
    const el = $(id);
    if(!el) return;
    el.addEventListener("input", ()=> runAll());
    el.addEventListener("change", ()=> runAll());
  });
  
  const btn = $("btnRun");
  if(btn) btn.addEventListener("click", ()=> runAll());
  
  const btnExample = $("btnExample");
  if(btnExample){
    btnExample.addEventListener("click", ()=>{
      if($("name")) $("name").value = "추승우";
      if($("birthDate")) $("birthDate").value = "1990-03-15";
      if($("birthTime")) $("birthTime").value = "14:30";
      if($("gender")) $("gender").value = "M";
      runAll();
    });
  }
}

/* ---------------------------
   13) 초기화
----------------------------*/
document.addEventListener("DOMContentLoaded", ()=>{
  try{
    bindUI();
    runAll();
  }catch(e){
    console.error(e);
    try{ setAlert("오류가 발생했습니다. 콘솔(F12)을 확인해주세요: " + (e && e.message ? e.message : e)); }catch(_){}
  }
});
