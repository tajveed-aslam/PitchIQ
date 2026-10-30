// Data saver: shrink a phone video in the browser before uploading it, so a 30-second clip costs a few MB of data
// instead of 30-80 MB. Uses the browser's own video encoder (WebCodecs) and writes an MP4 (mp4-muxer).
//
// Quality matters more than size: the analysis spike showed heavy compression breaks the touch count (480p at
// ffmpeg CRF 30 lost a third of the touches; CRF 20, about 1-1.3 Mbit/s, matched the original). So the target is
// 480p at 1.5 Mbit/s, and the sound is dropped (not needed). If the browser can't do it, the original is sent.
import { ArrayBufferTarget, Muxer } from "mp4-muxer";

const TARGET_HEIGHT = 480;
const BITRATE = 1_500_000;
const FPS = 30;

export interface ShrinkResult {
  blob: Blob;
  filename: string;
  shrunk: boolean;
  reason?: string;
}

type VideoWithRvfc = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
};

const CANDIDATES: { muxer: "avc" | "vp9"; codec: string }[] = [
  { muxer: "avc", codec: "avc1.42001f" }, // H.264 baseline: hardware-encoded on most phones
  { muxer: "vp9", codec: "vp09.00.10.08" },
];

export function dataSaverSupported(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window && "VideoFrame" in window &&
    "requestVideoFrameCallback" in HTMLVideoElement.prototype;
}

async function pickCodec(width: number, height: number) {
  for (const c of CANDIDATES) {
    try {
      const { supported } = await VideoEncoder.isConfigSupported({ codec: c.codec, width, height, bitrate: BITRATE, framerate: FPS });
      if (supported) return c;
    } catch {
      /* try the next one */
    }
  }
  return null;
}

/** Re-encodes `file` to ~480p. Plays the video once (muted, off-screen), so it takes about as long as the clip. */
export async function shrinkVideo(file: File, onProgress: (pct: number) => void): Promise<ShrinkResult> {
  const original: ShrinkResult = { blob: file, filename: file.name, shrunk: false };
  if (!dataSaverSupported()) return { ...original, reason: "This browser can't shrink videos; sending the original." };

  const url = URL.createObjectURL(file);
  const video = document.createElement("video") as VideoWithRvfc;
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  try {
    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res();
      video.onerror = () => rej(new Error("unreadable"));
    });
    if (video.videoHeight <= TARGET_HEIGHT + 40) return { ...original, reason: "Already small; sending as is." };

    const scale = TARGET_HEIGHT / video.videoHeight;
    const width = Math.round((video.videoWidth * scale) / 2) * 2; // encoders need even sizes
    const height = TARGET_HEIGHT;
    const codec = await pickCodec(width, height);
    if (!codec) return { ...original, reason: "No suitable encoder here; sending the original." };

    const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: codec.muxer, width, height }, fastStart: "in-memory" });
    let failure: Error | null = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => (failure = e as Error),
    });
    encoder.configure({ codec: codec.codec, width, height, bitrate: BITRATE, framerate: FPS });

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;
    const duration = video.duration || 1;
    let lastKey = -Infinity;

    await new Promise<void>((resolve, reject) => {
      const onFrame = (_now: number, meta: { mediaTime: number }) => {
        if (failure) return reject(failure);
        ctx.drawImage(video, 0, 0, width, height);
        const t = meta.mediaTime;
        const frame = new VideoFrame(canvas, { timestamp: Math.round(t * 1e6) });
        const keyFrame = t - lastKey >= 2;
        if (keyFrame) lastKey = t;
        encoder.encode(frame, { keyFrame });
        frame.close();
        onProgress(Math.min(99, Math.round((100 * t) / duration)));
        if (!video.ended) video.requestVideoFrameCallback!(onFrame);
      };
      video.onended = () => resolve();
      video.requestVideoFrameCallback!(onFrame);
      video.play().catch(reject);
    });
    await encoder.flush();
    encoder.close();
    muxer.finalize();
    const blob = new Blob([muxer.target.buffer], { type: "video/mp4" });
    onProgress(100);
    if (blob.size >= file.size) return { ...original, reason: "The original was already smaller; sending it." };
    return { blob, filename: file.name.replace(/\.[^.]+$/, "") + "-480p.mp4", shrunk: true };
  } catch {
    return { ...original, reason: "Couldn't shrink this video; sending the original." };
  } finally {
    URL.revokeObjectURL(url);
  }
}
