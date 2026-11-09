# 월급잇다 Frontend

Next.js 16 App Router · React 19 · TypeScript strict · Tailwind CSS 4.
4차 문서 등록·자료함·Case 문서 연결·처리 상태 관리를 구현했습니다.
기존 인증·세션·Query 기반을 유지합니다. OCR 필드 검토·임금 계산은 이번 범위에 포함하지 않습니다.

## 실행

Node.js 24 환경에서 검증합니다. 기존 package-lock.json을 유지합니다.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

`http://localhost:3000`의 홈에서 로그인 화면으로 이동할 수 있습니다. `NEXT_PUBLIC_API_BASE_URL`은
`http://127.0.0.1:8000/api/v1`처럼 API 버전 경로까지 포함합니다.
미설정 시 이 로컬 주소를 사용합니다. 공개 환경변수는 빌드에 포함되므로 변경 후 재빌드해야 합니다.
비밀키는 넣지 않습니다. `.env.local`과 `docs/`는 Git에서 제외됩니다.

## 검증

```powershell
npm run lint
npm run typecheck
npx tsc --noEmit
npm test
npm run build
```

`typecheck`는 설치된 Next.js의 `next typegen`을 먼저 실행합니다.
라우트를 이동한 후 과거 `.next/dev/types/validator.ts`가 삭제된 파일을 참조한다면,
개발 서버를 재시작해 개발 타입을 갱신합니다. 새 체크아웃에서는 `npm run typecheck`를 사용합니다.
Vitest는 Node의 전송·세션·캐시 테스트와 jsdom의 React Testing Library 테스트를 실행합니다.
MSW 3의 `onUnhandledFrame: "error"`로 미등록 요청을 차단합니다.
MSW fixture는 `src/test/server.ts`에서 테스트에만 연결하며, 제품에는 모킹을 넣지 않습니다.

## 구조와 개발 원칙

```text
src/
  app/                         라우트 구성과 전역 경계
    (marketing)/page.tsx        공개 홈: /
    (auth)/                    /login, /signup + 게스트 레이아웃
    (workspace)/               보호 레이아웃 + 대시보드·근무지·급여 사례
    providers.tsx              QueryClient + 세션별 서비스 생성과 최초 복원
  components/
    layout/                    Server AppShell + Client MobileNavigation
    ui/                        업무 도메인에 의존하지 않는 표시 컴포넌트
  features/
    auth/                      인증 API·DTO 검증·수명주기·폼·경로 보호·사용자 Query
    workplaces/                근무지 API·DTO·Query·ViewModel·CRUD 화면
    cases/                     사례 API·DTO·Query·ViewModel·버전 수정·삭제 영향
    dashboard/                 사용자 정보와 조회 범위가 명시된 집계·최근 사례
  hooks/                       공통 서비스 접근과 세션 범위 hook
  lib/
    api/                       HTTP·오류·JSON·파일·SSE 전송
    config/                    공개 API 환경변수 검증
    query/                     QueryClient 기본값과 캐시 범위
    app-services.ts            앱 트리별 서비스 조립과 캐시 정리
  types/                       공통 API DTO와 JSON 요청 타입
  test/                        MSW 테스트 전용 서버·fixture
```

`stores/`는 공유 UI 상태가 생길 때 생성합니다. 현재 Drawer는 내부 상태로 충분합니다.
앞으로 `features/<feature>/{api,queries,components,types,view-models}`를 실제 필요에 따라 추가하고,
업무 전용 hook·DTO·ViewModel은 그 기능 안에 둡니다. 공통 `types/`에 모든 도메인을 모으지 않습니다.
DTO를 화면 ViewModel과 분리하고 `null`, `0`, `UNKNOWN`을 보존합니다.

`(marketing)`, `(auth)`, `(workspace)`는 URL에 나타나지 않습니다.
실제 페이지는 `/`, `/login`, `/signup`, `/dashboard`, `/workplaces`, `/workplaces/new`,
`/workplaces/[workplaceId]`, `/cases`, `/cases/new`, `/cases/[caseId]`, `/cases/[caseId]/upload`입니다.
마지막 경로는 업로드 미구현 안내이며 파일 입력·전송 기능을 제공하지 않습니다.
같은 실제 URL을 직접 경로와 Route Group 양쪽에 추가하지 않습니다.

page/layout은 Server Component로 두고 페이지 조합만 담당합니다.
Provider·인증 폼/가드·계정 표시·브라우저 hook·Drawer·error 경계는 Client Component입니다.
AppShell의 `navigation` 슬롯에는 실제 구현된 경로만 연결합니다.
업무 레이아웃의 `AuthGate`는 복원 완료 및 인증 확인 전 children을 렌더링하지 않습니다.
`useSearchParams`를 사용하는 게이트는 Suspense로 감싸 정적 빌드도 지원합니다.
**클라이언트 게이트는 보안 경계가 아닙니다.** 모든 API는 서버에서 토큰·소유권을 검증해야 합니다.
보호 게이트 아래에 민감 데이터를 미리 가져오는 Server Component를 추가하지 않습니다.
현재 `/dashboard`는 서버에서 개인정보를 조회하거나 HTML/RSC에 삽입하지 않습니다.

## 상태와 인증

각 Provider 인스턴스가 QueryClient·메모리 세션·API 클라이언트를 소유합니다.
모듈 전역에 사용자 상태를 만들지 않으므로 SSR 요청 간 토큰과 캐시가 공유되지 않습니다.
서버 상태는 TanStack Query에 두고 브라우저 영속 저장이나 Zustand에 복제하지 않습니다.
인증 폼은 React Hook Form과 Zod를 사용합니다. 비밀번호를 Mutation 변수/캐시에 저장하지 않습니다.

- 로그인: `useAppServices().auth.login({email,password})`가 메모리 토큰과 사용자 Query를 갱신합니다.
- 최초 복원: Provider가 `auth.restore()` → 기존 `api.refreshSession()` single-flight → `GET /users/me` 순서로 실행합니다.
  StrictMode 중복 effect와 동시에 발생한 401도 refresh를 공유합니다.
- 인증 상태: `restoring`, `anonymous`, `authenticated`, `signing-out`. 사용자 DTO는 Query에만 보관합니다.
- 로그아웃: `auth.logout()`이 화면·세션·사용자 캐시를 즉시 정리하고 별도 수명의 요청으로 서버에 종료를 알립니다.
  Bearer와 쿠키를 전달하며 refresh하지 않습니다. 10초 제한 후에도 클라이언트는 미인증 상태를 유지합니다.
  서버 종료 실패는 안내하며, HttpOnly 쿠키가 서버에 남으면 새로고침 후 복원될 가능성을 숨기지 않습니다.
- 세션 변경: 이전 요청 AbortSignal 취소, 진행 중 Query 취소, Query·Mutation 캐시 즉시 제거.
- refresh: 토큰만 교체하며 같은 사용자의 캐시는 유지합니다. 새로고침 시 메모리 토큰은 사라지고 쿠키로 재발급합니다.
- Query key: `queryKeys.session(useSessionGeneration())` 아래에 기능별 키를 구성합니다.
  키에 토큰·문서 원문·채팅 내용은 넣지 않습니다. Query의 `signal`을 API 요청까지 전달합니다.

인증이 필요한 API의 401만 refresh합니다. 동일 세션의 동시 401은 Promise를 공유하고,
이미 교체된 토큰의 늦은 401은 새 토큰을 재사용합니다. 원 요청은 최대 한 번 재전송합니다.
refresh 실패/재시도 401은 세션을 폐기합니다. 이전 세션의 refresh는 새 계정을 덮어쓸 수 없습니다.
공개 인증 요청에는 `{ auth: "none" }`을 명시해 잘못된 비밀번호의 401이 refresh를 유발하지 않게 합니다.

회원가입은 201의 JSON 래퍼만 처리하고 토큰/가입 사용자 DTO는 가정하지 않습니다.
가입 성공 후 `/login?registered=1`로 이동하며, 기존 목적지가 있으면 검증 후 이어갑니다.
이메일 형식·필수 비밀번호·이름을 검증합니다. P0에 없는 길이·조합 정책은 만들지 않고 서버 422를 표시합니다.
중복 이메일/422는 해당 입력란으로, 로그인 401/429/통신 오류는 오류 요약으로 포커스를 이동합니다.

게스트가 보호 경로에 접근하면 `/login?next=...`로 이동합니다.
`safeReturnTo`는 `/dashboard`, `/workplaces`, `/cases`, `/library`, `/settings` 하위의 내부 상대 경로만 허용합니다.
외부 URL·프로토콜 상대 URL·역슬래시·제어문자·경로 순회·인코딩 우회·인증 경로 재귀는 `/dashboard`로 대체합니다.
쿼리도 복귀 경로에 포함하며 가입/로그인 링크 간에 유지합니다. 신규 보호 경로 도입 시 허용 목록을 함께 갱신합니다.

## API 사용

`useAppServices().api`를 Client feature에서 사용합니다. Server Component에서 사용자 API를
호출하는 경우에는 요청별 서비스/쿠키 전달 방식을 별도로 설계합니다. 현재 브라우저용 클라이언트가
서버 요청의 쿠키를 자동 전달한다고 가정하지 않습니다.

- `requestJson(path, decode, options)`: `{code,message,data}`를 검증하고 `data`만 decoder로 전달.
  기능의 Zod schema 등으로 검증합니다. 검증되지 않은 제네릭 타입 단언은 제공하지 않습니다.
- `requestNoContent(path, options)`: 204만 허용하며 본문을 파싱하지 않음.
- `requestBlob(path, options)`: 원본/PDF/ZIP/이미지 Blob을 반환. 객체 URL 생성·해제는 소비 화면 책임.
- `requestSse(path, options)`: SSE 스트림 반환. `readSseFrames`가 UTF-8/CRLF/빈 줄/주석을 처리.
  P0의 업무 이벤트·payload, message_done 확인, 서버 cancel/retry 호출은 후속 채팅 기능 책임입니다.
  스트림 EOF만으로 완료를 판단하지 않으며 일반 error 프레임을 삼키지 않습니다.

옵션은 `method`, JSON `body`, `headers`, `signal`, `auth`, `refresh`입니다.
multipart 업로드는 이번 JSON 클라이언트에 억지로 포함하지 않습니다. 업로드 기능에서 별도 전송을 추가합니다.
모든 요청은 `credentials: "include"`, `cache: "no-store"`, `redirect: "error"`를 사용하고,
설정된 Base URL의 경로 내부에서만 Bearer를 전달합니다.

`ApiError`는 `status`, `kind`, `errorCode`, `details`, `fieldErrors`, `retryAfter`를 보존합니다.
message 문자열로 분기하지 않습니다. 403/404는 접근 중단, 409는 최신 상태 재조회,
422는 필드/business 오류 표시, 429는 Retry-After를 활용하는 식으로 기능 UI가 처리합니다.
Query·Mutation의 자동 재시도는 기본 비활성화했습니다. 401 이외의 POST 자동 재전송은 하지 않습니다.
지원되는 mutation의 `expectedInputVersion`과 `Idempotency-Key`는 호출부가 명시적으로 전달합니다.
서버 계산·비교 결과를 FE에서 산출하거나 대체하지 않습니다.

## 디자인과 반응형

`globals.css`의 Tailwind v4 `@theme`가 P2의 배경·표면·본문·강조·상태색과
14/20/26px 모서리, 그림자를 정의합니다. 간격은 기본 4px 배수이며,
13/14/20px 타이포그래피 토큰과 한국어 시스템 폰트 스택을 제공합니다.
Pretendard/Noto Sans KR 파일을 번들하거나 외부에서 다운로드하지는 않습니다.

기본 스타일은 모바일, `sm`부터 여백 확장, `lg`(64rem)부터 16rem Sidebar와 가변 본문입니다.
프로토타입의 760px 고정 최대폭은 업무 화면 전체에 적용하지 않습니다.
Drawer는 native modal dialog로 포커스 가두기·Esc·닫은 후 포커스 복귀를 브라우저에 맡기고,
데스크톱 전환 시 닫습니다. skip link, visible focus, motion 감소를 지원합니다.
상태색만으로 의미를 전달하지 말고 문구/아이콘을 함께 사용합니다.
문서 검토의 PC 2열·모바일 탭은 실제 검토 기능을 만들 때 추가합니다.

## 계약 확인 기록과 남은 확인

2026-11-09 기준 AGENTS.md와 P0→P3 순서로 공통 기반 관련 내용을 검토했습니다.
P0의 실제 파일명은 `docs/references/백엔드_API_명세_v1.pdf`이며,
안내된 `백엔드_API_명세서_v1.pdf`와 이름이 다릅니다. 기존 파일을 변경하지 않았습니다.
1·2차 작업에서는 로컬 `http://127.0.0.1:8000/openapi.json`에 연결되지 않아 실행 서버와 대조하지 못했습니다.
**3차 작업에서는 사용자 지시에 따라 백엔드·OpenAPI 연결 확인 및 실행을 시도하지 않았습니다.**

- P0 우선: 쿠키 refresh 교체, 로그아웃/Case 삭제 204, 탈퇴 202,
  계산 재실행은 202 job 응답. 이전 문서의 상충하는 예시는 사용하지 않습니다.
- P0는 refresh의 전체 DTO를 싣지 않습니다. 공통 기반은 P4 `API_명세서_v0.5.md` B-03에
  명시된 `accessToken`만 런타임 검증·사용합니다. `user`, 만료시각 등은 추정하지 않습니다.
  실제 서버 연결 시 refresh 응답 필드를 OpenAPI로 재확인해야 합니다.
- 로그인은 P0의 `accessToken`, `tokenType`, `expiresIn`, `user.{userId,email,name}`을 검증합니다.
  `GET /users/me`는 같은 사용자 공통 필드만 소비하고 `createdAt`을 필수로 요구하지 않습니다.
  회원가입 응답 DTO와 비밀번호 상세 정책은 가정하지 않습니다.
- 쿠키 이름·SameSite·Secure·CSRF·CORS allow-origin/allow-credentials와 배포 origin은 미확인입니다.
  local 개발 시 localhost FE와 127.0.0.1 API의 쿠키 정책도 서버 설정에 맞춰 확인합니다.
- 403/429는 일반 HTTP 처리 기반만 제공합니다. P0에서 확인하지 못한 상세 오류 DTO를 만들지 않습니다.
- 계산·문서·결과·AI의 업무 DTO는 아직 만들지 않았습니다. 서버 대조는 향후 사용자가 허용한 연동 작업에서 진행합니다.

Next.js 작성 전에 설치된 `node_modules/next/dist/docs/`의 Server/Client Components,
Project Structure, Route Groups, CSS, Environment Variables, Vitest, CLI typegen 가이드를 확인했습니다.
2차 작업 전 Server/Client Components, Route Groups, Authentication, useRouter, useSearchParams와 Suspense 지침을 다시 확인했습니다.
기존 Turbopack/Tailwind 설정, 설치 버전, strict 설정을 유지했습니다.

## 1차 기반 변경 파일

| 구분 | 생성·수정한 파일 |
|---|---|
| 실행·문서 | `.env.example`, `package.json`, `vitest.config.mts`, `README.md` |
| 앱 기반 | `src/app/layout.tsx`, `src/app/providers.tsx`, `src/app/globals.css`, `src/app/loading.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx` |
| 라우트 | `src/app/page.tsx` 삭제 → `src/app/(marketing)/page.tsx`, `src/app/(workspace)/layout.tsx` 생성 |
| 공통 UI | `src/components/layout/app-shell.tsx`, `src/components/layout/mobile-navigation.tsx`, `src/components/ui/state-panel.tsx` |
| 세션·인증 기반 | `src/features/auth/session.ts`, `src/features/auth/api/refresh.ts`, `src/hooks/use-app-services.ts` |
| API 전송 | `src/lib/api/client.ts`, `src/lib/api/error.ts`, `src/lib/api/response.ts`, `src/lib/api/sse.ts`, `src/types/api.ts` |
| 서비스·환경·Query | `src/lib/app-services.ts`, `src/lib/config/env.ts`, `src/lib/query/client.ts`, `src/lib/query/keys.ts` |
| 단위 테스트 | `src/lib/api/client.test.ts`, `src/lib/api/sse.test.ts`, `src/lib/app-services.test.ts`, `src/lib/config/env.test.ts` |

참고문서와 AGENTS.md, package-lock.json, Next.js 설정, TypeScript 설정은 변경하지 않았습니다.

## 2차 인증 변경 파일과 검증

| 구분 | 생성·수정한 파일 |
|---|---|
| 문서·테스트 설정 | `README.md`, `vitest.config.mts` |
| 앱 연결 | `src/app/providers.tsx`, `src/app/(marketing)/page.tsx`, `src/app/(workspace)/layout.tsx` |
| 인증 라우트 | `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/(workspace)/dashboard/page.tsx` |
| 공통 필드 | `src/components/ui/text-field.tsx` |
| 인증 API·타입 | `src/features/auth/api/auth.ts`, `src/features/auth/schemas.ts`, `src/features/auth/types.ts` |
| 인증 상태·Query·오류 | `src/features/auth/controller.ts`, `src/features/auth/hooks/use-auth.ts`, `src/features/auth/query-keys.ts`, `src/features/auth/form-errors.ts`, `src/features/auth/redirect.ts` |
| 인증 UI | `src/features/auth/components/auth-form.tsx`, `src/features/auth/components/auth-gate.tsx`, `src/features/auth/components/auth-pending.tsx`, `src/features/auth/components/account-overview.tsx`, `src/features/auth/components/workspace-navigation.tsx` |
| 기존 기반 확장 | `src/lib/api/client.ts`, `src/lib/app-services.ts` |
| 테스트 | `src/test/server.ts`, `src/features/auth/controller.test.ts`, `src/features/auth/redirect.test.ts`, `src/features/auth/components/auth-flow.test.tsx` |

2026-11-09 검증: lint, typecheck, test, build 통과. Vitest 7개 파일·114개 테스트 통과.
MSW로 가입/로그인 성공·중복 이메일·422·401·429·500·복원·동시 refresh·늦은 응답·로그아웃과 캐시 정리를 확인했습니다.
실제 백엔드 호출 성공으로 해석하면 안 됩니다. OpenAPI 연결은 실패했습니다.

별도로 로컬 프로덕션 서버와 headless Edge에서 320/375/768/1280px를 확인했습니다.
Playwright 요청 가로채기를 사용해 테스트용 HttpOnly 쿠키로 새로고침 복원을 검증했습니다.
가로 넘침 없음, 입력 오류 포커스, Tab 이동, 게스트/보호 경로 이동, 가입 후 로그인,
로그인 후 목적지 복귀, 로그아웃, Drawer Esc/포커스 복귀/스크롤 잠금/PC 전환 닫힘을 확인했습니다.
브라우저 JS 오류는 없었습니다. 모바일은 데스크톱 브라우저의 viewport 검증이며 실제 기기·가상 키보드 테스트는 아닙니다.
`test-results/auth-browser-report.json`과 `auth-*.png`는 Git에서 제외되는 로컬 검증 산출물입니다.
브라우저 검증용 Playwright는 임시 경로에 설치했으며 프로젝트 의존성·lockfile은 변경하지 않았습니다.

다음 단계는 서버 실행 후 OpenAPI·비밀번호 정책·쿠키/CORS·서버 세션 무효화를 실제로 대조하고,
사업장/Case 목록의 DTO·Query·로딩/오류/빈 상태를 붙이는 작업입니다.

## 3차 관리 기능과 계약 기준

이번 단계에서는 백엔드를 실행하거나 접속하지 않았습니다. 실제 API 연동 성공을 주장하지 않습니다.
AGENTS.md, README, P0 PDF 전체와 P1 관련 흐름, P2 토큰, P3·P4 관련 계약을 검토했습니다.
설치된 Next.js의 Server/Client Components, Route Groups, Dynamic Route Segments, useSearchParams/Suspense 가이드를 코드 작성 전에 확인했습니다.
동적 page의 `params`는 Promise로 받고 양의 정수 ID를 검증한 뒤 화면에 전달합니다. 페이지에서 사용자 API를 서버 요청으로 미리 호출하지 않습니다.

- 대시보드: 사용자 Query 재사용, `GET /workplaces`, `GET /cases`의 `total`로 전체 수를 표시합니다.
  최근 업데이트와 확인 필요 목록은 **첫 페이지 최대 20건** 기준입니다. 전체 데이터의 최신순 정렬이나 전체 확인 필요 수라고 표시하지 않습니다.
  목록에 `attentionRequired`가 없으면 미제공으로 남기고 false/0으로 바꾸지 않습니다.
- 근무지: 목록/상세/생성/수정/삭제 요청과 `/workplaces/{id}/cases`를 구현했습니다.
  `search`는 P4에서도 제안 사항이므로 전송하지 않습니다. 검색은 현재 서버 페이지의 이름·업종·지역을 대상으로 수행하며 UI에 범위를 명시합니다.
  서버에는 문서화된 `page`, `size`만 보냅니다. 페이지·검색·폼 초안은 메모리에만 둡니다.
- 근무지 생성: P0의 `{workplaceId}`만 소비합니다. P4의 전체 Workplace 생성 응답을 요구하지 않습니다.
  수정은 변경 필드만 보냅니다. 업종/지역을 명시적으로 비우면 null이며 임의 기본값을 넣지 않습니다.
- 근무지 삭제: 문서에 없는 `/workplaces/{id}/deletion-impact`를 만들지 않았습니다.
  상세의 `caseCount`를 다시 조회해 안내하고 명시적 체크 후 DELETE합니다. 409 의존성 오류는 유지하며 자동 확인/연쇄 삭제하지 않습니다.
  **P0는 근무지 DELETE의 정확한 응답을 생략합니다. 현재는 P4 B-14의 JSON 202를 따르며 receipt 필드를 추정하지 않습니다.**
  실제 서버가 204 또는 다른 계약을 쓰는지는 미검증입니다. Case의 204를 근무지에 임의 적용하지 않았습니다.
  JSON 성공은 삭제 요청 접수로 취급하고 목록으로 이동합니다. 문서 원본의 삭제·물리 파기 완료를 보장하지 않습니다.
- Case: 전역/근무지별 목록, 생성, 상세, 수정, 삭제를 구현했습니다.
  먼저 근무지를 선택·조회하고 HOURLY/MONTHLY와 임의 산정기간을 입력합니다. 달력 월 제약을 두지 않습니다.
  선택 지급일의 빈 입력은 null로 보냅니다. 생성 후 `/cases/{id}/upload` 안내로 이동합니다.
- Case 수정: 변경 필드 + 폼 초안의 `expectedInputVersion`만 PATCH합니다. workflow/status/workplaceId를 함께 보내지 않습니다.
  409 `INPUT_VERSION_CONFLICT`에서는 입력을 유지하고 저장을 막습니다. 명시적 최신 정보 불러오기가 초안을 교체한 뒤 새 버전으로 다시 수정할 수 있습니다.
  자동 재전송·자동 충돌 병합·공식 계산 요청은 하지 않습니다. 응답의 inputVersion/recompute를 받아도 계산 완료로 표시하지 않습니다.
- Case 삭제: `/cases/{id}/deletion-impact`를 먼저 조회하고 문서/공유 문서/보고서 수와 접근 차단을 안내합니다.
  조회 실패·불완전 DTO·원본 삭제/즉시 접근 차단이 P0와 충돌하는 응답은 삭제를 막습니다.
  사용자 확인 후 DELETE 204를 처리하고 목록/근무지 수를 갱신하며 상세·영향 캐시를 제거합니다.
- 상태 구분: COMPLETED는 '작업 완료'로 표시하고 검사 일치로 표현하지 않습니다. currentStep은 작업 단계이며 readiness를 만들거나 추정하지 않습니다.

P0에 상세 정의가 없는 조회 Workplace, 경량 Case 목록, deletion-impact 필드와 근무지 삭제 응답은 P3/P4의 비충돌 부분으로 보완했습니다.
필수 소비 필드는 Zod로 검증하며 미제공 선택 필드는 그대로 보존합니다. 실제 서버의 상세 DTO·제약·정렬은 미검증입니다.
백엔드의 개인정보·소유권 검증은 계속 필수이며 클라이언트 가드는 이를 대체하지 않습니다.

## 3차 Query·UI와 검증

사용자별 `['session', generation, 'management', ...]` 아래에서 근무지/사례 목록·상세·삭제 영향 키를 분리합니다.
생성/수정 후 관련 Query를 무효화하고 삭제 후 관련 진행 중 Query를 취소·제거합니다.
삭제 중/성공 상태는 기존 TanStack Query mutation cache에서 파생해 삭제된 상세/영향의 재요청을 막습니다.
별도 엔티티 저장소나 Zustand Store를 추가하지 않습니다. 인증 변경 시 기존 Query/Mutation 캐시 정리와 AbortSignal을 그대로 활용합니다.
DTO는 schema/API 계층, 표시 문구는 ViewModel 계층에 두며 서버 데이터를 다른 영속 저장소에 복제하지 않습니다.

기존 Tailwind 토큰·Sidebar·Drawer·입력 컴포넌트를 재사용했습니다.
shadcn/ui는 현재 의존성에 없어 추가 설치하지 않고, 공통 native select·pagination·확인 dialog·로딩/오류 컴포넌트를 구성했습니다.
다이얼로그는 취소를 기본 포커스로 삼고 Esc/취소 후 실제 트리거로 포커스를 복귀합니다.
필드 오류는 입력에 연결하고 요청이 끝난 뒤 오류 필드/요약으로 포커스를 이동합니다.

검증 결과: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` 통과.
Vitest 9개 파일·147개 테스트: 기존 인증/전송 114개와 관리 계약·화면 33개입니다.
MSW로 목록/페이지 이동, 근무지 CRUD, Case CRUD, 409 초안/최신 버전, 삭제 영향 실패/계약 충돌, 403/404/422, 빈 상태, 오류 재시도, 인증 해제 후 캐시 정리를 확인했습니다.
MSW 3에서 미등록 요청은 오류로 처리합니다. fixture는 테스트에만 들어갑니다.

별도로 headless Edge + 로컬 **프론트엔드** 프로덕션 서버에서 320/375/768/1280px를 검증했습니다.
모든 API 요청을 Playwright로 가로채 응답했으며 백엔드 접속/실행은 하지 않았습니다.
각 폭에서 가로 넘침 없음, 실제 페이지 이동, 근무지/Case CRUD, 페이지네이션, 충돌 복구, 삭제 확인·Esc·포커스 복귀, 빈 대시보드, 업로드 미구현 안내를 확인했습니다.
브라우저 JS 오류는 없었습니다. 데스크톱 브라우저 viewport 검사이며 실제 모바일 기기·가상 키보드 검증은 남아 있습니다.
`test-results/management-browser-report.json`, `management-*.png`는 Git 제외 로컬 산출물입니다. 스크린샷 데이터는 브라우저 테스트 fixture입니다.

## 3차 생성·수정 파일

| 구분 | 파일 |
|---|---|
| 문서 | `README.md` |
| 대시보드 | `src/app/(workspace)/dashboard/page.tsx`, `src/features/dashboard/dashboard-screen.tsx`, `src/features/dashboard/management-flow.test.tsx` |
| 기존 인증 UI 재사용 | `src/features/auth/components/account-overview.tsx`, `src/features/auth/components/workspace-navigation.tsx` |
| 근무지 라우트 | `src/app/(workspace)/workplaces/page.tsx`, `src/app/(workspace)/workplaces/new/page.tsx`, `src/app/(workspace)/workplaces/[workplaceId]/page.tsx` |
| Case 라우트 | `src/app/(workspace)/cases/page.tsx`, `src/app/(workspace)/cases/new/page.tsx`, `src/app/(workspace)/cases/[caseId]/page.tsx`, `src/app/(workspace)/cases/[caseId]/upload/page.tsx` |
| 근무지 계층 | `src/features/workplaces/api.ts`, `src/features/workplaces/schemas.ts`, `src/features/workplaces/queries.ts`, `src/features/workplaces/view-models.ts` |
| 근무지 UI | `src/features/workplaces/components/workplace-list-screen.tsx`, `src/features/workplaces/components/workplace-detail-screen.tsx`, `src/features/workplaces/components/workplace-form.tsx`, `src/features/workplaces/components/workplace-picker.tsx`, `src/features/workplaces/components/delete-workplace.tsx` |
| Case 계층 | `src/features/cases/api.ts`, `src/features/cases/schemas.ts`, `src/features/cases/queries.ts`, `src/features/cases/view-models.ts`, `src/features/cases/contracts.test.ts` |
| Case UI | `src/features/cases/components/case-cards.tsx`, `src/features/cases/components/case-list.tsx`, `src/features/cases/components/case-form.tsx`, `src/features/cases/components/case-create-screen.tsx`, `src/features/cases/components/case-detail-screen.tsx`, `src/features/cases/components/delete-case.tsx` |
| 공통 UI | `src/components/ui/confirm-dialog.tsx`, `src/components/ui/page-heading.tsx`, `src/components/ui/pagination.tsx`, `src/components/ui/query-feedback.tsx`, `src/components/ui/select-field.tsx`, `src/components/ui/styles.ts` |
| 공통 hook | `src/hooks/use-form-error-focus.ts`, `src/hooks/use-session-scope.ts` |
| 공통 API·Query·ID | `src/lib/api/schema.ts`, `src/lib/api/form-errors.ts`, `src/lib/query/business-keys.ts`, `src/lib/query/use-removal-state.ts`, `src/lib/route-id.ts` |
| MSW fixture | `src/test/management-handlers.ts` |

기존 API 클라이언트·메모리 세션·Provider를 재작성하지 않았고 의존성·lockfile·AGENTS.md·참고문서는 변경하지 않았습니다.
main 단일 브랜치를 유지하며 commit/push를 수행하지 않았습니다.
다음 작업은 문서 업로드·검증·처리 상태 polling·Case 문서 연결입니다. 실제 서버 계약 대조는 별도 허용된 연동 단계에서 수행합니다.


## 4차 문서 등록·관리

백엔드 실행·접속·OpenAPI 조회 없이 P0 `백엔드_API_명세_v1.pdf`를 우선 적용했습니다.
P1 관련 제품 흐름, P2 자료함·업로드 카드와 상태 표현, P3 §9.4~10·캐시 정책을 검토했습니다.
설치된 Next.js의 Server/Client Components, Dynamic Routes, Route Groups 문서를 확인했습니다.
기존 인증 single-flight·메모리 세션·Query·디자인 토큰·공통 입력·확인 dialog를 재사용했습니다.
현재 프로젝트에는 shadcn/ui가 설치되어 있지 않아 별도 의존성을 추가하지 않았습니다.

구현 범위:
- `/library`: 사용자 전체 공유 원본, 근무지 선택(기존 페이지형 picker 재사용), 유형·처리 상태 서버 필터, 페이지 이동.
- `/workplaces/[workplaceId]/documents`: 공유 원본 목록·업로드·연결 사례·삭제 영향. 근무지 상세와 양방향 이동.
- `/cases/[caseId]/upload`: 기존 안내 화면을 업로드·연결 목록·기존 원본 연결 화면으로 교체.
- 연결 목적·선택 적용기간 생성/수정, 현재 초안의 `expectedInputVersion`, 409 충돌 시 명시적 최신 버전 확인 후 재제출.
- Case 연결 해제와 공유 원본 삭제를 다른 확인 흐름으로 제공. 원본 삭제는 영향 조회와 체크를 거친 `confirm=true` 요청.
- 파일 선택·Drag & Drop, 한 파일씩 전송, 중복 제출 차단, 업로드 요청 대기 중단·명시적 재시도.
- PDF/JPEG/PNG MIME·확장자, 빈 파일, 20MiB 검증. 지원 브라우저에서는 이미지 bitmap 크기 확인 후 해제.
- PDF 페이지 수·암호화·손상·실제 MIME 검사는 서버 검증에 위임. 413/415/422 안내에 제한 명시.
- UPLOADED/PROCESSING에서만 상세 API를 2초 간격 조회. READY/REVIEW_REQUIRED/FAILED 및 오류에서 중지.
  unmount·사용자 변경 시 signal 취소. 서버 progress가 있을 때만 문서 처리 진행률 표시.
- READY와 CONFIRMED 구분. 검토 상태·연결 사례·시각이 미제공이면 임의 값이나 0으로 채우지 않음.
- 실패 문서 retry, 저장 이후 recompute-status 조회·작업 중 polling. 계산 API 자동 호출 없음.
- 문서 변경 후 목록·문서 상태·Case·근무지 및 Case 하위 readiness/results/recompute 캐시 무효화.
  기존 Case/근무지 삭제에서도 관련 문서 요청을 취소하고 권한을 잃은 문서 화면 캐시를 제거.
- 빈 상태·로딩·오류·재시도, 모바일 단일 열과 PC 다중 열 카드, 긴 파일명 줄바꿈, 키보드 dialog 지원.

제외 범위는 OCR 필드 조회/확인/수정, 원문 좌표 하이라이트, 수기 기록, 임금 계산,
AI·상담·보고서, 문서 교체의 2단계 확인입니다. 이 기능의 API는 호출하지 않습니다.
문서 link·원본 DTO와 표시 ViewModel, API·Query·관리 컴포넌트를 분리해 5차에서 확장할 수 있습니다.

### 4차 API와 계약의 경계

| API | 이번 사용 및 계약 기준 |
|---|---|
| `GET /documents` | P0 전체 자료함. `workplaceId`, `documentType`; `processingStatus`와 상세 목록 DTO는 P4 B-23 보완 |
| `GET /workplaces/{w}/documents` | P0 공유 원본. pagination·유형 필터는 P4 B-24 보완 |
| `POST /workplaces/{w}/documents` | P0 원본 업로드, multipart file/documentType, 202 상태 |
| `GET /workplaces/{w}/documents/{d}` | P4 B-26의 원본 상세. 연결 Case 없는 원본의 상태도 조회하기 위한 보완 |
| `GET /cases/{c}/documents` | Case 연결 목록, Page 및 link DTO는 P4 B-32 보완 |
| `POST /cases/{c}/documents` | P0 파일 생성+자동 연결 편의 API. multipart file/documentType, 202 |
| `GET /cases/{c}/documents/{d}` | P0 2초 처리 상태 조회. P0에 없는 필드·OCR API 호출 없음 |
| `POST /cases/{c}/documents/{d}/retry` | P0 retry 흐름, 구체 경로·JSON `{}`·202는 P4 B-34 보완 |
| `POST /cases/{c}/document-links` | P0 documentId/purpose/applicableFrom/applicableTo/expectedInputVersion. 응답 link DTO는 P4 보완 |
| `PATCH /cases/{c}/document-links/{linkId}` | P4 B-37의 목적·적용기간·expectedInputVersion, JSON 응답 |
| `DELETE /cases/{c}/document-links/{linkId}` | P4 B-38의 expectedInputVersion body, JSON 200 `{linkId,unlinked:true,...}`. 원본 삭제하지 않음 |
| `GET /workplaces/{w}/documents/{d}/deletion-impact` | P0 삭제 영향 흐름, 상세 필드 linkedCaseIds/count/canDeleteOriginal/reasonCode는 P4 B-28 보완 |
| `DELETE /workplaces/{w}/documents/{d}?confirm=true` | P0 공유 참조 영향 확인 정책. 응답 형식은 아래 미확정 사항 참조 |
| `GET /cases/{c}/recompute-status` | P0 저장 후 갱신 상태. 작업 중 2초 간격은 FE 선택이며 계산 완료로 해석하지 않음 |

미확정·제한 사항:
1. **P0는 원본 DELETE의 성공 상태/본문을 명시하지 않습니다.** 현재 P4 B-27의 JSON 202를
   전제로 공통 JSON 래퍼를 처리하며 영수증 필드를 요구하지 않습니다. 204로 임의 대체하지 않았습니다.
   자동 물리 파기 예정일을 만들지 않으며 삭제 요청 접수와 물리 파기 완료를 구분합니다.
2. Case link DELETE의 body와 JSON 200도 P0에 상세 설명이 없어 P4 B-38로 보완했습니다.
   실제 서버와 대조되지 않은 계약입니다. P0의 Case 자체 DELETE 204와 구분합니다.
3. P0 목록 상세가 생략되어 P4 DocumentItem/DocumentLink를 필요한 범위만 검증합니다.
   reviewStatus/progress/linkedCaseIds/uploadedAt/workplaceName 등 미제공 metadata는 미제공으로 보존합니다.
   연결 상태 enum은 정의되어 있지 않으므로 임의 `linkStatus`를 보내지 않고 연결 유무를 표시합니다.
4. P0는 목적 전체 enum을 제시하지 않습니다. 임의 enum을 만들지 않고 목적 문자열을 입력받으며,
   알려진 예시 `CONTRACT_FOR_PERIOD`만 안내합니다. 검증 실패는 422로 표시합니다.
   실제 허용 값이 정리되면 사용자 친화적인 선택 UI로 변경해야 합니다.
5. 서버 검색 파라미터는 명시되어 있지 않습니다. 검색은 **현재 페이지 파일명만** 대상으로 하며
   범위를 UI에 명시합니다. 검색/정렬 파라미터를 만들어 보내지 않습니다.
6. recompute-status의 정확한 P0 DTO가 생략되어 pending/running 수와 P4 activeJob.status를 읽습니다.
   식별할 수 없는 구조는 오류로 처리하며 완료 상태를 추정하지 않습니다. 실제 계약 확인이 필요합니다.
7. Case에 연결되지 않은 실패 원본의 retry API는 문서에 없습니다. 임의 Workplace retry를 만들지 않고
   Case 연결 이후 문서 재처리를 안내합니다. 원본 상태 API는 P4 상세 경로로 보완했습니다.
8. 업로드는 idempotency 보장이 없으므로 네트워크 오류·취소 시 자동 POST 재전송하지 않습니다.
   요청 대기 중단이 서버 접수/처리의 취소를 보장하지 않음을 안내합니다.
9. 필터·상세 DTO·삭제 영향 보완은 하위 문서에 근거하며 실제 백엔드 연동을 검증한 것이 아닙니다.
   후속 연동 허용 단계에서 P0의 생략 부분을 확정해야 합니다. 이번 작업에서는 서버 접속을 시도하지 않았습니다.

### 4차 생성·수정 파일

- 신규 라우트: `src/app/(workspace)/library/page.tsx`, `src/app/(workspace)/workplaces/[workplaceId]/documents/page.tsx`.
- 문서 계약·상태: `src/features/documents/{api,schemas,view-models,file-validation,query-keys,queries,cache}.ts`.
- 문서 UI: `src/features/documents/components/{document-screens,document-list,document-card,upload-form,link-form,document-actions}.tsx`.
- MSW·테스트: `src/test/document-handlers.ts`, `src/features/documents/documents.test.tsx`.
- 기존 업로드 라우트, `src/features/cases/components/{case-detail-screen,case-form}.tsx`,
  `src/features/workplaces/components/workplace-detail-screen.tsx`,
  `src/features/auth/components/workspace-navigation.tsx`의 문서 탐색 연결.
- `src/lib/api/client.ts`: 기존 인증·signal·refresh를 유지하면서 FormData를 지원.
  Content-Type boundary는 브라우저에 맡기고 JSON과 동시 전송을 차단.
- `src/features/{cases,workplaces}/queries.ts`: 기존 삭제 흐름과 문서 캐시 정리 연계.
- `src/features/dashboard/management-flow.test.tsx`: 폐기된 업로드 준비 안내 검증을 실제 자료 등록 경로 검증으로 갱신.
- `README.md`: 구현 범위·계약의 경계·검증 결과 기록.

### 4차 검증

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`로 검증합니다.
최종 실행 결과는 아래 완료 기록에 남깁니다.
MSW 3는 미등록 요청을 오류 처리합니다. jsdom multipart 테스트는 Node fetch와 일치하는
WHATWG FormData와 File을 사용하며 제품 코드에 테스트 우회 처리를 넣지 않았습니다.

Edge headless + 로컬 프론트엔드 프로덕션 서버에서 320/375/768/1280px 검증을 통과했습니다.
Playwright가 모든 API 요청을 가로채 **MSW Node에 전달**하여 처리했습니다.
실제 백엔드 프로세스 실행·네트워크 접속은 하지 않았습니다.
자료함 필터·근무지·Case 화면, 실제 multipart 업로드, 처리 polling 종료, 기존 원본 연결/수정/해제,
원본 보존, 삭제 영향 확인·명시적 체크, Esc 닫기·트리거 포커스 복귀가 통과했습니다.
모든 폭에서 가로 넘침과 브라우저 JS 오류가 없었습니다. 실제 모바일 기기·터치 키보드 검증은 아닙니다.
로컬 산출물 `test-results/documents-browser-report.json`, `documents-*.png`는 Git 제외입니다.
검증 스크립트는 `%TEMP%/wageitda-browser/documents-browser-smoke.cjs`에 있습니다.
Playwright는 기존 임시 경로의 설치를 사용했고 package.json/lockfile을 변경하지 않았습니다.

5차에서는 문서 상세에 원문 Blob·필드 Query·Case override 편집·review.confirm을 연결하되,
READY/CONFIRMED 구분과 서버 inputVersion·공유 원본 참조 모델을 유지해야 합니다.
main 단일 브랜치를 유지하며 commit/push하지 않았습니다.

최종 검증: lint·typecheck·build 통과, Vitest 10개 파일·182개 테스트 통과(기존 147개 + 문서 35개).
Edge 4개 viewport의 문서 등록·관리 흐름은 MSW로 검증했으며 실제 백엔드 연동 성공을 뜻하지 않습니다.
