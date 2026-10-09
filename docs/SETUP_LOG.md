# 구축 기록

## 2026-10-09 초기 구축 세션 (Claude Code 데스크톱, 소유자 PC)

### 아키텍처 결정
| 항목 | 결정 | 사유 |
|---|---|---|
| 호스팅 | GitHub Pages (Cloudflare Pages 대신) | 계정 1개(GitHub)로 끝남 → 소유자 조치 최소화. public repo 무료. 필요 시 Cloudflare 로 이전 가능(정적 파일이라 이전 비용 낮음) |
| CI/CD | GitHub Actions `pipeline.yml` | public repo 무료. 테스트 통과분만 merge·배포 |
| 자동 실행 | Claude Code 클라우드 Routine, 매일 03:00 KST | PC 가 꺼져 있어도 동작. 구독 범위 내 |
| 모델 | claude-sonnet-5-5 | 앱 1개/일 작업에 충분, 구독 사용량 절약 |
| 앱 형태 | 정적 HTML + ES module, 빌드 도구 없음 | 의존성 최소 → 장기 유지비·고장 위험 최소 |
| 동시성 | 실행마다 고유 `claude/run-*` 브랜치, CI 가 main 병합 직렬화 | 실행이 겹쳐도 main 손상 없음 |
| 앱 언어 | 한국어 | 소유자 시장 이해, 한국어 소형 도구 경쟁 상대적으로 낮음 |

### 이 세션에서 로컬 검증한 것
- `npm run check` (validate + 단위 테스트 10개 + build) 통과
- `npm run e2e` (Playwright, 모바일 390px·데스크톱 1280px, 정상·경계·오류 케이스) A0001 + 대시보드 통과
- 잘못된 기대값을 넣으면 e2e 가 FAIL 하는 것 확인 (게이트가 실제로 막음)
- 브라우저 육안 확인: A0001 모바일 화면, 다크 모드, 계산 결과

### 진행 상태
SETUP_LOG 의 이후 항목은 진행에 따라 추가한다.
