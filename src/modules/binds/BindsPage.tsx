import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, SectionHead, Stat, Note } from "../../components/Hud";
import { findScInstalls, importDeviceImage, isTauri, loadStore, pickFile, readFileAsDataUrl, readTextFile, saveStore, type ScInstall } from "../../lib/tauri";
import { parsePr0, countControls } from "./parsePr0";
import { parseActionmaps, indexByInput } from "./parseActionmaps";
import { inputsForControl, primaryInput } from "./mapping";
import { actionLabel, actionmapLabel } from "./labels";
import { useGamepadDetect } from "./useGamepad";
import { DeviceView } from "./DeviceView";
import type { ActionMaps, Device, DeviceConfig, DeviceControl, Placement, ScBinding } from "./types";

interface BindsStore {
  profilePath: string | null;
  actionmapsPath: string | null;
  devices: Record<string, DeviceConfig>;
}

const EMPTY_STORE: BindsStore = { profilePath: null, actionmapsPath: null, devices: {} };
const STORE_KEY = "binds";

function defaultConfig(index: number): DeviceConfig {
  return { jsSlot: index + 1, imagePath: null, placements: {} };
}

export function BindsPage() {
  const [store, setStore] = useState<BindsStore>(EMPTY_STORE);
  const [devices, setDevices] = useState<Device[]>([]);
  const [actionmaps, setActionmaps] = useState<ActionMaps | null>(null);
  const [installs, setInstalls] = useState<ScInstall[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [devId, setDevId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [cat, setCat] = useState<string>("Tous");
  const [error, setError] = useState<string | null>(null);
  const { hit, pads, reset: resetHit } = useGamepadDetect(detecting);

  // ----- chargement initial -----
  useEffect(() => {
    (async () => {
      const saved = (await loadStore<BindsStore>(STORE_KEY)) ?? EMPTY_STORE;
      setStore(saved);
      setInstalls(await findScInstalls());
      if (saved.profilePath) await loadProfile(saved.profilePath, saved);
      if (saved.actionmapsPath) await loadActionmaps(saved.actionmapsPath);
    })().catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(async (next: BindsStore) => {
    setStore(next);
    await saveStore(STORE_KEY, next);
  }, []);

  async function loadProfile(path: string, base: BindsStore = store) {
    const text = await readTextFile(path);
    const devs = parsePr0(text);
    if (devs.length === 0) throw new Error("Aucun appareil trouvé dans ce profil.");
    setDevices(devs);
    setDevId(devs[0].id);
    setSelId(devs[0].controls[0]?.id ?? null);
    const cfg = { ...base.devices };
    devs.forEach((d, i) => { if (!cfg[d.id]) cfg[d.id] = defaultConfig(i); });
    await persist({ ...base, profilePath: path, devices: cfg });
    // images déjà importées
    for (const d of devs) {
      const p = cfg[d.id]?.imagePath;
      if (p) readFileAsDataUrl(p).then((url) => setImages((m) => ({ ...m, [d.id]: url }))).catch(() => undefined);
    }
  }

  async function loadActionmaps(path: string) {
    const xml = await readTextFile(path);
    setActionmaps(parseActionmaps(xml));
    setStore((s) => { const n = { ...s, actionmapsPath: path }; saveStore(STORE_KEY, n); return n; });
  }

  // ----- actions utilisateur -----
  const onPickProfile = async () => {
    setError(null);
    const p = await pickFile([{ name: "Profil Logitech", extensions: ["pr0"] }]);
    if (p) await loadProfile(p).catch((e) => setError(String(e)));
  };
  const onPickActionmaps = async () => {
    setError(null);
    const p = await pickFile([{ name: "actionmaps.xml", extensions: ["xml"] }]);
    if (p) await loadActionmaps(p).catch((e) => setError(String(e)));
  };
  const onPickImage = async () => {
    if (!devId) return;
    setError(null);
    const src = await pickFile([{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp"] }]);
    if (!src) return;
    try {
      const dest = await importDeviceImage(src, devId);
      const url = await readFileAsDataUrl(dest);
      setImages((m) => ({ ...m, [devId]: url }));
      await persist({ ...store, devices: { ...store.devices, [devId]: { ...(store.devices[devId] ?? defaultConfig(0)), imagePath: dest } } });
    } catch (e) { setError(String(e)); }
  };
  const onPlace = async (id: string, p: Placement) => {
    if (!devId) return;
    const cfg = store.devices[devId] ?? defaultConfig(0);
    await persist({ ...store, devices: { ...store.devices, [devId]: { ...cfg, placements: { ...cfg.placements, [id]: p } } } });
    setPlacing(false);
  };
  const onSlotChange = async (slot: number) => {
    if (!devId) return;
    const cfg = store.devices[devId] ?? defaultConfig(0);
    await persist({ ...store, devices: { ...store.devices, [devId]: { ...cfg, jsSlot: slot } } });
  };
  const select = (id: string) => { setSelId(id); setZoomed(true); setDetecting(false); resetHit(); };
  const finish = () => { setZoomed(false); setPlacing(false); setDetecting(false); resetHit(); };

  // ----- données dérivées -----
  const device = devices.find((d) => d.id === devId) ?? null;
  const cfg = device ? store.devices[device.id] ?? defaultConfig(0) : null;
  const js = cfg?.jsSlot ?? 1;
  const byInput = useMemo(() => indexByInput(actionmaps?.bindings ?? []), [actionmaps]);

  const bindingsFor = useCallback((c: DeviceControl): { input: string; label: string; deduced: boolean; bindings: ScBinding[] }[] =>
    inputsForControl(js, c).map((s) => ({ ...s, bindings: byInput.get(s.input) ?? [] })), [js, byInput]);

  const actionFor = useCallback((c: DeviceControl): string => {
    const all = bindingsFor(c).flatMap((s) => s.bindings);
    if (all.length === 0) return actionmaps ? "Non lié" : "—";
    const first = actionLabel(all[0].action);
    return all.length > 1 ? `${first} +${all.length - 1}` : first;
  }, [bindingsFor, actionmaps]);

  const categoryFor = useCallback((c: DeviceControl): string => {
    const b = bindingsFor(c).flatMap((s) => s.bindings)[0];
    return b ? actionmapLabel(b.actionmap) : "—";
  }, [bindingsFor]);

  const sel = device?.controls.find((c) => c.id === selId) ?? null;
  const selIndex = device && sel ? device.controls.indexOf(sel) : -1;
  const selSubs = sel ? bindingsFor(sel) : [];
  const cats = useMemo(() => {
    const set = new Set<string>();
    device?.controls.forEach((c) => { const k = categoryFor(c); if (k !== "—") set.add(k); });
    return ["Tous", ...Array.from(set).sort()];
  }, [device, categoryFor]);
  const rows = (device?.controls ?? []).map((c, i) => ({ c, i })).filter(({ c }) => cat === "Tous" || categoryFor(c) === cat);
  const totalBound = (device?.controls ?? []).filter((c) => bindingsFor(c).some((s) => s.bindings.length)).length;
  const counts = device ? countControls(device) : { buttons: 0, axes: 0 };

  // Détection : comparer le bouton pressé à l'entrée déduite
  const hitInput = hit && hit.kind === "button" ? `js${js}_button${hit.index + 1}` : hit ? `js${js}_axe${hit.index}` : null;
  const hitMatches = hitInput ? selSubs.some((s) => s.input === hitInput) : false;

  return (
    <>
      <PageHeader
        crumb="COMMANDES ▸ BINDS"
        title="Binds joystick"
        sub={<>
          PROFIL ▸ {store.profilePath ?? "aucun"} &nbsp;·&nbsp; BINDS ▸ {store.actionmapsPath ?? "aucun"}
        </>}
        actions={<>
          <button type="button" className="btn" onClick={onPickActionmaps}>Charger actionmaps.xml</button>
          <button type="button" className="btn primary" onClick={onPickProfile}>Importer un profil .pr0</button>
        </>}
      />

      {!isTauri && <Note tag="⚠ NAVIGATEUR">Tu es dans Vite sans Tauri : la lecture de fichiers est désactivée. Lance <span className="mono">npm run tauri:dev</span> pour tester avec tes vrais fichiers.</Note>}
      {error && <Note tag="⚠ ERREUR">{error}</Note>}
      {installs.length > 0 && !store.actionmapsPath && (
        <Note tag="ⓘ DÉTECTÉ" info>
          Installation Star Citizen trouvée :&nbsp;
          {installs.map((ins) => (
            <button key={ins.actionmaps} type="button" className="btn sm" style={{ marginRight: 8 }} onClick={() => loadActionmaps(ins.actionmaps).catch((e) => setError(String(e)))}>
              Charger {ins.channel}
            </button>
          ))}
        </Note>
      )}

      {devices.length === 0 ? (
        <div className="panel empty">
          <div className="display" style={{ fontSize: 20, letterSpacing: ".1em", color: "var(--text-bright)" }}>AUCUN APPAREIL</div>
          <div style={{ marginTop: 10, lineHeight: 1.6 }}>
            Importe le profil <span className="mono">.pr0</span> de ton HOTAS (logiciel Logitech : icône d'enregistrement, en haut à gauche) pour lister ses commandes.<br />
            Puis charge <span className="mono">actionmaps.xml</span> pour voir tes binds Star Citizen.
          </div>
        </div>
      ) : (
        <>
          <section className="stat-grid" aria-label="Résumé">
            <Stat label="APPAREILS" value={String(devices.length).padStart(2, "0")} />
            <Stat label={`BOUTONS · AXES (${device?.name.toUpperCase() ?? ""})`} value={`${counts.buttons} · ${counts.axes}`} />
            <Stat label="COMMANDES LIÉES" value={actionmaps ? String(totalBound) : "—"} amber />
          </section>

          <SectionHead n="01" title="APPAREILS" />
          <div role="group" aria-label="Appareils" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch" }}>
            {devices.map((d) => {
              const c = store.devices[d.id];
              const n = countControls(d);
              return (
                <button key={d.id} type="button" className={"device-tab" + (d.id === devId ? " active" : "")} aria-pressed={d.id === devId}
                  onClick={() => { setDevId(d.id); setSelId(d.controls[0]?.id ?? null); finish(); }}>
                  <span className="slot">JS{c?.jsSlot ?? "?"}</span>
                  <span className="name">{d.group ? d.group.replace(/ control system/i, "") + " " : ""}{d.name}</span>
                  <span className="sub">{n.buttons} boutons · {n.axes} axes</span>
                </button>
              );
            })}
            {device && (
              <div className="field" style={{ justifyContent: "center", marginLeft: "auto" }}>
                <span className="label">SLOT STAR CITIZEN</span>
                <select value={js} onChange={(e) => onSlotChange(Number(e.target.value))} aria-label="Slot joystick Star Citizen">
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>js{n}{actionmaps?.joysticks.find((j) => j.instance === n)?.product ? " — " + actionmaps.joysticks.find((j) => j.instance === n)!.product.split("{")[0].trim() : ""}</option>)}
                </select>
              </div>
            )}
          </div>

          <SectionHead n="02" title="VUE DE L'APPAREIL" />
          <section style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "stretch" }}>
            <div className="panel" style={{ flex: "1 1 600px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div className="label">// JS{js} — {device?.name.toUpperCase()} — {zoomed ? "ZOOM" : placing ? "PLACEMENT" : "VUE GÉNÉRALE"}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className={"zoom-badge" + (zoomed ? " on" : "")}>{zoomed ? "ZOOM ×2.6" : "ZOOM ×1.0"}</span>
                  <button type="button" className="btn sm" onClick={onPickImage}>{images[devId!] ? "Changer l'image" : "Importer une image"}</button>
                  <button type="button" className="btn sm" onClick={finish} disabled={!zoomed && !placing}>Vue générale</button>
                </div>
              </div>
              {device && cfg && (
                <div style={{ overflowX: "auto" }}>
                  <DeviceView
                    device={device} imageUrl={images[device.id] ?? null} placements={cfg.placements}
                    selectedId={selId} zoomed={zoomed} placing={placing} actionFor={actionFor}
                    onSelect={select} onPlace={onPlace}
                  />
                </div>
              )}
              <div className="hint">
                {placing
                  ? "Clique sur l'image à l'endroit de la commande sélectionnée."
                  : "Clique une commande : la vue zoome dessus. « Terminer le bind » revient à la vue générale. Les commandes sans position apparaissent seulement dans le registre : sélectionne-les puis « Placer sur l'image »."}
              </div>
            </div>

            <div className="panel" style={{ flex: "1 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="label">{zoomed ? "// BIND EN COURS" : "// COMMANDE SÉLECTIONNÉE"}</div>
              {sel ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <div className="sel-hex">{selIndex + 1}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 12, letterSpacing: ".2em", color: "var(--amber)" }}>{sel.name.toUpperCase()}</div>
                      <div className="display" style={{ fontSize: 24, lineHeight: 1.15, color: "var(--text-bright)" }}>{actionFor(sel)}</div>
                      <div className="mono" style={{ fontSize: 13, color: "var(--cyan)" }}>{primaryInput(js, sel)}</div>
                    </div>
                  </div>

                  {selSubs.length > 0 && (
                    <div className="sublist">
                      {selSubs.map((s) => (
                        <div className="it" key={s.input}>
                          <span className="mono" style={{ fontSize: 12, letterSpacing: ".08em", color: "var(--amber)" }}>{s.label}</span>
                          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontWeight: 600, fontSize: 15 }}>
                              {s.bindings.length ? s.bindings.map((b) => actionLabel(b.action)).join(" · ") : (actionmaps ? "Non lié" : "—")}
                            </span>
                            <span className="mono" style={{ fontSize: 11, color: "var(--cyan)" }}>{s.input}{s.deduced ? " (déduit)" : ""}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selSubs.some((s) => s.deduced) && <div className="hint">Entrées « déduites » : ordre des directions ou nom d'axe supposés. Utilise la détection pour confirmer.</div>}

                  <div style={{ height: 1, background: "linear-gradient(90deg, rgba(98,208,255,.5), transparent)" }} />
                  <div className="kv"><span className="k">CATÉGORIE</span><span className="v">{categoryFor(sel)}</span></div>
                  <div className="kv"><span className="k">TYPE</span><span className="v">{sel.kind}{sel.children ? ` · ${sel.children.length} sous-commandes` : ""}</span></div>
                  <div className="kv"><span className="k">HID</span><span className="v mono">{sel.hid ?? "—"}</span></div>

                  {detecting && (
                    <div className={"detect" + (hit ? " hit" : "")}>
                      {hit
                        ? <>DÉTECTÉ ▸ manette #{hit.gamepadIndex} · {hit.kind === "button" ? `bouton ${hit.index + 1}` : `axe ${hit.index}`} ▸ <b>{hitInput}</b> {hitMatches ? "✓ correspond" : "≠ entrée déduite"}<br /><span style={{ fontSize: 11, color: "var(--muted)" }}>{hit.gamepadId}</span></>
                        : <>EN ATTENTE ▸ appuie sur la touche de ton appareil{pads.length ? ` (${pads.length} manette(s) vue(s))` : " (aucune manette vue : bouge un axe)"}</>}
                    </div>
                  )}

                  <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button type="button" className="btn" style={{ flex: 1 }} onClick={() => { setPlacing(true); setZoomed(false); }} disabled={!images[devId!]}>Placer sur l'image</button>
                      <button type="button" className="btn" style={{ flex: 1 }} onClick={() => { resetHit(); setDetecting((v) => !v); }}>{detecting ? "Arrêter" : "Détecter la touche"}</button>
                    </div>
                    <button type="button" className="btn primary" onClick={finish} disabled={!zoomed && !placing && !detecting}>Terminer le bind ▸ vue générale</button>
                  </div>
                </>
              ) : <div className="hint">Sélectionne une commande dans le registre.</div>}
            </div>
          </section>

          <SectionHead n="03" title="REGISTRE DES BINDS" />
          <section className="panel" aria-label="Liste des binds" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div className="label">// JS{js} — {device?.name.toUpperCase()}{!actionmaps && " — CHARGE ACTIONMAPS.XML POUR VOIR LES FONCTIONS"}</div>
              <div role="group" aria-label="Filtrer par catégorie" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {cats.map((k) => <button key={k} type="button" className={"tab" + (cat === k ? " active" : "")} aria-pressed={cat === k} onClick={() => setCat(k)}>{k}</button>)}
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div className="table">
                <div className="head" style={{ gridTemplateColumns: "56px 150px 200px minmax(0,1fr) 120px 90px" }}>
                  <span>N°</span><span>COMMANDE</span><span>ENTRÉE</span><span>FONCTION</span><span>CATÉGORIE</span><span>TYPE</span>
                </div>
                {rows.map(({ c, i }) => (
                  <button key={c.id} type="button" className={"row" + (c.id === selId ? " active" : "")} style={{ gridTemplateColumns: "56px 150px 200px minmax(0,1fr) 120px 90px" }} onClick={() => select(c.id)}>
                    <span className="display" style={{ fontSize: 14, color: "var(--cyan)" }}>{i + 1}{cfg?.placements[c.id] ? "" : " ·"}</span>
                    <span className="cell-amber">{c.name.toUpperCase()}</span>
                    <span className="cell-cyan">{primaryInput(js, c)}</span>
                    <span className="cell-main">{actionFor(c)}</span>
                    <span>{categoryFor(c)}</span>
                    <span className="cell-muted">{c.kind}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="hint">« · » après le numéro : commande pas encore placée sur l'image.</div>
          </section>
        </>
      )}
    </>
  );
}
