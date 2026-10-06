# Tender Package Builder

Tender Package Builder is a local-first React/Vite workspace for turning a tender requirements JSON file and a folder of PDFs into one ordered, submission-ready PDF package.

## What it does

- Loads and validates a tender definition from `requirements.json`.
- Accepts PDF files locally in the browser, with a 30-file / 50 MB total guardrail.
- Reads PDF page counts and rejects corrupt or password-protected files with an inline error state.
- Detects duplicate documents using browser SHA-256 content hashes, so renamed copies are still identified.
- Suggests matches by filename, while keeping one requirement-to-one-file matching explicit and editable.
- Tracks `Missing`, `Expiry date needed`, `Expired`, `Not provided`, and `OK` statuses.
- Blocks generation until every mandatory requirement has a valid match and required expiry dates are present.
- Generates a cover page, document index, ordered source pages, and a footer such as `T-2026-0417 | Page 3 of 16`.
- Provides an in-browser PDF preview, review modal, CSV export, download, and English/Bangla UI copy.
- Keeps document processing in the browser; there is no backend, upload endpoint, or external document service.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the local Vite URL in a current Google Chrome window. Use `sample/requirements.json` and the files in `sample/pdfs/` for the seeded demo flow.

For a production build:

```bash
npm run build
npm run preview
```

The `dist/` folder is a static deployment artifact. It can be hosted on any static file host that serves the app over HTTPS.

## Demo assets

The sample tender is `T-2026-0417` with eight mandatory documents and one optional document. The sample PDF pack intentionally includes:

- one valid and one expired Trade License PDF;
- a two-page TIN certificate, VAT certificate, bank solvency certificate, technical proposal, and financial proposal;
- a two-page Experience Certificate plus an identical renamed duplicate;
- a signed declaration.

Regenerate the sample documents and deterministic sample output with:

```bash
npm run sample:pack
npm run sample:output
```

The generated package is saved to `output/T-2026-0417_Package.pdf`.

Visual QA captures are kept in `screenshots/main-dashboard.png` and `screenshots/document-statuses.png`.

## Requirements file shape

```json
{
  "tender": {
    "tender_id": "T-2026-0417",
    "title": "Supply of IT Equipment",
    "procuring_entity": "Directorate of Sample Services",
    "bidder": "Meghna Tech Solutions Ltd.",
    "submission_deadline": "2026-10-20"
  },
  "requirements": [
    {
      "id": "R01",
      "order": 1,
      "title_en": "Trade License",
      "title_bn": "ট্রেড লাইসেন্স",
      "mandatory": true,
      "has_expiry": true
    }
  ]
}
```

Requirement IDs must be unique. `order` controls the final package order; the UI sorts numerically even if the JSON array is not sorted. Optional requirements can be left unprovided without blocking generation.

## Project structure

```text
src/
  App.jsx                    app state, workflow, matching, generation
  components/                onboarding, rail, requirement cards, health, review, preview
  lib/validation.js          requirements validation, statuses, hashes, suggestions
  lib/pdf.js                 PDF inspection, preview rendering, package generation
  lib/i18n.js                English and Bangla UI copy
sample/
  requirements.json          seeded tender definition
  pdfs/                      seeded sample PDFs
scripts/                     sample PDF and output generators
output/                      generated package artifacts
screenshots/                 QA screenshots
```

## Verification

The project was verified with `npm run build`, a live browser smoke test covering JSON loading, PDF upload, page-count extraction, duplicate detection, matching, and dashboard rendering, plus the generated sample package in `output/`.
