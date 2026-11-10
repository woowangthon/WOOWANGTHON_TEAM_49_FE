# 9차 AI 자료 도우미 — 미완료 5개 항목 보완

## 구현 결과
이번 요청의 모바일 Drawer, Markdown, 특정 스냅샷 선택, Mock 결과 참조, Edge 주요 사용자 여정 검증을 보완했다. 기존 채팅 CRUD/SSE 파서/인증/취소·재시도 API 흐름은 유지했다. 실제 백엔드 연동 완료를 의미하지 않는다.

### 모바일 Drawer
기존 공통 MobileNavigation의 native dialog를 재사용하고 label/title을 매개변수화했다. 데스크톱은 Sidebar, 모바일은 채팅 목록 버튼과 Drawer다. 현재 채팅 aria-current와 강조, 채팅 선택 시 닫기, 새 채팅 생성 이동을 제공한다. 기존 제목 수정/삭제 확인/오류 처리를 유지한다. 세션 generation/근무지/채팅 key로 화면과 목록이 분리된다.
Tab/Shift+Tab 순환, Escape 닫기, 트리거 포커스 복귀, 배경 스크롤 잠금/복원 및 데스크톱 전환 닫기를 지원한다. 입력창에는 명시적 label 연결을 추가했다. 320px 및 축소된 높이에서 입력 접근을 확인했다. 실제 모바일 OS 가상 키보드/터치/스크린리더는 데스크톱 Edge 검증 범위 밖이다.

### Markdown
react-markdown와 remark-gfm을 사용한다. 문단/줄바꿈/제목/강조/목록/인용/인라인 코드/코드 블록/표/링크를 저장 답변과 스트리밍 임시 답변에 적용한다. 사용자 질문은 텍스트 출력이다. 불완전한 코드 fence 및 링크 입력도 렌더링한다.
raw HTML은 skipHtml로 제외하고 HTML 파서 플러그인이나 dangerouslySetInnerHTML을 사용하지 않는다. 기본 URL 변환을 유지하며 링크는 http/https/mailto만 허용한다. 외부 링크는 새 탭 + noopener noreferrer, 외부 이미지는 텍스트 대체로 자동 요청을 막는다. 표와 코드는 내부 가로 스크롤, 본문/URL/파일명은 줄바꿈을 적용한다. Markdown은 사실성·법적 판단의 보증이 아니다.

### 특정 결과 스냅샷
AI resultRefs의 서버 Case/종류/ID/버전으로 URL을 만든다. result 페이지의 server searchParams에서 종류와 양의 안전한 정수를 검증한다. 알려지지 않은 종류/잘못된 식별자는 안내와 Case 결과로 폴백한다. URL 자체가 권한의 근거가 아니며 기존 인증 API 조회와 DTO 검증을 거친다.
- calculation: 기존 GET /cases/{c}/calculations/{id} 사용, ID 및 버전 일치 확인.
- comparison / payslipValidation / depositComparison: 기존 각 이력 목록을 페이지 단위로 탐색해 ID와 버전이 모두 일치하는 항목만 표시. 상세 엔드포인트를 새로 만들지 않았다.
- 찾을 수 없음/삭제/403/404/버전 불일치: 지정 스냅샷 오류와 Case 결과 안내. 임의 최신 결과로 대체하지 않는다.
- 최신성: 참조 화면 진입 시 최신 results 메타데이터를 다시 조회한다. 조회 중/실패는 최신성을 확정하지 않는다. 현재 ID·버전과 다르면 과거 스냅샷으로 명시하고 CURRENT로 가장하지 않는다. STALE/UPDATING/FAILED는 서버 값을 표시한다. 스냅샷 내 메타데이터는 저장 당시 값임을 안내한다.
- returnTo는 /workplaces/{양의정수}/chats/{양의정수} 내부 경로만 허용한다. 결과와 문서 검토 화면에 채팅 복귀 링크를 제공한다. 문서의 기존 원문 뷰어/필드 근거 탐색을 유지한다.
현재 지원하는 type은 결과 섹션 이름 calculation/comparison/payslipValidation/depositComparison 및 기존 참고 예시의 대문자 별칭이다. 이는 호환 매핑이며 P0의 전체 type enum을 확정한 것이 아니다. 모르는 종류는 폴백한다.

### Mock 결과 참조
inputMocks의 실제 결과 저장소를 읽는 getResult를 제공한다. 개발 시나리오는 기존 publish 경로로 양의 ID 스냅샷을 준비하며 새로운 임금 계산 규칙을 추가하지 않는다. 채팅은 실행 시작 시 sources/resultRefs/입력 버전을 복사해 고정하고 SSE sources 및 상세에 동일 참조를 보존한다. 자료는 실제 Case-document 연결 및 field.source로 구성하므로 공유 문서 #101의 Case #15/#16 연결을 유지한다.
입력 변경 후 과거 답변의 참조 ID/버전을 최신 ID로 바꾸지 않는다. 현재 입력 버전/스냅샷과 다르면 sourceMayBeOutdated를 설정한다. 수기/조건/문서 필드/배분의 기존 최신성 및 갱신 정책을 재사용한다. 삭제 문서는 접근 재확인 후 표시하며 실패 시 채팅에서 근거 텍스트를 재노출하지 않는다.
실패·취소 재시도는 원래 assistant 앞의 사용자 질문을 찾아 새 사용자 메시지 없이 실행한다. 개발용 `생성 실패`는 최초 실행을 실패시키고 재시도는 완료되도록 구성했다. `연결 중단`, `JSON 오류`, `삭제 출처`, `없는 스냅샷` 시나리오도 제공한다.
실제 서비스 코드에는 Mock 답변 생성/임금 계산/LLM 호출이 없다. Mock OFF/production 비활성, 미처리 API 차단, 새로고침 메모리 초기화 정책을 유지한다.

## 계약과 미확정 사항
P0 API_ENDPOINTS.md의 GET 200/생성 201/삭제 204, 전송·재시도 200 SSE, 취소 202를 유지한다. 실제 파일명은 백엔드_API_명세_v1.pdf이며 scope/defaultScope, 5개 SSE 이벤트, 취소/재시도/동시 실행 규칙 및 results의 versions 식별자를 따른다. DB PDF는 제목 외 상세 테이블이 없다.
P0에 생략된 채팅 목록/상세 DTO는 기존 P4 session + messages:Page 구조의 조건부 지원을 유지한다. 이를 실제 서버 확정 DTO로 보고하지 않는다. P4의 미확정 user_message_saved 이벤트, 재시도 202, 전체 AI 컨텍스트 투입 정책은 적용하지 않는다. 원문 근거/결과 상세 내부 optional 필드는 기존 decoder를 재사용하며 임의 필수화하지 않는다.
P0에는 comparison/validation/deposit의 개별 상세 API가 없어 목록 선택으로 구현했다. 전체 이력을 끝까지 조회할 수 없는 서버 응답/권한/네트워크 오류에서는 직접 조회를 성공으로 표시하지 않는다.

## 검증
최종 결과는 아래 기록을 참고한다. 기존 358개 회귀를 유지한다.
- 신규 RTL: Drawer 열기/선택/닫기/포커스/스크롤, Markdown 요소·위험 HTML/URL/이미지 차단·불완전 스트림.
- 신규 URL 테스트: 종류/ID/버전/외부 returnTo/상속 프로퍼티 이름 거부.
- MSW 통합: 실제 네 종류 스냅샷 ID/버전 일치, 입력 변경 후 참조 보존과 outdated, 두 번째 이력 페이지에서 과거 ID 찾기, 존재하지 않는 스냅샷 거부.
- 기존 SSE chunk/UTF-8/CRLF/다중 data/취소/실패/재시도/격리 회귀 유지.
- 실제 Edge headless + 브라우저 MSW: 로그인 → 근무지 → 생성 → CASE 질문/Markdown → 문서 검토·원문 페이지·필드 → 채팅 복귀 → 네 종류 특정 결과 왕복 → 추가 질문 → 입력 변경/과거 결과 표시 → 4개 너비 → 중지/202 → 재시도 → 생성 실패/재시도 → 동시 실행409/완료 재시도409 → 제목 수정/다른 채팅/저장 기록 복원 → Case16 공유 출처 → 다른 근무지 격리 → 없는 스냅샷 폴백 → 삭제 → 새로고침 초기화.
- 320/375/768/1280px, 긴 코드/URL/파일명/표, Drawer Tab 순환/Escape/포커스 복귀, 축소 높이 입력 접근 확인. 실제 모바일 키보드 동작을 검증했다고 주장하지 않는다.
- 전체 새로고침은 개발 저장소가 초기화되므로 기존 채팅의 영속 복원을 검증할 수 없다. 클라이언트 화면 이동 후 GET 저장 기록 복원과 새로고침 초기화를 별도로 검증한다. 브라우저 저장소에 민감 대화를 추가하지 않았다.
- 산출물: Git 제외 test-results/chats-completion-browser-report.json, chats-completion-{320,375,768,1280}.png. 실행 스크립트 %TEMP%/wageitda-browser/chats-completion.cjs.
- 실제 서버 실행/접속/OpenAPI 조회/외부 LLM 호출 없음. MSW 성공과 실제 서버 연동 성공은 구분한다.

## 파일 목록
신규: src/features/chats/{markdown.tsx,markdown.test.tsx,drawer.test.tsx}
신규: src/features/results/{snapshot-link.ts,snapshot-link.test.ts,selected-snapshot.tsx,snapshot-integration.test.ts}
수정: src/features/chats/{chat-screen.tsx,chat.test.ts,messages.test.tsx}
수정: src/features/results/{queries.ts,result-screen.tsx}, src/features/payments/api.ts
수정: src/app/(workspace)/cases/[caseId]/result/page.tsx
수정: src/components/layout/mobile-navigation.tsx
수정: src/features/documents/review/components/review-screen.tsx
수정: src/features/workplaces/components/workplace-detail-screen.tsx (깨진 진입점 문구 복구)
수정: src/mocks/{development.ts,shared/chat-handlers.ts,shared/input-handlers.ts}
수정: package.json, package-lock.json, README.md, DEVELOPMENT_9.md

## 남은 범위 및 10차
이번 5개 기능은 위 계약 범위에서 지원한다. 전체 9차의 서버 계약 확정/실제 영속화/실제 모바일 키보드·터치·스크린리더 검증은 남아 있다. 이전 제한인 100건 초과 Case 선택 탐색, RHF 채팅 폼 전환, 미저장 임시답변의 조회 실패 시 보존, 화면 이탈 후 실행 스트림 재연결 등은 이번 5개 보완 범위 밖이다.
10차 독립 기능 개발은 가능하다. 실제 백엔드 연동 완료나 실제 기기 전체 검증 완료를 뜻하지 않는다. main 유지, commit/push 없음.

## 최종 검증 기록
- npm run lint: 경고 없이 통과.
- npm run typecheck: 통과.
- npm test: 28개 파일·367개 테스트 통과 (기존 358개 + 신규 9개).
- npm run build: 통과.
- git diff --check: 통과. main 유지, commit/push 없음.
- 최종 Edge 보고서: 채팅/문서/네 종류 결과/과거 스냅샷/공유 Case 문서/오류·취소·재시도/관리 여정 통과. 4개 너비 가로 넘침 없음. JS 오류 0, 미처리 Mock 0, 실제 백엔드 전달 요청 0.
- 실제 모바일 키보드 및 실제 서버 영속화 검증은 미실시. 축소 뷰포트 입력 접근과 개발 새로고침 초기화는 확인했다.
