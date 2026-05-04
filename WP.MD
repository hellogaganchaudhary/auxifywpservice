**WhatsAppAI Platform**

Master Implementation & Development Blueprint

_Enterprise WhatsApp Business API Module | Part of the Unified Communications Platform_

**ARCHITECTURE NOTE - This is NOT a standalone microservice.**

_WhatsAppAI is developed as a self-contained module that will be integrated into the parent platform's existing microservice architecture. The parent platform already has calling, auth infrastructure, and shared services. WhatsApp is ONE service within that ecosystem - built standalone first, integrated second._

| **Document Property** | **Value**                                             |
| --------------------- | ----------------------------------------------------- |
| Version               | 1.0 - Master Blueprint                                |
| Status                | Active Development Reference                          |
| Architecture          | Module → Microservice Integration                     |
| Parent Platform       | Unified Communications Platform (Calling + Messaging) |
| Stack                 | NestJS + Next.js 14 + PostgreSQL + Redis + Socket.io  |
| Target                | Enterprise Multi-Tenant WhatsApp Business API SaaS    |

# **SECTION 0 - Critical Architecture Context**

_READ THIS FIRST before any implementation decision._

## **0.1 What WhatsAppAI Is Within the Larger Platform**

The parent platform is a full Unified Communications Platform that already has:

- Voice & Video Calling infrastructure (already built and live)
- Authentication / Identity services (shared across all modules)
- Shared database infrastructure (PostgreSQL clusters, Redis)
- API Gateway layer with existing NestJS services
- Tenant / Organization management layer
- Billing infrastructure (partial)

WhatsAppAI is a MODULE within this platform. It is NOT:

- A separate SaaS product deployed independently
- A standalone application with its own auth system
- A microservice that needs to be built with microservice-first architecture

WhatsAppAI IS:

- A self-contained feature module - developed in isolation, integrated into the parent platform
- One microservice within the existing microservice architecture of the parent
- A service that will REUSE the parent's auth tokens, tenant IDs, and shared infra where possible
- Built with integration-readiness in mind from Day 1

## **0.2 Integration Checklist - Non-Negotiable Decisions**

| **Decision Area** | **WhatsAppAI Standalone**   | **After Integration Into Parent**                      |
| ----------------- | --------------------------- | ------------------------------------------------------ |
| Authentication    | Build full JWT auth module  | Replace with parent platform's shared auth tokens      |
| Organization IDs  | Own tenant model during dev | Use parent's organizationId from shared tenant service |
| User model        | Own User table              | Reference parent's User service via API or shared DB   |
| Calling features  | Not included                | Parent platform already has this - zero overlap        |
| Billing wallet    | Build own wallet module     | Wire into parent's unified billing service             |
| Email (Resend)    | Standalone Resend setup     | Use parent's notification service if available         |
| Deployment        | Standalone Docker container | Registered as a named microservice in the platform     |

## **0.3 What to Build vs What Already Exists**

| **Layer**                          | **Existing State**                                        | **Build Decision**        |
| ---------------------------------- | --------------------------------------------------------- | ------------------------- |
| NestJS API Gateway                 | Strong - Meta onboarding, inbox, templates, billing exist | KEEP & extend             |
| Prisma Schema                      | Comprehensive - all core models exist                     | KEEP & evolve             |
| Redis / PostgreSQL                 | Solid foundation                                          | KEEP                      |
| WhatsApp webhook ingestion         | Already implemented                                       | KEEP                      |
| Template governance backend        | Already implemented                                       | KEEP                      |
| Inbox backend + Socket.io realtime | Already implemented                                       | KEEP                      |
| Next.js Frontend                   | Ugly, incomplete, no real auth                            | FULL REBUILD              |
| Auth & Tenancy layer               | Not end-to-end                                            | BUILD from scratch        |
| Design System                      | Immature, below quality bar                               | FULL REBUILD              |
| Broadcasts module                  | Backend placeholder only                                  | BUILD                     |
| Contacts module                    | Partial backend                                           | EXTEND backend + full UI  |
| Analytics UI                       | Not built                                                 | BUILD                     |
| Super Admin portal                 | Not built                                                 | BUILD                     |
| Calling features                   | Parent platform handles this                              | DO NOT BUILD - zero scope |

# **SECTION 1 - Platform Vision & Value Proposition**

## **1.1 Core Product Definition**

WhatsAppAI is an Enterprise Multi-Tenant WhatsApp Business API SaaS module. Comparable externally to WATI, Interakt, Bird, Trengo - but with a premium design tier matching Linear, Resend, and ElevenLabs in quality.

_Core Value Proposition: One platform where businesses connect their WhatsApp Business API, manage conversations via a shared inbox, send broadcast campaigns, manage message templates, and get full analytics - all governed by a super admin who manages multiple organizations from a single command center._

## **1.2 Competitive Reference Points**

| **Product** | **What to Study / Reference**                                        |
| ----------- | -------------------------------------------------------------------- |
| Linear      | Sidebar nav, keyboard shortcuts, command palette, typography density |
| Resend      | Dark theme tokens, onboarding flow, API key management, clean tables |
| ElevenLabs  | Hero animations, dark premium aesthetic, pricing page                |
| Vercel      | Dashboard layout, activity feed, deployment status patterns          |
| Intercom    | Inbox conversation layout, contact panel, composer                   |
| Notion      | Empty state illustrations, sidebar organization                      |

# **SECTION 2 - User Roles & Access Control (RBAC)**

## **2.1 Role Hierarchy**

The platform uses a strict 5-level role hierarchy:

_Super Admin → Organization Admin → Manager → Agent → Viewer_

## **2.2 Role Definitions**

### **Super Admin (Platform Level)**

- Created at platform boot / seeded - exists OUTSIDE any organization
- Has dedicated /super-admin/\* shell with its own layout
- JWT carries { userId, role: 'SUPER_ADMIN' } - NO organizationId
- Permissions: Create/suspend/delete organizations, set plan limits per org (credits, seats, feature flags), view cross-org analytics and audit logs, manage global pricing, impersonate any org admin for support

### **Organization Admin (Owner)**

- First user of an org - always created by Super Admin
- Receives invite email → sets password → goes through onboarding wizard
- JWT carries { userId, organizationId, role: 'ADMIN' }
- Full control within their org: WABA onboarding, team management, templates, billing, automations, routing rules

### **Manager (Team Lead)**

- Invited by Admin - scoped to org
- Can: view and respond in inbox, manage assigned agents' queues, create templates (pending admin approval), view team analytics
- CANNOT: access billing, modify org-level WABA settings, invite/remove agents with admin privileges

### **Agent (Team Member)**

- Invited by Admin or Manager - most restricted role
- Can: view and respond to ASSIGNED conversations only, use quick replies and templates, view their own performance metrics
- CANNOT: access contacts import, broadcasts, analytics (other than own stats), billing

### **Viewer (Read-Only)**

- Read-only access to areas explicitly granted by Admin
- Zero write operations anywhere

## **2.3 RBAC Implementation Rules**

- Every API endpoint must be decorated with @Roles(...) guard
- JWT middleware extracts role and organizationId on every request
- Super admin gets no organizationId - middleware must handle this null case
- Frontend: every route, button, and action must be guarded by role check via useAuth() hook
- Never check roles client-side only - backend must always enforce
- Component guard pattern: &lt;RoleGuard roles={\['ADMIN', 'MANAGER'\]}&gt; wraps sensitive UI

# **SECTION 3 - Multi-Tenant Architecture**

## **3.1 Tenancy Model**

Every organization is a tenant. Complete data isolation is enforced at the database layer.

_Platform → \[Org A (tenant: org_aaa)\] → \[WABA Config, Users, Conversations, Templates, Wallet, Automations\]_

## **3.2 Tenant Isolation Rules - Non-Negotiable**

- Every database query MUST be scoped by organizationId - no exceptions
- JWT access tokens carry { userId, organizationId, role } - all three required
- Super admin JWT carries { userId, role: 'SUPER_ADMIN' } with NO organizationId
- NestJS middleware validates tenant scope on every single request
- Row-Level Security (RLS) on Postgres as backup layer (Phase 2 hardening)
- No cross-tenant data leakage ever - this is a security requirement

## **3.3 Organization Data Structure**

| **Data Category**                   | **Isolation Level**                    | **Scope**               |
| ----------------------------------- | -------------------------------------- | ----------------------- |
| WABA Config (phone, token, WABA ID) | Per org                                | organizationId required |
| Users (admin, managers, agents)     | Per org                                | organizationId required |
| Conversations & Messages            | Per org                                | organizationId required |
| Contacts                            | Per org                                | organizationId required |
| Templates                           | Per org (synced from Meta)             | organizationId required |
| Broadcasts / Campaigns              | Per org                                | organizationId required |
| Billing Wallet & Transactions       | Per org                                | organizationId required |
| Automations & Rules                 | Per org                                | organizationId required |
| Audit Logs                          | Per org (+ super admin cross-org view) | organizationId required |

# **SECTION 4 - Complete Feature Set**

## **4.1 Public Marketing Website**

- Marketing landing page with features, pricing, docs, blog stubs
- CTA flows: 'Start Free Trial' or 'Request Demo'
- Auth pages: Login, Forgot Password, Reset Password, Accept Invite
- Dark hero with animated WhatsApp-green gradient mesh
- Pages: / (landing), /features, /pricing, /docs, /changelog
- Design: Bold headline 'WhatsApp Business. Engineered for Teams.'
- Footer: newsletter via Resend, social links, legal links

## **4.2 Super Admin Portal (/super-admin/\*)**

| **Screen**                        | **Features**                                                                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| /super-admin (Dashboard)          | Total orgs, active users, messages today, MRR - KPI cards + recent orgs table + platform activity feed                            |
| /super-admin/organizations        | Searchable/filterable table: Org name, Plan, Users, Messages, Status, Created, Actions. \[+ Create Organization\] slide-over form |
| /super-admin/organizations/\[id\] | Org header (logo, name, slug, plan badge). Tabs: Overview \| Users \| WABA \| Billing \| Audit Log                                |
| /super-admin/billing              | Credit pack pricing editor, per-message rate editor, revenue overview table                                                       |
| Audit Log                         | All platform-level actions with timestamps, actor, affected org                                                                   |
| Settings                          | Super admin profile, global feature flags                                                                                         |

## **4.3 Organization Onboarding Wizard**

Triggered after new org admin accepts invite:

- Step 1 - Welcome + Profile: Full name, role, profile photo
- Step 2 - Connect WhatsApp: Access Token, Phone Number ID, WABA ID, Business Account ID → live Meta API verification
- Step 3 - Business Profile: Fetched from Meta - display number, business name, quality rating - user confirms
- Step 4 - Invite Team (optional, skippable): Email + role select, \[+ Add another\]
- Step 5 - Done: Summary card → \[Go to Dashboard\]

_The live Meta API verification in Step 2 is critical - do not let user proceed without successful verification._

## **4.4 Organization Dashboard (/dashboard)**

| **Widget**           | **Data Shown**                                     |
| -------------------- | -------------------------------------------------- |
| Messages Today       | Sent / Received / Failed - with trend vs yesterday |
| Active Conversations | Open / Assigned / Unassigned counts                |
| Template Performance | Delivery rate, read rate - top 3 templates         |
| Credit Balance       | Wallet balance + auto-recharge toggle status       |
| Team Activity        | Who's online, conversations handled today          |
| Recent Conversations | Last 5 with status chips                           |

## **4.5 Shared Inbox (/inbox) - Most Important Screen**

Three-column layout. This is the CORE product surface.

### **Left Panel - Conversation List (300px)**

- Tabs: All / Mine / Unassigned / Resolved
- Search bar: searches contact name, phone, last message
- Filter by: assigned agent, label, date range, channel
- Saved views: custom filters persisted per user
- Each list item: Contact avatar, name, last message preview, time, status badge, assignee chip, unread count
- Real-time updates via Socket.io - new messages appear instantly

### **Center Panel - Conversation View (flex 1)**

- Header: Contact name + phone, status badge, Assign button, Resolve/Reopen button, More actions menu
- Message thread: WhatsApp-style chat bubbles (right = sent, left = received)
- Message status icons: sent ✓, delivered ✓✓, read ✓✓ (blue)
- Media support: text, image, document, audio, video, template messages
- Date separators between messages from different days
- Timeline events: gray centered chips (assigned to X, resolved by Y, reopened)
- Internal notes: yellow bubble, NOT sent to customer - agents use for context
- Message Composer: text area (auto-resize), attach media, pick template (modal), quick replies dropdown, emoji picker, Send button (green)

### **Right Panel - Contact & Conversation Info (320px, collapsible)**

- Contact card: avatar, name, phone, email, custom attributes, tags
- Edit contact details inline
- Conversation info: created at, channel, WABA number
- Assign agent dropdown
- Add / remove labels
- Conversation notes (private)
- Previous conversations list

### **Inbox Automation Rules**

- Rule engine: IF \[trigger\] THEN \[action\]
- Triggers: new message received, keyword match, no reply in X hours, contact tag matches
- Actions: auto-assign to agent/team, auto-reply with template, add label, send template

## **4.6 Contacts (/contacts)**

- Full contact list: search, filter by tag/segment, sort by any column
- CSV import with column mapping UI
- Contact detail page: full conversation history, custom fields, tags
- Custom fields: org-defined (text, number, date, dropdown)
- Segments / Tags: create and manage contact groups
- Bulk actions: tag, assign to broadcast, export, delete

## **4.7 Broadcasts / Campaigns (/broadcasts)**

- Create broadcast wizard: pick template → select audience → schedule or send now
- Broadcast list with status chips: Draft / Scheduled / Running / Completed / Failed
- Per-broadcast analytics: sent, delivered, read, failed, estimated cost
- Audience builder: filter by tag, segment, custom field, CSV upload
- Broadcast scheduling: immediate or date/time picker

## **4.8 Templates (/templates)**

- Template list: name, category, language, status (Approved / Pending / Rejected / Paused)
- Create template form: message body with variable placeholders, optional header (text/media), optional footer, buttons (quick reply / call-to-action)
- Submit to Meta for approval - status synced via webhook
- Template analytics: usage count, delivery rate, read rate, failure rate
- Governance alerts: quality score drop warnings, rejection notifications
- Categories: Marketing, Utility, Authentication

## **4.9 Analytics (/analytics)**

| **Report Tab**       | **Metrics Shown**                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Overview             | Messages sent/received, conversations opened/closed, avg response time, date range filter |
| Agent Performance    | Conversations handled, avg resolution time, first reply time per agent                    |
| Template Performance | Per-template delivery / read / failure rates, usage count                                 |
| Broadcast Reports    | Per-campaign funnel: sent → delivered → read → replied                                    |
| Credit Usage         | Daily spend chart, per-template cost breakdown, top spending templates                    |

## **4.10 Team Management (/settings/team)**

- Invite team member: email + role → invite email via Resend
- Active members table: name, email, role, last active, conversations handled
- Deactivate / permanently remove member
- Role change: promote/demote inline
- Pending invites list with revoke option
- Teams / Groups: logical groupings for queue routing

## **4.11 Settings Sections**

| **Section**   | **Content**                                                                |
| ------------- | -------------------------------------------------------------------------- |
| Profile       | Full name, email, password change, avatar upload                           |
| Organization  | Org name, slug, logo, timezone, language                                   |
| WhatsApp      | WABA config (re-verify), phone number display, webhook subscription status |
| Notifications | Email/in-app notification preferences per event type                       |
| Quick Replies | Shared quick reply library - name + content + shortcut                     |
| Labels        | Conversation label/tag manager - color, name                               |
| Billing       | Wallet balance, recharge packs, auto-recharge config, transaction history  |
| API Keys      | Generate/revoke keys for developer integrations (Phase 2)                  |
| Audit Log     | Org-level action log with actor, action, timestamp, affected resource      |

## **4.12 Billing (/billing)**

- Wallet balance card with Recharge CTA
- Credit packs: predefined packs (e.g. 1000 credits / 5000 credits / 25000 credits) → payment via Razorpay (India) or Stripe
- Auto-recharge: enable toggle, set threshold (e.g. below 500 credits), set recharge amount
- Transaction history table: date, type (credit/debit), amount, balance, reference
- Usage breakdown: daily spend chart, per-template cost
- Invoice download: PDF per transaction

# **SECTION 5 - WhatsApp Business API Onboarding Flow**

## **5.1 What the Admin Must Provide**

| **Credential**      | **Where to Get It**                                | **Example**   |
| ------------------- | -------------------------------------------------- | ------------- |
| Access Token        | Meta Business Manager → System Users OR User Token | EAAxxxxxxx... |
| Phone Number ID     | Meta Business Manager → WhatsApp → Phone Numbers   | 1234567890    |
| WABA ID             | WhatsApp Business Account ID in Business Manager   | 9876543210    |
| Business Account ID | Meta Business Manager top-level ID                 | 1122334455    |

## **5.2 Backend Verification Flow**

- Admin submits credentials in settings or onboarding wizard
- API Gateway calls Meta Graph API: GET /{phone-number-id}?access_token={token} → validates phone, fetches display name, quality rating
- API Gateway calls: GET /{waba-id}?access_token={token} → validates WABA, fetches account status
- API Gateway registers webhook: POST /{waba-id}/subscribed_apps
- Persists verified WabaConfig to DB scoped to organizationId
- Frontend shows: ✅ Connected - +91XXXXXXXXXX · 'Business Name' · Quality: Green

_If ANY step fails, the entire flow must be rolled back. Never store partially-verified credentials._

## **5.3 Webhook Registration**

- Platform receives all WhatsApp events at a single webhook URL per environment
- Events are routed by WABA ID to the correct organization
- Events handled: message.received, message.status.update (sent/delivered/read), template.status.update
- Webhook security: verify Meta's X-Hub-Signature-256 on every incoming request

# **SECTION 6 - Technology Stack (Complete Reference)**

## **6.1 Frontend Stack**

| **Technology**        | **Version**      | **Purpose**                                                     |
| --------------------- | ---------------- | --------------------------------------------------------------- |
| Next.js               | 14+ (App Router) | React framework - SSR, routing, middleware                      |
| TypeScript            | ^5               | Type safety throughout                                          |
| Tailwind CSS          | v4               | Utility styling with CSS variables design tokens                |
| Radix UI              | Latest           | Headless accessible primitives (dialogs, dropdowns, tabs, etc.) |
| Zustand               | ^4               | Global client state (auth, inbox, notifications)                |
| TanStack Query        | ^5               | Server state - caching, refetching, optimistic updates          |
| Axios                 | ^1               | HTTP client with interceptors for token refresh                 |
| React Hook Form       | ^7               | Form management with performance optimization                   |
| Zod                   | ^3               | Schema validation - used on both frontend and backend           |
| Socket.io-client      | ^4               | Real-time inbox updates                                         |
| Framer Motion         | ^11              | Animations - transitions, loading states, micro-interactions    |
| Lucide React          | Latest           | Icon system                                                     |
| React Email + Resend  | ^2 / ^3          | Transactional email templates                                   |
| date-fns              | ^3               | Date formatting and manipulation                                |
| clsx + tailwind-merge | ^2               | Conditional class name utilities                                |

_DO NOT use NextAuth. Authentication is fully custom JWT - see Section 7._

## **6.2 Backend Stack**

| **Technology**          | **Version**        | **Purpose**                                                      |
| ----------------------- | ------------------ | ---------------------------------------------------------------- |
| NestJS                  | Latest             | API Gateway - existing, keep and extend                          |
| Passport + JWT          | NestJS integration | Auth strategy - access + refresh tokens                          |
| PostgreSQL + Prisma     | Existing           | Primary database - keep schema, extend                           |
| Redis                   | Existing           | Cache, session, Socket.io adapter, BullMQ backend                |
| Socket.io               | ^4                 | Real-time bidirectional communication for inbox                  |
| BullMQ                  | Latest             | Background job queues (broadcasts, email digests, webhook retry) |
| Resend SDK              | ^3                 | Transactional email delivery                                     |
| Meta Graph API          | REST               | WhatsApp Business API integration - existing pattern             |
| Cloudflare R2 or AWS S3 | -                  | Media file storage (images, documents, audio from WhatsApp)      |
| Razorpay or Stripe      | -                  | Payment gateway for credit pack purchases                        |

## **6.3 Infrastructure**

| **Service**           | **Provider Options**               | **Notes**                                         |
| --------------------- | ---------------------------------- | ------------------------------------------------- |
| Web Hosting (Next.js) | Vercel (preferred)                 | Auto-deploys from Git, edge network               |
| API Hosting (NestJS)  | Railway / Render / VPS with Docker | Persistent server for WebSocket support           |
| PostgreSQL            | Neon or Supabase Postgres          | Serverless Postgres with connection pooling       |
| Redis                 | Upstash Redis                      | Serverless Redis - BullMQ + Socket.io adapter     |
| Error Monitoring      | Sentry                             | @sentry/nextjs on frontend, Sentry SDK on backend |
| Product Analytics     | PostHog                            | User behavior tracking, feature flags             |
| Email Delivery        | Resend                             | Transactional emails - invites, resets, alerts    |
| CI/CD                 | GitHub Actions                     | Test → Build → Deploy pipeline                    |
| Media Storage         | Cloudflare R2                      | S3-compatible, cost-effective for media files     |

# **SECTION 7 - Authentication System (Build from Scratch)**

## **7.1 Token Strategy**

| **Token Type**       | **Format**           | **Expiry** | **Storage**                   | **Contents**                               |
| -------------------- | -------------------- | ---------- | ----------------------------- | ------------------------------------------ |
| Access Token         | JWT (RS256 signed)   | 15 minutes | Memory / Authorization header | { userId, organizationId, role, email }    |
| Refresh Token        | Opaque random string | 30 days    | httpOnly cookie + DB          | Token hash stored in RefreshToken table    |
| Invite Token         | JWT (HS256 signed)   | 7 days     | URL parameter in email link   | { email, organizationId, role, invitedBy } |
| Password Reset Token | JWT (HS256 signed)   | 1 hour     | URL parameter in email link   | { email, userId }                          |

## **7.2 Auth Endpoints (All Backend)**

| **Method** | **Endpoint**            | **Description**                                           |
| ---------- | ----------------------- | --------------------------------------------------------- |
| POST       | /auth/login             | Email + password → access token + refresh token cookie    |
| POST       | /auth/logout            | Revokes refresh token, clears cookie                      |
| GET        | /auth/refresh           | Uses httpOnly cookie → rotates tokens                     |
| POST       | /auth/forgot-password   | Sends password reset email via Resend                     |
| POST       | /auth/reset-password    | Validates reset token → updates password                  |
| POST       | /auth/accept-invite     | Validates invite token → creates account → auto-login     |
| POST       | /auth/super-admin/login | Separate endpoint - validates SUPER_ADMIN role explicitly |
| GET        | /auth/me                | Returns current user info from access token               |

## **7.3 Auth Flows**

### **Org Member Login**

- POST /auth/login with email + password
- Backend validates credentials, loads user with organizationId + role
- Returns access_token in response body + sets refresh_token in httpOnly cookie
- Frontend stores access_token in memory (NOT localStorage)
- Frontend redirects to /dashboard

### **Super Admin Login**

- POST /auth/super-admin/login - SEPARATE endpoint
- Backend validates role === 'SUPER_ADMIN' explicitly
- Returns access_token with no organizationId in payload
- Frontend redirects to /super-admin

### **Invite Accept Flow**

- Super Admin creates org → enters owner email → POST /auth/invite
- Backend generates invite JWT → Resend sends branded invite email
- Owner clicks link → /auth/accept-invite?token=xxx
- Frontend validates token (shows org name, role) → user sets name + password
- POST /auth/accept-invite → account activated → auto-login → onboarding wizard

### **Token Refresh**

- Axios interceptor catches 401 response
- Sends GET /auth/refresh (cookie auto-attached by browser)
- Backend validates refresh token from DB, issues new access token, rotates refresh token
- Original request retried with new access token
- If refresh fails → redirect to /login

## **7.4 Frontend Route Guards**

- Next.js middleware (middleware.ts): reads access token from cookie or Authorization header
- Unauthenticated users → redirect to /login
- Non-super-admins accessing /super-admin/\* → redirect to /dashboard
- Agents accessing admin-only routes → redirect to /inbox
- useAuth() hook: exposes { user, role, organizationId, isLoading, logout }
- RoleGuard component: wraps any UI element - hides if role does not match

# **SECTION 8 - Design System (Premium Enterprise)**

## **8.1 Design Philosophy**

Dark-first enterprise design. Ultra-precise spacing. Sharp typography. Controlled density. Every element earns its place. Inspired by Linear (precision), Resend (developer elegance), ElevenLabs (dark luxury), Vercel (typography mastery).

## **8.2 Complete Color Palette (CSS Variables)**

| **Variable Name**       | **Hex Value**         | **Usage**                                    |
| ----------------------- | --------------------- | -------------------------------------------- |
| \--color-bg-base        | #0A0A0B               | Root canvas - near-black page background     |
| \--color-bg-surface     | #111113               | Cards, panels, sidebars                      |
| \--color-bg-elevated    | #1A1A1E               | Modals, dropdowns, popovers                  |
| \--color-bg-overlay     | #222228               | Hover states, active selections              |
| \--color-border         | #2A2A30               | Subtle borders everywhere                    |
| \--color-border-strong  | #3A3A44               | Active/focus borders                         |
| \--color-accent         | #25D366               | WhatsApp green - primary CTA, links, success |
| \--color-accent-muted   | rgba(37,211,102,0.12) | Accent backgrounds, badges                   |
| \--color-accent-hover   | #1EBD5A               | Hover state for accent elements              |
| \--color-text-primary   | #F2F2F5               | Primary readable text                        |
| \--color-text-secondary | #8A8A9A               | Secondary labels, descriptions               |
| \--color-text-muted     | #56566A               | Placeholder text, timestamps                 |
| \--color-success        | #25D366               | Success states                               |
| \--color-warning        | #F5A623               | Warning states, pending                      |
| \--color-error          | #FF4757               | Error states, destructive actions            |
| \--color-info           | #3B9EFF               | Informational states                         |
| \--color-template-tag   | #7C5CFC               | Template variable placeholders               |

## **8.3 Typography System**

| **Font** | **Family**             | **Use Case**                                      |
| -------- | ---------------------- | ------------------------------------------------- |
| Display  | Syne (Google Fonts)    | H1, H2 headings - geometric, premium, distinctive |
| Body     | DM Sans (Google Fonts) | All UI text - clean, readable, modern             |
| Mono     | JetBrains Mono         | Code, IDs, tokens, API keys                       |

| **Token**    | **Size** | **Line Height** | **Usage**                        |
| ------------ | -------- | --------------- | -------------------------------- |
| \--text-xs   | 11px     | 16px            | Labels, status chips, timestamps |
| \--text-sm   | 13px     | 20px            | Secondary text, descriptions     |
| \--text-base | 14px     | 22px            | Primary body text                |
| \--text-md   | 15px     | 24px            | Slightly emphasized body text    |
| \--text-lg   | 18px     | 28px            | Section titles, card headers     |
| \--text-xl   | 22px     | 32px            | H3, major section titles         |
| \--text-2xl  | 28px     | 36px            | H2 headings                      |
| \--text-3xl  | 36px     | 44px            | H1, hero headings                |

## **8.4 Spacing & Layout Dimensions**

| **Element**                | **Size** | **Notes**                          |
| -------------------------- | -------- | ---------------------------------- |
| Base unit                  | 4px      | All spacing in 4px multiples       |
| Sidebar width              | 240px    | Fixed, collapsible on mobile       |
| Header height              | 56px     | Top navigation bar                 |
| Conversation list panel    | 300px    | Left panel in inbox                |
| Contact info panel         | 320px    | Right panel in inbox - collapsible |
| Border radius (components) | 6px      | Buttons, inputs, chips             |
| Border radius (cards)      | 10px     | Cards, panels                      |
| Border radius (modals)     | 16px     | Modal dialogs                      |

## **8.5 Component Design Principles**

| **Component**         | **Spec**                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| Buttons - Solid       | Background: --color-accent, text: #000, border-radius: 6px, font: DM Sans Medium 14px                      |
| Buttons - Ghost       | Border only (--color-border-strong), transparent bg, text: --color-text-primary                            |
| Buttons - Destructive | Background: --color-error, white text - used for delete/remove actions only                                |
| Inputs                | Border: --color-border, bg: --color-bg-surface. Focus: box-shadow glow using --color-accent at 30% opacity |
| Tables                | No heavy borders. Alternate row bg via slight bg difference (--color-bg-surface vs --color-bg-overlay)     |
| Badges                | Pill shape (border-radius: 999px), muted background, colored text. Size: text-xs                           |
| Avatars               | Circular, initials fallback with deterministic generated bg color per user (hash-based)                    |
| Empty States          | Illustrated SVG + contextual headline + action CTA button                                                  |
| Loading               | Skeleton shimmer (NOT spinners) for content loading. Spinner only for button actions.                      |
| Toasts                | Bottom-right, stacked, auto-dismiss 4s. Success (green), Error (red), Warning (orange), Info (blue)        |

# **SECTION 9 - Screen-by-Screen Build Specification**

## **9.1 Auth Screens**

### **/login**

- Centered card on dark full-screen background
- Platform logo at top center
- Email input + Password input with show/hide toggle
- 'Forgot password?' link below password field
- Primary CTA: 'Sign In' button (full width, accent color)
- NO 'Sign up' link - this is an invite-only model
- On submit: show loading state → handle 401 with 'Invalid credentials' inline error

### **/forgot-password**

- Email input
- 'Send Reset Link' button
- On success: show confirmation message - 'Check your email'

### **/reset-password?token=xxx**

- New password + Confirm password fields
- Password strength indicator
- 'Reset Password' button → auto-login on success

### **/accept-invite?token=xxx**

- Show: 'You've been invited to join \[OrgName\] as \[Role\]'
- Set: Full name + Password + Confirm password
- 'Accept Invite & Get Started' button → triggers onboarding wizard

## **9.2 App Shell (Persistent Layout)**

### **Sidebar (240px, left)**

- Logo / Brand name at top
- Navigation items: Dashboard, Inbox (with unread badge), Contacts, Broadcasts, Templates, Analytics
- Bottom section: Settings, Help, \[User Avatar + Name + Org Name\], Logout
- Active state: accent-colored left border + slightly elevated bg
- Hover state: --color-bg-overlay background

### **Top Header (56px)**

- Dynamic page title (matches current route)
- Global search (Cmd+K / Ctrl+K) - opens command palette
- Notification bell with unread badge count
- User avatar dropdown: Profile, Settings, Logout

## **9.3 Inbox Screen - Detailed**

### **Conversation List (Left, 300px)**

- Sticky search input at top
- Tab bar: All | Mine | Unassigned | Resolved - with badge counts
- Filter button → popover with: assignee filter, label filter, date range
- Saved views: user's custom filter presets - displayed as chips above list
- Conversation list: infinite scroll, virtualized (react-virtual for performance)
- Each conversation item: 56px height, contact avatar (or initials), contact name (bold), phone number, last message preview (truncated 1 line), relative timestamp, status dot (green=open/orange=pending/gray=resolved), assignee avatar chip, unread count badge
- Active conversation: highlighted with --color-bg-elevated + accent left border

### **Conversation Detail (Center, flex 1)**

- Header: Contact name + phone, status badge, Assign dropdown, Resolve/Reopen button, ⋮ menu (Add label, Add note, Close)
- Message thread: reverse-chronological scroll, latest at bottom, auto-scroll on new message
- Sent messages: right-aligned, --color-accent-muted bubble, agent name + timestamp
- Received messages: left-aligned, --color-bg-elevated bubble, contact name + timestamp
- Message status row: ✓ (sent), ✓✓ (delivered), ✓✓ blue (read), ⚠️ red (failed)
- Media messages: image (thumbnail + click to expand), document (file icon + filename + download), audio (player), video (thumbnail + play)
- Template messages: bordered card showing header/body/buttons
- Internal notes: yellow/amber bubble with lock icon, labeled 'Internal Note'
- Timeline events: centered gray pill - 'Assigned to Sarah by Admin · 2:34 PM'
- Date separators: 'Today', 'Yesterday', 'Mon 12 May'
- Composer: auto-resizing textarea (max 5 lines), paperclip (media attach), template picker icon, quick reply icon, emoji picker, Send button

### **Contact Panel (Right, 320px)**

- Toggle button on header to show/hide
- Contact avatar (large), name (editable inline), phone, email, tags
- Edit contact: pencil icon triggers inline edit mode
- Custom attributes: org-defined fields with values
- Assign agent: searchable dropdown of org members
- Labels: tag chips with + add option
- Conversation metadata: Created, Channel, WABA number used, Assigned at
- Previous conversations: collapsible list - link to each

## **9.4 Super Admin Screens**

### **/super-admin (Dashboard)**

- 4 KPI cards: Total Orgs, Active Users (last 30d), Messages Today, MRR (if billing enabled)
- Recent organizations table: Name, Plan, Users, Messages (7d), Status, Created
- Platform activity feed: last 20 events (org created, user suspended, etc.)

### **/super-admin/organizations**

- Full-width searchable table with column filters
- Columns: Org Name, Plan Badge, # Users, Messages (30d), Status (Active/Suspended), Created, Actions
- Actions per row: View Details, Impersonate Admin, Suspend/Activate, Delete
- \[+ Create Organization\] button → slide-over panel with form
- Create Org form: Org Name, Slug (auto-generated, editable), Plan select, Owner Email → triggers invite

### **/super-admin/organizations/\[id\]**

- Org header: logo placeholder, name, slug badge, plan badge, status badge
- Tab: Overview - stats, WABA connection status, last activity
- Tab: Users - member table with roles, deactivate option, invite new
- Tab: WABA - WABA ID, phone number, webhook status, connected/not connected
- Tab: Billing - wallet balance, credit transactions, plan limits
- Tab: Audit Log - all org-level events

## **9.5 Onboarding Wizard**

- Full-screen takeover with progress bar (5 steps)
- Step navigation: Previous/Next buttons + step dots
- Step 2 (WABA Connect): credential form with show/hide toggles, \[Verify & Connect\] triggers live API check
- Live verification: spinner → success ✅ (shows connected number + business name) OR error ❌ (shows specific error from Meta API)
- Cannot proceed to Step 3 until verification succeeds
- Step 5 (Done): confetti animation (framer motion) + summary card + \[Go to Dashboard\] CTA

# **SECTION 10 - Backend Build Tasks (NestJS)**

_The existing NestJS API Gateway is the foundation. Extend it - do not replace it._

## **10.1 Auth Module (New - Build in api-gateway)**

| **Method** | **Endpoint**            | **Controller / Service Logic**                                                                   |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| POST       | /auth/login             | Validate email+password → load user with org+role → sign JWT → set httpOnly refresh cookie       |
| POST       | /auth/logout            | Revoke refresh token from DB → clear cookie                                                      |
| GET        | /auth/refresh           | Validate refresh token from DB → sign new access JWT → rotate refresh token                      |
| POST       | /auth/forgot-password   | Generate reset JWT → send via Resend → do not confirm email existence                            |
| POST       | /auth/reset-password    | Validate reset JWT → bcrypt new password → invalidate token                                      |
| POST       | /auth/accept-invite     | Validate invite JWT → create User record → assign role → activate org if first user → auto-login |
| POST       | /auth/super-admin/login | Same as login but validates role===SUPER_ADMIN explicitly                                        |
| GET        | /auth/me                | Return user from JWT payload                                                                     |

- Prisma Models needed: RefreshToken, PasswordResetToken, Invite (see Section 11)
- NestJS Passport: JwtStrategy (validates access token), RefreshTokenStrategy (validates httpOnly cookie)
- Bcrypt for password hashing - cost factor 12

## **10.2 Super Admin Module (Extend Existing)**

| **Method** | **Endpoint**                                | **Description**                                                   |
| ---------- | ------------------------------------------- | ----------------------------------------------------------------- |
| GET        | /super-admin/stats                          | Platform-wide KPIs: total orgs, active users, messages today, MRR |
| GET        | /super-admin/organizations                  | Paginated, searchable list of all orgs                            |
| POST       | /super-admin/organizations                  | Create new org + trigger invite for owner email                   |
| GET        | /super-admin/organizations/:id              | Full org detail with users, WABA status, billing, audit log       |
| PATCH      | /super-admin/organizations/:id              | Update plan, status, feature flags                                |
| DELETE     | /super-admin/organizations/:id              | Soft delete org (mark isActive=false)                             |
| POST       | /super-admin/organizations/:id/invite-owner | Re-send invite to org owner email                                 |
| GET        | /super-admin/audit-log                      | Cross-org audit log with filters                                  |

## **10.3 Team Management Module (New)**

| **Method** | **Endpoint**           | **Description**                                                          |
| ---------- | ---------------------- | ------------------------------------------------------------------------ |
| GET        | /team/members          | List all members in current org (scoped by organizationId from JWT)      |
| POST       | /team/invite           | Generate invite token → send Resend email → create pending Invite record |
| PATCH      | /team/members/:id/role | Change member role (Admin only)                                          |
| DELETE     | /team/members/:id      | Deactivate/remove member                                                 |
| GET        | /team/invites          | List pending invites                                                     |
| DELETE     | /team/invites/:id      | Revoke pending invite                                                    |

## **10.4 Organization Module (New)**

| **Method** | **Endpoint**                     | **Description**                                          |
| ---------- | -------------------------------- | -------------------------------------------------------- |
| GET        | /organization                    | Get current org details                                  |
| PATCH      | /organization                    | Update org name, slug, logo, timezone                    |
| GET        | /organization/waba-config        | Get WABA config for current org                          |
| PATCH      | /organization/waba-config        | Update WABA credentials                                  |
| POST       | /organization/waba-config/verify | Trigger live Meta API verification of stored credentials |

## **10.5 Contacts Module (Extend Existing)**

| **Method** | **Endpoint**                | **Description**                                            |
| ---------- | --------------------------- | ---------------------------------------------------------- |
| GET        | /contacts                   | Paginated, searchable contact list (organizationId scoped) |
| POST       | /contacts                   | Create new contact                                         |
| GET        | /contacts/:id               | Get contact with full details and custom fields            |
| PATCH      | /contacts/:id               | Update contact info                                        |
| DELETE     | /contacts/:id               | Soft delete contact                                        |
| POST       | /contacts/import-csv        | Multipart upload, parse, validate, bulk upsert             |
| GET        | /contacts/:id/conversations | All conversations for a specific contact                   |

## **10.6 Broadcasts Module (New)**

| **Method** | **Endpoint**              | **Description**                                               |
| ---------- | ------------------------- | ------------------------------------------------------------- |
| GET        | /broadcasts               | List broadcasts for org (paginated, filterable by status)     |
| POST       | /broadcasts               | Create broadcast (draft) with template + audience criteria    |
| GET        | /broadcasts/:id           | Get broadcast detail with current stats                       |
| POST       | /broadcasts/:id/send      | Immediately queue broadcast via BullMQ                        |
| POST       | /broadcasts/:id/schedule  | Schedule broadcast for future datetime via BullMQ delayed job |
| DELETE     | /broadcasts/:id           | Cancel/delete broadcast (only DRAFT or SCHEDULED)             |
| GET        | /broadcasts/:id/analytics | Delivery stats: sent, delivered, read, failed per recipient   |

## **10.7 BullMQ Jobs (Background Processing)**

| **Queue Name**      | **Job Type**           | **Processing Logic**                                                       |
| ------------------- | ---------------------- | -------------------------------------------------------------------------- |
| broadcast-queue     | send-broadcast         | Chunk audience, call Meta Send API per recipient, track per-message status |
| email-queue         | send-invite-email      | Render React Email template → send via Resend SDK                          |
| email-queue         | send-reset-email       | Render password reset template → send via Resend SDK                       |
| email-queue         | send-alert-email       | Template rejected / low credits / digest alerts                            |
| webhook-retry-queue | retry-webhook-delivery | Retry failed outbound webhook deliveries with exponential backoff          |

## **10.8 Email Templates via React Email + Resend**

- Invite Email: Platform branding, org name, role, Accept Invite CTA button, expires in 7 days note
- Password Reset: Security notice, Reset Password button, expires in 1 hour, 'If you did not request this' disclaimer
- Template Rejected Alert: Template name, rejection reason from Meta, link to edit template
- Low Credit Warning: Current balance, threshold, Recharge Now CTA
- Daily Digest (Phase 2): Messages sent, conversations opened/closed, top template performance

# **SECTION 11 - Database Schema (Prisma)**

## **11.1 Existing Models (Keep - Do Not Replace)**

- Organization - extend with: logoUrl, slug @unique, plan, isActive
- User - extend with: invitedBy, acceptedInviteAt, lastActiveAt
- WabaConfig - keep as-is, already well-structured
- Conversation - keep, already well-structured
- Message - keep, already well-structured
- Template - keep, already well-structured
- Contact - extend with: customFields Json, tags String\[\], segments
- Wallet / Transaction - keep existing billing models

## **11.2 New Models to Add**

### **RefreshToken Model**

model RefreshToken {

id String @id @default(cuid())

token String @unique

userId String

user User @relation(fields: \[userId\], references: \[id\])

expiresAt DateTime

createdAt DateTime @default(now())

revokedAt DateTime?

}

### **Invite Model**

model Invite {

id String @id @default(cuid())

email String

organizationId String?

organization Organization? @relation(fields: \[organizationId\], references: \[id\])

role UserRole

token String @unique

expiresAt DateTime

acceptedAt DateTime?

createdAt DateTime @default(now())

createdBy String // userId of inviter

}

### **Broadcast Model**

model Broadcast {

id String @id @default(cuid())

organizationId String

organization Organization @relation(fields: \[organizationId\], references: \[id\])

name String

templateId String

template Template @relation(fields: \[templateId\], references: \[id\])

status BroadcastStatus @default(DRAFT)

scheduledAt DateTime?

sentAt DateTime?

audience Json // filter criteria or contact IDs array

stats Json? // { sent, delivered, read, failed }

createdAt DateTime @default(now())

createdBy String // userId

}

enum BroadcastStatus { DRAFT SCHEDULED RUNNING COMPLETED FAILED CANCELLED }

### **AuditLog Model**

model AuditLog {

id String @id @default(cuid())

organizationId String? // null for super admin actions

actorId String // userId performing action

action String // e.g. 'org.created', 'user.invited', 'waba.connected'

resourceType String? // e.g. 'User', 'Template', 'Broadcast'

resourceId String?

metadata Json? // additional context

createdAt DateTime @default(now())

}

## **11.3 Migration Strategy**

- Never drop existing columns - only add new ones
- New nullable columns: always nullable with default or null default
- Run prisma migrate dev for each change during development
- Run prisma migrate deploy in CI/CD for production
- Keep migration files in Git - never delete them

# **SECTION 12 - Complete File Structure**

## **12.1 Frontend (apps/web/src/)**

apps/web/src/

├── app/

│ ├── (auth)/ # Auth group - no sidebar layout

│ │ ├── login/page.tsx

│ │ ├── forgot-password/page.tsx

│ │ ├── reset-password/page.tsx

│ │ └── accept-invite/page.tsx

│ ├── (app)/ # App group - with sidebar layout

│ │ ├── layout.tsx # AppShell component

│ │ ├── dashboard/page.tsx

│ │ ├── inbox/

│ │ │ ├── page.tsx # Default inbox (no conversation selected)

│ │ │ └── \[conversationId\]/page.tsx

│ │ ├── contacts/

│ │ │ ├── page.tsx

│ │ │ └── \[contactId\]/page.tsx

│ │ ├── broadcasts/

│ │ │ ├── page.tsx

│ │ │ ├── new/page.tsx

│ │ │ └── \[broadcastId\]/page.tsx

│ │ ├── templates/

│ │ │ ├── page.tsx

│ │ │ ├── new/page.tsx

│ │ │ └── \[templateId\]/page.tsx

│ │ ├── analytics/page.tsx

│ │ ├── settings/

│ │ │ ├── profile/page.tsx

│ │ │ ├── organization/page.tsx

│ │ │ ├── whatsapp/page.tsx

│ │ │ ├── team/page.tsx

│ │ │ ├── billing/page.tsx

│ │ │ └── notifications/page.tsx

│ │ └── onboarding/page.tsx

│ ├── (super-admin)/ # Super admin - separate shell

│ │ ├── layout.tsx

│ │ ├── super-admin/page.tsx

│ │ ├── super-admin/organizations/page.tsx

│ │ ├── super-admin/organizations/\[id\]/page.tsx

│ │ └── super-admin/billing/page.tsx

│ ├── layout.tsx # Root layout

│ └── page.tsx # Public marketing landing page

├── components/

│ ├── ui/ # Design system primitives

│ │ ├── button.tsx

│ │ ├── input.tsx

│ │ ├── badge.tsx

│ │ ├── card.tsx

│ │ ├── avatar.tsx

│ │ ├── modal.tsx

│ │ ├── table.tsx

│ │ ├── skeleton.tsx

│ │ ├── toast.tsx

│ │ ├── dropdown.tsx

│ │ ├── tabs.tsx

│ │ └── tooltip.tsx

│ ├── app-shell/

│ │ ├── Sidebar.tsx

│ │ ├── Header.tsx

│ │ └── MobileSidebar.tsx

│ ├── inbox/

│ │ ├── ConversationList.tsx

│ │ ├── ConversationItem.tsx

│ │ ├── MessageThread.tsx

│ │ ├── MessageBubble.tsx

│ │ ├── MessageComposer.tsx

│ │ └── ContactPanel.tsx

│ ├── super-admin/

│ │ ├── OrgTable.tsx

│ │ ├── CreateOrgModal.tsx

│ │ └── StatsCards.tsx

│ └── onboarding/

│ ├── OnboardingWizard.tsx

│ ├── WabaConnectStep.tsx

│ └── TeamInviteStep.tsx

├── hooks/

│ ├── useAuth.ts # Current user, role, org

│ ├── useInbox.ts # Inbox state + Socket.io

│ ├── useContacts.ts

│ └── useOrganization.ts

├── lib/

│ ├── api.ts # Axios instance + token refresh interceptor

│ ├── auth.ts # Token storage helpers

│ └── utils.ts # cn(), formatDate(), etc.

├── stores/

│ ├── auth.store.ts # Zustand: user, role, org

│ └── inbox.store.ts # Zustand: active conversations

├── styles/

│ ├── globals.css # CSS variables + Tailwind base

│ └── fonts.css # Google Fonts imports

└── types/

├── auth.ts

├── inbox.ts

└── organization.ts

## **12.2 Backend Module Structure (NestJS)**

apps/api/src/

├── auth/

│ ├── auth.module.ts

│ ├── auth.controller.ts

│ ├── auth.service.ts

│ ├── strategies/

│ │ ├── jwt.strategy.ts

│ │ └── refresh-token.strategy.ts

│ └── guards/

│ ├── jwt-auth.guard.ts

│ └── roles.guard.ts

├── super-admin/

│ ├── super-admin.module.ts

│ ├── super-admin.controller.ts

│ └── super-admin.service.ts

├── organization/

│ ├── organization.module.ts

│ ├── organization.controller.ts

│ └── organization.service.ts

├── team/

│ ├── team.module.ts

│ ├── team.controller.ts

│ └── team.service.ts

├── contacts/

│ ├── contacts.module.ts

│ ├── contacts.controller.ts

│ └── contacts.service.ts

├── broadcasts/

│ ├── broadcasts.module.ts

│ ├── broadcasts.controller.ts

│ ├── broadcasts.service.ts

│ └── jobs/send-broadcast.job.ts

├── inbox/ # Existing - keep, extend

├── templates/ # Existing - keep, extend

├── billing/ # Existing - keep, extend

├── webhooks/ # Existing - keep

├── email/

│ ├── email.module.ts

│ ├── email.service.ts

│ └── templates/

│ ├── invite.email.tsx

│ ├── reset-password.email.tsx

│ └── low-credits.email.tsx

└── prisma/ # Existing Prisma service

# **SECTION 13 - Build Phases & Execution Timeline**

_Integration note: WhatsAppAI is developed standalone but must be integration-ready from Phase 1. All auth tokens, org IDs, and shared services must use interface contracts that can be swapped for parent platform services at integration time._

## **Phase 1 - Design System & Auth Shell (Week 1-2)**

| **Task**                                                                                                            | **Owner Layer** | **Done Criteria**                          |
| ------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------ |
| Set up Tailwind v4 with all CSS variables from Section 8.2                                                          | Frontend        | Storybook shows all design tokens          |
| Build component library: Button, Input, Badge, Card, Avatar, Table, Modal, Toast, Skeleton, Dropdown, Tabs, Tooltip | Frontend        | All variants render correctly in isolation |
| Build app shell (Sidebar + Header layout) with all nav links                                                        | Frontend        | Navigation renders, active states work     |
| Build auth screens: Login, Forgot Password, Reset Password, Accept Invite                                           | Frontend        | Forms validate, submit, show errors        |
| Build JWT auth module in NestJS (access + refresh tokens, RS256)                                                    | Backend         | Tokens issued, refresh rotates correctly   |
| Build invite flow: generate token → Resend email → accept endpoint                                                  | Backend         | End-to-end invite flow works               |
| Implement Next.js middleware for protected routes                                                                   | Frontend        | Unauthenticated redirects work             |
| Implement RoleGuard component and useAuth hook                                                                      | Frontend        | Role-based visibility works                |

## **Phase 2 - Super Admin Portal (Week 3)**

| **Task**                                                | **Owner Layer** | **Done Criteria**                    |
| ------------------------------------------------------- | --------------- | ------------------------------------ |
| Super admin dashboard with real KPI stats from API      | Full Stack      | Stats update in real-time            |
| Organizations list with search, filter, pagination      | Full Stack      | Can search and filter orgs           |
| Create org slide-over form + invite owner flow          | Full Stack      | Org created + invite email sent      |
| Organization detail page (all 5 tabs)                   | Full Stack      | All tabs show real data              |
| Billing config editor (credit packs, per-message rates) | Full Stack      | Prices can be updated by super admin |
| Audit log view with filters                             | Full Stack      | Log shows real events                |

## **Phase 3 - Onboarding Wizard (Week 3-4)**

| **Task**                                                      | **Owner Layer** | **Done Criteria**                               |
| ------------------------------------------------------------- | --------------- | ----------------------------------------------- |
| Multi-step wizard UI with progress bar and step navigation    | Frontend        | All 5 steps navigate correctly                  |
| WABA credential form with show/hide toggles                   | Frontend        | Form renders and validates                      |
| Live Meta API verification endpoint + frontend status display | Full Stack      | Success and error states both display correctly |
| Business profile display from Meta API response               | Full Stack      | Fetched data shown in Step 3                    |
| Team invite step (optional/skippable)                         | Full Stack      | Invites sent or skipped correctly               |
| Completion confetti animation + redirect to dashboard         | Frontend        | Animation plays, redirect works                 |

## **Phase 4 - Org Dashboard + Team Management (Week 4-5)**

| **Task**                                                  | **Owner Layer** | **Done Criteria**                 |
| --------------------------------------------------------- | --------------- | --------------------------------- |
| Dashboard page with all 6 KPI widgets using real API data | Full Stack      | All widgets show live data        |
| Team members list with role badges, last active, stats    | Full Stack      | List loads correctly              |
| Invite member flow (email + role → email sent)            | Full Stack      | Invite email received             |
| Role change (promote/demote) and deactivate/remove        | Full Stack      | Permissions change immediately    |
| Pending invites list with revoke option                   | Full Stack      | Invite revoked cannot be accepted |
| Role-based component visibility across all built screens  | Frontend        | Agents cannot see admin-only UI   |

## **Phase 5 - Inbox Rebuild (Week 5-6)**

| **Task**                                                                     | **Owner Layer** | **Done Criteria**                     |
| ---------------------------------------------------------------------------- | --------------- | ------------------------------------- |
| Three-column inbox layout with responsive collapse                           | Frontend        | Layout renders correctly on all sizes |
| Conversation list with Socket.io real-time updates                           | Full Stack      | New messages appear without refresh   |
| Message thread with proper bubble UI, media types, status icons              | Frontend        | All message types render correctly    |
| Message composer (text, media attach, template picker, quick replies, emoji) | Frontend        | All composer features work            |
| Contact panel (edit inline, assign agent, labels)                            | Full Stack      | Contact updates persist               |
| Assign / Resolve / Reopen / Label actions                                    | Full Stack      | Status changes update conversation    |
| Internal notes (yellow bubble, not sent to WhatsApp)                         | Full Stack      | Notes visible only in platform        |
| Saved views (custom filters per user)                                        | Full Stack      | Views persist across sessions         |
| Virtualized conversation list (react-virtual)                                | Frontend        | 1000+ conversations scroll smoothly   |

## **Phase 6 - Templates & Broadcasts (Week 7)**

| **Task**                                                 | **Owner Layer** | **Done Criteria**                         |
| -------------------------------------------------------- | --------------- | ----------------------------------------- |
| Template list with status filtering and search           | Full Stack      | Templates load with correct status badges |
| Template create/edit form with live preview              | Frontend        | Preview updates as user types             |
| Meta template submission + status sync via webhook       | Backend         | Approval webhook updates template status  |
| Template analytics (delivery, read rates)                | Full Stack      | Stats shown per template                  |
| Governance alerts UI (quality drop, rejection)           | Full Stack      | Alerts appear when triggered              |
| Broadcast create wizard (template → audience → schedule) | Full Stack      | Broadcast created and queued              |
| Broadcast list with status chips and analytics           | Full Stack      | Stats update as broadcast sends           |

## **Phase 7 - Contacts & Analytics (Week 8)**

| **Task**                                                           | **Owner Layer** | **Done Criteria**               |
| ------------------------------------------------------------------ | --------------- | ------------------------------- |
| Contacts list with search, filter, sort, pagination                | Full Stack      | List loads with correct data    |
| Contact detail page with conversation history                      | Full Stack      | History shows all conversations |
| CSV import with column mapping UI                                  | Full Stack      | CSV imported, contacts created  |
| Custom fields management (org-level config + contact values)       | Full Stack      | Fields appear on all contacts   |
| Analytics overview report (messages, conversations, response time) | Full Stack      | Charts show real data           |
| Agent performance report                                           | Full Stack      | Per-agent stats correct         |
| Template performance report                                        | Full Stack      | Matches template analytics data |
| Broadcast report                                                   | Full Stack      | Funnel stats accurate           |
| Credit usage report                                                | Full Stack      | Daily spend chart accurate      |

## **Phase 8 - Billing & Settings Polish (Week 8-9)**

| **Task**                                                        | **Owner Layer** | **Done Criteria**                    |
| --------------------------------------------------------------- | --------------- | ------------------------------------ |
| Billing page: wallet, recharge packs, auto-recharge             | Full Stack      | Recharge flow completes with payment |
| Payment integration (Razorpay for India / Stripe international) | Full Stack      | Payment processed, wallet credited   |
| Transaction history table with pagination                       | Full Stack      | History shows accurate records       |
| Settings: org profile, notifications, quick replies, labels     | Full Stack      | All settings persist correctly       |
| Settings: API keys (generate, revoke, copy)                     | Full Stack      | Key generated, works in API calls    |
| Org-level audit log in settings                                 | Full Stack      | Log shows real events                |

## **Phase 9 - Hardening & Production Ready (Week 9-10)**

| **Task**                                                                    | **Owner Layer** | **Done Criteria**                        |
| --------------------------------------------------------------------------- | --------------- | ---------------------------------------- |
| Error handling on every screen (API errors → toast + inline messages)       | Frontend        | No silent failures anywhere              |
| Empty states on every list/table screen                                     | Frontend        | All empty states have illustration + CTA |
| Mobile responsive (sidebar collapses, inbox adapts to 1-column)             | Frontend        | Usable on 375px viewport                 |
| Sentry integration (frontend + backend)                                     | Full Stack      | Errors appear in Sentry dashboard        |
| PostHog integration (page views, key events)                                | Frontend        | Events tracked in PostHog                |
| Performance: pagination on all lists, virtualization on inbox               | Frontend        | No slow renders with large datasets      |
| E2E tests for critical paths (login, WABA connect, send message, broadcast) | Testing         | All critical paths pass                  |
| BullMQ job monitoring (Bull Board integration)                              | Backend         | Jobs visible in monitor UI               |
| Load testing: inbox with 100 concurrent agents                              | Testing         | Socket.io handles concurrent load        |

# **SECTION 14 - API Contracts & Data Shapes**

## **14.1 Authentication Response Shape**

// POST /auth/login - Success Response

{

"accessToken": "eyJhbGc...",

"user": {

"id": "user_cuid",

"email": "<admin@company.com>",

"name": "John Admin",

"role": "ADMIN",

"organizationId": "org_cuid",

"organization": {

"id": "org_cuid",

"name": "Acme Corp",

"slug": "acme-corp",

"plan": "starter"

}

}

}

## **14.2 Conversation List Item Shape**

// GET /inbox/conversations - Array item

{

"id": "conv_cuid",

"status": "OPEN", // OPEN | PENDING | RESOLVED

"contact": {

"id": "contact_cuid",

"name": "Rahul Sharma",

"phone": "+919876543210",

"avatarUrl": null

},

"lastMessage": {

"content": "Hello, I need help with...",

"type": "TEXT",

"sentAt": "2024-01-15T10:30:00Z",

"direction": "INBOUND"

},

"assignedTo": { "id": "user_cuid", "name": "Sarah Agent" },

"unreadCount": 3,

"labels": \["support", "urgent"\],

"createdAt": "2024-01-15T09:00:00Z"

}

## **14.3 Broadcast Create Payload**

// POST /broadcasts

{

"name": "January Sale Campaign",

"templateId": "template_cuid",

"templateVariables": { "1": "Rahul", "2": "30%" },

"audience": {

"type": "SEGMENT", // SEGMENT | TAG | CSV | ALL

"segmentId": "segment_cuid"

},

"scheduledAt": "2024-01-20T09:00:00Z" // null = send immediately

}

## **14.4 Standard Error Response**

{

"statusCode": 422,

"error": "Unprocessable Entity",

"message": "WABA credentials verification failed: Invalid access token",

"code": "WABA_VERIFICATION_FAILED"

}

_Always include a machine-readable 'code' field so the frontend can handle specific errors with custom UI (e.g. WABA_VERIFICATION_FAILED shows a specific retry UI)._

# **SECTION 15 - Integration Guide: WhatsAppAI → Parent Platform**

## **15.1 What Stays When Integrating**

- All NestJS modules (auth, inbox, templates, broadcasts, contacts, billing)
- All Prisma models and migration history
- All frontend pages and components
- All Socket.io real-time infrastructure
- All BullMQ job infrastructure
- All Meta API integration logic

## **15.2 What Gets Replaced at Integration Time**

| **WhatsAppAI Standalone**                    | **Replaced With (Parent Platform)**                             |
| -------------------------------------------- | --------------------------------------------------------------- |
| Custom JWT auth module (/auth/login etc.)    | Parent platform's shared auth service + token issuer            |
| Own Organization model + tenant provisioning | Parent platform's Organization/Tenant service                   |
| Own User model                               | Reference to parent's shared User service                       |
| Standalone Resend email sending              | Parent platform's notification/email service                    |
| Standalone billing wallet                    | Parent platform's unified billing service                       |
| Standalone deployment (Vercel + Railway)     | Registered as named microservice in platform's service registry |

## **15.3 Integration Readiness Rules (Build These Now)**

- All auth logic must be behind an AuthService interface - swap implementation without changing callers
- All organization scoping must use organizationId string - not a coupled model reference
- All user references use userId string - not a coupled User model reference
- Environment variables must be cleanly separated - platform can inject its own values
- No hardcoded URLs - all service URLs come from config/environment variables
- Document every external dependency with its interface contract

## **15.4 Microservice Registration (When Parent Integration Happens)**

- WhatsAppAI NestJS app registers as a named microservice via the parent's service discovery
- Parent platform's API Gateway routes /whatsapp/\* traffic to this microservice
- JWT tokens from parent platform are validated by this microservice's auth middleware
- organizationId in tokens maps to WhatsAppAI's Organization table
- The calling module in the parent platform is COMPLETELY separate - zero overlap, zero shared code

# **SECTION 16 - Quality, Security & Performance Standards**

## **16.1 Security Requirements**

### **Authentication Security**

- Access tokens in memory only - NEVER localStorage, NEVER sessionStorage
- Refresh tokens in httpOnly secure cookies - inaccessible to JavaScript
- All tokens must be invalidatable server-side (DB-backed refresh tokens)
- Invite tokens and reset tokens are single-use - mark consumed immediately on use
- bcrypt cost factor 12 for all passwords
- Rate limiting on all auth endpoints: 5 attempts per 15 minutes per IP

### **API Security**

- CORS: whitelist only known frontend origins
- All Meta webhook requests: verify X-Hub-Signature-256
- SQL injection: impossible via Prisma parameterized queries - never raw SQL
- Every endpoint: organizationId from JWT - never from request body
- Input validation: Zod schemas on all DTOs - reject unexpected fields
- File uploads: validate MIME type + max size + scan filename for path traversal

## **16.2 Performance Requirements**

| **Metric**                         | **Target**  | **How to Achieve**                                  |
| ---------------------------------- | ----------- | --------------------------------------------------- |
| First Contentful Paint             | < 1.5s      | Next.js SSR for dashboard, code splitting per route |
| Inbox load (100 conversations)     | < 300ms     | Paginated API + virtual scroll (react-virtual)      |
| Real-time message delivery         | < 500ms     | Socket.io direct emit - no polling                  |
| Broadcast send (10,000 recipients) | < 5 minutes | BullMQ chunked processing, concurrency 10           |
| Analytics query                    | < 2s        | Postgres indexes on organizationId + createdAt      |
| CSV import (10,000 contacts)       | < 30s       | BullMQ background job with progress events          |

## **16.3 Code Quality Standards**

- TypeScript strict mode enabled - no any types
- ESLint + Prettier enforced in CI - no merge without passing lint
- All API responses typed via shared DTO types (shared package in monorepo)
- All forms validated with Zod - same schema used on frontend and backend
- Unit tests for all service methods (Jest)
- E2E tests for critical user journeys (Playwright)
- No console.log in production code - use NestJS Logger or structured logging

## **16.4 Error Handling Standards**

- Backend: all errors thrown as NestJS HttpException with status + message + code
- Frontend: Axios interceptors catch all API errors → display via toast system
- Every list/table page has an error boundary with retry button
- Every async operation has loading state (skeleton) AND error state (inline message + retry)
- Network offline: detect via navigator.onLine + socket disconnect event → show banner
- Sentry captures all unhandled errors with user context and organizationId

# **SECTION 17 - Complete NPM Package Reference**

## **17.1 Frontend Dependencies**

| **Package**           | **Version** | **Why**                                                     |
| --------------------- | ----------- | ----------------------------------------------------------- |
| next                  | ^14         | Framework - App Router for layouts, middleware, SSR         |
| react + react-dom     | ^18         | UI library                                                  |
| typescript            | ^5          | Type safety                                                 |
| tailwindcss           | ^4          | Utility CSS - use v4 for CSS variables support              |
| @radix-ui/react-\*    | Latest      | Headless accessible UI primitives (use individual packages) |
| framer-motion         | ^11         | Animations - onboarding, transitions, toast entry/exit      |
| lucide-react          | Latest      | Consistent icon set                                         |
| zustand               | ^4          | Global state - auth, inbox, notifications                   |
| @tanstack/react-query | ^5          | Server state - API caching, background refetch              |
| axios                 | ^1          | HTTP client - interceptors for token refresh                |
| react-hook-form       | ^7          | Performant forms with minimal re-renders                    |
| zod                   | ^3          | Schema validation - shared with backend                     |
| @hookform/resolvers   | ^3          | Bridge between zod and react-hook-form                      |
| socket.io-client      | ^4          | Real-time inbox connection                                  |
| react-email           | ^2          | Email template components                                   |
| resend                | ^3          | Email sending SDK                                           |
| date-fns              | ^3          | Date formatting - formatRelative, parseISO, format          |
| clsx                  | ^2          | Conditional className utility                               |
| tailwind-merge        | ^2          | Merge conflicting Tailwind classes safely                   |
| react-virtual         | Latest      | Virtualized lists for inbox performance                     |
| @sentry/nextjs        | ^7          | Frontend error monitoring                                   |
| posthog-js            | ^1          | Product analytics and feature flags                         |

## **17.2 Backend Dependencies (Additional to Existing)**

| **Package**        | **Version** | **Why**                                             |
| ------------------ | ----------- | --------------------------------------------------- |
| @nestjs/passport   | Latest      | Passport integration for NestJS auth strategies     |
| passport-jwt       | Latest      | JWT strategy for access token validation            |
| @nestjs/jwt        | Latest      | JWT signing and verification                        |
| bcrypt             | Latest      | Password hashing                                    |
| bullmq             | Latest      | Background job queues on Redis                      |
| @bull-board/nestjs | Latest      | Visual job queue monitoring UI                      |
| resend             | ^3          | Transactional email via Resend API                  |
| react-email        | ^2          | Email template rendering                            |
| zod                | ^3          | Shared schema validation (same version as frontend) |
| multer             | Latest      | File upload handling (CSV import, media)            |
| csv-parse          | Latest      | CSV parsing for contact import                      |

# **SECTION 18 - Master Development Checklist**

_This checklist tracks EVERY deliverable. Nothing is complete until every item below is checked off._

## **18.1 Architecture & Setup**

- \[ \] Monorepo structure confirmed (apps/web + apps/api)
- \[ \] TypeScript strict mode enabled in both apps
- \[ \] ESLint + Prettier configured and enforced
- \[ \] GitHub Actions CI pipeline: lint → test → build
- \[ \] Environment variables documented in .env.example files
- \[ \] Prisma schema extended with new models from Section 11
- \[ \] All new Prisma migrations applied and committed

## **18.2 Authentication**

- \[ \] NestJS JWT auth module built with RS256 signing
- \[ \] Access token (15min) + Refresh token (30d httpOnly cookie)
- \[ \] All auth endpoints from Section 10.1 implemented
- \[ \] Invite flow: create → email → accept → auto-login
- \[ \] Password reset flow: request → email → reset → login
- \[ \] Super admin separate login endpoint
- \[ \] Frontend middleware for route protection
- \[ \] useAuth hook with all required fields
- \[ \] RoleGuard component
- \[ \] Token refresh interceptor in Axios

## **18.3 Design System**

- \[ \] All CSS variables defined in globals.css (Section 8.2)
- \[ \] Google Fonts loaded: Syne + DM Sans + JetBrains Mono
- \[ \] Button component: Solid / Ghost / Destructive variants
- \[ \] Input component with focus glow
- \[ \] Badge component with all semantic colors
- \[ \] Card component
- \[ \] Avatar component with initials fallback
- \[ \] Modal/Dialog (Radix Dialog primitive)
- \[ \] Table component with sort + pagination
- \[ \] Skeleton component with shimmer animation
- \[ \] Toast system (bottom-right, stacked)
- \[ \] Dropdown/Select (Radix)
- \[ \] Tabs (Radix)
- \[ \] Tooltip (Radix)

## **18.4 App Shell**

- \[ \] Sidebar with all navigation items
- \[ \] Unread badge on Inbox nav item (Socket.io driven)
- \[ \] Header with page title, search, notifications, user menu
- \[ \] Mobile sidebar (hamburger toggle)
- \[ \] Role-based nav: agents see limited nav

## **18.5 Super Admin Portal**

- \[ \] Dashboard: 4 KPI cards + recent orgs table + activity feed
- \[ \] Organizations list: search, filter, pagination
- \[ \] Create org slide-over with invite trigger
- \[ \] Org detail page: all 5 tabs fully functional
- \[ \] Billing config editor
- \[ \] Audit log with filters

## **18.6 Onboarding Wizard**

- \[ \] 5-step wizard with progress bar
- \[ \] Step 2: WABA credential form + live Meta API verification
- \[ \] Step 3: Business profile display from Meta response
- \[ \] Step 4: Team invite (skippable)
- \[ \] Step 5: Completion animation + dashboard redirect
- \[ \] Cannot skip Step 2 without successful WABA verification

## **18.7 Org Dashboard**

- \[ \] All 6 KPI widgets with real data
- \[ \] Date range selector
- \[ \] Auto-refresh on Socket.io events

## **18.8 Shared Inbox**

- \[ \] Three-column layout
- \[ \] Conversation list: all tabs, search, filter, saved views
- \[ \] Real-time conversation updates via Socket.io
- \[ \] Message thread: all message types + status icons
- \[ \] Internal notes (yellow bubble)
- \[ \] Timeline events (gray chips)
- \[ \] Message composer: text, media, template picker, quick replies, emoji
- \[ \] Contact panel: view, edit inline, assign, label
- \[ \] Assign / Resolve / Reopen actions
- \[ \] Virtualized conversation list

## **18.9 Contacts**

- \[ \] Contact list with search, filter, sort, pagination
- \[ \] Contact detail with conversation history
- \[ \] CSV import with column mapping
- \[ \] Custom fields (org-level config + per-contact values)
- \[ \] Tags / Segments
- \[ \] Bulk actions

## **18.10 Templates**

- \[ \] Template list with all status filters
- \[ \] Create/edit form with live preview
- \[ \] Submit to Meta API
- \[ \] Webhook-driven status sync
- \[ \] Template analytics
- \[ \] Governance alerts

## **18.11 Broadcasts**

- \[ \] Broadcast list with status chips
- \[ \] Create wizard: template → audience → schedule
- \[ \] BullMQ broadcast job (chunked, tracked)
- \[ \] Per-broadcast analytics

## **18.12 Analytics**

- \[ \] Overview report with date range filter
- \[ \] Agent performance report
- \[ \] Template performance report
- \[ \] Broadcast report
- \[ \] Credit usage report

## **18.13 Settings (All Sections)**

- \[ \] Profile: name, email, password, avatar
- \[ \] Organization: name, slug, logo, timezone
- \[ \] WhatsApp: WABA config re-verify, webhook status
- \[ \] Team: invite, manage roles, deactivate
- \[ \] Billing: wallet, recharge, auto-recharge, transactions, invoices
- \[ \] Notifications: preferences per event type
- \[ \] Quick Replies: library management
- \[ \] Labels: color + name management
- \[ \] Audit Log: org-level event history

## **18.14 Billing**

- \[ \] Wallet balance card
- \[ \] Credit pack selection + payment (Razorpay / Stripe)
- \[ \] Auto-recharge configuration
- \[ \] Transaction history
- \[ \] Usage breakdown chart

## **18.15 Hardening**

- \[ \] Error handling on every screen
- \[ \] Empty states on every list
- \[ \] Mobile responsive (375px minimum)
- \[ \] Sentry configured (frontend + backend)
- \[ \] PostHog configured
- \[ \] E2E tests for all critical paths
- \[ \] Load testing passed
- \[ \] Security audit: no exposed tokens, no CORS misconfiguration

## **18.16 Integration Readiness**

- \[ \] AuthService abstracted behind interface
- \[ \] All service URLs in environment variables
- \[ \] No hardcoded tenant assumptions
- \[ \] Integration guide documented (Section 15)
- \[ \] Service boundary contracts documented

# **SECTION 19 - Quick Reference Card**

## **19.1 Key URLs by Role**

| **Role**    | **Entry URL**            | **Shell Used**                                        |
| ----------- | ------------------------ | ----------------------------------------------------- |
| Super Admin | /super-admin             | Super Admin Shell (no org sidebar)                    |
| Org Admin   | /dashboard               | App Shell (full sidebar)                              |
| Manager     | /inbox                   | App Shell (full sidebar)                              |
| Agent       | /inbox                   | App Shell (limited sidebar - no broadcasts/analytics) |
| Viewer      | /dashboard               | App Shell (read-only)                                 |
| New Invite  | /accept-invite?token=xxx | Auth layout → onboarding wizard                       |

## **19.2 Socket.io Event Reference**

| **Event Name**        | **Direction**   | **Payload**                              | **Purpose**                          |
| --------------------- | --------------- | ---------------------------------------- | ------------------------------------ |
| conversation:new      | Server → Client | { conversationId, contact, lastMessage } | New conversation starts              |
| message:new           | Server → Client | { conversationId, message }              | New message in existing conversation |
| message:status        | Server → Client | { messageId, status }                    | Message delivery status update       |
| conversation:assigned | Server → Client | { conversationId, assignedTo }           | Conversation assigned to agent       |
| conversation:resolved | Server → Client | { conversationId }                       | Conversation marked resolved         |
| send:message          | Client → Server | { conversationId, content, type }        | Agent sends message                  |

## **19.3 Environment Variables Required**

| **Variable**            | **Used By** | **Notes**                                   |
| ----------------------- | ----------- | ------------------------------------------- |
| DATABASE_URL            | Backend     | PostgreSQL connection string                |
| REDIS_URL               | Backend     | Redis connection for BullMQ + Socket.io     |
| JWT_PRIVATE_KEY         | Backend     | RS256 private key for signing access tokens |
| JWT_PUBLIC_KEY          | Backend     | RS256 public key for verifying tokens       |
| REFRESH_TOKEN_SECRET    | Backend     | HS256 secret for refresh token signing      |
| RESEND_API_KEY          | Backend     | Resend API key for transactional emails     |
| META_VERIFY_TOKEN       | Backend     | Webhook verification token for Meta         |
| NEXT_PUBLIC_API_URL     | Frontend    | Backend API base URL                        |
| NEXT_PUBLIC_WS_URL      | Frontend    | Socket.io server URL                        |
| NEXT_PUBLIC_POSTHOG_KEY | Frontend    | PostHog analytics key                       |
| SENTRY_DSN              | Both        | Sentry error tracking DSN                   |
| RAZORPAY_KEY_ID         | Backend     | Razorpay payment key                        |
| RAZORPAY_KEY_SECRET     | Backend     | Razorpay payment secret                     |
| R2_ACCOUNT_ID           | Backend     | Cloudflare R2 account for media storage     |
| R2_ACCESS_KEY_ID        | Backend     | R2 access key                               |
| R2_SECRET_ACCESS_KEY    | Backend     | R2 secret key                               |
| R2_BUCKET_NAME          | Backend     | R2 bucket for WhatsApp media files          |

## **19.4 Meta Graph API Endpoints Used**

| **Endpoint**                                    | **Purpose**                                              |
| ----------------------------------------------- | -------------------------------------------------------- |
| GET /{phone-number-id}?access_token={token}     | Verify phone number, fetch display name + quality rating |
| GET /{waba-id}?access_token={token}             | Verify WABA, fetch account status                        |
| POST /{waba-id}/subscribed_apps                 | Register webhook subscription                            |
| POST /{phone-number-id}/messages                | Send WhatsApp message (text, template, media)            |
| GET /{waba-id}/message_templates                | Fetch all templates for org                              |
| POST /{waba-id}/message_templates               | Create new template for submission                       |
| DELETE /{waba-id}/message_templates?name={name} | Delete template                                          |

**WhatsAppAI Platform - Master Implementation Blueprint**

_This document is the single source of truth for the platform development._

_Every engineering decision, every component, every API endpoint traces back to a section in this document._