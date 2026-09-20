import { useEffect, useState } from 'react';
import { stockApi } from '../../services/stockApi';
import type { DashboardStats } from '../../types/stock';

export default function DashboardResponsableStock() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await stockApi.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status"></div>
        <p className="mt-2 text-muted small">Chargement du tableau de bord SMMC...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Banner SMMC */}
      <div className="card border-0 text-white mb-4 shadow-sm" style={{ background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)' }}>
        <div className="card-body p-4 d-flex justify-content-between align-items-center">
          <div>
            <h3 className="fw-bold mb-1"><i className="bi bi-speedometer2 me-2"></i>Tableau de Bord — Gestion du Stock SMMC</h3>
            <p className="mb-0 text-white-50">Société de Manutention des Marchandises Conventionnelles (Port de Toamasina)</p>
          </div>
          <div className="d-none d-md-block text-end">
            <span className="badge bg-warning text-dark p-2 fw-bold me-2"><i className="bi bi-shield-check me-1"></i>Système Dématérialisé R17_FRM8</span>
            <span className="badge bg-light text-dark p-2 fw-bold"><i className="bi bi-calendar-event me-1"></i>{new Date().toLocaleDateString('fr-FR')}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm border-start border-4 border-success h-100">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-semibold text-uppercase">Total Articles</div>
                  <div className="fs-3 fw-bold text-dark">{stats.total_articles}</div>
                </div>
                <div className="rounded-circle p-3 bg-success bg-opacity-10 text-success">
                  <i className="bi bi-box-seam fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm border-start border-4 border-danger h-100">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-semibold text-uppercase">Articles en Alerte</div>
                  <div className="fs-3 fw-bold text-danger">{stats.articles_alerte}</div>
                </div>
                <div className="rounded-circle p-3 bg-danger bg-opacity-10 text-danger">
                  <i className="bi bi-exclamation-triangle fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm border-start border-4 border-warning h-100">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-semibold text-uppercase">Demandes en Attente</div>
                  <div className="fs-3 fw-bold text-dark">{stats.demandes_soumises + stats.demandes_en_cours}</div>
                </div>
                <div className="rounded-circle p-3 bg-warning bg-opacity-10 text-warning">
                  <i className="bi bi-hourglass-split fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm border-start border-4 border-primary h-100">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small fw-semibold text-uppercase">Valeur Totale Stock</div>
                  <div className="fs-5 fw-bold text-dark">{stats.valeur_totale_stock.toLocaleString('fr-FR')} Ar</div>
                </div>
                <div className="rounded-circle p-3 bg-primary bg-opacity-10 text-primary">
                  <i className="bi bi-cash-stack fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shortcuts & Quick Actions */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 fw-bold py-3 text-dark">
              <i className="bi bi-clock-history me-2 text-success"></i>Derniers Mouvements de Sortie
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr className="small text-muted">
                      <th>N° Mouvement</th>
                      <th>Date</th>
                      <th>Service Destinataire</th>
                      <th className="text-end">Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.derniers_mouvements.map((m) => (
                      <tr key={m.id}>
                        <td className="fw-bold small">{m.numero}</td>
                        <td className="small text-muted">{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                        <td className="fw-semibold">{m.service}</td>
                        <td className="text-end">
                          <a href="/mouvements" className="btn btn-sm btn-outline-secondary">
                            <i className="bi bi-arrow-right"></i>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 fw-bold py-3 text-dark">
              <i className="bi bi-lightning-charge me-2 text-warning"></i>Raccourcis Opérationnels
            </div>
            <div className="card-body p-3 d-flex flex-column justify-content-around">
              <a href="/nouvelle-demande" className="btn btn-outline-success text-start py-2 font-semibold">
                <i className="bi bi-file-earmark-plus me-2 fs-5"></i>Créer une Demande (R17_FRM8)
              </a>
              <a href="/validations" className="btn btn-outline-primary text-start py-2 font-semibold">
                <i className="bi bi-check2-square me-2 fs-5"></i>Valider les Demandes en Attente
              </a>
              <a href="/articles" className="btn btn-outline-dark text-start py-2 font-semibold">
                <i className="bi bi-box-seam me-2 fs-5"></i>Consulter les Alertes de Stock
              </a>
              <a href="/inventaire" className="btn btn-outline-secondary text-start py-2 font-semibold">
                <i className="bi bi-clipboard-check me-2 fs-5"></i>Lancer une Session d'Inventaire
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}