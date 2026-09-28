import { authFetch } from "../../services/auth";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API_URL = (import.meta.env.VITE_API_URL || "/api/stock").replace(/\/$/, "");
type Article = { art_code_article: string; art_designation: string; art_categorie: string; cat_nom: string; art_unite: string; art_quantite_stock: number; art_seuil_min: number; art_etat: string; est_en_alerte: boolean };
type Category = { cat_id: string; cat_nom: string };

async function getJson<T>(path: string): Promise<T> {
  const response = await authFetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export default function DashboardResponsableStock() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getJson<Article[]>("/articles/"), getJson<Category[]>("/categories/")])
      .then(([articleData, categoryData]) => { if (!cancelled) { setArticles(articleData); setCategories(categoryData); } })
      .catch((cause: unknown) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Échec de la récupération."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => ({
    active: articles.filter((article) => article.art_etat === "actif").length,
    normal: articles.filter((article) => article.art_quantite_stock > article.art_seuil_min).length,
    low: articles.filter((article) => article.est_en_alerte).length,
    empty: articles.filter((article) => article.art_quantite_stock <= 0).length,
  }), [articles]);
  const cards = [["bi-box-seam", "Articles", articles.length, `${stats.active} actifs`, "green"], ["bi-tags", "Catégories", categories.length, "référencées", "yellow"], ["bi-boxes", "Stock normal", stats.normal, "articles disponibles", "blue"], ["bi-exclamation-triangle", "Stock faible", stats.low, "nécessitent une attention", "red"]];

  return <div className="smmc-page">
    <div className="dashboard-intro"><div className="page-header"><div><div className="page-breadcrumb">SMMC / Gestion du stock / Tableau de bord</div><h1 className="page-title">Tableau de bord</h1><p className="page-subtitle">Vue générale de la gestion du stock de la SMMC.</p></div><Link to="/articles" className="smmc-btn smmc-btn-primary">+ Nouvel article</Link></div><div className="dashboard-intro-foot"><span><i className="bi bi-shield-check" /> Espace de gestion SMMC</span><span><i className="bi bi-geo-alt" /> Port de Toamasina</span></div></div>
    {error && <div className="smmc-alert smmc-alert-danger"><strong>Erreur :</strong> {error}</div>}
    <div className="stats-grid">{cards.map(([icon, label, value, description, color]) => <div className="stat-card" key={String(label)}><div className={`stat-icon ${color}`}><i className={`bi ${icon}`} /></div><div><div className="stat-label">{label}</div><div className="stat-value">{loading ? "..." : value}</div><div className="stat-description">{description}</div></div></div>)}</div>
    <div className="content-card"><div className="content-card-header"><div><h2>Alertes de stock</h2><p>Articles dont la quantité atteint le seuil minimum.</p></div><Link to="/etat-stock" className="smmc-btn smmc-btn-outline">Voir l’état du stock</Link></div><div className="content-card-body">{loading ? <div className="loading-state">Chargement du stock...</div> : stats.low === 0 ? <div className="empty-state"><strong>Aucun article en stock faible</strong><span>Le niveau du stock est actuellement satisfaisant.</span></div> : <div className="table-responsive"><table className="smmc-table"><thead><tr><th>Code</th><th>Article</th><th>Catégorie</th><th>Stock</th><th>Minimum</th><th>État</th></tr></thead><tbody>{articles.filter((article) => article.est_en_alerte).slice(0, 10).map((article) => <tr key={article.art_code_article}><td><strong>{article.art_code_article}</strong></td><td>{article.art_designation}</td><td>{article.cat_nom}</td><td>{article.art_quantite_stock} {article.art_unite}</td><td>{article.art_seuil_min} {article.art_unite}</td><td><span className={`status-badge ${article.art_quantite_stock <= 0 ? "status-danger" : "status-warning"}`}>{article.art_quantite_stock <= 0 ? "Rupture" : "Stock faible"}</span></td></tr>)}</tbody></table></div>}</div></div>
    <div className="stock-summary"><div className="summary-item"><span>Stock normal</span><strong>{stats.normal}</strong></div><div className="summary-item"><span>Stock faible</span><strong>{stats.low}</strong></div><div className="summary-item"><span>Rupture</span><strong>{stats.empty}</strong></div></div>
  </div>;
}
