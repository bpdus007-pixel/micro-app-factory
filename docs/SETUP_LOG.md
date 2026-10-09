# 구축 기록

## 2026-10-09 초기 구축 세션 (Claude Code 데스크톱, 소유자 PC)

### 아키텍처 결정
| 항목 | 결정 | 사유 |
|---|---|---|
| 호스팅 | GitHub Pages (Cloudflare Pages 대신) | 계정 1개(GitHub)로 끝남 → 소유자 조치 최소화. public repo 무료. 필요 시 Cloudflare 로 이전 가능(정적 파일이라 이전 비용 낮음) |
| CI/CD | GitHub Actions `pipeline.yml` | public repo 무료. 테스트 통과분만 merge·배포 |
| 자동 실행 | Claude 데스크톱 예약 작업, 매일 13:00 KST (클라우드 Routine 은 GitHub 미연결로 생성 거부됨) | 소유자 추가 조치 없이 즉시 가동 가능. 구독 범위 내 |
| 모델 | 데스크톱 기본 모델 | 예약 작업 기본값 |
| 앱 형태 | 정적 HTML + ES module, 빌드 도구 없음 | 의존성 최소 → 장기 유지비·고장 위험 최소 |
| 동시성 | 실행마다 고유 `claude/run-*` 브랜치, CI 가 main 병합 직렬화 | 실행이 겹쳐도 main 손상 없음 |
| 앱 언어 | 한국어 | 소유자 시장 이해, 한국어 소형 도구 경쟁 상대적으로 낮음 |

### 이 세션에서 로컬 검증한 것
- `npm run check` (validate + 단위 테스트 10개 + build) 통과
- `npm run e2e` (Playwright, 모바일 390px·데스크톱 1280px, 정상·경계·오류 케이스) A0001 + 대시보드 통과
- 잘못된 기대값을 넣으면 e2e 가 FAIL 하는 것 확인 (게이트가 실제로 막음)
- 브라우저 육안 확인: A0001 모바일 화면, 다크 모드, 계산 결과

### 공개·자동화 구축 결과 (2026-10-09)
- GitHub 저장소 생성(public), Pages 소스 = GitHub Actions 설정, 코드 push (소유자 로그인·기기 코드 인증 1회)
- 첫 pipeline: gate·deploy·공개 URL 검증 성공, 대시보드 재배포 단계만 artifact 이름 중복으로 실패 → 수정 후 전체 성공
- A0001 공개 URL 검증 통과 (live, 2026-10-09T04:19:54Z)
- 클라우드 Routine 생성 시도 2회: `github_token_missing` (Claude 계정 GitHub 미연결)으로 거부 → owner-requests R001
- 대체: Claude 데스크톱 예약 작업 `micro-app-factory-daily` (매일 13:00 KST) 생성, 즉시 1회 실행
  - 첫 실행은 권한 승인 대기로 정지 → 세션을 auto 모드로 전환, 소유자가 대기 중 승인 1회 클릭
  - 실행 결과: A0002 날짜 간격·D-day 계산기 제작 → claude/run-20261009-0540 push → CI gate 통과·main 병합·배포 → 공개 URL 검증 통과 (live, 2026-10-09T05:46:53Z)
- 새 세션이 저장소 기록만으로 작업을 이어가는 것 확인 (예약 실행 세션은 이 대화 기억 없이 CLAUDE.md 로 A0002 완료)
