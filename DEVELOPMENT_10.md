# 10차 개발 보완 — 프론트엔드·MSW 검증 완료, 계약 일부 조건부

## 잔여 5개 항목

| 항목 | 구현 및 검증 |
| --- | --- |
| 서버 문의 초안 | POST 연결, 생성 중 중복 방지, 서버 원문/작성본 분리, 명시적 적용·교체 확인, 재생성 안내, 편집·복사 유지, 409/503 대응. 최소 `{}` 요청은 조건부 계약이다. |
| 상담기관 | 지역·임금 분야 조회, 서버 페이지 이동, 현재 페이지 이름 검색, 전국 대안·빈 결과·실패/재시도, 안전한 전화·웹사이트·출처 링크, 검증일 표시. 응답 adapter는 조건부다. |
| 선택 원본 ZIP | 접수 시 원본 바이트·선택 ID·입력 버전·참조 ID 고정. READY PDF/ZIP, 접근/삭제 재검사, PROCESSING/FAILED 다운로드 차단. ZIP 직렬화는 MSW에만 있다. |
| 다운로드 파일명 | 공통 인증 요청 경로에 requestDownload 추가. filename* 우선·UTF-8·quoted filename·세미콜론·공백·잘못된 인코딩 fallback·경로/제어문자 제거·예약 이름 처리·MIME별 확장자 강제. 빈 파일/잘못된 MIME 거절, 중복 잠금, Object URL 해제. 기존 requestBlob 동작 유지. |
| Edge 여정 | 실제 Edge headless + 브라우저 MSW에서 320/375/768/1280px 전체 여정과 오류 흐름 통과. 각 주요 화면을 네 너비에서도 검사했다. |

기존 질문 목록·직접 작성·보고서 생성/이력/상태·PDF 기능을 유지했다. 질문의 잘못된 링크 문구와 보고서 확인 문구를 고쳤다. 결과 최신성 표시와 recompute 종료 시 questions/reports 무효화를 추가했다. 원문 출처·계산 결과·9차 AI 참조 구조는 재작성하지 않았다. AI 답변으로 보고서를 생성하거나 임금·법률 계산을 추가하지 않았다.

## 계약 확정·조건부·미확정

검토 자료: AGENTS.md, README.md, 기존 DEVELOPMENT_10.md, P0 API_ENDPOINTS.md / 백엔드_API_명세_v1.pdf(실제 파일명) / 데이터베이스_스키마.pdf, P1 최종기획안 P-12~14, P2 관련 화면, P3 14절, P4 API_명세서_v0.5.md. DB PDF에는 상세 테이블이 없다. Next 로컬 page 가이드를 확인하고 기존 비동기 params/서버 page 구성을 유지했다.

| 구분 | 근거와 적용 |
| --- | --- |
| 확정 | P0 API_ENDPOINTS의 경로 및 성공 HTTP: 문의 POST 200, 기관 GET 200, 보고서 POST 202, 목록/상세/파일 GET 200. P0 v1의 region/category=WAGE 예시와 공통 page/size 목록 규칙 적용(size 20). 보고서의 4개 요청 필드, 과거 결과 신규 생성 금지, Idempotency-Key, 고정 스냅샷, 생성 이후 isCurrent 정책 적용. |
| 조건부 | P0는 Inquiry 이름만 제공하고 세부 요청 DTO를 생략한다. 추가 필드 없는 `{}`로 최소 연결했다. **실제 서버에서 이 요청을 허용한다고 확정하지 않는다.** text/basedOnResultVersions/requiresUserReview 및 기관 상세 필드, 질문·보고서 목록 adapter는 P4 형식에 따른 조건부 지원이다. 알 수 없는 응답은 validation 오류로 처리한다. |
| 미확정 | 실제 Inquiry 필수 필드/선택 항목, 기관 상세 DTO·전체 분야 enum·지역 단위·fallback 적용 세부 조건, 보고서 상세 확장 DTO. 서버 연동 전 재확인이 필요하다. P0를 보충할 OpenAPI/로컬 백엔드 코드는 제공되지 않았고, 서버 조회는 금지 조건에 따라 수행하지 않았다. |

P4의 `[제안]` tone/resultItemIds/basedOnResultVersions 요청이나 referencedSnapshots 요청 필드는 보내지 않는다. P4의 과거 결과 신규 생성 제안보다 P0의 금지 정책을 우선했다. 기관 이름 검색은 서버 계약에 없는 q/search 파라미터를 추가하지 않고 현재 조회 페이지에서만 필터한다. 문의 409 REPORT_SOURCE_STALE 및 503 UPSTREAM_UNAVAILABLE는 사용자 요구 및 하위 문서 오류 예시를 지원하며, 이를 P0의 전체 오류 enum으로 주장하지 않는다.

## 상태·격리·스냅샷

- 문의 원문은 mutation 결과로, 작성본은 컴포넌트 메모리로 구분한다. 생성 완료가 작성본을 자동 교체하지 않는다. 세션 generation/Case가 바뀌면 편집 상태를 초기화한다. 자동 재시도·실제 전송·서버 답변 저장 API는 없다.
- 기관 Query는 세션 generation과 필터/페이지로, 보고서는 generation/Case/report ID로 격리한다. 기존 인증 쿠키·메모리 토큰·refresh single-flight를 사용한다.
- Mock seed Case #15/#16은 근무지 #3의 공유 원본 #101을 그대로 참조한다. 선택하지 않은 #102 등은 ZIP에 들어가지 않는다. seed 소유자(계정 #7) 외 계정에서는 해당 보고서/문의 접근을 차단한다. 새 계정의 완전한 독립 도메인 저장소를 추가한 것은 아니다.
- 접수 시 파일명·바이트를 복사하고 PDF/ZIP 아티팩트를 보관한다. 이후 입력 변경이나 원본 내용 변경이 기존 파일을 바꾸지 않는다. 이력의 isCurrent만 현재 입력 버전과 비교한다. 원본의 현재 접근 가능 여부는 다운로드마다 확인하며, 삭제한 원본을 참조한 PDF/ZIP도 404로 차단한다.
- PROCESSING에서 상세를 polling하고 READY/FAILED 및 조회 오류에서 중단한다. 이탈 후 재진입/포커스 시 상태를 재조회한다. 보고서 생성은 명시적 확인 후에만 POST하며 recompute가 자동 생성하지 않는다.
- 클라이언트는 ZIP 원본을 추가하거나 재구성하지 않는다. 원본 미선택 ZIP은 result-snapshot.json만 포함하는 Mock 정책이며 P0의 '선택한 원본과 snapshot JSON' 설명을 따른다. 실제 서버의 파일 내용은 검증하지 않았다.

## 테스트와 파일 검증

- npm run lint: 통과.
- npm run typecheck: 통과.
- npm test -- --maxWorkers=2: **32파일·410테스트 통과**. 기존 372개 + 신규 38개. 기존 테스트 수정 없음. 로컬 병렬 부하를 줄이기 위해 워커 수만 지정했다.
- npm run build: 통과 (컴파일·TypeScript·정적 페이지 생성 완료).
- git diff --check: 통과.
- 신규 RTL: 문의 요청 중 편집 보존, 재생성 취소, 원문/작성본/검토 메타데이터, 409/503·직접 복사·발송 없음, 세션 변경 초기화, 기관 필터/로컬 검색·출처/검증일·안전 URL·오류 재시도, 질문 링크/빈 상태, 보고서 명시 확인·문서 선택·중복 클릭 방지·READY 이후 polling 중단.
- 신규 MSW 통합: 문의 성공·409/503, 지역·분야·전국 fallback·빈 결과·실패, 202→READY/FAILED, 선택 불가 422, 준비 전 409, 다른 Case/삭제 접근 404, Idempotency 재요청, 파일명 누락/잘못된 인코딩, 변경 후 아티팩트 고정.
- test-results/selected-originals.zip: Python zipfile.testzip() CRC 오류 없음. 정확히 result-snapshot.json과 선택 원본 #101 두 항목. 원본 바이트가 접수 당시 값과 같으며, 변경 이후 내려받은 ZIP 전체 바이트도 같다.
- Edge 다운로드 edge-report.pdf: PyMuPDF로 1페이지 열기 성공. edge-originals.zip: CRC 정상, 압축 해제 및 선택 ID #101 일치, 내부 원본 PDF도 파서로 열기 성공. PDF/ZIP은 개발용 예시이며 공식 계산 보고서 엔진을 구현한 것이 아니다.
- 파일명 테스트: filename* 우선, 한글/공백/인용부호/세미콜론, 잘못된 UTF-8·charset, 경로/제어문자·예약 파일명, MIME/확장자·빈 Blob 거절, 클릭 실패 시에도 URL 정리. 기존 requestBlob API는 변경하지 않았다.

## Edge 전체 여정 및 반응형

테스트 실행: `%TEMP%/wageitda-browser/support-browser.cjs`. 기존 설치된 Playwright에서 channel=msedge로 실행했다. 375px 실행과 320/768/1280px 반복 실행 모두 아래 흐름을 통과했다.

1. 로그인 → Case15 → 결과 → 확인 질문 → 조건 저장 → 결과 복귀.
2. 서버 문의 생성 → 긴 문장 편집 → 실제 clipboard 복사 → 재생성 취소와 편집 보존.
3. 문의 → 기관 → 청주시/WAGE → 페이지 내 검색 빈 결과 → 전국 대안 → 조회 실패/재시도.
4. 보고서 원본 #101 선택 → 명시 요청 → 202 PROCESSING → READY.
5. PDF/ZIP 실제 다운로드 → PDF 파싱 → ZIP CRC/압축 해제·선택 ID 확인.
6. 조건 입력 변경 → 기존 보고서 이력 → isCurrent=false, 기준 입력 버전·참조 ID 보존.
7. 문의 409/503, 보고서 실패/최신성 충돌, ZIP 준비 전 409, 잘못된/누락 파일명 fallback.

질문·문의·기관·보고서 화면 320/375/768/1280px에서 가로 넘침 없음, 버튼 포커스 가능. 모바일 다운로드 버튼은 스크롤 후 클릭·다운로드 성공. 각 실행에서 생성 Object URL 4개/해제 4개, JS 실행 오류 0, 미처리 Mock 0, 실제 백엔드 전달 요청 0건. 테스트의 네트워크 가드가 실제 8000 포트 요청을 차단하도록 설정되어 있으며 가드 진입도 0건이다. 콘솔에는 최초 인증 복원 401과 의도적인 오류 시나리오의 409/503 HTTP 로그가 있다. '콘솔 오류 전체 0'으로 보고하지 않는다.

산출물(모두 Git 제외): test-results/support-browser-report.json, support-browser-report-{320,768,1280}.json, support-{questions,inquiry,centers,reports}-{320,375,768,1280}.png, edge-*.pdf/zip. 실제 모바일 OS 키보드·터치·스크린리더 검증은 아니다.

## 생성·수정 파일

신규:
- src/features/case-support/inquiry-screen.tsx
- src/features/case-support/centers-screen.tsx
- src/features/case-support/integration.test.ts
- src/features/case-support/screens.test.tsx
- src/lib/api/download.ts
- src/lib/api/download.test.ts

수정:
- src/app/(workspace)/consultation-centers/page.tsx
- src/features/case-support/{api.ts,schemas.ts,screens.tsx}
- src/features/documents/queries.ts
- src/lib/api/client.ts
- src/mocks/development.ts
- src/mocks/shared/{support-handlers.ts,report-files.ts}
- README.md, DEVELOPMENT_10.md

## 남은 사항과 11차

요청한 다섯 기능의 프론트엔드 및 Mock 여정 구현은 끝났다. **미확정 DTO가 실제 백엔드와 일치한다는 계약 검증은 남아 있다.** `{}` Inquiry 허용 여부와 조건부 응답 adapter는 실제 연동 단계에서 확인해야 한다. 이는 이번 금지 범위이므로 실제 서버 연동 완료로 보고하지 않는다. 독립적인 11차 프론트엔드 개발은 진행 가능하며, 운영 연동 전 계약 확인은 필요하다.

백엔드 서버 실행/접속/OpenAPI 조회, 외부 LLM·기관 API 호출, 회사 실제 전송·기관 예약·프론트 임금 계산을 수행하지 않았다. main 유지, Git commit/push 없음. docs/ 및 환경 파일을 Git에 추가하지 않았다.
