# Reusable project instructions

Use this as a starting point for another repository's `AGENTS.md` and architecture
decisions. Replace bracketed values, remove inapplicable rules and verify every command
before adopting it. These are proposed instructions for a new project; they do not change
the conventions or supported scope of this application.

The [playbook](engineering-playbook.md) explains the choices and the
[bootstrap plan](project-bootstrap-plan.md) sequences implementation.

## Copy-ready AGENTS.md starting point

```markdown
# Repository conventions

## Product and authority

- Implement [operator] → [workflow] → [output]. Keep [excluded responsibilities] outside scope.
- Use docs/runtime-architecture.md for current behavior. Label future work as proposed.
- Write interface copy for the person operating the product. Keep delivery discussions,
  private communications and development milestones out of labels and generated notices.
- Define what viewing, choosing, confirming and exporting mean. Do not imply legal or
  authenticated approval unless the application actually implements those controls.

## Source and state

- Preserve original inputs and source provenance. Record corrections and supersession
  without overwriting evidence.
- Keep AI proposals, source choices and manual values distinguishable.
- Enforce invariants and export readiness on the server. Check input revisions and reject
  stale writes; input or rule changes invalidate dependent confirmation.
- Save output snapshots with their input, policy, template and mapping versions.
  Downloading an older output must not recompute it from current state.

## Code organization

- Use [source language] for identifiers, comments and technical documentation.
- Keep HTTP parsing in routers, business rules in feature services/domain functions,
  and external mechanics in database/storage/provider adapters.
- Use application-owned provider contracts. Keep transport-specific types out of business code.
- Add shared abstractions only when a concrete need exists. Prefer explicit functions
  and transaction ownership over a generic framework for every feature.
- Keep one database session per request or job transaction; do not share sessions
  between concurrent tasks. Use [migration tool] for persisted schema changes.

## Frontend and contracts

- Keep pages, queries and form state together under [feature directory].
- Use [generated contract command] after API schema changes and commit generated outputs.
  Never hand-edit generated contracts or duplicate server reference allowlists.
- Put user-facing text in [locale resources]; align keys/interpolation, use locale-aware
  formatting and render API errors by stable code with a safe fallback.
- Keep design tokens and layouts in [presentation boundary]. Do not fork business state,
  remount active forms for theme changes or import prototype fixtures into live features.
- Test loading, empty, error, conflict, pending and saved states for changed workflows.

## Configuration and external work

- Store credentials, endpoints, model selection, ports and limits in validated settings.
  Browser configuration is public and must never contain secrets.
- Keep reference choices and policies in [explicit data source] with versioned imports.
  Treat supplied examples as examples rather than authoritative datasets.
- Use [runner type] with [deployment constraint]. Define concurrency, timeouts, progress,
  deduplication, interruption and retry behavior before adding expensive work.
- Do not silently replay paid requests. Tests mock external paid transport by default.
- Validate model schema, source evidence and domain meaning separately. Model confidence
  cannot confirm a value or authorize output.

## Privacy and verification

- Keep private source data, credentials, full request/response bodies, exports and database
  snapshots out of Git and routine logs. Private diagnostics require access/retention rules.
- Use synthetic test data. Do not publish operational screenshots or fixtures without review.
- Run [lint/type/contract checks], [tests] and [build] appropriate to the change.
- Run browser tests against [isolated environment] for operator-flow changes. Assert the
  downloaded artifact and wait for rendered evidence before taking screenshots.
- Stop only this project's test resources in finally, including on failure. Preserve
  operational volumes and unrelated projects.
- Report which assertions passed and which fields or workflows remain unchecked.
  Distinguish mock verification, live extraction, manual correction and artifact comparison.
- Review staged files and run [privacy scan] before committing. Do not bypass ignore
  rules to publish local evidence. Pushing is a separate publication action.
```

Keep the adopted file short enough to remain useful. Put long rationale and examples in
linked documentation instead of repeating the entire playbook in instructions.

## Architecture decision record template

Create a record when a choice changes operational guarantees or has meaningful alternatives.
Do not create one for every helper function. Keep the record free of credentials and
private source content.

```markdown
# ADR-NNN: [Concrete decision]

Status: Proposed | Accepted | Superseded
Date: [YYYY-MM-DD]
Owner: [Maintaining role]
Supersedes: [Record, if any]

## Context

[Business need, workload, deployment constraints and evidence.]

## Decision

[Chosen implementation and its scope.]

## Alternatives

[Credible alternatives and why they do not currently fit.]

## Guarantees and limits

[What this enables, what it cannot guarantee, and the operational cost.]

## Verification

[Tests, measurements or recovery exercise that support the decision.]

## Revisit when

[Observable trigger, such as multiple replicas, restart recovery requirements,
queue wait time, aggregate growth or an external access requirement.]
```

For example, an in-process runner decision must explicitly state the one-process limit,
interrupted-job behavior and lack of durable queue guarantees. “It is simpler” alone is
not enough to explain the tradeoff.

## Feature planning worksheet

Before implementing a feature, answer these in its issue or short plan:

1. What operator problem is solved, and what behavior changes?
2. Which invariant, source material and historical output must remain unchanged?
3. What schema, migration, reference or generated contract changes are needed?
4. Where are the transaction and concurrency boundaries?
5. What are the empty, invalid, stale, interrupted and failed outcomes?
6. How will the operator identify the source and recover from the failure?
7. What is the smallest independent test or artifact comparison that proves the behavior?
8. Does verification consume credits, expose data or change an operational environment?
9. What evidence will the final report include, and what remains outside the claim?

Use the answers to implement one complete slice. Update the plan when the actual design
changes; do not leave abandoned approaches presented as current architecture.
