# 사주 카페 v2.0 - 2파일 구조

## 📁 파일 구조

```
사주카페/
├── index.html          # 메인 HTML (변경됨: 2개 스크립트 로드)
├── style.css           # 스타일시트 (변경 없음)
├── background.jpg      # 배경 이미지 (변경 없음)
├── saju_core.js        # ⭐ 새로운 계산 엔진
└── saju_fortune.js     # ⭐ 새로운 총운 해석 엔진
```

## 🔄 변경 사항

### 기존 (v1.4)
- `script.js` 1개 파일에 모든 로직 포함 (1,654줄)

### 신규 (v2.0)
- **`saju_core.js`** (계산 엔진, ~800줄)
  - 천간/지지 계산
  - 지장간 계산
  - 오행 분석
  - 대운 타임라인 생성
  - **결과를 `window.SajuResult`에 저장**

- **`saju_fortune.js`** (총운 해석, ~400줄)
  - `window.SajuResult`에서 데이터 읽기
  - 일간별 성격 분석
  - 오행 균형 분석
  - 대운 등급 계산 (S/A/B/C/D/F)
  - 대운별 총운 텍스트 생성

## 🔗 연결 방식

### 1. HTML 로딩 순서
```html
<!-- index.html -->
<script src="./saju_core.js"></script>      <!-- 1단계: 계산 -->
<script src="./saju_fortune.js"></script>    <!-- 2단계: 해석 -->
```

### 2. 데이터 흐름
```
사용자 입력
    ↓
saju_core.js (계산)
    ↓
window.SajuResult = {        ← 전역 객체에 저장
  fourPillars: {...},
  surface: {...},
  daeunTimeline: {...},
  ...
}
    ↓
saju_fortune.js (읽기)
    ↓
총운 분석 & UI 업데이트
```

## 💡 핵심 원리

### window.SajuResult 객체 구조
```javascript
window.SajuResult = {
  name: "추승우",
  birthDate: "1990-03-15",
  birthTime: "14:30",
  gender: "M",
  
  fourPillars: {
    year: { stem: "庚", branch: "午" },
    month: { stem: "己", branch: "卯" },
    day: { stem: "甲", branch: "寅" },
    hour: { stem: "辛", branch: "未" }
  },
  
  surface: {
    wood: 3,
    fire: 1,
    earth: 2,
    metal: 2,
    water: 0
  },
  
  natalBranches: ["午", "卯", "寅", "未"],
  
  daeunTimeline: {
    direction: "순행",
    daeunStart: { age: 5, dateApprox: "1995-03" },
    decades: [
      { index: 0, startAge: 5, endAge: 14, stem: "庚", branch: "辰" },
      { index: 1, startAge: 15, endAge: 24, stem: "辛", branch: "巳" },
      ...
    ]
  }
}
```

## 🚀 사용 방법

### 로컬에서 테스트
```bash
# 모든 파일을 같은 폴더에 놓고
open index.html
# 또는
python -m http.server 8000
# http://localhost:8000 접속
```

### GitHub Pages 배포
```bash
git add .
git commit -m "v2.0 - 2파일 구조로 분리"
git push origin main
```

## 🎯 장점

### 1. 역할 분리
- **계산 로직**과 **해석 로직** 완전 분리
- 각 파일이 하나의 책임만 가짐

### 2. 확장 용이
```javascript
// 3번째 파일 추가 예시
// saju_세운.js
if(window.SajuResult) {
  const 세운분석 = analyze세운(window.SajuResult);
  render세운(세운분석);
}
```

### 3. 디버깅 편리
- 계산 오류 → `saju_core.js`만 확인
- 표시 오류 → `saju_fortune.js`만 확인

### 4. 협업 가능
- A님: `saju_core.js` 작업
- B님: `saju_fortune.js` 작업
- 서로 충돌 없음

## 📝 추가 기능 개발 예시

### 새로운 분석 파일 추가하기
```javascript
// saju_my_analysis.js
(function() {
  function myAnalysis() {
    if(!window.SajuResult) {
      console.log("SajuResult not ready");
      return;
    }
    
    const data = window.SajuResult;
    
    // 1. 데이터 읽기
    const dayMaster = data.fourPillars.day.stem;
    
    // 2. 분석 로직
    if(dayMaster === '甲') {
      // 갑목 분석...
    }
    
    // 3. UI 업데이트
    const container = document.getElementById('my-section');
    container.innerHTML = '분석 결과...';
  }
  
  // SajuResult 준비되면 실행
  let check = setInterval(() => {
    if(window.SajuResult) {
      myAnalysis();
      clearInterval(check);
    }
  }, 100);
})();
```

### HTML에 추가
```html
<script src="./saju_core.js"></script>
<script src="./saju_fortune.js"></script>
<script src="./saju_my_analysis.js"></script>  ← 새 파일
```

## ⚠️ 주의사항

### 1. 로딩 순서 중요
- `saju_core.js`를 **반드시 먼저** 로드
- `window.SajuResult`가 없으면 다른 파일들이 작동 안 함

### 2. 전역 객체 사용
- `window.SajuResult`는 **전역 변수**
- 실제 프로덕션에서는 모듈 시스템 사용 권장

### 3. 비동기 처리
- `saju_fortune.js`는 `SajuResult`를 기다림
- `setInterval`로 100ms마다 체크

## 🔧 테스트

### 브라우저 콘솔에서
```javascript
// 1. SajuResult 확인
console.log(window.SajuResult);

// 2. 특정 데이터 확인
console.log(window.SajuResult.fourPillars.day.stem);

// 3. 대운 정보 확인
console.log(window.SajuResult.daeunTimeline.decades);
```

## 📚 다음 단계

1. **세운 분석** 추가 → `saju_annual.js`
2. **월운 분석** 추가 → `saju_monthly.js`
3. **궁합 분석** 추가 → `saju_compatibility.js`
4. **모듈 번들러** 도입 (webpack, vite 등)

---

## 🎓 기술 팁 (추승우님을 위한)

### Q: 왜 `window.`를 붙이나요?
A: 브라우저에서 모든 JS 파일은 같은 "전역 공간"을 공유합니다.  
   `window`는 이 공간의 "게시판" 같은 역할입니다.  
   한 파일에서 `window.SajuResult`에 쓰면,  
   다른 파일에서 `window.SajuResult`로 읽을 수 있습니다.

### Q: 파일을 더 쪼개도 되나요?
A: 네! 예를 들어:
- `saju_constants.js` (상수만)
- `saju_datetime.js` (날짜 계산만)
- `saju_wuxing.js` (오행 계산만)
- `saju_events.js` (충/합/파 계산만)

단, 로딩 순서에 주의하세요.

### Q: 이게 최선인가요?
A: 간단한 프로젝트에는 좋지만, 규모가 커지면:
- ES6 모듈 (`import/export`)
- TypeScript
- 빌드 도구 (webpack, vite)
를 사용하는 게 더 좋습니다.

하지만 **지금은 이 구조가 최적**입니다!
- 외부 라이브러리 없음
- 단순한 파일 구조
- 확장 가능
- 디버깅 쉬움

---

**버전**: 2.0  
**작성일**: 2026-01-28  
**작성자**: Claude (Anthropic)
