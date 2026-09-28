import { useEffect, useMemo, useState, type FormEvent } from "react";
import { authFetch } from "../../services/auth";

const API = (import.meta.env.VITE_API_URL || "/api/stock").replace(/\/$/, "");
type Article = { art_code_article: string; art_designation: string };
type Emplacement = {
  emp_id: string;
  emp_code: string;
  emp_description: string;
};
type Inventory = {
  inv_id: string;
  inv_numero: string;
  inv_type: "total" | "partiel";
  inv_statut: "en_cours" | "cloture";
  inv_date_debut: string;
  responsable_nom: string;
};
type Line = {
  linv_id: string;
  linv_inventaire: string;
  article_code: string;
  article_designation: string;
  article_reference: string | null;
  article_prix_unitaire: string | number;
  article_unite: string;
  article_test: boolean;
  emplacement_code: string;
  linv_quantite_theorique: string | number;
  linv_quantite_reelle: string | number;
  valeur_reelle: string | number;
  ecart: string | number;
  linv_note: string | null;
};
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await authFetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const b = await r.json().catch(() => null);
  if (!r.ok)
    throw Error(
      typeof b?.detail === "string" ? b.detail : `Erreur HTTP ${r.status}`,
    );
  return b as T;
}
const number = (value: string | number) =>
  Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 3 });

export default function Inventaire() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [locations, setLocations] = useState<Emplacement[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [selected, setSelected] = useState<Inventory | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [form, setForm] = useState({
    numero: "",
    type: "total" as "total" | "partiel",
    articles: [] as string[],
    locations: [] as string[],
  });
  const [lineForm, setLineForm] = useState({
    code_article: "",
    emplacement: "",
    quantite_reelle: "0",
    note: "",
  });
  const load = async () => {
    try {
      const [i, a, e] = await Promise.all([
        api<Inventory[]>("/inventaires/"),
        api<Article[]>("/articles/"),
        api<Emplacement[]>("/emplacements/"),
      ]);
      setInventories(i);
      setArticles(a);
      setLocations(e);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Chargement impossible.",
      );
    }
  };
  const loadLines = async (inventory: Inventory) => {
    setSelected(inventory);
    try {
      setLines(
        await api<Line[]>(
          `/lignes-inventaires/?linv_inventaire=${inventory.inv_id}`,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Chargement des lignes impossible.",
      );
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const totals = useMemo(
    () => ({
      total: lines.reduce((sum, line) => sum + Number(line.valeur_reelle), 0),
      ecarts: lines.filter((line) => Number(line.ecart) !== 0).length,
    }),
    [lines],
  );
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (
      form.type === "partiel" &&
      !form.articles.length &&
      !form.locations.length
    ) {
      setError(
        "Pour un inventaire partiel, sélectionnez au moins un article ou un emplacement.",
      );
      return;
    }
    try {
      const inventory = await api<Inventory>("/inventaires/", {
        method: "POST",
        body: JSON.stringify({
          inv_type: form.type,
          articles: form.articles,
          emplacements: form.locations,
        }),
      });
      setOpen(false);
      setForm({ numero: "", type: "total", articles: [], locations: [] });
      setNotice(`Inventaire ${inventory.inv_numero} démarré.`);
      await load();
      setSelected(inventory);
      setLines([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Création impossible.");
    }
  };
  const removeInventory = async (inventory: Inventory) => {
    if (!window.confirm(`Supprimer l’inventaire ${inventory.inv_numero} ?`)) return;
    try {
      await api<void>(`/inventaires/${inventory.inv_id}/`, { method: "DELETE" });
      setInventories((all) => all.filter((item) => item.inv_id !== inventory.inv_id));
      if (selected?.inv_id === inventory.inv_id) { setSelected(null); setLines([]); }
      setNotice("Inventaire supprimé.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Suppression impossible."); }
  };
  const setLine = (
    id: string,
    key: "linv_quantite_reelle" | "linv_note",
    value: string,
  ) =>
    setLines((all) =>
      all.map((line) =>
        line.linv_id === id
          ? {
              ...line,
              [key]: key === "linv_quantite_reelle" ? value : value,
              valeur_reelle:
                key === "linv_quantite_reelle"
                  ? Number(value || 0) * Number(line.article_prix_unitaire)
                  : line.valeur_reelle,
              ecart:
                key === "linv_quantite_reelle"
                  ? Number(value || 0) - Number(line.linv_quantite_theorique)
                  : line.ecart,
            }
          : line,
      ),
    );
  const saveLine = async (line: Line) => {
    setSaving(line.linv_id);
    try {
      await api<Line>(`/lignes-inventaires/${line.linv_id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          linv_quantite_reelle: Number(line.linv_quantite_reelle),
          linv_note: line.linv_note || "",
        }),
      });
      setNotice("Comptage enregistré.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(null);
    }
  };
  const removeLine = async (line: Line) => {
    if (!window.confirm(`Supprimer la ligne ${line.article_code} / ${line.emplacement_code} ?`)) return;
    try {
      await api<void>(`/lignes-inventaires/${line.linv_id}/`, { method: "DELETE" });
      setLines((all) => all.filter((item) => item.linv_id !== line.linv_id));
      setNotice("Ligne supprimée.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Suppression de ligne impossible."); }
  };
  const close = async () => {
    if (
      !selected ||
      !window.confirm(
        "Clôturer cet inventaire est irréversible et ajustera le stock par emplacement. Continuer ?",
      )
    )
      return;
    try {
      await api<Inventory>(`/inventaires/${selected.inv_id}/cloturer/`, {
        method: "POST",
      });
      setNotice("Inventaire clôturé et stocks ajustés par emplacement.");
      await load();
      await loadLines({ ...selected, inv_statut: "cloture" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Clôture impossible.");
    }
  };
  const addLine = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    try {
      const line = await api<Line>(
        `/inventaires/${selected.inv_id}/ajouter_ligne/`,
        { method: "POST", body: JSON.stringify(lineForm) },
      );
      setLines((all) => [...all, line]);
      setLineForm({
        code_article: "",
        emplacement: "",
        quantite_reelle: "0",
        note: "",
      });
      setNotice("Ligne d’inventaire ajoutée.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Ajout de ligne impossible.",
      );
    }
  };
  const toggle = (key: "articles" | "locations", value: string) =>
    setForm((old) => ({
      ...old,
      [key]: old[key].includes(value)
        ? old[key].filter((id) => id !== value)
        : [...old[key], value],
    }));
  return (
    <main className="smmc-page inventory-page">
      <header className="page-header">
        <div>
          <p className="page-breadcrumb">Gestion du stock / Inventaire</p>
          <h1 className="page-title">Inventaire</h1>
          <p className="page-subtitle">
            Comptage physique par article et par emplacement.
          </p>
        </div>
        <div className="inventory-header-actions">
          <button className="smmc-btn smmc-btn-outline" onClick={() => void load()}>
            <i className="bi bi-arrow-clockwise" /> Actualiser
          </button>
          <button className="smmc-btn smmc-btn-primary" onClick={() => setOpen(!open)}>
            + Nouvel inventaire
          </button>
        </div>
      </header>
      {error && <div className="smmc-alert smmc-alert-danger">{error}</div>}
      {notice && <div className="smmc-alert smmc-alert-success">{notice}</div>}
      {open && (
        <section className="content-card compact-form-card">
          <div className="content-card-header">
            <div>
              <h2>Démarrer un inventaire</h2>
              <p>
                Les lignes sont générées automatiquement depuis le stock par
                emplacement.
              </p>
            </div>
          </div>
          <form className="compact-form" onSubmit={create}>
            <div className="form-grid">
              <label className="form-group">
                Numéro d’inventaire
                <input
                  value="Généré automatiquement par le système"
                  disabled
                />
              </label>
              <label className="form-group">
                Type *
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value as "total" | "partiel",
                    })
                  }
                >
                  <option value="total">Inventaire total</option>
                  <option value="partiel">Inventaire partiel</option>
                </select>
              </label>
            </div>
            {form.type === "partiel" && (
              <div className="inventory-selection">
                <p>
                  <strong>Périmètre du comptage</strong> — choisissez des
                  articles et/ou des emplacements.
                </p>
                <div className="inventory-selector">
                  <div>
                    <h3>Articles</h3>
                    {articles.map((article) => (
                      <label key={article.art_code_article}>
                        <input
                          type="checkbox"
                          checked={form.articles.includes(
                            article.art_code_article,
                          )}
                          onChange={() =>
                            toggle("articles", article.art_code_article)
                          }
                        />{" "}
                        {article.art_code_article} — {article.art_designation}
                      </label>
                    ))}
                  </div>
                  <div>
                    <h3>Emplacements</h3>
                    {locations.map((location) => (
                      <label key={location.emp_id}>
                        <input
                          type="checkbox"
                          checked={form.locations.includes(location.emp_id)}
                          onChange={() => toggle("locations", location.emp_id)}
                        />{" "}
                        {location.emp_code} — {location.emp_description}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="smmc-btn smmc-btn-outline"
                onClick={() => setOpen(false)}
              >
                Annuler
              </button>
              <button className="smmc-btn smmc-btn-primary">
                Démarrer le comptage
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="content-card">
        <div className="content-card-header">
          <div>
            <h2>Sessions d’inventaire</h2>
            <p>{inventories.length} session(s) enregistrée(s).</p>
          </div>
        </div>
        <div className="content-card-body">
          <div className="table-responsive">
            <table className="smmc-table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Responsable</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {inventories.map((inventory) => (
                  <tr key={inventory.inv_id}>
                    <td>
                      <strong>{inventory.inv_numero}</strong>
                    </td>
                    <td>{inventory.inv_type}</td>
                    <td>
                      {new Date(inventory.inv_date_debut).toLocaleDateString(
                        "fr-FR",
                      )}
                    </td>
                    <td>{inventory.responsable_nom}</td>
                    <td>
                      <span
                        className={`status-badge ${inventory.inv_statut === "cloture" ? "status-success" : "status-warning"}`}
                      >
                        {inventory.inv_statut === "cloture"
                          ? "Clôturé"
                          : "En cours"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="action-btn"
                        onClick={() => void loadLines(inventory)}
                        title="Ouvrir"
                      >
                        <i className="bi bi-eye" />
                      </button>
                      {inventory.inv_statut === "en_cours" && (
                        <button className="action-btn danger" onClick={() => void removeInventory(inventory)} title="Supprimer l’inventaire">
                          <i className="bi bi-trash" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {selected && (
        <section className="content-card inventory-count-card">
          <div className="content-card-header">
            <div>
              <h2>Comptage — {selected.inv_numero}</h2>
              <p>
                PU et valeur sont calculés automatiquement. Seuls la quantité
                réelle et la note sont modifiables.
              </p>
            </div>
            {selected.inv_statut === "en_cours" && (
              <button
                className="smmc-btn smmc-btn-danger"
                onClick={() => void close()}
              >
                Clôturer l’inventaire
              </button>
            )}
          </div>
          {selected.inv_statut === "en_cours" && (
            <form
              className="compact-form inventory-add-line"
              onSubmit={addLine}
            >
              <div className="form-grid">
                <label className="form-group">
                  Code article *
                  <select
                    value={lineForm.code_article}
                    onChange={(e) =>
                      setLineForm({ ...lineForm, code_article: e.target.value })
                    }
                    required
                  >
                    <option value="">Rechercher / sélectionner</option>
                    {articles.map((a) => (
                      <option
                        key={a.art_code_article}
                        value={a.art_code_article}
                      >
                        {a.art_code_article} — {a.art_designation}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-group">
                  Emplacement *
                  <input
                    value={lineForm.emplacement}
                    onChange={(e) => setLineForm({ ...lineForm, emplacement: e.target.value.toUpperCase() })}
                    placeholder="Ex. RACK11"
                    maxLength={30}
                    required
                  />
                </label>
                <label className="form-group">
                  Quantité réelle *
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={lineForm.quantite_reelle}
                    onChange={(e) =>
                      setLineForm({
                        ...lineForm,
                        quantite_reelle: e.target.value,
                      })
                    }
                    required
                  />
                </label>
                <label className="form-group">
                  Note
                  <input
                    value={lineForm.note}
                    onChange={(e) =>
                      setLineForm({ ...lineForm, note: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="form-actions">
                <button className="smmc-btn smmc-btn-outline">
                  + Ajouter la ligne
                </button>
              </div>
            </form>
          )}
          <div className="inventory-summary">
            <span>{lines.length} ligne(s)</span>
            <span>{totals.ecarts} écart(s)</span>
            <strong>Valeur comptée : {number(totals.total)} Ar</strong>
          </div>
          <div className="content-card-body">
            <div className="table-responsive">
              <table className="smmc-table inventory-lines-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Désignation</th>
                    <th>Emplacement</th>
                    <th>Quantité</th>
                    <th>PU</th>
                    <th>Valeur</th>
                    <th>Unité</th>
                    <th>Note</th>
                    <th>Test</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr
                      key={line.linv_id}
                      className={
                        Number(line.ecart) !== 0 ? "stock-row-low" : ""
                      }
                    >
                      <td>
                        <strong>{line.article_code}</strong>
                      </td>
                      <td>{line.article_designation}</td>
                      <td>{line.emplacement_code}</td>
                      <td>
                        {selected.inv_statut === "en_cours" ? (
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={line.linv_quantite_reelle}
                            onChange={(e) =>
                              setLine(
                                line.linv_id,
                                "linv_quantite_reelle",
                                e.target.value,
                              )
                            }
                          />
                        ) : (
                          number(line.linv_quantite_reelle)
                        )}
                      </td>
                      <td>{number(line.article_prix_unitaire)}</td>
                      <td>{number(line.valeur_reelle)}</td>
                      <td>{line.article_unite}</td>
                      <td>
                        {selected.inv_statut === "en_cours" ? (
                          <input
                            value={line.linv_note || ""}
                            onChange={(e) =>
                              setLine(line.linv_id, "linv_note", e.target.value)
                            }
                          />
                        ) : (
                          line.linv_note || "—"
                        )}
                      </td>
                      <td>{line.article_test ? "Oui" : "Non"}</td>
                      <td>
                        {selected.inv_statut === "en_cours" && (
                          <>
                          <button
                            className="action-btn"
                            disabled={saving === line.linv_id}
                            onClick={() => void saveLine(line)}
                            title="Enregistrer"
                          >
                            <i className="bi bi-check-lg" />
                          </button>
                          <button className="action-btn danger" onClick={() => void removeLine(line)} title="Supprimer la ligne">
                            <i className="bi bi-trash" />
                          </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
