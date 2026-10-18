# Project bootstrap plan

Use this plan to reproduce the engineering approach in another workflow application.
Replace the business nouns, deployment constraints and output format before writing code.
The phases are ordered by dependency, not fixed calendar estimates. A phase is complete
only when its exit evidence exists.

Read the [engineering playbook](engineering-playbook.md) for rationale and adapt the
[instruction template](project-instructions-template.md) into the new repository.

## Phase 0: Establish the business and data boundary

Write a short project brief with the operator, task sequence, supported inputs, decisions,
output artifact, deployment audience and excluded responsibilities. Record unresolved
rules as open questions with a named decision owner; do not replace them with assumptions
inside code.

Create these working documents using synthetic examples:

- A field/output matrix: identifier, meaning, data type, units, required conditions,
  allowed source roles, destination and missing/conflict behavior.
- A scenario matrix: consistent inputs, conflicting inputs, absent inputs, unreadable
  inputs, repeated groups and stale concurrent edits.
- A data boundary: what may enter Git, tests, ordinary logs, private diagnostics and
  external model requests.
- A state model: viewing, proposing, choosing, confirming and exporting as distinct acts.

**Exit evidence:** one independently prepared expected artifact and one intentionally
inconsistent synthetic input set. The brief states exactly what a successful export means.

## Phase 1: Make the empty system reproducible

Choose the smallest architecture that fits the known constraints. This repository's
stack is a useful baseline, not a mandatory checklist:

| Concern              | Baseline here                                    | Reconsider when                                                   |
| -------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| Web UI               | React, TypeScript, Vite                          | Existing platform or product constraints suggest another frontend |
| Server state         | TanStack Query and a generated OpenAPI client    | A different framework already solves this boundary                |
| API validation       | FastAPI and Pydantic                             | Team expertise or integration constraints favor another stack     |
| Persistence          | PostgreSQL, SQLAlchemy and Alembic               | Actual data model or hosting requirements differ                  |
| Document processing  | Local PDF extraction, rendering and OCR          | Required formats or languages exceed the chosen tools             |
| Background execution | Bounded in-process runner                        | Durable recovery or multiple replicas are required                |
| Verification         | Pytest, frontend unit tests, Playwright, Compose | Equivalent tools better fit the selected languages                |

Pin dependencies with committed lockfiles. Provide placeholder-only environment
configuration, migrations, explicit reference import, health checks and local startup.
Record architectural decisions with the template linked below.

**Exit evidence:** a fresh checkout installs locked dependencies, starts a blank database,
applies migrations and returns healthy status. Setup performs no paid model calls and
does not depend on private source documents.

## Phase 2: Ship one complete deterministic workflow

Build one vertical slice through the UI, API, persistence and output adapter before
automated extraction. Enter sourced values through a controlled manual or synthetic path.
Preserve source bytes, define revision checks and establish the artifact mapping early.

Build the existing-value selector and manual override as separate recorded actions.
Server checks must enforce readiness independently of UI controls. Make downloads use
saved export records rather than rebuilding historical artifacts.

**Exit evidence:** the consistent synthetic scenario produces an artifact whose actual
fields match the independent reference. The inconsistent scenario identifies the exact
field and source, allows a recorded correction, reruns checks and produces a new artifact
without changing the older one.

## Phase 3: Add the operator interface and presentation system

Create semantic controls, typography, spacing and color tokens. Keep form state, queries
and validation in feature modules. If visual alternatives are useful, prototype them
separately; move only the selected presentation into the app without importing fixtures.

Include loading, empty, pending, error, saved and stale states. For evidence review,
synchronize the selected candidate with its preview and bound nested scrolling. Provide
clear per-record actions and translated accessible names.

**Exit evidence:** browser tests exercise the core workflow with real persistence and
generated documents. Screenshots are captured after content and PDFs finish rendering,
cover long content and narrow widths, and show usable action placement.

## Phase 4: Integrate AI behind application-owned contracts

Define nullable proposal schemas and a narrow provider interface. Supply the actual
requested fields, source identifiers and supported text/image input. Keep prompt versions,
capabilities and transport configuration explicit.

Validate schema, source evidence, normalization and domain rules separately. Keep accepted
proposals unconfirmed. Record rejected proposals with stable reasons rather than hiding
all missing results behind one generic status.

Bound job concurrency, pending work and timeouts. Define progress and interrupted-state
recovery before enabling expensive calls. Do not automatically replay paid work on restart.

**Exit evidence:** mock-transport tests cover valid proposals, missing values, wrong page,
ambiguous quotations, schema errors, stale result imports, interrupted jobs and capacity
limits. No default test or setup step uses paid credits.

## Phase 5: Evaluate the real pipeline independently

Use authorized inputs and an explicit paid-call budget when live evaluation is required.
Do not feed the expected answer into the request as if it were extracted evidence.

Keep an evaluation ledger with the following columns:

| Field         | Expected/source                | Model proposal | Guard result    | Operator action          | Exported cell | Verdict    |
| ------------- | ------------------------------ | -------------- | --------------- | ------------------------ | ------------- | ---------- |
| delivery_term | FCA / synthetic invoice p1     | FCA            | Accepted        | Chose source observation | P20: FCA      | Match      |
| currency      | EUR / synthetic invoice p1     | EUR            | Accepted        | Chose source observation | Q20: EUR      | Match      |
| total         | 1,234.50 / synthetic total row | 1,234.50       | Ambiguous quote | None                     | R20: blank    | Unresolved |

The example uses invented fields and cells, not the production layout. Separate process
success from source correctness and artifact correctness. Record manual intervention even
when it makes the final artifact correct.

**Exit evidence:** a report states which fields match, which remain unresolved, exact
configuration/prompt identifiers and every manual intervention. A discovered regression
becomes a minimal synthetic test, not a committed copy of operational documents.

## Phase 6: Harden the actual deployment boundary

Match identity and permissions to deployment needs. An internal single-operator tool
and a public multi-tenant application do not have the same requirements. Document the
boundary explicitly rather than claiming controls that are not implemented.

Exercise restart behavior, backup/restore, file retention, request limits and concurrency.
Distinguish archive, restore, record deletion and blob erasure. Keep private diagnostics
under access and retention controls. Verify an unauthenticated remote request cannot
reach an application that relies on an external access boundary.

**Exit evidence:** the chosen deployment has a tested access boundary and recovery
procedure; the limitations are written down. Only move to durable workers, replicas or
more complex persistence after requirements or measurements justify them.

## Phase 7: Package the reusable knowledge

Update the current architecture, development guide, instruction file and decision records.
Separate operational guides from implementation plans and historical experiments.
Review screenshots and binaries before allowlisting them for Git.

Commit code, migrations, locks, generated contracts, synthetic tests and reviewed guides.
Exclude local inputs, traces, credentials and output artifacts. Verify a fresh checkout
without silently copying runtime data back into it.

**Exit evidence:** another developer can identify the supported workflow, reproduce a
synthetic pass/failure flow and explain the important tradeoffs from repository files.

## Reproducible checks in this repository

These commands describe this repository. Rename paths, workspace packages and project
identifiers in a new project rather than copying incompatible commands blindly.

```bash
cp .env.example .env
make setup
git config core.hooksPath .githooks
make check
make test
npm run build
```

`make check` includes contract drift checks. When API schemas change, run
`npm run api:generate` first and commit both generated contracts. No generated file should
be edited manually to make a check pass.

For browser flow changes, follow the [isolated Compose procedure](../README.md#verification).
Use a unique project name and available loopback ports. Always stop that project's test
services in `finally`, including when startup or tests fail. Remove only disposable
volumes, never operational data. Documentation-only edits do not need new browser runs.

Before committing:

```bash
git diff --check
git diff --stat
git diff
git add <reviewed-paths>
python3 scripts/check_git_safety.py --staged
git diff --cached
git commit -m "describe the resulting behavior or documentation"
```

Replace the illustrative path and commit message. Inspect the staged snapshot rather than
assuming the working tree contains only your intended changes. Run the history scan before
pushing; a local commit and remote publication are separate actions.
