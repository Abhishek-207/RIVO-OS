# CLAUDE.md - RIVO-OS

## Project Overview

RIVO-OS is a **Lead Operating System** for the mortgage industry. It helps mortgage brokerages, direct lenders, and mortgage aggregators convert leads into funded deals with end-to-end funnel management from lead ingestion to bank disbursement.

**Core entity model:** Lead (raw signal) > Client (verified person) > Case (bank application). Each entity has a distinct lifecycle, owner, and workflow.

**User roles:** Admin, Manager, Mortgage Specialist (MS), Process Owner (PO), Channel Owner, Team Leader.

## Tech Stack

| Layer            | Technology                                                           |
| ---------------- | -------------------------------------------------------------------- |
| Frontend         | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, shadcn/ui (Radix)  |
| State            | React Query (TanStack) for server state, Context API for auth/layout |
| Routing          | React Router 7                                                       |
| UI Libraries     | Lucide React (icons), cmdk (command palette), Sonner (toasts), React Day Picker, date-fns |
| Backend          | Django 5.2, Django REST Framework, Python 3.11+                      |
| Database         | Supabase (PostgreSQL), Django ORM                                    |
| Auth             | Supabase Auth (JWT), Django RBAC permissions                         |
| File Storage     | Supabase Storage (signed URLs)                                       |
| Email            | Zoho ZeptoMail (invite/transactional emails)                         |
| WhatsApp         | YCloud API                                                           |
| WebSockets       | Django Channels + Daphne (ASGI)                                      |
| Hosting          | Render (Dockerfile in backend/)                                      |
| Linting          | ESLint + TypeScript-ESLint (frontend), Ruff (backend)                |
| Package Managers | npm (frontend), pip (backend)                                        |

## Project Structure

```
RIVO-OS/
├── frontend/                  # React SPA
│   └── src/
│       ├── components/        # Reusable components
│       │   ├── ui/            # shadcn/ui primitives
│       │   ├── layout/        # App shell, sidebar, navigation
│       │   ├── activity/      # Activity feed components
│       │   ├── documents/     # Document upload/checklist
│       │   ├── whatsapp/      # WhatsApp chat components
│       │   ├── templates/     # Message template management (TemplateForm, TemplateList)
│       │   ├── *SidePanel.tsx # Entity detail panels (Lead, Client, Case, Channel, User)
│       │   ├── SLACountdown.tsx / SLAStatusBadge.tsx
│       │   └── Pagination.tsx
│       ├── pages/             # Page components
│       │   ├── DashboardPage, LeadsPage, ClientsPage, CasesPage
│       │   ├── ChannelsPage, UsersPage, SettingsPage
│       │   ├── AuditLogPage, LoginPage, SetPasswordPage
│       │   └── ...
│       ├── hooks/             # Custom React Query hooks
│       │   ├── useLeads, useClients, useCases, useChannels, useUsers
│       │   ├── useDocuments, useWhatsApp, useLeadWhatsApp
│       │   ├── useAnalytics, useAudit, useMessageTemplates
│       │   ├── useNavigationItems, useUrlState, useDebouncedSearch
│       │   └── ...
│       ├── types/             # TypeScript type definitions (auth, analytics, audit, documents, mortgage)
│       ├── lib/               # Utilities (api.ts, formatters.ts, toastMessages.ts, dateUtils.ts, phoneUtils.ts, countryData.ts, utils.ts)
│       ├── utils/             # Helper utilities (templateVariables.ts)
│       ├── contexts/          # AuthContext, LayoutContext
│       └── config/            # API configuration
├── backend/                   # Django REST API
│   ├── rivo_os/               # Project settings, URLs, ASGI/WSGI
│   ├── users/                 # User model, JWT auth, RBAC permissions
│   ├── leads/                 # Lead management, tracking, conversion
│   ├── clients/               # Client management, eligibility calculations
│   ├── cases/                 # Case management, stage transitions, SLA
│   ├── documents/             # Document upload, checklist, types
│   ├── audit/                 # Immutable audit trail (AuditableModel, AuditLog)
│   ├── acquisition_channels/  # Channel & source management
│   ├── campaigns/             # Campaign management & discovery
│   ├── whatsapp/              # WhatsApp integration (YCloud)
│   ├── templates/             # Message templates
│   ├── analytics/             # Reporting endpoints
│   ├── common/                # Shared utilities (SLA, pagination, analytics)
│   └── Dockerfile             # Container build for Render deployment
└── agent-os/                  # Product docs, specs, standards
    ├── product/               # mission.md, roadmap.md, tech-stack.md
    ├── specs/                 # Feature specifications
    └── standards/             # Coding standards (backend/, frontend/, global/, testing/)
```

## Development Commands

### Frontend (`frontend/`)

```bash
npm run dev       # Start Vite dev server (--open)
npm run build     # TypeScript check + Vite build
npm run lint      # ESLint
npm run preview   # Preview production build
```

### Backend (`backend/`)

```bash
python manage.py runserver      # Start Django dev server
python manage.py makemigrations # Create migrations
python manage.py migrate        # Apply migrations
python manage.py test           # Run tests
```

## Architecture Decisions

### Decoupled Frontend/Backend

Frontend (React SPA) and backend (Django API) are fully decoupled. The frontend communicates via REST API with JWT auth. This enables independent deployment and future mobile apps.

### Supabase as Infrastructure Layer

Supabase provides managed PostgreSQL, auth, real-time subscriptions, and file storage. Django connects to Supabase PostgreSQL via `dj_database_url`. Auth uses Supabase JWT tokens validated by custom Django authentication classes.

### Entity-First Design

Three distinct entities (Lead, Client, Case) with explicit conversion triggers. Not a generic CRM -- each entity has its own lifecycle, owner role, and stage progression. Leads are temporary and come from untrusted channels; Clients are permanent; Cases are per-transaction.

### Immutable Audit Trail

All models extend `AuditableModel` which captures `created_by`, `updated_by`, and timestamps. A separate immutable `AuditLog` records every state change with actor and before/after values. Middleware captures the audit user from the JWT.

### SLA Tracking

SLA timers are built into Lead, Client, and Case entities. Deadlines are computed from creation time + configured SLA minutes. SLAs pause when an entity is ON_HOLD. Types: Lead SLA, First Contact SLA, Client-to-Case SLA, Case Stage SLA.

### Eligibility Engine

Native mortgage eligibility calculations: DBR (Debt Burden Ratio), LTV (Loan-to-Value), max loan amount. Supports single and joint applications with co-applicant income/liabilities.

## Coding Conventions

### General

- Self-documenting code with meaningful names. Minimal comments -- only for complex logic.
- Remove dead code. No commented-out blocks or unused imports.
- No backward compatibility code unless explicitly required.
- DRY: extract common logic into reusable functions.

### Frontend

- **File naming:** PascalCase for components (`ClientSidePanel.tsx`), camelCase for utilities (`useCases.ts`).
- **Imports:** Use `@/` path alias (points to `src/`). Barrel exports via `index.ts`.
- **Components:** Functional components with hooks. Single responsibility. Named exports.
- **Data fetching:** React Query hooks per entity. Never fetch in components directly -- use custom hooks.
- **Styling:** Tailwind CSS only. Custom theme extends coral (primary), navy (dark), active (blue) color palettes. Fonts: DM Sans (sans), Plus Jakarta Sans (display).
- **State:** Server state in React Query. Auth/layout state in Context. localStorage for auth tokens under `rivo-auth` key.
- **Side panels:** Entity detail views use `*SidePanel.tsx` pattern.

### Backend

- **Models:** Inherit from `AuditableModel`. UUID primary keys. TextChoices for enums. Validation in `clean()` and `save()`.
- **Views:** DRF ViewSets with `@action` decorators for custom endpoints. Separate serializers for list/detail/update.
- **Permissions:** RBAC via custom permission classes (`CanAccessLeads`, `CanAccessClients`, etc.).
- **Business logic:** Goes in `services.py`, not in views or serializers.
- **Naming:** PascalCase for models, snake_case for fields and URLs.
- **URLs:** Plural nouns (`/leads/`, `/clients/`, `/cases/`). Max 2-3 levels of nesting.

### Testing

- Write minimal tests during development. Focus on completing features first.
- Test only core user flows and critical paths.
- Defer edge case testing unless business-critical.
- Test behavior, not implementation. Mock external dependencies.
- Framework: Django TestCase.

## How to Approach Common Tasks

### Adding a New Feature

1. Read the relevant spec in `agent-os/specs/` if one exists.
2. Check the standards in `agent-os/standards/` for the relevant layer (backend, frontend, global).
3. **Backend first:** Add models, migrations, serializers, views, URLs, permissions.
4. **Frontend second:** Add types, API calls in `lib/api.ts`, custom hook in `hooks/`, then components/pages.
5. Follow existing patterns in similar features (e.g., look at how `clients/` is structured if adding a new entity).
6. Run linting before committing.

### Adding a New API Endpoint

1. Define or update the model in `models.py` (inherit `AuditableModel`).
2. Create/update the serializer in `serializers.py`.
3. Add the view/action in `views.py` (use ViewSet or `@action`).
4. Register the URL in `urls.py`.
5. Add a permission class in `users/permissions.py` if needed.
6. Update the frontend API client in `frontend/src/lib/api.ts`.

### Adding a New Frontend Page

1. Create the page component in `frontend/src/pages/`.
2. Add the route in the router configuration.
3. Add navigation entry via `useNavigationItems` hook.
4. Create a custom React Query hook in `frontend/src/hooks/` for data fetching.
5. Use `TablePageLayout` for list views with consistent pagination/filtering.

### Debugging

1. **Frontend:** Check browser console. React Query devtools for cache state. Verify API responses in Network tab.
2. **Backend:** Check Django logs (per-module logging configured). Use `manage.py shell` for data inspection. Structured JSON logging in production.
3. **Auth issues:** Verify JWT token in localStorage (`rivo-auth`). Check Supabase Auth dashboard. Backend auth class: `users/authentication.py`.
4. **SLA issues:** Check entity's `sla_minutes`, `sla_deadline` fields. SLA logic is in model properties and `common/sla.py`.

### Database Changes

1. Modify the model in the relevant app's `models.py`.
2. Run `python manage.py makemigrations` to generate migration.
3. Review the generated migration. Keep it focused on a single logical change.
4. Run `python manage.py migrate` to apply.
5. Never modify an existing migration after it's been deployed.

## Environment Variables (Backend)

| Variable                      | Purpose                                  |
| ----------------------------- | ---------------------------------------- |
| `DJANGO_SECRET_KEY`           | Django secret key                        |
| `DEBUG`                       | Debug mode toggle                        |
| `CORS_ALLOWED_ORIGINS`        | Comma-separated CORS origins             |
| `SUPABASE_URL`                | Supabase project URL                     |
| `SUPABASE_DB_URL`             | PostgreSQL connection string             |
| `SUPABASE_SERVICE_ROLE_KEY`   | Service role key (admin ops)             |
| `FRONTEND_URL`                | Frontend app URL (for email links)       |
| `PIPELINE_WEBHOOK_URL`        | Partner backend webhook for status updates |
| `ZOHO_EMAIL_TOKEN`            | ZeptoMail API token                      |
| `ZOHO_FROM_EMAIL`             | Sender email address                     |
| `ZOHO_FROM_NAME`              | Sender display name                      |
| `YCLOUD_API_KEY`              | YCloud WhatsApp API key                  |
| `YCLOUD_WHATSAPP_FROM_NUMBER` | WhatsApp sender number                   |

## Key Domain Concepts

- **Lead pipeline statuses:** submitted > contacted > qualified > documents_collected > submitted_to_bank > approved > disbursed
- **Case stages:** processing > submitted_to_bank > under_review > ... > disbursed / rejected / not_proceeding
- **Trusted vs untrusted channels:** Trusted channels create Clients directly. Untrusted channels create Leads that must be converted.
- **DBR:** (Total Income / 2) - Liabilities. DBR% = (Liabilities / Total Income) \* 100.
- **LTV:** (Loan Amount / Property Value) \* 100. Limits: off-plan 50%, ready first property 80%, ready subsequent 65%.
- **Max Loan:** Total Income \* 68.
