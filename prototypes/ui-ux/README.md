# Customs design studio

Three interactive presentation alternatives for the pre-declaration document workflow:
**Harbor**, **Control**, and **Ledger**. They share shipment selection, navigation,
review notes and consolidated form state while varying layout, density and visual treatment.
Each design includes a landing page, overview, documents, reconciliation, consolidation
and review screen.

This is a standalone visual prototype. The operational application is in `apps/web`.
The three fixture scenarios are fictional, including organizations, identifiers,
quantities and reconstructed document excerpts. No original shipment documents are bundled.

## Run

From this directory, inside the repository checkout:

```bash
npm ci --workspaces=false
npm run dev
```

Open `http://localhost:5174/`. The prototype imports shared Vietnamese copy from
`apps/web/src/locales/vi.json`; keep the repository directory structure intact.
Set `VITE_PRODUCT_URL` in a local `.env.local` to optionally link to the operational app.
This link does not transfer fixture data.

| Design  | URL                               | Presentation                                                                |
| ------- | --------------------------------- | --------------------------------------------------------------------------- |
| Harbor  | `/?design=harbor&screen=landing`  | Coastal teal, port photography, maritime details and a guided reading flow. |
| Control | `/?design=control&screen=landing` | Indigo light, layered documents and a compact evidence workspace.           |
| Ledger  | `/?design=ledger&screen=landing`  | Ivory paper, ruled registers, serif headings and dense forms.               |

Use the gallery to enter a design, or switch A/B/C from the toolbar without discarding
current form edits. The toolbar also provides theme controls and locally stored design
ratings. Reduced-motion preferences disable decorative transitions.

## Main adaptation points

| Concern                                         | Location                                           |
| ----------------------------------------------- | -------------------------------------------------- |
| Design registry, colors, typography and density | `src/config/designs.ts`                            |
| Editable form fields                            | `src/config/forms.ts`                              |
| Shared interaction and persistence              | `src/state/StudioContext.tsx`                      |
| Fictional shipment scenarios                    | `fixtures/cases.json`                              |
| Views and layout variants                       | `src/views/`, `src/art-direction.css`              |
| Shared controls and decorative artwork          | `src/components/`                                  |
| Shared localized copy                           | `../../apps/web/src/locales/{en,vi}.json`          |
| Stock image provenance                          | `src/config/media.ts`, `src/assets/ATTRIBUTION.md` |

Keep data and form state shared between designs. Do not copy this fixture adapter into
operational application features or treat its procedure/HS examples as an authoritative
reference dataset.

## Scope

- Navigation, search, filtering, theme editing, source selection and draft editing are interactive.
- Changes and design ratings persist in this browser's local storage; they are not sent to a server.
- Intake stages filenames only. A separate source viewer can display a PDF selected locally;
  its contents stay in browser memory for that session.
- Reconstructed excerpts, extraction results and findings are fictional. Viewing a PDF
  does not establish that fixture values match it.
- AI calls, OCR, backend validation, workbook generation and declaration transmission are not implemented here.
- Prototype controls cannot approve a real case or authorize an Excel export.

## Verification

```bash
npm run build
npx playwright install chromium
npm test
```

Browser tests cover the three designs, desktop/mobile layouts, navigation, persisted
edits, evidence viewing, blocked prototype exports, theme controls and reduced motion.
They use generated PDFs and fictional fixtures; no paid AI calls or application database
are involved. Generated screenshots are written under `test-results/previews/`.

Historical previews and reference-board downloads remain local and are excluded from Git.
The tracked port photograph retains its source attribution in `src/assets/ATTRIBUTION.md`.
