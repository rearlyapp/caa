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

| # | Screen | Route | Component | Description |
|---|--------|-------|-----------|-------------|
| 1 | **Dashboard** | `/` | `components/dashboard.tsx` | Case list table with status badges (Draft/Extracting/Reviewing/Complete), stats cards, "New Case" dialog |
| 2 | **Case View** | `/case/[id]` | `components/case-view.tsx` | Tabbed (Director 1/2) drag-and-drop upload zones for PAN, Aadhaar, Photo, Signature. Inference mode toggle (Modal GPU / Local CPU). "Process All" button with loading state |
| 3 | **Review Tool** | `/case/[id]/review` | `components/review-tool.tsx` | Split-pane: 60% document viewer (zoom/pan/rotate) + 40% editable AI-extracted fields. PAN fields (name, father's name, DOB, PAN number) and Aadhaar fields (name, number, DOB, gender, address). Name mismatch warning banner. Per-director confirm/re-extract |
| 4 | **Manual Fields** | `/case/[id]/manual` | `components/manual-fields-form.tsx` | Two-column side-by-side Director 1/2 form. Sections: Director Details (10 fields each), Company Info (8 fields), Professional Info (3 fields). Smart defaults pre-filled (Nationality=Indian, Residency=Yes, Objectives template) |
| 5 | **Export** | `/case/[id]/export` | `components/export-view.tsx` | Summary table of all fields with source tags (AI/Manual/Default). Completion progress bar. Generate & Download Excel button with success state |

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
- **Next Steps**:
    - Implement FastAPI backend wrapping Modal inference
    - Build React + Vite frontend for the Document-First workflow
