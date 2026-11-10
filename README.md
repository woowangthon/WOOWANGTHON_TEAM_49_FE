# Wageitda Frontend

Next.js App Router / TypeScript strict / Tailwind CSS. Wage document review and case management.

## Run (Node.js 24)

    npm ci
    Copy-Item .env.example .env.local
    npm run dev

Open http://localhost:3000. Configure NEXT_PUBLIC_API_BASE_URL in .env.local. Never put secrets in public variables.

## Development Mock

Set NEXT_PUBLIC_MOCK_API=true and restart dev. Sample: worker@example.com / password1234. New accounts start with empty independent business data. All mock changes and new accounts reset on full reload; the sample account can restore using its inert marker cookie. Do not enter private data. Mock is disabled in production. Password recovery uses LOCAL_OUTBOX_ONLY, without sending emails.

## Validate and start production

    npm run lint
    npm run typecheck
    npm test
    npm run build
    npm start

Environment files and docs/ are excluded from Git.
