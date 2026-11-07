"use client";
/** Decodes any audio or video file to 16 kHz mono PCM for speech recognition, on the device. */
import { mediaWorker } from "@/workers/clients";

async function decode(buf: ArrayBuffer): Promise<Float32Array> {
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(buf);
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * 16000)), 16000);
    const src = off.createBufferSource();
    src.buffer = audio;
    src.connect(off.destination); // mixes all channels down to mono
    src.start();
    return (await off.startRendering()).getChannelData(0);
  } finally {
    await ctx.close();
  }
}

export async function to16kMono(file: Blob): Promise<Float32Array> {
  try {
    return await decode(await file.arrayBuffer());
  } catch {
    // Some video containers can't be decoded by WebAudio (e.g. WebM in Safari): extract the audio as WAV first.
    const { blob } = await mediaWorker.call("audio", { file, to: "wav" });
    try {
      return await decode(await blob.arrayBuffer());
    } catch {
      throw new Error("This file has no audio we can read.");
    }
  }
}
