# ACCEPTANCE_CRITERIA.md

## Purpose

This file defines what "done" means for core platform capabilities. A feature is not complete when only UI exists or only schema exists; it is complete when storage, backend logic, authorization, and verification all align.

## Global completion rules

A feature is only considered done when all of the following are true:

- The implementation exists in code.
- The implementation is wired end-to-end where relevant.
- Authorization is enforced server-side.
- Tenant scoping is enforced for tenant-owned data.
- Validation exists for external inputs.
- Required migrations are applied or generated where relevant.
- Relevant tests or verification checks have been run.
- Project docs are updated to reflect the feature truthfully.

## Feature: Workspace-aware authentication

### Done when
- A user can authenticate successfully.
- Authenticated identity is available to protected backend routes.
- Unauthorized requests are rejected.
- Workspace or organization context is resolved safely.
- Membership/role checks are enforced on protected actions.
- Verification includes at least one successful and one unauthorized path.

## Feature: Create actor

### Done when
- Authenticated user can create an actor in an allowed workspace.
- Actor is stored with ownership and tenant scoping.
- Input validation rejects invalid payloads.
- Actor appears in UI or API list after creation.
- Unauthorized users cannot create actors in another tenant.
- Tests or verification cover success and authorization failure.

## Feature: Version actor

### Done when
- An existing actor can receive a new version.
- Version metadata is persisted.
- Actor and version relationship is documented and queryable.
- Invalid or unauthorized version creation is rejected.
- UI/API can identify the latest and specific versions.

## Feature: Start actor run

### Done when
- Authenticated caller can start a run for an allowed actor/version.[cite:44][cite:56]
- Run record is created with initial lifecycle state.
- The run enters queue/processing flow, not only DB creation.
- Initiator, tenant scope, actor version, and timestamps are recorded.
- Unauthorized start attempts are rejected.
- Verification proves run creation and status visibility.

## Feature: Run lifecycle tracking

### Done when
- Run states are explicit and finite.
- State transitions are visible in persistence.
- Success and failure paths are both represented.
- Logs or status messages are persisted sufficiently for debugging.
- UI/API reflect the actual stored status, not guessed state.
- Verification covers at least one terminal success or failure path.

## Feature: Dataset output storage

### Done when
- A run can persist structured output rows into a dataset-like storage object.[cite:42][cite:88]
- Dataset rows are tenant-scoped.
- Dataset can be retrieved through API or UI.
- Empty dataset and populated dataset states are both handled.
- Unauthorized access to another tenant's dataset is rejected.

## Feature: Key-value storage

### Done when
- The system can persist and retrieve named records in a key-value store.[cite:81][cite:87]
- Records are tenant-scoped.
- Records support at least JSON-safe values or documented file/blob strategy.
- Missing keys return a defined not-found behavior.
- UI/API access is backed by actual storage, not placeholders.

## Feature: Request queue

### Done when
- The system can create a request queue and enqueue work items.[cite:81][cite:82]
- Queue items can be claimed or progressed by worker logic.
- Queue visibility exists through API or admin/debug surface.
- Queue access is tenant-scoped.
- Duplicate/invalid queue inputs are handled or documented.

## Feature: Schedule execution

### Done when
- A user can create a schedule with a cron-like definition.[cite:86][cite:53]
- The schedule is stored and can be enabled/disabled.
- A scheduler path actually triggers the intended run flow.
- Triggered runs preserve audit context and target references.
- Invalid schedule expressions are rejected or validated clearly.
- Verification proves at least one triggered execution path.

## Feature: Webhook action or notification

### Done when
- A webhook can be registered for supported events.[cite:89]
- Event dispatch is tied to actual state changes, not mock-only behavior.
- Delivery attempts are logged or traceable.
- Invalid destination or payload handling is defined.
- Webhook secrets/signing or limitations are documented.

## Feature: Actor/task preset execution

### Done when
- A saved execution preset can store actor input and run defaults similar to task-like execution recipes.[cite:53]
- The preset can be reused manually or by schedule.
- The preset is tenant-scoped and auditable.
- Overrides are handled safely.

## Feature: API token access

### Done when
- API tokens can be created securely.
- Tokens are scoped and revocable.
- Token-protected endpoints authenticate correctly.
- Tokens are never fully exposed after creation where possible.
- Verification includes success and revoked/invalid token cases.

## Feature: Marketplace listing

### Done when
- An actor can be published as a listing distinct from private draft state.
- Listing metadata is queryable.
- Ownership and visibility rules are enforced.
- Marketplace browse endpoints or UI show only intended listings.
- Publish/unpublish flows are auditable.

## Feature: Audit logging

### Done when
- Critical actions create audit events.
- Audit events include actor/user/action/time context.
- Audit views or retrieval endpoints are role-protected.
- At least auth-sensitive and run-sensitive operations are logged.

## Feature: Billing and usage metering

### Done when
- Meterable events are recorded for runs and relevant resources.
- Usage can be summarized by tenant or plan boundary.
- Metering data is separated from payment processing concerns.
- Limitations are documented if enforcement is not yet active.

## Verification note

When a feature does not yet meet all criteria, docs must say so explicitly in `STATE.json`, `TODO.md`, and `KNOWN_ISSUES.md`. This is required to keep AI-driven delivery honest and verifiable.[cite:52][cite:72]
