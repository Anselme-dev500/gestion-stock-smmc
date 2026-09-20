import { useEffect, useState } from 'react';
import { stockApi } from '../../services/stockApi';
import type { Inventaire as InventaireType } from '../../types/stock';

export default function Inventaire() {
  const [inventaires, setInventaires] = useState<InventaireType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInv, setSelectedInv] = useState<InventaireType | null>(null);
  const [comptagesState, setComptagesState] = useState<{ [key: string]: number }>({});
  const [saving, setSaving] = useState(false);

  const loadInventaires = async () => {
    setLoading(true);
    try {
      const data = await stockApi.getInventaires();
      setInventaires(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventaires();
  }, []);

  const handleCreateInventaire = async () => {
    try {
      await stockApi.createInventaire({
        inv_type: 'total',
        inv_date_debut: new Date().toISOString().split('T')[0]
      });
      alert("Session d'inventaire initialisée avec succès pour tous les articles !");
      loadInventaires();
    } catch (err) {
      alert("Erreur lors de la création d'inventaire.");
    }
  };

  const handleOpenDetail = (inv: InventaireType) => {
    setSelectedInv(inv);
    const initialComptages: { [key: string]: number } = {};
    inv.lignes?.forEach((l) => {
      initialComptages[l.linv_id] = l.linv_quantite_reelle ?? l.linv_quantite_theorique;
    });
    setComptagesState(initialComptages);
  };

  const handleSaveComptage = async () => {
    if (!selectedInv) return;
    setSaving(true);
    try {
      const payload = Object.entries(comptagesState).map(([linv_id, qte]) => ({
        linv_id,
        quantite_reelle: qte
      }));
      const updated = await stockApi.enregistrerComptageInventaire(selectedInv.inv_id, payload);
      setSelectedInv(updated);
      alert("Saisie du comptage physique enregistrée avec succès !");
      loadInventaires();
    } catch (err) {
      alert("Erreur d'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleValiderAjustement = async () => {
    if (!selectedInv) return;
    if (!window.confirm("Êtes-vous sûr de vouloir valider cet inventaire et réajuster définitivement les quantites en stock ?")) return;

    setSaving(true);
    try {
      const updated = await stockApi.ajusterInventaire(selectedInv.inv_id);
      setSelectedInv(updated);
      alert("Inventaire clôturé et stocks régularisés en base de données !");
      loadInventaires();
    } catch (err) {
      alert("Erreur d'ajustement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#1B5E20' }}>
            <i className="bi bi-clipboard-check me-2"></i>Inventaire du Stock (Théorique vs Réel)
          </h2>
          <p className="text-muted small mb-0">
            Comptage physique périodique au magasin SMMC et calcul automatique des écarts
          </p>
        </div>
        <button
          className="btn text-white fw-semibold"
          style={{ backgroundColor: '#2E7D32' }}
          onClick={handleCreateInventaire}
        >
          <i className="bi bi-plus-circle me-2"></i>Lancer un Inventaire Total
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
            </div>
          ) : inventaires.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-clipboard-x display-4 text-muted"></i>
              <p className="mt-2 text-muted">Aucune session d'inventaire enregistrée.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-muted text-uppercase">
                    <th>N° Inventaire</th>
                    <th>Type</th>
                    <th>Date Début</th>
                    <th>Date Clôture</th>
                    <th>Responsable</th>
                    <th>Statut</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inventaires.map((inv) => (
                    <tr key={inv.inv_id}>
                      <td className="fw-bold text-dark">{inv.inv_numero}</td>
                      <td>
                        <span className="badge bg-light text-dark border text-capitalize">{inv.inv_type}</span>
                      </td>
                      <td className="small text-muted">{inv.inv_date_debut}</td>
                      <td className="small text-muted">{inv.inv_date_fin || '-'}</td>
                      <td>{inv.responsable_nom || 'Magasinier SMMC'}</td>
                      <td>
                        {inv.inv_statut === 'valide' ? (
                          <span className="badge bg-success"><i className="bi bi-check-circle me-1"></i>Validé & Clôturé</span>
                        ) : (
                          <span className="badge bg-warning text-dark"><i className="bi bi-hourglass-split me-1"></i>En cours</span>
                        )}
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => handleOpenDetail(inv)}
                        >
                          <i className="bi bi-pencil-square me-1"></i>Saisir Comptage / Voir Écarts
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

      {/* Detail & Saisie du Comptage Modal */}
      {selectedInv && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header text-white" style={{ backgroundColor: '#1B5E20' }}>
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-calculator me-2"></i>Comptage & Écarts - Session {selectedInv.inv_numero}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedInv(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="alert alert-info py-2 small mb-3">
                  <i className="bi bi-info-circle me-2"></i>
                  Saisissez les quantités comptées physiquement au magasin. L'écart <code>(Stock Réel - Stock Théorique)</code> sera calculé automatiquement.
                </div>

                <div className="table-responsive">
                  <table className="table table-bordered align-middle">
                    <thead className="table-light">
                      <tr className="small text-muted">
                        <th>Code</th>
                        <th>Désignation Article</th>
                        <th className="text-center">Stock Théorique (SI)</th>
                        <th className="text-center" style={{ width: '180px' }}>Comptage Physique Réel</th>
                        <th className="text-center">Écart (Unité)</th>
                        <th>Statut Écart</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInv.lignes?.map((ligne) => {
                        const qteReelle = comptagesState[ligne.linv_id] ?? ligne.linv_quantite_reelle;
                        const ecart = qteReelle - ligne.linv_quantite_theorique;

                        return (
                          <tr key={ligne.linv_id} className={ecart !== 0 ? 'table-warning' : ''}>
                            <td className="fw-bold small">{ligne.art_code}</td>
                            <td>{ligne.art_designation}</td>
                            <td className="text-center fw-bold text-secondary">{ligne.linv_quantite_theorique}</td>
                            <td className="text-center">
                              <input
                                type="number"
                                className="form-control form-control-sm text-center fw-bold border-success"
                                disabled={selectedInv.inv_statut === 'valide'}
                                value={qteReelle}
                                onChange={(e) => setComptagesState({
                                  ...comptagesState,
                                  [ligne.linv_id]: parseInt(e.target.value) || 0
                                })}
                              />
                            </td>
                            <td className="text-center fw-bold">
                              {ecart > 0 ? (
                                <span className="text-success">+{ecart}</span>
                              ) : ecart < 0 ? (
                                <span className="text-danger">{ecart}</span>
                              ) : (
                                <span className="text-muted">0</span>
                              )}
                            </td>
                            <td>
                              {ecart === 0 ? (
                                <span className="badge bg-success-subtle text-success border border-success"><i className="bi bi-check me-1"></i>Conforme</span>
                              ) : ecart < 0 ? (
                                <span className="badge bg-danger"><i className="bi bi-dash-circle me-1"></i>Manquant ({ecart})</span>
                              ) : (
                                <span className="badge bg-info text-dark"><i className="bi bi-plus-circle me-1"></i>Excédent (+{ecart})</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedInv(null)}>Fermer</button>
                {selectedInv.inv_statut !== 'valide' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={saving}
                      onClick={handleSaveComptage}
                    >
                      <i className="bi bi-save me-1"></i>Sauvegarder le Comptage
                    </button>
                    <button
                      type="button"
                      className="btn btn-success btn-sm fw-bold text-white"
                      style={{ backgroundColor: '#1B5E20' }}
                      disabled={saving}
                      onClick={handleValiderAjustement}
                    >
                      <i className="bi bi-check2-all me-1"></i>Clôturer & Réajuster les Stocks
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}