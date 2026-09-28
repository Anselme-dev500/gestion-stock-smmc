import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { authFetch } from "../../services/auth";
import "./chef-departement.css";

const API = (import.meta.env.VITE_API_URL || "/api/stock").replace(/\/$/, "");
type Ligne = { id: string; code_article: string; designation: string; unite: string; quantite_demandee: number; quantite_disponible: number; quantite_accordee: number };
type Validation = { niveau: string; statut: string; date: string; validateur: string; commentaire: string | null };
type Demande = { id: string; numero: string; date: string; type: string; statut: string; motif: string | null; centre: string; demandeur: string; peut_decider: boolean; traitee_par_moi: boolean; lignes: Ligne[]; validations: Validation[] };
type Data = { profil: { nom: string; matricule: string; departement: string }; stats: { total: number; a_valider: number; validees: number; refusees: number; urgentes: number }; demandes: Demande[]; services: { id: string; nom: string; nom_court: string | null; description: string | null }[] };

const labels: Record<string, string> = { soumise: "Soumise", en_cours: "En cours", livree: "Livrée", refusee: "Refusée", dept_demandeur: "Chef du département", responsable_stock: "Responsable stock", dept_appro: "Département Approvisionnement" };
const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await authFetch(`${API}/chef/${path}`, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body && typeof body === "object" ? Object.values(body as Record<string, unknown>).flat().join(" ") : `Erreur HTTP ${response.status}.`);
  return body as T;
}

export default function EspaceChefDepartement() {
  const pathname = useLocation().pathname;
  const section = pathname.endsWith("/demandes") ? "demandes" : pathname.endsWith("/historique") ? "historique" : pathname.endsWith("/services") ? "services" : pathname.endsWith("/profil") ? "profil" : "dashboard";
  const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState<Demande | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("tous");
  const [comment, setComment] = useState("");
  const [refusing, setRefusing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setError("");
    try { setData(await api<Data>("tableau-de-bord/")); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Chargement impossible."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => (data?.demandes || []).filter((item) => {
    const belongs = section === "demandes" ? item.peut_decider : section === "historique" ? item.traitee_par_moi : true;
    const matches = `${item.numero} ${item.demandeur} ${item.centre}`.toLowerCase().includes(search.toLowerCase());
    return belongs && matches && (status === "tous" || item.statut === status);
  }), [data, search, section, status]);

  const decide = async (action: "valider" | "refuser") => {
    if (!selected) return;
    if (action === "refuser" && !comment.trim()) { setError("Le motif est obligatoire pour refuser une demande."); return; }
    setBusy(true); setError("");
    try {
      await api(`demandes/${selected.id}/decision/`, { method: "POST", body: JSON.stringify({ action, commentaire: comment }) });
      setNotice(action === "valider" ? "Demande validée et transmise à l'étape suivante." : "Refus enregistré avec son motif.");
      setSelected(null); setComment(""); setRefusing(false); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Décision impossible."); }
    finally { setBusy(false); }
  };

  const title = section === "demandes" ? "Demandes à valider" : section === "historique" ? "Historique de mes décisions" : section === "services" ? "Services du département" : section === "profil" ? "Mon profil" : "Tableau de bord";
  return <main className="chef-page">
    <header className="page-header chef-page-head"><div><p className="page-breadcrumb">Espace département / {title}</p><h1 className="page-title">{title}</h1><p className="page-subtitle">{section === "demandes" ? "Les seules demandes qui attendent votre décision." : section === "historique" ? "Les décisions déjà prises dans votre périmètre." : section === "services" ? "Services rattachés à votre département." : section === "profil" ? "Informations de votre fonction de validation." : "Vision limitée aux demandes de votre département."}</p></div><button className="smmc-btn smmc-btn-outline" onClick={() => { setLoading(true); void load(); }}><i className="bi bi-arrow-clockwise" /> Actualiser</button></header>
    {error && <div className="smmc-alert smmc-alert-danger">{error}</div>}{notice && <div className="smmc-alert smmc-alert-success">{notice}</div>}
    {section === "dashboard" && <><section className="chef-welcome"><div><span>ESPACE CHEF DE DÉPARTEMENT</span><h2>{data?.profil.departement || "Votre département"}</h2><p>{data?.profil.nom || "Chef de département"} · {data?.profil.matricule || "—"}</p></div><i className="bi bi-clipboard2-check" /></section><section className="chef-stats-grid"><div><i className="bi bi-hourglass-split amber" /><span>À valider</span><strong>{data?.stats.a_valider ?? "—"}</strong></div><div><i className="bi bi-files blue" /><span>Demandes suivies</span><strong>{data?.stats.total ?? "—"}</strong></div><div><i className="bi bi-check-circle green" /><span>Mes validations</span><strong>{data?.stats.validees ?? "—"}</strong></div><div><i className="bi bi-exclamation-circle red" /><span>Urgentes</span><strong>{data?.stats.urgentes ?? "—"}</strong></div></section></>}
    {section === "services" ? <section className="content-card chef-list-card"><div className="content-card-header"><div><h2>Mes services</h2><p>{data?.services.length || 0} service(s) actif(s)</p></div></div><div className="chef-services">{data?.services.length ? data.services.map((service) => <article key={service.id}><i className="bi bi-diagram-3" /><div><strong>{service.nom}</strong><small>{service.nom_court || "Sans nom court"}</small><p>{service.description || "Aucune description renseignée."}</p></div></article>) : <p className="empty-state">Aucun service actif n'est rattaché à ce département.</p>}</div></section> : section === "profil" ? <section className="content-card chef-profile"><i className="bi bi-person-check" /><div><p>FICHE PROFESSIONNELLE</p><h2>{data?.profil.nom || "Chef de département"}</h2><dl><div><dt>Matricule</dt><dd>{data?.profil.matricule || "—"}</dd></div><div><dt>Département</dt><dd>{data?.profil.departement || "Non renseigné"}</dd></div><div><dt>Rôle</dt><dd>Chef de département</dd></div></dl></div></section> : <section className="content-card chef-list-card"><div className="content-card-header"><div><h2>{section === "demandes" ? "En attente de votre décision" : section === "historique" ? "Décisions enregistrées" : "Demandes récentes"}</h2><p>{rows.length} demande(s)</p></div></div><div className="chef-filters"><label><i className="bi bi-search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Référence, demandeur ou service…" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="tous">Tous les statuts</option><option value="soumise">Soumises</option><option value="en_cours">En cours</option><option value="livree">Livrées</option><option value="refusee">Refusées</option></select></div>{loading ? <div className="loading-state">Chargement…</div> : <div className="table-responsive"><table className="smmc-table chef-table"><thead><tr><th>Référence</th><th>Demandeur / service</th><th>Date</th><th>Articles</th><th>Statut</th><th>Action</th></tr></thead><tbody>{rows.length ? rows.map((item) => <tr key={item.id}><td><strong>{item.numero}</strong>{item.type === "urgence" && <small className="chef-urgent">Urgente</small>}</td><td><strong>{item.demandeur}</strong><small>{item.centre}</small></td><td>{formatDate(item.date)}</td><td>{item.lignes.length} article(s)</td><td><span className={`chef-status ${item.statut}`}>{labels[item.statut] || item.statut}</span></td><td><button className="chef-link-button" onClick={() => { setSelected(item); setComment(""); setRefusing(false); }}>{item.peut_decider ? "Examiner" : "Voir"} <i className="bi bi-arrow-up-right" /></button></td></tr>) : <tr><td colSpan={6}><p className="empty-state">Aucune demande dans cette liste.</p></td></tr>}</tbody></table></div>}</section>}
    {selected && <div className="chef-drawer-backdrop" onMouseDown={() => setSelected(null)}><section className="chef-drawer" onMouseDown={(event) => event.stopPropagation()}><header><div><p>DEMANDE DE FOURNITURE</p><h2>{selected.numero}</h2></div><button className="action-btn" onClick={() => setSelected(null)} aria-label="Fermer"><i className="bi bi-x-lg" /></button></header><div className="chef-drawer-body"><div className="chef-detail-grid"><div><span>Demandeur</span><strong>{selected.demandeur}</strong></div><div><span>Service</span><strong>{selected.centre}</strong></div><div><span>Date</span><strong>{formatDate(selected.date)}</strong></div><div><span>Type</span><strong>{selected.type === "urgence" ? "Urgente" : "Normale"}</strong></div></div>{selected.motif && <p className="chef-motif"><strong>Motif : </strong>{selected.motif}</p>}<h3>Articles demandés</h3><div className="table-responsive"><table className="smmc-table chef-lines"><thead><tr><th>Code / désignation</th><th>Unité</th><th>Demandée</th><th>Disponible</th><th>Accordée</th></tr></thead><tbody>{selected.lignes.map((line) => <tr key={line.id}><td><strong>{line.code_article}</strong><small>{line.designation}</small></td><td>{line.unite}</td><td>{line.quantite_demandee}</td><td>{line.quantite_disponible}</td><td>{line.quantite_accordee}</td></tr>)}</tbody></table></div><h3>Historique</h3><div className="chef-history">{selected.validations.length ? selected.validations.map((validation, index) => <div key={`${validation.niveau}-${index}`}><i className={`bi ${validation.statut === "validee" ? "bi-check-circle-fill" : "bi-x-circle-fill"}`} /><p><strong>{labels[validation.niveau] || validation.niveau} · {validation.statut === "validee" ? "Validée" : "Refusée"}</strong><span>{validation.validateur} · {formatDate(validation.date)}</span>{validation.commentaire && <em>{validation.commentaire}</em>}</p></div>) : <p>Aucune décision enregistrée.</p>}</div>{selected.peut_decider && <section className="chef-decision"><h3>Votre décision</h3><p>La décision est définitive, horodatée et associée à votre compte.</p><label>Commentaire {refusing ? "— motif obligatoire" : "— facultatif"}<textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Précision utile…" /></label><div>{refusing ? <><button className="smmc-btn smmc-btn-outline" onClick={() => setRefusing(false)}>Annuler</button><button className="smmc-btn smmc-btn-danger" disabled={busy || !comment.trim()} onClick={() => void decide("refuser")}>{busy ? "Traitement…" : "Confirmer le refus"}</button></> : <><button className="smmc-btn smmc-btn-outline-danger" disabled={busy} onClick={() => setRefusing(true)}>Refuser</button><button className="smmc-btn smmc-btn-primary" disabled={busy} onClick={() => void decide("valider")}>{busy ? "Traitement…" : "Valider"}</button></>}</div></section>}</div></section></div>}
  </main>;
}
