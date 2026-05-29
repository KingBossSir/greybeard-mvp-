"use client";

import { useEffect, useRef, useState } from "react";
import { submitLiveness } from "@/lib/actions";
import { Button } from "@/components/Button";

async function sha256Hex(input: ArrayBuffer) {
  const buf = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function blobFromCanvas(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to capture that frame"));
        return;
      }
      resolve(blob);
    }, "image/jpeg", 0.72);
  });
}

export function LivenessCapture({ token }: { token: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  async function startCamera() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCameraReady(true);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Camera permission is required for liveness");
      setCameraReady(false);
    }
  }

  async function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    setBusy(true);
    setProgress(0);
    setErr(null);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Camera capture is unavailable");

      canvas.width = 320;
      canvas.height = 320;

      const hashes: string[] = [];
      for (let i = 0; i < 12; i += 1) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const blob = await blobFromCanvas(canvas);
        hashes.push(await sha256Hex(await blob.arrayBuffer()));
        setProgress(i + 1);
        await new Promise((resolve) => setTimeout(resolve, 220));
      }

      const fd = new FormData();
      fd.set("frameHashes", JSON.stringify(hashes));
      await submitLiveness(token, fd);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Liveness failed");
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pt-8 pb-6 flex flex-col items-center">
      <div className="relative overflow-hidden rounded-[999px] border border-[var(--color-line-strong)] bg-[var(--color-ink)] w-[260px] h-[260px]">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          onCanPlay={() => setCameraReady(true)}
        />
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#2b2a25,#151512)] text-center px-8 text-[12px] text-white/80">
            Start the front camera, then slowly turn your head left and right while we hash the frames locally.
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-4 text-[14px] font-medium text-[var(--color-ink)]">
        {busy ? `Capturing ${progress}/12 frames…` : "Face the camera and move naturally"}
      </div>
      <div className="mono mt-1 text-[10px] uppercase tracking-wider text-[var(--color-ink-4)]">
        raw video never leaves this device
      </div>

      {err && <p className="mt-3 text-[12px] text-[var(--color-warn)] text-center">{err}</p>}

      <div className="mt-8 grid w-full gap-2 pb-8">
        {!cameraReady ? (
          <Button className="w-full" onClick={startCamera}>
            Start camera
          </Button>
        ) : (
          <Button disabled={busy} className="w-full" onClick={capture}>
            {busy ? "Verifying…" : "Capture liveness"}
          </Button>
        )}
        {cameraReady && !busy && (
          <Button variant="outline" className="w-full" onClick={startCamera}>
            Restart camera
          </Button>
        )}
      </div>
    </div>
  );
}
