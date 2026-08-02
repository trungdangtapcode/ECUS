# Runtime architecture

The current workflow is documents → extraction → reconciliation → consolidation → Excel
template export. The application is a modular monolith with a React/TypeScript frontend,
a FastAPI backend and PostgreSQL persistence. Harbor is the product presentation.

## Boundaries

- HTTP routers validate requests and call feature services. Services own business
  decisions and database transactions. Storage and AI adapters stay behind narrow
  application contracts.
- Reference procedure profiles come from the database/API. The checked-in reference
  definitions are implementation examples, not an authoritative legal dataset.
- Source documents are immutable. Observations retain file, physical page, exact quote
  and provenance. Revisions protect concurrent edits and invalidate stale approvals.
- The generated OpenAPI snapshot and TypeScript client are committed together.
  Run `npm run api:generate` after changing an API schema.

## Extraction and review

The AI transport implements an OpenAI-compatible interface. Endpoint, credentials, model
selection, image support and limits come from settings. Versioned prompts and field
descriptions are separate from transport code. Provider output is validated against the
application schema and source evidence; valid JSON alone does not establish correctness.

Local Tesseract OCR handles scans and retains word positions. Whole-set processing uses
a bounded in-process job runner, records progress and imports proposals under revision
checks. Run one API process/replica. Interrupted jobs require an explicit retry; the
application does not silently repeat paid requests after restart.

Operators compare evidence, choose an existing value or enter a different consolidated
value, and explicitly confirm their review. Choosing a source in either reconciliation
panel synchronizes the candidate value and PDF viewer. Viewing a document alone does not
save a decision. Source-value copies retain the exact observation identifier; manual
edits remain distinct. Both preserve original proposals and decision history.

## Excel output

Versioned layouts map fields to workbook cells and repeated goods/container groups.
XLSX and native XLS exports preserve supported layout properties. The configured form
must be imported from an authorized local copy; original populated workbooks are never
distributed with this repository. Imports sanitize shipment values rather than treating
them as defaults.

Confirmed values populate mapped targets. Unconfirmed fields remain blank and red in
review drafts. Draft export is distinct from completion approval. Export records retain
the policy, layout, review revision, values and source provenance used at that time.
Downloading an older export does not recompute it from current case state.

## Deployment and verification

Compose supplies PostgreSQL, explicit Alembic/reference initialization, one API instance
and a frontend reverse proxy. The default host binding is loopback. An optional password
gateway can protect review access; the application does not implement individual accounts
or role-based authorization. Do not expose the unauthenticated API publicly.

Unit/API tests use synthetic documents and mocked AI transport. Browser tests use the
isolated Compose override and a local AI stub, never paid provider requests. Stop this
project's test services after every run, including failures. Preserve operational volumes;
remove volumes only for disposable test projects.

The application does not submit declarations to customs, certify legal correctness or
establish formal business approval. See [development](development.md) for conventions
and [repository privacy](repository-privacy.md) for the publication boundary.
