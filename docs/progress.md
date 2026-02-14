# Project Progress

## 2026-02-13 20:54:08 +05:30
- **Requirements defined**: Finalized `requirements.md` for the Company Formation Workflow Automation tool.
- **Model extraction validated**: Successfully ran `Qwen/Qwen3-VL-2B-Instruct` on Modal (T4 GPU).
    - Achieved **<15s latency** per document (warm start).
    - Verified extraction accuracy for PAN and Aadhaar (Name, DOB, Numbers, Address).
- **Environment setup**:
    - Created `docs/` directory to track project documentation.
    - Confirmed local CPU execution is feasible but slow (~60-90s).
- **Next Steps**:
    - Design and implement the Backend API (FastAPI) to wrap Modal inference.
    - Develop the React-based Web UI for the "Document-First" workflow.

## 2026-02-14 12:49:00 +05:30
- **Spec & Plan created**: Wrote comprehensive `docs/spec.md` covering:
    - Full workflow specification (7-step: Create → Upload → Extract → Review → Manual → Generate → Download)
    - UX specification for 5 screens (Dashboard, Case View, Review Tool, Manual Form, Export)
    - Excel checklist mapping: 6 auto-populated fields (AI) + 26 manual-entry fields across 32 rows
    - Performance comparison table: Modal T4 (validated ✅) vs Local CPU (pending ⏳)
- **Source validation**: Confirmed Modal benchmarks from prior session:
    - Warm: ~18s total (PAN: 12.3s, Aadhaar: 6.4s), Cold: ~43s, Accuracy: 6/6 fields
    - Discarded approaches: PaddleOCR-VL (460s), PaddleOCR v3 (hung), Tesseract (poor accuracy)
- **Local CPU test**: `test_qwen.py` and model files (`models/Qwen3-VL-2B-Instruct/` ~4GB) ready, **not yet benchmarked**
- **Next Steps**:
    - Run `python test_qwen.py` to capture local CPU inference time
    - Implement FastAPI backend wrapping Modal inference
    - Build React + Vite frontend for the Document-First workflow

## 2026-02-14 — Frontend UI Screens Built (Next.js + shadcn/ui)
- **UI Framework chosen**: Next.js 16 App Router + shadcn/ui + Tailwind CSS v4
    - Lightweight, reliable, robust, flexible, and professional-grade
    - shadcn/ui provides accessible Radix-based components with full customization
    - SWR for data fetching/caching, Lucide React for icons
- **All 5 screens implemented** per the UX Specification in `docs/spec.md`:

| #   | Screen            | Route               | Component                           | Description                                                                                                                                                                                                                                                    |
| --- | ----------------- | ------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Dashboard**     | `/`                 | `components/dashboard.tsx`          | Case list table with status badges (Draft/Extracting/Reviewing/Complete), stats cards, "New Case" dialog                                                                                                                                                       |
| 2   | **Case View**     | `/case/[id]`        | `components/case-view.tsx`          | Tabbed (Director 1/2) drag-and-drop upload zones for PAN, Aadhaar, Photo, Signature. Inference mode toggle (Modal GPU / Local CPU). "Process All" button with loading state                                                                                    |
| 3   | **Review Tool**   | `/case/[id]/review` | `components/review-tool.tsx`        | Split-pane: 60% document viewer (zoom/pan/rotate) + 40% editable AI-extracted fields. PAN fields (name, father's name, DOB, PAN number) and Aadhaar fields (name, number, DOB, gender, address). Name mismatch warning banner. Per-director confirm/re-extract |
| 4   | **Manual Fields** | `/case/[id]/manual` | `components/manual-fields-form.tsx` | Two-column side-by-side Director 1/2 form. Sections: Director Details (10 fields each), Company Info (8 fields), Professional Info (3 fields). Smart defaults pre-filled (Nationality=Indian, Residency=Yes, Objectives template)                              |
| 5   | **Export**        | `/case/[id]/export` | `components/export-view.tsx`        | Summary table of all fields with source tags (AI/Manual/Default). Completion progress bar. Generate & Download Excel button with success state                                                                                                                 |

- **4 API routes** created (mock backend, ready for real Modal integration):
    - `GET/POST /api/cases` — list and create cases
    - `GET/PATCH/DELETE /api/cases/[id]` — case CRUD
    - `POST /api/extract` — mock AI extraction (simulates 2s delay, returns demo data)
    - `POST /api/export` — mock Excel generation (simulates 1.5s delay)
- **Shared infrastructure**:
    - `lib/types.ts` — full TypeScript types for Case, Director, PanData, AadhaarData, CompanyInfo, ProfessionalInfo
    - `lib/store.ts` — in-memory store with 3 seeded demo cases
    - `lib/utils.ts` — `cn()` class merge utility
    - 10 shadcn/ui components: Button, Badge, Card, Input, Label, Textarea, Dialog, Tabs, Progress, Separator
- **Design system**: Professional blue (#1a6ed8) primary, clean neutral palette, Inter + JetBrains Mono fonts, light/dark theme tokens
- **Next Steps**:
    - Connect mock API to real Modal GPU inference endpoint (FastAPI wrapper)
    - Implement real file upload storage
    - Add openpyxl Excel generation in export API
    - Add authentication for multi-user access

## 2026-02-14 12:59:00 +05:30
- **CPU benchmark completed** (`test_qwen.py`):
    - Model load: **2.8s** (from local `./models/Qwen3-VL-2B-Instruct`)
    - PAN inference: **71.5s** — 4/4 fields correct ✅
    - Aadhaar inference: **89.2s** — 5/5 fields correct ✅
    - Total (2 docs): **160.8s**
    - Accuracy: **100%** (name, father's name, DOB, PAN, Aadhaar no., address all correct)
- **Performance comparison** (Qwen3-VL-2B-Instruct):
    | Metric            | Modal T4 (fp16) | Local CPU (fp32) | Ratio |
    | ----------------- | --------------- | ---------------- | ----- |
    | PAN inference     | 12.3s           | 71.5s            | 5.8x  |
    | Aadhaar inference | 6.4s            | 89.2s            | 13.9x |
    | Total (2 docs)    | ~18s            | 160.8s           | 8.9x  |
    | Accuracy          | 6/6 ✅           | 9/9 ✅            | Equal |
- **Excel template generator** created: `generate_checklist.py`
    - Produces version-controlled `.xlsx` from code
    - 37 rows, 4 columns, proper styling and formatting
    - Pre-fills company objectives text
    - Implement FastAPI backend wrapping Modal inference
    - Build React + Vite frontend for the Document-First workflow

## 2026-02-14 17:00:00 +05:30 (Deployment & Backend Analysis)
- **Local Docker Deployment Completed**:
    - Created `Dockerfile` for Next.js frontend (multi-stage build, `node:20-alpine`).
    - Created `docker-compose.yaml` for local orchestration (exposes port 3000).
    - Updated `next.config.mjs` for standalone output.
    - Resolved build context size issue by temporarily relocating 13GB of data (`venv`, `models`).
    - Fixed Node.js version requirement (Next.js requires >= 20.9.0).
    - Fixed missing `public` directory build error.
    - Verified frontend availability at `http://localhost:3000` (HTTP 200).
- **Backend Integration Analysis Completed**:
    - Identified gap between mock frontend and real backend execution.
    - Created **[Backend Connection Report](backend_integration_report.md)** detailing proxy logic and endpoint requirements.
- **Full Stack Deployment Completed**:
    - **Frontend**: Running on port 3000 (Node 20 container).
    - **Backend**: Running on port 8000 (Python 3.12 container using mounted host `venv`).
    - **Optimization**: Switched backend to use host's virtual environment to skip massive dependency downloads (900MB+ PyTorch).
    - **Verification**: Confirmed backend startup and health endpoint accessibility.
- **Next Steps**:
    - User can now perform end-to-end extraction testing at `http://localhost:3000`.
    - Monitor model loading performance on first request.

## 2026-02-14 20:10:06 +05:30 (Auto-Extraction UX + Modal Testing Readiness)
- **Upload & extraction UX redesigned** (`components/case-view.tsx`):
    - PAN/Aadhaar extraction now starts automatically immediately after file selection (no mandatory "Process All" step).
    - Added **dual progress indicators**:
        - Upload readiness (how many required KYC docs are uploaded)
        - Extraction completion (how many KYC docs are extracted)
    - Added **per-director, per-document status lines** below upload items (queued / processing / done / error with message/latency).
    - Kept "Reprocess Uploaded Docs" action for manual retries:
        - **Modal mode** executes reprocess in parallel.
        - **CPU mode** executes reprocess sequentially for stability.
- **Visual upload feedback improved** (`components/upload-zone.tsx`):
    - Image thumbnail preview shown in place after selection.
    - Status text shown directly on each uploaded tile.
- **Manual form redesigned from input wall to guided flow** (`components/manual-fields-form.tsx`):
    - Introduced a 4-step progressive form:
        1. Director 1
        2. Director 2
        3. Company
        4. Professional
    - Added step progress bar and clickable step chips.
    - Grouped company details into sections (Office & Contact, Capital, Objectives) for better readability.
- **Backend robustness for file types and quality**:
    - Local backend already supports PDF->image conversion and preprocessing (resize + contrast).
    - Added better extraction route metadata forwarding and fallback messaging in Next API route.
- **Modal implementation test-ready updates** (`modal_extract.py`):
    - Added `api_extract` HTTP endpoint via `@modal.web_endpoint(method="POST")`.
    - Endpoint returns normalized `extracted_data` payload compatible with frontend API route.
    - Note: endpoint currently expects image payloads; local backend handles PDF conversion.
- **Warm model / performance notes**:
    - Local CPU stays warm by loading model once on FastAPI startup.
    - Modal keeps warm containers via `scaledown_window` and preloaded model image cache.

## 2026-02-14 20:10:06 +05:30 (Follow-up: PDF parity + Form UX)
- **Modal extraction parity improved** (`modal_extract.py`):
    - Added PDF support in Modal extraction path (first-page render via `pypdfium2`).
    - Added image preprocessing in Modal path (EXIF normalize, resize cap, contrast enhancement), matching local backend quality controls.
    - Increased Modal warm retention (`scaledown_window`) to 600s for faster repeated requests.
- **Case upload flow updated** (`components/case-view.tsx`):
    - Auto extraction now triggers per PAN/Aadhaar upload event with per-item progress messages shown under each director panel.
    - "Reprocess Uploaded Docs" now:
        - parallel in Modal mode
        - sequential in CPU mode
- **Manual form UX updated** (`components/manual-fields-form.tsx`):
    - Replaced large input wall with guided 4-step flow and progress indicator for a Jotform/Typeform-like experience.

## 2026-02-14 20:28:15 +05:30 (Modal-Only Mode Activation)
- **Extraction path finalized to Modal-only**:
    - `app/api/extract/route.ts` now requires `MODAL_API_URL` and always calls Modal web endpoint.
    - Removed CPU/local fallback from extraction API route for deterministic behavior.
    - Case metadata now consistently persists `inferenceMode: "modal"`.
- **Frontend aligned with Modal-only UX**:
    - `components/case-view.tsx` now shows static `Modal GPU` mode and no mode toggle.
    - Reprocess action runs parallel extraction for uploaded PAN/Aadhaar documents.
    - Upload flow remains auto-upload + auto-extract with per-item status/progress messaging.
- **Review flow aligned**:
    - `components/review-tool.tsx` re-extract now calls `/api/extract` without mode selection.
- **Config cleanup**:
    - `.env.example` updated to require only `MODAL_API_URL`.
    - `.gitignore` updated with `.next/`.
- **Verification**:
    - Production build completed successfully (`npm run build`).
    - Modal CLI profile is available via project venv (`venv/bin/modal profile list` -> `rearlyapp`).
- **How prior Modal script worked**:
    - It used the authenticated Modal profile token already stored on this machine.
    - `modal run modal_extract.py ...` invoked remote `Extractor` methods using that profile, so no re-login prompt appeared.
- **Immediate required user input**:
    - Provide deployed endpoint URL for `MODAL_API_URL` in `.env.local`.
    - If URL is not available, next command is `venv/bin/modal deploy modal_extract.py` to create/update it.

## 2026-02-14 20:32:51 +05:30 (Modal Endpoint Deployed + Smoke Tested)
- **Modal deployment executed successfully**:
    - Ran `venv/bin/modal deploy modal_extract.py`.
    - Deployment URL created: `https://rearlyapp--caa-doc-extractor-api-extract.modal.run`.
    - App dashboard: `https://modal.com/apps/rearlyapp/main/deployed/caa-doc-extractor`.
- **Local env wired for app integration**:
    - Created `.env.local` with:
      - `MODAL_API_URL=https://rearlyapp--caa-doc-extractor-api-extract.modal.run`
    - Updated `.gitignore` to ignore `.env.local`.
- **Endpoint verification completed**:
    - Sent direct POST request with `pan.jpg` payload to deployed endpoint.
    - Response: HTTP 200, valid normalized PAN output.
    - Inference time from endpoint response: **~12.0s** (`elapsed: 11.9752`).
- **Compatibility note**:
    - Modal CLI emitted a deprecation warning: `@modal.web_endpoint` renamed to `@modal.fastapi_endpoint`.
    - Current deployment works; decorator rename can be done in next cleanup pass.

## 2026-02-14 21:00:00 +05:30 (In-Place Review UX + Extraction Race Fix)
- **Primary UX issue addressed (no next action after processing)**:
    - Reworked `components/case-view.tsx` to add **in-place verification** per director on the same page.
    - After extraction, user can now:
      - preview PAN/Aadhaar source document in-page,
      - edit extracted fields directly,
      - re-extract selected document,
      - approve director without switching to `/review`.
- **PDF preview support added in verification flow**:
    - Inline preview supports both image (`<img>`) and PDF (`<iframe>`) rendering.
    - Added large preview dialog with image/PDF rendering for easier validation.
    - `components/upload-zone.tsx` now shows PDF-specific icon on pending upload tiles.
- **Workflow gating improved**:
    - Added “Continue to Manual Fields” CTA in case page footer, enabled only when both directors are approved.
    - Added explicit helper text that review now happens in place.
- **Backend reliability fix for parallel extraction** (`app/api/extract/route.ts`):
    - Fixed stale-state overwrite during parallel document extraction by merging updates against latest case state before write.
    - Director approval is reset when PAN/Aadhaar is re-uploaded or re-extracted.
    - Case status computation now marks `reviewing` only when all four required PAN/Aadhaar docs are uploaded and done.
- **Build verification**:
    - `npm run build` completed successfully after changes.

## 2026-02-14 21:02:09 +05:30 (Parallel Extract Re-Verification)
- **Race-condition fix validated against live dev server**:
    - Started app on `http://localhost:3010`.
    - Created a fresh case through API and uploaded 4 core docs (PAN/Aadhaar x 2 directors).
    - Triggered 4 extraction calls in parallel (`/api/extract`).
- **Observed results**:
    - All four requests returned HTTP 200 with extraction latency ~8-9s each.
    - Final case status transitioned to **`reviewing`** (previously could get stuck at `extracting`).
    - Final doc statuses for both directors: `{ pan: done, aadhaar: done }`.
- **Conclusion**:
    - Parallel completion no longer overwrites prior extraction state.
