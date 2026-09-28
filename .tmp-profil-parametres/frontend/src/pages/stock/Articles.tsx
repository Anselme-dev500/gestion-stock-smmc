import { authFetch } from "../../services/auth";
import { useEffect, useMemo, useState } from "react";

const API_URL = (import.meta.env.VITE_API_URL || "/api/stock").replace(/\/$/, "");
interface Category { cat_id: string; cat_nom: string; }
interface Article {
  art_code_article: string; art_designation: string; art_reference: string | null;
  art_categorie: string; cat_nom: string; art_unite: string; art_prix_unitaire: string | number;
  art_quantite_stock: number; art_seuil_min: number; art_seuil_max: number | null;
  art_etat: "actif" | "inactif"; est_en_alerte: boolean;
}
interface ArticleForm {
  art_code_article: string; art_designation: string; art_categorie: string; art_unite: string;
  art_prix_unitaire: string; art_quantite_stock: string; art_seuil_min: string;
  art_seuil_max: string; art_reference: string; art_etat: "actif" | "inactif";
}
const emptyForm: ArticleForm = { art_code_article: "", art_designation: "", art_categorie: "", art_unite: "unité", art_prix_unitaire: "0", art_quantite_stock: "0", art_seuil_min: "0", art_seuil_max: "", art_reference: "", art_etat: "actif" };

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await authFetch(`${API_URL}${path}`, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  if (response.status === 204) return undefined as T;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const details = body && typeof body === "object" ? Object.values(body as Record<string, unknown>).flat().join(" ") : "";
    throw new Error(details || `Erreur HTTP ${response.status}.`);
  }
  return body as T;
}

export default function Articles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(() => { try { return JSON.parse(localStorage.getItem("smmc_preferences") || "{}").lignes_tableau || 20; } catch { return 20; } });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleForm>(emptyForm);

  const loadData = async () => {
    setLoading(true); setError("");
    try {
      const [articleData, categoryData] = await Promise.all([apiRequest<Article[]>("/articles/"), apiRequest<Category[]>("/categories/")]);
      setArticles(articleData); setCategories(categoryData);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Échec de la récupération des données."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadData(); }, []);
  useEffect(() => { const update = () => { try { setRows(JSON.parse(localStorage.getItem("smmc_preferences") || "{}").lignes_tableau || 20); setPage(1); } catch { /* préférences invalides */ } }; window.addEventListener("smmc-preferences-updated", update); return () => window.removeEventListener("smmc-preferences-updated", update); }, []);

  const filteredArticles = useMemo(() => {
    const term = search.trim().toLowerCase();
    return articles.filter((article) => (!term || [article.art_code_article, article.art_designation, article.cat_nom].some((value) => value.toLowerCase().includes(term))) && (!categoryFilter || article.art_categorie === categoryFilter));
  }, [articles, categoryFilter, search]);

  const openCreate = () => { setEditingCode(null); setForm(emptyForm); setError(""); setSuccess(""); setShowForm(true); };
  const openEdit = (article: Article) => {
    setEditingCode(article.art_code_article);
    setForm({ art_code_article: article.art_code_article, art_designation: article.art_designation, art_categorie: article.art_categorie, art_unite: article.art_unite, art_prix_unitaire: String(article.art_prix_unitaire), art_quantite_stock: String(article.art_quantite_stock), art_seuil_min: String(article.art_seuil_min), art_seuil_max: article.art_seuil_max == null ? "" : String(article.art_seuil_max), art_reference: article.art_reference || "", art_etat: article.art_etat });
    setError(""); setSuccess(""); setShowForm(true);
  };
  const setField = <K extends keyof ArticleForm>(field: K, value: ArticleForm[K]) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.art_code_article.trim() || !form.art_designation.trim() || !form.art_categorie) { setError("Le code, la désignation et la catégorie sont obligatoires."); return; }
    const min = Number(form.art_seuil_min), max = form.art_seuil_max === "" ? null : Number(form.art_seuil_max);
    if (min < 0 || (max !== null && (max < 0 || max < min))) { setError("Les seuils doivent être positifs et le maximum supérieur ou égal au minimum."); return; }
    const payload = { ...form, art_code_article: form.art_code_article.trim(), art_designation: form.art_designation.trim(), art_reference: form.art_reference.trim() || null, art_prix_unitaire: Number(form.art_prix_unitaire), art_quantite_stock: Number(form.art_quantite_stock), art_seuil_min: min, art_seuil_max: max };
    try {
      setSaving(true); setError(""); setSuccess("");
      const saved = await apiRequest<Article>(editingCode ? `/articles/${encodeURIComponent(editingCode)}/` : "/articles/", { method: editingCode ? "PUT" : "POST", body: JSON.stringify(payload) });
      setArticles((current) => editingCode ? current.map((item) => item.art_code_article === editingCode ? saved : item) : [...current, saved].sort((a, b) => a.art_code_article.localeCompare(b.art_code_article)));
      setSuccess(editingCode ? "Article modifié avec succès." : "Article créé avec succès."); setShowForm(false); setEditingCode(null); setForm(emptyForm);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible d’enregistrer l’article."); }
    finally { setSaving(false); }
  };
  const updateStatus = async (article: Article) => {
    try { const saved = await apiRequest<Article>(`/articles/${encodeURIComponent(article.art_code_article)}/`, { method: "PATCH", body: JSON.stringify({ art_etat: article.art_etat === "actif" ? "inactif" : "actif" }) }); setArticles((current) => current.map((item) => item.art_code_article === saved.art_code_article ? saved : item)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de modifier le statut."); }
  };
  const deleteArticle = async (article: Article) => {
    if (!window.confirm(`Supprimer l’article ${article.art_code_article} ?`)) return;
    try { await apiRequest<void>(`/articles/${encodeURIComponent(article.art_code_article)}/`, { method: "DELETE" }); setArticles((current) => current.filter((item) => item.art_code_article !== article.art_code_article)); setSuccess("Article supprimé avec succès."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Impossible de supprimer l’article."); }
  };
  const input = (field: keyof ArticleForm, label: string, type = "text") => <label className="form-group">{label}<input type={type} value={form[field]} min={type === "number" ? 0 : undefined} onChange={(event) => setField(field, event.target.value)} /></label>;
  const activeCount = articles.filter((article) => article.art_etat === "actif").length;
  const lowCount = articles.filter((article) => article.est_en_alerte).length;

  return <div className="smmc-page">
    <div className="page-header"><div><div className="page-breadcrumb">Gestion du stock / Articles</div><h1 className="page-title">Articles</h1><p className="page-subtitle">Gestion des fournitures et matériels de la SMMC.</p></div><button className="smmc-btn smmc-btn-primary" onClick={openCreate}>+ Nouvel article</button></div>
    {error && <div className="smmc-alert smmc-alert-danger">{error}</div>}{success && <div className="smmc-alert smmc-alert-success">{success}</div>}
    <div className="stats-grid"><div className="stat-card"><div><div className="stat-label">Nombre total d’articles</div><div className="stat-value">{articles.length}</div></div></div><div className="stat-card"><div><div className="stat-label">Articles actifs</div><div className="stat-value">{activeCount}</div></div></div><div className="stat-card"><div><div className="stat-label">Stock faible</div><div className="stat-value">{lowCount}</div></div></div></div>
    {showForm && <div className="content-card compact-form-card"><div className="content-card-header"><h2>{editingCode ? "Modifier l’article" : "Nouvel article"}</h2><button className="smmc-btn smmc-btn-outline" onClick={() => setShowForm(false)}>Annuler</button></div><form className="compact-form" onSubmit={handleSubmit}><div className="form-grid">{input("art_code_article", "Code *")}{input("art_designation", "Désignation *")}<label className="form-group">Catégorie *<select value={form.art_categorie} onChange={(event) => setField("art_categorie", event.target.value)}><option value="">Sélectionner</option>{categories.map((category) => <option key={category.cat_id} value={category.cat_id}>{category.cat_nom}</option>)}</select></label><label className="form-group">Unité<select value={form.art_unite} onChange={(event) => setField("art_unite", event.target.value)}>{["unité", "pièce", "paquet", "boîte", "litre", "kg"].map((unit) => <option key={unit}>{unit}</option>)}</select></label>{input("art_prix_unitaire", "Prix unitaire", "number")}{input("art_quantite_stock", "Stock initial", "number")}{input("art_seuil_min", "Seuil minimum", "number")}{input("art_seuil_max", "Seuil maximum", "number")}{input("art_reference", "Référence")}<label className="form-group">Statut<select value={form.art_etat} onChange={(event) => setField("art_etat", event.target.value as ArticleForm["art_etat"])}><option value="actif">Actif</option><option value="inactif">Inactif</option></select></label></div><div className="form-actions"><button type="button" className="smmc-btn smmc-btn-outline" onClick={() => setShowForm(false)}>Annuler</button><button type="submit" className="smmc-btn smmc-btn-primary" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</button></div></form></div>}
    <div className="content-card"><div className="content-card-header"><div><h2>Liste des articles</h2><p>{filteredArticles.length} résultat(s)</p></div><div className="table-tools"><div className="smmc-search"><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Rechercher un article..." /></div><select className="table-filter" value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}><option value="">Toutes les catégories</option>{categories.map((category) => <option key={category.cat_id} value={category.cat_id}>{category.cat_nom}</option>)}</select></div></div><div className="content-card-body">{loading ? <div className="loading-state">Chargement des articles…</div> : filteredArticles.length === 0 ? <div className="empty-state"><strong>Aucun article trouvé.</strong><span>Ajoutez un nouvel article ou modifiez votre recherche.</span></div> : <div className="table-responsive"><table className="smmc-table"><thead><tr><th>Code</th><th>Désignation</th><th>Catégorie</th><th>Unité</th><th>Stock</th><th>Minimum</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{filteredArticles.slice((page - 1) * rows, page * rows).map((article) => <tr key={article.art_code_article}><td><strong>{article.art_code_article}</strong></td><td>{article.art_designation}</td><td>{article.cat_nom}</td><td>{article.art_unite}</td><td>{article.art_quantite_stock}</td><td>{article.art_seuil_min}</td><td><span className={`status-badge ${article.art_etat !== "actif" ? "status-neutral" : article.est_en_alerte ? "status-warning" : "status-success"}`}>{article.art_etat !== "actif" ? "Inactif" : article.est_en_alerte ? "Stock faible" : "Actif"}</span></td><td><div className="table-actions"><button className="action-btn" title="Modifier" onClick={() => openEdit(article)}><i className="bi bi-pencil" /></button><button className="action-btn" title="Changer le statut" onClick={() => void updateStatus(article)}><i className={article.art_etat === "actif" ? "bi bi-toggle-on" : "bi bi-toggle-off"} /></button><button className="action-btn danger" title="Supprimer" onClick={() => void deleteArticle(article)}><i className="bi bi-trash" /></button></div></td></tr>)}</tbody></table><div style={{display:"flex",justifyContent:"flex-end",gap:12,padding:14}}><button type="button" disabled={page<=1} onClick={()=>setPage(page-1)}>Précédent</button><span>Page {page} / {Math.max(1,Math.ceil(filteredArticles.length/rows))}</span><button type="button" disabled={page*rows>=filteredArticles.length} onClick={()=>setPage(page+1)}>Suivant</button></div></div>}</div></div>
  </div>;
}
