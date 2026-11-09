# 월급잇다 Frontend

Next.js 16 App Router · React 19 · TypeScript strict · Tailwind CSS 4.
1차 공통 기반이며 로그인·대시보드·임금 계산 화면은 아직 구현하지 않았습니다.

## 실행

Node.js 24 환경에서 검증합니다. 기존 package-lock.json을 유지합니다.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

`http://localhost:3000`에 준비 안내가 표시됩니다. `NEXT_PUBLIC_API_BASE_URL`은
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
Vitest는 Node 환경에서 실제 HTTP 호출 없이 전송·세션·캐시 경합을 검사합니다.
테스트 fixture는 제품에 연결하지 않습니다.

## 구조와 개발 원칙

```text
src/
  app/                         라우트 구성과 전역 경계
    (marketing)/page.tsx        유일한 실제 페이지: /
    (workspace)/layout.tsx      업무 화면용 레이아웃 골격, 하위 페이지 없음
    providers.tsx              QueryClient + 세션별 서비스 생성
  components/
    layout/                    Server AppShell + Client MobileNavigation
    ui/                        업무 도메인에 의존하지 않는 표시 컴포넌트
  features/
    auth/                      메모리 세션과 refresh 응답 검증
  hooks/                       공통 서비스 접근과 세션 범위 hook
  lib/
    api/                       HTTP·오류·JSON·파일·SSE 전송
    config/                    공개 API 환경변수 검증
    query/                     QueryClient 기본값과 캐시 범위
    app-services.ts            앱 트리별 서비스 조립과 캐시 정리
  types/                       공통 API DTO와 JSON 요청 타입
```

`stores/`는 공유 UI 상태가 생길 때 생성합니다. 현재 Drawer는 내부 상태로 충분합니다.
앞으로 `features/<feature>/{api,queries,components,types,view-models}`를 실제 필요에 따라 추가하고,
업무 전용 hook·DTO·ViewModel은 그 기능 안에 둡니다. 공통 `types/`에 모든 도메인을 모으지 않습니다.
DTO를 화면 ViewModel과 분리하고 `null`, `0`, `UNKNOWN`을 보존합니다.

`(marketing)`과 `(workspace)`는 URL에 나타나지 않습니다.
`app/page.tsx`는 `(marketing)/page.tsx`로 이동했으며 `/dashboard` 등 빈 페이지를 만들지 않았습니다.
같은 실제 URL을 직접 경로와 Route Group 양쪽에 추가하지 않습니다.

page/layout은 Server Component로 두고 페이지 조합만 담당합니다.
Provider·브라우저 hook·Drawer·error 경계만 Client Component입니다.
AppShell의 `navigation` 슬롯에는 실제 구현된 경로만 연결합니다.
인증 가드는 이번 범위에 포함하지 않았으며 레이아웃은 보안 경계가 아닙니다.

## 상태와 인증

각 Provider 인스턴스가 QueryClient·메모리 세션·API 클라이언트를 소유합니다.
모듈 전역에 사용자 상태를 만들지 않으므로 SSR 요청 간 토큰과 캐시가 공유되지 않습니다.
서버 상태는 TanStack Query에 두고 브라우저 영속 저장이나 Zustand에 복제하지 않습니다.
폼 구현 시 기존 React Hook Form과 Zod를 사용합니다.

- 로그인 성공/계정 전환: `useAppServices().session.start(accessToken)`.
- 로그아웃/탈퇴/인증 폐기: `session.clear()`. 서버 로그아웃 요청과 화면 이동은 후속 인증 기능에서 처리합니다.
- 세션 변경: 이전 요청 AbortSignal 취소, 진행 중 Query 취소, Query·Mutation 캐시 즉시 제거.
- refresh: 토큰만 교체하며 같은 사용자의 캐시는 유지합니다. 새로고침 시 access token은 사라집니다.
- Query key: `queryKeys.session(useSessionGeneration())` 아래에 기능별 키를 구성합니다.
  키에 토큰·문서 원문·채팅 내용은 넣지 않습니다. Query의 `signal`을 API 요청까지 전달합니다.

인증이 필요한 API의 401만 refresh합니다. 동일 세션의 동시 401은 Promise를 공유하고,
이미 교체된 토큰의 늦은 401은 새 토큰을 재사용합니다. 원 요청은 최대 한 번 재전송합니다.
refresh 실패/재시도 401은 세션을 폐기합니다. 이전 세션의 refresh는 새 계정을 덮어쓸 수 없습니다.
공개 인증 요청에는 `{ auth: "none" }`을 명시해 잘못된 비밀번호의 401이 refresh를 유발하지 않게 합니다.

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

옵션은 `method`, JSON `body`, `headers`, `signal`, `auth`입니다.
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
  **인증 화면 연동 전에 실제 OpenAPI에서 refresh 응답 필드를 재확인해야 합니다.**
- 쿠키 이름·SameSite·Secure·CSRF·CORS allow-origin/allow-credentials와 배포 origin은 미확인입니다.
  local 개발 시 localhost FE와 127.0.0.1 API의 쿠키 정책도 서버 설정에 맞춰 확인합니다.
- 403/429는 일반 HTTP 처리 기반만 제공합니다. P0에서 확인하지 못한 상세 오류 DTO를 만들지 않습니다.
- 계산·문서·결과·AI의 업무 DTO는 이번에 만들지 않았습니다. 다음 기능마다 OpenAPI와 P0를 대조합니다.

Next.js 작성 전에 설치된 `node_modules/next/dist/docs/`의 Server/Client Components,
Project Structure, Route Groups, CSS, Environment Variables, Vitest, CLI typegen 가이드를 확인했습니다.
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
