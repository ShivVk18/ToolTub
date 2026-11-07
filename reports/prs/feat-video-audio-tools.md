# feat: 9 video, audio and speech tools (compress, convert, trim, GIF, extract audio, audio converter, screen recorder, transcription, subtitles)

Fourth batch of "Coming soon" tools. Everything runs on the device.

| Tool | How | Edge cases covered by tests |
|---|---|---|
| Video Compressor | Mediabunny + WebCodecs (hardware where available) in a worker; quality presets, max height, or a target size in MB | target size met, result plays at the same length |
| Video Converter | MP4 (H.264), WebM (VP9), MOV; picks what this browser can actually encode and says so when it falls back | converted file plays, same size and length |
| Video Trimmer | Start/end by typing or "Start here / End here" from the preview; works for audio too | 1-second clip from 0:01–0:02, end before start refused, times past the end |
| Video to GIF | Frames read with Mediabunny, **own GIF encoder** (median-cut palette, LZW) | exact frame count (10 at 5 fps × 2 s), decodes in the browser, ≤ 30 s |
| Extract Audio | M4A (AAC), WAV, WebM/OGG (Opus) | silent video says "no sound", **gaps in the recording are filled with silence so the audio keeps the video's timing** |
| Audio Converter & Trimmer | Same formats, optional trim | 1-second trim from a WAV |
| Screen Recorder | getDisplayMedia + MediaRecorder, optional microphone, the browser's own "Stop sharing" ends it | recording offered as a download (simulated screen in tests); phones get a clear "desktop only" message |
| Transcription | **Whisper tiny on the device**, 16 languages + auto-detect, optional timestamps | the spoken test sentence comes back as text, English detected, timestamps format |
| Subtitle Generator & Editor | Whisper with timestamps → editable cues → SRT + VTT; also opens existing .srt/.vtt to edit; shift all timings; live preview on the video | generated SRT is valid; edit a cue, shift −0.5 s, export |

**How speech recognition works (no new library).**
- Whisper runs on the self-hosted ONNX Runtime we already ship for the background remover. Transformers.js was rejected: it would add `sharp` and `onnxruntime-node` (native, tens of MB), a second ONNX Runtime, and CDN-hosted WASM by default.
- Our own code, in `src/lib/engines/whisper.ts` and `whisper.worker.ts`:
  - the log-mel spectrogram, written to OpenAI's recipe and **checked against reference values computed with librosa**;
  - GPT-2 byte-level token decoding;
  - greedy decoding with the merged decoder's KV cache;
  - Whisper's timestamp rules (pairs, monotonic, the first one within 1 s);
  - language detection;
  - 30-second windows that resume at the last finished segment;
  - a stop on hallucination loops.
- The model is whisper-tiny, int8 ONNX (41 MB, as approved). It's self-hosted under `public/models/whisper-tiny/` (gitignored; download steps in `public/models/README.md`) and cached in the browser after the first run.

**New dependency:** Mediabunny 1.65 (MPL-2.0, about 70 KB as used), loaded only in the media worker.

**Bugs found and fixed along the way:**
- **Target-size video compression always failed:** the computed bitrate wasn't a whole number, which Mediabunny rejects.
- **GIF frame count:** stepping by 1/fps drifted (2 s at 5 fps gave 11 frames). It's now computed from a count.
- **Extracted audio went out of sync** when the recording had gaps (WAV has no timestamps, so the gaps closed up). Gaps are now filled with silence.
- The registry test now accepts unquoted keys for routed tools (Prettier writes `transcription:`).

**Not done (needs your decision):**
- **MP3 output.** Browsers can't encode MP3, and Mediabunny's MP3 encoder (LAME-based) is about 2.3 MB. That's over the 100 KB threshold and wasn't in the approved list, so audio tools offer M4A/WAV/Opus. The "MP3 from any video" card copy is unchanged.
- **Image Upscaler and Hashtag Finder** stay "Coming soon", as decided.

**Tests.**
- Unit: `gif.test.ts` (LZW round trip through a reference decoder, including the 4096-code reset; palette; header) and `whisper.test.ts` (mel filters and features against librosa reference values, tokens, segments, SRT/VTT, parsing, shifting).
- e2e: `media-tools.spec.ts`, 11 tests. Each browser records its own test clip, and outputs are checked by playing them in real `<video>`/`<audio>` elements.
- The speech tests run the real model when it's installed (they pass locally); otherwise they check for the clear message.
- Universal checks for the 9 pages.
- Results: Chromium, WebKit, Pixel 7 and iPhone 14 all pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
