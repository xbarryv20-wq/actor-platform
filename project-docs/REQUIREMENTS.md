# REQUIREMENTS.md

## Product vision

Build a multi-tenant cloud platform for actor-based web automation, browser task execution, and structured data extraction. The platform should let users create or install reusable actors, run them asynchronously, store outputs in structured storage primitives, schedule recurring executions, and integrate results into external systems and AI workflows.[cite:1][cite:83][cite:89]

## Product goals

- Enable users to run automation tools without managing infrastructure.[cite:1][cite:65]
- Support asynchronous actor runs with visible lifecycle state and retrievable outputs.[cite:44][cite:55]
- Provide first-class storage primitives for structured output, configuration/files, and crawl/task progression.[cite:81][cite:83][cite:88]
- Support automation through schedules, tasks, and webhooks.[cite:86][cite:89][cite:53]
- Expose an API-first platform suitable for UI, integrations, and agent access.[cite:83][cite:85][cite:55]
- Support marketplace-style publication and monetization of reusable tools.[cite:15][cite:65]
- Support teams, permissions, auditability, and future enterprise controls.[cite:85][cite:65]

## Primary user types

### 1. Operator
A user who runs existing actors to collect data, automate workflows, or monitor websites. This user cares most about reliability, schedules, exports, and simple setup.[cite:1][cite:53]

### 2. Builder
A user who creates and versions custom actors, defines input schemas, and exposes reusable outputs. This user cares most about actor contracts, logs, runs, and API access.[cite:87][cite:84][cite:83]

### 3. Team admin
A user who manages workspaces, roles, tokens, billing visibility, and audit-sensitive controls. This user cares most about tenancy, access control, and observability.[cite:85][cite:65]

### 4. Integrator
A developer or automation owner who triggers runs by API, consumes datasets, and chains runs with webhooks or external systems. This user cares most about stable contracts, async workflows, and secure tokens.[cite:55][cite:89][cite:83]

## Functional requirements

### Identity and tenancy
- The platform must support users, organizations, workspaces, memberships, and roles.
- Every tenant-owned object must be scoped to a workspace or organization.
- Server-side authorization must be enforced for all protected actions.

### Actor registry
- Users must be able to create actors.
- Actors must support versions.
- Actors must support metadata, publication state, and input/output contract references.
- Actors should support a saved configuration concept comparable to task-like execution presets.[cite:53]

### Run engine
- Users and APIs must be able to start actor runs asynchronously.[cite:44][cite:56]
- Every run must have an explicit lifecycle state.
- Runs must capture logs, timestamps, initiator, actor version, and default output references.
- Runs must support failure recording, retries, and cancellation as the platform matures.

### Storage primitives
- The platform must support dataset-style structured outputs.[cite:42][cite:88]
- The platform must support key-value storage for configuration, files, and intermediate values.[cite:81][cite:87]
- The platform must support request queues for crawl/task progression.[cite:81][cite:82]
- Stored data must be accessible through the UI and API.[cite:83][cite:88]

### Scheduling and triggers
- Users must be able to schedule actor or task-like executions on cron-style intervals.[cite:86][cite:53]
- Users must be able to configure webhook-driven downstream actions or notifications based on system events.[cite:89]
- Scheduled executions must preserve a clear audit trail.

### API and integrations
- The platform must provide authenticated API access to core resources including actors, runs, datasets, stores, queues, schedules, and webhooks.[cite:83][cite:85]
- The platform should support integration-friendly workflows of run, wait, and retrieve outputs.[cite:51][cite:55]
- API tokens must be scoped and revocable.

### Console UI
- The platform must include a dashboard.
- The platform must include actor list/detail views.
- The platform must include run list/detail views with logs.
- The platform must include storage browsing and schedule management.
- The UI must reflect real backend state, not mock-only data.

### Marketplace
- The platform should allow actors to be published as reusable listings.
- Listings should support metadata, visibility, ownership, and future monetization settings.[cite:15][cite:65]
- The marketplace should remain clearly separated from private draft/internal actors.

### Billing and usage
- The platform should track usage events for runs, storage, and other metered resources.
- The platform should support plans and subscriptions.
- Billing readiness can start as metering-only before payment integration.

### Security and audit
- Sensitive actions must create audit events.
- Critical actions must be role-protected.
- Secrets must never be exposed to unauthorized users.
- Execution isolation limitations must be explicitly documented if not yet production-grade.

## Non-functional requirements

- Multi-tenant by default.
- API-first design.
- Modular architecture.
- Strong verification discipline.
- Clear observability for async jobs.
- Honest state tracking in docs.
- Safe failure handling for background execution.
- Progressive hardening from MVP to production.

## Product constraints

- Initial delivery should prioritize correctness and architecture over feature breadth.
- First milestones should focus on foundation, auth, actor registry, run engine, storage, and schedules before billing or enterprise polish.
- Features must be delivered in small verifiable loops.

## Out of scope for first MVP

- Fully hardened arbitrary untrusted code execution sandbox.
- Enterprise SSO.
- Advanced proxy fleet management.
- Full revenue-sharing payout infrastructure.
- Full no-code connector ecosystem.
- Fine-grained cost optimization tooling.

## Success indicators

- Users can create or register actors.
- Users can run actors asynchronously and observe lifecycle state.[cite:44][cite:55]
- Users can retrieve structured outputs from dataset-style storage.[cite:42][cite:88]
- Users can schedule recurring runs and trigger downstream webhook flows.[cite:86][cite:89][cite:53]
- Teams can work without cross-tenant leakage.
- The repository maintains accurate state, architecture, and task tracking files for AI-assisted delivery.[cite:52][cite:72]
