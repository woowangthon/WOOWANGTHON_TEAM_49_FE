# 9차 AI 자료 도우미 개발 기록

## 결과: 부분 구현
근무지의 AI 자료 도우미 진입점, 목록/상세 경로, 생성/제목 변경/삭제, 페이지 단위 기록 조회, 질문 이어가기, CASE 기본 범위와 명시적 WORKPLACE_ALL 선택을 추가했다. 자동 제목 생성은 없다. 목록과 메시지는 TanStack Query에서 세션 generation/근무지/채팅/페이지별로 분리한다. 삭제 성공 후 상세 캐시 제거와 목록 이동을 수행한다.

SSE는 기존 API 클라이언트 및 readSseFrames를 재사용한다. HTTP 200/content-type, 다중 chunk UTF-8, CRLF/LF, 다중 data, 주석 제외를 처리한다. message_start/content_delta/sources/message_done/error를 검증하고 runId와 messageId를 각각 대조한다. 미정의 이벤트는 무시한다. done/error 없는 EOF는 완료가 아니다. 전송/재시도는 refresh:false로 자동 재전송을 막으며 401은 기존 세션 정리를 따른다.

대기/스트리밍/완료/실패/취소 요청 상태, 스트림 후 오류, 전송 전 JSON 오류, 동일 화면 중복 실행 방지, 서버 동시 실행 충돌을 지원한다. 취소는 유효 runId로 POST 202 접수를 확인한 뒤 클라이언트 스트림을 abort하고 상세를 재조회한다. 202만으로 UI에서 취소 완료를 확정하지 않으며 저장된 메시지 상태를 표시한다. 화면 이탈은 클라이언트 연결만 정리하고 서버 자동 취소는 요청하지 않는다. 세션 변경 시 기존 세션 signal과 화면 key/Query clear로 정리한다.

FAILED/CANCELLED assistantMessageId로 재시도하며 이전 메시지를 보존한다. 사용자 질문을 재전송 본문으로 만들지 않는다. 서버 조회를 기록의 기준으로 사용하며 전송 질문의 낙관적 저장 성공 표시는 하지 않는다. 부분 스트림은 임시 표시이고 종료 후 저장 결과로 교체한다. 임시 답변이 저장 조회 실패 시 보존되지 않는 제한이 있다.

## 계약 근거와 조건부 지원
- P0 API_ENDPOINTS.md: 생성 201, 목록/상세/수정 200, 삭제 204, 전송/재시도 200, 취소 202.
- 실제 파일명 백엔드_API_명세_v1.pdf: scope 구조, 기본 Case 생략 전송, 명시적 전체 범위, SSE 5개 이벤트, 동시 실행 제한, 취소와 재시도 정책을 적용했다.
- 취소 응답은 DTO를 가정하지 않고 HTTP 202만 소비한다. 실제 AI 내부 작업 중단은 보장하지 않는다.
- P0에는 채팅 목록/상세 전체 DTO가 없다. P4 API_명세서_v0.5.md의 session + messages:Page 구조 및 메시지 status/필드를 조건부 지원하는 decoder를 두었다. 실제 서버 확정 계약으로 간주하지 않는다. 구조가 다르면 protocol 오류이며 임의 필드 대체 없음.
- P4의 user_message_saved 필수 이벤트, 재시도 202, AI 컨텍스트 요약 정책은 적용하지 않는다.
- DB PDF는 상세 테이블 없이 제목만 있다. P1 기획, P3 참조 범위/비신뢰 텍스트 지침 및 로컬 Next layouts/pages 문서를 확인했다. P2 HTML은 채팅 관련 문구 검색으로 확인했으며 정밀 시각 대조는 미실시.
- 백엔드 실행/접속/OpenAPI 확인 및 외부 LLM 호출 없음. 실제 연동 검증이 아니다.

## 출처와 UI
저장된 sources/resultRefs/sourceMayBeOutdated를 표시한다. 문서 접근 재확인 후 기존 SourceEvidence/원문 뷰어와 Case 검토 링크를 재사용한다. 삭제/접근 불가 자료는 채팅에서 근거 텍스트를 표시하지 않는다. 결과 종류/스냅샷 ID/버전을 표시하고 기존 공식 결과 화면으로 연결한다. 특정 스냅샷 직접 선택은 미구현이다.
모바일은 목록과 본문을 세로 배치하고 데스크톱은 목록과 메시지를 2열로 배치한다. 출처는 메시지 내부 표시. 입력 영역은 문서 흐름 내 접근 가능하며 Enter 전송/Shift+Enter/IME를 지원한다. 과거 탐색 시 자동 스크롤을 멈춘다. HTML은 React 텍스트로만 표시하고 실행하지 않는다. Markdown 서식 렌더러는 추가하지 않았다.

## MSW
기존 development 인증 guard 이후 chatMocks를 연결했다. 메모리 CRUD, 근무지 분리, 잘못된 Case 404, 누락 입력 422, SSE 7바이트 chunk/40ms 지연, 기본 CASE/전체 범위, 저장 기록, 중복 실행 409, 취소 202/상태 저장, 실패/취소 재시도, 완료 재시도 거부, 이전 메시지 보존을 제공한다.
개발 질문 `생성 실패`, `연결 중단`, `JSON 오류`, `삭제 출처`로 각 시나리오 재현 가능. 실제 LLM 없음. 문서 #101 참조 예시는 Case 연동에 따라 접근 불가일 수 있다. resultRefs 파싱/표시 테스트는 있지만 Mock의 실제 결과 저장소 스냅샷 연동은 미구현이며 임의 스냅샷을 만들지 않는다.
기존 production/Mock OFF 비활성 및 미처리 요청 501 차단, 새로고침 초기화 정책을 유지한다. 개발 중 조회/전송 시나리오에서 실제 백엔드 전달 0건을 확인했다. 이번 변경의 OFF/production 브라우저 재검증은 미실시.

## 검증
- Vitest: 24개 파일 358개 테스트 통과 (기존 342 + 신규 16). CRUD/격리/범위/저장 복원/실패/취소/재시도/동시 실행/UTF-8/CRLF/다중 data/출처 메타데이터/이벤트 검증/XSS 텍스트 표시 포함.
- lint/typecheck/build: 통과. 최종 변경 후 재실행 결과는 아래 최종 기록 참조.
- 실제 Edge headless + 브라우저 MSW: 로그인 → 채팅 생성 → 질문 → 완료, 생성 실패, 중지/서버 CANCELLED 확인. 320/375/768/1280px 가로 넘침 없음. JS 오류/미처리 Mock/실제 백엔드 전달 요청 0건.
- 산출물: Git 제외 test-results/chats-browser-report.json, 실행 스크립트 %TEMP%/wageitda-browser/chats.cjs.
- 브라우저 내 제목 수정/삭제/재시도/문서 및 결과 왕복/로그아웃 중 실행/기록 복원 전체 여정, 터치/스크린리더 정밀 검증은 미실시. CRUD/재시도/복원은 MSW Node 테스트와 구분한다. 새로고침은 기존 개발 정책상 샘플 초기화이며 실제 영속화 증명이 아니다.

## 파일
신규: src/features/chats/{api.ts,stream.ts,chat-screen.tsx,chat.test.ts,stream.test.ts,messages.test.tsx}
신규: src/app/(workspace)/workplaces/[workplaceId]/chats/page.tsx 및 [chatId]/page.tsx
신규: src/mocks/shared/chat-handlers.ts, DEVELOPMENT_9.md
수정: src/lib/api/client.ts, src/features/workplaces/components/workplace-detail-screen.tsx, src/mocks/development.ts, README.md

## 잔여 및 10차
모바일 목록 Drawer/전용 탐색 화면, 출처 별도 패널, Markdown 서식, RHF 기반 채팅 폼, 100건 초과 Case 선택 탐색, 실제 결과 저장소와 Mock resultRefs 연동, 특정 결과 스냅샷 직접 열기, 근거 부족 전용 서버 enum UX, 스트림 연결 중단 후 미저장 부분답변 보존, 상세 DTO 실제 계약 확인 및 요구된 전체 Edge 여정이 남아 있다. 에러 UX는 기존 ApiError 메시지/코드를 사용하며 모든 채팅 오류별 전용 안내는 미구현이다. 전송 중 페이지 이동 뒤 서버 실행의 진행 상황 재연결도 없다.
10차의 독립 기능 개발은 가능하지만 9차 전체 완료 또는 실제 백엔드 연동 완료로 보고할 수 없다.
main 유지. Git commit/push 없음.

최종 검증 기록: npm run lint, npm run typecheck, npm test(24파일·358테스트), npm run build, git diff --check 통과. 최종 코드로 Edge 4개 너비 MSW 시나리오 재실행 통과. main 확인. 실제 서버 접속 및 commit/push 없음.
