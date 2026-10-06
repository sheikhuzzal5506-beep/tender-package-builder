# Tender Package Builder

Frontend-only AI DevFest Tender Document Package Builder. Processes requirements and PDFs locally in the browser.

## Run

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Core features

- Load and validate `requirements.json`
- Upload up to 30 PDFs / 50 MB total
- Browser-side page counting with PDF.js
- SHA-256 duplicate detection using Web Crypto
- One-to-one requirement/document matching
- Expiry validation against submission deadline
- Exact required status model
- Browser-side PDF merge and cover creation with pdf-lib
- Exact requirement ordering and page footers
- English/Bangla UI
- No backend or remote document storage
- Public static hosting compatible

## Contest notes

The generated package uses `<tender_id>_Package.pdf`. The cover is English as required by the problem statement. Optional unmatched documents are skipped. Core validation is deterministic and independent of AI.
