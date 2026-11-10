# 11차 개발 — 부분 완료

계정 조회·비밀번호 복구·탈퇴 요청을 기존 인증/API/Query 구조로 추가했다. 백엔드 접속·OpenAPI 조회·외부 이메일/LLM/공공 API 호출·commit/push 없음. main 유지.

## 계약과 구현

- GET /users/me: 기존 세션 generation별 Query 재사용. 이름·이메일만 표시, 수정 폼 없음.
- POST /auth/forgot-password: `{email}`, 202. 존재 여부와 무관한 안내. LOCAL_OUTBOX_ONLY, 실제 이메일 발송 주장 없음.
- POST /auth/reset-password: `{token,newPassword}`, 204. 확인값은 로컬 검증만 수행. P0에 복잡도 정책이 없어 필수 입력만 적용. 30분·1회 사용 및 기존 access/refresh 무효화는 Mock에서 검증.
- DELETE /users/me: `{confirmation:"DELETE_ACCOUNT"}`, 202. 확인 dialog, 동기 잠금·disabled. 성공 이후에만 인증·Query·진행 요청 정리. 삭제 접수 인증 상태로 보호 경로 redirect 경쟁 방지.
- GET /users/me/deletion: credentials include, Bearer/refresh/retry 없음. **상세 DTO·enum·종료 조건·주기가 P0에 없어 수신 여부만 표시한다. 상세 상태·예정일·파기 구현 여부·완료 표시·polling은 미구현.** P4 PENDING_PURGE/PURGED/LEGAL_HOLD를 P0 enum으로 채택하지 않음. Mock의 빈 응답도 실제 계약이 아니다.

로컬 Next page/headers 문서와 P0, DB PDF(상세 테이블 없는 1페이지), P1, P2 계정 화면, P3 및 8~10차 기록을 확인했다. P2의 이메일 발송 문구보다 P0 로컬 outbox 정책을 우선한다.

## 화면·보안·Mock

/settings, /forgot-password, /reset-password, /account-deletion 추가. 복구·영수증 화면은 guest-only layout 밖에서 기존 세션에도 접근 가능. 모바일 Drawer·데스크톱 설정 메뉴 추가.

토큰·비밀번호는 폼 메모리와 요청 body만 사용한다. 선택적 `?token=`은 mount 후 주소 query/hash에서 제거한다. 링크 형식은 P0에 없어 조건부 편의 지원이며 직접 입력도 제공한다. reset metadata·HTTP Referrer-Policy는 no-referrer. 최초 URL의 서버/프록시 로그·브라우저 기록은 소급 제거 불가하므로 운영 outbox 링크와 로그 redaction 확인 필요.

기존 메모리 access token, refresh single-flight, session generation, AbortSignal, logout 캐시 제거·SSE 취소 구조 유지. redirect allowlist 유지. 토큰 영속 저장·민감 console 출력 추가 없음. 신규 영수증 조회는 refresh하지 않는다.

Mock에서 재설정 토큰 만료·재사용 거부, 새 비밀번호 로그인·이전 비밀번호 거부, 탈퇴 후 login/refresh/자료 접근 차단을 구현했다. 개발 토큰 확인 UI는 development + Mock ON에서만 표시. 새로고침·개발 초기화 시 기존 메모리 초기화 정책 유지. 영수증은 내부 메모리이므로 실제 HttpOnly·경로 제한·새로고침 지속성 검증이 아니다.

새 계정의 공유 샘플 접근을 404로 차단했다. **계정별 독립 업무 저장소는 아직 없어 새 계정 근무지·Case 전체 여정은 제한된다.** 샘플 계정 성공을 다중 계정 전체 여정 성공으로 해석하지 않는다.

## 미확정·최종 잔여 작업

| 관련 API/화면 | 미확정 및 현재 처리 | 영향·실제 연동 검증 방법 |
| --- | --- | --- |
| 삭제 상태 | DTO·enum·주기 생략, 응답 수신만 표시 | 높음. 실제 nullable 파기 일정·구현 여부·종료 조건 확보 후 상태 UI/polling/terminal 테스트 추가 |
| 비밀번호 복구 | 링크 형식·정확한 오류 코드·비밀번호 정책 생략 | outbox 파일과 만료·사용 토큰·503·422 실제 응답 검증 |
| 인증 보안 | 서버 쿠키/CSRF/CORS·세션 무효화·영수증 만료 미검증 | 높음. 승인된 서버 환경에서 Secure/HttpOnly/SameSite/Path·동시 세션 검증 |
| 8차 거래·배분 | 중복 후보 P4 조건부, PATCH 허용 필드·확인 enum·버전 미확정, 배분 첫 20건 제한 | 실제 DTO 검증·페이지 처리. DEVELOPMENT_8.md 참조 |
| 9차 AI | 목록/상세 session + messages:Page 조건부, 전체 컨텍스트 미확정 | 실제 SSE·취소·재시도·출처 스냅샷 검증. DEVELOPMENT_9.md 참조 |
| 10차 문의·기관·보고서 | 최소 {} 요청·응답 adapter·기관 세부 enum/DTO·보고서 확장 DTO 조건부 | 필수 요청 필드·응답 확인. {} 허용을 확정하지 않음. DEVELOPMENT_10.md 참조 |
| Mock 사용자 | 샘플 접근 차단만 수행 | 독립 사용자 업무 저장소·새 계정 전체 여정 필요 |
| 브라우저·기기 | 자동화는 실제 키보드/터치/스크린리더 검증 아님 | 실기기·보조기술 수동 검증 필요 |

## 파일

신규: src/app/{forgot-password,reset-password,account-deletion}/page.tsx, src/app/(workspace)/settings/page.tsx, src/features/auth/components/account-screens.tsx, src/features/auth/{account.integration.test.ts,account-screens.test.tsx}, DEVELOPMENT_11.md.

수정: next.config.ts, src/features/auth/{api/auth.ts,controller.ts,types.ts,components/auth-form.tsx,components/auth-gate.tsx,components/workspace-navigation.tsx}, src/mocks/development.ts, README.md.

## 검증

기존 410개를 삭제·수정하지 않고 MSW 9개·RTL 5개 추가: 34파일 424개 통과. lint/typecheck/build 통과. 라우팅 경쟁 수정 이후 최종 재실행 결과는 아래에 추가한다.

테스트 범위: 계정 조회, 복구 202/존재 여부 동일 응답, 재설정 204/만료/무효/재사용/새 비밀번호 로그인/이전 세션 차단, 탈퇴 202/확인 DTO/영수증 인증 분리/자료 접근 차단, 새 계정 샘플 격리, 입력 오류 포커스·중복 복구 제출·비밀번호 불일치·성공 이동·단일 영수증 조회. 기존 동시 401·refresh 실패·logout SSE/캐시 테스트 유지. 탈퇴 중복/실패 UI 전용 RTL과 terminal polling 검증은 잔여다.

Edge 신규 스크립트: %TEMP%/wageitda-browser/account-browser.cjs. 산출물: Git 제외 test-results/account-browser.json. 기존 인증/관리/문서/검토 스크립트 일부는 과거 포트·별도 응답 전제로 현재 Mock에서 실패하여 전체 사용자 여정 완료로 간주하지 않는다. 실제 서버·실제 이메일 발송·완전한 데이터 삭제는 검증하지 않았다.

### Edge 실행 결과

- 신규 복구 → 개발 토큰 확인 → 재설정 → 변경 비밀번호 로그인 → 대시보드 → 설정 메뉴 → 탈퇴 dialog Escape/재열기/명시 확인 → 영수증 조회: 320/375/768/1280px 모두 통과. 모바일 Drawer 및 데스크톱 링크로 이동. 가로 넘침 없음. JS 실행 오류·미처리 Mock·실제 백엔드 전달 요청 각 0건. test-results/account-browser.json 참조.
- 기존 results-final, payments, chats-completion 스크립트 재실행 통과. 수기 입력/조건/부분 검사/원문 출처/4종 스냅샷 왕복, 거래/배분/대조 이력/삭제, SSE/취소/재시도/Drawer/새로고침 초기화 포함. 네 너비에서 가로 넘침 없음, JS 오류·미처리 Mock·백엔드 네트워크 가드 진입 0건.
- support-browser 재실행 통과(320/375/768/1280px): 문의 편집·복사·실패/재시도, 기관 필터·페이지·출처, 보고서 선택 원본/PDF/ZIP/스냅샷 검증. 내부 네 너비 레이아웃·버튼 포커스 점검 통과, 각 실행 Object URL 생성 4/해제 4. JS 실행 오류 0, 미처리 Mock 0, 백엔드 전달 0. HTTP 401 및 의도한 409/503 콘솔 로그는 존재하므로 콘솔 전체 오류 0으로 보고하지 않는다.
- 과거 인증/관리/문서/검토 전용 스크립트는 포트를 고친 뒤에도 구형 응답/초기 인증 전제에서 timeout. 초기 회원가입부터 업로드·OCR·검토까지의 이번 Edge 전체 재검증은 미완료이며 과거 기록으로 대체 완료하지 않는다. 이 영역의 기존 Vitest 회귀는 유지했다.
- 브라우저 뒤로 가기·새로고침·긴 파일명/URL·상태별 접근성 전체 매트릭스, 실제 모바일 키보드·터치·스크린리더 수동 검증은 미완료. 개발 Mock OFF/production 브라우저 확인도 이번에는 미실시. production 빌드의 mock-reset-token 및 샘플 비밀번호 문자열 미포함은 정적 확인했지만 비활성 UI의 실제 브라우저 검증을 대체하지 않는다.

### 최종 품질 명령

- npm run lint: 통과.
- npm run typecheck: 통과.
- npm test -- --maxWorkers=2: 34파일·424개 통과(기존 410개 유지). 워커 수만 제한했다.
- 마지막 오류 포커스·한국어 문구 수정 후 인증 관련 4파일·44개 재실행 통과.
- npm run build: 최종 수정 반영 통과.
- git diff --check: 통과. 변경 파일의 Windows CRLF 변환 안내는 존재하며 공백 오류는 없음.

production 자산에 readDevelopmentResetToken이라는 빈 반환 함수 이름은 남아 있으나 토큰 확인 UI/실제 토큰/샘플 비밀번호 문자열은 확인되지 않았다. production 브라우저 비노출 검증은 별도 잔여이며 자산에서 모든 Mock 관련 이름이 제거됐다고 주장하지 않는다.
