import { serveWorker, type Progress } from "@/lib/worker-rpc";
import {
  probe,
  compressVideo,
  convertVideo,
  trimMedia,
  extractAudio,
  videoToGif,
  type CompressVideoJob,
  type GifJob,
  type AudioJob,
} from "./media-ops";

serveWorker({
  probe: (job: { file: Blob }) => probe(job),
  compress: (job: CompressVideoJob, progress: Progress) => compressVideo(job, progress),
  convert: (job: { file: Blob; to: "mp4" | "webm" | "mov" }, progress: Progress) => convertVideo(job, progress),
  trim: (job: { file: Blob; start: number; end: number }, progress: Progress) => trimMedia(job, progress),
  audio: (job: AudioJob, progress: Progress) => extractAudio(job, progress),
  gif: (job: GifJob, progress: Progress) => videoToGif(job, progress),
});
