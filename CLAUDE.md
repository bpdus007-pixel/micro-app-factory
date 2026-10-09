# Autonomous Micro-App Factory — 운영 지침 (모든 Claude 세션 필독)

이 저장소는 초소형 실용 웹앱 1,000개를 자동으로 제작·검증·공개·운영하는 "공장"이다.
**이전 대화 기억은 없다고 가정한다. 이 파일과 `registry/` 의 기록만으로 작업을 이어간다.**
소유자(비개발자)의 원 지시서: `docs/OWNER_DIRECTIVE.md`. 이 파일과 충돌하면 원 지시서가 우선한다.

---

## 1. 절대 규칙

1. **추가 지출 0원.** 유료 서비스·도메인·플랜 업그레이드·추가 사용량 구매·종량제 API를 사용하거나 개설하지 않는다. 필요하면 `registry/owner-requests.json` 에 사유·예상 비용을 기록만 한다.
2. **정직한 기록.** 실행하지 못한 테스트를 통과로, 확인하지 못한 배포를 완료로 기록하지 않는다. 측정하지 않은 방문·수익을 추정해 실적처럼 쓰지 않는다.
3. **완료 = 공개 URL 검증 통과.** 앱 상태 `live` 는 CI 가 실제 공개 URL에서 브라우저 테스트를 통과했을 때만 CI 가 설정한다. 에이전트가 직접 `live` 로 바꾸지 않는다.
4. **사용자에게 피해 금지.** 의료 진단, 투자 권유, 법률 판단, 안전에 직결되는 계산(약 용량, 전기·가스 시공 안전 등)은 만들지 않는다. 결과가 참고용인 계산(세금·급여·대출 등)은 화면에 "참고용, 기준일·가정" 을 명시한다.
5. **중복 금지.** 기존 앱과 `function_key`(핵심 기능)가 같거나 이름만 다른 앱을 만들지 않는다. 검색 순위 조작용 얇은 페이지를 양산하지 않는다.
6. **개인정보·네트워크 금지(기본).** 앱은 서버·DB·회원가입·외부 API·외부 스크립트·추적 코드 없이 브라우저 안에서만 동작한다 (`scripts/validate.mjs` 가 강제). 예외가 꼭 필요하면 만들지 말고 아이디어를 `rejected` 로 기록한다.
7. **저작권.** 타인의 상표·디자인·문구·데이터를 복제하지 않는다. 공공 기준값(예: 요금표)을 쓰면 출처와 기준일을 화면에 표기한다.
8. **소유자에게 묻지 않는다.** 앱 선정, 디자인, 기술, 다음 단계, 오류 수정은 스스로 결정한다. 소유자 조치가 꼭 필요한 일(로그인, 결제, 법적 동의, 본인 인증, 보안 위험)만 `registry/owner-requests.json` 에 추가한다. 응답이 없으면 그 일은 하지 않고 다른 안전한 작업을 계속한다.
9. **기존 앱 보호.** 다른 앱 파일을 수정하는 변경은 해당 앱의 테스트도 모두 통과해야 한다. `apps/_shared/` 수정은 모든 앱에 영향을 주므로 최소화한다.

---

## 2. 구조

| 구성 | 내용 |
|---|---|
| 자동 실행 | 소유자 PC의 Claude 데스크톱 예약 작업 **micro-app-factory-daily**, 매일 13:00 KST (작업 폴더 `C:\dev\micro-app-factory`, 로컬 Git 자격증명으로 push). PC·앱이 꺼져 있으면 다음 실행 때 실행. 클라우드 Routine 전환은 owner-requests R001 대기 |
| 코드·상태 저장 | GitHub `bpdus007-pixel/micro-app-factory` (public). `registry/` 가 단일 진실 원천 |
| 호스팅 | GitHub Pages (무료) — `https://bpdus007-pixel.github.io/micro-app-factory/` |
| CI/CD | `.github/workflows/pipeline.yml` (GitHub Actions, public repo 무료) |
| 앱 형태 | 정적 HTML + ES module JS. 빌드 도구 없음. 앱당 폴더 1개 `apps/<slug>/` |
| 테스트 | ① `validate.mjs` 구조·정책 ② `node --test` 로직 단위 테스트 ③ Playwright 브라우저 테스트 (`e2e.json`, 모바일 390px·데스크톱 1280px) ④ 배포 후 공개 URL 동일 테스트 |
| 대시보드 | 사이트 루트 `index.html` (도구 목록 + "운영 현황" 펼침, `#ops`) |

### 배포 흐름 (CI 가 자동 수행)
1. 에이전트는 `claude/` 로 시작하는 브랜치에만 push 한다 (main 직접 push 금지).
2. `pipeline.yml` gate: validate + 단위 테스트 + build + 브라우저 테스트.
3. 통과 시 promote: main 에 merge → 브랜치 삭제 → main 에서 pipeline 재실행(dispatch).
4. main 실행: gate → Pages 배포 → 45초 대기 후 공개 URL 브라우저 테스트(`e2e:live --write`) → `registry/live-check.json`, `registry/apps.json` 상태(`ready→live` 또는 `live_failed`), `registry/pipeline-status.json` 을 main 에 커밋 → 대시보드 재배포.
5. 실패 시: 아무것도 배포되지 않고 이전 사이트가 유지된다. `report-failure` 가 `registry/pipeline-status.json` 에 실패(ref, stage)를 기록한다. 브랜치는 남는다.
6. 매일 06:30 KST 스케줄: 공개 URL 전체 재검증(모니터링).

---

## 3. 저장소 구성

```
CLAUDE.md                 이 문서 (운영 지침)
docs/OWNER_DIRECTIVE.md   소유자 원 지시서 (변경 금지)
docs/SETUP_LOG.md         초기 구축 기록과 소유자 조치 이력
registry/config.json      목표, 실행당 제작 수(apps_per_run), 일시정지, 비용
registry/apps.json        앱 레지스트리 (ID, slug, 명세, 상태, 이력)
registry/ideas.json       아이디어 백로그 (queued/taken/rejected)
registry/runs.json        자동 실행 기록 (scripts/log-run.mjs 로 추가)
registry/live-check.json  최근 공개 URL 검증 결과 (CI 가 씀)
registry/pipeline-status.json  CI 결과 이력 (CI 가 씀)
registry/owner-requests.json   소유자 조치 필요 항목
apps/_shared/             공통 CSS·JS (style.css, ui.js, num.js)
apps/<slug>/              index.html, app.js, logic.js, logic.test.js, e2e.json
scripts/                  validate, build-site, e2e, new-app, status, log-run, pipeline-status, template/
site/                     대시보드(루트 페이지) 소스
```

---

## 4. 레지스트리 규칙

- 앱 ID: `A0001` 부터 순차. 한 번 쓴 ID·slug·function_key 는 재사용하지 않는다 (보류·격리 앱 포함).
- `function_key`: 핵심 기능을 나타내는 영문 kebab-case. 중복 판단의 기준. 새 앱의 기능이 기존 앱 기능의 부분집합·단순 변형이면 중복이다.
- 앱 항목 필드: `id, slug, title, category, function_key, summary, spec, status, network_allowed, created_at, updated_at, tested_at, verified_at, attempts, history[]`.
  - `spec`: 입력, 처리(공식·규칙), 출력, 오류 처리를 한 단락으로. 계산 공식은 반드시 기록.
  - `history`: `{at, event, note}` 추가만 한다 (삭제·수정 금지).
- 시각은 UTC ISO8601 (`2026-10-09T18:00:00Z`).
- JSON 은 2칸 들여쓰기, UTF-8. 수작업 편집 후 반드시 `npm run validate`.

### 앱 상태

| 상태 | 의미 | 공개 | 설정 주체 |
|---|---|---|---|
| `building` | 제작 중 (미완성 상태로 main 에 들어갈 수 있음) | X | 에이전트 |
| `ready` | 로컬 검증 완료, CI 배포·공개 URL 검증 대기 | O | 에이전트 |
| `live` | 공개 URL 검증 통과 = **제작 완료 수량** | O | CI |
| `live_failed` | 공개 URL 검증 실패 | O | CI |
| `on_hold` | 수정 시도 3회 실패 등으로 보류 | X | 에이전트 |
| `quarantined` | 사용자 피해 우려로 격리 (사이트에서 제거) | X | 에이전트 |
| `retired` | 운영 종료 | X | 에이전트 |

---

## 5. 매 실행 절차 (RUNBOOK)

자동 실행(Routine)이 시작되면 아래 순서를 그대로 수행한다. 각 단계 결과를 메모해 마지막에 기록한다.

### 5.1 준비
```bash
git fetch origin --prune && git checkout main && git pull --ff-only origin main
npm ci || echo "npm ci failed (network?) — validate/test/build still work without deps"
npm run status
cat registry/owner-requests.json
git ls-remote --heads origin 'claude/*'
```
- `RUN_ID` = 시작 시각 UTC `YYYYMMDD-HHMM`. 작업 브랜치 = `claude/run-$RUN_ID`.
- `config.production_paused` 가 true 이면 5.2·5.3 만 수행한다.
- `live` 수 ≥ `target_app_count` 이면 신규 제작을 하지 않는다 (§9).

### 5.2 미해결 작업 우선 처리
1. **남아 있는 `claude/*` 원격 브랜치** = 아직 merge 되지 않은 이전 작업.
   - `registry/pipeline-status.json` history 에 그 ref 의 `failure` 가 있으면: 해당 브랜치를 checkout, `npm run check` 와 (가능하면) `npm run e2e` 로 재현, 원인을 고쳐 같은 브랜치에 push. 관련 앱 `attempts` +1, history 기록.
   - `attempts` 가 `config.max_fix_attempts_per_app`(3) 이상이면 고치지 말고 해당 앱 `status: on_hold` + 사유 기록 후 push (보류 앱은 게시·테스트 대상에서 빠지므로 gate 를 통과한다).
   - 실패 기록이 없고 브랜치 마지막 커밋이 3시간 이상 지났으면 CI 가 누락된 것이다: `git commit --allow-empty -m "retrigger CI"` 후 push. 두 번째 누락이면 owner-requests 에 "GitHub Actions 동작 확인 필요" 기록.
   - 처리한 브랜치가 있으면 이번 실행의 신규 앱 ID 는 그 브랜치의 `registry/apps.json` 최대 ID 보다 커야 한다 (`git show origin/<branch>:registry/apps.json`).
2. **`live_failed` 앱**: `registry/live-check.json` 의 실패 내용 확인.
   - 모든 앱이 동시에 실패 → Pages 장애·전파 지연 가능성. 앱을 수정하지 말고 run 기록에만 남긴다.
   - 해당 앱만 실패 → 원인 수정 (새 작업 브랜치에 포함). 사용자에게 잘못된 결과를 줄 수 있는 결함이고 이번 실행에서 고칠 수 없으면 `status: quarantined` 로 즉시 격리.
3. `status: building` 으로 main 에 남은 앱이 있으면 이어서 완성한다 (신규 제작보다 우선).

### 5.3 신규 앱 제작 (`config.apps_per_run` 개)
각 앱마다:
1. **아이디어 선택**: `registry/ideas.json` 의 `queued` 중 하나. 카테고리가 최근 5개 앱과 겹치지 않는 것을 우선. 백로그가 10개 미만이면 §7 기준으로 10개 이상 보충한다.
2. **중복·위험 검토**: `registry/apps.json` 의 모든 `function_key`·`title`·`spec` 과 비교. 중복이거나 §1-4·§1-6 위반이면 아이디어를 `rejected` + `note` 로 기록하고 다른 아이디어를 고른다.
3. **스캐폴드**:
   ```bash
   npm run new-app -- --id A00NN --slug <kebab> --title "<한국어 제목>" --category "<분류>" \
     --function-key <key> --summary "<한 줄 설명 40~90자>" --spec "<입력/처리/출력/오류>"
   ```
4. **구현** (§6 품질 기준): `logic.js`(순수 함수, DOM 없음) → `logic.test.js`(정상·경계·오류, 기대값은 손으로 계산한 정확한 수치) → `index.html`·`app.js`(UI) → `e2e.json`(normal·boundary·invalid 각 1개 이상, 결과 텍스트 검증).
5. **검증**:
   ```bash
   npm run check                       # 필수. 실패하면 고친다.
   npx playwright install chromium && npm run e2e -- --only <slug>   # 가능하면. 브라우저 설치가 막히면 "e2e deferred to CI" 로 기록
   ```
   같은 문제로 3회 고쳐도 실패하면 그 앱은 `on_hold` + 사유, 다른 아이디어로 전환.
6. 통과하면 앱 `status: "ready"`, `tested_at`, `updated_at` 갱신, history `{event:"ready", note:"unit N tests pass; e2e local pass|deferred"}`.

### 5.4 기록·push
```bash
node scripts/log-run.mjs --run-id $RUN_ID --started <시작UTC> --result success|partial|failed|skipped|maintenance \
  --summary "<한국어 한 줄: 무엇을 했는지>" --apps A00NN,... --next "<다음 실행이 할 일>" [--errors "<요약>"]
npm run validate
git checkout -b claude/run-$RUN_ID   # (5.2 에서 기존 브랜치를 고친 경우 그 브랜치에 계속 커밋해도 된다)
git add -A && git commit -m "Run $RUN_ID: <요약>"
git push -u origin claude/run-$RUN_ID
```
- 할 일이 없었어도 run 기록을 남기기 위해 브랜치를 push 한다 (`result: maintenance|skipped`).
- push 가 거부되면 `git fetch` 후 브랜치명에 `-b` 를 붙여 다시 push. main 에 직접 push 하지 않는다.

### 5.5 CI 결과 확인 (최대 20분)
```bash
for i in $(seq 1 20); do sleep 60; git fetch -q origin; \
  git show origin/main:registry/pipeline-status.json | grep -q "claude/run-$RUN_ID" && break; done
git show origin/main:registry/pipeline-status.json | head -40
```
- 브랜치 ref 로 `stage: promote, result: success` 가 보이면 main 에 merge 된 것이다. 이후 `ref: main, stage: verify` 기록이 나타날 때까지 계속 확인한다 (`result: success` 와 `apps.json` 의 `live` 전환이 보이면 공개 완료, `live_failed` 면 5.2-2).
- 브랜치 ref 로 `result: failure` 가 보이면 gate/promote 실패다.
- 실패 기록이 보이고 시간이 남으면 5.2-1 절차로 바로 수정한다.
- 20분 내 결과가 없으면 종료한다. 다음 실행의 5.2 가 이어받는다. 결과를 추측해서 보고하지 않는다.

### 5.6 종료 보고
마지막 메시지에 다음을 짧게 남긴다: 제작/수정한 앱, 테스트 결과(실행한 것과 못 한 것 구분), push 한 브랜치, CI 확인 결과, 다음 실행 할 일.

---

## 6. 앱 품질 기준 (Definition of Done)

- 한 가지 실제 불편을 해결하는 동작하는 기능. 입력 → 즉시 유용한 결과.
- 한국어 UI (`<html lang="ko">`), 모바일 390px 에서 가로 스크롤 없음, 터치 영역 44px 이상 (공통 CSS 사용).
- `index.html`: 고유 `<title>`(기능이 드러나게), 20자 이상 meta description, `../_shared/style.css`, `<script type="module" src="./app.js">`, 하단에 "입력값은 브라우저 안에서만 처리" 문구와 `../../` 목록 링크.
- 계산·처리는 `logic.js` 순수 함수. 숫자 입력은 `parseNumber` 사용(빈칸·문자 → 오류, 0 으로 대체 금지). 오류 메시지는 무엇을 고칠지 알려주는 한국어 문장.
- 사용자 입력을 `innerHTML` 에 넣지 않는다 (`textContent` 또는 `esc()`).
- 테스트에 쓰는 요소는 `data-testid` 를 단다. 결과 영역 `data-testid="result"`, 오류 영역 `data-testid="error"`.
- `logic.test.js` 최소 3개 test (정상·경계·오류). 금액·날짜·단위 환산은 손으로 검산한 값으로 단언.
- `e2e.json` 단계: `fill, select, click, check, uncheck, press(+key), wait(ms≤2000), expectText/expectValue(+equals|contains|matches), expectVisible, expectHidden, expectCount(+count)`. 각 case 는 새 페이지에서 시작.
- localStorage 사용 가능(설정 기억 등) — 실패해도 동작해야 하므로 try/catch.
- 파일 하나 200KB 이하. 이미지가 필요하면 인라인 SVG.

---

## 7. 아이디어 발굴 기준

- 우선 유형: 계산기, 변환기, 간단한 생성기, 데이터 정리, 문서 검사·편집, 간단한 시뮬레이터, 일정·수량·비용 계획, 비교·의사결정 보조.
- 분야 제한 없음: 생활, 가정, 취미, 교육, 업무, 제조, 중고거래, 자동차, 여행, 반려동물, 음식, 디자인, 문서, 개발 등. 한 분야에 몰리지 않게 순환.
- 좋은 아이디어: 사람들이 실제로 검색할 만한 구체적 문제("타일 몇 장 필요", "더치페이 누가 얼마"), 입력 몇 개로 정확한 답, 외부 데이터 불필요.
- 제외: §1-4 고위험, 실시간 데이터 필요(환율·시세·날씨), 로그인·업로드 서버 필요, 기존 앱과 기능 중복, 의미 없는 변형(같은 계산기의 단위만 다른 버전).
- 백로그 항목: `{function_key, title, category, function, status:"queued", source:"run-<RUN_ID>"}`.
- 좋은 아이디어가 부족하면 수량을 채우려고 억지로 만들지 않는다. run 기록에 "아이디어 부족" 을 남기고 새 분야를 탐색한다.

---

## 8. 생산량 확대 정책

현재 단계는 `npm run status` 가 `live` 수로 계산한다 (`config.stage_thresholds`).
- `live` < 10: `apps_per_run = 1` 유지.
- `live` ≥ 10 이고 최근 5회 실행이 모두 `success` 이며 최근 5회 pipeline 에 failure 가 없으면 `apps_per_run` 을 +1 (최대 `apps_per_run_max` 5). 변경 시 config 와 run 기록에 사유를 남긴다.
- pipeline failure 가 최근 5회 중 2회 이상이거나 실행이 중간에 끊긴 흔적(5.4 기록 없음)이 반복되면 `apps_per_run` 을 1 줄인다 (최소 1).
- `live` 30 도달 시: `docs/REVIEW_30.md` 에 오류율(실패 pipeline/전체), 평균 수정 횟수, 비용(0원 확인) 정리.
- `live` 100 도달 시: `docs/REVIEW_100.md` 에 수익화 검토 (§10). 방문 데이터가 없으면 "측정되지 않음" 으로 쓰고 측정 수단 도입을 owner-requests 로 제안.
- 30 단위마다 공통 코드 정리(중복 로직을 `_shared` 로) — 모든 앱 테스트 통과가 조건.

---

## 9. 완료·중단 조건

- `live` ≥ 1000: `config.production_paused = true`, `paused_reason = "목표 1,000개 달성 — 유지관리 모드"`. 이후 실행은 5.2(유지관리)만 수행.
- 다음 경우 위험 작업을 멈추고 `production_paused = true` + 사유 + owner-requests 기록: 비용 발생 위험, 보안 문제, 연속 3회 실행에서 배포 실패, 서비스 정책 위반 가능성.
- 일시정지 중에도 기존 앱은 계속 공개 상태로 둔다 (격리가 필요한 앱만 제거).

---

## 10. 수익화 (나중 단계)

- `live` 100 전에는 수익화 작업을 하지 않는다.
- 후보: 디스플레이 광고, 제휴 링크, 템플릿·파일 판매, 광고 제거 옵션. 앱별로 비용(계정 개설·심사·외부 스크립트로 인한 개인정보 정책 변경)이 기대 수익보다 크면 보류.
- 광고 가입·본인 인증·지급 계좌·세금 신청은 소유자만 할 수 있다 → owner-requests 로만 요청. 수익을 보장한다고 쓰지 않는다.
- 방문 통계 도입도 외부 스크립트가 필요하므로 소유자 승인 사항이다.

---

## 11. owner-requests.json 형식

```json
[{ "id": "R001", "at": "2026-10-09T05:00:00Z", "status": "open|done|dropped", "title": "짧은 제목",
   "why": "필요한 이유", "action": "소유자가 할 일(클릭 단위로)", "cost_krw": 0, "blocking": "막혀 있는 작업" }]
```
같은 요청을 중복으로 추가하지 않는다. 해결되면 `status: done` 과 날짜.

---

## 12. 실행 환경 메모

- 현재 실행 환경은 소유자 Windows PC (Git Bash, Node 24, Playwright Chromium 설치됨). 클라우드 Routine 으로 전환되면 매번 새 컨테이너에서 clone 하며 로컬 자격증명은 없다.
- push 는 `claude/` 브랜치에만 가능하다고 가정한다. GitHub API·`gh` CLI 는 없을 수 있다 → CI 결과는 main 의 `registry/pipeline-status.json` 으로 확인.
- `validate`, `test`, `build` 는 Node 내장 기능만 쓰므로 `npm ci` 실패와 무관하게 동작한다. 브라우저 테스트는 CI 가 권위 있는 게이트다.
- 사용량 한도에 걸려 실행이 중간에 끊겨도 push 전 작업은 버려질 뿐 main 은 손상되지 않는다. 다음 실행이 처음부터 다시 판단한다.
- Routine 설정(일정·프롬프트)은 https://claude.ai/code/routines 에서 바뀔 수 있다. 저장소 지침이 우선이다.
