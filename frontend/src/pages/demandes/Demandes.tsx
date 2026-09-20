import { useEffect, useState } from 'react';
import { stockApi } from '../../services/stockApi';
import type { Demande, StatutDemande, NiveauValidation } from '../../types/stock';

export default function Demandes() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [selectedDemande, setSelectedDemande] = useState<Demande | null>(null);
  const [validationComment, setValidationComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDemandes = async () => {
    setLoading(true);
    try {
      const data = await stockApi.getDemandes(filterStatut, filterType);
      setDemandes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemandes();
  }, [filterStatut, filterType]);

  const handleValidation = async (niveau: NiveauValidation) => {
    if (!selectedDemande) return;
    setActionLoading(true);
    try {
      const updated = await stockApi.validerDemande(selectedDemande.dem_id, niveau, validationComment);
      setSelectedDemande(updated);
      fetchDemandes();
      setValidationComment('');
    } catch (err) {
      alert("Erreur lors de la validation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefus = async (niveau: NiveauValidation) => {
    if (!selectedDemande) return;
    if (!validationComment) {
      alert("Un motif de refus est obligatoire dans le commentaire.");
      return;
    }
    setActionLoading(true);
    try {
      const updated = await stockApi.refuserDemande(selectedDemande.dem_id, niveau, validationComment);
      setSelectedDemande(updated);
      fetchDemandes();
      setValidationComment('');
    } catch (err) {
      alert("Erreur lors du refus");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLivraison = async () => {
    if (!selectedDemande) return;
    setActionLoading(true);
    try {
      const updated = await stockApi.livrerDemande(selectedDemande.dem_id);
      setSelectedDemande(updated);
      fetchDemandes();
    } catch (err) {
      alert("Erreur lors de la livraison");
    } finally {
      setActionLoading(false);
    }
  };

  const renderBadgeStatut = (statut: StatutDemande) => {
    switch (statut) {
      case 'soumise':
        return <span className="badge bg-warning text-dark"><i className="bi bi-clock me-1"></i>Soumise (Niveau 1)</span>;
      case 'en_cours':
        return <span className="badge bg-info text-dark"><i className="bi bi-hourglass-split me-1"></i>En cours (Validations)</span>;
      case 'livree':
        return <span className="badge bg-success"><i className="bi bi-check-circle me-1"></i>Livrée</span>;
      case 'refusee':
        return <span className="badge bg-danger"><i className="bi bi-x-circle me-1"></i>Refusée</span>;
      default:
        return <span className="badge bg-secondary">{statut}</span>;
    }
  };

  return (
    <div className="container-fluid py-4">
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#1B5E20' }}>
            <i className="bi bi-file-earmark-text me-2"></i>Demandes de Fourniture (R17_FRM8)
          </h2>
          <p className="text-muted small mb-0">
            Suivi dématérialisé et traitement des demandes par les 4 niveaux de validation SMMC
          </p>
        </div>
        <a href="/nouvelle-demande" className="btn text-white fw-semibold" style={{ backgroundColor: '#2E7D32' }}>
          <i className="bi bi-plus-lg me-2"></i>Créer une Demande
        </a>
      </div>

      {/* Filtres */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small fw-semibold text-muted">Filtrer par Statut</label>
              <select className="form-select form-select-sm" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
                <option value="">Tous les statuts</option>
                <option value="soumise">Soumise</option>
                <option value="en_cours">En cours de validation</option>
                <option value="livree">Livrée</option>
                <option value="refusee">Refusée</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold text-muted">Filtrer par Type</label>
              <select className="form-select form-select-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">Tous les types</option>
                <option value="normale">Normale</option>
                <option value="urgence">Urgence / Sinistre</option>
              </select>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button className="btn btn-sm btn-outline-secondary w-100" onClick={() => { setFilterStatut(''); setFilterType(''); }}>
                <i className="bi bi-arrow-counterclockwise me-1"></i>Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des demandes */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
              <p className="mt-2 text-muted small">Chargement des demandes...</p>
            </div>
          ) : demandes.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox text-muted display-4"></i>
              <p className="mt-2 text-muted">Aucune demande trouvée.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-muted text-uppercase">
                    <th>N° Demande</th>
                    <th>Date</th>
                    <th>Demandeur / Service</th>
                    <th>Type</th>
                    <th>Articles</th>
                    <th>Statut</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {demandes.map((d) => (
                    <tr key={d.dem_id}>
                      <td className="fw-bold text-dark">{d.dem_numero}</td>
                      <td className="small text-muted">{new Date(d.dem_date).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <div className="fw-semibold text-dark">{d.demandeur_nom}</div>
                        <div className="small text-muted"><i className="bi bi-building me-1"></i>{d.service_nom}</div>
                      </td>
                      <td>
                        {d.dem_type === 'urgence' ? (
                          <span className="badge bg-danger"><i className="bi bi-exclamation-triangle me-1"></i>Urgence</span>
                        ) : (
                          <span className="badge bg-light text-dark border">Normale</span>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-secondary rounded-pill">
                          {d.lignes?.length || 0} article(s)
                        </span>
                      </td>
                      <td>{renderBadgeStatut(d.dem_statut)}</td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => setSelectedDemande(d)}
                          data-bs-toggle="modal"
                          data-bs-target="#modalDemandeDetail"
                        >
                          <i className="bi bi-eye me-1"></i>Détails & Circuit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Détails & Circuit de validation */}
      {selectedDemande && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ backgroundColor: '#1B5E20' }}>
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-card-checklist me-2"></i>Demande {selectedDemande.dem_numero}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedDemande(null)}></button>
              </div>
              <div className="modal-body p-4">
                {/* Infos Demandeur & Type */}
                <div className="row g-3 mb-4 p-3 rounded bg-light border">
                  <div className="col-md-6">
                    <div className="small text-muted">Service demandeur :</div>
                    <div className="fw-bold">{selectedDemande.service_nom} ({selectedDemande.service_code})</div>
                    <div className="small text-muted mt-2">Demandeur :</div>
                    <div className="fw-semibold">{selectedDemande.demandeur_nom}</div>
                  </div>
                  <div className="col-md-6">
                    <div className="small text-muted">Type de demande :</div>
                    <div>
                      {selectedDemande.dem_type === 'urgence' ? (
                        <span className="badge bg-danger"><i className="bi bi-exclamation-triangle me-1"></i>Urgence / Sinistre</span>
                      ) : (
                        <span className="badge bg-light text-dark border">Normale</span>
                      )}
                    </div>
                    <div className="small text-muted mt-2">Statut actuel :</div>
                    <div>{renderBadgeStatut(selectedDemande.dem_statut)}</div>
                  </div>
                  {selectedDemande.dem_motif && (
                    <div className="col-12 mt-2">
                      <div className="small text-muted">Motif / Justification :</div>
                      <div className="fst-italic bg-white p-2 border rounded text-dark small">{selectedDemande.dem_motif}</div>
                    </div>
                  )}
                </div>

                {/* Circuit de Validation 4 Niveaux - Timeline */}
                <h6 className="fw-bold mb-3" style={{ color: '#2E7D32' }}>
                  <i className="bi bi-diagram-3 me-2"></i>Circuit de Validation à 4 Niveaux
                </h6>
                <div className="timeline-circuit mb-4 p-3 bg-white border rounded">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-semibold small"><span className="badge bg-dark rounded-circle me-2">1</span>Visa Chef Dept Demandeur</div>
                    <span className="badge bg-success">Validé</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-semibold small"><span className="badge bg-dark rounded-circle me-2">2</span>Traitement Responsable Stock</div>
                    <span className="badge bg-warning text-dark">En cours</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-semibold small"><span className="badge bg-dark rounded-circle me-2">3</span>Visa Chef Dept Approvisionnement</div>
                    <span className="badge bg-secondary">En attente</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="fw-semibold small"><span className="badge bg-dark rounded-circle me-2">4</span>Remise Physique / Livraison</div>
                    <span className="badge bg-secondary">En attente</span>
                  </div>
                </div>

                {/* Liste des Articles demandés */}
                <h6 className="fw-bold mb-2" style={{ color: '#2E7D32' }}>
                  <i className="bi bi-box me-2"></i>Articles Demandés
                </h6>
                <div className="table-responsive mb-4">
                  <table className="table table-sm table-bordered align-middle">
                    <thead className="table-light">
                      <tr className="small text-muted">
                        <th>Code</th>
                        <th>Désignation</th>
                        <th>Unité</th>
                        <th className="text-center">En Stock</th>
                        <th className="text-center">Demandée</th>
                        <th className="text-center">Accordée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDemande.lignes.map((l, idx) => (
                        <tr key={idx}>
                          <td className="fw-bold small">{l.art_code}</td>
                          <td>{l.art_designation}</td>
                          <td className="small">{l.art_unite}</td>
                          <td className="text-center">
                            <span className={`badge ${ (l.art_stock_actuel || 0) < l.ldem_quantite_demandee ? 'bg-danger' : 'bg-success' }`}>
                              {l.art_stock_actuel ?? 0}
                            </span>
                          </td>
                          <td className="text-center fw-bold text-primary">{l.ldem_quantite_demandee}</td>
                          <td className="text-center fw-bold text-success">{l.ldem_quantite_accordee || l.ldem_quantite_demandee}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Zone de Visa / Commentaire si action requise */}
                {selectedDemande.dem_statut !== 'livree' && selectedDemande.dem_statut !== 'refusee' && (
                  <div className="border p-3 rounded bg-light">
                    <label className="form-label fw-bold small text-dark">
                      <i className="bi bi-pencil-square me-1"></i>Commentaire du Validateur / Motif :
                    </label>
                    <textarea
                      className="form-control form-control-sm mb-3"
                      rows={2}
                      placeholder="Saisissez un commentaire ou motif en cas de refus..."
                      value={validationComment}
                      onChange={(e) => setValidationComment(e.target.value)}
                    ></textarea>

                    <div className="d-flex flex-wrap gap-2 justify-content-end">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={actionLoading}
                        onClick={() => handleRefus('dept_demandeur')}
                      >
                        <i className="bi bi-x-circle me-1"></i>Refuser la demande
                      </button>
                      <button
                        className="btn btn-sm btn-warning"
                        disabled={actionLoading}
                        onClick={() => handleValidation('dept_demandeur')}
                      >
                        <i className="bi bi-check2 me-1"></i>Valider (Niveau 1 Dept Demandeur)
                      </button>
                      <button
                        className="btn btn-sm text-white"
                        style={{ backgroundColor: '#2E7D32' }}
                        disabled={actionLoading}
                        onClick={() => handleValidation('responsable_stock')}
                      >
                        <i className="bi bi-check2-all me-1"></i>Valider (Niveau 2 Responsable Stock)
                      </button>
                      <button
                        className="btn btn-sm btn-success"
                        disabled={actionLoading}
                        onClick={() => handleLivraison()}
                      >
                        <i className="bi bi-box-arrow-up-right me-1"></i>Valider Livraison & Générer Sortie
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedDemande(null)}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}