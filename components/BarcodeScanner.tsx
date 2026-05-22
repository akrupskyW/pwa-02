"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onDetected: (upc: string) => void;
  onCancel: () => void;
}

// Camera + zxing barcode scanner. Lazy-loads @zxing/browser + @zxing/library
// so the scanner chunk only ships when the user actually opens the scanner.
//
// Tuned for product barcodes:
//   - Restricts formats to UPC-A / EAN-13 / EAN-8 / UPC-E (skip QR, Data Matrix,
//     Code 128, etc.) — fewer formats per frame means more decode attempts per
//     second on the right one.
//   - TRY_HARDER hint — accept lower-quality / partially-rotated reads.
//   - Higher video resolution (1280×720 ideal) — more pixels per barcode bar
//     gives the decoder a real chance on small or distant codes.
//   - Faster scan cadence (delayBetweenScanAttempts: 50ms) — more attempts
//     per second, better tolerance for shaky hands.
//
// The video fills the screen. The decoder reads the whole frame — there is
// no "aim inside the box" constraint. Hold the camera anywhere over the
// barcode and it will decode as soon as enough detail is visible.
export function BarcodeScanner({ onDetected, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const detectedRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "live" | "error">("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] =
          await Promise.all([
            import("@zxing/browser"),
            import("@zxing/library"),
          ]);
        if (cancelled) return;
        if (!videoRef.current) return;

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.UPC_A,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_E,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 50,
          delayBetweenScanSuccess: 500,
        });

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          videoRef.current,
          (result) => {
            if (cancelled || detectedRef.current) return;
            if (!result) return;
            const text = result.getText().trim();
            // Filter to digit strings of UPC/EAN lengths just in case.
            if (!/^\d{8,13}$/.test(text)) return;
            detectedRef.current = true;
            // NOTE: we do NOT stop the camera here. The parent does its
            // lookup with the camera still visible, then unmounts the
            // scanner once it has a result in hand — matches the Blazor
            // prototype's flow and avoids the brief blank-frame flicker
            // you get when tearing down WebRTC mid-fetch.
            onDetected(text);
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStatus("live");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(friendlyCameraError(err));
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  return (
    <div className="absolute inset-0 bg-black z-30 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/60 rounded-xl px-4 py-3 text-sm text-screen-subtle">
              Opening camera…
            </div>
          </div>
        )}

        {status === "live" && (
          <div className="absolute inset-x-0 bottom-4 text-center text-xs text-white/70 px-6 pointer-events-none">
            Point at any barcode
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="bg-black/80 border border-screen-line rounded-2xl p-4 text-center max-w-xs">
              <div className="text-3xl mb-2">📷</div>
              <div className="text-sm text-white">{errorMessage}</div>
              <div className="text-[11px] text-screen-subtle mt-2">
                You can still type the UPC in the field below.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-black/95 px-4 py-3 flex justify-center">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl bg-stage-700 text-white text-sm font-semibold px-6 py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function friendlyCameraError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "Camera permission was denied. Enable camera access in your browser settings and try again.";
      case "NotFoundError":
      case "OverconstrainedError":
        return "No camera was found on this device.";
      case "NotReadableError":
        return "Camera is already in use by another app.";
      case "TypeError":
        return "Camera access requires a secure (HTTPS) connection.";
    }
  }
  return "Couldn't start the camera. Please try again or type the UPC.";
}
