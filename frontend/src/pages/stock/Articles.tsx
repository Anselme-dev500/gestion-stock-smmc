import { useEffect, useState } from 'react';
import { stockApi } from '../../services/stockApi';
import type { Article, Categorie, Emplacement } from '../../types/stock';

export default function Articles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [emplacements, setEmplacements] = useState<Emplacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [alerteFilter, setAlerteFilter] = useState(false);

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newEmp, setNewEmp] = useState('');
  const [newUnite, setNewUnite] = useState('piece');
  const [newPrix, setNewPrix] = useState(0);
  const [newStock, setNewStock] = useState(0);
  const [newSeuilMin, setNewSeuilMin] = useState(5);

  const loadData = async () => {
    setLoading(true);
    try {
      const [arts, cats, emps] = await Promise.all([
        stockApi.getArticles(search, catFilter, alerteFilter),
        stockApi.getCategories(),
        stockApi.getEmplacements()
      ]);
      setArticles(arts);
      setCategories(cats);
      setEmplacements(emps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, catFilter, alerteFilter]);

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newDesignation || !newCat) {
      alert("Veuillez remplir le code, la désignation et la catégorie.");
      return;
    }

    try {
      await stockApi.createArticle({
        art_code_article: newCode,
        art_designation: newDesignation,
        art_categorie: newCat,
        art_emplacement: newEmp || undefined,
        art_unite: newUnite,
        art_prix_unitaire: newPrix,
        art_quantite_stock: newStock,
        art_seuil_min: newSeuilMin,
        art_etat: 'actif'
      });
      alert("Article créé avec succès !");
      setShowModal(false);
      loadData();
    } catch (err) {
      alert("Erreur lors de la création de l'article.");
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#1B5E20' }}>
            <i className="bi bi-box-seam me-2"></i>Gestion des Articles du Stock
          </h2>
          <p className="text-muted small mb-0">
            Inventaire en temps réel, emplacements RACK et alertes de seuil minimum (SMMC Store)
          </p>
        </div>
        <button
          className="btn text-white fw-semibold"
          style={{ backgroundColor: '#2E7D32' }}
          onClick={() => setShowModal(true)}
        >
          <i className="bi bi-plus-lg me-2"></i>Nouveau Article
        </button>
      </div>

      {/* Barre de Recherche & Filtres */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rechercher par code, désignation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select form-select-sm"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.cat_id} value={c.cat_id}>{c.cat_nom}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="switchAlerte"
                  checked={alerteFilter}
                  onChange={(e) => setAlerteFilter(e.target.checked)}
                />
                <label className="form-check-label small fw-bold text-danger" htmlFor="switchAlerte">
                  <i className="bi bi-exclamation-triangle me-1"></i>En alerte de stock bas
                </label>
              </div>
            </div>
            <div className="col-md-2 text-end">
              <span className="badge bg-secondary p-2">{articles.length} article(s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des Articles */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-muted text-uppercase">
                    <th>Code Article</th>
                    <th>Désignation</th>
                    <th>Catégorie</th>
                    <th>Emplacement</th>
                    <th>Prix Ref (Ar)</th>
                    <th className="text-center">Qté en Stock</th>
                    <th className="text-center">Seuil Min</th>
                    <th className="text-center">État</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((art) => {
                    const isAlerte = art.art_quantite_stock < art.art_seuil_min;
                    return (
                      <tr key={art.art_code_article} className={isAlerte ? 'table-warning' : ''}>
                        <td className="fw-bold text-dark">{art.art_code_article}</td>
                        <td className="fw-semibold">{art.art_designation}</td>
                        <td className="small text-muted">{art.cat_nom || art.art_categorie}</td>
                        <td>
                          <span className="badge bg-light text-dark border font-monospace">
                            <i className="bi bi-geo-alt me-1"></i>{art.emp_code || 'Non assigné'}
                          </span>
                        </td>
                        <td className="fw-bold">{art.art_prix_unitaire.toLocaleString('fr-FR')} Ar</td>
                        <td className="text-center">
                          <span className={`badge fs-6 ${isAlerte ? 'bg-danger' : 'bg-success'}`}>
                            {art.art_quantite_stock} {art.art_unite}
                          </span>
                        </td>
                        <td className="text-center text-muted small">{art.art_seuil_min}</td>
                        <td className="text-center">
                          {isAlerte ? (
                            <span className="badge bg-danger text-white"><i className="bi bi-exclamation-triangle me-1"></i>Stock Faible</span>
                          ) : (
                            <span className="badge bg-success-subtle text-success border border-success"><i className="bi bi-check me-1"></i>Normal</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de création d'article */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ backgroundColor: '#1B5E20' }}>
                <h5 className="modal-title fw-bold"><i className="bi bi-plus-square me-2"></i>Nouveau Article de Stock</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleCreateArticle}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Code Article *</label>
                      <input type="text" className="form-control form-control-sm" placeholder="ex: ART-005" value={newCode} onChange={(e) => setNewCode(e.target.value)} required />
                    </div>
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold">Désignation *</label>
                      <input type="text" className="form-control form-control-sm" placeholder="ex: Casque de protection de chantier" value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Catégorie *</label>
                      <select className="form-select form-select-sm" value={newCat} onChange={(e) => setNewCat(e.target.value)} required>
                        <option value="">-- Choisir une catégorie --</option>
                        {categories.map((c) => (
                          <option key={c.cat_id} value={c.cat_id}>{c.cat_nom}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Emplacement RACK</label>
                      <select className="form-select form-select-sm" value={newEmp} onChange={(e) => setNewEmp(e.target.value)}>
                        <option value="">-- Emplacement au magasin --</option>
                        {emplacements.map((e) => (
                          <option key={e.emp_id} value={e.emp_id}>{e.emp_code} - {e.emp_description}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Unité</label>
                      <input type="text" className="form-control form-control-sm" placeholder="piece, ramette, paire..." value={newUnite} onChange={(e) => setNewUnite(e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Prix Unitaire (Ar)</label>
                      <input type="number" className="form-control form-control-sm" value={newPrix} onChange={(e) => setNewPrix(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Stock Initial</label>
                      <input type="number" className="form-control form-control-sm" value={newStock} onChange={(e) => setNewStock(parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Seuil Minimum (Alerte)</label>
                      <input type="number" className="form-control form-control-sm" value={newSeuilMin} onChange={(e) => setNewSeuilMin(parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-success btn-sm fw-bold text-white" style={{ backgroundColor: '#2E7D32' }}>Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}