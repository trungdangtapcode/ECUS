# Repository privacy boundary

The tracked repository contains application source, synthetic tests, generic reference
definitions, dependency locks, generated API contracts and reviewed technical documentation.
It does not contain operational shipment data or a copy of the local database.

The reusable engineering playbook, bootstrap plan and instruction template are explicitly
allowlisted technical documents. They describe generic practices and synthetic examples,
not private planning history. Do not broaden the allowlist to publish historical local
notes or original source material when reusing these guides.

## Files that remain local

- `.env` and other local configuration, credentials and gateway access files.
- `example/`, `statements/` and `plan/`, including original documents and conversations.
- `.data/`, which contains uploaded evidence, AI input/output, exports and local reports.
- Historical previews and reference-board downloads under `prototypes/ui-ux/{previews,research}/`.
- Original prototype source snapshots under `.data/prototype-publish/`.
- Unreviewed historical reports and screenshots under `docs/` and root `image*.png` files.
- Database files and dumps, browser traces, archives, logs and generated build output.

These files are preserved in the workspace. Ignoring them does not delete them. A Git
clone will intentionally omit them. The two templates under `docs/templates/` are generic
blank review examples, not original customer workbooks.

The tracked `prototypes/ui-ux/` design studio uses fictional organizations, shipment
identifiers and quantities. Original local fixtures were preserved outside Git before
replacement. Its source and dependency lock are tracked; dependencies, generated builds,
browser artifacts and historical previews remain excluded.

The four reviewed PNGs under `docs/screenshots/` show the running application with
fictional cases and generated documents in an isolated environment. They contain no
operational shipment data or AI request/response logs. Additional screenshots remain
ignored until explicitly reviewed and allowlisted.

`docs/brand/` contains generated logo and cover artwork. These conceptual illustrations
are separate from application screenshots and contain no operational evidence.

## Before committing or publishing

```bash
git config core.hooksPath .githooks
python3 scripts/check_git_safety.py --staged
python3 scripts/check_git_safety.py --history
git status --short --ignored
```

The local pre-commit hook rejects ignored private paths even if force-added, recognizable
credential formats, and sufficiently long credential values from the local `.env`. It
prints affected paths and categories only. It never prints secret values. CI checks the
tracked snapshot and reachable history without requiring any private configuration.
The pre-push hook also checks reachable history before transmitting Git objects.

Pattern checks cannot establish that arbitrary document text or screenshots are anonymous.
Review new fixtures, exports and binaries before tracking them. Do not use `git add -f` to
publish local evidence. If a credential has already been published, revoke it and inspect
the repository history; adding an ignore rule does not remove existing Git objects.

`.env.example` contains empty provider credentials and explicitly local database defaults.
Set deployment secrets in local environment configuration. Never put provider keys in
`VITE_` variables: those values are exposed to the browser.
