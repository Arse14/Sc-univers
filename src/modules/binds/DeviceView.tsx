import { useEffect, useState, type MouseEvent } from "react";
import type { Device, DeviceControl, Placement } from "./types";

interface Props {
  device: Device;
  imageUrl: string | null;
  placements: Record<string, Placement>;
  selectedId: string | null;
  zoomed: boolean;
  zoomLevel?: number;
  placing: boolean;
  /** Libellé court de la fonction liée (pour l'étiquette de la commande sélectionnée). */
  actionFor: (c: DeviceControl) => string;
  onSelect: (id: string) => void;
  onPlace: (id: string, p: Placement) => void;
}

const W = 560;

/**
 * Image de l'appareil avec les repères de commandes, zoom animé sur la
 * sélection et mode « placement » (clic sur l'image pour positionner la
 * commande sélectionnée).
 */
export function DeviceView({ device, imageUrl, placements, selectedId, zoomed, zoomLevel = 2.6, placing, actionFor, onSelect, onPlace }: Props) {
  const [ratio, setRatio] = useState(0.88);

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => { if (img.naturalWidth) setRatio(img.naturalHeight / img.naturalWidth); };
    img.src = imageUrl;
  }, [imageUrl]);

  const H = Math.round(W * ratio);
  const K = zoomLevel;
  const sel = device.controls.find((c) => c.id === selectedId) ?? null;
  const selP = sel ? placements[sel.id] : undefined;
  const sx = selP ? selP.x * W : W / 2;
  const sy = selP ? selP.y * H : H / 2;

  // Zoom centré sur la sélection, borné pour rester dans l'image.
  let dx = W / 2 - sx;
  let dy = H / 2 - sy;
  const doZoom = zoomed && !!selP && !placing;
  if (doZoom) {
    dx = Math.min(Math.max(dx, W - sx - K * (W - sx)), K * sx - sx);
    dy = Math.min(Math.max(dy, H - sy - K * (H - sy)), K * sy - sy);
  }
  const inv = doZoom ? 1 / K : 1;

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!placing || !sel) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    onPlace(sel.id, { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) });
  };

  return (
    <div className="viewport" style={{ width: W, height: H, cursor: placing ? "crosshair" : "default" }} onClick={handleClick}>
      <div
        className="zoomer"
        style={{
          width: W, height: H,
          transformOrigin: `${sx}px ${sy}px`,
          transform: doZoom ? `translate(${dx}px, ${dy}px) scale(${K})` : "translate(0,0) scale(1)",
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={device.name} style={{ width: W, height: H, objectFit: "fill" }} draggable={false} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)", fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: ".2em", textAlign: "center", padding: 24 }}>
            AUCUNE IMAGE<br />IMPORTE UNE PHOTO DE TON APPAREIL
          </div>
        )}
        <div className="tint" />

        {device.controls.map((c, i) => {
          const p = placements[c.id];
          if (!p) return null;
          const x = p.x * W, y = p.y * H;
          const on = c.id === selectedId;
          const right = x < W * 0.6;
          return (
            <div key={c.id} className={"node" + (doZoom && !on ? " faded" : "")} style={{ transformOrigin: `${x}px ${y}px`, transform: `scale(${inv})` }}>
              {on && <div className="glow" style={{ left: x - 46, top: y - 46 }} />}
              {on && <div className="ring" style={{ left: x - 22, top: y - 22 }} />}
              {on && <div className="ring2" style={{ left: x - 30, top: y - 30 }} />}
              <button
                type="button"
                className={"hexbtn" + (on ? " active" : "") + (placing && on ? " placing" : "")}
                style={{ left: x - 13, top: y - 15 }}
                aria-label={`${c.name} : ${actionFor(c)}`}
                aria-pressed={on}
                onClick={(e) => { e.stopPropagation(); if (!placing) onSelect(c.id); }}
              >
                {i + 1}
              </button>
              {on && !placing && (
                <div className="pill" style={{ top: y - 17, ...(right ? { left: x + 24, borderLeft: "3px solid var(--amber)" } : { right: W - x + 24, borderRight: "3px solid var(--amber)" }) }}>
                  <span className="s">{c.name.toUpperCase()}</span>
                  <span className="a">{actionFor(c)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!doZoom && imageUrl && <div className="scan" />}
      <div className="corner tl" /><div className="corner tr" /><div className="corner bl" /><div className="corner br" />
    </div>
  );
}
