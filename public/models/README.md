# On-device models (self-hosted)

Models are served from klipkit.com and never fetched from a model hub at runtime.

| File | Model | Licence | Size | Used by |
|---|---|---|---|---|
| `isnet-general-use-int8.onnx` | ISNet general-use (DIS), int8-quantised | Apache-2.0 | ≈ 44 MB | Background Remover, Passport Photo Maker |
| `whisper-tiny/` | OpenAI Whisper tiny (multilingual), int8 ONNX export by onnx-community | MIT (OpenAI Whisper weights) | ≈ 41 MB | Transcription, Subtitle Generator |

How to add it (one time, at build or deploy):

1. Download `isnet-general-use.onnx` from the DIS / rembg release assets and **check the licence file shipped with it**.
2. Quantise: `python -m onnxruntime.quantization.preprocess` then `quantize_dynamic(..., weight_type=QUInt8)`.
3. Save as `public/models/isnet-general-use-int8.onnx`. Serve with `Cache-Control: public, max-age=31536000, immutable`.

Do NOT use BRIA RMBG-1.4/2.0 (non-commercial licence) or any model without a clear permissive licence.

## Whisper (Transcription, Subtitle Generator)

Run once at build or deploy (the folder is gitignored):

```bash
D=public/models/whisper-tiny; mkdir -p $D/onnx
B=https://huggingface.co/onnx-community/whisper-tiny/resolve/main
for f in config.json generation_config.json vocab.json added_tokens.json \
         onnx/encoder_model_quantized.onnx onnx/decoder_model_merged_quantized.onnx; do
  curl -fL -o $D/$f $B/$f
done
```

The browser fetches these from klipkit.com only (cached after the first run); no model hub is contacted at runtime.
Inference uses the self-hosted ONNX Runtime in `/vendor/ort` (no Transformers.js).
