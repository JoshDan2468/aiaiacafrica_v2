import { useEffect, useRef, useState } from "react";
import type QrScanner from "qr-scanner";
import { CircleAlert, LoaderCircle, X } from "@/components/admin/adminIcons";

interface EventPassScannerProps {
  onDecoded: (credential: string) => void;
  onClose: () => void;
}

export function EventPassScanner({ onDecoded, onClose }: EventPassScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDecodedRef = useRef(onDecoded);
  const [cameraState, setCameraState] = useState<"starting" | "ready" | "error">("starting");
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    onDecodedRef.current = onDecoded;
  }, [onDecoded]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let scanner: QrScanner | undefined;
    let disposed = false;
    let decoded = false;
    const stopCamera = () => {
      scanner?.destroy();
      const stream = video.srcObject;
      if (typeof MediaStream !== "undefined" && stream instanceof MediaStream)
        stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };

    void (async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("CAMERA_UNAVAILABLE");
        }
        const { default: Scanner } = await import("qr-scanner");
        if (disposed) return;
        scanner = new Scanner(
          video,
          (result) => {
            if (disposed || decoded || !result.data) return;
            decoded = true;
            stopCamera();
            onDecodedRef.current(result.data);
          },
          { preferredCamera: "environment", maxScansPerSecond: 8, returnDetailedScanResult: true },
        );
        await scanner.start();
        if (disposed || decoded) stopCamera();
        else setCameraState("ready");
      } catch (error) {
        stopCamera();
        if (disposed) return;
        setCameraState("error");
        const name = error instanceof Error ? error.name : "";
        setCameraError(
          name === "NotAllowedError" || name === "PermissionDeniedError"
            ? "Camera permission was denied. Allow camera access in your browser or use manual lookup."
            : "The camera could not start. Check that a camera is available and this page uses HTTPS, or use manual lookup.",
        );
      }
    })();

    return () => {
      disposed = true;
      stopCamera();
    };
  }, []);

  return (
    <section aria-label="Event Pass QR scanner" className="overflow-hidden rounded-xl bg-[#102C20]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <h3 className="text-sm font-semibold">Scan attendee Event Pass</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scanner"
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X size={20} />
        </button>
      </div>
      <div className="relative aspect-square max-h-[360px] bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {cameraState === "ready" ? (
          <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white/80" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#102C20] px-6 text-center text-white">
            {cameraState === "starting" ? (
              <>
                <LoaderCircle size={28} className="animate-spin" />
                <p className="text-sm">Starting camera…</p>
              </>
            ) : (
              <>
                <CircleAlert size={28} />
                <p role="alert" className="text-sm leading-relaxed">
                  {cameraError}
                </p>
              </>
            )}
          </div>
        )}
      </div>
      <p className="px-4 py-3 text-xs leading-relaxed text-white/80">
        Hold the QR inside the frame. Scanning opens a review before you confirm entry.
      </p>
    </section>
  );
}
