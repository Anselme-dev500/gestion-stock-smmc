import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockApi } from '../../services/stockApi';
import type { Article } from '../../types/stock';

interface LigneForm {
  ldem_article: string;
  art_code: string;
  art_designation: string;
  art_unite: string;
  art_stock: number;
  ldem_quantite_demandee: number;
  ldem_remarque: string;
}

export default function NouvelleDemande() {
  const navigate = useNavigate();
  const [articlesCatalog, setArticlesCatalog] = useState<Article[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [demType, setDemType] = useState<'normale' | 'urgence'>('normale');
  const [demMotif, setDemMotif] = useState('');
  const [lignes, setLignes] = useState<LigneForm[]>([]);

  // Selection temp state
  const [selectedArtCode, setSelectedArtCode] = useState('');
  const [qteDemandee, setQteDemandee] = useState<number>(1);
  const [remarqueTemp, setRemarqueTemp] = useState('');

  useEffect(() => {
    const loadArticles = async () => {
      try {
        const data = await stockApi.getArticles();
        setArticlesCatalog(data);
      } catch (err) {
        console.error(err);
      }
    };
    loadArticles();
  }, []);

  const handleAddLigne = () => {
    if (!selectedArtCode) return;
    const art = articlesCatalog.find((a) => a.art_code_article === selectedArtCode);
    if (!art) return;

    if (lignes.some((l) => l.ldem_article === selectedArtCode)) {
      alert("Cet article a déjà été ajouté à la demande.");
      return;
    }

    setLignes([
      ...lignes,
      {
        ldem_article: art.art_code_article,
        art_code: art.art_code_article,
        art_designation: art.art_designation,
        art_unite: art.art_unite,
        art_stock: art.art_quantite_stock,
        ldem_quantite_demandee: qteDemandee,
        ldem_remarque: remarqueTemp
      }
    ]);

    setSelectedArtCode('');
    setQteDemandee(1);
    setRemarqueTemp('');
  };

  const handleRemoveLigne = (code: string) => {
    setLignes(lignes.filter((l) => l.ldem_article !== code));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lignes.length === 0) {
      alert("Veuillez ajouter au moins un article à la demande.");
      return;
    }
    if (demType === 'urgence' && !demMotif.trim()) {
      alert("Un motif explicatif est obligatoire pour les demandes d'urgence.");
      return;
    }

    setSubmitting(true);
    try {
      await stockApi.createDemande({
        dem_type: demType,
        dem_motif: demMotif,
        lignes: lignes.map((l) => ({
          ldem_article: l.ldem_article,
          ldem_quantite_demandee: l.ldem_quantite_demandee,
          ldem_quantite_accordee: 0,
          ldem_remarque: l.ldem_remarque
        }))
      });
      alert("La demande de fourniture R17_FRM8 a été soumise avec succès !");
      navigate('/demandes');
    } catch (err) {
      alert("Erreur lors de la création de la demande.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center mb-4">
        <button className="btn btn-outline-secondary me-3" onClick={() => navigate('/demandes')}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#1B5E20' }}>
            <i className="bi bi-file-earmark-plus me-2"></i>Nouvelle Demande de Fourniture (Formulaire R17_FRM8)
          </h2>
          <p className="text-muted small mb-0">
            Saisie des fournitures requises et soumission pour le circuit de validation SMMC
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-4">
          {/* Informations générales */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-light border-0 fw-bold text-dark py-3">
                <i className="bi bi-info-circle me-2" style={{ color: '#2E7D32' }}></i>Type & Motif de la Demande
              </div>
              <div className="card-body p-3">
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Type de demande :</label>
                  <div className="d-flex gap-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="demType"
                        id="typeNormale"
                        value="normale"
                        checked={demType === 'normale'}
                        onChange={() => setDemType('normale')}
                      />
                      <label className="form-check-label small" htmlFor="typeNormale">
                        Normale
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="demType"
                        id="typeUrgence"
                        value="urgence"
                        checked={demType === 'urgence'}
                        onChange={() => setDemType('urgence')}
                      />
                      <label className="form-check-label small text-danger fw-bold" htmlFor="typeUrgence">
                        <i className="bi bi-exclamation-triangle me-1"></i>Urgence / Sinistre
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">
                    Motif / Justification {demType === 'urgence' && <span className="text-danger">*</span>} :
                  </label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={4}
                    placeholder={demType === 'urgence' ? "Obligatoire : Expliquez la raison de l'urgence (ex: sinistre, perte, matériel défaillant...)" : "Motif optionnel pour le Chef de département..."}
                    value={demMotif}
                    onChange={(e) => setDemMotif(e.target.value)}
                  ></textarea>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Pièce Jointe (Optionnel) :</label>
                  <input className="form-control form-control-sm" type="file" />
                  <div className="form-text small">Formats acceptés : PDF, PNG, JPG (ex: rapport d'incident, devis).</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sélection et Liste des Articles */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-light border-0 fw-bold text-dark py-3">
                <i className="bi bi-box me-2" style={{ color: '#2E7D32' }}></i>Ajouter un Article à la Demande
              </div>
              <div className="card-body p-3">
                <div className="row g-3 align-items-end">
                  <div className="col-md-5">
                    <label className="form-label small fw-semibold">Choisir un article :</label>
                    <select
                      className="form-select form-select-sm"
                      value={selectedArtCode}
                      onChange={(e) => setSelectedArtCode(e.target.value)}
                    >
                      <option value="">-- Sélectionnez un article du catalogue --</option>
                      {articlesCatalog.map((art) => (
                        <option key={art.art_code_article} value={art.art_code_article}>
                          {art.art_code_article} - {art.art_designation} (Stock: {art.art_quantite_stock} {art.art_unite})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small fw-semibold">Quantité demandée :</label>
                    <input
                      type="number"
                      min={1}
                      className="form-control form-control-sm"
                      value={qteDemandee}
                      onChange={(e) => setQteDemandee(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="col-md-4">
                    <button
                      type="button"
                      className="btn btn-sm text-white w-100 fw-semibold"
                      style={{ backgroundColor: '#2E7D32' }}
                      onClick={handleAddLigne}
                    >
                      <i className="bi bi-cart-plus me-1"></i>Ajouter à la liste
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tableau des articles choisis */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-bold py-3 border-bottom d-flex justify-content-between align-items-center">
                <span>Articles Sélectionnés ({lignes.length})</span>
                <span className="badge bg-secondary">{lignes.length} élément(s)</span>
              </div>
              <div className="card-body p-0">
                {lignes.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-cart-x display-5"></i>
                    <p className="mt-2 small mb-0">Aucun article sélectionné. Choisissez un article ci-dessus.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr className="small text-muted">
                          <th>Code</th>
                          <th>Désignation</th>
                          <th>Stock Actuel</th>
                          <th className="text-center">Quantité Demandée</th>
                          <th>Remarque</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lignes.map((l) => (
                          <tr key={l.ldem_article}>
                            <td className="fw-bold small">{l.art_code}</td>
                            <td>{l.art_designation}</td>
                            <td>
                              <span className={`badge ${l.art_stock < l.ldem_quantite_demandee ? 'bg-danger' : 'bg-success'}`}>
                                {l.art_stock} {l.art_unite}
                              </span>
                            </td>
                            <td className="text-center fw-bold text-primary">{l.ldem_quantite_demandee}</td>
                            <td className="small text-muted">{l.ldem_remarque || '-'}</td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleRemoveLigne(l.ldem_article)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="card-footer bg-light p-3 text-end">
                <button
                  type="submit"
                  className="btn btn-success fw-bold text-white px-4"
                  disabled={submitting || lignes.length === 0}
                  style={{ backgroundColor: '#1B5E20' }}
                >
                  {submitting ? (
                    <span><span className="spinner-border spinner-border-sm me-2"></span>Envoi...</span>
                  ) : (
                    <span><i className="bi bi-send me-2"></i>Soumettre la Demande R17_FRM8</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}