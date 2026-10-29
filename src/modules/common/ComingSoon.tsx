import { PageHeader, Note } from "../../components/Hud";

export function ComingSoon({ title, crumb, lines }: { title: string; crumb: string; lines: string[] }) {
  return (
    <>
      <PageHeader crumb={crumb} title={title} sub="Module prévu, pas encore développé." />
      <div className="panel coming">
        <div className="label">// CE QUE CE MODULE FERA</div>
        <ul>{lines.map((l) => <li key={l}>{l}</li>)}</ul>
        <Note tag="INFO" info>Les données viendront d'APIs communautaires (UEX, wiki Star Citizen, FleetYards) ou de tes fichiers locaux. Rien n'est lu dans la mémoire du jeu.</Note>
      </div>
    </>
  );
}
