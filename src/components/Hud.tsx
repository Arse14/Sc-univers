import type { ReactNode } from "react";
import { useClock } from "./Sidebar";

/** Briques d'interface partagées du thème HUD. */

export function PageHeader({ crumb, title, sub, actions }: { crumb: string; title: string; sub?: ReactNode; actions?: ReactNode }) {
  const clock = useClock();
  return (
    <>
      <div className="breadcrumb">
        <span>SC-UNIVERS ▸ <b>{crumb}</b></span>
        <span className="hud-right"><span className="hud-chip"><i />LIVE</span><span>UEE {clock.utc}</span><span>NODE // LOCAL</span></span>
      </div>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 18 }}>
        <div>
          <h1 className="page-title">{title}</h1>
          <div className="title-rule"><i /><b /></div>
          {sub && <div className="subline">{sub}</div>}
        </div>
        {actions && <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{actions}</div>}
      </header>
    </>
  );
}

export function SectionHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="section-head">
      <span className="n">{n}</span>
      <span className="t">{title}</span>
      <span className="r" />
    </div>
  );
}

export function Stat({ label, value, amber }: { label: string; value: ReactNode; amber?: boolean }) {
  return (
    <div className="panel small stat">
      <div className="label">{label}</div>
      <div className={"v" + (amber ? " amber" : "")}>{value}</div>
    </div>
  );
}

export function Note({ tag, children, info }: { tag: string; children: ReactNode; info?: boolean }) {
  return (
    <div className={"note" + (info ? " info" : "")} role="note">
      <span className="tag">{tag}</span>
      <span>{children}</span>
    </div>
  );
}
