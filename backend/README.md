# Local Backend (CPU)

## Run

```bash
pip install -r backend/requirements.txt
uvicorn backend.api:app --host 0.0.0.0 --port 8000
```

## Required files

- Local model at `./models/Qwen3-VL-2B-Instruct` (or set `LOCAL_MODEL_DIR`)
- Checklist template at `Checklist for Company Formation dated 11 02 2026.xlsx`

## Endpoints

- `GET /health`
- `POST /extract` with `{ "image_base64": "...", "document_type": "pan|aadhaar" }`
- `POST /export` with `{ "case_name": "...", "case_data": {...} }`

## Notes

- `POST /extract` supports both image and PDF payloads.
- PDF input is auto-converted to first-page image before model inference.
- Uploaded documents are auto-resized and contrast-enhanced for stable CPU processing.
