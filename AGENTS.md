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

1. P0: docs/references/백엔드_API_명세서_v1.pdf
2. P1: docs/references/최종기획안.pdf
3. P2: docs/references/월급잇다_UIUX_프로토타입_v0.4.html
4. P3: docs/references/FE_구현_설계서_v0.3.md
5. P4: Other references

When documents conflict, use the higher-priority source.

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
