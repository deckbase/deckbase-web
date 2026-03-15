"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImg } from "@/lib/cropImage";
import { X } from "lucide-react";
import { CROP_ASPECT_OPTIONS, DEFAULT_CROP_ASPECT } from "@/lib/image-block-config";

export default function ImageCropModal({ imageSrc, onComplete, onCancel, defaultAspect, initialCrop, initialZoom, allowRatioChange = true }) {
  const initialAspect = defaultAspect != null && [1, 1.91, 4 / 5].includes(Number(defaultAspect))
    ? Number(defaultAspect)
    : DEFAULT_CROP_ASPECT;
  const [crop, setCrop] = useState(() => {
    if (initialCrop && typeof initialCrop.x === "number" && typeof initialCrop.y === "number") return { x: initialCrop.x, y: initialCrop.y };
    return { x: 0, y: 0 };
  });
  const [zoom, setZoom] = useState(() => (typeof initialZoom === "number" && initialZoom >= 1 && initialZoom <= 3 ? initialZoom : 1));
  const [aspect, setAspect] = useState(initialAspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [busy, setBusy] = useState(false);
  const prevAspectRef = useRef(initialAspect);

  // When ratio change is disabled (e.g. second+ image), always use block aspect; otherwise use local state.
  const effectiveAspect = allowRatioChange ? aspect : initialAspect;

  useEffect(() => {
    if (typeof window !== "undefined") console.log("[RATIO] ImageCropModal open", { defaultAspect, initialAspect, allowRatioChange });
  }, [defaultAspect, initialAspect, allowRatioChange]);

  // Only reset crop/zoom when the user changes aspect (not on initial mount), so saved position/zoom are preserved when reopening Edit.
  useEffect(() => {
    if (prevAspectRef.current !== aspect) {
      prevAspectRef.current = aspect;
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [aspect]);

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    if (typeof window !== "undefined") console.log("[RATIO] ImageCropModal confirm", { effectiveAspect, allowRatioChange });
    setBusy(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onComplete(blob, effectiveAspect, { crop, zoom });
    } catch (err) {
      console.error("Crop failed:", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-white font-medium">Crop image</span>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
          aria-label="Cancel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 relative min-h-0">
        <Cropper
          key={effectiveAspect}
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={effectiveAspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{ containerStyle: { background: "#000" } }}
          classes={{}}
        />
      </div>
      <div className="p-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
          {allowRatioChange && (
            <div className="flex items-center gap-2">
              <span className="text-white/60">Ratio</span>
              <div className="flex rounded-lg border border-white/20 overflow-hidden">
                {CROP_ASPECT_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      console.log("[RATIO] ImageCropModal ratio clicked", { label: opt.label, value: opt.value });
                      setAspect(opt.value);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${effectiveAspect === opt.value ? "bg-accent text-white" : "bg-white/5 text-white/80 hover:bg-white/10"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2">
            <span>Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-24 accent-accent"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-white/20 text-white/90 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {busy ? "Applying…" : "Use crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
