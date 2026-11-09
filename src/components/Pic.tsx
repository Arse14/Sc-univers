import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * Image distante avec fondu à l'affichage et repli propre si l'URL ne
 * répond pas (dégradé spatial + motif), pour ne jamais laisser un trou.
 * Les images viennent de sources publiques (wiki communautaire, Galactapedia
 * officielle) et sont chargées par l'app au moment de l'affichage.
 */
export function Pic({ src, alt = "", ratio = "16 / 9", fit = "cover", className, style, children, dim = false, radius = 0 }: {
  src?: string | null;
  alt?: string;
  ratio?: string | null;
  fit?: "cover" | "contain";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;   // superposé (légende, dégradé…)
  dim?: boolean;          // assombrit pour du texte par-dessus
  radius?: number;
}) {
  const [ok, setOk] = useState<boolean | null>(null);
  const failed = !src || ok === false;
  return (
    <div className={"pic" + (failed ? " pic-fallback" : "") + (className ? ` ${className}` : "")} style={{ aspectRatio: ratio ?? undefined, borderRadius: radius, ...style }}>
      {src && ok !== false && (
        <img src={src} alt={alt} loading="lazy" decoding="async" onLoad={() => setOk(true)} onError={() => setOk(false)}
          style={{ objectFit: fit, opacity: ok ? 1 : 0, padding: fit === "contain" ? 10 : 0 }} />
      )}
      {dim && <span className="pic-dim" aria-hidden="true" />}
      {children}
    </div>
  );
}

/** Petit hachage stable pour choisir une image de repli selon une clé. */
export function pick<T>(list: readonly T[], seed: string): T {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return list[Math.abs(h) % list.length];
}
