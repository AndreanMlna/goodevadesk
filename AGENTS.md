# GoodevaDesk Agent Instructions

Support ticket platform with multi-tenancy, LLM classification, and Redis caching.

## Package Manager & Toolchain
- **Backend**: Node.js 20+ with npm: `npm install`, `npm run start:dev`, `npm run build`
- **Frontend**: Vite + React 19: `npm install`, `npm run dev`, `npm run build`
- **Python NLP**: Python 3.11+: `pip install -r requirements.txt`, `uvicorn main:app --reload`
- **Database**: Prisma ORM with PostgreSQL: `npx prisma generate`, `npx prisma db push`, `npx prisma db seed`
- **Containers**: Docker Compose: `docker compose up -d`, `docker compose logs -f`

## File-Scoped Commands
| Task | Command |
|------|---------|
| Backend Test | `cd backend && npm test -- src/tickets/tickets.service.spec.ts` |
| Backend Lint | `cd backend && npx eslint src/tickets/tickets.service.ts` |
| Backend Typecheck | `cd backend && npx tsc --noEmit` |
| Frontend Typecheck | `cd frontend && npx tsc --noEmit` |
| Python NLP Test | `cd python-nlp && pytest test_nlp.py` |

## Key Conventions
- **Tenant Isolation**: Every database query MUST be filtered by `organization_id`. Never query tickets across organizations.
- **LLM Resiliency**: LLM calls must be non-blocking with timeout and fallback; ticket creation must never fail if LLM fails.
- **Cache Normalization**: Redis cache keys use SHA-256 hash of lowercased, trimmed `(subject + message)`.
- **Commit Attribution**:
```
Co-Authored-By: GoodevaDesk AI Assistant <noreply@goodevadesk.internal>
```
