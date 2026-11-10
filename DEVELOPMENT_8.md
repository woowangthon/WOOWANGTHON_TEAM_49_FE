# 8차 보완 개발 기록

## 처리 결과
- 중복 후보: 근무지 지급 거래 화면에 서버 후보, 원거래 상세, 선택 표시 구현. 자동 병합/삭제 없음. 로딩/빈 목록/오류 처리.
- 입금 대조: Case 상세 및 result/compare 화면에서 명세서 실수령액, 계좌/현금/전체 연결 지급액, 서버 차액과 4개 상태 표시. null/0 구분. 페이지 단위 과거 스냅샷 조회와 버전/입력 기준/생성 시각/최신성 표시.
- 최신성: 기존 recompute-status hook 재사용. CURRENT/STALE/UPDATING/FAILED 및 이전 결과 보존. 입금 변경만 있는 Mock 작업은 계산/기존 대조/명세서 검사 스냅샷을 보존. 기존 전체 작업이 진행 중이면 해당 갱신 범위를 축소하지 않음.
- 삭제: 일반 DELETE → 409의 affectedCaseIds 표시 → 사용자 명시 확인 후 confirm=true → 204 처리. 취소는 요청하지 않으며 실패 시 성공 메시지 없음. Case별 금액이 없는 응답에서 금액을 추정하지 않음.
- Edge: 개발 MSW로 로그인, 중복 후보 상세, 배분, 대조/이력, 삭제 취소/확인 삭제, 통합 결과 탐색을 검증. 320/375/768/1280px에서 가로 넘침 없음. 키보드 포커스 확인. JS 오류/미처리 Mock/실제 백엔드 전달 요청 0건. 실제 모바일 기기 검증은 아님.

## P0 계약 적용 및 미확정 사항
API_ENDPOINTS.md의 경로 및 GET 200, POST 201, PATCH 200, DELETE 204 적용. 백엔드_API_명세_v1.pdf(저장소 실제 파일명)의 거래/배분/삭제 확인 정책을 우선 적용. DB PDF는 상세 스키마 없이 제목만 있어 추가 계약 근거로 사용할 수 없음.
P0의 금액/지급수단/거래일/전체 배분/잔여액/배분 충돌과 삭제 확인 절차 유지. 프론트 공식 금액 계산 없음.
P0에 중복 후보 세부 DTO가 생략되어 P4 B-69의 items[{transactionId,matchReasons?}] 구조를 지원하되 실제 P0 확정 구조로 간주하지 않음. 이 형태가 아닌 서버 응답은 protocol 오류로 표시. 임의 후보 그룹이나 원거래 관계를 생성하지 않음.
대조의 basedOnInputVersion/createdAt/freshness는 P4 자료도 참고하며 optional로 검증. 없는 메타데이터는 미제공으로 표시. P4의 구형 allocatedPaymentTotal로 P0 linkedPaymentTotal을 대체하지 않음.
배분 PATCH/DELETE의 세부 버전 정책, 거래 PATCH 전체 허용 필드/확인 상태 enum은 여전히 서버 계약 확인 대상. 기존 USER_INPUT/USER_REPORTED 거래만 편집 가능. 백엔드 접속/OpenAPI 조회는 하지 않음.

## 데이터 일관성 및 Mock
거래/배분/수기 DEPOSIT은 동일 paymentMocks 저장소 사용. 배분 초과/중복 409 및 배분된 거래 삭제 확인 정책 유지. 거래 변경은 연결 Case들에 작업을 예약하고 삭제 시 배분 제거. readiness도 이 저장소를 참조.
금액 산술은 src/mocks/shared/input-handlers.ts의 합성 시나리오에만 있음. 확인한 명세서와 연결 배분을 비교하며 거래가 없으면 null/정보 부족, 명시적 0은 0 유지. 계좌/현금 분리. 문서 실수령액 근거가 여러 개로 모호하면 검토 필요. 과거 스냅샷 보존, 실패/대체 상태 지원.
Query 무효화는 해당 근무지와 캐시에 있는 같은 근무지 Case들 및 사례 목록을 대상으로 함. 영향 Case 전체 목록이 없는 응답은 같은 근무지 범위를 보수적으로 갱신. 다른 근무지 캐시는 유지. 캐시에 없는 Case는 최초 진입 시 서버 조회. 자동 재계산 POST를 추가하지 않음.
Mock OFF/production 차단, 새로고침 초기화, 미처리 요청 차단 정책 유지.

## 파일
신규: src/features/payments/{comparison-schemas.ts,comparison-panel.tsx,duplicate-candidates.tsx,completion.test.tsx}
수정: src/features/payments/{api.ts,schemas.ts,queries.ts,payment-screen.tsx}
수정: src/features/cases/components/case-detail-screen.tsx, src/features/results/result-screen.tsx, src/features/documents/queries.ts
수정: src/mocks/shared/{payment-handlers.ts,input-handlers.ts}, README.md, DEVELOPMENT_8.md

## 검증 및 산출물
최종 lint/typecheck/test/build 결과는 아래 최종 기록 참고.
Edge 스크립트: %TEMP%/wageitda-browser/payments.cjs
Git 제외 산출물: test-results/payments-browser-report.json, payments-{320,375,768,1280}.png
동시 실행 중 기존 테스트 2건이 5초 제한으로 실패했으나 검증 프로세스를 분리한 전체 재실행은 통과함.

## 잔여 범위
문서가 생략한 실제 서버 DTO는 확정되지 않았으며 MSW 성공은 실제 연동 성공을 의미하지 않음. 특히 중복 후보는 지원 구조의 조건부 구현임.
기존 Case 배분 목록은 첫 20건만 표시하는 제한 유지(이번 보완의 과거 대조 이력은 별도 페이지 이동 지원).
배분 생성/해제의 사용자 확인은 기존 흐름 유지. 실제 모바일 터치/스크린리더 정밀 검증은 미실시.
9차 UI 개발은 진행 가능하나 실제 서버 연동 확정 전 위 계약 검증 필요. 서버 계약까지 검증된 전체 완료로 보고하지 않음.
main 유지, Git commit/push 및 백엔드 실행/접속/OpenAPI 조회 없음.

최종 검증: npm run lint 통과, npm run typecheck 통과, npm test 21개 파일·342개 테스트 통과(기존 332 + 보완 10), npm run build 통과, git diff --check 통과. Edge 최종 재검증은 안전한 최대 정수 금액과 긴 입금자/메모를 포함해 네 너비에서 통과했습니다.
