import { useEffect, useState } from 'react';
import { stockApi } from '../../services/stockApi';
import type { Demande, NiveauValidation } from '../../types/stock';

export default function Validations() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleNiveau, setSelectedRoleNiveau] = useState<NiveauValidation>('dept_demandeur');
  const [comment, setComment] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchDemandesPending = async () => {
    setLoading(true);
    try {
      const data = await stockApi.getDemandes('soumise');
      setDemandes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemandesPending();
  }, []);

  const handleValidate = async (demandeId: string) => {
    setProcessingId(demandeId);
    try {
      await stockApi.validerDemande(demandeId, selectedRoleNiveau, comment);
      alert("Demande validée avec succès à votre niveau.");
      setComment('');
      fetchDemandesPending();
    } catch (err) {
      alert("Erreur lors de la validation.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (demandeId: string) => {
    if (!comment.trim()) {
      alert("Veuillez saisir un commentaire expliquant le motif de refus.");
      return;
    }
    setProcessingId(demandeId);
    try {
      await stockApi.refuserDemande(demandeId, selectedRoleNiveau, comment);
      alert("La demande a été refusée.");
      setComment('');
      fetchDemandesPending();
    } catch (err) {
      alert("Erreur lors du refus.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#1B5E20' }}>
            <i className="bi bi-check2-square me-2"></i>Espace de Validation à 4 Niveaux
          </h2>
          <p className="text-muted small mb-0">
            Traitez les demandes en attente de votre approbation selon votre rôle dans l'organisation SMMC
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <label className="form-label small fw-semibold mb-0 text-nowrap">Simuler le niveau d'acteur :</label>
          <select
            className="form-select form-select-sm fw-bold border-success"
            style={{ width: 'auto' }}
            value={selectedRoleNiveau}
            onChange={(e) => setSelectedRoleNiveau(e.target.value as NiveauValidation)}
          >
            <option value="dept_demandeur">Niveau 1: Chef Dept (Demandeur)</option>
            <option value="responsable_stock">Niveau 2: Responsable Stock</option>
            <option value="dept_appro">Niveau 3: Chef Dept (Approvisionnement)</option>
          </select>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h6 className="fw-bold mb-0 text-dark">
            Demandes Awaiting Action ({demandes.length})
          </h6>
          <span className="badge bg-warning text-dark"><i className="bi bi-clock me-1"></i>En attente</span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
            </div>
          ) : demandes.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-check-circle text-success display-4"></i>
              <p className="mt-2 text-muted">Aucune demande en attente de validation pour le moment.</p>
            </div>
          ) : (
            <div className="accordion accordion-flush" id="accordionValidations">
              {demandes.map((d, idx) => (
                <div className="accordion-item border-bottom" key={d.dem_id}>
                  <h2 className="accordion-header" id={`heading${idx}`}>
                    <button
                      className="accordion-button collapsed py-3"
                      type="button"
                      data-bs-toggle="collapse"
                      data-bs-target={`#collapse${idx}`}
                    >
                      <div className="d-flex justify-content-between align-items-center w-100 me-3">
                        <div>
                          <span className="fw-bold text-dark me-3">{d.dem_numero}</span>
                          <span className="text-muted small me-3"><i className="bi bi-person me-1"></i>{d.demandeur_nom}</span>
                          <span className="text-muted small"><i className="bi bi-building me-1"></i>{d.service_nom}</span>
                        </div>
                        <div>
                          {d.dem_type === 'urgence' ? (
                            <span className="badge bg-danger me-2"><i className="bi bi-exclamation-triangle me-1"></i>Urgence</span>
                          ) : (
                            <span className="badge bg-light text-dark border me-2">Normale</span>
                          )}
                          <span className="badge bg-secondary">{d.lignes?.length || 0} article(s)</span>
                        </div>
                      </div>
                    </button>
                  </h2>
                  <div id={`collapse${idx}`} className="accordion-collapse collapse" data-bs-parent="#accordionValidations">
                    <div className="accordion-body bg-light p-4">
                      {d.dem_motif && (
                        <div className="alert alert-info py-2 small mb-3">
                          <strong>Motif de la demande :</strong> {d.dem_motif}
                        </div>
                      )}

                      <h6 className="fw-bold small text-muted text-uppercase mb-2">Articles de la demande</h6>
                      <div className="table-responsive mb-3">
                        <table className="table table-sm table-bordered bg-white align-middle">
                          <thead className="table-light">
                            <tr className="small text-muted">
                              <th>Code</th>
                              <th>Désignation</th>
                              <th>Unité</th>
                              <th className="text-center">Stock Magasin</th>
                              <th className="text-center">Quantité Demandée</th>
                            </tr>
                          </thead>
                          <tbody>
                            {d.lignes.map((l, i) => (
                              <tr key={i}>
                                <td className="fw-bold small">{l.art_code}</td>
                                <td>{l.art_designation}</td>
                                <td className="small">{l.art_unite}</td>
                                <td className="text-center">
                                  <span className={`badge ${ (l.art_stock_actuel || 0) < l.ldem_quantite_demandee ? 'bg-danger' : 'bg-success' }`}>
                                    {l.art_stock_actuel ?? 0}
                                  </span>
                                </td>
                                <td className="text-center fw-bold text-primary">{l.ldem_quantite_demandee}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-white p-3 border rounded">
                        <label className="form-label small fw-semibold">Ajouter un avis ou commentaire :</label>
                        <input
                          type="text"
                          className="form-control form-control-sm mb-3"
                          placeholder="Commentaire de validation ou motif de refus..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />

                        <div className="d-flex justify-content-end gap-2">
                          <button
                            className="btn btn-sm btn-outline-danger"
                            disabled={processingId === d.dem_id}
                            onClick={() => handleReject(d.dem_id)}
                          >
                            <i className="bi bi-x-circle me-1"></i>Refuser à ce niveau
                          </button>
                          <button
                            className="btn btn-sm text-white fw-semibold"
                            style={{ backgroundColor: '#2E7D32' }}
                            disabled={processingId === d.dem_id}
                            onClick={() => handleValidate(d.dem_id)}
                          >
                            <i className="bi bi-check2-circle me-1"></i>Approuver (Niveau {selectedRoleNiveau})
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}