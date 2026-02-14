#!/usr/bin/env python3
"""CPU benchmark of Qwen3-VL-2B-Instruct on PAN + Aadhaar cards.

Uses local model from ./models/Qwen3-VL-2B-Instruct (no HF download).
"""

import json
import time
import torch
from PIL import Image
from transformers import Qwen3VLForConditionalGeneration, AutoProcessor

MODEL_DIR = "./models/Qwen3-VL-2B-Instruct"

# ── Prompts (same as modal_extract.py for apples-to-apples comparison) ───────

PAN_PROMPT = """Look at this Indian PAN card image carefully.

On a PAN card, the layout is:
- Line 1: Cardholder's FULL NAME (e.g. "KISHORE SHEIK AHAMED M R")
- Line 2: Father's FULL NAME (e.g. "MOHAMMED RAHAMATHULLA")
- Line 3: Date of Birth (DD/MM/YYYY)
- Bottom: 10-character PAN number (e.g. BQJPK6347Q)

Extract these fields as JSON. The name and father's name are SEPARATE people on SEPARATE lines:

{
  "name": "cardholder name only (first name line)",
  "fathers_name": "father's name only (second name line)",
  "date_of_birth": "DD/MM/YYYY",
  "pan_number": "10 character PAN"
}

Return ONLY the JSON object, no other text."""

AADHAAR_PROMPT = """Look at this Aadhaar card image carefully.
Extract ALL the following fields and return ONLY valid JSON, nothing else:

{
  "name": "full name as printed",
  "aadhaar_number": "12 digit number (XXXX XXXX XXXX format)",
  "date_of_birth": "DD/MM/YYYY format",
  "gender": "MALE or FEMALE",
  "address": "complete residential address as printed including pincode"
}

Rules:
- Copy text EXACTLY as printed
- Aadhaar number is exactly 12 digits
- Include full address with pincode
- Return ONLY the JSON object, no other text"""


def run_extraction(model, processor, image_path, prompt, label):
    """Run a single extraction and return results + timing."""
    image = Image.open(image_path).convert("RGB")
    # Resize to reduce compute (match modal_extract behavior)
    max_dim = 1024
    if max(image.size) > max_dim:
        ratio = max_dim / max(image.size)
        image = image.resize((int(image.width * ratio), int(image.height * ratio)))
    print(f"  Image size: {image.size}")

    messages = [{
        "role": "user",
        "content": [
            {"type": "image", "image": image},
            {"type": "text", "text": prompt},
        ]
    }]

    t0 = time.time()
    inputs = processor.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_dict=True,
        return_tensors="pt",
    )
    inputs = inputs.to(model.device)

    with torch.no_grad():
        generated_ids = model.generate(**inputs, max_new_tokens=512)

    generated_ids_trimmed = [
        out_ids[len(in_ids):]
        for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    output_text = processor.batch_decode(
        generated_ids_trimmed,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=False,
    )[0]

    elapsed = time.time() - t0
    print(f"  Inference time: {elapsed:.1f}s")
    print(f"  Output:\n{output_text}")
    return {"raw_text": output_text, "elapsed": elapsed}


def main():
    print(f"Loading model: {MODEL_DIR}")
    t_load = time.time()

    model = Qwen3VLForConditionalGeneration.from_pretrained(
        MODEL_DIR,
        dtype=torch.float32,  # CPU needs float32
    )
    processor = AutoProcessor.from_pretrained(MODEL_DIR)

    load_time = time.time() - t_load
    print(f"Model loaded in {load_time:.1f}s\n")

    total_t0 = time.time()
    results = {}

    # ── PAN Card ─────────────────────────────────────────────────────────────
    print("📄 PAN Card extraction:")
    pan_result = run_extraction(model, processor, "pan.jpg", PAN_PROMPT, "PAN")
    results["pan"] = pan_result

    # ── Aadhaar Card ─────────────────────────────────────────────────────────
    print("\n🆔 Aadhaar Card extraction:")
    aadhaar_result = run_extraction(model, processor, "aadhar.jpg", AADHAAR_PROMPT, "Aadhaar")
    results["aadhaar"] = aadhaar_result

    total_elapsed = time.time() - total_t0

    # ── Summary ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("CPU BENCHMARK RESULTS")
    print("=" * 60)
    print(f"  Model:            Qwen3-VL-2B-Instruct (float32)")
    print(f"  Device:           CPU")
    print(f"  Model load:       {load_time:.1f}s")
    print(f"  PAN inference:    {results['pan']['elapsed']:.1f}s")
    print(f"  Aadhaar inference:{results['aadhaar']['elapsed']:.1f}s")
    print(f"  Total (2 docs):   {total_elapsed:.1f}s")
    print("=" * 60)


if __name__ == "__main__":
    main()
