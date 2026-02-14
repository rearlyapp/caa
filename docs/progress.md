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
