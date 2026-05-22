"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

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
    <div className="absolute inset-0 bg-black z-40 flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Viewfinder corners — pure decoration; the decoder reads the whole
            frame, but the corners signal "aim here". */}
        {status === "live" && <ViewfinderCorners />}

        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/70 backdrop-blur rounded-m border border-line px-4 py-3 text-[13px] text-ink-muted inline-flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block w-3 h-3 rounded-full border-2 border-white/25 border-t-white animate-spin"
              />
              Opening camera…
            </div>
          </div>
        )}

        {status === "live" && (
          <div className="absolute inset-x-0 bottom-6 text-center text-[11px] tracking-[0.16em] uppercase font-bold text-white/80 px-6 pointer-events-none">
            Point at any barcode
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="bg-black/85 backdrop-blur border border-line rounded-l p-4 text-center max-w-xs">
              <div className="mx-auto w-12 h-12 rounded-l flex items-center justify-center bg-card border border-line text-ink-muted mb-2">
                <Icon name="camera" size={22} />
              </div>
              <div className="text-[13px] text-ink-bright">{errorMessage}</div>
              <div className="text-[11px] text-ink-muted mt-2">
                You can still type the UPC in the field below.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-black/95 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] flex justify-center">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-pill bg-surface-2 border border-line text-ink-bright text-[14px] font-bold px-6 py-2.5 hover:bg-surface-3 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ViewfinderCorners() {
  // Four L-shaped corners around a central viewfinder box. Pure decoration;
  // the decoder reads the entire frame.
  const cornerCls =
    "absolute w-10 h-10 border-accent-emerald/90 [box-shadow:0_0_12px_rgba(52,229,166,0.3)]";
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative w-[70%] aspect-[5/3]">
        <div className={`${cornerCls} -top-px -left-px border-t-[3px] border-l-[3px] rounded-tl-l`} />
        <div className={`${cornerCls} -top-px -right-px border-t-[3px] border-r-[3px] rounded-tr-l`} />
        <div className={`${cornerCls} -bottom-px -left-px border-b-[3px] border-l-[3px] rounded-bl-l`} />
        <div className={`${cornerCls} -bottom-px -right-px border-b-[3px] border-r-[3px] rounded-br-l`} />
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
