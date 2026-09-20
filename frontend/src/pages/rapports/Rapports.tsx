import { useEffect, useState } from 'react';
import { stockApi } from '../../services/stockApi';
import type { JournalAudit } from '../../types/stock';

export default function Rapports() {
  const [auditLogs, setAuditLogs] = useState<JournalAudit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const data = await stockApi.getJournalAudit();
        setAuditLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, []);

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#1B5E20' }}>
            <i className="bi bi-graph-up me-2"></i>Rapports, Statistiques & Journal d'Audit
          </h2>
          <p className="text-muted small mb-0">
            Exportations réglementaires SMMC et traçabilité de toutes les actions enregistrées
          </p>
        </div>
        <button className="btn text-white fw-semibold" style={{ backgroundColor: '#2E7D32' }} onClick={handleExportPDF}>
          <i className="bi bi-printer me-2"></i>Imprimer / Imprimer en PDF
        </button>
      </div>

      {/* Cartes récapitulatives */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 fw-bold py-3">
              <i className="bi bi-pie-chart me-2 text-success"></i>Répartition du Stock par Catégorie
            </div>
            <div className="card-body">
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Fournitures de bureau
                  <span className="badge bg-success rounded-pill">58 articles (40%)</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Équipements de sécurité (EPI)
                  <span className="badge bg-warning text-dark rounded-pill">34 articles (25%)</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Consommables informatiques
                  <span className="badge bg-primary rounded-pill">25 articles (20%)</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  Matériel d'entretien
                  <span className="badge bg-secondary rounded-pill">25 articles (15%)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 fw-bold py-3">
              <i className="bi bi-shield-check me-2 text-primary"></i>Conformité & Traçabilité (CDC SMMC)
            </div>
            <div className="card-body">
              <p className="small text-muted">
                Le système enregistre chaque visa de la chaîne à 4 signatures et conserve l'historique complet des mouvements pour les audits de la Direction Générale SMMC.
              </p>
              <div className="d-flex justify-content-around text-center py-3 bg-light rounded">
                <div>
                  <div className="fw-bold fs-4 text-success">100%</div>
                  <div className="small text-muted">Dématérialisation</div>
                </div>
                <div>
                  <div className="fw-bold fs-4 text-primary">&lt; 1%</div>
                  <div className="small text-muted">Erreur Saisie</div>
                </div>
                <div>
                  <div className="fw-bold fs-4 text-warning">&gt; 99%</div>
                  <div className="small text-muted">Disponibilité</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Journal d'audit */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 fw-bold py-3 text-dark">
          <i className="bi bi-list-check me-2 text-dark"></i>Journal d'Audit Métier (Actions Systèmes)
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-4 text-muted small">Aucun événement d'audit enregistré.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-muted">
                    <th>Horodatage</th>
                    <th>Acteur / Utilisateur</th>
                    <th>Action</th>
                    <th>Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.aud_id}>
                      <td className="small text-muted">{new Date(log.aud_date).toLocaleString('fr-FR')}</td>
                      <td className="fw-semibold">{log.personnel_nom}</td>
                      <td><span className="badge bg-dark font-monospace">{log.aud_action}</span></td>
                      <td className="small">{log.aud_details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}