import { useEffect, useMemo, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { PageHeader, SectionHead, Stat, Note } from "../../components/Hud";
import { Pic } from "../../components/Pic";
import { PLACES } from "../../lib/images";
import { isTauri, loadStore, saveStore } from "../../lib/tauri";
import { BOARDS, GUILD_SOURCES, IAE_HALLS, KEYCARDS, KIND_FR, NYX_FACTIONS, OPS, OPS_DATE, OPS_VERSION, STATUS_FR, type Op, type OpKind } from "./data";
import "./ops.css";

type Tab = OpKind | "guilds";
const TABS: { id: Tab; label: string }[] = [
  { id: "instance", label: KIND_FR.instance.label }, { id: "contested", label: KIND_FR.contested.label }, { id: "exec", label: KIND_FR.exec.label },
  { id: "guilds", label: "Halls de guilde" }, { id: "upcoming", label: KIND_FR.upcoming.label },
];
const open = (url: string) => { if (isTauri) void openUrl(url); else window.open(url, "_blank", "noopener"); };

function Sources({ list }: { list: { label: string; url: string }[] }) {
  return (
    <div className="ops-sources">
      <span className="label">SOURCES</span>
      {list.map((s) => <button key={s.url} type="button" className="ops-link" onClick={() => open(s.url)}>{s.label} ↗</button>)}
    </div>
  );
}

function OpCard({ op }: { op: Op }) {
  const st = STATUS_FR[op.status];
  return (
    <article className="panel ops-card">
      <div className="ops-hero">
        <Pic src={op.img} alt={op.name} ratio="21 / 9" />
        <div className="ops-hero-cap">
          <span className="ops-status" style={{ color: st.color, borderColor: st.color }}>{st.label}</span>
          <h3 className="display">{op.name}</h3>
          <div className="mono ops-where">{op.system.toUpperCase()} ▸ {op.where}</div>
        </div>
      </div>
      <div className="ops-body">
        <div className="ops-meta"><span className="hud-chip">{op.players}</span></div>
        <p className="ops-summary">{op.summary}</p>
        <div className="ops-cols">
          <section>
            <div className="label ops-h" style={{ color: "var(--cyan)" }}>COMMENT Y ACCÉDER</div>
            <ul className="ops-list">{op.access.map((a) => <li key={a}>{a}</li>)}</ul>
            <div className="label ops-h" style={{ color: "var(--cyan)" }}>DÉROULÉ</div>
            {op.steps.map((s) => (
              <div key={s.title} className="ops-step">
                <div className="ops-step-t">{s.title}</div>
                <ul className="ops-list">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </section>
          <section>
            <div className="label ops-h" style={{ color: "var(--amber)" }}>BUTIN ET RÉCOMPENSES · {op.loot.length}</div>
            <div className="ops-loot">
              {op.loot.map((l) => <div key={l.name} className="ops-loot-row"><b>{l.name}</b>{l.note && <small>{l.note}</small>}</div>)}
            </div>
            {op.tips.length > 0 && (<><div className="label ops-h" style={{ color: "var(--green)" }}>CONSEILS</div><ul className="ops-list">{op.tips.map((t) => <li key={t}>{t}</li>)}</ul></>)}
            {op.unknown && op.unknown.length > 0 && (<><div className="label ops-h">NON DOCUMENTÉ</div><div className="hint" style={{ margin: 0 }}>{op.unknown.join(" · ")}</div></>)}
          </section>
        </div>
        <Sources list={op.sources} />
      </div>
    </article>
  );
}

/** Suivi des sept cartes de circuit, gardé d'une session à l'autre. */
function Boards() {
  const [have, setHave] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { let alive = true; loadStore<{ boards?: number[] }>("ops-progress").catch(() => null).then((v) => { if (alive) { setHave(Array.isArray(v?.boards) ? v!.boards! : []); setReady(true); } }); return () => { alive = false; }; }, []);
  const set = (next: number[]) => { setHave(next); if (ready) void saveStore("ops-progress", { boards: next }).catch(() => undefined); };
  return (
    <div className="panel">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
        <div className="label">MES CARTES DE CIRCUIT · {have.length} / 7</div>
        {have.length > 0 && <button type="button" className="btn sm" onClick={() => set([])}>Tout décocher</button>}
      </div>
      <div className="ops-boards">
        {BOARDS.map((b) => {
          const on = have.includes(b.n);
          return (
            <button key={b.n} type="button" className={"ops-board" + (on ? " on" : "")} aria-pressed={on} onClick={() => set(on ? have.filter((x) => x !== b.n) : [...have, b.n])}>
              <span className="display ops-board-n">{b.n}</span>
              <span style={{ minWidth: 0 }}><b>{b.zone}</b><small>{b.path}</small></span>
              <span className="ops-board-check" aria-hidden="true">{on ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
      <div className="label" style={{ marginTop: 18, marginBottom: 6 }}>CARTES D'ACCÈS ET OÙ LES OBTENIR</div>
      {KEYCARDS.map((k) => <div key={k.name} className="ops-key"><i style={{ background: k.color }} /><b>{k.name}</b><span>{k.where}</span></div>)}
      <div className="hint">Ordre conseillé : carte rouge (zones Supervisor), puis cartes bleues et cartes 1 à 4 et 7 (Checkmate, Orbituary), puis Ruin Station pour les cartes 5 et 6. Toutes les imprimantes ont un délai de 30 minutes.</div>
    </div>
  );
}

function Guilds() {
  return (
    <>
      <Note tag="⚠ À SAVOIR">
        Les halls de guilde permanents ne sont pas encore dans le jeu LIVE. Ils arrivent avec l'Alpha 5.0, qui était toujours sur le serveur de test (PTU) au 19/11/2026. Ce qui existe en jeu aujourd'hui, ce sont les quatre halls de guilde temporaires du salon IAE 2956.
      </Note>
      <article className="panel ops-card">
        <div className="ops-hero">
          <Pic src={PLACES.newBabbage} alt="New Babbage" ratio="21 / 9" />
          <div className="ops-hero-cap">
            <span className="ops-status" style={{ color: "var(--green)", borderColor: "var(--green)" }}>EN JEU · TEMPORAIRE</span>
            <h3 className="display">Halls de guilde de l'IAE 2956</h3>
            <div className="mono ops-where">STANTON ▸ microTech ▸ New Babbage ▸ Tobin Expo Center</div>
          </div>
        </div>
        <div className="ops-body">
          <p className="ops-summary">Le salon Intergalactic Aerospace Expo a ouvert le 13/11/2026. Son hall central mène à quatre halls de guilde, chacun parrainé par une guilde qui y expose les vaisseaux qu'utilisent ses membres.</p>
          <div className="ops-guilds">
            {IAE_HALLS.map((g) => <div key={g.name} className="ops-guild"><b>{g.name}</b><small>{g.note}</small></div>)}
          </div>
          <div className="ops-cols">
            <section>
              <div className="label ops-h" style={{ color: "var(--cyan)" }}>COMMENT Y ACCÉDER</div>
              <ul className="ops-list">
                <li>Rends-toi à New Babbage, sur microTech, puis au Tobin Expo Center.</li>
                <li>Depuis le hall central, quatre accès mènent aux quatre halls.</li>
              </ul>
            </section>
            <section>
              <div className="label ops-h" style={{ color: "var(--amber)" }}>CE QU'ON Y TROUVE</div>
              <ul className="ops-list">
                <li>Bornes de location : plus de 200 vaisseaux et véhicules à essayer gratuitement, un constructeur différent mis en avant chaque jour.</li>
                <li>D'autres salles : expositions de gameplay, boutique, vitrines d'armures et d'armes.</li>
              </ul>
            </section>
          </div>
          <div className="hint" style={{ margin: 0 }}>Ce sont des halls d'exposition liés à l'événement : ils ne donnent pas de contrats et disparaîtront avec le salon. Date de fin non relevée.</div>
        </div>
      </article>

      <article className="panel ops-card">
        <div className="ops-hero">
          <Pic src={PLACES.levski} alt="Nyx" ratio="21 / 9" />
          <div className="ops-hero-cap">
            <span className="ops-status" style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>SERVEUR DE TEST (PTU) · ALPHA 5.0</span>
            <h3 className="display">Halls de guilde permanents</h3>
            <div className="mono ops-where">NYX ▸ Nyx I</div>
          </div>
        </div>
        <div className="ops-body">
          <p className="ops-summary">Avec l'Alpha 5.0, chaque guilde aura un bâtiment à elle sur la planète Nyx I. On y prendra ses contrats sur des tableaux de contrats (Contract Boards), au lieu de tout passer par le mobiGlas.</p>
          <div className="ops-cols">
            <section>
              <div className="label ops-h" style={{ color: "var(--cyan)" }}>CE QUI EST ANNONCÉ</div>
              <ul className="ops-list">
                <li>Tableaux de contrats avec quatre portées : locale, planétaire, système, universelle.</li>
                <li>Contrats de guilde et de faction, avec des chaînes de missions.</li>
                <li>Contrats ouverts guilde par guilde au fil des versions de test.</li>
                <li>Bâtiments de commandement avec salles verrouillées contenant du butin.</li>
              </ul>
            </section>
            <section>
              <div className="label ops-h">FACTIONS PRÉSENTES DANS NYX</div>
              <div className="ops-tags">{NYX_FACTIONS.map((f) => <span key={f} className="hud-chip">{f}</span>)}</div>
              <div className="hint">Citées dans les notes de la 5.0 pour leurs tenues. Aucune source ne confirme encore lesquelles ont un hall.</div>
              <div className="label ops-h">NON DOCUMENTÉ</div>
              <div className="hint" style={{ margin: 0 }}>Liste des guildes concernées · nom et emplacement de chaque hall sur Nyx I · rangs et récompenses · date de sortie en LIVE</div>
            </section>
          </div>
          <div className="hint" style={{ margin: 0 }}>Je compléterai cette fiche avec les emplacements dès que la 5.0 sera sortie et documentée. En attendant, les paliers de réputation des guildes actuelles sont dans l'onglet Réputations.</div>
          <Sources list={GUILD_SOURCES} />
        </div>
      </article>
    </>
  );
}

export function OpsPage() {
  const [tab, setTab] = useState<Tab>("instance");
  const list = useMemo(() => OPS.filter((o) => o.kind === tab), [tab]);
  const live = OPS.filter((o) => o.status === "live");
  return (
    <>
      <PageHeader crumb="UNIVERS ▸ OPÉRATIONS" title="Opérations" sub="Instances privées, zones contestées, hangar exécutif et halls de guilde : où c'est, comment y entrer, ce qu'on y gagne."
        banner={{ src: PLACES.ruinStation, kicker: "OPÉRATIONS ▸ ACCÈS, DÉROULÉ ET BUTIN", text: "Chaque fiche dit où aller, comment lancer l'activité, les étapes dans l'ordre et ce qu'on peut y ramasser." }} />
      <Note tag="⚠ DONNÉES COMMUNAUTAIRES">Relevé du {OPS_DATE} sur l'{OPS_VERSION}, d'après le wiki et des guides de joueurs. Ce que les sources ne précisent pas est indiqué « non documenté » plutôt qu'inventé. À revérifier après chaque patch.</Note>
      <section className="stat-grid" aria-label="Résumé">
        <Stat label="ACTIVITÉS EN JEU" value={live.length} />
        <Stat label="INSTANCES PRIVÉES" value={OPS.filter((o) => o.kind === "instance").length} />
        <Stat label="CARTES POUR LE HANGAR EXÉCUTIF" value="7" amber />
      </section>

      <SectionHead n="01" title="TYPE D'ACTIVITÉ" />
      <div role="tablist" aria-label="Type d'activité" className="mk-cats" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {TABS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={"tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>{t.label}{t.id !== "guilds" ? ` · ${OPS.filter((o) => o.kind === t.id).length}` : ""}</button>)}
      </div>
      {tab !== "guilds" && <div className="hint">{KIND_FR[tab].hint}</div>}

      {tab === "guilds" ? <Guilds /> : (
        <>
          {(tab === "contested" || tab === "exec") && <Boards />}
          {list.map((o) => <OpCard key={o.id} op={o} />)}
        </>
      )}
    </>
  );
}
