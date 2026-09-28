import { useEffect, useMemo, useState, type FormEvent } from "react";
import { authFetch } from "../../services/auth";
import "../../assets/css/approvisionnement-pages.css";
const API = (import.meta.env.VITE_API_URL || "/api/stock").replace(/\/$/, "");
type Supplier = {
  frn_id: string;
  frn_code: string | null;
  frn_nom: string;
  frn_contact: string | null;
  frn_telephone: string | null;
  frn_email: string | null;
  frn_adresse: string | null;
};
type Entry = {
  ent_id: string;
  ent_numero: string;
  ent_date: string;
  ent_bl_reference: string | null;
  ent_appliquee: boolean;
  lignes: {
    entd_id: string;
    article_designation: string;
    entd_quantite: number;
    entd_prix_unitaire: string;
  }[];
};
const blank = {
  frn_nom: "",
  frn_telephone: "",
  frn_email: "",
  frn_adresse: "",
};
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const r = await authFetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (r.status === 204) return undefined as T;
  const b: unknown = await r.json().catch(() => null);
  if (!r.ok)
    throw new Error(
      b && typeof b === "object"
        ? Object.values(b as Record<string, unknown>)
            .flat()
            .join(" ")
        : `Erreur HTTP ${r.status}.`,
    );
  return b as T;
}
export default function Fournisseurs() {
  const [items, setItems] = useState<Supplier[]>([]),
    [search, setSearch] = useState(""),
    [form, setForm] = useState(blank),
    [editing, setEditing] = useState<Supplier | null>(null),
    [detail, setDetail] = useState<Supplier | null>(null),
    [entries, setEntries] = useState<Entry[]>([]),
    [supplied, setSupplied] = useState<
      { art_code_article: string; art_designation: string }[]
    >([]),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      setItems(await api<Supplier[]>("/fournisseurs/"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      (x) =>
        !q ||
        [x.frn_nom, x.frn_code || ""].some((v) => v.toLowerCase().includes(q)),
    );
  }, [items, search]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!form.frn_nom.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    try {
      setSaving(true);
      const isUpdate = Boolean(editing?.frn_id);
      const x = await api<Supplier>(
        isUpdate ? `/fournisseurs/${editing!.frn_id}/` : "/fournisseurs/",
        {
          method: isUpdate ? "PATCH" : "POST",
          body: JSON.stringify(form),
        },
      );
      setItems((a) =>
        isUpdate ? a.map((i) => (i.frn_id === x.frn_id ? x : i)) : [x, ...a],
      );
      setNotice(isUpdate ? "Fournisseur modifié." : "Fournisseur créé.");
      setEditing(null);
      setForm(blank);
    } catch (c) {
      setError(c instanceof Error ? c.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };
  const openDetail = async (x: Supplier) => {
    setDetail(x);
    setEntries([]);
    setSupplied([]);
    try {
      const [history, articles] = await Promise.all([
        api<Entry[]>(`/fournisseurs/${x.frn_id}/livraisons/`),
        api<{ art_code_article: string; art_designation: string }[]>(
          `/fournisseurs/${x.frn_id}/articles/`,
        ),
      ]);
      setEntries(history);
      setSupplied(articles);
    } catch (c) {
      setError(c instanceof Error ? c.message : "Historique impossible.");
    }
  };
  const remove = async (x: Supplier) => {
    if (!confirm(`Supprimer ${x.frn_nom} ?`)) return;
    try {
      await api(`/fournisseurs/${x.frn_id}/`, { method: "DELETE" });
      setItems((a) => a.filter((i) => i.frn_id !== x.frn_id));
      setDetail(null);
      setNotice("Fournisseur supprimé.");
    } catch (c) {
      setError(c instanceof Error ? c.message : "Suppression impossible.");
    }
  };
  return (
    <main className="smmc-page appro-page">
      <header className="page-header">
        <div>
          <p className="page-breadcrumb">Approvisionnement / Fournisseurs</p>
          <h1 className="page-title">Fournisseurs</h1>
          <p className="page-subtitle">
            Carnet fournisseurs, contacts et historique des livraisons.
          </p>
        </div>
        <button
          className="smmc-btn smmc-btn-primary"
          onClick={() => {
            setError("");
            setNotice("");
            setEditing({} as Supplier);
            setForm(blank);
          }}
        >
          + Nouveau fournisseur
        </button>
      </header>
      {error && <div className="smmc-alert smmc-alert-danger">{error}</div>}
      {notice && <div className="smmc-alert smmc-alert-success">{notice}</div>}
      {editing && (
        <section className="content-card compact-form-card">
          <div className="content-card-header">
            <h2>
              {editing.frn_id
                ? "Modifier le fournisseur"
                : "Nouveau fournisseur"}
            </h2>
            <button
              className="smmc-btn smmc-btn-outline"
              onClick={() => setEditing(null)}
            >
              Annuler
            </button>
          </div>
          <form className="compact-form" onSubmit={save}>
            <div className="form-grid">
              {(
                [
                  ["frn_nom", "Nom *"],
                  ["frn_telephone", "Téléphone"],
                  ["frn_email", "Email"],
                  ["frn_adresse", "Adresse"],
                ] as [keyof typeof blank, string][]
              ).map(([k, l]) => (
                <label className="form-group" key={k}>
                  {l}
                  <input
                    type={k === "frn_email" ? "email" : "text"}
                    value={form[k]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [k]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="form-actions">
              <button className="smmc-btn smmc-btn-primary" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2>Liste des fournisseurs</h2>
            <p>{filtered.length} fournisseur(s)</p>
          </div>
          <div className="smmc-search">
            <span>
              <i className="bi bi-search" />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom ou code…"
            />
          </div>
        </div>
        <div className="content-card-body">
          {loading ? (
            <div className="loading-state">Chargement…</div>
          ) : (
            <div className="table-responsive">
              <table className="smmc-table">
                <thead>
                  <tr>
                    <th>Nom / code</th>
                    <th>Téléphone</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((x) => (
                    <tr key={x.frn_id}>
                      <td>
                        <strong>{x.frn_nom}</strong>
                        <small>{x.frn_code || "Sans code"}</small>
                      </td>
                      <td>{x.frn_telephone || "—"}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="action-btn"
                            title="Fiche"
                            onClick={() => void openDetail(x)}
                          >
                            <i className="bi bi-eye" />
                          </button>
                          <button
                            className="action-btn"
                            title="Modifier"
                            onClick={() => {
                              setEditing(x);
                              setForm({
                                frn_nom: x.frn_nom,
                                frn_telephone: x.frn_telephone || "",
                                frn_email: x.frn_email || "",
                                frn_adresse: x.frn_adresse || "",
                              });
                            }}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            className="action-btn danger"
                            onClick={() => void remove(x)}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      {detail && (
        <section className="content-card supplier-detail">
          <div className="content-card-header">
            <div>
              <h2>{detail.frn_nom}</h2>
              <p>
                {detail.frn_telephone || "Téléphone non renseigné"} ·{" "}
                {detail.frn_email || "Email non renseigné"}
              </p>
            </div>
            <button
              className="smmc-btn smmc-btn-outline"
              onClick={() => setDetail(null)}
            >
              Fermer
            </button>
          </div>
          <div className="content-card-body">
            <h3>Articles déjà livrés</h3>
            <p>
              {supplied.length
                ? supplied
                    .map((a) => `${a.art_code_article} — ${a.art_designation}`)
                    .join(" · ")
                : "Aucun article livré."}
            </p>
            <h3>Historique des livraisons</h3>
            {entries.length === 0 ? (
              <p>Aucune livraison enregistrée.</p>
            ) : (
              <ul className="supplier-history">
                {entries.map((e) => (
                  <li key={e.ent_id}>
                    <strong>{e.ent_numero}</strong> —{" "}
                    {e.ent_bl_reference || "Sans référence"}{" "}
                    <span>
                      {e.ent_appliquee ? "Appliquée au stock" : "Brouillon"}
                    </span>
                    <small>
                      {e.lignes
                        .map(
                          (l) =>
                            `${l.article_designation} × ${l.entd_quantite}`,
                        )
                        .join(", ")}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
