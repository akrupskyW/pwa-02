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
export const BarcodeScanner = ({ onDetected, onCancel }: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const detectedRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "live" | "error">("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all(
          [import("@zxing/browser"), import("@zxing/library")],
        );
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
    <div className="absolute inset-0 z-40 flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Viewfinder corners — pure decoration; the decoder reads the whole
            frame, but the corners signal "aim here". */}
        {status === "live" && <ViewfinderCorners />}

        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-m border-line text-ink-muted inline-flex items-center gap-2 border bg-black/70 px-4 py-3 text-[13px] backdrop-blur">
              <span
                aria-hidden
                className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/25 border-t-white"
              />
              Opening camera…
            </div>
          </div>
        )}

        {status === "live" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 px-6 text-center text-[11px] font-bold tracking-[0.16em] text-white/80 uppercase">
            Point at any barcode
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="border-line max-w-xs rounded-l border bg-black/85 p-4 text-center backdrop-blur">
              <div className="bg-card border-line text-ink-muted mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-l border">
                <Icon name="camera" size={22} />
              </div>
              <div className="text-ink-bright text-[13px]">{errorMessage}</div>
              <div className="text-ink-muted mt-2 text-[11px]">
                You can still type the UPC in the field below.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center bg-black/95 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-pill bg-surface-2 border-line text-ink-bright hover:bg-surface-3 border px-6 py-2.5 text-[14px] font-bold transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const ViewfinderCorners = () => {
  // Four L-shaped corners around a central viewfinder box. Pure decoration;
  // the decoder reads the entire frame.
  const cornerCls =
    "absolute w-10 h-10 border-accent-emerald/90 [box-shadow:0_0_12px_rgba(52,229,166,0.3)]";
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative aspect-[5/3] w-[70%]">
        <div
          className={`${cornerCls} rounded-tl-l -top-px -left-px border-t-[3px] border-l-[3px]`}
        />
        <div
          className={`${cornerCls} rounded-tr-l -top-px -right-px border-t-[3px] border-r-[3px]`}
        />
        <div
          className={`${cornerCls} rounded-bl-l -bottom-px -left-px border-b-[3px] border-l-[3px]`}
        />
        <div
          className={`${cornerCls} rounded-br-l -right-px -bottom-px border-r-[3px] border-b-[3px]`}
        />
      </div>
    </div>
  );
};

const friendlyCameraError = (err: unknown): string => {
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
};
