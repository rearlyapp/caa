# Backend Connection & Data Processing Requirements

To transition the CAA project from a mock frontend to a fully functional application, the following steps are required to connect the `Next.js` frontend to the AI extraction backend.

## 1. Current State
- **Frontend**: `Next.js` app with a mock API route (`app/api/extract/route.ts`) that returns static data after a 2-second delay.
- **Backend (Cloud)**: `modal_extract.py` script configured for CLI execution via `modal run`.
- **Backend (Local)**: `test_qwen.py` script for local CPU inference, running as a standalone process.

## 2. Required Changes

### A. Frontend (Next.js)
The `app/api/extract/route.ts` needs to act as a proxy or client to the actual python backend.

**Tasks:**
1.  **Environment Variables**: Add `MODAL_API_URL` and `LOCAL_API_URL` to `.env.local` and `next.config.mjs` (public/server variables).
2.  **Update API Route**:
    -   Modify `POST` handler to check `inferenceMode` ("modal" or "cpu").
    -   For **Modal**: `fetch(process.env.MODAL_API_URL, { method: 'POST', body: ... })`
    -   For **CPU**: `fetch(process.env.LOCAL_API_URL, { method: 'POST', body: ... })`
    -   Handle Base64 image encoding before sending.

### B. Backend - Modal (Cloud GPU)
The `modal_extract.py` needs to be updated to expose a web endpoint.

**Tasks:**
1.  **Add Web Endpoint**:
    ```python
    @app.function()
    @modal.web_endpoint(method="POST")
    def api_extract(data: dict):
        # ... logic to call Extractor.extract ...
        return JSONResponse(...)
    ```
2.  **Deploy**: Run `modal deploy modal_extract.py` to get a permanent URL (e.g., `https://kmo7cob--caa-doc-extractor-api-extract.modal.run`).

### C. Backend - Local (CPU)
The `test_qwen.py` script needs to be wrapped in a web server.

**Tasks:**
1.  **Create `api.py`**:
    -   Use `FastAPI`.
    -   Load the model on startup (lifespan event).
    -   Expose `/extract` endpoint.
2.  **Dockerize (Optional)**: update `docker-compose.yaml` to include a `backend` service running this FastAPI app.

## 3. Data Flow
1.  **User uploads** image in Frontend.
2.  **Frontend** converts image to Base64.
3.  **Frontend** calls `api/extract`.
4.  **`api/extract`** forwards request to Python Backend (Modal URL or Localhost:8000).
5.  **Python Backend** runs Qwen3-VL-2B inference and returns JSON.
6.  **Frontend** receives JSON and updates UI.
