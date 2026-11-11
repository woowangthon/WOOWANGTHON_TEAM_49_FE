<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 월급잇다 Frontend Development Rules

## Project

- Name: 월급잇다 (Wageitda)
- Framework: Next.js App Router
- Language: TypeScript (strict)
- Styling: Tailwind CSS
- Backend: FastAPI REST + SSE
- Target: Responsive web (Mobile + Desktop)

## Source of Truth

All implementation decisions must follow this priority:

1. P0: docs/references/openapi.json, docs/references/API_REFERENCE.html
2. P1: docs/references/월급잇다_UIUX_프로토타입_v0.4.html
3. P2: docs/references/FE_구현_설계서_v0.3.md
4. P3: docs/references/최종기획안.pdf
5. P4: docs/references/백엔드_API_명세서_v1.pdf, docs/references/API_ENDPOINTS.md, docs/references/데이터베이스_스키마.md
6. P5: Other references

When documents conflict, use the higher-priority source.
When documents conflict with same priority, use the former one in the list.

If the backend OpenAPI specification is available,
verify actual endpoint and DTO contracts against it.

## Development Rules

- Use Next.js App Router conventions.
- Use TypeScript strict mode.
- Follow feature-based folder organization.
- Separate API DTOs from UI ViewModels.
- Do not invent API endpoints or response fields.
- Do not calculate official wage results on the frontend.
- Preserve null vs 0 semantics.
- Implement loading, error, empty and success states.
- Support both mobile and desktop layouts.
- Use accessible semantic HTML.
- Avoid exposing sensitive data in logs or localStorage.
- Do not modify unrelated code without necessity.
- Validate changes with lint, typecheck and build.

## Architecture

- Use Next.js App Router with route groups where appropriate.
- Organize business logic by feature.
- Keep page.tsx focused on page composition.
- Separate API clients, domain types, query hooks, and UI components.
- Use TanStack Query for server state.
- Use Zustand only for shared client-side UI state.
- Use React Hook Form and Zod for form handling and validation.
- Prefer Server Components by default, using Client Components when interactivity is required.
- Do not duplicate API response data in Zustand.

## API Integration

- API base URL (local): http://127.0.0.1:8000/api/v1
- Configure the API base URL through environment variables.
- Follow P0 API contracts for endpoints, methods, DTOs, and error codes.
- Use the backend OpenAPI specification to verify implementation when available.
- Do not assume that older API specification examples match the implemented backend.
- Handle JSON responses, 204 responses, Blob downloads, and SSE streams separately.
- Implement access token handling and refresh-token single-flight behavior.
- Use credentials: 'include' where refresh cookies are required.
- Never persist access tokens in localStorage or sessionStorage.
- Handle 401, 403, 404, 409, 422, and 429 appropriately.
- Respect expectedInputVersion and inputVersion for supported mutations.
- Do not invent or silently substitute API fields.

## Domain Rules

- Workplace, Case, Document, and CaseDocumentLink are distinct entities.
- A Document may be referenced by multiple Cases.
- Document processing status and document review status are independent.
- READY does not mean CONFIRMED.
- Missing or unconfirmed values must not be treated as zero.
- UNKNOWN is a valid user response when supported by the API.
- Calculation readiness and Case workflow progress are separate concepts.
- Use server-generated calculation and comparison results.
- Do not calculate official wage amounts on the frontend.
- Preserve result versions and freshness states.
- Do not assume a successful recompute job means all calculations are complete.
- Do not label deposit differences as confirmed unpaid wages.
- AI responses must not replace authoritative calculation results.

## Responsive UI

- Use a mobile-first responsive design.
- Support mobile, tablet, and desktop layouts.
- Avoid fixed widths that cause horizontal overflow.
- Use a desktop sidebar and mobile navigation drawer.
- Use a two-column document review layout on desktop.
- Use tabs or stacked layouts for document review on mobile.
- Ensure dialogs, forms, and action buttons remain usable on small screens.
- Support keyboard navigation and visible focus indicators.
- Do not rely on color alone to communicate status.

## Async Operations

- Handle document processing with status polling.
- Poll only while the relevant backend job is active.
- Stop polling when the job reaches a terminal state.
- Use the backend recompute-status API after mutations.
- Do not trigger unnecessary calculation requests after every mutation.
- Handle stale and updating results without discarding previous versions.
- Parse SSE events according to the backend contract.
- Support chat stream completion, errors, cancellation, and retry where provided.

## Security and Privacy

- Treat uploaded documents and extracted data as sensitive.
- Never expose access tokens or private document URLs in logs.
- Do not store private API responses in persistent browser storage.
- Revoke access to user-specific cached data on logout.
- Validate file types and sizes according to the backend contract.
- Do not commit environment secrets or private reference documents.
- Keep docs/ excluded from Git when configured in .gitignore.

## Implementation Workflow

- Read relevant reference documents before implementing a feature.
- Follow the source priority defined above.
- Check existing code before creating new components or utilities.
- Prefer reusable components over duplicated implementations.
- Avoid adding unnecessary dependencies.
- Keep changes focused on the requested task.
- Do not implement unrelated features without instruction.
- When API behavior is unclear, document the uncertainty instead of inventing behavior.
- Run lint, TypeScript type checking, and build after meaningful changes.
- Report modified files, completed work, unresolved issues, and verification results.

## Development Completion Policy

- 명시된 작업 범위를 임의로 축소하지 않는다.
- 이미 구현된 기능은 재사용하고 불필요하게 재작성하지 않는다.
- 작업 시작 전 완료 조건을 체크리스트로 정리한다.
- 구현 후 모든 완료 조건을 점검하고 누락된 기능은 같은 작업에서 보완한다.
- 기능 구현, MSW 개발용 핸들러, 테스트, 반응형 검증을 하나의 작업으로 완료한다.
- lint, typecheck, test, build가 통과해야 한다.
- 기존 테스트가 통과하는 것만으로 신규 기능 완료를 주장하지 않는다.
- 검증되지 않은 항목은 완료로 표시하지 않는다.
- 실제 서버가 없어 검증할 수 없는 계약은 별도 External Verification 항목으로 분리한다.
- 미확정 서버 계약을 이유로 문서상 구현 가능한 UI와 Mock 기능을 생략하지 않는다.
- 단, 문서에 없는 API·DTO를 임의로 확정하지 않는다.
- 오류가 발생하면 원인을 수정한 뒤 검증을 재실행한다.
- 전체 완료 조건을 충족하지 못한 경우 정확한 원인과 해결하지 못한 범위를 보고한다.
- Git commit, push 및 브랜치 생성은 수행하지 않는다.

## Documentation Policy

- 개발 기록, 작업 보고서, API 분석, 설계 메모, 검증 보고서는 반드시 docs/ 아래에 작성한다.
- DEVELOPMENT_*.md는 docs/development/ 아래에 작성한다.
- 테스트 및 검증 보고서는 docs/verification/ 아래에 작성한다.
- API 계약 관련 분석은 docs/api/ 아래에 작성한다.
- 사용자 제공 참고문서는 docs/references/에 보존한다.
- 프로젝트 루트에 새로운 개발 기록 Markdown 파일을 생성하지 않는다.
- docs/ 전체는 Git 추적에서 제외한다.
- README.md에는 실제 실행 방법과 프로젝트 개요만 기록한다.
- README.md에서 Git에 포함되지 않는 docs 파일에 필수적인 공개 문서 링크를 만들지 않는다.

## Backend and Mock Policy

- 백엔드 서버를 실행하거나 접속하지 않는다.
- OpenAPI 서버 조회를 시도하지 않는다.
- P0 문서와 기존 API 클라이언트를 기준으로 개발한다.
- 모든 신규 기능은 개발용 MSW Mock Mode에서도 동작해야 한다.
- 미처리 Mock API가 실제 서버로 전달되지 않도록 한다.
- 실제 백엔드 연동 성공을 주장하지 않는다.

## Responsive Policy

- 모바일과 PC를 모두 지원한다.
- Edge에서 320px, 375px, 768px, 1280px 검증을 수행한다.
- 가로 넘침, JS 오류, 탐색, 키보드 접근성, 오류 상태를 확인한다.
- 실제 모바일 기기에서 검증하지 못한 항목은 별도로 기록한다.
