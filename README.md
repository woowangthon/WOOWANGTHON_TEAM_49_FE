# 월급잇다 Frontend

Next.js 16 App Router · React 19 · TypeScript strict · Tailwind CSS 4.
2차 인증 기능(회원가입·로그인·세션 복원·로그아웃·보호 경로)을 구현했습니다.
`/dashboard`는 현재 사용자 정보만 표시하는 인증 진입 화면입니다. 업무 대시보드·임금 계산은 후속 범위입니다.

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
    (workspace)/               보호 레이아웃 + /dashboard 인증 진입 화면
    providers.tsx              QueryClient + 세션별 서비스 생성과 최초 복원
  components/
    layout/                    Server AppShell + Client MobileNavigation
    ui/                        업무 도메인에 의존하지 않는 표시 컴포넌트
  features/
    auth/                      인증 API·DTO 검증·수명주기·폼·경로 보호·사용자 Query
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
실제 페이지는 `/`, `/login`, `/signup`, `/dashboard`입니다. 미구현 업무 화면은 생성하지 않았습니다.
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
로컬 `http://127.0.0.1:8000/openapi.json`에 연결되지 않아 실행 서버와 대조하지 못했습니다.

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
- 계산·문서·결과·AI의 업무 DTO는 이번에 만들지 않았습니다. 다음 기능마다 OpenAPI와 P0를 대조합니다.

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
