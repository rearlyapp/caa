# Requirements: Company Formation Workflow Automation

## 1. Overview
Develop a "Document-First" workflow automation tool for Chartered Accountant (CA) firms to streamline the Company Formation process. The system automates the ingestion of KYC documents (PAN, Aadhaar) using Generative AI (Qwen3-VL-2B via Modal), allows user validation, and auto-populates the required "Checklist for Company Formation" Excel files.

## 2. Functional Requirements

### 2.1 Workflow Usage
1.  **Upload**: User uploads batch of documents (PAN, Aadhaar, Photos) for all directors.
2.  **Process**: System identifies document type and extracts data in background.
3.  **Validate**: User reviews extracted data in a side-by-side view (Document vs Data).
4.  **Generate**: System populates the specific Excel template for Company Formation.

### 2.2 Input Handling
- **Documents**: PAN Card, Aadhaar Card.
- **Preprocessing**: 
    - Auto-resize high-resolution images (e.g., PAN > 4MP) to optimize VLM token usage and latency.
    - Contrast enhancement for noisy backgrounds.

### 2.3 Data Extraction (AI)
- **Primary Engine**: `Qwen3-VL-2B-Instruct` on **Modal (NVIDIA T4)**.
- **Performance Target**: < 15 seconds per document.
- **Fallback**: Local CPU execution (only if explicitly enabled, expects ~60-90s latency).

### 2.4 User Interface (UX)
- **Framework**: React-based Web UI (e.g., Refine.dev or simple React + Vite).
- **Core Views**:
    - **Dashboard**: List of active incorporation cases.
    - **Case View**: Upload area for Director 1, Director 2, etc.
    - **Review Tool**: Interactive form with original image zoom/pan and editable fields.
    - **Export**: Download filled `.xlsx` files.

## 3. Technical Architecture

### 3.1 Backend & AI
- **Orchestrator**: Python (FastAPI/Flask) to manage uploads and state.
- **Inference**: Modal Serverless Functions.
    - **GPU**: NVIDIA T4 (sweet spot for 2B model).
    - **Model**: Qwen/Qwen3-VL-2B-Instruct.
    - **Optimization**: Warm containers to keep model loaded.

### 3.2 Frontend
- **Stack**: React, TypeScript, Vite.
- **Components**: Drag-and-drop upload, Image viewer, Data grid.

### 3.3 Output Generation
- **Engine**: `openpyxl`.
- **Template**: Maintains strict formatting of "Checklist for Company Formation.xlsx".

## 4. Performance Goals
- **Accuracy**: > 95% field extraction accuracy (human-in-the-loop for 100%).
- **Speed**: Complete extraction for 2 Directors (4 docs) in < 1 minute parallel processing.
